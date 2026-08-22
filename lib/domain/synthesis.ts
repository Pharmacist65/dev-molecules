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

export type SynthesisMaterialRole =
  | "starting-material"
  | "intermediate"
  | "final-product";

export type SynthesisStructureFormat = "smiles" | "name-only";

export type BondChangeKind = "formed" | "broken" | "order-changed";

export type AtomMappingOutcome = "retained" | "introduced" | "departed";

export type SynthesisSourceLocatorKind =
  | "patent-example"
  | "journal-figure"
  | "journal-scheme"
  | "journal-section";

export interface SynthesisSourceAnchor {
  readonly sourceId: SourceId;
  /** A direct primary-document URL, never a search-results URL. */
  readonly url: string;
  readonly locatorKind: SynthesisSourceLocatorKind;
  /** Human-resolvable location inside the primary document. */
  readonly locator: string;
  /** Paraphrased scope of what the cited location supports. */
  readonly supportScope: string;
}

export interface SynthesisMaterial {
  readonly id: string;
  readonly label: string;
  readonly role: SynthesisMaterialRole;
  readonly structure: {
    readonly format: SynthesisStructureFormat;
    readonly value: string;
    readonly sourceId: SourceId;
  };
}

export interface MappedAtom {
  readonly mapId: string;
  readonly inputMaterialId: string;
  readonly inputAtomLabel: string;
  readonly productAtomLabel: string;
  readonly outcome: AtomMappingOutcome;
}

export interface BondChange {
  readonly kind: BondChangeKind;
  readonly atomMapIds: readonly [string, string];
  readonly description: string;
}

export interface SynthesisAtomMapping {
  readonly status: AtomMappingStatus;
  readonly convention: "named-atom-correspondence-v1";
  readonly atoms: readonly MappedAtom[];
  readonly note: string;
}

export interface SynthesisStereochemistryScope {
  readonly sourcePresentation:
    | "absolute-configuration-assigned"
    | "relative-configuration-only"
    | "not-assigned";
  readonly teachingScope: string;
}

export interface SynthesisRouteReview {
  readonly status:
    | "source-audited-pending-expert-review"
    | "expert-reviewed"
    | "draft";
  readonly scope: string;
  readonly auditedAt?: string;
  readonly auditedBy?: string;
}

export interface SynthesisStep {
  readonly id: SynthesisStepId;
  readonly order: number;
  readonly title: string;
  /** Stable material IDs used by a 2D scheme renderer. */
  readonly inputMaterialIds: readonly string[];
  /**
   * Null only for a declared non-transforming orientation/evidence frame. A
   * renderer must never invent a chemical output when this value is null.
   */
  readonly outputMaterialId: string | null;
  readonly inputLabels: readonly string[];
  readonly outputLabel: string;
  readonly transformationFamily: string;
  readonly changeSummary: string;
  readonly learningRationale: string;
  readonly commonMisconception: string | null;
  readonly atomMappingStatus: AtomMappingStatus;
  readonly atomMapping: SynthesisAtomMapping;
  readonly bondChanges: readonly BondChange[];
  readonly evidenceLevel: EvidenceLevel;
  readonly verification: VerificationRecord;
  readonly sourceIds: readonly SourceId[];
}

export interface SynthesisStory {
  readonly id: SynthesisStoryId;
  /** Immutable content revision for citations, review and saved progress. */
  readonly version: string;
  readonly moleculeId: MoleculeId;
  readonly title: string;
  readonly routeType: SynthesisRouteType;
  readonly intent: ContentIntent;
  readonly summary: string;
  readonly routeExplanation: string;
  readonly primarySourceAnchors: readonly SynthesisSourceAnchor[];
  readonly startingMaterials: readonly SynthesisMaterial[];
  readonly intermediates: readonly SynthesisMaterial[];
  readonly finalProduct: SynthesisMaterial;
  readonly reactionClasses: readonly string[];
  readonly stereochemistry: SynthesisStereochemistryScope;
  readonly limitations: readonly string[];
  readonly review: SynthesisRouteReview;
  readonly steps: readonly SynthesisStep[];
  readonly sourceIds: readonly SourceId[];
  readonly verification: VerificationRecord;
  readonly safety: {
    readonly operationalDetailsIncluded: false;
    readonly note: string;
  };
}

const sourceReportedRouteTypes: ReadonlySet<SynthesisRouteType> = new Set([
  "literature-reported",
  "patent-reported",
]);

const sourceSupportedStatuses: ReadonlySet<VerificationRecord["status"]> =
  new Set(["verified", "expert-reviewed", "source-supported"]);

const isDirectHttpsDocumentUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !/\/(search|search\.cfm)$/i.test(url.pathname);
  } catch {
    return false;
  }
};

/**
 * Fail-closed presentation gate. AI proposals and uncited educational drafts can
 * still exist in the domain, but cannot be presented as literature/patent routes.
 */
export const canPresentAsSourceReported = (story: SynthesisStory): boolean =>
  sourceReportedRouteTypes.has(story.routeType) &&
  sourceSupportedStatuses.has(story.verification.status) &&
  story.primarySourceAnchors.length > 0 &&
  story.primarySourceAnchors.every(
    (anchor) =>
      story.sourceIds.includes(anchor.sourceId) &&
      isDirectHttpsDocumentUrl(anchor.url) &&
      anchor.locator.trim().length > 0,
  ) &&
  story.safety.operationalDetailsIncluded === false;
