import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  nomenclatureExercises,
  nomenclatureReferences,
  nomenclatureTopics,
} = await tsImport("../lib/data/nomenclature-curriculum.ts", import.meta.url);
const { evaluateNomenclatureAttempt } = await tsImport(
  "../lib/domain/nomenclature.ts",
  import.meta.url,
);
const {
  NOMENCLATURE_PROGRESS_STORAGE_KEY,
  NOMENCLATURE_PROGRESS_STORAGE_VERSION,
  decodeNomenclatureProgress,
  encodeNomenclatureProgress,
  persistNomenclatureProgress,
  readPersistedNomenclatureProgress,
} = await tsImport(
  "../lib/application/nomenclature-progress.ts",
  import.meta.url,
);

const nomenclatureProgressScope = {
  topicIds: nomenclatureTopics.map((topic) => topic.id),
  exerciseIds: nomenclatureExercises.map((exercise) => exercise.id),
};

const interactionKinds = new Set(
  nomenclatureExercises.map((exercise) => exercise.kind),
);

function correctAttempt(exercise, locale) {
  return exercise.responseType === "text"
    ? exercise.acceptedAnswers[locale][0]
    : [...exercise.correctOptionIds].reverse();
}

function incorrectAttempt(exercise) {
  if (exercise.responseType === "text") return "definitely-not-the-name";
  const wrongOption = exercise.options.find(
    (option) => !exercise.correctOptionIds.includes(option.id),
  );
  return wrongOption ? [wrongOption.id] : ["unknown-option"];
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

test("nomenclature curriculum contains ten addressable topics and six working interaction kinds", () => {
  assert.equal(nomenclatureTopics.length, 10);
  assert.equal(nomenclatureExercises.length, 10);
  assert.deepEqual(
    nomenclatureTopics.map((topic) => topic.order),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.deepEqual(
    nomenclatureTopics.map((topic) => topic.id),
    [
      "topic:atoms-bonds",
      "topic:functional-groups",
      "topic:parent-selection",
      "topic:numbering",
      "topic:substituents-prefixes",
      "topic:functional-priority",
      "topic:aromatic-heterocyclic",
      "topic:stereochemistry",
      "topic:chemical-forms",
      "topic:name-relationships",
    ],
  );
  assert.equal(new Set(nomenclatureTopics.map((topic) => topic.id)).size, 10);
  assert.equal(new Set(nomenclatureExercises.map((exercise) => exercise.id)).size, 10);
  assert.equal(interactionKinds.size, 6);
  assert.deepEqual(
    [...interactionKinds].sort(),
    [
      "full-name-construction",
      "locant-assignment",
      "parent-chain-selection",
      "stereochemical-prefix",
      "substituent-identification",
      "suffix-functional-group-priority",
    ],
  );

  const exerciseTopicIds = new Set(
    nomenclatureExercises.map((exercise) => exercise.topicId),
  );
  const referenceIds = new Set(
    nomenclatureReferences.map((reference) => reference.id),
  );
  for (const topic of nomenclatureTopics) assert.ok(exerciseTopicIds.has(topic.id));
  for (const exercise of nomenclatureExercises) {
    assert.equal(exercise.contentStatus, "curated-educational");
    assert.ok(exercise.formula.length > 0);
    assert.ok(exercise.referenceIds.length > 0);
    for (const referenceId of exercise.referenceIds) {
      assert.ok(referenceIds.has(referenceId), `${exercise.id}:${referenceId}`);
    }
  }
  for (const reference of nomenclatureReferences) {
    assert.match(reference.url, /^https:\/\//u);
  }
});

test("every curated prompt and explanation has non-empty Turkish and English content", () => {
  const localizedRecords = collectLocalizedRecords({
    nomenclatureTopics,
    nomenclatureExercises,
    nomenclatureReferences,
  });

  assert.ok(localizedRecords.length >= 100);
  for (const localized of localizedRecords) {
    assert.ok(localized.tr.trim().length > 0, JSON.stringify(localized));
    assert.ok(localized.en.trim().length > 0, JSON.stringify(localized));
  }

  const translatedRecords = localizedRecords.filter(
    (localized) => localized.tr !== localized.en,
  );
  assert.ok(
    translatedRecords.length >= 90,
    "shared chemical symbols may match, but narrative content must be localized",
  );
});

test("every simulation kind accepts its curated answer in both locales", () => {
  const correctlyEvaluatedKinds = new Set();

  for (const exercise of nomenclatureExercises) {
    for (const locale of ["tr", "en"]) {
      const result = evaluateNomenclatureAttempt(
        exercise,
        correctAttempt(exercise, locale),
        locale,
      );
      assert.equal(result.status, "correct", `${exercise.id}:${locale}`);
      assert.ok(result.feedback.length > 0);
      assert.ok(result.explanation.length > 0);
      assert.ok(result.misconception.length > 0);
    }
    correctlyEvaluatedKinds.add(exercise.kind);
  }

  assert.deepEqual(correctlyEvaluatedKinds, interactionKinds);
});

test("incorrect evaluation is deterministic, explanatory, and localized", () => {
  for (const exercise of nomenclatureExercises) {
    const attempt = incorrectAttempt(exercise);
    const first = evaluateNomenclatureAttempt(exercise, attempt, "tr");
    const second = evaluateNomenclatureAttempt(exercise, attempt, "tr");
    const english = evaluateNomenclatureAttempt(exercise, attempt, "en");

    assert.deepEqual(first, second, exercise.id);
    assert.equal(first.status, "incorrect", exercise.id);
    assert.equal(english.status, "incorrect", exercise.id);
    assert.ok(first.feedback.length > 20, exercise.id);
    assert.ok(first.explanation.length > 20, exercise.id);
    assert.ok(first.misconception.length > 20, exercise.id);
    assert.notEqual(first.feedback, english.feedback, exercise.id);
  }
});

test("full-name construction normalizes case, spacing, and unicode hyphens without crossing locale keys", () => {
  const exercise = nomenclatureExercises.find(
    (candidate) => candidate.responseType === "text",
  );
  assert.ok(exercise);
  const englishAnswer = exercise.acceptedAnswers.en[0];
  const turkishAnswer = exercise.acceptedAnswers.tr[0];
  assert.equal(
    evaluateNomenclatureAttempt(
      exercise,
      `  ${englishAnswer.toUpperCase().replaceAll("-", "‑")}  `,
      "en",
    ).status,
    "correct",
  );
  assert.equal(
    evaluateNomenclatureAttempt(
      exercise,
      `  ${turkishAnswer.toLocaleUpperCase("tr-TR").replaceAll("-", "‑")}  `,
      "tr",
    ).status,
    "correct",
  );
  assert.equal(
    evaluateNomenclatureAttempt(exercise, englishAnswer, "tr").status,
    "incorrect",
  );
});

test("empty responses fail closed with locale-specific guidance", () => {
  const exercise = nomenclatureExercises[0];
  const turkish = evaluateNomenclatureAttempt(exercise, [], "tr");
  const english = evaluateNomenclatureAttempt(exercise, [], "en");

  assert.equal(turkish.status, "incomplete");
  assert.equal(english.status, "incomplete");
  assert.notEqual(turkish.feedback, english.feedback);
  assert.equal(turkish.explanation, "");
  assert.equal(english.misconception, "");
});

test("versioned nomenclature progress codec round-trips only learning state", () => {
  const progress = {
    currentTopicId: nomenclatureTopics[3].id,
    completedExerciseIds: [
      nomenclatureExercises[0].id,
      nomenclatureExercises[2].id,
    ],
    attempts: 7,
    correctAttempts: 2,
  };

  const serialized = encodeNomenclatureProgress(
    progress,
    nomenclatureProgressScope,
  );
  assert.ok(serialized);
  assert.deepEqual(JSON.parse(serialized), {
    version: NOMENCLATURE_PROGRESS_STORAGE_VERSION,
    ...progress,
  });
  assert.deepEqual(
    decodeNomenclatureProgress(serialized, nomenclatureProgressScope),
    progress,
  );
  assert.doesNotMatch(
    serialized,
    /answer|evaluation|structure|claim/iu,
    "persistence must remain isolated from answers and scientific state",
  );
});

test("nomenclature progress codec rejects malformed, stale, and out-of-scope records", () => {
  const validEnvelope = {
    version: NOMENCLATURE_PROGRESS_STORAGE_VERSION,
    currentTopicId: nomenclatureTopics[0].id,
    completedExerciseIds: [nomenclatureExercises[0].id],
    attempts: 2,
    correctAttempts: 1,
  };
  const invalidRecords = [
    null,
    [],
    { ...validEnvelope, version: 2 },
    { ...validEnvelope, currentTopicId: "topic:not-in-curriculum" },
    { ...validEnvelope, completedExerciseIds: ["exercise:not-in-curriculum"] },
    {
      ...validEnvelope,
      completedExerciseIds: [
        nomenclatureExercises[0].id,
        nomenclatureExercises[0].id,
      ],
    },
    { ...validEnvelope, attempts: -1 },
    { ...validEnvelope, attempts: 1.5 },
    { ...validEnvelope, correctAttempts: 3 },
    { ...validEnvelope, unexpected: true },
  ];

  assert.equal(
    decodeNomenclatureProgress("not-json", nomenclatureProgressScope),
    null,
  );
  assert.equal(decodeNomenclatureProgress(null, nomenclatureProgressScope), null);
  for (const record of invalidRecords) {
    assert.equal(
      decodeNomenclatureProgress(
        JSON.stringify(record),
        nomenclatureProgressScope,
      ),
      null,
      JSON.stringify(record),
    );
  }
});

test("device-local nomenclature storage restores valid state and fails safely", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const progress = {
    currentTopicId: nomenclatureTopics[1].id,
    completedExerciseIds: [nomenclatureExercises[0].id],
    attempts: 2,
    correctAttempts: 1,
  };

  assert.equal(
    persistNomenclatureProgress(
      storage,
      progress,
      nomenclatureProgressScope,
    ),
    true,
  );
  assert.ok(values.has(NOMENCLATURE_PROGRESS_STORAGE_KEY));
  assert.deepEqual(
    readPersistedNomenclatureProgress(storage, nomenclatureProgressScope),
    progress,
  );

  const blockedStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  };
  assert.equal(
    readPersistedNomenclatureProgress(
      blockedStorage,
      nomenclatureProgressScope,
    ),
    null,
  );
  assert.equal(
    persistNomenclatureProgress(
      blockedStorage,
      progress,
      nomenclatureProgressScope,
    ),
    false,
  );
});
