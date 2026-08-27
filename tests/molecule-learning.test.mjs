import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
    assert.equal(profile.scaffoldFamily, "Candidate records");
    assert.equal(profile.scaffoldDetail, "Candidate records");
    assert.equal(profile.drugClass, "Candidate records");
    assert.match(profile.mechanismSummary, /no sourced mechanism lesson/i);
    assert.equal(
      profile.nomenclatureLesson,
      "No reviewed molecule-specific nomenclature lesson is available yet.",
    );
  }
});

test("Student presentation withholds every pending internal classification while Reviewer retains its audit record", async () => {
  const english = createExploreCatalogView(moleculeCatalog, "en");
  const turkish = createExploreCatalogView(moleculeCatalog, "tr");

  for (const [index, molecule] of english.molecules.entries()) {
    assert.deepEqual(
      ["therapeutic", "target", "scaffold"].map((lensId) => molecule.lensValues[lensId]),
      Array(3).fill("Candidate records"),
      molecule.id,
    );
    assert.deepEqual(
      ["therapeutic", "target", "scaffold"].map((lensId) => molecule.lensKeys[lensId]),
      Array(3).fill("candidate-records"),
      molecule.id,
    );
    assert.equal(molecule.lensValues["structural-similarity"], "Representative structures");
    assert.equal(molecule.lensKeys["structural-similarity"], "representative-structures");
    assert.equal(
      molecule.summary,
      "No reviewed learning summary is available for this record yet.",
    );
    assert.ok(molecule.lensAliases.target.includes("classification-review-in-progress"));
    assert.ok(molecule.lensAliases.target.includes("Classification review in progress"));
    assert.ok(
      molecule.lensAliases["structural-similarity"].includes(
        "computed-structural-view-unreviewed",
      ),
    );

    for (const classification of moleculeCatalog[index].classifications) {
      const studentSurface = JSON.stringify({
        summary: molecule.summary,
        lensValues: molecule.lensValues,
        lensAliases: molecule.lensAliases,
        coordinates: molecule.coordinates,
        studentProfile: molecule.studentProfile,
      });
      assert.ok(
        !studentSurface.includes(classification.label),
        `${molecule.id} must not expose draft label ${classification.label} to Student`,
      );
    }

    const reviewerTarget = molecule.classificationEvidence.target;
    assert.equal(reviewerTarget.verificationStatus, "pending-review");
    assert.ok(reviewerTarget.value);
    assert.ok(reviewerTarget.label);
    assert.ok(reviewerTarget.sourceIds.length > 0);
    assert.ok(reviewerTarget.verificationNote);
    assert.equal(
      molecule.reviewerLensValues.target,
      reviewerTarget.label,
      `${molecule.id} Reviewer lens must retain the explicitly gated raw value`,
    );

    const turkishMolecule = turkish.molecules[index];
    assert.equal(
      turkishMolecule.lensValues.target,
      "Aday kayıtlar",
    );
    assert.equal(turkishMolecule.lensKeys.target, "candidate-records");
    assert.equal(
      turkishMolecule.lensValues["structural-similarity"],
      "Temsilî yapılar",
    );
    assert.equal(
      turkishMolecule.lensKeys["structural-similarity"],
      "representative-structures",
    );
    assert.doesNotMatch(
      JSON.stringify({
        lensValues: turkishMolecule.lensValues,
        studentProfile: turkishMolecule.studentProfile,
      }),
      /pending-review|source:dev-molecules|nonselective-beta|beta1-selective/,
    );
  }

  const universe = await readFile(
    new URL("../components/universe/MoleculeUniverse.tsx", import.meta.url),
    "utf8",
  );
  assert.match(universe, /presentationMode === "reviewer"[\s\S]*reviewerLensValues/);
  assert.match(universe, /lensAliases: molecule\.reviewerLensAliases \?\? molecule\.lensAliases/);
  assert.match(universe, /coordinates: molecule\.reviewerCoordinates \?\? molecule\.coordinates/);
  assert.match(universe, /ReviewerClassificationEvidence/);
  assert.match(universe, /evidence\.sourceIds\.join/);
  assert.match(universe, /evidence\.verificationNote/);
});

test("Student categorical aliases and coordinates are independent of pending draft labels", () => {
  const baseline = createExploreCatalogView(moleculeCatalog, "en");
  const mutatedDrafts = moleculeCatalog.map((molecule, moleculeIndex) =>
    moleculeIndex === 0
      ? {
          ...molecule,
          classifications: molecule.classifications.map((classification) => ({
            ...classification,
            value: `internal-mutated-${classification.value}`,
            label: `INTERNAL MUTATED ${classification.label}`,
          })),
        }
      : molecule,
  );
  const mutated = createExploreCatalogView(mutatedDrafts, "en");
  const mutatedById = new Map(mutated.molecules.map((molecule) => [molecule.id, molecule]));

  for (const molecule of baseline.molecules) {
    const changed = mutatedById.get(molecule.id);
    assert.ok(changed);
    assert.deepEqual(
      changed.lensAliases,
      molecule.lensAliases,
      `${molecule.id} Student aliases must not encode pending drafts`,
    );
    assert.deepEqual(
      changed.coordinates,
      molecule.coordinates,
      `${molecule.id} Student coordinates must not encode pending drafts`,
    );
  }

  const mutatedFirst = mutated.molecules[0];
  assert.ok(
    mutatedFirst.reviewerLensAliases.therapeutic.some((alias) =>
      alias.startsWith("INTERNAL MUTATED")),
    "Reviewer aliases retain the raw draft audit path",
  );
  assert.ok(
    baseline.molecules.some((molecule, index) =>
      JSON.stringify(mutated.molecules[index].reviewerCoordinates.therapeutic) !==
        JSON.stringify(molecule.reviewerCoordinates.therapeutic)),
    "Reviewer coordinates retain the raw draft audit projection",
  );
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

test("Student structural lens exposes only a locale-stable representative region", () => {
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
  assert.deepEqual([...keysByDisplayedFamily.keys()], ["Temsilî yapılar"]);
});

test("route availability fails closed without a validated public route projection", () => {
  const propranolol = moleculeCatalog.find((item) => item.id === "molecule:propranolol");
  const aspirin = moleculeCatalog.find((item) => item.id === "molecule:aspirin");
  assert.ok(propranolol);
  assert.ok(aspirin);

  assert.match(createStudentMoleculeProfile(propranolol, "en").synthesisScope, /no publishable route/i);
  assert.match(createStudentMoleculeProfile(aspirin, "en").synthesisScope, /no publishable route/i);
  assert.match(createStudentMoleculeProfile(propranolol, "en").synthesisScope, /coverage record/i);
  assert.doesNotMatch(createStudentMoleculeProfile(aspirin, "en").synthesisScope, /impossible|novel/i);
});
