import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export interface ClusterSpatialQuality {
  readonly labelCount: number;
  readonly moleculeBoundsCount: number;
  readonly overlap: number;
  readonly clipped: number;
  readonly labelCollision: number;
  readonly moleculeOcclusion: number;
  readonly readabilityViolationCount: number;
  readonly minimumLabelHeight: number | null;
  readonly minimumStrongFontSize: number | null;
  readonly overlappingPairs: readonly string[];
  readonly clippedLabels: readonly string[];
  readonly collidingLabelPairs: readonly string[];
  readonly moleculeOcclusionPairs: readonly string[];
  readonly readabilityViolations: readonly string[];
}

export interface HorizontalOverflowQuality {
  readonly viewportWidth: number;
  readonly documentScrollWidth: number;
  readonly bodyScrollWidth: number;
  readonly overflowPx: number;
}

export interface UniverseCameraProxy {
  readonly cameraState: string;
  readonly visibleMoleculeIds: readonly string[];
  readonly cameraRevision: number;
}

interface RectangleSnapshot {
  readonly name: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

interface TextReadabilitySnapshot {
  readonly name: string;
  readonly fontSize: number;
}

const MINIMUM_LABEL_HEIGHT_PX = 26;
const MINIMUM_STRONG_FONT_SIZE_PX = 14;

const NEAR_CLUSTER_LIST_NAME =
  /Temsilî yapı bölgeleri|Representative structure regions/i;

export const exploreRoot = (page: Page) =>
  page.locator("[data-explore-level]").first();

export const exploreScene = (page: Page) =>
  page.locator("[data-active-webgl-contexts]").first();

export const exploreCanvas = (page: Page) =>
  page.locator("canvas[data-molecular-scene-canvas]").first();

export const nearClusterList = (page: Page) =>
  page.getByRole("list", { name: NEAR_CLUSTER_LIST_NAME });

export async function waitForExploreReady(page: Page) {
  const app = page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]');
  await expect(app).toBeVisible();
  await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");
  await expect(exploreScene(page)).toHaveAttribute("data-active-webgl-contexts", "1");
  await expect(exploreScene(page)).toHaveAttribute(
    "data-scene-status",
    /^(?:ready|partial)$/,
  );
  await expect(exploreCanvas(page)).toHaveCount(1);
  await expect
    .poll(() => readNumericAttribute(exploreScene(page), "data-visible-count"), {
      message: "the initial Explore scene must finish loading its bounded sample",
    })
    .toBeGreaterThan(0);
}

export async function readNumericAttribute(locator: Locator, attribute: string) {
  const value = await locator.getAttribute(attribute);
  expect(value, `${attribute} must expose a finite numeric value`).toMatch(
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,
  );
  return Number(value);
}

export async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({
    animations: "disabled",
    fullPage: false,
    path,
  });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

function rectanglesOverlap(left: RectangleSnapshot, right: RectangleSnapshot) {
  const horizontal = Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const vertical = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
  return horizontal > 1 && vertical > 1;
}

function countRectangleCollisions(rectangles: readonly RectangleSnapshot[]) {
  const pairs: string[] = [];
  for (let left = 0; left < rectangles.length; left += 1) {
    for (let right = left + 1; right < rectangles.length; right += 1) {
      const leftRectangle = rectangles[left];
      const rightRectangle = rectangles[right];
      if (
        leftRectangle &&
        rightRectangle &&
        rectanglesOverlap(leftRectangle, rightRectangle)
      ) {
        pairs.push(`${leftRectangle.name} <> ${rightRectangle.name}`);
      }
    }
  }
  return pairs;
}

function countCrossRectangleCollisions(
  leftRectangles: readonly RectangleSnapshot[],
  rightRectangles: readonly RectangleSnapshot[],
) {
  const pairs: string[] = [];
  for (const leftRectangle of leftRectangles) {
    for (const rightRectangle of rightRectangles) {
      if (rectanglesOverlap(leftRectangle, rightRectangle)) {
        pairs.push(`${leftRectangle.name} <> ${rightRectangle.name}`);
      }
    }
  }
  return pairs;
}

