import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { synthesisStories } = await tsImport(
  "../lib/data/synthesis-stories.ts",
  import.meta.url,
);
const { synthesisSourceRegistry } = await tsImport(
  "../lib/data/synthesis-sources.ts",
  import.meta.url,
);

test("public provenance layer contains no pending route story or source locator", () => {
  assert.deepEqual(synthesisStories, []);
  assert.deepEqual(synthesisSourceRegistry, []);
});
