import { expect, test, type Locator, type Page } from "@playwright/test";

type Rgba = {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
};

const FAMILY_ROUTES = ["nsaids", "beta-adrenergic-blockers"] as const;

const FAMILY_COPY = {
  tr: {
    hierarchy: "Üyelik / sınıflandırma durumu",
    mechanism: "Ortak mekanizma kanıt durumu",
    boundary:
      "Bu aday seti için kaynaklı üyelik veya sınıflandırma yolu eklenmedi. Set üyeliği kurulmamıştır.",
  },
  en: {
    hierarchy: "Membership / classification status",
    mechanism: "Shared-mechanism evidence status",
    boundary:
      "No source-backed membership or classification path has been added for this candidate set. Set membership is not established.",
  },
} as const;

const appRoot = (page: Page) => page.locator("[data-route]").first();

async function expectCatalogReady(page: Page) {
  await expect(
    page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'),
  ).toBeVisible({ timeout: 30_000 });
}

async function switchToLocale(page: Page, locale: "tr" | "en") {
  if ((await appRoot(page).getAttribute("data-locale")) === locale) return;

  await page
    .getByRole("button", {
      name: locale === "en" ? "Dili İngilizce yap" : "Switch language to Turkish",
      exact: true,
    })
    .click();
  await expect(appRoot(page)).toHaveAttribute("data-locale", locale);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

function parseComputedColor(value: string): Rgba {
  const channels = value.match(/[\d.]+/gu)?.map(Number) ?? [];
  if (channels.length < 3) {
    throw new Error(`Unsupported computed color: ${value}`);
  }

  if (value.trimStart().startsWith("color(srgb ")) {
    return {
      red: channels[0] * 255,
      green: channels[1] * 255,
      blue: channels[2] * 255,
      alpha: channels[3] ?? 1,
    };
  }

  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha: channels[3] ?? 1,
  };
}

function relativeLuminance({ red, green, blue }: Rgba): number {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
}

function contrastRatio(foreground: Rgba, background: Rgba): number {
  const compositedForeground = foreground.alpha >= 0.999
    ? foreground
    : {
        red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
        green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
        blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
        alpha: 1,
      };
  const foregroundLuminance = relativeLuminance(compositedForeground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

async function expectOpaqueLightSurface(family: Locator, context: string) {
  const computed = await family.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
    };
  });
  const background = parseComputedColor(computed.backgroundColor);

  expect(
    background.alpha,
    `${context}: the family root must provide an opaque surface`,
  ).toBeGreaterThanOrEqual(0.99);
  expect(
    relativeLuminance(background),
    `${context}: the family root surface must remain visibly light`,
  ).toBeGreaterThanOrEqual(0.85);
  expect(
    computed.backgroundImage,
    `${context}: the reading surface should retain its editorial treatment`,
  ).not.toBe("none");
}

async function expectComputedContrast(
  text: Locator,
  family: Locator,
  context: string,
) {
  await expect(text, `${context}: text must be visible`).toBeVisible();
  const computed = await text.evaluate((element) => getComputedStyle(element).color);
  const familyBackground = await family.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const ratio = contrastRatio(
    parseComputedColor(computed),
    parseComputedColor(familyBackground),
  );

  expect(
    ratio,
    `${context}: computed text-to-surface contrast was ${ratio.toFixed(2)}:1`,
  ).toBeGreaterThanOrEqual(4.5);
}

async function expectSurfaceContrast(
  text: Locator,
  surface: Locator,
  context: string,
) {
  await expect(text, `${context}: text must be visible`).toBeVisible();
  const color = await text.evaluate((element) => getComputedStyle(element).color);
  const backgroundColor = await surface.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const background = parseComputedColor(backgroundColor);
  const ratio = contrastRatio(parseComputedColor(color), background);

  expect(
    background.alpha,
    `${context}: the summary chip must own an opaque surface`,
  ).toBeGreaterThanOrEqual(0.99);
  expect(
    relativeLuminance(background),
    `${context}: the summary chip must remain on the dark Atlas surface`,
  ).toBeLessThanOrEqual(0.15);
  expect(
    ratio,
    `${context}: computed text-to-chip contrast was ${ratio.toFixed(2)}:1`,
  ).toBeGreaterThanOrEqual(4.5);
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));

  expect(metrics.document, `${context}: document must fit the viewport`).toBeLessThanOrEqual(
    metrics.viewport + 1,
  );
  expect(metrics.body, `${context}: body must fit the viewport`).toBeLessThanOrEqual(
    metrics.viewport + 1,
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  });
});

