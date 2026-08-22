import assert from "node:assert/strict";
import test from "node:test";

import {
  getExploreLodLevel,
  MAX_NEAR_LOD_MOLECULES,
  planExploreScene,
  selectSceneMoleculeIds,
  STRUCTURE_CACHE_LIMIT,
} from "../lib/explore/lod-policy.ts";

const metadata = Array.from({ length: 500 }, (_, index) => ({
  id: `scale-fixture:${String(index + 1).padStart(3, "0")}`,
  clusterId: `cluster:${index % 20}`,
  // Test-only metadata intentionally reuses structure identifiers. It is not a scientific catalog.
  structureAssetId: `structure:test-reused-${index % 4}`,
}));

test("500-record Explore policy stays lazy, bounded and deterministic", () => {
  const allIds = metadata.map(({ id }) => id);
  const far = selectSceneMoleculeIds({ level: "far", candidateIds: allIds });
  const near = selectSceneMoleculeIds({ level: "near", candidateIds: allIds });
  const overRequestedNear = selectSceneMoleculeIds({
    level: "near",
    candidateIds: allIds,
    maxNearMolecules: 500,
  });
  const sameNear = selectSceneMoleculeIds({ level: "near", candidateIds: allIds });
  const clusterCandidates = metadata
    .filter(({ clusterId }) => clusterId === "cluster:3")
    .map(({ id }) => id);
  const cluster = selectSceneMoleculeIds({
    level: "cluster",
    candidateIds: clusterCandidates,
  });
  const focusedMoleculeId = allIds[417];
  const focus = selectSceneMoleculeIds({
    level: "focus",
    candidateIds: allIds,
    focusedMoleculeId,
  });

  assert.equal(metadata.length, 500);
  assert.deepEqual(far, [], "far LOD must not schedule structure asset loads");
  assert.equal(near.length, MAX_NEAR_LOD_MOLECULES);
  assert.ok(near.length <= 40, "near LOD may activate at most 40 structures");
  assert.ok(
    overRequestedNear.length <= 40,
    "the global 40-structure ceiling must survive an oversized caller request",
  );
  assert.deepEqual(near, sameNear, "the same metadata input must select the same structures");
  assert.ok(cluster.length <= 40, "cluster LOD must remain bounded");
  assert.ok(cluster.every((id) => clusterCandidates.includes(id)));
  assert.deepEqual(focus, [focusedMoleculeId], "focus LOD activates exactly one structure");
  assert.equal(STRUCTURE_CACHE_LIMIT, 40, "the structure cache must remain bounded");
});

test("LOD thresholds map Universe far/near, Cluster and Focus explicitly", () => {
  assert.equal(getExploreLodLevel("universe", 1), "far");
  assert.equal(getExploreLodLevel("universe", 1.079), "far");
  assert.equal(getExploreLodLevel("universe", 1.08), "near");
  assert.equal(getExploreLodLevel("cluster", 0.5), "cluster");
  assert.equal(getExploreLodLevel("focus", 0.5), "focus");
});

test("500-record scene plan keeps one context and schedules only bounded assets", () => {
  const far = planExploreScene({ level: "far", molecules: metadata });
  const near = planExploreScene({
    level: "near",
    molecules: metadata,
    maxNearMolecules: 500,
  });
  const cluster = planExploreScene({
    level: "cluster",
    molecules: metadata,
    selectedClusterId: "cluster:3",
  });
  const focusedMoleculeId = metadata[417].id;
  const focus = planExploreScene({
    level: "focus",
    molecules: metadata,
    focusedMoleculeId,
  });

  assert.equal(far.activeWebglContexts, 1);
  assert.deepEqual(far.visibleMoleculeIds, []);
  assert.deepEqual(far.structureAssetIdsToLoad, []);
  assert.equal(near.activeWebglContexts, 1);
  assert.equal(near.visibleMoleculeIds.length, 40);
  assert.ok(near.structureAssetIdsToLoad.length <= 40);
  assert.equal(cluster.activeWebglContexts, 1);
  assert.ok(cluster.visibleMoleculeIds.length <= 40);
  assert.ok(
    cluster.visibleMoleculeIds.every((id) =>
      metadata.some((item) => item.id === id && item.clusterId === "cluster:3"),
    ),
  );
  assert.deepEqual(focus.visibleMoleculeIds, [focusedMoleculeId]);
  assert.equal(focus.structureAssetIdsToLoad.length, 1);
});
