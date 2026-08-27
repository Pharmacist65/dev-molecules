import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [atlas, atlasCss, family, spatial, universe, universeCss, platformApp, platformCss, scene, sceneTypes] =
  await Promise.all([
    readFile(new URL("../components/atlas/DrugAtlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/DrugAtlas.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/FamilyPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/AtlasSpatialView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/universe/MoleculeUniverse.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/universe/MoleculeUniverse.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/DevMoleculesApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/platform.module.css", import.meta.url), "utf8"),
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
  assert.match(spatial, /data-spatial-viewport=\{variant === "immersive" \? "primary" : "embedded"\}/);
});

test("immersive Spatial starts below navigation without nested editorial chrome", () => {
  assert.match(atlas, /data-atlas-hero="true"/);
  assert.match(atlas, /data-atlas-browse-panel="true"/);
  assert.match(atlas, /data-atlas-view-switcher="true"/);
  assert.match(atlasCss, /data-atlas-view="spatial"\]\s+\.hero\s*\{[\s\S]*?display:\s*none/);
  assert.match(
    atlasCss,
    /data-atlas-view="spatial"\]\s+\.viewTabs\s*\{[\s\S]*?position:\s*absolute[\s\S]*?border-radius:\s*999px/,
  );
  assert.match(platformApp, /data-atlas-workspace=\{route\.atlasView \?\? "browse"\}/);
  assert.match(
    platformCss,
    /data-atlas-workspace="spatial"\]\s*\{[\s\S]*?width:\s*100%[\s\S]*?padding:\s*0/,
  );
});

test("immersive Spatial owns an 80vh stage, floating controls and drawer-safe renderer", () => {
  assert.match(universe, /IMMERSIVE_DESKTOP_MINIMUM_VIEWPORT_RATIO = 0\.8/);
  assert.match(universeCss, /data-surface-variant="immersive"[\s\S]*?min-height:\s*80svh/);
  assert.match(
    universeCss,
    /data-surface-variant="immersive"\]\s+\.toolbar\s*\{[\s\S]*?position:\s*absolute[\s\S]*?pointer-events:\s*none/,
  );
  assert.match(universe, /data-spatial-floating-controls=\{isImmersive \? "primary" : undefined\}/);
  assert.match(universe, /data-spatial-control=\{isImmersive \? "search" : undefined\}/);
  assert.match(universe, /data-spatial-control=\{isImmersive \? "lens" : undefined\}/);
  assert.match(universe, /data-spatial-control=\{isImmersive \? "camera" : undefined\}/);
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