test("family review pages keep an opaque light reading surface and computed text contrast in TR/EN", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const slug of FAMILY_ROUTES) {
    await page.goto(`./#family/${slug}`, { waitUntil: "domcontentloaded" });
    await expectCatalogReady(page);
    const family = page.locator(`[data-family-page="${slug}"]`);
    await expect(family).toBeVisible();

    for (const locale of ["tr", "en"] as const) {
      await switchToLocale(page, locale);
      const copy = FAMILY_COPY[locale];
      const context = `${slug} (${locale.toUpperCase()})`;
      const hierarchy = family.getByRole("heading", {
        name: copy.hierarchy,
        exact: true,
      });
      const mechanism = family.getByRole("heading", {
        name: copy.mechanism,
        exact: true,
      }).first();
      const boundary = family.getByText(copy.boundary, { exact: true });

      await expectOpaqueLightSurface(family, context);
      await expectComputedContrast(family.locator("h1"), family, `${context} title`);
      await expectComputedContrast(hierarchy, family, `${context} hierarchy heading`);
      await expectComputedContrast(mechanism, family, `${context} mechanism heading`);
      await expectComputedContrast(boundary, family, `${context} boundary copy`);
    }

    await switchToLocale(page, "tr");
  }
});

test("Molevren header signature is legible and collision-free on desktop and becomes a 40px symbol on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./#home", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);

  const signature = page.locator('[data-brand-signature="desktop"]');
  const tagline = signature.getByText("STRUCTURE. MOTION. KNOWLEDGE.", {
    exact: true,
  });
  const brandButton = signature.locator("xpath=ancestor::button[1]");
  const topbar = signature.locator("xpath=ancestor::header[1]");

  await expect(signature).toBeVisible();
  await expect(tagline).toBeVisible();

  const signatureMetrics = await signature.evaluate((element) => {
    const taglineElement = element.querySelector("span");
    if (!taglineElement) throw new Error("Brand tagline is missing");
    const signatureRect = element.getBoundingClientRect();
    const taglineRect = taglineElement.getBoundingClientRect();
    return {
      width: signatureRect.width,
      taglineFontSize: Number.parseFloat(getComputedStyle(taglineElement).fontSize),
      taglineHeight: taglineRect.height,
      taglineFits:
        taglineRect.left >= signatureRect.left - 0.5 &&
        taglineRect.right <= signatureRect.right + 0.5,
    };
  });
  expect(signatureMetrics.width).toBeGreaterThanOrEqual(244);
  expect(signatureMetrics.taglineFontSize).toBeGreaterThanOrEqual(11);
  expect(signatureMetrics.taglineHeight).toBeGreaterThanOrEqual(11);
  expect(signatureMetrics.taglineFits).toBe(true);

  const brandBox = await brandButton.boundingBox();
  expect(brandBox, "desktop brand button must have a rendered box").not.toBeNull();
  expect(brandBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  const headerGeometry = await topbar.evaluate((header) => {
    const measure = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const [brand, navigation, actions] = Array.from(header.children);
    if (!brand || !navigation || !actions) {
      throw new Error("Molevren header regions are incomplete");
    }
    return {
      header: measure(header),
      brand: measure(brand),
      navigation: measure(navigation),
      actions: measure(actions),
    };
  });
  expect(headerGeometry.brand.right).toBeLessThanOrEqual(
    headerGeometry.navigation.left + 0.5,
  );
  expect(headerGeometry.navigation.right).toBeLessThanOrEqual(
    headerGeometry.actions.left + 0.5,
  );
  for (const region of [
    headerGeometry.brand,
    headerGeometry.navigation,
    headerGeometry.actions,
  ]) {
    expect(region.left).toBeGreaterThanOrEqual(headerGeometry.header.left - 0.5);
    expect(region.right).toBeLessThanOrEqual(headerGeometry.header.right + 0.5);
  }
  await expectNoHorizontalOverflow(page, "desktop Molevren header");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(signature).toBeHidden();
  const mobileSymbol = brandButton.locator(":scope > img");
  await expect(mobileSymbol).toBeVisible();
  const mobileSymbolBox = await mobileSymbol.boundingBox();
  expect(mobileSymbolBox, "mobile brand symbol must have a rendered box").not.toBeNull();
  expect(mobileSymbolBox?.width ?? 0).toBeGreaterThanOrEqual(39.5);
  expect(mobileSymbolBox?.width ?? 0).toBeLessThanOrEqual(40.5);
  expect(mobileSymbolBox?.height ?? 0).toBeGreaterThanOrEqual(39.5);
  expect(mobileSymbolBox?.height ?? 0).toBeLessThanOrEqual(40.5);
  await expectNoHorizontalOverflow(page, "mobile Molevren header");
});

