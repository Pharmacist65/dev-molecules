import type {
  CanonicalSynthesisRouteType,
  SynthesisApplicability,
  SynthesisCoverageId,
  SynthesisReviewState,
  SynthesisRouteCompleteness,
  SynthesisSourceLocator,
  SynthesisSourceEvidenceId,
} from "./synthesis-route";

export type SynthesisEvidenceAssociationId = `synthesis-evidence-association:${string}`;

export const SYNTHESIS_EVIDENCE_ACCESS_STATES = [
  "accessible",
  "access_blocked",
  "metadata_only",
  "unavailable",
] as const;

export type SynthesisEvidenceAccessState =
  (typeof SYNTHESIS_EVIDENCE_ACCESS_STATES)[number];

export const SYNTHESIS_EXTRACTION_OUTCOMES = [
  "unresolved",
  "resolved",
  "irrelevant",
  "identity_mismatch",
  "access_blocked",
  "insufficient_detail",
  "parse_error",
  "retryable_error",
  "duplicate",
  "superseded",
] as const;

export type SynthesisExtractionOutcome =
  (typeof SYNTHESIS_EXTRACTION_OUTCOMES)[number];

export type TerminalSynthesisExtractionOutcome = Exclude<
  SynthesisExtractionOutcome,
  "unresolved"
>;

export const SYNTHESIS_CANDIDATE_SOURCE_EVIDENCE_STATES = [
  "none",
  "candidate",
  "direct_segment",
  "direct_route",
] as const;

export type SynthesisCandidateSourceEvidenceState =
  (typeof SYNTHESIS_CANDIDATE_SOURCE_EVIDENCE_STATES)[number];

/**
 * Traffic-light rights state used by extraction. Canonical route reuse remains
 * a separate, more detailed permission model in `SynthesisLicenseState`.
 */
export const SYNTHESIS_EVIDENCE_LICENSE_STATES = [
  "green",
  "amber",
  "hold",
  "red",
  "unknown",
] as const;

export type SynthesisEvidenceLicenseState =
  (typeof SYNTHESIS_EVIDENCE_LICENSE_STATES)[number];

export const SYNTHESIS_MOLECULE_BEST_OUTCOMES = [
  "direct_complete_reported",
  "direct_partial_reported",
  "teaching_reconstruction_complete",
  "teaching_reconstruction_partial",
  "candidate_only",
  "access_blocked_only",
  "no_supporting_source_resolved",
] as const;

export type SynthesisMoleculeBestOutcome =
  (typeof SYNTHESIS_MOLECULE_BEST_OUTCOMES)[number];

export interface SynthesisEvidenceRightsAssessment {
  readonly copyrightState: "public_domain" | "copyrighted" | "unclear";
  readonly redistributionPermission:
    | "permitted"
    | "permitted_with_attribution"
    | "metadata_only"
    | "prohibited"
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
  /** An OA flag alone never upgrades this field. */
  readonly openAccessLabelOnly: boolean;
}

export interface SynthesisCandidateIdentityResolution {
  readonly molecularIdentity:
    | "exact_inchi_key"
    | "exact_structure_computed"
    | "connectivity_only"
    | "name_only"
    | "unresolved"
    | "mismatch";
  readonly documentIdentity:
    | "stable_identifier"
    | "fallback_identifier_missing"
    | "unresolved";
  readonly titleIdentity:
    | "preferred_name"
    | "alias"
    | "ambiguous_alias"
    | "not_applicable"
    | "mismatch";
  readonly formIdentity: "exact" | "compatible_parent" | "unclear" | "mismatch";
  readonly stereochemistry: "exact" | "unspecified" | "unclear" | "mismatch";
  readonly method: string;
  readonly toolName: string | null;
  readonly toolVersion: string | null;
  readonly confidence: number | null;
}

export interface SynthesisExtractionRetryMetadata {
  readonly retryCount: number;
  readonly lastAttemptedAt: string;
  readonly exactError: string;
  readonly retryPolicy: string;
  readonly pipelineVersion: string;
}

export interface SynthesisEvidenceAssociationAssessment {
  readonly schemaVersion: 1;
  readonly associationId: SynthesisEvidenceAssociationId;
  readonly coverageId: SynthesisCoverageId;
  readonly sourceEvidenceId: SynthesisSourceEvidenceId;
  readonly globalDocumentKey: string;
  readonly canonicalDocumentEvidenceId: SynthesisSourceEvidenceId;
  readonly documentAssociationCount: number;
  readonly accessState: SynthesisEvidenceAccessState;
  readonly extractionOutcome: TerminalSynthesisExtractionOutcome;
  readonly sourceEvidenceState: SynthesisCandidateSourceEvidenceState;
  /** Null means no route was asserted from this candidate. */
  readonly routeType: CanonicalSynthesisRouteType | null;
  readonly routeCompleteness: SynthesisRouteCompleteness;
  readonly reviewState: SynthesisReviewState;
  readonly applicability: SynthesisApplicability;
  readonly licenseState: SynthesisEvidenceLicenseState;
  readonly rights: SynthesisEvidenceRightsAssessment;
  readonly identityResolution: SynthesisCandidateIdentityResolution;
  readonly exactLocatorResolved: boolean;
  readonly sourceLocatorValue: string | null;
  readonly extractedSegmentId: string | null;
  readonly retry: SynthesisExtractionRetryMetadata | null;
  readonly attemptedAt: string;
  readonly pipelineVersion: string;
  readonly reasonCodes: readonly string[];
  readonly supersedesAssociationId: SynthesisEvidenceAssociationId | null;
  readonly duplicateOfAssociationId: SynthesisEvidenceAssociationId | null;
  readonly operationalDetailsIncluded: false;
}

