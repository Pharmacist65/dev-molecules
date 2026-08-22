import type { CatalogBuildResult, CatalogSnapshot } from "../../lib/catalog/types";

export const generateCoverageReport = (
  snapshot: CatalogSnapshot,
  build: CatalogBuildResult,
) => ({
  schemaVersion: 1 as const,
  snapshotId: snapshot.snapshotId,
  scope: snapshot.scope,
  sources: snapshot.sources,
  coverage: build.coverage,
  identityAudit: build.identityAudit,
});

export const generateUnresolvedReport = (
  snapshot: CatalogSnapshot,
  build: CatalogBuildResult,
) => {
  const byStage = Object.fromEntries(
    [...new Set(build.unresolved.map((record) => record.stage))]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((stage) => [
        stage,
        build.unresolved.filter((record) => record.stage === stage).length,
      ]),
  );
  const byReason = Object.fromEntries(
    [...new Set(build.unresolved.map((record) => record.reason))]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((reason) => [
        reason,
        build.unresolved.filter((record) => record.reason === reason).length,
      ]),
  );
  return {
    schemaVersion: 1 as const,
    snapshotId: snapshot.snapshotId,
    count: build.unresolved.length,
    byStage,
    byReason,
    records: build.unresolved,
  };
};
