import type { PersistedNomenclatureProgress } from "@/lib/application/nomenclature-progress";

export const NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_KEY =
  "dev-molecules:nomenclature-academy-progress";
export const NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_VERSION = 1 as const;

export interface AcademyProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AcademyProgressScope {
  readonly exerciseIds: readonly string[];
}

export interface PersistedAcademyProgress {
  readonly currentExerciseId: string;
  readonly completedExerciseIds: readonly string[];
  readonly attempts: number;
  readonly correctAttempts: number;
}

interface AcademyProgressEnvelopeV1 extends PersistedAcademyProgress {
  readonly version: typeof NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_VERSION;
}

const envelopeKeys = [
  "version",
  "currentExerciseId",
  "completedExerciseIds",
  "attempts",
  "correctAttempts",
] as const;

const legacyTopicToExercise = new Map<string, string>([
  ["topic:atoms-bonds", "academy:parent-chain:2-methylpentane"],
  ["topic:functional-groups", "academy:functional-group:glycolic-acid"],
  ["topic:parent-selection", "academy:parent-ring:methylcyclohexane"],
  ["topic:numbering", "academy:numbering:2-methylpentane"],
  ["topic:substituents-prefixes", "academy:name-order:ethyl-dimethylpentane"],
  ["topic:functional-priority", "academy:affix:glycolic-acid"],
  ["topic:aromatic-heterocyclic", "academy:heterocycle-numbering:pyridine"],
  ["topic:stereochemistry", "academy:stereo:r-lactic-acid"],
  ["topic:chemical-forms", "academy:form:propranolol-hydrochloride"],
  ["topic:name-relationships", "academy:name-layer:ibuprofen"],
]);

const legacyExerciseToExercise = new Map<string, string>([
  ["nomenclature:parent-chain:2-methylpentane", "academy:parent-chain:2-methylpentane"],
  ["nomenclature:locant:2-methylpentane", "academy:numbering:2-methylpentane"],
  ["nomenclature:functional-groups:hydroxyethanoic-acid", "academy:functional-group:glycolic-acid"],
  ["nomenclature:prefix-order:ethyl-dimethylpentane", "academy:name-order:ethyl-dimethylpentane"],
  ["nomenclature:aromatic-heterocyclic:pyridine-parent", "academy:heterocycle-numbering:pyridine"],
  ["nomenclature:ring-parent:methylcyclohexane", "academy:parent-ring:methylcyclohexane"],
  ["nomenclature:priority:hydroxyethanoic-acid", "academy:affix:glycolic-acid"],
  ["nomenclature:chemical-form:propranolol-hydrochloride", "academy:form:propranolol-hydrochloride"],
  ["nomenclature:stereo:ez-and-rs", "academy:stereo:r-lactic-acid"],
  ["nomenclature:name-relationships:ibuprofen", "academy:name-layer:ibuprofen"],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validateEnvelope(
  value: unknown,
  scope: AcademyProgressScope,
): AcademyProgressEnvelopeV1 | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (
    keys.length !== envelopeKeys.length ||
    !envelopeKeys.every((key) => Object.hasOwn(value, key))
  ) {
    return null;
  }
  if (value.version !== NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_VERSION) return null;
  if (typeof value.currentExerciseId !== "string") return null;
  if (!scope.exerciseIds.includes(value.currentExerciseId)) return null;
  if (!Array.isArray(value.completedExerciseIds)) return null;
  if (!value.completedExerciseIds.every((id) => typeof id === "string")) return null;
  const completedExerciseIds = value.completedExerciseIds as string[];
  if (new Set(completedExerciseIds).size !== completedExerciseIds.length) return null;
  if (!completedExerciseIds.every((id) => scope.exerciseIds.includes(id))) return null;
  if (!isNonNegativeSafeInteger(value.attempts)) return null;
  if (!isNonNegativeSafeInteger(value.correctAttempts)) return null;
  if (value.correctAttempts > value.attempts) return null;

  return {
    version: NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_VERSION,
    currentExerciseId: value.currentExerciseId,
    completedExerciseIds: [...completedExerciseIds],
    attempts: value.attempts,
    correctAttempts: value.correctAttempts,
  };
}

export function decodeAcademyProgress(
  serialized: string | null | undefined,
  scope: AcademyProgressScope,
): PersistedAcademyProgress | null {
  if (!serialized) return null;
  try {
    const envelope = validateEnvelope(JSON.parse(serialized), scope);
    if (!envelope) return null;
    return {
      currentExerciseId: envelope.currentExerciseId,
      completedExerciseIds: envelope.completedExerciseIds,
      attempts: envelope.attempts,
      correctAttempts: envelope.correctAttempts,
    };
  } catch {
    return null;
  }
}

export function encodeAcademyProgress(
  progress: PersistedAcademyProgress,
  scope: AcademyProgressScope,
): string | null {
  const envelope: AcademyProgressEnvelopeV1 = {
    version: NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_VERSION,
    ...progress,
    completedExerciseIds: [...progress.completedExerciseIds],
  };
  const validated = validateEnvelope(envelope, scope);
  return validated ? JSON.stringify(validated) : null;
}

export function readAcademyProgress(
  storage: AcademyProgressStorage | null | undefined,
  scope: AcademyProgressScope,
): PersistedAcademyProgress | null {
  if (!storage) return null;
  try {
    return decodeAcademyProgress(
      storage.getItem(NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_KEY),
      scope,
    );
  } catch {
    return null;
  }
}

export function persistAcademyProgress(
  storage: AcademyProgressStorage | null | undefined,
  progress: PersistedAcademyProgress,
  scope: AcademyProgressScope,
): boolean {
  if (!storage) return false;
  const serialized = encodeAcademyProgress(progress, scope);
  if (!serialized) return false;
  try {
    storage.setItem(NOMENCLATURE_ACADEMY_PROGRESS_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * One-way compatibility adapter for the former ten-topic quiz. It preserves
 * counters and maps only completed exercises with an explicit semantic peer;
 * no answer or scientific state is copied.
 */
export function migrateLegacyNomenclatureProgress(
  legacy: PersistedNomenclatureProgress,
  scope: AcademyProgressScope,
): PersistedAcademyProgress | null {
  const firstExerciseId = scope.exerciseIds[0];
  if (!firstExerciseId) return null;
  const mappedCurrent = legacyTopicToExercise.get(legacy.currentTopicId);
  const currentExerciseId =
    mappedCurrent && scope.exerciseIds.includes(mappedCurrent)
      ? mappedCurrent
      : firstExerciseId;
  const completedExerciseIds = legacy.completedExerciseIds
    .map((id) => legacyExerciseToExercise.get(id))
    .filter((id): id is string => Boolean(id && scope.exerciseIds.includes(id)));
  return {
    currentExerciseId,
    completedExerciseIds: [...new Set(completedExerciseIds)],
    attempts: legacy.attempts,
    correctAttempts: legacy.correctAttempts,
  };
}