async function snapshotRectangles(locator: Locator): Promise<RectangleSnapshot[]> {
  return locator.evaluateAll((elements) =>
    elements.flatMap((element, index) => {
      const rectangle = element.getBoundingClientRect();
      if (rectangle.width <= 0 || rectangle.height <= 0) return [];
      const name =
        element.getAttribute("aria-label") ??
        element.textContent?.replace(/\s+/g, " ").trim() ??
        `item-${index}`;
      return [{
        name,
        left: rectangle.left,
        top: rectangle.top,
        right: rectangle.right,
        bottom: rectangle.bottom,
        width: rectangle.width,
        height: rectangle.height,
      }];
    }),
  );
}

async function snapshotTextReadability(
  locator: Locator,
): Promise<TextReadabilitySnapshot[]> {
  return locator.evaluateAll((elements) =>
    elements.flatMap((element, index) => {
      const fontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
      if (!Number.isFinite(fontSize)) return [];
      const name =
        element.closest("button")?.getAttribute("aria-label") ??
        element.textContent?.replace(/\s+/g, " ").trim() ??
        `label-${index}`;
      return [{ name, fontSize }];
    }),
  );
}

async function snapshotMoleculeRectangles(
  canvas: Locator,
): Promise<RectangleSnapshot[]> {
  await expect(canvas).toHaveAttribute("data-visible-molecule-bounds", /^\[/);
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const rawBounds = element.dataset.visibleMoleculeBounds;
    if (!rawBounds) {
      throw new Error("the Explore canvas did not expose molecule screen bounds");
    }

    const parsedBounds: unknown = JSON.parse(rawBounds);
    if (!Array.isArray(parsedBounds)) {
      throw new Error("the Explore molecule screen bounds must be a JSON array");
    }

    const canvasRectangle = element.getBoundingClientRect();
    return parsedBounds.map((candidate, index) => {
      if (typeof candidate !== "object" || candidate === null) {
        throw new Error(`molecule screen bound ${index} must be an object`);
      }
      const bound = candidate as Record<string, unknown>;
      const moleculeId = bound.moleculeId;
      const values = [bound.x, bound.y, bound.radiusX, bound.radiusY];
      if (
        typeof moleculeId !== "string" ||
        moleculeId.length === 0 ||
        !values.every((value) => typeof value === "number" && Number.isFinite(value))
      ) {
        throw new Error(`molecule screen bound ${index} is malformed`);
      }

      const [x, y, radiusX, radiusY] = values as number[];
      if (radiusX < 0 || radiusY < 0) {
        throw new Error(`molecule screen bound ${moleculeId} has a negative radius`);
      }
      const left = canvasRectangle.left + ((x - radiusX) / 100) * canvasRectangle.width;
      const right = canvasRectangle.left + ((x + radiusX) / 100) * canvasRectangle.width;
      const top = canvasRectangle.top + ((y - radiusY) / 100) * canvasRectangle.height;
      const bottom = canvasRectangle.top + ((y + radiusY) / 100) * canvasRectangle.height;
      return {
        name: moleculeId,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
      };
    });
  });
}

/** Measures HTML cluster controls against the real camera-projected SDF bounds. */
export async function measureClusterSpatialQuality(
  page: Page,
): Promise<ClusterSpatialQuality> {
  const scene = exploreScene(page);
  const canvas = exploreCanvas(page);
  const list = nearClusterList(page);
  await expect(list).toBeVisible();

  const [sceneBox, controls, labels, labelTypography, moleculeRectangles] = await Promise.all([
    scene.boundingBox(),
    snapshotRectangles(list.getByRole("button")),
    snapshotRectangles(list.locator("button strong")),
    snapshotTextReadability(list.locator("button strong")),
    snapshotMoleculeRectangles(canvas),
  ]);
  expect(sceneBox, "the Explore scene must expose layout bounds").not.toBeNull();

  const overlappingPairs = countRectangleCollisions(controls);
  const collidingLabelPairs = countRectangleCollisions(labels);
  const moleculeOcclusionPairs = countCrossRectangleCollisions(
    controls,
    moleculeRectangles,
  );
  const clippedLabels = sceneBox
    ? controls
        .filter(
          (rectangle) =>
            rectangle.left < sceneBox.x - 1 ||
            rectangle.top < sceneBox.y - 1 ||
            rectangle.right > sceneBox.x + sceneBox.width + 1 ||
            rectangle.bottom > sceneBox.y + sceneBox.height + 1,
        )
        .map((rectangle) => rectangle.name)
    : controls.map((rectangle) => rectangle.name);
  const readabilityViolations = [
    ...controls
      .filter((rectangle) => rectangle.height < MINIMUM_LABEL_HEIGHT_PX)
      .map(
        (rectangle) =>
          `${rectangle.name}: ${rectangle.height.toFixed(2)}px button height`,
      ),
    ...labelTypography
      .filter((label) => label.fontSize < MINIMUM_STRONG_FONT_SIZE_PX)
      .map((label) => `${label.name}: ${label.fontSize.toFixed(2)}px strong font`),
  ];

  return {
    labelCount: controls.length,
    moleculeBoundsCount: moleculeRectangles.length,
    overlap: overlappingPairs.length,
    clipped: clippedLabels.length,
    labelCollision: collidingLabelPairs.length,
    moleculeOcclusion: moleculeOcclusionPairs.length,
    readabilityViolationCount: readabilityViolations.length,
    minimumLabelHeight:
      controls.length > 0
        ? Math.min(...controls.map((rectangle) => rectangle.height))
        : null,
    minimumStrongFontSize:
      labelTypography.length > 0
        ? Math.min(...labelTypography.map((label) => label.fontSize))
        : null,
    overlappingPairs,
    clippedLabels,
    collidingLabelPairs,
    moleculeOcclusionPairs,
    readabilityViolations,
  };
}

