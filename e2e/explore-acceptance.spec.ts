import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  attachAcceptanceMetrics,
  captureAcceptanceScreenshot,
  collectRendererEnvironmentTelemetry,
  dragCanvas,
  expectCleanRuntime,
  expectRendererEnvironmentForPerformanceProfile,
  expectRevisionToChange,
  getPerformanceProfileConfiguration,
  hoverOpenCanvasSurface,
  measureInteractiveCanvasPerformance,
  pinchCanvas,
  readMolecularSceneOperationCounts,
  readMolecularSceneRenderTiming,
  readNumericAttribute,
  selectAtomThroughCanvas,
  watchRuntime,
} from "./explore-helpers";

const exploreRoot = (page: Page) => page.locator("[data-explore-level]").first();
const sceneRoot = (page: Page) => page.locator("[data-active-webgl-contexts]").first();
const sceneCanvas = (page: Page) => page.locator("canvas[data-molecular-scene-canvas]").first();
const STUDENT_FORBIDDEN_COPY = /Sınıflandırma incelemesi sürüyor|Classification review in progress|Sınıflandırılmamış · kürasyon bekliyor|Unclassified · curation pending|Hesaplanmış yapısal görünüm|Computed structural view|has not been reviewed|\b(?:projection|algorithm|fingerprint|Tanimoto|SDF|WebGL|unreviewed|pending-review|source-supported|computed-unreviewed)\b|incelenmemiş|projeksiyon|algoritma/iu;
const METFORMIN_ID = "molecule:imported:metformin-xzwyzxlipxdolr-uhfffaoysa-n";
const METFORMIN_SLUG = "metformin-xzwyzxlipxdolr-uhfffaoysa-n";
const REVIEWED_INDEX_ALIASES = [
  {
    name: "Atenolol",
    cid: 2249,
    id: "molecule:atenolol",
    slug: "atenolol",
    importedSlug: "atenolol-metkimkyrpqlgs-uhfffaoysa-n",
  },
  {
    name: "Metoprolol",
    cid: 4171,
    id: "molecule:metoprolol",
    slug: "metoprolol",
    importedSlug: "metoprolol-iubsymuccvwxpe-uhfffaoysa-n",
  },
] as const;

async function openFullCatalogResult(
  page: Page,
  query: string,
  recordId: string,
): Promise<Locator> {
  await page.getByRole("button", {
    name: /Yapı indeksine göz at|Browse structure index/i,
  }).click();
  const drawer = page.locator('[data-catalog-browse-drawer="true"]');
  await expect(drawer).toBeVisible();
  await drawer.getByRole("searchbox", {
    name: /Katalogda ara|Search the catalog/i,
  }).fill(query);
  const result = drawer.locator(`[data-catalog-record="${recordId}"]`);
  await expect(result).toBeVisible();
  return result;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("dev-molecules:locale")) {
      window.localStorage.setItem("dev-molecules:locale", "tr");
    }
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  });
});

function expectInteractivePerformanceEvidence(
  evidence: Awaited<ReturnType<typeof measureInteractiveCanvasPerformance>>,
) {
  const performanceProfile = getPerformanceProfileConfiguration();
  const usesSharedSoftwareRenderer =
    performanceProfile.name === "shared-software-renderer";
  const { budgets } = performanceProfile;

  expect(evidence.cameraRevisionDelta).toBeGreaterThanOrEqual(3);
  expect(evidence.measuredVisibleMoleculeCount).toBeGreaterThan(0);
  expect(evidence.measuredVisibleMoleculeCount).toBeLessThanOrEqual(40);
  expect(
    evidence.molecularSceneOperationDelta,
    "live camera input must not reload molecular data or rebuild mesh batches",
  ).toEqual({ loadMolecules: 0, updateVisibleMolecules: 0, rebuildScene: 0 });
  expect(evidence.molecularSceneRenderDelta.cameraRequests).toBe(
    evidence.cameraRevisionDelta,
  );
  expect(evidence.molecularSceneRenderDelta.frames).toBeGreaterThan(0);
  expect(
    evidence.molecularSceneRenderDelta.fullQualityRestores,
    "a full-quality Universe restore must not enter the measured live-input phase",
  ).toBe(0);
  expect(evidence.interactionRafCadence.sampleCount).toBeGreaterThanOrEqual(12);
  expect(
    evidence.interactionRafCadence.averageMs,
    `interaction average must stay below the ${budgets.interactionAverageMs} ms ${
      usesSharedSoftwareRenderer ? "shared software-renderer" : "local production"
    } budget`,
  ).toBeLessThan(budgets.interactionAverageMs);
  expect(
    evidence.interactionRafCadence.p95Ms,
    `interaction p95 must stay below the ${budgets.interactionP95Ms} ms ${
      usesSharedSoftwareRenderer ? "shared software-renderer" : "local production"
    } budget`,
  ).toBeLessThan(budgets.interactionP95Ms);
  expect(evidence.longTasks.supported, "Chrome must expose the Long Tasks API").toBe(true);
  expect(
    evidence.longTasks.count,
    `long-task count must stay within the ${budgets.interactionLongTaskCount} task ${
      usesSharedSoftwareRenderer ? "shared software-renderer" : "local production"
    } budget`,
  ).toBeLessThanOrEqual(budgets.interactionLongTaskCount);
  expect(evidence.longTasks.maxDurationMs).toBeLessThan(
    budgets.interactionLongTaskMaxDurationMs,
  );
}

