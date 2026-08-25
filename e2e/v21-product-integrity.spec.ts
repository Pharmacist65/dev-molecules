import { readFile } from "node:fs/promises";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectCleanRuntime, watchRuntime } from "./explore-helpers";

const HOME_COPY = {
  tr: {
    title: "İlaçları yapısından etkisine kadar keşfet.",
    description:
      "1.552 çözümlenmiş moleküler yapıyı ara, 2B ve 3B incele; derinleştirilmiş ilaç kayıtlarında kimya ve öğrenme içeriklerine ilerle.",
    scope: "Katalog kapsamı ve kaynaklar",
  },
  en: {
    title: "Explore drugs from structure to effect.",
    description:
      "Search 1,552 resolved molecular structures, inspect them in 2D and 3D, and continue into chemistry and learning content where curated coverage exists.",
    scope: "Catalog scope and sources",
  },
} as const;

const FORBIDDEN_HOME_OPERATIONS_COPY =
  /\b(?:ETL|admin|operator|review queue|pipeline|ingestion|projection|algorithm|hash|SDF|WebGL|pending review)\b|inceleme kuyruğu|veri hattı|içe aktarma|operatör|yönetici/i;

const FORBIDDEN_STUDENT_TECHNICAL_COPY =
  /Classification review|Sınıflandırma incelemesi|projection|projeksiyon|hash|algorithm|algoritma|fingerprint|Tanimoto|SDF|WebGL|unreviewed|has not been reviewed|incelenmemiş|curation pending|kürasyon bekliyor/i;

const appRoot = (page: Page) => page.locator("[data-route]").first();

async function expectCatalogReady(page: Page) {
  await expect(
    page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'),
  ).toBeVisible({ timeout: 30_000 });
}

async function switchToEnglish(page: Page) {
  if ((await appRoot(page).getAttribute("data-locale")) === "en") return;
  await page
    .getByRole("button", { name: "Dili İngilizce yap", exact: true })
    .click();
  await expect(appRoot(page)).toHaveAttribute("data-locale", "en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

async function expectStudentNarrativeClean(root: Locator) {
  expect(await root.innerText()).not.toMatch(FORBIDDEN_STUDENT_TECHNICAL_COPY);
}

async function expectClusterLabelPlurality(
  root: Locator,
  singular: string,
  plural: string,
) {
  const escapedSingular = singular.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedPlural = plural.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const label = root
    .locator("strong")
    .filter({ hasText: new RegExp(`^(?:${escapedSingular}|${escapedPlural})$`) })
    .first();
  await expect(label).toBeVisible();
  const clusterButton = label.locator("xpath=ancestor::button[1]");
  const countText = await clusterButton.locator("small").first().innerText();
  const count = Number.parseInt(countText.replace(/[^0-9]/g, ""), 10);
  expect(count).toBeGreaterThan(0);
  await expect(label).toHaveText(count === 1 ? singular : plural);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.setItem("dev-molecules:presentation-mode", "student");
  });
});

test("Home uses the release copy in TR/EN and keeps catalog operations behind a closed scope disclosure", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.goto("./#home", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);

  const home = page.locator('[data-home="true"]');
  await expect(
    home.getByRole("heading", { name: HOME_COPY.tr.title, exact: true }),
  ).toBeVisible();
  await expect(home.getByText(HOME_COPY.tr.description, { exact: true })).toBeVisible();

  const scope = home.locator('details[data-catalog-scope="collapsed"]');
  await expect(scope).toHaveJSProperty("open", false);
  await expect(scope.locator("summary")).toHaveText(HOME_COPY.tr.scope);
  await expect(scope.locator("a")).toHaveCount(2);
  await expect(scope.locator("a").first()).toBeHidden();
  expect(await home.innerText()).not.toMatch(FORBIDDEN_HOME_OPERATIONS_COPY);

  await switchToEnglish(page);
  await expect(
    home.getByRole("heading", { name: HOME_COPY.en.title, exact: true }),
  ).toBeVisible();
  await expect(home.getByText(HOME_COPY.en.description, { exact: true })).toBeVisible();
  await expect(scope).toHaveJSProperty("open", false);
  await expect(scope.locator("summary")).toHaveText(HOME_COPY.en.scope);
  expect(await home.innerText()).not.toMatch(FORBIDDEN_HOME_OPERATIONS_COPY);
  expectCleanRuntime(telemetry);
});

