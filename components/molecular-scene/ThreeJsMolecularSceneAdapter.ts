import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Sphere,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { getElementVisual } from "@/lib/structure/elements";
import type { MoleculeStructure } from "@/lib/structure/sdf";
import { compareStructureGraphs } from "@/lib/application/structure-comparison";
import { resolveExploreMoleculeLayout } from "@/lib/application/explore-molecule-layout";

import {
  DEFAULT_FOCUS_FIT_PADDING,
  DEFAULT_MOLECULAR_SCENE_CAMERA,
  fitSceneCameraToBoundingSphere,
} from "./camera";
import {
  createLocalStructureFitEnvelope,
  getStructureFitEnvelopeCacheKey,
  transformStructureFitEnvelope,
  type LocalStructureFitEnvelope,
} from "./fit-envelope";
import { BoundedSdfCache, validateSceneSdf } from "./sdf-cache";
import type {
  MolecularSceneAtom,
  MolecularSceneCamera,
  MolecularSceneComparisonAnalysis,
  MolecularSceneLevelOfDetail,
  MolecularSceneLayoutMetrics,
  MolecularSceneMolecule,
  MolecularSceneMoleculeHit,
  MolecularScenePort,
  MolecularSceneRepresentation,
  MolecularSceneScreenBounds,
  SceneVector3,
} from "./types";

interface AtomInstance {
  readonly reference: MolecularSceneAtom;
  readonly position: Vector3;
  readonly radius: number;
  readonly comparisonState: "common" | "changed" | null;
}

interface BondInstance {
  readonly atomA: Vector3;
  readonly atomB: Vector3;
  readonly order: number;
  readonly radius: number;
}

interface MoleculeBounds {
  readonly center: Vector3;
  readonly radius: number;
  readonly box: Box3;
}

interface RawMoleculeScreenBounds {
  readonly moleculeId: string;
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

interface AtomBatchData {
  readonly mesh: InstancedMesh;
  readonly references: readonly MolecularSceneAtom[];
}

export interface ThreeJsMolecularSceneAdapterOptions {
  readonly cache?: BoundedSdfCache;
  readonly backgroundColor?: string | number;
  readonly onCameraChange?: (
    camera: MolecularSceneCamera,
    cameraRevision: number,
  ) => void;
}

export class MolecularSceneLoadError extends Error {
  readonly failures: readonly { moleculeId: string; reason: string }[];

  constructor(failures: readonly { moleculeId: string; reason: string }[]) {
    const failureSummary = failures
      .map(({ moleculeId, reason }) => `${moleculeId}: ${reason}`)
      .join("; ");
    super(
      failures.length === 1
        ? `Structure could not be loaded for ${failures[0].moleculeId}: ${failures[0].reason}`
        : `${failures.length} molecular structures could not be loaded: ${failureSummary}`,
    );
    this.name = "MolecularSceneLoadError";
    this.failures = failures;
  }
}

const ACTIVE_CANVASES = new WeakSet<HTMLCanvasElement>();
let activeContextCount = 0;

export function getActiveMolecularSceneContextCount() {
  return activeContextCount;
}

const LOD_SEGMENTS: Readonly<
  Record<
    MolecularSceneLevelOfDetail,
    { readonly sphereWidth: number; readonly sphereHeight: number; readonly cylinder: number }
  >
> = {
  universe: { sphereWidth: 6, sphereHeight: 4, cylinder: 4 },
  cluster: { sphereWidth: 12, sphereHeight: 8, cylinder: 8 },
  focus: { sphereWidth: 22, sphereHeight: 14, cylinder: 12 },
};

const IDENTITY_QUATERNION = new Quaternion();
const Y_AXIS = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);
const CLUSTER_EMPHASIS_SCALE = 1.2;
const CLUSTER_EMPHASIS_Z_OFFSET = 1.25;
const UNIVERSE_INTERACTION_PIXEL_RATIO_SCALE = 0.5;
const UNIVERSE_MIN_FULL_QUALITY_RESTORE_MS = 650;
const UNIVERSE_MAX_FULL_QUALITY_RESTORE_MS = 2_000;
const UNIVERSE_SOFTWARE_RENDERER_RESTORE_MS = 2_000;
const UNIVERSE_RESTORE_RENDER_COST_MULTIPLIER = 4;
const UNIVERSE_MOLECULE_HIT_PADDING = 0.28;
const MIN_RENDER_PIXEL_RATIO = 0.5;
const MAX_RENDER_PIXEL_RATIO = 2;
const EMPTY_LAYOUT_METRICS: MolecularSceneLayoutMetrics = {
  visibleMoleculeCount: 0,
  minimumGap: null,
  overlapCount: 0,
  clippedMoleculeCount: 0,
  suggestedCamera: null,
};

function finiteVector(vector: { readonly x: number; readonly y: number; readonly z: number }) {
  return [vector.x, vector.y, vector.z].every(Number.isFinite);
}

const clampScreenPercentage = (value: number) => Math.min(100, Math.max(0, value));

function structureCenter(structure: MoleculeStructure) {
  const bounds = new Box3();
  for (const atom of structure.atoms) bounds.expandByPoint(new Vector3(atom.x, atom.y, atom.z));
  return bounds.isEmpty() ? new Vector3() : bounds.getCenter(new Vector3());
}

function orderOffsets(order: number, moleculeScale: number) {
  const spacing = 0.12 * moleculeScale;
  if (order === 2) return [-spacing, spacing];
  if (order === 3) return [-spacing * 1.55, 0, spacing * 1.55];
  if (order === 4) return [-spacing * 0.8, spacing * 0.8];
  return [0];
}

function cameraCopy(camera: MolecularSceneCamera): MolecularSceneCamera {
  return {
    position: { ...camera.position },
    target: { ...camera.target },
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
  };
}

function sameCamera(
  left: MolecularSceneCamera,
  right: MolecularSceneCamera,
  epsilon = 0.000_001,
) {
  const close = (leftValue: number | undefined, rightValue: number | undefined) =>
    Math.abs((leftValue ?? 0) - (rightValue ?? 0)) <= epsilon;
  return (
    close(left.position.x, right.position.x) &&
    close(left.position.y, right.position.y) &&
    close(left.position.z, right.position.z) &&
    close(left.target.x, right.target.x) &&
    close(left.target.y, right.target.y) &&
    close(left.target.z, right.target.z) &&
    close(left.fov, right.fov) &&
    close(left.near, right.near) &&
    close(left.far, right.far)
  );
}

function isSoftwareWebGlRenderer(renderer: WebGLRenderer) {
  const context = renderer.getContext();
  const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
  const unmaskedRenderer = debugInfo
    ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : "";
  const maskedRenderer = String(context.getParameter(context.RENDERER));
  return /swiftshader|llvmpipe|software rasterizer/i.test(
    `${unmaskedRenderer} ${maskedRenderer}`,
  );
}

/**
 * One adapter owns exactly one WebGLRenderer/context. Molecular data is batched
 * across the entire scene with one InstancedMesh per element and one for bonds.
 */
