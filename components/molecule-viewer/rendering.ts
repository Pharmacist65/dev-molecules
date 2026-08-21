import { getElementVisual } from "@/lib/structure/elements";
import type {
  MoleculeStructure,
  SdfAtom,
  SdfBond,
} from "@/lib/structure/sdf";

export type MoleculeRepresentation = "ball-and-stick" | "space-filling";
export type ViewerDimension = "2d" | "3d";

export interface ViewerTransform {
  readonly rotationX: number;
  readonly rotationY: number;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface ProjectedAtom {
  readonly atom: SdfAtom;
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly radius: number;
  readonly perspective: number;
}

export interface RenderOptions {
  readonly width: number;
  readonly height: number;
  readonly dimension: ViewerDimension;
  readonly representation: MoleculeRepresentation;
  readonly showHydrogens: boolean;
  readonly showLabels: boolean;
  readonly selectedAtomIndex: number | null;
  readonly hoveredAtomIndex: number | null;
  readonly transform: ViewerTransform;
}

export const DEFAULT_VIEWER_TRANSFORM: ViewerTransform = {
  rotationX: -0.28,
  rotationY: 0.48,
  zoom: 1,
  panX: 0,
  panY: 0,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function visibleAtomIndices(
  structure: MoleculeStructure,
  showHydrogens: boolean,
) {
  return new Set(
    structure.atoms
      .filter((atom) => showHydrogens || atom.element !== "H")
      .map((atom) => atom.index),
  );
}

function structureCenter(
  structure: MoleculeStructure,
  visibleIndices: ReadonlySet<number>,
) {
  const atoms = structure.atoms.filter((atom) => visibleIndices.has(atom.index));
  if (atoms.length === 0) return { x: 0, y: 0, z: 0, radius: 1 };

  const minimum = { x: Infinity, y: Infinity, z: Infinity };
  const maximum = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const atom of atoms) {
    minimum.x = Math.min(minimum.x, atom.x);
    minimum.y = Math.min(minimum.y, atom.y);
    minimum.z = Math.min(minimum.z, atom.z);
    maximum.x = Math.max(maximum.x, atom.x);
    maximum.y = Math.max(maximum.y, atom.y);
    maximum.z = Math.max(maximum.z, atom.z);
  }

  const center = {
    x: (minimum.x + maximum.x) / 2,
    y: (minimum.y + maximum.y) / 2,
    z: (minimum.z + maximum.z) / 2,
  };
  let radius = 0;

  for (const atom of atoms) {
    radius = Math.max(
      radius,
      Math.hypot(atom.x - center.x, atom.y - center.y, atom.z - center.z),
    );
  }

  return { ...center, radius: Math.max(radius, 0.5) };
}

export function projectAtoms(
  structure: MoleculeStructure,
  options: RenderOptions,
): readonly ProjectedAtom[] {
  const visibleIndices = visibleAtomIndices(structure, options.showHydrogens);
  const center = structureCenter(structure, visibleIndices);
  const stageRadius = Math.min(options.width, options.height) * 0.39;
  const baseScale = (stageRadius / center.radius) * options.transform.zoom;
  const cameraDistance = Math.max(center.radius * 4.5, 4);
  const cosX = Math.cos(options.transform.rotationX);
  const sinX = Math.sin(options.transform.rotationX);
  const cosY = Math.cos(options.transform.rotationY);
  const sinY = Math.sin(options.transform.rotationY);

  return structure.atoms
    .filter((atom) => visibleIndices.has(atom.index))
    .map((atom) => {
      const centeredX = atom.x - center.x;
      const centeredY = atom.y - center.y;
      const centeredZ = atom.z - center.z;
      let rotatedX = centeredX;
      let rotatedY = centeredY;
      let rotatedZ = centeredZ;

      if (options.dimension === "3d") {
        const afterXy = centeredY * cosX - centeredZ * sinX;
        const afterXz = centeredY * sinX + centeredZ * cosX;
        rotatedX = centeredX * cosY + afterXz * sinY;
        rotatedY = afterXy;
        rotatedZ = -centeredX * sinY + afterXz * cosY;
      } else {
        rotatedY *= -1;
        rotatedZ = 0;
      }

      const perspective =
        options.dimension === "3d"
          ? clamp(cameraDistance / (cameraDistance - rotatedZ), 0.7, 1.45)
          : 1;
      const visual = getElementVisual(atom.element);
      const angstromRadius =
        options.dimension === "2d"
          ? atom.element === "H"
            ? 0.12
            : 0.18
          : options.representation === "space-filling"
            ? visual.vanDerWaalsRadius * 0.62
            : visual.ballRadius;

      return {
        atom,
        x:
          options.width / 2 +
          options.transform.panX +
          rotatedX * baseScale * perspective,
        y:
          options.height / 2 +
          options.transform.panY +
          rotatedY * baseScale * perspective,
        depth: rotatedZ,
        radius: clamp(angstromRadius * baseScale * perspective, 2.4, 84),
        perspective,
      };
    });
}

function bondOffsets(order: number, baseOffset: number) {
  if (order === 2) return [-baseOffset, baseOffset];
  if (order === 3) return [-baseOffset * 1.6, 0, baseOffset * 1.6];
  if (order === 4) return [-baseOffset, baseOffset];
  return [0];
}

function drawLineHalf(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number,
) {
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawStereoBond2d(
  context: CanvasRenderingContext2D,
  bond: SdfBond,
  atomA: ProjectedAtom,
  atomB: ProjectedAtom,
  lineWidth: number,
) {
  if (![1, 4, 6].includes(bond.stereo)) return false;

  const deltaX = atomB.x - atomA.x;
  const deltaY = atomB.y - atomA.y;
  const length = Math.max(Math.hypot(deltaX, deltaY), 0.001);
  const perpendicularX = -deltaY / length;
  const perpendicularY = deltaX / length;
  const wedgeHalfWidth = Math.max(4, lineWidth * 2.5);

  context.save();
  context.strokeStyle = "#85938f";
  context.fillStyle = "#85938f";
  context.lineCap = "round";

  if (bond.stereo === 1) {
    context.beginPath();
    context.moveTo(atomA.x, atomA.y);
    context.lineTo(
      atomB.x + perpendicularX * wedgeHalfWidth,
      atomB.y + perpendicularY * wedgeHalfWidth,
    );
    context.lineTo(
      atomB.x - perpendicularX * wedgeHalfWidth,
      atomB.y - perpendicularY * wedgeHalfWidth,
    );
    context.closePath();
    context.fill();
  } else if (bond.stereo === 6) {
    for (let step = 1; step <= 7; step += 1) {
      const progress = step / 8;
      const centerX = atomA.x + deltaX * progress;
      const centerY = atomA.y + deltaY * progress;
      const halfWidth = wedgeHalfWidth * progress;
      context.beginPath();
      context.moveTo(
        centerX - perpendicularX * halfWidth,
        centerY - perpendicularY * halfWidth,
      );
      context.lineTo(
        centerX + perpendicularX * halfWidth,
        centerY + perpendicularY * halfWidth,
      );
      context.lineWidth = Math.max(1, lineWidth * 0.55);
      context.stroke();
    }
  } else {
    context.beginPath();
    context.moveTo(atomA.x, atomA.y);
    for (let step = 1; step <= 12; step += 1) {
      const progress = step / 12;
      const wave = Math.sin(progress * Math.PI * 6) * lineWidth;
      context.lineTo(
        atomA.x + deltaX * progress + perpendicularX * wave,
        atomA.y + deltaY * progress + perpendicularY * wave,
      );
    }
    context.lineWidth = lineWidth;
    context.stroke();
  }

  context.restore();
  return true;
}

function drawBond(
  context: CanvasRenderingContext2D,
  bond: SdfBond,
  atomA: ProjectedAtom,
  atomB: ProjectedAtom,
  dimension: ViewerDimension,
  representation: MoleculeRepresentation,
) {
  if (dimension === "3d" && representation === "space-filling") return;

  const deltaX = atomB.x - atomA.x;
  const deltaY = atomB.y - atomA.y;
  const length = Math.max(Math.hypot(deltaX, deltaY), 0.001);
  const perpendicularX = -deltaY / length;
  const perpendicularY = deltaX / length;
  const lineWidth =
    dimension === "2d"
      ? clamp(Math.min(atomA.radius, atomB.radius) * 0.55, 1.35, 2.8)
      : clamp(
          Math.min(atomA.perspective, atomB.perspective) * 5.2,
          2.8,
          8,
        );
  const offset = dimension === "2d" ? lineWidth * 1.15 : lineWidth * 0.85;
  const midpointX = (atomA.x + atomB.x) / 2;
  const midpointY = (atomA.y + atomB.y) / 2;
  const colorA = dimension === "2d" ? "#85938f" : getElementVisual(atomA.atom.element).color;
  const colorB = dimension === "2d" ? "#85938f" : getElementVisual(atomB.atom.element).color;

  if (
    dimension === "2d" &&
    bond.order === 1 &&
    drawStereoBond2d(context, bond, atomA, atomB, lineWidth)
  ) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.globalAlpha = dimension === "2d" ? 0.9 : 0.82;

  for (const currentOffset of bondOffsets(bond.order, offset)) {
    const offsetX = perpendicularX * currentOffset;
    const offsetY = perpendicularY * currentOffset;

    if (bond.order === 4 && currentOffset > 0) context.setLineDash([4, 4]);
    else context.setLineDash([]);

    if (dimension === "3d") {
      drawLineHalf(
        context,
        atomA.x + offsetX,
        atomA.y + offsetY,
        atomB.x + offsetX,
        atomB.y + offsetY,
        "rgba(2, 6, 7, .78)",
        lineWidth + 2.4,
      );
    }

    drawLineHalf(
      context,
      atomA.x + offsetX,
      atomA.y + offsetY,
      midpointX + offsetX,
      midpointY + offsetY,
      colorA,
      lineWidth,
    );
    drawLineHalf(
      context,
      midpointX + offsetX,
      midpointY + offsetY,
      atomB.x + offsetX,
      atomB.y + offsetY,
      colorB,
      lineWidth,
    );
  }

  context.restore();
}

function atomLabel(atom: SdfAtom) {
  const charge =
    atom.formalCharge === 0
      ? ""
      : atom.formalCharge === 1
        ? "+"
        : atom.formalCharge === -1
          ? "−"
          : atom.formalCharge > 1
            ? `${atom.formalCharge}+`
            : `${Math.abs(atom.formalCharge)}−`;
  return `${atom.isotope ?? ""}${atom.element}${charge}`;
}

function drawAtom2d(
  context: CanvasRenderingContext2D,
  projected: ProjectedAtom,
  showLabels: boolean,
  isSelected: boolean,
  isHovered: boolean,
) {
  const { atom, x, y, radius } = projected;
  const visual = getElementVisual(atom.element);
  const shouldLabel = showLabels || atom.element !== "C" || atom.formalCharge !== 0;

  if (isSelected || isHovered) {
    context.beginPath();
    context.arc(x, y, Math.max(radius + 5, 8), 0, Math.PI * 2);
    context.strokeStyle = isSelected ? "#72e4c1" : "rgba(255,255,255,.72)";
    context.lineWidth = 2;
    context.stroke();
  }

  if (!shouldLabel) {
    context.beginPath();
    context.arc(x, y, Math.max(radius * 0.55, 1.8), 0, Math.PI * 2);
    context.fillStyle = "#aebbb7";
    context.fill();
    return;
  }

  const fontSize = clamp(radius * 2.35, 10, 17);
  const label = showLabels ? `${atomLabel(atom)}${atom.index + 1}` : atomLabel(atom);
  context.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const textWidth = context.measureText(label).width;
  context.fillStyle = "rgba(8, 14, 14, .92)";
  context.beginPath();
  context.roundRect(
    x - textWidth / 2 - 3,
    y - fontSize / 2 - 2,
    textWidth + 6,
    fontSize + 4,
    4,
  );
  context.fill();
  context.fillStyle = visual.highlight;
  context.fillText(label, x, y + 0.5);
}

function drawAtom3d(
  context: CanvasRenderingContext2D,
  projected: ProjectedAtom,
  showLabels: boolean,
  isSelected: boolean,
  isHovered: boolean,
) {
  const { atom, x, y, radius } = projected;
  const visual = getElementVisual(atom.element);
  const gradient = context.createRadialGradient(
    x - radius * 0.34,
    y - radius * 0.38,
    Math.max(0.5, radius * 0.04),
    x,
    y,
    radius,
  );
  gradient.addColorStop(0, visual.highlight);
  gradient.addColorStop(0.36, visual.color);
  gradient.addColorStop(1, "rgba(5, 9, 10, .96)");

  context.save();
  context.shadowColor = "rgba(0, 0, 0, .4)";
  context.shadowBlur = Math.min(radius * 0.8, 18);
  context.shadowOffsetY = Math.min(radius * 0.24, 6);
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.restore();

  if (isSelected || isHovered) {
    context.beginPath();
    context.arc(x, y, radius + (isSelected ? 5 : 3), 0, Math.PI * 2);
    context.strokeStyle = isSelected ? "#6fe8c4" : "rgba(255,255,255,.84)";
    context.lineWidth = isSelected ? 2.5 : 1.5;
    context.stroke();
  }

  if (showLabels) {
    const fontSize = clamp(radius * 0.72, 9, 14);
    context.font = `750 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 3;
    context.strokeStyle = "rgba(5, 9, 10, .8)";
    context.strokeText(`${atom.element}${atom.index + 1}`, x, y);
    context.fillStyle = "#ffffff";
    context.fillText(`${atom.element}${atom.index + 1}`, x, y);
  }
}

export function drawMolecule(
  context: CanvasRenderingContext2D,
  structure: MoleculeStructure,
  options: RenderOptions,
) {
  context.clearRect(0, 0, options.width, options.height);
  const projected = projectAtoms(structure, options);
  const atomByIndex = new Map(projected.map((atom) => [atom.atom.index, atom]));
  const visibleBonds = structure.bonds
    .map((bond) => ({
      bond,
      atomA: atomByIndex.get(bond.atomA),
      atomB: atomByIndex.get(bond.atomB),
    }))
    .filter(
      (
        item,
      ): item is {
        bond: SdfBond;
        atomA: ProjectedAtom;
        atomB: ProjectedAtom;
      } => Boolean(item.atomA && item.atomB),
    )
    .sort(
      (left, right) =>
        (left.atomA.depth + left.atomB.depth) / 2 -
        (right.atomA.depth + right.atomB.depth) / 2,
    );

  for (const { bond, atomA, atomB } of visibleBonds) {
    drawBond(
      context,
      bond,
      atomA,
      atomB,
      options.dimension,
      options.representation,
    );
  }

  for (const projectedAtom of [...projected].sort((a, b) => a.depth - b.depth)) {
    const isSelected = projectedAtom.atom.index === options.selectedAtomIndex;
    const isHovered = projectedAtom.atom.index === options.hoveredAtomIndex;

    if (options.dimension === "2d") {
      drawAtom2d(
        context,
        projectedAtom,
        options.showLabels,
        isSelected,
        isHovered,
      );
    } else {
      drawAtom3d(
        context,
        projectedAtom,
        options.showLabels,
        isSelected,
        isHovered,
      );
    }
  }

  return projected;
}

export function findAtomAtPoint(
  projectedAtoms: readonly ProjectedAtom[],
  x: number,
  y: number,
) {
  return [...projectedAtoms]
    .sort((left, right) => right.depth - left.depth)
    .find((projected) => {
      const hitRadius = Math.max(projected.radius, 9);
      return Math.hypot(projected.x - x, projected.y - y) <= hitRadius;
    })?.atom;
}
