import { expect, test, type Page } from "@playwright/test";

interface StaticRuntimeEvidence {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
  readonly requestedUrls: string[];
}

function watchStaticRuntime(page: Page): StaticRuntimeEvidence {
  const evidence: StaticRuntimeEvidence = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
    requestedUrls: [],
  };
  page.on("console", (message) => {
    if (message.type() === "error") evidence.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
  page.on("request", (request) => evidence.requestedUrls.push(request.url()));
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText === "net::ERR_ABORTED") return;
    evidence.failedRequests.push(
      `${request.failure()?.errorText ?? "unknown"} ${request.url()}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      evidence.badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return evidence;
}

test("2.0 lazy workspaces and Ketcher assets stay inside the GitHub Pages base path", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const evidence = watchStaticRuntime(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  });

  await page.goto("./#home", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-home="true"]')).toBeVisible();
  await expect(
    page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'),
  ).toBeVisible({ timeout: 30_000 });

  await page.goto("./#atlas", { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-drug-atlas="true"][data-atlas-view="browse"]'),
  ).toBeVisible();

  await page.goto("./#family/beta-adrenergic-blockers", {
    waitUntil: "domcontentloaded",
  });
  const family = page.locator(
    '[data-family-page="beta-adrenergic-blockers"]',
  );
  await expect(family).toBeVisible();
  await expect(
    family.getByRole("link", { name: /Drug dossier/i }),
  ).toHaveCount(4);
  await expect
    .poll(
      () => evidence.requestedUrls.filter((url) =>
        /\/dev-molecules\/structures\/pubchem\/cid-(?:4946|4171|2249|2585)-2d\.sdf$/i.test(url),
      ).length,
      { message: "family representatives must load real 2D SDFs under the project base" },
    )
    .toBeGreaterThanOrEqual(4);

  await page.goto("./#drug/propranolol", { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-molecule-id="molecule:propranolol"]'),
  ).toBeVisible();

  await page.goto("./#academy", { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-academy-learning-map="eight-modules"]'),
  ).toBeVisible();

  await page.goto("./#lab", { waitUntil: "domcontentloaded" });
  await expect(
    page.locator(
      '[data-ketcher-editor="standalone"][data-ketcher-ready="true"]',
    ),
  ).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(
      () => evidence.requestedUrls.some((url) =>
        /\/dev-molecules\/assets\/indigoWorker-[^/]+\.js$/i.test(url),
      ),
      { message: "the Indigo worker must resolve below the project base path" },
    )
    .toBe(true);
  await expect
    .poll(
      () => evidence.requestedUrls.some((url) =>
        /\/dev-molecules\/assets\/indigo-ketcher-[^/]+\.wasm$/i.test(url),
      ),
      { message: "the Ketcher WASM must resolve below the project base path" },
    )
    .toBe(true);

  const relevantLazyAssets = [
    /\/dev-molecules\/assets\/atlas-[^/]+\.js$/i,
    /\/dev-molecules\/assets\/dossier-[^/]+\.js$/i,
    /\/dev-molecules\/assets\/academy-[^/]+\.js$/i,
    /\/dev-molecules\/assets\/lab-[^/]+\.js$/i,
    /\/dev-molecules\/assets\/KetcherWorkspace-[^/]+\.js$/i,
    /\/dev-molecules\/assets\/KetcherEditorSurface-[^/]+\.js$/i,
  ];
  for (const pattern of relevantLazyAssets) {
    expect(
      evidence.requestedUrls.some((url) => pattern.test(url)),
      `missing project-base lazy asset matching ${pattern}`,
    ).toBe(true);
  }
  expect(
    evidence.requestedUrls.some((url) => {
      const pathname = new URL(url).pathname;
      return pathname.startsWith("/assets/") || pathname.startsWith("/catalog/");
    }),
    "no static asset may escape the /dev-molecules project base",
  ).toBe(false);
  expect(evidence.consoleErrors).toEqual([]);
  expect(evidence.pageErrors).toEqual([]);
  expect(evidence.failedRequests).toEqual([]);
  expect(evidence.badResponses).toEqual([]);
});
