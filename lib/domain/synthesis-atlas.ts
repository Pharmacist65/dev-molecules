import type { MoleculeId, SourceId, SynthesisStoryId } from "./ids";

export type SynthesisAtlasRouteId = `synthesis-atlas-route:${string}`;
export type SynthesisAtlasStepId = `synthesis-atlas-step:${string}`;
export type SynthesisAtlasMaterialId = `synthesis-atlas-material:${string}`;
export type SynthesisAtlasMechanismId = `synthesis-atlas-mechanism:${string}`;
export type SynthesisAtlasChallengeId = `synthesis-atlas-challenge:${string}`;

export interface SynthesisAtlasLocalizedText {
  readonly tr: string;
  readonly en: string;
}

export type SynthesisAtlasRouteKind = "foundational-education" | "reported";
export type SynthesisAtlasDirection = "forward" | "retro";
export type SynthesisAtlasLevel = "route" | "step" | "mechanism";
export type SynthesisAtlasEvidenceState =
  | "direct-source"
  | "source-context"
  | "evidence-gap";

export type SynthesisAtlasMaterialRole =
  | "building-block"
  | "reagent-fragment"
  | "intermediate"
  | "active-parent"
  | "chemical-form";

export interface SynthesisAtlasSourceAnchor {
  readonly sourceId: SourceId;
  readonly title: string;
  /** Direct patent-document or publisher URL; never a search result. */
  readonly url: string;
  readonly locator: SynthesisAtlasLocalizedText;
  readonly supportScope: SynthesisAtlasLocalizedText;
}

export interface SynthesisAtlasMaterial {
  readonly id: SynthesisAtlasMaterialId;
  readonly label: SynthesisAtlasLocalizedText;
  readonly smiles: string;
  readonly role: SynthesisAtlasMaterialRole;
  readonly sourceIds: readonly SourceId[];
  readonly layout: {
    readonly column: number;
    readonly row: number;
  };
}

export interface SynthesisAtlasElectronMove {
  readonly id: string;
  readonly from: SynthesisAtlasLocalizedText;
  readonly to: SynthesisAtlasLocalizedText;
  readonly explanation: SynthesisAtlasLocalizedText;
  /**
   * Optional, curator-authored endpoints into the exact SMILES materials shown
   * by the mechanism view. One atom addresses a lone pair/atom centre; two
   * atoms address the midpoint of a bond. Missing endpoints must never be
   * replaced with guessed geometry.
   */
  readonly fromAnchor?: SynthesisAtlasElectronAnchor;
  readonly toAnchor?: SynthesisAtlasElectronAnchor;
}

export interface SynthesisAtlasElectronAnchor {
  readonly materialId: SynthesisAtlasMaterialId;
  readonly atomIndexes: readonly [number] | readonly [number, number];
}

export interface SynthesisAtlasMechanism {
  readonly id: SynthesisAtlasMechanismId;
  /** Mechanisms are curated teaching interpretations, never protocol claims. */
  readonly evidenceState: Exclude<SynthesisAtlasEvidenceState, "evidence-gap">;
  readonly title: SynthesisAtlasLocalizedText;
  readonly nucleophile: SynthesisAtlasLocalizedText;
  readonly electrophile: SynthesisAtlasLocalizedText;
  readonly intermediate: SynthesisAtlasLocalizedText;
  readonly stereochemicalOutcome: SynthesisAtlasLocalizedText;
  readonly commonError: SynthesisAtlasLocalizedText;
  readonly electronMoves: readonly SynthesisAtlasElectronMove[];
}

export interface SynthesisAtlasBondChange {
  readonly kind: "formed" | "broken" | "order-changed";
  readonly label: SynthesisAtlasLocalizedText;
}

