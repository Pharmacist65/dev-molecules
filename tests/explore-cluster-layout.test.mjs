import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { countExploreClusterLabelCollisions, resolveExploreClusterLabelLayout } = await tsImport(
  "../lib/application/explore-cluster-layout.ts",
  import.meta.url,
);

const collides = (left, right, horizontal = 20, vertical = 20) =>
  Math.abs(left.x - right.x) < horizontal && Math.abs(left.y - right.y) < vertical;

const coversAvoidanceZone = (
  label,
  zone,
  labelHalfWidth = 17,
  labelHalfHeight = 10,
) =>
  Math.abs(label.x - zone.x) < labelHalfWidth + (zone.radiusX ?? 6) + 1.5
  && Math.abs(label.y - zone.y) < labelHalfHeight + (zone.radiusY ?? 5) + 1.5;

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
    for (const anchor of anchors) {
      assert.equal(coversAvoidanceZone(placed[left], anchor), false);
    }
    for (let right = left + 1; right < placed.length; right += 1) {
      assert.equal(collides(placed[left], placed[right]), false);
    }
  }
});

test("cluster label layout accepts real projected SDF bounds as keep-out zones", () => {
  const anchors = [
    { id: "cardiovascular", x: 50, y: 50 },
    { id: "neurology", x: 72, y: 34 },
  ];
  const sdfBounds = [
    { id: "molecule:a", x: 26, y: 28, radiusX: 8, radiusY: 10 },
    { id: "molecule:b", x: 50, y: 50, radiusX: 12, radiusY: 9 },
    { id: "molecule:c", x: 76, y: 64, radiusX: 9, radiusY: 8 },
  ];
  const placed = resolveExploreClusterLabelLayout(anchors, 16 / 9, sdfBounds);

  assert.equal(countExploreClusterLabelCollisions(placed, 16 / 9, sdfBounds), 0);

  for (const label of placed) {
    for (const bounds of sdfBounds) {
      assert.equal(coversAvoidanceZone(label, bounds), false);
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

test("narrow cluster label layout reserves the enlarged control footprint", () => {
  const anchors = [
    { id: "a", x: 50, y: 50 },
    { id: "b", x: 51, y: 50 },
    { id: "c", x: 49, y: 51 },
    { id: "d", x: 50, y: 49 },
  ];
  const placed = resolveExploreClusterLabelLayout(anchors, 1);

  assert.equal(countExploreClusterLabelCollisions(placed, 1), 0);
  assert.ok(placed.every(({ x, y }) => x >= 19 && x <= 81 && y >= 10 && y <= 90));
});

test("mobile cluster layout reserves the rendered 132px region control", () => {
  const viewportWidth = 330;
  const viewportHeight = 150;
  const options = {
    minimumLabelWidthPercent: 132 / viewportWidth * 100,
    minimumLabelHeightPercent: 32 / viewportHeight * 100,
  };
  const anchors = [{ id: "candidate-records", x: 50, y: 50 }];
  const sdfBounds = [
    { id: "molecule:bisoprolol", x: 47.5, y: 22.3, radiusX: 5.7, radiusY: 7.8 },
  ];
  const placed = resolveExploreClusterLabelLayout(
    anchors,
    viewportWidth / viewportHeight,
    sdfBounds,
    options,
  );

  assert.equal(
    countExploreClusterLabelCollisions(
      placed,
      viewportWidth / viewportHeight,
      sdfBounds,
      options,
    ),
    0,
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
  assert.throws(
    () => resolveExploreClusterLabelLayout(
      [{ id: "x", x: 1, y: 1 }],
      1,
      [{ id: "molecule:x", x: 20, y: 20, radiusX: -1 }],
    ),
    /avoidance zones require unique IDs, finite coordinates and non-negative radii/,
  );
  assert.throws(
    () => resolveExploreClusterLabelLayout(
      [{ id: "x", x: 1, y: 1 }],
      1,
      [],
      { minimumLabelWidthPercent: Number.NaN },
    ),
    /footprint percentages must be finite and non-negative/,
  );
});
