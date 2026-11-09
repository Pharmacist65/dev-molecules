import type { VerificationStatus } from "../domain/evidence";
import type { LensProjection, LensProjectionCoordinate } from "./lens-projection";

export const STRUCTURAL_FINGERPRINT_VERSION =
  "canonical-smiles-path-fingerprint@1.0.0";
export const STRUCTURAL_FINGERPRINT_BITS = 512;

export interface StructuralFingerprintItem {
  readonly id: string;
  readonly canonicalSmiles: string;
}

export interface StructuralSimilarityProjectionDefinition {
  readonly lensId: string;
  readonly projectionId: string;
  readonly inputVersion: string;
  readonly generatedAt: string;
  readonly meaning: string;
  readonly doesNotMean: string;
  readonly verificationStatus: VerificationStatus;
}

export interface StructuralSimilarityProjection extends LensProjection {
  readonly algorithm: "canonical-smiles-path-fingerprint";
  readonly similarities: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function inputDigest(items: readonly StructuralFingerprintItem[]) {
  const canonical = [...items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) => `${item.id}:${item.canonicalSmiles}`)
    .join("|");
  return `fnv1a32:${stableHash(canonical).toString(16).padStart(8, "0")}`;
}

/**
 * A deterministic, source-transparent fingerprint for this educational atlas.
 * It hashes canonical-SMILES atom/bond/path tokens; it is not an ECFP claim and
 * must not be presented as pharmacological or clinical similarity.
 */
export function createCanonicalSmilesPathFingerprint(canonicalSmiles: string) {
  const tokens = canonicalSmiles.match(
    /\[[^\]]+\]|Br|Cl|Si|Na|Li|Mg|Ca|[A-Z][a-z]?|[cnopsb]|%\d{2}|\d|[#=:\-\\/().+@]/g,
  );
  if (!tokens?.length) {
    throw new Error("Canonical SMILES cannot produce a structural fingerprint");
  }

  const features = new Set<string>();
  for (let index = 0; index < tokens.length; index += 1) {
    const one = tokens[index];
    if (one) features.add(`1:${one}`);
    const two = tokens.slice(index, index + 2);
    if (two.length === 2) features.add(`2:${two.join("")}`);
    const three = tokens.slice(index, index + 3);
    if (three.length === 3) features.add(`3:${three.join("")}`);
  }

  return new Set(
    [...features].map((feature) => stableHash(feature) % STRUCTURAL_FINGERPRINT_BITS),
  );
}

export function tanimotoSimilarity(
  left: ReadonlySet<number>,
  right: ReadonlySet<number>,
) {
  let intersection = 0;
  for (const bit of left) if (right.has(bit)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeCoordinates(
  positions: Readonly<Record<string, LensProjectionCoordinate>>,
) {
  const values = Object.values(positions);
  const minimumX = Math.min(...values.map((item) => item.x));
  const maximumX = Math.max(...values.map((item) => item.x));
  const minimumY = Math.min(...values.map((item) => item.y));
  const maximumY = Math.max(...values.map((item) => item.y));
  const rangeX = Math.max(1, maximumX - minimumX);
  const rangeY = Math.max(1, maximumY - minimumY);

  return Object.fromEntries(
    Object.entries(positions).map(([id, position]) => [
      id,
      {
        x: Number((10 + ((position.x - minimumX) / rangeX) * 80).toFixed(3)),
        y: Number((10 + ((position.y - minimumY) / rangeY) * 80).toFixed(3)),
      },
    ]),
  );
}

function projectSimilarity(
  items: readonly StructuralFingerprintItem[],
  similarities: Readonly<Record<string, Readonly<Record<string, number>>>>,
) {
  if (items.length === 1) return { [items[0]!.id]: { x: 50, y: 50 } };

  const positions: Record<string, { x: number; y: number }> = {};
  items.forEach((item, index) => {
    const seed = stableHash(item.id);
    const angle = ((seed % 360) * Math.PI) / 180;
    const radius = 16 + ((seed >>> 8) % 18);
    positions[item.id] = {
      x: 50 + Math.cos(angle + index * 0.31) * radius,
      y: 50 + Math.sin(angle + index * 0.31) * radius,
    };
  });

  for (let iteration = 0; iteration < 180; iteration += 1) {
    const movement = Object.fromEntries(
      items.map((item) => [item.id, { x: 0, y: 0 }]),
    ) as Record<string, { x: number; y: number }>;

    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = items[leftIndex]!;
        const right = items[rightIndex]!;
        const leftPosition = positions[left.id]!;
        const rightPosition = positions[right.id]!;
        const dx = rightPosition.x - leftPosition.x;
        const dy = rightPosition.y - leftPosition.y;
        const distance = Math.max(0.01, Math.hypot(dx, dy));
        const similarity = similarities[left.id]?.[right.id] ?? 0;
        const desiredDistance = 8 + (1 - similarity) * 46;
        const spring = (distance - desiredDistance) * 0.008;
        const repulsion = distance < 8 ? (8 - distance) * 0.018 : 0;
        const force = spring - repulsion;
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;
        movement[left.id]!.x += forceX;
        movement[left.id]!.y += forceY;
        movement[right.id]!.x -= forceX;
        movement[right.id]!.y -= forceY;
      }
    }

    for (const item of items) {
      const position = positions[item.id]!;
      const delta = movement[item.id]!;
      position.x += delta.x + (50 - position.x) * 0.002;
      position.y += delta.y + (50 - position.y) * 0.002;
    }
  }

  return normalizeCoordinates(positions);
}

export function createStructuralSimilarityProjection(
  definition: StructuralSimilarityProjectionDefinition,
  inputItems: readonly StructuralFingerprintItem[],
): StructuralSimilarityProjection {
  const items = [...inputItems].sort((left, right) => left.id.localeCompare(right.id));
  if (!items.length) throw new Error("Structural similarity projection needs molecules");
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error("Structural similarity projection contains duplicate molecule IDs");
  }

  const fingerprints = new Map(
    items.map((item) => [
      item.id,
      createCanonicalSmilesPathFingerprint(item.canonicalSmiles),
    ]),
  );
  const similarities = Object.fromEntries(
    items.map((left) => [
      left.id,
      Object.fromEntries(
        items.map((right) => [
          right.id,
          Number(
            tanimotoSimilarity(
              fingerprints.get(left.id)!,
              fingerprints.get(right.id)!,
            ).toFixed(6),
          ),
        ]),
      ),
    ]),
  );

  return {
    ...definition,
    algorithm: "canonical-smiles-path-fingerprint",
    algorithmVersion: STRUCTURAL_FINGERPRINT_VERSION,
    inputHash: inputDigest(items),
    coordinateSystem: "normalized-2d-percent",
    coordinates: projectSimilarity(items, similarities),
    similarities,
  };
}

export function getNearestStructuralNeighbors(
  projection: StructuralSimilarityProjection,
  moleculeId: string,
  limit = 3,
) {
  return Object.entries(projection.similarities[moleculeId] ?? {})
    .filter(([candidateId]) => candidateId !== moleculeId)
    .sort(([leftId, leftScore], [rightId, rightScore]) =>
      rightScore - leftScore || leftId.localeCompare(rightId),
    )
    .slice(0, Math.max(0, limit))
    .map(([id, score]) => ({ id, score }));
}
