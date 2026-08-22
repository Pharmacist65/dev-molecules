import { createRouteScopedAdmeProfiles } from "@/lib/application/adme";
import { createClassificationProfile } from "@/lib/application/classifications";
import { createMetaboliteGraph } from "@/lib/application/metabolites";
import { createPharmacologyProfile } from "@/lib/application/pharmacology";
import { moleculeCatalog } from "@/lib/data/catalog";
import { pubChemSystematicNameByCid } from "@/lib/data/pubchem-systematic-names";
import { sourceById } from "@/lib/data/sources";
import { synthesisStories } from "@/lib/data/synthesis-stories";
import { canPresentAsSourceReported } from "@/lib/domain/synthesis";
import type {
  EvidenceLevel,
  SourceKind,
  SourceReference,
} from "@/lib/domain/evidence";
import type { SourceId } from "@/lib/domain/ids";
import type { MoleculeRecord } from "@/lib/domain/molecule";
import {
  isReviewedStatus,
  type DossierCoverageIndicator,
  type DrugDossierRecord,
  type EvidenceField,
  type ResolvedDossierSource,
} from "@/lib/domain/dossier";

export type DossierLocale = "tr" | "en";

const scientificTypeForSource = (kind: SourceKind): EvidenceLevel => {
  if (kind === "regulatory-label") return "regulatory";
  if (kind === "curated-database") return "curated-database";
  if (kind === "computed-output") return "computed";
  if (kind === "journal" || kind === "patent" || kind === "textbook") {
    return "literature-reported";
  }
  return "no-evidence";
};

const resolveSource = (sourceId: SourceId) => sourceById.get(sourceId);

const isPresentableStatus = (status: MoleculeRecord["identity"]["verification"]["status"]): boolean =>
  status === "verified" ||
  status === "expert-reviewed" ||
  status === "source-supported";

const identityField = <T>(
  value: T,
  record: MoleculeRecord,
  unit: string | null,
  note: string,
): EvidenceField<T> => ({
  value,
  unit,
  conditions: { note },
  sourceId: record.identity.sourceIds[0],
  evidenceType: "curated-database",
  reviewStatus: record.identity.verification.status,
});

const slugify = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function resolveDossierMolecule(
  moleculeIdOrSlug: string,
): MoleculeRecord | null {
  let decoded = moleculeIdOrSlug;
  try {
    decoded = decodeURIComponent(moleculeIdOrSlug);
  } catch {
    // Keep the original string; malformed encoding must not crash routing.
  }
  const normalized = decoded.trim().toLowerCase();
  const candidateSlug = normalized.startsWith("molecule:")
    ? normalized.slice("molecule:".length)
    : normalized;
  return moleculeCatalog.find((record) =>
    record.id.toLowerCase() === normalized ||
    record.id.slice("molecule:".length).toLowerCase() === candidateSlug ||
    slugify(record.identity.preferredName) === candidateSlug,
  ) ?? null;
}

