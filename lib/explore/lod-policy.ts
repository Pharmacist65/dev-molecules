export const MAX_NEAR_LOD_MOLECULES = 40;
export const STRUCTURE_CACHE_LIMIT = 40;

export type ExploreLodLevel = "far" | "near" | "cluster" | "focus";

export interface SceneSelectionInput {
  readonly level: ExploreLodLevel;
  readonly candidateIds: readonly string[];
  readonly focusedMoleculeId?: string | null;
  readonly maxNearMolecules?: number;
}

export interface ExploreScenePolicyMolecule {
  readonly id: string;
  readonly clusterId: string;
  readonly structureAssetId?: string | null;
}

export interface ExploreScenePlanInput {
  readonly level: ExploreLodLevel;
  readonly molecules: readonly ExploreScenePolicyMolecule[];
  readonly selectedClusterId?: string | null;
  readonly focusedMoleculeId?: string | null;
  readonly maxNearMolecules?: number;
}

export interface ExploreScenePlan {
  readonly activeWebglContexts: 1;
  readonly visibleMoleculeIds: readonly string[];
  readonly structureAssetIdsToLoad: readonly string[];
}

/** Pure selection policy shared by the UI and representative-scale tests. */
export function selectSceneMoleculeIds({
  level,
  candidateIds,
  focusedMoleculeId,
  maxNearMolecules = MAX_NEAR_LOD_MOLECULES,
}: SceneSelectionInput): string[] {
  if (level === "far") return [];
  if (level === "focus") {
    return focusedMoleculeId && candidateIds.includes(focusedMoleculeId)
      ? [focusedMoleculeId]
      : [];
  }

  const boundedLimit = Math.min(
    MAX_NEAR_LOD_MOLECULES,
    Math.max(0, maxNearMolecules),
  );
  return [...candidateIds].slice(0, boundedLimit);
}

/**
 * Source-agnostic loading contract for representative-scale acceptance tests.
 * The actual WebGL adapter consumes this bounded plan; structure metadata is
 * never interpreted as scientific evidence here.
 */
export function planExploreScene({
  level,
  molecules,
  selectedClusterId,
  focusedMoleculeId,
  maxNearMolecules,
}: ExploreScenePlanInput): ExploreScenePlan {
  const candidates =
    level === "cluster"
      ? molecules.filter((molecule) => molecule.clusterId === selectedClusterId)
      : molecules;
  const visibleMoleculeIds = selectSceneMoleculeIds({
    level,
    candidateIds: candidates.map((molecule) => molecule.id),
    focusedMoleculeId,
    maxNearMolecules,
  });
  const visibleIdSet = new Set(visibleMoleculeIds);
  const structureAssetIdsToLoad = [
    ...new Set(
      candidates
        .filter((molecule) => visibleIdSet.has(molecule.id))
        .map((molecule) => molecule.structureAssetId)
        .filter((assetId): assetId is string => Boolean(assetId)),
    ),
  ];

  return {
    activeWebglContexts: 1,
    visibleMoleculeIds,
    structureAssetIdsToLoad,
  };
}

export function getExploreLodLevel(
  exploreLevel: "universe" | "cluster" | "focus",
  universeZoom: number,
): ExploreLodLevel {
  if (exploreLevel === "focus") return "focus";
  if (exploreLevel === "cluster") return "cluster";
  return universeZoom >= 1.08 ? "near" : "far";
}
