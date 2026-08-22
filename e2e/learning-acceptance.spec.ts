import { expect, test, type Page } from "@playwright/test";

import {
  captureAcceptanceScreenshot,
  expectCleanRuntime,
  watchRuntime,
} from "./explore-helpers";

const localeRoot = (page: Page) => page.locator("[data-locale]").first();
const synthesisRoot = (page: Page) => page.locator("[data-synthesis-story]").first();
const nomenclatureRoot = (page: Page) => page.getByTestId("nomenclature-lab");

const expectedChallengeKinds = [
  "order-steps",
  "choose-reaction-class",
  "identify-formed-bond",
  "choose-precursor",
  "find-wrong-intermediate",
  "distinguish-reported-vs-ai",
] as const;

test.use({ locale: "tr-TR" });

async function openLearn(page: Page) {
  const platformNavigation = page.getByRole("navigation", {
    name: /Platform bölümleri|Platform sections/i,
  });
  const modeButtons = platformNavigation.getByRole("button");

  await expect(modeButtons).toHaveCount(5);
  await modeButtons.nth(1).click();
  await expect(modeButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
  return modeButtons;
}

async function switchToEnglish(page: Page) {
  await page.getByRole("button", { name: "Dili İngilizce yap", exact: true }).click();
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

test("TR starts safely, EN persists, and every platform mode keeps an English shell", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });

  await expect(localeRoot(page)).toHaveAttribute("data-locale", "tr");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");

  await openLearn(page);
  await expect(
    page.getByRole("tablist", { name: "Öğrenme alanları", exact: true }),
  ).toBeVisible();
  await expect(synthesisRoot(page)).toHaveAttribute("data-source-reported", "true");
  await expect(
    synthesisRoot(page).locator('[data-smiles-structure="ready"] svg').first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "Turkish Synthesis Theatre");
  await captureAcceptanceScreenshot(page, "learn-synthesis-tr-1440x900.png");

  await switchToEnglish(page);
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("dev-molecules:locale")),
    )
    .toBe("en");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(localeRoot(page)).toHaveAttribute("data-locale", "en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const platformNavigation = page.getByRole("navigation", {
    name: "Platform sections",
  });
  const modeButtons = platformNavigation.getByRole("button");
  const englishModes = [
    { label: "Explore", description: "Molecular universe" },
    { label: "Learn", description: "Synthesis and nomenclature" },
    { label: "Build", description: "Guided workbench" },
    { label: "Teach", description: "Instructor studio" },
    { label: "Discover", description: "Private research space" },
  ] as const;

  await expect(modeButtons).toHaveCount(englishModes.length);
  for (const [index, mode] of englishModes.entries()) {
    const button = modeButtons.nth(index);
    await expect(button).toContainText(mode.label);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(mode.description, { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, `English ${mode.label} mode`);
  }

  await modeButtons.nth(1).click();
  await expect(
    page.getByRole("tablist", { name: "Learning areas", exact: true }),
  ).toBeVisible();
  await expect(
    synthesisRoot(page).locator('[data-smiles-structure="ready"] svg').first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "English Synthesis Theatre");
  await captureAcceptanceScreenshot(page, "learn-synthesis-en-1440x900.png");

  expectCleanRuntime(telemetry);
});

test("Synthesis Theatre exposes three sourced stories, six graded challenges, and final 3D focus", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await switchToEnglish(page);
  await openLearn(page);

  const synthesis = synthesisRoot(page);
  await expect(synthesis).toHaveAttribute("data-source-reported", "true");

  const storyTablist = synthesis.getByRole("tablist", {
    name: "Synthesis stories",
  });
  const storyTabs = storyTablist.getByRole("tab");
  await expect(storyTabs).toHaveCount(3);

  const visitedStoryIds = new Set<string>();
  for (let index = 0; index < 3; index += 1) {
    await storyTabs.nth(index).click();
    await expect(storyTabs.nth(index)).toHaveAttribute("aria-selected", "true");
    await expect(synthesis).toHaveAttribute("data-source-reported", "true");
    await expect(
      synthesis.locator('[data-smiles-structure="ready"] svg').first(),
    ).toBeVisible();

    const storyId = await synthesis.getAttribute("data-synthesis-story");
    expect(storyId).toBeTruthy();
    if (storyId) visitedStoryIds.add(storyId);

    const routeDetails = synthesis.locator("details").first();
    if ((await routeDetails.getAttribute("open")) === null) {
      await routeDetails.locator("summary").click();
    }
    await expect(routeDetails).toHaveAttribute("open", "");
    const primarySource = routeDetails
      .locator('a[href^="https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/"]')
      .first();
    await expect(primarySource).toBeVisible();
    await expect(primarySource).toHaveAttribute("target", "_blank");
    await expect(routeDetails.getByText("Source locator", { exact: true })).toBeVisible();
  }
  expect(visitedStoryIds.size).toBe(3);

  const stepButtons = synthesis.locator("aside button[aria-pressed]");
  await expect(stepButtons).toHaveCount(2);
  await expect(stepButtons.nth(0)).toHaveAttribute("aria-pressed", "true");
  await synthesis.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(stepButtons.nth(1)).toHaveAttribute("aria-pressed", "true");

  const challengeTablist = page.getByRole("tablist", {
    name: "Choose a challenge",
  });
  const challengeTabs = challengeTablist.getByRole("tab");
  const challengePanel = page.locator("[data-challenge-kind]").first();
  await expect(challengeTabs).toHaveCount(expectedChallengeKinds.length);

  for (const [index, kind] of expectedChallengeKinds.entries()) {
    await challengeTabs.nth(index).click();
    await expect(challengeTabs.nth(index)).toHaveAttribute("aria-selected", "true");
    await expect(challengePanel).toHaveAttribute("data-challenge-kind", kind);
  }

  await challengeTabs.nth(0).click();
  await challengePanel.getByRole("button", { name: "Check order", exact: true }).click();
  await expect(challengePanel.locator('output[data-result="incorrect"]')).toBeVisible();

  await challengeTabs.nth(1).click();
  await expect(challengePanel).toHaveAttribute(
    "data-challenge-kind",
    "choose-reaction-class",
  );
  await challengePanel.getByRole("group").getByRole("button").first().click();
  await challengePanel.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(challengePanel.locator('output[data-result="correct"]')).toBeVisible();

  await synthesis
    .getByRole("button", { name: "Open final product in 3D", exact: true })
    .click();
  await expect(page).toHaveURL(/#molecule\//);
  await expect(page.locator('[data-explore-level="focus"]')).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]').first()).toBeVisible();

  expectCleanRuntime(telemetry);
});

