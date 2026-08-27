import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  getBasicRecordSynthesisSurfaceState,
  loadBasicRecordSynthesisCoverage,
  loadBasicRecordSynthesisRouteComparisons,
} = await tsImport(
  "../lib/application/basic-record-synthesis-coverage.ts",
  import.meta.url,
);
const {
  getBasicRecordSynthesisCoverageStatus,
  resolveMolecularRecordRoute,
} = await tsImport(
  "../lib/application/basic-molecular-record.ts",
  import.meta.url,
);
const {
  getIndexedCatalogStableSlug,
} = await tsImport("../lib/application/catalog-expansion.ts", import.meta.url);

const identity = {
  catalogEntityId: "molecule:example",
  catalogSnapshotId: "catalog-snapshot-v1",
  pubChemCid: 123,
  inchiKey: "ABCDEFGHIJKLMN-ABCDEFGHIJ-A",
};

const createCoverageRecord = (overrides = {}) => ({
  schemaVersion: 1,
  id: "synthesis-coverage:molecule-example",
  catalogSnapshotId: "catalog-snapshot-v1",
  identityScope: {
    catalogEntityId: identity.catalogEntityId,
    pubChemCid: identity.pubChemCid,
    inchiKey: identity.inchiKey,
    chemicalForm: { normalizedKind: "free_parent" },
    stereoisomer: { specified: false },
  },
  assessmentState: "assessed",
  sourceEvidenceState: "candidate_sources",
  applicability: "unclear",
  reviewState: "pending",
  licenseState: "mixed",
  sourceSearchScope: {
    pipelineVersion: "synthesis-discovery-1.0.0",
    startedAt: "2026-08-27T10:00:00.000Z",
    completedAt: "2026-08-27T10:05:00.000Z",
    aliasesQueried: ["Example", "Example free base"],
    providers: [
      {
        provider: "journal",
        adapterId: "europe-pmc",
        status: "completed",
        queryCount: 1,
        candidateCount: 2,
        searchedAt: "2026-08-27T10:00:00.000Z",
        errors: [],
      },
    ],
    exhaustiveInternetSearch: false,
  },
  sourceEvidenceIds: ["synthesis-source-evidence:one"],
  routes: [],
  unresolvedReasons: ["Reported synthesis: Not resolved"],
  ...overrides,
});

const jsonResponse = (value, status = 200) => new Response(
  JSON.stringify(value),
  { status, headers: { "Content-Type": "application/json" } },
);

const patentRouteReference = {
  routeId: "synthesis-route:synthetic-test-only-future-patent-route",
  routeType: "patent_reported",
  routeCompleteness: "complete",
  reviewState: "reviewed",
  licenseState: "attribution_required",
};

const literatureRouteReference = {
  routeId: "synthesis-route:synthetic-test-only-future-literature-route",
  routeType: "literature_reported",
  routeCompleteness: "upstream_gap",
  reviewState: "reviewed",
  licenseState: "permitted",
};

const routeIndex = (routes) => ({
  schemaVersion: 1,
  generatedAt: "2026-08-27T11:00:00.000Z",
  routes,
});

const comparisonReadyRoute = (reference, overrides = {}) => ({
  routeId: reference.routeId,
  routeType: reference.routeType,
  routeCompleteness: reference.routeCompleteness,
  reviewState: reference.reviewState,
  publicationState: "reported_route",
  numberOfSteps: 2,
  startingMaterials: ["Resolved starting material"],
  startBoundary: "Explicit reported start boundary",
  stereochemicalStrategy: "No stereogenic centre introduced in the compared segment.",
  keyTransformations: ["Substitution", "Cyclization"],
  sourceYear: 2024,
  blockerCodes: [],
  detailPath: "/catalog/synthesis/routes/future.json",
  ...overrides,
});

