import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  createLocalStructureFitEnvelope,
  getStructureFitEnvelopeCacheKey,
  transformStructureFitEnvelope,
} = await tsImport(
  "../components/molecular-scene/fit-envelope.ts",
  import.meta.url,
);
const {
  fitSceneCameraToBoundingSphere,
  zoomSceneCamera,
} = await tsImport(
  "../components/molecular-scene/camera.ts",
  import.meta.url,
);

const structure = {
  title: "fit-envelope",
  program: "test 3D",
  comment: "",
  dimension: "3d",
  atoms: [
    {
      index: 0,
      element: "C",
      x: -1,
      y: 0,
      z: 0,
      formalCharge: 0,
      massDifference: 0,
      isotope: null,
    },
    {
      index: 1,
      element: "O",
      x: 1,
      y: 0.5,
      z: 0,
      formalCharge: 0,
      massDifference: 0,
      isotope: null,
    },
    {
      index: 2,
      element: "H",
      x: 0,
      y: 3.5,
      z: 0.4,
      formalCharge: 0,
      massDifference: 0,
      isotope: null,
    },
  ],
  bonds: [],
  properties: {},
};

test("local fit envelope is immutable and encloses every atom at max visual radius", () => {
  const envelope = createLocalStructureFitEnvelope(structure);
  assert.ok(Object.isFrozen(envelope));
  assert.ok(Object.isFrozen(envelope.centerOffset));

  // The far hydrogen must remain part of the envelope even when a renderer
  // chooses not to display hydrogens. Its max visual radius is 1.2 Å.
  const structureCenter = { x: 0, y: 1.75, z: 0.2 };
  const hydrogen = structure.atoms[2];
  const hydrogenDistance = Math.hypot(
    hydrogen.x - structureCenter.x - envelope.centerOffset.x,
    hydrogen.y - structureCenter.y - envelope.centerOffset.y,
    hydrogen.z - structureCenter.z - envelope.centerOffset.z,
  );
  assert.ok(envelope.radius >= hydrogenDistance + 1.2);
});

test("fit cache key is exact to structure URL and expected PubChem identity", () => {
  assert.notEqual(
    getStructureFitEnvelopeCacheKey("/cid-1.sdf", 1),
    getStructureFitEnvelopeCacheKey("/cid-1.sdf", 2),
  );
  assert.notEqual(
    getStructureFitEnvelopeCacheKey("/cid-1.sdf", 1),
    getStructureFitEnvelopeCacheKey("/cid-2.sdf", 1),
  );
  assert.equal(
    getStructureFitEnvelopeCacheKey("/cid-1.sdf", 1),
    getStructureFitEnvelopeCacheKey("/cid-1.sdf", 1),
  );
});

test("descriptor scale and position are applied only to the transformed envelope", () => {
  const local = createLocalStructureFitEnvelope(structure);
  const transformed = transformStructureFitEnvelope(local, {
    id: "molecule:test",
    name: "Test",
    structureUrl: "/cid-1.sdf",
    expectedPubChemCid: 1,
    position: { x: 4, y: -2, z: 1 },
    scale: 1.5,
  });
  assert.equal(transformed.radius, local.radius * 1.5);
  assert.deepEqual(transformed.center, {
    x: 4 + local.centerOffset.x * 1.5,
    y: -2 + local.centerOffset.y * 1.5,
    z: 1 + local.centerOffset.z * 1.5,
  });
});

test("two zoom-reset cycles return exactly to the same fitted camera", () => {
  const local = createLocalStructureFitEnvelope(structure);
  const transformed = transformStructureFitEnvelope(local, {
    id: "molecule:test",
    name: "Test",
    structureUrl: "/cid-1.sdf",
  });
  const initial = {
    position: { x: 0, y: 4, z: 28 },
    target: { x: 0, y: 0, z: 0 },
    fov: 42,
    near: 0.05,
    far: 2500,
  };
  const firstFit = fitSceneCameraToBoundingSphere(
    zoomSceneCamera(initial, -180),
    transformed.center,
    transformed.radius,
    16 / 9,
    0.14,
  );
  const secondFit = fitSceneCameraToBoundingSphere(
    zoomSceneCamera(firstFit, 180),
    transformed.center,
    transformed.radius,
    16 / 9,
    0.14,
  );
  assert.deepEqual(secondFit.target, firstFit.target);
  assert.ok(
    Math.hypot(
      secondFit.position.x - firstFit.position.x,
      secondFit.position.y - firstFit.position.y,
      secondFit.position.z - firstFit.position.z,
    ) < 1e-12,
  );
});
