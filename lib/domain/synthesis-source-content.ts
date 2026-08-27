import type {
  SynthesisCoverageId,
  SynthesisSourceEvidenceId,
} from "./synthesis-route";

export const SYNTHESIS_SOURCE_CONTENT_ACCESS_STATES = [
  "full_text_accessible",
  "metadata_only",
  "access_blocked",
  "retryable_error",
  "parse_error",
  "unsupported",
] as const;

export type SynthesisSourceContentAccessState =
  (typeof SYNTHESIS_SOURCE_CONTENT_ACCESS_STATES)[number];

/**
 * A terminal result for one source document in one extraction run. A
 * `source_locator_candidate` is only a private review lead: it is not a
 * reported route, verified evidence or a claim that synthesis is feasible.
 */
export const SYNTHESIS_SOURCE_CONTENT_ROUTE_EXTRACTION_STATES = [
  "source_locator_candidate",
  "inspected_no_segment",
  "metadata_only",
  "access_blocked",
  "retryable_error",
  "parse_error",
  "unsupported",
] as const;

export type SynthesisSourceContentRouteExtractionState =
  (typeof SYNTHESIS_SOURCE_CONTENT_ROUTE_EXTRACTION_STATES)[number];

export interface SynthesisSourceContentAliasQuery {
  readonly value: string;
  readonly normalizedValue: string;
  readonly origin: "preferred_name" | "catalog_alias" | "approval_name" | "inn";
  readonly globalExactIdentityCount: number;
  readonly identityAmbiguous: boolean;
}

export interface SynthesisSourceContentTargetIdentity {
  readonly coverageId: SynthesisCoverageId;
  readonly catalogEntityId: string;
  readonly preferredName: string;
  readonly inchiKey: string;
  readonly connectivityKey: string;
  readonly chemicalFormId: string;
  readonly chemicalFormKind: string;
  readonly stereoisomerId: string;
  readonly stereochemistrySpecified: boolean;
  readonly aliasQueries: readonly SynthesisSourceContentAliasQuery[];
}

export interface SynthesisSourceContentDocumentPlan {
  readonly schemaVersion: 1;
  readonly globalDocumentKey: string;
  readonly sourceKind: "journal" | "patent";
  readonly documentId: string;
  readonly associationCount: number;
  readonly sourceEvidenceIds: readonly SynthesisSourceEvidenceId[];
  readonly discoveryUrls: readonly string[];
  readonly discoveryTitles: readonly string[];
  readonly targetIdentities: readonly SynthesisSourceContentTargetIdentity[];
}

export interface SynthesisSourceContentAttemptProvenance {
  readonly attemptId: string;
  readonly attemptedAt: string;
  readonly completedAt: string;
  readonly provider: "europe_pmc" | "google_patents";
  readonly requestPurpose: "pmcid_resolution" | "journal_full_text" | "patent_full_text";
  readonly requestUrl: string;
  readonly finalUrl: string | null;
  readonly httpStatus: number | null;
  readonly contentType: string | null;
  readonly bytesReceived: number;
  readonly contentSha256: string | null;
  readonly retryOrdinal: number;
  readonly durationMs: number;
  readonly outcome:
    | "success"
    | "redirect_followed"
    | "not_found"
    | "access_blocked"
    | "retryable_error"
    | "unsupported_content"
    | "response_too_large";
  readonly exactError: string | null;
  readonly pipelineVersion: string;
  readonly userAgentPolicy: string;
  readonly contentStored: false;
}

export interface SynthesisSourceContentLocatorCandidate {
  readonly candidateId: string;
  readonly coverageId: SynthesisCoverageId;
  readonly catalogEntityId: string;
  readonly locatorKind:
    | "journal_section"
    | "journal_figure"
    | "patent_example"
    | "patent_scheme"
    | "patent_paragraph";
  readonly locatorValue: string;
  readonly matchedAlias: string;
  readonly aliasOrigin: SynthesisSourceContentAliasQuery["origin"];
  readonly identityMatchState:
    | "unique_name_context"
    | "ambiguous_alias_context"
    | "shadowed_by_more_specific_alias";
  readonly admissionState: "review_candidate" | "withheld_identity_ambiguous";
  readonly molecularIdentityResolution: "name_only";
  readonly formIdentityResolution: "unresolved_from_text";
  readonly stereochemistryResolution: "unresolved_from_text";
  readonly routeContextCues: readonly string[];
  /**
   * Deterministic non-quoting text generated only from locator kind/value and
   * controlled cue labels. It never contains a source-text window.
   */
  readonly generatedContextSummary: string;
  readonly contextSummaryCode: "catalog_alias_route_context_at_locator";
  readonly contextSummaryMode: "generated_non_quoting";
  readonly sourceTextRetained: false;
  readonly reviewState: "pending";
  readonly promotionState: "candidate_only";
  readonly operationalDetailsIncluded: false;
}

