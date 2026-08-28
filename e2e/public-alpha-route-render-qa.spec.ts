import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

type QualityClass =
  | "complete_learning_route"
  | "substantive_partial_route"
  | "fragmentary_route"
  | "candidate_only"
  | "no_supporting_source_resolved";

interface QaSourceLocator {
  readonly value: string;
}

interface QaSampleRecord {
  readonly selectionOrder: number;
  readonly selectionHash: string;
  readonly stratum:
    | "source_supported_fragment"
    | "teaching_upstream_gap"
    | "teaching_convergent_partial";
  readonly catalogEntityId: string;
  readonly preferredName: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly alternativeId: string;
  readonly routeType: string;
  readonly routeDepth: number;
  readonly connectedStepCount: number;
  readonly sourceLocatorCount: number;
  readonly sourceLocators: readonly QaSourceLocator[];
  readonly scientificReviewState: "pending";
  readonly verifiedScientificClaim: false;
}

interface MoleculeQualityRecord {
  readonly catalogEntityId: string;
  readonly preferredName: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly qualityClass: QualityClass;
  readonly scientificReviewState: "pending";
  readonly verifiedScientificClaim: false;
}

interface PublicAlphaQualityReport {
  readonly moleculeQuality: {
    readonly records: readonly MoleculeQualityRecord[];
  };
  readonly qaSample: {
    readonly deterministic: boolean;
    readonly requestedSize: number;
    readonly actualSize: number;
    readonly sampleDigest: string;
    readonly byStratum: Readonly<Record<QaSampleRecord["stratum"], number>>;
    readonly records: readonly QaSampleRecord[];
  };
}

interface RouteQaCase extends QaSampleRecord {
  /** The report is authoritative; this is never inferred from route shape. */
  readonly reportedPrimaryQuality: QualityClass;
}

