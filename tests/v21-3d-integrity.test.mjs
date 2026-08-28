import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const [home, homeStyles, shared, adapter, viewer, viewerStyles, universe, fitEnvelope] = await Promise.all([
  source("components/platform/HomeMoleculeStage.tsx"),
  source("components/platform/HomeMoleculeStage.module.css"),
  source("components/molecular-scene/SharedMolecularScene.tsx"),
  source("components/molecular-scene/ThreeJsMolecularSceneAdapter.ts"),
  source("components/molecule-viewer/MoleculeViewer.tsx"),
  source("components/molecule-viewer/MoleculeViewer.module.css"),
  source("components/universe/MoleculeUniverse.tsx"),
  source("components/molecular-scene/fit-envelope.ts"),
]);

test("Home featured molecule is idle by default and cannot pick atoms", () => {
  assert.match(home, /data-auto-rotate="off"/);
  assert.match(home, /atomSelectionEnabled=\{false\}/);
  assert.match(home, /focusFitPadding=\{0\.14\}/);
  assert.doesNotMatch(home, /requestAnimationFrame|\.setCamera\(/);
  assert.match(shared, /if \(!atomSelectionEnabled\)/);
  assert.match(
    shared,
    /aria-keyshortcuts=\{\s*atomSelectionEnabled \|\| onMoleculeSelect/,
  );
  assert.match(shared, /atomSelectionEnabled && \(isPreviousAtomKey \|\| isNextAtomKey\)/);
});

test("Home identity occupies a protected non-overlay footer", () => {
  assert.match(home, /data-home-featured-viewport="true"/);
  assert.match(home, /data-home-featured-identity="true"/);
  assert.match(homeStyles, /grid-template-rows:\s*minmax\(0, 1fr\) minmax\(64px, auto\)/);
  assert.match(homeStyles, /\.identity\s*\{[\s\S]*min-height:\s*64px/);
  assert.match(homeStyles, /\.viewport\s*\{[\s\S]*overflow:\s*hidden/);
});

test("adapter publishes real camera, projection, canvas and DPR telemetry", () => {
  for (const hook of [
    "cameraRevision",
    "cameraDistance",
    "modelScreenCenterX",
    "modelScreenCenterY",
    "modelScreenWidth",
    "modelScreenHeight",
    "canvasCssWidth",
    "canvasCssHeight",
    "canvasBufferWidth",
    "canvasBufferHeight",
    "devicePixelRatio",
    "modelClipped",
    "fitVisibleMoleculesCount",
    "layoutViewportAspect",
  ]) {
    assert.match(adapter, new RegExp(`dataset\\.${hook}`));
  }
  assert.match(shared, /data-selected-atom-overlay-collision="0"/);
});

test("focus fit is lifecycle-bound and resize callbacks are coalesced", () => {
  assert.match(shared, /new ResizeObserver/);
  assert.match(shared, /resizeFrame = window\.requestAnimationFrame/);
  assert.match(shared, /Math\.abs\(next\.width - lastResize\.width\) >= 0\.5/);
  assert.match(shared, /activeAdapter\.resize\(next\.width, next\.height, pixelRatio\);[\s\S]*viewportCallbackRef\.current/);
  assert.match(adapter, /const safeWidth = Math\.max\(1, width\)/);
  assert.match(adapter, /this\.camera\.aspect = safeWidth \/ safeHeight/);
  assert.doesNotMatch(adapter, /Math\.floor\(width\)/);
  assert.match(adapter, /if \(this\.focusedMoleculeId && this\.focusAutoFit\)/);
  assert.match(universe, /port\.relayoutVisibleMolecules\(\);[\s\S]*port\.fitVisibleMolecules\(\)/);

  const representationSection = adapter.slice(
    adapter.indexOf("  setRepresentation("),
    adapter.indexOf("  setHydrogenVisibility("),
  );
  const highlightSection = adapter.slice(
    adapter.indexOf("  highlightAtom("),
    adapter.indexOf("  getVisibleAtoms("),
  );
  assert.doesNotMatch(representationSection, /fitFocusedMolecule/);
  assert.doesNotMatch(highlightSection, /fitFocusedMolecule|setCamera/);
});

test("focused reset uses an explicit non-policy-mutating immutable envelope fit", () => {
  const explicitFitSection = adapter.slice(
    adapter.indexOf("  fitFocusedMolecule()"),
    adapter.indexOf("  relayoutVisibleMolecules()"),
  );
  assert.match(explicitFitSection, /getStructureFitEnvelopeCacheKey/);
  assert.match(explicitFitSection, /transformStructureFitEnvelope/);
  assert.doesNotMatch(explicitFitSection, /focusAutoFit\s*=/);
  assert.doesNotMatch(explicitFitSection, /moleculeBounds/);
  assert.match(fitEnvelope, /structure\.atoms/);
  assert.match(fitEnvelope, /Math\.max\(visual\.ballRadius, visual\.vanDerWaalsRadius\)/);
  assert.match(fitEnvelope, /Object\.freeze/);
  assert.match(universe, /scenePortRef\.current\?\.fitFocusedMolecule\(\)/);
  assert.doesNotMatch(universe, /cameraRevision:\s*current\.cameraRevision\s*\+\s*1/);
});

test("focus auto-fit policy is explicit and independent of camera controlledness", () => {
  assert.match(shared, /focusAutoFit = false/);
  assert.doesNotMatch(shared, /focusAutoFit \?\? camera === undefined/);
  assert.match(universe, /focusAutoFit=\{/);
  assert.match(universe, /level === "focus"/);
  assert.match(universe, /onViewportCommit=\{\(\{ width, height, aspect \}\) =>/);
  assert.doesNotMatch(universe, /updateBrowserViewportKey|browserViewportKey/);
});

test("Dossier atom inspector is a pointer-safe fixed row and selection is camera-stable", () => {
  assert.match(viewer, /data-dossier-atom-inspector="fixed"/);
  assert.match(viewer, /data-selected-atom-overlay-collision="0"/);
  assert.match(viewerStyles, /\.atomStatus\s*\{[\s\S]*position:\s*relative/);
  assert.match(viewerStyles, /\.atomStatus\s*\{[\s\S]*min-height:\s*64px/);
  assert.match(viewerStyles, /\.atomStatus\s*\{[\s\S]*pointer-events:\s*none/);

  const selectionSection = viewer.slice(
    viewer.indexOf("  const handlePointerUp"),
    viewer.indexOf("  const handlePointerCancel"),
  );
  const relativeSelectionSection = viewer.slice(
    viewer.indexOf("  const selectRelativeAtom"),
    viewer.indexOf("  const handleKeyDown"),
  );
  assert.doesNotMatch(selectionSection, /setCameraRevision|resetView/);
  assert.doesNotMatch(relativeSelectionSection, /setCameraRevision|resetView/);
});

test("the shared viewer disables 3D whenever no admitted 3D source exists", () => {
  assert.match(viewer, /const hasThreeDStructure = structureUrl\.trim\(\)\.length > 0/u);
  assert.match(
    viewer,
    /aria-pressed=\{dimension === "3d"\}[\s\S]*disabled=\{!hasThreeDStructure\}[\s\S]*viewer\.no3dSource/u,
  );
});
