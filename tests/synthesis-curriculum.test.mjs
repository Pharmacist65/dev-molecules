import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  buildSynthesisCurriculumReadiness,
  canOpenSynthesisCurriculumMolecule,
  resolveSynthesisCurriculumSelection,
  synthesisCurriculumReadiness,
} = await tsImport(
  "../lib/application/synthesis-curriculum.ts",
  import.meta.url,
);
const { synthesisAtlasRoutes } = await tsImport(
  "../lib/data/synthesis-atlas.ts",
  import.meta.url,
);

test("the curriculum reports the current 3-drug evidence reality without filling the 12-drug target", () => {
  const readiness = synthesisCurriculumReadiness;

  assert.equal(readiness.targetDrugCount, 12);
  assert.equal(readiness.configuredDrugCount, 3);
  assert.equal(readiness.availableDrugCount, 3);
  assert.equal(readiness.plannedDrugCount, 9);
  assert.equal(readiness.flagships.length, 12);
  assert.equal(
    readiness.flagships.filter((entry) => entry.status === "curated-route-available").length,
    3,
  );
  assert.equal(
    readiness.flagships.filter((entry) => entry.status === "planned-unconfigured").length,
    9,
  );
  assert.ok(
    readiness.flagships
      .filter((entry) => entry.status === "planned-unconfigured")
      .every((entry) => entry.moleculeId === null && entry.routeCount === 0),
  );
});

test("the snapshot derives six routes, twenty transformations and twelve mechanisms from source data", () => {
  const readiness = synthesisCurriculumReadiness;

  assert.equal(readiness.routeCount, 6);
  assert.equal(readiness.availableRouteCount, 6);
  assert.equal(readiness.teachingRouteCount, 3);
  assert.equal(readiness.reportedRouteCount, 3);
  assert.equal(readiness.transformationCount, 20);
  assert.equal(readiness.mechanismRecordCount, 12);
  assert.equal(readiness.availableMechanismCount, 12);
  assert.deepEqual(readiness.sourceGateCounts, {
    "source-supported": 3,
    "context-supported": 3,
    "partial-with-declared-gap": 0,
    blocked: 0,
  });
});

test("reported status remains fail-closed and does not promote source-context reconstruction", () => {
  const readiness = synthesisCurriculumReadiness;
  const byMolecule = new Map(
    readiness.flagships
      .filter((entry) => entry.moleculeId)
      .map((entry) => [entry.moleculeId, entry]),
  );

  assert.equal(readiness.sourceReportedRouteCount, 2);
  assert.equal(
    byMolecule.get("molecule:propranolol").reportedRoutePresentation,
    "source-context-reconstruction",
  );
  assert.equal(
    byMolecule.get("molecule:atenolol").reportedRoutePresentation,
    "source-reported",
  );
  assert.equal(
    byMolecule.get("molecule:carvedilol").reportedRoutePresentation,
    "source-reported",
  );
});

test("a broken direct-document gate closes the route and prevents curriculum selection", () => {
  const sourceRoute = synthesisAtlasRoutes[0];
  const blockedRoute = {
    ...sourceRoute,
    sourceAnchors: sourceRoute.sourceAnchors.map((anchor) => ({
      ...anchor,
      url: "https://example.test/search?q=unresolved",
    })),
  };
  const readiness = buildSynthesisCurriculumReadiness([blockedRoute]);

  assert.equal(readiness.availableDrugCount, 0);
  assert.equal(readiness.availableRouteCount, 0);
  assert.equal(readiness.availableMechanismCount, 0);
  assert.equal(readiness.flagships[0].status, "blocked-source-gate");
  assert.equal(readiness.flagships[0].routes[0].sourceGate, "blocked");
  assert.deepEqual(resolveSynthesisCurriculumSelection(sourceRoute.moleculeId, readiness), {
    moleculeId: null,
    reason: "none-ready",
  });
  assert.equal(canOpenSynthesisCurriculumMolecule(sourceRoute.moleculeId, readiness), false);
});

test("route selection accepts only an exact source-gated curriculum molecule", () => {
  assert.equal(canOpenSynthesisCurriculumMolecule("molecule:carvedilol"), true);
  assert.equal(canOpenSynthesisCurriculumMolecule("molecule:unknown"), false);
  assert.equal(canOpenSynthesisCurriculumMolecule(undefined), false);
});

test("the twelve-drug milestone is not a schema ceiling", () => {
  const template = synthesisAtlasRoutes[0];
  const futureRoutes = Array.from({ length: 10 }, (_, index) => ({
    ...template,
    id: `synthesis-atlas-route:future-${index + 1}`,
    storyId: `synthesis:future-${index + 1}`,
    moleculeId: `molecule:future-${index + 1}`,
  }));
  const readiness = buildSynthesisCurriculumReadiness([
    ...synthesisAtlasRoutes,
    ...futureRoutes,
  ]);

  assert.equal(readiness.configuredDrugCount, 13);
  assert.equal(readiness.flagships.length, 13);
  assert.equal(readiness.plannedDrugCount, 0);
  assert.equal(
    readiness.flagships.filter((entry) => entry.status === "planned-unconfigured").length,
    0,
  );
});

test("unconnected scientific diversity criteria stay explicitly unmeasured", () => {
  const readiness = synthesisCurriculumReadiness;
  const flagshipCriterion = readiness.criteria.find(
    (criterion) => criterion.id === "flagship-drugs",
  );
  const unmeasured = readiness.criteria.filter(
    (criterion) => criterion.id !== "flagship-drugs",
  );

  assert.deepEqual(
    { current: flagshipCriterion.current, state: flagshipCriterion.state },
    { current: 3, state: "in-progress" },
  );
  assert.ok(
    unmeasured.every(
      (criterion) => criterion.current === null && criterion.state === "unmeasured",
    ),
  );
});
