import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { synthesisChallenges } = await tsImport(
  "../lib/data/synthesis-challenges.ts",
  import.meta.url,
);
const { synthesisStories } = await tsImport(
  "../lib/data/synthesis-stories.ts",
  import.meta.url,
);

test("public source contains no pending route-derived story or challenge", () => {
  assert.deepEqual(synthesisStories, []);
  assert.deepEqual(synthesisChallenges, []);
});
