import { expect, test, type Page } from "@playwright/test";

const BASIC_RECORD_SCENARIOS = [
  {
    name: "(-)-beta-Sitosterol",
    slug: "beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n",
    id: "molecule:imported:beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n",
    formula: "C29H50O",
    cid: "222284",
  },
  {
    name: "Baclofen",
    slug: "baclofen-kpysyyiegfhwsv-uhfffaoysa-n",
    id: "molecule:imported:baclofen-kpysyyiegfhwsv-uhfffaoysa-n",
    formula: "C10H12ClNO2",
    cid: "2284",
  },
  {
    name: "1,8-Cineole",
    slug: "1-8-cineole-weegylxzbrqimu-uhfffaoysa-n",
    id: "molecule:imported:1-8-cineole-weegylxzbrqimu-uhfffaoysa-n",
    formula: "C10H18O",
    cid: "2758",
  },
] as const;

async function expectCatalogReady(page: Page) {
  await expect(
    page.locator('[data-catalog-status="ready"][data-catalog-records="1552"]'),
  ).toBeVisible({ timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("dev-molecules:locale", "tr");
  });
});

test("Beta-sitosterol opens a real Basic Molecular Record, survives refresh, and returns to retained Atlas state", async ({
  page,
}) => {
  await page.goto("./#atlas", { waitUntil: "domcontentloaded" });
  await expectCatalogReady(page);

  const search = page.getByRole("searchbox", {
    name: "1.552 yapı-bütün indeks kaydında ara",
    exact: true,
  });
  await search.fill("sitosterol");
  const atlasRecord = page.locator(
    '[data-atlas-record="molecule:imported:beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n"]',
  );
  await expect(atlasRecord).toBeVisible();
  await atlasRecord.click();

  const record = page.locator('[data-basic-molecular-record="true"]');
  await expect(record).toBeVisible();
  await expect(record).toHaveAttribute("data-pubchem-cid", "222284");
  await expect(page).toHaveURL(
    /#drug\/beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n$/,
  );
  await expect(record.getByRole("heading", { name: "(-)-beta-Sitosterol" })).toBeVisible();
  await expect(record).toContainText("C29H50O");
  await expect(record.locator('[data-basic-record-structure="2d"] canvas')).toBeVisible();
  await expect(
    record.locator('[data-basic-record-structure="3d"] [data-structure-status="ready"]'),
  ).toBeVisible();
  await expect(record.locator("[data-coverage-dimension]")).toHaveCount(9);
  await expect(record.locator('[data-basic-record-review-status="source-supported"]')).toBeVisible();
  await expect(record.locator('[data-basic-record-identity-review-status="source-supported"]')).toBeVisible();
  await expect(record.locator('[data-structure-review-status="source-supported"]')).toHaveCount(2);
  await expect(record.locator('[data-basic-record-properties="true"]')).toBeVisible();
  await expect(record.locator('[data-basic-record-property]')).toHaveCount(11);
  await expect(
    record.locator('[data-basic-record-property][data-property-provenance="pubchem-2d-sdf"]'),
  ).toHaveCount(11);
  await expect(
    record.locator('[data-basic-record-property="topological-polar-surface-area"]'),
  ).toContainText("Topolojik polar yüzey alanı");
  await expect(
    record.locator('[data-basic-record-property="heavy-atom-count"]'),
  ).toContainText("30");
  await expect(
    record.locator('[data-basic-record-properties="true"] a').first(),
  ).toHaveAttribute("href", /pubchem\.ncbi\.nlm\.nih\.gov\/rest\/pug\/compound\/cid\/222284\/record\/SDF\?record_type=2d/);
  await expect(
    record.locator('[data-coverage-dimension="identity"]'),
  ).toHaveAttribute("data-coverage-status", "available");
  await expect(
    record.locator('[data-coverage-dimension="pharmacology"]'),
  ).toHaveAttribute("data-coverage-status", "unavailable");
  await expect(page.getByText(/kürate edilmiş dossier kaydı bulunamadı/i)).toHaveCount(0);
  await expect(record).not.toContainText(/Hesaplanmış · incelenmemiş|parmak izi|Tanimoto|SDF yükleniyor/i);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-basic-molecular-record="true"]')).toHaveAttribute(
    "data-record-id",
    BASIC_RECORD_SCENARIOS[0].id,
  );

  await page.getByRole("button", { name: "İlaç Atlası'na dön", exact: true }).click();
  await expect(page).toHaveURL(/#atlas$/);
  await expect(search).toHaveValue("sitosterol");
  await expect(atlasRecord).toBeVisible();
});

test("Beta-sitosterol, Baclofen, and Cineole direct routes never fall back to another drug", async ({
  page,
}) => {
  for (const scenario of BASIC_RECORD_SCENARIOS) {
    await page.goto(`./#drug/${scenario.slug}`, { waitUntil: "domcontentloaded" });
    const record = page.locator('[data-basic-molecular-record="true"]');
    await expect(record).toBeVisible();
    await expect(record).toHaveAttribute("data-record-id", scenario.id);
    await expect(record).toHaveAttribute("data-pubchem-cid", scenario.cid);
    await expect(record.getByRole("heading", { name: scenario.name })).toBeVisible();
    await expect(record).toContainText(scenario.formula);
    await expect(record.locator('[data-basic-record-structure="2d"] canvas')).toBeVisible();
    await expect(
      record.locator('[data-basic-record-structure="3d"] [data-structure-status="ready"]'),
    ).toBeVisible();
    await expect(page.locator('[data-molecular-record-route-status="curated-dossier"]')).toHaveCount(0);
  }
});

test("exact seed CID canonicalizes to the curated dossier while unresolved identities fail closed", async ({
  page,
}) => {
  await page.goto(
    "./#drug/propranolol-aqhhhdlhhxjyjd-uhfffaoysa-n",
    { waitUntil: "domcontentloaded" },
  );
  await expect(
    page.locator('[data-molecular-record-route-status="curated-dossier"]'),
  ).toBeVisible();
  await expect(page).toHaveURL(/#drug\/propranolol$/);
  await expect(page.locator('[data-basic-molecular-record="true"]')).toHaveCount(0);

  await page.goto("./#drug/not-in-the-resolved-index", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator('[data-molecular-record-route-status="unavailable"]'),
  ).toBeVisible();
  await expect(page.locator('[data-basic-molecular-record="true"]')).toHaveCount(0);
  await expect(
    page.locator('[data-molecular-record-route-status="curated-dossier"]'),
  ).toHaveCount(0);
});
