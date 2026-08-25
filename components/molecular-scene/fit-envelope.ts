import { getElementVisual } from "@/lib/structure/elements";
import type { MoleculeStructure } from "@/lib/structure/sdf";

import type {
  MolecularSceneMolecule,
  SceneVector3,
} from "./types";

export interface LocalStructureFitEnvelope {
  /** Offset from the renderer's structure-coordinate center. */
  readonly centerOffset: SceneVector3;
  /** Rotation-invariant radius containing every atom at its largest visual radius. */
  readonly radius: number;
}

export interface TransformedStructureFitEnvelope {
  readonly center: SceneVector3;
  readonly radius: number;
}

function coordinateCenter(structure: MoleculeStructure): SceneVector3 {
  if (structure.atoms.length === 0) return { x: 0, y: 0, z: 0 };
  const minimum = { x: Infinity, y: Infinity, z: Infinity };
  const maximum = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const atom of structure.atoms) {
    minimum.x = Math.min(minimum.x, atom.x);
    minimum.y = Math.min(minimum.y, atom.y);
    minimum.z = Math.min(minimum.z, atom.z);
    maximum.x = Math.max(maximum.x, atom.x);
    maximum.y = Math.max(maximum.y, atom.y);
    maximum.z = Math.max(maximum.z, atom.z);
  }
  return {
    x: (minimum.x + maximum.x) / 2,
    y: (minimum.y + maximum.y) / 2,
    z: (minimum.z + maximum.z) / 2,
  };
}

export function getStructureFitEnvelopeCacheKey(
  structureUrl: string,
  expectedPubChemCid?: number,
) {
  return JSON.stringify([structureUrl, expectedPubChemCid ?? null]);
}

/**
 * Computes once from immutable SDF coordinates. Hydrogen visibility and the
 * active representation are deliberately absent: every atom is enclosed using
 * the larger of its ball-and-stick and van der Waals visual radii.
 */
export function createLocalStructureFitEnvelope(
  structure: MoleculeStructure,
): LocalStructureFitEnvelope {
  if (structure.atoms.length === 0) {
    return Object.freeze({
      centerOffset: Object.freeze({ x: 0, y: 0, z: 0 }),
      radius: 0.5,
    });
  }

  const structureCenter = coordinateCenter(structure);
  const minimum = { x: Infinity, y: Infinity, z: Infinity };
  const maximum = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const atom of structure.atoms) {
    const visual = getElementVisual(atom.element);
    const visualRadius = Math.max(visual.ballRadius, visual.vanDerWaalsRadius);
    const local = {
      x: atom.x - structureCenter.x,
      y: atom.y - structureCenter.y,
      z: atom.z - structureCenter.z,
    };
    minimum.x = Math.min(minimum.x, local.x - visualRadius);
    minimum.y = Math.min(minimum.y, local.y - visualRadius);
    minimum.z = Math.min(minimum.z, local.z - visualRadius);
    maximum.x = Math.max(maximum.x, local.x + visualRadius);
    maximum.y = Math.max(maximum.y, local.y + visualRadius);
    maximum.z = Math.max(maximum.z, local.z + visualRadius);
  }

  const centerOffset = Object.freeze({
    x: (minimum.x + maximum.x) / 2,
    y: (minimum.y + maximum.y) / 2,
    z: (minimum.z + maximum.z) / 2,
  });
  let radius = 0.5;
  for (const atom of structure.atoms) {
    const visual = getElementVisual(atom.element);
    const visualRadius = Math.max(visual.ballRadius, visual.vanDerWaalsRadius);
    radius = Math.max(
      radius,
      Math.hypot(
        atom.x - structureCenter.x - centerOffset.x,
        atom.y - structureCenter.y - centerOffset.y,
        atom.z - structureCenter.z - centerOffset.z,
      ) + visualRadius,
    );
  }

  return Object.freeze({ centerOffset, radius });
}

/** Applies mutable scene descriptor placement only when a fit is requested. */
export function transformStructureFitEnvelope(
  envelope: LocalStructureFitEnvelope,
  descriptor: MolecularSceneMolecule,
): TransformedStructureFitEnvelope {
  const scale = descriptor.scale ?? 1;
  return {
    center: {
      x: (descriptor.position?.x ?? 0) + envelope.centerOffset.x * scale,
      y: (descriptor.position?.y ?? 0) + envelope.centerOffset.y * scale,
      z: (descriptor.position?.z ?? 0) + envelope.centerOffset.z * scale,
    },
    radius: envelope.radius * scale,
  };
}