test("Nomenclature Lab exposes ten topics and explains both incorrect and correct decisions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const telemetry = watchRuntime(page);
  await page.goto("/#universe", { waitUntil: "domcontentloaded" });
  await openLearn(page);
  await page
    .getByRole("tab", { name: "İsimlendirme Laboratuvarı", exact: true })
    .click();

  const lab = nomenclatureRoot(page);
  await expect(lab).toBeVisible();
  const topics = lab.locator('[data-testid^="nomenclature-topic-"]');
  await expect(topics).toHaveCount(10);
  await expectNoHorizontalOverflow(page, "Turkish Nomenclature Lab");
  await captureAcceptanceScreenshot(page, "learn-nomenclature-tr-1920x1080.png");

  await switchToEnglish(page);
  await expect(lab).toBeVisible();
  await expectNoHorizontalOverflow(page, "English Nomenclature Lab");
  await captureAcceptanceScreenshot(page, "learn-nomenclature-en-1920x1080.png");

  const visibleInteractionLabels = (await topics.locator("small").allTextContents())
    .join(" ")
    .replace(/\s+/g, " ");
  for (const expectedLabel of [
    "Parent-chain selection",
    "Locant assignment",
    "Functional-group identification",
    "Group and suffix priority",
    "Stereochemical prefix",
    "Complete-name construction",
  ]) {
    expect(visibleInteractionLabels).toContain(expectedLabel);
  }

  for (let index = 0; index < 10; index += 1) {
    await topics.nth(index).click();
    await expect(topics.nth(index)).toHaveAttribute("aria-current", "step");
  }

  await topics.nth(0).click();
  const answerOptions = lab.locator("fieldset button");
  await expect(answerOptions).toHaveCount(3);

  await answerOptions.nth(0).click();
  await lab.getByTestId("nomenclature-check").click();
  const incorrectFeedback = lab.getByTestId("nomenclature-feedback");
  await expect(incorrectFeedback).toHaveAttribute("data-state", "incorrect");
  expect(await incorrectFeedback.locator("p").count()).toBeGreaterThanOrEqual(3);

  await incorrectFeedback
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await answerOptions.nth(1).click();
  await lab.getByTestId("nomenclature-check").click();
  const correctFeedback = lab.getByTestId("nomenclature-feedback");
  await expect(correctFeedback).toHaveAttribute("data-state", "correct");
  expect(await correctFeedback.locator("p").count()).toBeGreaterThanOrEqual(3);
  await expect(lab.getByTestId("nomenclature-next")).toBeVisible();

  await lab.getByTestId("nomenclature-next").click();
  await expect(topics.nth(0)).toHaveAttribute("data-complete", "true");
  await expect(topics.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(lab.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const serialized = window.localStorage.getItem(
          "dev-molecules:nomenclature-progress",
        );
        return serialized ? JSON.parse(serialized) : null;
      }),
    )
    .toEqual({
      version: 1,
      currentTopicId: "topic:functional-groups",
      completedExerciseIds: ["nomenclature:parent-chain:2-methylpentane"],
      attempts: 2,
      correctAttempts: 1,
    });

  await page.reload({ waitUntil: "domcontentloaded" });
  const restoredModeButtons = await openLearn(page);
  await page
    .getByRole("tab", { name: "Nomenclature Lab", exact: true })
    .click();
  await expect(nomenclatureRoot(page)).toBeVisible();
  const restoredTopics = nomenclatureRoot(page).locator(
    '[data-testid^="nomenclature-topic-"]',
  );
  await expect(restoredTopics.nth(0)).toHaveAttribute("data-complete", "true");
  await expect(restoredTopics.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(nomenclatureRoot(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "10",
  );

  await nomenclatureRoot(page).locator("fieldset button").nth(2).click();
  await nomenclatureRoot(page).getByTestId("nomenclature-check").click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const serialized = window.localStorage.getItem(
          "dev-molecules:nomenclature-progress",
        );
        return serialized ? JSON.parse(serialized) : null;
      }),
    )
    .toEqual({
      version: 1,
      currentTopicId: "topic:functional-groups",
      completedExerciseIds: ["nomenclature:parent-chain:2-methylpentane"],
      attempts: 3,
      correctAttempts: 1,
    });

  await restoredModeButtons.nth(3).click();
  const restoredSummary = page.getByText("Nomenclature learning summary", {
    exact: true,
  });
  await expect(restoredSummary).toBeVisible();
  await expect(restoredSummary.locator("../..")).toContainText("10%");

  expectCleanRuntime(telemetry);
});
