import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { validateGeneratedSynthesisSnapshot } = await tsImport(
  "../scripts/synthesis/validate-generated-snapshot.mts",
  import.meta.url,
);
const { deriveSynthesisEvidenceAccessState } = await tsImport(
  "../scripts/synthesis/extract-candidates.mts",
  import.meta.url,
);
const { selectSynthesisMoleculeBestOutcome } = await tsImport(
  "../scripts/synthesis/publish-snapshot.mts",
  import.meta.url,
);

const publicSynthesisUrl = new URL("../public/catalog/synthesis/", import.meta.url);

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, publicSynthesisUrl), "utf8"));

const localArtifactUrl = (artifactPath) => {
  assert.match(artifactPath, /^\/catalog\/synthesis\//u);
  assert.ok(!artifactPath.includes(".."), artifactPath);
  assert.ok(!artifactPath.includes("\\"), artifactPath);
  return new URL(`../public${artifactPath}`, import.meta.url);
};

const forbiddenPublicReactionKeys = new Set([
  "proto",
  "StringWithMarkup",
  "abstractText",
  "reactionCandidates",
  "candidateKind",
  "candidateState",
  "decodeState",
  "inputs",
  "products",
  "reactionClass",
  "bondChanges",
  "provenance",
  "limitations",
  "workups",
  "workupsList",
  "conditions",
  "amount",
  "yield",
  "procedure",
  "operationalDetailsIncluded",
]);

const findForbiddenKeys = (value, path = "$") => {
  const violations = [];
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      violations.push(...findForbiddenKeys(child, `${path}[${index}]`));
    });
    return violations;
  }
  if (!value || typeof value !== "object") return violations;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (forbiddenPublicReactionKeys.has(key)) violations.push(childPath);
    violations.push(...findForbiddenKeys(child, childPath));
  }
  return violations;
};

test("generated synthesis snapshot remains validator-clean at the audited release counts", async () => {
  const summary = await validateGeneratedSynthesisSnapshot();
  assert.deepEqual(summary, {
    catalogSnapshotId: "drugcentral-fda-pubchem-eligible-2026-08-22",
    coverageRecords: 1_552,
    evidenceRecords: 0,
    privateRouteAggregateCount: 6,
    publicAlphaDraftRoutes: 2_645,
    publicAlphaDraftGraphs: 639,
    shardCount: 25,
    warningCount: 0,
    errorCount: 0,
  });

  const validation = await readJson("reports/validation.json");
  assert.equal(validation.issueCount, 0);
  assert.equal(validation.warningCount, 0);
  assert.equal(validation.errorCount, 0);
  assert.equal(validation.issueDetailsPublished, false);
  assert.ok(!("issues" in validation));
});

test("coverage report preserves the exact 1,552-record evidence-boundary headline", async () => {
  const report = await readJson("reports/coverage.json");

  assert.deepEqual(report.coverage, {
    requiredRecords: 1_552,
    coverageRecords: 1_552,
    exactCoverageComplete: true,
    assessed: 1_552,
    searching: 0,
  });
  assert.deepEqual(report.requestedOutcomes, {
    moleculesWithDirectReportedRoute: 3,
    moleculesWithCandidateSource: 1_168,
    moleculesWithTeachingReconstruction: 1,
    moleculesWithNoSourceFoundInRecordedScope: 384,
    moleculesWithComputationalProposal: 0,
    reportedSynthesisNotResolved: 1_549,
  });
  assert.deepEqual(report.evidenceBoundaryMetrics, {
    activePostTerminalizationOrdCandidateEvidenceRecords: 733,
    activePostTerminalizationOrdCandidateEvidenceDefinition:
      "Coverage records retaining at least one active open-reaction-dataset candidate association after terminal outcome classification and supersession.",
    exactOrdProductCandidatesAreNotReportedRoutes: true,
    resolvedDirectEvidenceRecords: 3,
    candidateEvidenceRecords: 1_168,
    sourceEvidenceCounts: {
      candidate: 14_897,
      resolved: 6,
    },
    sourceKindCounts: {
      aggregator: 667,
      journal: 4_099,
      open_reaction_dataset: 3_982,
      patent: 6_155,
    },
  });
  assert.deepEqual(report.normalizedCandidateExtraction, {
    rawBaselineRecordsWithExactOrdReactionFragment: 763,
    rawBaselineDefinition:
      "Coverage records with at least one exact-target ORD reaction fragment in the immutable extraction baseline, before candidate-association terminalization and supersession.",
    exactOrdReactionFragmentCount: 3_982,
    decodedFragmentCount: 3_982,
    upstreamGapFragmentCount: 0,
    unclassifiedReactionCount: 3_982,
    atomMappedFragmentCount: 0,
    promotedToCanonicalRouteCount: 0,
    operationalParticipantDetailsPublished: false,
    boundary:
      "Normalized ORD reaction fragments remain private discovery candidates until direct-source resolution, applicability review, atom mapping and reuse gates pass.",
  });
  assert.deepEqual(report.routes, {
    scope: "private_pending_aggregate",
    privateRouteAggregateCount: 6,
    byType: {
      patent_reported: 5,
      literature_reported: 0,
      teaching_reconstruction: 1,
      computational_proposed: 0,
    },
    byCompleteness: {
      complete: 2,
      partial: 0,
      convergent_partial: 1,
      upstream_gap: 3,
      unknown: 0,
    },
    byReviewState: {
      pending: 6,
      reviewed: 0,
      verified: 0,
      withdrawn: 0,
    },
    publicDetailAllowed: 0,
    routeDetailRecordsPublished: false,
  });
  assert.deepEqual(report.bestAvailableCoverage, {
    candidate_sources_only: 1_165,
    none_found_in_scope: 384,
    reported_route_pending_or_better: 3,
  });
  assert.equal(report.providerAttempts.totalQueries, 9_312);
});

