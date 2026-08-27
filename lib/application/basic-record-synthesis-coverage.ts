import { resolveCatalogAssetPath } from "@/lib/catalog";
import {
  SYNTHESIS_ASSESSMENT_STATES,
  SYNTHESIS_SOURCE_EVIDENCE_STATES,
  type SynthesisAssessmentState,
  type SynthesisSourceEvidenceState,
} from "@/lib/domain/synthesis-coverage";
import {
  SYNTHESIS_APPLICABILITY_STATES,
  SYNTHESIS_LICENSE_STATES,
  SYNTHESIS_REVIEW_STATES,
  SYNTHESIS_ROUTE_COMPLETENESS_STATES,
  SYNTHESIS_ROUTE_TYPES,
  type CanonicalSynthesisRouteType,
  type SynthesisApplicability,
  type SynthesisLicenseState,
  type SynthesisReviewState,
  type SynthesisRouteCompleteness,
} from "@/lib/domain/synthesis-route";
import type { PublicAlphaSynthesisDraftReference } from "@/lib/domain/public-alpha-synthesis-draft";

export interface BasicRecordSynthesisCoverageIdentity {
  readonly catalogEntityId: string;
  readonly catalogSnapshotId: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
}

export interface BasicRecordSynthesisProviderAttempt {
  readonly provider: "patent" | "journal" | "aggregator" | "open_reaction_dataset";
  readonly adapterId: string;
  readonly status:
    | "completed"
    | "completed_with_errors"
    | "rate_limited"
    | "unavailable";
  readonly queryCount: number;
  readonly candidateCount: number;
  readonly searchedAt: string;
  readonly errorCount: number;
}

export interface BasicRecordSynthesisRouteReference {
  readonly routeId: `synthesis-route:${string}`;
  readonly routeType: CanonicalSynthesisRouteType;
  readonly routeCompleteness: SynthesisRouteCompleteness;
  readonly reviewState: SynthesisReviewState;
  readonly licenseState: SynthesisLicenseState;
}

export type BasicRecordSynthesisRoutePublicationState =
  | "reported_route"
  | "teaching_reconstruction"
  | "computationally_proposed_route"
  | "withheld"
  | "unavailable";

export interface BasicRecordSynthesisRouteComparison {
  readonly routeId: `synthesis-route:${string}`;
  readonly routeType: CanonicalSynthesisRouteType;
  readonly routeCompleteness: SynthesisRouteCompleteness;
  readonly reviewState: SynthesisReviewState;
  readonly publicationState: BasicRecordSynthesisRoutePublicationState;
  readonly comparisonAvailability: "available" | "withheld" | "unavailable";
  readonly numberOfSteps: number | null;
  readonly startingMaterials: readonly string[];
  readonly stereochemicalStrategy: string | null;
  readonly keyTransformations: readonly string[];
  readonly sourceYear: number | null;
}

export interface BasicRecordSynthesisRouteComparisonSet {
  readonly state:
    | "not_applicable"
    | "available"
    | "partially_available"
    | "withheld"
    | "unavailable";
  readonly routes: readonly BasicRecordSynthesisRouteComparison[];
}

