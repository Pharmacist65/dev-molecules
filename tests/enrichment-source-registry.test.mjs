import assert from "node:assert/strict";
import test from "node:test";

import {
  canBundleEnrichmentSource,
  enrichmentSourcePolicies,
  getEnrichmentSourcePolicy,
} from "../lib/data/importers/source-registry.ts";

test("the enrichment registry covers every requested adapter exactly once", () => {
  const expected = [
    "DrugCentralApprovedDrugAdapter",
    "PubChemStructureAdapter",
    "DrugCentralTargetAdapter",
    "ChEMBLBioactivityAdapter",
    "GuideToPharmacologyAdapter",
    "DailyMedLabelAdapter",
    "OpenFdaLabelAdapter",
    "AtcClassificationAdapter",
    "ClinPgxAdapter",
    "BindingDbAdapter",
  ];
  assert.deepEqual(
    enrichmentSourcePolicies.map((policy) => policy.adapter).sort(),
    expected.sort(),
  );
  assert.equal(new Set(enrichmentSourcePolicies.map((policy) => policy.adapter)).size, expected.length);
});

test("restricted and link-only sources fail closed for public bundling", () => {
  assert.equal(canBundleEnrichmentSource("AtcClassificationAdapter"), false);
  assert.equal(canBundleEnrichmentSource("DailyMedLabelAdapter"), false);
  assert.equal(
    getEnrichmentSourcePolicy("AtcClassificationAdapter").redistribution,
    "blocked-pending-permission",
  );
});

test("current build-enabled sources preserve an explicit redistribution decision", () => {
  const enabled = enrichmentSourcePolicies.filter((policy) => policy.enabledForPublicBuild);
  assert.deepEqual(
    enabled.map((policy) => policy.adapter),
    ["DrugCentralApprovedDrugAdapter", "PubChemStructureAdapter"],
  );
  for (const policy of enabled) {
    assert.notEqual(policy.redistribution, "blocked-pending-permission");
    assert.ok(policy.versionPolicy.length > 20);
    assert.ok(policy.limitation.length > 20);
  }
});
