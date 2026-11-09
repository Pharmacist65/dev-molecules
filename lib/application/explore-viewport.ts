interface ViewportCamera {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
  readonly fov?: number;
}

export interface ProjectedSceneCandidate {
  readonly id: string;
  /** Stable semantic region used to keep the curated sample representative. */
  readonly groupKey?: string;
  readonly position: { readonly x: number; readonly y: number; readonly z?: number };
}

export interface ViewportSceneSelectionInput {
  readonly candidates: readonly ProjectedSceneCandidate[];
  readonly camera: ViewportCamera;
  readonly viewportAspect: number;
  readonly limit: number;
  readonly overscan?: number;
  /** Universe-only representation floor; omitted for ordinary viewport selection. */
  readonly minimumPerGroup?: number;
  /** Universe-only representation ceiling; omitted for ordinary viewport selection. */
  readonly maximumPerGroup?: number;
  /** Bounds the number of semantic regions admitted to the scene sample. */
  readonly maximumGroups?: number;
}

/**
 * Selects projected records intersecting the current camera window, nearest to
 * its target first. This prevents a large catalog from making list order the
 * de-facto LOD policy while retaining a hard upper bound on SDF hydration.
 */
export function selectViewportSceneCandidateIds({
  candidates,
  camera,
  viewportAspect,
  limit,
  overscan = 1.18,
  minimumPerGroup = 1,
  maximumPerGroup = limit,
  maximumGroups = limit,
}: ViewportSceneSelectionInput): readonly string[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("Viewport scene limit must be a non-negative safe integer.");
  }
  if (limit === 0 || candidates.length === 0) return [];
  for (const [name, value] of [
    ["minimumPerGroup", minimumPerGroup],
    ["maximumPerGroup", maximumPerGroup],
    ["maximumGroups", maximumGroups],
  ] as const) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`Viewport scene ${name} must be a positive safe integer.`);
    }
  }
  if (minimumPerGroup > maximumPerGroup) {
    throw new Error("Viewport scene group minimum cannot exceed its maximum.");
  }
  const aspect = Number.isFinite(viewportAspect) && viewportAspect > 0
    ? viewportAspect
    : 16 / 9;
  const boundedOverscan = Number.isFinite(overscan)
    ? Math.max(1, Math.min(2, overscan))
    : 1.18;
  const distance = Math.max(
    0.01,
    Math.hypot(
      camera.position.x - camera.target.x,
      camera.position.y - camera.target.y,
      camera.position.z - camera.target.z,
    ),
  );
  const fov = Math.max(5, Math.min(120, camera.fov ?? 42));
  const halfHeight = distance * Math.tan((fov * Math.PI) / 360) * boundedOverscan;
  const halfWidth = halfHeight * aspect;
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      intersectsViewport:
        Math.abs(candidate.position.x - camera.target.x) <= halfWidth
        && Math.abs(candidate.position.y - camera.target.y) <= halfHeight,
      distance: Math.hypot(
        candidate.position.x - camera.target.x,
        candidate.position.y - camera.target.y,
      ),
    }))
    .sort(
      (left, right) =>
        Number(right.intersectsViewport) - Number(left.intersectsViewport)
        || left.distance - right.distance
        || left.id.localeCompare(right.id),
    );

  const hasSemanticGroups = ranked.some((candidate) => candidate.groupKey?.trim());
  if (hasSemanticGroups) {
    const groups = new Map<string, typeof ranked>();
    for (const candidate of ranked) {
      const groupKey = candidate.groupKey?.trim() || `record:${candidate.id}`;
      const group = groups.get(groupKey) ?? [];
      group.push(candidate);
      groups.set(groupKey, group);
    }
    const orderedGroups = [...groups.entries()]
      .sort(([leftKey, left], [rightKey, right]) =>
        Number(Boolean(right[0]?.intersectsViewport))
          - Number(Boolean(left[0]?.intersectsViewport))
        || (left[0]?.distance ?? Number.POSITIVE_INFINITY)
          - (right[0]?.distance ?? Number.POSITIVE_INFINITY)
        || leftKey.localeCompare(rightKey))
      .slice(0, Math.min(maximumGroups, Math.floor(limit / minimumPerGroup) || 1))
      .map(([, group]) => group.slice(0, maximumPerGroup));
    const selected: string[] = [];
    for (let index = 0; selected.length < limit; index += 1) {
      let added = false;
      for (const group of orderedGroups) {
        const candidate = group[index];
        if (!candidate) continue;
        selected.push(candidate.id);
        added = true;
        if (selected.length >= limit) break;
      }
      if (!added) break;
    }
    return selected;
  }

  const intersecting = ranked.filter((candidate) => candidate.intersectsViewport);
  if (intersecting.length > 0) {
    return intersecting.slice(0, limit).map((candidate) => candidate.id);
  }

  // A narrow/panned viewport still receives the nearest record, never an
  // arbitrary first page, so navigation can recover without an empty scene.
  return ranked
    .slice(0, Math.min(1, limit))
    .map((candidate) => candidate.id);
}
