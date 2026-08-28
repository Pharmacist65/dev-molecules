import { expect, test, type Locator, type Page } from "@playwright/test";

const flagshipScenarios = [
  {
    slug: "propranolol",
    moleculeId: "molecule:propranolol",
    catalogEntityId:
      "molecule:imported:propranolol-aqhhhdlhhxjyjd-uhfffaoysa-n",
    name: "Propranolol",
    inchiKey: "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
    quality: "fragmentary_route",
    hasDraftRoute: true,
    hasAdmittedSelectedOutput3d: false,
  },
  {
    slug: "celecoxib",
    moleculeId: "molecule:celecoxib",
    catalogEntityId:
      "molecule:imported:celecoxib-rzekvgvhfleqil-uhfffaoysa-n",
    name: "Celecoxib",
    inchiKey: "RZEKVGVHFLEQIL-UHFFFAOYSA-N",
    quality: "fragmentary_route",
    hasDraftRoute: true,
    hasAdmittedSelectedOutput3d: true,
  },
  {
    slug: "omeprazole",
    moleculeId: "molecule:omeprazole",
    catalogEntityId:
      "molecule:imported:omeprazole-subdbmmjdzjvos-uhfffaoysa-n",
    name: "Omeprazole",
    inchiKey: "SUBDBMMJDZJVOS-UHFFFAOYSA-N",
    quality: "no_supporting_source_resolved",
    hasDraftRoute: false,
    hasAdmittedSelectedOutput3d: false,
  },
] as const;

const compactTabNames = [
  "Overview",
  "3D Explorer",
  "Synthesis Steps",
  "Mechanism",
  "References",
] as const;

async function installEnglishReducedMotion(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
    window.localStorage.setItem("molevren:motion-mode", "off");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  });
}

async function expectCompactStudioContract(
  studio: Locator,
  expected: {
    readonly catalogEntityId: string;
    readonly name: string;
    readonly inchiKey: string;
    readonly quality: string;
  },
) {
  await expect(studio).toHaveAttribute("data-synthesis-learning-studio-variant", "compact");
  await expect(studio).toHaveAttribute("data-synthesis-catalog-coverage", expected.catalogEntityId);
  await expect(studio).toHaveAttribute("data-coverage-load-state", "ready");
  await expect(studio).toHaveAttribute("data-route-detail-load-state", "ready");
  await expect(studio).toHaveAttribute("data-route-quality", expected.quality);
  await expect(studio).toHaveAttribute("data-review-state", "pending");
  await expect(studio).toHaveAttribute("data-verified-scientific-claim", "false");
  await expect(studio).toHaveAttribute("data-operational-details", "excluded");
  await expect(studio).toHaveAttribute("data-source-supported-mechanism-count", "0");
  await expect(studio).toHaveAttribute("data-reaction-class-educational-mechanism-count", "0");
  await expect(studio).toHaveAttribute("data-mapped-molecule-specific-mechanism-count", "0");
  await expect(studio).toHaveAttribute("data-structured-learning-task-count", "0");
  await expect(
    studio.getByText("Exact target identity", { exact: true }).first(),
  ).toBeVisible();
  await expect(studio.getByText(expected.name, { exact: true }).first()).toBeVisible();
  await expect(studio.getByText(expected.inchiKey, { exact: true }).first()).toBeVisible();

  const tabs = studio.locator(':scope > [role="tablist"] > [role="tab"]');
  await expect(tabs).toHaveCount(5);
  await expect(tabs).toHaveText(compactTabNames);
  const relationships = await tabs.evaluateAll((elements) => elements.map((element) => {
    const id = element.id;
    const controls = element.getAttribute("aria-controls");
    const panel = controls ? document.getElementById(controls) : null;
    return {
      id,
      controls,
      panelRole: panel?.getAttribute("role") ?? null,
      labelledBy: panel?.getAttribute("aria-labelledby") ?? null,
    };
  }));
  expect(relationships).toHaveLength(5);
  expect(relationships.every((item) =>
    item.id.length > 0 &&
    item.controls !== null &&
    item.panelRole === "tabpanel" &&
    item.labelledBy === item.id
  )).toBe(true);
}