export interface SynthesisAtlasTransformation {
  readonly id: SynthesisAtlasStepId;
  readonly order: number;
  readonly inputMaterialIds: readonly SynthesisAtlasMaterialId[];
  readonly outputMaterialId: SynthesisAtlasMaterialId | null;
  readonly title: SynthesisAtlasLocalizedText;
  readonly reactionClass: SynthesisAtlasLocalizedText;
  readonly changeSummary: SynthesisAtlasLocalizedText;
  /** General chemistry vocabulary only: no amount, scale or recipe. */
  readonly reagentSummary: SynthesisAtlasLocalizedText;
  /** General condition family only: no temperature, duration or work-up. */
  readonly conditionSummary: SynthesisAtlasLocalizedText;
  readonly functionalGroupChanges: readonly SynthesisAtlasLocalizedText[];
  readonly bondChanges: readonly SynthesisAtlasBondChange[];
  readonly evidenceState: SynthesisAtlasEvidenceState;
  readonly sourceIds: readonly SourceId[];
  readonly sourceLocator: SynthesisAtlasLocalizedText;
  readonly mechanism: SynthesisAtlasMechanism | null;
}

export interface SynthesisAtlasRoute {
  readonly id: SynthesisAtlasRouteId;
  readonly storyId: SynthesisStoryId;
  readonly moleculeId: MoleculeId;
  readonly version: string;
  readonly kind: SynthesisAtlasRouteKind;
  readonly title: SynthesisAtlasLocalizedText;
  readonly summary: SynthesisAtlasLocalizedText;
  readonly startBoundary: SynthesisAtlasLocalizedText;
  readonly stereochemistryScope: SynthesisAtlasLocalizedText;
  readonly materials: readonly SynthesisAtlasMaterial[];
  readonly transformations: readonly SynthesisAtlasTransformation[];
  readonly sourceAnchors: readonly SynthesisAtlasSourceAnchor[];
  readonly limitations: readonly SynthesisAtlasLocalizedText[];
  readonly safety: {
    readonly operationalDetailsIncluded: false;
    readonly note: SynthesisAtlasLocalizedText;
  };
}

export type SynthesisAtlasSourceGate =
  | "source-supported"
  | "context-supported"
  | "partial-with-declared-gap"
  | "blocked";

export type SynthesisAtlasNavigationAction = "next" | "previous";

export interface SynthesisAtlasNavigationResult {
  readonly stepId: SynthesisAtlasStepId | null;
  readonly changed: boolean;
}

export type SynthesisAtlasChallengeKind =
  | "reaction-class"
  | "order-steps"
  | "missing-intermediate"
  | "mechanism-choice";

export interface SynthesisAtlasChallengeOption {
  readonly id: string;
  readonly label: SynthesisAtlasLocalizedText;
}

export interface SynthesisAtlasChallenge {
  readonly id: SynthesisAtlasChallengeId;
  readonly routeId: SynthesisAtlasRouteId;
  readonly kind: SynthesisAtlasChallengeKind;
  readonly prompt: SynthesisAtlasLocalizedText;
  readonly optionIds: readonly string[];
  readonly correctOptionIds: readonly string[];
  readonly options: readonly SynthesisAtlasChallengeOption[];
  readonly feedback: {
    readonly correct: SynthesisAtlasLocalizedText;
    readonly incorrect: SynthesisAtlasLocalizedText;
    readonly invalid: SynthesisAtlasLocalizedText;
  };
}

export interface SynthesisAtlasChallengeEvaluation {
  readonly status: "correct" | "incorrect" | "invalid";
  readonly feedback: SynthesisAtlasLocalizedText;
}

const isDirectDocumentUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !/(?:\/search(?:\/|$)|[?&](?:q|query)=)/iu.test(`${url.pathname}${url.search}`)
    );
  } catch {
    return false;
  }
};

const unique = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

const getSourceGate = (route: SynthesisAtlasRoute): SynthesisAtlasSourceGate => {
  const anchorsById = new Map(
    route.sourceAnchors.map((anchor) => [anchor.sourceId, anchor] as const),
  );

  if (
    route.transformations.length === 0 ||
    route.sourceAnchors.length === 0 ||
    route.sourceAnchors.some(
      (anchor) =>
        !isDirectDocumentUrl(anchor.url) ||
        anchor.locator.tr.trim().length === 0 ||
        anchor.locator.en.trim().length === 0,
    ) ||
    route.transformations.some(
      (step) =>
        step.sourceIds.length === 0 ||
        step.sourceIds.some((sourceId) => !anchorsById.has(sourceId)),
    ) ||
    route.safety.operationalDetailsIncluded !== false
  ) {
    return "blocked";
  }

  if (route.transformations.some((step) => step.evidenceState === "evidence-gap")) {
    return "partial-with-declared-gap";
  }
  return route.transformations.some((step) => step.evidenceState === "source-context")
    ? "context-supported"
    : "source-supported";
};