export class ThreeJsMolecularSceneAdapter implements MolecularScenePort {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly usesSoftwareRenderer: boolean;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly moleculeHitSphere = new Sphere();
  private readonly moleculeHitPoint = new Vector3();
  private readonly moleculeProjectionPoint = new Vector3();
  private readonly renderRoot = new Group();
  private readonly cache: BoundedSdfCache;
  private readonly onCameraChange?: (
    camera: MolecularSceneCamera,
    cameraRevision: number,
  ) => void;
  private readonly descriptors = new Map<string, MolecularSceneMolecule>();
  private readonly structures = new Map<string, MoleculeStructure>();
  private readonly localFitEnvelopes = new Map<string, LocalStructureFitEnvelope>();
  private readonly comparisonAnalyses = new Map<string, MolecularSceneComparisonAnalysis>();
  private readonly visibleIds = new Set<string>();
  private readonly atomWorldPositions = new Map<string, AtomInstance>();
  private readonly moleculeBounds = new Map<string, MoleculeBounds>();
  private readonly atomMaterials = new Map<string, MeshStandardMaterial>();
  private readonly atomBatches: AtomBatchData[] = [];
  private readonly bondMaterial = new MeshStandardMaterial({
    color: 0x85928f,
    roughness: 0.48,
    metalness: 0.08,
  });
  private readonly highlightMaterial = new MeshBasicMaterial({
    color: 0x71e5c0,
    transparent: true,
    opacity: 0.88,
    wireframe: true,
    depthTest: false,
  });
  private sphereGeometry: SphereGeometry;
  private cylinderGeometry: CylinderGeometry;
  private readonly highlightMesh: Mesh<SphereGeometry, MeshBasicMaterial>;
  private levelOfDetail: MolecularSceneLevelOfDetail = "universe";
  private representation: MolecularSceneRepresentation = "ball-and-stick";
  private hydrogensVisible = false;
  private focusedMoleculeId: string | null = null;
  private emphasizedMoleculeId: string | null = null;
  private highlightedAtom: MolecularSceneAtom | null = null;
  private visibilityRevision = 0;
  private renderFrame: number | null = null;
  private readonly renderTimingFrames = new Set<number>();
  private fullQualityRestoreTimer: number | null = null;
  private disposed = false;
  private cameraState = cameraCopy(DEFAULT_MOLECULAR_SCENE_CAMERA);
  private cameraRevision = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private reportedDevicePixelRatio = 1;
  private focusAutoFit = false;
  private focusFitPadding = DEFAULT_FOCUS_FIT_PADDING;
  private fullPixelRatio = 1;
  private appliedPixelRatio = 1;
  private usesInteractionResolution = false;
  private renderCount = 0;
  private cameraRenderRequestCount = 0;
  private fullQualityRestoreCount = 0;
  private pickAtomCount = 0;
  private pickMoleculeCount = 0;
  private lastFullQualityRenderDurationMs = 0;
  private lastInteractionRenderDurationMs = 0;
  private lastFullQualityFrameDurationMs = 0;
  private lastInteractionFrameDurationMs = 0;
  private scheduledFullQualityRestoreDelayMs = UNIVERSE_MIN_FULL_QUALITY_RESTORE_MS;
  private fullQualityRestoreQuietStartedAtMs = 0;
  private lastFullQualityRestoreElapsedMs = 0;
  private cameraConfigured = false;
  private loadMoleculesCount = 0;
  private updateVisibleMoleculesCount = 0;
  private rebuildSceneCount = 0;
  private fitVisibleMoleculesCount = 0;
  private loadedMoleculesInput: readonly MolecularSceneMolecule[] | null = null;
  private layoutMetrics: MolecularSceneLayoutMetrics = EMPTY_LAYOUT_METRICS;

  constructor(canvas: HTMLCanvasElement, options: ThreeJsMolecularSceneAdapterOptions = {}) {
    if (ACTIVE_CANVASES.has(canvas)) {
      throw new Error("This canvas already owns an active molecular WebGL context");
    }

    this.canvas = canvas;
    this.cache = options.cache ?? new BoundedSdfCache(40);
    this.onCameraChange = options.onCameraChange;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.usesSoftwareRenderer = isSoftwareWebGlRenderer(this.renderer);
    ACTIVE_CANVASES.add(canvas);
    activeContextCount += 1;

    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(options.backgroundColor ?? 0x07100f, 1);

    this.scene.background = new Color(options.backgroundColor ?? 0x07100f);
    this.scene.fog = new FogExp2(0x07100f, 0.0065);
    this.scene.add(this.renderRoot);

    const ambient = new AmbientLight(0xd8f4ec, 0.72);
    const hemisphere = new HemisphereLight(0xcff6eb, 0x07100f, 1.15);
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(8, 12, 16);
    const rim = new DirectionalLight(0x6ecdad, 1.4);
    rim.position.set(-12, -3, -9);
    this.scene.add(ambient, hemisphere, key, rim);

    const segments = LOD_SEGMENTS[this.levelOfDetail];
    this.sphereGeometry = new SphereGeometry(
      1,
      segments.sphereWidth,
      segments.sphereHeight,
    );
    this.cylinderGeometry = new CylinderGeometry(
      1,
      1,
      1,
      segments.cylinder,
      1,
      false,
    );
    this.highlightMesh = new Mesh(this.sphereGeometry, this.highlightMaterial);
    this.highlightMesh.visible = false;
    this.highlightMesh.renderOrder = 20;
    this.scene.add(this.highlightMesh);

    this.setCamera(DEFAULT_MOLECULAR_SCENE_CAMERA);
    const initialWidth = Math.max(1, Math.round(canvas.clientWidth || canvas.width || 1));
    const initialHeight = Math.max(1, Math.round(canvas.clientHeight || canvas.height || 1));
    this.resize(initialWidth, initialHeight, window.devicePixelRatio || 1);
    this.publishOperationCounts();
  }