test("full-index search creates reload-safe molecule and compare permalinks", async ({ page }) => {
  const telemetry = watchRuntime(page);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();

  const metforminResult = await openFullCatalogResult(page, "Metformin", METFORMIN_ID);
  await metforminResult.click();
  await expect(page).toHaveURL(new RegExp(`#molecule/${METFORMIN_SLUG}$`));
  await expectExploreScene(page, {
    level: "focus",
    lod: "focus",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 1,
  });
  await expect(sceneRoot(page)).toHaveAttribute("data-selected-molecule", METFORMIN_ID);
  await expect(page.locator("#molecule-focus-inspector")).toContainText("Metformin");

  requestedUrls.length = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`#molecule/${METFORMIN_SLUG}$`));
  await expectExploreScene(page, {
    level: "focus",
    lod: "focus",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 1,
  });
  await expect(sceneRoot(page)).toHaveAttribute("data-selected-molecule", METFORMIN_ID);
  await expect(page.locator("canvas[data-molecular-scene-canvas]")).toHaveCount(1);
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/catalog\/shards\/alphabetic\/m\.json$/i.test(url)),
      { message: "the permalink must hydrate only Metformin's alphabetic shard" },
    )
    .toBe(true);
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/catalog\/structures\/pubchem\/cid-4091-3d\.sdf$/i.test(url)),
      { message: "the reloaded focus must request Metformin's catalog 3D structure" },
    )
    .toBe(true);

  await page.evaluate((metforminSlug) => {
    window.location.hash = `#compare/propranolol,${metforminSlug}`;
  }, METFORMIN_SLUG);
  await expectExploreScene(page, {
    level: "compare",
    lod: "cluster",
    minimumVisibleMolecules: 2,
    maximumVisibleMolecules: 2,
  });
  await expect(sceneRoot(page)).toHaveAttribute(
    "data-selected-molecule",
    `molecule:propranolol,${METFORMIN_ID}`,
  );

  requestedUrls.length = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(
    new RegExp(`#compare/propranolol,${METFORMIN_SLUG}$`),
  );
  await expectExploreScene(page, {
    level: "compare",
    lod: "cluster",
    minimumVisibleMolecules: 2,
    maximumVisibleMolecules: 2,
  });
  await expect(sceneRoot(page)).toHaveAttribute(
    "data-selected-molecule",
    `molecule:propranolol,${METFORMIN_ID}`,
  );
  await expect(page.locator('[data-graph-comparison="ready"]')).toBeVisible();
  await expect(page.locator("canvas[data-molecular-scene-canvas]")).toHaveCount(1);
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/catalog\/shards\/alphabetic\/m\.json$/i.test(url)),
      { message: "the compare permalink must hydrate Metformin's alphabetic shard" },
    )
    .toBe(true);
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/catalog\/structures\/pubchem\/cid-4091-3d\.sdf$/i.test(url)),
      { message: "the compare permalink must load Metformin's real 3D structure" },
    )
    .toBe(true);

  await page.evaluate(() => {
    window.location.hash = "#compare/propranolol,propranolol";
  });
  await expect(page).toHaveURL(/#universe$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");

  await page.evaluate(() => {
    window.location.hash = "#molecule/not-a-catalog-molecule";
  });
  await expect(page).toHaveURL(/#universe$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");
  expectCleanRuntime(telemetry);
});

