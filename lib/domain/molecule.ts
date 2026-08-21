import type { EvidenceClaim, VerificationRecord } from "./evidence";
import type { ChemicalFormId, MoleculeId, SourceId } from "./ids";
import type { MoleculeStructureSet } from "./structure";

export type StereoPresentation =
  | "achiral"
  | "single-stereoisomer"
  | "racemate"
  | "stereoisomer-mixture"
  | "unspecified";

export type StereoConfiguration = "R" | "S" | "mixture" | "undefined";

export interface StereoCenter {
  readonly atomLabel: string;
  readonly configuration: StereoConfiguration;
}

export interface StereochemistryProfile {
  readonly presentation: StereoPresentation;
  readonly centers: readonly StereoCenter[];
  readonly summary: string;
  readonly verification: VerificationRecord;
}

export type ChemicalFormKind =
  | "free-base"
  | "free-acid"
  | "salt"
  | "solvate"
  | "ester"
  | "prodrug"
  | "other";

export interface ChemicalForm {
  readonly id: ChemicalFormId;
  readonly parentMoleculeId: MoleculeId;
  readonly displayName: string;
  readonly kind: ChemicalFormKind;
  readonly counterionOrModifier: string | null;
  readonly relation: "active-moiety" | "pharmaceutical-form" | "related-form";
  readonly isCommonProductContext: boolean;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export interface MolecularIdentity {
  readonly preferredName: string;
  readonly synonyms: readonly string[];
  readonly molecularFormula: string;
  readonly molecularWeight: number;
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string | null;
  readonly inchiKey: string;
  readonly pubChemCid: number;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export type BetaReceptorProfile =
  | "nonselective-beta"
  | "beta1-selective"
  | "mixed-alpha1-beta"
  | "beta1-selective-vasodilatory"
  | "other"
  | "unknown";

export interface BetaBlockerProfile {
  readonly receptorProfile: BetaReceptorProfile;
  readonly scaffoldFamily: string;
  readonly educationalSummary: string;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export interface ConformerReference {
  readonly kind:
    | "computed-conformer"
    | "experimental-bound-pose"
    | "model-generated-pose"
    | "user-edited-conformation";
  readonly sourceId: SourceId | null;
  readonly url: string | null;
  readonly verification: VerificationRecord;
}

export interface MoleculeRecord {
  readonly id: MoleculeId;
  readonly identity: MolecularIdentity;
  readonly structures: MoleculeStructureSet;
  readonly stereochemistry: StereochemistryProfile;
  readonly forms: readonly ChemicalForm[];
  readonly betaBlockerProfile: BetaBlockerProfile;
  readonly conformers: readonly ConformerReference[];
  readonly claims: readonly EvidenceClaim[];
  readonly tags: readonly string[];
  readonly notForClinicalUse: true;
}