export const SYNTHESIS_EXTRACTION_OUTCOMES = [
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

export type BasicRecordSynthesisExtractionOutcome =
  (typeof SYNTHESIS_EXTRACTION_OUTCOMES)[number];

export const SYNTHESIS_BEST_OUTCOMES = [
  "direct_complete_reported",
  "direct_partial_reported",
  "teaching_reconstruction_complete",
  "teaching_reconstruction_partial",
  "candidate_only",
  "access_blocked_only",
  "no_supporting_source_resolved",
] as const;

export type BasicRecordSynthesisBestOutcome =
  (typeof SYNTHESIS_BEST_OUTCOMES)[number];

export interface BasicRecordSynthesisEvidenceProcessing {
  readonly pipelineVersion: string;
  readonly completedAt: string;
  readonly candidateAssociationCount: number;
  readonly terminalAssociationCount: number;
  readonly accessBlockedCount: number;
  readonly accessibleCount: number;
  readonly metadataOnlyCount: number;
  readonly unavailableCount: number;
  readonly extractionOutcomeCounts: Readonly<
    Record<BasicRecordSynthesisExtractionOutcome, number>
  >;
}

export type BasicRecordSynthesisSurfaceState =
  | "public_draft_partial"
  | "direct_source_gated"
  | "reported_complete"
  | "reported_partial"
  | "teaching_reconstruction"
  | "candidate_extraction_complete"
  | "candidate_processing_incomplete"
  | "source_access_blocked"
  | "no_supporting_source_resolved";

/**
 * Browser-facing projection of the canonical coverage record. It deliberately
 * contains discovery and review status, not operational reaction conditions.
 */
export interface BasicRecordSynthesisCoverage {
  readonly coverageId: `synthesis-coverage:${string}`;
  readonly catalogSnapshotId: string;
  readonly pipelineVersion: string;
  readonly assessmentState: SynthesisAssessmentState;
  readonly sourceEvidenceState: SynthesisSourceEvidenceState;
  readonly applicability: SynthesisApplicability;
  readonly reviewState: SynthesisReviewState;
  readonly licenseState: SynthesisLicenseState;
  readonly searchedAt: string;
  readonly aliasesQueried: readonly string[];
  readonly providers: readonly BasicRecordSynthesisProviderAttempt[];
  readonly routes: readonly BasicRecordSynthesisRouteReference[];
  readonly publicAlphaDrafts: readonly PublicAlphaSynthesisDraftReference[];
  readonly routeComparison: BasicRecordSynthesisRouteComparisonSet;
  readonly bestOutcome: BasicRecordSynthesisBestOutcome | null;
  readonly evidenceProcessing: BasicRecordSynthesisEvidenceProcessing | null;
  readonly sourceEvidenceCount: number;
  readonly unresolvedReasons: readonly string[];
  /** Safe aggregate only; it exposes no route identity, type or completeness. */
  readonly reportedRouteFoundPendingReview: boolean;
  readonly chemicalFormKind:
    | "free_parent"
    | "salt"
    | "hydrate"
    | "solvate"
    | "other"
    | "unresolved";
  readonly stereochemistrySpecified: boolean;
  readonly exhaustiveInternetSearch: false;
}

export type BasicRecordSynthesisCoverageLoader = (
  identity: BasicRecordSynthesisCoverageIdentity,
  assetBasePath?: string,
) => Promise<BasicRecordSynthesisCoverage | null>;

export interface BasicRecordSynthesisCoverageClientOptions {
  readonly assetBasePath?: string;
  readonly fetchImpl?: typeof fetch;
}

type JsonObject = Readonly<Record<string, unknown>>;

const ASSESSMENT_STATES = new Set<string>(SYNTHESIS_ASSESSMENT_STATES);
const SOURCE_EVIDENCE_STATES = new Set<string>(SYNTHESIS_SOURCE_EVIDENCE_STATES);
const APPLICABILITY_STATES = new Set<string>(SYNTHESIS_APPLICABILITY_STATES);
const REVIEW_STATES = new Set<string>(SYNTHESIS_REVIEW_STATES);
const LICENSE_STATES = new Set<string>(SYNTHESIS_LICENSE_STATES);
const ROUTE_TYPES = new Set<string>(SYNTHESIS_ROUTE_TYPES);
const ROUTE_COMPLETENESS_STATES = new Set<string>(SYNTHESIS_ROUTE_COMPLETENESS_STATES);
const EXTRACTION_OUTCOMES = new Set<string>(SYNTHESIS_EXTRACTION_OUTCOMES);
const BEST_OUTCOMES = new Set<string>(SYNTHESIS_BEST_OUTCOMES);
const ROUTE_PUBLICATION_STATES = new Set([
  "reported_route",
  "teaching_reconstruction",
  "computationally_proposed_route",
  "withheld",
]);
const PROVIDERS = new Set(["patent", "journal", "aggregator", "open_reaction_dataset"]);
const PROVIDER_STATUSES = new Set([
  "completed",
  "completed_with_errors",
  "rate_limited",
  "unavailable",
]);
const FORM_KINDS = new Set([
  "free_parent",
  "salt",
  "hydrate",
  "solvate",
  "other",
  "unresolved",
]);
const INCHI_KEY_PATTERN = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u;

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const nonblankString = (value: unknown, maximum = 1024): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= maximum &&
  value.trim() === value;

const isIsoDate = (value: unknown): value is string =>
  nonblankString(value, 64) && Number.isFinite(new Date(value).getTime());

const isSafeCount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;

const readBoundedStrings = (
  value: unknown,
  field: string,
  maximumItems: number,
): readonly string[] => {
  if (
    !Array.isArray(value) ||
    value.length > maximumItems ||
    !value.every((item) => nonblankString(item, 512))
  ) {
    throw new Error(`Invalid synthesis coverage ${field}.`);
  }
  return [...new Set(value)];
};

const readEnum = <Value extends string>(
  value: unknown,
  allowed: ReadonlySet<string>,
  field: string,
): Value => {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new Error(`Invalid synthesis coverage ${field}.`);
  }
  return value as Value;
};

