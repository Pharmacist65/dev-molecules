import { expect, test } from "@playwright/test";

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

test("project-base deployment loads structures and uses the curated static evidence path", async ({ page }) => {
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

  await expect(page).toHaveTitle(/Dev Molecules/);
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

  await page.getByRole("button", { name: /Araştır|Discover/i }).click();
  await page.getByRole("button", { name: /Kanıt kartı oluştur|Generate evidence card/i }).click();
  await expect(page.getByText(/Kontrollü yedek yanıt|Curated fallback/i).first()).toBeVisible();

  await page.getByRole("button", { name: /02 Öğren|02 Learn/i }).click();
  await page
    .getByRole("button", { name: /Sentez Atlası'nı aç|Open Synthesis Atlas/i })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /Bir molekülü, dönüşümler boyunca düşün|Think through a molecule/i })).toBeVisible();
  await page.getByRole("button", { name: /Öğrenme haritasına dön|Back to learning map/i }).click();
  await page
    .getByRole("button", { name: /Akademiyi aç|Open Academy/i })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /İlaç Nomenklatürü Akademisi|Pharmaceutical Nomenclature Academy/i })).toBeVisible();

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
  const search = page.getByRole("searchbox", { name: /Molekül ara|Search molecules/i });

  for (const identity of REVIEWED_INDEX_ALIASES) {
    await search.fill(identity.name);
    const result = page.locator(`[data-catalog-result="${identity.id}"]`);
    await expect(result).toBeVisible();
    await expect(result).toContainText(String(identity.cid));
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

test("project-base cluster permalinks restore exactly and reject invalid routes", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("dev-molecules:locale")) {
      window.localStorage.setItem("dev-molecules:locale", "tr");
    }
  });
  await page.goto("./#universe", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'))
    .toBeVisible();

  const clusterButtons = page.getByRole("button", {
    name: /kümesi,?\s*\d+\s*molekül|cluster,?\s*\d+\s*molecules?/i,
  });
  await expect(clusterButtons.nth(1)).toBeVisible();
  await clusterButtons.nth(1).click();
  const exactClusterUrl = page.url();
  await expect(page.locator('[data-explore-level="cluster"]')).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(exactClusterUrl);
  await expect(page.locator('[data-explore-level="cluster"]')).toBeVisible();
  await expect(page.locator('[data-active-webgl-contexts="1"]').first()).toBeVisible();

  await page.goto("./#cluster/therapeutic/Cardiovascular", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/dev-molecules\/#cluster\/therapeutic\/cardiovascular$/);
  await expect(page.locator('[data-explore-level="cluster"]')).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
  });
  await page.goto("./#cluster/therapeutic/Kardiyovask%C3%BCler", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/dev-molecules\/#cluster\/therapeutic\/cardiovascular$/);
  await expect(page.locator('[data-explore-level="cluster"]')).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dev-molecules\/#cluster\/therapeutic\/cardiovascular$/);
  await expect(page.locator('[data-explore-level="cluster"]')).toBeVisible();

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
  await page
    .getByRole("searchbox", { name: /Molekül ara|Search molecules/i })
    .fill("Metformin");
  await page.locator(`[data-catalog-result="${METFORMIN_ID}"]`).click();
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
