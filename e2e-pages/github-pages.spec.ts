import { expect, test } from "@playwright/test";

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
