import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  buildInstructorAssignmentSummary,
  buildInstructorTaskCatalog,
  createDeviceLocalLessonPackage,
  createInstructorProgressExport,
  serializeDeviceLocalArtifact,
} = await tsImport(
  "../lib/application/instructor-hub.ts",
  import.meta.url,
);
const { academyExercises } = await tsImport(
  "../lib/data/nomenclature-academy-curriculum.ts",
  import.meta.url,
);
const { synthesisAtlasChallenges } = await tsImport(
  "../lib/data/synthesis-atlas-challenges.ts",
  import.meta.url,
);

const capturedAt = "2026-08-23T08:30:00.000Z";

test("Instructor task catalog reuses every real nomenclature and synthesis task ID", () => {
  for (const locale of ["tr", "en"]) {
    const catalog = buildInstructorTaskCatalog(locale);
    assert.equal(
      catalog.length,
      academyExercises.length + synthesisAtlasChallenges.length,
    );
    const references = new Set(
      catalog.map((entry) => `${entry.reference.kind}:${entry.reference.taskId}`),
    );
    assert.equal(references.size, catalog.length);
    for (const exercise of academyExercises) {
      assert.ok(references.has(`nomenclature:${exercise.id}`), exercise.id);
    }
    for (const challenge of synthesisAtlasChallenges) {
      assert.ok(references.has(`synthesis:${challenge.id}`), challenge.id);
    }
    assert.ok(catalog.every((entry) => entry.title.length > 5));
    assert.ok(catalog.every((entry) => entry.contentBoundary.length > 25));
  }
});

test("local package composition validates IDs, source gates, and deduplicates tasks", () => {
  const catalog = buildInstructorTaskCatalog("en");
  const nomenclature = catalog.find(
    (entry) => entry.reference.kind === "nomenclature" && entry.availability === "available",
  );
  const synthesis = catalog.find(
    (entry) => entry.reference.kind === "synthesis" && entry.availability === "available",
  );
  assert.ok(nomenclature);
  assert.ok(synthesis);

  const result = createDeviceLocalLessonPackage({
    draftToken: "Beta Blocker Week 01",
    title: "Structure and synthesis",
    locale: "en",
    taskReferences: [
      nomenclature.reference,
      synthesis.reference,
      nomenclature.reference,
    ],
    createdAt: capturedAt,
  });
  assert.equal(result.ok, true);
  assert.equal(result.package.taskReferences.length, 2);
  assert.equal(result.package.packageId, "local-lesson-package:beta-blocker-week-01");
  assert.deepEqual(result.package.boundary, {
    storage: "device-local-download",
    serverSync: false,
    automaticLearnerDelivery: false,
  });

  assert.deepEqual(
    createDeviceLocalLessonPackage({
      draftToken: "invalid",
      title: "Valid title",
      locale: "en",
      taskReferences: [{ kind: "nomenclature", taskId: "academy:not-real" }],
      createdAt: capturedAt,
    }),
    { ok: false, reason: "unknown-task" },
  );
  assert.deepEqual(
    createDeviceLocalLessonPackage({
      draftToken: "empty",
      title: "Valid title",
      locale: "en",
      taskReferences: [],
      createdAt: capturedAt,
    }),
    { ok: false, reason: "empty-package" },
  );
});

test("progress remains unmeasured without a device snapshot and exports exact selected-task state", () => {
  const catalog = buildInstructorTaskCatalog("tr");
  const nomenclature = catalog.find(
    (entry) => entry.reference.kind === "nomenclature" && entry.availability === "available",
  );
  const synthesis = catalog.find(
    (entry) => entry.reference.kind === "synthesis" && entry.availability === "available",
  );
  assert.ok(nomenclature);
  assert.ok(synthesis);
  const taskReferences = [nomenclature.reference, synthesis.reference];

  const disconnected = buildInstructorAssignmentSummary(taskReferences, null);
  assert.equal(disconnected.completedTaskCount, null);
  assert.equal(disconnected.completionPercent, null);
  assert.equal(disconnected.progressBoundary, "not-connected");
  assert.equal(disconnected.hasNomenclatureTask, true);
  assert.equal(disconnected.hasSynthesisTask, true);

  const snapshot = {
    scope: "device-local",
    capturedAt,
    completedNomenclatureTaskIds: [nomenclature.reference.taskId],
    completedSynthesisTaskIds: [],
  };
  const connected = buildInstructorAssignmentSummary(taskReferences, snapshot);
  assert.equal(connected.completedTaskCount, 1);
  assert.equal(connected.completionPercent, 50);

  const packageResult = createDeviceLocalLessonPackage({
    draftToken: "week-01",
    title: "Yapı ve sentez",
    locale: "tr",
    taskReferences,
    createdAt: capturedAt,
  });
  assert.equal(packageResult.ok, true);
  assert.equal(
    createInstructorProgressExport(packageResult.package, null, "tr", capturedAt),
    null,
  );
  const report = createInstructorProgressExport(
    packageResult.package,
    snapshot,
    "tr",
    "2026-08-23T09:00:00.000Z",
  );
  assert.ok(report);
  assert.equal(report.progress.selectedTaskCount, 2);
  assert.equal(report.progress.completedTaskCount, 1);
  assert.equal(report.progress.completionPercent, 50);
  assert.equal(report.boundary.containsLearnerIdentity, false);
  assert.equal(report.boundary.serverRecordCreated, false);
  assert.doesNotMatch(serializeDeviceLocalArtifact(report), /learnerName|studentEmail/i);
});
