export interface ExploreMoleculeLayoutVector2 {
  readonly x: number;
  readonly y: number;
}

export interface ExploreMoleculeLayoutVector3 extends ExploreMoleculeLayoutVector2 {
  readonly z: number;
}

/** Full, world-space dimensions of a molecule after its scene scale is applied. */
export interface ExploreMoleculeLayoutExtent {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ExploreMoleculeLayoutCandidate {
  readonly id: string;
  /** An evidence-backed projection anchor expressed in scene world units. */
  readonly projectedAnchor: ExploreMoleculeLayoutVector2 & { readonly z?: number };
  /** A world-space bounding-sphere radius after scene scale is applied. */
  readonly radius?: number;
  /** Preferred over radius when real world-space bounds are available. */
  readonly extent?: ExploreMoleculeLayoutExtent;
}

export interface ExploreMoleculeLayoutBounds2D {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface ExploreMoleculeLayoutBounds3D extends ExploreMoleculeLayoutBounds2D {
  readonly minZ: number;
  readonly maxZ: number;
}

export interface ExploreMoleculeLayoutViewport {
  readonly aspect: number;
  /** Visible scene-plane bounds, in the same world units as projectedAnchor. */
  readonly bounds: ExploreMoleculeLayoutBounds2D;
  readonly fovDegrees?: number;
  /** A world-space safe area retained inside each visible edge. */
  readonly edgePadding?: number;
}

export interface ExploreMoleculeLayoutInput {
  readonly candidates: readonly ExploreMoleculeLayoutCandidate[];
  readonly viewport: ExploreMoleculeLayoutViewport;
  readonly minimumGap?: number;
  readonly maxIterations?: number;
  /** Maximum deterministic depth offset either side of the projection plane. */
  readonly depthRange?: number;
  /** Multiplicative breathing room applied to the camera-fit bounds. */
  readonly cameraPadding?: number;
}

export interface ExploreMoleculeLayoutPlacement {
  readonly id: string;
  readonly projectedAnchor: ExploreMoleculeLayoutVector3;
  readonly position: ExploreMoleculeLayoutVector3;
  readonly extent: ExploreMoleculeLayoutExtent;
  /** Conservative projected radius used for collision and edge checks. */
  readonly effectiveRadius: number;
}

export interface ExploreMoleculeCameraFit {
  /** Padded bounds used by the camera calculation. */
  readonly bounds: ExploreMoleculeLayoutBounds3D;
  /** Exact union of all placed molecule bounds. */
  readonly contentBounds: ExploreMoleculeLayoutBounds3D;
  readonly target: ExploreMoleculeLayoutVector3;
  readonly distance: number;
  readonly fovDegrees: number;
}

export interface ExploreMoleculeLayoutResult {
  /** Placements retain caller order; their values do not depend on caller order. */
  readonly placements: readonly ExploreMoleculeLayoutPlacement[];
  readonly requestedMinimumGap: number;
  /** Smallest edge-to-edge clearance after layout; null for fewer than two items. */
  readonly minimumGap: number | null;
  readonly overlapCount: number;
  readonly clippedCount: number;
  readonly iterations: number;
  readonly cameraFit: ExploreMoleculeCameraFit;
}

interface WorkingPlacement {
  readonly id: string;
  readonly sourceIndex: number;
  readonly projectedAnchor: ExploreMoleculeLayoutVector3;
  readonly extent: ExploreMoleculeLayoutExtent;
  readonly effectiveRadius: number;
  x: number;
  y: number;
  readonly z: number;
}

const DEFAULT_MINIMUM_GAP = 0.7;
const DEFAULT_MAX_ITERATIONS = 160;
const DEFAULT_FOV_DEGREES = 42;
const DEFAULT_CAMERA_PADDING = 1.12;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const EPSILON = 1e-7;

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const compareStableIds = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function assertPositiveFinite(value: number, message: string): void {
  if (!isFiniteNumber(value) || value <= 0) throw new Error(message);
}

function validateInput(input: ExploreMoleculeLayoutInput): void {
  const { viewport } = input;
  assertPositiveFinite(
    viewport.aspect,
    "Explore molecule layout requires a positive finite viewport aspect.",
  );
  const bounds = viewport.bounds;
  if (
    !isFiniteNumber(bounds.minX)
    || !isFiniteNumber(bounds.maxX)
    || !isFiniteNumber(bounds.minY)
    || !isFiniteNumber(bounds.maxY)
    || bounds.maxX <= bounds.minX
    || bounds.maxY <= bounds.minY
  ) {
    throw new Error("Explore molecule layout requires finite, increasing viewport bounds.");
  }
  const edgePadding = viewport.edgePadding ?? 0;
  if (!isFiniteNumber(edgePadding) || edgePadding < 0) {
    throw new Error("Explore molecule layout edge padding must be finite and non-negative.");
  }
  if (
    edgePadding * 2 >= bounds.maxX - bounds.minX
    || edgePadding * 2 >= bounds.maxY - bounds.minY
  ) {
    throw new Error("Explore molecule layout edge padding must leave a visible scene area.");
  }
  const fovDegrees = viewport.fovDegrees ?? DEFAULT_FOV_DEGREES;
  if (!isFiniteNumber(fovDegrees) || fovDegrees <= 5 || fovDegrees >= 120) {
    throw new Error("Explore molecule layout camera FOV must be between 5 and 120 degrees.");
  }
  const minimumGap = input.minimumGap ?? DEFAULT_MINIMUM_GAP;
  if (!isFiniteNumber(minimumGap) || minimumGap < 0) {
    throw new Error("Explore molecule layout minimum gap must be finite and non-negative.");
  }
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  if (!Number.isSafeInteger(maxIterations) || maxIterations < 1 || maxIterations > 10_000) {
    throw new Error("Explore molecule layout max iterations must be a safe integer from 1 to 10000.");
  }
  if (input.depthRange !== undefined && (!isFiniteNumber(input.depthRange) || input.depthRange < 0)) {
    throw new Error("Explore molecule layout depth range must be finite and non-negative.");
  }
  const cameraPadding = input.cameraPadding ?? DEFAULT_CAMERA_PADDING;
  if (!isFiniteNumber(cameraPadding) || cameraPadding < 1 || cameraPadding > 3) {
    throw new Error("Explore molecule layout camera padding must be between 1 and 3.");
  }

  const ids = new Set<string>();
  for (const candidate of input.candidates) {
    if (!candidate.id.trim() || ids.has(candidate.id)) {
      throw new Error("Explore molecule layout candidates require unique, non-empty IDs.");
    }
    ids.add(candidate.id);
    if (
      !isFiniteNumber(candidate.projectedAnchor.x)
      || !isFiniteNumber(candidate.projectedAnchor.y)
      || (candidate.projectedAnchor.z !== undefined && !isFiniteNumber(candidate.projectedAnchor.z))
    ) {
      throw new Error(`Explore molecule layout anchor for ${candidate.id} must be finite.`);
    }
    if (candidate.radius === undefined && candidate.extent === undefined) {
      throw new Error(`Explore molecule layout candidate ${candidate.id} requires radius or extent.`);
    }
    if (candidate.radius !== undefined) {
      assertPositiveFinite(
        candidate.radius,
        `Explore molecule layout radius for ${candidate.id} must be positive and finite.`,
      );
    }
    if (candidate.extent !== undefined) {
      const extentValues = [candidate.extent.x, candidate.extent.y, candidate.extent.z];
      if (
        extentValues.some((value) => !isFiniteNumber(value) || value < 0)
        || extentValues.every((value) => value === 0)
      ) {
        throw new Error(
          `Explore molecule layout extent for ${candidate.id} must be finite, non-negative and non-zero.`,
        );
      }
    }
  }
}

function candidateExtent(candidate: ExploreMoleculeLayoutCandidate): ExploreMoleculeLayoutExtent {
  if (candidate.extent) return candidate.extent;
  const diameter = candidate.radius! * 2;
  return { x: diameter, y: diameter, z: diameter };
}

function candidateEffectiveRadius(
  candidate: ExploreMoleculeLayoutCandidate,
  extent: ExploreMoleculeLayoutExtent,
): number {
  if (candidate.extent) {
    // The 3D half diagonal remains conservative while the shared camera orbits;
    // a Z-heavy structure therefore cannot rotate into an unreported overlap.
    return Math.hypot(extent.x, extent.y, extent.z) / 2;
  }
  return candidate.radius!;
}

function allowedCenterRange(
  item: Pick<WorkingPlacement, "effectiveRadius">,
  viewport: ExploreMoleculeLayoutViewport,
): ExploreMoleculeLayoutBounds2D | null {
  const padding = viewport.edgePadding ?? 0;
  const range = {
    minX: viewport.bounds.minX + padding + item.effectiveRadius,
    maxX: viewport.bounds.maxX - padding - item.effectiveRadius,
    minY: viewport.bounds.minY + padding + item.effectiveRadius,
    maxY: viewport.bounds.maxY - padding - item.effectiveRadius,
  };
  return range.minX <= range.maxX && range.minY <= range.maxY ? range : null;
}

function clampToViewport(item: WorkingPlacement, viewport: ExploreMoleculeLayoutViewport): void {
  const range = allowedCenterRange(item, viewport);
  if (!range) {
    item.x = (viewport.bounds.minX + viewport.bounds.maxX) / 2;
    item.y = (viewport.bounds.minY + viewport.bounds.maxY) / 2;
    return;
  }
  item.x = clamp(item.x, range.minX, range.maxX);
  item.y = clamp(item.y, range.minY, range.maxY);
}

function edgeClearance(left: WorkingPlacement, right: WorkingPlacement): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
    - left.effectiveRadius
    - right.effectiveRadius;
}

function collides(
  left: WorkingPlacement,
  right: WorkingPlacement,
  minimumGap: number,
): boolean {
  return edgeClearance(left, right) < minimumGap - EPSILON;
}

function placementCollisionScore(
  candidate: WorkingPlacement,
  placed: readonly WorkingPlacement[],
  minimumGap: number,
): number {
  return placed.reduce((score, current) => {
    const shortfall = Math.max(0, minimumGap - edgeClearance(candidate, current));
    return score + shortfall * shortfall;
  }, 0);
}

function placeFromAnchor(
  item: WorkingPlacement,
  placed: readonly WorkingPlacement[],
  viewport: ExploreMoleculeLayoutViewport,
  minimumGap: number,
  maxIterations: number,
): void {
  const phase = ((stableHash(item.id) % 65_521) / 65_521) * Math.PI * 2;
  const searchStep = Math.max(0.12, minimumGap * 0.42, item.effectiveRadius * 0.22);
  let best: { readonly x: number; readonly y: number; readonly score: number; readonly drift: number }
    | null = null;
  const seen = new Set<string>();

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const searchRadius = iteration === 0 ? 0 : searchStep * Math.sqrt(iteration);
    const angle = phase + iteration * GOLDEN_ANGLE;
    item.x = item.projectedAnchor.x + Math.cos(angle) * searchRadius;
    item.y = item.projectedAnchor.y + Math.sin(angle) * searchRadius;
    clampToViewport(item, viewport);
    const key = `${item.x.toFixed(6)}:${item.y.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const score = placementCollisionScore(item, placed, minimumGap);
    const drift = Math.hypot(
      item.x - item.projectedAnchor.x,
      item.y - item.projectedAnchor.y,
    );
    if (!best || score < best.score - EPSILON || (Math.abs(score - best.score) <= EPSILON && drift < best.drift)) {
      best = { x: item.x, y: item.y, score, drift };
    }
    if (score <= EPSILON) return;
  }

  if (best) {
    item.x = best.x;
    item.y = best.y;
  }
}

function resolveResidualOverlaps(
  items: readonly WorkingPlacement[],
  viewport: ExploreMoleculeLayoutViewport,
  minimumGap: number,
  maxIterations: number,
): number {
  let completedIterations = 0;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const deltas = new Map(items.map((item) => [item.id, { x: 0, y: 0 }]));
    let collisionCount = 0;

    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      const left = items[leftIndex]!;
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const right = items[rightIndex]!;
        const requiredDistance = left.effectiveRadius + right.effectiveRadius + minimumGap;
        let deltaX = right.x - left.x;
        let deltaY = right.y - left.y;
        let distance = Math.hypot(deltaX, deltaY);
        if (distance >= requiredDistance - EPSILON) continue;
        collisionCount += 1;

        if (distance <= EPSILON) {
          const pairSeed = stableHash(`${left.id}\u0000${right.id}`);
          const angle = ((pairSeed % 65_521) / 65_521) * Math.PI * 2;
          deltaX = Math.cos(angle);
          deltaY = Math.sin(angle);
          distance = 1;
        }
        const push = (requiredDistance - distance + EPSILON) * 0.52;
        const pushX = (deltaX / distance) * push;
        const pushY = (deltaY / distance) * push;
        const leftDelta = deltas.get(left.id)!;
        const rightDelta = deltas.get(right.id)!;
        leftDelta.x -= pushX;
        leftDelta.y -= pushY;
        rightDelta.x += pushX;
        rightDelta.y += pushY;
      }
    }

    if (collisionCount === 0) break;
    completedIterations = iteration + 1;
    for (const item of items) {
      const delta = deltas.get(item.id)!;
      item.x += delta.x;
      item.y += delta.y;
      clampToViewport(item, viewport);
    }
  }
  return completedIterations;
}

function countOverlaps(items: readonly WorkingPlacement[], minimumGap: number): number {
  let count = 0;
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      if (collides(items[left]!, items[right]!, minimumGap)) count += 1;
    }
  }
  return count;
}

function countClipped(
  items: readonly WorkingPlacement[],
  viewport: ExploreMoleculeLayoutViewport,
): number {
  const padding = viewport.edgePadding ?? 0;
  return items.filter((item) =>
    item.x - item.effectiveRadius < viewport.bounds.minX + padding - EPSILON
    || item.x + item.effectiveRadius > viewport.bounds.maxX - padding + EPSILON
    || item.y - item.effectiveRadius < viewport.bounds.minY + padding - EPSILON
    || item.y + item.effectiveRadius > viewport.bounds.maxY - padding + EPSILON
  ).length;
}

function minimumClearance(items: readonly WorkingPlacement[]): number | null {
  if (items.length < 2) return null;
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      minimum = Math.min(minimum, edgeClearance(items[left]!, items[right]!));
    }
  }
  return minimum;
}

function emptyBounds(viewport: ExploreMoleculeLayoutViewport): ExploreMoleculeLayoutBounds3D {
  const centerX = (viewport.bounds.minX + viewport.bounds.maxX) / 2;
  const centerY = (viewport.bounds.minY + viewport.bounds.maxY) / 2;
  return { minX: centerX, maxX: centerX, minY: centerY, maxY: centerY, minZ: 0, maxZ: 0 };
}

function contentBounds(
  items: readonly WorkingPlacement[],
  viewport: ExploreMoleculeLayoutViewport,
): ExploreMoleculeLayoutBounds3D {
  if (items.length === 0) return emptyBounds(viewport);
  return items.reduce<ExploreMoleculeLayoutBounds3D>(
    (bounds, item) => {
      const halfZ = item.extent.z / 2;
      return {
        minX: Math.min(bounds.minX, item.x - item.effectiveRadius),
        maxX: Math.max(bounds.maxX, item.x + item.effectiveRadius),
        minY: Math.min(bounds.minY, item.y - item.effectiveRadius),
        maxY: Math.max(bounds.maxY, item.y + item.effectiveRadius),
        minZ: Math.min(bounds.minZ, item.z - halfZ),
        maxZ: Math.max(bounds.maxZ, item.z + halfZ),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    },
  );
}

function createCameraFit(
  items: readonly WorkingPlacement[],
  viewport: ExploreMoleculeLayoutViewport,
  cameraPadding: number,
): ExploreMoleculeCameraFit {
  const exact = contentBounds(items, viewport);
  const center = {
    x: (exact.minX + exact.maxX) / 2,
    y: (exact.minY + exact.maxY) / 2,
    z: (exact.minZ + exact.maxZ) / 2,
  };
  const halfWidth = ((exact.maxX - exact.minX) / 2) * cameraPadding;
  const halfHeight = ((exact.maxY - exact.minY) / 2) * cameraPadding;
  const halfDepth = ((exact.maxZ - exact.minZ) / 2) * cameraPadding;
  const bounds = {
    minX: center.x - halfWidth,
    maxX: center.x + halfWidth,
    minY: center.y - halfHeight,
    maxY: center.y + halfHeight,
    minZ: center.z - halfDepth,
    maxZ: center.z + halfDepth,
  };
  const fovDegrees = viewport.fovDegrees ?? DEFAULT_FOV_DEGREES;
  const tangent = Math.tan((fovDegrees * Math.PI) / 360);
  const distance = items.length === 0
    ? 0
    : halfDepth + Math.max(halfHeight / tangent, halfWidth / (tangent * viewport.aspect));
  return { bounds, contentBounds: exact, target: center, distance, fovDegrees };
}

/**
 * Places real molecule bounds around evidence-backed 2D anchors without
 * changing the projection's scientific meaning. The bounded spiral and
 * relaxation pass are deterministic, order-independent and deliberately avoid
 * a decorative grid. Z offsets add shallow spatial depth; collision safety is
 * enforced in the view plane so depth never hides a projected overlap.
 */
export function resolveExploreMoleculeLayout(
  input: ExploreMoleculeLayoutInput,
): ExploreMoleculeLayoutResult {
  validateInput(input);
  const minimumGap = input.minimumGap ?? DEFAULT_MINIMUM_GAP;
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const cameraPadding = input.cameraPadding ?? DEFAULT_CAMERA_PADDING;
  const viewportSpan = Math.min(
    input.viewport.bounds.maxX - input.viewport.bounds.minX,
    input.viewport.bounds.maxY - input.viewport.bounds.minY,
  );
  const depthRange = input.depthRange ?? Math.min(viewportSpan * 0.025, Math.max(0.25, minimumGap));

  const canonical = input.candidates
    .map((candidate, sourceIndex): WorkingPlacement => {
      const extent = candidateExtent(candidate);
      const effectiveRadius = candidateEffectiveRadius(candidate, extent);
      const projectedZ = candidate.projectedAnchor.z ?? 0;
      const depthUnit = ((stableHash(`depth:${candidate.id}`) % 10_001) / 5_000) - 1;
      return {
        id: candidate.id,
        sourceIndex,
        projectedAnchor: {
          x: candidate.projectedAnchor.x,
          y: candidate.projectedAnchor.y,
          z: projectedZ,
        },
        extent,
        effectiveRadius,
        x: candidate.projectedAnchor.x,
        y: candidate.projectedAnchor.y,
        z: projectedZ + depthUnit * depthRange,
      };
    })
    .sort(
      (left, right) =>
        right.effectiveRadius - left.effectiveRadius || compareStableIds(left.id, right.id),
    );

  const placed: WorkingPlacement[] = [];
  for (const item of canonical) {
    placeFromAnchor(item, placed, input.viewport, minimumGap, maxIterations);
    placed.push(item);
  }
  const iterations = resolveResidualOverlaps(
    canonical,
    input.viewport,
    minimumGap,
    maxIterations,
  );

  const bySourceOrder = [...canonical].sort((left, right) => left.sourceIndex - right.sourceIndex);
  const cameraFit = createCameraFit(canonical, input.viewport, cameraPadding);
  return {
    placements: bySourceOrder.map((item) => ({
      id: item.id,
      projectedAnchor: item.projectedAnchor,
      position: { x: item.x, y: item.y, z: item.z },
      extent: item.extent,
      effectiveRadius: item.effectiveRadius,
    })),
    requestedMinimumGap: minimumGap,
    minimumGap: minimumClearance(canonical),
    overlapCount: countOverlaps(canonical, minimumGap),
    clippedCount: countClipped(canonical, input.viewport),
    iterations,
    cameraFit,
  };
}
