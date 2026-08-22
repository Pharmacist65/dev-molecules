import type { VerificationStatus } from "./evidence";
import type { SynthesisStepId, SynthesisStoryId } from "./ids";
import {
  canPresentAsSourceReported,
  type SynthesisRouteType,
  type SynthesisStory,
} from "./synthesis";

export type SynthesisChallengeId = `synthesis-challenge:${string}`;
export type SynthesisChallengeOptionId = `synthesis-option:${string}`;

export type SynthesisChallengeKind =
  | "order-steps"
  | "choose-reaction-class"
  | "identify-formed-bond"
  | "choose-precursor"
  | "find-wrong-intermediate"
  | "distinguish-reported-vs-ai";

export interface LocalizedChallengeText {
  readonly tr: string;
  readonly en: string;
}

export interface SynthesisChallengeFeedback {
  readonly correct: LocalizedChallengeText;
  readonly incorrect: LocalizedChallengeText;
  readonly invalid: LocalizedChallengeText;
}

interface ChallengeOptionBase {
  readonly id: SynthesisChallengeOptionId;
  readonly label: LocalizedChallengeText;
}

export interface StepChallengeOption extends ChallengeOptionBase {
  readonly stepId: SynthesisStepId;
}

export interface ReactionClassChallengeOption extends ChallengeOptionBase {
  readonly reactionClass: string;
}

export interface BondChallengeOption extends ChallengeOptionBase {
  readonly stepId: SynthesisStepId;
  readonly atomMapIds: readonly [string, string];
}

export interface MaterialChallengeOption extends ChallengeOptionBase {
  readonly materialId: string;
  readonly assertedRole?: "starting-material" | "intermediate" | "final-product";
}

export interface CatalogStoryRouteCandidate {
  readonly kind: "catalog-story";
  readonly storyId: SynthesisStoryId;
}

export interface RouteDescriptorCandidate {
  readonly kind: "route-descriptor";
  readonly routeType: SynthesisRouteType;
  readonly verificationStatus: VerificationStatus;
  readonly hasDirectPrimarySource: boolean;
  readonly operationalDetailsIncluded: false;
}

export interface RouteCandidateChallengeOption extends ChallengeOptionBase {
  readonly candidate: CatalogStoryRouteCandidate | RouteDescriptorCandidate;
}

interface SynthesisChallengeBase {
  readonly id: SynthesisChallengeId;
  readonly storyId: SynthesisStoryId;
  readonly kind: SynthesisChallengeKind;
  readonly prompt: LocalizedChallengeText;
  readonly feedback: SynthesisChallengeFeedback;
  /** Stable option IDs; for ordering challenges their order is significant. */
  readonly answerIds: readonly SynthesisChallengeOptionId[];
}

export interface OrderStepsChallenge extends SynthesisChallengeBase {
  readonly kind: "order-steps";
  readonly options: readonly StepChallengeOption[];
}

export interface ChooseReactionClassChallenge extends SynthesisChallengeBase {
  readonly kind: "choose-reaction-class";
  readonly stepId: SynthesisStepId;
  readonly options: readonly ReactionClassChallengeOption[];
}

export interface IdentifyFormedBondChallenge extends SynthesisChallengeBase {
  readonly kind: "identify-formed-bond";
  readonly stepId: SynthesisStepId;
  readonly options: readonly BondChallengeOption[];
}

export interface ChoosePrecursorChallenge extends SynthesisChallengeBase {
  readonly kind: "choose-precursor";
  readonly stepId: SynthesisStepId;
  readonly options: readonly MaterialChallengeOption[];
}

export interface FindWrongIntermediateChallenge extends SynthesisChallengeBase {
  readonly kind: "find-wrong-intermediate";
  readonly options: readonly MaterialChallengeOption[];
}

export interface DistinguishReportedVsAiChallenge extends SynthesisChallengeBase {
  readonly kind: "distinguish-reported-vs-ai";
  readonly options: readonly RouteCandidateChallengeOption[];
}

export type SynthesisChallenge =
  | OrderStepsChallenge
  | ChooseReactionClassChallenge
  | IdentifyFormedBondChallenge
  | ChoosePrecursorChallenge
  | FindWrongIntermediateChallenge
  | DistinguishReportedVsAiChallenge;

export interface SynthesisChallengeSubmission {
  readonly challengeId: SynthesisChallengeId;
  readonly kind: SynthesisChallengeKind;
  readonly answerIds: readonly SynthesisChallengeOptionId[];
}

export interface SynthesisChallengeContext {
  readonly stories: readonly SynthesisStory[];
}