test("synthesis coverage client loads only the exact safe InChIKey shard and projects review-safe fields", async () => {
  const requested = [];
  const coverage = await loadBasicRecordSynthesisCoverage(identity, {
    assetBasePath: "/dev-molecules/",
    async fetchImpl(url, init) {
      requested.push({ url, init });
      return jsonResponse({
        schemaVersion: 1,
        catalogSnapshotId: "catalog-snapshot-v1",
        shardKey: "a",
        records: [createCoverageRecord()],
      });
    },
  });

  assert.equal(requested.length, 1);
  assert.equal(requested[0].url, "/dev-molecules/catalog/synthesis/shards/a.json");
  assert.equal(requested[0].init.headers.Accept, "application/json");
  assert.equal(coverage.coverageId, "synthesis-coverage:molecule-example");
  assert.equal(coverage.sourceEvidenceState, "candidate_sources");
  assert.equal(coverage.exhaustiveInternetSearch, false);
  assert.equal(coverage.reportedRouteFoundPendingReview, false);
  assert.equal(coverage.providers[0].candidateCount, 2);
  assert.equal(coverage.providers[0].errorCount, 0);
  assert.deepEqual(coverage.routeComparison, {
    state: "not_applicable",
    routes: [],
  });
  assert.deepEqual(coverage.aliasesQueried, ["Example", "Example free base"]);
  assert.equal("conditions" in coverage, false);
  assert.equal("steps" in coverage, false);
});

test("safe pending-route flag is projected without exposing route identity or completeness", async () => {
  const coverage = await loadBasicRecordSynthesisCoverage(identity, {
    async fetchImpl() {
      return jsonResponse({
        schemaVersion: 1,
        catalogSnapshotId: "catalog-snapshot-v1",
        shardKey: "a",
        records: [createCoverageRecord({ reportedRouteFoundPendingReview: true })],
      });
    },
  });
  assert.equal(coverage.reportedRouteFoundPendingReview, true);
  assert.deepEqual(coverage.routes, []);
  assert.equal(getBasicRecordSynthesisSurfaceState(coverage), "direct_source_gated");
  assert.equal("reportedRouteId" in coverage, false);
  assert.equal("reportedRouteCompleteness" in coverage, false);
});

test("access state and extraction outcome remain independent terminal dimensions", async () => {
  const evidenceProcessing = {
    pipelineVersion: "synthesis-discovery-2.0.0",
    completedAt: "2026-08-27T12:00:00.000Z",
    candidateAssociationCount: 3,
    terminalAssociationCount: 3,
    accessBlockedCount: 2,
    accessibleCount: 0,
    metadataOnlyCount: 1,
    unavailableCount: 0,
    extractionOutcomeCounts: {
      resolved: 0,
      irrelevant: 2,
      identity_mismatch: 0,
      access_blocked: 0,
      insufficient_detail: 0,
      parse_error: 0,
      retryable_error: 0,
      duplicate: 0,
      superseded: 1,
    },
  };
  const record = createCoverageRecord({
    bestOutcome: "no_supporting_source_resolved",
    evidenceProcessing,
    sourceEvidenceIds: [],
    sourceEvidenceState: "none_found",
    sourceSearchScope: {
      ...createCoverageRecord().sourceSearchScope,
      pipelineVersion: "synthesis-discovery-2.0.0",
    },
  });
  const coverage = await loadBasicRecordSynthesisCoverage(identity, {
    async fetchImpl() {
      return jsonResponse({
        schemaVersion: 1,
        catalogSnapshotId: "catalog-snapshot-v1",
        shardKey: "a",
        records: [record],
      });
    },
  });
  assert.equal(coverage.bestOutcome, "no_supporting_source_resolved");
  assert.equal(coverage.evidenceProcessing.accessBlockedCount, 2);
  assert.equal(coverage.evidenceProcessing.extractionOutcomeCounts.access_blocked, 0);
  assert.equal(getBasicRecordSynthesisSurfaceState(coverage), "no_supporting_source_resolved");
});

