import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  DRUG_FAMILY_PAGE_IDS,
  createDrugFamilyPage,
} = await tsImport("../lib/data/family-pages.ts", import.meta.url);
const {
  FAMILY_COMPARISON_FIELD_IDS,
} = await tsImport("../lib/domain/drug-family.ts", import.meta.url);
const {
  buildFamilyFingerprintComparison,
  buildFamilyComparisonRows,
  validateDrugFamilyPageModel,
} = await tsImport("../lib/application/family-page.ts", import.meta.url);
const { messages } = await tsImport("../lib/i18n/messages.ts", import.meta.url);

const expectedCandidates = {
  "beta-adrenergic-blockers": [
    ["Propranolol", 4946],
    ["Metoprolol", 4171],
    ["Atenolol", 2249],
    ["Carvedilol", 2585],
  ],
  nsaids: [
    ["Aspirin", 2244],
    ["Ibuprofen", 3672],
    ["Naproxen", 156391],
    ["Celecoxib", 2662],
  ],
};

test("Home review-set routes resolve to four exact verified candidate identities", async () => {
  assert.deepEqual([...DRUG_FAMILY_PAGE_IDS], [
    "beta-adrenergic-blockers",
    "nsaids",
  ]);

  for (const familyId of DRUG_FAMILY_PAGE_IDS) {
    const family = createDrugFamilyPage(familyId, "/dev-molecules/");
    assert.ok(family);
    assert.deepEqual(validateDrugFamilyPageModel(family), []);
    assert.deepEqual(family.kinds, []);
    assert.equal(family.representatives.length, 4);
    assert.deepEqual(
      family.representatives.map(({ name, pubChemCid }) => [name, pubChemCid]),
      expectedCandidates[familyId],
    );

    for (const representative of family.representatives) {
      assert.match(
        representative.twoDStructureUrl,
        new RegExp(`^/dev-molecules/structures/pubchem/cid-${representative.pubChemCid}-2d\\.sdf$`),
      );
      assert.ok(representative.canonicalSmiles);
      await access(fileURLToPath(new URL(
        `../public/structures/pubchem/cid-${representative.pubChemCid}-2d.sdf`,
        import.meta.url,
      )));
    }
  }
});

test("candidate-set membership remains fail-closed while fingerprints stay computed-unreviewed", () => {
  for (const familyId of DRUG_FAMILY_PAGE_IDS) {
    const family = createDrugFamilyPage(familyId);
    assert.ok(family);
    assert.equal(family.overview.availability, "missing");
    assert.equal(family.sharedMechanism.availability, "missing");
    assert.equal(family.primaryTargetFamilies.availability, "missing");
    assert.equal(family.sharedStructuralMotifs.availability, "missing");
    assert.deepEqual(family.classifications, []);
    assert.deepEqual(buildFamilyComparisonRows(family.representatives), []);

    for (const representative of family.representatives) {
      assert.deepEqual(representative.memberships, []);
      assert.deepEqual(
        Object.keys(representative.comparison).sort(),
        [...FAMILY_COMPARISON_FIELD_IDS].sort(),
      );
      assert.ok(
        Object.values(representative.comparison).every(
          (field) => field.availability === "missing",
        ),
      );
    }

    const fingerprint = buildFamilyFingerprintComparison(family.representatives);
    assert.ok(fingerprint);
    assert.equal(fingerprint.reviewStatus, "computed-unreviewed");
    assert.equal(fingerprint.moleculeIds.length, 4);
    assert.match(fingerprint.limitation, /does not establish pharmacological/i);
  }
});

test("candidate review labels state the non-membership boundary in TR and EN", async () => {
  for (const familyId of DRUG_FAMILY_PAGE_IDS) {
    const family = createDrugFamilyPage(familyId);
    assert.ok(family);
    assert.match(family.name.tr, /aday kayıt inceleme seti/i);
    assert.match(family.name.en, /candidate-record review set/i);
    assert.equal(family.overview.availability, "missing");
    assert.match(family.overview.reason.tr, /sorgu etiketi üyelik kurmaz/i);
    assert.match(family.overview.reason.en, /query label does not establish membership/i);
  }

  assert.equal(messages.en["home.familiesLabel"], "Candidate records");
  assert.equal(messages.tr["home.familiesLabel"], "Aday kayıtlar");
  assert.match(messages.en["home.familyBetaBlockers"], /query · candidate records/);
  assert.match(messages.tr["home.familyBetaBlockers"], /sorgusu · aday kayıtlar/);

  const familyPageSource = await readFile(
    new URL("../components/atlas/FamilyPage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(familyPageSource, /candidateIdentities: "Candidate identities"/);
  assert.match(familyPageSource, /candidateIdentities: "Aday kimlikler"/);
  assert.match(familyPageSource, /membership is not established in this set/i);
  assert.match(familyPageSource, /bu sette üyelik kurulmamıştır/i);
  assert.doesNotMatch(familyPageSource, /"Representative drugs"|"Temsilî ilaçlar"/);
});

test("unknown family IDs fail closed instead of opening a default family", async () => {
  assert.equal(createDrugFamilyPage("unknown-family"), null);

  const appSource = await readFile(
    new URL("../components/platform/DevMoleculesApp.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    appSource,
    /lazy\(\(\) =>\s*import\("@\/components\/atlas\/FamilyPage"\)/,
  );
  assert.match(appSource, /createDrugFamilyPage\(route\.familyId, assetBasePath\)/);
  assert.match(appSource, /activeFamilyPage \? \(/);
  assert.match(appSource, /data-curated-workflow="unavailable"/);

  const familyPageSource = await readFile(
    new URL("../components/atlas/FamilyPage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(familyPageSource, /pubchem\.ncbi\.nlm\.nih\.gov\/compound/);
  assert.match(
    familyPageSource,
    /rest\/pug\/compound\/cid\/\$\{drug\.pubChemCid\}\/record\/SDF\?record_type=2d/,
  );
});
