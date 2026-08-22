import type { VerificationStatus } from "@/lib/domain/evidence";
import {
  getPrimaryClassification,
  type MoleculeClassificationAxis,
  type MoleculeRecord,
} from "@/lib/domain/molecule";
import {
  createCategoricalLensProjection,
  createStructuralSimilarityProjection,
  getNearestStructuralNeighbors,
  type LensProjection,
  type LensProjectionCoordinate,
} from "@/lib/explore";
import type { Locale } from "@/lib/i18n";

import {
  localizeExploreClassification,
  localizeExploreSummary,
} from "./explore-copy";
import {
  createStudentMoleculeProfile,
  getCuratedScaffoldFamily,
  getCuratedScaffoldFamilyKey,
  type StudentMoleculeProfile,
} from "./molecule-learning";

export type ExploreEvidenceTone =
  | "verified"
  | "supported"
  | "pending"
  | "predicted"
  | "unknown";

export interface ExploreMoleculeStructureView {
  readonly pubChemCid: number;
  readonly threeDUrl?: string;
  readonly twoDUrl?: string;
  readonly sourceLabel?: string;
  readonly sourceId?: string;
  readonly sourceHref?: string;
  readonly originLabel?: string;
  readonly reviewStatus?: VerificationStatus;
  readonly twoDSourceLabel?: string;
  readonly twoDSourceId?: string;
  readonly twoDSourceHref?: string;
  readonly twoDOriginLabel?: string;
  readonly twoDReviewStatus?: VerificationStatus;
}

export interface ExploreMoleculeView {
  readonly id: string;
  readonly name: string;
  readonly canonicalSmiles: string;
  readonly formula?: string;
  readonly category?: string;
  readonly summary?: string;
  readonly lensValues: Readonly<Record<string, string>>;
  readonly lensKeys: Readonly<Record<string, string>>;
  readonly lensAliases: Readonly<Record<string, readonly string[]>>;
  readonly coordinates: Readonly<Record<string, LensProjectionCoordinate>>;
  readonly evidenceLabel: string;
  readonly evidenceTone: ExploreEvidenceTone;
  readonly accent: string;
  readonly studentProfile: StudentMoleculeProfile;
  readonly structuralNeighbors: readonly {
    readonly id: string;
    readonly score: number;
  }[];
  readonly structure: ExploreMoleculeStructureView;
  readonly regulatoryProduct?: {
    readonly applicationNumber: string;
    readonly productNumber: string;
    readonly brandName: string;
    readonly activeIngredientName: string;
    readonly chemicalFormId: string;
    readonly marketingStatus: string;
    readonly actionDate: string;
    readonly sourceHref: string;
    readonly verificationStatus: VerificationStatus;
    readonly limitations: readonly string[];
  };
}

export interface ExploreLensView {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly projectionId: string;
  readonly algorithm: LensProjection["algorithm"];
  readonly algorithmVersion: string;
  readonly inputVersion: string;
  readonly inputHash: string;
  readonly generatedAt: string;
  readonly meaning: string;
  readonly doesNotMean: string;
  readonly coordinateSystem: LensProjection["coordinateSystem"];
  readonly verificationStatus: VerificationStatus;
}

export interface ExploreCatalogView {
  readonly molecules: readonly ExploreMoleculeView[];
  readonly lenses: readonly ExploreLensView[];
  readonly projections: readonly LensProjection[];
}

export function resolvePublicAssetPath(
  publicPath: string,
  assetBasePath = "/",
) {
  const normalizedBase = assetBasePath.endsWith("/")
    ? assetBasePath
    : `${assetBasePath}/`;
  return `${normalizedBase}${publicPath.replace(/^\/+/, "")}`;
}

interface LensDefinition {
  readonly id: string;
  readonly axis: MoleculeClassificationAxis;
  readonly copy: Readonly<Record<Locale, {
    readonly label: string;
    readonly description: string;
    readonly meaning: string;
    readonly doesNotMean: string;
  }>>;
}

const GENERATED_AT = "2026-08-21T00:00:00.000Z";
const ALGORITHM_VERSION = "categorical-layout@1.0.0";
const STRUCTURAL_LENS_ID = "structural-similarity";

