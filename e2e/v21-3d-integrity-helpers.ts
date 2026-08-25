import { expect, type Locator, type Page } from "@playwright/test";

export interface MolecularIntegritySnapshot {
  readonly cameraRevision: number;
  readonly cameraDistance: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly modelWidth: number;
  readonly modelHeight: number;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly bufferWidth: number;
  readonly bufferHeight: number;
  readonly devicePixelRatio: number;
  readonly clipped: number;
  readonly overlayCollision: number;
}

export const homeFeaturedStage = (page: Page) =>
  page.locator('[data-home-featured-stage="true"]');

export const homeFeaturedCanvas = (page: Page) =>
  homeFeaturedStage(page).locator('canvas[data-molecular-scene-canvas="true"]');

async function numberAttribute(locator: Locator, attribute: string) {
  const raw = await locator.getAttribute(attribute);
  expect(raw, `${attribute} must be numeric`).toMatch(
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,
  );
  return Number(raw);
}

export async function readMolecularIntegritySnapshot(
  canvas: Locator,
): Promise<MolecularIntegritySnapshot> {
  const [
    cameraRevision,
    cameraDistance,
    centerX,
    centerY,
    modelWidth,
    modelHeight,
    cssWidth,
    cssHeight,
    bufferWidth,
    bufferHeight,
    devicePixelRatio,
    clipped,
    overlayCollision,
  ] = await Promise.all([
    numberAttribute(canvas, "data-camera-revision"),
    numberAttribute(canvas, "data-camera-distance"),
    numberAttribute(canvas, "data-model-screen-center-x"),
    numberAttribute(canvas, "data-model-screen-center-y"),
    numberAttribute(canvas, "data-model-screen-width"),
    numberAttribute(canvas, "data-model-screen-height"),
    numberAttribute(canvas, "data-canvas-css-width"),
    numberAttribute(canvas, "data-canvas-css-height"),
    numberAttribute(canvas, "data-canvas-buffer-width"),
    numberAttribute(canvas, "data-canvas-buffer-height"),
    numberAttribute(canvas, "data-device-pixel-ratio"),
    numberAttribute(canvas, "data-model-clipped"),
    numberAttribute(canvas, "data-selected-atom-overlay-collision"),
  ]);
  return {
    cameraRevision,
    cameraDistance,
    centerX,
    centerY,
    modelWidth,
    modelHeight,
    cssWidth,
    cssHeight,
    bufferWidth,
    bufferHeight,
    devicePixelRatio,
    clipped,
    overlayCollision,
  };
}

export function relativeVariation(before: number, after: number) {
  return Math.abs(after - before) / Math.max(0.001, before);
}
