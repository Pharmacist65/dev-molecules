import { expect, test, type Locator, type Page } from "@playwright/test";

const METFORMIN_ID = "molecule:imported:metformin-xzwyzxlipxdolr-uhfffaoysa-n";
const METFORMIN_SLUG = "metformin-xzwyzxlipxdolr-uhfffaoysa-n";
const REVIEWED_INDEX_ALIASES = [
  {
    name: "Atenolol",
    cid: 2249,
    id: "molecule:atenolol",
    slug: "atenolol",
    importedSlug: "atenolol-metkimkyrpqlgs-uhfffaoysa-n",
  },
  {
    name: "Metoprolol",
    cid: 4171,
    id: "molecule:metoprolol",
    slug: "metoprolol",
    importedSlug: "metoprolol-iubsymuccvwxpe-uhfffaoysa-n",
  },
] as const;

async function openFullCatalogResult(
  page: Page,
  query: string,
  recordId: string,
): Promise<Locator> {
  await page.getByRole("button", {
    name: /Yapı indeksine göz at|Browse structure index/i,
  }).click();
  const drawer = page.locator('[data-catalog-browse-drawer="true"]');
  await expect(drawer).toBeVisible();
  await drawer.getByRole("searchbox", {
    name: /Katalogda ara|Search the catalog/i,
  }).fill(query);
  const result = drawer.locator(`[data-catalog-record="${recordId}"]`);
  await expect(result).toBeVisible();
  return result;
}

test("project-base deployment loads structures and the publication-gated synthesis coverage", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];
  const requestedUrls: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => requestedUrls.push(request.url()));
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.failure()?.errorText ?? "unknown"} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
  });
  await page.goto("./#molecule/propranolol");

  await expect(page).toHaveTitle(/Molevren/);
  const typography = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const firstMode = document.querySelector<HTMLElement>("nav button");
    return {
      sansVariable: styles.getPropertyValue("--font-geist-sans").trim(),
      monoVariable: styles.getPropertyValue("--font-geist-mono").trim(),
      modeFontSize: firstMode ? Number.parseFloat(getComputedStyle(firstMode).fontSize) : 0,
    };
  });
  expect(typography.sansVariable).toContain("Arial");
  expect(typography.monoVariable).toContain("ui-monospace");
  expect(typography.modeFontSize).toBeGreaterThanOrEqual(9);
  await expect(page.locator('[data-explore-level="focus"]')).toBeVisible();
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]')).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]').first()).toBeVisible();
  await expect(page.locator('[data-active-webgl-contexts="1"]').first()).toBeVisible();
  await expect
    .poll(() => requestedUrls.filter((url) => /\/dev-molecules\/structures\/.*-3d\.sdf$/i.test(url)).length)
    .toBeGreaterThan(0);

  const structureResponse = await page.request.get(
    "/dev-molecules/structures/pubchem/cid-4946-3d.sdf",
  );
  expect(structureResponse.status()).toBe(200);
  expect((await structureResponse.text()).length).toBeGreaterThan(1_000);

  await page.getByRole("button", { name: /^(2B|2D)$/ }).click();
  await expect
    .poll(() => requestedUrls.filter((url) => /\/dev-molecules\/structures\/.*-2d\.sdf$/i.test(url)).length)
    .toBeGreaterThan(0);

  await page.goto("./#academy/synthesis/propranolol/overview", {
    waitUntil: "domcontentloaded",
  });
  const synthesis = page.locator('[data-synthesis-academy="phase-6"]');
  await expect(synthesis).toBeVisible();
  await expect(synthesis).toHaveAttribute("data-published-route-details", "0");
  await synthesis
    .getByRole("button", { name: /Sentez kanıtını aç|Open synthesis evidence/i })
    .first()
    .click();
  await expect(synthesis.locator('[data-synthesis-atlas="public-alpha-draft"]')).toBeVisible();
  await expect(
    synthesis.locator('[data-public-alpha-synthesis="source-supported-draft"]'),
  ).toBeVisible();
  await expect(synthesis.locator('[data-synthesis-target-product="true"]')).toHaveCount(0);
  await expect(synthesis.locator("[data-dragging][data-route-direction]")).toHaveCount(0);

  await page.goto("./#academy/nomenclature/pharmaceutical", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("nomenclature-academy")).toBeVisible();

  expect(requestedUrls.some((url) => /\/api\/evidence(?:\?|$)/.test(url))).toBe(false);
  expect(
    requestedUrls.some((url) => new URL(url).pathname.startsWith("/structures/")),
    "structure assets must remain under the GitHub project base path",
  ).toBe(false);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
});

test("project-base indexed overlap aliases stay on reviewed Atenolol and Metoprolol identities", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
  });
  await page.goto("./#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();
  for (const identity of REVIEWED_INDEX_ALIASES) {
    const result = await openFullCatalogResult(page, identity.name, identity.id);
    await expect(result).toContainText(identity.name);
    await expect(result).not.toContainText(String(identity.cid));
    await result.click();
    await expect(page).toHaveURL(
      new RegExp(`/dev-molecules/#molecule/${identity.slug}$`),
    );
    await expect(page.locator('[data-selected-molecule]').first()).toHaveAttribute(
      "data-selected-molecule",
      identity.id,
    );
    await expect(page.locator("#molecule-focus-inspector")).toContainText(identity.name);
    await expect(page.locator("#molecule-focus-inspector")).toContainText(String(identity.cid));

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      new RegExp(`/dev-molecules/#molecule/${identity.slug}$`),
    );
    await expect(page.locator('[data-selected-molecule]').first()).toHaveAttribute(
      "data-selected-molecule",
      identity.id,
    );

    await page.goto(`./#molecule/${identity.importedSlug}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      new RegExp(`/dev-molecules/#molecule/${identity.slug}$`),
    );
    await expect(page.locator('[data-selected-molecule]').first()).toHaveAttribute(
      "data-selected-molecule",
      identity.id,
    );

    await page.goto("./#universe", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-catalog-status="ready"]')).toBeVisible();
  }
});

