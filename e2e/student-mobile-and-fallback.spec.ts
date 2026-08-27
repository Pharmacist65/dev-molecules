import { expect, test, type Page } from "@playwright/test";

import {
  captureAcceptanceScreenshot,
  expectCleanRuntime,
  watchRuntime,
} from "./explore-helpers";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1);
}

test.describe("student mobile experience", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("dev-molecules:locale", "tr");
      window.localStorage.setItem("dev-molecules:presentation-mode", "student");
    });
  });

  test("keeps Explore's molecular scene in the first viewport behind a compact lens drawer", async ({ page }) => {
    const telemetry = watchRuntime(page);
    await page.goto("/#universe", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
      .toBeVisible();

    const scene = page.locator('[data-active-webgl-contexts="1"]').first();
    await expect(scene).toHaveAttribute("data-scene-status", "ready");
    await expect.poll(async () => Number(await scene.getAttribute("data-scene-sample-count")))
      .toBeGreaterThanOrEqual(4);
    const mobileSampleCount = Number(await scene.getAttribute("data-scene-sample-count"));
    expect(mobileSampleCount).toBeLessThanOrEqual(6);
    await expect(scene).toHaveAttribute(
      "data-visible-molecule-count",
      String(mobileSampleCount),
    );
    const sceneBox = await scene.boundingBox();
    expect(sceneBox, "the mobile molecular scene must have layout dimensions").not.toBeNull();
    if (sceneBox) {
      expect(sceneBox.y, "the scene must start inside the initial 844px viewport").toBeLessThan(844);
      const visibleHeight = Math.min(844, sceneBox.y + sceneBox.height) - Math.max(0, sceneBox.y);
      expect(visibleHeight, "a meaningful part of the scene must be visible immediately").toBeGreaterThan(140);
    }

    const lensDisclosure = page.getByRole("button", { name: /Kümelenme merceği|Clustering lens/i });
    await expect(lensDisclosure).toHaveAttribute("aria-expanded", "false");
    await lensDisclosure.click();
    await expect(lensDisclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("region", { name: /Kümelenme merceği|Clustering lens/i }))
      .toBeVisible();
    await page.getByRole("button", { name: /Yapısal benzerlik|Structural similarity/i }).click();
    await expect(lensDisclosure).toHaveAttribute("aria-expanded", "false");
    await expectNoHorizontalOverflow(page);
    await captureAcceptanceScreenshot(page, "student-explore-universe-390x844.png");

    await page.goto("/#molecule/propranolol", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-explore-level="focus"]')).toBeVisible();
    await expect(page.locator("#molecule-focus-inspector")).toBeVisible();
    await page
      .locator("#molecule-focus-inspector")
      .getByRole("button", { name: /Bilgi panelini kapat|Close information panel/i })
      .click();
    await expect(page.locator("#molecule-focus-inspector")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await captureAcceptanceScreenshot(page, "student-explore-focus-390x844.png");
    expectCleanRuntime(telemetry);
  });

  test("keeps the eight-module Academy and Synthesis Atlas usable at 390px", async ({ page }) => {
    const telemetry = watchRuntime(page);
    await page.goto("/#academy", { waitUntil: "domcontentloaded" });
    const academy = page.locator('[data-academy-learning-map="eight-modules"]');
    await expect(academy).toBeVisible();
    await expect(academy.locator("[data-academy-module]")).toHaveCount(8);
    await expectNoHorizontalOverflow(page);
    await captureAcceptanceScreenshot(page, "student-learning-map-390x844.png");

    await page.goto("/#academy/synthesis/propranolol/overview", {
      waitUntil: "domcontentloaded",
    });
    const synthesis = page.locator('[data-synthesis-academy="phase-6"]');
    await expect(synthesis).toBeVisible();
    await synthesis.getByRole("button", { name: /Sentez kanıtını aç|Open synthesis evidence/i }).click();
    await expect(synthesis.locator('[data-synthesis-atlas-coverage-only="true"]')).toBeVisible();
    await expect(synthesis.locator("[data-dragging][data-route-direction]")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await captureAcceptanceScreenshot(page, "student-synthesis-atlas-390x844.png");
    expectCleanRuntime(telemetry);
  });
});

test("catalog delivery failure is explicit and never masquerades as the complete drug universe", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.setItem("dev-molecules:presentation-mode", "student");
  });
  await page.route("**/catalog/manifest.json", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });

  const app = page.locator('[data-catalog-status="fallback"]').first();
  await expect(app).toBeVisible();
  await expect(app).toHaveAttribute("data-catalog-records", "15");
  const alert = page.locator('[data-catalog-fallback="true"]');
  await expect(alert).toContainText(/Yapı indeksi kullanılamıyor|Structure index unavailable/i);
  await expect(alert).toContainText(/15/);
  await expect(page.locator('[data-indexed-search="disabled"]')).toBeVisible();

  await page.getByRole("button", { name: /Ayarlar|Settings/i }).click();
  await page.getByRole("button", { name: /Uzman görünümü|Expert view/i }).click();
  await expect(alert.locator("code")).toHaveCount(0);
  await expect(alert).not.toContainText(/503|Catalog manifest request failed/i);
});
