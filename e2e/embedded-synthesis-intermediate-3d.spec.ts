import { expect, test } from "@playwright/test";

test("exact route-boundary output opens in Explorer and follows keyboard step selection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "en");
    window.localStorage.setItem("molevren:motion-mode", "off");
  });
  const stableSlug = "triethylenetetramine-vilcjcgezxaxto-uhfffaoysa-n";
  await page.goto(`/#drug/${stableSlug}`, { waitUntil: "domcontentloaded" });

  const record = page.locator('[data-basic-molecular-record="true"]');
  await expect(record).toBeVisible({ timeout: 30_000 });
  const studio = record.locator(
    '[data-embedded-synthesis-learning-studio="ready"] [data-synthesis-learning-studio="true"]',
  );
  await expect(studio).toBeVisible({ timeout: 30_000 });
  await expect(studio).toHaveAttribute("data-computed-3d-identity-count", /[1-9]\d*/u);

  await studio.getByRole("tab", { name: "Synthesis Steps", exact: true }).click();
  const stepsPanel = studio.getByRole("tabpanel", { name: "Synthesis Steps", exact: true });
  const teachingRoute = stepsPanel.locator('[data-route-id]').nth(2);
  await expect(teachingRoute).toContainText("teaching reconstruction");
  await teachingRoute.click();

  const selectedStep = stepsPanel.locator('[data-synthesis-step-panel][data-selected="true"]');
  await expect(selectedStep.locator('[data-material-role="route_intermediate"]')).toContainText(
    "piperazine",
  );
  const lightSurfaceAccent = selectedStep.locator('[data-material-role] > span').first();
  const lightSurfaceContrast = await lightSurfaceAccent.evaluate((element) => {
    const parseRgb = (value: string): readonly number[] =>
      value.match(/[\d.]+/gu)?.slice(0, 3).map(Number) ?? [];
    const luminance = (rgb: readonly number[]): number => {
      const [red, green, blue] = rgb.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const foreground = parseRgb(getComputedStyle(element).color);
    let backgroundElement: Element | null = element;
    let background: readonly number[] = [255, 255, 255];
    while (backgroundElement) {
      const backgroundColor = getComputedStyle(backgroundElement).backgroundColor;
      if (!backgroundColor.endsWith(", 0)")) {
        background = parseRgb(backgroundColor);
        break;
      }
      backgroundElement = backgroundElement.parentElement;
    }
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  });
  expect(lightSurfaceContrast).toBeGreaterThanOrEqual(4.5);
  await expect(
    studio.locator(':scope > header > div:first-child > span').first(),
  ).toHaveCSS("color", "rgb(255, 138, 0)");
  const inspect = selectedStep.locator(
    '[data-step-output-3d-state="allowed"][data-step-output-3d-reason="exact_computed_conformer"]',
  );
  await expect(inspect).toBeEnabled();
  await inspect.click();
  await expect(studio.getByRole("tab", { name: "3D Explorer", exact: true })).toBeFocused();

  const explorerPanel = studio.getByRole("tabpanel", { name: "3D Explorer", exact: true });
  const focusedOutput = explorerPanel.locator('[data-explorer-focus="step-output"]');
  await expect(focusedOutput).toHaveAttribute(
    "data-step-output-material-role",
    "route_intermediate",
  );
  await expect(focusedOutput).toHaveAttribute("data-target-fallback-used", "false");
  await expect(focusedOutput).toContainText(
    "Computed 3D conformer · exact-identity route-boundary material · intermediate role pending review",
  );
  await expect(focusedOutput).toContainText("piperazine");
  const viewer = focusedOutput.locator('[data-molecule-viewer="true"]');
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAttribute("data-structure-status", "ready");
  await expect(viewer).toContainText("RDKit ETKDGv3");

  await studio.getByRole("tab", { name: "Synthesis Steps", exact: true }).click();
  const stepTabs = stepsPanel.locator('[aria-label="Route steps"] [role="tab"]');
  await stepTabs.first().focus();
  await stepTabs.first().press("ArrowRight");
  await expect(stepTabs.nth(1)).toHaveAttribute("aria-selected", "true");

  await studio.getByRole("tab", { name: "3D Explorer", exact: true }).click();
  await expect(focusedOutput).toHaveAttribute(
    "data-step-output-material-role",
    "route_intermediate",
  );
  await expect(focusedOutput).toContainText("phosphoric acid");
  await expect(focusedOutput).toHaveAttribute("data-target-fallback-used", "false");
});
