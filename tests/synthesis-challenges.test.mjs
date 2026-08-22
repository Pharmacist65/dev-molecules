import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { synthesisChallenges } = await tsImport(
  "../lib/data/synthesis-challenges.ts",
  import.meta.url,
);
const { synthesisStories } = await tsImport(
  "../lib/data/synthesis-stories.ts",
  import.meta.url,
);
const { evaluateSynthesisChallenge } = await tsImport(
  "../lib/domain/synthesis-challenge.ts",
  import.meta.url,
);

const context = { stories: synthesisStories };
const storyById = new Map(synthesisStories.map((story) => [story.id, story]));
const expectedKinds = new Set([
  "order-steps",
  "choose-reaction-class",
  "identify-formed-bond",
  "choose-precursor",
  "find-wrong-intermediate",
  "distinguish-reported-vs-ai",
]);

const localizedValues = (challenge) => [
  challenge.prompt,
  challenge.feedback.correct,
  challenge.feedback.incorrect,
  challenge.feedback.invalid,
  ...challenge.options.map((option) => option.label),
];

test("all six route-challenge kinds have stable IDs and complete TR/EN copy", () => {
  assert.equal(synthesisChallenges.length, 6);
  assert.deepEqual(
    new Set(synthesisChallenges.map((challenge) => challenge.kind)),
    expectedKinds,
  );
  assert.equal(
    new Set(synthesisChallenges.map((challenge) => challenge.id)).size,
    synthesisChallenges.length,
  );

  const globalOptionIds = synthesisChallenges.flatMap((challenge) =>
    challenge.options.map((option) => option.id),
  );
  assert.equal(new Set(globalOptionIds).size, globalOptionIds.length);

  for (const challenge of synthesisChallenges) {
    assert.match(challenge.id, /^synthesis-challenge:[a-z0-9-]+$/);
    assert.ok(storyById.has(challenge.storyId), challenge.storyId);
    assert.ok(challenge.options.length >= 2);
    assert.ok(challenge.answerIds.length >= 1);
    const optionIds = new Set(challenge.options.map((option) => option.id));
    for (const answerId of challenge.answerIds) assert.ok(optionIds.has(answerId));
    for (const copy of localizedValues(challenge)) {
      assert.equal(typeof copy.tr, "string");
      assert.equal(typeof copy.en, "string");
      assert.ok(copy.tr.trim().length > 0);
      assert.ok(copy.en.trim().length > 0);
    }
  }
});

test("challenge references resolve to the source-anchored story model", () => {
  for (const challenge of synthesisChallenges) {
    const story = storyById.get(challenge.storyId);
    assert.ok(story, challenge.id);
    const stepById = new Map(story.steps.map((step) => [step.id, step]));
    const materials = [
      ...story.startingMaterials,
      ...story.intermediates,
      story.finalProduct,
    ];
    const materialById = new Map(materials.map((material) => [material.id, material]));

    if (challenge.kind === "order-steps") {
      assert.deepEqual(
        challenge.answerIds.map(
          (answerId) =>
            challenge.options.find((option) => option.id === answerId)?.stepId,
        ),
        story.steps.map((step) => step.id),
      );
      continue;
    }

    if ("stepId" in challenge) assert.ok(stepById.has(challenge.stepId));

    if (challenge.kind === "choose-reaction-class") {
      const step = stepById.get(challenge.stepId);
      const answer = challenge.options.find(
        (option) => option.id === challenge.answerIds[0],
      );
      assert.equal(answer?.reactionClass, step?.transformationFamily);
    }

    if (challenge.kind === "identify-formed-bond") {
      const step = stepById.get(challenge.stepId);
      const answer = challenge.options.find(
        (option) => option.id === challenge.answerIds[0],
      );
      const formed = step?.bondChanges.find((change) => change.kind === "formed");
      assert.deepEqual(answer?.atomMapIds, formed?.atomMapIds);
    }

    if (challenge.kind === "choose-precursor") {
      const step = stepById.get(challenge.stepId);
      const answer = challenge.options.find(
        (option) => option.id === challenge.answerIds[0],
      );
      assert.ok(answer && step?.inputMaterialIds.includes(answer.materialId));
      for (const option of challenge.options) assert.ok(materialById.has(option.materialId));
    }

    if (challenge.kind === "find-wrong-intermediate") {
      const roleMismatches = challenge.options.filter((option) => {
        const material = materialById.get(option.materialId);
        assert.ok(material, option.materialId);
        return material.role !== option.assertedRole;
      });
      assert.deepEqual(
        roleMismatches.map((option) => option.id),
        challenge.answerIds,
      );
    }
  }
});