export async function measureHorizontalOverflow(
  page: Page,
): Promise<HorizontalOverflowQuality> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    return {
      viewportWidth,
      documentScrollWidth,
      bodyScrollWidth,
      overflowPx: Math.max(0, documentScrollWidth, bodyScrollWidth) - viewportWidth,
    };
  });
}

async function findOpenCanvasPoint(canvas: Locator) {
  const point = await canvas.evaluate((element: HTMLCanvasElement) => {
    const bounds = element.getBoundingClientRect();
    const candidates = [
      { x: bounds.width * 0.1, y: bounds.height * 0.1 },
      { x: bounds.width * 0.9, y: bounds.height * 0.1 },
      { x: bounds.width * 0.1, y: bounds.height * 0.9 },
      { x: bounds.width * 0.9, y: bounds.height * 0.9 },
      { x: bounds.width * 0.25, y: bounds.height * 0.75 },
      { x: bounds.width * 0.75, y: bounds.height * 0.75 },
      { x: bounds.width * 0.5, y: bounds.height * 0.5 },
    ];
    return candidates.find(({ x, y }) =>
      document.elementFromPoint(bounds.left + x, bounds.top + y) === element,
    ) ?? null;
  });
  expect(point, "the Explore canvas must retain an unobstructed input surface").not.toBeNull();
  return point;
}

export async function dragUniverseCanvas(
  page: Page,
  delta: { readonly x: number; readonly y: number },
) {
  const canvas = exploreCanvas(page);
  const [box, point] = await Promise.all([canvas.boundingBox(), findOpenCanvasPoint(canvas)]);
  expect(box, "the Explore canvas must expose layout bounds").not.toBeNull();
  if (!box || !point) return;

  const start = { x: box.x + point.x, y: box.y + point.y };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 3 });
  await page.mouse.up();
}

export async function zoomUniverseCanvas(page: Page, deltaY = -120) {
  const canvas = exploreCanvas(page);
  const point = await findOpenCanvasPoint(canvas);
  if (!point) return;
  await canvas.hover({ position: point });
  await page.mouse.wheel(0, deltaY);
}

export async function readUniverseCameraProxy(page: Page): Promise<UniverseCameraProxy> {
  const canvas = exploreCanvas(page);
  await expect(canvas).toHaveAttribute("data-camera-state", /^\{/);
  const cameraState = (await canvas.getAttribute("data-camera-state")) ?? "";
  const visibleMoleculeIds = ((await exploreScene(page).getAttribute("data-visible-molecules")) ?? "")
    .split(",")
    .filter(Boolean);
  return {
    cameraState,
    visibleMoleculeIds,
    cameraRevision: await readNumericAttribute(exploreScene(page), "data-camera-revision"),
  };
}

export async function waitForUniverseCameraSettle(page: Page) {
  await expect(page.locator('[data-level="universe"][data-flight="idle"]')).toBeVisible();
  // Viewport membership is deliberately debounced after camera input.
  await page.waitForTimeout(750);
}
