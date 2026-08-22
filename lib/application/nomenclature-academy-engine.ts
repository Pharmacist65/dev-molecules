import {
  academyText,
  type AcademyAttempt,
  type AcademyEvaluation,
  type AcademyExercise,
  type AcademyLocale,
} from "@/lib/domain/nomenclature-academy";

const incompleteFeedback = {
  tr: "Kontrol etmeden önce yapı üzerinde bir seçim yap veya yanıtını gir.",
  en: "Select something on the structure or enter an answer before checking.",
} as const;

function normalizeName(value: string, locale: AcademyLocale): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/\s*([(),-])\s*/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

function sameSet(actual: readonly string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const actualSet = new Set(actual);
  return actualSet.size === actual.length && expected.every((id) => actualSet.has(id));
}

function isSequenceResponse(responseType: AcademyExercise["responseType"]): boolean {
  return (
    responseType === "atom-sequence" ||
    responseType === "ordered-parts" ||
    responseType === "priority-ranking" ||
    responseType === "number-placement" ||
    responseType === "structure-builder" ||
    responseType === "stereo-center-assignment" ||
    responseType === "double-bond-assignment"
  );
}

function isUnorderedResponse(responseType: AcademyExercise["responseType"]): boolean {
  return (
    responseType === "multiple-choice" ||
    responseType === "atom-selection" ||
    responseType === "bond-selection" ||
    responseType === "aromatic-marking"
  );
}

function matchesIds(
  exercise: AcademyExercise,
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  if (isUnorderedResponse(exercise.responseType)) return sameSet(actual, expected);
  if (isSequenceResponse(exercise.responseType)) {
    return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
  }
  return actual.length === 1 && expected.length === 1 && actual[0] === expected[0];
}

function evaluateIds(
  exercise: AcademyExercise,
  actual: readonly string[],
): { readonly correct: boolean; readonly correctRegion?: AcademyExercise["correctRegion"] } {
  const accepted = [
    { ids: exercise.correctIds ?? [], correctRegion: exercise.correctRegion },
    ...(exercise.alternativeCorrectAnswers ?? []),
  ];
  const match = accepted.find((answer) => matchesIds(exercise, actual, answer.ids));
  return match
    ? { correct: true, correctRegion: match.correctRegion ?? exercise.correctRegion }
    : { correct: false, correctRegion: exercise.correctRegion };
}

/**
 * Deterministically grades only the curated Academy answer contract. Unknown
 * structures and names never become guessed answers.
 */
export function evaluateAcademyAttempt(
  exercise: AcademyExercise,
  attempt: AcademyAttempt,
  locale: AcademyLocale,
): AcademyEvaluation {
  const actual = Array.isArray(attempt) ? [...attempt] : String(attempt).trim();
  const incomplete = Array.isArray(actual) ? actual.length === 0 : actual.length === 0;

  if (incomplete) {
    return {
      status: "incomplete",
      feedback: incompleteFeedback[locale],
      violatedRule: "",
      explanation: "",
      solutionSteps: [],
    };
  }

  let correct = false;
  let correctRegion = exercise.correctRegion;
  if (exercise.responseType === "text") {
    const candidate = normalizeName(String(actual), locale);
    correct = (exercise.acceptedAnswers?.[locale] ?? []).some(
      (answer) => normalizeName(answer, locale) === candidate,
    );
  } else {
    const ids = Array.isArray(actual) ? actual : [String(actual)];
    const result = evaluateIds(exercise, ids);
    correct = result.correct;
    correctRegion = result.correctRegion;
  }

  let feedback = academyText(
    correct ? exercise.correctFeedback : exercise.incorrectFeedback,
    locale,
  );
  if (!correct && exercise.options && Array.isArray(actual) && actual.length === 1) {
    const selected = exercise.options.find((option) => option.id === actual[0]);
    if (selected?.wrongFeedback) feedback = academyText(selected.wrongFeedback, locale);
  }

  return {
    status: correct ? "correct" : "incorrect",
    feedback,
    violatedRule: academyText(exercise.violatedRule, locale),
    explanation: academyText(exercise.explanation, locale),
    solutionSteps: exercise.solutionSteps.map((step) => academyText(step, locale)),
    correctRegion,
  };
}

export function getCorrectAcademyAttempt(
  exercise: AcademyExercise,
  locale: AcademyLocale,
): AcademyAttempt {
  if (exercise.responseType === "text") {
    return exercise.acceptedAnswers?.[locale][0] ?? "";
  }
  return exercise.correctIds ?? [];
}

/**
 * Resolves only a curriculum-authored builder result. An arbitrary combination
 * never receives a generated or guessed structure.
 */
export function resolveAcademyBuilderOutcome(
  exercise: AcademyExercise,
  selectionIds: readonly string[],
): string | null {
  const outcome = exercise.builderOutcomes?.find(
    (candidate) =>
      candidate.selectionIds.length === selectionIds.length &&
      candidate.selectionIds.every((id, index) => selectionIds[index] === id),
  );
  return outcome?.structureId ?? null;
}

export function moveAcademyRankItem(
  order: readonly string[],
  itemId: string,
  targetIndex: number,
): readonly string[] {
  const sourceIndex = order.indexOf(itemId);
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= order.length) return order;
  const next = [...order];
  next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, itemId);
  return next;
}
