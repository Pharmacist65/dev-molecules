import { expect, test, type Page } from "@playwright/test";

import {
  captureAcceptanceScreenshot,
  expectCleanRuntime,
  watchRuntime,
} from "./explore-helpers";

const localeRoot = (page: Page) => page.locator("[data-locale]").first();
const synthesisRoot = (page: Page) => page.locator("[data-synthesis-atlas]").first();
const academyRoot = (page: Page) => page.getByTestId("nomenclature-academy");
const longAcceptanceTimeout =
  process.env.PLAYWRIGHT_PERFORMANCE_PROFILE === "shared-software-renderer"
    ? 240_000
    : 60_000;

test.use({ locale: "tr-TR" });

async function openLearn(page: Page) {
  const platformNavigation = page.getByRole("navigation", {
    name: /Ana navigasyon|Primary navigation/i,
  });
  const modeButtons = platformNavigation.getByRole("button");

  await expect(modeButtons).toHaveCount(4);
  const academyButton = platformNavigation.getByRole("button", {
    name: /Akademi|Academy/i,
    exact: true,
  });
  await academyButton.click();
  await expect(academyButton).toHaveAttribute("aria-current", "page");
  return modeButtons;
}

async function switchToEnglish(page: Page) {
  if (await localeRoot(page).getAttribute("data-locale") !== "en") {
    await page.getByRole("button", { name: "Dili İngilizce yap", exact: true }).click();
  }
  await expect(localeRoot(page)).toHaveAttribute("data-locale", "en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollX: window.scrollX,
  }));
  expect(
    metrics.scrollWidth,
    `${context}: document width must fit the viewport`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollX, `${context}: viewport must remain left-aligned`).toBe(0);
}

