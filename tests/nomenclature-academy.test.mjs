import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import SmilesDrawer from "smiles-drawer";
import { tsImport } from "tsx/esm/api";

const {
  academyChemicalRecords,
  academyChemicalTool,
  academyExercises,
  academyReferences,
  academySections,
  academyStructures,
  academyStructureById,
} = await tsImport(
  "../lib/data/nomenclature-academy-curriculum.ts",
  import.meta.url,
);
const {
  evaluateAcademyAttempt,
  getCorrectAcademyAttempt,
  moveAcademyRankItem,
  resolveAcademyBuilderOutcome,
} = await tsImport(
  "../lib/application/nomenclature-academy-engine.ts",
  import.meta.url,
);
const {
  NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_KEY,
  NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_VERSION,
  decodeAcademyProgress,
  encodeAcademyProgress,
  migrateLegacyNomenclatureProgress,
  persistAcademyProgress,
  readAcademyProgress,
} = await tsImport(
  "../lib/application/nomenclature-academy-progress.ts",
  import.meta.url,
);

const academyScope = {
  exerciseIds: academyExercises.map((exercise) => exercise.id),
};

function incorrectAttempt(exercise) {
  if (exercise.responseType === "text") return "not-a-curated-answer";
  if (exercise.responseType === "atom-sequence" || exercise.responseType === "ordered-parts") {
    return [...exercise.correctIds].reverse();
  }
  const wrongOption = exercise.options?.find(
    (option) => !exercise.correctIds.includes(option.id),
  );
  if (wrongOption) return [wrongOption.id];
  return ["not-a-curated-id"];
}

function collectLocalizedRecords(value, found = []) {
  if (!value || typeof value !== "object") return found;
  if (
    Object.hasOwn(value, "tr") &&
    Object.hasOwn(value, "en") &&
    typeof value.tr === "string" &&
    typeof value.en === "string"
  ) {
    found.push(value);
    return found;
  }
  for (const child of Object.values(value)) collectLocalizedRecords(child, found);
  return found;
}

function parseSmiles(smiles) {
  return new Promise((resolve, reject) => {
    SmilesDrawer.parse(smiles, resolve, reject);
  });
}

test("Academy exposes eight sections and at least twelve distinct implemented response widgets", () => {
  assert.equal(academySections.length, 8);
  assert.deepEqual(academySections.map((section) => section.order), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(academySections.map((section) => section.id)).size, 8);
  assert.ok(academyExercises.length >= 16);

  const kinds = new Set(academyExercises.map((exercise) => exercise.kind));
  assert.ok(kinds.size >= 12, `only ${kinds.size} interaction kinds`);
  assert.ok(kinds.has("bond-identification"));
  assert.ok(kinds.has("functional-group-selection"));
  assert.ok(kinds.has("parent-chain-selection"));
  assert.ok(kinds.has("atom-numbering"));
  assert.ok(kinds.has("affix-selection"));
  assert.ok(kinds.has("name-part-ordering"));
  assert.ok(kinds.has("structure-to-name"));
  assert.ok(kinds.has("name-to-structure"));
  assert.ok(kinds.has("heterocycle-numbering"));
  assert.ok(kinds.has("stereochemistry-assignment"));
  assert.ok(kinds.has("pharmaceutical-form-classification"));
  assert.ok(kinds.has("name-correction"));

  const responseTypes = new Set(academyExercises.map((exercise) => exercise.responseType));
  assert.ok(responseTypes.size >= 12, `only ${responseTypes.size} response widgets`);
  for (const responseType of [
    "bond-selection",
    "numeric-stepper",
    "bond-order-editor",
    "atom-selection",
    "number-placement",
    "multiple-choice",
    "ordered-parts",
    "text",
    "atom-sequence",
    "aromatic-marking",
    "structure-choice",
    "priority-ranking",
    "structure-builder",
    "stereo-center-assignment",
    "double-bond-assignment",
  ]) {
    assert.ok(responseTypes.has(responseType), responseType);
  }

  for (const section of academySections) {
    assert.ok(
      academyExercises.some((exercise) => exercise.sectionId === section.id),
      section.id,
    );
    assert.ok(section.concepts.length >= 3, section.id);
  }
});