test("terminal evidence-processing summaries expose nuanced molecule states and reject unresolved work", async () => {
  const evidenceProcessing = {
    pipelineVersion: "synthesis-discovery-2.0.0",
    completedAt: "2026-08-27T12:00:00.000Z",
    candidateAssociationCount: 5,
    terminalAssociationCount: 5,
    accessBlockedCount: 1,
    accessibleCount: 2,
    metadataOnlyCount: 1,
    unavailableCount: 1,
    extractionOutcomeCounts: {
      resolved: 1,
      irrelevant: 1,
      identity_mismatch: 0,
      access_blocked: 1,
      insufficient_detail: 1,
      parse_error: 0,
      retryable_error: 1,
      duplicate: 0,
      superseded: 0,
    },
  };
  const record = createCoverageRecord({
    bestOutcome: "candidate_only",
    evidenceProcessing,
    sourceSearchScope: {
      ...createCoverageRecord().sourceSearchScope,
      pipelineVersion: "synthesis-discovery-2.0.0",
    },
  });
  const coverage = await loadBasicRecordSynthesisCoverage(identity, {
    async fetchImpl() {
      return jsonResponse({
        schemaVersion: 1,
        catalogSnapshotId: "catalog-snapshot-v1",
        shardKey: "a",
        records: [record],
      });
    },
  });
  assert.equal(coverage.bestOutcome, "candidate_only");
  assert.equal(coverage.evidenceProcessing.terminalAssociationCount, 5);
  assert.equal(getBasicRecordSynthesisSurfaceState(coverage), "candidate_extraction_complete");
  assert.equal(getBasicRecordSynthesisSurfaceState({
    ...coverage,
    bestOutcome: "access_blocked_only",
  }), "source_access_blocked");
  assert.equal(getBasicRecordSynthesisSurfaceState({
    ...coverage,
    bestOutcome: "direct_complete_reported",
    sourceEvidenceState: "direct_source_resolved",
    routes: [],
  }), "direct_source_gated");
  assert.equal(getBasicRecordSynthesisSurfaceState({
    ...coverage,
    bestOutcome: "candidate_only",
    sourceEvidenceState: "direct_source_resolved",
    routes: [],
  }), "direct_source_gated");
  assert.equal(getBasicRecordSynthesisSurfaceState({
    ...coverage,
    bestOutcome: "no_supporting_source_resolved",
  }), "no_supporting_source_resolved");

  await assert.rejects(
    loadBasicRecordSynthesisCoverage(identity, {
      async fetchImpl() {
        return jsonResponse({
          schemaVersion: 1,
          catalogSnapshotId: "catalog-snapshot-v1",
          shardKey: "a",
          records: [{
            ...record,
            evidenceProcessing: {
              ...evidenceProcessing,
              terminalAssociationCount: 4,
            },
          }],
        });
      },
    }),
    /not terminal or internally consistent/u,
  );
});

test("route comparison loader joins only two exact comparison-ready route IDs", async () => {
  const requested = [];
  const comparisons = await loadBasicRecordSynthesisRouteComparisons(
    [patentRouteReference, literatureRouteReference],
    {
      assetBasePath: "/dev-molecules/",
      async fetchImpl(url) {
        requested.push(url);
        return jsonResponse(routeIndex([
          comparisonReadyRoute(patentRouteReference),
          comparisonReadyRoute(literatureRouteReference, {
            numberOfSteps: 3,
            startingMaterials: ["Chiral precursor", "Coupling partner"],
            stereochemicalStrategy: "Stereochemistry retained from a resolved chiral precursor.",
            keyTransformations: ["Protection", "Cross-coupling", "Deprotection"],
            sourceYear: 2025,
          }),
          { routeId: "synthesis-route:synthetic-test-only-unreferenced-row", malformed: true },
        ]));
      },
    },
  );

  assert.deepEqual(requested, ["/dev-molecules/catalog/synthesis/routes/index.json"]);
  assert.equal(comparisons.state, "available");
  assert.deepEqual(comparisons.routes.map((route) => route.routeId), [
    patentRouteReference.routeId,
    literatureRouteReference.routeId,
  ]);
  assert.deepEqual(comparisons.routes[1], {
    routeId: literatureRouteReference.routeId,
    routeType: "literature_reported",
    routeCompleteness: "upstream_gap",
    reviewState: "reviewed",
    publicationState: "reported_route",
    comparisonAvailability: "available",
    numberOfSteps: 3,
    startingMaterials: ["Chiral precursor", "Coupling partner"],
    stereochemicalStrategy: "Stereochemistry retained from a resolved chiral precursor.",
    keyTransformations: ["Protection", "Cross-coupling", "Deprotection"],
    sourceYear: 2025,
  });
});

