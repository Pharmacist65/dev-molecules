import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import type {
  SynthesisCoverageRecord,
  SynthesisCoverageSnapshotManifest,
} from "../../lib/domain/synthesis-coverage";
import type {
  CanonicalSynthesisRoute,
  SynthesisLicenseState,
  SynthesisSourceEvidence,
} from "../../lib/domain/synthesis-route";
import {
  SYNTHESIS_APPLICABILITY_STATES,
  SYNTHESIS_REVIEW_STATES,
  SYNTHESIS_ROUTE_COMPLETENESS_STATES,
  SYNTHESIS_ROUTE_TYPES,
} from "../../lib/domain/synthesis-route";
import type {
  SynthesisEvidenceAssociationAssessment,
  SynthesisEvidenceProcessingSummary,
  SynthesisMoleculeBestOutcome,
} from "../../lib/domain/synthesis-extraction";
import {
  SYNTHESIS_CANDIDATE_SOURCE_EVIDENCE_STATES,
  SYNTHESIS_EVIDENCE_ACCESS_STATES,
  SYNTHESIS_EVIDENCE_LICENSE_STATES,
  SYNTHESIS_EXTRACTION_OUTCOMES,
} from "../../lib/domain/synthesis-extraction";
import {
  getSynthesisRoutePublicationDecision,
  validateCanonicalSynthesisRoute,
  validateSynthesisCoverageRouteLinks,
  validateSynthesisCoverageSnapshot,
  validateSynthesisEvidenceExtraction,
  type SynthesisValidationIssue,
} from "../../lib/domain/synthesis-validation";
import { loadAcceptedSynthesisDiscoveryBaseline } from "./discover-catalog.mjs";
import {
  loadCompletedSynthesisExtraction,
  SYNTHESIS_CANDIDATE_BASELINE,
} from "./extract-candidates.mjs";
import {
  PENDING_REPORTED_ROUTE_CONNECTIVITY_KEYS,
  PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE,
} from "./public-safe-route-aggregate.mjs";
import { aggregateLicenseState } from "./source-adapters.mjs";
import {
  assemblePublicAlphaSynthesisDrafts,
  loadSynthesisSourceContentRunSummary,
  writePublicAlphaSynthesisDraftAssembly,
} from "./assemble-public-drafts.mjs";

export const synthesisPublicOutputUrl = new URL(
  "../../public/catalog/synthesis/",
  import.meta.url,
);

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const writePublicJson = async (relativePath: string, value: unknown): Promise<{
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}> => {
  const output = new URL(relativePath, synthesisPublicOutputUrl);
  const json = stableJson(value);
  await mkdir(new URL("./", output), { recursive: true });
  await writeFile(output, json, "utf8");
  return { path: `/catalog/synthesis/${relativePath}`, sha256: sha256(json), byteLength: Buffer.byteLength(json) };
};

const uniqueEvidence = (
  values: readonly SynthesisSourceEvidence[],
): readonly SynthesisSourceEvidence[] => {
  const byId = new Map<string, SynthesisSourceEvidence>();
  for (const value of values) {
    const existing = byId.get(value.id);
    if (existing && stableJson(existing) !== stableJson(value)) {
      throw new Error(`Conflicting synthesis evidence records share ${value.id}.`);
    }
    byId.set(value.id, value);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id, "en"));
};

const countBy = <T,>(
  values: readonly T[],
  keyFor: (value: T) => string,
): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  ));
};

const zeroFilledCountBy = <T, K extends string>(
  values: readonly T[],
  keyFor: (value: T) => K,
  orderedKeys: readonly K[],
): Readonly<Record<K, number>> => {
  const counts = Object.fromEntries(orderedKeys.map((key) => [key, 0])) as Record<K, number>;
  for (const value of values) counts[keyFor(value)] += 1;
  return counts;
};

const isObjectRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const SYNTHESIS_COPYRIGHT_STATES = ["public_domain", "copyrighted", "unclear"] as const;
const SYNTHESIS_REDISTRIBUTION_PERMISSION_STATES = [
  "permitted",
  "permitted_with_attribution",
  "metadata_only",
  "prohibited",
  "unknown",
] as const;
const SYNTHESIS_PARAPHRASE_PERMISSION_STATES = [
  "permitted",
  "permitted_with_attribution",
  "metadata_only",
  "unknown",
] as const;
const SYNTHESIS_FIGURE_REUSE_PERMISSION_STATES = [
  "permitted",
  "permitted_with_attribution",
  "prohibited",
  "unknown",
] as const;
const SYNTHESIS_ERROR_OUTCOMES = [
  "parse_error",
  "retryable_error",
  "access_blocked",
] as const;

const createCandidateTerminalizationReport = (
  assessments: readonly SynthesisEvidenceAssociationAssessment[],
  generatedAt: string,
  pipelineVersion: string,
) => ({
  schemaVersion: 1,
  generatedAt,
  pipelineVersion,
  candidateAssociationCount: assessments.length,
  terminalAssociationCount: assessments.length,
  unresolvedFinalCount: 0,
  byExtractionOutcome: zeroFilledCountBy(
    assessments,
    (item) => item.extractionOutcome,
    SYNTHESIS_EXTRACTION_OUTCOMES.filter((outcome) => outcome !== "unresolved"),
  ),
  byAccessState: zeroFilledCountBy(
    assessments,
    (item) => item.accessState,
    SYNTHESIS_EVIDENCE_ACCESS_STATES,
  ),
  bySourceEvidenceState: zeroFilledCountBy(
    assessments,
    (item) => item.sourceEvidenceState,
    SYNTHESIS_CANDIDATE_SOURCE_EVIDENCE_STATES,
  ),
  byRouteType: zeroFilledCountBy(
    assessments,
    (item) => item.routeType ?? "none",
    ["none", ...SYNTHESIS_ROUTE_TYPES] as const,
  ),
  byRouteCompleteness: zeroFilledCountBy(
    assessments,
    (item) => item.routeCompleteness,
    SYNTHESIS_ROUTE_COMPLETENESS_STATES,
  ),
  byReviewState: zeroFilledCountBy(
    assessments,
    (item) => item.reviewState,
    SYNTHESIS_REVIEW_STATES,
  ),
  byApplicability: zeroFilledCountBy(
    assessments,
    (item) => item.applicability,
    SYNTHESIS_APPLICABILITY_STATES,
  ),
  byLicenseState: zeroFilledCountBy(
    assessments,
    (item) => item.licenseState,
    SYNTHESIS_EVIDENCE_LICENSE_STATES,
  ),
  exactLocatorResolvedCount: assessments.filter((item) => item.exactLocatorResolved).length,
  retryableAssociationCount: assessments.filter(
    (item) => item.extractionOutcome === "retryable_error",
  ).length,
  retryMetadataComplete: assessments
    .filter((item) => item.extractionOutcome === "retryable_error")
    .every((item) => Boolean(item.retry)),
  invariant: {
    everyAssociationTerminal: true,
    noUnresolvedFinalState: true,
    noCandidatePromotedToCompleteRoute: true,
    operationalDetailsPublished: false,
  },
});

