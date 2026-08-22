import type {
  EvidenceLevel,
  VerificationRecord,
} from "./evidence";
import type { AIEvidenceCardId, MoleculeId, SourceId } from "./ids";

export type StructuralStatus =
  | "valid"
  | "warning"
  | "invalid"
  | "not-assessed";

export type DatabaseIdentityStatus =
  | "exact-match"
  | "form-or-stereo-match"
  | "analogs-found"
  | "no-match-in-searched-sources"
  | "not-assessed";

export type SynthesisEvidenceStatus =
  | "reported-route-found"
  | "analog-transformations-found"
  | "model-proposal-only"
  | "no-route-found"
  | "not-assessed";

export type BiologicalEvidenceStatus =
  | "direct-experimental"
  | "analog-supported"
  | "model-predicted"
  | "no-evidence"
  | "not-assessed";

export type ExperimentalStatus =
  | "digitally-drawn"
  | "structure-checks-passed"
  | "reported-synthesized"
  | "biochemically-tested"
  | "cell-or-animal-data"
  | "clinical-data"
  | "regulatory-active-ingredient"
  | "unknown";

export interface AIEvidenceFinding {
  readonly label: string;
  readonly summary: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export interface AIEvidenceCard {
  readonly id: AIEvidenceCardId;
  readonly moleculeId: MoleculeId | null;
  readonly generatedAt: string;
  readonly structuralStatus: StructuralStatus;
  readonly databaseIdentity: DatabaseIdentityStatus;
  readonly synthesisEvidence: SynthesisEvidenceStatus;
  readonly biologicalEvidence: BiologicalEvidenceStatus;
  readonly experimentalStatus: ExperimentalStatus;
  readonly confidence: VerificationRecord["status"];
  readonly findings: readonly AIEvidenceFinding[];
  readonly searchedSourceIds: readonly SourceId[];
  readonly limitations: readonly string[];
  readonly notFoundIsNoveltyEvidence: false;
  readonly notClinicalOrPatentAdvice: true;
}

