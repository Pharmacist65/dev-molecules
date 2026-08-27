import { expect, test, type Locator, type Page } from "@playwright/test";

type Locale = "tr" | "en";

const scenarios = [
  {
    slug: "propranolol",
    moleculeId: "molecule:propranolol",
    name: "Propranolol",
    targets: [
      "ADRB1 · beta-1 adrenergic receptor",
      "ADRB2 · beta-2 adrenergic receptor",
    ],
    route: { tr: "Oral", en: "Oral" },
    formulation: {
      tr: "Tablet",
      en: "Tablet",
    },
    metabolite: "4-Hydroxypropranolol",
    metaboliteEdges: 3,
    comparison: "Metoprolol",
    missing: {
      tr: /Sağlıklı erişkin oral clearance: bulunamadı — tahmin edilmedi\./u,
      en: /Healthy-adult oral clearance: not found — not estimated\./u,
    },
  },
  {
    slug: "celecoxib",
    moleculeId: "molecule:celecoxib",
    name: "Celecoxib",
    targets: ["PTGS2 · cyclooxygenase-2"],
    route: { tr: "Oral", en: "Oral" },
    formulation: { tr: "Kapsül", en: "Capsule" },
    metabolite: "Hydroxycelecoxib",
    metaboliteEdges: 2,
    comparison: "Valdecoxib",
    missing: {
      tr: /Mutlak oral biyoyararlanım: çalışılmamış — null\./u,
      en: /Absolute oral bioavailability: not studied — null\./u,
    },
  },
  {
    slug: "omeprazole",
    moleculeId: "molecule:omeprazole",
    name: "Omeprazole",
    targets: ["ATP4A · gastric H+/K+-ATPase alpha subunit"],
    route: { tr: "Oral", en: "Oral" },
    formulation: {
      tr: "Gecikmeli salımlı kapsül",
      en: "Delayed-release capsule",
    },
    metabolite: "5′-Hydroxyomeprazole",
    metaboliteEdges: 3,
    comparison: "Esomeprazole",
    missing: {
      tr: /Dağılım hacmi: anchor etikette yok — null\./u,
      en: /Volume of distribution: absent from the anchor label — null\./u,
    },
  },
] as const;

const localeLabels = {
  tr: {
    story: "Hikâye Modu",
    reference: "Referans Modu",
    overview: "Genel Bakış",
    pharmacology: "Farmakoloji",
    adme: "ADME",
    synthesis: "Sentez",
    nomenclature: "Nomenklatür",
    comparisons: "SAR ve Karşılaştırma",
    learning: "Öğrenme görevleri",
    sources: "Kaynaklar",
    check: "Yanıtı kontrol et",
    correct: /Doğru — kanıt sınırı korundu\./u,
    productAnchor: "Bu anlatının ürün ve uygulama çapası",
    nullHeading: "Bilinmeyenler null kalır",
  },
  en: {
    story: "Story Mode",
    reference: "Reference Mode",
    overview: "Overview",
    pharmacology: "Pharmacology",
    adme: "ADME",
    synthesis: "Synthesis",
    nomenclature: "Nomenclature",
    comparisons: "SAR & Comparisons",
    learning: "Learning tasks",
    sources: "Sources",
    check: "Check answer",
    correct: /Correct — the evidence boundary is preserved\./u,
    productAnchor: "Product and administration anchor for this story",
    nullHeading: "Unknowns remain null",
  },
} as const;

const rawStoryEnum = /(?:source-supported|pending-review|expert-reviewed|computed-unreviewed|context-only|(?:molecule|source|form):[a-z0-9-]+|(?:IMMEDIATE|DELAYED)-RELEASE (?:TABLET|CAPSULE))/u;

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    scrollX: window.scrollX,
  }));
  expect(metrics.scrollWidth, `${context}: document width`).toBeLessThanOrEqual(
    metrics.clientWidth + 1,
  );
  expect(metrics.bodyScrollWidth, `${context}: body width`).toBeLessThanOrEqual(
    metrics.clientWidth + 1,
  );
  expect(metrics.scrollX, `${context}: horizontal position`).toBe(0);
}

async function expectDrawersClosed(dossier: Locator, context: string) {
  const drawers = dossier.locator('details[data-source-drawer="closed-by-default"]');
  await expect(drawers.first(), `${context}: source drawer exists`).toBeVisible();
  expect(
    await drawers.evaluateAll((elements) =>
      elements.every((element) => !(element as HTMLDetailsElement).open)
    ),
    `${context}: every source drawer starts closed`,
  ).toBe(true);
}

