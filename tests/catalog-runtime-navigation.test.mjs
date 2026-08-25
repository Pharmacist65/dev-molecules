import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  IndexedCatalogNavigator,
  MAX_INITIAL_CATALOG_METADATA_RECORDS,
  MAX_INITIAL_CATALOG_SHARDS,
  MAX_RUNTIME_HYDRATED_RECORDS,
  createExpandedExploreMolecule,
  loadCatalogExpansion,
  retainHydratedCatalogEntity,
} = await tsImport("../lib/application/catalog-expansion.ts", import.meta.url);

const publicRoot = path.resolve(import.meta.dirname, "../public");

const localCatalogFetch = (requested) => async (request) => {
  const url = String(request);
  requested.push(url);
  const marker = "/dev-molecules/catalog/";
  assert.ok(url.startsWith(marker), `unexpected catalog request: ${url}`);
  try {
    const bytes = await readFile(path.join(publicRoot, "catalog", url.slice(marker.length)));
    return new Response(bytes, { status: 200 });
  } catch {
    return new Response("not found", { status: 404 });
  }
};

test("initial metadata window is bounded and stratified across alphabetic regions", async () => {
  const requested = [];
  const expansion = await loadCatalogExpansion("/dev-molecules/", async (request) => {
    const url = String(request);
    requested.push(url);
    const marker = "/dev-molecules/catalog/";
    return JSON.parse(
      await readFile(path.join(publicRoot, "catalog", url.slice(marker.length)), "utf8"),
    );
  });
  assert.equal(expansion.entities.length, MAX_INITIAL_CATALOG_METADATA_RECORDS);
  assert.ok(requested.length <= MAX_INITIAL_CATALOG_SHARDS + 1);
  const initials = new Set(
    expansion.entities.map((entity) => entity.preferredName[0]?.toLocaleLowerCase("en")),
  );
  assert.ok(initials.size >= 3, "initial runtime window must not be an A-only catalog slice");
});

test("full-index search finds and lazily hydrates an entity beyond the initial scene window", async () => {
  const index = JSON.parse(
    await readFile(path.join(publicRoot, "catalog/search-index.v1.json"), "utf8"),
  );
  assert.ok(index.records.length > 40, "fixture must represent a catalog larger than the scene window");
  const target = index.records.slice(40).find((record) => record.pubChemCid > 0);
  assert.ok(target);

  const requested = [];
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: localCatalogFetch(requested),
    maxShardEntries: 2,
    maxStructureEntries: 2,
    maxHydratedEntries: 3,
  });

  const matches = await navigator.search(String(target.pubChemCid), 5);
  assert.equal(matches[0]?.id, target.id);
  assert.deepEqual(requested, [
    "/dev-molecules/catalog/manifest.json",
    "/dev-molecules/catalog/search-index.v1.json",
  ]);

  const entity = await navigator.hydrate(target.id);
  assert.equal(entity?.id, target.id);
  assert.equal(requested.length, 3, "one matching alphabetic shard hydrates on demand");
  assert.match(requested[2], /\/catalog\/shards\/alphabetic\//);
  assert.ok(!requested.some((url) => url.endsWith(".sdf")), "search does not hydrate structure bytes");

  await navigator.hydrate(target.id);
  assert.equal(requested.length, 3, "bounded entity cache reuses a hydrated record");
});

test("stable molecule permalinks resolve exactly from the compact index before bounded hydration", async () => {
  const requested = [];
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: localCatalogFetch(requested),
    maxShardEntries: 2,
    maxStructureEntries: 2,
    maxHydratedEntries: 2,
  });
  const stableSlug = "metformin-xzwyzxlipxdolr-uhfffaoysa-n";

  const hit = await navigator.resolveStableSlug(stableSlug);
  assert.equal(hit?.stableSlug, stableSlug);
  assert.equal(hit?.pubChemCid, 4091);
  assert.deepEqual(
    requested,
    [
      "/dev-molecules/catalog/manifest.json",
      "/dev-molecules/catalog/search-index.v1.json",
    ],
    "permalink resolution must not hydrate a shard or structure asset",
  );

  assert.equal(await navigator.resolveStableSlug(stableSlug.toUpperCase()), null);
  assert.equal(await navigator.resolveStableSlug("unknown-catalog-molecule"), null);
  assert.equal(requested.length, 2, "the exact-slug map must be reused");

  const entity = await navigator.hydrate(hit.id);
  assert.equal(entity?.identity.pubChemCid, 4091);
  assert.equal(requested.length, 3);
  assert.match(requested[2], /\/catalog\/shards\/alphabetic\/m\.json$/);
  assert.ok(!requested.some((url) => url.endsWith(".sdf")));
});

test("compare permalink members resolve in order and hydrate only their bounded shards", async () => {
  const requested = [];
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: localCatalogFetch(requested),
    maxShardEntries: 2,
    maxStructureEntries: 2,
    maxHydratedEntries: 2,
  });
  const slugs = [
    "metformin-xzwyzxlipxdolr-uhfffaoysa-n",
    "naproxen-cmwtzpsulfxxja-vifpvbqesa-n",
  ];

  const hits = await Promise.all(slugs.map((slug) => navigator.resolveStableSlug(slug)));
  assert.deepEqual(hits.map((hit) => hit?.preferredName), ["Metformin", "Naproxen"]);
  assert.equal(requested.length, 2, "compare resolution must use only manifest and compact index");

  const entities = await Promise.all(hits.map((hit) => navigator.hydrate(hit.id)));
  assert.deepEqual(entities.map((entity) => entity?.identity.pubChemCid), [4091, 156391]);
  assert.equal(requested.length, 4, "exactly two alphabetic shards should hydrate");
  assert.deepEqual(
    new Set(requested.slice(2).map((url) => url.match(/alphabetic\/([^/]+)\.json$/)?.[1])),
    new Set(["m", "n"]),
  );
  assert.ok(!requested.some((url) => url.endsWith(".sdf")));
});

