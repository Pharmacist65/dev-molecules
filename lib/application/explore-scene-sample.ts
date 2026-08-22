export interface ExploreSceneSampleCandidate {
  readonly id: string;
  readonly clusterKey: string;
  readonly projectedPosition: { readonly x: number; readonly y: number };
}

export interface ExploreSceneSampleInput {
  readonly candidates: readonly ExploreSceneSampleCandidate[];
  readonly limit: number;
  readonly requiredId?: string | null;
}

function assertCandidateContract(candidates: readonly ExploreSceneSampleCandidate[]) {
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (
      !candidate.id.trim()
      || !candidate.clusterKey.trim()
      || ids.has(candidate.id)
      || !Number.isFinite(candidate.projectedPosition.x)
      || !Number.isFinite(candidate.projectedPosition.y)
    ) {
      throw new Error(
        "Explore scene sample candidates require unique IDs, cluster keys and finite positions.",
      );
    }
    ids.add(candidate.id);
  }
}

/**
 * Selects a deterministic, cluster-balanced representative scene sample.
 * Catalog order never becomes the visual policy: records are ordered by their
 * stable identity inside each cluster, then interleaved across cluster keys.
 */
export function selectExploreSceneSample({
  candidates,
  limit,
  requiredId,
}: ExploreSceneSampleInput): readonly string[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("Explore scene sample limit must be a non-negative safe integer.");
  }
  assertCandidateContract(candidates);
  if (limit === 0 || candidates.length === 0) return [];

  const groups = new Map<string, ExploreSceneSampleCandidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.clusterKey) ?? [];
    group.push(candidate);
    groups.set(candidate.clusterKey, group);
  }
  const orderedGroups = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) =>
      [...group].sort(
        (left, right) =>
          left.id.localeCompare(right.id)
          || left.projectedPosition.y - right.projectedPosition.y
          || left.projectedPosition.x - right.projectedPosition.x,
      ),
    );

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

  if (requiredId && candidates.some((candidate) => candidate.id === requiredId)) {
    if (!selected.includes(requiredId)) {
      selected.splice(Math.max(0, selected.length - 1), 1, requiredId);
    }
  }
  return selected;
}

