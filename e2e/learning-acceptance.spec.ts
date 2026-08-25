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

test("Synthesis Atlas exposes three molecules and the six-step reported Carvedilol route", async ({
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
  await synthesisHub.getByRole("button", { name: "Open route lesson" }).first().click();

  const synthesis = synthesisRoot(page);
  await expect(synthesis).toBeVisible();
  await expect(synthesis).toHaveAttribute("data-route-kind", "reported");
  await expect(
    synthesis.getByText("Teaching view · no operational protocol", { exact: true }),
  ).toHaveCount(0);

  const moleculeNavigation = synthesis.getByRole("navigation", {
    name: "Synthesis Atlas",
  });
  const moleculeButtons = moleculeNavigation.getByRole("button");
  await expect(moleculeButtons).toHaveCount(3);
  await expect(moleculeButtons.nth(0)).toContainText("Propranolol");
  await expect(moleculeButtons.nth(1)).toContainText("Atenolol");
  await expect(moleculeButtons.nth(2)).toContainText("Carvedilol");

  await moleculeNavigation.getByRole("button", { name: /Carvedilol/ }).click();
  await expect(synthesis).toHaveAttribute(
    "data-synthesis-atlas",
    "synthesis-atlas-route:carvedilol-reported",
  );
  await expect(synthesis).toHaveAttribute("data-route-step-count", "6");
  await expect(synthesis.locator("[data-source-gate]")).toHaveAttribute(
    "data-source-gate",
    "source-supported",
  );
  await expect(
    synthesis.getByRole("heading", {
      name: "Carvedilol: six-transformation full-core route",
      exact: true,
    }),
  ).toBeVisible();

  const graph = synthesis.locator("[data-dragging][data-route-direction]");
  await expect(graph).toHaveAttribute("data-route-direction", "forward");
  await synthesis.getByRole("button", { name: "Retrosynthesis", exact: true }).click();
  await expect(graph).toHaveAttribute("data-route-direction", "retro");
  await synthesis.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(graph).toHaveAttribute("data-route-direction", "forward");

  const zoomOutput = synthesis.locator("output").first();
  await expect(zoomOutput).toHaveText("54%");
  await synthesis.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(zoomOutput).toHaveText("64%");
  await synthesis.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(zoomOutput).toHaveText("54%");

  // Step 1 is source-backed but deliberately has no published mechanism layer.
  await synthesis.getByRole("button", { name: /01.*Carbonyl–hydrazine condensation/ }).click();
  await expect(graph).toHaveAttribute("data-atlas-level", "step");
  await expect(synthesis.locator("[data-active-step]")).toHaveAttribute(
    "data-active-step",
    "synthesis-atlas-step:carvedilol-rep-01",
  );
  await expect(
    synthesis.getByRole("button", { name: "Inspect mechanism", exact: true }),
  ).toBeDisabled();
  await expect(
    synthesis.getByRole("tab", { name: "Mechanism", exact: true }),
  ).toBeDisabled();

  // Step 4 has an explicit source anchor and a curated, evidence-gated mechanism.
  await synthesis.getByRole("button", { name: /04.*Phenolic O-alkylation/ }).click();
  await expect(synthesis.locator("[data-active-step]")).toHaveAttribute(
    "data-active-step",
    "synthesis-atlas-step:carvedilol-rep-04",
  );
  const inspectMechanism = synthesis.getByRole("button", {
    name: "Inspect mechanism",
    exact: true,
  });
  await expect(inspectMechanism).toBeEnabled();
  await inspectMechanism.click();
  await expect(graph).toHaveAttribute("data-atlas-level", "mechanism");
  await expect(synthesis.locator("[data-mechanism-layer]")).toBeVisible();
  await expect(synthesis.getByText("Curated teaching interpretation", { exact: true })).toBeVisible();
  await expect(synthesis.getByText("Electron flow", { exact: true })).toBeVisible();

  const sourceDrawer = synthesis.locator("details[data-source-drawer]");
  await expect(sourceDrawer).not.toHaveAttribute("open", "");
  await sourceDrawer.locator("summary").click();
  await expect(sourceDrawer).toHaveAttribute("open", "");
  const sourceLinks = sourceDrawer.locator('a[href^="https://"]');
  await expect(sourceLinks).toHaveCount(2);
  for (const link of await sourceLinks.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("href", /^https:\/\/(?:image-ppubs\.uspto\.gov|patentimages\.storage\.googleapis\.com)\//);
  }

  const challengeLab = synthesis.locator("[data-synthesis-challenges]");
  const challengeTabs = challengeLab.getByRole("tab");
  await expect(challengeTabs).toHaveCount(2);
  await challengeTabs.nth(1).click();
  const challenge = challengeLab.locator('[data-challenge-kind="missing-intermediate"]');
  await expect(challenge).toBeVisible();
  await challenge.getByRole("radio", { name: "Propranolol", exact: true }).click();
  await challenge.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(challenge.locator('[data-result="incorrect"]')).toBeVisible();
  await challenge.getByRole("button", { name: "Try again", exact: true }).click();
  await challenge.getByRole("radio", { name: "4-Hydroxycarbazole", exact: true }).click();
  await challenge.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(challenge.locator('[data-result="correct"]')).toBeVisible();

  await expectNoHorizontalOverflow(page, "English Synthesis Atlas at 1920x1080");
  await captureAcceptanceScreenshot(
    page,
    "learn-synthesis-atlas-carvedilol-en-1920x1080.png",
    { timeout: 120_000 },
  );

  // Selected foundational transformations use atom-indexed arrow endpoints;
  // no generic decorative curve substitutes for missing atom mapping.
  await moleculeNavigation.getByRole("button", { name: /Propranolol/ }).click();
  await synthesis
    .getByRole("button", { name: "Foundational learning route", exact: true })
    .click();
  await synthesis.getByRole("button", { name: /01.*Phenolic O-alkylation/ }).click();
  await synthesis
    .getByRole("button", { name: "Inspect mechanism", exact: true })
    .click();
  const mappedMechanism = synthesis.locator('[data-electron-mapping="complete"]');
  await expect(mappedMechanism).toBeVisible();
  await expect(mappedMechanism.locator("svg[aria-label='Electron flow anchored to the actual 2D atoms'] > path")).toHaveCount(2);

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
