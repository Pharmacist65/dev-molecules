import type { MoleculeId, SourceId } from "../ids";
import type { ScientificPortResult } from "./common";

export type ComplexEvidenceKind =
  | "experimental-bound-structure"
  | "predicted-protein-structure"
  | "predicted-ligand-pose";

export interface TargetComplexRecord {
  readonly id: string;
  readonly moleculeId: MoleculeId;
  readonly targetId: string;
  readonly targetName: string;
  readonly targetFamily: string;
  readonly pdbId: string | null;
  readonly evidenceKind: ComplexEvidenceKind;
  readonly experimentalMethod: string | null;
  readonly resolutionAngstrom: number | null;
  readonly ligandInstanceId: string | null;
  readonly bindingPocketId: string | null;
  readonly contactingResidues: readonly string[];
  readonly interactionTypes: readonly string[];
  readonly pathwayIds: readonly string[];
  readonly sourceIds: readonly SourceId[];
  readonly limitations: readonly string[];
}

export interface TargetComplexPort {
  readonly adapterId: string;
  findByMolecule(
    moleculeId: MoleculeId,
    signal?: AbortSignal,
  ): Promise<ScientificPortResult<readonly TargetComplexRecord[]>>;
}

export interface BiomolecularViewerAdapter {
  readonly adapterId: string;
  readonly engineName: string;
  readonly engineVersion: string;
  canRender(record: TargetComplexRecord): boolean;
}

export interface ComplexEligibilityAssessment {
  readonly eligibleExperimentalComplex: boolean;
  readonly reasons: readonly string[];
}

export const assessExperimentalComplexEligibility = (
  record: TargetComplexRecord,
): ComplexEligibilityAssessment => {
  const reasons: string[] = [];
  if (record.evidenceKind !== "experimental-bound-structure") {
    reasons.push("Record is not an experimental bound structure.");
  }
  if (!record.pdbId || !/^[0-9][A-Za-z0-9]{3}$/.test(record.pdbId)) {
    reasons.push("A resolvable four-character PDB ID is required.");
  }
  if (!record.experimentalMethod?.trim()) {
    reasons.push("Experimental method is required.");
  }
  if (!record.ligandInstanceId?.trim()) {
    reasons.push("The experimentally observed ligand instance is required.");
  }
  if (record.sourceIds.length === 0) {
    reasons.push("At least one resolvable source is required.");
  }
  if (
    record.resolutionAngstrom !== null &&
    (!Number.isFinite(record.resolutionAngstrom) || record.resolutionAngstrom <= 0)
  ) {
    reasons.push("Resolution must be a positive number when reported.");
  }
  return { eligibleExperimentalComplex: reasons.length === 0, reasons };
};
