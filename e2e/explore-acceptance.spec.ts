import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  attachAcceptanceMetrics,
  captureAcceptanceScreenshot,
  dragCanvas,
  expectCleanRuntime,
  expectRevisionToChange,
  measureInteractiveCanvasPerformance,
  pinchCanvas,
  readNumericAttribute,
  selectAtomThroughCanvas,
  watchRuntime,
} from "./explore-helpers";

const exploreRoot = (page: Page) => page.locator("[data-explore-level]").first();
const sceneRoot = (page: Page) => page.locator("[data-active-webgl-contexts]").first();
const sceneCanvas = (page: Page) => page.locator("canvas[data-molecular-scene-canvas]").first();

function expectInteractivePerformanceEvidence(
  evidence: Awaited<ReturnType<typeof measureInteractiveCanvasPerformance>>,
) {
  expect(evidence.cameraRevisionDelta).toBeGreaterThanOrEqual(3);
  expect(evidence.interactionRafCadence.sampleCount).toBeGreaterThanOrEqual(12);
  expect(evidence.interactionRafCadence.averageMs).toBeLessThan(50);
  expect(evidence.interactionRafCadence.p95Ms).toBeLessThan(100);
  expect(evidence.longTasks.supported, "Chrome must expose the Long Tasks API").toBe(true);
  expect(evidence.longTasks.count).toBeLessThanOrEqual(3);
  expect(evidence.longTasks.maxDurationMs).toBeLessThan(200);
}

async function expectExploreScene(
  page: Page,
  expected: {
    readonly level: "universe" | "cluster" | "focus";
    readonly lod: "far" | "near" | "cluster" | "focus";
    readonly minimumVisibleMolecules: number;
    readonly maximumVisibleMolecules: number;
  },
) {
  const root = exploreRoot(page);
  const scene = sceneRoot(page);
  const canvas = sceneCanvas(page);

  await expect(root).toHaveAttribute("data-explore-level", expected.level);
  await expect(scene).toHaveAttribute("data-lod-level", expected.lod);
  await expect(scene).toHaveAttribute("data-active-webgl-contexts", "1");
  await expect(canvas).toBeVisible();
  await expect(page.locator("canvas[data-molecular-scene-canvas]")).toHaveCount(1);
  await expect(page.locator('[data-scene-status="ready"]').first()).toBeVisible();

  const visibleMolecules = await readNumericAttribute(scene, "data-visible-count");
  expect(visibleMolecules).toBeGreaterThanOrEqual(expected.minimumVisibleMolecules);
  expect(visibleMolecules).toBeLessThanOrEqual(expected.maximumVisibleMolecules);

  const hasWebGl = await canvas.evaluate((element: HTMLCanvasElement) =>
    Boolean(element.getContext("webgl2") || element.getContext("webgl")),
  );
  expect(hasWebGl, "the shared molecular scene must own a WebGL context").toBe(true);

  return { root, scene, canvas };
}

async function zoomUniverseToNear(page: Page, canvas: Locator, scene: Locator) {
  await expectRevisionToChange(scene, async () => {
    await canvas.hover();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.mouse.wheel(0, -520);
      if ((await scene.getAttribute("data-lod-level")) === "near") break;
    }
  });
  await expect(scene).toHaveAttribute("data-lod-level", "near");
}

