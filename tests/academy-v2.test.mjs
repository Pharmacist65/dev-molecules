import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  academyModuleDefinitions,
  createAcademyModuleViews,
  getRecommendedAcademyModule,
} = await tsImport(
  "../lib/application/academy-learning-map.ts",
  import.meta.url,
);
const { createAcademyScienceLesson } = await tsImport(
  "../lib/application/academy-science-lessons.ts",
  import.meta.url,
);
const { academyExercises } = await tsImport(
  "../lib/data/nomenclature-academy-curriculum.ts",
  import.meta.url,
);

const emptyProgress = {
  nomenclatureProgress: null,
  completedMissionIds: new Set(),
};

test("Academy 2.0 exposes the exact eight-module bilingual learning path", () => {
  assert.equal(academyModuleDefinitions.length, 8);
  assert.deepEqual(
    academyModuleDefinitions.map((entry) => entry.order),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.deepEqual(
    academyModuleDefinitions.map((entry) => entry.title.en),
    [
      "Structure Language",
      "Organic Nomenclature",
      "Pharmaceutical Nomenclature",
      "Pharmacology",
      "ADME",
      "Reaction Mechanisms",
      "Synthesis Atlas",
      "Drug Review Project",
    ],
  );
  assert.deepEqual(
    academyModuleDefinitions.map((entry) => entry.title.tr),
    [
      "Yapının Dili",
      "Organik Nomenklatür",
      "Farmasötik Nomenklatür",
      "Farmakoloji",
      "ADME",
      "Reaksiyon Mekanizmaları",
      "Sentez Atlası",
      "İlaç İnceleme Projesi",
    ],
  );
  assert.equal(new Set(academyModuleDefinitions.map((entry) => entry.id)).size, 8);
});

test("every map module declares time, purpose, next lesson, drugs, and honest availability", () => {
  for (const locale of ["tr", "en"]) {
    const modules = createAcademyModuleViews(locale, emptyProgress);
    for (const learningModule of modules) {
      assert.ok(learningModule.estimatedMinutes >= 30, `${learningModule.id}:time`);
      assert.ok(learningModule.purpose.length > 50, `${learningModule.id}:${locale}:purpose`);
      assert.ok(learningModule.recommendedLesson.length > 25, `${learningModule.id}:${locale}:next`);
      assert.ok(learningModule.relatedDrugs.length >= 2, `${learningModule.id}:drugs`);
      assert.ok(learningModule.coverageNote.length > 45, `${learningModule.id}:${locale}:coverage`);
      assert.ok(
        ["available", "coverage-dependent", "planned"].includes(learningModule.availability),
        `${learningModule.id}:availability`,
      );
    }
  }

  const byId = new Map(academyModuleDefinitions.map((entry) => [entry.id, entry]));
  assert.equal(byId.get("pharmacology")?.availability, "coverage-dependent");
  assert.equal(byId.get("adme")?.availability, "coverage-dependent");
  assert.equal(byId.get("reaction-mechanisms")?.availability, "planned");
  assert.equal(byId.get("synthesis-atlas")?.availability, "available");
});

test("Academy progress reuses real exercises and leaves untracked modules as null", () => {
  const structureIds = academyExercises
    .filter((exercise) => exercise.sectionId === "academy-section:structure-language")
    .map((exercise) => exercise.id);
  assert.ok(structureIds.length > 0);

  const modules = createAcademyModuleViews("en", {
    nomenclatureProgress: {
      currentExerciseId: structureIds.at(-1),
      completedExerciseIds: structureIds,
      attempts: structureIds.length,
      correctAttempts: structureIds.length,
      percentComplete: 100,
    },
    completedMissionIds: new Set(["mission:propranolol-route-order"]),
  });
  const byId = new Map(modules.map((entry) => [entry.id, entry]));

  assert.equal(byId.get("structure-language")?.completionPercent, 100);
  assert.equal(byId.get("synthesis-atlas")?.completionPercent, 100);
  assert.equal(byId.get("pharmacology")?.completionPercent, null);
  assert.equal(byId.get("adme")?.completionPercent, null);
  assert.equal(byId.get("reaction-mechanisms")?.completionPercent, null);
  assert.equal(
    getRecommendedAcademyModule(createAcademyModuleViews("en", emptyProgress))?.id,
    "structure-language",
  );
});

test("pharmacology lessons fail closed when reviewed target evidence is absent", () => {
  const lesson = createAcademyScienceLesson(
    "pharmacology",
    "propranolol",
    "en",
  );

  assert.equal(lesson.moleculeId, "molecule:propranolol");
  assert.equal(lesson.status, "unavailable");
  assert.deepEqual(lesson.evidenceItems, []);
  assert.deepEqual(lesson.sources, []);
  assert.equal(lesson.notForClinicalUse, true);
  assert.match(lesson.statusReason, /No reviewed target interaction/i);
});

test("ADME lessons distinguish sourced administration context from ADME evidence", () => {
  const oral = createAcademyScienceLesson("adme", "propranolol", "en");
  const intravenous = createAcademyScienceLesson("adme", "labetalol", "en");
  const ophthalmic = createAcademyScienceLesson("adme", "timolol", "en");

  for (const lesson of [oral, intravenous, ophthalmic]) {
    assert.equal(lesson.status, "context-only");
    assert.deepEqual(lesson.evidenceItems, []);
    assert.ok(lesson.sources.length > 0);
    assert.ok(lesson.sources.every((source) => source.url.startsWith("https://")));
    assert.match(lesson.statusReason, /no absorption, distribution, metabolism, or excretion measurement/i);
  }

  assert.equal(oral.administrationContexts[0]?.route, "ORAL");
  assert.equal(intravenous.administrationContexts[0]?.route, "INTRAVENOUS");
  assert.equal(ophthalmic.administrationContexts[0]?.route, "OPHTHALMIC");
});

test("unmatched science lessons produce no molecule claim or source", () => {
  const lesson = createAcademyScienceLesson(
    "adme",
    "%E0%A4%A-not-in-catalog",
    "tr",
  );
  assert.equal(lesson.moleculeId, null);
  assert.equal(lesson.status, "unavailable");
  assert.deepEqual(lesson.evidenceItems, []);
  assert.deepEqual(lesson.administrationContexts, []);
  assert.deepEqual(lesson.sources, []);
  assert.match(lesson.statusReason, /bilimsel sonuç üretilmedi/i);
});

test("Academy UI lazy-loads existing learning surfaces and stays text-route safe", async () => {
  const hub = await readFile(
    new URL("../components/academy/AcademyHub.tsx", import.meta.url),
    "utf8",
  );
  const scienceLesson = await readFile(
    new URL("../components/academy/AcademyScienceLesson.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../components/academy/AcademyHub.module.css", import.meta.url),
    "utf8",
  );

  assert.match(
    hub,
    /lazy\(\(\) =>\s*import\("\.\.\/platform\/NomenclatureAcademy"\)/s,
  );
  assert.match(
    hub,
    /lazy\(\(\) =>\s*import\("\.\.\/platform\/LearningJourneyMap"\)/s,
  );
  assert.match(hub, /data-academy-learning-map="eight-modules"/);
  assert.match(hub, /role="progressbar"/);
  assert.doesNotMatch(hub, /three|MoleculeUniverse|SharedMolecularScene/i);
  assert.match(scienceLesson, /data-source-drawer="closed-by-default"/);
  assert.doesNotMatch(scienceLesson, /pending[^\n]*verified|predicted[^\n]*verified/i);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /grid-template-columns: 38px minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
});
