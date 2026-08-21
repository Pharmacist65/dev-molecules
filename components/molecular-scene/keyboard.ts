import type { MolecularSceneAtom } from "./types";

export type AtomTraversalDirection = "next" | "previous";

function sameAtom(left: MolecularSceneAtom, right: MolecularSceneAtom) {
  return left.moleculeId === right.moleculeId && left.atomIndex === right.atomIndex;
}

/**
 * Cycles only through atoms supplied by the live scene adapter. The helper never
 * invents an atom or derives geometry outside the parsed SDF record.
 */
export function getTraversedSceneAtom(
  atoms: readonly MolecularSceneAtom[],
  current: MolecularSceneAtom | null,
  direction: AtomTraversalDirection,
): MolecularSceneAtom | null {
  if (atoms.length === 0) return null;
  const currentIndex = current
    ? atoms.findIndex((candidate) => sameAtom(candidate, current))
    : -1;
  if (currentIndex < 0) return direction === "next" ? atoms[0] : atoms.at(-1) ?? null;
  const offset = direction === "next" ? 1 : -1;
  return atoms[(currentIndex + offset + atoms.length) % atoms.length] ?? null;
}