export const getSynthesisAtlasSourceGate = (
  route: SynthesisAtlasRoute,
): SynthesisAtlasSourceGate => getSourceGate(route);

export const canPresentSynthesisAtlasRouteAsReported = (
  route: SynthesisAtlasRoute,
): boolean =>
  route.kind === "reported" && getSourceGate(route) === "source-supported";

export const getSynthesisAtlasStepSequence = (
  route: SynthesisAtlasRoute,
  direction: SynthesisAtlasDirection,
): readonly SynthesisAtlasTransformation[] => {
  const sequence = [...route.transformations].sort(
    (left, right) => left.order - right.order,
  );
  return direction === "forward" ? sequence : sequence.reverse();
};

/**
 * Route navigation is deterministic and clamped. Unknown/stale step IDs fail
 * closed to the first visible step instead of jumping to an invented node.
 */
export const navigateSynthesisAtlasRoute = (
  route: SynthesisAtlasRoute,
  currentStepId: SynthesisAtlasStepId | null,
  direction: SynthesisAtlasDirection,
  action: SynthesisAtlasNavigationAction,
): SynthesisAtlasNavigationResult => {
  const sequence = getSynthesisAtlasStepSequence(route, direction);
  if (sequence.length === 0) return { stepId: null, changed: false };

  const currentIndex = sequence.findIndex((step) => step.id === currentStepId);
  if (currentIndex < 0) {
    return { stepId: sequence[0].id, changed: currentStepId !== sequence[0].id };
  }

  const delta = action === "next" ? 1 : -1;
  const nextIndex = Math.min(sequence.length - 1, Math.max(0, currentIndex + delta));
  return {
    stepId: sequence[nextIndex].id,
    changed: nextIndex !== currentIndex,
  };
};

export const canOpenSynthesisAtlasMechanism = (
  route: SynthesisAtlasRoute,
  stepId: SynthesisAtlasStepId,
): boolean => {
  const step = route.transformations.find((candidate) => candidate.id === stepId);
  if (!step?.mechanism || step.evidenceState === "evidence-gap") return false;
  if (getSourceGate(route) === "blocked") return false;
  return true;
};

const sameIds = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/** Challenge keys remain data-derived and reject malformed/tampered payloads. */
export const evaluateSynthesisAtlasChallenge = (
  challenge: SynthesisAtlasChallenge,
  answerIds: readonly string[],
): SynthesisAtlasChallengeEvaluation => {
  const configuredOptionIds = challenge.options.map((option) => option.id);
  if (
    challenge.optionIds.length < 2 ||
    !unique(challenge.optionIds) ||
    !unique(configuredOptionIds) ||
    !sameIds(challenge.optionIds, configuredOptionIds) ||
    challenge.correctOptionIds.length === 0 ||
    !unique(challenge.correctOptionIds) ||
    challenge.correctOptionIds.some((id) => !challenge.optionIds.includes(id)) ||
    answerIds.length === 0 ||
    !unique(answerIds) ||
    answerIds.some((id) => !challenge.optionIds.includes(id))
  ) {
    return { status: "invalid", feedback: challenge.feedback.invalid };
  }

  const correct = challenge.kind === "order-steps"
    ? sameIds(answerIds, challenge.correctOptionIds)
    : answerIds.length === challenge.correctOptionIds.length &&
      answerIds.every((id) => challenge.correctOptionIds.includes(id));

  return correct
    ? { status: "correct", feedback: challenge.feedback.correct }
    : { status: "incorrect", feedback: challenge.feedback.incorrect };
};
