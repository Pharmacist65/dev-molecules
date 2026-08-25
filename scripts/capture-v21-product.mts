import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium, expect, type Browser, type Locator, type Page } from "@playwright/test";

const VIEWPORT = { width: 1440, height: 900 } as const;
const DEFAULT_BASE_URL = "http://127.0.0.1:3128/";
const BASIC_RECORD_SLUG =
  "beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n";

const baseUrl = process.env.V21_CAPTURE_BASE_URL ?? DEFAULT_BASE_URL;
const outputDirectory = path.resolve(
  process.env.V21_CAPTURE_OUTPUT_DIR ?? "docs/assets/v21",
);

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function expectCatalogReady(page: Page): Promise<void> {
  await expect(
    page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'),
  ).toBeVisible({ timeout: 30_000 });
}

async function settleFrame(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function positionAt(locator: Locator, top = 104): Promise<void> {
  await locator.evaluate((element, targetTop) => {
    const absoluteTop = window.scrollY + element.getBoundingClientRect().top;
    window.scrollTo({
      top: Math.max(0, absoluteTop - targetTop),
      behavior: "auto",
    });
  }, top);
}

async function captureViewport(
  page: Page,
  filename: string,
  focus?: Locator,
  top = 104,
): Promise<void> {
  if (focus) await positionAt(focus, top);
  await settleFrame(page);
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: false,
    animations: "disabled",
  });
}

async function openRoute(page: Page, hash: string): Promise<void> {
  await page.goto(new URL(hash, baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
}

async function captureBasicRecord(page: Page): Promise<void> {
  await openRoute(page, `#drug/${BASIC_RECORD_SLUG}`);
  await expectCatalogReady(page);
  const record = page.locator(
    '[data-basic-molecular-record="true"][data-pubchem-cid="222284"]',
  );
  await expect(record).toBeVisible({ timeout: 30_000 });
  await expect(
    record.locator('[data-basic-record-structure="2d"] canvas'),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    record.locator(
      '[data-basic-record-structure="3d"] [data-structure-status="ready"]',
    ),
  ).toBeVisible({ timeout: 60_000 });
  await captureViewport(
    page,
    "beta-sitosterol-basic-record.png",
    record.locator("#basic-record-structures"),
    112,
  );
}

async function waitForPropranololDossier(page: Page): Promise<Locator> {
  await expectCatalogReady(page);
  const dossier = page.locator('[data-molecule-id="molecule:propranolol"]');
  await expect(dossier).toBeVisible({ timeout: 30_000 });
  await expect(dossier.locator('[data-dossier-availability="upfront"]')).toBeVisible();
  await expect(
    dossier.locator('[data-dossier-chemistry="true"] [data-structure-status="ready"]'),
  ).toBeVisible({ timeout: 60_000 });
  return dossier;
}

async function captureCuratedDossier(page: Page): Promise<void> {
  await openRoute(page, "#drug/propranolol");
  const dossier = await waitForPropranololDossier(page);
  await captureViewport(page, "propranolol-curated-dossier.png", dossier, 82);
}

async function captureCompactAdme(page: Page): Promise<void> {
  await openRoute(page, "#drug/propranolol");
  const dossier = await waitForPropranololDossier(page);
  const adme = dossier.locator('[data-empty-coverage="adme"]');
  await expect(adme).toHaveCount(1);
  await expect(adme.locator('[data-adme-context-only="true"]')).toHaveCount(1);
  await expect(adme.locator("[data-phase]")).toHaveCount(0);
  await captureViewport(page, "empty-adme-compact.png", adme, 88);
}

async function captureStudentSpatial(page: Page): Promise<void> {
  await openRoute(page, "#atlas/spatial");
  await expectCatalogReady(page);
  const spatial = page.locator('[data-atlas-spatial="true"]');
  const student = spatial.locator('[data-presentation-mode="student"]');
  const scene = student.locator("[data-active-webgl-contexts]").first();
  await expect(spatial).toBeVisible({ timeout: 30_000 });
  await expect(student).toBeVisible();
  await expect(scene).toHaveAttribute("data-scene-status", /^(?:ready|partial)$/, {
    timeout: 60_000,
  });
  await expect
    .poll(async () => Number(await scene.getAttribute("data-visible-count")))
    .toBeGreaterThan(0);

  const lensDisclosure = student
    .getByRole("button", { name: /Kümelenme merceği/i })
    .first();
  await lensDisclosure.click();
  await expect(student.locator("[data-lens-announcement]")).toBeVisible();
  await captureViewport(page, "atlas-spatial-student.png", spatial, 88);
}

async function captureKetcher(page: Page): Promise<void> {
  await openRoute(page, "#lab");
  const editor = page.locator(
    '[data-ketcher-editor="standalone"][data-ketcher-ready="true"]',
  );
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-ready="true"]')).toContainText("Editör hazır");
  await page.waitForTimeout(500);
  await captureViewport(
    page,
    "lab-ketcher.png",
    page.locator("#ketcher-workspace-heading"),
    112,
  );
}

async function capture(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: "light",
    locale: "tr-TR",
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.setItem("dev-molecules:presentation-mode", "student");
  });
  const page = await context.newPage();
  try {
    await captureBasicRecord(page);
    await captureCuratedDossier(page);
    await captureCompactAdme(page);
    await captureStudentSpatial(page);
    await captureKetcher(page);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

await capture();
