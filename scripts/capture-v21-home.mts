import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

const VIEWPORT = { width: 1440, height: 900 } as const;
const DEFAULT_BASE_URL = "http://127.0.0.1:3128/";
const CAPTURE_DURATION_SECONDS = 10;

const baseUrl = process.env.V21_CAPTURE_BASE_URL ?? DEFAULT_BASE_URL;
const ffmpegPath = process.env.V21_CAPTURE_FFMPEG ?? "ffmpeg";
const outputDirectory = path.resolve(
  process.env.V21_CAPTURE_OUTPUT_DIR ?? "docs/assets/v21",
);

const outputVideoPath = path.join(
  outputDirectory,
  "home-featured-10s.mp4",
);

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function waitForStableHome(page: Page): Promise<void> {
  await page.locator('[data-home="true"]').waitFor({ timeout: 30_000 });
  await page
    .locator('[data-catalog-status="ready"][data-catalog-records="1552"]')
    .waitFor({ timeout: 30_000 });
  await page
    .locator('[data-home-featured-stage="true"] [data-scene-status="ready"]')
    .waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-home-featured-stage="true"] canvas[data-molecular-scene-canvas="true"]',
    );
    return canvas && Number(canvas.dataset.modelScreenWidth) > 0;
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function screenshot(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: false,
    animations: "disabled",
  });
}

async function transcode(
  rawVideoPath: string,
  captureStartSeconds: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(
      ffmpegPath,
      [
        "-y",
        "-ss",
        captureStartSeconds.toFixed(3),
        "-i",
        rawVideoPath,
        "-an",
        "-vf",
        "fps=30,scale=1440:900:flags=lanczos,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "24",
        "-frames:v",
        String(CAPTURE_DURATION_SECONDS * 30),
        "-movflags",
        "+faststart",
        outputVideoPath,
      ],
      { stdio: "inherit" },
    );
    ffmpeg.once("error", reject);
    ffmpeg.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with status ${code ?? "unknown"}.`));
    });
  });
}

async function capture(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const recordingDirectory = await mkdtemp(
    path.join(tmpdir(), "dev-molecules-v21-home-"),
  );
  try {
    const browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: recordingDirectory, size: VIEWPORT },
      colorScheme: "light",
      locale: "tr-TR",
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      window.localStorage.setItem("dev-molecules:locale", "tr");
      window.localStorage.removeItem("dev-molecules:presentation-mode");
    });

    const page = await context.newPage();
    const video = page.video();
    const recordingStartedAt = Date.now();
    let captureStartedAt = recordingStartedAt;
    try {
      await page.goto(new URL("#home", baseUrl).href, {
        waitUntil: "domcontentloaded",
      });
      await waitForStableHome(page);
      captureStartedAt = Date.now();

      await screenshot(page, "home-featured-idle-start.png");
      await page.waitForTimeout(3_000);
      await screenshot(page, "home-featured-idle-after-3s.png");

      const canvas = page.locator(
        '[data-home-featured-stage="true"] canvas[data-molecular-scene-canvas="true"]',
      );
      const box = await canvas.boundingBox();
      if (!box) throw new Error("Home featured canvas has no visible bounds.");
      await canvas.click({
        position: { x: box.width / 2, y: box.height / 2 },
      });
      await screenshot(page, "home-featured-selected-state.png");

      const elapsed = (Date.now() - captureStartedAt) / 1_000;
      await page.waitForTimeout(
        Math.max(0, (CAPTURE_DURATION_SECONDS - elapsed) * 1_000) + 750,
      );
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }

    const rawVideoPath = await video?.path();
    if (!rawVideoPath) throw new Error("Playwright did not produce a Home video.");
    await transcode(
      rawVideoPath,
      Math.max(0, (captureStartedAt - recordingStartedAt) / 1_000),
    );
  } finally {
    await rm(recordingDirectory, { recursive: true, force: true });
  }
}

await capture();