test("cluster permalinks restore the public neutral cluster and reject raw draft labels", async ({ page }) => {
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();

  await expect(page.locator('[data-representative-scope="true"]')).toContainText(
    /Temsilî yapılar|Representative structures/i,
  );
  await page.goto("/#cluster/structural-similarity/representative-structures", {
    waitUntil: "domcontentloaded",
  });
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");
  const exactClusterUrl = page.url();
  expect(exactClusterUrl).toMatch(
    /#cluster\/structural-similarity\/representative-structures$/,
  );
  const selectedBeforeReload = await sceneRoot(page).getAttribute("data-selected-molecule");
  expect(selectedBeforeReload).toBeTruthy();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(exactClusterUrl);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");
  await expect(sceneRoot(page)).toHaveAttribute(
    "data-selected-molecule",
    selectedBeforeReload ?? "",
  );

  await page.goto("/#cluster/structural-similarity/computed-structural-view-unreviewed", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/#cluster\/structural-similarity\/representative-structures$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");

  await page.goto("/#cluster/therapeutic/classification-review-in-progress", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/#cluster\/therapeutic\/representative-structures$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");

  await page.goto("/#cluster/therapeutic/Cardiovascular", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/#universe$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");

  await page.evaluate(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
  });
  await page.goto("/#cluster/therapeutic/Kardiyovask%C3%BCler", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/#universe$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");

  await page.goto("/#cluster/not-a-lens/Cardiovascular", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/#universe$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");

  await page.goto("/#cluster/therapeutic/not-a-real-cluster", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/#universe$/);
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");
  expectCleanRuntime(telemetry);
});

test("full-index Atenolol and Metoprolol aliases select the reviewed identity and normalize reload URLs", async ({ page }) => {
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();
  for (const identity of REVIEWED_INDEX_ALIASES) {
    const result = await openFullCatalogResult(page, identity.name, identity.id);
    await expect(result).toContainText(identity.name);
    await expect(result).not.toContainText(String(identity.cid));
    await result.click();
    await expect(page).toHaveURL(new RegExp(`#molecule/${identity.slug}$`));
    await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "focus");
    await expect(sceneRoot(page)).toHaveAttribute("data-selected-molecule", identity.id);
    await expect(page.locator("#molecule-focus-inspector")).toContainText(identity.name);
    await expect(page.locator("#molecule-focus-inspector")).toContainText(String(identity.cid));

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`#molecule/${identity.slug}$`));
    await expect(sceneRoot(page)).toHaveAttribute("data-selected-molecule", identity.id);
    await expect(page.locator("#molecule-focus-inspector")).toContainText(identity.name);

    await page.goto(`/#molecule/${identity.importedSlug}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`#molecule/${identity.slug}$`));
    await expect(sceneRoot(page)).toHaveAttribute("data-selected-molecule", identity.id);
    await expect(page.locator("#molecule-focus-inspector")).toContainText(identity.name);

    await page.goto("/#universe", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-catalog-status="ready"]')).toBeVisible();
  }
});

test("an imported Metformin identity opens its Basic Record and never falls back to Propranolol", async ({ page }) => {
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();
  await (await openFullCatalogResult(page, "Metformin", METFORMIN_ID)).click();
  await expect(sceneRoot(page)).toHaveAttribute("data-selected-molecule", METFORMIN_ID);

  await page.goto(`/#drug/${METFORMIN_SLUG}`, { waitUntil: "domcontentloaded" });
  const basicRecord = page.locator('[data-basic-molecular-record="true"]');
  await expect(basicRecord).toBeVisible();
  await expect(basicRecord).toHaveAttribute("data-record-id", METFORMIN_ID);
  await expect(basicRecord).toHaveAttribute("data-pubchem-cid", "4091");
  await expect(basicRecord.getByRole("heading", { name: "Metformin" })).toBeVisible();
  await expect(basicRecord).not.toContainText("Propranolol");
  await expect(page.locator('[data-dossier-unavailable="true"]')).toHaveCount(0);

  await page.goto(`/#academy/synthesis/${METFORMIN_SLUG}/overview`, {
    waitUntil: "domcontentloaded",
  });
  const synthesis = page.locator('[data-synthesis-academy="phase-6"]');
  await expect(synthesis).toBeVisible();
  await expect(synthesis.locator('[data-selected-synthesis-catalog-identity]'))
    .toHaveAttribute("data-selected-synthesis-catalog-identity", METFORMIN_ID);
  await expect(synthesis.locator('[data-synthesis-public-coverage-only="true"]')).toBeVisible();
  await expect(synthesis).toContainText("Metformin");
  await expect(page.locator('[data-curated-workflow="unavailable"]')).toHaveCount(0);
  await expect(synthesis).not.toContainText("Propranolol");
});

test("camera-only updates retain molecular data and mesh batches when visible membership is unchanged", async ({ page }) => {
  await page.goto("/#molecule/propranolol", { waitUntil: "domcontentloaded" });
  const focus = await expectExploreScene(page, {
    level: "focus",
    lod: "focus",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 1,
  });
  const visibleMembershipBefore = await focus.scene.getAttribute("data-visible-molecules");
  const operationsBefore = await readMolecularSceneOperationCounts(focus.canvas);
  const focusPickCountBefore = await readNumericAttribute(
    focus.canvas,
    "data-pick-atom-count",
  );

  await expectRevisionToChange(focus.scene, async () => {
    await hoverOpenCanvasSurface(focus.canvas);
    await page.mouse.wheel(0, -24);
  });
  await expect(focus.canvas).toHaveAttribute("data-render-quality", "full");
  await expect(focus.canvas).toHaveAttribute(
    "data-render-pixel-ratio",
    await focus.canvas.getAttribute("data-full-pixel-ratio") ?? "",
  );
  expect(await readNumericAttribute(focus.canvas, "data-pick-atom-count")).toBeGreaterThan(
    focusPickCountBefore,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
      ),
  );

  await expect(focus.scene).toHaveAttribute(
    "data-visible-molecules",
    visibleMembershipBefore ?? "",
  );
  expect(await readMolecularSceneOperationCounts(focus.canvas)).toEqual(operationsBefore);
});

test("Universe camera input coalesces viewport membership work into one bounded rebuild", async ({ page }) => {
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  const universe = await expectExploreScene(page, {
    level: "universe",
    lod: "near",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 40,
  });
  const membershipBefore = await universe.scene.getAttribute("data-visible-molecules");
  const operationsBefore = await readMolecularSceneOperationCounts(universe.canvas);
  const cameraRevisionBefore = await readNumericAttribute(
    universe.scene,
    "data-camera-revision",
  );

  await dragOpenUniverseCanvas(page, universe.canvas, { x: 420, y: 0 });
  await expect
    .poll(() => readNumericAttribute(universe.scene, "data-camera-revision"), {
      message: "live Universe input must update the camera immediately",
    })
    .toBeGreaterThan(cameraRevisionBefore);

  await expect
    .poll(() => universe.scene.getAttribute("data-visible-molecules"), {
      message: "settled camera must eventually refresh the bounded viewport membership",
      timeout: 5_000,
    })
    .not.toBe(membershipBefore);
  await expect
    .poll(() => readMolecularSceneOperationCounts(universe.canvas), {
      message: "one settled membership change must perform one visibility update and rebuild",
      timeout: 5_000,
    })
    .toEqual({
      loadMolecules: operationsBefore.loadMolecules,
      updateVisibleMolecules: operationsBefore.updateVisibleMolecules + 1,
      rebuildScene: operationsBefore.rebuildScene + 1,
    });
  const settledVisibleCount = await readNumericAttribute(universe.scene, "data-visible-count");
  expect(settledVisibleCount).toBeGreaterThan(0);
  expect(settledVisibleCount).toBeLessThanOrEqual(40);
});

test("Universe camera motion renders at interaction DPR and restores one full-quality frame", async ({ page }) => {
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  const universe = await expectExploreScene(page, {
    level: "universe",
    lod: "near",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 40,
  });
  await expect(universe.canvas).toHaveAttribute("data-render-quality", "full");
  await hoverOpenCanvasSurface(universe.canvas);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
      ),
  );

  const fullPixelRatio = await readNumericAttribute(
    universe.canvas,
    "data-full-pixel-ratio",
  );
  const restoreCountBefore = await readNumericAttribute(
    universe.canvas,
    "data-full-quality-restore-count",
  );
  const cameraRequestsBefore = await readNumericAttribute(
    universe.canvas,
    "data-camera-render-request-count",
  );
  const renderCountBefore = await readNumericAttribute(
    universe.canvas,
    "data-render-count",
  );
  const pickCountBefore = await readNumericAttribute(
    universe.canvas,
    "data-pick-atom-count",
  );
  const revisionBefore = await readNumericAttribute(
    universe.scene,
    "data-camera-revision",
  );

  await page.mouse.wheel(0, -24);
  await page.mouse.wheel(0, 24);
  await expect
    .poll(() => readNumericAttribute(universe.scene, "data-camera-revision"))
    .toBeGreaterThan(revisionBefore);
  await expect(universe.canvas).toHaveAttribute("data-render-quality", "interaction");
  expect(
    await readNumericAttribute(universe.canvas, "data-render-pixel-ratio"),
  ).toBeLessThan(fullPixelRatio);

  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
      ),
  );
  const renderCountAfterMotion = await readNumericAttribute(
    universe.canvas,
    "data-render-count",
  );
  const revisionAfter = await readNumericAttribute(
    universe.scene,
    "data-camera-revision",
  );
  const cameraRequestsAfter = await readNumericAttribute(
    universe.canvas,
    "data-camera-render-request-count",
  );
  expect(cameraRequestsAfter - cameraRequestsBefore).toBe(
    revisionAfter - revisionBefore,
  );
  expect(renderCountAfterMotion - renderCountBefore).toBeGreaterThan(0);
  expect(renderCountAfterMotion - renderCountBefore).toBeLessThanOrEqual(
    cameraRequestsAfter - cameraRequestsBefore,
  );
  expect(await readNumericAttribute(universe.canvas, "data-pick-atom-count")).toBe(
    pickCountBefore,
  );
  const interactionTiming = await readMolecularSceneRenderTiming(universe.canvas);
  expect(interactionTiming.lastFullQualityRenderDurationMs).toBeGreaterThan(0);
  expect(interactionTiming.lastInteractionRenderDurationMs).toBeGreaterThan(0);
  expect(interactionTiming.lastFullQualityFrameDurationMs).toBeGreaterThan(0);
  expect(interactionTiming.lastInteractionFrameDurationMs).toBeGreaterThan(0);
  expect(interactionTiming.fullQualityRestoreDelayMs).toBeGreaterThanOrEqual(650);
  expect(interactionTiming.fullQualityRestoreDelayMs).toBeLessThanOrEqual(2_000);
  const expectedAdaptiveRestoreDelay = Math.min(
    2_000,
    Math.max(
      interactionTiming.softwareRenderer ? 2_000 : 650,
      Math.ceil(
        Math.max(
          interactionTiming.lastFullQualityFrameDurationMs,
          interactionTiming.lastInteractionFrameDurationMs,
        ) * 4,
      ),
    ),
  );
  expect(
    Math.abs(
      interactionTiming.fullQualityRestoreDelayMs - expectedAdaptiveRestoreDelay,
    ),
  ).toBeLessThanOrEqual(
    1,
  );
  expect(
    await readNumericAttribute(universe.canvas, "data-full-quality-restore-count"),
  ).toBe(restoreCountBefore);

  await expect
    .poll(
      () => readNumericAttribute(universe.canvas, "data-full-quality-restore-count"),
      { message: "quiet Universe camera must restore full quality exactly once" },
    )
    .toBe(restoreCountBefore + 1);
  await expect(universe.canvas).toHaveAttribute("data-render-quality", "full");
  await expect(universe.canvas).toHaveAttribute(
    "data-render-pixel-ratio",
    fullPixelRatio.toFixed(2),
  );
  await expect
    .poll(
      () => readNumericAttribute(universe.canvas, "data-render-count"),
      { message: "the full-quality restore must schedule one render" },
    )
    .toBe(renderCountAfterMotion + 1);

  await page.waitForTimeout(200);
  expect(
    await readNumericAttribute(universe.canvas, "data-full-quality-restore-count"),
  ).toBe(restoreCountBefore + 1);
  expect(await readNumericAttribute(universe.canvas, "data-render-count")).toBe(
    renderCountAfterMotion + 1,
  );
  const restoredTiming = await readMolecularSceneRenderTiming(universe.canvas);
  expect(restoredTiming.lastFullQualityRestoreElapsedMs).toBeGreaterThanOrEqual(
    interactionTiming.fullQualityRestoreDelayMs - 25,
  );
});