const LENS_DEFINITIONS: readonly LensDefinition[] = [
  {
    id: "therapeutic",
    axis: "therapeutic-area",
    copy: {
      tr: { label: "Tedavi alanı", description: "Kaynak ve inceleme durumu taşıyan tedavi alanı kategorileri.", meaning: "Aynı kürate edilmiş tedavi alanı etiketine sahip kayıtlar aynı bölgeyi paylaşır.", doesNotMean: "Ekran yakınlığı klinik benzerlik, etkililik veya ortak endikasyon kanıtı değildir." },
      en: { label: "Therapeutic area", description: "Therapeutic-area categories with source and review status.", meaning: "Records with the same curated therapeutic-area label share one region.", doesNotMean: "Screen proximity is not evidence of clinical similarity, efficacy, or a shared indication." },
    },
  },
  {
    id: "target",
    axis: "target-profile",
    copy: {
      tr: { label: "Hedef ailesi", description: "İnceleme kapılı hedef profili kategorilerinin deterministik yerleşimi.", meaning: "Aynı kürate edilmiş hedef profili etiketi kayıtları aynı bölgeye yerleştirir.", doesNotMean: "Ekran mesafesi bağlanma gücü, seçicilik veya biyolojik etki ölçümü değildir." },
      en: { label: "Target family", description: "Deterministic placement of review-controlled target-profile categories.", meaning: "Records with the same curated target-profile label share one region.", doesNotMean: "Screen distance is not a measurement of binding strength, selectivity, or biological effect." },
    },
  },
  {
    id: "scaffold",
    axis: "structural-family",
    copy: {
      tr: { label: "Kürate edilmiş iskelet ailesi", description: "İnsan tarafından adlandırılmış iskelet ailelerinin kategorik görünümü.", meaning: "Aynı kürate edilmiş yapısal aile etiketi kayıtları aynı bölgeyi paylaşır.", doesNotMean: "Bu sürüm fingerprint, Tanimoto veya nicel yapısal benzerlik hesabı değildir." },
      en: { label: "Curated scaffold family", description: "Categorical view of human-authored scaffold families.", meaning: "Records with the same curated structural-family label share one region.", doesNotMean: "This version does not calculate fingerprints, Tanimoto scores, or quantitative structural similarity." },
    },
  },
] as const;

const ACCENTS = [
  "#4f7fe4",
  "#f47a32",
  "#7d5fd0",
  "#2f6bb2",
  "#dc5d7d",
  "#e49b32",
  "#6579bd",
  "#b45cbe",
  "#3b88a8",
  "#d86b42",
] as const;

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function classificationLabel(record: MoleculeRecord, axis: MoleculeClassificationAxis) {
  return getPrimaryClassification(record, axis)?.label ?? "Sınıflandırılmamış";
}

function classificationKey(record: MoleculeRecord, axis: MoleculeClassificationAxis) {
  return getPrimaryClassification(record, axis)?.value ?? "unclassified";
}

function classificationStatus(record: MoleculeRecord, axis: MoleculeClassificationAxis) {
  return getPrimaryClassification(record, axis)?.verification.status ?? "unknown";
}

function evidenceTone(statuses: readonly VerificationStatus[]): ExploreEvidenceTone {
  if (statuses.includes("predicted")) return "predicted";
  if (statuses.includes("pending-review")) return "pending";
  if (statuses.includes("unknown") || statuses.includes("conflicting")) return "unknown";
  if (statuses.every((status) => status === "verified" || status === "expert-reviewed")) {
    return "verified";
  }
  if (statuses.some((status) => status === "source-supported")) return "supported";
  return "unknown";
}

function evidenceLabel(
  record: MoleculeRecord,
  statuses: readonly VerificationStatus[],
  locale: Locale,
) {
  const identityStatus = record.identity.verification.status;
  const identityLabel =
    identityStatus === "verified" || identityStatus === "expert-reviewed"
      ? locale === "tr" ? "Kimlik doğrulandı" : "Identity verified"
      : locale === "tr" ? "Kimlik incelemede" : "Identity under review";
  const classificationsReviewed = statuses
    .slice(1)
    .every((status) => status === "verified" || status === "expert-reviewed");
  return `${identityLabel} · ${
    classificationsReviewed
      ? locale === "tr" ? "sınıflandırmalar gözden geçirildi" : "classifications reviewed"
      : locale === "tr" ? "eğitim sınıflandırmaları incelemede" : "educational classifications under review"
  }`;
}

