import type {
  SynthesisAssessmentState,
  SynthesisSourceEvidenceState,
} from "./synthesis-coverage";
import type {
  SynthesisCoverageId,
  SynthesisReviewState,
  SynthesisSourceEvidenceId,
  SynthesisSourceLocator,
} from "./synthesis-route";

/**
 * Mutually exclusive molecule-level coverage states. These describe recorded
 * educational route evidence; they are not synthesizability claims.
 */
export const SYNTHESIS_EDUCATIONAL_COVERAGE_STATES = [
  "complete_learning_route",
  "substantive_partial_route",
  "fragmentary_route",
  "candidate_only",
  "no_supporting_source_resolved",
] as const;

export type SynthesisEducationalCoverageState =
  (typeof SYNTHESIS_EDUCATIONAL_COVERAGE_STATES)[number];

export const SYNTHESIS_GAP_KINDS = [
  "source_discovery",
  "route_extraction",
  "upstream_continuity",
  "intermediate_identity",
  "transformation",
  "form_or_stereochemistry",
] as const;

export type SynthesisGapKind = (typeof SYNTHESIS_GAP_KINDS)[number];

export const SYNTHESIS_GAP_UNRESOLVED_REASONS = [
  "no_supporting_source_in_recorded_scope",
  "candidate_source_not_extracted",
  "candidate_source_details_redacted",
  "upstream_boundary_not_resolved",
  "adjacent_identity_not_resolved",
  "required_transformation_not_resolved",
  "source_locator_not_resolved",
  "form_or_stereochemistry_conflict",
  "atom_mapping_not_resolved",
  "scientific_review_pending",
] as const;

export type SynthesisGapUnresolvedReason =
  (typeof SYNTHESIS_GAP_UNRESOLVED_REASONS)[number];

export type SynthesisGapId = `synthesis-gap:${string}`;

export interface ExactSynthesisGapIdentity {
  readonly resolutionState: "exact";
  readonly identityId: string;
  readonly inchiKey: string;
  readonly canonicalSmiles: string;
}

export interface UnresolvedSynthesisGapIdentity {
  readonly resolutionState: "unresolved";
  readonly identityId: null;
  readonly inchiKey: null;
  readonly canonicalSmiles: null;
}

export type SynthesisGapIdentity =
  | ExactSynthesisGapIdentity
  | UnresolvedSynthesisGapIdentity;

export interface UnresolvedRequiredTransformation {
  readonly resolutionState: "unresolved";
  readonly reactionClassId: null;
  readonly formedBond: null;
  readonly brokenBond: null;
}

export interface ResolvedRequiredTransformation {
  readonly resolutionState: "resolved";
  readonly reactionClassId: string;
  readonly formedBond: string | null;
  readonly brokenBond: string | null;
}

export type SynthesisGapRequiredTransformation =
  | UnresolvedRequiredTransformation
  | ResolvedRequiredTransformation;

export interface SynthesisGapCandidateSource {
  readonly sourceEvidenceId: SynthesisSourceEvidenceId;
  readonly locator: SynthesisSourceLocator | null;
  readonly reviewState: SynthesisReviewState;
}

export type SynthesisGapSourceBoundary =
  | {
      readonly state: "none_resolved";
      readonly resolvedSourceId: null;
      readonly resolvedLocator: null;
    }
  | {
      readonly state: "candidate_only";
      readonly resolvedSourceId: null;
      readonly resolvedLocator: null;
      readonly candidateDetailsRedacted: boolean;
    }
  | {
      readonly state: "direct_source_resolved";
      readonly resolvedSourceId: SynthesisSourceEvidenceId;
      readonly resolvedLocator: SynthesisSourceLocator;
    };

export type SynthesisGapMappingBoundary =
  | {
      readonly state: "not_mapped";
      readonly mappingArtifactId: null;
      readonly atomSpecificClaimsAllowed: false;
    }
  | {
      readonly state: "computed_unreviewed";
      readonly mappingArtifactId: string;
      readonly atomSpecificClaimsAllowed: false;
    }
  | {
      readonly state: "reviewed";
      readonly mappingArtifactId: string;
      readonly atomSpecificClaimsAllowed: true;
    };

