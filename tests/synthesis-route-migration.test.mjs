import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

import {
  makeSyntheticPrivateMigrationInput,
} from "./fixtures/synthetic-synthesis-migration-fixture.mjs";

const {
  LEGACY_SYNTHESIS_ROUTE_COUNT,
  migrateLegacySynthesisRoutes,
} = await tsImport(
  "../scripts/synthesis/migrate-legacy-routes.mts",
  import.meta.url,
);
const { validateCanonicalSynthesisRoute } = await tsImport(
  "../lib/domain/synthesis-validation.ts",
  import.meta.url,
);

const cloneInput = () => structuredClone(makeSyntheticPrivateMigrationInput());

test("public migration fails closed when private canonical input is absent", async () => {
  assert.equal(LEGACY_SYNTHESIS_ROUTE_COUNT, 6);
  await assert.rejects(
    migrateLegacySynthesisRoutes(),
    /Private synthesis migration input is required/u,
  );
});

test("private migration re-derives the accepted six-route aggregate and runs canonical validation", async () => {
  const input = cloneInput();
  const result = await migrateLegacySynthesisRoutes({ privateInput: input });

  assert.notStrictEqual(result.migrationReport, input.migrationReport);
  assert.deepEqual(result.migrationReport, input.migrationReport);
  assert.equal(result.routes.length, 6);
  assert.equal(result.evidence.length, 6);
  assert.deepEqual(result.migrationReport.routeTypeCounts, {
    patent_reported: 5,
    literature_reported: 0,
    teaching_reconstruction: 1,
    computational_proposed: 0,
  });
  assert.deepEqual(result.migrationReport.routeCompletenessCounts, {
    complete: 2,
    partial: 0,
    upstream_gap: 3,
    convergent_partial: 1,
    unknown: 0,
  });
  assert.deepEqual(result.migrationReport.reviewStateCounts, {
    pending: 6,
    reviewed: 0,
    verified: 0,
    withdrawn: 0,
  });
  assert.deepEqual(result.migrationReport.licenseStateCounts, {
    permitted: 0,
    attribution_required: 0,
    link_only: 6,
    restricted: 0,
    mixed: 0,
    unknown: 0,
  });
  assert.deepEqual(result.migrationReport.evidenceSourceKindCounts, {
    patent: 6,
    journal: 0,
    aggregator: 0,
    open_reaction_dataset: 0,
  });
  assert.equal(result.migrationReport.patentFamilyCount, 6);
  assert.equal(result.migrationReport.excludedSourceContextStepCount, 3);
  assert.equal(result.migrationReport.excludedTargetFormStepCount, 1);
  assert.deepEqual(result.migrationReport.invariants, {
    allSixLegacyRoutesAccounted: true,
    exactCidAndInchiKeyJoin: true,
    operationalDetailsIncluded: false,
  });

  for (const route of result.routes) {
    assert.deepEqual(
      validateCanonicalSynthesisRoute(route, result.evidence),
      [],
      route.id,
    );
  }
});

test("caller-reported route type counts cannot override the derived route aggregate", async () => {
  const input = cloneInput();
  input.migrationReport.routeTypeCounts.patent_reported = 4;
  input.migrationReport.routeTypeCounts.literature_reported = 1;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /attestation does not match the derived payload/u,
  );
});

test("legacy exclusions must be enumerated and still match the accepted disposition counts", async () => {
  const input = cloneInput();
  const disposition = input.legacyAudit[0].stepDispositions.find(
    (item) => item.disposition === "excluded",
  );
  disposition.exclusionReason = "outside_exact_target_path";
  input.migrationReport.excludedTargetFormStepCount = 0;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /does not match the accepted six-route aggregate/u,
  );
});

test("migration requires exactly six unique, fully associated evidence records", async () => {
  const input = cloneInput();
  input.evidence.pop();
  input.migrationReport.evidenceCount = 5;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /exactly six unique evidence records/u,
  );
});

test("exact CID and InChIKey join is derived from the audit, route and target material", async () => {
  const input = cloneInput();
  input.legacyAudit[0].legacyTargetIdentity.pubChemCid += 1;
  input.migrationReport.invariants.exactCidAndInchiKeyJoin = false;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /does not match the accepted six-route aggregate/u,
  );
});

test("review state distribution is derived and fixed to six pending routes", async () => {
  const input = cloneInput();
  const route = input.routes[0];
  route.reviewState = "withdrawn";
  route.reviewEvents = [{
    reviewerId: "synthetic-test-only-reviewer",
    reviewerName: "Synthetic test-only reviewer",
    role: "chemistry_reviewer",
    routeVersion: route.version,
    scopes: ["identity", "route"],
    decision: "withdraw",
    reviewedAt: "2026-01-03T00:00:00.000Z",
  }];
  input.migrationReport.reviewStateCounts.pending = 5;
  input.migrationReport.reviewStateCounts.withdrawn = 1;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /does not match the accepted six-route aggregate/u,
  );
});

test("route and evidence licensing cannot drift from the six link-only boundary", async () => {
  const routeInput = cloneInput();
  routeInput.routes[0].licenseState = "unknown";
  routeInput.migrationReport.licenseStateCounts.link_only = 5;
  routeInput.migrationReport.licenseStateCounts.unknown = 1;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: routeInput }),
    /does not match the accepted six-route aggregate/u,
  );

  const evidenceInput = cloneInput();
  evidenceInput.evidence[0].licenseState = "unknown";
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: evidenceInput }),
    /six unique patent-family, link-only evidence records/u,
  );
});

test("completeness distribution is derived and fixed to 2 complete, 3 upstream-gap and 1 convergent-partial", async () => {
  const input = cloneInput();
  const route = input.routes[0];
  route.routeCompleteness = "upstream_gap";
  route.reportedCompleteRouteSourceIds = [];
  route.gaps = [{
    positionAfterStepId: null,
    kind: "upstream_precursor",
    description: "Synthetic test-only tamper gap.",
  }];
  input.migrationReport.routeCompletenessCounts.complete = 1;
  input.migrationReport.routeCompletenessCounts.upstream_gap = 4;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /does not match the accepted six-route aggregate/u,
  );
});

test("caller invariant booleans are checked rather than trusted", async () => {
  const input = cloneInput();
  input.migrationReport.invariants.allSixLegacyRoutesAccounted = false;
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /attestation does not match the derived payload/u,
  );
});

test("canonical route validation remains a final fail-closed gate", async () => {
  const input = cloneInput();
  input.routes[0].title = "";
  await assert.rejects(
    migrateLegacySynthesisRoutes({ privateInput: input }),
    /failed canonical validation/u,
  );
});