test("public synthesis shards and route artifacts exclude raw reaction data and internal candidate envelopes", async () => {
  const manifest = await readJson("manifest.json");
  assert.equal(manifest.recordCount, 1_552);
  assert.equal(manifest.sourceEvidenceCount, 0);
  assert.equal(manifest.routeCount, 0);
  assert.equal(manifest.privateRouteAggregateCount, 6);
  assert.equal(manifest.shardCount, 25);
  assert.equal(manifest.shards.length, 25);
  assert.equal(manifest.routes.publishedDetailCount, 0);
  assert.equal(manifest.routes.withheldDetailCount, 6);
  assert.deepEqual(manifest.routes.details, []);
  assert.equal(manifest.drafts.channel, "public_alpha_source_supported_draft");
  assert.equal(manifest.drafts.publishedDraftCount, 2_645);
  assert.equal(manifest.drafts.routeGraphCount, 639);
  assert.equal(manifest.drafts.reviewedRouteCount, 0);
  assert.equal(manifest.drafts.details.length, 639);

  const publicRecords = [];
  for (const descriptor of manifest.shards) {
    const shard = JSON.parse(await readFile(localArtifactUrl(descriptor.path), "utf8"));
    publicRecords.push(...shard.records);
  }
  assert.equal(publicRecords.length, 1_552);
  assert.ok(publicRecords.every((record) => record.applicability === "unclear"));
  assert.ok(publicRecords.every((record) => record.routes.length === 0));
  assert.equal(publicRecords.filter((record) => record.publicAlphaDrafts.length > 0).length, 639);
  assert.equal(
    publicRecords.flatMap((record) => record.publicAlphaDrafts).reduce(
      (sum, draft) => sum + draft.draftRouteCount,
      0,
    ),
    2_645,
  );
  assert.ok(publicRecords.every((record) => record.sourceEvidenceIds.length === 0));
  assert.ok(publicRecords.every((record) => record.evidenceDetailsRedacted === true));
  assert.ok(publicRecords.every((record) =>
    typeof record.reportedRouteFoundPendingReview === "boolean"
  ));

  for (const descriptor of manifest.shards) {
    const shard = JSON.parse(await readFile(localArtifactUrl(descriptor.path), "utf8"));
    assert.deepEqual(shard.sourceEvidence, []);
    assert.deepEqual(shard.discovery, []);
  }

  const descriptors = [
    ...manifest.shards,
    manifest.routes.index,
    ...manifest.routes.details,
  ];
  for (const descriptor of descriptors) {
    const artifact = JSON.parse(await readFile(localArtifactUrl(descriptor.path), "utf8"));
    assert.deepEqual(
      findForbiddenKeys(artifact),
      [],
      `${descriptor.path} contains a raw/operational key or internal candidate envelope`,
    );
  }

  const routeIndex = await readJson("routes/index.json");
  assert.deepEqual(routeIndex.routes, []);

  const draftIndex = await readJson("drafts/index.json");
  assert.equal(draftIndex.channel, "public_alpha_source_supported_draft");
  assert.equal(draftIndex.graphs.length, 639);
  assert.equal(draftIndex.graphs.reduce((sum, graph) => sum + graph.draftRouteCount, 0), 2_645);
});

