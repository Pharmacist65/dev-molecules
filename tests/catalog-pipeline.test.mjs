import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  BoundedLruCache,
  buildCatalogSnapshot,
  catalogAdapterCapabilities,
  createFormAwareIdentityKey,
  drugCentralApprovedAdapter,
  openFdaDrugsFdaAdapter,
  StaticCatalogClient,
} = await tsImport("../lib/catalog/index.ts", import.meta.url);
const { downloadSourceSnapshots } = await tsImport(
  "../scripts/catalog/download-source-snapshots.mts",
  import.meta.url,
);
const { validateGeneratedCatalog } = await tsImport(
  "../scripts/catalog/validate-catalog.mts",
  import.meta.url,
);

const snapshotUrl = new URL(
  "../scripts/catalog/source-snapshots/drugcentral-fda-pubchem-eligible-v1.json",
  import.meta.url,
);
const manifestUrl = new URL("../public/catalog/manifest.json", import.meta.url);

test("catalog importer dry-run is deterministic and performs no snapshot write", async () => {
  const checkedSnapshot = JSON.parse(await readFile(snapshotUrl, "utf8"));
  const before = await stat(snapshotUrl);
  const result = await downloadSourceSnapshots({ dryRun: true, refresh: true });
  const after = await stat(snapshotUrl);

  assert.equal(result.mode, "dry-run");
  assert.equal(result.snapshotPath, snapshotUrl.pathname);
  assert.equal(result.selectedCandidates, checkedSnapshot.records.length);
  assert.equal(
    result.structureCandidates,
    checkedSnapshot.records.filter((record) => record.structure !== null).length,
  );
  assert.equal(result.networkRequestsPlanned, true);
  assert.equal(after.mtimeMs, before.mtimeMs);
});