export const mergeRoutesIntoCoverage = (
  records: readonly SynthesisCoverageRecord[],
  routes: readonly CanonicalSynthesisRoute[],
  evidence: readonly SynthesisSourceEvidence[],
): readonly SynthesisCoverageRecord[] => {
  const routesByCoverage = new Map<string, CanonicalSynthesisRoute[]>();
  for (const route of routes) {
    const values = routesByCoverage.get(route.coverageId) ?? [];
    values.push(route);
    routesByCoverage.set(route.coverageId, values);
  }
  const evidenceById = new Map(evidence.map((item) => [item.id, item] as const));
  return records.map((record) => {
    const recordRoutes = (routesByCoverage.get(record.id) ?? []).sort((left, right) =>
      left.id.localeCompare(right.id, "en"),
    );
    if (recordRoutes.length === 0) return record;
    const routeEvidenceIds = recordRoutes.flatMap((route) => route.sourceEvidenceIds);
    const sourceEvidenceIds = [
      ...new Set([...record.sourceEvidenceIds, ...routeEvidenceIds]),
    ].sort((left, right) => left.localeCompare(right, "en"));
    const recordEvidence = sourceEvidenceIds.flatMap((id) => {
      const item = evidenceById.get(id);
      return item ? [item] : [];
    });
    const hasDirect = recordEvidence.some((item) => item.resolutionState === "resolved");
    const hasCandidate = recordEvidence.some((item) => item.resolutionState === "candidate");
    const hasApplicableSourceBackedRoute = recordRoutes.some((route) =>
      route.applicability === "applicable" &&
      route.routeType !== "computational_proposed" &&
      route.sourceEvidenceIds.some(
        (sourceId) => evidenceById.get(sourceId)?.resolutionState === "resolved",
      )
    );
    return {
      ...record,
      sourceEvidenceState: hasDirect
        ? "direct_source_resolved"
        : hasCandidate
          ? "candidate_sources"
          : "none_found",
      applicability: hasApplicableSourceBackedRoute
        ? "applicable"
        : record.applicability,
      sourceEvidenceIds,
      routes: recordRoutes.map((route) => ({
        routeId: route.id,
        routeType: route.routeType,
        routeCompleteness: route.routeCompleteness,
        reviewState: route.reviewState,
        licenseState: route.licenseState,
      })),
      licenseState: aggregateLicenseState(recordEvidence),
      unresolvedReasons: [
        ...record.unresolvedReasons.filter((reason) =>
          !reason.startsWith("Reported synthesis"),
        ),
        "Migrated route data remains subject to its explicit scientific review and reuse gates.",
      ],
    };
  });
};

export const selectSynthesisMoleculeBestOutcome = (
  record: SynthesisCoverageRecord,
  summary: SynthesisEvidenceProcessingSummary,
): SynthesisMoleculeBestOutcome => {
  const completeReported = record.routes.some((route) =>
    (route.routeType === "patent_reported" || route.routeType === "literature_reported") &&
    route.routeCompleteness === "complete"
  );
  if (completeReported) return "direct_complete_reported";
  const partialReported = record.routes.some((route) =>
    route.routeType === "patent_reported" || route.routeType === "literature_reported"
  );
  if (partialReported) return "direct_partial_reported";
  const completeTeaching = record.routes.some((route) =>
    route.routeType === "teaching_reconstruction" && route.routeCompleteness === "complete"
  );
  if (completeTeaching) return "teaching_reconstruction_complete";
  const partialTeaching = record.routes.some(
    (route) => route.routeType === "teaching_reconstruction",
  );
  if (partialTeaching) return "teaching_reconstruction_partial";
  const activeNonBlockedCount =
    summary.extractionOutcomeCounts.resolved +
    summary.extractionOutcomeCounts.insufficient_detail +
    summary.extractionOutcomeCounts.parse_error +
    summary.extractionOutcomeCounts.retryable_error;
  if (activeNonBlockedCount > 0) return "candidate_only";
  if (summary.accessBlockedCount > 0) return "access_blocked_only";
  return "no_supporting_source_resolved";
};

export const mergeExtractionIntoCoverage = (
  records: readonly SynthesisCoverageRecord[],
  summariesByCoverageId: ReadonlyMap<string, SynthesisEvidenceProcessingSummary>,
  assessments: readonly SynthesisEvidenceAssociationAssessment[],
  routes: readonly CanonicalSynthesisRoute[],
): readonly SynthesisCoverageRecord[] => records.map((record) => {
  const summary = summariesByCoverageId.get(record.id);
  if (!summary) {
    throw new Error(`Missing candidate extraction summary for ${record.id}.`);
  }
  if (
    summary.candidateAssociationCount !== summary.terminalAssociationCount ||
    Object.values(summary.extractionOutcomeCounts).reduce((sum, count) => sum + count, 0) !==
      summary.candidateAssociationCount ||
    summary.accessibleCount + summary.accessBlockedCount + summary.metadataOnlyCount +
        summary.unavailableCount !== summary.candidateAssociationCount
  ) {
    throw new Error(`Non-terminal or inconsistent candidate extraction summary for ${record.id}.`);
  }
  const assessmentsByEvidenceId = new Map(
    assessments
      .filter((assessment) => assessment.coverageId === record.id)
      .map((assessment) => [assessment.sourceEvidenceId, assessment] as const),
  );
  const activeOutcomes = new Set([
    "resolved",
    "insufficient_detail",
    "parse_error",
    "retryable_error",
    "access_blocked",
  ]);
  const canonicalRouteEvidenceIds = new Set(
    routes
      .filter((route) => route.coverageId === record.id)
      .flatMap((route) => route.sourceEvidenceIds),
  );
  const activeSourceEvidenceIds = record.sourceEvidenceIds.filter((sourceEvidenceId) => {
    const assessment = assessmentsByEvidenceId.get(sourceEvidenceId);
    return assessment
      ? activeOutcomes.has(assessment.extractionOutcome)
      : canonicalRouteEvidenceIds.has(sourceEvidenceId);
  });
  const hasCanonicalRoute = record.routes.length > 0;
  const hasActiveCandidate = activeSourceEvidenceIds.some((sourceEvidenceId) =>
    assessmentsByEvidenceId.has(sourceEvidenceId)
  );
  const noActiveSupport = !hasCanonicalRoute && !hasActiveCandidate;
  return {
    ...record,
    sourceEvidenceState: noActiveSupport
      ? "none_found"
      : record.sourceEvidenceState === "direct_source_resolved"
        ? "direct_source_resolved"
        : "candidate_sources",
    sourceEvidenceIds: noActiveSupport ? [] : activeSourceEvidenceIds,
    unresolvedReasons: noActiveSupport
      ? [
          "Reported synthesis: Not resolved within the recorded search scope; no supporting source candidate remained after evidence processing.",
        ]
      : record.unresolvedReasons,
    evidenceProcessing: summary,
    bestOutcome: selectSynthesisMoleculeBestOutcome(record, summary),
  };
});

/**
 * Browser-facing coverage is a separate projection from canonical coverage.
 * A blocked route remains available to internal reports and review queues, but
 * it cannot leak its type or completeness through a coverage shard.
 */
