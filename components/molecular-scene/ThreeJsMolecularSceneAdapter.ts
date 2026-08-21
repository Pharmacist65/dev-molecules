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
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { getElementVisual } from "@/lib/structure/elements";
import type { MoleculeStructure } from "@/lib/structure/sdf";

import { DEFAULT_MOLECULAR_SCENE_CAMERA } from "./camera";
import { BoundedSdfCache, validateSceneSdf } from "./sdf-cache";
import type {
  MolecularSceneAtom,
  MolecularSceneCamera,
  MolecularSceneLevelOfDetail,
  MolecularSceneMolecule,
  MolecularScenePort,
  MolecularSceneRepresentation,
} from "./types";

interface AtomInstance {
  readonly reference: MolecularSceneAtom;
  readonly position: Vector3;
  readonly radius: number;
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
}

interface AtomBatchData {
  readonly mesh: InstancedMesh;
  readonly references: readonly MolecularSceneAtom[];
}

export interface ThreeJsMolecularSceneAdapterOptions {
  readonly cache?: BoundedSdfCache;
  readonly backgroundColor?: string | number;
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
  universe: { sphereWidth: 8, sphereHeight: 6, cylinder: 6 },
  cluster: { sphereWidth: 12, sphereHeight: 8, cylinder: 8 },
  focus: { sphereWidth: 22, sphereHeight: 14, cylinder: 12 },
};

const IDENTITY_QUATERNION = new Quaternion();
const Y_AXIS = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);
const CLUSTER_EMPHASIS_SCALE = 1.2;
const CLUSTER_EMPHASIS_Z_OFFSET = 1.25;

function finiteVector(vector: { readonly x: number; readonly y: number; readonly z: number }) {
  return [vector.x, vector.y, vector.z].every(Number.isFinite);
}

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

/**
 * One adapter owns exactly one WebGLRenderer/context. Molecular data is batched
 * across the entire scene with one InstancedMesh per element and one for bonds.
 */
export class ThreeJsMolecularSceneAdapter implements MolecularScenePort {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly renderRoot = new Group();
  private readonly cache: BoundedSdfCache;
  private readonly descriptors = new Map<string, MolecularSceneMolecule>();
  private readonly structures = new Map<string, MoleculeStructure>();
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
  private disposed = false;
  private cameraState = cameraCopy(DEFAULT_MOLECULAR_SCENE_CAMERA);

  constructor(canvas: HTMLCanvasElement, options: ThreeJsMolecularSceneAdapterOptions = {}) {
    if (ACTIVE_CANVASES.has(canvas)) {
      throw new Error("This canvas already owns an active molecular WebGL context");
    }

    this.canvas = canvas;
    this.cache = options.cache ?? new BoundedSdfCache(40);
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
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
  }

  async loadMolecules(molecules: readonly MolecularSceneMolecule[]) {
    this.assertActive();
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
    this.rebuildScene();
  }

  async updateVisibleMolecules(moleculeIds: readonly string[]) {
    this.assertActive();
    const uniqueIds = [...new Set(moleculeIds)];
    const unknownIds = uniqueIds.filter((id) => !this.descriptors.has(id));
    if (unknownIds.length > 0) {
      throw new Error(`Unknown molecular scene IDs: ${unknownIds.join(", ")}`);
    }

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

    this.rebuildScene();
    if (this.focusedMoleculeId) this.fitFocusedMolecule();
    if (failures.length > 0) throw new MolecularSceneLoadError(failures);
  }

  setLevelOfDetail(level: MolecularSceneLevelOfDetail) {
    this.assertActive();
    if (level === this.levelOfDetail) return;
    this.levelOfDetail = level;
    this.replaceSharedGeometry();
    this.rebuildScene();
  }