async function openFirstCluster(page: Page) {
  const cluster = page
    .getByRole("button", { name: /kümesi,?\s*(?:[2-9]|\d{2,})\s*molekül/i })
    .first();
  await expect(cluster).toBeVisible();
  await cluster.click();
  await expect(page).toHaveURL(/#cluster\//);
}

async function openFirstMolecule(page: Page) {
  const molecule = page.getByRole("button", { name: /focus görünümünü aç/i }).first();
  await expect(molecule).toBeVisible();
  await molecule.click();
  await expect(page).toHaveURL(/#molecule\//);
}

test("shared 3D scene covers Universe, Cluster and full Focus interaction", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });

  const far = await expectExploreScene(page, {
    level: "universe",
    lod: "far",
    minimumVisibleMolecules: 0,
    maximumVisibleMolecules: 0,
  });
  expect(
    telemetry.successfulThreeDStructureUrls.size,
    "far LOD must not eagerly fetch 3D structure assets",
  ).toBe(0);
  await captureAcceptanceScreenshot(page, "1440x900-universe-far.png");

  await expectRevisionToChange(far.scene, () => dragCanvas(page, far.canvas, { x: 72, y: 34 }));
  await zoomUniverseToNear(page, far.canvas, far.scene);
  await expectExploreScene(page, {
    level: "universe",
    lod: "near",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 40,
  });
  await expect
    .poll(() => telemetry.successfulThreeDStructureUrls.size, {
      message: "near LOD must lazy-load at least one real 3D SDF asset",
    })
    .toBeGreaterThan(0);
  expect(telemetry.successfulThreeDStructureUrls.size).toBeLessThanOrEqual(40);
  await captureAcceptanceScreenshot(page, "1440x900-universe-near-3d.png");
  const nearInteractionPerformance = await measureInteractiveCanvasPerformance(
    page,
    far.canvas,
    far.scene,
  );
  expectInteractivePerformanceEvidence(nearInteractionPerformance);
  const nearMetrics = await attachAcceptanceMetrics(
    page,
    testInfo,
    telemetry,
    "1440x900-universe-near",
    nearInteractionPerformance,
  );
  expect(nearMetrics.activeWebglContextCount).toBe(1);
  expect(nearMetrics.visibleThreeDMoleculeCount).toBeGreaterThan(0);
  expect(nearMetrics.visibleThreeDMoleculeCount).toBeLessThanOrEqual(40);
  expect(nearMetrics.idleRafCadence.averageMs).toBeLessThan(50);
  expect(nearMetrics.idleRafCadence.p95Ms).toBeLessThan(100);
  await expectRevisionToChange(far.scene, () => pinchCanvas(far.canvas));

  await openFirstCluster(page);
  await expectExploreScene(page, {
    level: "cluster",
    lod: "cluster",
    minimumVisibleMolecules: 2,
    maximumVisibleMolecules: 40,
  });
  const clusterSelectedBefore = await sceneRoot(page).getAttribute("data-selected-molecule");
  const clusterSelectionButtons = page.getByRole("button", { name: /molekülünü seç/i });
  expect(await clusterSelectionButtons.count()).toBeGreaterThan(1);
  await clusterSelectionButtons.nth(1).click();
  await expect
    .poll(() => sceneRoot(page).getAttribute("data-selected-molecule"))
    .not.toBe(clusterSelectedBefore);
  const clusterSelectedAfter = await sceneRoot(page).getAttribute("data-selected-molecule");
  await expect(page.locator("[data-emphasized-molecule]").first()).toHaveAttribute(
    "data-emphasized-molecule",
    clusterSelectedAfter ?? "",
  );
  expect(await readNumericAttribute(sceneRoot(page), "data-visible-count")).toBeGreaterThanOrEqual(2);
  await captureAcceptanceScreenshot(page, "1440x900-cluster-3d.png");

  await openFirstMolecule(page);
  const focus = await expectExploreScene(page, {
    level: "focus",
    lod: "focus",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 1,
  });
  await expect(focus.scene).toHaveAttribute("data-selected-molecule", /.+/);
  await expect(focus.scene).toHaveAttribute("data-representation", "ball-and-stick");
  await expect(focus.scene).toHaveAttribute(
    "data-structure-origin",
    "computed-3d-conformer",
  );
  await expect(page.getByText("PUBCHEM HESAPLANMIŞ 3B KONFORMER", { exact: true })).toBeVisible();
  await expect(page.getByText(/Deneysel kristal veya protein-bound pose değildir/i)).toBeVisible();
  await captureAcceptanceScreenshot(page, "1440x900-molecule-focus.png");
  const focusInteractionPerformance = await measureInteractiveCanvasPerformance(
    page,
    focus.canvas,
    focus.scene,
  );
  expectInteractivePerformanceEvidence(focusInteractionPerformance);
  const focusMetrics = await attachAcceptanceMetrics(
    page,
    testInfo,
    telemetry,
    "1440x900-focus",
    focusInteractionPerformance,
  );
  expect(focusMetrics.activeWebglContextCount).toBe(1);
  expect(focusMetrics.visibleThreeDMoleculeCount).toBe(1);

  await page.getByRole("button", { name: /Uzay dolgu|Space[- ]filling/i }).click();
  await expect(focus.scene).toHaveAttribute("data-representation", "space-filling");

  const hydrogenState = await focus.scene.getAttribute("data-hydrogens");
  expect(hydrogenState, "hydrogen visibility must be exposed").toBeTruthy();
  await page.getByRole("button", { name: /^H\s+(?:açık|kapalı|visible|hidden)$/i }).click();
  await expect(focus.scene).not.toHaveAttribute("data-hydrogens", hydrogenState ?? "");

  const cameraTools = page.getByRole("group", { name: /Kamera aracı|Camera tool/i });
  await cameraTools.getByRole("button", { name: /^(?:Döndür|Rotate)$/i }).click();
  await expectRevisionToChange(focus.scene, () =>
    dragCanvas(page, focus.canvas, { x: 68, y: -38 }),
  );
  await cameraTools.getByRole("button", { name: /^(?:Kaydır|Pan)$/i }).click();
  await expectRevisionToChange(focus.scene, () =>
    dragCanvas(page, focus.canvas, { x: -52, y: 30 }),
  );
  const zoomControls = page.getByRole("group", { name: /Yakınlaştırma|Zoom/i });
  await expectRevisionToChange(focus.scene, () =>
    zoomControls.getByRole("button", { name: /Yakınlaştır|Zoom in/i }).click(),
  );
  await expectRevisionToChange(focus.scene, () =>
    zoomControls.getByRole("button", { name: /Ortala|Center|Reset/i }).click(),
  );
  await expectRevisionToChange(focus.scene, () =>
    dragCanvas(page, focus.canvas, { x: 28, y: 18 }),
  );

  await selectAtomThroughCanvas(page, focus.canvas, focus.scene);

  await focus.canvas.press("]");
  const keyboardAtom = await focus.canvas.getAttribute("data-keyboard-atom");
  expect(keyboardAtom, "keyboard traversal must expose a real visible atom").toMatch(/.+:\d+$/);
  await focus.canvas.press("Enter");
  await expect(focus.scene).toHaveAttribute("data-selected-atom", keyboardAtom ?? "");

  const dimensionControls = page.getByRole("group", { name: /Boyut|Dimension/i });
  await dimensionControls.getByRole("button", { name: "2B", exact: true }).click();
  await expect(dimensionControls.getByRole("button", { name: "2B", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-structure-origin="database-2d-record"]').first()).toBeVisible();
  await expect(page.getByText("PUBCHEM CANONICAL 2B KAYIT", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("group", { name: /Gösterim|Representation/i }).getByRole("button").first(),
  ).toBeDisabled();
  await expect(cameraTools.getByRole("button").first()).toBeDisabled();
  await expect(zoomControls.getByRole("button").first()).toBeDisabled();
  await expect(focus.scene).toHaveAttribute("data-selected-atom", "none");
  await expect(focus.canvas).toHaveAttribute("data-keyboard-atom", "");
  await dimensionControls.getByRole("button", { name: "3B", exact: true }).click();
  await expect(dimensionControls.getByRole("button", { name: "3B", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const inspectorToggle = page.locator('button[aria-controls="molecule-focus-inspector"]');
  const inspectorExpanded = await inspectorToggle.getAttribute("aria-expanded");
  await inspectorToggle.click();
  await expect(inspectorToggle).not.toHaveAttribute("aria-expanded", inspectorExpanded ?? "");
  await inspectorToggle.click();

  await page.goBack();
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");
  await openFirstMolecule(page);
  await page.keyboard.press("Escape");
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");
  await page.keyboard.press("Escape");
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");

  const search = page.getByRole("searchbox", { name: /Molekül ara/i });
  await search.fill("Celecoxib");
  await expect(sceneRoot(page)).toHaveAttribute("data-lod-level", "near");
  await expect(sceneRoot(page)).toHaveAttribute("data-visible-count", "1");
  await expect(page.locator('[data-focused-molecule="molecule:celecoxib"]')).toBeVisible();
  await search.fill("");
  await expect(sceneRoot(page)).toHaveAttribute("data-lod-level", "far");

  expectCleanRuntime(telemetry);
});

test("1920x1080 visual contract captures near Universe and Focus", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });

  const far = await expectExploreScene(page, {
    level: "universe",
    lod: "far",
    minimumVisibleMolecules: 0,
    maximumVisibleMolecules: 0,
  });
  await zoomUniverseToNear(page, far.canvas, far.scene);
  await expectExploreScene(page, {
    level: "universe",
    lod: "near",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 40,
  });
  await captureAcceptanceScreenshot(page, "1920x1080-universe-near-3d.png");

  await page.goto("/#molecule/propranolol", { waitUntil: "domcontentloaded" });
  await expectExploreScene(page, {
    level: "focus",
    lod: "focus",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 1,
  });
  await captureAcceptanceScreenshot(page, "1920x1080-molecule-focus.png");

  const metrics = await attachAcceptanceMetrics(page, testInfo, telemetry, "1920x1080-focus");
  expect(metrics.activeWebglContextCount).toBe(1);
  expectCleanRuntime(telemetry);
});

test("missing 3D asset fails closed without generated geometry", async ({ page }) => {
  const missingAsset = /\/structures\/pubchem\/cid-4946-3d\.sdf(?:\?|$)/i;
  const telemetry = watchRuntime(page, (url) => missingAsset.test(url));
  await page.route("**/structures/pubchem/cid-4946-3d.sdf", (route) =>
    route.fulfill({ status: 404, contentType: "text/plain", body: "Missing test fixture" }),
  );

  await page.goto("/#molecule/propranolol", { waitUntil: "domcontentloaded" });
  const scene = sceneRoot(page);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "focus");
  await expect(scene).toHaveAttribute("data-scene-status", "error");
  await expect(scene).toHaveAttribute("data-visible-count", "0");
  await expect(page.getByRole("alert")).toContainText(
    /Doğrulanabilir yapı|Yapı yüklenemedi|Structure unavailable/i,
  );
  await expect(page.getByRole("alert")).toContainText(/sahte|tahmini|fake|generated/i);
  await expect(
    page.getByRole("group", { name: /Yakınlaştırma|Zoom/i }).getByRole("button").first(),
  ).toBeDisabled();
  expectCleanRuntime(telemetry);
});

test("all five product modes remain reachable and dispose the Explore context", async ({ page }) => {
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await expectExploreScene(page, {
    level: "universe",
    lod: "far",
    minimumVisibleMolecules: 0,
    maximumVisibleMolecules: 0,
  });

  const navigation = page.getByRole("navigation", { name: "Platform modülleri" });
  for (const mode of ["Learn", "Build", "Teach", "Discover"] as const) {
    const button = navigation.getByRole("button", { name: new RegExp(mode, "i") });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("canvas[data-molecular-scene-canvas]")).toHaveCount(0);
  }

  const exploreButton = navigation.getByRole("button", { name: /Explore/i });
  await exploreButton.click();
  await expect(exploreButton).toHaveAttribute("aria-pressed", "true");
  await expect(sceneRoot(page)).toHaveAttribute("data-active-webgl-contexts", "1");
  expectCleanRuntime(telemetry);
});
