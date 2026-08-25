import type { AdmeProfile } from "../adme";
import type { ClassificationProfile } from "../classifications";
import type {
  EvidenceClaim,
  EvidenceLevel,
  VerificationStatus,
} from "../evidence";
import type { MoleculeId, SourceId, SynthesisStoryId } from "../ids";
import type { MetaboliteEdge, MetaboliteNode } from "../metabolites";
import type {
  PharmacologyTargetClaim,
  TargetInteraction,
} from "../pharmacology";
import type { EvidenceConditions, EvidenceField } from "./evidence-field";

export type DossierLocale = "tr" | "en";

export type LocalizedDossierText = Readonly<Record<DossierLocale, string>>;

export type FlagshipSectionStatus =
  | "reviewed"
  | "source-supported"
  | "pending-review"
  | "unavailable";

export interface FlagshipProductAnchor {
  readonly label: string;
  readonly route: string;
  readonly formulation: string;
  readonly chemicalFormId: string;
  readonly sourceId: SourceId;
  readonly sourceEffectiveDate: string;
  readonly boundary: string;
  readonly secondarySources: readonly {
    readonly sourceId: SourceId;
    readonly role: "stale-secondary" | "corroborating";
    readonly note: string;
  }[];
}

export interface FlagshipChemistryAnnotation {
  readonly id: string;
  readonly kind: "functional-group" | "scaffold";
  readonly label: EvidenceField<string>;
  /** Stable atom labels only; an empty list means structure highlighting is held. */
  readonly atomLabels: readonly string[];
  /** Zero-based atom positions in the record's exact connectivity SMILES. */
  readonly atomIndexes: readonly number[];
}

export interface FlagshipDescriptor {
  readonly id: string;
  readonly label: string;
  readonly field: EvidenceField<string | number> | null;
  readonly provenance: "source-reported" | "computed" | "unavailable";
  readonly unavailableReason: string | null;
}

export type FlagshipJourneyNodeKind =
  | "route"
  | "absorption"
  | "systemic-circulation"
  | "target-tissue"
  | "molecular-target"
  | "downstream-effect"
  | "metabolism"
  | "excretion";

export interface FlagshipJourneyNode {
  readonly id: string;
  readonly kind: FlagshipJourneyNodeKind;
  readonly label: string;
  readonly evidence: EvidenceField<string> | null;
  readonly unavailableReason: string | null;
}

export interface FlagshipSynthesisMaterial {
  readonly id: string;
  readonly label: string;
  readonly role: "starting-material" | "intermediate" | "final-product";
  /** Null is an explicit structure-review hold, never permission to guess. */
  readonly smiles: string | null;
  readonly structureReviewStatus: VerificationStatus;
  /** Material identity/structure sources; route role remains sourced by the step. */
  readonly sourceIds: readonly SourceId[];
}

export interface FlagshipSynthesisStep {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly inputMaterialIds: readonly string[];
  readonly outputMaterialId: string | null;
  readonly reactionClass: string;
  readonly bondChangeSummary: string;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

export interface FlagshipSynthesisRoute {
  readonly id: SynthesisStoryId;
  readonly title: string;
  readonly summary: string;
  readonly materials: readonly FlagshipSynthesisMaterial[];
  readonly steps: readonly FlagshipSynthesisStep[];
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
  readonly operationalDetailsIncluded: false;
  readonly limitations: readonly string[];
}

export interface FlagshipNomenclatureVariant {
  readonly id: string;
  readonly role: "preferred" | "source-specific" | "conflicting";
  readonly name: EvidenceField<string>;
}

export interface FlagshipNomenclatureSegment {
  readonly id: string;
  readonly kind:
    | "parent"
    | "locant"
    | "substituent"
    | "stereodescriptor"
    | "functional-suffix";
  readonly text: string;
  readonly atomLabels: readonly string[];
  /** Zero-based atom positions in the record's exact connectivity SMILES. */
  readonly atomIndexes: readonly number[];
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

export interface FlagshipNomenclature {
  readonly variants: readonly FlagshipNomenclatureVariant[];
  readonly segments: readonly FlagshipNomenclatureSegment[];
  readonly conflictNote: string | null;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

/**
 * Comparison claims inherently span two identities or product anchors. Keeping
 * both direct sources on the field prevents a single-source citation from
 * being misread as support for both sides of the comparison.
 */
export interface FlagshipComparativeEvidence<T> {
  readonly value: T;
  readonly conditions: EvidenceConditions;
  readonly sourceIds: readonly [SourceId, SourceId, ...SourceId[]];
  readonly evidenceType: EvidenceLevel;
  readonly reviewStatus: VerificationStatus;
}

export interface FlagshipComparator {
  readonly id: string;
  readonly name: string;
  readonly pubChemCid: number;
  readonly sharedScaffold: EvidenceField<string>;
  readonly changedGroups: readonly EvidenceField<string>[];
  readonly propertyDifferences: readonly FlagshipComparativeEvidence<string>[];
  readonly targetActionDifference: FlagshipComparativeEvidence<string> | null;
  readonly regulatoryContext: EvidenceField<string> | null;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
  /** Explicit gaps prevent a structure-only comparison from reading as complete. */
  readonly limitations: readonly string[];
}

export interface FlagshipLearningTask {
  readonly id: string;
  readonly kind: "structure" | "pharmacology" | "synthesis" | "nomenclature";
  readonly prompt: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly correctOptionId: string;
  readonly explanation: string;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

export interface FlagshipDossierSection<T> {
  readonly status: FlagshipSectionStatus;
  readonly content: T;
  readonly sourceIds: readonly SourceId[];
  readonly limitations: readonly string[];
}

export interface FlagshipDossierContent {
  readonly productAnchor: FlagshipProductAnchor;
  readonly chemistryAnnotations: FlagshipDossierSection<
    readonly FlagshipChemistryAnnotation[]
  >;
  readonly descriptors: FlagshipDossierSection<readonly FlagshipDescriptor[]>;
  readonly journey: FlagshipDossierSection<readonly FlagshipJourneyNode[]>;
  readonly synthesis: FlagshipDossierSection<FlagshipSynthesisRoute | null>;
  readonly nomenclature: FlagshipDossierSection<FlagshipNomenclature | null>;
  readonly comparisons: FlagshipDossierSection<readonly FlagshipComparator[]>;
  readonly learning: FlagshipDossierSection<readonly FlagshipLearningTask[]>;
  readonly explicitMissingFields: readonly string[];
}

/**
 * Locale-materialized scientific seed. It is kept outside React and merged only
 * after every source ID and evidence boundary has passed the application gate.
 */
export interface FlagshipDossierSeed {
  readonly moleculeId: MoleculeId;
  readonly classifications: ClassificationProfile;
  readonly primaryTargets: readonly PharmacologyTargetClaim[];
  readonly interactions: readonly TargetInteraction[];
  readonly mechanismClaims: readonly EvidenceClaim[];
  readonly admeProfiles: readonly AdmeProfile[];
  readonly metaboliteNodes: readonly MetaboliteNode[];
  readonly metaboliteEdges: readonly MetaboliteEdge[];
  readonly content: FlagshipDossierContent;
}