  async loadMolecules(molecules: readonly MolecularSceneMolecule[]) {
    this.assertActive();
    if (molecules === this.loadedMoleculesInput) return;
    this.loadMoleculesCount += 1;
    this.publishOperationCounts();
    const nextDescriptors = new Map<string, MolecularSceneMolecule>();
    for (const molecule of molecules) {
      if (!molecule.id.trim()) throw new Error("Molecular scene molecule ID is empty");
      if (nextDescriptors.has(molecule.id)) {
        throw new Error(`Duplicate molecular scene molecule ID: ${molecule.id}`);
      }
      if (molecule.position && !finiteVector(molecule.position)) {
        throw new Error(`Invalid scene position for ${molecule.id}`);
      }
      if (molecule.scale !== undefined && (!Number.isFinite(molecule.scale) || molecule.scale <= 0)) {
        throw new Error(`Invalid scene scale for ${molecule.id}`);
      }
      nextDescriptors.set(molecule.id, molecule);
    }

    for (const moleculeId of this.structures.keys()) {
      const previous = this.descriptors.get(moleculeId);
      const next = nextDescriptors.get(moleculeId);
      if (
        !next ||
        previous?.structureUrl !== next.structureUrl ||
        previous.expectedPubChemCid !== next.expectedPubChemCid
      ) {
        this.structures.delete(moleculeId);
      }
    }
    this.descriptors.clear();
    for (const [id, descriptor] of nextDescriptors) this.descriptors.set(id, descriptor);
    for (const id of [...this.visibleIds]) {
      if (!nextDescriptors.has(id)) this.visibleIds.delete(id);
    }
    if (this.focusedMoleculeId && !nextDescriptors.has(this.focusedMoleculeId)) {
      this.focusedMoleculeId = null;
    }
    if (this.emphasizedMoleculeId && !nextDescriptors.has(this.emphasizedMoleculeId)) {
      this.emphasizedMoleculeId = null;
    }
    this.recomputeComparisonAnalyses();
    this.rebuildScene();
    this.loadedMoleculesInput = molecules;
  }

  async updateVisibleMolecules(moleculeIds: readonly string[]) {
    this.assertActive();
    const uniqueIds = [...new Set(moleculeIds)];
    const unknownIds = uniqueIds.filter((id) => !this.descriptors.has(id));
    if (unknownIds.length > 0) {
      throw new Error(`Unknown molecular scene IDs: ${unknownIds.join(", ")}`);
    }
    const membershipUnchanged =
      uniqueIds.length === this.visibleIds.size &&
      uniqueIds.every((id) => this.visibleIds.has(id));
    if (membershipUnchanged && uniqueIds.every((id) => this.structures.has(id))) return;

    this.updateVisibleMoleculesCount += 1;
    this.publishOperationCounts();
    this.visibleIds.clear();
    for (const id of uniqueIds) this.visibleIds.add(id);
    const revision = ++this.visibilityRevision;
    const results = await Promise.allSettled(
      uniqueIds.map(async (moleculeId) => {
        const descriptor = this.descriptors.get(moleculeId);
        if (!descriptor) throw new Error("Molecule descriptor is unavailable");
        const structure = validateSceneSdf(
          await this.cache.get(descriptor.structureUrl, descriptor.expectedPubChemCid),
          descriptor.expectedPubChemCid,
        );
        return { moleculeId, structure };
      }),
    );

    if (this.disposed || revision !== this.visibilityRevision) return;
    const failures: { moleculeId: string; reason: string }[] = [];
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const moleculeId = uniqueIds[index];
      if (result.status === "fulfilled") {
        this.structures.set(moleculeId, result.value.structure);
      } else {
        const reason =
          result.reason instanceof Error ? result.reason.message : "Unknown structure error";
        failures.push({ moleculeId, reason });
        this.structures.delete(moleculeId);
      }
    }
    for (const loadedId of [...this.structures.keys()]) {
      if (!this.visibleIds.has(loadedId) && loadedId !== this.focusedMoleculeId) {
        this.structures.delete(loadedId);
      }
    }

