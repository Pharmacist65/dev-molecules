export interface ExploreClusterAnchor {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export type ExploreClusterLabelPosition = ExploreClusterAnchor;

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

/**
 * Separates only the HTML cluster labels. Molecular projection coordinates are
 * retained independently, so this accessibility layout never changes the
 * scientific/educational scene positions.
 */
export function resolveExploreClusterLabelLayout(
  anchors: readonly ExploreClusterAnchor[],
  viewportAspect = 16 / 9,
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

  const minimumHorizontalSeparation = clamp(
    24 * ((16 / 9) / viewportAspect),
    20,
    36,
  );
  const minimumVerticalSeparation = 11;
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
        x: clamp(anchor.x + offset.x, 6, 94),
        y: clamp(anchor.y + offset.y, 8, 92),
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