export const createPublicSynthesisCoverageProjection = (
  records: readonly SynthesisCoverageRecord[],
  routes: readonly CanonicalSynthesisRoute[],
  evidence: readonly SynthesisSourceEvidence[],
): readonly SynthesisCoverageRecord[] => {
  const routeById = new Map(routes.map((route) => [route.id, route] as const));
  return records.map((record) => {
    const publicRoutes = record.routes.filter((reference) => {
      const route = routeById.get(reference.routeId);
      return Boolean(
        route && getSynthesisRoutePublicationDecision(route, evidence).routeSummaryAllowed,
      );
    });
    const hasPublicApplicableSourceBackedRoute = publicRoutes.some(
      (route) => route.routeType !== "computational_proposed",
    );
    const processing = record.evidenceProcessing;
    const activeProcessedCandidateCount = processing
      ? processing.extractionOutcomeCounts.resolved +
        processing.extractionOutcomeCounts.insufficient_detail +
        processing.extractionOutcomeCounts.parse_error +
        processing.extractionOutcomeCounts.retryable_error +
        processing.extractionOutcomeCounts.access_blocked
      : 0;
    const publicSourceEvidenceState = publicRoutes.length > 0
      ? "direct_source_resolved" as const
      : activeProcessedCandidateCount > 0
        ? "candidate_sources" as const
        : "none_found" as const;
    const reportedRouteFoundPendingReview =
      PENDING_REPORTED_ROUTE_CONNECTIVITY_KEYS.has(record.identityScope.connectivityKey);
    return {
      ...record,
      sourceEvidenceState: publicSourceEvidenceState,
      sourceEvidenceIds: [],
      evidenceDetailsRedacted: true,
      reportedRouteFoundPendingReview,
      applicability:
        record.applicability === "not_applicable"
          ? "not_applicable"
          : record.applicability === "applicable" &&
              record.sourceEvidenceState === "direct_source_resolved" &&
              hasPublicApplicableSourceBackedRoute
            ? "applicable"
            : "unclear",
      routes: publicRoutes,
      // Route-shaped best outcomes follow the same review/license gate as the
      // route references. Internal aggregate reports retain canonical counts.
      bestOutcome: record.evidenceProcessing
        ? selectSynthesisMoleculeBestOutcome(
            { ...record, routes: publicRoutes },
            record.evidenceProcessing,
          )
        : undefined,
    };
  });
};

const createCoverageReport = (
  records: readonly SynthesisCoverageRecord[],
  routes: readonly CanonicalSynthesisRoute[],
  evidence: readonly SynthesisSourceEvidence[],
  discoveryMetadataByCoverageId: ReadonlyMap<
    string,
    readonly Readonly<Record<string, unknown>>[]
  >,
  generatedAt: string,
) => {
  const evidenceById = new Map(evidence.map((item) => [item.id, item] as const));
  const candidateRecordCount = records.filter((record) =>
    record.sourceEvidenceIds.some((id) => evidenceById.get(id)?.resolutionState === "candidate"),
  ).length;
  const ordCandidateRecordCount = records.filter((record) =>
    record.sourceEvidenceIds.some((id) =>
      evidenceById.get(id)?.sourceKind === "open_reaction_dataset" &&
      evidenceById.get(id)?.resolutionState === "candidate"
    ),
  ).length;
  const directReportedRouteRecords = records.filter((record) =>
    PENDING_REPORTED_ROUTE_CONNECTIVITY_KEYS.has(record.identityScope.connectivityKey)
  ).length;
  const reconstructionRecords =
    PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byType.teaching_reconstruction;
  const noSourceRecords = records.filter((record) =>
    record.assessmentState === "assessed" &&
    record.sourceEvidenceState === "none_found" &&
    record.routes.length === 0,
  ).length;
  const ordReactionFragmentsByCoverage = records.map((record) => ({
    coverageId: record.id,
    candidates: (discoveryMetadataByCoverageId.get(record.id) ?? []).flatMap(
      (metadata) => Array.isArray(metadata.reactionCandidates)
        ? metadata.reactionCandidates.filter(isObjectRecord)
        : [],
    ),
  }));
  const ordReactionFragments = ordReactionFragmentsByCoverage.flatMap(
    (item) => item.candidates,
  );
  return {
    schemaVersion: 1,
    catalogSnapshotId: records[0].catalogSnapshotId,
    pipelineVersion: records[0].sourceSearchScope.pipelineVersion,
    generatedAt,
    coverage: {
      requiredRecords: records.length,
      coverageRecords: records.length,
      exactCoverageComplete: true,
      assessed: records.filter((record) => record.assessmentState === "assessed").length,
      searching: records.filter((record) => record.assessmentState === "searching").length,
    },
    requestedOutcomes: {
      moleculesWithDirectReportedRoute: directReportedRouteRecords,
      moleculesWithCandidateSource: candidateRecordCount,
      moleculesWithTeachingReconstruction: reconstructionRecords,
      moleculesWithNoSourceFoundInRecordedScope: noSourceRecords,
      moleculesWithComputationalProposal: records.filter((record) =>
        record.routes.some((route) => route.routeType === "computational_proposed"),
      ).length,
      reportedSynthesisNotResolved: records.length - directReportedRouteRecords,
    },
    evidenceBoundaryMetrics: {
      activePostTerminalizationOrdCandidateEvidenceRecords: ordCandidateRecordCount,
      activePostTerminalizationOrdCandidateEvidenceDefinition:
        "Coverage records retaining at least one active open-reaction-dataset candidate association after terminal outcome classification and supersession.",
      exactOrdProductCandidatesAreNotReportedRoutes: true,
      resolvedDirectEvidenceRecords: PENDING_REPORTED_ROUTE_CONNECTIVITY_KEYS.size,
      candidateEvidenceRecords: candidateRecordCount,
      sourceEvidenceCounts: {
        ...countBy(evidence, (item) => item.resolutionState),
        resolved: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.evidenceCount,
      },
      sourceKindCounts: {
        ...countBy(evidence, (item) => item.sourceKind),
        patent:
          (countBy(evidence, (item) => item.sourceKind).patent ?? 0) +
          PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.evidenceCount,
      },
    },
    normalizedCandidateExtraction: {
      rawBaselineRecordsWithExactOrdReactionFragment: ordReactionFragmentsByCoverage.filter(
        (item) => item.candidates.length > 0,
      ).length,
      rawBaselineDefinition:
        "Coverage records with at least one exact-target ORD reaction fragment in the immutable extraction baseline, before candidate-association terminalization and supersession.",
      exactOrdReactionFragmentCount: ordReactionFragments.length,
      decodedFragmentCount: ordReactionFragments.filter(
        (candidate) => candidate.decodeState === "decoded",
      ).length,
      upstreamGapFragmentCount: ordReactionFragments.filter(
        (candidate) => candidate.routeCompleteness === "upstream_gap",
      ).length,
      unclassifiedReactionCount: ordReactionFragments.filter((candidate) =>
        isObjectRecord(candidate.reactionClass) &&
        candidate.reactionClass.normalizationState === "unclassified"
      ).length,
      atomMappedFragmentCount: ordReactionFragments.filter((candidate) =>
        isObjectRecord(candidate.bondChanges) &&
        candidate.bondChanges.mappingState !== "not_mapped"
      ).length,
      promotedToCanonicalRouteCount: 0,
      operationalParticipantDetailsPublished: false,
      boundary:
        "Normalized ORD reaction fragments remain private discovery candidates until direct-source resolution, applicability review, atom mapping and reuse gates pass.",
    },
    routes: {
      scope: "private_pending_aggregate",
      privateRouteAggregateCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.routeCount,
      byType: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byType,
      byCompleteness: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byCompleteness,
      byReviewState: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byReviewState,
      publicDetailAllowed: routes.filter((route) =>
        getSynthesisRoutePublicationDecision(route, evidence).routeDetailAllowed,
      ).length,
      routeDetailRecordsPublished: false,
    },
    bestAvailableCoverage: {
      candidate_sources_only: 1_165,
      none_found_in_scope: 384,
      reported_route_pending_or_better: 3,
    },
    providerAttempts: {
      byStatus: countBy(
        records.flatMap((record) => record.sourceSearchScope.providers),
        (provider) => `${provider.adapterId}:${provider.status}`,
      ),
      totalQueries: records.reduce(
        (sum, record) =>
          sum + record.sourceSearchScope.providers.reduce(
            (providerSum, provider) => providerSum + provider.queryCount,
            0,
          ),
        0,
      ),
    },
    cautions: [
      "No-source-found is scoped only to the recorded successful adapters and query identities.",
      "Candidate sources and exact ORD product matches are not complete reported routes.",
      "Computational routes remain zero because no validated retrosynthesis engine was configured.",
      "Parent, salt, hydrate, solvate and stereoisomer identity boundaries are never inferred from names alone.",
    ],
  };
};

