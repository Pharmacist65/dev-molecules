import { expect, test } from "@playwright/test";

import {
  homeFeaturedCanvas,
  homeFeaturedStage,
  readMolecularIntegritySnapshot,
  relativeVariation,
} from "./v21-3d-integrity-helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  });
});

test("Home featured molecule stays camera and projection stable for three idle seconds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#home", { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'),
  ).toBeVisible({ timeout: 30_000 });

  const stage = homeFeaturedStage(page);
  const canvas = homeFeaturedCanvas(page);
  await expect(stage).toHaveAttribute("data-auto-rotate", "off");
  await expect(canvas).toHaveAttribute("data-atom-selection-enabled", "false");
  await expect(stage.locator('[data-scene-status="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await readMolecularIntegritySnapshot(canvas)).modelWidth)
    .toBeGreaterThan(0);

  const before = await readMolecularIntegritySnapshot(canvas);
  await page.waitForTimeout(3_000);
  const after = await readMolecularIntegritySnapshot(canvas);

  expect(after.cameraRevision - before.cameraRevision).toBe(0);
  expect(after.cameraDistance).toBeCloseTo(before.cameraDistance, 6);
  expect(Math.hypot(after.centerX - before.centerX, after.centerY - before.centerY))
    .toBeLessThanOrEqual(2);
  expect(relativeVariation(before.modelWidth, after.modelWidth)).toBeLessThanOrEqual(0.015);
  expect(relativeVariation(before.modelHeight, after.modelHeight)).toBeLessThanOrEqual(0.015);
  expect(after.clipped).toBe(0);
  expect(after.overlayCollision).toBe(0);

  const horizontalClearance = Math.min(
    after.centerX - after.modelWidth / 2,
    after.cssWidth - (after.centerX + after.modelWidth / 2),
  );
  const verticalClearance = Math.min(
    after.centerY - after.modelHeight / 2,
    after.cssHeight - (after.centerY + after.modelHeight / 2),
  );
  expect(horizontalClearance).toBeGreaterThanOrEqual(after.cssWidth * 0.12);
  expect(verticalClearance).toBeGreaterThanOrEqual(after.cssHeight * 0.12);
  expect(after.bufferWidth).toBeGreaterThanOrEqual(Math.floor(after.cssWidth));
  expect(after.bufferHeight).toBeGreaterThanOrEqual(Math.floor(after.cssHeight));
  expect(after.devicePixelRatio).toBeGreaterThan(0);
});

test("Home click cannot select an atom or invoke an atom raycast", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#home", { waitUntil: "domcontentloaded" });
  const stage = homeFeaturedStage(page);
  const scene = stage.locator('[data-scene-status="ready"]');
  const canvas = homeFeaturedCanvas(page);
  await expect(scene).toBeVisible({ timeout: 30_000 });
  const pickCountBefore = Number(await canvas.getAttribute("data-pick-atom-count"));

  await canvas.click({ position: { x: 160, y: 160 } });

  await expect(scene).toHaveAttribute("data-selected-atom", "");
  await expect(canvas).not.toHaveAttribute("aria-keyshortcuts", /Enter|Space|\[|\]/);
  expect(Number(await canvas.getAttribute("data-pick-atom-count"))).toBe(pickCountBefore);
  await expect(stage.locator("output")).toHaveCount(0);
});

test("Dossier atom selection uses a fixed inspector without changing the view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#drug/propranolol", { waitUntil: "domcontentloaded" });
  const chemistry = page.locator('[data-dossier-chemistry="true"]');
  const viewer = chemistry.locator('[data-molecule-viewer="true"]');
  const canvas = viewer.locator('canvas[data-molecule-viewer-canvas="true"]');
  const inspector = viewer.locator('[data-dossier-atom-inspector="fixed"]');
  const stage = viewer.locator('[data-molecule-viewer-stage="true"]');

  await expect(viewer).toHaveAttribute("data-structure-status", "ready", {
    timeout: 30_000,
  });
  const revisionBefore = Number(await viewer.getAttribute("data-camera-revision"));
  await canvas.focus();
  await canvas.press("]");

  await expect(viewer).toHaveAttribute("data-selected-atom", /.+/);
  expect(Number(await viewer.getAttribute("data-camera-revision"))).toBe(revisionBefore);
  await expect(inspector).toHaveAttribute("data-pointer-events", "none");
  await expect(viewer).toHaveAttribute("data-selected-atom-overlay-collision", "0");
  const [stageBox, inspectorBox] = await Promise.all([
    stage.boundingBox(),
    inspector.boundingBox(),
  ]);
  expect(stageBox).not.toBeNull();
  expect(inspectorBox).not.toBeNull();
  expect(inspectorBox?.y).toBeGreaterThanOrEqual(
    (stageBox?.y ?? 0) + (stageBox?.height ?? 0) - 1,
  );
});

test("focused Center is deterministic across zoom, representation and hydrogen changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#molecule/propranolol", { waitUntil: "domcontentloaded" });
  const scene = page.locator('[data-focus-auto-fit="true"][data-scene-status]').first();
  const canvas = scene.locator('canvas[data-molecular-scene-canvas="true"]');
  await expect(scene).toHaveAttribute("data-scene-status", "ready", { timeout: 30_000 });
  await expect(scene).toHaveAttribute("data-focus-auto-fit", "true");
  const zoom = page.getByRole("group", { name: /Yakınlaştırma|Zoom/i });
  const center = zoom.getByRole("button", { name: /Ortala|Center|Reset/i });

  const zoomAndReset = async (zoomButton: RegExp) => {
    const beforeZoom = Number(await scene.getAttribute("data-camera-revision"));
    await zoom.getByRole("button", { name: zoomButton }).click();
    await expect.poll(async () => Number(await scene.getAttribute("data-camera-revision")))
      .toBeGreaterThan(beforeZoom);
    const beforeReset = Number(await scene.getAttribute("data-camera-revision"));
    await center.click();
    await expect.poll(async () => Number(await scene.getAttribute("data-camera-revision")))
      .toBeGreaterThan(beforeReset);
    return JSON.parse((await canvas.getAttribute("data-camera-state")) ?? "null");
  };

  const firstReset = await zoomAndReset(/Yakınlaştır|Zoom in/i);
  const revisionBeforeVisualToggles = Number(await scene.getAttribute("data-camera-revision"));
  await page.getByRole("button", { name: /Uzay dolgu|Space[- ]filling/i }).click();
  await page.getByRole("button", { name: /^H\s+(?:açık|kapalı|visible|hidden)$/i }).click();
  expect(Number(await scene.getAttribute("data-camera-revision")))
    .toBe(revisionBeforeVisualToggles);

  const secondReset = await zoomAndReset(/Uzaklaştır|Zoom out/i);
  expect(secondReset).toEqual(firstReset);
  await expect(canvas).toHaveAttribute("data-model-clipped", "0");
  await expect(canvas).toHaveAttribute("data-fit-envelope-cache-size", "1");
});