export interface SynthesisSourceContentRightsAssessment {
  readonly licenseState:
    | "open_license_detected"
    | "public_access_no_reuse_inference"
    | "metadata_only"
    | "unknown";
  readonly copyrightState: "public_domain" | "copyrighted" | "unclear";
  readonly redistributionPermission:
    | "permitted"
    | "permitted_with_attribution"
    | "metadata_only"
    | "unknown";
  readonly paraphrasePermission:
    | "permitted"
    | "permitted_with_attribution"
    | "metadata_only"
    | "unknown";
  readonly figureSchemeReusePermission:
    | "permitted"
    | "permitted_with_attribution"
    | "prohibited"
    | "unknown";
  readonly licenseEvidenceUrl: string | null;
  readonly licenseTextSha256: string | null;
  readonly openAccessLabelAloneUsedAsPermission: false;
  readonly privateLocatorReviewOnly: true;
}

export interface SynthesisSourceContentDocumentRecord {
  readonly schemaVersion: 1;
  readonly pipelineVersion: string;
  readonly parserName: "molevren-source-content-locator";
  readonly parserVersion: string;
  readonly globalDocumentKey: string;
  readonly documentPlanSha256: string;
  readonly sourceKind: "journal" | "patent";
  readonly documentId: string;
  readonly associationCount: number;
  readonly targetIdentityCount: number;
  readonly searchedAliases: readonly string[];
  readonly accessState: SynthesisSourceContentAccessState;
  readonly routeExtractionState: SynthesisSourceContentRouteExtractionState;
  readonly inspectedBlockCount: number;
  readonly locatorCandidateCount: number;
  readonly admittedLocatorCandidateCount: number;
  readonly ambiguousLocatorCandidateCount: number;
  readonly truncatedLocatorCandidateCount: number;
  readonly locatorCandidates: readonly SynthesisSourceContentLocatorCandidate[];
  readonly resolvedSourceUrl: string | null;
  readonly resolvedPmcid: string | null;
  readonly fullTextSha256: string | null;
  readonly rights: SynthesisSourceContentRightsAssessment;
  readonly attempts: readonly SynthesisSourceContentAttemptProvenance[];
  readonly reasonCodes: readonly string[];
  readonly reviewState: "pending";
  readonly canonicalRouteCreated: false;
  readonly directReportedEvidenceClaimed: false;
  readonly contentStored: false;
  readonly operationalDetailsIncluded: false;
  readonly completedAt: string;
  /** SHA-256 over the complete canonical record excluding this field. */
  readonly recordSha256: string;
}

export interface SynthesisSourceContentRunManifest {
  readonly schemaVersion: 1;
  readonly pipelineVersion: string;
  readonly parserVersion: string;
  readonly runId: string;
  readonly catalogSnapshotId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly runState: "partial" | "complete";
  readonly acceptedCandidateAssociationCount: number;
  readonly sourceContentAssociationCount: number;
  readonly completedSourceContentAssociationCount: number;
  readonly expectedDocumentCount: number;
  readonly completedDocumentCount: number;
  readonly remainingDocumentCount: number;
  readonly selectedDocumentCount: number;
  readonly processedDocumentCount: number;
  readonly cachedDocumentCount: number;
  readonly documentCountsBySourceKind: Readonly<Record<"journal" | "patent", number>>;
  readonly completedDocumentCountsBySourceKind: Readonly<
    Record<"journal" | "patent", number>
  >;
  readonly routeExtractionStateCounts: Readonly<
    Record<SynthesisSourceContentRouteExtractionState, number>
  >;
  readonly accessStateCounts: Readonly<Record<SynthesisSourceContentAccessState, number>>;
  readonly rightsStateCounts: Readonly<
    Record<SynthesisSourceContentRightsAssessment["licenseState"], number>
  >;
  readonly routeExtractionByAccessState: Readonly<
    Record<
      SynthesisSourceContentAccessState,
      Readonly<Record<SynthesisSourceContentRouteExtractionState, number>>
    >
  >;
  readonly rightsByAccessState: Readonly<
    Record<
      SynthesisSourceContentAccessState,
      Readonly<Record<SynthesisSourceContentRightsAssessment["licenseState"], number>>
    >
  >;
  readonly locatorTotals: {
    readonly located: number;
    readonly admitted: number;
    readonly ambiguous: number;
    readonly truncated: number;
    readonly retained: number;
  };
  readonly canonicalRouteCreatedCount: 0;
  readonly directReportedEvidenceClaimedCount: 0;
  readonly fullTextStored: false;
  readonly publicArtifactsWritten: false;
  readonly rejectedPredecessor: {
    readonly pipelineVersion: "synthesis-source-content-1.0.0";
    readonly workPath: "work/synthesis-source-content/v1/";
    readonly reusePermitted: false;
    readonly reason: string;
  };
  readonly recordSetSha256: string;
}
