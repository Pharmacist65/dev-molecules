import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  expectCleanRuntime,
  watchRuntime,
} from "./explore-helpers";

const DOCS_SCREENSHOT_DIRECTORY = path.resolve(
  process.cwd(),
  "docs/assets/screenshots",
);
const CAPTURE_DOCS_SCREENSHOTS =
  process.env.DEV_MOLECULES_CAPTURE_DOCS === "1";

const appRoot = (page: Page) => page.locator("[data-route]").first();

async function expectCatalogReady(page: Page) {
  await expect(
    page.locator(
      '[data-catalog-status="ready"][data-catalog-records="1552"]',
    ),
  ).toBeVisible({ timeout: 30_000 });
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    scrollX: window.scrollX,
  }));
  expect(
    metrics.scrollWidth,
    `${context}: document width must fit the viewport`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(
    metrics.bodyScrollWidth,
    `${context}: body width must fit the viewport`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollX, `${context}: viewport must remain left-aligned`).toBe(0);
}

async function switchToEnglish(page: Page) {
  await page
    .getByRole("button", { name: "Dili İngilizce yap", exact: true })
    .click();
  await expect(appRoot(page)).toHaveAttribute("data-locale", "en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

async function captureDocsScreenshot(page: Page, filename: string) {
  await mkdir(DOCS_SCREENSHOT_DIRECTORY, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({
    path: path.join(DOCS_SCREENSHOT_DIRECTORY, filename),
    fullPage: false,
    animations: "disabled",
  });
}

async function positionForScreenshot(locator: Locator, top = 112) {
  await locator.evaluate((element, targetTop) => {
    const absoluteTop = window.scrollY + element.getBoundingClientRect().top;
    window.scrollTo({
      top: Math.max(0, absoluteTop - targetTop),
      behavior: "auto",
    });
  }, top);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
    window.localStorage.removeItem("dev-molecules:completed-missions");
    window.localStorage.removeItem("dev-molecules:nomenclature-progress");
  });
});

test("home has the new four-section shell in TR/EN and remains overflow-free on mobile", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#home", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);

  await expect(appRoot(page)).toHaveAttribute("data-route", "home");
  await expect(appRoot(page)).toHaveAttribute("data-locale", "tr");
  await expect(
    page.getByRole("heading", {
      name: "İlaçları yapısından etkisine kadar keşfet.",
      exact: true,
    }),
  ).toBeVisible();

  const primaryNavigation = page.getByRole("navigation", {
    name: "Ana navigasyon",
  });
  await expect(primaryNavigation.getByRole("button")).toHaveCount(4);
  for (const label of ["Ana Sayfa", "İlaç Atlası", "Akademi", "Laboratuvar"]) {
    await expect(
      primaryNavigation.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }
  await expect(
    primaryNavigation.getByRole("button", {
      name: /^(?:Explore|Learn|Build|Teach|Discover)$/,
    }),
  ).toHaveCount(0);

  await switchToEnglish(page);
  await expect(
    page.getByRole("heading", {
      name: "Explore drugs from structure to effect.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button"),
  ).toHaveCount(4);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page, "English Home at 390x844");
  expectCleanRuntime(telemetry);
});