test("Learn opens on a Turkish student map and keeps the English choice after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });

  await expect(localeRoot(page)).toHaveAttribute("data-locale", "tr");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await openLearn(page);

  const learningMap = page.locator('[data-academy-learning-map="eight-modules"]');
  await expect(
    learningMap.getByRole("heading", {
      name: "Yapıyı okumaktan kanıtı savunmaya.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(learningMap.locator("[data-academy-module]")).toHaveCount(8);
  for (const title of [
    "Yapının Dili",
    "Organik Nomenklatür",
    "Farmasötik Nomenklatür",
    "Farmakoloji",
    "ADME",
    "Reaksiyon Mekanizmaları",
    "Sentez Atlası",
    "İlaç İnceleme Projesi",
  ]) {
    await expect(learningMap.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page, "Turkish Learn map at 1440x900");
  await captureAcceptanceScreenshot(page, "learn-map-tr-1440x900.png");

  await switchToEnglish(page);
  await expect(
    learningMap.getByRole("heading", {
      name: "From reading structure to defending evidence.",
      exact: true,
    }),
  ).toBeVisible();
  for (const title of [
    "Structure Language",
    "Organic Nomenclature",
    "Pharmaceutical Nomenclature",
    "Pharmacology",
    "ADME",
    "Reaction Mechanisms",
    "Synthesis Atlas",
    "Drug Review Project",
  ]) {
    await expect(learningMap.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page, "English Learn map at 1440x900");

  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("dev-molecules:locale")))
    .toBe("en");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(localeRoot(page)).toHaveAttribute("data-locale", "en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await openLearn(page);
  await expect(page.locator('[data-academy-learning-map="eight-modules"]')).toBeVisible();

  expectCleanRuntime(telemetry);
});

test("Synthesis Atlas exposes source-supported drafts without upgrading their review state", async ({
  page,
}) => {
  test.setTimeout(longAcceptanceTimeout);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await switchToEnglish(page);
  await page.goto("/#academy/synthesis/propranolol/overview", {
    waitUntil: "domcontentloaded",
  });

  const synthesisHub = page.locator('[data-synthesis-academy="phase-6"]');
  await expect(synthesisHub.locator('[data-synthesis-public-coverage-only="true"]')).toBeVisible();
  await expect(synthesisHub.locator('[data-synthesis-catalog-navigator="complete-index"]'))
    .toHaveAttribute("data-catalog-record-count", "1552");
  await expect(synthesisHub).toContainText("Public-alpha drafts stay permanently labelled pending here");

  await synthesisHub.getByRole("button", { name: "Open synthesis evidence" }).click();
  const synthesis = synthesisRoot(page);
  await expect(synthesis).toBeVisible();
  await expect(synthesis).toHaveAttribute("data-synthesis-atlas", "public-alpha-draft");
  await expect(synthesis).toHaveAttribute("data-synthesis-atlas-coverage-only", "false");
  await expect(synthesis.locator('[data-public-alpha-synthesis="source-supported-draft"]')).toBeVisible();
  await expect(synthesis).toContainText("SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING");
  await expect(synthesis).toContainText("Exact source locator");
  await expect(synthesis.getByRole("link", { name: /Open ORD record/ }).first()).toBeVisible();
  await expect(synthesis.locator("[data-dragging][data-route-direction]")).toHaveCount(0);
  await expect(synthesis.locator("[data-active-step]")).toHaveCount(0);
  await expect(synthesis.locator("[data-synthesis-target-product]")).toHaveCount(0);
  await expect(synthesis.locator("[data-synthesis-catalog-coverage]")).toBeVisible();
  await expect(synthesis).toContainText("Accuracy, completeness, applicability, and reproducibility have not been expert-verified.");

  await expectNoHorizontalOverflow(page, "English synthesis coverage at 1920x1080");
  await captureAcceptanceScreenshot(
    page,
    "learn-synthesis-coverage-propranolol-en-1920x1080.png",
    { timeout: 120_000 },
  );
  expectCleanRuntime(telemetry);
});

test("Nomenclature Academy provides eight sections, twenty-two exercises, SVG feedback, and persisted progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const telemetry = watchRuntime(page);
  await page.goto("/#academy/nomenclature/pharmaceutical", {
    waitUntil: "domcontentloaded",
  });
  await switchToEnglish(page);

  const academy = academyRoot(page);
  await expect(academy).toBeVisible();
  const sections = academy.locator('[data-testid^="academy-section-"]');
  await expect(sections).toHaveCount(8);
  await expect(academy.getByText("Exercise 1 / 22", { exact: true })).toBeVisible();
  await expect(academy.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(academy.locator("figure svg[role=group]")).toBeVisible();

  // A real SVG bond target drives both the wrong and correct feedback paths.
  await academy
    .getByRole("button", { name: "Bond b1", exact: true })
    .dispatchEvent("click");
  await academy.getByTestId("academy-check-answer").click();
  const feedback = academy.getByTestId("academy-feedback");
  await expect(feedback).toHaveAttribute("data-state", "incorrect");
  await expect(feedback.locator("article")).toHaveCount(3);
  await feedback.getByRole("button", { name: "Try again", exact: true }).click();

  await academy
    .getByRole("button", { name: "Bond b2", exact: true })
    .dispatchEvent("click");
  await academy.getByTestId("academy-check-answer").click();
  await expect(feedback).toHaveAttribute("data-state", "correct");
  await expect(feedback.locator("article")).toHaveCount(3);
  await expect(academy.getByTestId("academy-next")).toBeVisible();
  await academy.getByTestId("academy-next").click();

  await expect(academy.getByText("Exercise 2 / 22", { exact: true })).toBeVisible();
  await expect(academy.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const serialized = window.localStorage.getItem(
          "dev-molecules:nomenclature-academy-progress",
        );
        return serialized ? JSON.parse(serialized) : null;
      }),
    )
    .toEqual({
      version: 1,
      currentExerciseId: "academy:implicit-hydrogen:ethanol-oxygen",
      completedExerciseIds: ["academy:bond:propene"],
      attempts: 2,
      correctAttempts: 1,
    });

  await expectNoHorizontalOverflow(page, "English Nomenclature Academy at 1920x1080");
  await captureAcceptanceScreenshot(page, "learn-nomenclature-academy-en-1920x1080.png");

  await page.reload({ waitUntil: "domcontentloaded" });
  const restoredAcademy = academyRoot(page);
  await expect(restoredAcademy.getByText("Exercise 2 / 22", { exact: true })).toBeVisible();
  await expect(restoredAcademy.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "5",
  );
  await expect(restoredAcademy.getByTestId("academy-section-1")).toContainText("1/3");

  expectCleanRuntime(telemetry);
});
