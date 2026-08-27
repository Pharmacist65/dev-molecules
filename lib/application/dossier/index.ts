import { createRouteScopedAdmeProfiles } from "@/lib/application/adme";
import { createClassificationProfile } from "@/lib/application/classifications";
import { createMetaboliteGraph } from "@/lib/application/metabolites";
import { createPharmacologyProfile } from "@/lib/application/pharmacology";
import {
  collectFlagshipSourceIds,
  filterFlagshipAdmeProfiles,
  gateLegacyFlagshipSynthesisForPublic,
  validateFlagshipDossierSeed,
} from "./flagship";
export {
  presentEvidenceCoefficientOfVariation,
  presentEvidenceConditionValue,
  presentEvidenceValue,
} from "./evidence-presentation";
import { curatedDossierMolecules } from "@/lib/data/curated-dossier-catalog";
import { createFlagshipDossierSeed } from "@/lib/data/flagship-dossiers";
import { pubChemSystematicNameByCid } from "@/lib/data/pubchem-systematic-names";
import { sourceById } from "@/lib/data/sources";
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

export interface DossierLearningAvailability {
  readonly synthesis: boolean;
  readonly nomenclature: boolean;
}

const isOpenCoverageStatus = (
  status: DossierCoverageIndicator["status"],
): boolean => status === "reviewed" || status === "source-supported";

export function getDossierLearningAvailability(
  dossier: Pick<DrugDossierRecord, "coverage">,
): DossierLearningAvailability {
  const statusByDimension = new Map(
    dossier.coverage.map((item) => [item.dimension, item.status]),
  );
  return {
    synthesis: isOpenCoverageStatus(
      statusByDimension.get("synthesis") ?? "unavailable",
    ),
    nomenclature: isOpenCoverageStatus(
      statusByDimension.get("nomenclature") ?? "unavailable",
    ),
  };
}

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
  return curatedDossierMolecules.find((record) =>
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

function coverageIndicatorsForReviewCount(values: {
  readonly reviewedIdentity: boolean;
  readonly classificationFieldCount: number;
  readonly pharmacologyFieldCount: number;
  readonly admeFieldCount: number;
  readonly synthesisAvailable: boolean;
  readonly nomenclatureFieldCount: number;
  readonly learningFieldCount: number;
}): number {
  return [
    values.reviewedIdentity,
    values.classificationFieldCount > 0,
    values.pharmacologyFieldCount > 0,
    values.admeFieldCount > 0,
    values.synthesisAvailable,
    values.nomenclatureFieldCount > 0,
    values.learningFieldCount > 0,
  ].filter(Boolean).length;
}

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
      externalId: source.externalId,
      url: source.url as string,
      retrievedAt: source.retrievedAt,
      evidenceType: scientificTypeForSource(source.kind),
      reviewStatus: source.verification.status,
      scope: source.scope,
      license: source.license,
    }));
}

