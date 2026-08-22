import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { resolveExploreMoleculeLayout } = await tsImport(
  "../lib/application/explore-molecule-layout.ts",
  import.meta.url,
);

const viewport = {
  aspect: 16 / 9,
  bounds: { minX: -18, maxX: 18, minY: -10, maxY: 10 },
  edgePadding: 0.5,
  fovDegrees: 42,
};

const crowdedCandidates = [
  { id: "atenolol", projectedAnchor: { x: -1.1, y: 0.2 }, radius: 1.15 },
  { id: "carvedilol", projectedAnchor: { x: -0.8, y: 0.1 }, extent: { x: 3.8, y: 1.5, z: 1.2 } },
  { id: "ibuprofen", projectedAnchor: { x: -0.2, y: 0 }, radius: 1.05 },
  { id: "naproxen", projectedAnchor: { x: 0.2, y: -0.1 }, extent: { x: 2.4, y: 1.6, z: 0.9 } },
  { id: "propranolol", projectedAnchor: { x: 0.7, y: 0.2 }, radius: 1.2 },
  { id: "warfarin", projectedAnchor: { x: 1.1, y: 0 }, radius: 1.1 },
  { id: "aspirin", projectedAnchor: { x: 0.4, y: 0.4 }, radius: 0.95 },
  { id: "metoprolol", projectedAnchor: { x: -0.4, y: -0.4 }, radius: 1.1 },
];

test("molecule layout resolves a crowded projection with real gaps and shallow depth", () => {
  const result = resolveExploreMoleculeLayout({
    candidates: crowdedCandidates,
    viewport,
    minimumGap: 0.65,
    depthRange: 0.45,
    maxIterations: 480,
  });

  assert.equal(result.placements.length, crowdedCandidates.length);
  assert.equal(result.overlapCount, 0);
  assert.equal(result.clippedCount, 0);
  assert.ok(result.minimumGap >= 0.65 - 1e-6);
  assert.ok(new Set(result.placements.map((item) => item.position.z.toFixed(4))).size > 3);
  assert.ok(new Set(result.placements.map((item) => item.position.x.toFixed(3))).size > 4);
  assert.ok(new Set(result.placements.map((item) => item.position.y.toFixed(3))).size > 4);
});

test("molecule layout is deterministic, order-independent and preserves caller order", () => {
  const first = resolveExploreMoleculeLayout({
    candidates: crowdedCandidates,
    viewport,
    minimumGap: 0.7,
  });
  const reversedCandidates = [...crowdedCandidates].reverse();
  const second = resolveExploreMoleculeLayout({
    candidates: reversedCandidates,
    viewport,
    minimumGap: 0.7,
  });

  assert.deepEqual(first.placements.map((item) => item.id), crowdedCandidates.map((item) => item.id));
  assert.deepEqual(
    second.placements.map((item) => item.id),
    reversedCandidates.map((item) => item.id),
  );
  assert.deepEqual(
    new Map(first.placements.map((item) => [item.id, item.position])),
    new Map(second.placements.map((item) => [item.id, item.position])),
  );
});

test("molecule layout prefers real extents and returns a complete camera fit", () => {
  const result = resolveExploreMoleculeLayout({
    candidates: [
      {
        id: "wide-structure",
        projectedAnchor: { x: 3, y: -2, z: 0.3 },
        radius: 99,
        extent: { x: 6, y: 2, z: 1 },
      },
    ],
    viewport,
    cameraPadding: 1.2,
  });
  const placement = result.placements[0];

  assert.equal(placement.effectiveRadius, Math.hypot(6, 2, 1) / 2);
  assert.deepEqual(placement.extent, { x: 6, y: 2, z: 1 });
  assert.equal(result.minimumGap, null);
  assert.equal(result.overlapCount, 0);
  assert.equal(result.clippedCount, 0);
  assert.ok(result.cameraFit.distance > 0);
  assert.ok(result.cameraFit.bounds.minX < result.cameraFit.contentBounds.minX);
  assert.ok(result.cameraFit.bounds.maxX > result.cameraFit.contentBounds.maxX);
  assert.deepEqual(result.cameraFit.target, {
    x: (result.cameraFit.contentBounds.minX + result.cameraFit.contentBounds.maxX) / 2,
    y: (result.cameraFit.contentBounds.minY + result.cameraFit.contentBounds.maxY) / 2,
    z: (result.cameraFit.contentBounds.minZ + result.cameraFit.contentBounds.maxZ) / 2,
  });
});

test("molecule layout accepts a valid planar world extent", () => {
  const result = resolveExploreMoleculeLayout({
    candidates: [
      { id: "planar", projectedAnchor: { x: 0, y: 0 }, extent: { x: 4, y: 2, z: 0 } },
    ],
    viewport,
  });

  assert.equal(result.placements[0].effectiveRadius, Math.hypot(4, 2, 0) / 2);
  assert.equal(result.clippedCount, 0);
});

test("molecule layout reports impossible geometry instead of silently shrinking it", () => {
  const result = resolveExploreMoleculeLayout({
    candidates: [
      { id: "too-large", projectedAnchor: { x: 0, y: 0 }, radius: 20 },
      { id: "also-large", projectedAnchor: { x: 0, y: 0 }, radius: 20 },
    ],
    viewport,
    minimumGap: 1,
    maxIterations: 4,
  });

  assert.equal(result.placements.every((item) => item.effectiveRadius === 20), true);
  assert.equal(result.clippedCount, 2);
  assert.equal(result.overlapCount, 1);
  assert.ok(result.minimumGap < 1);
});

test("molecule layout handles an empty scene without inventing structures", () => {
  const result = resolveExploreMoleculeLayout({ candidates: [], viewport });
  assert.deepEqual(result.placements, []);
  assert.equal(result.minimumGap, null);
  assert.equal(result.overlapCount, 0);
  assert.equal(result.clippedCount, 0);
  assert.equal(result.cameraFit.distance, 0);
  assert.deepEqual(result.cameraFit.target, { x: 0, y: 0, z: 0 });
});

test("molecule layout fails closed on malformed contracts", () => {
  assert.throws(
    () => resolveExploreMoleculeLayout({ candidates: [], viewport: { ...viewport, aspect: 0 } }),
    /positive finite viewport aspect/,
  );
  assert.throws(
    () => resolveExploreMoleculeLayout({
      candidates: [{ id: "missing-bounds", projectedAnchor: { x: 0, y: 0 } }],
      viewport,
    }),
    /requires radius or extent/,
  );
  assert.throws(
    () => resolveExploreMoleculeLayout({
      candidates: [
        { id: "duplicate", projectedAnchor: { x: 0, y: 0 }, radius: 1 },
        { id: "duplicate", projectedAnchor: { x: 1, y: 1 }, radius: 1 },
      ],
      viewport,
    }),
    /unique, non-empty IDs/,
  );
  assert.throws(
    () => resolveExploreMoleculeLayout({
      candidates: [{ id: "nan", projectedAnchor: { x: Number.NaN, y: 0 }, radius: 1 }],
      viewport,
    }),
    /anchor for nan must be finite/,
  );
  assert.throws(
    () => resolveExploreMoleculeLayout({
      candidates: [{ id: "bad-extent", projectedAnchor: { x: 0, y: 0 }, extent: { x: 1, y: -1, z: 1 } }],
      viewport,
    }),
    /extent for bad-extent must be finite, non-negative and non-zero/,
  );
});