export type SynthesisChallengeEvaluationStatus =
  | "correct"
  | "incorrect"
  | "invalid";

export type SynthesisChallengeEvaluationReason =
  | "answer-correct"
  | "answer-incorrect"
  | "challenge-not-in-context"
  | "duplicate-answer"
  | "evidence-answer-key-mismatch"
  | "invalid-challenge-configuration"
  | "response-kind-mismatch"
  | "submission-challenge-mismatch"
  | "unknown-option";

export interface SynthesisChallengeEvaluation {
  readonly status: SynthesisChallengeEvaluationStatus;
  readonly isCorrect: boolean;
  readonly reason: SynthesisChallengeEvaluationReason;
  readonly feedback: LocalizedChallengeText;
}

const sourceSupportedStatuses: ReadonlySet<VerificationStatus> = new Set([
  "verified",
  "expert-reviewed",
  "source-supported",
]);

const sourceReportedTypes: ReadonlySet<SynthesisRouteType> = new Set([
  "literature-reported",
  "patent-reported",
]);

const unique = <T>(values: readonly T[]): boolean =>
  new Set(values).size === values.length;

const sameOrderedIds = (
  left: readonly SynthesisChallengeOptionId[],
  right: readonly SynthesisChallengeOptionId[],
): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const sameIdSet = (
  left: readonly SynthesisChallengeOptionId[],
  right: readonly SynthesisChallengeOptionId[],
): boolean =>
  left.length === right.length && left.every((value) => right.includes(value));

const sameAtomPair = (
  left: readonly [string, string],
  right: readonly [string, string],
): boolean =>
  (left[0] === right[0] && left[1] === right[1]) ||
  (left[0] === right[1] && left[1] === right[0]);

const invalidEvaluation = (
  challenge: SynthesisChallenge,
  reason: Exclude<
    SynthesisChallengeEvaluationReason,
    "answer-correct" | "answer-incorrect"
  >,
): SynthesisChallengeEvaluation => ({
  status: "invalid",
  isCorrect: false,
  reason,
  feedback: challenge.feedback.invalid,
});

const descriptorCanPresentAsSourceReported = (
  candidate: RouteDescriptorCandidate,
): boolean =>
  sourceReportedTypes.has(candidate.routeType) &&
  sourceSupportedStatuses.has(candidate.verificationStatus) &&
  candidate.hasDirectPrimarySource &&
  candidate.operationalDetailsIncluded === false;

const resolveReportedCandidateIds = (
  challenge: DistinguishReportedVsAiChallenge,
  storiesById: ReadonlyMap<SynthesisStoryId, SynthesisStory>,
): readonly SynthesisChallengeOptionId[] | null => {
  const reportedIds: SynthesisChallengeOptionId[] = [];

  for (const option of challenge.options) {
    if (option.candidate.kind === "catalog-story") {
      const story = storiesById.get(option.candidate.storyId);
      if (!story) return null;
      if (canPresentAsSourceReported(story)) reportedIds.push(option.id);
      continue;
    }
    if (descriptorCanPresentAsSourceReported(option.candidate)) {
      reportedIds.push(option.id);
    }
  }

  return reportedIds;
};

const deriveAnswerIdsFromStory = (
  challenge: SynthesisChallenge,
  story: SynthesisStory,
  storiesById: ReadonlyMap<SynthesisStoryId, SynthesisStory>,
): readonly SynthesisChallengeOptionId[] | null => {
  const stepById = new Map(story.steps.map((step) => [step.id, step] as const));
  const materials = [
    ...story.startingMaterials,
    ...story.intermediates,
    story.finalProduct,
  ];
  const materialById = new Map(
    materials.map((material) => [material.id, material] as const),
  );

  switch (challenge.kind) {
    case "order-steps": {
      if (
        challenge.options.some((option) => !stepById.has(option.stepId)) ||
        !unique(challenge.options.map((option) => option.stepId))
      ) {
        return null;
      }
      return [...challenge.options]
        .sort(
          (left, right) =>
            (stepById.get(left.stepId)?.order ?? Number.MAX_SAFE_INTEGER) -
            (stepById.get(right.stepId)?.order ?? Number.MAX_SAFE_INTEGER),
        )
        .map((option) => option.id);
    }
    case "choose-reaction-class": {
      const step = stepById.get(challenge.stepId);
      if (!step) return null;
      return challenge.options
        .filter((option) => option.reactionClass === step.transformationFamily)
        .map((option) => option.id);
    }
    case "identify-formed-bond": {
      const step = stepById.get(challenge.stepId);
      if (!step) return null;
      const mappedAtomIds = new Set(
        step.atomMapping.atoms.map((atom) => atom.mapId),
      );
      if (
        challenge.options.some(
          (option) =>
            option.stepId !== challenge.stepId ||
            option.atomMapIds.some((mapId) => !mappedAtomIds.has(mapId)),
        )
      ) {
        return null;
      }
      const formedPairs = step.bondChanges
        .filter((change) => change.kind === "formed")
        .map((change) => change.atomMapIds);
      return challenge.options
        .filter((option) =>
          formedPairs.some((pair) => sameAtomPair(option.atomMapIds, pair)),
        )
        .map((option) => option.id);
    }
    case "choose-precursor": {
      const step = stepById.get(challenge.stepId);
      if (
        !step ||
        challenge.options.some((option) => !materialById.has(option.materialId))
      ) {
        return null;
      }
      return challenge.options
        .filter((option) => step.inputMaterialIds.includes(option.materialId))
        .map((option) => option.id);
    }
    case "find-wrong-intermediate": {
      if (
        challenge.options.some(
          (option) =>
            !option.assertedRole || !materialById.has(option.materialId),
        )
      ) {
        return null;
      }
      return challenge.options
        .filter(
          (option) =>
            materialById.get(option.materialId)?.role !== option.assertedRole,
        )
        .map((option) => option.id);
    }
    case "distinguish-reported-vs-ai":
      return resolveReportedCandidateIds(challenge, storiesById);
  }
};

