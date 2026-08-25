export interface ExploreClusterAnchor {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export type ExploreClusterLabelPosition = ExploreClusterAnchor;

/**
 * A screen-space region that an HTML cluster label must not cover. Coordinates
 * and radii are percentages of the Explore scene. Callers that can project real
 * SDF bounds may provide those bounds directly; otherwise cluster anchors are
 * used as conservative molecule-region keep-outs.
 */
export interface ExploreClusterLabelAvoidanceZone extends ExploreClusterAnchor {
  readonly radiusX?: number;
  readonly radiusY?: number;
}

export interface ExploreClusterLabelLayoutOptions {
  readonly minimumLabelWidthPercent?: number;
  readonly minimumLabelHeightPercent?: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const withinCollisionBox = (
  left: ExploreClusterLabelPosition,
  right: ExploreClusterLabelPosition,
  minimumHorizontalSeparation: number,
  minimumVerticalSeparation: number,
) =>
  Math.abs(left.x - right.x) < minimumHorizontalSeparation
  && Math.abs(left.y - right.y) < minimumVerticalSeparation;

const intersectsAvoidanceZone = (
  label: ExploreClusterLabelPosition,
  zone: ExploreClusterLabelAvoidanceZone,
  labelHalfWidth: number,
  labelHalfHeight: number,
) => {
  const zoneRadiusX = zone.radiusX ?? 6;
  const zoneRadiusY = zone.radiusY ?? 5;
  const breathingRoom = 1.5;
  return Math.abs(label.x - zone.x) < labelHalfWidth + zoneRadiusX + breathingRoom
    && Math.abs(label.y - zone.y) < labelHalfHeight + zoneRadiusY + breathingRoom;
};

const getLabelSeparations = (
  viewportAspect: number,
  options: ExploreClusterLabelLayoutOptions,
) => {
  const minimumLabelWidthPercent = options.minimumLabelWidthPercent ?? 0;
  const minimumLabelHeightPercent = options.minimumLabelHeightPercent ?? 0;
  if (
    !Number.isFinite(minimumLabelWidthPercent)
    || minimumLabelWidthPercent < 0
    || !Number.isFinite(minimumLabelHeightPercent)
    || minimumLabelHeightPercent < 0
  ) {
    throw new Error(
      "Explore cluster label footprint percentages must be finite and non-negative.",
    );
  }
  return {
    horizontal: Math.max(
      clamp(34 * ((16 / 9) / viewportAspect), 20, 38),
      minimumLabelWidthPercent,
    ),
    vertical: Math.max(20, minimumLabelHeightPercent),
  };
};

/**
 * Separates only the HTML cluster labels. Molecular projection coordinates are
 * retained independently, so this accessibility layout never changes the
 * scientific/educational scene positions.
 */
export function resolveExploreClusterLabelLayout(
  anchors: readonly ExploreClusterAnchor[],
  viewportAspect = 16 / 9,
  avoidanceZones: readonly ExploreClusterLabelAvoidanceZone[] = anchors,
  options: ExploreClusterLabelLayoutOptions = {},
): readonly ExploreClusterLabelPosition[] {
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) {
    throw new Error("Explore cluster label layout requires a positive viewport aspect.");
  }
  const ids = new Set<string>();
  for (const anchor of anchors) {
    if (
      !anchor.id
      || ids.has(anchor.id)
      || !Number.isFinite(anchor.x)
      || !Number.isFinite(anchor.y)
    ) {
      throw new Error("Explore cluster label anchors must have unique IDs and finite coordinates.");
    }
    ids.add(anchor.id);
  }

  const avoidanceIds = new Set<string>();
  for (const zone of avoidanceZones) {
    if (
      !zone.id
      || avoidanceIds.has(zone.id)
      || !Number.isFinite(zone.x)
      || !Number.isFinite(zone.y)
      || (zone.radiusX !== undefined && (!Number.isFinite(zone.radiusX) || zone.radiusX < 0))
      || (zone.radiusY !== undefined && (!Number.isFinite(zone.radiusY) || zone.radiusY < 0))
    ) {
      throw new Error(
        "Explore cluster label avoidance zones require unique IDs, finite coordinates and non-negative radii.",
      );
    }
    avoidanceIds.add(zone.id);
  }

  const {
    horizontal: minimumHorizontalSeparation,
    vertical: minimumVerticalSeparation,
  } = getLabelSeparations(viewportAspect, options);
  const labelHalfWidth = minimumHorizontalSeparation / 2;
  const labelHalfHeight = minimumVerticalSeparation / 2;
  const maximumRadius = Math.max(4, Math.ceil(Math.sqrt(anchors.length)) + 2);
  const offsets: { readonly x: number; readonly y: number }[] = [];
  for (let row = -maximumRadius; row <= maximumRadius; row += 1) {
    for (let column = -maximumRadius; column <= maximumRadius; column += 1) {
      offsets.push({
        x: column * minimumHorizontalSeparation,
        y: row * minimumVerticalSeparation,
      });
    }
  }
  offsets.sort((left, right) => {
    const leftDistance = left.x ** 2 + left.y ** 2;
    const rightDistance = right.x ** 2 + right.y ** 2;
    return leftDistance - rightDistance || left.y - right.y || left.x - right.x;
  });

  const placed: ExploreClusterLabelPosition[] = [];
  const byId = new Map<string, ExploreClusterLabelPosition>();
  const sorted = [...anchors].sort(
    (left, right) => left.y - right.y || left.x - right.x || left.id.localeCompare(right.id),
  );
  for (const anchor of sorted) {
    const seenCandidates = new Set<string>();
    const candidate = offsets
      .map((offset) => ({
        id: anchor.id,
        x: clamp(anchor.x + offset.x, labelHalfWidth, 100 - labelHalfWidth),
        y: clamp(anchor.y + offset.y, labelHalfHeight, 100 - labelHalfHeight),
      }))
      .find((next) => {
        const key = `${next.x.toFixed(4)}:${next.y.toFixed(4)}`;
        if (seenCandidates.has(key)) return false;
        seenCandidates.add(key);
        return placed.every(
          (current) =>
            !withinCollisionBox(
              current,
              next,
              minimumHorizontalSeparation,
              minimumVerticalSeparation,
            ),
        ) && avoidanceZones.every(
          (zone) => !intersectsAvoidanceZone(
            next,
            zone,
            labelHalfWidth,
            labelHalfHeight,
          ),
        );
      });
    if (!candidate) {
      throw new Error(`Unable to place Explore cluster label ${anchor.id} without collision.`);
    }
    placed.push(candidate);
    byId.set(anchor.id, candidate);
  }

  return anchors.map((anchor) => byId.get(anchor.id)!);
}

/** Counts the exact constraints enforced by the deterministic label solver. */
export function countExploreClusterLabelCollisions(
  labels: readonly ExploreClusterLabelPosition[],
  viewportAspect = 16 / 9,
  avoidanceZones: readonly ExploreClusterLabelAvoidanceZone[] = [],
  options: ExploreClusterLabelLayoutOptions = {},
): number {
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) {
    throw new Error("Explore cluster label collision count requires a positive viewport aspect.");
  }
  const {
    horizontal: minimumHorizontalSeparation,
    vertical: minimumVerticalSeparation,
  } = getLabelSeparations(viewportAspect, options);
  const labelHalfWidth = minimumHorizontalSeparation / 2;
  const labelHalfHeight = minimumVerticalSeparation / 2;
  let collisions = 0;
  for (let left = 0; left < labels.length; left += 1) {
    const label = labels[left]!;
    if (
      label.x < labelHalfWidth
      || label.x > 100 - labelHalfWidth
      || label.y < labelHalfHeight
      || label.y > 100 - labelHalfHeight
    ) collisions += 1;
    for (let right = left + 1; right < labels.length; right += 1) {
      if (
        withinCollisionBox(
          label,
          labels[right]!,
          minimumHorizontalSeparation,
          minimumVerticalSeparation,
        )
      ) collisions += 1;
    }
    for (const zone of avoidanceZones) {
      if (intersectsAvoidanceZone(label, zone, labelHalfWidth, labelHalfHeight)) {
        collisions += 1;
      }
    }
  }
  return collisions;
}
