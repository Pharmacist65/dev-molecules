import type {
  CanonicalSynthesisRouteId,
  CanonicalSynthesisRouteType,
  SynthesisApplicability,
  SynthesisCoverageId,
  SynthesisIdentityScope,
  SynthesisLicenseState,
  SynthesisReviewState,
  SynthesisRouteCompleteness,
  SynthesisSearchId,
  SynthesisSourceEvidenceId,
} from "./synthesis-route";
import type {
  SynthesisEvidenceProcessingSummary,
  SynthesisMoleculeBestOutcome,
} from "./synthesis-extraction";
import type { PublicAlphaSynthesisDraftReference } from "./public-alpha-synthesis-draft";

export const SYNTHESIS_ASSESSMENT_STATES = [
  "not_assessed",
  "searching",
  "assessed",
] as const;

export type SynthesisAssessmentState =
  (typeof SYNTHESIS_ASSESSMENT_STATES)[number];

export const SYNTHESIS_SOURCE_EVIDENCE_STATES = [
  "none_found",
  "candidate_sources",
  "direct_source_resolved",
] as const;

export type SynthesisSourceEvidenceState =
  (typeof SYNTHESIS_SOURCE_EVIDENCE_STATES)[number];

export interface SynthesisSearchProviderAttempt {
  readonly provider: "patent" | "journal" | "aggregator" | "open_reaction_dataset";
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly status:
    | "completed"
    | "completed_with_errors"
    | "rate_limited"
    | "unavailable";
  readonly queryCount: number;
  readonly candidateCount: number;
  readonly searchedAt: string;
  readonly errors: readonly string[];
}

/**
 * An assessed `none_found` result means no evidence was found inside this
 * recorded scope. It is never an exhaustive claim about all literature.
 */
export interface SynthesisSourceSearchScope {
  readonly searchId: SynthesisSearchId;
  readonly pipelineVersion: string;
  readonly configurationHash: string;
  readonly catalogSnapshotId: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly aliasesQueried: readonly string[];
  readonly identifiersQueried: readonly {
    readonly kind:
      | "pubchem_cid"
      | "preferred_name"
      | "alias"
      | "canonical_smiles"
      | "isomeric_smiles";
    readonly value: string;
  }[];
  readonly providers: readonly SynthesisSearchProviderAttempt[];
  readonly exhaustiveInternetSearch: false;
}

export interface SynthesisCoverageRouteReference {
  readonly routeId: CanonicalSynthesisRouteId;
  readonly routeType: CanonicalSynthesisRouteType;
  readonly routeCompleteness: SynthesisRouteCompleteness;
  readonly reviewState: SynthesisReviewState;
  readonly licenseState: SynthesisLicenseState;
}

/** Exactly one record is required for every exact Basic Molecular Record identity. */
export interface SynthesisCoverageRecord {
  readonly schemaVersion: 1;
  readonly id: SynthesisCoverageId;
  readonly catalogSnapshotId: string;
  readonly identityScope: SynthesisIdentityScope;
  readonly assessmentState: SynthesisAssessmentState;
  readonly sourceEvidenceState: SynthesisSourceEvidenceState;
  readonly applicability: SynthesisApplicability;
  readonly reviewState: SynthesisReviewState;
  readonly licenseState: SynthesisLicenseState;
  readonly sourceSearchScope: SynthesisSourceSearchScope;
  readonly sourceEvidenceIds: readonly SynthesisSourceEvidenceId[];
  readonly routes: readonly SynthesisCoverageRouteReference[];
  readonly unresolvedReasons: readonly string[];
  /**
   * Added by the extraction pipeline. Optional on historical/private discovery
   * cache records; required by the current public release validator.
   */
  readonly evidenceProcessing?: SynthesisEvidenceProcessingSummary;
  readonly bestOutcome?: SynthesisMoleculeBestOutcome;
  /** Public fail-closed projection may retain aggregate state while redacting evidence IDs. */
  readonly evidenceDetailsRedacted?: true;
  /** Safe aggregate flag; it exposes no route type, steps, locator or completeness. */
  readonly reportedRouteFoundPendingReview?: boolean;
  /**
   * Separately gated public-alpha educational drafts. These never participate
   * in canonical published-route, curriculum, or verified-science counts.
   */
  readonly publicAlphaDrafts?: readonly PublicAlphaSynthesisDraftReference[];
  readonly updatedAt: string;
}

export interface SynthesisCoverageSnapshotManifest {
  readonly schemaVersion: 1;
  readonly catalogSnapshotId: string;
  readonly pipelineVersion: string;
  readonly generatedAt: string;
  readonly recordCount: number;
  readonly coverageSha256: string;
}
