import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { selectExploreSceneSample } = await tsImport(
  "../lib/application/explore-scene-sample.ts",
  import.meta.url,
);

const candidates = [
  { id: "pain:c", clusterKey: "pain", projectedPosition: { x: 12, y: 15 }, representativeMapStatus: "curated-seed" },
  { id: "heart:c", clusterKey: "heart", projectedPosition: { x: 74, y: 70 }, representativeMapStatus: "curated-seed" },
  { id: "pain:a", clusterKey: "pain", projectedPosition: { x: 18, y: 21 }, representativeMapStatus: "curated-seed" },
  { id: "heart:a", clusterKey: "heart", projectedPosition: { x: 67, y: 64 }, representativeMapStatus: "curated-seed" },
  { id: "pain:b", clusterKey: "pain", projectedPosition: { x: 22, y: 26 }, representativeMapStatus: "curated-seed" },
  { id: "heart:b", clusterKey: "heart", projectedPosition: { x: 78, y: 72 }, representativeMapStatus: "curated-seed" },
];

test("representative sample is deterministic, balanced and independent of source order", () => {
  const first = selectExploreSceneSample({ candidates, limit: 4 });
  const second = selectExploreSceneSample({ candidates: [...candidates].reverse(), limit: 4 });
  assert.deepEqual(first, second);
  assert.equal(first.filter((id) => id.startsWith("pain:")).length, 2);
  assert.equal(first.filter((id) => id.startsWith("heart:")).length, 2);
});

test("required cluster selection remains visible without exceeding the budget", () => {
  const selected = selectExploreSceneSample({
    candidates,
    limit: 3,
    requiredId: "pain:c",
  });
  assert.equal(selected.length, 3);
  assert.ok(selected.includes("pain:c"));
});

test("source-matched unclassified imports never enter or displace the curated seed sample", () => {
  const imported = {
    id: "molecule:imported:abacavir",
    clusterKey: "candidate-records",
    projectedPosition: { x: 50, y: 50 },
    representativeMapStatus: "source-matched-unclassified",
  };
  const selected = selectExploreSceneSample({
    candidates: [imported, ...candidates],
    limit: 4,
    requiredId: imported.id,
  });

  assert.equal(selected.length, 4);
  assert.ok(!selected.includes(imported.id));
  assert.ok(selected.every((id) => !id.startsWith("molecule:imported:")));
});

test("sample policy rejects malformed contracts and does not invent records", () => {
  assert.deepEqual(selectExploreSceneSample({ candidates: [], limit: 8 }), []);
  assert.throws(
    () => selectExploreSceneSample({ candidates, limit: -1 }),
    /non-negative safe integer/,
  );
  assert.throws(
    () => selectExploreSceneSample({
      candidates: [candidates[0], candidates[0]],
      limit: 2,
    }),
    /unique IDs/,
  );
});
