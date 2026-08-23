import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  chromium,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

const VIEWPORT = { width: 1440, height: 900 } as const;
const DEFAULT_BASE_URL = "http://127.0.0.1:4317/dev-molecules/";
const OUTPUT_FILENAME = "dev-molecules-v2-walkthrough.mp4";

const baseUrl = process.env.DEMO_BASE_URL ?? DEFAULT_BASE_URL;
const outputDirectory = path.resolve(
  process.env.DEMO_OUTPUT_DIR ?? "docs/assets/demo",
);
const outputPath = path.join(outputDirectory, OUTPUT_FILENAME);

const pause = (page: Page, milliseconds: number) =>
  page.waitForTimeout(milliseconds);

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function installDemoOverlay(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #dev-molecules-demo-chapter {
        position: fixed;
        right: 24px;
        bottom: 22px;
        z-index: 2147483646;
        max-width: 390px;
        padding: 11px 15px;
        border: 1px solid rgb(255 255 255 / 18%);
        border-radius: 999px;
        background: rgb(15 21 25 / 88%);
        box-shadow: 0 14px 36px rgb(0 0 0 / 20%);
        color: #fff;
        font: 650 12px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
        letter-spacing: .08em;
        text-transform: uppercase;
        pointer-events: none;
        backdrop-filter: blur(12px);
      }
      #dev-molecules-demo-pointer {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 2147483647;
        width: 22px;
        height: 22px;
        margin: -11px 0 0 -11px;
        border: 2px solid #fff;
        border-radius: 50%;
        background: rgb(179 255 82 / 52%);
        box-shadow: 0 0 0 5px rgb(179 255 82 / 16%);
        opacity: 0;
        transform: translate3d(0, 0, 0);
        transition: opacity 180ms ease, transform 420ms cubic-bezier(.2,.8,.2,1);
        pointer-events: none;
      }
    `,
  });

  await page.evaluate(() => {
    const chapter = document.createElement("div");
    chapter.id = "dev-molecules-demo-chapter";
    chapter.textContent = "Dev Molecules 2.0";
    document.body.appendChild(chapter);

    const pointer = document.createElement("div");
    pointer.id = "dev-molecules-demo-pointer";
    document.body.appendChild(pointer);
  });
}

async function setChapter(page: Page, label: string): Promise<void> {
  await page.evaluate((nextLabel) => {
    const chapter = document.querySelector<HTMLElement>(
      "#dev-molecules-demo-chapter",
    );
    if (chapter) chapter.textContent = nextLabel;
  }, label);
}

async function movePointerTo(page: Page, target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("Demo target has no visible bounding box.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(
    ({ pointerX, pointerY }) => {
      const pointer = document.querySelector<HTMLElement>(
        "#dev-molecules-demo-pointer",
      );
      if (!pointer) return;
      pointer.style.opacity = "1";
      pointer.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    },
    { pointerX: x, pointerY: y },
  );
  await page.mouse.move(x, y, { steps: 12 });
  await pause(page, 500);
}

async function clickDemoTarget(page: Page, target: Locator): Promise<void> {
  await movePointerTo(page, target);
  await target.click();
  await pause(page, 650);
}

async function scrollTo(
  page: Page,
  top: number,
  duration = 1_250,
): Promise<void> {
  await page.evaluate((destination) => {
    window.scrollTo({ top: destination, behavior: "smooth" });
  }, top);
  await pause(page, duration);
}

async function transcode(rawVideoPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-y",
        "-i",
        rawVideoPath,
        "-t",
        "89",
        "-an",
        "-vf",
        "fps=30,scale=1440:900:flags=lanczos,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "27",
        "-movflags",
        "+faststart",
        outputPath,
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
    path.join(tmpdir(), "dev-molecules-v2-demo-"),
  );
  try {
    const browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: recordingDirectory, size: VIEWPORT },
      colorScheme: "light",
      locale: "en-US",
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() => {
      window.localStorage.setItem("dev-molecules:locale", "en");
      window.localStorage.setItem("dev-molecules:presentation-mode", "student");
      window.localStorage.removeItem("dev-molecules:completed-missions");
    });

    const page = await context.newPage();
    page.setDefaultTimeout(45_000);
    const video = page.video();

    try {
      await page.goto(`${baseUrl}#home`, { waitUntil: "networkidle" });
      await page.locator('[data-home="true"]').waitFor();
      await page.locator('[data-catalog-records="1552"]').waitFor();
      await page
        .locator('[data-home="true"] [data-scene-status="ready"]')
        .waitFor({ timeout: 60_000 });
      await installDemoOverlay(page);
      await setChapter(page, "01 · Home · Living Molecular Atlas");
      await pause(page, 4_000);

      const openAtlas = page.getByRole("button", {
        name: /Open the Drug Atlas/i,
      });
      await clickDemoTarget(page, openAtlas);
      await page.locator('[data-atlas-view="browse"]').waitFor();
      await scrollTo(page, 0, 400);
      await setChapter(page, "02 · Atlas · 1,552 searchable records");
      await pause(page, 4_000);

      const spatialTab = page.getByRole("tab", { name: /Spatial/i });
      await clickDemoTarget(page, spatialTab);
      await page.locator('[data-atlas-spatial="true"]').waitFor();
      await page
        .locator('[data-atlas-spatial="true"] [data-scene-status="ready"]')
        .first()
        .waitFor({ timeout: 60_000 });
      await page
        .locator('[data-atlas-spatial="true"] [data-molecular-scene-canvas="true"]')
        .scrollIntoViewIfNeeded();
      await setChapter(page, "03 · Spatial · bounded representative 3D sample");
      await pause(page, 6_000);

      const homeButton = page
        .locator("header button")
        .filter({ hasText: "DEV MOLECULES" })
        .first();
      await clickDemoTarget(page, homeButton);
      await page.locator('[data-home="true"]').waitFor();
      await scrollTo(page, 0, 500);
      const featuredDrug = page.getByRole("button", {
        name: /Inspect a molecule/i,
      });
      await movePointerTo(page, featuredDrug);
      await pause(page, 1_300);
      await clickDemoTarget(page, featuredDrug);
      await page.locator('[data-dossier-mode="story"]').waitFor();
      await scrollTo(page, 0, 400);
      await setChapter(page, "04 · Drug Dossier · Story Mode");
      await pause(page, 4_000);
      await page
        .locator('[data-dossier-mode="story"] [data-pharmacology-coverage="unavailable"]')
        .scrollIntoViewIfNeeded();
      await setChapter(page, "04 · Dossier · unavailable evidence remains visible");
      await pause(page, 3_000);

      const referenceMode = page.getByRole("button", {
        name: "Reference Mode",
      });
      await clickDemoTarget(page, referenceMode);
      await page.locator('[data-reference-tab="overview"]').waitFor();
      await setChapter(page, "05 · Reference Mode · coverage stays explicit");
      await pause(page, 2_400);
      const pharmacologyTab = page.getByRole("button", {
        name: "Pharmacology",
        exact: true,
      });
      await clickDemoTarget(page, pharmacologyTab);
      await page.locator('[data-reference-tab="pharmacology"]').waitFor();
      await page
        .locator('[data-reference-tab="pharmacology"] [data-pharmacology-coverage="unavailable"]')
        .scrollIntoViewIfNeeded();
      await setChapter(page, "05 · Pharmacology · no unsourced target claims");
      await pause(page, 3_200);
      const admeTab = page.getByRole("button", { name: "ADME", exact: true });
      await clickDemoTarget(page, admeTab);
      await page.locator('[data-reference-tab="adme"]').waitFor();
      await page
        .locator('[data-reference-tab="adme"] [data-adme-context-only="true"]')
        .scrollIntoViewIfNeeded();
      await setChapter(page, "05 · ADME · route-specific evidence and gaps");
      await pause(page, 4_000);

      const academyNav = page.getByRole("button", {
        name: "Academy",
        exact: true,
      });
      await clickDemoTarget(page, academyNav);
      await page.locator('[data-academy-learning-map="eight-modules"]').waitFor();
      await scrollTo(page, 0, 450);
      await setChapter(page, "06 · Academy · eight-module learning map");
      await pause(page, 4_500);

      const synthesisModule = page.locator(
        '[data-academy-module="synthesis-atlas"]',
      );
      await synthesisModule.scrollIntoViewIfNeeded();
      await setChapter(page, "07 · Academy · source-bounded synthesis");
      await pause(page, 3_000);
      await clickDemoTarget(
        page,
        synthesisModule.getByRole("button").last(),
      );
      await page
        .locator('[data-academy-active-module="synthesis-atlas"]')
        .waitFor();
      await pause(page, 2_800);
      await clickDemoTarget(
        page,
        page.getByRole("button", { name: /Open Synthesis Atlas/i }),
      );
      await page.locator('[data-synthesis-academy="phase-6"]').waitFor();
      await scrollTo(page, 0, 450);
      await setChapter(page, "08 · Synthesis · 3 of 12 source-gated drugs");
      await pause(page, 5_400);
      await scrollTo(page, 520, 1_250);
      await pause(page, 2_000);

      const openRoute = page.getByRole("button", { name: /Open route/i }).first();
      await clickDemoTarget(page, openRoute);
      await page.locator("[data-synthesis-atlas]").waitFor();
      await page
        .getByLabel("Zoomable and draggable synthesis route graph")
        .scrollIntoViewIfNeeded();
      await setChapter(page, "09 · Route Lab · reported and teaching layers separated");
      await pause(page, 6_000);

      const labNav = page.getByRole("button", { name: "Lab", exact: true });
      await clickDemoTarget(page, labNav);
      await page.locator('[data-lab-area="builder"]').waitFor();
      await scrollTo(page, 0, 450);
      await page.locator('[data-ketcher-ready="true"]').waitFor({
        timeout: 90_000,
      });
      await setChapter(page, "10 · Lab · private-by-default on-device editor");
      await pause(page, 2_000);
      await page.locator('[data-ketcher-editor="standalone"]').scrollIntoViewIfNeeded();
      await pause(page, 5_200);
    } finally {
      await context.close();
      await browser.close();
    }

    if (!video) throw new Error("Playwright did not initialize video capture.");
    const rawVideoPath = await video.path();
    await transcode(rawVideoPath);
    process.stdout.write(`${outputPath}\n`);
  } finally {
    await rm(recordingDirectory, { recursive: true, force: true });
  }
}

await capture();
