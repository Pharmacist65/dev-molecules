import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  BASIC_RECORD_NEIGHBOR_MINIMUM_SCORE,
  createBasicMolecularRecord,
  createResidentWindowStructuralNeighbors,
  resolveMolecularRecordRoute,
} = await tsImport(
  "../lib/application/basic-molecular-record.ts",
  import.meta.url,
);
const {
  getIndexedCatalogStableSlug,
} = await tsImport("../lib/application/catalog-expansion.ts", import.meta.url);
const {
  normalizeDrugAtlasBrowseState,
} = await tsImport("../lib/application/drug-atlas.ts", import.meta.url);
const { moleculeCatalog } = await tsImport("../lib/data/catalog.ts", import.meta.url);
const { loadPubChem2dDescriptors } = await tsImport(
  "../lib/structure/pubchem-2d-descriptors.ts",
  import.meta.url,
);

const publicRoot = new URL("../public/catalog/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", publicRoot), "utf8"),
);
const searchIndex = JSON.parse(
  await readFile(new URL("search-index.v1.json", publicRoot), "utf8"),
);
const alphabeticDescriptors = manifest.shards.filter(
  (descriptor) => descriptor.dimension === "alphabetic",
);
const alphabeticShards = await Promise.all(
  alphabeticDescriptors.map(async (descriptor) =>
    JSON.parse(await readFile(new URL(descriptor.path, publicRoot), "utf8")),
  ),
);
const entityById = new Map(
  alphabeticShards.flatMap((shard) => shard.records).map((entity) => [entity.id, entity]),
);

const toHit = (record) => ({
  id: record.id,
  stableSlug: getIndexedCatalogStableSlug(record.id),
  preferredName: record.preferredName,
  aliases: record.aliases,
  formula: record.formula,
  pubChemCid: record.pubChemCid,
});

const findIndexRecord = (name) => {
  const normalized = name.toLowerCase();
  const record = searchIndex.records.find(
    (candidate) =>
      candidate.preferredName.toLowerCase() === normalized ||
      candidate.aliases.some((alias) => alias.toLowerCase() === normalized),
  );
  assert.ok(record, `Expected ${name} in the compact index`);
  return record;
};

