import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  getLearnerPresentationView,
  learnerPresentationContracts,
  localizeScientificTerm,
} = await tsImport(
  "../lib/application/role-presentation.ts",
  import.meta.url,
);

const verificationStatuses = [
  "verified",
  "expert-reviewed",
  "source-supported",
  "pending-review",
  "predicted",
  "conflicting",
  "unknown",
];

const evidenceLevels = [
  "direct-experimental",
  "regulatory",
  "curated-database",
  "literature-reported",
  "analog-supported",
  "computed",
  "model-predicted",
  "educational-simplification",
  "no-evidence",
];

test("Student and Expert are exhaustive presentation depths, never reviewer aliases", () => {
  assert.deepEqual(Object.keys(learnerPresentationContracts).sort(), ["expert", "student"]);
  assert.equal(learnerPresentationContracts.student.mode, "student");
  assert.equal(learnerPresentationContracts.student.rawScientificEnums, false);
  assert.equal(learnerPresentationContracts.student.narrative, "guided");
  assert.equal(learnerPresentationContracts.student.export, "unavailable");
  assert.equal(learnerPresentationContracts.expert.mode, "expert");
  assert.equal(learnerPresentationContracts.expert.rawScientificEnums, false);
  assert.equal(learnerPresentationContracts.expert.measurements, "value-unit-conditions");
  assert.equal(learnerPresentationContracts.expert.assayContext, "visible");
  assert.ok(!Object.hasOwn(learnerPresentationContracts, "reviewer"));

  for (const locale of ["tr", "en"]) {
    const student = getLearnerPresentationView("student", locale);
    const expert = getLearnerPresentationView("expert", locale);
    assert.ok(student.label.length > 5);
    assert.ok(expert.label.length > 5);
    assert.notEqual(student.description, expert.description);
    assert.notEqual(student.exportLabel, expert.exportLabel);
  }
});

test("every scientific presentation enum has TR/EN copy and raw values do not become labels", () => {
  const terms = [
    ...verificationStatuses.map((value) => ({ kind: "verification", value })),
    ...evidenceLevels.map((value) => ({ kind: "evidence", value })),
    ...[
      "source-supported",
      "context-supported",
      "partial-with-declared-gap",
      "blocked",
    ].map((value) => ({ kind: "synthesis-source-gate", value })),
    ...["not-assessed", "computed-unreviewed"].map((value) => ({
      kind: "assessment",
      value,
    })),
  ];

  for (const term of terms) {
    const tr = localizeScientificTerm(term, "tr");
    const en = localizeScientificTerm(term, "en");
    assert.ok(tr.length > 2, `${term.kind}:${term.value}:tr`);
    assert.ok(en.length > 2, `${term.kind}:${term.value}:en`);
    assert.notEqual(tr, term.value, `${term.kind}:${term.value}:raw-tr`);
    assert.notEqual(en, term.value, `${term.kind}:${term.value}:raw-en`);
  }
});

test("role surfaces are responsive, standalone, and declare separate security boundaries", async () => {
  const instructor = await readFile(
    new URL("../components/instructor/InstructorHub.tsx", import.meta.url),
    "utf8",
  );
  const instructorCss = await readFile(
    new URL("../components/instructor/InstructorHub.module.css", import.meta.url),
    "utf8",
  );
  const reviewer = await readFile(
    new URL("../components/reviewer/ReviewerConsole.tsx", import.meta.url),
    "utf8",
  );
  const reviewerCss = await readFile(
    new URL("../components/reviewer/ReviewerConsole.module.css", import.meta.url),
    "utf8",
  );

  assert.match(instructor, /data-instructor-boundary="device-local"/);
  assert.match(instructor, /createInstructorProgressExport/);
  assert.doesNotMatch(instructor, /fetch\(|InstructorStudio/);
  assert.doesNotMatch(instructor, /localStorage/);
  assert.match(reviewer, /data-reviewer-boundary="fail-closed"/);
  assert.match(reviewer, /adapter\.authorize\(controller\.signal\)/);
  assert.match(reviewer, /adapter\.listReviewRecords\(controller\.signal\)/);
  assert.ok(
    reviewer.indexOf("adapter.authorize(controller.signal)") <
      reviewer.indexOf("adapter.listReviewRecords(controller.signal)"),
  );
  assert.match(reviewer, /serializeRawReviewRecord\(selectedRecord\.rawRecord\)/);
  assert.match(instructorCss, /@media \(max-width: 620px\)/);
  assert.match(reviewerCss, /@media \(max-width: 650px\)/);
  assert.doesNotMatch(instructorCss, /min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
  assert.doesNotMatch(reviewerCss, /min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
});
