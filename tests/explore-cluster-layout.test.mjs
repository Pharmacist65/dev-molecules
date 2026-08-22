import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { resolveExploreClusterLabelLayout } = await tsImport(
  "../lib/application/explore-cluster-layout.ts",
  import.meta.url,
);

const collides = (left, right, horizontal = 20, vertical = 11) =>
  Math.abs(left.x - right.x) < horizontal && Math.abs(left.y - right.y) < vertical;

test("cluster label layout separates overlapping anchors without leaving the scene", () => {
  const anchors = [
    { id: "a", x: 50, y: 50 },
    { id: "b", x: 51, y: 50 },
    { id: "c", x: 49, y: 51 },
    { id: "d", x: 50, y: 49 },
    { id: "e", x: 52, y: 51 },
  ];
  const placed = resolveExploreClusterLabelLayout(anchors, 16 / 9);
  assert.equal(placed.length, anchors.length);
  for (let left = 0; left < placed.length; left += 1) {
    assert.ok(placed[left].x >= 6 && placed[left].x <= 94);
    assert.ok(placed[left].y >= 8 && placed[left].y <= 92);
    for (let right = left + 1; right < placed.length; right += 1) {
      assert.equal(collides(placed[left], placed[right]), false);
    }
  }
});

test("cluster label layout is deterministic and preserves caller order", () => {
  const anchors = [
    { id: "z", x: 48, y: 50 },
    { id: "a", x: 50, y: 50 },
    { id: "m", x: 52, y: 50 },
  ];
  const first = resolveExploreClusterLabelLayout(anchors, 2);
  const reordered = resolveExploreClusterLabelLayout([...anchors].reverse(), 2);
  assert.deepEqual(first.map((item) => item.id), anchors.map((item) => item.id));
  assert.deepEqual(
    new Map(first.map((item) => [item.id, { x: item.x, y: item.y }])),
    new Map(reordered.map((item) => [item.id, { x: item.x, y: item.y }])),
  );
});

test("cluster label layout rejects invalid coordinate contracts", () => {
  assert.throws(
    () => resolveExploreClusterLabelLayout([{ id: "x", x: Number.NaN, y: 1 }]),
    /unique IDs and finite coordinates/,
  );
  assert.throws(
    () => resolveExploreClusterLabelLayout([{ id: "x", x: 1, y: 1 }], 0),
    /positive viewport aspect/,
  );
});
