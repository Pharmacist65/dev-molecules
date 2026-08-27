import { expect, test, type Locator, type Page } from "@playwright/test";

interface RenderedBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

interface MoleculeVisualEnvelope {
  readonly count: number;
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}

const boxesIntersect = (left: RenderedBox, right: RenderedBox) =>
  left.left < right.right - 1 &&
  left.right > right.left + 1 &&
  left.top < right.bottom - 1 &&
  left.bottom > right.top + 1;

async function readVisibleBoxes(locator: Locator): Promise<readonly RenderedBox[]> {
  return locator.evaluateAll((elements) => elements.flatMap((element) => {
    if (!(element instanceof HTMLElement)) return [];
    const style = window.getComputedStyle(element);
    const box = element.getBoundingClientRect();
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      box.width <= 0 ||
      box.height <= 0
    ) return [];
    return [{
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
    }];
  }));
}

async function measureRenderedSpatialLabelCollisions(universe: Locator) {
  const [labels, obstacles] = await Promise.all([
    readVisibleBoxes(universe.locator("[data-spatial-label]")),
    readVisibleBoxes(universe.locator("[data-spatial-label-obstacle]")),
  ]);
  let collisions = 0;
  labels.forEach((label, index) => {
    for (let otherIndex = index + 1; otherIndex < labels.length; otherIndex += 1) {
      if (boxesIntersect(label, labels[otherIndex]!)) collisions += 1;
    }
    for (const obstacle of obstacles) {
      if (boxesIntersect(label, obstacle)) collisions += 1;
    }
  });
  return { collisions, labelCount: labels.length, obstacleCount: obstacles.length };
}

async function readMoleculeVisualEnvelope(canvas: Locator): Promise<MoleculeVisualEnvelope> {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const bounds = JSON.parse(element.dataset.visibleMoleculeBounds ?? "[]") as Array<{
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
    }>;
    if (bounds.length === 0) {
      return {
        count: 0,
        minimumX: 0,
        maximumX: 0,
        minimumY: 0,
        maximumY: 0,
        widthPercent: 0,
        heightPercent: 0,
      };
    }
    const minimumX = Math.min(...bounds.map((bound) => bound.x - bound.radiusX));
    const maximumX = Math.max(...bounds.map((bound) => bound.x + bound.radiusX));
    const minimumY = Math.min(...bounds.map((bound) => bound.y - bound.radiusY));
    const maximumY = Math.max(...bounds.map((bound) => bound.y + bound.radiusY));
    return {
      count: bounds.length,
      minimumX,
      maximumX,
      minimumY,
      maximumY,
      widthPercent: maximumX - minimumX,
      heightPercent: maximumY - minimumY,
    };
  });
}

async function expectMeasuredSpatialIntegrity(
  universe: Locator,
  scene: Locator,
  canvas: Locator,
  canvasBox: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>,
  name: string,
  requireImmersiveEnvelope: boolean,
) {
  const measuredLabels = await measureRenderedSpatialLabelCollisions(universe);
  expect(measuredLabels.labelCount, `${name}: rendered labels`).toBeGreaterThan(0);
  expect(measuredLabels.obstacleCount, `${name}: rendered label obstacles`).toBeGreaterThan(0);
  expect(measuredLabels.collisions, `${name}: independently measured label collisions`).toBe(0);
  await expect(scene).toHaveAttribute("data-label-collision-source", "rendered-dom");
  await expect.poll(async () => Number(await scene.getAttribute("data-label-collision-count")))
    .toBe(measuredLabels.collisions);

  await expect.poll(async () => (await readMoleculeVisualEnvelope(canvas)).count)
    .toBeGreaterThan(0);
  const envelope = await readMoleculeVisualEnvelope(canvas);
  const visibleCount = Number(await scene.getAttribute("data-visible-count"));
  expect(envelope.count, `${name}: projected molecule bounds`).toBe(visibleCount);
  expect(envelope.minimumX, `${name}: visual envelope left edge`).toBeGreaterThanOrEqual(0);
  expect(envelope.maximumX, `${name}: visual envelope right edge`).toBeLessThanOrEqual(100);
  expect(envelope.minimumY, `${name}: visual envelope top edge`).toBeGreaterThanOrEqual(0);
  expect(envelope.maximumY, `${name}: visual envelope bottom edge`).toBeLessThanOrEqual(100);
  if (requireImmersiveEnvelope) {
    expect(envelope.widthPercent, `${name}: visual envelope width`).toBeGreaterThanOrEqual(35);
    expect(envelope.heightPercent, `${name}: visual envelope height`).toBeGreaterThanOrEqual(35);
  }

  // Derive the union from each projected molecule, then compare it with the
  // renderer's aggregate telemetry. This guards against a plausible but empty
  // canvas while avoiding trust in the aggregate attribute itself.
  const [aggregateWidth, aggregateHeight] = await Promise.all([
    canvas.getAttribute("data-model-screen-width"),
    canvas.getAttribute("data-model-screen-height"),
  ]);
  const measuredWidth = envelope.widthPercent / 100 * canvasBox.width;
  const measuredHeight = envelope.heightPercent / 100 * canvasBox.height;
  expect(Math.abs(Number(aggregateWidth) - measuredWidth), `${name}: aggregate width telemetry`)
    .toBeLessThanOrEqual(4);
  expect(Math.abs(Number(aggregateHeight) - measuredHeight), `${name}: aggregate height telemetry`)
    .toBeLessThanOrEqual(4);
}