const parseProvider = (value: unknown): BasicRecordSynthesisProviderAttempt => {
  if (!isObject(value)) throw new Error("Invalid synthesis coverage provider attempt.");
  if (
    !nonblankString(value.adapterId, 128) ||
    !isSafeCount(value.queryCount) ||
    !isSafeCount(value.candidateCount) ||
    !isIsoDate(value.searchedAt) ||
    !Array.isArray(value.errors) ||
    value.errors.length > 64 ||
    !value.errors.every((error) => nonblankString(error, 512))
  ) {
    throw new Error("Invalid synthesis coverage provider attempt fields.");
  }
  return {
    provider: readEnum(value.provider, PROVIDERS, "provider") as BasicRecordSynthesisProviderAttempt["provider"],
    adapterId: value.adapterId,
    status: readEnum(value.status, PROVIDER_STATUSES, "provider status") as BasicRecordSynthesisProviderAttempt["status"],
    queryCount: value.queryCount,
    candidateCount: value.candidateCount,
    searchedAt: value.searchedAt,
    errorCount: value.errors.length,
  };
};

const parseEvidenceProcessing = (
  value: unknown,
): BasicRecordSynthesisEvidenceProcessing | null => {
  if (value === undefined || value === null) return null;
  if (
    !isObject(value) ||
    !nonblankString(value.pipelineVersion, 128) ||
    !isIsoDate(value.completedAt) ||
    !isSafeCount(value.candidateAssociationCount) ||
    !isSafeCount(value.terminalAssociationCount) ||
    !isSafeCount(value.accessBlockedCount) ||
    !isSafeCount(value.accessibleCount) ||
    !isSafeCount(value.metadataOnlyCount) ||
    !isSafeCount(value.unavailableCount) ||
    !isObject(value.extractionOutcomeCounts)
  ) {
    throw new Error("Invalid synthesis evidence-processing summary.");
  }

  const rawOutcomeCounts = value.extractionOutcomeCounts as JsonObject;

  const counts = Object.fromEntries(
    SYNTHESIS_EXTRACTION_OUTCOMES.map((outcome) => {
      const count = rawOutcomeCounts[outcome];
      if (!isSafeCount(count)) {
        throw new Error(`Invalid synthesis extraction count for ${outcome}.`);
      }
      return [outcome, count] as const;
    }),
  ) as Readonly<Record<BasicRecordSynthesisExtractionOutcome, number>>;
  const unexpectedOutcomes = Object.keys(rawOutcomeCounts).filter(
    (outcome) => !EXTRACTION_OUTCOMES.has(outcome),
  );
  const terminalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const accessCount = Number(value.accessBlockedCount) +
    Number(value.accessibleCount) +
    Number(value.metadataOnlyCount) +
    Number(value.unavailableCount);
  if (
    unexpectedOutcomes.length > 0 ||
    terminalCount !== value.terminalAssociationCount ||
    value.terminalAssociationCount !== value.candidateAssociationCount ||
    accessCount !== value.candidateAssociationCount
  ) {
    throw new Error("Synthesis evidence processing is not terminal or internally consistent.");
  }

  return {
    pipelineVersion: value.pipelineVersion,
    completedAt: value.completedAt,
    candidateAssociationCount: Number(value.candidateAssociationCount),
    terminalAssociationCount: Number(value.terminalAssociationCount),
    accessBlockedCount: Number(value.accessBlockedCount),
    accessibleCount: Number(value.accessibleCount),
    metadataOnlyCount: Number(value.metadataOnlyCount),
    unavailableCount: Number(value.unavailableCount),
    extractionOutcomeCounts: counts,
  };
};

