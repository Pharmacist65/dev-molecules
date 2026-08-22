export const NOMENCLATURE_PROGRESS_STORAGE_KEY =
  "dev-molecules:nomenclature-progress";
export const NOMENCLATURE_PROGRESS_STORAGE_VERSION = 1 as const;

export interface NomenclatureProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface NomenclatureProgressScope {
  readonly topicIds: readonly string[];
  readonly exerciseIds: readonly string[];
}

/**
 * Device-local learning progress only. Answers, evaluations, chemical
 * structures, and scientific claims deliberately remain outside this record.
 */
export interface PersistedNomenclatureProgress {
  readonly currentTopicId: string;
  readonly completedExerciseIds: readonly string[];
  readonly attempts: number;
  readonly correctAttempts: number;
}

interface NomenclatureProgressEnvelopeV1
  extends PersistedNomenclatureProgress {
  readonly version: typeof NOMENCLATURE_PROGRESS_STORAGE_VERSION;
}

const envelopeKeys = [
  "version",
  "currentTopicId",
  "completedExerciseIds",
  "attempts",
  "correctAttempts",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactEnvelopeKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === envelopeKeys.length &&
    envelopeKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validateEnvelope(
  value: unknown,
  scope: NomenclatureProgressScope,
): NomenclatureProgressEnvelopeV1 | null {
  if (!isRecord(value) || !hasExactEnvelopeKeys(value)) return null;
  if (value.version !== NOMENCLATURE_PROGRESS_STORAGE_VERSION) return null;
  if (typeof value.currentTopicId !== "string") return null;
  if (!scope.topicIds.includes(value.currentTopicId)) return null;
  if (!Array.isArray(value.completedExerciseIds)) return null;
  if (!value.completedExerciseIds.every((id) => typeof id === "string")) {
    return null;
  }

  const completedExerciseIds = value.completedExerciseIds as string[];
  const completedSet = new Set(completedExerciseIds);
  if (completedSet.size !== completedExerciseIds.length) return null;
  if (!completedExerciseIds.every((id) => scope.exerciseIds.includes(id))) {
    return null;
  }
  if (!isNonNegativeSafeInteger(value.attempts)) return null;
  if (!isNonNegativeSafeInteger(value.correctAttempts)) return null;
  if (value.correctAttempts > value.attempts) return null;

  return {
    version: NOMENCLATURE_PROGRESS_STORAGE_VERSION,
    currentTopicId: value.currentTopicId,
    completedExerciseIds: [...completedExerciseIds],
    attempts: value.attempts,
    correctAttempts: value.correctAttempts,
  };
}

export function decodeNomenclatureProgress(
  serialized: string | null | undefined,
  scope: NomenclatureProgressScope,
): PersistedNomenclatureProgress | null {
  if (typeof serialized !== "string" || serialized.length === 0) return null;
  try {
    const envelope = validateEnvelope(JSON.parse(serialized), scope);
    if (!envelope) return null;
    return {
      currentTopicId: envelope.currentTopicId,
      completedExerciseIds: envelope.completedExerciseIds,
      attempts: envelope.attempts,
      correctAttempts: envelope.correctAttempts,
    };
  } catch {
    return null;
  }
}

export function encodeNomenclatureProgress(
  progress: PersistedNomenclatureProgress,
  scope: NomenclatureProgressScope,
): string | null {
  const envelope: NomenclatureProgressEnvelopeV1 = {
    version: NOMENCLATURE_PROGRESS_STORAGE_VERSION,
    currentTopicId: progress.currentTopicId,
    completedExerciseIds: [...progress.completedExerciseIds],
    attempts: progress.attempts,
    correctAttempts: progress.correctAttempts,
  };
  const validated = validateEnvelope(envelope, scope);
  return validated ? JSON.stringify(validated) : null;
}

export function readPersistedNomenclatureProgress(
  storage: NomenclatureProgressStorage | null | undefined,
  scope: NomenclatureProgressScope,
): PersistedNomenclatureProgress | null {
  if (!storage) return null;
  try {
    return decodeNomenclatureProgress(
      storage.getItem(NOMENCLATURE_PROGRESS_STORAGE_KEY),
      scope,
    );
  } catch {
    return null;
  }
}

export function persistNomenclatureProgress(
  storage: NomenclatureProgressStorage | null | undefined,
  progress: PersistedNomenclatureProgress,
  scope: NomenclatureProgressScope,
): boolean {
  if (!storage) return false;
  const serialized = encodeNomenclatureProgress(progress, scope);
  if (!serialized) return false;
  try {
    storage.setItem(NOMENCLATURE_PROGRESS_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
