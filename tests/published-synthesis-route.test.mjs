import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { loadPublishedSynthesisRouteCount, loadPublishedSynthesisRoutes } = await tsImport(
  "../lib/application/published-synthesis-route.ts",
  import.meta.url,
);

const expected = {
  catalogEntityId: "catalog-entity:published-example",
  coverageId: "synthesis-coverage:published-example",
  pubChemCid: 123456,
  inchiKey: "ABCDEFGHIJKLMN-ABCDEFGHIJ-A",
};

const reference = {
  routeId: "synthesis-route:synthetic-test-only-published-example",
  routeType: "literature_reported",
  routeCompleteness: "complete",
  reviewState: "verified",
  licenseState: "permitted",
};

const indexEntry = {
  routeId: reference.routeId,
  routeType: reference.routeType,
  routeCompleteness: reference.routeCompleteness,
  reviewState: reference.reviewState,
  publicationState: "reported_route",
  numberOfSteps: 2,
  startingMaterials: ["Starting material A", "Starting material B"],
  startBoundary: "Declared source boundary",
  stereochemicalStrategy: "Source-declared stereochemical strategy",
  keyTransformations: ["First transformation", "Second transformation"],
  sourceYear: 2020,
  blockerCodes: [],
  detailPath: "/catalog/synthesis/routes/published-example.json",
};

const detail = {
  schemaVersion: 1,
  routeId: reference.routeId,
  coverageId: expected.coverageId,
  identity: {
    catalogEntityId: expected.catalogEntityId,
    pubChemCid: expected.pubChemCid,
    inchiKey: expected.inchiKey,
  },
  applicability: "applicable",
  routeCompleteness: reference.routeCompleteness,
  reviewState: reference.reviewState,
  licenseState: reference.licenseState,
  routeType: reference.routeType,
  publicationState: "reported_route",
  title: "Published example route",
  startBoundary: indexEntry.startBoundary,
  stereochemicalStrategy: indexEntry.stereochemicalStrategy,
  targetMaterialId: "synthesis-material:synthetic-test-only-target",
  materials: [
    {
      id: "synthesis-material:synthetic-test-only-start-a",
      role: "starting_material",
      label: "Starting material A",
    },
    {
      id: "synthesis-material:synthetic-test-only-start-b",
      role: "starting_material",
      label: "Starting material B",
    },
    {
      id: "synthesis-material:synthetic-test-only-intermediate",
      role: "intermediate",
      label: "Intermediate",
    },
    {
      id: "synthesis-material:synthetic-test-only-target",
      role: "target_parent",
      label: "Target",
    },
  ],
  steps: [
    {
      id: "synthesis-route-step:synthetic-test-only-published-example-01",
      order: 1,
      reactantMaterialIds: ["synthesis-material:synthetic-test-only-start-a", "synthesis-material:synthetic-test-only-start-b"],
      productMaterialIds: ["synthesis-material:synthetic-test-only-intermediate"],
      transformation: "First transformation",
      evidenceStatus: "direct_reported",
      reviewState: "verified",
      citationIndexes: [0],
    },
    {
      id: "synthesis-route-step:synthetic-test-only-published-example-02",
      order: 2,
      reactantMaterialIds: ["synthesis-material:synthetic-test-only-intermediate"],
      productMaterialIds: ["synthesis-material:synthetic-test-only-target"],
      transformation: "Second transformation",
      evidenceStatus: "direct_reported",
      reviewState: "verified",
      citationIndexes: [0],
    },
  ],
  citations: [{
    label: "Public source citation",
    url: "https://example.test/source",
    locator: {
      kind: "journal_scheme",
      value: "Scheme 1",
      page: "2",
      scheme: "1",
      example: null,
    },
    supportScope: "complete_route",
    licenseState: "permitted",
    reuseMode: "redistributable",
  }],
  safety: { operationalDetailsIncluded: false },
};

const jsonResponse = (value, status = 200) => new Response(
  JSON.stringify(value),
  { status, headers: { "Content-Type": "application/json" } },
);

const validIndex = (routes = [indexEntry]) => ({
  schemaVersion: 1,
  generatedAt: "2026-08-27T18:00:00.000Z",
  routes,
});

test("published detail count is derived from the same validated public index", async () => {
  const requested = [];
  const count = await loadPublishedSynthesisRouteCount({
    assetBasePath: "/dev-molecules/",
    fetchImpl: async (url) => {
      requested.push(String(url));
      return jsonResponse(validIndex([indexEntry]));
    },
  });
  assert.equal(count, 1);
  assert.deepEqual(requested, ["/dev-molecules/catalog/synthesis/routes/index.json"]);
});

