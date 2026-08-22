export type MolecularSceneLevelOfDetail = "universe" | "cluster" | "focus";
export type MolecularSceneInteractionMode = "rotate" | "pan";
export type MolecularSceneRepresentation = "ball-and-stick" | "space-filling";

export interface SceneVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MolecularSceneCamera {
  readonly position: SceneVector3;
  readonly target: SceneVector3;
  readonly fov?: number;
  readonly near?: number;
  readonly far?: number;
}

export interface MolecularSceneMolecule {
  readonly id: string;
  readonly name: string;
  /** A real SDF V2000 record with XYZ coordinates. */
  readonly structureUrl: string;
  /** When present, the loaded 3D SDF must declare this PubChem identity. */
  readonly expectedPubChemCid?: number;
  readonly position?: SceneVector3;
  readonly scale?: number;
  readonly structureOrigin?: string;
  /** Requests a graph-derived common/changed atom mask for a 2–4 item group. */
  readonly comparison?: {
    readonly groupId: string;
    readonly method: "sdf-local-environment-core@1.0.0";
  };
}

export interface MolecularSceneComparisonMask {
  readonly moleculeId: string;
  readonly commonAtomIndices: readonly number[];
  readonly changedAtomIndices: readonly number[];
  readonly changedElements: Readonly<Record<string, number>>;
}

export interface MolecularSceneComparisonAnalysis {
  readonly groupId: string;
  readonly method: "sdf-local-environment-core@1.0.0";
  readonly commonCoreAtomCount: number;
  readonly commonCoreBondCount: number;
  readonly commonElements: Readonly<Record<string, number>>;
  readonly masks: readonly MolecularSceneComparisonMask[];
  readonly limitation: string;
}

export interface MolecularSceneAtom {
  readonly moleculeId: string;
  readonly moleculeName: string;
  readonly atomIndex: number;
  readonly element: string;
  readonly sourceCoordinate: SceneVector3;
  readonly worldCoordinate: SceneVector3;
}

export type MolecularSceneStatus = "idle" | "loading" | "ready" | "partial" | "error";

export interface MolecularScenePort {
  loadMolecules(molecules: readonly MolecularSceneMolecule[]): Promise<void>;
  updateVisibleMolecules(moleculeIds: readonly string[]): Promise<void>;
  setLevelOfDetail(level: MolecularSceneLevelOfDetail): void;
  setCamera(camera: MolecularSceneCamera, interactive?: boolean): void;
  getCameraState(): MolecularSceneCamera;
  getComparisonAnalysis(groupId: string): MolecularSceneComparisonAnalysis | null;
  focusMolecule(moleculeId: string | null): void;
  setEmphasizedMolecule(moleculeId: string | null): void;
  setRepresentation(representation: MolecularSceneRepresentation): void;
  setHydrogenVisibility(visible: boolean): void;
  highlightAtom(atom: MolecularSceneAtom | null): void;
  /** Real, currently rendered SDF atoms in deterministic molecule/atom order. */
  getVisibleAtoms(): readonly MolecularSceneAtom[];
  resize(width: number, height: number, pixelRatio?: number): void;
  pickAtom(
    canvasX: number,
    canvasY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): MolecularSceneAtom | null;
  dispose(): void;
}

export interface MolecularSceneStatusDetail {
  readonly status: MolecularSceneStatus;
  readonly loadedMoleculeCount: number;
  readonly visibleMoleculeCount: number;
  readonly error: string | null;
}

export interface SharedMolecularSceneProps {
  readonly molecules: readonly MolecularSceneMolecule[];
  readonly visibleMoleculeIds: readonly string[];
  readonly levelOfDetail: MolecularSceneLevelOfDetail;
  readonly focusedMoleculeId?: string | null;
  /** Cluster-only visual emphasis; unlike focus, it never hides peer molecules. */
  readonly emphasizedMoleculeId?: string | null;
  readonly representation?: MolecularSceneRepresentation;
  readonly showHydrogens?: boolean;
  readonly camera?: MolecularSceneCamera;
  readonly interactionMode?: MolecularSceneInteractionMode;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly onAtomSelect?: (atom: MolecularSceneAtom | null) => void;
  readonly onAtomHover?: (atom: MolecularSceneAtom | null) => void;
  readonly onCameraChange?: (camera: MolecularSceneCamera) => void;
  readonly onSceneReady?: (port: MolecularScenePort) => void;
  readonly onStatusChange?: (detail: MolecularSceneStatusDetail) => void;
  readonly onComparisonAnalysis?: (
    analysis: MolecularSceneComparisonAnalysis | null,
  ) => void;
}
