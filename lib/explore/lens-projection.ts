import type { VerificationStatus } from "../domain/evidence";

export type LensCoordinateSystem = "normalized-2d-percent";

export interface LensProjectionCoordinate {
  readonly x: number;
  readonly y: number;
}
export interface LensProjection {
  readonly lensId: string;
  readonly projectionId: string;
  readonly algorithm:
    | "curated-categorical-layout"
    | "canonical-smiles-path-fingerprint";
  readonly algorithmVersion: string;
  readonly inputVersion: string;
  readonly inputHash: string;
  readonly generatedAt: string;
  readonly meaning: string;
  readonly doesNotMean: string;
  readonly coordinateSystem: LensCoordinateSystem;
  readonly coordinates: Readonly<Record<string, LensProjectionCoordinate>>;
  readonly verificationStatus: VerificationStatus;
}

export interface CategoricalProjectionItem {
  readonly id: string;
  readonly category: string;
}

export interface CategoricalProjectionDefinition {
  readonly lensId: string;
  readonly projectionId: string;
  readonly algorithmVersion: string;
  readonly inputVersion: string;
  readonly generatedAt: string;
  readonly meaning: string;
  readonly doesNotMean: string;
  readonly verificationStatus: VerificationStatus;
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function inputDigest(items: readonly CategoricalProjectionItem[]) {
  const canonical = [...items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) => `${item.id}:${item.category}`)
    .join("|");
  return `fnv1a32:${stableHash(canonical).toString(16).padStart(8, "0")}`;
}

function categoryCenter(index: number, count: number): LensProjectionCoordinate {
  if (count <= 1) return { x: 50, y: 50 };

  const columns = Math.min(4, Math.ceil(Math.sqrt(count * 1.35)));
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const itemsInRow = Math.min(columns, count - row * columns);
  const rowOffset = (columns - itemsInRow) / 2;

  return {
    x: 12 + ((column + rowOffset + 0.5) / columns) * 76,
    y: 14 + ((row + 0.5) / rows) * 72,
  };
}

/**
 * Produces a deterministic categorical atlas. The local offsets only prevent
 * overlap; they do not encode chemical distance or biological similarity.
 */
export function createCategoricalLensProjection(
  definition: CategoricalProjectionDefinition,
  items: readonly CategoricalProjectionItem[],
): LensProjection {
  const groups = new Map<string, CategoricalProjectionItem[]>();
  for (const item of items) {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  }

  const coordinates: Record<string, LensProjectionCoordinate> = {};
  const categories = [...groups.keys()].sort((left, right) => left.localeCompare(right));

  categories.forEach((category, categoryIndex) => {
    const center = categoryCenter(categoryIndex, categories.length);
    const group = [...(groups.get(category) ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id),
    );

    group.forEach((item, itemIndex) => {
      const seed = stableHash(`${definition.projectionId}:${item.id}`);
      const angle = ((seed % 360) * Math.PI) / 180;
      const ring = Math.floor(itemIndex / 8) + 1;
      const radius = group.length <= 1 ? 0 : Math.min(8.5, 2.4 + ring * 1.8);
      coordinates[item.id] = {
        x: Number((center.x + Math.cos(angle) * radius).toFixed(3)),
        y: Number((center.y + Math.sin(angle) * radius).toFixed(3)),
      };
    });
  });

  return {
    ...definition,
    algorithm: "curated-categorical-layout",
    inputHash: inputDigest(items),
    coordinateSystem: "normalized-2d-percent",
    coordinates,
  };
}
