import type { SourceId } from "../ids";
import type { ScientificPortResult, ScientificToolRef } from "./common";

export type QuantumFieldKind =
  | "homo"
  | "lumo"
  | "electron-density"
  | "electrostatic-potential";

export interface QuantumFieldAsset {
  readonly kind: QuantumFieldKind;
  readonly value: number | null;
  readonly unit: string | null;
  readonly surfaceLocator: string | null;
  readonly structureIdentity: string;
}

export interface QuantumDataSet {
  readonly id: string;
  readonly moleculeIdentity: string;
  readonly fields: readonly QuantumFieldAsset[];
  readonly status: "experimental" | "computed";
  readonly sourceIds: readonly SourceId[];
  readonly backendId: string | null;
  readonly method: string;
  readonly basis: string;
  readonly tool: ScientificToolRef;
  readonly conditions: string;
  readonly limitations: readonly string[];
}

export interface QuantumDataPort {
  readonly adapterId: string;
  getByMoleculeIdentity(
    moleculeIdentity: string,
    signal?: AbortSignal,
  ): Promise<ScientificPortResult<QuantumDataSet | null>>;
}

export interface QuantumEligibilityAssessment {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
}

export const assessQuantumDataEligibility = (
  dataset: QuantumDataSet,
): QuantumEligibilityAssessment => {
  const reasons: string[] = [];
  if (dataset.fields.length === 0) reasons.push("At least one quantum field is required.");
  if (dataset.sourceIds.length === 0 && !dataset.backendId?.trim()) {
    reasons.push("A resolvable source or named computational backend is required.");
  }
  if (!dataset.method.trim()) reasons.push("Computational or experimental method is required.");
  if (!dataset.basis.trim()) reasons.push("Basis or experimental basis statement is required.");
  if (!dataset.tool.name.trim() || !dataset.tool.version.trim()) {
    reasons.push("Tool name and version are required.");
  }
  if (!dataset.conditions.trim()) reasons.push("Conditions are required.");
  if (
    dataset.fields.some(
      (field) => field.value === null && !field.surfaceLocator?.trim(),
    )
  ) {
    reasons.push("Each quantum field requires a numeric value or a sourced surface asset.");
  }
  return { eligible: reasons.length === 0, reasons };
};