const createLicensingReport = (
  records: readonly SynthesisCoverageRecord[],
  evidence: readonly SynthesisSourceEvidence[],
  generatedAt: string,
) => ({
  schemaVersion: 1,
  generatedAt,
  coverageRecordLicenseStates: countBy(records, (record) => record.licenseState),
  sourceEvidenceLicenseStates: countBy(evidence, (item) => item.licenseState),
  routeLicenseStates: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byLicenseState,
  routeLicenseStateScope: "private_pending_aggregate",
  reuseModes: countBy(evidence, (item) => item.reuseMode),
  sourceKinds: Object.fromEntries(
    (["patent", "journal", "aggregator", "open_reaction_dataset"] as const).map((kind) => [
      kind,
      countBy(evidence.filter((item) => item.sourceKind === kind), (item) => item.licenseState),
    ]),
  ),
  policy: [
    {
      adapter: "pubchem-manufacturing",
      state: "mixed",
      reuse: "Only normalized metadata, digests, identifiers and links are published; contributor prose is not redistributed.",
    },
    {
      adapter: "europe-pmc",
      state: "record_specific",
      reuse: "Open-access flags do not by themselves prove a reusable license; unresolved records remain metadata-and-link only.",
    },
    {
      adapter: "europe-pmc-patents",
      state: "link_only",
      reuse: "Patent discovery metadata is retained as a candidate and linked to its record; no patent body text is republished.",
    },
    {
      adapter: "open-reaction-database",
      state: "attribution_required",
      reuse: "ORD-derived normalized metadata is attributed to ord-data under CC BY-SA 4.0; protobuf payloads are not published.",
    },
  ],
  blockedOrUnknownEvidenceCount: evidence.filter((item) =>
    (["restricted", "unknown"] as SynthesisLicenseState[]).includes(item.licenseState)
  ).length,
  blockedOrUnknownEvidenceIdsPublished: false,
});

const deterministicSampleIds = (
  records: readonly SynthesisCoverageRecord[],
): ReadonlySet<string> => {
  const sampleSize = Math.ceil(records.length * 0.02);
  return new Set(
    records
      .map((record) => ({ id: record.id, hash: sha256(record.id) }))
      .sort((left, right) => left.hash.localeCompare(right.hash, "en"))
      .slice(0, sampleSize)
      .map((entry) => entry.id),
  );
};

const createReviewQueue = (
  records: readonly SynthesisCoverageRecord[],
  routes: readonly CanonicalSynthesisRoute[],
  discoveryMetadataByCoverageId: ReadonlyMap<string, readonly Readonly<Record<string, unknown>>[]>,
  generatedAt: string,
) => {
  const sampleIds = deterministicSampleIds(records);
  const routesByCoverageId = new Map<string, CanonicalSynthesisRoute[]>();
  for (const route of routes) {
    const values = routesByCoverageId.get(route.coverageId) ?? [];
    values.push(route);
    routesByCoverageId.set(route.coverageId, values);
  }
  const queue = records.flatMap((record) => {
    const reasons: string[] = [];
    const discoveryMetadata = discoveryMetadataByCoverageId.get(record.id) ?? [];
    if (record.assessmentState === "searching") reasons.push("search_provider_incomplete");
    if (record.sourceEvidenceState === "candidate_sources") {
      reasons.push("candidate_source_requires_resolution");
    }
    if (record.sourceSearchScope.providers.some((provider) => provider.candidateCount > 1)) {
      reasons.push("multiple_candidate_sources");
    }
    if ((routesByCoverageId.get(record.id) ?? []).some((route) => route.reviewState === "pending")) {
      reasons.push("migrated_route_pending_expert_review");
    }
    if (discoveryMetadata.some((metadata) =>
      metadata.parentRelationCandidate === "different_parent_candidate"
    )) reasons.push("parent_or_form_identity_candidate");
    if (record.identityScope.chemicalForm.componentCount > 1) {
      reasons.push("multicomponent_form_identity_review");
    }
    if (
      record.identityScope.stereoisomer.specified &&
      record.sourceEvidenceState === "candidate_sources"
    ) reasons.push("stereoisomer_candidate_applicability_review");
    if (discoveryMetadata.some((metadata) =>
      Array.isArray(metadata.reactionCandidates) &&
      metadata.reactionCandidates.some((candidate) =>
        candidate && typeof candidate === "object" &&
        "provenance" in candidate && candidate.provenance &&
        typeof candidate.provenance === "object" &&
        "isMined" in candidate.provenance && candidate.provenance.isMined === true
      )
    )) reasons.push("mined_ord_candidate_requires_source_resolution");
    if (record.routes.length > 1) reasons.push("multiple_route_comparison_review");
    if (sampleIds.has(record.id)) reasons.push("deterministic_random_sample");
    if (reasons.length === 0) return [];
    return [{
      coverageId: record.id,
      catalogEntityId: record.identityScope.catalogEntityId,
      preferredName: record.identityScope.preferredName,
      priority: reasons.includes("search_provider_incomplete")
        ? "high"
        : reasons.some((reason) =>
            reason.includes("route") ||
            reason.includes("identity") ||
            reason.includes("stereoisomer") ||
            reason.includes("mined")
          )
          ? "medium"
          : "low",
      reasons,
    }];
  });
  return {
    schemaVersion: 1,
    generatedAt,
    policy: {
      expertRole: "Scientific policy and review authority; not catalog content-entry operator.",
      representativePolicySetTarget: "5–10 representative routes",
      deterministicRandomSampleSize: sampleIds.size,
      escalationSignals: [
        "identity or form ambiguity",
        "source conflict",
        "low-confidence normalization",
        "multiple route comparison",
        "incomplete provider search",
      ],
    },
    countsByPriority: countBy(queue, (item) => item.priority),
    countsByReason: {
      ...countBy(queue.flatMap((item) => item.reasons), (reason) => reason),
      migrated_route_pending_expert_review:
        PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.review.pendingRouteIdentityCount,
      multiple_route_comparison_review:
        PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.review.multipleRouteIdentityCount,
    },
    reviewRecordCount: queue.length,
    recordsPublished: false,
  };
};