test("selected DrugCentral FDA snapshot processes every source row without a name allowlist", async () => {
  const checkedSnapshot = JSON.parse(await readFile(snapshotUrl, "utf8"));
  const importerSource = await readFile(
    new URL("../scripts/catalog/catalog-config.mts", import.meta.url),
    "utf8",
  );
  const approvalSource = checkedSnapshot.sources.find(
    (source) => source.adapter === "drugcentral-approved",
  );
  const drugCentralSources = checkedSnapshot.sources.filter(
    (source) => source.adapter.startsWith("drugcentral-"),
  );

  assert.equal(checkedSnapshot.scope.sourceSelectionExhaustive, true);
  assert.equal(checkedSnapshot.scope.candidateCount, checkedSnapshot.records.length);
  assert.equal(approvalSource.selectedRows, approvalSource.totalSourceRows);
  assert.equal(approvalSource.selectedRows, checkedSnapshot.records.length);
  assert.equal(
    new Set(checkedSnapshot.records.map((record) => record.approval.drugCentralId)).size,
    checkedSnapshot.records.length,
  );
  assert.ok(drugCentralSources.length >= 2);
  assert.ok(
    drugCentralSources.every(
      (source) => source.licenseUrl === "https://creativecommons.org/licenses/by-sa/4.0/",
    ),
  );
  assert.doesNotMatch(importerSource, /selectedCatalogIdentities|preferredName:\s*["']/);
});

test("source adapters preserve application, product, ingredient and jurisdiction boundaries", () => {
  assert.deepEqual(drugCentralApprovedAdapter.parse("52,paracetamol\n74,acetylsalicylic acid\n"), [
    { drugCentralId: 52, name: "paracetamol" },
    { drugCentralId: 74, name: "acetylsalicylic acid" },
  ]);
  const products = openFdaDrugsFdaAdapter.parse({
    results: [
      {
        application_number: "NDA000001",
        sponsor_name: "Example sponsor",
        products: [
          {
            product_number: "001",
            brand_name: "Example product",
            dosage_form: "TABLET",
            route: "ORAL",
            marketing_status: "Prescription",
            active_ingredients: [
              { name: "INGREDIENT A", strength: "1MG" },
              { name: "INGREDIENT B", strength: "2MG" },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(products.length, 1);
  assert.equal(products[0].applicationNumber, "NDA000001");
  assert.equal(products[0].productNumber, "001");
  assert.deepEqual(
    products[0].activeIngredients.map((ingredient) => ingredient.name),
    ["INGREDIENT A", "INGREDIENT B"],
  );
  assert.equal(
    catalogAdapterCapabilities.find((item) => item.adapter === "ema-future")?.status,
    "future",
  );
  assert.equal(
    catalogAdapterCapabilities.find((item) => item.adapter === "pmda-future")?.status,
    "future",
  );
});

const asset = (dimension) => ({
  path: `/catalog/structures/pubchem/cid-101-${dimension}.sdf`,
  sha256: "a".repeat(64),
  byteLength: 100,
  sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/${dimension}`,
});

const record = ({
  drugCentralId = 1,
  preferredName = "Example",
  inchiKey = "AAAAAAAAAAAAAA-UHFFFAOYSA-N",
  smiles = "CCO",
  cid = 101,
} = {}) => ({
  preferredName,
  aliases: [],
  approval: { drugCentralId, name: preferredName.toLowerCase() },
  structure: {
    drugCentralId,
    inn: preferredName.toLowerCase(),
    smiles,
    inchi: "InChI=1S/example",
    inchiKey,
    casNumber: null,
  },
  pubChem: {
    cid,
    title: preferredName,
    molecularFormula: "C2H6O",
    molecularWeight: 46.07,
    canonicalSmiles: smiles,
    isomericSmiles: null,
    inchiKey,
  },
  assets: { twoD: asset("2d"), threeD: asset("3d") },
  unresolvedReason: null,
});

const snapshot = (records) => ({
  schemaVersion: 1,
  snapshotId: "test-snapshot",
  capturedAt: "2026-08-22T00:00:00.000Z",
  scope: {
    label: "test",
    jurisdictions: ["US"],
    candidateCount: records.length,
    exhaustive: false,
    selectionPolicy: "test only",
    exclusions: [],
  },
  sources: [
    {
      id: "source:test",
      adapter: "drugcentral-approved",
      sourceUrl: "https://example.invalid",
      licenseUrl: "https://example.invalid/license",
      capturedAt: "2026-08-22T00:00:00.000Z",
      sourceLastModified: null,
      sha256: null,
      totalSourceRows: records.length,
      selectedRows: records.length,
      role: "regulatory",
    },
  ],
  records,
});

test("form-aware identity never deduplicates stereo or multicomponent source forms by name", () => {
  const achiral = record();
  const stereo = record({
    drugCentralId: 2,
    inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBSA-N",
    cid: 102,
  });
  const multicomponent = record({
    drugCentralId: 3,
    inchiKey: "AAAAAAAAAAAAAA-CCCCCCCCSA-N",
    smiles: "CCO.[Cl-]",
    cid: 103,
  });
  const result = buildCatalogSnapshot(snapshot([achiral, stereo, multicomponent]));

  assert.equal(result.entities.length, 3);
  assert.equal(new Set(result.entities.map((entity) => entity.parentEntity.id)).size, 1);
  assert.equal(new Set(result.entities.map((entity) => entity.stereoisomer.id)).size, 3);
  assert.equal(
    result.entities.find((entity) => entity.identity.pubChemCid === 103)?.chemicalForm
      .componentCount,
    2,
  );
  assert.equal(result.coverage.formStereoConflicts, 1);
  assert.equal(result.coverage.displayNameIdentityConflictGroups, 1);
  assert.equal(result.coverage.sourceNameIdentityConflictGroups, 1);
  assert.equal(result.identityAudit.sourceNameIdentityConflicts.length, 1);
  assert.notEqual(createFormAwareIdentityKey(achiral), createFormAwareIdentityKey(multicomponent));
});

test("exact identity duplicates merge while mismatched or missing identities fail closed", () => {
  const original = record();
  const duplicate = record({ drugCentralId: 2 });
  const mismatch = {
    ...record({ drugCentralId: 3, preferredName: "Mismatch", cid: 303 }),
    pubChem: {
      ...record({ preferredName: "Mismatch", cid: 303 }).pubChem,
      inchiKey: "ZZZZZZZZZZZZZZ-UHFFFAOYSA-N",
    },
  };
  const missing = {
    ...record({ drugCentralId: 4, preferredName: "Missing", cid: 404 }),
    assets: { twoD: asset("2d"), threeD: null },
  };
  const result = buildCatalogSnapshot(snapshot([original, duplicate, mismatch, missing]));

  assert.equal(result.entities.length, 1);
  assert.equal(result.coverage.duplicatesMerged, 1);
  assert.equal(result.unresolved.length, 2);
  assert.ok(result.unresolved.every((item) => item.failClosed));
  assert.deepEqual(
    result.unresolved.map((item) => item.stage).sort(),
    ["pubchem-resolution", "structure-resolution"],
  );
});

test("generated public catalog is sharded, lazy-loadable and not capped at regression fixtures", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const coverage = JSON.parse(
    await readFile(new URL("../public/catalog/reports/coverage.json", import.meta.url), "utf8"),
  );
  const searchIndex = JSON.parse(
    await readFile(new URL(`../public/catalog/${manifest.searchIndex}`, import.meta.url), "utf8"),
  );
  const legacySources = await Promise.all(
    ["beta-blockers.ts", "nsaids.ts"].map((filename) =>
      readFile(new URL(`../lib/data/${filename}`, import.meta.url), "utf8"),
    ),
  );
  const legacyCount = legacySources.reduce(
    (total, source) => total + [...source.matchAll(/^\s+cid:\s*(\d+),$/gm)].length,
    0,
  );

  assert.equal(legacyCount, 15, "regression fixture count changed unexpectedly");
  assert.equal(manifest.recordCount, coverage.coverage.imported);
  assert.ok(manifest.recordCount > legacyCount);
  assert.equal(manifest.scope.sourceSelectionExhaustive, true);
  assert.equal(
    coverage.coverage.sourceSnapshotCandidates,
    coverage.coverage.sourceRegistryRows,
  );
  assert.equal(
    coverage.coverage.candidateAccountingTotal,
    coverage.coverage.sourceSnapshotCandidates,
  );
  assert.equal(
    coverage.coverage.displayNameIdentityConflictGroups,
    coverage.identityAudit.displayNameIdentityConflicts.length,
  );
  assert.equal(
    coverage.coverage.sourceNameIdentityConflictGroups,
    coverage.identityAudit.sourceNameIdentityConflicts.length,
  );
  assert.equal(
    coverage.coverage.multicomponentParentRelationUnresolved,
    coverage.identityAudit.multicomponentSourceForms.length,
  );
  assert.equal(searchIndex.records.length, manifest.recordCount);
  assert.equal("records" in manifest, false, "manifest must not embed the entire catalog");
  assert.equal(manifest.structureLoading, "per-molecule-lazy");
  assert.ok(manifest.shards.filter((shard) => shard.dimension === "alphabetic").length > 1);
  assert.ok(manifest.shards.some((shard) => shard.dimension === "therapeutic"));
  const firstShard = JSON.parse(
    await readFile(new URL(`../public/catalog/${manifest.shards[0].path}`, import.meta.url), "utf8"),
  );
  assert.ok(firstShard.records.length < manifest.recordCount);
  assert.ok(
    firstShard.records.every((entity) =>
      entity.structures.threeD.path.startsWith("/catalog/structures/pubchem/"),
    ),
  );
});

test("static catalog client searches compact metadata before lazily loading a shard and structure", async () => {
  const requested = [];
  const fetchImpl = async (request) => {
    const path = String(request);
    requested.push(path);
    const marker = "/dev-molecules/catalog/";
    assert.ok(path.startsWith(marker), `unexpected test request: ${path}`);
    const relative = path.slice(marker.length);
    try {
      const content = await readFile(
        new URL(`../public/catalog/${relative}`, import.meta.url),
      );
      return new Response(content, { status: 200 });
    } catch {
      return new Response("not found", { status: 404 });
    }
  };
  const client = new StaticCatalogClient({
    basePath: "/dev-molecules/",
    fetchImpl,
    maxShardEntries: 2,
    maxStructureEntries: 2,
  });

  const matches = await client.search("metformin");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].preferredName, "Metformin");
  assert.deepEqual(requested, [
    "/dev-molecules/catalog/manifest.json",
    "/dev-molecules/catalog/search-index.v1.json",
  ]);
  const entity = await client.loadEntity(matches[0].id);
  assert.equal(entity?.identity.pubChemCid, 4091);
  assert.equal(requested.length, 3, "one alphabetic shard should load on demand");
  const sdf = await client.loadStructure(entity, "3d");
  assert.match(sdf, /> <PUBCHEM_COMPOUND_CID>\r?\n4091/);
  assert.equal(requested.length, 4, "one structure should load on demand");
  await client.loadStructure(entity, "3d");
  assert.equal(requested.length, 4, "bounded structure cache should reuse the asset");
});

test("generated unresolved report retains explicit provenance gaps", async () => {
  const report = JSON.parse(
    await readFile(new URL("../public/catalog/reports/unresolved.json", import.meta.url), "utf8"),
  );
  const coverage = JSON.parse(
    await readFile(new URL("../public/catalog/reports/coverage.json", import.meta.url), "utf8"),
  );
  assert.equal(report.count, coverage.coverage.unresolved);
  assert.equal(report.records.length, report.count);
  assert.ok(report.records.every((record) => record.failClosed === true));
  assert.equal(
    Object.values(report.byStage).reduce((sum, count) => sum + count, 0),
    report.count,
  );
  assert.ok(report.byStage["identity-normalization"] > 0);
  assert.ok(report.byStage["pubchem-resolution"] > 0);
  assert.ok(report.byStage["structure-resolution"] > 0);
  assert.ok(
    report.records.some((record) => /no chemical identity was inferred/i.test(record.reason)),
  );
});

test("bounded LRU cache evicts least recently used catalog entries", () => {
  const cache = new BoundedLruCache(2);
  cache.set("alpha", 1).set("beta", 2);
  assert.equal(cache.get("alpha"), 1);
  cache.set("gamma", 3);
  assert.equal(cache.has("alpha"), true);
  assert.equal(cache.has("beta"), false);
  assert.equal(cache.get("gamma"), 3);
  assert.throws(() => new BoundedLruCache(0), /positive safe integer/);
});

test("generated catalog validator checks every structure asset", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const result = await validateGeneratedCatalog();
  assert.equal(result.valid, true);
  assert.equal(result.recordCount, manifest.recordCount);
  assert.equal(result.structureAssetsChecked, manifest.recordCount * 2);
  assert.equal(
    (
      await readdir(
        new URL("../public/catalog/structures/pubchem/", import.meta.url),
      )
    ).filter((filename) => filename.endsWith(".sdf")).length,
    manifest.recordCount * 2,
  );
});