test("indexed browse is deterministic and exposes bounded cursors", async () => {
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: localCatalogFetch([]),
  });
  const manifest = await navigator.manifest();
  const first = await navigator.browse(0, 7);
  const second = await navigator.browse(first.nextOffset, 7);

  assert.equal(first.total, manifest.recordCount);
  assert.equal(first.offset, 0);
  assert.equal(first.previousOffset, null);
  assert.equal(first.records.length, 7);
  assert.equal(second.offset, 7);
  assert.equal(second.previousOffset, 0);
  assert.equal(new Set([...first.records, ...second.records].map((record) => record.id)).size, 14);
  assert.deepEqual(
    first.records.map((record) => record.preferredName),
    [...first.records]
      .map((record) => record.preferredName)
      .sort((left, right) => left.localeCompare(right, "en")),
  );
});

test("runtime hydration remains bounded and imported classifications fail closed", async () => {
  const requested = [];
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: localCatalogFetch(requested),
  });
  const first = (await navigator.browse(0, 1)).records[0];
  assert.ok(first);
  const entity = await navigator.hydrate(first.id);
  assert.ok(entity);

  let retained = [];
  for (let index = 0; index < MAX_RUNTIME_HYDRATED_RECORDS + 2; index += 1) {
    retained = retainHydratedCatalogEntity(retained, {
      ...entity,
      id: `${entity.id}:${index}`,
    });
  }
  assert.equal(retained.length, MAX_RUNTIME_HYDRATED_RECORDS);
  assert.ok(retained.at(-1)?.id.endsWith(`:${MAX_RUNTIME_HYDRATED_RECORDS + 1}`));
  retained = retainHydratedCatalogEntity(retained, retained[0]);
  assert.equal(new Set(retained.map((record) => record.id)).size, retained.length);

  const view = createExpandedExploreMolecule(entity, "en", "/dev-molecules/");
  assert.equal(view.category, "Candidate records");
  assert.equal(view.studentProfile.scaffoldDetail, "Candidate records");
  assert.equal(view.lensKeys.therapeutic, "candidate-records");
  assert.equal(view.lensValues["structural-similarity"], "Representative structures");
  assert.equal(view.lensKeys["structural-similarity"], "representative-structures");
  assert.equal(view.reviewerLensKeys.therapeutic, "unclassified");
  assert.match(view.reviewerLensValues.therapeutic, /^Unclassified/);
  assert.ok(view.lensAliases.therapeutic.includes("Unclassified · curation pending"));
  assert.equal(
    view.studentProfile.nomenclatureLesson,
    "No reviewed molecule-specific nomenclature lesson is available yet.",
  );
  assert.ok(!view.studentProfile.nomenclatureLesson.includes(view.studentProfile.functionalGroups[0] ?? "\u0000"));
  assert.equal(view.structuralNeighbors.length, 0);
  assert.match(view.structure.threeDUrl, /^\/dev-molecules\/catalog\//);

  const turkishView = createExpandedExploreMolecule(entity, "tr", "/dev-molecules/");
  assert.equal(turkishView.category, "Aday kayıtlar");
  assert.equal(turkishView.lensKeys.therapeutic, "candidate-records");
  assert.equal(turkishView.lensValues["structural-similarity"], "Temsilî yapılar");
  assert.equal(turkishView.lensKeys["structural-similarity"], "representative-structures");
  assert.match(turkishView.reviewerLensValues.therapeutic, /^Sınıflandırılmamış/);
});

test("snapshot mismatch gates indexed results before entity hydration", async () => {
  const requested = [];
  const fetchImpl = async (request) => {
    const url = String(request);
    requested.push(url);
    const filename = url.endsWith("manifest.json") ? "manifest.json" : "search-index.v1.json";
    const value = JSON.parse(
      await readFile(path.join(publicRoot, "catalog", filename), "utf8"),
    );
    if (filename === "search-index.v1.json") value.snapshotId = "different-snapshot";
    return new Response(JSON.stringify(value), { status: 200 });
  };
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl,
  });
  await assert.rejects(() => navigator.search("aspirin"), /snapshot does not match/i);
  assert.equal(requested.length, 2);
});

test("default browser fetch keeps the Window/global receiver", async () => {
  const originalFetch = globalThis.fetch;
  const receivers = [];
  try {
    globalThis.fetch = function runtimeFetch(request) {
      receivers.push(this);
      const url = String(request);
      const value = url.endsWith("manifest.json")
        ? {
            schemaVersion: 1,
            snapshotId: "receiver-fixture",
            recordCount: 1,
            searchIndex: "search-index.v1.json",
            structureLoading: "per-molecule-lazy",
            shards: [],
          }
        : {
            schemaVersion: 1,
            snapshotId: "receiver-fixture",
            records: [{
              id: "molecule:fixture",
              preferredName: "Fixture",
              aliases: [],
              formula: "C",
              inchiKey: "FIXTURE",
              pubChemCid: 1,
              tokens: ["fixture"],
              shardIds: [],
            }],
          };
      return Promise.resolve(new Response(JSON.stringify(value), { status: 200 }));
    };
    const navigator = new IndexedCatalogNavigator();
    await navigator.manifest();
    assert.deepEqual(receivers, [globalThis, globalThis]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
