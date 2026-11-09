import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { createStudentMoleculeProfile, identifyFunctionalGroups } = await tsImport(
  "../lib/application/molecule-learning.ts",
  import.meta.url,
);
const { moleculeCatalog } = await tsImport(
  "../lib/data/catalog.ts",
  import.meta.url,
);
const { createExploreCatalogView } = await tsImport(
  "../lib/application/explore-catalog.ts",
  import.meta.url,
);

test("every checked-in regression molecule has a source-derived systematic name and student passport", () => {
  assert.equal(moleculeCatalog.length, 15);

  for (const molecule of moleculeCatalog) {
    const profile = createStudentMoleculeProfile(molecule, "en");
    assert.ok(profile.systematicName, `${molecule.id} systematic name`);
    assert.ok(profile.functionalGroups.length > 0, `${molecule.id} functional groups`);
    assert.equal(profile.functionalGroupsStatus, "computed-unreviewed");
    assert.doesNotMatch(profile.scaffoldFamily, /not yet|other structural/i);
    assert.ok(profile.drugClass.length > 0);
    assert.ok(profile.mechanismSummary.length > 0);
  }
});

test("computed motif hints conservatively avoid double-labelling amide nitrogen as amine", () => {
  assert.deepEqual(identifyFunctionalGroups("CC(=O)N", "en"), ["Amide"]);
  assert.deepEqual(
    identifyFunctionalGroups("CC(=O)NC1=CC=CC=C1", "en"),
    ["Amide", "Aromatic ring"],
  );
});

test("functional-group labels are localized without changing the detected set", () => {
  const smiles = "CC(=O)OC1=CC=CC=C1C(=O)O";
  const english = identifyFunctionalGroups(smiles, "en");
  const turkish = identifyFunctionalGroups(smiles, "tr");

  assert.equal(english.length, turkish.length);
  assert.ok(english.includes("Carboxylic acid"));
  assert.ok(english.includes("Ester"));
  assert.ok(turkish.includes("Karboksilik asit"));
  assert.ok(turkish.includes("Ester"));
});

test("structural lens uses one locale-stable key for each shared displayed family", () => {
  const turkish = createExploreCatalogView(moleculeCatalog, "tr");
  const english = createExploreCatalogView(moleculeCatalog, "en");
  const englishById = new Map(english.molecules.map((molecule) => [molecule.id, molecule]));
  const keysByDisplayedFamily = new Map();

  for (const molecule of turkish.molecules) {
    const label = molecule.lensValues["structural-similarity"];
    const key = molecule.lensKeys["structural-similarity"];
    assert.ok(label);
    assert.ok(key);
    const keys = keysByDisplayedFamily.get(label) ?? new Set();
    keys.add(key);
    keysByDisplayedFamily.set(label, keys);
    assert.equal(
      englishById.get(molecule.id)?.lensKeys["structural-similarity"],
      key,
      `${molecule.id} structural cluster key must not change with locale`,
    );
  }

  for (const [label, keys] of keysByDisplayedFamily) {
    assert.equal(keys.size, 1, `${label} must render as one structural cluster`);
  }
});

test("route availability is stated narrowly and does not imply missing synthesis knowledge", () => {
  const propranolol = moleculeCatalog.find((item) => item.id === "molecule:propranolol");
  const aspirin = moleculeCatalog.find((item) => item.id === "molecule:aspirin");
  assert.ok(propranolol);
  assert.ok(aspirin);

  assert.match(createStudentMoleculeProfile(propranolol, "en").synthesisScope, /source-linked/i);
  assert.match(createStudentMoleculeProfile(aspirin, "en").synthesisScope, /no curated route/i);
  assert.doesNotMatch(createStudentMoleculeProfile(aspirin, "en").synthesisScope, /impossible|novel/i);
});