export function createDrugDossier(
  record: MoleculeRecord,
  locale: DossierLocale,
  basePath = "/",
): DrugDossierRecord {
  const candidateFlagshipSeed = createFlagshipDossierSeed(record.id, locale);
  const flagshipSeed = candidateFlagshipSeed &&
    validateFlagshipDossierSeed(candidateFlagshipSeed, resolveSource).length === 0
      ? {
          ...candidateFlagshipSeed,
          content: gateLegacyFlagshipSynthesisForPublic(
            candidateFlagshipSeed.content,
            locale,
          ),
        }
      : null;
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
  const classifications = flagshipSeed?.classifications ??
    createClassificationProfile(record, resolveSource, locale);
  const pharmacology = createPharmacologyProfile(
    record,
    classifications,
    resolveSource,
    locale,
    flagshipSeed?.interactions ?? [],
    flagshipSeed?.primaryTargets ?? [],
    flagshipSeed?.mechanismClaims ?? [],
  );
  const admeProfiles = flagshipSeed
    ? filterFlagshipAdmeProfiles(flagshipSeed.admeProfiles, resolveSource)
    : createRouteScopedAdmeProfiles(record, resolveSource, locale);
  const parentLabel = identityField(
    record.identity.preferredName,
    record,
    null,
    identityNote,
  );
  const metabolites = createMetaboliteGraph(
    record.id,
    parentLabel,
    flagshipSeed?.metaboliteNodes ?? [],
    flagshipSeed?.metaboliteEdges ?? [],
    resolveSource,
    locale,
  );
  const flagshipSynthesis = flagshipSeed?.content.synthesis.content ?? null;
  const synthesisStatus = flagshipSynthesis
    ? "source-supported"
    : "unavailable";
  const dossierSourceIds = [
    ...record.identity.sourceIds,
    record.structures.twoDimensional.sourceId,
    record.structures.threeDimensional.sourceId,
    ...reviewedForms.flatMap((form) => form.sourceIds),
    ...admeProfiles.flatMap((profile) => profile.sourceIds),
    ...(flagshipSeed ? collectFlagshipSourceIds(flagshipSeed) : []),
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
      ...(record.id === "molecule:celecoxib" && flagshipSeed ? [] : ["pka", "logp-logd"]),
      "tpsa",
      "h-bond-donors",
      "h-bond-acceptors",
      "rotatable-bonds",
      "ring-systems",
    ],
  };

  const reviewedIdentity = isReviewedStatus(record.identity.verification.status);
  const admeFieldCount = admeProfiles.reduce(
    (total, profile) => total +
      profile.absorption.length +
      profile.distribution.length +
      profile.metabolism.length +
      profile.excretion.length,
    0,
  );
  const admeCoverageStatus = admeFieldCount === 0
    ? "unavailable"
    : admeProfiles.every((profile) => isReviewedStatus(profile.reviewStatus))
      ? "reviewed"
      : "source-supported";
  const pharmacologyFieldCount =
    pharmacology.primaryTargets.length +
    pharmacology.targets.length +
    pharmacology.mechanismClaims.length;
  const classificationFieldCount =
    classifications.therapeutic.length +
    classifications.pharmacological.length +
    classifications.chemical.length;
  const nomenclatureFieldCount =
    flagshipSeed?.content.nomenclature.content?.segments.length ?? 0;
  const learningFieldCount = flagshipSeed?.content.learning.content.length ?? 0;
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
    coverage(
      "classification",
      classifications.availability === "reviewed"
        ? "reviewed"
        : classifications.availability === "source-supported"
          ? "source-supported"
          : "unavailable",
      classifications.unavailableReason ?? localized(locale, "Kaynak destekli sınıflandırma mevcut.", "Source-supported classification is available."),
      classificationFieldCount,
      null,
    ),
    coverage(
      "pharmacology",
      pharmacology.availability === "reviewed"
        ? "reviewed"
        : pharmacology.availability === "source-supported"
          ? "source-supported"
          : "unavailable",
      pharmacology.unavailableReason ?? localized(locale, "Kaynak destekli hedef ve mekanizma kaydı mevcut.", "Source-supported target and mechanism records are available."),
      pharmacologyFieldCount,
      null,
    ),
    coverage("adme", admeCoverageStatus, localized(
      locale,
      admeFieldCount > 0
        ? "Uygulama yolu ve forma bağlı ADME alanları kaynak ve koşullarıyla tutulur."
        : admeProfiles.length > 0
          ? "Ürün/form uygulama yolu doğrulandı; ADME ölçümleri henüz kaynaklandırılmadı."
          : "Kaynaklandırılmış ADME profili henüz yok.",
      admeFieldCount > 0
        ? "Route- and form-specific ADME fields retain their sources and conditions."
        : admeProfiles.length > 0
          ? "The product/form administration route is verified; ADME measurements are not sourced yet."
          : "No sourced ADME profile is available yet.",
    ), admeFieldCount, null),
    coverage("synthesis", synthesisStatus, localized(
      locale,
      flagshipSynthesis
        ? "Yayın kapısını geçen sentez rotası mevcuttur."
        : "Bu statik dossier sentez kanıtı iddiası yayımlamaz; güncel durum Sentez Atlası kapsam kaydından okunur.",
      flagshipSynthesis
        ? "A synthesis route has passed the publication gate."
        : "This static dossier publishes no synthesis-evidence claim; current status comes from the Synthesis Atlas coverage record.",
    ), flagshipSynthesis ? 1 : 0, null),
    coverage("nomenclature", nomenclatureFieldCount > 0 ? "source-supported" : "unavailable", localized(
      locale,
      nomenclatureFieldCount > 0 ? "Kaynak-spesifik ilaç nomenklatür çözümlemesi mevcuttur; uzman inceleme sınırı korunur." : systematicName ? "Kaynaklı sistematik ad kimya özetinde gösterilir; ilaç-özel etkileşimli nomenklatür dersi henüz yok." : "İlaç-özel nomenklatür çözümlemesi henüz yok.",
      nomenclatureFieldCount > 0 ? "A source-specific drug nomenclature decomposition is available; its expert-review boundary remains visible." : systematicName ? "The sourced systematic name appears in the chemistry summary; no drug-specific interactive nomenclature lesson is available yet." : "No drug-specific nomenclature decomposition is available yet.",
    ), nomenclatureFieldCount, null),
    coverage("learning", learningFieldCount > 0 ? "source-supported" : "pending-review", localized(
      locale,
      "Derin öğrenme içeriği katalog genişliğinden ayrı kürate edilir.",
      "Deep-learning content is curated separately from catalog breadth.",
    ), learningFieldCount, null),
    coverage("review", "source-supported", localized(
      locale,
      "Kimlik ve yapı incelendi; diğer bilimsel katmanlar kendi kaynak ve inceleme kapılarında kalır.",
      "Identity and structure are reviewed; other scientific layers remain behind their own source and review gates.",
    ), coverageIndicatorsForReviewCount({
      reviewedIdentity,
      classificationFieldCount,
      pharmacologyFieldCount,
      admeFieldCount,
      synthesisAvailable: Boolean(flagshipSynthesis),
      nomenclatureFieldCount,
      learningFieldCount,
    }), 9),
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
    flagship: flagshipSeed?.content ?? null,
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