export function createExploreCatalogView(
  records: readonly MoleculeRecord[],
  locale: Locale = "tr",
  assetBasePath = "/",
): ExploreCatalogView {
  const inputVersion = `catalog-snapshot-2026-08-22:${records.length}`;
  const categoricalProjections = LENS_DEFINITIONS.map((definition) =>
    createCategoricalLensProjection(
      {
        lensId: definition.id,
        projectionId: `projection:${definition.id}:categorical-v1`,
        algorithmVersion: ALGORITHM_VERSION,
        inputVersion,
        generatedAt: GENERATED_AT,
        meaning: definition.copy[locale].meaning,
        doesNotMean: definition.copy[locale].doesNotMean,
        verificationStatus: "pending-review",
      },
      records.map((record) => ({
        id: record.id,
        category: classificationLabel(record, definition.axis),
      })),
    ),
  );
  const structuralCopy = locale === "tr"
    ? {
        label: "Yapısal benzerlik",
        description: "Kanonik SMILES yol fingerprint'i ve Tanimoto katsayısıyla hesaplanan eğitim görünümü.",
        meaning: "Yakınlık, bu sürümlü fingerprint'te ortak atom/bağ/yol özelliklerinin Tanimoto benzerliğini gösterir.",
        doesNotMean: "Bu yerleşim ortak etki, klinik eşdeğerlik, aynı sentez rotası veya patent ilişkisi kanıtı değildir.",
      }
    : {
        label: "Structural similarity",
        description: "An educational view calculated from a canonical-SMILES path fingerprint and Tanimoto coefficient.",
        meaning: "Proximity represents Tanimoto similarity of shared atom, bond, and path features in this versioned fingerprint.",
        doesNotMean: "This layout is not evidence of a shared effect, clinical equivalence, synthesis route, or patent relationship.",
      };
  const structuralProjection = createStructuralSimilarityProjection(
    {
      lensId: STRUCTURAL_LENS_ID,
      projectionId: "projection:structural-similarity:smiles-path-v1",
      inputVersion,
      generatedAt: GENERATED_AT,
      meaning: structuralCopy.meaning,
      doesNotMean: structuralCopy.doesNotMean,
      verificationStatus: "source-supported",
    },
    records.map((record) => ({
      id: record.id,
      canonicalSmiles: record.identity.canonicalSmiles,
    })),
  );
  const projections: readonly LensProjection[] = [
    ...categoricalProjections,
    structuralProjection,
  ];

  const lenses: ExploreLensView[] = LENS_DEFINITIONS.map((definition, index) => {
    const projection = categoricalProjections[index];
    if (!projection) throw new Error(`Missing projection for lens ${definition.id}`);
    return {
      id: definition.id,
      label: definition.copy[locale].label,
      description: definition.copy[locale].description,
      projectionId: projection.projectionId,
      algorithm: projection.algorithm,
      algorithmVersion: projection.algorithmVersion,
      inputVersion: projection.inputVersion,
      inputHash: projection.inputHash,
      generatedAt: projection.generatedAt,
      meaning: definition.copy[locale].meaning,
      doesNotMean: definition.copy[locale].doesNotMean,
      coordinateSystem: projection.coordinateSystem,
      verificationStatus: projection.verificationStatus,
    };
  });
  lenses.push({
    id: STRUCTURAL_LENS_ID,
    label: structuralCopy.label,
    description: structuralCopy.description,
    projectionId: structuralProjection.projectionId,
    algorithm: structuralProjection.algorithm,
    algorithmVersion: structuralProjection.algorithmVersion,
    inputVersion: structuralProjection.inputVersion,
    inputHash: structuralProjection.inputHash,
    generatedAt: structuralProjection.generatedAt,
    meaning: structuralProjection.meaning,
    doesNotMean: structuralProjection.doesNotMean,
    coordinateSystem: structuralProjection.coordinateSystem,
    verificationStatus: structuralProjection.verificationStatus,
  });

  const molecules: ExploreMoleculeView[] = records.map((record) => {
    const studentProfile = createStudentMoleculeProfile(record, locale);
    const lensValues = Object.fromEntries([
      ...LENS_DEFINITIONS.map((definition) => [
        definition.id,
        localizeExploreClassification(classificationLabel(record, definition.axis), locale),
      ] as const),
      [STRUCTURAL_LENS_ID, studentProfile.scaffoldFamily] as const,
    ]);
    const lensKeys = Object.fromEntries([
      ...LENS_DEFINITIONS.map((definition) => [
        definition.id,
        classificationKey(record, definition.axis),
      ] as const),
      [
        STRUCTURAL_LENS_ID,
        getCuratedScaffoldFamilyKey(classificationLabel(record, "structural-family")),
      ] as const,
    ]);
    const lensAliases = Object.fromEntries([
      ...LENS_DEFINITIONS.map((definition) => {
        const sourceLabel = classificationLabel(record, definition.axis);
        return [
          definition.id,
          [...new Set([
            sourceLabel,
            localizeExploreClassification(sourceLabel, "tr"),
            localizeExploreClassification(sourceLabel, "en"),
          ])],
        ] as const;
      }),
      (() => {
        const sourceLabel = classificationLabel(record, "structural-family");
        return [
          STRUCTURAL_LENS_ID,
          [...new Set([
            sourceLabel,
            getCuratedScaffoldFamily(sourceLabel, "tr"),
            getCuratedScaffoldFamily(sourceLabel, "en"),
          ])],
        ] as const;
      })(),
    ]);
    const coordinates = Object.fromEntries(
      projections.flatMap((projection) => {
        const coordinate = projection.coordinates[record.id];
        return coordinate ? [[projection.lensId, coordinate] as const] : [];
      }),
    );
    const statuses = [
      record.identity.verification.status,
      ...LENS_DEFINITIONS.map((definition) =>
        classificationStatus(record, definition.axis),
      ),
      record.educationalProfile.verification.status,
    ];
    const threeD = record.structures.threeDimensional;
    const twoD = record.structures.twoDimensional;
    const regulatoryProduct = record.regulatoryProducts[0];

    return {
      id: record.id,
      name: record.identity.preferredName,
      canonicalSmiles: record.identity.canonicalSmiles,
      formula: record.identity.molecularFormula,
      category: lensValues.target,
      summary: localizeExploreSummary(record.id, record.educationalProfile.summary, locale),
      lensValues,
      lensKeys,
      lensAliases,
      coordinates,
      evidenceLabel: evidenceLabel(record, statuses, locale),
      evidenceTone: evidenceTone(statuses),
      accent: ACCENTS[stableHash(record.id) % ACCENTS.length] ?? ACCENTS[0],
      studentProfile,
      structuralNeighbors: getNearestStructuralNeighbors(
        structuralProjection,
        record.id,
        4,
      ),
      structure: {
        pubChemCid: record.identity.pubChemCid,
        threeDUrl: resolvePublicAssetPath(threeD.publicPath, assetBasePath),
        twoDUrl: resolvePublicAssetPath(twoD.publicPath, assetBasePath),
        sourceLabel: `${threeD.sourceProvider} · ${threeD.sourceExternalId}`,
        sourceHref: threeD.sourceUrl,
        sourceId: threeD.sourceId,
        originLabel: threeD.origin,
        reviewStatus: threeD.verification.status,
        twoDSourceLabel: `${twoD.sourceProvider} · ${twoD.sourceExternalId}`,
        twoDSourceHref: twoD.sourceUrl,
        twoDSourceId: twoD.sourceId,
        twoDOriginLabel: twoD.origin,
        twoDReviewStatus: twoD.verification.status,
      },
      regulatoryProduct: regulatoryProduct
        ? {
            applicationNumber: regulatoryProduct.applicationNumber,
            productNumber: regulatoryProduct.productNumber,
            brandName: regulatoryProduct.brandName,
            activeIngredientName: regulatoryProduct.activeIngredient.name,
            chemicalFormId: regulatoryProduct.chemicalFormId,
            marketingStatus: regulatoryProduct.marketingStatus,
            actionDate: regulatoryProduct.approvalAction.actionDate,
            sourceHref: regulatoryProduct.sourceUrl,
            verificationStatus: regulatoryProduct.verification.status,
            limitations: regulatoryProduct.limitations,
          }
        : undefined,
    };
  });

  return { molecules, lenses, projections };
}
