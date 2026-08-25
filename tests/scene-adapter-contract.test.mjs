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

test("Universe geometry LOD stays bounded below Cluster and Focus without changing scene capacity", () => {
  const moleculePickerSource = adapterSource.slice(
    adapterSource.indexOf("  pickMolecule("),
    adapterSource.indexOf("  dispose()", adapterSource.indexOf("  pickMolecule(")),
  );
  assert.match(
    adapterSource,
    /universe:\s*\{\s*sphereWidth:\s*6,\s*sphereHeight:\s*4,\s*cylinder:\s*4\s*\}/,
  );
  assert.match(
    adapterSource,
    /cluster:\s*\{\s*sphereWidth:\s*12,\s*sphereHeight:\s*8,\s*cylinder:\s*8\s*\}/,
  );
  assert.match(
    adapterSource,
    /focus:\s*\{\s*sphereWidth:\s*22,\s*sphereHeight:\s*14,\s*cylinder:\s*12\s*\}/,
  );
  assert.match(adapterSource, /new BoundedSdfCache\(40\)/);
  assert.match(adapterSource, /UNIVERSE_INTERACTION_PIXEL_RATIO_SCALE\s*=\s*0\.5/);
  assert.match(adapterSource, /UNIVERSE_MIN_FULL_QUALITY_RESTORE_MS\s*=\s*650/);
  assert.match(adapterSource, /UNIVERSE_MAX_FULL_QUALITY_RESTORE_MS\s*=\s*2_000/);
  assert.match(adapterSource, /UNIVERSE_SOFTWARE_RENDERER_RESTORE_MS\s*=\s*2_000/);
  assert.match(adapterSource, /UNIVERSE_RESTORE_RENDER_COST_MULTIPLIER\s*=\s*4/);
  assert.match(adapterSource, /levelOfDetail\s*!==\s*"universe"/);
  assert.match(adapterSource, /fullQualityRestoreCount\s*\+=\s*1/);
  assert.match(adapterSource, /cameraConfigured\s*&&\s*sameCamera/);
  assert.match(adapterSource, /cameraRenderRequestCount\s*\+=\s*1/);
  assert.match(adapterSource, /lastFullQualityRenderDurationMs\s*=\s*renderDurationMs/);
  assert.match(adapterSource, /lastInteractionRenderDurationMs\s*=\s*renderDurationMs/);
  assert.match(adapterSource, /lastFullQualityFrameDurationMs\s*=\s*frameDurationMs/);
  assert.match(adapterSource, /lastInteractionFrameDurationMs\s*=\s*frameDurationMs/);
  assert.match(adapterSource, /renderTimingFrames\.add\(timingFrame\)/);
  assert.match(adapterSource, /swiftshader\|llvmpipe\|software rasterizer/i);
  assert.match(adapterSource, /data\.softwareRenderer|dataset\.softwareRenderer/);
  assert.match(adapterSource, /pickAtomCount\s*\+=\s*1/);
  assert.match(adapterSource, /pickMoleculeCount\s*\+=\s*1/);
  assert.match(adapterSource, /ray\.intersectSphere\(/);
  assert.doesNotMatch(moleculePickerSource, /intersectObjects|atomBatches/);
  assert.match(adapterSource, /getVisibleMoleculeScreenBounds\(\)/);
  assert.match(adapterSource, /relayoutVisibleMolecules\(\)/);
  assert.match(adapterSource, /fitFocusedMolecule\(\)/);
  assert.match(adapterSource, /getStructureFitEnvelopeCacheKey/);
  assert.match(adapterSource, /onCameraChange\?\.\(this\.getCameraState\(\), this\.cameraRevision\)/);
  assert.match(adapterSource, /dataset\.visibleMoleculeBounds\s*=/);
  assert.match(componentSource, /levelOfDetail\s*===\s*"universe"/);
  assert.match(componentSource, /publishAtomHover\(null\)/);
  assert.match(componentSource, /adapter\.pickMolecule\(/);
  assert.match(componentSource, /data-molecule-hover-label="true"/);
  assert.match(componentSource, /\{hoveredMolecule\.moleculeName\}/);
  assert.doesNotMatch(
    componentSource,
    /hoveredMolecule\.moleculeName[^<]*hoveredMolecule\.(?:atomIndex|element)/,
  );
  assert.match(componentSource, /setCamera\(cameraRef\.current, true\)/);
  assert.match(componentSource, /setCamera\(nextCamera, true\)/);
  assert.match(componentSource, /controlledCameraRef\.current\s*=\s*nextCamera/);
});

test("shared scene exposes stable acceptance hooks and atom events", () => {
  for (const hook of [
    "data-lod-level",
    "data-selected-molecule",
    "data-structure-origin",
    "data-active-webgl-contexts",
    "data-visible-molecules",
    "data-camera-revision",
    "data-camera-state",
    "data-selected-atom",
  ]) {
    assert.match(componentSource, new RegExp(hook));
  }
  assert.match(componentSource, /molecular-scene:\$\{name\}/);
  assert.match(componentSource, /atom-select/);
  assert.match(componentSource, /atom-hover/);
  assert.match(componentSource, /onCameraChange/);
  assert.match(componentSource, /setCameraRevision\(nextCameraRevision\)/);
  assert.match(adapterSource, /getVisibleAtoms\(\)/);
  assert.match(componentSource, /data-keyboard-atom/);
  assert.match(componentSource, /BracketLeft/);
  assert.match(componentSource, /BracketRight/);
  assert.match(componentSource, /Enter/);
});
