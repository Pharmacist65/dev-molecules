import type { VerificationStatus } from "./evidence";

export interface LocalizedFamilyText {
  readonly tr: string;
  readonly en: string;
}

export type DrugFamilyKind =
  | "therapeutic"
  | "pharmacological"
  | "chemical-scaffold";

export type DrugClassificationSystem =
  | "therapeutic-atc"
  | "pharmacological-mechanism"
  | "chemical-scaffold";

export interface FamilyEvidenceSource {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly verification: Extract<
    VerificationStatus,
    "verified" | "expert-reviewed" | "source-supported"
  >;
}

export type FamilyEvidenceField<Value> =
  | {
      readonly availability: "available";
      readonly value: Value;
      readonly sources: readonly FamilyEvidenceSource[];
      readonly limitations?: readonly LocalizedFamilyText[];
    }
  | {
      readonly availability: "missing";
      readonly reason: LocalizedFamilyText;
    };

export interface FamilyClassificationNode {
  readonly code?: string;
  readonly label: LocalizedFamilyText;
}

/** A family can retain multiple paths in each parallel classification system. */
export interface FamilyClassificationTrack {
  readonly system: DrugClassificationSystem;
  readonly paths: readonly (readonly FamilyClassificationNode[])[];
  readonly sources: readonly FamilyEvidenceSource[];
}

export type FamilyComparisonFieldId =
  | "selectivity"
  | "action-type"
  | "primary-targets"
  | "lipophilicity"
  | "main-metabolic-pathway"
  | "active-metabolites"
  | "half-life-range"
  | "common-route"
  | "structural-motif";

export interface FamilyDrugClassificationMembership {
  readonly system: DrugClassificationSystem;
  readonly labels: readonly LocalizedFamilyText[];
}

export interface FamilyRepresentativeDrug {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly formula: string;
  readonly pubChemCid: number;
  readonly canonicalSmiles?: string;
  readonly twoDStructureUrl?: string;
  readonly memberships: readonly FamilyDrugClassificationMembership[];
  readonly comparison: Readonly<
    Partial<Record<FamilyComparisonFieldId, FamilyEvidenceField<LocalizedFamilyText>>>
  >;
}

export interface FamilyLearningLink {
  readonly id: string;
  readonly label: LocalizedFamilyText;
  readonly href: string;
}

export interface DrugFamilyPageModel {
  readonly id: string;
  readonly slug: string;
  readonly name: LocalizedFamilyText;
  readonly kinds: readonly DrugFamilyKind[];
  readonly overview: FamilyEvidenceField<LocalizedFamilyText>;
  readonly classifications: readonly FamilyClassificationTrack[];
  readonly sharedMechanism: FamilyEvidenceField<readonly LocalizedFamilyText[]>;
  readonly primaryTargetFamilies: FamilyEvidenceField<readonly LocalizedFamilyText[]>;
  readonly sharedStructuralMotifs: FamilyEvidenceField<readonly LocalizedFamilyText[]>;
  readonly representatives: readonly FamilyRepresentativeDrug[];
  readonly learningPath: readonly FamilyLearningLink[];
}

export const FAMILY_COMPARISON_FIELD_IDS = [
  "selectivity",
  "action-type",
  "primary-targets",
  "lipophilicity",
  "main-metabolic-pathway",
  "active-metabolites",
  "half-life-range",
  "common-route",
  "structural-motif",
] as const satisfies readonly FamilyComparisonFieldId[];
