import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adapterSource = await readFile(
  new URL("../components/molecular-scene/ThreeJsMolecularSceneAdapter.ts", import.meta.url),
  "utf8",
);
const componentSource = await readFile(
  new URL("../components/molecular-scene/SharedMolecularScene.tsx", import.meta.url),
  "utf8",
);
const cacheSource = await readFile(
  new URL("../components/molecular-scene/sdf-cache.ts", import.meta.url),
  "utf8",
);

test("adapter uses real Three geometries, instancing and demand-driven rendering", () => {
  assert.match(adapterSource, /new SphereGeometry\(/);
  assert.match(adapterSource, /new CylinderGeometry\(/);
  assert.match(adapterSource, /new InstancedMesh\(/);
  assert.match(adapterSource, /BoundedSdfCache/);
  assert.match(cacheSource, /parseSdfV2000/);
  assert.match(adapterSource, /window\.requestAnimationFrame\(/);
  assert.doesNotMatch(adapterSource, /setAnimationLoop|Math\.random/);
});

test("shared scene exposes stable acceptance hooks and atom events", () => {
  for (const hook of [
    "data-lod-level",
    "data-selected-molecule",
    "data-structure-origin",
    "data-active-webgl-contexts",
    "data-visible-molecules",
    "data-camera-revision",
    "data-selected-atom",
  ]) {
    assert.match(componentSource, new RegExp(hook));
  }
  assert.match(componentSource, /molecular-scene:\$\{name\}/);
  assert.match(componentSource, /atom-select/);
  assert.match(componentSource, /atom-hover/);
  assert.match(componentSource, /onCameraChange/);
  assert.match(adapterSource, /getVisibleAtoms\(\)/);
  assert.match(componentSource, /data-keyboard-atom/);
  assert.match(componentSource, /BracketLeft/);
  assert.match(componentSource, /BracketRight/);
  assert.match(componentSource, /Enter/);
});
