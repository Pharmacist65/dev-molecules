import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [atlas, family, spatial, universe, universeCss, scene, sceneTypes] =
  await Promise.all([
    readFile(new URL("../components/atlas/DrugAtlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/FamilyPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/AtlasSpatialView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/universe/MoleculeUniverse.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/universe/MoleculeUniverse.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/molecular-scene/SharedMolecularScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/molecular-scene/types.ts", import.meta.url), "utf8"),
  ]);

test("only the main Drug Atlas opts into the immersive Spatial surface", () => {
  assert.match(atlas, /<LazyAtlasSpatialView[\s\S]*?variant="immersive"/);
  assert.doesNotMatch(family, /variant="immersive"/);
  assert.match(spatial, /variant = "embedded"/);
  assert.match(spatial, /data-spatial-variant=\{variant\}/);
  assert.match(spatial, /variant === "embedded"/);
  assert.match(spatial, /surfaceVariant=\{variant\}/);
});

test("immersive Spatial owns a 78vh stage, floating controls and drawer-safe renderer", () => {
  assert.match(universeCss, /data-surface-variant="immersive"[\s\S]*?min-height:\s*78svh/);
  assert.match(
    universeCss,
    /data-surface-variant="immersive"\]\s+\.toolbar\s*\{[\s\S]*?position:\s*absolute[\s\S]*?pointer-events:\s*none/,
  );
  assert.match(
    universeCss,
    /data-level="universe"\]\s*>\s*\.sceneTelemetry\s*\{[\s\S]*?top:\s*5\.75rem[\s\S]*?height:\s*calc\(100% - 5\.75rem\)/,
  );
  assert.match(
    universeCss,
    /data-level="universe"\]\s+\.sharedScene,[\s\S]*?--molecular-scene-height:\s*calc\(100% - 4\.5rem\)/,
  );
  assert.match(
    universeCss,
    /data-inspector-open="true"\]\s+\.sharedScene[\s\S]*?width:\s*calc\(100% - 360px\)/,
  );
  assert.match(universe, /data-inspector-open=\{level === "focus" && inspectorOpen/);
});

test("immersive overview and near LOD stay sparse, large and neutral", () => {
  assert.match(universe, /IMMERSIVE_OVERVIEW_SAMPLE_SIZE = 6/);
  assert.match(universe, /IMMERSIVE_NEAR_SAMPLE_SIZE = 10/);
  assert.match(universe, /IMMERSIVE_NARROW_OVERVIEW_SAMPLE_SIZE = 4/);
  assert.match(universe, /molecule\.representativeMapStatus === "curated-seed"/);
  assert.match(universe, /isImmersive\s*\? representativeStructuresLabel/);
  assert.match(universe, /lodLevel === "far" \? 0\.74 : 0\.52/);
  assert.match(universe, /data-representative-scope="true"/);
  assert.match(
    universe,
    /isImmersive && level === "universe" && lodLevel === "far"[\s\S]*?candidateIds\.slice\(0, universeOverviewSampleSize\)/,
  );
});

test("immersive label telemetry is measured from rendered boxes instead of asserted as zero", () => {
  assert.match(universe, /countRenderedSpatialLabelCollisions\(stage\)/);
  assert.match(universe, /data-spatial-label="representative-scope"/);
  assert.match(universe, /data-spatial-label-obstacle="camera-controls"/);
  assert.match(universe, /data-label-collision-source=/);
  assert.match(universe, /renderedSpatialLabelCollisionCount \?\? "measuring"/);
  assert.doesNotMatch(
    universe,
    /level === "universe" && !isImmersive \? labelCollisionCount : 0/,
  );
  assert.match(
    universeCss,
    /data-surface-variant="immersive"\]\s+\.representativeScope\s*\{[\s\S]*?bottom:\s*4\.75rem/,
  );
});

test("universe molecule activation is separate, pointer and keyboard accessible", () => {
  assert.match(sceneTypes, /onMoleculeSelect\?: \(molecule: MolecularSceneMoleculeHit\)/);
  assert.match(scene, /molecular-scene:\$\{name\}/);
  assert.match(scene, /dispatchSceneEvent\("molecule-select", molecule\)/);
  assert.match(scene, /levelOfDetail === "universe"[\s\S]*?pickMolecule/);
  assert.match(scene, /keyboardMoleculeId[\s\S]*?Enter/);
  assert.match(universe, /onMoleculeSelect=\{isImmersive \? \(hit\)/);
  assert.equal((universe.match(/<SharedMolecularScene/g) ?? []).length, 1);
});