test("new shell preserves legibility, reduced motion, and keyboard navigation at desktop zoom equivalents", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/#home", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);

  const shellMetrics = await page.evaluate(() => ({
    bodyFontSize: Number.parseFloat(getComputedStyle(document.body).fontSize),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    visibleText: document.body.innerText,
  }));
  expect(shellMetrics.bodyFontSize).toBeGreaterThanOrEqual(15);
  expect(shellMetrics.reducedMotion).toBe(true);
  expect(shellMetrics.visibleText).not.toMatch(
    /All Records|Complete catalog|Editor ready|Pending review|No sourced data yet|Search the Drug Atlas/,
  );
  await expectNoHorizontalOverflow(page, "TR Home at 1920x1080");

  // 1536×864 and 1280×720 are the effective CSS viewports for a 1920×1080
  // browser at 125% and 150% zoom respectively.
  for (const [width, height, label] of [
    [1536, 864, "125% zoom equivalent"],
    [1280, 720, "150% zoom equivalent"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expectNoHorizontalOverflow(page, label);
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator("body").press("Home");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: /Molevren ana görünümünü aç/i }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page
      .getByRole("navigation", { name: "Ana navigasyon" })
      .getByRole("button", { name: "Ana Sayfa", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const atlasNavigationButton = page
    .getByRole("navigation", { name: "Ana navigasyon" })
    .getByRole("button", { name: "İlaç Atlası", exact: true });
  await expect(atlasNavigationButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#atlas$/);
  await expect(page.locator('[data-drug-atlas="true"]')).toBeVisible();
  expectCleanRuntime(telemetry);
});

test("Atlas exposes the 1,552-record Browse boundary, bounded Spatial view, and global lookup", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#atlas", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);
  await switchToEnglish(page);

  const atlas = page.locator('[data-drug-atlas="true"]');
  await expect(atlas).toHaveAttribute("data-atlas-view", "browse");
  await expect(
    atlas.getByRole("heading", {
      name: "Records 1–24 of 1,552",
      exact: true,
    }),
  ).toBeVisible();

  await atlas.getByRole("tab", { name: /Spatial/ }).click();
  await expect(page).toHaveURL(/#atlas\/spatial$/);
  await expect(atlas).toHaveAttribute("data-atlas-view", "spatial");
  await expect(atlas.locator('[data-atlas-spatial="true"]')).toBeVisible();
  await expect(
    atlas.getByText(
      "Use Browse to find a specific record in the structure index.",
      { exact: true },
    ),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Open global drug search", exact: true })
    .click();
  const searchDialog = page.getByRole("dialog", { name: "Find a drug" });
  await searchDialog.getByRole("combobox").fill("Celecoxib");
  await searchDialog
    .getByRole("option", { name: /Celecoxib/i })
    .click();
  await expect(page).toHaveURL(/#drug\/celecoxib$/);
  await expect(
    page.locator('[data-molecule-id="molecule:celecoxib"]'),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "Celecoxib dossier from global lookup");

  await page.goto("/#family/beta-adrenergic-blockers", {
    waitUntil: "domcontentloaded",
  });
  await switchToEnglish(page);
  const family = page.locator(
    '[data-family-page="beta-adrenergic-blockers"]',
  );
  await expect(family).toBeVisible();
  await expect(
    family.getByRole("heading", { name: "Candidate identities", exact: true }),
  ).toBeVisible();
  await expect(
    family.getByText(/query label does not establish membership/i),
  ).toBeVisible();
  await expect(
    family.getByText("Pharmacological review scope", { exact: true }),
  ).toHaveCount(0);
  await expect(
    family.getByRole("link", { name: /Drug dossier|İlaç dosyası/ }),
  ).toHaveCount(4);
  await expect(
    family.getByText(
      /No eligible pharmacology source has yet been reviewed|Uygun farmakoloji kaynağı henüz incelenmedi/,
    ),
  ).toBeVisible();
  await expect(
    family
      .getByText(/computed and unreviewed|hesaplanmış ve incelenmemiştir/i)
      .first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "Fail-closed beta-blocker candidate review set");
  expectCleanRuntime(telemetry);
});

test("non-flagship seed dossier separates Story and Reference modes and states pharmacology and ADME gaps", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#drug/metoprolol", { waitUntil: "domcontentloaded" });

  const dossier = page.locator('[data-molecule-id="molecule:metoprolol"]');
  await expect(dossier).toHaveAttribute("data-dossier-mode", "story");
  await expect(
    dossier.getByRole("heading", { name: "Metoprolol", exact: true }),
  ).toBeVisible();
  await expect(
    dossier.locator('[data-pharmacology-coverage="unavailable"]'),
  ).toContainText("Farmakoloji kapsamı henüz açık değil");
  const compactAdmeGap = dossier.locator('[data-empty-coverage="adme"]');
  await expect(compactAdmeGap).toHaveCount(1);
  await expect(compactAdmeGap.locator("[data-phase]")).toHaveCount(0);
  await expect(
    compactAdmeGap.locator('[data-adme-context-only="true"]'),
  ).toHaveCount(1);
  await expect(
    dossier.locator('details[data-source-drawer="closed-by-default"]').first(),
  ).not.toHaveAttribute("open", "");

  await dossier
    .getByRole("button", { name: "Referans Modu", exact: true })
    .click();
  await expect(dossier).toHaveAttribute("data-dossier-mode", "reference");
  await dossier.getByRole("tab", { name: "Farmakoloji", exact: true }).click();
  await expect(dossier.locator('[data-reference-tab="pharmacology"]')).toBeVisible();
  await dossier.getByRole("tab", { name: "ADME", exact: true }).click();
  await expect(dossier.locator('[data-reference-tab="adme"]')).toBeVisible();

  await page.getByRole("button", { name: "Ayarlar", exact: true }).click();
  await page
    .getByRole("button", { name: /Uzman görünümü/i })
    .click();
  await expect(appRoot(page)).toHaveAttribute("data-experience-mode", "expert");
  await expect(dossier).toHaveAttribute("data-dossier-mode", "reference");
  await expectNoHorizontalOverflow(page, "Metoprolol Reference dossier");
  expectCleanRuntime(telemetry);
});

test("Academy exposes exactly eight modules and opens the real nomenclature lesson", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#academy", { waitUntil: "domcontentloaded" });
  await switchToEnglish(page);

  const map = page.locator('[data-academy-learning-map="eight-modules"]');
  await expect(map).toBeVisible();
  await expect(map.locator("[data-academy-module]")).toHaveCount(8);
  await expect(
    map.getByRole("heading", {
      name: "From reading structure to defending evidence.",
      exact: true,
    }),
  ).toBeVisible();

  const nomenclatureModule = map.locator(
    '[data-academy-module="organic-nomenclature"]',
  );
  await nomenclatureModule.getByRole("button", { name: /Open module/ }).click();
  await expect(page).toHaveURL(/#academy\/nomenclature\/organic$/);
  await expect(
    page.locator('[data-academy-active-module="organic-nomenclature"]'),
  ).toBeVisible();
  await expect(page.getByTestId("nomenclature-academy")).toBeVisible();
  await expectNoHorizontalOverflow(page, "Organic Nomenclature lesson");
  expectCleanRuntime(telemetry);
});

test("Synthesis Academy reports actual scope and opens a source-gated route", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#academy/synthesis/propranolol/overview", {
    waitUntil: "domcontentloaded",
  });
  await switchToEnglish(page);

  const synthesis = page.locator('[data-synthesis-academy="phase-6"]');
  await expect(synthesis).toHaveAttribute("data-curated-drugs", "3");
  await expect(synthesis).toHaveAttribute("data-target-drugs", "12");
  const metrics = synthesis
    .locator("#synthesis-coverage-heading")
    .locator("xpath=ancestor::section[1]")
    .locator("dl");
  await expect(metrics.locator("dt")).toHaveText([
    "routes",
    "transformations",
    "mechanism records",
    "directly reported routes",
  ]);
  await expect(metrics.locator("dd")).toHaveText(["6", "20", "12", "2"]);
  await expect(
    synthesis.locator('li[data-status="planned-unconfigured"]'),
  ).toHaveCount(9);

  await synthesis
    .getByRole("button", { name: /Open route lesson/ })
    .first()
    .click();
  await expect(
    synthesis.locator("#synthesis-atlas-panel"),
  ).toBeVisible();
  await expect(synthesis.locator("[data-synthesis-atlas]")).toBeVisible();
  await expect(
    synthesis.locator("[data-source-gate]").first(),
  ).toHaveAttribute("data-source-gate", /^(?:source-supported|context-supported|partial-with-declared-gap)$/);
  await expectNoHorizontalOverflow(page, "Synthesis route lab");

  await page.goto(
    "/#academy/synthesis/metformin-xzwyzxlipxdolr-uhfffaoysa-n/overview",
    { waitUntil: "domcontentloaded" },
  );
  const unavailable = page.locator('[data-curated-workflow="unavailable"]');
  await expect(unavailable).toBeVisible();
  await expect(page.locator('[data-synthesis-academy="phase-6"]')).toHaveCount(0);
  await expect(unavailable).not.toContainText("Propranolol");
  expectCleanRuntime(telemetry);
});

test("real Ketcher workspace validates the initial structure and exports a private local project", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#lab", { waitUntil: "domcontentloaded" });
  await switchToEnglish(page);

  const editor = page.locator(
    '[data-ketcher-editor="standalone"][data-ketcher-ready="true"]',
  );
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await expect(
    page.locator('[data-ready="true"]').filter({ hasText: "Editor ready" }),
  ).toBeVisible();

  const inspect = page.getByRole("button", {
    name: /Validate and match structure/,
  });
  await expect(inspect).toBeEnabled();
  await page.waitForTimeout(500);
  await inspect.click();
  const identity = page.locator('[data-status="exact"]');
  await expect(identity).toContainText(
    "Exact catalog identity match: Propranolol",
    { timeout: 60_000 },
  );
  await expect(identity.locator("code")).toHaveText(
    "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
  );

  const exportButton = page.getByRole("button", {
    name: /Export local project/,
  });
  await expect(exportButton).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "dev-molecules-local-project.json",
  );
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const localProject = JSON.parse(
    await readFile(downloadPath as string, "utf8"),
  ) as {
    readonly structure?: { readonly inchiKey?: string };
  };
  expect(localProject.structure?.inchiKey).toBe(
    "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
  );
  await expectNoHorizontalOverflow(page, "Ketcher Lab");
  expectCleanRuntime(telemetry);
});

