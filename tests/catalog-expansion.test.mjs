import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  IndexedCatalogNavigator,
  MAX_INITIAL_CATALOG_METADATA_RECORDS,
  MIN_DISPLAY_STRUCTURE_NEIGHBOR_SCORE,
  canonicalizeIndexedCatalogBrowsePage,
  canonicalizeIndexedCatalogHit,
  createReviewedCatalogIdentityIndex,
  isDisplayableStructureNeighborScore,
  loadCatalogExpansion,
  mergeCatalogExpansionIntoExplore,
} = await tsImport("../lib/application/catalog-expansion.ts", import.meta.url);
const { createExploreCatalogView } = await tsImport(
  "../lib/application/explore-catalog.ts",
  import.meta.url,
);
const { moleculeCatalog } = await tsImport("../lib/data/catalog.ts", import.meta.url);

const publicRoot = path.resolve(import.meta.dirname, "../public");
const loadLocalJson = async (url) => {
  const parsed = new URL(url, "https://example.test");
  const relativePath = parsed.pathname.replace(/^\/dev-molecules\//, "");
  return JSON.parse(await readFile(path.join(publicRoot, relativePath), "utf8"));
};

test("bounded static expansion loads the exact current manifest through a Pages base path", async () => {
  const expansion = await loadCatalogExpansion("/dev-molecules/", loadLocalJson);
  assert.equal(expansion.manifest.recordCount, 1552);
  assert.equal(expansion.entities.length, MAX_INITIAL_CATALOG_METADATA_RECORDS);
  assert.ok(expansion.entities.length <= MAX_INITIAL_CATALOG_METADATA_RECORDS);
  assert.equal(
    new Set(expansion.entities.map((entity) => entity.id)).size,
    MAX_INITIAL_CATALOG_METADATA_RECORDS,
  );
  assert.ok(
    new Set(expansion.entities.map((entity) => entity.preferredName[0]?.toLowerCase())).size >= 3,
    "the bounded initial window should be stratified instead of loading A-only records",
  );
});

test("resident-window structural candidates use an explicit conservative score floor", () => {
  assert.equal(MIN_DISPLAY_STRUCTURE_NEIGHBOR_SCORE, 0.45);
  assert.equal(isDisplayableStructureNeighborScore(0.45), true);
  assert.equal(isDisplayableStructureNeighborScore(0.449999), false);
  assert.equal(isDisplayableStructureNeighborScore(Number.NaN), false);
  assert.equal(isDisplayableStructureNeighborScore(1.01), false);
});

test("Explore merges the bounded representative window with exact-CID deduplication", async () => {
  const expansion = await loadCatalogExpansion("/dev-molecules/", loadLocalJson);
  const seed = createExploreCatalogView(moleculeCatalog, "en", "/dev-molecules/");
  const merged = mergeCatalogExpansionIntoExplore(
    seed,
    expansion,
    "en",
    "/dev-molecules/",
  );

  assert.equal(seed.molecules.length, 15);
  assert.equal(merged.molecules.length, 53);
  assert.equal(new Set(merged.molecules.map((molecule) => molecule.id)).size, 53);
  assert.equal(merged.lenses.at(-1)?.id, "structural-similarity");
  assert.equal(Object.keys(merged.projections.at(-1)?.coordinates ?? {}).length, 53);
  assert.ok(
    merged.molecules.every(
      (molecule) =>
        Object.keys(molecule.coordinates).length === 4 &&
        Object.keys(molecule.reviewerCoordinates).length === 4,
    ),
    "merged Student and Reviewer projections must use complete, separate coordinate frames",
  );

  const propranolol = merged.molecules.find((molecule) => molecule.id === "molecule:propranolol");
  assert.ok(propranolol);
  assert.doesNotMatch(JSON.stringify(propranolol.lensAliases), /cardiovascular/i);
  assert.ok(propranolol.reviewerLensAliases.therapeutic.includes("cardiovascular"));
  assert.notDeepEqual(
    propranolol.coordinates.therapeutic,
    propranolol.reviewerCoordinates.therapeutic,
  );

  const acetaminophen = merged.molecules.find((molecule) => molecule.name === "Acetaminophen");
  assert.ok(acetaminophen);
  assert.match(acetaminophen.structure.threeDUrl ?? "", /^\/dev-molecules\/catalog\//);
  assert.match(acetaminophen.evidenceLabel, /classification pending/i);
  assert.equal(acetaminophen.evidenceTone, "supported");
});

test("exact-CID imported hits canonicalize to reviewed seed identity while retaining alias resolution", async () => {
  const seed = createExploreCatalogView(moleculeCatalog, "en", "/dev-molecules/");
  const reviewed = createReviewedCatalogIdentityIndex(seed.molecules);
  const requested = [];
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: async (request) => {
      const url = String(request);
      requested.push(url);
      const marker = "/dev-molecules/catalog/";
      try {
        const bytes = await readFile(path.join(publicRoot, "catalog", url.slice(marker.length)));
        return new Response(bytes, { status: 200 });
      } catch {
        return new Response("not found", { status: 404 });
      }
    },
  });

  const importedSlug = "atenolol-metkimkyrpqlgs-uhfffaoysa-n";
  const imported = await navigator.resolveStableSlug(importedSlug);
  assert.equal(imported?.id, "molecule:imported:atenolol-metkimkyrpqlgs-uhfffaoysa-n");
  const canonical = canonicalizeIndexedCatalogHit(imported, reviewed);
  assert.equal(canonical.id, "molecule:atenolol");
  assert.equal(canonical.stableSlug, "atenolol");
  assert.equal(canonical.preferredName, "Atenolol");
  assert.equal(canonical.pubChemCid, 2249);
  assert.equal(reviewed.byCanonicalId.get(canonical.id)?.name, "Atenolol");
  assert.equal(
    requested.length,
    2,
    "resolving an imported alias to its reviewed identity must not hydrate a shard",
  );

  const metoprolol = canonicalizeIndexedCatalogHit(
    (await navigator.search("Metoprolol", 1))[0],
    reviewed,
  );
  assert.equal(metoprolol.id, "molecule:metoprolol");
  assert.equal(metoprolol.stableSlug, "metoprolol");
  assert.equal(metoprolol.pubChemCid, 4171);

  const metformin = (await navigator.search("Metformin", 1))[0];
  assert.strictEqual(canonicalizeIndexedCatalogHit(metformin, reviewed), metformin);
  const canonicalPage = canonicalizeIndexedCatalogBrowsePage(
    { records: [imported, metformin], offset: 0, total: 2, nextOffset: null, previousOffset: null },
    reviewed,
  );
  assert.deepEqual(canonicalPage.records.map((record) => record.id), [
    "molecule:atenolol",
    metformin.id,
  ]);
});

