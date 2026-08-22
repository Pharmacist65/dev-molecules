import type { EvidenceClaimId, MoleculeId, SourceId } from "./ids";

export type VerificationStatus =
  | "verified"
  | "expert-reviewed"
  | "source-supported"
  | "pending-review"
  | "predicted"
  | "conflicting"
  | "unknown";

export type EvidenceLevel =
  | "direct-experimental"
  | "regulatory"
  | "curated-database"
  | "literature-reported"
  | "analog-supported"
  | "computed"
  | "model-predicted"
  | "educational-simplification"
  | "no-evidence";

export type ContentIntent =
  | "reference"
  | "educational"
  | "research-preview";

export type SourceKind =
  | "curated-database"
  | "regulatory-label"
  | "journal"
  | "patent"
  | "textbook"
  | "computed-output"
  | "internal-review";

export type ReuseStatus =
  | "permitted"
  | "attribution-required"
  | "restricted"
  | "unknown";

export interface VerificationRecord {
  readonly status: VerificationStatus;
  readonly note?: string;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
}

export interface SourceReference {
  readonly id: SourceId;
  readonly provider: string;
  readonly kind: SourceKind;
  readonly title: string;
  readonly externalId: string;
  readonly url: string | null;
  readonly retrievedAt: string;
  readonly scope: string;
  readonly license: {
    readonly label: string;
    readonly url: string | null;
    readonly reuseStatus: ReuseStatus;
  };
  readonly verification: VerificationRecord;
}

export type ClaimCategory =
  | "identity"
  | "stereochemistry"
  | "form-relation"
  | "classification"
  | "target"
  | "mechanism"
  | "approval"
  | "synthesis"
  | "bioactivity"
  | "safety"
  | "educational";

export interface EvidenceClaim {
  readonly id: EvidenceClaimId;
  readonly subjectId: MoleculeId | string;
  readonly category: ClaimCategory;
  readonly statement: string;
  readonly intent: ContentIntent;
  readonly evidenceLevel: EvidenceLevel;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
  readonly limitations: readonly string[];
}

export const isReviewedVerification = (
  status: VerificationStatus,
): boolean => status === "verified" || status === "expert-reviewed";

