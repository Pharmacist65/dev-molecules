import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  DEFAULT_CATALOG_BROWSE_PAGE_SIZE,
  MAX_CATALOG_BROWSE_PAGE_SIZE,
  getCatalogBrowseLabels,
  loadCatalogBrowseWindow,
  normalizeCatalogBrowseQuery,
} = await tsImport("../lib/application/catalog-browse.ts", import.meta.url);
const { IndexedCatalogNavigator } = await tsImport(
  "../lib/application/catalog-expansion.ts",
  import.meta.url,
);

const hits = Array.from({ length: 48 }, (_, index) => ({
  id: `molecule:fixture:${index}`,
  stableSlug: `fixture-${index}`,
  preferredName: `Fixture ${String(index).padStart(2, "0")}`,
  aliases: [],
  formula: index % 2 === 0 ? "C8H9NO2" : "C9H8O4",
  pubChemCid: index + 1,
}));

function createNavigator() {
  const calls = [];
  return {
    calls,
    async manifest() {
      calls.push(["manifest"]);
      return { recordCount: 1552 };
    },
    async search(query, limit) {
      calls.push(["search", query, limit]);
      return hits.filter((hit) => hit.preferredName.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
    },
    async browse(offset, limit) {
      calls.push(["browse", offset, limit]);
      const records = hits.slice(offset, offset + limit);
      return {
        records,
        offset,
        total: 1552,
        nextOffset: offset + records.length < 1552 ? offset + records.length : null,
        previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
      };
    },
  };
}

test("catalog browse keeps the complete index separate from its bounded page", async () => {
  const navigator = createNavigator();
  const page = await loadCatalogBrowseWindow(navigator, {
    pageSize: DEFAULT_CATALOG_BROWSE_PAGE_SIZE,
    unclassifiedLabel: "Unclassified",
  });

  assert.equal(page.mode, "browse");
  assert.equal(page.catalogTotal, 1552);
  assert.equal(page.records.length, DEFAULT_CATALOG_BROWSE_PAGE_SIZE);
  assert.equal(page.offset, 0);
  assert.equal(page.nextOffset, DEFAULT_CATALOG_BROWSE_PAGE_SIZE);
  assert.deepEqual(navigator.calls, [
    ["browse", 0, DEFAULT_CATALOG_BROWSE_PAGE_SIZE],
  ]);
});

test("the production compact index exposes all 1,552 records without loading a shard or SDF", async () => {
  const publicRoot = path.resolve(import.meta.dirname, "../public");
  const requested = [];
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: async (request) => {
      const url = String(request);
      requested.push(url);
      const marker = "/dev-molecules/catalog/";
      try {
        const bytes = await readFile(
          path.join(publicRoot, "catalog", url.slice(marker.length)),
        );
        return new Response(bytes, { status: 200 });
      } catch {
        return new Response("not found", { status: 404 });
      }
    },
  });
  const page = await loadCatalogBrowseWindow(navigator, {
    unclassifiedLabel: "Unclassified",
  });

  assert.equal(page.catalogTotal, 1552);
  assert.equal(page.records.length, DEFAULT_CATALOG_BROWSE_PAGE_SIZE);
  assert.ok(page.records.every((record) => record.classification.status === "unclassified"));
  assert.deepEqual(requested, [
    "/dev-molecules/catalog/manifest.json",
    "/dev-molecules/catalog/search-index.v1.json",
  ]);
  assert.ok(!requested.some((url) => url.includes("/shards/") || url.endsWith(".sdf")));
});

test("the production compact index finds the same record by name, formula and CID", async () => {
  const publicRoot = path.resolve(import.meta.dirname, "../public");
  const requested = [];
  const navigator = new IndexedCatalogNavigator({
    basePath: "/dev-molecules/",
    fetchImpl: async (request) => {
      const url = String(request);
      requested.push(url);
      const marker = "/dev-molecules/catalog/";
      try {
        const bytes = await readFile(
          path.join(publicRoot, "catalog", url.slice(marker.length)),
        );
        return new Response(bytes, { status: 200 });
      } catch {
        return new Response("not found", { status: 404 });
      }
    },
  });

  const [byName, byFormula, byCid] = await Promise.all([
    navigator.search("Acetaminophen"),
    navigator.search("C8H9NO2"),
    navigator.search("1983"),
  ]);
  const expectedId = "molecule:imported:acetaminophen-rzvajinkpmorjf-uhfffaoysa-n";
  assert.ok(byName.some((record) => record.id === expectedId));
  assert.ok(byFormula.some((record) => record.id === expectedId));
  assert.ok(byCid.some((record) => record.id === expectedId));
  assert.ok(!requested.some((url) => url.includes("/shards/") || url.endsWith(".sdf")));
});