/**
 * Deterministic, data-only challenge evaluation. Invalid IDs, malformed answer
 * keys and unresolved provenance always fail closed instead of being graded.
 */
export const evaluateSynthesisChallenge = (
  challenge: SynthesisChallenge,
  submission: SynthesisChallengeSubmission,
  context: SynthesisChallengeContext,
): SynthesisChallengeEvaluation => {
  if (submission.challengeId !== challenge.id) {
    return invalidEvaluation(challenge, "submission-challenge-mismatch");
  }
  if (submission.kind !== challenge.kind) {
    return invalidEvaluation(challenge, "response-kind-mismatch");
  }

  const storiesById = new Map(
    context.stories.map((story) => [story.id, story] as const),
  );
  const story = storiesById.get(challenge.storyId);
  if (!story) {
    return invalidEvaluation(challenge, "challenge-not-in-context");
  }

  const optionIds = challenge.options.map((option) => option.id);
  if (
    optionIds.length < 2 ||
    !unique(optionIds) ||
    challenge.answerIds.length === 0 ||
    !unique(challenge.answerIds) ||
    challenge.answerIds.some((answerId) => !optionIds.includes(answerId))
  ) {
    return invalidEvaluation(challenge, "invalid-challenge-configuration");
  }

  const derivedAnswerIds = deriveAnswerIdsFromStory(
    challenge,
    story,
    storiesById,
  );
  const answerKeyMatchesDomain =
    derivedAnswerIds !== null &&
    (challenge.kind === "order-steps"
      ? sameOrderedIds(derivedAnswerIds, challenge.answerIds)
      : sameIdSet(derivedAnswerIds, challenge.answerIds));
  if (!answerKeyMatchesDomain) {
    return invalidEvaluation(challenge, "evidence-answer-key-mismatch");
  }

  if (!unique(submission.answerIds)) {
    return invalidEvaluation(challenge, "duplicate-answer");
  }
  if (submission.answerIds.some((answerId) => !optionIds.includes(answerId))) {
    return invalidEvaluation(challenge, "unknown-option");
  }

  if (challenge.kind === "order-steps") {
    if (
      challenge.answerIds.length !== optionIds.length ||
      !sameIdSet(challenge.answerIds, optionIds) ||
      submission.answerIds.length !== optionIds.length ||
      !sameIdSet(submission.answerIds, optionIds)
    ) {
      return invalidEvaluation(challenge, "invalid-challenge-configuration");
    }
  } else if (
    challenge.answerIds.length !== 1 ||
    submission.answerIds.length !== 1
  ) {
    return invalidEvaluation(challenge, "invalid-challenge-configuration");
  }

  const isCorrect =
    challenge.kind === "order-steps"
      ? sameOrderedIds(submission.answerIds, challenge.answerIds)
      : sameIdSet(submission.answerIds, challenge.answerIds);

  return isCorrect
    ? {
        status: "correct",
        isCorrect: true,
        reason: "answer-correct",
        feedback: challenge.feedback.correct,
      }
    : {
        status: "incorrect",
        isCorrect: false,
        reason: "answer-incorrect",
        feedback: challenge.feedback.incorrect,
      };
};
