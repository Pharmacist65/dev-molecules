import { expect, test, type Locator, type Page } from "@playwright/test";

type Locale = "tr" | "en";

const locales: readonly Locale[] = ["tr", "en"];

const scenarios = [
  {
    slug: "propranolol",
    catalogStableSlug: "propranolol-aqhhhdlhhxjyjd-uhfffaoysa-n",
    name: "Propranolol",
    moleculeId: "molecule:propranolol",
    catalogEntityId:
      "molecule:imported:propranolol-aqhhhdlhhxjyjd-uhfffaoysa-n",
    pubChemCid: 4946,
    inchiKey: "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
    coverage: "source-supported-draft",
    quality: "fragmentary_route",
    unresolvedGapCount: 7,
  },
  {
    slug: "celecoxib",
    catalogStableSlug: "celecoxib-rzekvgvhfleqil-uhfffaoysa-n",
    name: "Celecoxib",
    moleculeId: "molecule:celecoxib",
    catalogEntityId:
      "molecule:imported:celecoxib-rzekvgvhfleqil-uhfffaoysa-n",
    pubChemCid: 2662,
    inchiKey: "RZEKVGVHFLEQIL-UHFFFAOYSA-N",
    coverage: "source-supported-draft",
    quality: "fragmentary_route",
    unresolvedGapCount: 3,
  },
  {
    slug: "omeprazole",
    catalogStableSlug: "omeprazole-subdbmmjdzjvos-uhfffaoysa-n",
    name: "Omeprazole",
    moleculeId: "molecule:omeprazole",
    catalogEntityId:
      "molecule:imported:omeprazole-subdbmmjdzjvos-uhfffaoysa-n",
    pubChemCid: 4594,
    inchiKey: "SUBDBMMJDZJVOS-UHFFFAOYSA-N",
    coverage: "no-supporting-source-resolved",
    quality: "no_supporting_source_resolved",
    unresolvedGapCount: null,
  },
] as const;

type Scenario = (typeof scenarios)[number];

const copy = {
  tr: {
    dossierReference: "Referans Modu",
    dossierSynthesis: "Sentez",
    synthesisCta: /Sentez aşamalarını incele/u,
    academyTablist: "Academy · Sentez",
    academyCoverage: "Sentez kapsamı",
    academyAtlas: "Kanıt atlası",
    studioTablist: "Sentez ve 3B Öğrenme",
    studioOverview: "Genel Bakış",
    studioExplorer: "3B Keşif",
    studioSteps: "Sentez Basamakları",
    studioMechanism: "Mekanizma",
    studioReferences: "Kaynaklar",
    routePicker: "Kaynak segmenti alternatifleri",
    routeControl: /^Taslak alternatif \d+$/u,
    stepPicker: "Rota basamakları",
    dimension: "Boyut",
    dimension2d: "2B",
    dimension3d: "3B",
    exactIdentity: "Kesin hedef kimliği",
    explicitGap: "Üst-akış boşluğu açık bırakıldı",
    unresolvedTransformation:
      "Segment sırası, reaksiyon sınıfı ve bağ değişimleri henüz çözümlenmedi.",
    target3dBoundary:
      "Bu hesaplanmış 3B görünüm exact hedef kimliğine aittir; deneysel, kristal veya biyolojik olarak etkin konformasyon değildir.",
    target2dBoundary:
      "Bu hedef için serialized kimlik ve provenance kapılarından geçen hesaplanmış 3B varlık kabul edilmedi. Yalnız exact kimlikli 2B kayıt gösterilir; bu, bir konformerin var olmadığı iddiası değildir.",
    intermediate3dMissing:
      "Bu materyal kimliği için kayıtlı provenance kapısından geçen kesin eşleşmeli hesaplanmış 3B varlık yoktur. Bu, bir konformerin var olmadığı iddiası değildir; bağımsız 2B çizim gösterilir.",
    mechanismNotResolved: "MEKANİZMA ÇÖZÜMLENMEDİ",
    openSource: "ORD kaydını aç",
    open3d: "Molekülü 3B odakta aç",
    noSupportingSource:
      "Kaydedilen araştırma kapsamında destekleyici kaynak çözümlenmedi.",
  },
  en: {
    dossierReference: "Reference Mode",
    dossierSynthesis: "Synthesis",
    synthesisCta: /Explore synthesis/iu,
    academyTablist: "Academy · Synthesis",
    academyCoverage: "Synthesis coverage",
    academyAtlas: "Evidence atlas",
    studioTablist: "3D & Synthesis Learning",
    studioOverview: "Overview",
    studioExplorer: "3D Explorer",
    studioSteps: "Synthesis Steps",
    studioMechanism: "Mechanism",
    studioReferences: "References",
    routePicker: "Source-segment alternatives",
    routeControl: /^Draft alternative \d+$/u,
    stepPicker: "Route steps",
    dimension: "Dimension",
    dimension2d: "2D",
    dimension3d: "3D",
    exactIdentity: "Exact target identity",
    explicitGap: "Upstream gap remains explicit",
    unresolvedTransformation:
      "Segment order, reaction class, and bond changes remain unresolved.",
    target3dBoundary:
      "This computed 3D view belongs to the exact target identity; it is not an experimental, crystal, or biologically active conformation.",
    target2dBoundary:
      "No computed 3D asset passed the serialized-identity and provenance gates for this target. Only the exact-identity 2D record is shown; this is not a claim that no conformer exists.",
    intermediate3dMissing:
      "No exact computed 3D asset passed the recorded provenance gate for this material identity. This is not a claim that no conformer exists; the independent 2D redraw is shown.",
    mechanismNotResolved: "MECHANISM NOT RESOLVED",
    openSource: "Open ORD record",
    open3d: "Open molecule in 3D focus",
    noSupportingSource:
      "No supporting source was resolved in the recorded search scope.",
  },
} as const;