test("search reads compact hits without hydrating entities and classifications fail closed", async () => {
  const navigator = createNavigator();
  const page = await loadCatalogBrowseWindow(navigator, {
    query: "  Fixture   01 ",
    pageSize: 12,
    unclassifiedLabel: "Unclassified",
    classify: (hit) => hit.pubChemCid === 2
      ? { status: "known", label: "Analgesic" }
      : { status: "known", label: "" },
  });

  assert.equal(page.mode, "search");
  assert.equal(page.query, "Fixture 01");
  assert.equal(page.records.length, 1);
  assert.deepEqual(page.records[0].classification, {
    status: "known",
    label: "Analgesic",
  });
  assert.deepEqual(navigator.calls, [
    ["search", "Fixture 01", 12],
    ["manifest"],
  ]);

  const fallback = await loadCatalogBrowseWindow(createNavigator(), {
    query: "Fixture 02",
    unclassifiedLabel: "Unclassified",
    classify: () => {
      throw new Error("optional classification source unavailable");
    },
  });
  assert.deepEqual(fallback.records[0].classification, {
    status: "unclassified",
    label: "Unclassified",
  });
});

test("one-character queries preserve the exact count without scanning or hydrating results", async () => {
  const navigator = createNavigator();
  const page = await loadCatalogBrowseWindow(navigator, {
    query: " a ",
    unclassifiedLabel: "Unclassified",
  });

  assert.equal(page.mode, "query-hint");
  assert.equal(page.catalogTotal, 1552);
  assert.deepEqual(page.records, []);
  assert.deepEqual(navigator.calls, [["manifest"]]);
  assert.equal(normalizeCatalogBrowseQuery("  acetyl   salicylic  "), "acetyl salicylic");
});

test("a search/browse-only Universe adapter can reuse the host's exact manifest count", async () => {
  const navigatorWithManifest = createNavigator();
  const universeAdapter = {
    calls: navigatorWithManifest.calls,
    search: navigatorWithManifest.search,
    browse: navigatorWithManifest.browse,
  };
  const page = await loadCatalogBrowseWindow(universeAdapter, {
    query: "Fixture 03",
    catalogRecordCount: 1552,
    unclassifiedLabel: "Unclassified",
  });

  assert.equal(page.catalogTotal, 1552);
  assert.equal(page.records[0].preferredName, "Fixture 03");
  assert.deepEqual(universeAdapter.calls, [
    ["search", "Fixture 03", DEFAULT_CATALOG_BROWSE_PAGE_SIZE],
  ]);
});

test("browse requests reject an unbounded DOM window", async () => {
  await assert.rejects(
    () => loadCatalogBrowseWindow(createNavigator(), {
      pageSize: MAX_CATALOG_BROWSE_PAGE_SIZE + 1,
      unclassifiedLabel: "Unclassified",
    }),
    /page size must be an integer from 1 to 40/i,
  );
});

test("TR and EN copy explicitly distinguish catalog records from the 3D sample", () => {
  const tr = getCatalogBrowseLabels("tr");
  const en = getCatalogBrowseLabels("en");
  assert.match(tr.description, /3B sahne.*sınırlı bir örneklemini/i);
  assert.match(en.description, /3D scene.*bounded sample/i);
  assert.match(tr.description, /1\.552 kayıtlık yapı-bütün indeks/i);
  assert.match(en.description, /1,552-record structure-complete index/i);
  assert.doesNotMatch(`${tr.description} ${en.description}`, /tam katalog|full catalog/i);
  assert.equal(tr.unclassified, "Sınıflandırılmamış");
  assert.equal(en.unclassified, "Unclassified");
});

test("drawer contract includes modal semantics, focus return, Escape, and a mobile sheet", async () => {
  const [component, css] = await Promise.all([
    readFile(new URL("../components/catalog/CatalogBrowseDrawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/catalog/CatalogBrowseDrawer.module.css", import.meta.url), "utf8"),
  ]);
  assert.match(component, /role="dialog"/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /data-catalog-result-count/);
  assert.match(component, /data-scene-sample-count/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /focusBeforeOpen\.focus\(\)/);
  assert.match(component, /focusableSelector/);
  assert.doesNotMatch(component, /error instanceof Error \? error\.message/);
  assert.doesNotMatch(component, /loadState\.message|selectionState\.message/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /height: min\(92dvh, 800px\)/);
});