test("current withheld route-summary shape remains redacted and comparison-gated", async () => {
  const comparisons = await loadBasicRecordSynthesisRouteComparisons(
    [patentRouteReference],
    {
      async fetchImpl() {
        return jsonResponse(routeIndex([{
          routeId: patentRouteReference.routeId,
          routeType: patentRouteReference.routeType,
          routeCompleteness: patentRouteReference.routeCompleteness,
          reviewState: patentRouteReference.reviewState,
          publicationState: "withheld",
          numberOfSteps: null,
          startingMaterials: [],
          startBoundary: null,
          stereochemicalStrategy: null,
          keyTransformations: [],
          sourceYear: null,
          blockerCodes: ["synthesis-route-review-gate"],
          detailPath: null,
        }]));
      },
    },
  );

  assert.equal(comparisons.state, "withheld");
  assert.deepEqual(comparisons.routes[0], {
    routeId: patentRouteReference.routeId,
    routeType: "patent_reported",
    routeCompleteness: "complete",
    reviewState: "reviewed",
    publicationState: "withheld",
    comparisonAvailability: "withheld",
    numberOfSteps: null,
    startingMaterials: [],
    stereochemicalStrategy: null,
    keyTransformations: [],
    sourceYear: null,
  });
});

test("mismatched or malformed route comparison rows fail closed", async () => {
  await assert.rejects(
    loadBasicRecordSynthesisRouteComparisons([patentRouteReference], {
      async fetchImpl() {
        return jsonResponse(routeIndex([
          comparisonReadyRoute(patentRouteReference, {
            routeType: "literature_reported",
          }),
        ]));
      },
    }),
    /conflicts with its exact coverage reference/u,
  );

  await assert.rejects(
    loadBasicRecordSynthesisRouteComparisons([patentRouteReference], {
      async fetchImpl() {
        return jsonResponse(routeIndex([
          comparisonReadyRoute(patentRouteReference, {
            numberOfSteps: 2,
            keyTransformations: ["Only one transformation"],
          }),
        ]));
      },
    }),
    /comparison fields are invalid/u,
  );
});

test("route-index 404 preserves coverage and exposes only unavailable comparison cells", async () => {
  const direct = await loadBasicRecordSynthesisRouteComparisons(
    [patentRouteReference],
    {
      async fetchImpl() {
        return jsonResponse({ error: "not found" }, 404);
      },
    },
  );
  assert.equal(direct.state, "unavailable");
  assert.equal(direct.routes[0].comparisonAvailability, "unavailable");
  assert.equal(direct.routes[0].numberOfSteps, null);

  const requested = [];
  const coverage = await loadBasicRecordSynthesisCoverage(identity, {
    async fetchImpl(url) {
      requested.push(url);
      if (String(url).endsWith("/routes/index.json")) {
        return jsonResponse({ error: "not found" }, 404);
      }
      return jsonResponse({
        schemaVersion: 1,
        catalogSnapshotId: "catalog-snapshot-v1",
        shardKey: "a",
        records: [createCoverageRecord({ routes: [patentRouteReference] })],
      });
    },
  });
  assert.ok(coverage);
  assert.equal(coverage.routes.length, 1);
  assert.equal(coverage.routeComparison.state, "unavailable");
  assert.equal(coverage.routeComparison.routes[0].publicationState, "unavailable");
  assert.deepEqual(requested, [
    "/catalog/synthesis/shards/a.json",
    "/catalog/synthesis/routes/index.json",
  ]);
});