const parseBestOutcome = (
  value: unknown,
): BasicRecordSynthesisBestOutcome | null => {
  if (value === undefined || value === null) return null;
  return readEnum<BasicRecordSynthesisBestOutcome>(
    value,
    BEST_OUTCOMES,
    "best outcome",
  );
};

export function getBasicRecordSynthesisSurfaceState(
  coverage: Pick<
    BasicRecordSynthesisCoverage,
    | "bestOutcome"
    | "evidenceProcessing"
    | "reportedRouteFoundPendingReview"
    | "publicAlphaDrafts"
    | "routes"
    | "sourceEvidenceState"
  >,
): BasicRecordSynthesisSurfaceState {
  if ((coverage.publicAlphaDrafts?.length ?? 0) > 0) return "public_draft_partial";
  const reportedRoutes = coverage.routes.filter((route) =>
    route.routeType === "patent_reported" || route.routeType === "literature_reported"
  );
  if (coverage.bestOutcome === "direct_complete_reported") {
    return reportedRoutes.some((route) => route.routeCompleteness === "complete")
      ? "reported_complete"
      : "direct_source_gated";
  }
  if (coverage.bestOutcome === "direct_partial_reported") {
    return reportedRoutes.length > 0 ? "reported_partial" : "direct_source_gated";
  }
  if (
    coverage.bestOutcome === "teaching_reconstruction_complete" ||
    coverage.bestOutcome === "teaching_reconstruction_partial"
  ) {
    return "teaching_reconstruction";
  }
  // Public snapshots deliberately remove pending route IDs, types,
  // completeness and source locators. This aggregate boolean is the only
  // permitted way to distinguish an internally identified reported route
  // from a generic candidate-only record before review/reuse gates pass.
  if (coverage.reportedRouteFoundPendingReview) return "direct_source_gated";
  if (coverage.bestOutcome === "access_blocked_only") return "source_access_blocked";
  if (coverage.bestOutcome === "no_supporting_source_resolved") {
    return "no_supporting_source_resolved";
  }
  if (coverage.bestOutcome === "candidate_only") {
    if (coverage.sourceEvidenceState === "direct_source_resolved") {
      return "direct_source_gated";
    }
    return coverage.evidenceProcessing
      ? "candidate_extraction_complete"
      : "candidate_processing_incomplete";
  }

  if (reportedRoutes.some((route) => route.routeCompleteness === "complete")) {
    return "reported_complete";
  }
  if (reportedRoutes.length > 0) return "reported_partial";
  if (coverage.routes.some((route) => route.routeType === "teaching_reconstruction")) {
    return "teaching_reconstruction";
  }
  if ((coverage.evidenceProcessing?.accessBlockedCount ?? 0) > 0) {
    return "source_access_blocked";
  }
  if (coverage.sourceEvidenceState === "candidate_sources") {
    return coverage.evidenceProcessing
      ? "candidate_extraction_complete"
      : "candidate_processing_incomplete";
  }
  if (coverage.sourceEvidenceState === "direct_source_resolved") {
    return "direct_source_gated";
  }
  return "no_supporting_source_resolved";
}

const parseRoute = (value: unknown): BasicRecordSynthesisRouteReference => {
  if (!isObject(value) || !nonblankString(value.routeId, 512) || !value.routeId.startsWith("synthesis-route:")) {
    throw new Error("Invalid synthesis coverage route reference.");
  }
  return {
    routeId: value.routeId as `synthesis-route:${string}`,
    routeType: readEnum<CanonicalSynthesisRouteType>(value.routeType, ROUTE_TYPES, "route type"),
    routeCompleteness: readEnum<SynthesisRouteCompleteness>(
      value.routeCompleteness,
      ROUTE_COMPLETENESS_STATES,
      "route completeness",
    ),
    reviewState: readEnum<SynthesisReviewState>(value.reviewState, REVIEW_STATES, "route review state"),
    licenseState: readEnum<SynthesisLicenseState>(value.licenseState, LICENSE_STATES, "route license state"),
  };
};

