import type { ScientificPortResult } from "./common";

export type SupportedStructureFormat =
  | "sdf"
  | "mol"
  | "mol2"
  | "pdb"
  | "mmcif"
  | "xyz";

export interface StructureInputRef {
  readonly structureId: string;
  readonly format: SupportedStructureFormat;
  readonly locator: string;
  readonly sourceId: `source:${string}` | null;
  readonly checksum: string | null;
  readonly userSupplied: boolean;
}

export interface AtomSelection {
  readonly atomIds: readonly string[];
}

export interface BondSelection {
  readonly bondIds: readonly string[];
}

export interface GeometryMeasurement {
  readonly kind: "distance" | "bond-angle" | "torsion";
  readonly atomIds: readonly string[];
  readonly value: number;
  readonly unit: "angstrom" | "degree";
}

export interface StructureQualityIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "error";
  readonly message: string;
  readonly atomIds: readonly string[];
}

export interface StructureAnalysisResult {
  readonly structureId: string;
  readonly atomCount: number;
  readonly bondCount: number;
  readonly formalCharge: number | null;
  readonly stereocenterAtomIds: readonly string[];
  readonly boundingDimensionsAngstrom: readonly [number, number, number] | null;
  readonly qualityIssues: readonly StructureQualityIssue[];
}

export interface DescriptorValue {
  readonly id: string;
  readonly value: number | string;
  readonly unit: string | null;
  readonly method: string;
  readonly limitations: readonly string[];
}

export interface MolecularGraphRecord {
  readonly structureId: string;
  readonly schemaVersion: string;
  readonly nodes: readonly Readonly<Record<string, string | number | boolean>>[];
  readonly edges: readonly Readonly<Record<string, string | number | boolean>>[];
  readonly selectedAtomIds: readonly string[];
}

export interface SelectedSubstructureArtifact {
  readonly parentStructureId: string;
  readonly selectedAtomIds: readonly string[];
  readonly selectedBondIds: readonly string[];
  readonly format: "sdf" | "mol" | "json";
  readonly locator: string;
}

export interface ContactMapRecord {
  readonly structureId: string;
  readonly level: "atom" | "residue";
  readonly cutoffAngstrom: number;
  readonly contacts: readonly {
    readonly firstId: string;
    readonly secondId: string;
    readonly distanceAngstrom: number;
  }[];
}

export interface BindingSiteRecord {
  readonly structureId: string;
  readonly ligandId: string;
  readonly residueIds: readonly string[];
  readonly interactionTypes: readonly string[];
  readonly method: string;
  readonly experimentalContext: boolean;
}

export interface DockingPoseRecord {
  readonly structureId: string;
  readonly poseId: string;
  readonly poseStatus: "predicted-pose";
  readonly score: number;
  readonly scoreName: string;
  readonly scoreUnit: string | null;
  readonly interpretation: "ranking-only-not-efficacy-or-binding-proof";
  readonly backend: string;
  readonly backendVersion: string;
}

export interface StructureParserPort {
  readonly adapterId: string;
  readonly supportedFormats: readonly SupportedStructureFormat[];
  parse(input: StructureInputRef): Promise<ScientificPortResult<StructureAnalysisResult>>;
}

export interface StructureAnalysisPort {
  readonly adapterId: string;
  analyze(input: StructureInputRef): Promise<ScientificPortResult<StructureAnalysisResult>>;
  measure(
    input: StructureInputRef,
    atomIds: readonly string[],
    kind: GeometryMeasurement["kind"],
  ): Promise<ScientificPortResult<GeometryMeasurement>>;
  exportSelection(
    input: StructureInputRef,
    atoms: AtomSelection,
    bonds: BondSelection,
    format: SelectedSubstructureArtifact["format"],
  ): Promise<ScientificPortResult<SelectedSubstructureArtifact>>;
}

export interface DescriptorPort {
  readonly adapterId: string;
  describe(input: StructureInputRef): Promise<ScientificPortResult<readonly DescriptorValue[]>>;
}

export interface MolecularGraphPort {
  readonly adapterId: string;
  exportGraph(
    input: StructureInputRef,
    selection?: AtomSelection,
  ): Promise<ScientificPortResult<MolecularGraphRecord>>;
}

export interface ContactMapPort {
  readonly adapterId: string;
  createContactMap(
    input: StructureInputRef,
    cutoffAngstrom: number,
  ): Promise<ScientificPortResult<ContactMapRecord>>;
}

export interface BindingSitePort {
  readonly adapterId: string;
  findBindingSite(
    input: StructureInputRef,
    ligandId: string,
  ): Promise<ScientificPortResult<BindingSiteRecord>>;
}

export interface DockingResultPort {
  readonly adapterId: string;
  readResults(input: StructureInputRef): Promise<ScientificPortResult<readonly DockingPoseRecord[]>>;
}

/** Correct atom arity and units are mandatory before a measurement is shown. */
export const isGeometryMeasurementEligible = (
  measurement: GeometryMeasurement,
): boolean => {
  const expectedAtoms = measurement.kind === "distance" ? 2 : measurement.kind === "bond-angle" ? 3 : 4;
  const expectedUnit = measurement.kind === "distance" ? "angstrom" : "degree";
  return (
    measurement.atomIds.length === expectedAtoms &&
    measurement.unit === expectedUnit &&
    Number.isFinite(measurement.value)
  );
};
