import type { MolecularSceneCamera, SceneVector3 } from "./types";

export const DEFAULT_MOLECULAR_SCENE_CAMERA: MolecularSceneCamera = {
  position: { x: 0, y: 4, z: 28 },
  target: { x: 0, y: 0, z: 0 },
  fov: 42,
  near: 0.05,
  far: 2500,
};

export const DEFAULT_FOCUS_FIT_PADDING = 0.14;

function add(left: SceneVector3, right: SceneVector3): SceneVector3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}
function subtract(left: SceneVector3, right: SceneVector3): SceneVector3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function multiply(vector: SceneVector3, scalar: number): SceneVector3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function length(vector: SceneVector3) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalize(vector: SceneVector3): SceneVector3 {
  const magnitude = Math.max(length(vector), 0.000001);
  return multiply(vector, 1 / magnitude);
}

function cross(left: SceneVector3, right: SceneVector3): SceneVector3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function canonicalCameraCoordinate(value: number) {
  // Reset/fit is a product-state boundary. Quantizing well below rendering
  // precision prevents one-ULP drift from making two identical fits serialize
  // as different camera states after an intervening zoom.
  return Math.round(value * 1e12) / 1e12;
}

/**
 * Fits a rotation-invariant bounding sphere while preserving the incoming
 * camera direction. Using a fixed local-space sphere prevents representation,
 * hover and selection changes from becoming implicit camera operations.
 */
export function fitSceneCameraToBoundingSphere(
  camera: MolecularSceneCamera,
  center: SceneVector3,
  radius: number,
  aspect: number,
  paddingFraction = DEFAULT_FOCUS_FIT_PADDING,
): MolecularSceneCamera {
  const safeRadius = Math.max(0.001, radius);
  const safeAspect = Math.max(0.1, aspect);
  const safePadding = clamp(paddingFraction, 0, 0.3);
  const visibleFraction = Math.max(0.4, 1 - safePadding * 2);
  const halfVerticalFov = (((camera.fov ?? 42) * Math.PI) / 180) / 2;
  const limitingTangent = Math.tan(halfVerticalFov) * Math.min(1, safeAspect);
  const distance = Math.max(
    3.5,
    safeRadius / Math.max(0.001, limitingTangent * visibleFraction),
  );
  const incomingDirection = subtract(camera.position, camera.target);
  const direction = length(incomingDirection) < 0.0001
    ? normalize({ x: 0, y: 0.16, z: 1 })
    : normalize(incomingDirection);

  const position = add(center, multiply(direction, distance));
  return {
    ...camera,
    position: {
      x: canonicalCameraCoordinate(position.x),
      y: canonicalCameraCoordinate(position.y),
      z: canonicalCameraCoordinate(position.z),
    },
    target: {
      x: canonicalCameraCoordinate(center.x),
      y: canonicalCameraCoordinate(center.y),
      z: canonicalCameraCoordinate(center.z),
    },
  };
}

export function orbitSceneCamera(
  camera: MolecularSceneCamera,
  deltaX: number,
  deltaY: number,
): MolecularSceneCamera {
  const offset = subtract(camera.position, camera.target);
  const radius = clamp(length(offset), 0.5, 2000);
  const theta = Math.atan2(offset.x, offset.z) - deltaX * 0.008;
  const phi = clamp(Math.acos(clamp(offset.y / radius, -1, 1)) + deltaY * 0.008, 0.08, Math.PI - 0.08);
  const sinPhi = Math.sin(phi);

  return {
    ...camera,
    position: {
      x: camera.target.x + radius * sinPhi * Math.sin(theta),
      y: camera.target.y + radius * Math.cos(phi),
      z: camera.target.z + radius * sinPhi * Math.cos(theta),
    },
  };
}

export function panSceneCamera(
  camera: MolecularSceneCamera,
  deltaX: number,
  deltaY: number,
): MolecularSceneCamera {
  const forward = normalize(subtract(camera.target, camera.position));
  const worldUp = { x: 0, y: 1, z: 0 };
  let right = normalize(cross(forward, worldUp));
  if (length(right) < 0.01) right = { x: 1, y: 0, z: 0 };
  const up = normalize(cross(right, forward));
  const distance = length(subtract(camera.position, camera.target));
  const speed = Math.max(0.002, distance * 0.0012);
  const translation = add(
    multiply(right, -deltaX * speed),
    multiply(up, deltaY * speed),
  );

  return {
    ...camera,
    position: add(camera.position, translation),
    target: add(camera.target, translation),
  };
}

export function zoomSceneCamera(
  camera: MolecularSceneCamera,
  delta: number,
): MolecularSceneCamera {
  const offset = subtract(camera.position, camera.target);
  const distance = clamp(length(offset) * Math.exp(delta * 0.0012), 0.5, 2000);
  return {
    ...camera,
    position: add(camera.target, multiply(normalize(offset), distance)),
  };
}

function lerp(left: number, right: number, amount: number) {
  return left + (right - left) * amount;
}

/** Pure camera interpolation used for spatial fly-to transitions. */
export function interpolateSceneCamera(
  from: MolecularSceneCamera,
  to: MolecularSceneCamera,
  progress: number,
): MolecularSceneCamera {
  const amount = clamp(progress, 0, 1);
  return {
    position: {
      x: lerp(from.position.x, to.position.x, amount),
      y: lerp(from.position.y, to.position.y, amount),
      z: lerp(from.position.z, to.position.z, amount),
    },
    target: {
      x: lerp(from.target.x, to.target.x, amount),
      y: lerp(from.target.y, to.target.y, amount),
      z: lerp(from.target.z, to.target.z, amount),
    },
    fov: lerp(from.fov ?? 42, to.fov ?? 42, amount),
    near: lerp(from.near ?? 0.05, to.near ?? 0.05, amount),
    far: lerp(from.far ?? 2500, to.far ?? 2500, amount),
  };
}
