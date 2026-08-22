export type NomenclatureLocale = "tr" | "en";

export type LocalizedNomenclatureText = Readonly<
  Record<NomenclatureLocale, string>
>;

export type NomenclatureInteractionKind =
  | "parent-chain-selection"
  | "locant-assignment"
  | "substituent-identification"
  | "suffix-functional-group-priority"
  | "stereochemical-prefix"
  | "full-name-construction";

export interface NomenclatureReference {
  readonly id: string;
  readonly title: LocalizedNomenclatureText;
  readonly url: string;
  readonly locator: LocalizedNomenclatureText;
}

export interface NomenclatureTopic {
  readonly id: string;
  readonly order: number;
  readonly title: LocalizedNomenclatureText;
  readonly shortTitle: LocalizedNomenclatureText;
  readonly objective: LocalizedNomenclatureText;
}

export interface NomenclatureOption {
  readonly id: string;
  readonly label: LocalizedNomenclatureText;
  readonly wrongFeedback?: LocalizedNomenclatureText;
}

interface NomenclatureExerciseBase {
  readonly id: string;
  readonly topicId: string;
  readonly kind: NomenclatureInteractionKind;
  readonly interactionLabel?: LocalizedNomenclatureText;
  readonly formula: string;
  readonly formulaDescription: LocalizedNomenclatureText;
  readonly prompt: LocalizedNomenclatureText;
  readonly instruction: LocalizedNomenclatureText;
  readonly hint: LocalizedNomenclatureText;
  readonly correctFeedback: LocalizedNomenclatureText;
  readonly incorrectFeedback: LocalizedNomenclatureText;
  readonly explanation: LocalizedNomenclatureText;
  readonly misconception: LocalizedNomenclatureText;
  readonly referenceIds: readonly string[];
  readonly contentStatus: "curated-educational";
}

export interface NomenclatureChoiceExercise
  extends NomenclatureExerciseBase {
  readonly responseType: "single-choice" | "multiple-choice";
  readonly options: readonly NomenclatureOption[];
  readonly correctOptionIds: readonly string[];
}

export interface NomenclatureTextExercise extends NomenclatureExerciseBase {
  readonly responseType: "text";
  readonly acceptedAnswers: Readonly<
    Record<NomenclatureLocale, readonly string[]>
  >;
}

export type NomenclatureExercise =
  | NomenclatureChoiceExercise
  | NomenclatureTextExercise;

export type NomenclatureAttempt = string | readonly string[];

export interface NomenclatureEvaluation {
  readonly status: "incomplete" | "incorrect" | "correct";
  readonly feedback: string;
  readonly explanation: string;
  readonly misconception: string;
}

export interface NomenclatureProgressSnapshot {
  readonly currentExerciseId: string;
  readonly completedExerciseIds: readonly string[];
  readonly attempts: number;
  readonly correctAttempts: number;
  readonly percentComplete: number;
}

const systemFeedback = {
  tr: {
    incomplete: "Devam etmeden önce bir yanıt seç veya yaz.",
  },
  en: {
    incomplete: "Select or enter an answer before continuing.",
  },
} as const;

export function nomenclatureText(
  value: LocalizedNomenclatureText,
  locale: NomenclatureLocale,
): string {
  return value[locale];
}

function normalizeName(value: string, locale: NomenclatureLocale): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function sameOptionSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  if (actual.length !== expected.length) return false;
  const uniqueActual = new Set(actual);
  return (
    uniqueActual.size === actual.length &&
    expected.every((optionId) => uniqueActual.has(optionId))
  );
}

/**
 * Grades only the curated exercise contract. It does not infer names, chemical
 * identity, or scientific validity beyond the answer key supplied by the lesson.
 */
export function evaluateNomenclatureAttempt(
  exercise: NomenclatureExercise,
  attempt: NomenclatureAttempt,
  locale: NomenclatureLocale,
): NomenclatureEvaluation {
  const response = Array.isArray(attempt) ? attempt : String(attempt).trim();
  const incomplete = Array.isArray(response)
    ? response.length === 0
    : response.length === 0;

  if (incomplete) {
    return {
      status: "incomplete",
      feedback: systemFeedback[locale].incomplete,
      explanation: "",
      misconception: "",
    };
  }

  let isCorrect = false;
  if (exercise.responseType === "text") {
    const candidate = normalizeName(String(response), locale);
    isCorrect = exercise.acceptedAnswers[locale].some(
      (answer) => normalizeName(answer, locale) === candidate,
    );
  } else {
    const selectedIds = Array.isArray(response) ? response : [String(response)];
    isCorrect = sameOptionSet(selectedIds, exercise.correctOptionIds);
  }

  if (isCorrect) {
    return {
      status: "correct",
      feedback: nomenclatureText(exercise.correctFeedback, locale),
      explanation: nomenclatureText(exercise.explanation, locale),
      misconception: nomenclatureText(exercise.misconception, locale),
    };
  }

  let feedback = nomenclatureText(exercise.incorrectFeedback, locale);
  if (exercise.responseType !== "text") {
    const selectedIds = Array.isArray(response) ? response : [String(response)];
    if (selectedIds.length === 1) {
      const selectedOption = exercise.options.find(
        (option) => option.id === selectedIds[0],
      );
      if (selectedOption?.wrongFeedback) {
        feedback = nomenclatureText(selectedOption.wrongFeedback, locale);
      }
    }
  }

  return {
    status: "incorrect",
    feedback,
    explanation: nomenclatureText(exercise.explanation, locale),
    misconception: nomenclatureText(exercise.misconception, locale),
  };
}
