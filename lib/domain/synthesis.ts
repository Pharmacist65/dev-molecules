import type {
  ContentIntent,
  EvidenceLevel,
  VerificationRecord,
} from "./evidence";
import type {
  MoleculeId,
  SourceId,
  SynthesisStepId,
  SynthesisStoryId,
} from "./ids";

export type SynthesisRouteType =
  | "literature-reported"
  | "patent-reported"
  | "educational-simplification"
  | "ai-proposed";

export type AtomMappingStatus =
  | "reviewed"
  | "draft"
  | "not-mapped"
  | "not-applicable";

export interface SynthesisStep {
  readonly id: SynthesisStepId;
  readonly order: number;
  readonly title: string;
  readonly inputLabels: readonly string[];
  readonly outputLabel: string;
  readonly transformationFamily: string;
  readonly changeSummary: string;
  readonly learningRationale: string;
  readonly commonMisconception: string | null;
  readonly atomMappingStatus: AtomMappingStatus;
  readonly evidenceLevel: EvidenceLevel;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export interface SynthesisStory {
  readonly id: SynthesisStoryId;
  readonly moleculeId: MoleculeId;
  readonly title: string;
  readonly routeType: SynthesisRouteType;
  readonly intent: ContentIntent;
  readonly summary: string;
  readonly steps: readonly SynthesisStep[];
  readonly sourceIds: readonly SourceId[];
  readonly verification: VerificationRecord;
  readonly safety: {
    readonly operationalDetailsIncluded: false;
    readonly note: string;
  };
}

