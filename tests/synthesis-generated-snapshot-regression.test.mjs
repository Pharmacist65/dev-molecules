import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { validateGeneratedSynthesisSnapshot } = await tsImport(
  "../scripts/synthesis/validate-generated-snapshot.mts",
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
    evidenceRecords: 14_903,
    routeRecords: 6,
    shardCount: 25,
    warningCount: 0,
    errorCount: 0,
  });

  const validation = await readJson("reports/validation.json");
  assert.equal(validation.issueCount, 0);
  assert.equal(validation.warningCount, 0);
  assert.equal(validation.errorCount, 0);
  assert.deepEqual(validation.issues, []);
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
    moleculesWithCandidateSource: 1_279,
    moleculesWithTeachingReconstruction: 1,
    moleculesWithNoSourceFoundInRecordedScope: 273,
    moleculesWithComputationalProposal: 0,
    reportedSynthesisNotResolved: 1_549,
  });
  assert.deepEqual(report.evidenceBoundaryMetrics, {
    exactOrdProductCandidateRecords: 763,
    exactOrdProductCandidatesAreNotReportedRoutes: true,
    resolvedDirectEvidenceRecords: 3,
    candidateEvidenceRecords: 1_279,
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
    recordsWithExactOrdReactionFragment: 763,
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
    migratedRouteCount: 6,
    byType: {
      patent_reported: 5,
      teaching_reconstruction: 1,
    },
    byCompleteness: {
      complete: 2,
      convergent_partial: 1,
      upstream_gap: 3,
    },
    byReviewState: {
      pending: 6,
    },
    publicDetailAllowed: 0,
  });
  assert.deepEqual(report.bestAvailableCoverage, {
    candidate_sources_only: 1_276,
    none_found_in_scope: 273,
    reported_route_pending_or_better: 3,
  });
  assert.equal(report.providerAttempts.totalQueries, 9_312);
});

test("public synthesis shards and route artifacts exclude raw reaction data and internal candidate envelopes", async () => {
  const manifest = await readJson("manifest.json");
  assert.equal(manifest.recordCount, 1_552);
  assert.equal(manifest.sourceEvidenceCount, 14_903);
  assert.equal(manifest.routeCount, 6);
  assert.equal(manifest.shardCount, 25);
  assert.equal(manifest.shards.length, 25);
  assert.equal(manifest.routes.publishedDetailCount, 0);
  assert.equal(manifest.routes.withheldDetailCount, 6);
  assert.deepEqual(manifest.routes.details, []);

  const publicRecords = [];
  for (const descriptor of manifest.shards) {
    const shard = JSON.parse(await readFile(localArtifactUrl(descriptor.path), "utf8"));
    publicRecords.push(...shard.records);
  }
  assert.equal(publicRecords.length, 1_552);
  assert.ok(publicRecords.every((record) => record.applicability === "unclear"));
  assert.ok(publicRecords.every((record) => record.routes.length === 0));

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
  assert.equal(routeIndex.routes.length, 6);
  assert.ok(routeIndex.routes.every((route) => route.publicationState === "withheld"));
  assert.ok(routeIndex.routes.every((route) => route.detailPath === null));
  assert.ok(routeIndex.routes.every((route) => !("routeType" in route)));
  assert.ok(routeIndex.routes.every((route) => !("routeCompleteness" in route)));
  assert.ok(routeIndex.routes.every((route) => !("numberOfSteps" in route)));
});