async function expectFailClosedTargetExplorer(studio: Locator, name: string) {
  await studio.getByRole("tab", { name: "3D Explorer", exact: true }).click();
  const explorer = studio.getByRole("tabpanel", { name: "3D Explorer", exact: true });
  await expect(explorer).toBeVisible();
  const target = explorer.locator('[data-target-3d-state="2d_only"]');
  await expect(target).toContainText("Sourced 2D record of the exact target");
  await expect(target).toContainText(
    "No computed 3D asset passed the serialized-identity and provenance gates for this target.",
  );
  const viewer = explorer.locator('[data-molecule-viewer="true"]');
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAccessibleName(new RegExp(name, "u"));
  await expect(viewer).toHaveAttribute("data-structure-status", "ready");
  await expect(viewer.getByRole("button", { name: "3D", exact: true })).toBeDisabled();
  await expect(viewer.getByRole("link", { name: "PubChem 2D SDF", exact: true })).toBeVisible();
}

async function expectFailClosedDraftCapabilities(
  studio: Locator,
  hasAdmittedSelectedOutput3d: boolean,
) {
  await studio.getByRole("tab", { name: "Synthesis Steps", exact: true }).click();
  const stepPanel = studio.locator('[data-synthesis-step-panel][data-selected="true"]');
  await expect(stepPanel).toBeVisible();
  await expect(stepPanel.locator('[data-learning-task-state="unavailable"]')).toHaveAttribute(
    "data-llm-chemistry-fact-generation",
    "false",
  );
  await expect(stepPanel.locator('[data-advanced-mechanism-state="unavailable"]'))
    .toHaveAttribute("data-mechanism-assurance", "mechanism_not_resolved");
  await expect(stepPanel.locator('[data-advanced-mechanism-state="unavailable"]'))
    .toHaveAttribute("data-mechanism-visualization-state", "unavailable");
  await expect(stepPanel.locator('[data-advanced-mechanism-state="unavailable"] button'))
    .toBeDisabled();

  const output3dGates = await stepPanel
    .locator("[data-step-output-3d-state]")
    .evaluateAll((elements) => elements.map((element) => ({
      state: element.getAttribute("data-step-output-3d-state"),
      reason: element.getAttribute("data-step-output-3d-reason"),
      disabled: (element as HTMLButtonElement).disabled,
    })));
  expect(output3dGates.length).toBeGreaterThan(0);
  expect(output3dGates.every((gate) =>
    gate.state === "allowed"
      ? gate.reason === "exact_computed_conformer" && !gate.disabled
      : gate.state === "2d_only" && gate.disabled
  )).toBe(true);
  await expect(stepPanel.locator('[data-step-product-3d="exact-computed-conformer"]'))
    .toHaveCount(0);
  await expect(stepPanel.locator("form")).toHaveCount(0);

  if (hasAdmittedSelectedOutput3d) {
    const exactOutputControl = stepPanel
      .locator('[data-step-output-3d-state="allowed"][data-step-output-3d-reason="exact_computed_conformer"]')
      .first();
    await expect(exactOutputControl).toBeEnabled();
    await exactOutputControl.click();
    const explorer = studio.getByRole("tabpanel", { name: "3D Explorer", exact: true });
    const focusedOutput = explorer.locator('[data-explorer-focus="step-output"]');
    await expect(focusedOutput).toBeVisible();
    await expect(focusedOutput).toHaveAttribute("data-step-output-3d-state", "allowed");
    await expect(focusedOutput).toHaveAttribute(
      "data-step-output-3d-reason",
      "exact_computed_conformer",
    );
    await expect(focusedOutput).toHaveAttribute(
      "data-step-output-material-role",
      /^(?:route_intermediate|exact_target)$/u,
    );
    await expect(focusedOutput).toHaveAttribute("data-target-fallback-used", "false");
    await expect(focusedOutput).toContainText(
      "This is a computed conformer, not an experimental, crystal, or biologically active conformation.",
    );
    await expect(focusedOutput.locator('[data-molecule-viewer="true"]')).toBeVisible();
  } else {
    await expect(
      stepPanel.locator('[data-step-output-3d-state="2d_only"][disabled]').first(),
    ).toBeVisible();
    await expect(
      stepPanel.locator('[data-step-output-3d-state="allowed"]'),
    ).toHaveCount(0);
  }

  await studio.getByRole("tab", { name: "Mechanism", exact: true }).click();
  const mechanismPanel = studio.getByRole("tabpanel", { name: "Mechanism", exact: true });
  await expect(mechanismPanel.locator('[data-mechanism-state="unresolved"]')).toBeVisible();
  await expect(mechanismPanel).toContainText("MECHANISM NOT RESOLVED");
}

