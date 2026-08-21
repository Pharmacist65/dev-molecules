import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { createCategoricalLensProjection } = await tsImport(
  "../lib/explore/lens-projection.ts",
  import.meta.url,
);

const definition = {
  lensId: "therapeutic",
  projectionId: "projection:test:categorical-v1",
  algorithmVersion: "categorical-layout@1.0.0",
  inputVersion: "fixture:v1",
  generatedAt: "2026-08-21T00:00:00.000Z",
  meaning: "Same categories share a region.",
  doesNotMean: "Distance is not a biological similarity measurement.",
  verificationStatus: "pending-review",
};

const items = [
  { id: "molecule:a", category: "Cardiovascular" },
  { id: "molecule:b", category: "Pain & inflammation" },
  { id: "molecule:c", category: "Cardiovascular" },
];

test("categorical lens projection is deterministic, versioned and explicit about non-meaning", () => {
  const first = createCategoricalLensProjection(definition, items);
  const reordered = createCategoricalLensProjection(definition, [...items].reverse());

  assert.equal(first.algorithm, "curated-categorical-layout");
  assert.equal(first.algorithmVersion, "categorical-layout@1.0.0");
  assert.match(first.inputHash, /^fnv1a32:[0-9a-f]{8}$/);
  assert.equal(first.inputHash, reordered.inputHash);
  assert.deepEqual(first.coordinates, reordered.coordinates);
  assert.equal(Object.keys(first.coordinates).length, items.length);
  assert.match(first.doesNotMean, /not a biological similarity/i);
  assert.equal(first.verificationStatus, "pending-review");
});
test("application consumers do not import the beta-blocker fixture directly", async () => {
  const sources = await Promise.all(
    [
      "../components/platform/DevMoleculesApp.tsx",
      "../components/platform/EvidenceMentor.tsx",
      "../components/platform/InstructorStudio.tsx",
      "../components/platform/MissionStudio.tsx",
      "../components/platform/SynthesisTheatre.tsx",
      "../lib/application/evidence-card.ts",
      "../lib/data/structure-provider.ts",
    ].map((filename) => readFile(new URL(filename, import.meta.url), "utf8")),
  );

  for (const source of sources) {
    assert.doesNotMatch(source, /from\s+["'](?:@\/lib\/data\/|\.\/|\.\.\/)beta-blockers["']/);
    assert.doesNotMatch(source, /betaBlockerProfile/);
  }
});