async function waitForImmersiveAtlas(page: Page) {
  await expect(
    page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'),
  ).toBeVisible({ timeout: 30_000 });
  const spatial = page.locator(
    '[data-atlas-spatial="true"][data-spatial-variant="immersive"]',
  );
  const universe = spatial.locator(
    '[data-surface-variant="immersive"]',
  );
  const scene = universe.locator('[data-active-webgl-contexts]').first();
  await expect(spatial).toBeVisible();
  await expect(universe).toHaveAttribute("data-explore-level", "universe");
  await expect(scene).toHaveAttribute("data-active-webgl-contexts", "1");
  await expect(scene).toHaveAttribute("data-scene-status", /^(?:ready|partial)$/);
  await expect.poll(async () => Number(await scene.getAttribute("data-visible-count")))
    .toBeGreaterThan(0);
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  ));
  return { spatial, universe, scene };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.setItem("dev-molecules:presentation-mode", "student");
  });
});

test("immersive Spatial meets desktop, zoom-equivalent and mobile geometry contracts", async ({
  page,
}) => {
  const cases = [
    { name: "1440x900", width: 1440, height: 900, desktop: true },
    { name: "1920x1080", width: 1920, height: 1080, desktop: true },
    { name: "125-percent", width: 1152, height: 720, desktop: true },
    { name: "150-percent", width: 960, height: 600, desktop: true },
    { name: "390-mobile", width: 390, height: 844, desktop: false },
  ] as const;

  for (const qualityCase of cases) {
    await page.setViewportSize({ width: qualityCase.width, height: qualityCase.height });
    await page.goto("./#atlas/spatial", { waitUntil: "domcontentloaded" });
    const { spatial, universe, scene } = await waitForImmersiveAtlas(page);
    const stage = universe.locator('div[data-level="universe"][data-flight]');
    const canvas = universe.locator("canvas[data-molecular-scene-canvas]");
    const [stageBox, canvasBox, searchBox, lensBox, zoomBox, representativeBox] = await Promise.all([
      stage.boundingBox(),
      canvas.boundingBox(),
      universe.getByRole("searchbox").boundingBox(),
      universe.getByRole("button", { name: /Kümelenme merceği|Clustering lens/i }).boundingBox(),
      universe.getByRole("button", { name: /Yakınlaştır|Zoom in/i }).boundingBox(),
      universe.locator('[data-representative-scope="true"]').boundingBox(),
    ]);
    expect(stageBox, `${qualityCase.name}: stage box`).not.toBeNull();
    expect(canvasBox, `${qualityCase.name}: canvas box`).not.toBeNull();
    expect(searchBox, `${qualityCase.name}: floating search`).not.toBeNull();
    expect(lensBox, `${qualityCase.name}: floating lens`).not.toBeNull();
    expect(zoomBox, `${qualityCase.name}: floating zoom`).not.toBeNull();
    expect(representativeBox, `${qualityCase.name}: representative scope`).not.toBeNull();
    if (qualityCase.desktop) {
      // CSS viewport units can resolve to a fractional device pixel which the
      // browser exposes rounded down by <1px in getBoundingClientRect().
      expect(((stageBox?.height ?? 0) + 1) / qualityCase.height).toBeGreaterThanOrEqual(0.78);
    }
    expect(
      searchBox ? searchBox.y + searchBox.height : Infinity,
    ).toBeLessThanOrEqual((canvasBox?.y ?? 0) + 1);
    expect(
      lensBox ? lensBox.y + lensBox.height : Infinity,
    ).toBeLessThanOrEqual((canvasBox?.y ?? 0) + 1);
    expect(
      canvasBox ? canvasBox.y + canvasBox.height : Infinity,
    ).toBeLessThanOrEqual((zoomBox?.y ?? 0) + 1);
    expect(
      canvasBox ? canvasBox.y + canvasBox.height : Infinity,
    ).toBeLessThanOrEqual((representativeBox?.y ?? 0) + 1);
    expect(await canvas.count()).toBe(1);
    expect(Number(await scene.getAttribute("data-visible-count"))).toBeGreaterThanOrEqual(4);
    expect(Number(await scene.getAttribute("data-visible-count"))).toBeLessThanOrEqual(6);
    await expect(scene).toHaveAttribute("data-overlap-count", "0");
    await expect(scene).toHaveAttribute("data-clipped-molecule-count", "0");
    await expectMeasuredSpatialIntegrity(
      universe,
      scene,
      canvas,
      canvasBox!,
      qualityCase.name,
      qualityCase.desktop,
    );
    await expect(spatial.locator('[data-universe-summary="true"]')).toHaveCount(0);
    await expect(spatial).not.toContainText(/Aday kayıtlar\s*53|Candidate records\s*53/i);

    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    );
    expect(overflow, `${qualityCase.name}: horizontal overflow`).toBeLessThanOrEqual(0);
  }
});

