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
  getSynthesisRoutePublicationDecision,
  validateCanonicalSynthesisRoute,
  validateSynthesisCoverageRouteLinks,
  validateSynthesisCoverageSnapshot,
  type SynthesisValidationIssue,
} from "../../lib/domain/synthesis-validation";
import { loadCompletedSynthesisDiscovery } from "./discover-catalog.mjs";
import { migrateLegacySynthesisRoutes } from "./migrate-legacy-routes.mjs";
import { aggregateLicenseState } from "./source-adapters.mjs";

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

const isObjectRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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
    return {
      ...record,
      applicability:
        record.applicability === "not_applicable"
          ? "not_applicable"
          : record.applicability === "applicable" &&
              record.sourceEvidenceState === "direct_source_resolved" &&
              hasPublicApplicableSourceBackedRoute
            ? "applicable"
            : "unclear",
      routes: publicRoutes,
    };
  });
};

const bestAvailable = (record: SynthesisCoverageRecord): string => {
  if (record.routes.some((route) =>
    route.routeType === "patent_reported" || route.routeType === "literature_reported"
  )) return "reported_route_pending_or_better";
  if (record.routes.some((route) => route.routeType === "teaching_reconstruction")) {
    return "teaching_reconstruction";
  }
  if (record.routes.some((route) => route.routeType === "computational_proposed")) {
    return "computational_proposed";
  }
  if (record.sourceEvidenceState === "direct_source_resolved") return "direct_source_no_route";
  if (record.sourceEvidenceState === "candidate_sources") return "candidate_sources_only";
  return record.assessmentState === "assessed" ? "none_found_in_scope" : "search_incomplete";
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
    record.routes.some((route) =>
      route.routeType === "patent_reported" || route.routeType === "literature_reported"
    ),
  ).length;
  const reconstructionRecords = records.filter((record) =>
    record.routes.some((route) => route.routeType === "teaching_reconstruction"),
  ).length;
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
      exactOrdProductCandidateRecords: ordCandidateRecordCount,
      exactOrdProductCandidatesAreNotReportedRoutes: true,
      resolvedDirectEvidenceRecords: records.filter((record) =>
        record.sourceEvidenceState === "direct_source_resolved",
      ).length,
      candidateEvidenceRecords: candidateRecordCount,
      sourceEvidenceCounts: countBy(evidence, (item) => item.resolutionState),
      sourceKindCounts: countBy(evidence, (item) => item.sourceKind),
    },
    normalizedCandidateExtraction: {
      recordsWithExactOrdReactionFragment: ordReactionFragmentsByCoverage.filter(
        (item) => item.candidates.length > 0,
      ).length,
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
      migratedRouteCount: routes.length,
      byType: countBy(routes, (route) => route.routeType),
      byCompleteness: countBy(routes, (route) => route.routeCompleteness),
      byReviewState: countBy(routes, (route) => route.reviewState),
      publicDetailAllowed: routes.filter((route) =>
        getSynthesisRoutePublicationDecision(route, evidence).routeDetailAllowed,
      ).length,
    },
    bestAvailableCoverage: countBy(records, bestAvailable),
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
  routes: readonly CanonicalSynthesisRoute[],
  evidence: readonly SynthesisSourceEvidence[],
  generatedAt: string,
) => ({
  schemaVersion: 1,
  generatedAt,
  coverageRecordLicenseStates: countBy(records, (record) => record.licenseState),
  sourceEvidenceLicenseStates: countBy(evidence, (item) => item.licenseState),
  routeLicenseStates: countBy(routes, (route) => route.licenseState),
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
  blockedOrUnknownEvidence: evidence
    .filter((item) => (["restricted", "unknown"] as SynthesisLicenseState[]).includes(item.licenseState))
    .map((item) => item.id),
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
          : "sample",
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
    records: queue,
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

const withheldRouteComparisonFor = (
  route: CanonicalSynthesisRoute,
  evidence: readonly SynthesisSourceEvidence[],
) => ({
  routeId: route.id,
  reviewState: route.reviewState,
  licenseState: route.licenseState,
  publicationState: "withheld" as const,
  blockerCodes: getSynthesisRoutePublicationDecision(route, evidence).blockerCodes,
});

export interface PublishedSynthesisSnapshotSummary {
  readonly catalogSnapshotId: string;
  readonly coverageRecords: number;
  readonly evidenceRecords: number;
  readonly migratedRoutes: number;
  readonly publishedRouteDetails: number;
  readonly shardCount: number;
  readonly outputPath: string;
}

export const publishSynthesisSnapshot = async (): Promise<PublishedSynthesisSnapshotSummary> => {
  const discovery = await loadCompletedSynthesisDiscovery();
  const migration = await migrateLegacySynthesisRoutes();
  const generatedAt = discovery.manifest.completedAt ?? new Date().toISOString();
  const evidence = uniqueEvidence([
    ...discovery.subjects.flatMap((result) => result.evidence),
    ...migration.evidence,
  ]);
  const routes = [...migration.routes].sort((left, right) => left.id.localeCompare(right.id, "en"));
  const canonicalCoverage = mergeRoutesIntoCoverage(
    discovery.subjects.map((result) => result.coverage),
    routes,
    evidence,
  );
  const publicCoverage = createPublicSynthesisCoverageProjection(
    canonicalCoverage,
    routes,
    evidence,
  );
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
      evidence,
    ),
    ...routes.flatMap((route) => validateCanonicalSynthesisRoute(route, evidence)),
  ];
  const errors = validationIssues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(`Synthesis snapshot validation failed: ${JSON.stringify(errors.slice(0, 20))}`);
  }

  await rm(synthesisPublicOutputUrl, { recursive: true, force: true });
  await mkdir(synthesisPublicOutputUrl, { recursive: true });
  const discoveryByCoverageId = new Map(
    discovery.subjects.map((result) => [result.coverage.id, result] as const),
  );
  const evidenceById = new Map(evidence.map((item) => [item.id, item] as const));
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
      discovery: records.map((record) => ({
        coverageId: record.id,
        adapters: discoveryByCoverageId.get(record.id)?.adapters.map((adapter) => ({
          adapterId: adapter.adapterId,
          attempt: adapter.attempt,
        })) ?? [],
      })),
    });
    shardArtifacts.push({ ...artifact, key, recordCount: records.length });
  }

  const publishedRouteArtifacts = [];
  const routeIndex = routes.map((route) => {
    const decision = getSynthesisRoutePublicationDecision(route, evidence);
    if (!decision.routeSummaryAllowed) {
      return { ...withheldRouteComparisonFor(route, evidence), detailPath: null };
    }
    const comparison = routeComparisonFor(route, evidence);
    if (!decision.routeDetailAllowed) {
      return { ...comparison, detailPath: null, blockerCodes: decision.blockerCodes };
    }
    return { ...comparison, detailPath: "pending-write", blockerCodes: decision.blockerCodes };
  });
  for (const [index, route] of routes.entries()) {
    const decision = getSynthesisRoutePublicationDecision(route, evidence);
    if (!decision.routeDetailAllowed) continue;
    const fileName = `${route.id.replace(/^synthesis-route:/u, "").replace(/[^a-z0-9-]+/giu, "-")}.json`;
    const artifact = await writePublicJson(`routes/${fileName}`, route);
    publishedRouteArtifacts.push(artifact);
    (routeIndex[index] as { detailPath: string | null }).detailPath = artifact.path;
  }
  const routeIndexArtifact = await writePublicJson("routes/index.json", {
    schemaVersion: 1,
    generatedAt,
    routes: routeIndex,
  });

  const discoveryMetadataByCoverageId = new Map(
    discovery.subjects.map((result) => [
      result.coverage.id,
      result.adapters.map((adapter) => adapter.metadata),
    ] as const),
  );
  const coverageReport = createCoverageReport(
    canonicalCoverage,
    routes,
    evidence,
    discoveryMetadataByCoverageId,
    generatedAt,
  );
  const licensingReport = createLicensingReport(
    canonicalCoverage,
    routes,
    evidence,
    generatedAt,
  );
  const reviewQueue = createReviewQueue(
    canonicalCoverage,
    routes,
    discoveryMetadataByCoverageId,
    generatedAt,
  );
  const coverageReportArtifact = await writePublicJson("reports/coverage.json", coverageReport);
  const licensingReportArtifact = await writePublicJson("reports/licensing.json", licensingReport);
  const reviewQueueArtifact = await writePublicJson("reports/review-queue.json", reviewQueue);
  const migrationReportArtifact = await writePublicJson(
    "reports/migration.json",
    migration.migrationReport,
  );
  const validationArtifact = await writePublicJson("reports/validation.json", {
    schemaVersion: 1,
    generatedAt,
    issueCount: validationIssues.length,
    warningCount: validationIssues.filter((issue) => issue.severity === "warning").length,
    errorCount: 0,
    issues: validationIssues,
  });
  const manifest = {
    ...domainManifest,
    routeCount: routes.length,
    sourceEvidenceCount: evidence.length,
    shardCount: shardArtifacts.length,
    shards: shardArtifacts,
    routes: {
      index: routeIndexArtifact,
      details: publishedRouteArtifacts,
      publishedDetailCount: publishedRouteArtifacts.length,
      withheldDetailCount: routes.length - publishedRouteArtifacts.length,
    },
    reports: {
      coverage: coverageReportArtifact,
      licensing: licensingReportArtifact,
      reviewQueue: reviewQueueArtifact,
      migration: migrationReportArtifact,
      validation: validationArtifact,
    },
    licenseNotice: {
      ordData: "CC-BY-SA-4.0; attribution required for ORD-derived normalized metadata.",
      publisherTextRedistributed: false,
      rawProviderPayloadsPublished: false,
    },
  };
  await writePublicJson("manifest.json", manifest);
  return {
    catalogSnapshotId: discovery.manifest.catalogSnapshotId,
    coverageRecords: publicCoverage.length,
    evidenceRecords: evidence.length,
    migratedRoutes: routes.length,
    publishedRouteDetails: publishedRouteArtifacts.length,
    shardCount: shardArtifacts.length,
    outputPath: synthesisPublicOutputUrl.pathname,
  };
};

export const readPublishedSynthesisCoverageReport = async (): Promise<unknown> =>
  JSON.parse(await readFile(new URL("reports/coverage.json", synthesisPublicOutputUrl), "utf8"));
