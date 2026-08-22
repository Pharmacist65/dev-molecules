import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { getTraversedSceneAtom } = await tsImport(
  "../components/molecular-scene/keyboard.ts",
  import.meta.url,
);

const atoms = [
  { moleculeId: "molecule:a", moleculeName: "A", atomIndex: 0, element: "C", sourceCoordinate: { x: 0, y: 0, z: 0 }, worldCoordinate: { x: 0, y: 0, z: 0 } },
  { moleculeId: "molecule:a", moleculeName: "A", atomIndex: 1, element: "O", sourceCoordinate: { x: 1, y: 0, z: 0 }, worldCoordinate: { x: 1, y: 0, z: 0 } },
  { moleculeId: "molecule:b", moleculeName: "B", atomIndex: 0, element: "N", sourceCoordinate: { x: 0, y: 1, z: 0 }, worldCoordinate: { x: 0, y: 1, z: 0 } },
];

test("keyboard atom traversal uses only supplied live-scene atoms and wraps", () => {
  assert.equal(getTraversedSceneAtom(atoms, null, "next"), atoms[0]);
  assert.equal(getTraversedSceneAtom(atoms, null, "previous"), atoms[2]);
  assert.equal(getTraversedSceneAtom(atoms, atoms[0], "next"), atoms[1]);
  assert.equal(getTraversedSceneAtom(atoms, atoms[0], "previous"), atoms[2]);
  assert.equal(getTraversedSceneAtom(atoms, atoms[2], "next"), atoms[0]);
  assert.equal(getTraversedSceneAtom([], null, "next"), null);
});

test("a stale atom reference re-enters at the deterministic edge", () => {
  const stale = { ...atoms[0], atomIndex: 99 };
  assert.equal(getTraversedSceneAtom(atoms, stale, "next"), atoms[0]);
  assert.equal(getTraversedSceneAtom(atoms, stale, "previous"), atoms[2]);
});
