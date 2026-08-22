import type { CatalogBuildResult, CatalogSnapshot } from "../../lib/catalog/types";

/**
 * The selected sources do not carry a reviewed therapeutic taxonomy. The
 * projection remains explicit and fail-closed instead of assigning categories.
 */
export const buildLensProjections = (
  snapshot: CatalogSnapshot,
  build: CatalogBuildResult,
) => ({
  schemaVersion: 1 as const,
  snapshotId: snapshot.snapshotId,
  projectionId: "therapeutic-source-only@1",
  status: "classification-unresolved" as const,
  groups: [
    {
      id: "unclassified",
      label: "Unclassified",
      moleculeIds: build.entities.map((entity) => entity.id),
    },
  ],
  limitations: [
    "No therapeutic category is inferred from drug name, structure or language-model output.",
  ],
});
