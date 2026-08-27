import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  synthesisAtlasRoutes,
  synthesisAtlasRouteById,
  synthesisAtlasRoutesByMoleculeId,
} = await tsImport("../lib/data/synthesis-atlas.ts", import.meta.url);
const { synthesisAtlasChallenges } = await tsImport(
  "../lib/data/synthesis-atlas-challenges.ts",
  import.meta.url,
);

test("legacy canonical source contains no pending route graph or derived challenge", () => {
  assert.deepEqual(synthesisAtlasRoutes, []);
  assert.equal(synthesisAtlasRouteById.size, 0);
  assert.equal(synthesisAtlasRoutesByMoleculeId.size, 0);
  assert.deepEqual(synthesisAtlasChallenges, []);
});
