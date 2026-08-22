import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { generateEnrichmentReadinessReport } from "../scripts/catalog/enrich-catalog.mts";

test("catalog enrichment reports readiness without manufacturing coverage", async () => {
  const report = await generateEnrichmentReadinessReport();
  assert.equal(report.catalogRecordCount, 1552);
  assert.equal(report.configuredEnrichmentSnapshotCount, 0);
  assert.equal(report.classificationsEnriched, 0);
  assert.equal(report.pharmacologyProfilesEnriched, 0);
  assert.equal(report.admeProfilesEnriched, 0);
  assert.ok(report.adapters.some((item) => item.adapter === "AtcClassificationAdapter"));
  assert.equal(
    report.adapters.find((item) => item.adapter === "AtcClassificationAdapter")?.status,
    "not-configured",
  );

  const persisted = JSON.parse(
    await readFile("public/catalog/reports/enrichment-readiness.json", "utf8"),
  );
  assert.equal(persisted.catalogSnapshotId, report.catalogSnapshotId);
  assert.equal(persisted.admeProfilesEnriched, 0);
});