test("synthesis coverage client fails closed on identity drift and degrades cleanly before artifacts exist", async () => {
  await assert.rejects(
    loadBasicRecordSynthesisCoverage(identity, {
      async fetchImpl() {
        return jsonResponse({
          schemaVersion: 1,
          catalogSnapshotId: "catalog-snapshot-v1",
          shardKey: "a",
          records: [createCoverageRecord({
            identityScope: {
              ...createCoverageRecord().identityScope,
              pubChemCid: 999,
            },
          })],
        });
      },
    }),
    /identity does not match/u,
  );

  const absent = await loadBasicRecordSynthesisCoverage(identity, {
    async fetchImpl() {
      return jsonResponse({ error: "not found" }, 404);
    },
  });
  assert.equal(absent, null);
  await assert.rejects(
    loadBasicRecordSynthesisCoverage({ ...identity, inchiKey: "../unsafe" }),
    /invalid molecular identity/u,
  );
});

test("coverage status never upgrades candidates, pending routes, reconstructions, or proposals to available", () => {
  const candidateCoverage = {
    routes: [],
  };
  const pendingReported = {
    routes: [{
      routeType: "patent_reported",
      routeCompleteness: "complete",
      reviewState: "pending",
    }],
  };
  const verifiedTeaching = {
    routes: [{
      routeType: "teaching_reconstruction",
      routeCompleteness: "complete",
      reviewState: "verified",
    }],
  };
  const verifiedReported = {
    routes: [{
      routeType: "literature_reported",
      routeCompleteness: "complete",
      reviewState: "verified",
    }],
  };

  assert.equal(getBasicRecordSynthesisCoverageStatus(null), "unavailable");
  assert.equal(getBasicRecordSynthesisCoverageStatus(candidateCoverage), "partial");
  assert.equal(getBasicRecordSynthesisCoverageStatus(pendingReported), "partial");
  assert.equal(getBasicRecordSynthesisCoverageStatus(verifiedTeaching), "partial");
  assert.equal(getBasicRecordSynthesisCoverageStatus(verifiedReported), "available");
});

test("molecular-record resolution attaches exact synthesis coverage and fails open only to no synthesis claim", async () => {
  const publicCatalog = new URL("../public/catalog/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", publicCatalog), "utf8"));
  const index = JSON.parse(await readFile(new URL("search-index.v1.json", publicCatalog), "utf8"));
  const indexRecord = index.records.find((record) =>
    record.preferredName.toLowerCase() === "sitosterol" ||
    record.aliases.some((alias) => alias.toLowerCase() === "sitosterol"),
  );
  assert.ok(indexRecord);
  const descriptor = manifest.shards.find((item) => item.id === indexRecord.shardIds.find((id) => id.startsWith("alphabetic:")));
  assert.ok(descriptor);
  const shard = JSON.parse(await readFile(new URL(descriptor.path, publicCatalog), "utf8"));
  const entity = shard.records.find((record) => record.id === indexRecord.id);
  assert.ok(entity);
  const hit = {
    id: indexRecord.id,
    stableSlug: getIndexedCatalogStableSlug(indexRecord.id),
    preferredName: indexRecord.preferredName,
    aliases: indexRecord.aliases,
    formula: indexRecord.formula,
    pubChemCid: indexRecord.pubChemCid,
  };
  const summary = {
    coverageId: "synthesis-coverage:sitosterol",
    catalogSnapshotId: "catalog-snapshot-v1",
    pipelineVersion: "synthesis-discovery-1.0.0",
    assessmentState: "assessed",
    sourceEvidenceState: "candidate_sources",
    applicability: "unclear",
    reviewState: "pending",
    licenseState: "mixed",
    searchedAt: "2026-08-27T10:05:00.000Z",
    aliasesQueried: ["sitosterol"],
    providers: [],
    routes: [],
    routeComparison: { state: "not_applicable", routes: [] },
    sourceEvidenceCount: 1,
    unresolvedReasons: ["Reported synthesis: Not resolved"],
    chemicalFormKind: "free_parent",
    stereochemistrySpecified: true,
    exhaustiveInternetSearch: false,
  };
  const navigator = {
    async resolveStableSlug() { return hit; },
    async hydrate() { return entity; },
  };
  const resolution = await resolveMolecularRecordRoute(hit.stableSlug, navigator, {
    curatedRecords: [],
    async descriptorLoader() { return []; },
    async synthesisCoverageLoader(requestIdentity) {
      assert.deepEqual(requestIdentity, {
        catalogEntityId: entity.id,
        catalogSnapshotId: entity.provenance.snapshotId,
        pubChemCid: entity.identity.pubChemCid,
        inchiKey: entity.identity.inchiKey,
      });
      return summary;
    },
  });
  assert.equal(resolution.kind, "basic-molecular-record");
  assert.equal(resolution.record.synthesisCoverage, summary);
  assert.equal(
    resolution.record.coverage.find((item) => item.dimension === "synthesis").status,
    "partial",
  );

  const unavailable = await resolveMolecularRecordRoute(hit.stableSlug, navigator, {
    curatedRecords: [],
    async descriptorLoader() { return []; },
    async synthesisCoverageLoader() { throw new Error("artifact not published"); },
  });
  assert.equal(unavailable.kind, "basic-molecular-record");
  assert.equal(unavailable.record.synthesisCoverage, null);
  assert.equal(
    unavailable.record.coverage.find((item) => item.dimension === "synthesis").status,
    "unavailable",
  );
});