test("project-base public-neutral cluster permalinks restore and reject raw draft labels", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("dev-molecules:locale")) {
      window.localStorage.setItem("dev-molecules:locale", "tr");
    }
  });
  await page.goto("./#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();

  await expect(page.locator('[data-representative-scope="true"]')).toHaveText(
    /Temsilî yapılar|Representative structures/i,
  );
  await page.goto("./#cluster/structural-similarity/representative-structures", {
    waitUntil: "domcontentloaded",
  });
  const exactClusterUrl = page.url();
  expect(exactClusterUrl).toMatch(
    /\/dev-molecules\/#cluster\/structural-similarity\/representative-structures$/,
  );
  await expect(page.locator('[data-explore-level="cluster"]')).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(exactClusterUrl);
  await expect(page.locator('[data-explore-level="cluster"]')).toBeVisible();
  await expect(page.locator('[data-active-webgl-contexts="1"]').first()).toBeVisible();

  await page.goto("./#cluster/therapeutic/Cardiovascular", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/dev-molecules\/#universe$/);
  await expect(page.locator('[data-explore-level="universe"]')).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
  });
  await page.goto("./#cluster/therapeutic/Kardiyovask%C3%BCler", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/dev-molecules\/#universe$/);
  await expect(page.locator('[data-explore-level="universe"]')).toBeVisible();

  await page.goto("./#cluster/not-a-lens/Cardiovascular", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/dev-molecules\/#universe$/);

  await page.goto("./#cluster/therapeutic/not-a-real-cluster", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/dev-molecules\/#universe$/);
});

test("project-base full-index molecule and compare permalinks survive reload", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];
  const requestedUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => requestedUrls.push(request.url()));
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED") {
      failedRequests.push(`${request.failure()?.errorText ?? "unknown"} ${request.url()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
  });

  await page.goto("./#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();
  await (await openFullCatalogResult(page, "Metformin", METFORMIN_ID)).click();
  await expect(page).toHaveURL(new RegExp(`/dev-molecules/#molecule/${METFORMIN_SLUG}$`));
  await expect(page.locator('[data-explore-level="focus"]')).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]').first()).toBeVisible();

  requestedUrls.length = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/dev-molecules/#molecule/${METFORMIN_SLUG}$`));
  await expect(page.locator('[data-explore-level="focus"]')).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]').first()).toBeVisible();
  await expect(page.locator('[data-active-webgl-contexts="1"]').first()).toBeVisible();
  await expect(page.locator('canvas[data-molecular-scene-canvas]')).toHaveCount(1);
  await expect(page.locator('[data-selected-molecule]').first()).toHaveAttribute(
    "data-selected-molecule",
    METFORMIN_ID,
  );
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/dev-molecules\/catalog\/shards\/alphabetic\/m\.json$/i.test(url)),
    )
    .toBe(true);
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/dev-molecules\/catalog\/structures\/pubchem\/cid-4091-3d\.sdf$/i.test(url)),
    )
    .toBe(true);

  await page.evaluate((metforminSlug) => {
    window.location.hash = `#compare/propranolol,${metforminSlug}`;
  }, METFORMIN_SLUG);
  await expect(page.locator('[data-explore-level="compare"]')).toBeVisible();
  await expect(page.locator('[data-visible-count="2"]').first()).toBeVisible();

  requestedUrls.length = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(
    new RegExp(`/dev-molecules/#compare/propranolol,${METFORMIN_SLUG}$`),
  );
  await expect(page.locator('[data-explore-level="compare"]')).toBeVisible();
  await expect(page.locator('[data-scene-status="ready"]').first()).toBeVisible();
  await expect(page.locator('[data-active-webgl-contexts="1"]').first()).toBeVisible();
  await expect(page.locator('[data-visible-count="2"]').first()).toBeVisible();
  await expect(page.locator('[data-selected-molecule]').first()).toHaveAttribute(
    "data-selected-molecule",
    `molecule:propranolol,${METFORMIN_ID}`,
  );
  await expect(page.locator('[data-graph-comparison="ready"]')).toBeVisible();
  await expect(page.locator('canvas[data-molecular-scene-canvas]')).toHaveCount(1);
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/dev-molecules\/catalog\/shards\/alphabetic\/m\.json$/i.test(url)),
    )
    .toBe(true);
  await expect
    .poll(
      () => requestedUrls.some((url) => /\/dev-molecules\/catalog\/structures\/pubchem\/cid-4091-3d\.sdf$/i.test(url)),
    )
    .toBe(true);

  await page.evaluate(() => {
    window.location.hash = "#compare/propranolol,propranolol";
  });
  await expect(page).toHaveURL(/\/dev-molecules\/#universe$/);
  await expect(page.locator('[data-explore-level="universe"]')).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
});