test("a curated dossier renders one compact Pharmacology, ADME, and Synthesis gap with lower-weight unavailable tabs", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.goto("./#drug/metoprolol", { waitUntil: "domcontentloaded" });
  await switchToEnglish(page);

  const dossier = page.locator('[data-molecule-id="molecule:metoprolol"]');
  await expect(dossier).toBeVisible();
  await expect(dossier.locator('[data-dossier-availability="upfront"]')).toBeVisible();
  for (const dimension of ["pharmacology", "adme", "synthesis"] as const) {
    await expect(
      dossier.locator(
        `[data-coverage-dimension="${dimension}"][data-status="unavailable"]`,
      ),
    ).toHaveCount(1);
    await expect(
      dossier.locator(`[data-empty-coverage="${dimension}"]`),
    ).toHaveCount(1);
  }

  const adme = dossier.locator('[data-empty-coverage="adme"]');
  await expect(adme.locator("[data-phase]")).toHaveCount(0);
  await expect(adme.locator('[data-adme-context-only="true"]')).toHaveCount(1);
  await expect(adme).toContainText(
    "No sourced drug-specific ADME measurement is available for this context yet.",
  );
  const routeBoundaryCount = (
    (await adme.innerText()).match(
      /Administration route and pharmaceutical form are not ADME measurements or pharmacokinetic outcomes\./g,
    ) ?? []
  ).length;
  expect(routeBoundaryCount).toBe(1);

  await dossier
    .getByRole("button", { name: "Reference Mode", exact: true })
    .click();
  await expect(dossier).toHaveAttribute("data-dossier-mode", "reference");

  for (const tabName of ["Pharmacology", "ADME", "Synthesis"] as const) {
    const tab = dossier.getByRole("button", { name: tabName, exact: true });
    await expect(tab).toHaveAttribute("data-tab-availability", "unavailable");
    const visualWeight = await tab.evaluate((element) => ({
      opacity: Number.parseFloat(getComputedStyle(element).opacity),
      borderStyle: getComputedStyle(element).borderBottomStyle,
    }));
    expect(visualWeight.opacity).toBeLessThan(1);
  }

  await dossier.getByRole("button", { name: "ADME", exact: true }).click();
  const referenceAdme = dossier.locator(
    '[data-reference-tab="adme"] [data-empty-coverage="adme"]',
  );
  await expect(referenceAdme).toHaveCount(1);
  await expect(referenceAdme.locator("[data-phase]")).toHaveCount(0);

  await dossier.getByRole("button", { name: "Synthesis", exact: true }).click();
  const referenceSynthesis = dossier.locator(
    '[data-reference-tab="synthesis"] [data-empty-coverage="synthesis"]',
  );
  await expect(referenceSynthesis).toHaveCount(1);
  await referenceSynthesis
    .getByRole("button", { name: "Open general Synthesis Academy", exact: true })
    .click();
  await expect(page).toHaveURL(/#academy\/synthesis$/);
  expectCleanRuntime(telemetry);
});

test("Student Spatial uses neutral Candidate and Representative labels without reviewer or implementation vocabulary", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.goto("./#atlas/spatial", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);
  await switchToEnglish(page);

  const atlas = page.locator('[data-drug-atlas="true"][data-atlas-view="spatial"]');
  await expect(atlas).toBeVisible();
  await expect(
    atlas
      .locator('[data-atlas-spatial="true"]')
      .getByText("Explore relationships across representative structures.", {
        exact: true,
      }),
  ).toBeVisible();

  const student = page.locator('[data-presentation-mode="student"]').first();
  const scene = student.locator("[data-active-webgl-contexts]").first();
  await expect(student).toBeVisible();
  await expect(scene).toHaveAttribute("data-scene-status", /^(?:ready|partial)$/);
  await expect
    .poll(async () => Number(await scene.getAttribute("data-visible-count")))
    .toBeGreaterThan(0);
  const representativeIds = (
    (await scene.getAttribute("data-visible-molecules")) ?? ""
  ).split(",").filter(Boolean);
  expect(representativeIds).not.toEqual([]);
  expect(
    representativeIds.filter((id) => id.startsWith("molecule:imported:")),
    "source-matched unclassified imports must stay outside the curated seed map",
  ).toEqual([]);

  await expectClusterLabelPlurality(
    student,
    "Candidate record",
    "Candidate records",
  );
  await expect(
    student.locator("header").first().getByText(/^Representative structures · \d+$/),
  ).toBeVisible();

  let lensDisclosure = student
    .getByRole("button", { name: /Clustering lens/i })
    .first();
  await lensDisclosure.click();
  await expect(
    student.locator('[data-lens-announcement="therapeutic"]'),
  ).toBeVisible();
  await expectStudentNarrativeClean(student);

  await student
    .getByRole("button", { name: "Structural similarity", exact: true })
    .click();
  await expect(page).toHaveURL(/#universe$/);
  lensDisclosure = student
    .getByRole("button", { name: /Clustering lens/i })
    .first();
  await lensDisclosure.click();
  await expect(
    student.locator('[data-lens-announcement="structural-similarity"]'),
  ).toBeVisible();
  await expectStudentNarrativeClean(student);
  await expectClusterLabelPlurality(
    student,
    "Representative structure",
    "Representative structures",
  );
  expect(page.url()).not.toMatch(
    /classification-review-in-progress|computed-structural-view-unreviewed/i,
  );
  expectCleanRuntime(telemetry);
});