test("Instructor composes one real task of each kind locally while Reviewer remains locked", async ({
  page,
}) => {
  const telemetry = watchRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#instructor", { waitUntil: "domcontentloaded" });
  await switchToEnglish(page);

  const instructor = page.locator(
    '[data-instructor-boundary="device-local"]',
  );
  await expect(instructor).toBeVisible();
  await instructor.getByLabel("Lesson package title").fill(
    "Structure and synthesis",
  );
  const nomenclatureTask = instructor.locator('label[data-disabled="false"]').first();
  await nomenclatureTask.locator("strong").click();
  await expect(nomenclatureTask).toHaveAttribute("data-selected", "true");
  await instructor
    .getByRole("tab", { name: "Synthesis tasks", exact: true })
    .click();
  const synthesisTask = instructor.locator('label[data-disabled="false"]').first();
  await synthesisTask.locator("strong").click();
  await expect(synthesisTask).toHaveAttribute("data-selected", "true");
  await expect(
    instructor.locator('[aria-label="Package balance"] [data-ready="true"]'),
  ).toHaveCount(2);
  await instructor
    .getByRole("button", {
      name: /Prepare local lesson package/,
    })
    .click();
  await expect(instructor.getByRole("status")).toContainText("Package prepared");

  const downloadPromise = page.waitForEvent("download");
  await instructor
    .getByRole("button", { name: /Export lesson package/ })
    .click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const lessonPackage = JSON.parse(
    await readFile(downloadPath as string, "utf8"),
  ) as {
    readonly taskReferences?: readonly { readonly kind?: string }[];
    readonly boundary?: {
      readonly storage?: string;
      readonly serverSync?: boolean;
      readonly automaticLearnerDelivery?: boolean;
    };
  };
  expect(lessonPackage.taskReferences?.map((task) => task.kind).sort()).toEqual([
    "nomenclature",
    "synthesis",
  ]);
  expect(lessonPackage.boundary).toEqual({
    storage: "device-local-download",
    serverSync: false,
    automaticLearnerDelivery: false,
  });
  expect(JSON.stringify(lessonPackage)).not.toMatch(/learnerName|studentEmail/i);

  await page.goto("/#reviewer", { waitUntil: "domcontentloaded" });
  await switchToEnglish(page);
  const reviewer = page.locator(
    '[data-reviewer-boundary="fail-closed"]',
  );
  await expect(reviewer).toBeVisible();
  await expect(
    reviewer.getByRole("heading", { name: "Reviewer Console locked" }),
  ).toBeVisible();
  await expect(reviewer).toContainText(
    "An instructor role, local setting, or public route cannot open this gate.",
  );
  await expectNoHorizontalOverflow(page, "Locked Reviewer Console");
  expectCleanRuntime(telemetry);
});

