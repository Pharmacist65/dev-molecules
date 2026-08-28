import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  loadSynthesisLearningStructureAssets,
  loadSynthesisLearningStudioRouteDetail,
  selectExactRouteBoundaryMaterials,
} = await tsImport(
  "../lib/application/synthesis-learning-studio-controller.ts",
  import.meta.url,
);
const { loadPublicAlphaSynthesisQualityInput } = await tsImport(
  "../scripts/synthesis/analyze-public-alpha-quality.mts",
  import.meta.url,
);

const input = await loadPublicAlphaSynthesisQualityInput();
const coverage = input.coverageRecords.find(
  (record) => record.identityScope.preferredName === "Triethylenetetramine",
);
assert.ok(coverage);
const draftEntry = input.draftEntries.find(
  (entry) => entry.indexEntry.coverageId === coverage.id,
);
assert.ok(draftEntry);
const graph = draftEntry.graph;
const manifest = JSON.parse(await readFile(
  new URL(
    "../public/catalog/synthesis/reports/intermediate-3d-assets.json",
    import.meta.url,
  ),
  "utf8",
));

const selection = {
  catalogEntityId: coverage.identityScope.catalogEntityId,
  catalogSnapshotId: input.catalogSnapshotId,
  stableSlug: "triethylenetetramine-vilcjcgezxaxto-uhfffaoysa-n",
  preferredName: coverage.identityScope.preferredName,
  aliases: [],
  molecularFormula: "C6H18N4",
  pubChemCid: coverage.identityScope.pubChemCid,
  inchiKey: coverage.identityScope.inchiKey,
  canonicalSmiles: "C(CNCCN)NCCN",
  isomericSmiles: null,
  structures: {
    twoD: {
      publicPath: "/catalog/structures/target-2d.sdf",
      sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/5565",
      sha256: "a".repeat(64),
      byteLength: 1,
      origin: "database-2d-record",
      provenance: "source_record",
    },
    threeD: {
      publicPath: "/catalog/structures/target-3d.sdf",
      sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/5565",
      sha256: "b".repeat(64),
      byteLength: 1,
      origin: "computed-3d-conformer",
      provenance: "computed",
    },
  },
  curatedMoleculeId: null,
  coverage,
  coverageLoadState: "ready",
};

const manifestResponse = (body = manifest, status = 200) => async () =>
  new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );

test("application controller selects only exact intermediate and target route-boundary materials", () => {
  const materials = selectExactRouteBoundaryMaterials([graph]);
  assert.ok(materials.length > 0);
  const graphByInchiKey = new Map(
    graph.materials.map((material) => [material.inchiKey, material]),
  );
  assert.ok(materials.every((material) => {
    const source = graphByInchiKey.get(material.inchiKey);
    return ["route_intermediate", "exact_target"].includes(source?.displayRole) &&
      source.identityResolution === "exact_inchi_key_computed" &&
      material.exactIdentityResolved === true;
  }));
});

