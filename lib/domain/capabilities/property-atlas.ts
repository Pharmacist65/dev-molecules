import type { MoleculeId, SourceId } from "../ids";
import type { ScientificConditions, ScientificToolRef } from "./common";

export type PharmaceuticalPropertyId =
  | "molecular-weight"
  | "clogp"
  | "logd"
  | "tpsa"
  | "hydrogen-bond-donors"
  | "hydrogen-bond-acceptors"
  | "rotatable-bonds"
  | "aromatic-ring-count"
  | "total-ring-count"
  | "fraction-sp3"
  | "formal-charge"
  | "heavy-atom-count"
  | "pka"
  | "aqueous-solubility"
  | "homo"
  | "lumo"
  | "optical-property";

export interface PropertyUncertainty {
  readonly kind: "reported" | "estimated" | "not-reported";
  readonly value: number | null;
  readonly unit: string | null;
  readonly limitation: string;
}

export interface PharmaceuticalPropertyValue {
  readonly propertyId: PharmaceuticalPropertyId;
  readonly value: number;
  readonly unit: string;
  readonly valueKind: "experimental" | "computed";
  readonly sourceIds: readonly SourceId[];
  readonly computationMethod: string | null;
  readonly tool: ScientificToolRef | null;
  readonly conditions: ScientificConditions;
  readonly uncertainty: PropertyUncertainty;
  readonly limitations: readonly string[];
}

export type PropertyReferenceCohort =
  | { readonly kind: "all-curated-approved-drugs"; readonly snapshotId: string }
  | {
      readonly kind: "pharmacological-family";
      readonly familyId: string;
      readonly snapshotId: string;
    }
  | { readonly kind: "atc-family"; readonly atcCode: string; readonly snapshotId: string }
  | {
      readonly kind: "user-selected-comparison";
      readonly moleculeIds: readonly MoleculeId[];
      readonly snapshotId: string;
    };

export interface PropertyPercentileResult {
  readonly moleculeId: MoleculeId;
  readonly propertyId: PharmaceuticalPropertyId;
  readonly percentile: number;
  readonly cohort: PropertyReferenceCohort;
  readonly populationSize: number;
  readonly method: string;
  readonly limitations: readonly string[];
}

export interface PropertyMapRequest {
  readonly xProperty: PharmaceuticalPropertyId;
  readonly yProperty: PharmaceuticalPropertyId;
  readonly selectedMoleculeIds: readonly MoleculeId[];
  readonly cohort: PropertyReferenceCohort;
}

export interface PropertyMapPoint {
  readonly moleculeId: MoleculeId;
  readonly x: PharmaceuticalPropertyValue;
  readonly y: PharmaceuticalPropertyValue;
}

export interface PropertyMapResult {
  readonly request: PropertyMapRequest;
  readonly points: readonly PropertyMapPoint[];
  readonly distributionMethod: "kde" | "hexbin" | "empirical-contours";
  readonly densityContext: string;
  readonly legend: readonly string[];
  readonly limitations: readonly string[];
}

export interface PropertyAtlasPort {
  readonly adapterId: string;
  getProperties(moleculeId: MoleculeId): Promise<readonly PharmaceuticalPropertyValue[]>;
  getPercentile(
    moleculeId: MoleculeId,
    propertyId: PharmaceuticalPropertyId,
    cohort: PropertyReferenceCohort,
  ): Promise<PropertyPercentileResult | null>;
  getPropertyMap(request: PropertyMapRequest): Promise<PropertyMapResult | null>;
}

export interface PropertyEligibilityAssessment {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
}

export const assessPropertyEligibility = (
  property: PharmaceuticalPropertyValue,
): PropertyEligibilityAssessment => {
  const reasons: string[] = [];
  if (!Number.isFinite(property.value)) reasons.push("Property value must be finite.");
  if (!property.unit.trim()) reasons.push("Property unit is required.");
  if (!property.conditions.summary.trim()) reasons.push("Conditions boundary is required.");
  if (!property.uncertainty.limitation.trim()) {
    reasons.push("Uncertainty or limitation statement is required.");
  }
  if (property.valueKind === "experimental" && property.sourceIds.length === 0) {
    reasons.push("Experimental properties require a resolvable source ID.");
  }
  if (
    property.valueKind === "computed" &&
    (!property.computationMethod?.trim() ||
      !property.tool?.name.trim() ||
      !property.tool.version.trim())
  ) {
    reasons.push("Computed properties require a named method and tool version.");
  }
  if (property.propertyId === "aqueous-solubility" && property.valueKind !== "experimental") {
    reasons.push("Aqueous solubility is eligible only when directly sourced.");
  }
  return { eligible: reasons.length === 0, reasons };
};

export const isPropertyComparisonSizeEligible = (
  moleculeIds: readonly MoleculeId[],
): boolean => new Set(moleculeIds).size >= 2 && new Set(moleculeIds).size <= 6;
