interface ViewportCamera {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
  readonly fov?: number;
}

export interface ProjectedSceneCandidate {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number; readonly z?: number };
}

export interface ViewportSceneSelectionInput {
  readonly candidates: readonly ProjectedSceneCandidate[];
  readonly camera: ViewportCamera;
  readonly viewportAspect: number;
  readonly limit: number;
  readonly overscan?: number;
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
}: ViewportSceneSelectionInput): readonly string[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("Viewport scene limit must be a non-negative safe integer.");
  }
  if (limit === 0 || candidates.length === 0) return [];
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
    .map((candidate, sourceIndex) => ({
      ...candidate,
      sourceIndex,
      distance: Math.hypot(
        candidate.position.x - camera.target.x,
        candidate.position.y - camera.target.y,
      ),
    }))
    .filter(
      (candidate) =>
        Math.abs(candidate.position.x - camera.target.x) <= halfWidth &&
        Math.abs(candidate.position.y - camera.target.y) <= halfHeight,
    )
    .sort(
      (left, right) =>
        left.distance - right.distance || left.sourceIndex - right.sourceIndex,
    );

  if (ranked.length > 0) return ranked.slice(0, limit).map((candidate) => candidate.id);

  // A narrow/panned viewport still receives the nearest record, never an
  // arbitrary first page, so navigation can recover without an empty scene.
  return [...candidates]
    .map((candidate, sourceIndex) => ({
      ...candidate,
      sourceIndex,
      distance: Math.hypot(
        candidate.position.x - camera.target.x,
        candidate.position.y - camera.target.y,
      ),
    }))
    .sort(
      (left, right) =>
        left.distance - right.distance || left.sourceIndex - right.sourceIndex,
    )
    .slice(0, Math.min(1, limit))
    .map((candidate) => candidate.id);
}