test("Spatial Atlas summary chips expose their content on the midnight surface", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./#atlas/spatial", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);

  const atlas = page.locator(
    '[data-drug-atlas="true"][data-atlas-view="spatial"]',
  );
  const spatial = atlas.locator('[data-atlas-spatial="true"]');
  const summary = spatial.locator('[data-universe-summary="true"]');
  const chips = summary.locator(":scope > span");

  await expect(spatial).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(chips).toHaveCount(3);
  await expect(chips.nth(0)).toContainText("Temsilî yapılar");
  await expect(chips.nth(1)).toContainText("küme");
  await expect(chips.nth(2)).toContainText("Evren");

  await expectSurfaceContrast(
    chips.nth(0),
    chips.nth(0),
    "representative-structure chip",
  );
  await expectSurfaceContrast(
    chips.nth(1),
    chips.nth(1),
    "cluster-count chip",
  );
  await expectSurfaceContrast(
    chips.nth(2).locator("strong"),
    chips.nth(2),
    "universe-level chip",
  );
});

test("Beta-sitosterol direct route explains SMILES and @/@@ before exposing source notation", async ({
  page,
}) => {
  await page.goto(
    "./#drug/beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n",
    { waitUntil: "domcontentloaded" },
  );
  await expectCatalogReady(page);

  const record = page.locator('[data-basic-molecular-record="true"]');
  const panel = record.locator('[data-smiles-notation="student"]');
  await expect(record).toHaveAttribute("data-pubchem-cid", "222284");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-isomeric-smiles", "present");
  await expect(panel.getByRole("heading", { name: "SMILES nedir?", exact: true })).toBeVisible();
  await expect(panel).toContainText("Simplified Molecular Input Line Entry System");
  await expect(
    panel.getByRole("heading", { name: "@ = R, @@ = S mi?", exact: true }),
  ).toBeVisible();
  await expect(panel.getByText(/^Hayır\./u)).toBeVisible();
  await expect(panel.getByText(/Cahn–Ingold–Prelog \(CIP\)/u)).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "OpenSMILES spesifikasyonu", exact: true }),
  ).toHaveAttribute("href", "https://opensmiles.org/opensmiles.html");

  const isomericSource = panel.locator('[data-raw-smiles="isomeric"]');
  await expect(isomericSource).toBeHidden();
  await panel.getByText("Bu kaydın SMILES gösterimlerini gör", { exact: true }).click();
  await expect(isomericSource).toBeVisible();
  await expect(isomericSource).toContainText("@@");

  await switchToLocale(page, "en");
  await expect(panel.getByRole("heading", { name: "What is SMILES?", exact: true })).toBeVisible();
  await expect(
    panel.getByRole("heading", {
      name: "Does @ mean R and @@ mean S?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(panel.getByText(/^No\./u)).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page, "mobile SMILES guide");
  const mobilePanelMetrics = await panel.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    typeColumns: getComputedStyle(
      element.querySelector<HTMLElement>("[class*='notationTypes']")!,
    ).gridTemplateColumns,
  }));
  expect(mobilePanelMetrics.scrollWidth).toBeLessThanOrEqual(
    mobilePanelMetrics.clientWidth + 1,
  );
  expect(mobilePanelMetrics.typeColumns.trim().split(/\s+/u)).toHaveLength(1);
});