const reportPath = fileURLToPath(new URL(
  "../public/catalog/synthesis/reports/public-alpha-quality.json",
  import.meta.url,
));
const qualityReport = JSON.parse(
  readFileSync(reportPath, "utf8"),
) as PublicAlphaQualityReport;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid deterministic public-alpha QA sample: ${message}`);
}

function buildRouteQaCases(report: PublicAlphaQualityReport): readonly RouteQaCase[] {
  const { qaSample } = report;
  invariant(qaSample.deterministic, "sample must declare deterministic=true");
  invariant(qaSample.requestedSize === 60, "requestedSize must be 60");
  invariant(qaSample.actualSize === 60, "actualSize must be 60");
  invariant(qaSample.records.length === 60, "records must contain 60 routes");
  invariant(/^[a-f0-9]{64}$/u.test(qaSample.sampleDigest), "sampleDigest must be SHA-256");
  invariant(
    qaSample.byStratum.source_supported_fragment === 20 &&
      qaSample.byStratum.teaching_upstream_gap === 20 &&
      qaSample.byStratum.teaching_convergent_partial === 20,
    "sample must retain the declared 20/20/20 strata",
  );

  const selectionHashes = new Set<string>();
  const alternativeIds = new Set<string>();
  const qualityByIdentity = new Map(
    report.moleculeQuality.records.map((record) => [record.catalogEntityId, record]),
  );

  return [...qaSample.records]
    .sort((left, right) => left.selectionOrder - right.selectionOrder)
    .map((record, index) => {
      invariant(record.selectionOrder === index + 1, "selectionOrder must be contiguous");
      invariant(!selectionHashes.has(record.selectionHash), "selectionHash must be unique");
      invariant(!alternativeIds.has(record.alternativeId), "alternativeId must be unique");
      selectionHashes.add(record.selectionHash);
      alternativeIds.add(record.alternativeId);

      const quality = qualityByIdentity.get(record.catalogEntityId);
      invariant(quality !== undefined, `missing moleculeQuality record for ${record.catalogEntityId}`);
      invariant(quality.catalogEntityId === record.catalogEntityId, "catalog identity join drifted");
      invariant(quality.preferredName === record.preferredName, "preferred name join drifted");
      invariant(quality.pubChemCid === record.pubChemCid, "PubChem CID join drifted");
      invariant(quality.inchiKey === record.inchiKey, "InChIKey join drifted");
      invariant(
        quality.scientificReviewState === record.scientificReviewState,
        "review-state join drifted",
      );
      invariant(
        quality.verifiedScientificClaim === record.verifiedScientificClaim,
        "verified-claim join drifted",
      );
      invariant(
        record.sourceLocatorCount === record.sourceLocators.length,
        "source locator count drifted",
      );
      invariant(
        new Set(record.sourceLocators.map((locator) => locator.value)).size ===
          record.sourceLocatorCount,
        "source locators must be unique within the sampled alternative",
      );

      return {
        ...record,
        reportedPrimaryQuality: quality.qualityClass,
      };
    });
}

const routeQaCases = buildRouteQaCases(qualityReport);

async function installDeterministicPresentation(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
    window.localStorage.setItem("molevren:motion-mode", "off");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  });
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const metrics = await page.evaluate(() => ({
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    scrollX: window.scrollX,
  }));

  expect(metrics.documentScrollWidth, `${context}: document width`).toBeLessThanOrEqual(
    metrics.documentClientWidth + 1,
  );
  expect(metrics.bodyScrollWidth, `${context}: body width`).toBeLessThanOrEqual(
    metrics.documentClientWidth + 1,
  );
  expect(metrics.scrollX, `${context}: horizontal position`).toBe(0);
}

async function expectIndependentSmilesReady(stepPanel: Locator, context: string) {
  const structures = stepPanel.locator("[data-smiles-structure]");
  const structureCount = await structures.count();
  expect(structureCount, `${context}: independently mounted 2D SMILES structures`).toBeGreaterThanOrEqual(2);
  await expect(
    stepPanel.locator('[data-smiles-structure="ready"]'),
    `${context}: every 2D SMILES render reaches ready`,
  ).toHaveCount(structureCount, { timeout: 30_000 });
  await expect.poll(
    () => structures.evaluateAll((figures) => figures.every((figure) => {
      const svg = figure.querySelector("svg");
      return svg?.getAttribute("role") === "img" && svg.childElementCount > 0;
    })),
    { message: `${context}: every ready SMILES figure contains an SVG drawing` },
  ).toBe(true);
}

async function selectExactAlternativeAndAuditSteps(
  page: Page,
  studio: Locator,
  routeCase: RouteQaCase,
) {
  const stepsTab = studio.getByRole("tab", { name: "Synthesis Steps", exact: true });
  await stepsTab.click();
  await expect(stepsTab).toHaveAttribute("aria-selected", "true");

  const stepsPanel = studio.locator("#synthesis-studio-panel-steps");
  const exactRoute = stepsPanel.locator(
    `[data-route-id="${routeCase.alternativeId}"]`,
  );
  await expect(exactRoute).toHaveCount(1);
  await exactRoute.click();
  await expect(exactRoute).toHaveAttribute("aria-selected", "true");
  await expect(exactRoute).toContainText(routeCase.routeType.replaceAll("_", " "));

  const stepTablist = stepsPanel.getByRole("tablist", { name: "Route steps" });
  const stepTabs = stepTablist.getByRole("tab");
  await expect(stepTabs).toHaveCount(routeCase.connectedStepCount);

  const observedLocators: string[] = [];
  for (let stepIndex = 0; stepIndex < routeCase.connectedStepCount; stepIndex += 1) {
    const stepTab = stepTabs.nth(stepIndex);
    await stepTab.click();
    await expect(stepTab).toHaveAttribute("aria-selected", "true");

    const selectedStep = stepsPanel.locator(
      '[data-synthesis-step-panel][data-selected="true"]',
    );
    await expect(selectedStep).toBeVisible();
    await expect(selectedStep).toHaveAttribute("data-source-reaction-order", "unresolved");
    await expectIndependentSmilesReady(
      selectedStep,
      `QA ${routeCase.selectionOrder} step ${stepIndex + 1}`,
    );

    await expect(selectedStep.locator('[data-mechanism-state="unresolved"]')).toBeVisible();
    await expect(selectedStep.locator("[data-mechanism-layer]")).toHaveCount(0);

    const locatorCode = selectedStep.locator("footer code");
    await expect(locatorCode).toBeVisible();
    observedLocators.push((await locatorCode.innerText()).trim());

    const sourceLink = selectedStep.getByRole("link", {
      name: "Open ORD record",
      exact: false,
    });
    await expect(sourceLink).toHaveCount(1);
    await expect(sourceLink).toHaveAttribute("href", /^https:\/\//u);
  }

  const expectedLocators = routeCase.sourceLocators
    .map((locator) => locator.value)
    .sort();
  expect([...new Set(observedLocators)].sort()).toEqual(expectedLocators);
  await expectNoHorizontalOverflow(page, `QA ${routeCase.selectionOrder} route steps`);
}

async function auditExactTargetViewer(
  page: Page,
  studio: Locator,
  routeCase: RouteQaCase,
) {
  const exactPubChemCid = new RegExp(
    `/compound/(?:cid/)?${routeCase.pubChemCid}(?:/|$)`,
    "u",
  );
  const explorerTab = studio.getByRole("tab", { name: "3D Explorer", exact: true });
  await explorerTab.click();
  await expect(explorerTab).toHaveAttribute("aria-selected", "true");

  const explorer = studio.locator("#synthesis-studio-panel-explorer");
  const viewer = explorer.locator('[data-molecule-viewer="true"]');
  await expect(viewer).toHaveCount(1);
  await expect(viewer.getByText(routeCase.preferredName, { exact: true })).toBeVisible();

  const dimensions = viewer.getByRole("group", { name: "Dimension", exact: true });
  const twoD = dimensions.getByRole("button", { name: "2D", exact: true });
  const threeD = dimensions.getByRole("button", { name: "3D", exact: true });
  await expect(twoD).toBeEnabled();
  await expect(threeD).toBeEnabled();
  await expect(twoD).toHaveAttribute("aria-pressed", "true");
  await expect(viewer).toHaveAttribute("data-structure-status", "ready", { timeout: 30_000 });
  await expect(viewer.getByRole("link", { name: "PubChem 2D SDF", exact: true }))
    .toHaveAttribute("href", exactPubChemCid);

  await threeD.click();
  await expect(threeD).toHaveAttribute("aria-pressed", "true");
  await expect(viewer).toHaveAttribute("data-structure-status", "ready", { timeout: 30_000 });
  await expect(viewer.getByRole("link", { name: "PubChem 3D SDF", exact: true }))
    .toHaveAttribute("href", exactPubChemCid);

  await twoD.click();
  await expect(twoD).toHaveAttribute("aria-pressed", "true");
  await expect(viewer).toHaveAttribute("data-structure-status", "ready", { timeout: 30_000 });
  await expectNoHorizontalOverflow(page, `QA ${routeCase.selectionOrder} exact-target viewer`);
}

async function auditReviewBoundaryAndReferences(
  page: Page,
  studio: Locator,
  routeCase: RouteQaCase,
) {
  const overviewTab = studio.getByRole("tab", { name: "Overview", exact: true });
  await overviewTab.click();
  const overview = studio.locator("#synthesis-studio-panel-overview");
  await expect(overview.getByText(
    "SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING",
    { exact: true },
  )).toBeVisible();
  const reviewWarning = overview.locator("p").filter({
    hasText: "SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING",
  });
  await expect(reviewWarning).toHaveCount(1);
  await expect(reviewWarning).toContainText(
    "This is not reviewed or verified. Applicability and completeness remain unverified.",
  );

  const mechanismTab = studio.getByRole("tab", { name: "Mechanism", exact: true });
  await mechanismTab.click();
  const mechanism = studio.locator("#synthesis-studio-panel-mechanism");
  await expect(mechanism.locator('[data-mechanism-state="unresolved"]')).toBeVisible();
  await expect(mechanism.getByText("MECHANISM NOT RESOLVED", { exact: true })).toBeVisible();
  await expect(studio.locator("[data-mechanism-layer]")).toHaveCount(0);

  const referencesTab = studio.getByRole("tab", { name: "References", exact: true });
  await referencesTab.click();
  const references = studio.locator("#synthesis-studio-panel-references");
  for (const expected of routeCase.sourceLocators) {
    const reference = references.locator("li").filter({ hasText: expected.value });
    await expect(reference).toHaveCount(1);
    await expect(reference.getByRole("link", {
      name: "Open ORD record",
      exact: false,
    })).toHaveAttribute("href", /^https:\/\//u);
    await expect(reference.getByText("Expert review pending", { exact: true })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page, `QA ${routeCase.selectionOrder} references`);
}

test.describe("deterministic public-alpha 60-route render QA", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await installDeterministicPresentation(page);
  });

  for (const routeCase of routeQaCases) {
    const order = String(routeCase.selectionOrder).padStart(2, "0");
    test(`QA ${order} [${routeCase.stratum}] ${routeCase.preferredName}`, async ({ page }) => {
      test.setTimeout(120_000);
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const stableSlug = routeCase.catalogEntityId.split(":").at(-1);
      invariant(stableSlug !== undefined && stableSlug.length > 0, `missing stable slug for ${routeCase.catalogEntityId}`);
      await page.goto(`/#academy/synthesis/${encodeURIComponent(stableSlug)}/atlas`, {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("html")).toHaveAttribute("lang", "en");

      const atlas = page.locator(
        `[data-synthesis-atlas][data-catalog-entity-id="${routeCase.catalogEntityId}"]`,
      );
      await expect(atlas).toBeVisible({ timeout: 30_000 });
      await expect(atlas).toHaveAttribute("data-synthesis-atlas", "public-alpha-draft", {
        timeout: 30_000,
      });
      await expect(atlas).toHaveAttribute("data-synthesis-atlas-coverage-only", "false");

      const studio = atlas.locator('[data-synthesis-learning-studio="true"]');
      await expect(studio).toHaveAttribute(
        "data-route-quality",
        routeCase.reportedPrimaryQuality,
      );
      await expect(studio).toHaveAttribute("data-review-state", routeCase.scientificReviewState);
      await expect(studio).toHaveAttribute(
        "data-verified-scientific-claim",
        String(routeCase.verifiedScientificClaim),
      );
      await expect(studio).toHaveAttribute("data-operational-details", "excluded");

      const hero = studio.locator(":scope > header");
      await expect(hero.getByText(routeCase.preferredName, { exact: true })).toBeVisible();
      await expect(hero.getByText(routeCase.inchiKey, { exact: true })).toBeVisible();

      await selectExactAlternativeAndAuditSteps(page, studio, routeCase);
      await auditExactTargetViewer(page, studio, routeCase);
      await auditReviewBoundaryAndReferences(page, studio, routeCase);
      await expectNoHorizontalOverflow(page, `QA ${routeCase.selectionOrder} final surface`);
      expect(pageErrors, `QA ${routeCase.selectionOrder}: uncaught page errors`).toEqual([]);
    });
  }
});