const parsePublicAlphaDraft = (value: unknown): PublicAlphaSynthesisDraftReference => {
  if (
    !isObject(value) || value.schemaVersion !== 1 ||
    !nonblankString(value.graphId, 256) || !value.graphId.startsWith("synthesis-draft-graph:") ||
    value.channel !== "public_alpha_source_supported_draft" ||
    value.publicationState !== "source_supported_draft" ||
    value.reviewState !== "pending" || value.verifiedScientificClaim !== false ||
    !nonblankString(value.coverageId, 512) || !value.coverageId.startsWith("synthesis-coverage:") ||
    !["partial", "upstream_gap", "convergent_partial"].includes(String(value.routeCompleteness)) ||
    !Number.isSafeInteger(value.draftRouteCount) || Number(value.draftRouteCount) < 1 ||
    !Number.isSafeInteger(value.extractedStepCount) || Number(value.extractedStepCount) < 1 ||
    !Number.isSafeInteger(value.teachingReconstructionCount) || Number(value.teachingReconstructionCount) < 0 ||
    !Number.isSafeInteger(value.resolvedIntermediateCount) || Number(value.resolvedIntermediateCount) < 0 ||
    !Number.isSafeInteger(value.unresolvedGapCount) || Number(value.unresolvedGapCount) < 1 ||
    value.licenseState !== "attribution_required" ||
    !nonblankString(value.detailPath, 256) ||
    !/^\/catalog\/synthesis\/drafts\/[a-f\d]{32}\.json$/u.test(value.detailPath)
  ) throw new Error("Invalid public-alpha synthesis draft reference.");
  return value as unknown as PublicAlphaSynthesisDraftReference;
};

const unavailableRouteComparison = (
  route: BasicRecordSynthesisRouteReference,
): BasicRecordSynthesisRouteComparison => ({
  routeId: route.routeId,
  routeType: route.routeType,
  routeCompleteness: route.routeCompleteness,
  reviewState: route.reviewState,
  publicationState: "unavailable",
  comparisonAvailability: "unavailable",
  numberOfSteps: null,
  startingMaterials: [],
  stereochemicalStrategy: null,
  keyTransformations: [],
  sourceYear: null,
});

const unavailableRouteComparisonSet = (
  routes: readonly BasicRecordSynthesisRouteReference[],
): BasicRecordSynthesisRouteComparisonSet => ({
  state: routes.length === 0 ? "not_applicable" : "unavailable",
  routes: routes.map(unavailableRouteComparison),
});

const publicationMatchesRouteType = (
  publicationState: Exclude<BasicRecordSynthesisRoutePublicationState, "unavailable">,
  routeType: CanonicalSynthesisRouteType,
): boolean =>
  publicationState === "withheld" ||
  (publicationState === "reported_route" &&
    (routeType === "patent_reported" || routeType === "literature_reported")) ||
  (publicationState === "teaching_reconstruction" && routeType === "teaching_reconstruction") ||
  (publicationState === "computationally_proposed_route" && routeType === "computational_proposed");