test("public-alpha assembly reports exact route, graph, bridge, and review boundaries", async () => {
  const report = await readJson("reports/route-assembly.json");
  assert.equal(report.directSourceSegmentsExamined, 2_645);
  assert.equal(report.directSourceSegmentsAdmitted, 2_645);
  assert.equal(report.directSourceSegmentsRejected, 0);
  assert.equal(report.sourceLocatorCandidateDocumentsExamined, 1_720);
  assert.equal(report.sourceLocatorCandidateDocumentsPromotedToSteps, 0);
  assert.equal(report.accessibleFullTextDocumentsPreviouslyInspected, 4_644);
  assert.equal(report.publicDraftRoutes, 2_645);
  assert.equal(report.partialRoutes, 2_645);
  assert.equal(report.routeGraphs, 639);
  assert.equal(report.extractedSteps, 2_645);
  assert.equal(report.resolvedIntermediates, 73);
  assert.equal(report.exactTeachingBridgeCount, 3_033);
  assert.equal(report.unresolvedGaps, 2_645);
  assert.equal(report.teachingReconstructions, 231);
  assert.equal(report.reviewedRoutes, 0);
  assert.deepEqual(report.coverageSurfaceCounts, {
    public_draft_partial: 639,
    candidate_only: 529,
    no_supporting_source_resolved: 384,
  });
  assert.deepEqual(report.byCompleteness, {
    partial: 0,
    upstream_gap: 2_587,
    convergent_partial: 58,
  });
  assert.deepEqual(report.invariants, {
    noNewDiscoveryPerformed: true,
    everyPublishedStepHasExactTargetAssociation: true,
    everyPublishedStepHasExactLocator: true,
    everyPublishedStructureIsIndependentRedrawInput: true,
    operationalDetailsPublished: false,
    pendingDisplayedAsReviewedOrVerified: false,
  });
});

test("terminalization reports prove complete independent dimensions and the stereo collision guard", async () => {
  const manifest = await readJson("manifest.json");
  assert.equal(manifest.extraction.candidateAssociationCount, 14_897);
  assert.equal(manifest.extraction.terminalAssociationCount, 14_897);
  assert.equal(manifest.extraction.unresolvedFinalCount, 0);
  assert.equal(manifest.extraction.currentJournalFallbackIdentityCount, 0);
  assert.deepEqual({
    direct: manifest.extraction.directSegmentCandidateCount,
    insufficient: manifest.extraction.insufficientOrdReactantIdentityCount,
    nonCovalent: manifest.extraction.nonCovalentOrdTerminalCount,
    parseError: manifest.extraction.ordParseErrorCount,
  }, {
    direct: 2_645,
    insufficient: 919,
    nonCovalent: 418,
    parseError: 0,
  });

  const terminal = await readJson("reports/candidate-terminalization.json");
  assert.equal(
    Object.values(terminal.byExtractionOutcome).reduce((sum, count) => sum + count, 0),
    14_897,
  );
  assert.equal(
    Object.values(terminal.byAccessState).reduce((sum, count) => sum + count, 0),
    14_897,
  );

  const journal = await readJson("reports/journal-identity-audit.json");
  assert.equal(journal.legacyFallbackIdentityCount, 1_654);
  assert.equal(journal.currentActiveFallbackIdentityCount, 0);
  assert.deepEqual(journal.fallbackTerminalOutcomes, { superseded: 1_654 });
  assert.ok(journal.normalizedNameIdentityCollisionCount > 0);
  assert.ok(journal.normalizedNameIdentityCollisionKeyCount > 0);
  assert.equal(journal.representativeStereoCollisionGuardPassed, true);
});

test("access observation and molecule outcome remain independent terminal dimensions", () => {
  const evidence = { sourceKind: "journal", documentId: "doi:10.1000/example" };
  const blockedAudit = { status: "access_blocked" };
  assert.equal(
    deriveSynthesisEvidenceAccessState(evidence, blockedAudit),
    "access_blocked",
  );

  const outcomeCounts = {
    resolved: 0,
    irrelevant: 1,
    identity_mismatch: 0,
    access_blocked: 0,
    insufficient_detail: 0,
    parse_error: 0,
    retryable_error: 0,
    duplicate: 0,
    superseded: 0,
  };
  const summary = {
    extractionOutcomeCounts: outcomeCounts,
    accessBlockedCount: 1,
  };
  assert.equal(
    selectSynthesisMoleculeBestOutcome({ routes: [] }, summary),
    "access_blocked_only",
  );
  assert.equal(
    selectSynthesisMoleculeBestOutcome({ routes: [] }, {
      ...summary,
      extractionOutcomeCounts: { ...outcomeCounts, insufficient_detail: 1 },
    }),
    "candidate_only",
  );
});