test("every curated answer is accepted and known wrong answers remain explanatory", () => {
  for (const challenge of synthesisChallenges) {
    const correct = evaluateSynthesisChallenge(
      challenge,
      {
        challengeId: challenge.id,
        kind: challenge.kind,
        answerIds: challenge.answerIds,
      },
      context,
    );
    assert.deepEqual(
      { status: correct.status, isCorrect: correct.isCorrect, reason: correct.reason },
      { status: "correct", isCorrect: true, reason: "answer-correct" },
      challenge.id,
    );
    assert.equal(correct.feedback, challenge.feedback.correct);

    const wrongIds =
      challenge.kind === "order-steps"
        ? [...challenge.answerIds].reverse()
        : [
            challenge.options.find(
              (option) => !challenge.answerIds.includes(option.id),
            ).id,
          ];
    const incorrect = evaluateSynthesisChallenge(
      challenge,
      { challengeId: challenge.id, kind: challenge.kind, answerIds: wrongIds },
      context,
    );
    assert.equal(incorrect.status, "incorrect", challenge.id);
    assert.equal(incorrect.isCorrect, false);
    assert.equal(incorrect.reason, "answer-incorrect");
    assert.equal(incorrect.feedback, challenge.feedback.incorrect);
  }
});

test("unknown, duplicate and mismatched submissions fail closed", () => {
  const challenge = synthesisChallenges.find(
    (candidate) => candidate.kind === "choose-reaction-class",
  );
  assert.ok(challenge);

  const cases = [
    {
      submission: {
        challengeId: "synthesis-challenge:different",
        kind: challenge.kind,
        answerIds: challenge.answerIds,
      },
      reason: "submission-challenge-mismatch",
    },
    {
      submission: {
        challengeId: challenge.id,
        kind: "choose-precursor",
        answerIds: challenge.answerIds,
      },
      reason: "response-kind-mismatch",
    },
    {
      submission: {
        challengeId: challenge.id,
        kind: challenge.kind,
        answerIds: ["synthesis-option:unknown"],
      },
      reason: "unknown-option",
    },
    {
      submission: {
        challengeId: challenge.id,
        kind: challenge.kind,
        answerIds: [challenge.answerIds[0], challenge.answerIds[0]],
      },
      reason: "duplicate-answer",
    },
  ];

  for (const { submission, reason } of cases) {
    const result = evaluateSynthesisChallenge(challenge, submission, context);
    assert.equal(result.status, "invalid");
    assert.equal(result.isCorrect, false);
    assert.equal(result.reason, reason);
    assert.equal(result.feedback, challenge.feedback.invalid);
  }

  const missingStory = evaluateSynthesisChallenge(
    challenge,
    {
      challengeId: challenge.id,
      kind: challenge.kind,
      answerIds: challenge.answerIds,
    },
    { stories: [] },
  );
  assert.equal(missingStory.status, "invalid");
  assert.equal(missingStory.reason, "challenge-not-in-context");
});

test("reported-vs-AI grading derives its key from route type and verification", () => {
  const challenge = synthesisChallenges.find(
    (candidate) => candidate.kind === "distinguish-reported-vs-ai",
  );
  assert.ok(challenge);

  const aiOption = challenge.options.find(
    (option) => option.candidate.kind === "route-descriptor" &&
      option.candidate.routeType === "ai-proposed",
  );
  assert.ok(aiOption);

  const poisonedAnswerKey = evaluateSynthesisChallenge(
    { ...challenge, answerIds: [aiOption.id] },
    {
      challengeId: challenge.id,
      kind: challenge.kind,
      answerIds: [aiOption.id],
    },
    context,
  );
  assert.equal(poisonedAnswerKey.status, "invalid");
  assert.equal(poisonedAnswerKey.reason, "evidence-answer-key-mismatch");

  const downgradedStories = synthesisStories.map((story) =>
    story.id === challenge.storyId
      ? {
          ...story,
          routeType: "ai-proposed",
          verification: { status: "predicted" },
        }
      : story,
  );
  const downgraded = evaluateSynthesisChallenge(
    challenge,
    {
      challengeId: challenge.id,
      kind: challenge.kind,
      answerIds: challenge.answerIds,
    },
    { stories: downgradedStories },
  );
  assert.equal(downgraded.status, "invalid");
  assert.equal(downgraded.reason, "evidence-answer-key-mismatch");
});

test("tampered answer keys conflict with the scientific story and fail closed", () => {
  for (const challenge of synthesisChallenges) {
    const poisonedAnswerIds =
      challenge.kind === "order-steps"
        ? [...challenge.answerIds].reverse()
        : [
            challenge.options.find(
              (option) => !challenge.answerIds.includes(option.id),
            ).id,
          ];
    const poisoned = { ...challenge, answerIds: poisonedAnswerIds };
    const result = evaluateSynthesisChallenge(
      poisoned,
      {
        challengeId: poisoned.id,
        kind: poisoned.kind,
        answerIds: poisonedAnswerIds,
      },
      context,
    );
    assert.equal(result.status, "invalid", challenge.id);
    assert.equal(result.reason, "evidence-answer-key-mismatch", challenge.id);
  }
});