test("every Academy exercise has a resolvable real 2D structure and a complete curated answer contract", async () => {
  const referenceIds = new Set(academyReferences.map((reference) => reference.id));
  for (const exercise of academyExercises) {
    const structure = academyStructureById.get(exercise.structureId);
    assert.ok(structure, exercise.id);
    assert.ok(structure.smiles.length > 0, exercise.id);
    await assert.doesNotReject(() => parseSmiles(structure.smiles), exercise.id);
    assert.equal(exercise.contentStatus, "curated-educational");
    assert.ok(exercise.solutionSteps.length >= 3, exercise.id);
    assert.ok(exercise.referenceIds.length > 0, exercise.id);
    for (const referenceId of exercise.referenceIds) {
      assert.ok(referenceIds.has(referenceId), `${exercise.id}:${referenceId}`);
    }
    if (exercise.responseType === "text") {
      assert.ok(exercise.acceptedAnswers.tr.length > 0, exercise.id);
      assert.ok(exercise.acceptedAnswers.en.length > 0, exercise.id);
    } else {
      assert.ok(exercise.correctIds.length > 0, exercise.id);
    }
  }
});

test("interactive structure graphs contain only connected, addressable curated atoms and bonds", () => {
  for (const structure of academyStructures.filter((candidate) => candidate.atoms)) {
    assert.ok(structure.bonds?.length > 0, structure.id);
    const atomIds = new Set(structure.atoms.map((atom) => atom.id));
    assert.equal(atomIds.size, structure.atoms.length, structure.id);
    const bondIds = new Set(structure.bonds.map((bond) => bond.id));
    assert.equal(bondIds.size, structure.bonds.length, structure.id);
    for (const bond of structure.bonds) {
      assert.ok(atomIds.has(bond.from), `${structure.id}:${bond.id}:from`);
      assert.ok(atomIds.has(bond.to), `${structure.id}:${bond.id}:to`);
      assert.notEqual(bond.from, bond.to, `${structure.id}:${bond.id}`);
    }
  }
});

test("all curated interactions grade their canonical answer in Turkish and English", () => {
  for (const exercise of academyExercises) {
    for (const locale of ["tr", "en"]) {
      const evaluation = evaluateAcademyAttempt(
        exercise,
        getCorrectAcademyAttempt(exercise, locale),
        locale,
      );
      assert.equal(evaluation.status, "correct", `${exercise.id}:${locale}`);
      assert.ok(evaluation.feedback.length > 5, `${exercise.id}:${locale}`);
      assert.ok(evaluation.explanation.length > 20, `${exercise.id}:${locale}`);
      assert.ok(evaluation.violatedRule.length > 20, `${exercise.id}:${locale}`);
      assert.ok(evaluation.solutionSteps.length >= 3, `${exercise.id}:${locale}`);
    }
  }
});

test("wrong answers return a violated rule, correct region, and stepwise localized explanation", () => {
  for (const exercise of academyExercises) {
    const turkish = evaluateAcademyAttempt(exercise, incorrectAttempt(exercise), "tr");
    const english = evaluateAcademyAttempt(exercise, incorrectAttempt(exercise), "en");
    assert.equal(turkish.status, "incorrect", exercise.id);
    assert.equal(english.status, "incorrect", exercise.id);
    assert.ok(turkish.feedback.length > 20, exercise.id);
    assert.ok(turkish.violatedRule.length > 20, exercise.id);
    assert.ok(turkish.solutionSteps.every((step) => step.length > 10), exercise.id);
    assert.notEqual(turkish.feedback, english.feedback, exercise.id);
    if (exercise.responseType === "atom-selection" || exercise.responseType === "atom-sequence") {
      assert.ok(exercise.correctRegion?.atomIds?.length > 0, exercise.id);
    }
    if (exercise.responseType === "bond-selection") {
      assert.ok(exercise.correctRegion?.bondIds?.length > 0, exercise.id);
    }
  }
});

