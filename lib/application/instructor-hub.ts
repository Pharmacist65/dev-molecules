import { getSynthesisAtlasSourceGate } from "../domain/synthesis-atlas";
import type {
  DeviceLocalLessonPackage,
  InstructorAssignmentSummary,
  InstructorProgressExport,
  InstructorProgressSnapshot,
  InstructorTaskCatalogEntry,
  InstructorTaskReference,
  NomenclatureInstructorTaskId,
  RoleExperienceLocale,
} from "../domain/role-experience";
import type { SynthesisAtlasChallengeId } from "../domain/synthesis-atlas";
import { academyExercises } from "../data/nomenclature-academy-curriculum";
import { synthesisAtlasChallenges } from "../data/synthesis-atlas-challenges";
import { synthesisAtlasRouteById } from "../data/synthesis-atlas";

export interface LessonPackageBuildInput {
  readonly draftToken: string;
  readonly title: string;
  readonly locale: RoleExperienceLocale;
  readonly taskReferences: readonly InstructorTaskReference[];
  readonly createdAt: string;
}

export type LessonPackageBuildResult =
  | { readonly ok: true; readonly package: DeviceLocalLessonPackage }
  | {
      readonly ok: false;
      readonly reason:
        | "invalid-title"
        | "invalid-token"
        | "invalid-date"
        | "empty-package"
        | "unknown-task"
        | "blocked-task";
    };

const catalogCopy = {
  tr: {
    nomenclature: "Nomenklatür Akademisi",
    synthesis: "Sentez Atlası",
    nomenclatureBoundary: "Kürate edilmiş eğitim görevi; bilimsel review kararı değildir.",
    synthesisSupported: "Kaynak kapısından geçen kürate edilmiş sentez görevi; operasyonel laboratuvar tarifi içermez.",
    synthesisBlocked: "Rota kaynak kapısını geçmediği için bu görev yerel pakete eklenemez.",
    exportBoundary: "Bu dışa aktarma yalnız cihazdaki ilerleme anlık görüntüsünü içerir; sunucu kaydı veya öğrenci kimliği oluşturmaz.",
  },
  en: {
    nomenclature: "Nomenclature Academy",
    synthesis: "Synthesis Atlas",
    nomenclatureBoundary: "Curated educational task; it is not a scientific review decision.",
    synthesisSupported: "Curated synthesis task that passes its source gate; it contains no operational laboratory recipe.",
    synthesisBlocked: "This route does not pass its source gate, so the task cannot be added to a local package.",
    exportBoundary: "This export contains only the progress snapshot on this device; it creates no server record or learner identity.",
  },
} as const;

const referenceKey = (reference: InstructorTaskReference): string =>
  `${reference.kind}:${reference.taskId}`;

export function buildInstructorTaskCatalog(
  locale: RoleExperienceLocale,
): readonly InstructorTaskCatalogEntry[] {
  const labels = catalogCopy[locale];
  const nomenclature: InstructorTaskCatalogEntry[] = academyExercises.map(
    (exercise) => ({
      reference: {
        kind: "nomenclature" as const,
        taskId: exercise.id as NomenclatureInstructorTaskId,
      },
      title: exercise.title[locale],
      description: exercise.prompt[locale],
      moduleLabel: labels.nomenclature,
      availability: "available" as const,
      contentBoundary: labels.nomenclatureBoundary,
    }),
  );

  const synthesis: InstructorTaskCatalogEntry[] = synthesisAtlasChallenges.map(
    (challenge) => {
      const route = synthesisAtlasRouteById.get(challenge.routeId);
      const gate = route ? getSynthesisAtlasSourceGate(route) : "blocked";
      const available = gate !== "blocked";
      return {
        reference: {
          kind: "synthesis" as const,
          taskId: challenge.id as SynthesisAtlasChallengeId,
        },
        title: challenge.prompt[locale],
        description: route?.title[locale] ?? challenge.routeId,
        moduleLabel: labels.synthesis,
        availability: available ? "available" : "blocked-source-gate",
        contentBoundary: available
          ? labels.synthesisSupported
          : labels.synthesisBlocked,
      };
    },
  );

  return [...nomenclature, ...synthesis];
}

const sanitizeDraftToken = (value: string): string | null => {
  const sanitized = value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);
  return sanitized.length > 0 ? sanitized : null;
};