const parseRouteComparison = (
  value: unknown,
  reference: BasicRecordSynthesisRouteReference,
): BasicRecordSynthesisRouteComparison => {
  if (!isObject(value) || value.routeId !== reference.routeId) {
    throw new Error("Synthesis route comparison does not match its coverage reference.");
  }
  const routeType = readEnum<CanonicalSynthesisRouteType>(
    value.routeType,
    ROUTE_TYPES,
    "comparison route type",
  );
  const routeCompleteness = readEnum<SynthesisRouteCompleteness>(
    value.routeCompleteness,
    ROUTE_COMPLETENESS_STATES,
    "comparison route completeness",
  );
  const reviewState = readEnum<SynthesisReviewState>(
    value.reviewState,
    REVIEW_STATES,
    "comparison review state",
  );
  const publicationState = readEnum<Exclude<BasicRecordSynthesisRoutePublicationState, "unavailable">>(
    value.publicationState,
    ROUTE_PUBLICATION_STATES,
    "route publication state",
  );
  if (
    routeType !== reference.routeType ||
    routeCompleteness !== reference.routeCompleteness ||
    reviewState !== reference.reviewState ||
    !publicationMatchesRouteType(publicationState, routeType)
  ) {
    throw new Error("Synthesis route comparison conflicts with its exact coverage reference.");
  }

  if (publicationState === "withheld") {
    if (
      value.numberOfSteps !== null ||
      value.stereochemicalStrategy !== null ||
      value.sourceYear !== null ||
      !Array.isArray(value.startingMaterials) ||
      value.startingMaterials.length !== 0 ||
      !Array.isArray(value.keyTransformations) ||
      value.keyTransformations.length !== 0 ||
      !Array.isArray(value.blockerCodes) ||
      value.blockerCodes.length === 0 ||
      !value.blockerCodes.every((code) => nonblankString(code, 256))
    ) {
      throw new Error("Withheld synthesis route comparison must remain redacted.");
    }
    return {
      routeId: reference.routeId,
      routeType,
      routeCompleteness,
      reviewState,
      publicationState,
      comparisonAvailability: "withheld",
      numberOfSteps: null,
      startingMaterials: [],
      stereochemicalStrategy: null,
      keyTransformations: [],
      sourceYear: null,
    };
  }

  if (
    !Number.isSafeInteger(value.numberOfSteps) ||
    Number(value.numberOfSteps) < 1 ||
    Number(value.numberOfSteps) > 256 ||
    !nonblankString(value.stereochemicalStrategy, 1024) ||
    !Array.isArray(value.startingMaterials) ||
    value.startingMaterials.length < 1 ||
    value.startingMaterials.length > 64 ||
    !value.startingMaterials.every((material) => nonblankString(material, 512)) ||
    !Array.isArray(value.keyTransformations) ||
    value.keyTransformations.length !== value.numberOfSteps ||
    !value.keyTransformations.every((transformation) => nonblankString(transformation, 512)) ||
    (value.sourceYear !== null &&
      (!Number.isSafeInteger(value.sourceYear) ||
        Number(value.sourceYear) < 1800 ||
        Number(value.sourceYear) > new Date().getUTCFullYear() + 1))
  ) {
    throw new Error("Published synthesis route comparison fields are invalid.");
  }
  return {
    routeId: reference.routeId,
    routeType,
    routeCompleteness,
    reviewState,
    publicationState,
    comparisonAvailability: "available",
    numberOfSteps: Number(value.numberOfSteps),
    startingMaterials: [...new Set(value.startingMaterials)] as readonly string[],
    stereochemicalStrategy: value.stereochemicalStrategy,
    keyTransformations: [...value.keyTransformations] as readonly string[],
    sourceYear: value.sourceYear === null ? null : Number(value.sourceYear),
  };
};

export async function loadBasicRecordSynthesisRouteComparisons(
  routes: readonly BasicRecordSynthesisRouteReference[],
  options: BasicRecordSynthesisCoverageClientOptions = {},
): Promise<BasicRecordSynthesisRouteComparisonSet> {
  if (routes.length === 0) return unavailableRouteComparisonSet(routes);
  const routeIds = new Set(routes.map((route) => route.routeId));
  if (routeIds.size !== routes.length) {
    throw new Error("Synthesis coverage contains duplicate route references.");
  }
  const path = resolveCatalogAssetPath(
    "/catalog/synthesis/routes/index.json",
    options.assetBasePath,
  );
  const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const response = await fetchImpl(path, { headers: { Accept: "application/json" } });
  if (response.status === 404) return unavailableRouteComparisonSet(routes);
  if (!response.ok) {
    throw new Error(`Synthesis route index request failed (${response.status}) for ${path}.`);
  }
  const index: unknown = await response.json();
  if (
    !isObject(index) ||
    index.schemaVersion !== 1 ||
    !isIsoDate(index.generatedAt) ||
    !Array.isArray(index.routes) ||
    index.routes.length > 10_000
  ) {
    throw new Error("Unsupported synthesis route comparison index.");
  }
  const indexRoutes = index.routes as readonly unknown[];
  const comparisons = routes.map((reference) => {
    const matches = indexRoutes.filter((value) =>
      isObject(value) && value.routeId === reference.routeId,
    );
    if (matches.length !== 1) {
      throw new Error("Synthesis route comparison index is missing or duplicates an exact coverage route.");
    }
    return parseRouteComparison(matches[0], reference);
  });
  const availableCount = comparisons.filter((route) =>
    route.comparisonAvailability === "available"
  ).length;
  return {
    state: availableCount === comparisons.length
      ? "available"
      : availableCount === 0
        ? "withheld"
        : "partially_available",
    routes: comparisons,
  };
};