async function expectExploreScene(
  page: Page,
  expected: {
    readonly level: "universe" | "cluster" | "focus" | "compare";
    readonly lod: "far" | "near" | "cluster" | "focus";
    readonly minimumVisibleMolecules: number;
    readonly maximumVisibleMolecules: number;
  },
) {
  const root = exploreRoot(page);
  const scene = sceneRoot(page);
  const canvas = sceneCanvas(page);

  await expect(root).toHaveAttribute("data-explore-level", expected.level);
  if (
    expected.level === "universe"
    && expected.lod === "near"
    && await scene.getAttribute("data-lod-level") === "far"
  ) {
    await root.getByRole("button", { name: /Yakınlaştır|Zoom in/i }).click();
  }
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

async function openFirstCluster(page: Page) {
  const cluster = page
    .getByRole("button", { name: /kümesi,?\s*(?:[2-9]|\d{2,})\s*molekül/i })
    .first();
  if (await cluster.count() > 0) {
    await expect(cluster).toBeVisible();
    await cluster.click();
  } else {
    await page.evaluate(() => {
      window.location.hash = "#cluster/therapeutic/representative-structures";
    });
  }
  await expect(page).toHaveURL(/#cluster\//);
}

async function openFirstMolecule(page: Page) {
  const molecule = page
    .getByRole("button", { name: /odak görünümünü aç|open focus view/i })
    .first();
  await expect(molecule).toBeVisible();
  await molecule.click();
  await expect(page).toHaveURL(/#molecule\//);
}

async function dragOpenUniverseCanvas(
  page: Page,
  canvas: Locator,
  delta: { readonly x: number; readonly y: number },
) {
  const start = await canvas.evaluate((element: HTMLCanvasElement) => {
    const bounds = element.getBoundingClientRect();
    const candidates = [
      [0.18, 0.24],
      [0.5, 0.24],
      [0.82, 0.24],
      [0.18, 0.48],
      [0.82, 0.48],
    ] as const;
    for (const [xRatio, yRatio] of candidates) {
      const x = bounds.left + bounds.width * xRatio;
      const y = bounds.top + bounds.height * yRatio;
      if (document.elementFromPoint(x, y) === element) return { x, y };
    }
    return null;
  });
  expect(start, "Universe must expose an unobstructed canvas drag region").not.toBeNull();
  if (!start) return;

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 6 });
  await page.mouse.up();
}

test("student-first Explore covers spatial Universe, comparison, Passport and the Expert boundary", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });

  const near = await expectExploreScene(page, {
    level: "universe",
    lod: "near",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 40,
  });
  const app = page.locator("[data-catalog-status][data-catalog-records]").first();
  await expect(app).toHaveAttribute("data-catalog-status", "ready");
  await expect(app).toHaveAttribute("data-catalog-records", "1552");
  await expect(near.root).toHaveAttribute("data-presentation-mode", "student");
  await expect(page.getByRole("button", { name: /Ayarlar|Settings/i })).toBeVisible();
  await expect(page.getByText(/curated-categorical-layout/i)).toHaveCount(0);
  await expect(near.root).not.toContainText(STUDENT_FORBIDDEN_COPY);
  expect(
    telemetry.successfulThreeDStructureUrls.size,
    "student-first near LOD must load real 3D SDF assets on first view",
  ).toBeGreaterThan(0);
  await expect
    .poll(() => telemetry.successfulThreeDStructureUrls.size, {
      message: "near LOD must finish at least one real 3D SDF response",
    })
    .toBeGreaterThan(0);
  expect(telemetry.successfulThreeDStructureUrls.size).toBeLessThanOrEqual(40);
  await captureAcceptanceScreenshot(page, "1440x900-universe-near-3d.png");

  const representativeScope = page.locator('[data-representative-scope="true"]');
  await expect(representativeScope).toBeVisible();
  await expect(representativeScope.locator("strong")).toHaveText(
    /Temsilî yapılar|Representative structures/i,
  );
  const revisionBeforePan = await readNumericAttribute(near.scene, "data-camera-revision");
  const inertiaBeforePan = await readNumericAttribute(near.canvas, "data-inertia-revision");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await dragOpenUniverseCanvas(page, near.canvas, { x: 72, y: 34 });
  await expect
    .poll(() => readNumericAttribute(near.scene, "data-camera-revision"), {
      message: "Universe drag must pan the shared scene",
    })
    .toBeGreaterThan(revisionBeforePan);
  await expect(representativeScope).toBeVisible();

  await expect
    .poll(() => readNumericAttribute(near.canvas, "data-inertia-revision"), {
      message: "pointer release must apply at least one real inertia camera frame",
      timeout: 3_000,
    })
    .toBeGreaterThan(inertiaBeforePan);
  await page.emulateMedia({ reducedMotion: "reduce" });

  await expectRevisionToChange(near.scene, async () => {
    await hoverOpenCanvasSurface(near.canvas);
    await page.mouse.wheel(0, -120);
  });
  await expectRevisionToChange(near.scene, () => pinchCanvas(near.canvas));

  const rendererEnvironment = await collectRendererEnvironmentTelemetry(page, testInfo);
  expectRendererEnvironmentForPerformanceProfile(rendererEnvironment);
  const nearInteractionPerformance = await measureInteractiveCanvasPerformance(
    page,
    near.canvas,
    near.scene,
  );
  expect(nearInteractionPerformance.renderQualityAtStop).toBe("interaction");
  expect(
    nearInteractionPerformance.molecularSceneRenderDelta.pickAtoms,
    "Universe camera interaction must not raycast atom batches",
  ).toBe(0);
  expect(
    nearInteractionPerformance.renderTimingAtStop.renderPixelRatio,
  ).toBeLessThan(nearInteractionPerformance.renderTimingAtStop.fullPixelRatio);
  const nearInteractionDiagnostics = {
    stage: "1440x900-universe-near-interaction",
    rendererEnvironment,
    interactiveCanvasPerformance: nearInteractionPerformance,
  };
  console.log(`INTERACTION_METRICS ${JSON.stringify(nearInteractionDiagnostics)}`);
  await testInfo.attach("universe-interaction-metrics", {
    body: JSON.stringify(nearInteractionDiagnostics, null, 2),
    contentType: "application/json",
  });
  expectInteractivePerformanceEvidence(nearInteractionPerformance);
  // The performance probe intentionally leaves a trailing viewport-selection
  // debounce. Settle that independent interaction before isolating the next pan.
  await page.waitForTimeout(750);
  const settledMembershipBeforePan = await near.scene.getAttribute(
    "data-visible-molecules",
  );
  const settledOperationsBeforePan = await readMolecularSceneOperationCounts(near.canvas);
  await dragOpenUniverseCanvas(page, near.canvas, { x: 420, y: 0 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
      ),
  );
  expect(await readMolecularSceneOperationCounts(near.canvas)).toEqual(
    settledOperationsBeforePan,
  );
  // A balanced eight-record sample may legitimately retain the same members
  // after this second pan. The dedicated coalescing test above forces a
  // membership boundary; here we assert that settling performs either no work
  // for an unchanged set or exactly one bounded visibility rebuild.
  await page.waitForTimeout(750);
  const settledMembershipAfterPan = await near.scene.getAttribute(
    "data-visible-molecules",
  );
  const settledOperationsAfterPan = await readMolecularSceneOperationCounts(
    near.canvas,
  );
  const membershipChanged = settledMembershipAfterPan !== settledMembershipBeforePan;
  expect(settledOperationsAfterPan).toEqual({
    loadMolecules: settledOperationsBeforePan.loadMolecules,
    updateVisibleMolecules:
      settledOperationsBeforePan.updateVisibleMolecules + (membershipChanged ? 1 : 0),
    rebuildScene:
      settledOperationsBeforePan.rebuildScene + (membershipChanged ? 1 : 0),
  });
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

  await openFirstCluster(page);
  await expectExploreScene(page, {
    level: "cluster",
    lod: "cluster",
    minimumVisibleMolecules: 2,
    maximumVisibleMolecules: 40,
  });
  expect(await readNumericAttribute(sceneRoot(page), "data-visible-count")).toBeGreaterThanOrEqual(2);
  await captureAcceptanceScreenshot(page, "1440x900-cluster-3d.png");

  const clusterIds = (
    (await sceneRoot(page).getAttribute("data-visible-molecules")) ?? ""
  ).split(",").filter(Boolean);
  expect(clusterIds.length).toBeGreaterThanOrEqual(2);
  const comparisonSlugs = clusterIds.slice(0, 2).map((id) =>
    id.startsWith("molecule:") ? id.slice("molecule:".length) : id,
  );
  await page.evaluate((slugs) => {
    window.location.hash = `#compare/${slugs.map(encodeURIComponent).join(",")}`;
  }, comparisonSlugs);
  await expect(page).toHaveURL(/#compare\//);
  const compare = await expectExploreScene(page, {
    level: "compare",
    lod: "cluster",
    minimumVisibleMolecules: 2,
    maximumVisibleMolecules: 2,
  });
  const comparedMoleculeIds = (await compare.scene.getAttribute("data-visible-molecules"))
    ?.split(",")
    .filter(Boolean) ?? [];
  expect(comparedMoleculeIds).toHaveLength(2);
  await expect(page.locator("canvas[data-molecular-scene-canvas]")).toHaveCount(1);
  await expect(compare.scene).toHaveAttribute("data-active-webgl-contexts", "1");
  await expect(page.getByRole("button", { name: /Molekül pasaportunu aç|Open molecule passport/i })).toHaveCount(2);
  await expect(compare.root).not.toContainText(STUDENT_FORBIDDEN_COPY);
  await captureAcceptanceScreenshot(page, "1440x900-molecule-compare.png");
  const compareMetrics = await attachAcceptanceMetrics(
    page,
    testInfo,
    telemetry,
    "1440x900-compare",
  );
  expect(compareMetrics.activeWebglContextCount).toBe(1);
  expect(compareMetrics.visibleThreeDMoleculeCount).toBe(2);

  await page
    .getByRole("button", { name: /Molekül pasaportunu aç|Open molecule passport/i })
    .first()
    .click();
  await expect(page).toHaveURL(/#molecule\//);
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

  const passport = page.locator("#molecule-focus-inspector");
  await expect(passport).toBeVisible();
  await expect(passport.getByText(/Molekül pasaportu|Molecule passport/i).first()).toBeVisible();
  await expect(passport.getByText(/Sistematik ad|Systematic name/i)).toBeVisible();
  await expect(passport.getByText(
    /Fonksiyonel grup ipuçları|Functional-group motif hints/i,
  )).toHaveCount(0);
  await expect(
    passport.getByText(/^(?:Temsilî yapılar|Representative structures)$/i).first(),
  ).toBeVisible();
  await expect(passport).not.toContainText(STUDENT_FORBIDDEN_COPY);
  const studentSources = passport.locator("details");
  await expect(studentSources).not.toHaveAttribute("open", "");
  const collapsedStudentSourceLink = studentSources.locator('a[href*="pubchem"]').first();
  await expect(collapsedStudentSourceLink).toHaveCount(1);
  await expect(collapsedStudentSourceLink).toBeHidden();
  await expect(page.getByText(/fnv1a32:/i)).toHaveCount(0);

  const settingsButton = page.getByRole("button", { name: /Ayarlar|Settings/i });
  await settingsButton.click();
  const settings = page.locator("#platform-settings");
  const studentModeButton = settings.getByRole("button", {
    name: /Öğrenci görünümü|Student view/i,
  });
  const reviewerModeButton = settings.getByRole("button", {
    name: /Uzman görünümü|Expert view/i,
  });
  await expect(studentModeButton).toHaveAttribute("aria-pressed", "true");
  await reviewerModeButton.click();
  await expect(focus.root).toHaveAttribute("data-presentation-mode", "student");
  const activeReviewerModeButton = settings.getByRole("button", {
    name: /Uzman görünümü|Expert view/i,
  });
  await expect(activeReviewerModeButton).toHaveAttribute("aria-pressed", "true");
  await settingsButton.click();
  await expect(page.locator("#platform-settings")).toHaveCount(0);
  const reviewerLensDisclosure = page.getByRole("button", {
    name: /Kümelenme merceği|Clustering lens/i,
  });
  await expect(reviewerLensDisclosure).toHaveCount(0);
  await expect(page.getByText(/curated-categorical-layout/i)).toHaveCount(0);
  await expect(page.getByText(/fnv1a32:[0-9a-f]{8}/i)).toHaveCount(0);
  await expect(collapsedStudentSourceLink).toBeHidden();

  await page
    .getByRole("button", { name: /Dili İngilizce yap|Switch language to English/i })
    .click();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await expect(focus.root).toHaveAttribute("data-presentation-mode", "student");
  await expect(page.getByText(/curated-categorical-layout|fnv1a32:/i)).toHaveCount(0);
  await page
    .getByRole("button", { name: /Switch language to Turkish|Dili Türkçe yap/i })
    .click();
  await expect(page.getByRole("button", { name: "Ayarlar", exact: true })).toBeVisible();

  await studentSources.locator("summary").click();
  await expect(studentSources).toHaveAttribute("open", "");
  await expect(collapsedStudentSourceLink).toBeVisible();
  await expect(
    page.getByText("PUBCHEM HESAPLANMIŞ 3B KONFORMER", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/deneysel.*(?:kristal yapı|crystal structure).*(?:proteine bağlı poz|protein-bound pose)/i),
  ).toHaveCount(0);
  await captureAcceptanceScreenshot(page, "1440x900-molecule-focus.png");
  const focusInteractionPerformance = await measureInteractiveCanvasPerformance(
    page,
    focus.canvas,
    focus.scene,
  );
  const focusMetrics = await attachAcceptanceMetrics(
    page,
    testInfo,
    telemetry,
    "1440x900-focus",
    focusInteractionPerformance,
  );
  expectInteractivePerformanceEvidence(focusInteractionPerformance);
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
  await expect(
    page.getByText("PUBCHEM CANONICAL 2B KAYIT", { exact: true }),
  ).toHaveCount(0);
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
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "compare");
  await page.getByRole("button", { name: /Bölgeye dön|Back to region/i }).click();
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");
  await openFirstMolecule(page);
  await page.keyboard.press("Escape");
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "cluster");
  await page.keyboard.press("Escape");
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");

  await expect(reviewerLensDisclosure).toBeVisible();
  await reviewerLensDisclosure.click();
  await expect(reviewerLensDisclosure).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/curated-categorical-layout|fnv1a32:/i)).toHaveCount(0);
  await reviewerLensDisclosure.click();
  await expect(reviewerLensDisclosure).toHaveAttribute("aria-expanded", "false");

  const search = page.getByRole("searchbox", { name: /Molekül ara|Search molecules/i });
  await search.fill("Celecoxib");
  await expect(sceneRoot(page)).toHaveAttribute("data-lod-level", "near");
  await expect(sceneRoot(page)).toHaveAttribute("data-visible-count", "1");
  await expect(page.locator('[data-focused-molecule="molecule:celecoxib"]')).toBeVisible();
  await search.fill("");
  await expect(sceneRoot(page)).toHaveAttribute("data-lod-level", "near");
  expect(await readNumericAttribute(sceneRoot(page), "data-visible-count")).toBeGreaterThan(1);

  expectCleanRuntime(telemetry);
});