export function createDeviceLocalLessonPackage(
  input: LessonPackageBuildInput,
): LessonPackageBuildResult {
  const title = input.title.trim();
  if (title.length < 3) return { ok: false, reason: "invalid-title" };
  const token = sanitizeDraftToken(input.draftToken);
  if (!token) return { ok: false, reason: "invalid-token" };
  if (!Number.isFinite(Date.parse(input.createdAt))) {
    return { ok: false, reason: "invalid-date" };
  }

  const catalog = buildInstructorTaskCatalog(input.locale);
  const catalogByReference = new Map(
    catalog.map((entry) => [referenceKey(entry.reference), entry] as const),
  );
  const taskReferences = [
    ...new Map(
      input.taskReferences.map((reference) => [referenceKey(reference), reference] as const),
    ).values(),
  ];
  if (taskReferences.length === 0) return { ok: false, reason: "empty-package" };

  for (const reference of taskReferences) {
    const catalogEntry = catalogByReference.get(referenceKey(reference));
    if (!catalogEntry) return { ok: false, reason: "unknown-task" };
    if (catalogEntry.availability !== "available") {
      return { ok: false, reason: "blocked-task" };
    }
  }

  return {
    ok: true,
    package: {
      schemaVersion: 1,
      packageId: `local-lesson-package:${token}`,
      title,
      locale: input.locale,
      taskReferences,
      createdAt: new Date(input.createdAt).toISOString(),
      boundary: {
        storage: "device-local-download",
        serverSync: false,
        automaticLearnerDelivery: false,
      },
    },
  };
}

const completedReferenceKeys = (
  snapshot: InstructorProgressSnapshot,
): ReadonlySet<string> => new Set([
  ...snapshot.completedNomenclatureTaskIds.map(
    (taskId) => referenceKey({ kind: "nomenclature", taskId }),
  ),
  ...snapshot.completedSynthesisTaskIds.map(
    (taskId) => referenceKey({ kind: "synthesis", taskId }),
  ),
]);

const hasValidProgressSnapshot = (
  snapshot: InstructorProgressSnapshot,
): boolean => snapshot.scope === "device-local" &&
  Number.isFinite(Date.parse(snapshot.capturedAt)) &&
  new Set(snapshot.completedNomenclatureTaskIds).size ===
    snapshot.completedNomenclatureTaskIds.length &&
  snapshot.completedNomenclatureTaskIds.every((id) => id.startsWith("academy:")) &&
  new Set(snapshot.completedSynthesisTaskIds).size ===
    snapshot.completedSynthesisTaskIds.length &&
  snapshot.completedSynthesisTaskIds.every((id) =>
    id.startsWith("synthesis-atlas-challenge:")
  );

export function buildInstructorAssignmentSummary(
  taskReferences: readonly InstructorTaskReference[],
  snapshot: InstructorProgressSnapshot | null,
): InstructorAssignmentSummary {
  const selectedTaskCount = new Set(taskReferences.map(referenceKey)).size;
  if (!snapshot || !hasValidProgressSnapshot(snapshot)) {
    return {
      selectedTaskCount,
      completedTaskCount: null,
      completionPercent: null,
      hasNomenclatureTask: taskReferences.some((task) => task.kind === "nomenclature"),
      hasSynthesisTask: taskReferences.some((task) => task.kind === "synthesis"),
      progressBoundary: "not-connected",
    };
  }

  const completed = completedReferenceKeys(snapshot);
  const completedTaskCount = new Set(
    taskReferences
      .filter((reference) => completed.has(referenceKey(reference)))
      .map(referenceKey),
  ).size;
  return {
    selectedTaskCount,
    completedTaskCount,
    completionPercent: selectedTaskCount === 0
      ? 0
      : Math.round((completedTaskCount / selectedTaskCount) * 100),
    hasNomenclatureTask: taskReferences.some((task) => task.kind === "nomenclature"),
    hasSynthesisTask: taskReferences.some((task) => task.kind === "synthesis"),
    progressBoundary: "device-local-snapshot",
  };
}

export function createInstructorProgressExport(
  lessonPackage: DeviceLocalLessonPackage,
  snapshot: InstructorProgressSnapshot | null,
  locale: RoleExperienceLocale,
  exportedAt: string,
): InstructorProgressExport | null {
  if (
    !snapshot ||
    !hasValidProgressSnapshot(snapshot) ||
    !Number.isFinite(Date.parse(exportedAt))
  ) return null;
  const completed = completedReferenceKeys(snapshot);
  const tasks = lessonPackage.taskReferences.map((reference) => ({
    reference,
    completed: completed.has(referenceKey(reference)),
  }));
  const completedTaskCount = tasks.filter((task) => task.completed).length;
  return {
    schemaVersion: 1,
    exportedAt: new Date(exportedAt).toISOString(),
    package: lessonPackage,
    progress: {
      source: "device-local-snapshot",
      capturedAt: snapshot.capturedAt,
      tasks,
      completedTaskCount,
      selectedTaskCount: tasks.length,
      completionPercent: tasks.length === 0
        ? 0
        : Math.round((completedTaskCount / tasks.length) * 100),
    },
    boundary: {
      containsLearnerIdentity: false,
      serverRecordCreated: false,
      note: catalogCopy[locale].exportBoundary,
    },
  };
}

export const serializeDeviceLocalArtifact = (
  artifact: DeviceLocalLessonPackage | InstructorProgressExport,
): string => `${JSON.stringify(artifact, null, 2)}\n`;
