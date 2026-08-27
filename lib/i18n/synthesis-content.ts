import type { Locale } from "./locale";

export type SynthesisStoryContentId = never;

export interface SynthesisAtomContent {
  readonly input: string;
  readonly product: string;
}

export interface SynthesisStepContent {
  readonly title: string;
  readonly inputLabels: readonly string[];
  readonly outputLabel: string;
  readonly transformationFamily: string;
  readonly changeSummary: string;
  readonly learningRationale: string;
  readonly commonMisconception: string;
  readonly atomMappingNote: string;
  readonly atoms: Readonly<Record<string, SynthesisAtomContent>>;
  readonly bondChanges: Readonly<Partial<Record<"formed" | "broken", string>>>;
  readonly verificationNote: string;
}

export interface SynthesisStoryContent {
  readonly title: string;
  readonly summary: string;
  readonly routeExplanation: string;
  readonly sourceAnchors: Readonly<
    Record<string, { readonly locator: string; readonly supportScope: string }>
  >;
  readonly materials: Readonly<Record<string, string>>;
  readonly reactionClasses: readonly string[];
  readonly stereochemistryTeachingScope: string;
  readonly limitations: readonly string[];
  readonly reviewScope: string;
  readonly verificationNote: string;
  readonly safetyNote: string;
  readonly steps: Readonly<Record<string, SynthesisStepContent>>;
}

/** Real pending route narration is retained only in the private review layer. */
export const synthesisContent: Readonly<
  Record<Locale, Readonly<Record<string, SynthesisStoryContent>>>
> = {
  tr: {},
  en: {},
};

export function isSynthesisStoryContentId(
  value: string,
): value is SynthesisStoryContentId {
  void value;
  return false;
}

export function getSynthesisStoryContent(
  _locale: Locale,
  _storyId: string,
): SynthesisStoryContent | null {
  void _locale;
  void _storyId;
  return null;
}

export function getSynthesisStepContent(
  _locale: Locale,
  _storyId: string,
  _stepId: string,
): SynthesisStepContent | null {
  void _locale;
  void _storyId;
  void _stepId;
  return null;
}

export function getSynthesisMaterialLabel(
  _locale: Locale,
  _storyId: string,
  _materialId: string,
): string | null {
  void _locale;
  void _storyId;
  void _materialId;
  return null;
}
