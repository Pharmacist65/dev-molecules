import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  createLearningJourneyStageViews,
  getRecommendedLearningJourneyStage,
  learningJourneyStageDefinitions,
} = await tsImport(
  "../lib/application/learning-journey-map.ts",
  import.meta.url,
);
const { academyExercises } = await tsImport(
  "../lib/data/nomenclature-academy-curriculum.ts",
  import.meta.url,
);

const emptyInput = {
  nomenclatureProgress: null,
  completedMissionIds: new Set(),
};

test("the student journey exposes the exact six ordered stages in Turkish and English", () => {
  assert.equal(learningJourneyStageDefinitions.length, 6);
  assert.deepEqual(
    learningJourneyStageDefinitions.map((stage) => stage.order),
    [1, 2, 3, 4, 5, 6],
  );
  assert.deepEqual(
    learningJourneyStageDefinitions.map((stage) => stage.title.en),
    [
      "Structure Language",
      "Organic Nomenclature",
      "Pharmaceutical Nomenclature",
      "Reaction Mechanisms",
      "Synthesis Atlas",
      "Drug Molecule Review Project",
    ],
  );
  assert.deepEqual(
    learningJourneyStageDefinitions.map((stage) => stage.title.tr),
    [
      "Yapı Dili",
      "Organik Adlandırma",
      "Farmasötik Adlandırma",
      "Reaksiyon Mekanizmaları",
      "Sentez Atlası",
      "İlaç Molekülü İnceleme Projesi",
    ],
  );
  assert.equal(
    new Set(learningJourneyStageDefinitions.map((stage) => stage.id)).size,
    6,
  );
});

test("every stage has student-facing purpose, next lesson, molecules, destination, and explicit availability", () => {
  for (const locale of ["tr", "en"]) {
    const stages = createLearningJourneyStageViews(locale, emptyInput);
    for (const stage of stages) {
      assert.ok(stage.purpose.length > 45, `${stage.id}:${locale}:purpose`);
      assert.ok(
        stage.recommendedLesson.length > 20,
        `${stage.id}:${locale}:recommendedLesson`,
      );
      assert.ok(stage.relatedMolecules.length >= 2, `${stage.id}:molecules`);
      assert.ok(
        stage.destination === "nomenclature" || stage.destination === "synthesis",
        `${stage.id}:destination`,
      );
      assert.ok(
        stage.availability === "available" || stage.availability === "planned",
        `${stage.id}:availability`,
      );
    }
  }

  const mechanism = learningJourneyStageDefinitions.find(
    (stage) => stage.id === "reaction-mechanisms",
  );
  assert.equal(mechanism?.availability, "planned");
  assert.equal(mechanism?.destination, "synthesis");
});

test("Academy completion is calculated from known exercises and unknown IDs are ignored", () => {
  const structureExerciseIds = academyExercises
    .filter((exercise) => exercise.sectionId === "academy-section:structure-language")
    .map((exercise) => exercise.id);
  const firstOrganicExercise = academyExercises.find(
    (exercise) => exercise.sectionId === "academy-section:parents-numbering",
  );
  assert.ok(structureExerciseIds.length >= 2);
  assert.ok(firstOrganicExercise);
  const organicSectionIds = new Set([
    "academy-section:parents-numbering",
    "academy-section:functional-groups",
    "academy-section:complete-names",
    "academy-section:aromatic-heterocycles",
    "academy-section:stereochemistry",
  ]);
  const organicExerciseCount = academyExercises.filter((exercise) =>
    organicSectionIds.has(exercise.sectionId),
  ).length;

  const stages = createLearningJourneyStageViews("en", {
    nomenclatureProgress: {
      currentExerciseId: firstOrganicExercise.id,
      completedExerciseIds: [
        ...structureExerciseIds,
        firstOrganicExercise.id,
        "academy:unknown-do-not-count",
      ],
      attempts: 999,
      correctAttempts: 999,
      percentComplete: 100,
    },
    completedMissionIds: new Set(),
  });

  const structure = stages.find((stage) => stage.id === "structure-language");
  const organic = stages.find((stage) => stage.id === "organic-nomenclature");
  const pharmaceutical = stages.find(
    (stage) => stage.id === "pharmaceutical-nomenclature",
  );
  assert.deepEqual(
    [structure?.completedUnits, structure?.totalUnits, structure?.completionPercent],
    [structureExerciseIds.length, structureExerciseIds.length, 100],
  );
  assert.equal(organic?.completedUnits, 1);
  assert.equal(organic?.totalUnits, organicExerciseCount);
  assert.equal(organic?.completionPercent, Math.round(100 / organicExerciseCount));
  assert.equal(pharmaceutical?.completionPercent, 0);
});

test("mission stages count only their declared real activities", () => {
  const stages = createLearningJourneyStageViews("tr", {
    nomenclatureProgress: null,
    completedMissionIds: new Set([
      "mission:synthetic-route-order",
      "mission:find-propranolol",
      "mission:evidence-boundaries",
      "mission:unknown-do-not-count",
    ]),
  });

  const synthesis = stages.find((stage) => stage.id === "synthesis-atlas");
  const review = stages.find((stage) => stage.id === "drug-molecule-review");
  assert.deepEqual(
    [synthesis?.completedUnits, synthesis?.totalUnits, synthesis?.completionPercent],
    [0, 0, 0],
  );
  assert.deepEqual(
    [review?.completedUnits, review?.totalUnits, review?.completionPercent],
    [2, 4, 50],
  );
});

test("planned mechanism work never receives invented completion", () => {
  const stages = createLearningJourneyStageViews("en", {
    nomenclatureProgress: {
      currentExerciseId: academyExercises[0].id,
      completedExerciseIds: academyExercises.map((exercise) => exercise.id),
      attempts: academyExercises.length,
      correctAttempts: academyExercises.length,
      percentComplete: 100,
    },
    completedMissionIds: new Set([
      "mission:find-propranolol",
      "mission:beta-profile-classification",
      "mission:active-moiety-versus-form",
      "mission:synthetic-route-order",
      "mission:evidence-boundaries",
    ]),
  });

  const mechanism = stages.find((stage) => stage.id === "reaction-mechanisms");
  assert.deepEqual(
    [mechanism?.completionPercent, mechanism?.completedUnits, mechanism?.totalUnits],
    [0, 0, 0],
  );
  assert.equal(getRecommendedLearningJourneyStage(stages)?.id, "synthesis-atlas");
});

test("the component keeps semantic progress hooks and a 390px single-column layout", async () => {
  const componentSource = await readFile(
    new URL("../components/platform/LearningJourneyMap.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = await readFile(
    new URL("../components/platform/LearningJourneyMap.module.css", import.meta.url),
    "utf8",
  );

  assert.match(componentSource, /<ol[^>]+aria-label=/);
  assert.match(componentSource, /role="progressbar"/);
  assert.match(componentSource, /aria-valuenow=/);
  assert.match(componentSource, /onOpenNomenclature/);
  assert.match(componentSource, /onOpenSynthesis/);
  assert.match(cssSource, /@media \(max-width: 760px\)/);
  assert.match(cssSource, /grid-template-columns: 34px minmax\(0, 1fr\)/);
  assert.doesNotMatch(cssSource, /min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
});
