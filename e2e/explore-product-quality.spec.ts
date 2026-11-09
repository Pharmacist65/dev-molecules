import { expect, test, type Page } from "@playwright/test";

import {
  attachScreenshot,
  dragUniverseCanvas,
  exploreCanvas,
  exploreRoot,
  exploreScene,
  measureClusterSpatialQuality,
  measureHorizontalOverflow,
  nearClusterList,
  readNumericAttribute,
  readUniverseCameraProxy,
  waitForExploreReady,
  waitForUniverseCameraSettle,
  zoomUniverseCanvas,
} from "./explore-product-quality-helpers";

const OUTSIDE_INITIAL_CATALOG_RECORDS = [
  {
    name: "Macitentan",
    id: "molecule:imported:macitentan-jgcmebmxrhszkx-uhfffaoysa-n",
    stableSlug: "macitentan-jgcmebmxrhszkx-uhfffaoysa-n",
    shard: "m",
    pubChemCid: 16_004_692,
  },
  {
    name: "Rivaroxaban",
    id: "molecule:imported:rivaroxaban-kgfyhtzwpphnlq-aweznqclsa-n",
    stableSlug: "rivaroxaban-kgfyhtzwpphnlq-aweznqclsa-n",
    shard: "r",
    pubChemCid: 9_875_401,
  },
  {
    name: "Warfarin",
    id: "molecule:imported:warfarin-pjvwktkqmonhti-uhfffaoysa-n",
    stableSlug: "warfarin-pjvwktkqmonhti-uhfffaoysa-n",
    shard: "w",
    pubChemCid: 54_678_486,
  },
] as const;

const CATALOG_TOTAL = 1_552;
const INITIAL_SAMPLE_MINIMUM = 6;
const INITIAL_SAMPLE_MAXIMUM = 10;
const NEAR_SAMPLE_MAXIMUM = 12;
const PAIN_REGION_IDS = new Set([
  "molecule:aspirin",
  "molecule:ibuprofen",
  "molecule:naproxen",
  "molecule:diclofenac",
  "molecule:celecoxib",
]);

function catalogApp(page: Page) {
  return page.locator("[data-catalog-status][data-catalog-records]").first();
}

async function settleResponsiveLayout(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
      ),
  );
}

