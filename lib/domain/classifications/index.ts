import type { VerificationStatus } from "../evidence";
import type { SourceId } from "../ids";
import type { EvidenceField } from "../dossier/evidence-field";

export type ClassificationAxis =
  | "therapeutic-atc"
  | "pharmacological-mechanism"
  | "chemical-scaffold";

export interface ClassificationRef {
  readonly id: string;
  readonly axis: ClassificationAxis;
  readonly code: EvidenceField<string> | null;
  readonly label: EvidenceField<string>;
  readonly level: number | null;
  readonly parentId: string | null;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

export interface ClassificationHierarchy {
  readonly axis: ClassificationAxis;
  readonly roots: readonly ClassificationRef[];
  readonly byParentId: ReadonlyMap<string | null, readonly ClassificationRef[]>;
}

export interface ClassificationProfile {
  readonly therapeutic: readonly ClassificationRef[];
  readonly pharmacological: readonly ClassificationRef[];
  readonly chemical: readonly ClassificationRef[];
  readonly hierarchies: readonly ClassificationHierarchy[];
  readonly withheldCandidateCount: number;
  readonly availability: "reviewed" | "source-supported" | "unavailable";
  readonly unavailableReason: string | null;
}