test("all 1,552 resolved index identities own a unique stable Basic Molecular Record route", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(searchIndex.schemaVersion, 1);
  assert.equal(manifest.recordCount, 1552);
  assert.equal(searchIndex.records.length, manifest.recordCount);
  assert.equal(entityById.size, manifest.recordCount);

  const stableSlugs = new Set();
  for (const indexRecord of searchIndex.records) {
    const hit = toHit(indexRecord);
    assert.ok(hit.stableSlug);
    assert.equal(stableSlugs.has(hit.stableSlug), false, hit.stableSlug);
    stableSlugs.add(hit.stableSlug);

    const entity = entityById.get(indexRecord.id);
    assert.ok(entity, `Missing entity for ${indexRecord.id}`);
    const basic = createBasicMolecularRecord(hit, entity, {
      assetBasePath: "/dev-molecules/",
    });
    assert.equal(basic.kind, "basic-molecular-record");
    assert.equal(basic.id, indexRecord.id);
    assert.equal(basic.identity.pubChemCid, indexRecord.pubChemCid);
    assert.equal(basic.structures.length, 2);
    assert.equal(basic.identity.reviewStatus, "source-supported");
    assert.ok(basic.structures.every((structure) => structure.reviewStatus === "source-supported"));
    assert.ok(basic.properties.every((property) => property.reviewStatus === "source-supported"));
    assert.match(basic.structures[0].publicPath, /^\/dev-molecules\/catalog\//);
    assert.match(basic.structures[1].publicPath, /^\/dev-molecules\/catalog\//);
    assert.equal(basic.coverage.length, 9);
    assert.deepEqual(
      basic.coverage.filter((item) => item.status === "available").map((item) => item.dimension),
      ["identity", "structure"],
    );
    assert.ok(basic.sources.every((source) => /^https?:\/\//.test(source.href)));
  }
  assert.equal(stableSlugs.size, 1552);
});

test("Beta-sitosterol and two unrelated non-seed records expose their own real identity and structure", () => {
  const scenarios = [
    ["sitosterol", 222284, "C29H50O"],
    ["Baclofen", 2284, "C10H12ClNO2"],
    ["cineole", 2758, "C10H18O"],
  ];

  for (const [name, cid, formula] of scenarios) {
    const indexRecord = findIndexRecord(name);
    const entity = entityById.get(indexRecord.id);
    assert.ok(entity);
    const basic = createBasicMolecularRecord(toHit(indexRecord), entity);
    assert.equal(basic.id, indexRecord.id);
    assert.equal(basic.identity.pubChemCid, cid);
    assert.equal(basic.identity.molecularFormula, formula);
    assert.ok(basic.identity.canonicalSmiles.length > 0);
    assert.ok(basic.identity.inchiKey.length > 0);
    assert.ok(basic.properties.some((property) => property.id === "molecular-weight"));
    assert.equal(basic.coverage.some((item) => item.dimension === "pharmacology" && item.status === "unavailable"), true);
    assert.equal(basic.coverage.some((item) => item.dimension === "adme" && item.status === "unavailable"), true);
  }
});

test("an exact seed CID canonicalizes to its curated dossier without hydrating an imported entity", async () => {
  const propranololSeed = moleculeCatalog.find(
    (record) => record.identity.pubChemCid === 4946,
  );
  assert.ok(propranololSeed);
  const imported = searchIndex.records.find((record) => record.pubChemCid === 4946);
  assert.ok(imported);
  let hydrateCalls = 0;
  const resolution = await resolveMolecularRecordRoute(
    getIndexedCatalogStableSlug(imported.id),
    {
      async resolveStableSlug() {
        return toHit(imported);
      },
      async hydrate() {
        hydrateCalls += 1;
        return null;
      },
    },
    { curatedRecords: moleculeCatalog },
  );

  assert.equal(resolution.kind, "curated-dossier");
  assert.equal(resolution.molecule.id, propranololSeed.id);
  assert.equal(resolution.canonicalSlug, "propranolol");
  assert.equal(hydrateCalls, 0);
});

test("a non-seed route hydrates only its exact entity and identity mismatches fail closed", async () => {
  const indexRecord = findIndexRecord("sitosterol");
  const hit = toHit(indexRecord);
  const entity = entityById.get(indexRecord.id);
  assert.ok(entity);
  const hydratedIds = [];
  const descriptorAssetRequests = [];
  const twoDSdf = await readFile(
    new URL(`../public/${entity.structures.twoD.path}`, import.meta.url),
    "utf8",
  );
  const navigator = {
    async resolveStableSlug(slug) {
      return slug === hit.stableSlug ? hit : null;
    },
    async hydrate(id) {
      hydratedIds.push(id);
      return entity;
    },
  };

  const resolution = await resolveMolecularRecordRoute(hit.stableSlug, navigator, {
    curatedRecords: moleculeCatalog,
    assetBasePath: "/dev-molecules/",
    residentEntities: alphabeticShards[1]?.records.slice(0, 12) ?? [],
    async descriptorLoader(assetUrl, contract) {
      descriptorAssetRequests.push({ assetUrl, contract });
      return loadPubChem2dDescriptors(assetUrl, contract, async () => twoDSdf);
    },
  });
  assert.equal(resolution.kind, "basic-molecular-record");
  assert.equal(resolution.record.identity.pubChemCid, 222284);
  assert.equal(resolution.record.properties.length, 11);
  assert.ok(resolution.record.properties.every((property) => property.provenance === "pubchem-2d-sdf"));
  assert.ok(resolution.record.properties.every((property) => property.reviewStatus === "source-supported"));
  assert.deepEqual(descriptorAssetRequests, [{
    assetUrl: "/dev-molecules/catalog/structures/pubchem/cid-222284-2d.sdf",
    contract: {
      expectedPubChemCid: 222284,
      sourceUrl: entity.structures.twoD.sourceUrl,
    },
  }]);
  assert.deepEqual(hydratedIds, [hit.id]);

  const withoutDescriptorEvidence = await resolveMolecularRecordRoute(
    hit.stableSlug,
    navigator,
    {
      curatedRecords: moleculeCatalog,
      async descriptorLoader() {
        throw new Error("malformed or unavailable 2D evidence");
      },
    },
  );
  assert.equal(withoutDescriptorEvidence.kind, "basic-molecular-record");
  assert.deepEqual(
    withoutDescriptorEvidence.record.properties.map(({ id, provenance }) => ({ id, provenance })),
    [{ id: "molecular-weight", provenance: "pubchem-property-record" }],
  );

  const mismatch = await resolveMolecularRecordRoute(hit.stableSlug, {
    ...navigator,
    async hydrate() {
      return { ...entity, id: "molecule:another-record" };
    },
  }, { curatedRecords: moleculeCatalog });
  assert.deepEqual(mismatch, { kind: "unavailable", reason: "identity-mismatch" });

  const unresolved = await resolveMolecularRecordRoute("not-in-index", navigator, {
    curatedRecords: moleculeCatalog,
  });
  assert.deepEqual(unresolved, { kind: "unavailable", reason: "not-indexed" });
});

test("resident-window neighbors are bounded, thresholded and explicitly computed-unreviewed", () => {
  const selectedIndex = findIndexRecord("sitosterol");
  const selected = entityById.get(selectedIndex.id);
  assert.ok(selected);
  const residents = [...entityById.values()].filter((entity) =>
    ["Abiraterone Acetate", "Iloprost", "Quinestrol", "Baclofen", "Acetaminophen"].includes(entity.preferredName),
  );
  const neighbors = createResidentWindowStructuralNeighbors(selected, residents, 3);
  assert.ok(neighbors.length > 0);
  assert.ok(neighbors.length <= 3);
  assert.ok(neighbors.every((neighbor) => neighbor.score >= BASIC_RECORD_NEIGHBOR_MINIMUM_SCORE));
  assert.ok(neighbors.every((neighbor) => neighbor.reviewStatus === "computed-unreviewed"));
  assert.ok(neighbors.every((neighbor) => neighbor.method === "canonical-smiles-path-fingerprint"));
});

test("Atlas browse state restoration is explicit, bounded and fail-safe", () => {
  assert.deepEqual(
    normalizeDrugAtlasBrowseState({
      query: "  beta   sitosterol ",
      offset: 48,
      filters: { atc: "c", empty: "", invalid: 42 },
    }),
    { query: "beta sitosterol", offset: 48, filters: { atc: "c" } },
  );
  assert.deepEqual(normalizeDrugAtlasBrowseState(null), {
    query: "",
    offset: 0,
    filters: {},
  });
  assert.deepEqual(
    normalizeDrugAtlasBrowseState({ query: "x".repeat(513), offset: -1 }),
    { query: "", offset: 0, filters: {} },
  );
});

test("Basic record route UI has stable acceptance selectors and no missing-dossier fallback", async () => {
  const [component, route, app, atlas] = await Promise.all([
    readFile(new URL("../components/basic-record/BasicMolecularRecord.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/basic-record/MolecularRecordRoute.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/DevMoleculesApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/DrugAtlas.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(component, /data-basic-molecular-record/);
  assert.match(component, /data-basic-record-structure="2d"/);
  assert.match(component, /data-basic-record-structure="3d"/);
  assert.match(component, /data-coverage-dimension/);
  assert.match(component, /data-basic-record-sources="closed-by-default"/);
  assert.match(component, /data-basic-record-properties="true"/);
  assert.match(component, /data-basic-record-review-status="source-supported"/);
  assert.doesNotMatch(component, /Computed · unreviewed|Hesaplanmış · incelenmemiş|Tanimoto|fingerprint/i);
  assert.match(route, /data-molecular-record-route-status="basic-molecular-record"/);
  assert.doesNotMatch(`${component}\n${route}`, /curated dossier not found/i);
  assert.match(app, /ATLAS_BROWSE_STATE_STORAGE_KEY/);
  assert.match(app, /browseState=\{atlasBrowseState\}/);
  assert.match(atlas, /Open molecular record/);
  assert.match(atlas, /Moleküler kaydı aç/);
});