const parseCoverageRecord = (
  value: unknown,
  expected: BasicRecordSynthesisCoverageIdentity,
  catalogSnapshotId: string,
): BasicRecordSynthesisCoverage => {
  if (!isObject(value) || value.schemaVersion !== 1) {
    throw new Error("Unsupported synthesis coverage record.");
  }
  const identity = value.identityScope;
  const search = value.sourceSearchScope;
  if (!isObject(identity) || !isObject(search)) {
    throw new Error("Synthesis coverage identity or search scope is missing.");
  }
  if (
    identity.catalogEntityId !== expected.catalogEntityId ||
    identity.pubChemCid !== expected.pubChemCid ||
    identity.inchiKey !== expected.inchiKey
  ) {
    throw new Error("Synthesis coverage identity does not match the molecular record.");
  }
  if (value.catalogSnapshotId !== catalogSnapshotId) {
    throw new Error("Synthesis coverage snapshot identity does not match its shard.");
  }
  if (
    !nonblankString(value.id, 512) ||
    !value.id.startsWith("synthesis-coverage:") ||
    !nonblankString(search.pipelineVersion, 128) ||
    !isIsoDate(search.startedAt) ||
    (search.completedAt !== null && !isIsoDate(search.completedAt)) ||
    search.exhaustiveInternetSearch !== false ||
    !Array.isArray(search.providers) ||
    search.providers.length > 12 ||
    !Array.isArray(value.routes) ||
    value.routes.length > 64 ||
    (value.publicAlphaDrafts !== undefined && !Array.isArray(value.publicAlphaDrafts)) ||
    !Array.isArray(value.sourceEvidenceIds) ||
    value.sourceEvidenceIds.length > 512 ||
    !value.sourceEvidenceIds.every((id) => nonblankString(id, 512))
  ) {
    throw new Error("Invalid synthesis coverage record fields.");
  }
  const chemicalForm = identity.chemicalForm;
  const stereoisomer = identity.stereoisomer;
  if (
    !isObject(chemicalForm) ||
    !FORM_KINDS.has(String(chemicalForm.normalizedKind)) ||
    !isObject(stereoisomer) ||
    typeof stereoisomer.specified !== "boolean"
  ) {
    throw new Error("Invalid synthesis coverage form or stereoisomer scope.");
  }
  const routes = value.routes.map(parseRoute);
  const publicAlphaDrafts = (value.publicAlphaDrafts ?? []).map(parsePublicAlphaDraft);
  if (
    publicAlphaDrafts.length > 1 ||
    publicAlphaDrafts.some((draft) => draft.coverageId !== value.id)
  ) throw new Error("Public-alpha synthesis draft does not match its coverage record.");
  const evidenceProcessing = parseEvidenceProcessing(value.evidenceProcessing);
  const bestOutcome = parseBestOutcome(value.bestOutcome);
  if (
    value.reportedRouteFoundPendingReview !== undefined &&
    typeof value.reportedRouteFoundPendingReview !== "boolean"
  ) {
    throw new Error("Invalid pending reported-route coverage flag.");
  }
  if (
    evidenceProcessing &&
    !/^synthesis-extraction-\d+\.\d+\.\d+$/u.test(evidenceProcessing.pipelineVersion)
  ) {
    throw new Error("Unsupported synthesis evidence-processing pipeline version.");
  }
  if (
    bestOutcome === "candidate_only" &&
    evidenceProcessing &&
    evidenceProcessing.candidateAssociationCount === 0
  ) {
    throw new Error("Candidate-only synthesis outcome has no candidate associations.");
  }
  if (
    bestOutcome === "access_blocked_only" &&
    evidenceProcessing &&
    evidenceProcessing.accessBlockedCount === 0
  ) {
    throw new Error("Access-blocked synthesis outcome has no blocked associations.");
  }
  if (evidenceProcessing) {
    const activeOutcomeCount =
      evidenceProcessing.extractionOutcomeCounts.resolved +
      evidenceProcessing.extractionOutcomeCounts.insufficient_detail +
      evidenceProcessing.extractionOutcomeCounts.parse_error +
      evidenceProcessing.extractionOutcomeCounts.retryable_error +
      evidenceProcessing.extractionOutcomeCounts.access_blocked;
    if (bestOutcome === "candidate_only" && activeOutcomeCount === 0) {
      throw new Error("Candidate-only synthesis outcome has no active candidate assessment.");
    }
    if (
      bestOutcome === "no_supporting_source_resolved" &&
      activeOutcomeCount > 0
    ) {
      throw new Error("No-support synthesis outcome conflicts with active processed candidates.");
    }
  }
  return {
    coverageId: value.id as `synthesis-coverage:${string}`,
    catalogSnapshotId,
    pipelineVersion: search.pipelineVersion,
    assessmentState: readEnum<SynthesisAssessmentState>(
      value.assessmentState,
      ASSESSMENT_STATES,
      "assessment state",
    ),
    sourceEvidenceState: readEnum<SynthesisSourceEvidenceState>(
      value.sourceEvidenceState,
      SOURCE_EVIDENCE_STATES,
      "source evidence state",
    ),
    applicability: readEnum<SynthesisApplicability>(
      value.applicability,
      APPLICABILITY_STATES,
      "applicability",
    ),
    reviewState: readEnum<SynthesisReviewState>(value.reviewState, REVIEW_STATES, "review state"),
    licenseState: readEnum<SynthesisLicenseState>(value.licenseState, LICENSE_STATES, "license state"),
    searchedAt: search.completedAt ?? search.startedAt,
    aliasesQueried: readBoundedStrings(search.aliasesQueried, "queried aliases", 128),
    providers: search.providers.map(parseProvider),
    routes,
    publicAlphaDrafts,
    routeComparison: unavailableRouteComparisonSet(routes),
    bestOutcome,
    evidenceProcessing,
    sourceEvidenceCount: value.sourceEvidenceIds.length,
    unresolvedReasons: readBoundedStrings(value.unresolvedReasons, "unresolved reasons", 128),
    reportedRouteFoundPendingReview: value.reportedRouteFoundPendingReview === true,
    chemicalFormKind: String(chemicalForm.normalizedKind) as BasicRecordSynthesisCoverage["chemicalFormKind"],
    stereochemistrySpecified: stereoisomer.specified,
    exhaustiveInternetSearch: false,
  };
};