const routeComparisonFor = (
  route: CanonicalSynthesisRoute,
  evidence: readonly SynthesisSourceEvidence[],
) => ({
  routeId: route.id,
  routeType: route.routeType,
  reviewState: route.reviewState,
  publicationState: getSynthesisRoutePublicationDecision(route, evidence).presentation,
  numberOfSteps: route.steps.length,
  startingMaterials: route.materials
    .filter((material) => material.role === "starting_material")
    .map((material) => material.label),
  startBoundary: route.startBoundary,
  stereochemicalStrategy: route.stereochemicalStrategy,
  keyTransformations: route.steps.map((step) => step.reactionClass.label),
  sourceYear: route.publicationYear,
  routeCompleteness: route.routeCompleteness,
});

export interface PublicSynthesisRouteDetailV1 {
  readonly schemaVersion: 1;
  readonly routeId: CanonicalSynthesisRoute["id"];
  readonly coverageId: CanonicalSynthesisRoute["coverageId"];
  readonly identity: {
    readonly catalogEntityId: string;
    readonly pubChemCid: number;
    readonly inchiKey: string;
  };
  readonly routeType: CanonicalSynthesisRoute["routeType"];
  readonly publicationState:
    | "reported_route"
    | "teaching_reconstruction"
    | "computationally_proposed_route";
  readonly routeCompleteness: CanonicalSynthesisRoute["routeCompleteness"];
  readonly reviewState: "reviewed" | "verified";
  readonly licenseState: "permitted" | "attribution_required";
  readonly applicability: "applicable";
  readonly title: string;
  readonly startBoundary: string;
  readonly stereochemicalStrategy: string;
  readonly targetMaterialId: CanonicalSynthesisRoute["targetMaterialId"];
  readonly materials: readonly {
    readonly id: CanonicalSynthesisRoute["materials"][number]["id"];
    readonly label: string;
    readonly role: CanonicalSynthesisRoute["materials"][number]["role"];
  }[];
  readonly steps: readonly {
    readonly id: CanonicalSynthesisRoute["steps"][number]["id"];
    readonly order: number;
    readonly reactantMaterialIds: readonly CanonicalSynthesisRoute["materials"][number]["id"][];
    readonly productMaterialIds: readonly CanonicalSynthesisRoute["materials"][number]["id"][];
    readonly transformation: string;
    readonly evidenceStatus: CanonicalSynthesisRoute["steps"][number]["evidenceMode"];
    readonly reviewState: "reviewed" | "verified";
    readonly citationIndexes: readonly number[];
  }[];
  readonly citations: readonly {
    readonly label: string;
    readonly url: string;
    readonly locator: NonNullable<SynthesisSourceEvidence["locator"]>;
    readonly supportScope: Exclude<SynthesisSourceEvidence["supportScope"], "identity_only">;
    readonly licenseState: "permitted" | "attribution_required";
    readonly reuseMode: Exclude<
      SynthesisSourceEvidence["reuseMode"],
      "metadata_and_link_only"
    >;
  }[];
  readonly safety: { readonly operationalDetailsIncluded: false };
}

/**
 * A reviewed route is still projected into a deliberately smaller browser
 * contract. Canonical evidence IDs, document IDs/hashes, reviewer events,
 * structures, mappings, bond changes and operational chemistry never cross
 * this boundary.
 */
export const createPublicSynthesisRouteDetailProjection = (
  route: CanonicalSynthesisRoute,
  evidence: readonly SynthesisSourceEvidence[],
): PublicSynthesisRouteDetailV1 => {
  const decision = getSynthesisRoutePublicationDecision(route, evidence);
  if (!decision.routeDetailAllowed || decision.presentation === "withheld") {
    throw new Error(`Synthesis route detail remains withheld: ${route.id}.`);
  }
  if (route.licenseState !== "permitted" && route.licenseState !== "attribution_required") {
    throw new Error(`Synthesis route detail license is not publishable: ${route.id}.`);
  }
  if (route.reviewState !== "reviewed" && route.reviewState !== "verified") {
    throw new Error(`Synthesis route detail review gate has not passed: ${route.id}.`);
  }
  const evidenceById = new Map(evidence.map((item) => [item.id, item] as const));
  const usedEvidenceIds = [...new Set(route.steps.flatMap((step) => step.sourceEvidenceIds))];
  const citationEvidence = usedEvidenceIds.map((id) => {
    const source = evidenceById.get(id);
    if (
      !source ||
      source.resolutionState !== "resolved" ||
      !source.locator ||
      !source.locator.value.trim() ||
      !source.url.startsWith("https://") ||
      source.reuseMode === "metadata_and_link_only" ||
      (source.licenseState !== "permitted" &&
        source.licenseState !== "attribution_required") ||
      source.supportScope === "identity_only" ||
      (route.licenseState === "permitted" &&
        source.licenseState === "attribution_required")
    ) {
      throw new Error(`Route ${route.id} has no public-detail-safe citation for ${id}.`);
    }
    return source as SynthesisSourceEvidence & {
      readonly locator: NonNullable<SynthesisSourceEvidence["locator"]>;
      readonly reuseMode: Exclude<
        SynthesisSourceEvidence["reuseMode"],
        "metadata_and_link_only"
      >;
      readonly supportScope: Exclude<
        SynthesisSourceEvidence["supportScope"],
        "identity_only"
      >;
      readonly licenseState: "permitted" | "attribution_required";
    };
  });
  const citationIndexByEvidenceId = new Map(
    citationEvidence.map((source, index) => [source.id, index] as const),
  );
  const steps = route.steps.map((step) => {
    const citationIndexes = [...new Set(step.sourceEvidenceIds.map((id) => {
      const index = citationIndexByEvidenceId.get(id);
      if (index === undefined) {
        throw new Error(`Route ${route.id} step ${step.id} has an unpublishable citation.`);
      }
      return index;
    }))];
    if (step.evidenceMode !== "computational" && citationIndexes.length === 0) {
      throw new Error(`Route ${route.id} step ${step.id} lacks a public citation.`);
    }
    if (step.reviewState !== "reviewed" && step.reviewState !== "verified") {
      throw new Error(`Route ${route.id} step ${step.id} has not passed review.`);
    }
    if (
      (route.routeType === "teaching_reconstruction" ||
        route.routeType === "computational_proposed") &&
      step.reviewState === "verified"
    ) {
      throw new Error(`Educational/proposed step ${step.id} cannot publish as verified.`);
    }
    if (
      (route.routeType === "patent_reported" || route.routeType === "literature_reported") &&
      step.evidenceMode !== "direct_reported"
    ) {
      throw new Error(`Reported route ${route.id} contains a non-reported public step.`);
    }
    if (route.routeType === "teaching_reconstruction" && step.evidenceMode === "computational") {
      throw new Error(`Teaching route ${route.id} contains a computational public step.`);
    }
    if (route.routeType === "computational_proposed" && step.evidenceMode !== "computational") {
      throw new Error(`Computational route ${route.id} contains a non-computational public step.`);
    }
    return {
      id: step.id,
      order: step.order,
      reactantMaterialIds: step.inputMaterialIds,
      productMaterialIds: step.outputMaterialIds,
      transformation: step.reactionClass.label,
      evidenceStatus: step.evidenceMode,
      reviewState: step.reviewState,
      citationIndexes,
    };
  });
  return {
    schemaVersion: 1,
    routeId: route.id,
    coverageId: route.coverageId,
    identity: {
      catalogEntityId: route.identityScope.catalogEntityId,
      pubChemCid: route.identityScope.pubChemCid,
      inchiKey: route.identityScope.inchiKey,
    },
    routeType: route.routeType,
    publicationState: decision.presentation,
    routeCompleteness: route.routeCompleteness,
    reviewState: route.reviewState,
    licenseState: route.licenseState,
    applicability: "applicable",
    title: route.title,
    startBoundary: route.startBoundary,
    stereochemicalStrategy: route.stereochemicalStrategy,
    targetMaterialId: route.targetMaterialId,
    materials: route.materials.map((material) => ({
      id: material.id,
      label: material.label,
      role: material.role,
    })),
    steps,
    citations: citationEvidence.map((source) => ({
      label: source.title,
      url: source.url,
      locator: source.locator,
      supportScope: source.supportScope,
      licenseState: source.licenseState,
      reuseMode: source.reuseMode,
    })),
    safety: { operationalDetailsIncluded: false },
  };
};