async function expectAnchor(
  dossier: Locator,
  scenario: (typeof scenarios)[number],
  locale: Locale,
  presentation: "story" | "reference",
) {
  const anchor = dossier.locator(
    `[data-flagship-product-anchor="${presentation}"]`,
  );
  await expect(anchor).toBeVisible();
  await expect(
    anchor.getByRole("heading", {
      name: localeLabels[locale].productAnchor,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    anchor.getByText(scenario.route[locale], { exact: true }),
  ).toBeVisible();
  await expect(
    anchor.getByText(scenario.formulation[locale], { exact: true }),
  ).toBeVisible();
}

async function expectStory(
  dossier: Locator,
  scenario: (typeof scenarios)[number],
  locale: Locale,
  checkTasks: boolean,
) {
  await expect(dossier).toHaveAttribute("data-dossier-mode", "story");
  await expectAnchor(dossier, scenario, locale, "story");

  const pharmacology = dossier.locator('[data-flagship-pharmacology="story"]');
  for (const target of scenario.targets) {
    await expect(pharmacology.getByText(target, { exact: true })).toBeVisible();
  }
  await expect(dossier.locator('[data-flagship-journey="story"]')).toBeVisible();
  const synthesis = dossier.locator('[data-flagship-synthesis="story"]');
  await expect(synthesis).toBeVisible();
  await expect(synthesis).toHaveAttribute("data-synthesis-publication-state", "unavailable");
  await expect(synthesis.locator('[data-synthesis-detail-available="false"]')).toBeVisible();
  await expect(synthesis.locator("h3, ol, code, a")).toHaveCount(0);
  await expect(dossier.locator('[data-flagship-nomenclature="story"]')).toBeVisible();
  await expect(
    dossier
      .locator('[data-flagship-comparisons="story"]')
      .getByRole("heading", { name: scenario.comparison, exact: true }),
  ).toBeVisible();

  const graph = dossier.locator(
    `[data-metabolite-edges="${scenario.metaboliteEdges}"]`,
  );
  await expect(graph).toBeVisible();
  await expect(graph.getByText(scenario.metabolite, { exact: true })).toBeVisible();

  const learning = dossier.locator('[data-flagship-learning="story"]');
  const tasks = learning.locator("form");
  await expect(learning.locator('[data-learning-kind="synthesis"]')).toHaveCount(0);
  const taskCount = await tasks.count();
  expect(taskCount).toBeGreaterThanOrEqual(2);
  if (checkTasks) {
    for (let index = 0; index < taskCount; index += 1) {
      const task = tasks.nth(index);
      await task.locator("label").first().click();
      await task
        .getByRole("button", { name: localeLabels[locale].check, exact: true })
        .click();
      await expect(task.locator('[data-answer-state="correct"]')).toContainText(
        localeLabels[locale].correct,
      );
    }
  }

  const storyText = await dossier.innerText();
  const rawStoryMatch = storyText.match(rawStoryEnum);
  expect(
    rawStoryMatch,
    `${scenario.slug}/${locale}: no raw technical enum (${rawStoryMatch?.[0] ?? "none"})`,
  ).toBeNull();
  await expectDrawersClosed(dossier, `${scenario.slug}/${locale}/story`);
}

async function openReferenceTab(
  dossier: Locator,
  locale: Locale,
  label: keyof Pick<
    (typeof localeLabels)[Locale],
    | "overview"
    | "pharmacology"
    | "adme"
    | "synthesis"
    | "nomenclature"
    | "comparisons"
    | "learning"
    | "sources"
  >,
) {
  await dossier
    .getByRole("tab", { name: localeLabels[locale][label], exact: true })
    .click();
}

async function expectReferenceOverview(
  dossier: Locator,
  scenario: (typeof scenarios)[number],
  locale: Locale,
) {
  await expect(dossier).toHaveAttribute("data-dossier-mode", "reference");
  await expect(dossier.locator('[data-reference-tab="overview"]')).toBeVisible();
  await expectAnchor(dossier, scenario, locale, "reference");
  const missing = dossier.locator('[data-flagship-explicit-missing="true"]');
  await expect(
    missing.getByRole("heading", {
      name: localeLabels[locale].nullHeading,
      exact: true,
    }),
  ).toBeVisible();
  await expect(missing).toContainText(scenario.missing[locale]);
  await expectDrawersClosed(dossier, `${scenario.slug}/${locale}/reference`);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
    window.localStorage.setItem("molevren:motion-mode", "off");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  });
});