test("full-index search hydrates Metformin beyond the representative initial shards", async () => {
  const expansion = await loadCatalogExpansion("/dev-molecules/", loadLocalJson);
  assert.equal(
    expansion.entities.some((entity) => entity.identity.pubChemCid === 4091),
    false,
  );
  const requested = [];
  const client = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: async (request) => {
      const url = String(request);
      requested.push(url);
      const marker = "/dev-molecules/catalog/";
      try {
        const bytes = await readFile(path.join(publicRoot, "catalog", url.slice(marker.length)));
        return new Response(bytes, { status: 200 });
      } catch {
        return new Response("not found", { status: 404 });
      }
    },
  });

  const [match] = await client.search("metformin", 5);
  assert.equal(match?.pubChemCid, 4091);
  assert.deepEqual(requested, [
    "/dev-molecules/catalog/manifest.json",
    "/dev-molecules/catalog/search-index.v1.json",
  ]);
  const metformin = await client.hydrate(match.id);
  assert.equal(metformin?.identity.pubChemCid, 4091);
  assert.equal(requested.length, 3, "only Metformin's alphabetic shard is hydrated");
  assert.match(requested[2], /\/shards\/alphabetic\/m\.json$/);
  assert.ok(!requested.some((url) => url.endsWith(".sdf")));
});

test("manifest and shard corruption fail closed", async () => {
  await assert.rejects(
    () => loadCatalogExpansion("/", async () => ({ schemaVersion: 9 })),
    /manifest is invalid/i,
  );
});
