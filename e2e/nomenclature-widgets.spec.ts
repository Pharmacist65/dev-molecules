import { expect, test, type Page } from "@playwright/test";

import {
  captureAcceptanceScreenshot,
  expectCleanRuntime,
  watchRuntime,
} from "./explore-helpers";

async function openAcademy(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
  });
  await page.goto("/#academy/nomenclature/organic", { waitUntil: "domcontentloaded" });
  const localeRoot = page.locator("[data-locale]").first();
  if (await localeRoot.getAttribute("data-locale") !== "tr") {
    await page.getByRole("button", { name: /Switch language to Turkish|Dili Türkçe yap/i }).click();
    await expect(localeRoot).toHaveAttribute("data-locale", "tr");
  }
  await expect(page.getByTestId("nomenclature-academy")).toBeVisible();
}

async function selectExercise(page: Page, id: string) {
  const academy = page.getByTestId("nomenclature-academy");
  await academy.getByTestId("academy-exercise-select").selectOption(id);
  await expect(academy.getByTestId("academy-exercise")).toHaveAttribute("data-exercise-id", id);
  return academy;
}

async function clickGraphTarget(page: Page, name: string) {
  await page.getByTestId("nomenclature-academy").getByRole("button", { name, exact: true }).dispatchEvent("click");
}

async function expectCorrect(page: Page) {
  const academy = page.getByTestId("nomenclature-academy");
  await academy.getByTestId("academy-check-answer").click();
  await expect(academy.getByTestId("academy-feedback")).toHaveAttribute("data-state", "correct");
}

test("Academy widgets manipulate real structures and curated scoring paths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const telemetry = watchRuntime(page);
  await openAcademy(page);

  const academy = page.getByTestId("nomenclature-academy");
  await expect(academy.getByTestId("academy-exercise-select").locator("option")).toHaveCount(22);

  await selectExercise(page, "academy:implicit-hydrogen:ethanol-oxygen");
  const numeric = academy.getByTestId("academy-widget-numeric-stepper");
  await numeric.getByRole("button", { name: "Artır", exact: true }).click();
  await expect(numeric.locator("output")).toHaveText("1");
  await expectCorrect(page);

  await selectExercise(page, "academy:valence:ethanol-c-o");
  await clickGraphTarget(page, "Bağ b2");
  const bondEditor = academy.getByTestId("academy-widget-bond-order-editor");
  await bondEditor.getByRole("button", { name: /Tek bağ/ }).click();
  await expectCorrect(page);

  await selectExercise(page, "academy:numbering:2-methylpentane");
  for (const atomId of ["c1", "c2", "c3", "c4", "c5"]) {
    await clickGraphTarget(page, `C ${atomId}`);
  }
  await expect(academy.locator('[data-placement-label="1"]')).toBeAttached();
  await expectCorrect(page);

  await selectExercise(page, "academy:aromatic-marking:pyridine");
  for (const [element, atomId] of [["N", "n1"], ["C", "c2"], ["C", "c3"], ["C", "c4"], ["C", "c5"], ["C", "c6"]]) {
    await clickGraphTarget(page, `${element} ${atomId}`);
  }
  await expectCorrect(page);

  await selectExercise(page, "academy:ring-system:spiro");
  const topology = academy.getByRole("group", { name: "2B yapı seçenekleri" });
  await expect(topology.getByRole("button")).toHaveCount(3);
  await topology.getByRole("button", { name: /Spiro/ }).click();
  await expectCorrect(page);

  await selectExercise(page, "academy:cip:r-lactic-acid");
  const ranking = academy.getByTestId("academy-widget-priority-ranking");
  for (let index = 0; index < 3; index += 1) {
    await ranking.getByRole("button", { name: /Yukarı taşı: –OH/ }).click();
  }
  for (let index = 0; index < 2; index += 1) {
    await ranking.getByRole("button", { name: /Yukarı taşı: –C\(=O\)OH/ }).click();
  }
  await ranking.getByRole("button", { name: /Yukarı taşı: –CH₃/ }).click();
  await expectCorrect(page);

  await selectExercise(page, "academy:builder:propan-2-ol");
  const builder = academy.getByTestId("academy-widget-structure-builder");
  await builder.getByRole("button", { name: "Propan", exact: true }).click();
  await builder.getByRole("button", { name: "Hidroksi (–OH)", exact: true }).click();
  await builder.getByRole("button", { name: "Karbon 2", exact: true }).click();
  await expect(builder.getByRole("figure", { name: /Propan-2-ol/ })).toBeVisible();
  await expectCorrect(page);

  await selectExercise(page, "academy:stereo:r-lactic-acid");
  await clickGraphTarget(page, "C stereocenter");
  const rs = academy.getByTestId("academy-widget-stereo-center-assignment");
  await rs.locator('input[type="range"]').fill("90");
  await expect(rs.locator("output")).toHaveText("90°");
  await rs.getByRole("button", { name: "R", exact: true }).click();
  await expectCorrect(page);

  await selectExercise(page, "academy:stereo:e-but-2-ene");
  await clickGraphTarget(page, "Bağ eb2");
  const ez = academy.getByTestId("academy-widget-double-bond-assignment");
  await ez.getByRole("button", { name: "E", exact: true }).click();
  await expectCorrect(page);

  await ez.scrollIntoViewIfNeeded();
  await captureAcceptanceScreenshot(page, "nomenclature-widgets-stereo-tr-1440x900.png");

  expectCleanRuntime(telemetry);
});

test("Academy remains readable and collapsible at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const telemetry = watchRuntime(page);
  await openAcademy(page);

  const academy = page.getByTestId("nomenclature-academy");
  const concepts = academy.locator("details").filter({ has: page.getByText("Bu bölümde", { exact: true }) }).first();
  await expect(concepts).toHaveAttribute("open", "");
  await concepts.locator("summary").click();
  await expect(concepts).not.toHaveAttribute("open", "");
  await concepts.locator("summary").click();
  await expect(concepts).toHaveAttribute("open", "");

  await selectExercise(page, "academy:builder:propan-2-ol");
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(academy.getByTestId("academy-widget-structure-builder")).toBeVisible();
  await academy.getByTestId("academy-widget-structure-builder").scrollIntoViewIfNeeded();
  await captureAcceptanceScreenshot(page, "nomenclature-builder-tr-390x844.png");

  expectCleanRuntime(telemetry);
});