test.describe("embedded Synthesis Learning Studio", () => {
  test.beforeEach(async ({ page }) => installEnglishReducedMotion(page));

  for (const scenario of flagshipScenarios) {
    test(`${scenario.name} keeps exact, honest Studio state inside the Curated Dossier`, async ({
      page,
    }) => {
      await page.goto(`/#drug/${scenario.slug}`, { waitUntil: "domcontentloaded" });
      await expect(
        page.locator('[data-molecular-record-route-status="curated-dossier"]'),
      ).toBeVisible({ timeout: 30_000 });
      const dossier = page.locator(`[data-molecule-id="${scenario.moleculeId}"]`);
      const embedded = dossier.locator('[data-embedded-synthesis-learning-studio="ready"]');
      await expect(embedded).toBeVisible({ timeout: 30_000 });
      const studio = embedded.locator('[data-synthesis-learning-studio="true"]');
      await expectCompactStudioContract(studio, scenario);

      const atlasLink = embedded.locator('a[data-full-synthesis-atlas-link="true"]');
      await expect(atlasLink).toHaveAccessibleName("Explore synthesis");
      await expect(atlasLink).toHaveAttribute(
        "href",
        `#academy/synthesis/${scenario.slug}/atlas`,
      );

      if (scenario.hasDraftRoute) {
        await expectFailClosedDraftCapabilities(
          studio,
          scenario.hasAdmittedSelectedOutput3d,
        );
      } else {
        await expect(studio.locator('[data-synthesis-step-panel]')).toHaveCount(0);
        await expect(studio.locator('[data-learning-task-state]')).toHaveCount(0);
        await expect(studio.locator('[data-advanced-mechanism-state]')).toHaveCount(0);
        await expect(studio.locator('[data-step-output-3d-state]')).toHaveCount(0);
        await studio.getByRole("tab", { name: "Synthesis Steps", exact: true }).click();
        await expect(
          studio.getByRole("tabpanel", { name: "Synthesis Steps", exact: true }),
        ).toContainText("No supporting source was resolved in the recorded search scope.");
        await studio.getByRole("tab", { name: "Mechanism", exact: true }).click();
        await expect(
          studio.getByRole("tabpanel", { name: "Mechanism", exact: true }),
        ).toContainText("No supporting source was resolved in the recorded search scope.");
        await expect(studio.locator('[data-mechanism-state]')).toHaveCount(0);
        await expectFailClosedTargetExplorer(studio, scenario.name);
      }
    });
  }

  test("Basic Molecular Record embeds the same compact fail-closed Studio", async ({ page }) => {
    const stableSlug = "baclofen-kpysyyiegfhwsv-uhfffaoysa-n";
    const catalogEntityId = `molecule:imported:${stableSlug}`;
    await page.goto(`/#drug/${stableSlug}`, { waitUntil: "domcontentloaded" });
    const record = page.locator('[data-basic-molecular-record="true"]');
    await expect(record).toBeVisible({ timeout: 30_000 });
    const embedded = record.locator('[data-embedded-synthesis-learning-studio="ready"]');
    await expect(embedded).toBeVisible({ timeout: 30_000 });
    const studio = embedded.locator('[data-synthesis-learning-studio="true"]');
    await expectCompactStudioContract(studio, {
      catalogEntityId,
      name: "Baclofen",
      inchiKey: "KPYSYYIEGFHWSV-UHFFFAOYSA-N",
      quality: "candidate_only",
    });
    await expect(embedded.locator('a[data-full-synthesis-atlas-link="true"]')).toHaveAttribute(
      "href",
      `#academy/synthesis/${stableSlug}/atlas`,
    );
    await expect(studio.locator('[data-synthesis-step-panel]')).toHaveCount(0);
    await expect(studio.locator('[data-learning-task-state]')).toHaveCount(0);
    await studio.getByRole("tab", { name: "Synthesis Steps", exact: true }).click();
    await expect(studio.getByRole("tabpanel", { name: "Synthesis Steps", exact: true }))
      .toContainText("Sources identified; route extraction not yet resolved.");
  });
});