test("near LOD expands to 8–12 structures and molecule activation opens the right drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./#atlas/spatial", { waitUntil: "domcontentloaded" });
  const { universe, scene } = await waitForImmersiveAtlas(page);
  const canvas = universe.locator("canvas[data-molecular-scene-canvas]");
  await expect(scene).toHaveAttribute("data-lod-level", "far");
  await universe.getByRole("button", { name: /Yakınlaştır|Zoom in/i }).click();
  await expect(scene).toHaveAttribute("data-lod-level", "near");
  await expect.poll(async () => Number(await scene.getAttribute("data-visible-count")))
    .toBeGreaterThanOrEqual(8);
  expect(Number(await scene.getAttribute("data-visible-count"))).toBeLessThanOrEqual(12);
  await expect(scene).toHaveAttribute("data-overlap-count", "0");
  await expect(scene).toHaveAttribute("data-clipped-molecule-count", "0");
  const nearCanvasBox = await canvas.boundingBox();
  expect(nearCanvasBox, "near LOD canvas box").not.toBeNull();
  await expectMeasuredSpatialIntegrity(
    universe,
    scene,
    canvas,
    nearCanvasBox!,
    "near LOD",
    true,
  );

  const target = await canvas.evaluate((element: HTMLCanvasElement) => {
    const bounds = JSON.parse(element.dataset.visibleMoleculeBounds ?? "[]") as Array<{
      x: number;
      y: number;
    }>;
    return bounds[0] ?? null;
  });
  expect(target).not.toBeNull();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (target && canvasBox) {
    await page.mouse.click(
      canvasBox.x + (target.x / 100) * canvasBox.width,
      canvasBox.y + (target.y / 100) * canvasBox.height,
    );
  }

  await expect(universe).toHaveAttribute("data-explore-level", "focus");
  const inspector = universe.locator("#molecule-focus-inspector");
  await expect(inspector).toBeVisible();
  const focusedCanvas = universe.locator("canvas[data-molecular-scene-canvas]");
  await expect(focusedCanvas).toHaveCount(1);
  await expect(universe.locator('[data-active-webgl-contexts]').first())
    .toHaveAttribute("data-active-webgl-contexts", "1");
  const [focusedCanvasBox, inspectorBox] = await Promise.all([
    focusedCanvas.boundingBox(),
    inspector.boundingBox(),
  ]);
  expect(
    focusedCanvasBox ? focusedCanvasBox.x + focusedCanvasBox.width : Infinity,
  ).toBeLessThanOrEqual(
    (inspectorBox?.x ?? 0) + 1,
  );
});