test("parent-chain selection accepts both symmetry-equivalent five-atom paths", () => {
  const exercise = academyExercises.find((candidate) => candidate.kind === "parent-chain-selection");
  assert.ok(exercise);
  assert.equal(
    evaluateAcademyAttempt(exercise, ["c5", "c3", "c1", "c4", "c2"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(exercise, ["branch", "c2", "c3", "c4", "c5"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(exercise, ["c1", "c2", "branch", "c3", "c4"], "en").status,
    "incorrect",
  );
  assert.deepEqual(exercise.correctRegion.atomIds, ["c1", "c2", "c3", "c4", "c5"]);
});

test("atom numbering is order-sensitive and applies the lower-locant direction", () => {
  const exercise = academyExercises.find((candidate) => candidate.kind === "atom-numbering");
  assert.ok(exercise);
  assert.equal(
    evaluateAcademyAttempt(exercise, ["1:c1", "2:c2", "3:c3", "4:c4", "5:c5"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(exercise, ["1:branch", "2:c2", "3:c3", "4:c4", "5:c5"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(exercise, ["1:c5", "2:c4", "3:c3", "4:c2", "5:c1"], "en").status,
    "incorrect",
  );
});

test("functional-group selection requires the complete carboxylic-acid atom pattern", () => {
  const exercise = academyExercises.find((candidate) => candidate.kind === "functional-group-selection");
  assert.ok(exercise);
  assert.equal(
    evaluateAcademyAttempt(exercise, ["acid-o", "carboxyl-c", "carbonyl-o"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(exercise, ["carbonyl-o", "acid-o"], "en").status,
    "incorrect",
  );
});

test("heterocycle numbering begins at pyridine nitrogen and remains sequence-sensitive", () => {
  const exercise = academyExercises.find((candidate) => candidate.kind === "heterocycle-numbering");
  assert.ok(exercise);
  assert.equal(
    evaluateAcademyAttempt(exercise, ["n1", "c2", "c3", "c4", "c5", "c6"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(exercise, ["n1", "c6", "c5", "c4", "c3", "c2"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(exercise, ["c2", "c3", "c4", "c5", "c6", "n1"], "en").status,
    "incorrect",
  );
});

test("curated stereochemistry exercises independently grade R/S and E/Z", () => {
  const rs = academyExercises.find((candidate) => candidate.kind === "stereochemistry-assignment");
  const ez = academyExercises.find((candidate) => candidate.kind === "double-bond-stereochemistry");
  assert.ok(rs);
  assert.ok(ez);
  assert.equal(evaluateAcademyAttempt(rs, ["target:stereocenter", "descriptor:R"], "en").status, "correct");
  assert.equal(evaluateAcademyAttempt(rs, ["target:stereocenter", "descriptor:S"], "en").status, "incorrect");
  assert.equal(evaluateAcademyAttempt(ez, ["target:eb2", "descriptor:E"], "en").status, "correct");
  assert.equal(evaluateAcademyAttempt(ez, ["target:eb2", "descriptor:Z"], "en").status, "incorrect");
});

test("R-lactic-acid lesson is bound to the verified R stereochemical identity", () => {
  const structure = academyStructureById.get("academy-structure:r-lactic-acid");
  assert.ok(structure);
  assert.equal(structure.smiles, "C[C@H](C(=O)O)O");
  assert.deepEqual(structure.verifiedIdentity, {
    provider: "PubChem",
    pubChemCid: 61503,
    inchiKey: "JVTAAEKCZFNVCJ-UWTATZPHSA-N",
    iupacName: "(2R)-2-hydroxypropanoic acid",
    sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/61503",
    reviewStatus: "verified",
  });
  const lesson = academyExercises.find(
    (candidate) => candidate.id === "academy:stereo:r-lactic-acid",
  );
  assert.ok(lesson);
  assert.deepEqual(lesson.correctIds, ["target:stereocenter", "descriptor:R"]);
});

test("unspecified carbohydrate connectivity is not promoted to a glucose identity", () => {
  const structure = academyStructureById.get(
    "academy-structure:aldohexopyranose-unspecified",
  );
  assert.ok(structure);
  assert.equal(structure.smiles, "OCC1OC(O)C(O)C(O)C1O");
  assert.match(structure.title.en, /stereochemistry-unspecified aldohexopyranose/iu);
  assert.doesNotMatch(structure.title.en, /glucose|glucopyranose/iu);
  assert.match(structure.description.en, /does not identify a specific glucose anomer/iu);
  const exercise = academyExercises.find(
    (candidate) => candidate.id === "academy:natural-product:aldohexopyranose-motif",
  );
  assert.equal(exercise?.structureId, structure.id);
});

test("CIP Turkish hint keeps hydrogen last and glycolic acid uses the systematic suffix", () => {
  const cip = academyExercises.find(
    (candidate) => candidate.id === "academy:cip:r-lactic-acid",
  );
  const glycolic = academyExercises.find(
    (candidate) => candidate.id === "academy:affix:glycolic-acid",
  );
  assert.ok(cip);
  assert.ok(glycolic);
  assert.match(cip.hint.tr, /H sonuncudur/iu);
  assert.doesNotMatch(cip.hint.tr, /H hepsinden önce/iu);
  assert.match(glycolic.prompt.tr, /2-Hidroksietanoik asit/iu);
  assert.match(glycolic.prompt.en, /2-hydroxyethanoic acid/iu);
  assert.match(glycolic.options.find((option) => option.id === "acid-suffix")?.label.en ?? "", /-oic acid suffix/iu);
});

test("Turkish chemistry copy never mistranslates fused rings as missiles", async () => {
  const sources = await Promise.all([
    readFile(
      new URL("../lib/data/nomenclature-academy-curriculum.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/data/synthesis-atlas.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /\bfüze\b/iu);
});

test("valence editor, aromatic marking, and CIP ranking grade concrete structure actions", () => {
  const valence = academyExercises.find((candidate) => candidate.kind === "valence-correction");
  const aromatic = academyExercises.find((candidate) => candidate.kind === "aromatic-atom-marking");
  const cip = academyExercises.find((candidate) => candidate.kind === "cip-priority-ordering");
  assert.ok(valence);
  assert.ok(aromatic);
  assert.ok(cip);
  assert.equal(evaluateAcademyAttempt(valence, ["b2:1"], "en").status, "correct");
  assert.equal(evaluateAcademyAttempt(valence, ["b2:2"], "en").status, "incorrect");
  assert.equal(
    evaluateAcademyAttempt(aromatic, ["c6", "c5", "c4", "c3", "c2", "n1"], "en").status,
    "correct",
  );
  assert.equal(
    evaluateAcademyAttempt(cip, ["hydroxy", "carboxyl", "methyl", "hydrogen"], "en").status,
    "correct",
  );
  assert.deepEqual(
    moveAcademyRankItem(["hydrogen", "methyl", "carboxyl", "hydroxy"], "hydroxy", 0),
    ["hydroxy", "hydrogen", "methyl", "carboxyl"],
  );
});

test("ring topology choices render real addressable spiro, fused, and bridged graphs", async () => {
  const topologyIds = [
    "academy-structure:spiro-4-5-decane",
    "academy-structure:fused-decalin",
    "academy-structure:bridged-norbornane",
  ];
  for (const id of topologyIds) {
    const structure = academyStructureById.get(id);
    assert.ok(structure, id);
    assert.ok(structure.atoms.length >= 7, id);
    assert.ok(structure.bonds.length >= 8, id);
    await assert.doesNotReject(() => parseSmiles(structure.smiles), id);
  }
  const topologyExercise = academyExercises.find((candidate) => candidate.kind === "ring-system-classification");
  assert.equal(topologyExercise.responseType, "structure-choice");
  assert.deepEqual(topologyExercise.options.map((option) => option.structureId), topologyIds.slice(1, 2).concat(topologyIds[0], topologyIds[2]));
});

test("curated structure builder resolves registered outcomes and fails closed", () => {
  const exercise = academyExercises.find((candidate) => candidate.responseType === "structure-builder");
  assert.ok(exercise);
  assert.equal(
    resolveAcademyBuilderOutcome(exercise, ["parent:propane", "fragment:hydroxy", "attachment:2"]),
    "academy-structure:propan-2-ol",
  );
  assert.equal(
    resolveAcademyBuilderOutcome(exercise, ["parent:propene", "fragment:hydroxy", "attachment:2"]),
    null,
  );
});

test("curated name-to-structure adapter reports registry matches and fails closed", async () => {
  const result = await academyChemicalTool.verifyRoundTrip("propan-2-ol", "en");
  assert.equal(result.status, "curated-match");
  assert.equal(result.value.structureId, "academy-structure:propan-2-ol");
  assert.equal(result.value.canonicalSmiles, "CC(O)C");
  assert.equal(result.provenance, "curated-name-structure-registry@1");

  const synonym = await academyChemicalTool.verifyRoundTrip("isopropyl alcohol", "en");
  assert.equal(synonym.status, "curated-match");
  const unsupported = await academyChemicalTool.verifyRoundTrip("invent-a-molecule", "en");
  assert.deepEqual(unsupported, { status: "unsupported", reason: "name-not-curated" });
  assert.equal(academyChemicalRecords.length, 4);
});

test("structure-to-name returns only curated canonical answers", async () => {
  const result = await academyChemicalTool.structureToName("CC(O)C", "tr");
  assert.equal(result.status, "curated-match");
  assert.equal(result.value.canonicalName, "propan-2-ol");
  assert.ok(result.value.acceptedAnswers.includes("izopropil alkol"));

  const unsupported = await academyChemicalTool.structureToName("C1=UNKNOWN", "en");
  assert.deepEqual(unsupported, { status: "unsupported", reason: "structure-not-curated" });
});

test("Academy copy is complete in Turkish and English", () => {
  const localizedRecords = collectLocalizedRecords({
    academySections,
    academyStructures,
    academyExercises,
    academyReferences,
  });
  assert.ok(localizedRecords.length >= 150);
  for (const localized of localizedRecords) {
    assert.ok(localized.tr.trim().length > 0, JSON.stringify(localized));
    assert.ok(localized.en.trim().length > 0, JSON.stringify(localized));
  }
  assert.ok(localizedRecords.filter((localized) => localized.tr !== localized.en).length >= 140);
});

test("Academy progress codec round-trips isolated state and rejects invalid scope", () => {
  const progress = {
    currentExerciseId: academyExercises[4].id,
    completedExerciseIds: [academyExercises[0].id, academyExercises[2].id],
    attempts: 6,
    correctAttempts: 2,
  };
  const serialized = encodeAcademyProgress(progress, academyScope);
  assert.ok(serialized);
  assert.deepEqual(JSON.parse(serialized), {
    version: NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_VERSION,
    ...progress,
  });
  assert.deepEqual(decodeAcademyProgress(serialized, academyScope), progress);
  assert.equal(
    decodeAcademyProgress(
      JSON.stringify({ ...JSON.parse(serialized), currentExerciseId: "outside-scope" }),
      academyScope,
    ),
    null,
  );
  assert.doesNotMatch(serialized, /answer|structure|evaluation|claim/iu);
});

test("Academy storage and legacy progress adapter preserve counters without copying answers", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const legacy = {
    currentTopicId: "topic:stereochemistry",
    completedExerciseIds: [
      "nomenclature:parent-chain:2-methylpentane",
      "nomenclature:stereo:ez-and-rs",
    ],
    attempts: 9,
    correctAttempts: 2,
  };
  const migrated = migrateLegacyNomenclatureProgress(legacy, academyScope);
  assert.deepEqual(migrated, {
    currentExerciseId: "academy:stereo:r-lactic-acid",
    completedExerciseIds: [
      "academy:parent-chain:2-methylpentane",
      "academy:stereo:r-lactic-acid",
    ],
    attempts: 9,
    correctAttempts: 2,
  });
  assert.equal(persistAcademyProgress(storage, migrated, academyScope), true);
  assert.ok(values.has(NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_KEY));
  assert.deepEqual(readAcademyProgress(storage, academyScope), migrated);
});

test("Academy component replaces formula pre blocks with structure-backed interaction", async () => {
  const componentSource = await readFile(
    new URL("../components/platform/NomenclatureAcademy.tsx", import.meta.url),
    "utf8",
  );
  const structureSource = await readFile(
    new URL("../components/platform/NomenclatureAcademyStructure.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(componentSource, /<pre\b/u);
  assert.match(componentSource, /NomenclatureAcademyStructure/u);
  assert.match(structureSource, /SmilesStructure/u);
  assert.match(structureSource, /onAtomSelect/u);
  assert.match(structureSource, /onBondSelect/u);
  for (const widget of [
    "numeric-stepper",
    "bond-order-editor",
    "aromatic-marking",
    "number-placement",
    "priority-ranking",
    "structure-builder",
    "stereo-center-assignment",
    "double-bond-assignment",
  ]) {
    assert.match(componentSource, new RegExp(`academy-widget-(?:\\$\\{exercise\\.responseType\\}|${widget})`, "u"), widget);
  }
});