export async function loadBasicRecordSynthesisCoverage(
  identity: BasicRecordSynthesisCoverageIdentity,
  options: BasicRecordSynthesisCoverageClientOptions = {},
): Promise<BasicRecordSynthesisCoverage | null> {
  if (
    !nonblankString(identity.catalogEntityId, 512) ||
    !nonblankString(identity.catalogSnapshotId, 256) ||
    !Number.isSafeInteger(identity.pubChemCid) ||
    identity.pubChemCid < 1 ||
    !INCHI_KEY_PATTERN.test(identity.inchiKey)
  ) {
    throw new Error("Cannot resolve synthesis coverage for an invalid molecular identity.");
  }
  const shardKey = identity.inchiKey[0].toLocaleLowerCase("en");
  const path = resolveCatalogAssetPath(
    `/catalog/synthesis/shards/${shardKey}.json`,
    options.assetBasePath,
  );
  const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const response = await fetchImpl(path, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Synthesis coverage request failed (${response.status}) for ${path}.`);
  }
  const shard: unknown = await response.json();
  if (
    !isObject(shard) ||
    shard.schemaVersion !== 1 ||
    shard.shardKey !== shardKey ||
    !nonblankString(shard.catalogSnapshotId, 256) ||
    shard.catalogSnapshotId !== identity.catalogSnapshotId ||
    !Array.isArray(shard.records) ||
    shard.records.length > 1552
  ) {
    throw new Error("Unsupported synthesis coverage shard.");
  }
  const matches = shard.records.filter((record) =>
    isObject(record) &&
    isObject(record.identityScope) &&
    record.identityScope.inchiKey === identity.inchiKey,
  );
  if (matches.length === 0) return null;
  if (matches.length !== 1) {
    throw new Error("Synthesis coverage shard contains a duplicate molecular identity.");
  }
  const coverage = parseCoverageRecord(matches[0], identity, shard.catalogSnapshotId);
  if (coverage.routes.length === 0) return coverage;
  try {
    return {
      ...coverage,
      routeComparison: await loadBasicRecordSynthesisRouteComparisons(
        coverage.routes,
        options,
      ),
    };
  } catch {
    // A route-index outage or integrity mismatch must never suppress the exact
    // coverage record or expose partially trusted comparison fields.
    return {
      ...coverage,
      routeComparison: unavailableRouteComparisonSet(coverage.routes),
    };
  }
}
