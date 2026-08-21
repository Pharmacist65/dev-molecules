import type { VerificationStatus } from "@/lib/domain/evidence";
import {
  getPrimaryClassification,
  type MoleculeClassificationAxis,
  type MoleculeRecord,
} from "@/lib/domain/molecule";
import {
  createCategoricalLensProjection,
  type LensProjection,
  type LensProjectionCoordinate,
} from "@/lib/explore";

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
  readonly formula?: string;
  readonly category?: string;
  readonly summary?: string;
  readonly lensValues: Readonly<Record<string, string>>;
  readonly coordinates: Readonly<Record<string, LensProjectionCoordinate>>;
  readonly evidenceLabel: string;
  readonly evidenceTone: ExploreEvidenceTone;
  readonly accent: string;
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

interface LensDefinition {
  readonly id: string;
  readonly axis: MoleculeClassificationAxis;
  readonly label: string;
  readonly description: string;
  readonly meaning: string;
  readonly doesNotMean: string;
}

const GENERATED_AT = "2026-08-21T00:00:00.000Z";
const ALGORITHM_VERSION = "categorical-layout@1.0.0";

const LENS_DEFINITIONS: readonly LensDefinition[] = [
  {
    id: "therapeutic",
    axis: "therapeutic-area",
    label: "Tedavi alanı",
    description: "Kaynak ve review durumu taşıyan tedavi alanı kategorileri.",
    meaning: "Aynı kürate edilmiş tedavi alanı etiketine sahip kayıtlar aynı bölgeyi paylaşır.",
    doesNotMean: "Ekran yakınlığı klinik benzerlik, etkililik veya ortak endikasyon kanıtı değildir.",
  },
  {
    id: "target",
    axis: "target-profile",
    label: "Hedef ailesi",
    description: "Review-gated hedef profili kategorilerinin deterministik yerleşimi.",
    meaning: "Aynı kürate edilmiş hedef profili etiketi kayıtları aynı bölgeye yerleştirir.",
    doesNotMean: "Ekran mesafesi bağlanma gücü, seçicilik veya biyolojik etki ölçümü değildir.",
  },
  {
    id: "scaffold",
    axis: "structural-family",
    label: "Kürate edilmiş iskelet ailesi",
    description: "İnsan tarafından adlandırılmış scaffold ailelerinin kategorik görünümü.",
    meaning: "Aynı kürate edilmiş yapısal aile etiketi kayıtları aynı bölgeyi paylaşır.",
    doesNotMean: "Bu sürüm fingerprint, Tanimoto veya nicel yapısal benzerlik hesabı değildir.",
  },
] as const;

const ACCENTS = [
  "#c8ff62",
  "#69e7da",
  "#ffb86b",
  "#85a8ff",
  "#db91ff",
  "#ff8f83",
  "#73dfb7",
  "#f2d36f",
  "#a8dcff",
  "#b9f38b",
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

function evidenceLabel(record: MoleculeRecord, statuses: readonly VerificationStatus[]) {
  const identityStatus = record.identity.verification.status;
  const identityLabel =
    identityStatus === "verified" || identityStatus === "expert-reviewed"
      ? "Kimlik doğrulandı"
      : "Kimlik incelemede";
  const classificationsReviewed = statuses
    .slice(1)
    .every((status) => status === "verified" || status === "expert-reviewed");
  return `${identityLabel} · ${
    classificationsReviewed
      ? "sınıflandırmalar gözden geçirildi"
      : "eğitim sınıflandırmaları incelemede"
  }`;
}

export function createExploreCatalogView(
  records: readonly MoleculeRecord[],
): ExploreCatalogView {
  const inputVersion = `seed-catalog-2026-08-21:${records.length}`;
  const projections = LENS_DEFINITIONS.map((definition) =>
    createCategoricalLensProjection(
      {
        lensId: definition.id,
        projectionId: `projection:${definition.id}:categorical-v1`,
        algorithmVersion: ALGORITHM_VERSION,
        inputVersion,
        generatedAt: GENERATED_AT,
        meaning: definition.meaning,
        doesNotMean: definition.doesNotMean,
        verificationStatus: "pending-review",
      },
      records.map((record) => ({
        id: record.id,
        category: classificationLabel(record, definition.axis),
      })),
    ),
  );

  const lenses: ExploreLensView[] = LENS_DEFINITIONS.map((definition, index) => {
    const projection = projections[index];
    if (!projection) throw new Error(`Missing projection for lens ${definition.id}`);
    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      projectionId: projection.projectionId,
      algorithm: projection.algorithm,
      algorithmVersion: projection.algorithmVersion,
      inputVersion: projection.inputVersion,
      inputHash: projection.inputHash,
      generatedAt: projection.generatedAt,
      meaning: projection.meaning,
      doesNotMean: projection.doesNotMean,
      coordinateSystem: projection.coordinateSystem,
      verificationStatus: projection.verificationStatus,
    };
  });

  const molecules: ExploreMoleculeView[] = records.map((record) => {
    const lensValues = Object.fromEntries(
      LENS_DEFINITIONS.map((definition) => [
        definition.id,
        classificationLabel(record, definition.axis),
      ]),
    );
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
      formula: record.identity.molecularFormula,
      category: lensValues.target,
      summary: record.educationalProfile.summary,
      lensValues,
      coordinates,
      evidenceLabel: evidenceLabel(record, statuses),
      evidenceTone: evidenceTone(statuses),
      accent: ACCENTS[stableHash(record.id) % ACCENTS.length] ?? ACCENTS[0],
      structure: {
        pubChemCid: record.identity.pubChemCid,
        threeDUrl: threeD.publicPath,
        twoDUrl: twoD.publicPath,
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