test.describe("Explore product-quality acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("dev-molecules:locale", "tr");
      window.localStorage.setItem("dev-molecules:presentation-mode", "student");
    });
  });

  test("keeps the initial and near 3D map sparse, legible and scientifically bounded", async ({
    page,
  }, testInfo) => {
    await page.goto("/#universe", { waitUntil: "domcontentloaded" });
    await waitForExploreReady(page);

    const app = catalogApp(page);
    const scene = exploreScene(page);
    const catalogTotal = await readNumericAttribute(app, "data-catalog-records");
    const residentCatalogCount = await readNumericAttribute(
      app,
      "data-catalog-resident-records",
    );
    const initialSampleCount = await readNumericAttribute(
      scene,
      "data-visible-molecule-count",
    );
    const initialSceneSampleCount = await readNumericAttribute(
      scene,
      "data-scene-sample-count",
    );
    const rendererSpatialQuality = {
      layoutMinimumGap: await readNumericAttribute(
        scene,
        "data-layout-minimum-gap",
      ),
      overlap: await readNumericAttribute(scene, "data-overlap-count"),
      clipped: await readNumericAttribute(
        scene,
        "data-clipped-molecule-count",
      ),
      visibleLabelCount: await readNumericAttribute(
        scene,
        "data-visible-label-count",
      ),
      labelCollision: await readNumericAttribute(
        scene,
        "data-label-collision-count",
      ),
    };
    const initialVisibleIds = ((await scene.getAttribute("data-visible-molecules")) ?? "")
      .split(",")
      .filter(Boolean);

    await attachScreenshot(page, testInfo, "explore-product-quality-before");

    const revisionBeforeZoomOut = await readNumericAttribute(scene, "data-camera-revision");
    await zoomUniverseCanvas(page, 120);
    await expect
      .poll(() => readNumericAttribute(scene, "data-camera-revision"), {
        message: "one zoom-out step must update the shared scene",
      })
      .toBeGreaterThan(revisionBeforeZoomOut);
    await waitForUniverseCameraSettle(page);
    await expect(scene).toHaveAttribute("data-lod-level", "far");
    await expect(scene).toHaveAttribute("data-visible-molecule-count", "0");

    const revisionBeforeZoomIn = await readNumericAttribute(scene, "data-camera-revision");
    await zoomUniverseCanvas(page, -120);
    await expect
      .poll(() => readNumericAttribute(scene, "data-camera-revision"), {
        message: "returning from Far must update the shared scene",
      })
      .toBeGreaterThan(revisionBeforeZoomIn);
    await waitForUniverseCameraSettle(page);
    await expect(scene).toHaveAttribute("data-lod-level", "near");

    const nearSampleCount = await readNumericAttribute(
      scene,
      "data-visible-molecule-count",
    );
    const spatialQuality = await measureClusterSpatialQuality(page);
    const canvas = exploreCanvas(page);
    const moleculeHoverTarget = await canvas.evaluate((element: HTMLCanvasElement) => {
      const bounds = JSON.parse(element.dataset.visibleMoleculeBounds ?? "[]") as Array<{
        moleculeId: string;
        x: number;
        y: number;
      }>;
      const target = bounds[0];
      const rectangle = element.getBoundingClientRect();
      return target
        ? {
            moleculeId: target.moleculeId,
            x: rectangle.left + (target.x / 100) * rectangle.width,
            y: rectangle.top + (target.y / 100) * rectangle.height,
          }
        : null;
    });
    expect(moleculeHoverTarget, "a real visible molecule must provide a hover target").not.toBeNull();
    const atomPickCountBeforeHover = await readNumericAttribute(canvas, "data-pick-atom-count");
    if (moleculeHoverTarget) {
      await page.mouse.move(moleculeHoverTarget.x, moleculeHoverTarget.y);
      await expect(canvas).toHaveAttribute(
        "data-hovered-molecule",
        moleculeHoverTarget.moleculeId,
      );
    }
    const moleculeHoverLabel = page.locator('[data-molecule-hover-label="true"]');
    await expect(moleculeHoverLabel).toBeVisible();
    const moleculeHoverText = (await moleculeHoverLabel.textContent())?.trim() ?? "";
    expect(moleculeHoverText).not.toBe("");
    expect(moleculeHoverText).not.toMatch(/·|\b(?:CID|atom|carbon|oxygen)\b/i);
    expect(await readNumericAttribute(canvas, "data-pick-atom-count")).toBe(
      atomPickCountBeforeHover,
    );
    const unclassifiedLabelCount = await nearClusterList(page)
      .getByRole("button", {
        name: /Sınıflandırılmamış|Unclassified|kürasyon bekliyor|curation pending/i,
      })
      .count();
    const importedIdsInMainMap = initialVisibleIds.filter((id) =>
      id.startsWith("molecule:imported:"),
    );
    const initialRegionCounts = {
      pain: initialVisibleIds.filter((id) => PAIN_REGION_IDS.has(id)).length,
      cardiovascular: initialVisibleIds.filter((id) => !PAIN_REGION_IDS.has(id)).length,
    };

    const qualityEvidence = {
      catalogTotal,
      residentCatalogCount,
      initialSampleCount,
      initialSceneSampleCount,
      nearSampleCount,
      activeWebglContexts: await readNumericAttribute(
        scene,
        "data-active-webgl-contexts",
      ),
      mainMapVisibleIds: initialVisibleIds,
      unclassifiedLabelCount,
      importedIdsInMainMap,
      initialRegionCounts,
      rendererSpatialQuality,
      spatialQuality,
      moleculeHover: {
        moleculeId: moleculeHoverTarget?.moleculeId ?? null,
        label: moleculeHoverText,
        atomPickDelta:
          await readNumericAttribute(canvas, "data-pick-atom-count")
          - atomPickCountBeforeHover,
      },
    };
    await testInfo.attach("explore-product-quality-metrics", {
      body: Buffer.from(`${JSON.stringify(qualityEvidence, null, 2)}\n`),
      contentType: "application/json",
    });
    await attachScreenshot(page, testInfo, "explore-product-quality-after-near");

    expect.soft(catalogTotal, "the full catalog total must remain explicit").toBe(CATALOG_TOTAL);
    expect.soft(
      residentCatalogCount,
      "the resident metadata window must not masquerade as the full catalog",
    ).toBeLessThan(catalogTotal);
    expect.soft(
      catalogTotal,
      "the catalog total and rendered teaching sample must be distinct",
    ).toBeGreaterThan(initialSampleCount);
    expect.soft(initialSampleCount, "initial 3D sample must contain at least six structures")
      .toBeGreaterThanOrEqual(INITIAL_SAMPLE_MINIMUM);
    expect.soft(initialSampleCount, "initial 3D sample must contain at most ten structures")
      .toBeLessThanOrEqual(INITIAL_SAMPLE_MAXIMUM);
    expect.soft(
      initialSceneSampleCount,
      "the requested scene sample and visible renderer sample must agree",
    ).toBe(initialSampleCount);
    expect.soft(nearSampleCount, "near LOD must remain bounded to twelve structures")
      .toBeLessThanOrEqual(NEAR_SAMPLE_MAXIMUM);
    expect.soft(await exploreCanvas(page).count(), "Explore must own exactly one WebGL canvas")
      .toBe(1);
    expect.soft(await readNumericAttribute(scene, "data-active-webgl-contexts"))
      .toBe(1);
    expect.soft(
      rendererSpatialQuality.layoutMinimumGap,
      "the renderer must expose a positive measured layout gap",
    ).toBeGreaterThan(0);
    expect.soft(
      {
        overlap: rendererSpatialQuality.overlap,
        clipped: rendererSpatialQuality.clipped,
        labelCollision: rendererSpatialQuality.labelCollision,
      },
      JSON.stringify(rendererSpatialQuality),
    ).toEqual({ overlap: 0, clipped: 0, labelCollision: 0 });
    expect.soft(
      rendererSpatialQuality.visibleLabelCount,
      "the renderer must report at least one visible cluster label",
    ).toBeGreaterThan(0);
    expect.soft(spatialQuality.labelCount, "the near map must expose cluster labels")
      .toBeGreaterThan(0);
    expect.soft(
      spatialQuality.moleculeBoundsCount,
      "each visible real 3D structure must contribute camera-projected bounds",
    ).toBe(nearSampleCount);
    expect.soft(
      {
        overlap: spatialQuality.overlap,
        clipped: spatialQuality.clipped,
        labelCollision: spatialQuality.labelCollision,
        moleculeOcclusion: spatialQuality.moleculeOcclusion,
        readabilityViolationCount: spatialQuality.readabilityViolationCount,
      },
      JSON.stringify(spatialQuality),
    ).toEqual({
      overlap: 0,
      clipped: 0,
      labelCollision: 0,
      moleculeOcclusion: 0,
      readabilityViolationCount: 0,
    });
    expect.soft(
      spatialQuality.minimumLabelHeight ?? 0,
      "each region-label button must retain a 26px hit/readability height",
    ).toBeGreaterThanOrEqual(26);
    expect.soft(
      spatialQuality.minimumStrongFontSize ?? 0,
      "each region name must render at no less than 8px",
    ).toBeGreaterThanOrEqual(8);
    expect.soft(
      unclassifiedLabelCount,
      "unclassified records must stay outside the primary spatial 3D map",
    ).toBe(0);
    expect.soft(
      importedIdsInMainMap,
      "source-matched but unclassified imports must not receive invented map positions",
    ).toEqual([]);
    expect.soft(
      initialRegionCounts,
      "the default overview must retain two to four representatives per visible region",
    ).toEqual({ pain: 4, cardiovascular: 4 });
  });

  test("lazily opens three non-initial catalog records in 3D and 2D without losing the Universe camera", async ({
    page,
  }, testInfo) => {
    const successfulUrls = new Set<string>();
    page.on("response", (response) => {
      if (response.ok()) successfulUrls.add(response.url());
    });

    await page.goto("/#universe", { waitUntil: "domcontentloaded" });
    await waitForExploreReady(page);

    const app = catalogApp(page);
    const initialResidentCount = await readNumericAttribute(
      app,
      "data-catalog-resident-records",
    );
    for (const record of OUTSIDE_INITIAL_CATALOG_RECORDS) {
      expect(
        [...successfulUrls].some((url) =>
          url.endsWith(`/catalog/shards/alphabetic/${record.shard}.json`),
        ),
        `${record.name}'s shard must not be part of the initial metadata window`,
      ).toBe(false);
    }

    const browseButton = page.getByRole("button", {
      name: /Tüm kataloğa göz at|Browse full catalog/i,
    });
    const catalogDrawer = page.locator('[data-catalog-browse-drawer="true"]');
    await attachScreenshot(page, testInfo, "explore-lazy-catalog-before");

    const initialCamera = await readUniverseCameraProxy(page);
    await dragUniverseCanvas(page, { x: 260, y: 36 });
    await waitForUniverseCameraSettle(page);
    const preservedCamera = await readUniverseCameraProxy(page);
    expect(
      preservedCamera.cameraState,
      "the camera-preservation probe must start from a non-default Universe view",
    ).not.toBe(initialCamera.cameraState);

    const cameraRoundTrips: Array<{
      readonly record: string;
      readonly before: typeof preservedCamera;
      readonly after: typeof preservedCamera;
      readonly preserved: boolean;
    }> = [];
    for (const [recordIndex, record] of OUTSIDE_INITIAL_CATALOG_RECORDS.entries()) {
      await browseButton.click();
      await expect(catalogDrawer).toBeVisible();
      if (recordIndex === 0) {
        await expect(catalogDrawer).toHaveAttribute(
          "data-catalog-total-count",
          String(CATALOG_TOTAL),
        );
        await expect(catalogDrawer).toHaveAttribute(
          "data-scene-sample-count",
          /^(?:[6-9]|10)$/,
        );
        await expect(catalogDrawer).toHaveAttribute(
          "data-catalog-result-count",
          String(24),
        );
        await expect(catalogDrawer.locator("[data-catalog-record]").first()).toBeVisible();
      }
      const search = catalogDrawer.getByRole("searchbox", {
        name: /Katalogda ara|Search the catalog/i,
      });
      await search.fill(record.name);
      const result = catalogDrawer.locator(`[data-catalog-record="${record.id}"]`);
      await expect(result).toBeVisible();
      await result.click();

      await expect(page).toHaveURL(new RegExp(`#molecule/${record.stableSlug}$`));
      await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "focus");
      await expect(exploreScene(page)).toHaveAttribute("data-selected-molecule", record.id);
      await expect(exploreScene(page)).toHaveAttribute("data-scene-status", "ready");
      await expect
        .poll(
          () =>
            [...successfulUrls].some((url) =>
              url.endsWith(`/catalog/shards/alphabetic/${record.shard}.json`),
            ),
          { message: `${record.name} must hydrate only after its lazy shard is requested` },
        )
        .toBe(true);
      await expect
        .poll(
          () =>
            [...successfulUrls].some((url) =>
              url.endsWith(`/catalog/structures/pubchem/cid-${record.pubChemCid}-3d.sdf`),
            ),
          { message: `${record.name} must open its exact PubChem 3D record` },
        )
        .toBe(true);

      const dimensionGroup = page.getByRole("group", { name: /Boyut|Dimension/i });
      await dimensionGroup.getByRole("button", { name: /^(?:2B|2D)$/i }).click();
      await expect(page.getByRole("img", { name: new RegExp(record.name, "i") }))
        .toBeVisible();
      await expect
        .poll(
          () =>
            [...successfulUrls].some((url) =>
              url.endsWith(`/catalog/structures/pubchem/cid-${record.pubChemCid}-2d.sdf`),
            ),
          { message: `${record.name} must open its exact PubChem 2D record` },
        )
        .toBe(true);

      await page
        .getByRole("navigation", { name: /Keşfet görünüm yolu|Explore view path/i })
        .getByRole("button", { name: /^(?:Evren|Universe)$/i })
        .click();
      await expect(exploreRoot(page)).toHaveAttribute("data-explore-level", "universe");
      const clearSearch = page.getByRole("button", { name: /^(?:Temizle|Clear)$/i });
      if (await clearSearch.isVisible()) await clearSearch.click();
      await waitForExploreReady(page);
      await waitForUniverseCameraSettle(page);

      const returnedCamera = await readUniverseCameraProxy(page);
      cameraRoundTrips.push({
        record: record.name,
        before: preservedCamera,
        after: returnedCamera,
        preserved:
          returnedCamera.cameraState === preservedCamera.cameraState &&
          returnedCamera.visibleMoleculeIds.join(",") ===
            preservedCamera.visibleMoleculeIds.join(","),
      });
    }

    const finalResidentCount = await readNumericAttribute(
      app,
      "data-catalog-resident-records",
    );
    await attachScreenshot(page, testInfo, "explore-lazy-catalog-after");
    await testInfo.attach("explore-lazy-catalog-round-trips", {
      body: Buffer.from(`${JSON.stringify({
        initialResidentCount,
        finalResidentCount,
        successfulCatalogUrls: [...successfulUrls]
          .filter((url) =>
            OUTSIDE_INITIAL_CATALOG_RECORDS.some(
              (record) =>
                url.endsWith(`/catalog/shards/alphabetic/${record.shard}.json`) ||
                url.endsWith(`/catalog/structures/pubchem/cid-${record.pubChemCid}-2d.sdf`) ||
                url.endsWith(`/catalog/structures/pubchem/cid-${record.pubChemCid}-3d.sdf`),
            ),
          )
          .sort(),
        cameraRoundTrips,
      }, null, 2)}\n`),
      contentType: "application/json",
    });

    expect(
      finalResidentCount,
      "opening three outside-initial records must hydrate only those three records",
    ).toBe(initialResidentCount + OUTSIDE_INITIAL_CATALOG_RECORDS.length);
    expect(
      cameraRoundTrips.map(({ record, preserved }) => ({ record, preserved })),
      JSON.stringify(cameraRoundTrips),
    ).toEqual(
      OUTSIDE_INITIAL_CATALOG_RECORDS.map((record) => ({
        record: record.name,
        preserved: true,
      })),
    );
  });

  test("keeps the catalog portal above the topbar and its close control pointer-operable", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1_440, height: 900 });
    await page.goto("/#universe", { waitUntil: "domcontentloaded" });
    await waitForExploreReady(page);

    const browseButton = page.getByRole("button", {
      name: /Tüm kataloğa göz at|Browse full catalog/i,
    });
    await browseButton.click();
    const drawer = page.locator('[data-catalog-browse-drawer="true"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator("[data-catalog-record]").first()).toBeVisible();

    const catalogSearch = drawer.getByRole("searchbox", {
      name: /Katalogda ara|Search the catalog/i,
    });
    await catalogSearch.fill("Kardiyovasküler");
    await expect
      .poll(() => readNumericAttribute(drawer, "data-catalog-result-count"))
      .toBeGreaterThanOrEqual(2);
    await expect(drawer.locator('[data-classification-status="known"]').first()).toBeVisible();
    await catalogSearch.fill("");
    await expect(drawer.locator("[data-catalog-record]").first()).toBeVisible();

    const closeButton = drawer.getByRole("button", {
      name: /Kataloğu kapat|Close catalog/i,
    });
    const hitTest = await closeButton.evaluate((element) => {
      const rectangle = element.getBoundingClientRect();
      const center = {
        x: rectangle.left + rectangle.width / 2,
        y: rectangle.top + rectangle.height / 2,
      };
      const hitStack = document.elementsFromPoint(center.x, center.y);
      const topHit = hitStack[0] ?? null;
      const topbar = document
        .querySelector<HTMLElement>('[aria-controls="platform-settings"]')
        ?.closest<HTMLElement>("header") ?? null;
      const topbarRectangle = topbar?.getBoundingClientRect() ?? null;

      return {
        portalParent:
          element.closest("[data-catalog-browse-backdrop]")?.parentElement?.tagName ??
          null,
        closeRectangle: {
          x: rectangle.x,
          y: rectangle.y,
          width: rectangle.width,
          height: rectangle.height,
        },
        closeCenterOverlapsTopbar:
          topbarRectangle !== null &&
          center.x >= topbarRectangle.left &&
          center.x <= topbarRectangle.right &&
          center.y >= topbarRectangle.top &&
          center.y <= topbarRectangle.bottom,
        topHit: topHit instanceof HTMLElement
          ? {
              tagName: topHit.tagName,
              text: topHit.innerText.trim(),
              ariaLabel: topHit.getAttribute("aria-label"),
            }
          : null,
        closeOwnsHit: topHit === element || (topHit !== null && element.contains(topHit)),
      };
    });

    await attachScreenshot(page, testInfo, "explore-catalog-portal-before-close");
    expect(hitTest.portalParent, JSON.stringify(hitTest)).toBe("BODY");
    expect(
      hitTest.closeCenterOverlapsTopbar,
      "the probe must exercise the former topbar interception region",
    ).toBe(true);
    expect(hitTest.closeOwnsHit, JSON.stringify(hitTest)).toBe(true);

    // Intentionally non-forced: Playwright's actionability check catches any
    // stacking-context regression that lets the sticky topbar intercept it.
    await closeButton.click();
    await expect(drawer).toBeHidden();
    await expect(browseButton).toBeFocused();
    await attachScreenshot(page, testInfo, "explore-catalog-portal-after-close");
    await testInfo.attach("explore-catalog-portal-hit-test", {
      body: Buffer.from(`${JSON.stringify({
        ...hitTest,
        nonForcedClickClosedDrawer: true,
        focusReturnedToBrowseControl: true,
      }, null, 2)}\n`),
      contentType: "application/json",
    });
  });

  test("has no horizontal overflow at desktop zoom equivalents, wide desktop or 390px", async ({
    page,
  }, testInfo) => {
    const cases = [
      {
        name: "1440x900@100%",
        physicalViewport: { width: 1_440, height: 900 },
        browserZoomPercent: 100,
      },
      {
        name: "1440x900@125%",
        physicalViewport: { width: 1_440, height: 900 },
        browserZoomPercent: 125,
      },
      {
        name: "1440x900@150%",
        physicalViewport: { width: 1_440, height: 900 },
        browserZoomPercent: 150,
      },
      {
        name: "1920x1080@100%",
        physicalViewport: { width: 1_920, height: 1_080 },
        browserZoomPercent: 100,
      },
      {
        name: "390x844@100%",
        physicalViewport: { width: 390, height: 844 },
        browserZoomPercent: 100,
      },
    ] as const;

    const measurements = [];
    let initialized = false;
    for (const qualityCase of cases) {
      // Browser zoom reduces the CSS layout viewport by the zoom factor. This
      // models the resulting reflow without relying on browser-chrome shortcuts
      // that Chromium headless does not expose.
      const effectiveViewport = {
        width: Math.round(
          qualityCase.physicalViewport.width * 100 / qualityCase.browserZoomPercent,
        ),
        height: Math.round(
          qualityCase.physicalViewport.height * 100 / qualityCase.browserZoomPercent,
        ),
      };
      const revisionBeforeResize = initialized
        ? await readNumericAttribute(exploreScene(page), "data-camera-revision")
        : null;
      await page.setViewportSize(effectiveViewport);
      if (!initialized) {
        await page.goto(
          `/?visual=${encodeURIComponent(qualityCase.name)}#universe`,
          { waitUntil: "domcontentloaded" },
        );
        initialized = true;
      }
      await waitForExploreReady(page);
      await settleResponsiveLayout(page);
      const scene = exploreScene(page);
      const expectedVisibleCount = qualityCase.name.startsWith("390x844") ? 6 : 8;
      await expect
        .poll(() => readNumericAttribute(scene, "data-visible-molecule-count"), {
          message: `${qualityCase.name} must settle to its viewport-specific sample`,
        })
        .toBe(expectedVisibleCount);
      if (revisionBeforeResize !== null) {
        await expect
          .poll(() => readNumericAttribute(scene, "data-camera-revision"), {
            message: `${qualityCase.name} must refit the existing scene after live resize`,
          })
          .toBeGreaterThan(revisionBeforeResize);
      }
      await expect(scene).toHaveAttribute("data-scene-status", /^(?:ready|partial)$/);
      const overflow = await measureHorizontalOverflow(page);
      const spatialQuality = await measureClusterSpatialQuality(page);
      const canvasBox = await exploreCanvas(page).boundingBox();
      const renderer = {
        visibleMoleculeCount: await readNumericAttribute(
          scene,
          "data-visible-molecule-count",
        ),
        sceneSampleCount: await readNumericAttribute(scene, "data-scene-sample-count"),
        minimumGap: await readNumericAttribute(scene, "data-layout-minimum-gap"),
        overlapCount: await readNumericAttribute(scene, "data-overlap-count"),
        clippedMoleculeCount: await readNumericAttribute(
          scene,
          "data-clipped-molecule-count",
        ),
        visibleLabelCount: await readNumericAttribute(scene, "data-visible-label-count"),
        labelCollisionCount: await readNumericAttribute(
          scene,
          "data-label-collision-count",
        ),
      };
      const visibleIds = ((await scene.getAttribute("data-visible-molecules")) ?? "")
        .split(",")
        .filter(Boolean);
      const regionCounts = {
        pain: visibleIds.filter((id) => PAIN_REGION_IDS.has(id)).length,
        cardiovascular: visibleIds.filter((id) => !PAIN_REGION_IDS.has(id)).length,
      };
      measurements.push({
        ...qualityCase,
        effectiveViewport,
        overflow,
        canvasBox,
        renderer,
        regionCounts,
        spatialQuality,
      });
      await expect(scene).toHaveAttribute("data-active-webgl-contexts", "1");
      await expect(exploreCanvas(page)).toHaveCount(1);
      await attachScreenshot(
        page,
        testInfo,
        `explore-responsive-${qualityCase.name.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      );
    }

    await testInfo.attach("explore-responsive-overflow-metrics", {
      body: Buffer.from(`${JSON.stringify(measurements, null, 2)}\n`),
      contentType: "application/json",
    });
    expect(
      measurements.map(({ name, overflow }) => ({ name, overflowPx: overflow.overflowPx })),
      JSON.stringify(measurements),
    ).toEqual(cases.map(({ name }) => ({ name, overflowPx: 0 })));
    for (const measurement of measurements) {
      expect.soft(
        measurement.renderer.visibleMoleculeCount,
        `${measurement.name} must show six to ten real structures`,
      ).toBeGreaterThanOrEqual(INITIAL_SAMPLE_MINIMUM);
      expect.soft(measurement.renderer.visibleMoleculeCount).toBeLessThanOrEqual(
        INITIAL_SAMPLE_MAXIMUM,
      );
      expect.soft(measurement.renderer.sceneSampleCount).toBe(
        measurement.renderer.visibleMoleculeCount,
      );
      expect.soft(measurement.renderer.minimumGap).toBeGreaterThan(0);
      expect.soft({
        overlap: measurement.renderer.overlapCount,
        clipped: measurement.renderer.clippedMoleculeCount,
        labelCollision: measurement.renderer.labelCollisionCount,
      }).toEqual({ overlap: 0, clipped: 0, labelCollision: 0 });
      expect.soft(measurement.renderer.visibleLabelCount).toBeGreaterThan(0);
      expect.soft(
        measurement.regionCounts,
        `${measurement.name} must preserve the curated two-region composition`,
      ).toEqual(
        measurement.name.startsWith("390x844")
          ? { pain: 3, cardiovascular: 3 }
          : { pain: 4, cardiovascular: 4 },
      );
      expect.soft({
        overlap: measurement.spatialQuality.overlap,
        clipped: measurement.spatialQuality.clipped,
        labelCollision: measurement.spatialQuality.labelCollision,
        moleculeOcclusion: measurement.spatialQuality.moleculeOcclusion,
        readabilityViolationCount:
          measurement.spatialQuality.readabilityViolationCount,
      }, JSON.stringify(measurement.spatialQuality)).toEqual({
        overlap: 0,
        clipped: 0,
        labelCollision: 0,
        moleculeOcclusion: 0,
        readabilityViolationCount: 0,
      });
      expect.soft(
        measurement.spatialQuality.moleculeBoundsCount,
        `${measurement.name} must expose one real screen bound per visible structure`,
      ).toBe(measurement.renderer.visibleMoleculeCount);
      expect.soft(
        measurement.spatialQuality.minimumLabelHeight ?? 0,
        `${measurement.name} region-label buttons must remain at least 26px tall`,
      ).toBeGreaterThanOrEqual(26);
      expect.soft(
        measurement.spatialQuality.minimumStrongFontSize ?? 0,
        `${measurement.name} region names must remain at least 8px`,
      ).toBeGreaterThanOrEqual(8);
      expect.soft(
        measurement.canvasBox !== null &&
          measurement.canvasBox.y >= 0 &&
          measurement.canvasBox.y < measurement.effectiveViewport.height &&
          measurement.canvasBox.y + measurement.canvasBox.height <=
            measurement.effectiveViewport.height + 1,
        `${measurement.name} must contain the complete fitted 3D canvas in the first viewport`,
      ).toBe(true);
    }
  });
});