test("1920x1080 visual contract captures near Universe and Focus", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });

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
    /Moleküler görünüm açılamadı|The molecular view could not be opened/i,
  );
  await expect(page.getByRole("alert")).toContainText(
    /Yerine başka bir yapı gösterilmedi|No substitute structure was shown/i,
  );
  await expect(
    page.getByRole("group", { name: /Yakınlaştırma|Zoom/i }).getByRole("button").first(),
  ).toBeDisabled();
  expectCleanRuntime(telemetry);
});

test("the four primary product areas remain reachable and dispose the Spatial context", async ({ page }) => {
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await expectExploreScene(page, {
    level: "universe",
    lod: "near",
    minimumVisibleMolecules: 1,
    maximumVisibleMolecules: 40,
  });

  const navigation = page.getByRole("navigation", { name: /Ana navigasyon|Primary navigation/i });
  await expect(navigation.getByRole("button")).toHaveCount(4);
  for (const area of [/Ana Sayfa|Home/i, /Akademi|Academy/i, /Laboratuvar|Lab/i]) {
    const button = navigation.getByRole("button", { name: area, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "page");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("canvas[data-molecular-scene-canvas]")).toHaveCount(0);
  }

  const atlasButton = navigation.getByRole("button", { name: /İlaç Atlası|Drug Atlas/i, exact: true });
  await atlasButton.click();
  await expect(atlasButton).toHaveAttribute("aria-current", "page");
  await page.getByRole("tab", { name: /Mekânsal|Spatial/i }).click();
  await expect(sceneRoot(page)).toHaveAttribute("data-active-webgl-contexts", "1");
  expectCleanRuntime(telemetry);
});