export interface SynthesisEvidenceProcessingSummary {
  readonly pipelineVersion: string;
  readonly completedAt: string;
  readonly candidateAssociationCount: number;
  readonly terminalAssociationCount: number;
  readonly accessibleCount: number;
  readonly accessBlockedCount: number;
  readonly metadataOnlyCount: number;
  readonly unavailableCount: number;
  readonly extractionOutcomeCounts: Readonly<
    Record<TerminalSynthesisExtractionOutcome, number>
  >;
}

export interface SynthesisEvidenceExtractionManifest {
  readonly schemaVersion: 1;
  readonly pipelineVersion: string;
  readonly generatedAt: string;
  readonly catalogSnapshotId: string;
  readonly moleculeCount: number;
  readonly candidateBearingMoleculeCount: number;
  readonly candidateAssociationCount: number;
  readonly terminalAssociationCount: number;
  readonly unresolvedFinalCount: 0;
  readonly uniqueGlobalDocumentCount: number;
  readonly exactLocatorMissingBaselineCount: number;
  readonly journalFallbackIdentityBaselineCount: number;
  readonly currentExactLocatorMissingCount: number;
  readonly currentJournalFallbackIdentityCount: number;
  readonly ordDecodedFragmentCount: number;
  readonly directSegmentCandidateCount: number;
  readonly insufficientOrdReactantIdentityCount: number;
  readonly nonCovalentOrdTerminalCount: number;
  readonly ordParseErrorCount: number;
  readonly resolvedSegmentRecordCount: number;
  readonly baselineComparisonState: "matched" | "new_pipeline_counts_recorded";
  readonly assessmentSha256: string;
}

export interface SynthesisResolvedReactionParticipant {
  readonly role: "reactant" | "product";
  readonly name: string | null;
  readonly structure: string;
  readonly structureFormat: "smiles" | "inchi";
  readonly smiles: string | null;
  readonly inchi: string | null;
  readonly inchiKey: string;
  readonly identityResolution: "exact_inchi_key_computed";
  readonly cachedInchiKeyState: "not_provided" | "matched_computation";
  readonly resolverName: "Indigo";
  readonly resolverVersion: string;
  readonly resolverInputFormat: "smiles" | "inchi";
}

/**
 * Private, non-operational normalized fact projection. It is a pending direct
 * segment candidate, never a complete route and never public route detail.
 */
export interface SynthesisResolvedReactionSegment {
  readonly schemaVersion: 1;
  readonly segmentId: string;
  readonly coverageId: SynthesisCoverageId;
  readonly sourceEvidenceId: SynthesisSourceEvidenceId;
  readonly sourceLocator: SynthesisSourceLocator;
  readonly reactants: readonly [
    SynthesisResolvedReactionParticipant,
    ...SynthesisResolvedReactionParticipant[],
  ];
  readonly products: readonly [
    SynthesisResolvedReactionParticipant,
    ...SynthesisResolvedReactionParticipant[],
  ];
  readonly intermediates: readonly [];
  readonly reactionClass: {
    readonly taxonomyId: null;
    readonly label: "Unclassified";
    readonly normalizationState: "unclassified";
    readonly provenance: {
      readonly taxonomyName: null;
      readonly taxonomyVersion: null;
      readonly confidence: null;
      readonly state: "not_computed";
    };
  };
  readonly formedBonds: readonly [];
  readonly brokenBonds: readonly [];
  readonly atomMapping: {
    readonly state: "not_mapped";
    readonly mapperName: null;
    readonly mapperVersion: null;
    readonly confidence: null;
    readonly availableTool: "Indigo";
    readonly availableToolVersion: string;
    readonly reason: string;
  };
  readonly stereochemicalResult: {
    readonly state: "exact_target_product_identity";
    readonly targetInchiKey: string;
    readonly formCompatibility: "exact";
    readonly stereochemistryCompatibility: "exact";
  };
  readonly sourceEvidenceState: "direct_segment";
  readonly routeType: null;
  readonly routeCompleteness: "unknown";
  readonly reviewState: "pending";
  readonly applicability: "applicable";
  readonly licenseState: "amber";
  readonly operationalDetailsIncluded: false;
  readonly limitations: readonly string[];
}