export interface SynthesisGapReviewBoundary {
  readonly reviewState: SynthesisReviewState;
  readonly verifiedScientificClaim: boolean;
  readonly verifiedPublicationEligible: boolean;
}

interface SynthesisRouteGapRecordBase {
  readonly schemaVersion: 1;
  readonly gapId: SynthesisGapId;
  readonly coverageId: SynthesisCoverageId;
  /** Public-draft alternative id for an occurrence-scoped route gap; null for target-level gaps. */
  readonly routeId: string | null;
  readonly kind: SynthesisGapKind;
  readonly fromIdentity: SynthesisGapIdentity;
  readonly toIdentity: SynthesisGapIdentity;
  readonly requiredTransformation: SynthesisGapRequiredTransformation;
  readonly candidateSources: readonly SynthesisGapCandidateSource[];
  readonly sourceBoundary: SynthesisGapSourceBoundary;
  readonly mappingBoundary: SynthesisGapMappingBoundary;
  readonly reviewBoundary: SynthesisGapReviewBoundary;
  /** True only when exact adjacent identities and direct source evidence exist. */
  readonly continuousEdgeEligible: boolean;
}

export interface UnresolvedSynthesisRouteGapRecord
  extends SynthesisRouteGapRecordBase {
  readonly resolutionState: "unresolved" | "candidate_sources";
  readonly unresolvedReasons: readonly [
    SynthesisGapUnresolvedReason,
    ...SynthesisGapUnresolvedReason[],
  ];
  readonly resolvedSourceId: null;
  readonly resolvedAt: null;
  readonly continuousEdgeEligible: false;
}

export interface ResolvedSynthesisRouteGapRecord
  extends SynthesisRouteGapRecordBase {
  readonly resolutionState: "resolved";
  readonly fromIdentity: ExactSynthesisGapIdentity;
  readonly toIdentity: ExactSynthesisGapIdentity;
  readonly requiredTransformation: ResolvedRequiredTransformation;
  readonly sourceBoundary: Extract<
    SynthesisGapSourceBoundary,
    { readonly state: "direct_source_resolved" }
  >;
  readonly unresolvedReasons: readonly [];
  readonly resolvedSourceId: SynthesisSourceEvidenceId;
  readonly resolvedAt: string;
  readonly continuousEdgeEligible: true;
}

export type SynthesisRouteGapRecord =
  | UnresolvedSynthesisRouteGapRecord
  | ResolvedSynthesisRouteGapRecord;

export interface SynthesisEducationalCoverageProjection {
  readonly coverageId: SynthesisCoverageId;
  readonly catalogEntityId: string;
  readonly state: SynthesisEducationalCoverageState;
  readonly assessmentState: SynthesisAssessmentState;
  readonly sourceEvidenceState: SynthesisSourceEvidenceState;
  readonly reviewState: SynthesisReviewState;
  readonly exactTargetIdentityResolved: boolean;
  readonly maximumContinuousResolvedTransformationCount: number;
  readonly canonicalRouteCount: number;
  readonly publicDraftRouteCount: number;
  readonly explicitRouteGapCount: number;
  readonly primaryGapKind: SynthesisGapKind | null;
  readonly primaryUnresolvedReason: SynthesisGapUnresolvedReason | null;
  readonly verifiedScientificClaim: boolean;
}

export interface SynthesisGapValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

const issue = (
  code: string,
  path: string,
  message: string,
): SynthesisGapValidationIssue => ({ code, path, message });

const isIsoDate = (value: string): boolean =>
  value.trim().length > 0 && !Number.isNaN(Date.parse(value));

