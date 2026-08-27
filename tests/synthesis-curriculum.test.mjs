import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  buildSynthesisCurriculumReadiness,
  synthesisCurriculumReadiness,
} = await tsImport(
  "../lib/application/synthesis-curriculum.ts",
  import.meta.url,
);

test("public curriculum fails closed with zero route-eligible records", () => {
  const readiness = synthesisCurriculumReadiness;
  assert.equal(readiness.targetDrugCount, 12);
  assert.equal(readiness.configuredDrugCount, 0);
  assert.equal(readiness.availableDrugCount, 0);
  assert.equal(readiness.routeCount, 0);
  assert.equal(readiness.availableRouteCount, 0);
  assert.equal(readiness.transformationCount, 0);
  assert.equal(readiness.availableMechanismCount, 0);
});

test("synthetic test-only empty input preserves the no-public-route boundary", () => {
  const readiness = buildSynthesisCurriculumReadiness([]);
  assert.equal(readiness.configuredDrugCount, 0);
  assert.equal(readiness.routeCount, 0);
  assert.ok(readiness.flagships.every((entry) => entry.routeCount === 0));
});