const assetPath = (basePath: string, publicPath: string): string => {
  const base = basePath.trim() || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${publicPath.replace(/^\/+/, "")}`;
};

const localized = <T>(locale: DossierLocale, tr: T, en: T): T =>
  locale === "tr" ? tr : en;

const coverage = (
  dimension: DossierCoverageIndicator["dimension"],
  status: DossierCoverageIndicator["status"],
  reason: string,
  availableFields: number,
  totalFields: number | null,
): DossierCoverageIndicator => ({
  dimension,
  status,
  reason,
  availableFields,
  totalFields,
});

function resolveDossierSources(sourceIds: readonly SourceId[]): readonly ResolvedDossierSource[] {
  return [...new Set(sourceIds)]
    .map((sourceId) => sourceById.get(sourceId))
    .filter(
      (source): source is SourceReference =>
        source !== undefined && source.url !== null,
    )
    .map((source) => ({
      id: source.id,
      provider: source.provider,
      title: source.title,
      url: source.url as string,
      evidenceType: scientificTypeForSource(source.kind),
      reviewStatus: source.verification.status,
      scope: source.scope,
    }));
}

export function createDrugDossier(
  record: MoleculeRecord,
  locale: DossierLocale,
  basePath = "/",
): DrugDossierRecord {
  const identitySourceId = record.identity.sourceIds[0];
  const identityNote = localized(
    locale,
    "Normalize edilmiş ana molekül kimliği; ürün, tuz, doz veya klinik kullanım kaydı değildir.",
    "Normalized parent-molecule identity; it is not a product, salt, dose, or clinical-use record.",
  );
  const systematicName = pubChemSystematicNameByCid[record.identity.pubChemCid];
  const reviewedForms = record.forms.filter((form) =>
    form.sourceIds.some((sourceId) => Boolean(resolveSource(sourceId)?.url)) &&
    isPresentableStatus(form.verification.status));
  const classifications = createClassificationProfile(record, resolveSource, locale);
  const pharmacology = createPharmacologyProfile(
    record,
    classifications,
    resolveSource,
    locale,
  );
  const admeProfiles = createRouteScopedAdmeProfiles(record, resolveSource, locale);
  const parentLabel = identityField(
    record.identity.preferredName,
    record,
    null,
    identityNote,
  );
  const metabolites = createMetaboliteGraph(
    record.id,
    parentLabel,
    [],
    [],
    resolveSource,
    locale,
  );
  const synthesisStory = synthesisStories.find((story) =>
    story.moleculeId === record.id && canPresentAsSourceReported(story));
  const synthesisStatus = synthesisStory ? "source-supported" : "unavailable";
  const dossierSourceIds = [
    ...record.identity.sourceIds,
    record.structures.twoDimensional.sourceId,
    record.structures.threeDimensional.sourceId,
    ...reviewedForms.flatMap((form) => form.sourceIds),
    ...admeProfiles.flatMap((profile) => profile.sourceIds),
    ...(synthesisStory?.sourceIds ?? []),
  ];

  const chemistry = {
    systematicName: systematicName
      ? identityField(systematicName, record, null, localized(
          locale,
          "Kontrol edilen PubChem 2B SDF kaydındaki sistematik ad alanı.",
          "Systematic-name field from the checked PubChem 2D SDF record.",
        ))
      : null,
    molecularFormula: identityField(record.identity.molecularFormula, record, null, identityNote),
    molecularWeight: identityField(record.identity.molecularWeight, record, "g/mol", identityNote),
    canonicalSmiles: identityField(record.identity.canonicalSmiles, record, null, identityNote),
    isomericSmiles: record.identity.isomericSmiles
      ? identityField(record.identity.isomericSmiles, record, null, identityNote)
      : null,
    inchiKey: identityField(record.identity.inchiKey, record, null, identityNote),
    stereochemistry:
      !isPresentableStatus(record.stereochemistry.verification.status) ||
      !identitySourceId
        ? null
        : {
            value: record.stereochemistry.summary,
            unit: null,
            conditions: {
              note: record.stereochemistry.verification.note ?? identityNote,
            },
            sourceId: identitySourceId,
            evidenceType: "curated-database" as const,
            reviewStatus: record.stereochemistry.verification.status,
          },
    chemicalForms: reviewedForms,
    structures: [
      {
        dimension: "2d" as const,
        publicPath: assetPath(basePath, record.structures.twoDimensional.publicPath),
        sourceUrl: record.structures.twoDimensional.sourceUrl,
        origin: record.structures.twoDimensional.origin,
        sourceId: record.structures.twoDimensional.sourceId,
      },
      {
        dimension: "3d" as const,
        publicPath: assetPath(basePath, record.structures.threeDimensional.publicPath),
        sourceUrl: record.structures.threeDimensional.sourceUrl,
        origin: record.structures.threeDimensional.origin,
        sourceId: record.structures.threeDimensional.sourceId,
      },
    ],
    unavailableDescriptorKeys: [
      "formal-charge",
      "pka",
      "logp-logd",
      "tpsa",
      "h-bond-donors",
      "h-bond-acceptors",
      "rotatable-bonds",
      "ring-systems",
    ],
  };

  const reviewedIdentity = isReviewedStatus(record.identity.verification.status);
  const coverageIndicators: readonly DossierCoverageIndicator[] = [
    coverage("identity", reviewedIdentity ? "reviewed" : "pending-review", localized(
      locale,
      "PubChem kimliği ve ana tanımlayıcılar kaynak bağlantılıdır.",
      "PubChem identity and core identifiers are source-linked.",
    ), 6, 6),
    coverage("structure", "reviewed", localized(
      locale,
      "Yerel 2B kayıt ve hesaplanmış 3B konformer kimlik/bütünlük kontrolünden geçti.",
      "The local 2D record and computed 3D conformer passed identity/integrity checks.",
    ), 2, 2),
    coverage("classification", classifications.availability === "reviewed" ? "reviewed" : "pending-review", classifications.unavailableReason ?? localized(locale, "İncelenmiş sınıflandırma mevcut.", "Reviewed classification available."), classifications.therapeutic.length + classifications.pharmacological.length + classifications.chemical.length, null),
    coverage("pharmacology", pharmacology.availability === "reviewed" ? "reviewed" : "unavailable", pharmacology.unavailableReason ?? localized(locale, "İncelenmiş farmakoloji mevcut.", "Reviewed pharmacology available."), pharmacology.targets.length, null),
    coverage("adme", "unavailable", localized(
      locale,
      admeProfiles.length > 0
        ? "Ürün/form uygulama yolu doğrulandı; ADME ölçümleri henüz kaynaklandırılmadı."
        : "Kaynaklandırılmış ADME profili henüz yok.",
      admeProfiles.length > 0
        ? "The product/form administration route is verified; ADME measurements are not sourced yet."
        : "No sourced ADME profile is available yet.",
    ), 0, null),
    coverage("synthesis", synthesisStatus, localized(
      locale,
      synthesisStory ? "Kaynak denetimli eğitim rotası mevcut; uzman inceleme durumu ayrıca korunur." : "Bu ilaç için kürate edilmiş rota henüz yok.",
      synthesisStory ? "A source-audited educational route is available; its expert-review boundary remains visible." : "No curated route is available for this drug yet.",
    ), synthesisStory ? 1 : 0, null),
    coverage("nomenclature", systematicName ? "source-supported" : "unavailable", localized(
      locale,
      systematicName ? "Kaynaklı sistematik ad mevcut; ilaç-özel etkileşimli çözümleme ayrı kapsamdır." : "İlaç-özel nomenklatür çözümlemesi henüz yok.",
      systematicName ? "A sourced systematic name is available; drug-specific interactive decomposition is separate coverage." : "No drug-specific nomenclature decomposition is available yet.",
    ), systematicName ? 1 : 0, null),
    coverage("learning", synthesisStory ? "source-supported" : "pending-review", localized(
      locale,
      "Derin öğrenme içeriği katalog genişliğinden ayrı kürate edilir.",
      "Deep-learning content is curated separately from catalog breadth.",
    ), synthesisStory ? 1 : 0, null),
    coverage("review", "source-supported", localized(
      locale,
      "Kimlik ve yapı incelendi; diğer bilimsel katmanlar kendi kaynak ve inceleme kapılarında kalır.",
      "Identity and structure are reviewed; other scientific layers remain behind their own source and review gates.",
    ), 2, 9),
  ];

  return {
    id: `dossier:${record.id.slice("molecule:".length)}`,
    moleculeId: record.id,
    preferredName: record.identity.preferredName,
    aliases: record.identity.synonyms,
    chemistry,
    classifications,
    pharmacology,
    admeProfiles,
    metabolites,
    coverage: coverageIndicators,
    sources: resolveDossierSources(dossierSourceIds),
    limitations: localized(
      locale,
      [
        "Bu dossier eğitim ve referans içindir; klinik karar desteği değildir.",
        "Eksik kayıt yokluk, etkisizlik, yenilik, patentlenebilirlik veya sentezlenebilirlik kanıtı değildir.",
        "Ana molekül kimliği ürün, doz, uygulama yolu ve farmasötik formdan ayrı tutulur.",
      ],
      [
        "This dossier is for education and reference; it is not clinical decision support.",
        "Missing content is not evidence of absence, inactivity, novelty, patentability, or synthesizability.",
        "Parent-molecule identity remains separate from product, dose, route, and pharmaceutical form.",
      ],
    ),
    notForClinicalUse: true,
    sourceRecord: record,
  };
}

export function createDrugDossierByIdOrSlug(
  moleculeIdOrSlug: string,
  locale: DossierLocale,
  basePath = "/",
): DrugDossierRecord | null {
  const record = resolveDossierMolecule(moleculeIdOrSlug);
  return record ? createDrugDossier(record, locale, basePath) : null;
}
