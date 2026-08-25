import type {
  EvidenceLevel,
  ReuseStatus,
  VerificationStatus,
} from "../evidence";
import type { SourceId } from "../ids";

/**
 * Conditions are mandatory even when a field is not a measurement. The note
 * states the evidence boundary; the structured keys keep unlike routes,
 * species, formulations and assays from being silently merged.
 */
export interface EvidenceConditions {
  readonly note: string;
  readonly route?: string;
  readonly formulation?: string;
  readonly species?: string;
  readonly population?: string;
  readonly dose?: string;
  readonly fedState?: string;
  readonly studyDesign?: string;
  readonly cohortSize?: number;
  readonly coefficientOfVariationPercent?: number;
  readonly assay?: string;
  readonly matrix?: string;
  readonly temperature?: string;
  readonly pH?: string;
}

export type EvidenceValueQualifier =
  | "approximately"
  | "range"
  | "less-than";

export interface EvidenceField<T> {
  readonly value: T;
  readonly unit: string | null;
  /** True only for intrinsically unitless numeric fields such as pKa/logP. */
  readonly dimensionless?: boolean;
  readonly valueQualifier?: EvidenceValueQualifier;
  readonly conditions: EvidenceConditions;
  readonly sourceId: SourceId;
  readonly evidenceType: EvidenceLevel;
  readonly reviewStatus: VerificationStatus;
}

export type DossierCoverageDimension =
  | "identity"
  | "structure"
  | "classification"
  | "pharmacology"
  | "adme"
  | "synthesis"
  | "nomenclature"
  | "learning"
  | "review";

export type DossierCoverageStatus =
  | "reviewed"
  | "source-supported"
  | "pending-review"
  | "unavailable";

export interface DossierCoverageIndicator {
  readonly dimension: DossierCoverageDimension;
  readonly status: DossierCoverageStatus;
  readonly reason: string;
  readonly availableFields: number;
  readonly totalFields: number | null;
}

export interface ResolvedDossierSource {
  readonly id: SourceId;
  readonly provider: string;
  readonly title: string;
  readonly externalId: string;
  readonly url: string;
  readonly retrievedAt: string;
  readonly evidenceType: EvidenceLevel;
  readonly reviewStatus: VerificationStatus;
  readonly scope: string;
  readonly license: {
    readonly label: string;
    readonly url: string | null;
    readonly reuseStatus: ReuseStatus;
  };
}

export const isReviewedStatus = (status: VerificationStatus): boolean =>
  status === "verified" || status === "expert-reviewed";

export const hasCompleteEvidenceField = <T>(
  field: EvidenceField<T>,
): boolean => {
  if (!field.conditions.note.trim() || !field.sourceId.startsWith("source:")) {
    return false;
  }
  if (typeof field.value === "number") {
    return Number.isFinite(field.value) && (
      field.dimensionless === true || Boolean(field.unit?.trim())
    );
  }
  return typeof field.value !== "string" || field.value.trim().length > 0;
};

export const isReviewedEvidenceField = <T>(
  field: EvidenceField<T>,
): boolean => hasCompleteEvidenceField(field) && isReviewedStatus(field.reviewStatus);
