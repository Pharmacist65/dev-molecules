import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  getAvailableAtlasFilterFacets,
  loadDrugAtlasWindow,
} = await tsImport("../lib/application/drug-atlas.ts", import.meta.url);

const hits = Array.from({ length: 30 }, (_, index) => ({
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
      return hits
        .filter((hit) => hit.preferredName.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);
    },
    async browse(offset, limit) {
      calls.push(["browse", offset, limit]);
      return {
        records: hits.slice(offset, offset + limit),
        offset,
        total: 1552,
        nextOffset: offset + limit < 1552 ? offset + limit : null,
        previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
      };
    },
  };
}

test("Drug Atlas reads a bounded page while preserving the exact complete-index count", async () => {
  const navigator = createNavigator();
  const page = await loadDrugAtlasWindow(navigator, {
    pageSize: 24,
    unclassifiedLabel: "Unclassified",
    identityCoverageLabel: "Identity indexed",
  });

  assert.equal(page.mode, "browse");
  assert.equal(page.catalogTotal, 1552);
  assert.equal(page.records.length, 24);
  assert.deepEqual(page.records[0].coverage, [{
    id: "catalog-identity",
    label: "Identity indexed",
    status: "available",
  }]);
  assert.deepEqual(navigator.calls, [["browse", 0, 24]]);
});

test("optional coverage fails closed without hiding the catalog record", async () => {
  const page = await loadDrugAtlasWindow(createNavigator(), {
    query: "Fixture 01",
    unclassifiedLabel: "Unclassified",
    identityCoverageLabel: "Identity indexed",
    resolveCoverage() {
      throw new Error("optional enrichment unavailable");
    },
  });

  assert.equal(page.records.length, 1);
  assert.deepEqual(page.records[0].coverage.map((chip) => chip.id), ["catalog-identity"]);
});

test("filters appear only with source-backed full-index counts", () => {
  const facets = getAvailableAtlasFilterFacets([
    {
      id: "atc",
      label: "ATC",
      sourceLabel: "WHO ATC/DDD Index",
      sourceHref: "https://www.whocc.no/atc_ddd_index/",
      reviewStatus: "source-supported",
      options: [
        { id: "c", label: "Cardiovascular", count: 120 },
        { id: "empty", label: "Empty", count: 0 },
      ],
    },
    {
      id: "adme",
      label: "ADME",
      sourceLabel: "",
      sourceHref: "https://example.org/adme",
      reviewStatus: "source-supported",
      options: [{ id: "yes", label: "Available", count: 6 }],
    },
    {
      id: "pending",
      label: "Pending taxonomy",
      sourceLabel: "Draft",
      sourceHref: "https://example.org/draft",
      reviewStatus: "pending-review",
      options: [{ id: "draft", label: "Draft", count: 10 }],
    },
  ]);

  assert.equal(facets.length, 1);
  assert.equal(facets[0].id, "atc");
  assert.deepEqual(facets[0].options.map((option) => option.id), ["c"]);
});

test("Browse is static while Spatial and MoleculeUniverse stay behind a lazy branch", async () => {
  const [atlas, barrel, spatial, thumbnail, css] = await Promise.all([
    readFile(new URL("../components/atlas/DrugAtlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/AtlasSpatialView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/AtlasStructureThumbnail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/DrugAtlas.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(atlas, /defaultView = "browse"/);
  assert.match(atlas, /lazy\(\(\) => import\("\.\/AtlasSpatialView"\)\)/);
  assert.doesNotMatch(atlas, /from "@\/components\/universe"/);
  assert.doesNotMatch(barrel, /AtlasSpatialView/);
  assert.match(spatial, /from "@\/components\/universe"/);
  assert.match(spatial, /<MoleculeUniverse/);
  assert.match(thumbnail, /IntersectionObserver/);
  assert.match(thumbnail, /navigator\s*\.hydrate\(entityId\)/);
  assert.match(atlas, /role="tablist"/);
  assert.match(atlas, /ArrowDown/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