test("capture the documented Dev Molecules 2.0 review surfaces", async ({
  page,
}) => {
  test.skip(
    !CAPTURE_DOCS_SCREENSHOTS,
    "Set DEV_MOLECULES_CAPTURE_DOCS=1 to refresh committed review evidence.",
  );
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/#home", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);
  await expect(
    page.locator('[data-home="true"] [data-scene-status="ready"]'),
  ).toBeVisible({ timeout: 30_000 });
  await captureDocsScreenshot(page, "home-tr.png");
  await switchToEnglish(page);
  await captureDocsScreenshot(page, "home-en.png");

  await page.goto("/#atlas", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);
  const atlas = page.locator('[data-drug-atlas="true"]');
  await expect(atlas).toHaveAttribute("data-atlas-view", "browse");
  await captureDocsScreenshot(page, "atlas-browse.png");
  await atlas.getByRole("tab", { name: /Spatial/ }).click();
  const spatial = atlas.locator('[data-atlas-spatial="true"]');
  await expect(spatial).toBeVisible();
  await expect(
    spatial
      .locator('[data-scene-status="ready"], [data-scene-status="partial"]')
      .first(),
  ).toBeVisible({ timeout: 30_000 });
  await positionForScreenshot(spatial, 96);
  await captureDocsScreenshot(page, "atlas-spatial.png");

  await page.goto("/#family/beta-adrenergic-blockers", {
    waitUntil: "domcontentloaded",
  });
  const family = page.locator(
    '[data-family-page="beta-adrenergic-blockers"]',
  );
  await expect(family).toBeVisible();
  await expect(
    family.getByRole("link", { name: /Drug dossier|İlaç dosyası/ }),
  ).toHaveCount(4);
  await positionForScreenshot(
    family.getByRole("heading", { name: /Candidate identities|Aday kimlikler/ }),
    112,
  );
  await captureDocsScreenshot(page, "family-page.png");

  await page.goto("/#drug/propranolol", { waitUntil: "domcontentloaded" });
  const dossier = page.locator('[data-molecule-id="molecule:propranolol"]');
  await expect(dossier).toHaveAttribute("data-dossier-mode", "story");
  await captureDocsScreenshot(page, "dossier-overview.png");
  await dossier.getByRole("button", { name: "Reference Mode" }).click();
  await dossier.getByRole("tab", { name: "Pharmacology" }).click();
  await positionForScreenshot(
    dossier.locator('section[data-pharmacology-coverage="unavailable"]'),
    128,
  );
  await captureDocsScreenshot(page, "dossier-pharmacology.png");
  await dossier.getByRole("tab", { name: "ADME", exact: true }).click();
  await positionForScreenshot(
    dossier
      .locator("#dossier-adme-heading")
      .locator("xpath=ancestor::section[1]"),
    128,
  );
  await captureDocsScreenshot(page, "dossier-adme.png");
  await dossier.getByRole("tab", { name: "Synthesis", exact: true }).click();
  await positionForScreenshot(
    dossier.locator('[data-reference-tab="synthesis"]'),
    128,
  );
  await captureDocsScreenshot(page, "dossier-synthesis.png");

  await page.goto("/#academy/nomenclature/organic", {
    waitUntil: "domcontentloaded",
  });
  const academy = page.getByTestId("nomenclature-academy");
  await expect(academy).toBeVisible();
  await positionForScreenshot(academy, 92);
  await captureDocsScreenshot(page, "nomenclature-lesson.png");

  await page.goto("/#academy/synthesis/propranolol/overview", {
    waitUntil: "domcontentloaded",
  });
  const synthesis = page.locator('[data-synthesis-academy="phase-6"]');
  await synthesis
    .getByRole("button", { name: /Open route lesson/ })
    .first()
    .click();
  await expect(synthesis.locator("[data-synthesis-atlas]")).toBeVisible();
  const routeGraph = synthesis.locator(
    '[data-dragging][data-route-direction][data-atlas-level]',
  );
  await expect(routeGraph.locator('[data-material-role]')).toHaveCount(6);
  await positionForScreenshot(
    routeGraph.locator("xpath=preceding-sibling::div[1]"),
    96,
  );
  await captureDocsScreenshot(page, "synthesis-route.png");

  await page.goto("/#lab", { waitUntil: "domcontentloaded" });
  const editor = page.locator(
    '[data-ketcher-editor="standalone"][data-ketcher-ready="true"]',
  );
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("open-file-button").click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "propranolol.smi",
    mimeType: "chemical/x-daylight-smiles",
    buffer: Buffer.from("CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O\n"),
  });
  const openAsNewProject = page.getByRole("button", {
    name: "Open as New Project",
    exact: true,
  });
  await expect(openAsNewProject).toBeVisible();
  await openAsNewProject.click();
  await expect(openAsNewProject).toBeHidden();
  await page.waitForTimeout(750);
  await positionForScreenshot(page.locator("#ketcher-workspace-heading"), 112);
  await captureDocsScreenshot(page, "lab.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);
  await expectNoHorizontalOverflow(page, "Mobile Home screenshot");
  await captureDocsScreenshot(page, "mobile-home.png");
});
