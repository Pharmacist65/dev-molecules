import type { VerificationStatus } from "./evidence";

export type AcademyLocale = "tr" | "en";

export type AcademyModuleId =
  | "structure-language"
  | "organic-nomenclature"
  | "pharmaceutical-nomenclature"
  | "pharmacology"
  | "adme"
  | "reaction-mechanisms"
  | "synthesis-atlas"
  | "drug-review-project";

export type AcademyModuleAvailability =
  | "available"
  | "coverage-dependent"
  | "planned";

export type AcademyModuleDestination =
  | "nomenclature"
  | "pharmacology"
  | "adme"
  | "synthesis"
  | "review";

export interface AcademyLocalizedText {
  readonly tr: string;
  readonly en: string;
}

export interface AcademyRelatedDrug {
  readonly moleculeId: `molecule:${string}`;
  readonly label: string;
}

export interface AcademyModuleDefinition {
  readonly id: AcademyModuleId;
  readonly order: number;
  readonly title: AcademyLocalizedText;
  readonly purpose: AcademyLocalizedText;
  readonly estimatedMinutes: number;
  readonly recommendedLesson: AcademyLocalizedText;
  readonly relatedDrugs: readonly AcademyRelatedDrug[];
  readonly destination: AcademyModuleDestination;
  readonly availability: AcademyModuleAvailability;
  readonly coverageNote: AcademyLocalizedText;
}

export interface AcademyModuleView
  extends Omit<
    AcademyModuleDefinition,
    "title" | "purpose" | "recommendedLesson" | "coverageNote"
  > {
  readonly title: string;
  readonly purpose: string;
  readonly recommendedLesson: string;
  readonly coverageNote: string;
  /** Null means progress is not tracked; it must never be presented as 0%. */
  readonly completionPercent: number | null;
  readonly completedUnits: number | null;
  readonly totalUnits: number | null;
}

export type AcademyScienceModuleId = "pharmacology" | "adme";

export type AcademyScienceLessonStatus =
  | "reviewed"
  | "source-supported"
  | "context-only"
  | "unavailable";

export interface AcademyScienceEvidenceItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly context: string;
  readonly sourceIds: readonly `source:${string}`[];
}

export interface AcademyAdministrationContext {
  readonly id: string;
  readonly route: string;
  readonly formulation: string | null;
  readonly sourceIds: readonly `source:${string}`[];
  readonly boundary: string;
}

export interface AcademyScienceSource {
  readonly id: `source:${string}`;
  readonly provider: string;
  readonly title: string;
  readonly url: string;
  readonly scope: string;
  readonly reviewStatus: VerificationStatus;
}

export interface AcademyScienceLesson {
  readonly moduleId: AcademyScienceModuleId;
  readonly moleculeId: `molecule:${string}` | null;
  readonly moleculeName: string;
  readonly title: string;
  readonly objective: string;
  readonly status: AcademyScienceLessonStatus;
  readonly statusReason: string;
  readonly evidenceItems: readonly AcademyScienceEvidenceItem[];
  readonly administrationContexts: readonly AcademyAdministrationContext[];
  readonly sources: readonly AcademyScienceSource[];
  readonly limitations: readonly string[];
  readonly notForClinicalUse: true;
}
