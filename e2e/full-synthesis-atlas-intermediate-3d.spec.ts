import { expect, test, type Page } from "@playwright/test";

const stableSlug = "triethylenetetramine-vilcjcgezxaxto-uhfffaoysa-n";

async function installEnglishReducedMotion(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
    window.localStorage.setItem("molevren:motion-mode", "off");
  });
}

async function openFullAtlasFromBasicRecord(page: Page) {
  await page.goto(`/#drug/${stableSlug}`, { waitUntil: "domcontentloaded" });
  const record = page.locator('[data-basic-molecular-record="true"]');
  await expect(record).toBeVisible({ timeout: 30_000 });
  const embedded = record.locator(
    '[data-embedded-synthesis-learning-studio="ready"]',
  );
  await expect(embedded).toBeVisible({ timeout: 30_000 });
  await embedded.locator('a[data-full-synthesis-atlas-link="true"]').click();
  await expect(page).toHaveURL(
    new RegExp(`#academy/synthesis/${stableSlug}/atlas$`, "u"),
  );
  const studio = page.locator(
    '[data-synthesis-learning-studio="true"]' +
      '[data-synthesis-learning-studio-variant="full"]',
  );
  await expect(studio).toBeVisible({ timeout: 30_000 });
  return studio;
}

test("Basic record link opens Full Atlas with the same exact intermediate 3D asset", async ({
  page,
}) => {
  await installEnglishReducedMotion(page);
  const studio = await openFullAtlasFromBasicRecord(page);
  await expect(studio).toHaveAttribute(
    "data-structure-asset-availability",
    "partially_available",
  );
  await expect(studio).toHaveAttribute(
    "data-global-conformer-absence-claimed",
    "false",
  );

  await studio.getByRole("tab", {
    name: "Synthesis Steps",
    exact: true,
  }).click();
  const stepsPanel = studio.getByRole("tabpanel", {
    name: "Synthesis Steps",
    exact: true,
  });
  const teachingRoute = stepsPanel.locator("[data-route-id]").nth(2);
  await expect(teachingRoute).toContainText("teaching reconstruction");
  await teachingRoute.click();
  const selectedStep = stepsPanel.locator(
    '[data-synthesis-step-panel][data-selected="true"]',
  );
  await expect(
    selectedStep.locator('[data-material-role="route_intermediate"]'),
  ).toContainText("piperazine");
  const inspect = selectedStep.locator(
    '[data-step-output-3d-state="allowed"]' +
      '[data-step-output-3d-reason="exact_computed_conformer"]',
  );
  await expect(inspect).toBeEnabled();
  await inspect.click();

  const explorer = studio.getByRole("tabpanel", {
    name: "3D Explorer",
    exact: true,
  });
  const output = explorer.locator('[data-explorer-focus="step-output"]');
  await expect(output).toHaveAttribute(
    "data-step-output-material-role",
    "route_intermediate",
  );
  await expect(output).toContainText("piperazine");
  const viewer = output.locator('[data-molecule-viewer="true"]');
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAttribute("data-structure-status", "ready");
  await expect(viewer).toContainText("RDKit ETKDGv3");
});

test("a target that failed strict generation stays on exact 2D and cannot open raw catalog 3D", async ({
  page,
}) => {
  await installEnglishReducedMotion(page);
  const propranololSlug = "propranolol-aqhhhdlhhxjyjd-uhfffaoysa-n";
  await page.goto(`/#academy/synthesis/${propranololSlug}/atlas`, {
    waitUntil: "domcontentloaded",
  });
  const studio = page.locator(
    '[data-synthesis-learning-studio="true"]' +
      '[data-synthesis-learning-studio-variant="full"]',
  );
  await expect(studio).toBeVisible({ timeout: 30_000 });
  await studio.getByRole("tab", { name: "3D Explorer", exact: true }).click();

  const target = studio.getByRole("tabpanel", {
    name: "3D Explorer",
    exact: true,
  }).locator('[data-target-3d-state="2d_only"]');
  await expect(target).toBeVisible();
  await expect(target).toHaveAttribute(
    "data-target-3d-reason",
    "computed_conformer_unavailable",
  );
  await expect(target).toContainText("Sourced 2D record of the exact target");
  await expect(target.getByRole("button", { name: "3D", exact: true })).toBeDisabled();
  await expect(target).not.toContainText("PubChem computed conformer service");
});

test("Full Atlas keeps routes but reports manifest 404 as transport unavailable", async ({
  page,
}) => {
  await installEnglishReducedMotion(page);
  await page.route(
    "**/catalog/synthesis/reports/intermediate-3d-assets.json",
    async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "synthetic manifest transport failure" }),
      });
    },
  );
  const studio = await openFullAtlasFromBasicRecord(page);
  await expect(studio).toHaveAttribute(
    "data-structure-asset-availability",
    "transport_unavailable",
  );
  await expect(studio).toHaveAttribute(
    "data-structure-asset-availability-reason",
    "manifest_http_or_transport_failure",
  );
  await expect(studio).toHaveAttribute(
    "data-route-detail-load-state",
    "ready",
  );

  await studio.getByRole("tab", {
    name: "Synthesis Steps",
    exact: true,
  }).click();
  const stepsPanel = studio.getByRole("tabpanel", {
    name: "Synthesis Steps",
    exact: true,
  });
  const teachingRoute = stepsPanel.locator("[data-route-id]").nth(2);
  await teachingRoute.click();
  const selectedStep = stepsPanel.locator(
    '[data-synthesis-step-panel][data-selected="true"]',
  );
  await expect(selectedStep).toContainText(
    "The 3D asset manifest could not be transported. Route detail remains available; no conclusion is made about whether a conformer exists.",
  );
  await expect(
    selectedStep.locator(
      '[data-step-output-3d-state="2d_only"][disabled]',
    ),
  ).toBeVisible();
  await expect(selectedStep).not.toContainText(
    "No identity-matched 3D conformer exists",
  );
});
