export type AcademyLocale = "tr" | "en";

export type AcademyText = Readonly<Record<AcademyLocale, string>>;

export type AcademyInteractionKind =
  | "bond-identification"
  | "implicit-hydrogen-count"
  | "valence-correction"
  | "parent-chain-selection"
  | "parent-ring-selection"
  | "atom-numbering"
  | "functional-group-selection"
  | "principal-group-choice"
  | "affix-selection"
  | "name-part-ordering"
  | "structure-to-name"
  | "name-to-structure"
  | "heteroatom-selection"
  | "aromatic-atom-marking"
  | "heterocycle-numbering"
  | "ring-system-classification"
  | "cip-priority-ordering"
  | "stereochemistry-assignment"
  | "double-bond-stereochemistry"
  | "pharmaceutical-form-classification"
  | "name-layer-classification"
  | "name-correction"
  | "natural-product-classification";

export type AcademyResponseType =
  | "single-choice"
  | "multiple-choice"
  | "atom-selection"
  | "bond-selection"
  | "atom-sequence"
  | "ordered-parts"
  | "text"
  | "structure-choice"
  | "numeric-stepper"
  | "bond-order-editor"
  | "aromatic-marking"
  | "priority-ranking"
  | "number-placement"
  | "structure-builder"
  | "stereo-center-assignment"
  | "double-bond-assignment";

export interface AcademySection {
  readonly id: string;
  readonly order: number;
  readonly title: AcademyText;
  readonly shortTitle: AcademyText;
  readonly objective: AcademyText;
  readonly concepts: readonly AcademyText[];
  readonly scopeNote?: AcademyText;
}

export interface AcademyAtom {
  readonly id: string;
  readonly element: string;
  readonly x: number;
  readonly y: number;
  readonly charge?: number;
  readonly aromatic?: boolean;
  readonly implicitHydrogens?: number;
}

export interface AcademyBond {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly order: 1 | 2 | 3 | "aromatic";
  readonly stereo?: "wedge" | "dash";
}

export interface AcademyStructure {
  readonly id: string;
  readonly smiles: string;
  readonly title: AcademyText;
  readonly description: AcademyText;
  readonly verifiedIdentity?: {
    readonly provider: "PubChem";
    readonly pubChemCid: number;
    readonly inchiKey: string;
    readonly iupacName: string;
    readonly sourceUrl: string;
    readonly reviewStatus: "verified";
  };
  readonly atoms?: readonly AcademyAtom[];
  readonly bonds?: readonly AcademyBond[];
}

export interface AcademyOption {
  readonly id: string;
  readonly label: AcademyText;
  readonly structureId?: string;
  readonly builderRole?: "parent" | "fragment" | "attachment";
  readonly wrongFeedback?: AcademyText;
}

export interface AcademyReference {
  readonly id: string;
  readonly title: AcademyText;
  readonly url: string;
  readonly locator: AcademyText;
}

export interface AcademyCorrectRegion {
  readonly atomIds?: readonly string[];
  readonly bondIds?: readonly string[];
}

export interface AcademyBuilderOutcome {
  readonly selectionIds: readonly string[];
  readonly structureId: string;
}

export interface AcademyAlternativeCorrectAnswer {
  readonly ids: readonly string[];
  readonly correctRegion?: AcademyCorrectRegion;
}

/**
 * Every answer key is curated. The contract deliberately has no field for an
 * inferred or generated chemical answer.
 */
export interface AcademyExercise {
  readonly id: string;
  readonly sectionId: string;
  readonly kind: AcademyInteractionKind;
  readonly responseType: AcademyResponseType;
  readonly structureId: string;
  readonly title: AcademyText;
  readonly prompt: AcademyText;
  readonly instruction: AcademyText;
  readonly hint: AcademyText;
  readonly options?: readonly AcademyOption[];
  readonly correctIds?: readonly string[];
  readonly alternativeCorrectAnswers?: readonly AcademyAlternativeCorrectAnswer[];
  readonly acceptedAnswers?: Readonly<
    Record<AcademyLocale, readonly string[]>
  >;
  readonly correctFeedback: AcademyText;
  readonly incorrectFeedback: AcademyText;
  readonly violatedRule: AcademyText;
  readonly explanation: AcademyText;
  readonly solutionSteps: readonly AcademyText[];
  readonly correctRegion?: AcademyCorrectRegion;
  readonly builderOutcomes?: readonly AcademyBuilderOutcome[];
  readonly referenceIds: readonly string[];
  readonly contentStatus: "curated-educational";
}

export type AcademyAttempt = string | readonly string[];

export interface AcademyEvaluation {
  readonly status: "incomplete" | "incorrect" | "correct";
  readonly feedback: string;
  readonly violatedRule: string;
  readonly explanation: string;
  readonly solutionSteps: readonly string[];
  readonly correctRegion?: AcademyCorrectRegion;
}

export function academyText(value: AcademyText, locale: AcademyLocale): string {
  return value[locale];
}