test("Ketcher validates and exports locally, survives locale change, clears explicitly, and resets after route loss", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const telemetry = watchRuntime(page);
  const mutationRequests: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      mutationRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("./#lab", { waitUntil: "domcontentloaded" });
  const editor = page.locator(
    '[data-ketcher-editor="standalone"][data-ketcher-ready="true"]',
  );
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-ready="true"]')).toContainText("Editör hazır");
  await expect(page.getByText(/herkese açık sürüm özel bulut depolaması sunmaz/i)).toBeVisible();

  const validateTr = page.getByRole("button", {
    name: /Yapıyı doğrula ve eşleştir/,
  });
  await page.waitForTimeout(500);
  await validateTr.click();
  let identity = page.locator('[data-lab-area="builder"] [data-status="exact"]');
  await expect(identity).toContainText("Propranolol", { timeout: 60_000 });
  await expect(identity.locator("code")).toHaveText(
    "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
  );

  const ketcherCanvas = editor.locator('svg[data-testid="canvas"]');
  await ketcherCanvas.scrollIntoViewIfNeeded();
  await editor.getByRole("button", { name: "Benzene (T)", exact: true }).click();
  const canvasBox = await ketcherCanvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  await page.mouse.click(
    (canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) * 0.24,
    (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) * 0.68,
  );

  await validateTr.click();
  identity = page.locator('[data-lab-area="builder"] [data-status]');
  await expect(identity).toHaveAttribute("data-status", "not-found", {
    timeout: 60_000,
  });
  const editedInchiKey = (await identity.locator("code").innerText()).trim();
  expect(editedInchiKey).not.toBe("AQHHHDLHHXJYJD-UHFFFAOYSA-N");

  const exportTr = page.getByRole("button", {
    name: /Yerel proje dışa aktar/,
  });
  await expect(exportTr).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await exportTr.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("dev-molecules-local-project.json");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const project = JSON.parse(
    await readFile(downloadPath as string, "utf8"),
  ) as { readonly structure?: { readonly inchiKey?: string } };
  expect(project.structure?.inchiKey).toBe(editedInchiKey);

  await switchToEnglish(page);
  await expect(editor).toBeVisible();
  await expect(identity).toContainText("No exact identity match in the indexed records");
  await page.getByRole("button", { name: /Validate and match structure/ }).click();
  await expect(identity.locator("code")).toHaveText(editedInchiKey);

  await page.getByRole("button", { name: "Clear canvas", exact: true }).click();
  await expect(identity).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Export local project/ }),
  ).toBeDisabled();

  const primaryNavigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await primaryNavigation.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/#home$/);
  await primaryNavigation.getByRole("button", { name: "Lab", exact: true }).click();
  await expect(page).toHaveURL(/#lab$/);

  const resetEditor = page.locator(
    '[data-ketcher-editor="standalone"][data-ketcher-ready="true"]',
  );
  await expect(resetEditor).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(/public build provides no private cloud storage/i),
  ).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Validate and match structure/ }).click();
  identity = page.locator('[data-lab-area="builder"] [data-status="exact"]');
  await expect(identity).toContainText("Exact catalog identity match: Propranolol", {
    timeout: 60_000,
  });
  await expect(identity.locator("code")).toHaveText(
    "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
  );

  expect(mutationRequests).toEqual([]);
  expectCleanRuntime(telemetry);
});