  setCamera(camera: MolecularSceneCamera) {
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

    this.cameraState = cameraCopy({ ...camera, fov, near, far });
    this.camera.position.set(camera.position.x, camera.position.y, camera.position.z);
    this.camera.fov = fov;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.lookAt(camera.target.x, camera.target.y, camera.target.z);
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  getCameraState() {
    return cameraCopy(this.cameraState);
  }

  focusMolecule(moleculeId: string | null) {
    this.assertActive();
    if (moleculeId !== null && !this.descriptors.has(moleculeId)) {
      throw new Error(`Cannot focus unknown molecule: ${moleculeId}`);
    }
    this.focusedMoleculeId = moleculeId;
    this.rebuildScene();
    if (moleculeId) this.fitFocusedMolecule();
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
    this.highlightedAtom = atom;
    this.updateHighlightMesh();
    this.requestRender();
  }

  getVisibleAtoms() {
    this.assertActive();
    return [...this.atomWorldPositions.values()].map(({ reference }) => reference);
  }

  resize(width: number, height: number, pixelRatio = 1) {
    this.assertActive();
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    this.renderer.setPixelRatio(Math.max(0.5, Math.min(pixelRatio, 2)));
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  pickAtom(
    canvasX: number,
    canvasY: number,
    viewportWidth: number,
    viewportHeight: number,
  ) {
    this.assertActive();
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

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.visibilityRevision += 1;
    if (this.renderFrame !== null) {
      window.cancelAnimationFrame(this.renderFrame);
      this.renderFrame = null;
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

  private moleculeIdsToRender() {
    if (this.focusedMoleculeId) {
      return this.visibleIds.has(this.focusedMoleculeId) ? [this.focusedMoleculeId] : [];
    }
    return [...this.visibleIds];
  }

  private rebuildScene() {
    if (this.disposed) return;
    this.clearRenderBatches();
    this.atomWorldPositions.clear();
    this.moleculeBounds.clear();

    const atomsByElement = new Map<string, AtomInstance[]>();
    const bonds: BondInstance[] = [];

    for (const moleculeId of this.moleculeIdsToRender()) {
      const descriptor = this.descriptors.get(moleculeId);
      const structure = this.structures.get(moleculeId);
      if (!descriptor || !structure) continue;
      this.prepareMolecule(descriptor, structure, atomsByElement, bonds);
    }

    const matrix = new Matrix4();
    const scale = new Vector3();
    for (const [element, atoms] of atomsByElement) {
      if (atoms.length === 0) continue;
      const material = this.getAtomMaterial(element);
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
      mesh.name = `atoms:${element}`;
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
    this.requestRender();
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
    atomsByElement: Map<string, AtomInstance[]>,
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
      const instance = { reference, position, radius };
      const elementAtoms = atomsByElement.get(atom.element) ?? [];
      elementAtoms.push(instance);
      atomsByElement.set(atom.element, elementAtoms);
      atomPositions.set(atom.index, position);
      this.atomWorldPositions.set(`${descriptor.id}:${atom.index}`, instance);
      bounds.expandByPoint(position);
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

  private getAtomMaterial(element: string) {
    const cached = this.atomMaterials.get(element);
    if (cached) return cached;
    const visual = getElementVisual(element);
    const material = new MeshStandardMaterial({
      color: visual.color,
      roughness: 0.36,
      metalness: 0.06,
    });
    this.atomMaterials.set(element, material);
    return material;
  }

  private fitFocusedMolecule() {
    if (!this.focusedMoleculeId) return;
    const bounds = this.moleculeBounds.get(this.focusedMoleculeId);
    if (!bounds) return;
    const currentDirection = new Vector3(
      this.cameraState.position.x - this.cameraState.target.x,
      this.cameraState.position.y - this.cameraState.target.y,
      this.cameraState.position.z - this.cameraState.target.z,
    );
    if (currentDirection.lengthSq() < 0.0001) currentDirection.set(0, 0.16, 1);
    currentDirection.normalize();
    const fovRadians = ((this.camera.fov || 42) * Math.PI) / 180;
    const distance = Math.max(3.5, (bounds.radius / Math.tan(fovRadians / 2)) * 1.3);
    const position = bounds.center.clone().addScaledVector(currentDirection, distance);
    this.setCamera({
      ...this.cameraState,
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: bounds.center.x, y: bounds.center.y, z: bounds.center.z },
    });
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
      this.renderer.render(this.scene, this.camera);
    });
  }
}