    this.recomputeComparisonAnalyses();
    this.rebuildScene();
    if (this.focusedMoleculeId && this.focusAutoFit) this.fitFocusedMolecule();
    if (failures.length > 0) throw new MolecularSceneLoadError(failures);
  }

  setLevelOfDetail(level: MolecularSceneLevelOfDetail) {
    this.assertActive();
    if (level === this.levelOfDetail) return;
    if (this.levelOfDetail === "universe") {
      this.cancelUniverseInteractionResolution();
    }
    this.levelOfDetail = level;
    this.replaceSharedGeometry();
    this.rebuildScene();
  }

  setCamera(camera: MolecularSceneCamera, interactive = false) {
    this.assertActive();
    if (!finiteVector(camera.position) || !finiteVector(camera.target)) {
      throw new Error("Molecular scene camera contains non-finite coordinates");
    }
    const fov = camera.fov ?? this.camera.fov ?? 42;
    const near = camera.near ?? this.camera.near ?? 0.05;
    const far = camera.far ?? this.camera.far ?? 2500;
    if (!(fov > 1 && fov < 179 && near > 0 && far > near)) {
      throw new Error("Molecular scene camera projection is invalid");
    }

    const nextCamera = cameraCopy({ ...camera, fov, near, far });
    if (this.cameraConfigured && sameCamera(this.cameraState, nextCamera)) {
      if (interactive) this.beginUniverseInteractionResolution();
      return;
    }
    this.cameraConfigured = true;
    this.cameraState = nextCamera;
    this.camera.position.set(camera.position.x, camera.position.y, camera.position.z);
    this.camera.fov = fov;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.lookAt(camera.target.x, camera.target.y, camera.target.z);
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
    this.cameraRevision += 1;
    this.publishSceneIntegrityTelemetry();
    this.publishMoleculeScreenBounds();
    if (interactive) this.beginUniverseInteractionResolution();
    this.cameraRenderRequestCount += 1;
    this.publishRenderQuality();
    this.requestRender();
    this.onCameraChange?.(this.getCameraState(), this.cameraRevision);
  }

  getCameraState() {
    return cameraCopy(this.cameraState);
  }

  getComparisonAnalysis(groupId: string) {
    return this.comparisonAnalyses.get(groupId) ?? null;
  }

  getLayoutMetrics() {
    return this.layoutMetrics;
  }

  fitVisibleMolecules() {
    this.assertActive();
    this.fitVisibleMoleculesCount += 1;
    this.publishOperationCounts();
    const camera = this.layoutMetrics.suggestedCamera;
    if (!camera) return null;
    this.setCamera(camera);
    return this.getCameraState();
  }

  fitFocusedMolecule() {
    this.assertActive();
    if (!this.focusedMoleculeId) return null;
    const descriptor = this.descriptors.get(this.focusedMoleculeId);
    const structure = this.structures.get(this.focusedMoleculeId);
    if (!descriptor || !structure) return null;
    const cacheKey = getStructureFitEnvelopeCacheKey(
      descriptor.structureUrl,
      descriptor.expectedPubChemCid,
    );
    let localEnvelope = this.localFitEnvelopes.get(cacheKey);
    if (!localEnvelope) {
      localEnvelope = createLocalStructureFitEnvelope(structure);
      this.localFitEnvelopes.set(cacheKey, localEnvelope);
    }
    this.canvas.dataset.fitEnvelopeCacheKey = cacheKey;
    this.canvas.dataset.fitEnvelopeCacheSize = String(this.localFitEnvelopes.size);
    const envelope = transformStructureFitEnvelope(localEnvelope, descriptor);
    this.setCamera(fitSceneCameraToBoundingSphere(
      this.cameraState,
      envelope.center,
      envelope.radius,
      this.camera.aspect || 1,
      this.focusFitPadding,
    ));
    return this.getCameraState();
  }

  relayoutVisibleMolecules() {
    this.assertActive();
    this.rebuildScene();
  }

  focusMolecule(
    moleculeId: string | null,
    options: { readonly autoFit?: boolean; readonly paddingFraction?: number } = {},
  ) {
    this.assertActive();
    if (moleculeId !== null && !this.descriptors.has(moleculeId)) {
      throw new Error(`Cannot focus unknown molecule: ${moleculeId}`);
    }
    const nextAutoFit = options.autoFit ?? this.focusAutoFit;
    const nextPadding = Math.max(
      0,
      Math.min(options.paddingFraction ?? DEFAULT_FOCUS_FIT_PADDING, 0.3),
    );
    const focusChanged = moleculeId !== this.focusedMoleculeId;
    const fitPolicyChanged =
      nextAutoFit !== this.focusAutoFit ||
      Math.abs(nextPadding - this.focusFitPadding) > 0.000_001;
    if (!focusChanged && !fitPolicyChanged) return;

    this.focusedMoleculeId = moleculeId;
    this.focusAutoFit = nextAutoFit;
    this.focusFitPadding = nextPadding;
    if (focusChanged) this.rebuildScene();
    if (moleculeId && this.focusAutoFit) this.fitFocusedMolecule();
  }

  setEmphasizedMolecule(moleculeId: string | null) {
    this.assertActive();
    if (moleculeId !== null && !this.descriptors.has(moleculeId)) {
      throw new Error(`Cannot emphasize unknown molecule: ${moleculeId}`);
    }
    if (moleculeId === this.emphasizedMoleculeId) return;
    this.emphasizedMoleculeId = moleculeId;
    this.rebuildScene();
  }

  setRepresentation(representation: MolecularSceneRepresentation) {
    this.assertActive();
    if (representation === this.representation) return;
    this.representation = representation;
    this.rebuildScene();
  }

  setHydrogenVisibility(visible: boolean) {
    this.assertActive();
    if (visible === this.hydrogensVisible) return;
    this.hydrogensVisible = visible;
    this.rebuildScene();
  }

  highlightAtom(atom: MolecularSceneAtom | null) {
    this.assertActive();
    if (
      this.highlightedAtom?.moleculeId === atom?.moleculeId &&
      this.highlightedAtom?.atomIndex === atom?.atomIndex
    ) return;
    this.highlightedAtom = atom;
    this.updateHighlightMesh();
    this.requestRender();
  }

  getVisibleAtoms() {
    this.assertActive();
    return [...this.atomWorldPositions.values()].map(({ reference }) => reference);
  }

  getVisibleMoleculeScreenBounds(): readonly MolecularSceneScreenBounds[] {
    this.assertActive();
    const projectedBounds: MolecularSceneScreenBounds[] = [];

    for (const {
      moleculeId,
      minimumX,
      maximumX,
      minimumY,
      maximumY,
    } of this.getRawMoleculeScreenBounds()) {
      if (
        maximumX < 0 || minimumX > 100 || maximumY < 0 || minimumY > 100
      ) continue;
      const visibleMinimumX = clampScreenPercentage(minimumX);
      const visibleMaximumX = clampScreenPercentage(maximumX);
      const visibleMinimumY = clampScreenPercentage(minimumY);
      const visibleMaximumY = clampScreenPercentage(maximumY);
      projectedBounds.push({
        moleculeId,
        x: (visibleMinimumX + visibleMaximumX) / 2,
        y: (visibleMinimumY + visibleMaximumY) / 2,
        radiusX: Math.max(0.1, (visibleMaximumX - visibleMinimumX) / 2),
        radiusY: Math.max(0.1, (visibleMaximumY - visibleMinimumY) / 2),
      });
    }

    return projectedBounds.sort((left, right) =>
      left.moleculeId.localeCompare(right.moleculeId));
  }

  private getRawMoleculeScreenBounds(): readonly RawMoleculeScreenBounds[] {
    this.camera.updateMatrixWorld(true);
    const projectedBounds: RawMoleculeScreenBounds[] = [];

    for (const [moleculeId, bounds] of this.moleculeBounds) {
      let minimumX = Number.POSITIVE_INFINITY;
      let maximumX = Number.NEGATIVE_INFINITY;
      let minimumY = Number.POSITIVE_INFINITY;
      let maximumY = Number.NEGATIVE_INFINITY;
      for (const xDirection of [-1, 1]) {
        for (const yDirection of [-1, 1]) {
          for (const zDirection of [-1, 1]) {
            const projected = this.moleculeProjectionPoint
              .set(
                xDirection < 0 ? bounds.box.min.x : bounds.box.max.x,
                yDirection < 0 ? bounds.box.min.y : bounds.box.max.y,
                zDirection < 0 ? bounds.box.min.z : bounds.box.max.z,
              )
              .project(this.camera);
            if (!finiteVector(projected)) continue;
            const screenX = (projected.x + 1) * 50;
            const screenY = (1 - projected.y) * 50;
            minimumX = Math.min(minimumX, screenX);
            maximumX = Math.max(maximumX, screenX);
            minimumY = Math.min(minimumY, screenY);
            maximumY = Math.max(maximumY, screenY);
          }
        }
      }
      if (![minimumX, maximumX, minimumY, maximumY].every(Number.isFinite)) continue;
      projectedBounds.push({ moleculeId, minimumX, maximumX, minimumY, maximumY });
    }

    return projectedBounds.sort((left, right) =>
      left.moleculeId.localeCompare(right.moleculeId));
  }

  resize(width: number, height: number, pixelRatio = 1) {
    this.assertActive();
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    const meaningfulCssResize =
      this.viewportWidth === 0 ||
      this.viewportHeight === 0 ||
      Math.abs(safeWidth - this.viewportWidth) >= 4 ||
      Math.abs(safeHeight - this.viewportHeight) >= 4;
    const nextDevicePixelRatio = Math.max(0.1, pixelRatio);
    const pixelRatioChanged =
      Math.abs(nextDevicePixelRatio - this.reportedDevicePixelRatio) >= 0.001;
    if (!meaningfulCssResize && !pixelRatioChanged) {
      this.publishSceneIntegrityTelemetry();
      return;
    }

    this.reportedDevicePixelRatio = nextDevicePixelRatio;
    this.fullPixelRatio = Math.max(
      MIN_RENDER_PIXEL_RATIO,
      Math.min(nextDevicePixelRatio, MAX_RENDER_PIXEL_RATIO),
    );
    this.applyPixelRatio(
      this.usesInteractionResolution
        ? this.interactionPixelRatio()
        : this.fullPixelRatio,
    );
    if (meaningfulCssResize) {
      this.viewportWidth = safeWidth;
      this.viewportHeight = safeHeight;
      this.renderer.setSize(safeWidth, safeHeight, false);
      this.camera.aspect = safeWidth / safeHeight;
      this.camera.updateProjectionMatrix();
      if (this.focusedMoleculeId && this.focusAutoFit) {
        this.fitFocusedMolecule();
      }
    }
    this.publishSceneIntegrityTelemetry();
    this.publishMoleculeScreenBounds();
    this.requestRender();
  }

  pickAtom(
    canvasX: number,
    canvasY: number,
    viewportWidth: number,
    viewportHeight: number,
  ) {
    this.assertActive();
    this.pickAtomCount += 1;
    this.publishOperationCounts();
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    this.pointer.set(
      (canvasX / viewportWidth) * 2 - 1,
      -(canvasY / viewportHeight) * 2 + 1,
    );
    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.atomBatches.map((batch) => batch.mesh),
      false,
    );

    for (const intersection of intersections) {
      if (intersection.instanceId === undefined) continue;
      const batch = this.atomBatches.find((candidate) => candidate.mesh === intersection.object);
      const reference = batch?.references[intersection.instanceId];
      if (reference) return reference;
    }
    return null;
  }

  pickMolecule(
    canvasX: number,
    canvasY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): MolecularSceneMoleculeHit | null {
    this.assertActive();
    this.pickMoleculeCount += 1;
    this.canvas.dataset.pickMoleculeCount = String(this.pickMoleculeCount);
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;

    this.pointer.set(
      (canvasX / viewportWidth) * 2 - 1,
      -(canvasY / viewportHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    let closest: MolecularSceneMoleculeHit | null = null;
    let closestDistanceSquared = Number.POSITIVE_INFINITY;
    for (const [moleculeId, bounds] of this.moleculeBounds) {
      this.moleculeHitSphere.set(
        bounds.center,
        bounds.radius + UNIVERSE_MOLECULE_HIT_PADDING,
      );
      const hitPoint = this.raycaster.ray.intersectSphere(
        this.moleculeHitSphere,
        this.moleculeHitPoint,
      );
      if (!hitPoint) continue;
      const descriptor = this.descriptors.get(moleculeId);
      if (!descriptor) continue;
      const distanceSquared = this.raycaster.ray.origin.distanceToSquared(hitPoint);
      if (
        distanceSquared < closestDistanceSquared - 1e-8
        || (
          Math.abs(distanceSquared - closestDistanceSquared) <= 1e-8
          && moleculeId < (closest?.moleculeId ?? "\uffff")
        )
      ) {
        closestDistanceSquared = distanceSquared;
        closest = { moleculeId, moleculeName: descriptor.name };
      }
    }
    return closest;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.visibilityRevision += 1;
    if (this.renderFrame !== null) {
      window.cancelAnimationFrame(this.renderFrame);
      this.renderFrame = null;
    }
    for (const frame of this.renderTimingFrames) window.cancelAnimationFrame(frame);
    this.renderTimingFrames.clear();
    if (this.fullQualityRestoreTimer !== null) {
      window.clearTimeout(this.fullQualityRestoreTimer);
      this.fullQualityRestoreTimer = null;
    }

    this.clearRenderBatches();
    this.scene.clear();
    this.sphereGeometry.dispose();
    this.cylinderGeometry.dispose();
    for (const material of this.atomMaterials.values()) material.dispose();
    this.atomMaterials.clear();
    this.bondMaterial.dispose();
    this.highlightMaterial.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.cache.clear();
    this.localFitEnvelopes.clear();
    ACTIVE_CANVASES.delete(this.canvas);
    activeContextCount = Math.max(0, activeContextCount - 1);
  }

  private assertActive() {
    if (this.disposed) throw new Error("Molecular scene adapter has been disposed");
  }

  private replaceSharedGeometry() {
    this.clearRenderBatches();
    this.sphereGeometry.dispose();
    this.cylinderGeometry.dispose();
    const segments = LOD_SEGMENTS[this.levelOfDetail];
    this.sphereGeometry = new SphereGeometry(
      1,
      segments.sphereWidth,
      segments.sphereHeight,
    );
    this.cylinderGeometry = new CylinderGeometry(
      1,
      1,
      1,
      segments.cylinder,
      1,
      false,
    );
    this.highlightMesh.geometry = this.sphereGeometry;
  }

  private interactionPixelRatio() {
    return Math.max(
      MIN_RENDER_PIXEL_RATIO,
      this.fullPixelRatio * UNIVERSE_INTERACTION_PIXEL_RATIO_SCALE,
    );
  }

  /**
   * Universe is an overview of up to 40 structures, so full-resolution MSAA
   * rasterization is intentionally deferred while its camera is moving. The
   * CSS canvas size, molecular capacity and geometry stay unchanged. Restore
   * timing starts at the settled viewport delay and expands only when measured
   * full-quality render cost proves that a software renderer needs longer.
   */
  private beginUniverseInteractionResolution() {
    if (this.levelOfDetail !== "universe") return;
    this.fullQualityRestoreQuietStartedAtMs = performance.now();
    this.usesInteractionResolution = true;
    this.applyPixelRatio(this.interactionPixelRatio());
    this.scheduleUniverseFullQualityRestore();
  }

  private fullQualityRestoreDelay() {
    const measuredRenderCost = Math.max(
      this.lastFullQualityFrameDurationMs,
      this.lastInteractionFrameDurationMs,
    );
    const rendererFloor = this.usesSoftwareRenderer
      ? UNIVERSE_SOFTWARE_RENDERER_RESTORE_MS
      : UNIVERSE_MIN_FULL_QUALITY_RESTORE_MS;
    return Math.min(
      UNIVERSE_MAX_FULL_QUALITY_RESTORE_MS,
      Math.max(
        rendererFloor,
        Math.ceil(measuredRenderCost * UNIVERSE_RESTORE_RENDER_COST_MULTIPLIER),
      ),
    );
  }

  private scheduleUniverseFullQualityRestore() {
    if (this.fullQualityRestoreTimer !== null) {
      window.clearTimeout(this.fullQualityRestoreTimer);
    }
    this.scheduledFullQualityRestoreDelayMs = this.fullQualityRestoreDelay();
    const elapsedSinceQuietStart = Math.max(
      0,
      performance.now() - this.fullQualityRestoreQuietStartedAtMs,
    );
    const remainingDelay = Math.max(
      0,
      this.scheduledFullQualityRestoreDelayMs - elapsedSinceQuietStart,
    );
    this.publishRenderQuality();
    this.fullQualityRestoreTimer = window.setTimeout(() => {
      this.fullQualityRestoreTimer = null;
      if (this.disposed || this.levelOfDetail !== "universe") return;
      this.lastFullQualityRestoreElapsedMs = Math.max(
        0,
        performance.now() - this.fullQualityRestoreQuietStartedAtMs,
      );
      this.usesInteractionResolution = false;
      this.applyPixelRatio(this.fullPixelRatio);
      this.fullQualityRestoreCount += 1;
      this.publishRenderQuality();
      this.requestRender();
    }, remainingDelay);
  }

  private cancelUniverseInteractionResolution() {
    if (this.fullQualityRestoreTimer !== null) {
      window.clearTimeout(this.fullQualityRestoreTimer);
      this.fullQualityRestoreTimer = null;
    }
    if (!this.usesInteractionResolution) return;
    this.usesInteractionResolution = false;
    this.applyPixelRatio(this.fullPixelRatio);
  }

  private applyPixelRatio(pixelRatio: number) {
    if (Math.abs(this.appliedPixelRatio - pixelRatio) < 0.001) {
      this.publishRenderQuality();
      return;
    }
    this.appliedPixelRatio = pixelRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.publishRenderQuality();
  }

  private moleculeIdsToRender() {
    if (this.focusedMoleculeId) {
      return this.visibleIds.has(this.focusedMoleculeId) ? [this.focusedMoleculeId] : [];
    }
    return [...this.visibleIds];
  }

  private rebuildScene() {
    if (this.disposed) return;
    this.rebuildSceneCount += 1;
    this.publishOperationCounts();
    this.clearRenderBatches();
    this.atomWorldPositions.clear();
    this.moleculeBounds.clear();

    const atomsByVisual = new Map<string, AtomInstance[]>();
    const bonds: BondInstance[] = [];

    const rendered = this.moleculeIdsToRender().flatMap((moleculeId) => {
      const descriptor = this.descriptors.get(moleculeId);
      const structure = this.structures.get(moleculeId);
      return descriptor && structure ? [{ descriptor, structure }] : [];
    });
    const collisionLayoutEnabled =
      !this.focusedMoleculeId
      && rendered.length > 1
      && rendered.every(({ descriptor }) => !descriptor.comparison)
      && (this.levelOfDetail === "universe" || this.levelOfDetail === "cluster");
    const effectivePositions = new Map<string, SceneVector3>();

    if (collisionLayoutEnabled) {
      const universe = this.levelOfDetail === "universe";
      const layout = resolveExploreMoleculeLayout({
        candidates: rendered.map(({ descriptor, structure }) => {
          const emphasized =
            this.levelOfDetail === "cluster" && descriptor.id === this.emphasizedMoleculeId;
          const scale = (descriptor.scale ?? 1) * (emphasized ? CLUSTER_EMPHASIS_SCALE : 1);
          return {
            id: descriptor.id,
            projectedAnchor: descriptor.position ?? { x: 0, y: 0, z: 0 },
            extent: this.measureStructureExtent(structure, scale),
          };
        }),
        viewport: {
          aspect: Math.max(0.35, this.camera.aspect || 16 / 9),
          bounds: universe
            ? { minX: -22, maxX: 22, minY: -12.5, maxY: 12.5 }
            : { minX: -22, maxX: 22, minY: -12.5, maxY: 12.5 },
          edgePadding: 0.35,
          fovDegrees: this.camera.fov || 42,
        },
        minimumGap: universe ? 0.72 : 0.58,
        maxIterations: 640,
        depthRange: universe ? 0.52 : 0.42,
        cameraPadding: 1.16,
      });
      for (const placement of layout.placements) {
        effectivePositions.set(placement.id, placement.position);
      }
      const fit = layout.cameraFit;
      const distance = Math.max(4, fit.distance);
      this.layoutMetrics = {
        visibleMoleculeCount: layout.placements.length,
        minimumGap: layout.minimumGap,
        overlapCount: layout.overlapCount,
        clippedMoleculeCount: layout.clippedCount,
        suggestedCamera: {
          position: {
            x: fit.target.x,
            y: fit.target.y + distance * 0.08,
            z: fit.target.z + distance,
          },
          target: fit.target,
          fov: fit.fovDegrees,
          near: 0.05,
          far: 2_500,
        },
      };
    } else {
      this.layoutMetrics = {
        ...EMPTY_LAYOUT_METRICS,
        visibleMoleculeCount: rendered.length,
      };
    }
    this.publishLayoutMetrics();

    for (const { descriptor, structure } of rendered) {
      const position = effectivePositions.get(descriptor.id);
      this.prepareMolecule(
        position ? { ...descriptor, position } : descriptor,
        structure,
        atomsByVisual,
        bonds,
      );
    }

    const matrix = new Matrix4();
    const scale = new Vector3();
    for (const [, atoms] of atomsByVisual) {
      if (atoms.length === 0) continue;
      const sample = atoms[0];
      if (!sample) continue;
      const material = this.getAtomMaterial(
        sample.reference.element,
        sample.comparisonState,
      );
      const mesh = new InstancedMesh(this.sphereGeometry, material, atoms.length);
      const references: MolecularSceneAtom[] = [];
      for (let index = 0; index < atoms.length; index += 1) {
        const atom = atoms[index];
        scale.setScalar(atom.radius);
        matrix.compose(atom.position, IDENTITY_QUATERNION, scale);
        mesh.setMatrixAt(index, matrix);
        references.push(atom.reference);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.name = `atoms:${sample.reference.element}:${sample.comparisonState ?? "default"}`;
      this.atomBatches.push({ mesh, references });
      this.renderRoot.add(mesh);
    }

    if (this.representation === "ball-and-stick" && bonds.length > 0) {
      const cylinders = bonds.flatMap((bond) => this.createBondMatrices(bond));
      const mesh = new InstancedMesh(
        this.cylinderGeometry,
        this.bondMaterial,
        cylinders.length,
      );
      for (let index = 0; index < cylinders.length; index += 1) {
        mesh.setMatrixAt(index, cylinders[index]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.name = "bonds";
      this.renderRoot.add(mesh);
    }

    this.updateHighlightMesh();
    this.publishSceneIntegrityTelemetry();
    this.publishMoleculeScreenBounds();
    this.requestRender();
  }

  private measureStructureExtent(structure: MoleculeStructure, moleculeScale: number) {
    const center = structureCenter(structure);
    const bounds = new Box3();
    for (const atom of structure.atoms) {
      if (!this.hydrogensVisible && atom.element === "H") continue;
      const point = new Vector3(atom.x, atom.y, atom.z)
        .sub(center)
        .multiplyScalar(moleculeScale);
      const visual = getElementVisual(atom.element);
      const radius =
        (this.representation === "space-filling"
          ? visual.vanDerWaalsRadius
          : visual.ballRadius) * moleculeScale;
      bounds.expandByPoint(point.clone().addScalar(radius));
      bounds.expandByPoint(point.clone().addScalar(-radius));
    }
    if (bounds.isEmpty()) return { x: 1, y: 1, z: 1 };
    const size = bounds.getSize(new Vector3());
    return {
      x: Math.max(0.5, size.x),
      y: Math.max(0.5, size.y),
      z: Math.max(0.5, size.z),
    };
  }

  private publishLayoutMetrics() {
    this.canvas.dataset.layoutViewportAspect = Math.max(
      0.001,
      this.camera.aspect || 1,
    ).toFixed(6);
    this.canvas.dataset.visibleMoleculeCount = String(
      this.layoutMetrics.visibleMoleculeCount,
    );
    this.canvas.dataset.sceneSampleCount = String(
      this.layoutMetrics.visibleMoleculeCount,
    );
    this.canvas.dataset.layoutMinimumGap = String(
      this.layoutMetrics.minimumGap ?? 0,
    );
    this.canvas.dataset.overlapCount = String(this.layoutMetrics.overlapCount);
    this.canvas.dataset.clippedMoleculeCount = String(
      this.layoutMetrics.clippedMoleculeCount,
    );
  }

  private publishMoleculeScreenBounds() {
    const bounds = this.getVisibleMoleculeScreenBounds();
    this.canvas.dataset.visibleMoleculeBoundsCount = String(bounds.length);
    this.canvas.dataset.visibleMoleculeBounds = JSON.stringify(bounds);
  }

  private publishSceneIntegrityTelemetry() {
    const cssBounds = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, cssBounds.width || this.viewportWidth || this.canvas.clientWidth);
    const cssHeight = Math.max(1, cssBounds.height || this.viewportHeight || this.canvas.clientHeight);
    const rawBounds = this.getRawMoleculeScreenBounds();
    const minimumX = Math.min(...rawBounds.map((bounds) => bounds.minimumX));
    const maximumX = Math.max(...rawBounds.map((bounds) => bounds.maximumX));
    const minimumY = Math.min(...rawBounds.map((bounds) => bounds.minimumY));
    const maximumY = Math.max(...rawBounds.map((bounds) => bounds.maximumY));
    const hasModelBounds = rawBounds.length > 0 &&
      [minimumX, maximumX, minimumY, maximumY].every(Number.isFinite);
    const cameraDistance = Math.hypot(
      this.cameraState.position.x - this.cameraState.target.x,
      this.cameraState.position.y - this.cameraState.target.y,
      this.cameraState.position.z - this.cameraState.target.z,
    );

    this.canvas.dataset.cameraState = JSON.stringify(this.cameraState);
    this.canvas.dataset.cameraRevision = String(this.cameraRevision);
    this.canvas.dataset.cameraDistance = cameraDistance.toFixed(6);
    this.canvas.dataset.modelScreenCenterX = hasModelBounds
      ? ((((minimumX + maximumX) / 2) / 100) * cssWidth).toFixed(3)
      : "0";
    this.canvas.dataset.modelScreenCenterY = hasModelBounds
      ? ((((minimumY + maximumY) / 2) / 100) * cssHeight).toFixed(3)
      : "0";
    this.canvas.dataset.modelScreenWidth = hasModelBounds
      ? (((maximumX - minimumX) / 100) * cssWidth).toFixed(3)
      : "0";
    this.canvas.dataset.modelScreenHeight = hasModelBounds
      ? (((maximumY - minimumY) / 100) * cssHeight).toFixed(3)
      : "0";
    this.canvas.dataset.canvasCssWidth = cssWidth.toFixed(3);
    this.canvas.dataset.canvasCssHeight = cssHeight.toFixed(3);
    this.canvas.dataset.canvasBufferWidth = String(this.canvas.width);
    this.canvas.dataset.canvasBufferHeight = String(this.canvas.height);
    this.canvas.dataset.devicePixelRatio = this.reportedDevicePixelRatio.toFixed(3);
    this.canvas.dataset.modelClipped = hasModelBounds && (
      minimumX < 0 || maximumX > 100 || minimumY < 0 || maximumY > 100
    ) ? "1" : "0";
  }

  private clearRenderBatches() {
    for (const child of [...this.renderRoot.children]) {
      if (child instanceof InstancedMesh) child.dispose();
    }
    this.renderRoot.clear();
    this.atomBatches.length = 0;
  }

  private prepareMolecule(
    descriptor: MolecularSceneMolecule,
    structure: MoleculeStructure,
    atomsByVisual: Map<string, AtomInstance[]>,
    bonds: BondInstance[],
  ) {
    const center = structureCenter(structure);
    const isClusterEmphasized =
      this.levelOfDetail === "cluster" && descriptor.id === this.emphasizedMoleculeId;
    const moleculeScale =
      (descriptor.scale ?? 1) * (isClusterEmphasized ? CLUSTER_EMPHASIS_SCALE : 1);
    const offset = new Vector3(
      descriptor.position?.x ?? 0,
      descriptor.position?.y ?? 0,
      (descriptor.position?.z ?? 0) +
        (isClusterEmphasized ? CLUSTER_EMPHASIS_Z_OFFSET : 0),
    );
    const atomPositions = new Map<number, Vector3>();
    const bounds = new Box3();
    const comparisonMask = descriptor.comparison
      ? this.comparisonAnalyses
          .get(descriptor.comparison.groupId)
          ?.masks.find((mask) => mask.moleculeId === descriptor.id)
      : undefined;
    const commonAtomIndices = new Set(comparisonMask?.commonAtomIndices ?? []);
    const changedAtomIndices = new Set(comparisonMask?.changedAtomIndices ?? []);

    for (const atom of structure.atoms) {
      if (!this.hydrogensVisible && atom.element === "H") continue;
      const position = new Vector3(atom.x, atom.y, atom.z)
        .sub(center)
        .multiplyScalar(moleculeScale)
        .add(offset);
      const visual = getElementVisual(atom.element);
      const radius =
        (this.representation === "space-filling"
          ? visual.vanDerWaalsRadius
          : visual.ballRadius) * moleculeScale;
      const reference: MolecularSceneAtom = {
        moleculeId: descriptor.id,
        moleculeName: descriptor.name,
        atomIndex: atom.index,
        element: atom.element,
        sourceCoordinate: { x: atom.x, y: atom.y, z: atom.z },
        worldCoordinate: { x: position.x, y: position.y, z: position.z },
      };
      const comparisonState: AtomInstance["comparisonState"] = commonAtomIndices.has(atom.index)
        ? "common"
        : changedAtomIndices.has(atom.index)
          ? "changed"
          : null;
      const instance = { reference, position, radius, comparisonState };
      const visualKey = `${atom.element}|${comparisonState ?? "default"}`;
      const elementAtoms = atomsByVisual.get(visualKey) ?? [];
      elementAtoms.push(instance);
      atomsByVisual.set(visualKey, elementAtoms);
      atomPositions.set(atom.index, position);
      this.atomWorldPositions.set(`${descriptor.id}:${atom.index}`, instance);
      bounds.expandByPoint(position.clone().addScalar(radius));
      bounds.expandByPoint(position.clone().addScalar(-radius));
    }

    if (this.representation === "ball-and-stick") {
      for (const bond of structure.bonds) {
        const atomA = atomPositions.get(bond.atomA);
        const atomB = atomPositions.get(bond.atomB);
        if (!atomA || !atomB) continue;
        bonds.push({
          atomA,
          atomB,
          order: bond.order,
          radius: Math.max(0.045, 0.105 * moleculeScale),
        });
      }
    }

    if (!bounds.isEmpty()) {
      const moleculeCenter = bounds.getCenter(new Vector3());
      const size = bounds.getSize(new Vector3());
      this.moleculeBounds.set(descriptor.id, {
        center: moleculeCenter,
        radius: Math.max(size.length() / 2, 0.5),
        box: bounds.clone(),
      });
    }
  }

  private createBondMatrices(bond: BondInstance) {
    const direction = bond.atomB.clone().sub(bond.atomA);
    const length = direction.length();
    if (length < 0.0001) return [];
    direction.multiplyScalar(1 / length);
    const axis = Math.abs(direction.dot(Y_AXIS)) > 0.92 ? X_AXIS : Y_AXIS;
    const perpendicular = new Vector3().crossVectors(direction, axis).normalize();
    const midpoint = bond.atomA.clone().add(bond.atomB).multiplyScalar(0.5);
    const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, direction);

    return orderOffsets(bond.order, bond.radius / 0.105).map((offset) => {
      const position = midpoint.clone().addScaledVector(perpendicular, offset);
      const scale = new Vector3(bond.radius, length, bond.radius);
      return new Matrix4().compose(position, rotation, scale);
    });
  }

  private getAtomMaterial(
    element: string,
    comparisonState: AtomInstance["comparisonState"] = null,
  ) {
    const materialKey = `${element}|${comparisonState ?? "default"}`;
    const cached = this.atomMaterials.get(materialKey);
    if (cached) return cached;
    const visual = getElementVisual(element);
    const material = new MeshStandardMaterial({
      color: visual.color,
      roughness: 0.36,
      metalness: 0.06,
      emissive:
        comparisonState === "common"
          ? "#2ad3a1"
          : comparisonState === "changed"
            ? "#ff6d42"
            : "#000000",
      emissiveIntensity: comparisonState ? 0.62 : 0,
    });
    this.atomMaterials.set(materialKey, material);
    return material;
  }

  private recomputeComparisonAnalyses() {
    this.comparisonAnalyses.clear();
    const groups = new Map<string, MolecularSceneMolecule[]>();
    for (const descriptor of this.descriptors.values()) {
      const groupId = descriptor.comparison?.groupId;
      if (!groupId || !this.visibleIds.has(descriptor.id)) continue;
      const members = groups.get(groupId) ?? [];
      members.push(descriptor);
      groups.set(groupId, members);
    }
    for (const [groupId, descriptors] of groups) {
      if (descriptors.length < 2 || descriptors.length > 4) continue;
      const inputs = descriptors.flatMap((descriptor) => {
        const structure = this.structures.get(descriptor.id);
        return structure ? [{ id: descriptor.id, structure }] : [];
      });
      if (inputs.length !== descriptors.length) continue;
      const analysis = compareStructureGraphs(inputs);
      this.comparisonAnalyses.set(groupId, { groupId, ...analysis });
    }
  }

  private updateHighlightMesh() {
    if (!this.highlightedAtom) {
      this.highlightMesh.visible = false;
      return;
    }
    const instance = this.atomWorldPositions.get(
      `${this.highlightedAtom.moleculeId}:${this.highlightedAtom.atomIndex}`,
    );
    if (!instance) {
      this.highlightMesh.visible = false;
      return;
    }
    this.highlightMesh.position.copy(instance.position);
    this.highlightMesh.scale.setScalar(instance.radius * 1.28);
    this.highlightMesh.visible = true;
  }

  private requestRender() {
    if (this.disposed || this.renderFrame !== null) return;
    this.renderFrame = window.requestAnimationFrame(() => {
      this.renderFrame = null;
      if (this.disposed) return;
      this.scene.updateMatrixWorld(true);
      const renderedAtInteractionResolution = this.usesInteractionResolution;
      const renderStartedAt = performance.now();
      this.renderer.render(this.scene, this.camera);
      const renderDurationMs = Math.max(0, performance.now() - renderStartedAt);
      if (renderedAtInteractionResolution) {
        this.lastInteractionRenderDurationMs = renderDurationMs;
      } else {
        this.lastFullQualityRenderDurationMs = renderDurationMs;
      }
      this.renderCount += 1;
      this.publishSceneIntegrityTelemetry();
      this.publishRenderQuality();
      const timingFrame = window.requestAnimationFrame((nextFrameAt) => {
        this.renderTimingFrames.delete(timingFrame);
        if (this.disposed) return;
        const frameDurationMs = Math.max(0, nextFrameAt - renderStartedAt);
        if (renderedAtInteractionResolution) {
          this.lastInteractionFrameDurationMs = frameDurationMs;
          if (this.usesInteractionResolution && this.fullQualityRestoreTimer !== null) {
            this.fullQualityRestoreQuietStartedAtMs = performance.now();
            this.scheduleUniverseFullQualityRestore();
          }
        } else {
          this.lastFullQualityFrameDurationMs = frameDurationMs;
        }
        this.publishRenderQuality();
      });
      this.renderTimingFrames.add(timingFrame);
    });
  }

  private publishRenderQuality() {
    this.canvas.dataset.renderPixelRatio = this.appliedPixelRatio.toFixed(2);
    this.canvas.dataset.fullPixelRatio = this.fullPixelRatio.toFixed(2);
    this.canvas.dataset.renderQuality = this.usesInteractionResolution
      ? "interaction"
      : "full";
    this.canvas.dataset.softwareRenderer = this.usesSoftwareRenderer ? "true" : "false";
    this.canvas.dataset.renderCount = String(this.renderCount);
    this.canvas.dataset.cameraRenderRequestCount = String(
      this.cameraRenderRequestCount,
    );
    this.canvas.dataset.fullQualityRestoreCount = String(
      this.fullQualityRestoreCount,
    );
    this.canvas.dataset.lastFullQualityRenderDurationMs =
      this.lastFullQualityRenderDurationMs.toFixed(2);
    this.canvas.dataset.lastInteractionRenderDurationMs =
      this.lastInteractionRenderDurationMs.toFixed(2);
    this.canvas.dataset.lastFullQualityFrameDurationMs =
      this.lastFullQualityFrameDurationMs.toFixed(2);
    this.canvas.dataset.lastInteractionFrameDurationMs =
      this.lastInteractionFrameDurationMs.toFixed(2);
    this.canvas.dataset.fullQualityRestoreDelayMs = String(
      this.scheduledFullQualityRestoreDelayMs,
    );
    this.canvas.dataset.lastFullQualityRestoreElapsedMs =
      this.lastFullQualityRestoreElapsedMs.toFixed(2);
  }

  private publishOperationCounts() {
    this.canvas.dataset.loadMoleculesCount = String(this.loadMoleculesCount);
    this.canvas.dataset.updateVisibleMoleculesCount = String(
      this.updateVisibleMoleculesCount,
    );
    this.canvas.dataset.rebuildSceneCount = String(this.rebuildSceneCount);
    this.canvas.dataset.fitVisibleMoleculesCount = String(
      this.fitVisibleMoleculesCount,
    );
    this.canvas.dataset.pickAtomCount = String(this.pickAtomCount);
    this.canvas.dataset.pickMoleculeCount = String(this.pickMoleculeCount);
  }
}
