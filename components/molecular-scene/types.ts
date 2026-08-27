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

export interface MolecularSceneFocusOptions {
  /** Whether focus may fit on first load, route focus changes and meaningful resizes. */
  readonly autoFit?: boolean;
  /** Fraction of each viewport edge kept clear around the focused molecule. */
  readonly paddingFraction?: number;
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

export interface MolecularSceneLayoutMetrics {
  readonly visibleMoleculeCount: number;
  readonly minimumGap: number | null;
  readonly overlapCount: number;
  readonly clippedMoleculeCount: number;
  readonly suggestedCamera: MolecularSceneCamera | null;
}

export interface MolecularSceneAtom {
  readonly moleculeId: string;
  readonly moleculeName: string;
  readonly atomIndex: number;
  readonly element: string;
  readonly sourceCoordinate: SceneVector3;
  readonly worldCoordinate: SceneVector3;
}

/** A molecule-level pointer hit that never implies an atom-level selection. */
export interface MolecularSceneMoleculeHit {
  readonly moleculeId: string;
  readonly moleculeName: string;
}

/** Conservative visible SDF bounds in Explore-scene percentage coordinates. */
export interface MolecularSceneScreenBounds {
  readonly moleculeId: string;
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

export type MolecularSceneStatus = "idle" | "loading" | "ready" | "partial" | "error";

export interface MolecularScenePort {
  loadMolecules(molecules: readonly MolecularSceneMolecule[]): Promise<void>;
  updateVisibleMolecules(moleculeIds: readonly string[]): Promise<void>;
  setLevelOfDetail(level: MolecularSceneLevelOfDetail): void;
  setCamera(camera: MolecularSceneCamera, interactive?: boolean): void;
  getCameraState(): MolecularSceneCamera;
  getComparisonAnalysis(groupId: string): MolecularSceneComparisonAnalysis | null;
  /** Actual SDF-bound layout evidence for the currently rendered overview. */
  getLayoutMetrics(): MolecularSceneLayoutMetrics;
  /** Fits the camera to the last collision-aware layout, if one is active. */
  fitVisibleMolecules(): MolecularSceneCamera | null;
  /** Fits the current focused structure without changing its auto-fit policy. */
  fitFocusedMolecule(): MolecularSceneCamera | null;
  /** Recomputes real-SDF placement for the current viewport without reloading data. */
  relayoutVisibleMolecules(): void;
  focusMolecule(
    moleculeId: string | null,
    options?: MolecularSceneFocusOptions,
  ): void;
  setEmphasizedMolecule(moleculeId: string | null): void;
  setRepresentation(representation: MolecularSceneRepresentation): void;
  setHydrogenVisibility(visible: boolean): void;
  highlightAtom(atom: MolecularSceneAtom | null): void;
  /** Real, currently rendered SDF atoms in deterministic molecule/atom order. */
  getVisibleAtoms(): readonly MolecularSceneAtom[];
  /** Current conservative molecule rectangles projected through the real camera. */
  getVisibleMoleculeScreenBounds(): readonly MolecularSceneScreenBounds[];
  resize(width: number, height: number, pixelRatio?: number): void;
  pickAtom(
    canvasX: number,
    canvasY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): MolecularSceneAtom | null;
  /**
   * Cheap analytic bounds hit-test used by Universe hover. It intentionally
   * avoids raycasting every rendered atom instance.
   */
  pickMolecule(
    canvasX: number,
    canvasY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): MolecularSceneMoleculeHit | null;
  dispose(): void;
}

export interface MolecularSceneStatusDetail {
  readonly status: MolecularSceneStatus;
  readonly loadedMoleculeCount: number;
  readonly visibleMoleculeCount: number;
  readonly error: string | null;
}

/** Real CSS viewport committed after the canvas adapter has resized. */
export interface MolecularSceneViewportCommit {
  readonly width: number;
  readonly height: number;
  readonly aspect: number;
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
  /** Focus-only atom picking/readout. Disable for decorative product stages. */
  readonly atomSelectionEnabled?: boolean;
  /** Replaces renderer terminology with learner-facing loading and fallback copy. */
  readonly copyMode?: "default" | "student";
  /** Keeps a deterministic empty envelope around a focused molecule. */
  readonly focusFitPadding?: number;
  /** Allows the focused molecule to fit only at explicit lifecycle boundaries. */
  readonly focusAutoFit?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly onAtomSelect?: (atom: MolecularSceneAtom | null) => void;
  readonly onAtomHover?: (atom: MolecularSceneAtom | null) => void;
  readonly onMoleculeHover?: (molecule: MolecularSceneMoleculeHit | null) => void;
  /** Universe-level structure activation; separate from atom selection. */
  readonly onMoleculeSelect?: (molecule: MolecularSceneMoleculeHit) => void;
  readonly onMoleculeBoundsChange?: (
    bounds: readonly MolecularSceneScreenBounds[],
  ) => void;
  readonly onViewportCommit?: (viewport: MolecularSceneViewportCommit) => void;
  readonly onCameraChange?: (
    camera: MolecularSceneCamera,
    cameraRevision: number,
  ) => void;
  readonly onSceneReady?: (port: MolecularScenePort) => void;
  readonly onStatusChange?: (detail: MolecularSceneStatusDetail) => void;
  readonly onComparisonAnalysis?: (
    analysis: MolecularSceneComparisonAnalysis | null,
  ) => void;
}