/** Runtime guard for JSON/imported gap records. Inconsistent claims fail closed. */
export const validateSynthesisRouteGapRecord = (
  gap: SynthesisRouteGapRecord,
  path = "gap",
): readonly SynthesisGapValidationIssue[] => {
  const issues: SynthesisGapValidationIssue[] = [];
  if (!gap.gapId.startsWith("synthesis-gap:")) {
    issues.push(issue("invalid_gap_id", `${path}.gapId`, "Gap id must use the synthesis-gap namespace."));
  }
  if (!gap.coverageId.startsWith("synthesis-coverage:")) {
    issues.push(issue("invalid_coverage_id", `${path}.coverageId`, "Coverage id must use the synthesis-coverage namespace."));
  }
  if (new Set(gap.unresolvedReasons).size !== gap.unresolvedReasons.length) {
    issues.push(issue("duplicate_unresolved_reason", `${path}.unresolvedReasons`, "Unresolved reasons must be unique."));
  }

  const exactBoundary = gap.fromIdentity.resolutionState === "exact" &&
    gap.toIdentity.resolutionState === "exact";
  const directSource = gap.sourceBoundary.state === "direct_source_resolved";
  const resolvedTransformation = gap.requiredTransformation.resolutionState === "resolved";
  const continuitySupported = exactBoundary && directSource && resolvedTransformation;

  if (gap.resolutionState === "resolved") {
    if (!continuitySupported || !gap.continuousEdgeEligible) {
      issues.push(issue(
        "resolved_gap_without_continuity_evidence",
        path,
        "Resolved gaps require exact adjacent identities, a resolved transformation, and a direct source locator.",
      ));
    }
    if (gap.resolvedSourceId !== gap.sourceBoundary.resolvedSourceId) {
      issues.push(issue("resolved_source_mismatch", `${path}.resolvedSourceId`, "Resolved source ids must match."));
    }
    if (!isIsoDate(gap.resolvedAt)) {
      issues.push(issue("invalid_resolved_at", `${path}.resolvedAt`, "Resolved gaps require an ISO-compatible timestamp."));
    }
  } else {
    if (gap.unresolvedReasons.length === 0) {
      issues.push(issue("missing_unresolved_reason", `${path}.unresolvedReasons`, "Open gaps require at least one typed unresolved reason."));
    }
    if (gap.resolvedSourceId !== null || gap.resolvedAt !== null || gap.continuousEdgeEligible) {
      issues.push(issue("unresolved_gap_claims_resolution", path, "Open gaps cannot claim a resolved source, timestamp, or continuous edge."));
    }
    if (gap.resolutionState === "candidate_sources" && gap.sourceBoundary.state !== "candidate_only") {
      issues.push(issue("candidate_state_without_candidate_boundary", `${path}.sourceBoundary`, "Candidate gaps require candidate-only source state."));
    }
    if (gap.resolutionState === "candidate_sources" &&
        gap.candidateSources.length === 0 &&
        (gap.sourceBoundary.state !== "candidate_only" ||
          !gap.sourceBoundary.candidateDetailsRedacted)) {
      issues.push(issue("candidate_state_without_candidate_record", `${path}.candidateSources`, "Candidate gaps require a candidate record or an explicit redaction boundary."));
    }
    if (gap.resolutionState === "unresolved" && gap.sourceBoundary.state === "direct_source_resolved") {
      issues.push(issue("unresolved_gap_has_direct_source", `${path}.sourceBoundary`, "A direct source must be represented as a resolved or differently scoped gap."));
    }
  }

  if (gap.mappingBoundary.state !== "reviewed" && gap.mappingBoundary.atomSpecificClaimsAllowed) {
    issues.push(issue("unreviewed_mapping_allows_atom_claims", `${path}.mappingBoundary`, "Only reviewed atom mapping may enable atom-specific claims."));
  }
  const verified = gap.reviewBoundary.reviewState === "verified";
  if (gap.reviewBoundary.verifiedScientificClaim !== verified ||
      gap.reviewBoundary.verifiedPublicationEligible !== verified) {
    issues.push(issue("review_boundary_overclaim", `${path}.reviewBoundary`, "Verified claims and publication eligibility require verified review state."));
  }
  return issues;
};