test("Basic Molecular Record UI exposes synthesis status without presenting candidates as verified", async () => {
  const source = await readFile(
    new URL("../components/basic-record/BasicMolecularRecord.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /data-basic-record-synthesis-coverage="true"/u);
  assert.match(source, /data-reported-synthesis-state/u);
  assert.match(source, /Reported synthesis: Not resolved/u);
  assert.match(source, /Candidate sources are discovery leads only/u);
  assert.match(source, /not a verified synthesis route/u);
  assert.match(source, /data-synthesis-route-type/u);
  assert.match(source, /data-synthesis-route-comparison/u);
  assert.match(source, /Multi-route comparison/u);
  assert.match(source, /Number of steps/u);
  assert.match(source, /Starting materials/u);
  assert.match(source, /Stereochemical strategy/u);
  assert.match(source, /Key transformations/u);
  assert.match(source, /Source class \/ year/u);
  assert.match(source, /Candidate-source assessment complete/u);
  assert.match(source, /Source access blocked/u);
  assert.match(source, /No supporting source resolved in the recorded search scope/u);
  assert.match(source, /data-synthesis-terminal-state/u);
  assert.match(source, /getSynthesisAcademyHash\(record\.stableSlug, "atlas"\)/u);
  assert.match(source, /route detail appears only after scientific-review and reuse gates pass/u);
  assert.doesNotMatch(source, /candidate_sources[^\n]{0,120}verified/u);
});

test("Basic Molecular Record keeps a fail-closed Synthesis area when its coverage artifact is unavailable", async () => {
  const source = await readFile(
    new URL("../components/basic-record/BasicMolecularRecord.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /data-basic-record-synthesis-coverage="unavailable"/u);
  assert.match(source, /data-synthesis-surface-state="coverage_unavailable"/u);
  assert.match(source, /data-synthesis-coverage-load-state="unavailable"/u);
  assert.match(source, /Sentez kapsam artefaktı güvenli biçimde yüklenemedi\./u);
  assert.match(source, /kaynak bulunmadığının, rota bulunmadığının/u);
  assert.match(source, /sentezlenebilir ya da sentezlenemez olduğunun kanıtı değildir/u);
  assert.match(source, /The synthesis coverage artifact could not be loaded safely\./u);
  assert.match(source, /not evidence that no source or route exists/u);
  assert.match(source, /does not establish whether the molecule is synthesizable or unsynthesizable/u);
  assert.doesNotMatch(
    source,
    /data-synthesis-coverage-load-state="unavailable"[^]{0,500}Reported synthesis: Not resolved/u,
  );
});
