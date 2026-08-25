import type { EvidenceClaim, VerificationStatus } from "../evidence";
import type { MoleculeId, SourceId } from "../ids";
import type { EvidenceField } from "../dossier/evidence-field";
import type { ClassificationRef } from "../classifications";

export type TargetActionType =
  | "agonist"
  | "antagonist"
  | "inhibitor"
  | "modulator"
  | "binder"
  | "other";

/** A sourced target/action claim does not require an assay number. */
export interface PharmacologyTargetClaim {
  readonly id: string;
  readonly targetName: EvidenceField<string>;
  readonly targetFamily: EvidenceField<string> | null;
  readonly action: EvidenceField<TargetActionType>;
  readonly mechanism: EvidenceField<string> | null;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

export interface TargetInteraction {
  readonly id: string;
  readonly targetName: EvidenceField<string>;
  readonly targetFamily: EvidenceField<string> | null;
  readonly action: EvidenceField<TargetActionType>;
  readonly measurementType: EvidenceField<string>;
  readonly measurement: EvidenceField<number>;
  readonly species: EvidenceField<string>;
  readonly assayContext: EvidenceField<string>;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

export interface PathwayEffect {
  readonly id: string;
  readonly description: EvidenceField<string>;
}

export interface PharmacologyProfile {
  readonly moleculeId: MoleculeId;
  readonly classifications: readonly ClassificationRef[];
  readonly primaryTargets: readonly PharmacologyTargetClaim[];
  readonly targets: readonly TargetInteraction[];
  readonly actionTypes: readonly TargetActionType[];
  readonly mechanismClaims: readonly EvidenceClaim[];
  readonly pathwayEffects: readonly PathwayEffect[];
  readonly pharmacodynamicEffects: readonly EvidenceClaim[];
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
  readonly availability: "reviewed" | "source-supported" | "unavailable";
  readonly unavailableReason: string | null;
}