for (const scenario of scenarios) {
  test(`${scenario.name} flagship is complete across TR/EN Story/Reference and 390px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/#drug/${scenario.slug}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`#drug/${scenario.slug}$`, "u"));

    const dossier = page.locator(`[data-molecule-id="${scenario.moleculeId}"]`);
    await expect(
      dossier.getByRole("heading", { name: scenario.name, exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await expectStory(dossier, scenario, "tr", true);
    await expectNoHorizontalOverflow(page, `${scenario.slug}/tr/story/desktop`);

    await dossier
      .getByRole("button", { name: localeLabels.tr.reference, exact: true })
      .click();
    await expectReferenceOverview(dossier, scenario, "tr");

    await openReferenceTab(dossier, "tr", "pharmacology");
    const trPharmacology = dossier.locator(
      '[data-reference-tab="pharmacology"] [data-flagship-pharmacology="reference"]',
    );
    for (const target of scenario.targets) {
      await expect(trPharmacology.getByText(target, { exact: true })).toBeVisible();
    }

    await openReferenceTab(dossier, "tr", "adme");
    const trAdme = dossier.locator('[data-flagship-adme-reference="true"]');
    await expect(
      trAdme.getByRole("heading", {
        name: `${scenario.route.tr} · ${scenario.formulation.tr}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dossier.locator(`[data-metabolite-edges="${scenario.metaboliteEdges}"]`),
    ).toContainText(scenario.metabolite);
    const directEvidenceLinks = trAdme.locator('a[target="_blank"]');
    expect(await directEvidenceLinks.count()).toBeGreaterThan(0);
    expect(
      await directEvidenceLinks.evaluateAll((links) =>
        links.every((link) => (link as HTMLAnchorElement).href.startsWith("https://"))
      ),
    ).toBe(true);

    await openReferenceTab(dossier, "tr", "synthesis");
    const synthesis = dossier.locator('[data-flagship-synthesis="reference"]');
    await expect(synthesis).toBeVisible();
    await expect(synthesis).toHaveAttribute("data-synthesis-publication-state", "unavailable");
    await expect(synthesis.locator('[data-synthesis-detail-available="false"]')).toBeVisible();
    await expect(synthesis.locator("h3, ol, code, a")).toHaveCount(0);
    await openReferenceTab(dossier, "tr", "nomenclature");
    await expect(
      dossier.locator('[data-flagship-nomenclature="reference"]'),
    ).toBeVisible();
    await openReferenceTab(dossier, "tr", "comparisons");
    await expect(
      dossier.locator('[data-flagship-comparisons="reference"]'),
    ).toContainText(scenario.comparison);
    await openReferenceTab(dossier, "tr", "learning");
    const referenceTasks = dossier.locator(
      '[data-flagship-learning="reference"] form',
    );
    await expect(dossier.locator('[data-flagship-learning="reference"] [data-learning-kind="synthesis"]')).toHaveCount(0);
    expect(await referenceTasks.count()).toBeGreaterThanOrEqual(2);
    await openReferenceTab(dossier, "tr", "sources");
    await expectDrawersClosed(dossier, `${scenario.slug}/tr/reference/sources`);
    const technicalSources = dossier.locator(
      '[data-reference-tab="sources"] details[data-source-drawer="closed-by-default"]',
    );
    await technicalSources.locator("summary").click();
    await expect(technicalSources.locator("a[target=\"_blank\"]").first()).toHaveAttribute(
      "href",
      /^https:\/\//,
    );
    await expect(technicalSources).toContainText(/Harici kayıt kimliği/u);
    await expect(technicalSources).toContainText(/Erişim tarihi/u);
    await expect(technicalSources).toContainText(/Lisans \/ yeniden kullanım/u);
    await technicalSources.locator("summary").click();

    await openReferenceTab(dossier, "tr", "overview");
    await page
      .getByRole("button", { name: "Dili İngilizce yap", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expectReferenceOverview(dossier, scenario, "en");

    await openReferenceTab(dossier, "en", "pharmacology");
    for (const target of scenario.targets) {
      await expect(
        dossier
          .locator('[data-flagship-pharmacology="reference"]')
          .getByText(target, { exact: true }),
      ).toBeVisible();
    }
    await openReferenceTab(dossier, "en", "adme");
    await expect(
      dossier
        .locator('[data-flagship-adme-reference="true"]')
        .getByRole("heading", {
          name: `${scenario.route.en} · ${scenario.formulation.en}`,
          exact: true,
        }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, `${scenario.slug}/en/reference/desktop`);

    await dossier
      .getByRole("button", { name: localeLabels.en.story, exact: true })
      .click();
    await expectStory(dossier, scenario, "en", true);
    await expectNoHorizontalOverflow(page, `${scenario.slug}/en/story/desktop`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectNoHorizontalOverflow(page, `${scenario.slug}/en/story/390`);
    await dossier
      .getByRole("button", { name: localeLabels.en.reference, exact: true })
      .click();
    await expect(dossier).toHaveAttribute("data-dossier-mode", "reference");
    await expectNoHorizontalOverflow(page, `${scenario.slug}/en/reference/390`);
    await expectDrawersClosed(dossier, `${scenario.slug}/en/reference/390`);
    await expect(page).toHaveURL(new RegExp(`#drug/${scenario.slug}$`, "u"));
  });
}