test("shared route-detail controller hydrates exact assets for Full and Embedded Studio", async () => {
  let expectedIdentity;
  const detail = await loadSynthesisLearningStudioRouteDetail(selection, {
    assetBasePath: "/dev-molecules/",
    fetchImpl: manifestResponse(),
    draftLoader: async (expected) => {
      expectedIdentity = expected;
      return [graph];
    },
  });
  assert.equal(detail.kind, "available");
  assert.equal(detail.routeDetailLoadState, "ready");
  assert.equal(detail.structureAssetAvailability.state, "partially_available");
  assert.equal(
    detail.structureAssetAvailability.reason,
    "some_exact_catalog_assets_not_recorded",
  );
  assert.ok(
    detail.structureAssetAvailability.availableExactComputed3DCount <
      detail.structureAssetAvailability.exactRouteBoundaryMaterialCount,
  );
  assert.equal(detail.structureAssetAvailability.globalConformerAbsenceClaimed, false);
  assert.ok(detail.structureAssetsByInchiKey.size > 0);
  assert.deepEqual(
    {
      catalogSnapshotId: expectedIdentity.catalogSnapshotId,
      catalogEntityId: expectedIdentity.catalogEntityId,
      pubChemCid: expectedIdentity.pubChemCid,
      inchiKey: expectedIdentity.inchiKey,
    },
    {
      catalogSnapshotId: selection.catalogSnapshotId,
      catalogEntityId: selection.catalogEntityId,
      pubChemCid: selection.pubChemCid,
      inchiKey: selection.inchiKey,
    },
  );
  for (const bundle of detail.structureAssetsByInchiKey.values()) {
    assert.equal(bundle.threeD.status, "available");
    assert.match(bundle.threeD.publicPath, /^\/dev-molecules\/catalog\//u);
  }
});

test("manifest HTTP failure preserves route detail as transport unavailable", async () => {
  const detail = await loadSynthesisLearningStudioRouteDetail(selection, {
    fetchImpl: manifestResponse({ error: "missing" }, 404),
    draftLoader: async () => [graph],
  });
  assert.equal(detail.kind, "available");
  assert.equal(detail.routeDetailLoadState, "ready");
  assert.equal(detail.graphs.length, 1);
  assert.equal(detail.structureAssetsByInchiKey.size, 0);
  assert.deepEqual(
    {
      state: detail.structureAssetAvailability.state,
      reason: detail.structureAssetAvailability.reason,
      globalConformerAbsenceClaimed:
        detail.structureAssetAvailability.globalConformerAbsenceClaimed,
    },
    {
      state: "transport_unavailable",
      reason: "manifest_http_or_transport_failure",
      globalConformerAbsenceClaimed: false,
    },
  );
});

test("corrupt manifest and snapshot drift are provenance unavailable, not scientific absence", async () => {
  const corrupt = await loadSynthesisLearningStructureAssets(
    [graph],
    selection,
    { fetchImpl: manifestResponse("{not-json") },
  );
  assert.equal(corrupt.availability.state, "provenance_unavailable");
  assert.equal(corrupt.availability.reason, "manifest_json_or_schema_invalid");

  const mismatch = await loadSynthesisLearningStructureAssets(
    [graph],
    { catalogSnapshotId: "different-catalog-snapshot" },
    { fetchImpl: manifestResponse() },
  );
  assert.equal(mismatch.availability.state, "provenance_unavailable");
  assert.equal(mismatch.availability.reason, "catalog_snapshot_mismatch");
  assert.equal(mismatch.availability.globalConformerAbsenceClaimed, false);
});

test("a valid checked manifest with no exact asset is separately scientifically absent", async () => {
  const emptyManifest = {
    ...manifest,
    summary: {
      observedExactRouteBoundaryMaterialIdentityCount: 0,
      computedRouteBoundaryMaterial3dAssetCount: 0,
      rdkitGeneratedRouteBoundaryMaterial3dAssetCount: 0,
      catalogComputedFallback3dAssetCount: 0,
      rdkitGenerationFailureCount: 0,
      routeAlternativesWithComputedIntermediate3d: 0,
      unresolvedRouteBoundaryMaterialIdentityCount: 0,
    },
    entries: [],
    unresolvedInchiKeys: [],
    generationFailures: [],
  };
  const loaded = await loadSynthesisLearningStructureAssets(
    [graph],
    selection,
    { fetchImpl: manifestResponse(emptyManifest) },
  );
  assert.equal(loaded.availability.state, "scientifically_absent");
  assert.equal(loaded.availability.reason, "no_exact_catalog_asset_record");
  assert.equal(loaded.availability.globalConformerAbsenceClaimed, false);
  assert.equal(loaded.structureAssetsByInchiKey.size, 0);
});

test("draft transport failure remains route-detail unavailable without testing assets", async () => {
  const detail = await loadSynthesisLearningStudioRouteDetail(selection, {
    draftLoader: async () => {
      throw new Error("synthetic transport failure");
    },
  });
  assert.equal(detail.kind, "unavailable");
  assert.equal(detail.routeDetailLoadState, "unavailable");
  assert.equal(detail.structureAssetAvailability.state, "not_applicable");
  assert.equal(detail.structureAssetAvailability.reason, "route_detail_unavailable");
});
