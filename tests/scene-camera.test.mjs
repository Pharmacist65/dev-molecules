import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  interpolateSceneCamera,
  orbitSceneCamera,
  panSceneCamera,
  zoomSceneCamera,
} = await tsImport(
  "../components/molecular-scene/camera.ts",
  import.meta.url,
);

const camera = {
  position: { x: 0, y: 4, z: 28 },
  target: { x: 0, y: 0, z: 0 },
  fov: 42,
  near: 0.05,
  far: 2500,
};

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

test("orbit preserves target and camera radius without an idle animation loop", () => {
  const rotated = orbitSceneCamera(camera, 18, -11);
  assert.deepEqual(rotated.target, camera.target);
  assert.ok(
    Math.abs(distance(rotated.position, rotated.target) - distance(camera.position, camera.target)) <
      1e-9,
  );
  assert.notDeepEqual(rotated.position, camera.position);
});

test("pan translates camera position and target by the same world vector", () => {
  const panned = panSceneCamera(camera, 25, -14);
  const positionDelta = {
    x: panned.position.x - camera.position.x,
    y: panned.position.y - camera.position.y,
    z: panned.position.z - camera.position.z,
  };
  const targetDelta = {
    x: panned.target.x - camera.target.x,
    y: panned.target.y - camera.target.y,
    z: panned.target.z - camera.target.z,
  };
  assert.ok(Math.abs(positionDelta.x - targetDelta.x) < 1e-12);
  assert.ok(Math.abs(positionDelta.y - targetDelta.y) < 1e-12);
  assert.ok(Math.abs(positionDelta.z - targetDelta.z) < 1e-12);
});

test("zoom changes distance while preserving the look target", () => {
  const closer = zoomSceneCamera(camera, -120);
  const farther = zoomSceneCamera(camera, 120);
  assert.deepEqual(closer.target, camera.target);
  assert.ok(distance(closer.position, closer.target) < distance(camera.position, camera.target));
  assert.ok(distance(farther.position, farther.target) > distance(camera.position, camera.target));
});

test("fly-to interpolation is bounded and lands exactly on its target", () => {
  const destination = {
    ...camera,
    position: { x: 6, y: 2, z: 18 },
    target: { x: 3, y: -2, z: 1 },
  };
  assert.deepEqual(interpolateSceneCamera(camera, destination, -1), camera);
  assert.deepEqual(interpolateSceneCamera(camera, destination, 1), destination);
  assert.deepEqual(interpolateSceneCamera(camera, destination, 2), destination);
  assert.deepEqual(interpolateSceneCamera(camera, destination, 0.5).target, {
    x: 1.5,
    y: -1,
    z: 0.5,
  });
});
