import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Node's native type-stripping runtime requires the real TypeScript extension.
// @ts-expect-error TS5097: this script is executed directly by Node/tsx, not emitted by tsc.
import { enrichmentSourcePolicies } from "../../lib/data/importers/source-registry.ts";

interface CatalogManifestHeader {
  readonly snapshotId: string;
  readonly generatedAt: string;
  readonly recordCount: number;
}

export const generateEnrichmentReadinessReport = async () => {
  const projectRoot = process.cwd();
  const manifestPath = path.join(projectRoot, "public/catalog/manifest.json");
  const manifest = JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as CatalogManifestHeader;

  if (!manifest.snapshotId || !manifest.generatedAt || manifest.recordCount < 1) {
    throw new Error("Catalog manifest is missing enrichment readiness anchors.");
  }

  const adapters = enrichmentSourcePolicies.map((policy) => ({
    adapter: policy.adapter,
    sourceName: policy.sourceName,
    status: policy.enabledForPublicBuild ? "active" : "not-configured",
    redistribution: policy.redistribution,
    licenseName: policy.licenseName,
    licenseUrl: policy.licenseUrl,
    versionPolicy: policy.versionPolicy,
    limitation: policy.limitation,
  }));

  const report = {
    schemaVersion: 1,
    catalogSnapshotId: manifest.snapshotId,
    generatedAt: manifest.generatedAt,
    catalogRecordCount: manifest.recordCount,
    activeAdapterCount: adapters.filter((adapter) => adapter.status === "active").length,
    configuredEnrichmentSnapshotCount: 0,
    classificationsEnriched: 0,
    pharmacologyProfilesEnriched: 0,
    admeProfilesEnriched: 0,
    note:
      "This release records source and license readiness only. It does not promote unconfigured enrichment sources into scientific coverage.",
    adapters,
  } as const;

  const reportDirectory = path.join(projectRoot, "public/catalog/reports");
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(
    path.join(reportDirectory, "enrichment-readiness.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  return report;
};
