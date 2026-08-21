import type { EvidenceClaim, VerificationRecord } from "./evidence";
import type {
  ChemicalFormId,
  MoleculeClassificationId,
  MoleculeId,
  RegulatoryProductId,
  SourceId,
} from "./ids";
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
  | "neutral"
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

export type MoleculeClassificationAxis =
  | "therapeutic-area"
  | "pharmacologic-class"
  | "target-profile"
  | "structural-family";

export interface MoleculeClassification {
  readonly id: MoleculeClassificationId;
  readonly axis: MoleculeClassificationAxis;
  /** Stable, machine-readable value used for grouping and filtering. */
  readonly value: string;
  readonly label: string;
  readonly isPrimary: boolean;
  readonly summary: string;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export interface MoleculeEducationalProfile {
  readonly summary: string;
  readonly learningContext: string;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export interface RegulatoryProductReference {
  readonly id: RegulatoryProductId;
  readonly moleculeId: MoleculeId;
  readonly authority: "US FDA";
  readonly jurisdiction: "US";
  readonly applicationNumber: `${"NDA" | "ANDA"}${string}`;
  readonly productNumber: string;
  readonly brandName: string;
  readonly sponsorName: string;
  readonly activeIngredient: {
    readonly name: string;
    readonly strength: string;
  };
  readonly dosageForm: string;
  readonly route: string;
  readonly marketingStatus: "Prescription" | "Over-the-counter";
  readonly referenceDrug: "Yes" | "No";
  readonly referenceStandard: "Yes" | "No";
  readonly chemicalFormId: ChemicalFormId;
  readonly relationship: "approved-product-linked-via-chemical-form";
  readonly approvalAction: {
    readonly submissionType: "ORIG";
    readonly submissionNumber: "1";
    readonly submissionStatus: "AP";
    /** Date of this product application's ORIG/1/AP action, not first active-moiety approval. */
    readonly actionDate: string;
  };
  readonly datasetLastUpdated: string;
  readonly retrievedAt: string;
  readonly canonicalSha256: string;
  readonly apiQueryUrl: string;
  readonly sourceId: SourceId;
  readonly sourceUrl: string;
  readonly verification: VerificationRecord;
  readonly limitations: readonly string[];
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
  readonly classifications: readonly MoleculeClassification[];
  readonly educationalProfile: MoleculeEducationalProfile;
  readonly regulatoryProducts: readonly RegulatoryProductReference[];
  readonly conformers: readonly ConformerReference[];
  readonly claims: readonly EvidenceClaim[];
  readonly tags: readonly string[];
  readonly notForClinicalUse: true;
}

export const getPrimaryClassification = (
  molecule: Pick<MoleculeRecord, "classifications">,
  axis: MoleculeClassificationAxis,
): MoleculeClassification | undefined => {
  const matches = molecule.classifications.filter(
    (classification) => classification.axis === axis,
  );
  return matches.find((classification) => classification.isPrimary) ?? matches[0];
};
