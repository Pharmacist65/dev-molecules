import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import { buildCatalogSnapshot } from "../../lib/catalog/pipeline";
import {
  buildCatalogManifest,
  buildCatalogSearchIndex,
  buildCatalogShards,
  shardPath,
} from "../../lib/catalog/sharding";
import type { CatalogSnapshot } from "../../lib/catalog/types";
import { buildLensProjections } from "./build-lens-projections.mjs";
import { catalogOutputUrl, snapshotUrl } from "./catalog-config.mjs";
import {
  generateCoverageReport,
  generateUnresolvedReport,
} from "./generate-coverage-report.mjs";

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const writeJson = async (relativePath: string, value: unknown): Promise<void> => {
  const output = new URL(relativePath, catalogOutputUrl);
  await mkdir(new URL("./", output), { recursive: true });
  await writeFile(output, stableJson(value), "utf8");
};

export interface CatalogBuildSummary {
  readonly snapshotId: string;
  readonly imported: number;
  readonly unresolved: number;
  readonly shardCount: number;
  readonly outputPath: string;
}

export const generateStaticCatalog = async (): Promise<CatalogBuildSummary> => {
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8")) as CatalogSnapshot;
  const build = buildCatalogSnapshot(snapshot);
  const shards = buildCatalogShards(snapshot.snapshotId, build.entities);
  const manifest = buildCatalogManifest(snapshot, build, shards);

  await mkdir(catalogOutputUrl, { recursive: true });
  await Promise.all(
    ["shards", "reports", "projections"].map((directory) =>
      rm(new URL(`${directory}/`, catalogOutputUrl), { recursive: true, force: true }),
    ),
  );
  await Promise.all([
    writeJson("manifest.json", manifest),
    writeJson(
      "search-index.v1.json",
      buildCatalogSearchIndex(snapshot.snapshotId, build.entities),
    ),
    writeJson("reports/coverage.json", generateCoverageReport(snapshot, build)),
    writeJson("reports/unresolved.json", generateUnresolvedReport(snapshot, build)),
    writeJson("projections/therapeutic.json", buildLensProjections(snapshot, build)),
    ...shards.map((shard) => writeJson(shardPath(shard), shard)),
  ]);

  return {
    snapshotId: snapshot.snapshotId,
    imported: build.entities.length,
    unresolved: build.unresolved.length,
    shardCount: shards.length,
    outputPath: catalogOutputUrl.pathname,
  };
};