export interface PublishedSynthesisSnapshotSummary {
  readonly catalogSnapshotId: string;
  readonly coverageRecords: number;
  readonly evidenceRecords: number;
  readonly privateRouteAggregateCount: number;
  readonly publishedRouteDetails: number;
  readonly publicAlphaDraftRoutes: number;
  readonly publicAlphaDraftGraphs: number;
  readonly shardCount: number;
  readonly outputPath: string;
}

export const publishSynthesisSnapshot = async (): Promise<PublishedSynthesisSnapshotSummary> => {
  const discovery = await loadAcceptedSynthesisDiscoveryBaseline();
  const extraction = await loadCompletedSynthesisExtraction();
  const generatedAt = extraction.manifest.generatedAt;
  const evidence = uniqueEvidence([
    ...discovery.subjects.flatMap((result) => result.evidence),
  ]);
  // Real pending/link-only canonical routes remain in the private review layer.
  const routes: readonly CanonicalSynthesisRoute[] = [];
  const canonicalCoverage = mergeExtractionIntoCoverage(
    mergeRoutesIntoCoverage(
      discovery.subjects.map((result) => result.coverage),
      routes,
      evidence,
    ),
    extraction.summariesByCoverageId,
    extraction.assessments,
    routes,
  );
  const draftAssembly = assemblePublicAlphaSynthesisDrafts({
    coverage: canonicalCoverage,
    evidence,
    assessments: extraction.assessments,
    segments: extraction.resolvedSegments,
    generatedAt,
    sourceContent: await loadSynthesisSourceContentRunSummary(),
  });
  await writePublicAlphaSynthesisDraftAssembly(draftAssembly);
  const publicCoverageProjection = createPublicSynthesisCoverageProjection(
    canonicalCoverage,
    routes,
    evidence,
  );
  const publicCoverage = publicCoverageProjection.map((record) => {
    const publicAlphaDrafts = draftAssembly.referencesByCoverageId.get(record.id) ?? [];
    if (publicAlphaDrafts.length === 0) return { ...record, publicAlphaDrafts: [] };
    return {
      ...record,
      publicAlphaDrafts,
      unresolvedReasons: [
        ...record.unresolvedReasons.filter((reason) =>
          !reason.startsWith("Reported synthesis: Not resolved")
        ),
        "Source-supported public-alpha draft available; expert review, reaction classification and upstream completion remain pending.",
      ],
    };
  });
  const canonicalEvidenceById = new Map(evidence.map((item) => [item.id, item] as const));
  const publicEvidence = uniqueEvidence(publicCoverage.flatMap((record) =>
    record.sourceEvidenceIds.flatMap((id) => {
      const item = canonicalEvidenceById.get(id);
      return item ? [item] : [];
    }),
  ));
  const domainManifest: SynthesisCoverageSnapshotManifest = {
    schemaVersion: 1,
    catalogSnapshotId: discovery.manifest.catalogSnapshotId,
    pipelineVersion: discovery.manifest.pipelineVersion,
    generatedAt,
    recordCount: publicCoverage.length,
    coverageSha256: sha256(stableJson(publicCoverage)),
  };
  const expectedIdentities = discovery.subjects.map((result) => result.coverage.identityScope);
  const validationIssues: SynthesisValidationIssue[] = [
    ...validateSynthesisEvidenceExtraction(
      extraction.manifest,
      extraction.assessments,
      extraction.resolvedSegments,
    ),
    ...validateSynthesisCoverageSnapshot(
      canonicalCoverage,
      expectedIdentities,
      domainManifest,
      evidence,
    ),
    ...validateSynthesisCoverageRouteLinks(canonicalCoverage, routes),
    ...validateSynthesisCoverageSnapshot(
      publicCoverage,
      expectedIdentities,
      domainManifest,
      publicEvidence,
    ),
    ...routes.flatMap((route) => validateCanonicalSynthesisRoute(route, evidence)),
  ];
  const errors = validationIssues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(`Synthesis snapshot validation failed: ${JSON.stringify(errors.slice(0, 20))}`);
  }

  await rm(synthesisPublicOutputUrl, { recursive: true, force: true });
  await mkdir(synthesisPublicOutputUrl, { recursive: true });
  const evidenceById = new Map(publicEvidence.map((item) => [item.id, item] as const));
  const shardKeys = [...new Set(publicCoverage.map((record) =>
    record.identityScope.inchiKey[0].toLocaleLowerCase("en"),
  ))].sort();
  const shardArtifacts = [];
  for (const key of shardKeys) {
    const records = publicCoverage.filter((record) =>
      record.identityScope.inchiKey.toLocaleLowerCase("en").startsWith(key),
    );
    const shardEvidence = uniqueEvidence(records.flatMap((record) =>
      record.sourceEvidenceIds.flatMap((id) => {
        const item = evidenceById.get(id);
        return item ? [item] : [];
      }),
    ));
    const artifact = await writePublicJson(`shards/${key}.json`, {
      schemaVersion: 1,
      catalogSnapshotId: discovery.manifest.catalogSnapshotId,
      pipelineVersion: discovery.manifest.pipelineVersion,
      shardKey: key,
      records,
      sourceEvidence: shardEvidence,
      // Per-record search attempts, document/source IDs, hashes and locators
      // remain in private work artifacts. Browser shards expose only coverage
      // state and zero source-evidence records until the publication gate passes.
      discovery: [],
    });
    shardArtifacts.push({ ...artifact, key, recordCount: records.length });
  }

  const publishedRouteArtifacts = [];
  const routeIndex: Array<Record<string, unknown> & { detailPath: string | null }> = [];
  for (const route of routes) {
    const decision = getSynthesisRoutePublicationDecision(route, evidence);
    if (!decision.routeSummaryAllowed) continue;
    const comparison = routeComparisonFor(route, evidence);
    let detailPath: string | null = null;
    if (decision.routeDetailAllowed) {
      const fileName = `${route.id.replace(/^synthesis-route:/u, "").replace(/[^a-z0-9-]+/giu, "-")}.json`;
      const artifact = await writePublicJson(
        `routes/${fileName}`,
        createPublicSynthesisRouteDetailProjection(route, evidence),
      );
      publishedRouteArtifacts.push(artifact);
      detailPath = artifact.path;
    }
    routeIndex.push({
      ...comparison,
      detailPath,
      blockerCodes: decision.blockerCodes,
    });
  }
  const routeIndexArtifact = await writePublicJson("routes/index.json", {
    schemaVersion: 1,
    generatedAt,
    routes: routeIndex,
  });
  const publicDraftArtifacts = [];
  for (const graph of draftAssembly.graphs) {
    const artifact = await writePublicJson(
      `drafts/${graph.graphId.slice("synthesis-draft-graph:".length)}.json`,
      graph,
    );
    publicDraftArtifacts.push(artifact);
  }
  const publicDraftIndexArtifact = await writePublicJson("drafts/index.json", {
    schemaVersion: 1,
    channel: "public_alpha_source_supported_draft",
    catalogSnapshotId: discovery.manifest.catalogSnapshotId,
    generatedAt,
    graphs: draftAssembly.graphs.map((graph) => {
      const reference = draftAssembly.referencesByCoverageId.get(graph.identity.coverageId)?.[0];
      if (!reference) throw new Error(`Missing public-alpha reference for ${graph.graphId}.`);
      return {
        ...reference,
        catalogEntityId: graph.identity.catalogEntityId,
        pubChemCid: graph.identity.pubChemCid,
        inchiKey: graph.identity.inchiKey,
      };
    }),
  });

  const discoveryMetadataByCoverageId = new Map(
    discovery.subjects.map((result) => [
      result.coverage.id,
      result.adapters.map((adapter) => adapter.metadata),
    ] as const),
  );
  const coverageReport = {
    ...createCoverageReport(
    canonicalCoverage,
    routes,
    evidence,
    discoveryMetadataByCoverageId,
    generatedAt,
    ),
    publicAlphaDraftAssembly: draftAssembly.report,
  };
  const licensingReport = createLicensingReport(
    canonicalCoverage,
    evidence,
    generatedAt,
  );
  const reviewQueue = createReviewQueue(
    canonicalCoverage,
    routes,
    discoveryMetadataByCoverageId,
    generatedAt,
  );
  const candidateTerminalizationReport = createCandidateTerminalizationReport(
    extraction.assessments,
    generatedAt,
    extraction.manifest.pipelineVersion,
  );
  const baselineCandidateSnapshotReport = {
    schemaVersion: 1,
    generatedAt,
    acceptedBaseline: SYNTHESIS_CANDIDATE_BASELINE,
    recomputedUnderPipelineVersion: extraction.manifest.pipelineVersion,
    recomputed: {
      totalMolecules: extraction.manifest.moleculeCount,
      candidateBearingMolecules: extraction.manifest.candidateBearingMoleculeCount,
      moleculeEvidenceMatches: extraction.manifest.candidateAssociationCount,
      uniqueEvidenceDocumentReactionCandidates:
        extraction.manifest.uniqueGlobalDocumentCount,
      exactLocatorMissingCandidates:
        extraction.manifest.currentExactLocatorMissingCount,
      journalFallbackIdentityAssociations:
        extraction.journalIdentityAudit.legacyFallbackIdentityCount,
      currentActiveJournalFallbackIdentityAssociations:
        extraction.manifest.currentJournalFallbackIdentityCount,
      decodedOrdFragments: extraction.ordAudit.decodedFragmentCount,
      ordFragmentBearingMolecules: new Set(
        extraction.assessments
          .filter((item) => item.sourceEvidenceId.includes(":ord:"))
          .map((item) => item.coverageId),
      ).size,
    },
    baselinePreservedWithoutOverwrite: true,
  };
  const moleculeBestOutcomeReport = {
    schemaVersion: 1,
    generatedAt,
    moleculeCount: canonicalCoverage.length,
    mutuallyExclusive: true,
    totalEqualsCatalog: canonicalCoverage.length === extraction.manifest.moleculeCount,
    reportedRouteFoundPendingReviewCount: publicCoverage.filter(
      (record) => record.reportedRouteFoundPendingReview,
    ).length,
    byBestOutcome: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.moleculeBestOutcome,
  };
  const routeDistributionReport = {
    schemaVersion: 1,
    generatedAt,
    scope: "private_pending_aggregate",
    routeCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.routeCount,
    byType: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byType,
    byCompleteness: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byCompleteness,
    byReviewState: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byReviewState,
    byLicenseState: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byLicenseState,
    bySourceFamily: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.bySourceFamily,
    pendingDirectSegmentsExcludedFromRouteCount: extraction.ordAudit.directSegmentCandidateCount,
    routeDetailRecordsPublished: false,
    publicAlphaDraftChannel: {
      channel: "public_alpha_source_supported_draft",
      publicDraftRoutes: draftAssembly.report.publicDraftRoutes,
      partialRoutes: draftAssembly.report.partialRoutes,
      routeGraphs: draftAssembly.report.routeGraphs,
      teachingReconstructions: draftAssembly.report.teachingReconstructions,
      reviewedRoutes: draftAssembly.report.reviewedRoutes,
    },
  };
  const licenseRightsReport = {
    schemaVersion: 1,
    generatedAt,
    associationCount: extraction.assessments.length,
    byLicenseState: zeroFilledCountBy(
      extraction.assessments,
      (item) => item.licenseState,
      SYNTHESIS_EVIDENCE_LICENSE_STATES,
    ),
    byCopyrightState: zeroFilledCountBy(
      extraction.assessments,
      (item) => item.rights.copyrightState,
      SYNTHESIS_COPYRIGHT_STATES,
    ),
    byRedistributionPermission: zeroFilledCountBy(
      extraction.assessments,
      (item) => item.rights.redistributionPermission,
      SYNTHESIS_REDISTRIBUTION_PERMISSION_STATES,
    ),
    byParaphrasePermission: zeroFilledCountBy(
      extraction.assessments,
      (item) => item.rights.paraphrasePermission,
      SYNTHESIS_PARAPHRASE_PERMISSION_STATES,
    ),
    byFigureSchemeReusePermission: zeroFilledCountBy(
      extraction.assessments,
      (item) => item.rights.figureSchemeReusePermission,
      SYNTHESIS_FIGURE_REUSE_PERMISSION_STATES,
    ),
    openAccessLabelOnlyCount: extraction.assessments.filter(
      (item) => item.rights.openAccessLabelOnly,
    ).length,
    policy:
      "An open-access label never proves redistribution or figure/scheme reuse permission; pending rights remain metadata/link only.",
  };
  const errorAssessments = extraction.assessments.filter((item) =>
    item.extractionOutcome === "parse_error" ||
    item.extractionOutcome === "retryable_error" ||
    item.extractionOutcome === "access_blocked"
  );
  const errorSummaryReport = {
    schemaVersion: 1,
    generatedAt,
    errorAssociationCount: errorAssessments.length,
    byOutcome: zeroFilledCountBy(
      errorAssessments,
      (item) => item.extractionOutcome as (typeof SYNTHESIS_ERROR_OUTCOMES)[number],
      SYNTHESIS_ERROR_OUTCOMES,
    ),
    byReasonCode: countBy(
      errorAssessments.flatMap((item) => item.reasonCodes),
      (reason) => reason,
    ),
    retryMetadataComplete: errorAssessments
      .filter((item) => item.extractionOutcome === "retryable_error")
      .every((item) => Boolean(item.retry)),
    rawErrorsOrSourceTextPublished: false,
  };
  const coverageReportArtifact = await writePublicJson("reports/coverage.json", coverageReport);
  const licensingReportArtifact = await writePublicJson("reports/licensing.json", licensingReport);
  const reviewQueueArtifact = await writePublicJson("reports/review-queue.json", reviewQueue);
  const baselineCandidateSnapshotArtifact = await writePublicJson(
    "reports/baseline-candidate-snapshot.json",
    baselineCandidateSnapshotReport,
  );
  const candidateTerminalizationArtifact = await writePublicJson(
    "reports/candidate-terminalization.json",
    candidateTerminalizationReport,
  );
  const documentDedupeArtifact = await writePublicJson(
    "reports/document-dedupe.json",
    { schemaVersion: 1, generatedAt, ...extraction.documentDedupe },
  );
  const journalIdentityAuditArtifact = await writePublicJson(
    "reports/journal-identity-audit.json",
    { schemaVersion: 1, generatedAt, ...extraction.journalIdentityAudit },
  );
  const moleculeBestOutcomeArtifact = await writePublicJson(
    "reports/molecule-best-outcome.json",
    moleculeBestOutcomeReport,
  );
  const routeDistributionArtifact = await writePublicJson(
    "reports/route-distribution.json",
    routeDistributionReport,
  );
  const licenseRightsArtifact = await writePublicJson(
    "reports/license-rights.json",
    licenseRightsReport,
  );
  const errorSummaryArtifact = await writePublicJson(
    "reports/error-summary.json",
    errorSummaryReport,
  );
  const ordResolutionArtifact = await writePublicJson(
    "reports/ord-resolution.json",
    { schemaVersion: 1, generatedAt, ...extraction.ordAudit },
  );
  const routeAssemblyArtifact = await writePublicJson(
    "reports/route-assembly.json",
    draftAssembly.report,
  );
  const migrationReportArtifact = await writePublicJson(
    "reports/migration.json",
    {
      schemaVersion: 1,
      generatedAt,
      migrationVersion: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.migrationVersion,
      expectedLegacyRouteCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.expectedLegacyRouteCount,
      legacyRouteCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.legacyRouteCount,
      accountedRouteCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.accountedRouteCount,
      evidenceCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.evidenceCount,
      routeTypeCounts: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byType,
      excludedSourceContextStepCount:
        PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.excludedSourceContextStepCount,
      excludedTargetFormStepCount:
        PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.excludedTargetFormStepCount,
      invariants: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.migration.invariants,
      routeOrStepIdentifiersPublished: false,
    },
  );
  const validationArtifact = await writePublicJson("reports/validation.json", {
    schemaVersion: 1,
    generatedAt,
    issueCount: validationIssues.length,
    warningCount: validationIssues.filter((issue) => issue.severity === "warning").length,
    errorCount: 0,
    countsBySeverity: countBy(validationIssues, (issue) => issue.severity),
    countsByCode: countBy(validationIssues, (issue) => issue.code),
    issueDetailsPublished: false,
  });
  const manifest = {
    ...domainManifest,
    routeCount: routeIndex.length,
    privateRouteAggregateCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.routeCount,
    sourceEvidenceCount: publicEvidence.length,
    shardCount: shardArtifacts.length,
    shards: shardArtifacts,
    routes: {
      index: routeIndexArtifact,
      details: publishedRouteArtifacts,
      publishedDetailCount: publishedRouteArtifacts.length,
      withheldDetailCount:
        PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.routeCount - publishedRouteArtifacts.length,
    },
    drafts: {
      channel: "public_alpha_source_supported_draft",
      index: publicDraftIndexArtifact,
      details: publicDraftArtifacts,
      publishedDraftCount: draftAssembly.report.publicDraftRoutes,
      routeGraphCount: draftAssembly.report.routeGraphs,
      reviewedRouteCount: 0,
    },
    reports: {
      coverage: coverageReportArtifact,
      licensing: licensingReportArtifact,
      reviewQueue: reviewQueueArtifact,
      baselineCandidateSnapshot: baselineCandidateSnapshotArtifact,
      candidateTerminalization: candidateTerminalizationArtifact,
      documentDedupe: documentDedupeArtifact,
      journalIdentityAudit: journalIdentityAuditArtifact,
      moleculeBestOutcome: moleculeBestOutcomeArtifact,
      routeDistribution: routeDistributionArtifact,
      licenseRights: licenseRightsArtifact,
      errorSummary: errorSummaryArtifact,
      ordResolution: ordResolutionArtifact,
      routeAssembly: routeAssemblyArtifact,
      migration: migrationReportArtifact,
      validation: validationArtifact,
    },
    licenseNotice: {
      ordData: "CC-BY-SA-4.0; attribution required for ORD-derived normalized metadata.",
      publisherTextRedistributed: false,
      rawProviderPayloadsPublished: false,
      extractionAssociationAuditsPublished: false,
      resolvedSegmentRecordsPublished: false,
      independentOrdStructureRedrawsPublished: true,
    },
    extraction: extraction.manifest,
  };
  await writePublicJson("manifest.json", manifest);
  return {
    catalogSnapshotId: discovery.manifest.catalogSnapshotId,
    coverageRecords: publicCoverage.length,
    evidenceRecords: publicEvidence.length,
    privateRouteAggregateCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.routeCount,
    publishedRouteDetails: publishedRouteArtifacts.length,
    publicAlphaDraftRoutes: draftAssembly.report.publicDraftRoutes,
    publicAlphaDraftGraphs: draftAssembly.report.routeGraphs,
    shardCount: shardArtifacts.length,
    outputPath: synthesisPublicOutputUrl.pathname,
  };
};

export const readPublishedSynthesisCoverageReport = async (): Promise<unknown> =>
  JSON.parse(await readFile(new URL("reports/coverage.json", synthesisPublicOutputUrl), "utf8"));