test("published detail count fails closed when the index is unavailable or malformed", async () => {
  await assert.rejects(
    loadPublishedSynthesisRouteCount({
      fetchImpl: async () => jsonResponse({ schemaVersion: 1, routes: [] }),
    }),
    /Unsupported published synthesis route index/u,
  );
});

test("empty coverage references remain coverage-only without requesting the route index", async () => {
  let requestCount = 0;
  const result = await loadPublishedSynthesisRoutes(expected, [], {
    fetchImpl: async () => {
      requestCount += 1;
      throw new Error("must not fetch");
    },
  });
  assert.equal(result.state, "coverage_only");
  assert.deepEqual(result.routes, []);
  assert.equal(requestCount, 0);
});

test("an empty generated eligible index remains coverage-only and never guesses a detail path", async () => {
  const requested = [];
  const result = await loadPublishedSynthesisRoutes(expected, [reference], {
    assetBasePath: "/dev-molecules/",
    fetchImpl: async (url) => {
      requested.push(String(url));
      return jsonResponse(validIndex([]));
    },
  });
  assert.equal(result.state, "coverage_only");
  assert.deepEqual(requested, ["/dev-molecules/catalog/synthesis/routes/index.json"]);
});

test("eligible detail is fetched only from its safe index path and projected as a linear route", async () => {
  const requested = [];
  const result = await loadPublishedSynthesisRoutes(expected, [reference], {
    assetBasePath: "/dev-molecules/",
    fetchImpl: async (url) => {
      requested.push(String(url));
      return String(url).endsWith("/routes/index.json")
        ? jsonResponse(validIndex())
        : jsonResponse(detail);
    },
  });
  assert.equal(result.state, "available");
  assert.deepEqual(requested, [
    "/dev-molecules/catalog/synthesis/routes/index.json",
    "/dev-molecules/catalog/synthesis/routes/published-example.json",
  ]);
  assert.deepEqual(result.routes[0].steps.map((step) => ({
    reactants: step.reactants.map((material) => material.label),
    transformation: step.transformation,
    products: step.products.map((material) => material.label),
    evidenceMode: step.evidenceMode,
  })), [
    {
      reactants: ["Starting material A", "Starting material B"],
      transformation: "First transformation",
      products: ["Intermediate"],
      evidenceMode: "direct_reported",
    },
    {
      reactants: ["Intermediate"],
      transformation: "Second transformation",
      products: ["Target"],
      evidenceMode: "direct_reported",
    },
  ]);
});

test("unsafe or null detail paths fail closed before any detail request", async () => {
  for (const unsafePath of [
    null,
    "https://example.test/route.json",
    "/catalog/synthesis/routes/../private.json",
    "/catalog/synthesis/routes/route.json?draft=true",
  ]) {
    const requested = [];
    await assert.rejects(
      loadPublishedSynthesisRoutes(expected, [reference], {
        fetchImpl: async (url) => {
          requested.push(String(url));
          return jsonResponse(validIndex([{ ...indexEntry, detailPath: unsafePath }]));
        },
      }),
      /publication gate/u,
    );
    assert.deepEqual(requested, ["/catalog/synthesis/routes/index.json"]);
  }
});

test("review, license, identity, route, and safety mismatches fail closed", async () => {
  const mutations = [
    { ...detail, reviewState: "pending" },
    { ...detail, licenseState: "link_only" },
    { ...detail, identity: { ...detail.identity, pubChemCid: 999 } },
    { ...detail, routeId: "synthesis-route:synthetic-test-only-other-published-example" },
    { ...detail, safety: { operationalDetailsIncluded: true } },
  ];
  for (const mutatedDetail of mutations) {
    await assert.rejects(
      loadPublishedSynthesisRoutes(expected, [reference], {
        fetchImpl: async (url) => String(url).endsWith("/routes/index.json")
          ? jsonResponse(validIndex())
          : jsonResponse(mutatedDetail),
      }),
    );
  }
});

test("route summary and detail must agree on transformations and target topology", async () => {
  await assert.rejects(
    loadPublishedSynthesisRoutes(expected, [reference], {
      fetchImpl: async (url) => String(url).endsWith("/routes/index.json")
        ? jsonResponse(validIndex())
        : jsonResponse({
          ...detail,
          steps: detail.steps.map((step, index) => index === 1
            ? { ...step, transformation: "Different transformation" }
            : step),
        }),
    }),
    /sequence does not match/u,
  );
});