async function installLocale(page: Page, locale: Locale) {
  await page.addInitScript((selectedLocale) => {
    window.localStorage.setItem("dev-molecules:locale", selectedLocale);
    window.localStorage.setItem("molevren:motion-mode", "off");
    window.localStorage.removeItem("dev-molecules:presentation-mode");
  }, locale);
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

async function openAtlasFromFlagshipDossier(
  page: Page,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  const expectedHash = `#academy/synthesis/${scenario.slug}/atlas`;

  await page.goto(`/#drug/${scenario.slug}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(
    page.locator('[data-molecular-record-route-status="curated-dossier"]'),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-basic-molecular-record="true"]')).toHaveCount(0);

  const dossier = page.locator(`[data-molecule-id="${scenario.moleculeId}"]`);
  await expect(
    dossier.getByRole("heading", { name: scenario.name, exact: true }),
  ).toBeVisible();
  await dossier
    .getByRole("button", { name: labels.dossierReference, exact: true })
    .click();

  const overviewTab = dossier.getByRole("tab").first();
  await overviewTab.focus();
  await overviewTab.press("End");
  await expect(dossier.getByRole("tab").last()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await dossier.getByRole("tab").last().press("Home");
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press("ArrowRight");
  }

  const synthesisTab = dossier.getByRole("tab", {
    name: labels.dossierSynthesis,
    exact: true,
  });
  await expect(synthesisTab).toBeFocused();
  await expect(synthesisTab).toHaveAttribute("aria-selected", "true");
  const synthesisPanel = dossier.locator('[data-reference-tab="synthesis"]');
  await expect(synthesisPanel).toBeVisible();

  // Sprint contract: every curated flagship exposes a real link to its exact
  // identity in Synthesis Atlas, including honest coverage-only records.
  const synthesisCta = synthesisPanel.locator(
    'a[data-synthesis-journey-cta="true"]',
  );
  expect.soft(
    await synthesisCta.count(),
    `${scenario.slug}/${locale}: dossier must expose one synthesis deep-link CTA`,
  ).toBe(1);

  if (await synthesisCta.count()) {
    await expect.soft(synthesisCta).toHaveAccessibleName(labels.synthesisCta);
    await expect.soft(synthesisCta).toHaveAttribute("href", expectedHash);
    await synthesisCta.focus();
    await synthesisCta.press("Enter");
    const ctaOpenedExactDeepLink = await page
      .waitForURL(new RegExp(`${expectedHash}$`, "u"), { timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    expect.soft(
      ctaOpenedExactDeepLink,
      `${scenario.slug}/${locale}: keyboard CTA activation must preserve the /atlas deep link`,
    ).toBe(true);
    if (!ctaOpenedExactDeepLink) {
      await page.goto(`/${expectedHash}`, { waitUntil: "domcontentloaded" });
    }
  } else {
    // Continue from the declared deep link so a missing dossier CTA does not
    // hide independent Atlas, viewer, mechanism, and reference gaps.
    await page.goto(`/${expectedHash}`, { waitUntil: "domcontentloaded" });
  }

  await expect(page).toHaveURL(new RegExp(`${expectedHash}$`, "u"));
}

async function exerciseAcademyTabs(
  page: Page,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  const hub = page.locator('[data-synthesis-academy="phase-6"]');
  const desiredDeepLinkResolved = await hub
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  expect.soft(
    desiredDeepLinkResolved,
    `${scenario.slug}/${locale}: short flagship deep link must resolve its exact catalog identity`,
  ).toBe(true);
  if (!desiredDeepLinkResolved) {
    // Keep auditing the underlying catalog record even when the public
    // flagship alias is the missing integration point.
    await page.goto(
      `/#academy/synthesis/${scenario.catalogStableSlug}/atlas`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(hub).toBeVisible({ timeout: 30_000 });
  }
  await expect(hub.locator('[data-selected-synthesis-catalog-identity]')).toHaveAttribute(
    "data-selected-synthesis-catalog-identity",
    scenario.catalogEntityId,
  );

  const tablist = hub.getByRole("tablist", {
    name: labels.academyTablist,
  });
  expect.soft(
    await tablist.count(),
    `${scenario.slug}/${locale}: Academy view controls must expose tablist semantics`,
  ).toBe(1);

  const coverageTab = hub.getByRole("tab", {
    name: labels.academyCoverage,
  });
  const atlasTab = hub.getByRole("tab", {
    name: labels.academyAtlas,
  });
  await expect(atlasTab).toHaveAttribute("aria-selected", "true");

  await atlasTab.focus();
  await atlasTab.press("ArrowLeft");
  await expect.soft(
    coverageTab,
    `${scenario.slug}/${locale}: ArrowLeft must select the previous Academy tab`,
  ).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
  if ((await coverageTab.getAttribute("aria-selected")) !== "true") {
    await coverageTab.click();
  }

  await coverageTab.focus();
  await coverageTab.press("ArrowRight");
  await expect.soft(
    atlasTab,
    `${scenario.slug}/${locale}: ArrowRight must return to Evidence Atlas`,
  ).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
  if ((await atlasTab.getAttribute("aria-selected")) !== "true") {
    await atlasTab.click();
  }

  return hub;
}

async function exerciseExactTargetViewer(
  panel: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  const target = panel.locator('[data-target-3d-state]').first();
  await expect(target).toBeVisible();
  const target3dState = await target.getAttribute("data-target-3d-state");
  expect(["available", "2d_only"]).toContain(target3dState);
  await expect(target).toContainText(
    target3dState === "available"
      ? labels.target3dBoundary
      : labels.target2dBoundary,
  );
  const viewer = target.locator('[data-molecule-viewer="true"]');
  await expect(viewer).toHaveCount(1);
  await expect(viewer).toHaveAttribute("aria-label", new RegExp(scenario.name, "u"));
  await expect(viewer).toHaveAttribute("data-structure-status", "ready", {
    timeout: 30_000,
  });

  const dimension = viewer.getByRole("group", { name: labels.dimension });
  const twoD = dimension.getByRole("button", {
    name: labels.dimension2d,
    exact: true,
  });
  const threeD = dimension.getByRole("button", {
    name: labels.dimension3d,
    exact: true,
  });
  await expect(twoD).toBeEnabled();
  if (target3dState === "available") {
    await expect(threeD).toBeEnabled();
  } else {
    await expect(threeD).toBeDisabled();
  }
  await expect(twoD).toHaveAttribute("aria-pressed", "true");

  const canvas = viewer.locator('[data-molecule-viewer-canvas="true"]');
  await canvas.focus();
  await canvas.press("]");
  await expect(viewer).toHaveAttribute("data-selected-atom", /.+/u);
  const selectedAtom2d = await viewer.getAttribute("data-selected-atom");

  if (target3dState === "available") {
    await threeD.focus();
    await threeD.press("Enter");
    await expect(threeD).toHaveAttribute("aria-pressed", "true");
    await expect(viewer).toHaveAttribute("data-structure-status", "ready", {
      timeout: 30_000,
    });
    if ((await viewer.getAttribute("data-cross-view-atom-mapping")) === "exact_ctab_atom_index") {
      await expect(viewer).toHaveAttribute("data-selected-atom", selectedAtom2d ?? "");
    }

    await twoD.focus();
    await twoD.press("Space");
    await expect(twoD).toHaveAttribute("aria-pressed", "true");
  }
}

async function moveToNextStudioTab(current: Locator, next: Locator) {
  await current.focus();
  await current.press("ArrowRight");
  await expect(next).toHaveAttribute("aria-selected", "true");
  await expect(next).toBeFocused();
}

async function exerciseLearningStudio(
  studio: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  await expect(studio).toHaveAttribute("data-route-quality", scenario.quality);
  await expect(studio).toHaveAttribute("data-review-state", "pending");
  await expect(studio).toHaveAttribute("data-verified-scientific-claim", "false");
  await expect(studio).toHaveAttribute("data-operational-details", "excluded");
  await expect(studio).toHaveAttribute(
    "data-total-unresolved-gap-count",
    String(scenario.unresolvedGapCount ?? 0),
  );

  const studioTabs = studio.getByRole("tablist", {
    name: labels.studioTablist,
  });
  await expect(studioTabs).toBeVisible();
  const overviewTab = studioTabs.getByRole("tab", {
    name: labels.studioOverview,
    exact: true,
  });
  const explorerTab = studioTabs.getByRole("tab", {
    name: labels.studioExplorer,
    exact: true,
  });
  const stepsTab = studioTabs.getByRole("tab", {
    name: labels.studioSteps,
    exact: true,
  });
  const mechanismTab = studioTabs.getByRole("tab", {
    name: labels.studioMechanism,
    exact: true,
  });
  const referencesTab = studioTabs.getByRole("tab", {
    name: labels.studioReferences,
    exact: true,
  });
  await expect(studioTabs.getByRole("tab")).toHaveCount(5);

  const initiallySelectedTab = studioTabs.locator('[role="tab"][aria-selected="true"]');
  await initiallySelectedTab.focus();
  await initiallySelectedTab.press("Home");
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");
  await expect(overviewTab).toBeFocused();
  const overviewPanel = studio.locator("#synthesis-studio-panel-overview");
  await expect(overviewPanel).toBeVisible();
  await expect(overviewPanel.getByText(scenario.inchiKey, { exact: true })).toBeVisible();
  await expect(overviewPanel).toContainText(`CID ${scenario.pubChemCid}`);

  await moveToNextStudioTab(overviewTab, explorerTab);
  const explorerPanel = studio.locator("#synthesis-studio-panel-explorer");
  await expect(explorerPanel).toBeVisible();
  await exerciseExactTargetViewer(explorerPanel, scenario, locale);

  await moveToNextStudioTab(explorerTab, stepsTab);
  const stepsPanel = studio.locator("#synthesis-studio-panel-steps");
  await expect(stepsPanel).toBeVisible();
  if (scenario.coverage === "source-supported-draft") {
    const routeTablist = stepsPanel.getByRole("tablist", {
      name: labels.routePicker,
    });
    await expect(routeTablist).toBeVisible();
    const routeTabs = routeTablist.getByRole("tab");
    expect(await routeTabs.count()).toBeGreaterThan(0);
    if ((await routeTabs.count()) > 1) {
      await routeTabs.first().focus();
      await routeTabs.first().press("ArrowRight");
      await expect(routeTabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(routeTabs.nth(1)).toBeFocused();
    }
    const selectedRouteTab = routeTablist.locator('[role="tab"][aria-selected="true"]');
    const selectedRouteTabId = await selectedRouteTab.getAttribute("id");
    const routePanelId = await selectedRouteTab.getAttribute("aria-controls");
    expect(selectedRouteTabId).toBeTruthy();
    expect(routePanelId).toBeTruthy();
    const routePanel = stepsPanel.locator(`[id="${routePanelId}"]`);
    await expect(routePanel).toHaveAttribute("role", "tabpanel");
    await expect(routePanel).toHaveAttribute("aria-labelledby", selectedRouteTabId ?? "");

    const stepTablist = stepsPanel.getByRole("tablist", {
      name: labels.stepPicker,
    });
    await expect(stepTablist).toBeVisible();
    const stepTabs = stepTablist.getByRole("tab");
    expect(await stepTabs.count()).toBeGreaterThan(0);
    if ((await stepTabs.count()) > 1) {
      await stepTabs.first().focus();
      await stepTabs.first().press("ArrowRight");
      await expect(stepTabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(stepTabs.nth(1)).toBeFocused();
    }
    const selectedStepTab = stepTablist.locator('[role="tab"][aria-selected="true"]');
    const selectedStepTabId = await selectedStepTab.getAttribute("id");
    const stepPanelId = await selectedStepTab.getAttribute("aria-controls");
    expect(selectedStepTabId).toBeTruthy();
    expect(stepPanelId).toBeTruthy();
    const controlledStepPanel = stepsPanel.locator(`[id="${stepPanelId}"]`);
    await expect(controlledStepPanel).toHaveAttribute("role", "tabpanel");
    await expect(controlledStepPanel).toHaveAttribute(
      "aria-labelledby",
      selectedStepTabId ?? "",
    );

    const selectedStep = stepsPanel.locator(
      '[data-synthesis-step-panel][data-selected="true"]',
    );
    await expect(selectedStep).toBeVisible();
    await expect(selectedStep).toHaveAttribute(
      "data-source-reaction-order",
      "unresolved",
    );
    await expect(selectedStep).toContainText(labels.unresolvedTransformation);
    await expect(
      selectedStep.locator('[data-mechanism-state="unresolved"]'),
    ).toBeVisible();
    await expect(selectedStep.locator("[data-mechanism-layer]")).toHaveCount(0);

    const sourceOrIntermediateCards = selectedStep.locator(
      '[data-material-role="source_input"], [data-material-role="route_intermediate"]',
    );
    expect(await sourceOrIntermediateCards.count()).toBeGreaterThan(0);
    await expect(sourceOrIntermediateCards.first()).toContainText(
      labels.intermediate3dMissing,
    );
    await expect(sourceOrIntermediateCards.locator("[data-molecule-viewer]")).toHaveCount(0);
    await exerciseExactTargetViewer(selectedStep, scenario, locale);

    const inlineSource = selectedStep.getByRole("link", {
      name: labels.openSource,
      exact: true,
    });
    await expect(inlineSource).toHaveAttribute("href", /^https:\/\//u);
    await expect(selectedStep.locator("code").first()).not.toBeEmpty();
  } else {
    await expect(stepsPanel.getByRole("tablist", { name: labels.routePicker })).toHaveCount(0);
    await expect(stepsPanel.getByRole("tablist", { name: labels.stepPicker })).toHaveCount(0);
    await expect(stepsPanel).toContainText(labels.noSupportingSource);
    await expect(stepsPanel.locator("[data-synthesis-step-panel]")).toHaveCount(0);
  }

  await moveToNextStudioTab(stepsTab, mechanismTab);
  const mechanismPanel = studio.locator("#synthesis-studio-panel-mechanism");
  await expect(mechanismPanel).toBeVisible();
  if (scenario.coverage === "source-supported-draft") {
    await expect(
      mechanismPanel.locator('[data-mechanism-state="unresolved"]'),
    ).toContainText(labels.mechanismNotResolved);
  } else {
    await expect(mechanismPanel.locator("[data-mechanism-state]")).toHaveCount(0);
    await expect(mechanismPanel).toContainText(labels.noSupportingSource);
  }
  await expect(mechanismPanel.locator("[data-mechanism-layer]")).toHaveCount(0);
  await expect(
    mechanismPanel.getByRole("img", { name: /electron|elektron/iu }),
  ).toHaveCount(0);

  await moveToNextStudioTab(mechanismTab, referencesTab);
  const referencesPanel = studio.locator("#synthesis-studio-panel-references");
  await expect(referencesPanel).toBeVisible();
  const referenceLinks = referencesPanel.getByRole("link", {
    name: labels.openSource,
    exact: true,
  });
  if (scenario.coverage === "source-supported-draft") {
    expect(await referenceLinks.count()).toBeGreaterThan(0);
    await expect(referenceLinks.first()).toHaveAttribute("href", /^https:\/\//u);
    await expect(referencesPanel.locator("code").first()).not.toBeEmpty();
  } else {
    await expect(referenceLinks).toHaveCount(0);
    await expect(referencesPanel).toContainText(/No displayable|gösterilebilir exact/u);
  }
}

async function exerciseRouteAndStepKeyboard(
  draft: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  const routeTablist = draft.getByRole("tablist", { name: labels.routePicker });
  expect.soft(
    await routeTablist.count(),
    `${scenario.slug}/${locale}: route alternatives must be a keyboard tablist`,
  ).toBe(1);

  const semanticRouteTabs = routeTablist.getByRole("tab");
  expect.soft(
    await semanticRouteTabs.count(),
    `${scenario.slug}/${locale}: at least one selectable route is required`,
  ).toBeGreaterThan(0);

  const fallbackRouteButtons = draft.getByRole("button", {
    name: labels.routeControl,
  });
  const routeControls = (await semanticRouteTabs.count()) > 0
    ? semanticRouteTabs
    : fallbackRouteButtons;
  if ((await routeControls.count()) > 1) {
    const firstRoute = routeControls.first();
    const secondRoute = routeControls.nth(1);
    const selectionAttribute = (await semanticRouteTabs.count()) > 0
      ? "aria-selected"
      : "aria-pressed";
    await firstRoute.focus();
    await firstRoute.press("ArrowRight");
    await expect.soft(
      secondRoute,
      `${scenario.slug}/${locale}: ArrowRight must select the next route`,
    ).toHaveAttribute(selectionAttribute, "true", { timeout: 1_000 });
    if ((await secondRoute.getAttribute(selectionAttribute)) !== "true") {
      await secondRoute.click();
    }
  }

  const stepTablist = draft.getByRole("tablist", { name: labels.stepPicker });
  expect.soft(
    await stepTablist.count(),
    `${scenario.slug}/${locale}: route steps must expose keyboard tab semantics`,
  ).toBe(1);
  const semanticStepTabs = stepTablist.getByRole("tab");
  expect.soft(
    await semanticStepTabs.count(),
    `${scenario.slug}/${locale}: at least one route step must be selectable`,
  ).toBeGreaterThan(0);

  if ((await semanticStepTabs.count()) > 1) {
    await semanticStepTabs.first().focus();
    await semanticStepTabs.first().press("ArrowRight");
    await expect.soft(semanticStepTabs.nth(1)).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 1_000 },
    );
  }

  const selectedStepPanel = draft.locator(
    '[data-synthesis-step-panel][data-selected="true"]',
  );
  return (await selectedStepPanel.count()) > 0
    ? selectedStepPanel.first()
    : draft.locator("[data-draft-step]").first();
}

async function exerciseStepViewer(
  stepPanel: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  const viewer = stepPanel.locator('[data-molecule-viewer="true"]');
  expect.soft(
    await viewer.count(),
    `${scenario.slug}/${locale}: selected route step needs one 2D/3D MoleculeViewer`,
  ).toBe(1);
  if (!(await viewer.count())) return;

  await expect(viewer).toHaveAttribute("data-structure-status", "ready", {
    timeout: 30_000,
  });
  const dimension = viewer.getByRole("group", { name: labels.dimension });
  const twoD = dimension.getByRole("button", {
    name: labels.dimension2d,
    exact: true,
  });
  const threeD = dimension.getByRole("button", {
    name: labels.dimension3d,
    exact: true,
  });
  await expect(twoD).toBeEnabled();
  await twoD.focus();
  await twoD.press("Enter");
  await expect(twoD).toHaveAttribute("aria-pressed", "true");
  await threeD.focus();
  await threeD.press("Space");
  await expect(threeD).toHaveAttribute("aria-pressed", "true");

  const canvas = viewer.locator('[data-molecule-viewer-canvas="true"]');
  await canvas.focus();
  await canvas.press("]");
  await expect(viewer).toHaveAttribute("data-selected-atom", /.+/u);
}

async function expectUnresolvedMechanismAndReferences(
  draft: Locator,
  stepPanel: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  await expect(stepPanel).toContainText(labels.unresolvedTransformation);

  // Unresolved transformation data must never grow decorative electron arrows
  // or a verified-looking mechanism. It still needs an explicit UI state so
  // learners can distinguish a gap from a loading/rendering failure.
  const unresolvedMechanism = stepPanel.locator(
    '[data-mechanism-state="unresolved"]',
  );
  expect.soft(
    await unresolvedMechanism.count(),
    `${scenario.slug}/${locale}: unresolved step needs an explicit mechanism state`,
  ).toBe(1);
  await expect(stepPanel.locator("[data-mechanism-layer]")).toHaveCount(0);
  await expect(
    stepPanel.getByRole("img", { name: /electron|elektron/iu }),
  ).toHaveCount(0);

  const sourceLink = draft.getByRole("link", {
    name: labels.openSource,
    exact: true,
  }).first();
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toHaveAttribute("href", /^https:\/\//u);
  await sourceLink.focus();
  await expect(sourceLink).toBeFocused();
  await expect(draft.getByText(labels.exactIdentity, { exact: true })).toBeVisible();
  await expect(draft.getByText(scenario.inchiKey, { exact: true })).toBeVisible();

  const gapRow = draft
    .getByText(labels.explicitGap, { exact: true })
    .locator("..");
  const selectedRouteGapCount = Number(await gapRow.locator("dd").innerText());
  expect(selectedRouteGapCount).toBeGreaterThan(0);
  expect.soft(
    await draft.getAttribute("data-total-unresolved-gap-count"),
    `${scenario.slug}/${locale}: graph must expose its aggregate unresolved-gap count`,
  ).toBe(String(scenario.unresolvedGapCount));
}

async function expectSourceSupportedDraft(
  atlas: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  await expect(atlas).toHaveAttribute("data-synthesis-atlas", "public-alpha-draft");
  const draft = atlas.locator(
    '[data-public-alpha-synthesis="source-supported-draft"]',
  );
  await expect(draft).toBeVisible();
  await expect(draft).toHaveAttribute("data-review-state", "pending");
  await expect(draft).toHaveAttribute("data-verified-scientific-claim", "false");
  await expect(draft).toHaveAttribute("data-operational-details", "excluded");

  const selectedStep = await exerciseRouteAndStepKeyboard(
    draft,
    scenario,
    locale,
  );
  await expect(selectedStep).toBeVisible();
  await exerciseStepViewer(selectedStep, scenario, locale);
  await expectUnresolvedMechanismAndReferences(
    draft,
    selectedStep,
    scenario,
    locale,
  );
}

async function expectCoverageOnlyGap(
  atlas: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  const labels = copy[locale];
  await expect(atlas).toHaveAttribute("data-synthesis-atlas", "coverage-only");
  await expect(atlas.locator('[data-route-detail-state="coverage_only"]')).toBeVisible();
  await expect(atlas).toContainText(labels.noSupportingSource);
  await expect(atlas).toContainText(`CID ${scenario.pubChemCid}`);

  expect.soft(
    await atlas.getByText(scenario.inchiKey, { exact: true }).count(),
    `${scenario.slug}/${locale}: coverage-only Atlas must still show exact InChIKey`,
  ).toBe(1);
  await expect(atlas.locator("[data-published-synthesis-route]")).toHaveCount(0);
  await expect(atlas.locator("[data-public-alpha-synthesis]")).toHaveCount(0);
  await expect(atlas.locator("[data-synthesis-step-panel], [data-draft-step]")).toHaveCount(0);
  await expect(atlas.locator("[data-mechanism-layer]")).toHaveCount(0);
  await expect(
    atlas.getByRole("link", { name: labels.openSource, exact: true }),
  ).toHaveCount(0);
}

async function exerciseSpatialKeyboardHandoff(
  page: Page,
  journeySurface: Locator,
  scenario: Scenario,
  locale: Locale,
) {
  const open3d = journeySurface.getByRole("button", {
    name: copy[locale].open3d,
    exact: true,
  }).first();
  await expect(open3d).toBeVisible();
  await open3d.focus();
  await open3d.press("Enter");
  await expect(page).toHaveURL(/#molecule\//u);

  const scene = page.locator('[data-focused-molecule][data-scene-status]').first();
  await expect(scene).toHaveAttribute("data-scene-status", "ready", {
    timeout: 30_000,
  });
  await expect(scene).toHaveAttribute("data-focused-molecule", new RegExp(
    scenario.slug,
    "iu",
  ));
  const canvas = scene.locator('[data-molecular-scene-canvas="true"]');
  await expect(canvas).toHaveAttribute("aria-keyshortcuts", /\[ \].*Enter.*Space/u);
  await canvas.focus();
  await canvas.press("]");
  await expect(scene).toHaveAttribute("data-keyboard-atom", /.+/u);
}

for (const scenario of scenarios) {
  for (const locale of locales) {
    test(`${scenario.name}/${locale} supports dossier CTA → exact Atlas → route/step → 2D/3D → mechanism → references`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await installLocale(page, locale);
      await page.setViewportSize({ width: 1440, height: 900 });

      await openAtlasFromFlagshipDossier(page, scenario, locale);
      await exerciseAcademyTabs(page, scenario, locale);

      const atlas = page.locator(
        `[data-synthesis-atlas][data-catalog-entity-id="${scenario.catalogEntityId}"]`,
      );
      await expect(atlas).toBeVisible({ timeout: 30_000 });
      const studio = atlas.locator('[data-synthesis-learning-studio="true"]');
      const studioCount = await studio.count();
      expect.soft(
        studioCount,
        `${scenario.slug}/${locale}: Atlas must expose the integrated 3D and synthesis studio`,
      ).toBe(1);
      if (studioCount > 0) {
        await exerciseLearningStudio(studio, scenario, locale);
      } else if (scenario.coverage === "source-supported-draft") {
        // Preserve evidence-boundary coverage on the legacy surface while the
        // integrated studio is the intentional red sprint contract.
        await expectSourceSupportedDraft(atlas, scenario, locale);
      } else {
        await expectCoverageOnlyGap(atlas, scenario, locale);
      }

      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(atlas).toBeVisible();
      await expectNoHorizontalOverflow(
        page,
        `${scenario.slug}/${locale}/synthesis-journey/390`,
      );

      await page.setViewportSize({ width: 1440, height: 900 });
      const journeySurface = studioCount > 0 ? studio : atlas;
      const target3dAdmitted = studioCount > 0 &&
        (await studio.locator('[data-target-3d-state="available"]').count()) > 0;
      if (target3dAdmitted || studioCount === 0) {
        await exerciseSpatialKeyboardHandoff(
          page,
          journeySurface,
          scenario,
          locale,
        );
      } else {
        await expect(journeySurface.getByRole("button", {
          name: copy[locale].open3d,
          exact: true,
        })).toHaveCount(0);
      }
    });
  }
}
