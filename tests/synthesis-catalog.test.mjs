import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { resolveSynthesisCatalogSelection } = await tsImport(
  "../lib/application/synthesis-catalog.ts",
  import.meta.url,
);

const hit = {
  id: "molecule:imported:example-abcdefghijklmn-abcdefghij-a",
  stableSlug: "example-abcdefghijklmn-abcdefghij-a",
  preferredName: "Example molecule",
  aliases: ["Example"],
  formula: "C10H12O",
  pubChemCid: 123,
};

const entity = {
  id: hit.id,
  preferredName: hit.preferredName,
  aliases: hit.aliases,
  identity: {
    pubChemCid: hit.pubChemCid,
    inchiKey: "ABCDEFGHIJKLMN-ABCDEFGHIJ-A",
    molecularFormula: hit.formula,
    canonicalSmiles: "CCOC",
    isomericSmiles: null,
  },
  structures: {
    twoD: {
      path: "/catalog/structures/example-2d.sdf",
      sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/123",
      sha256: "a".repeat(64),
      byteLength: 1200,
    },
    threeD: {
      path: "/catalog/structures/example-3d.sdf",
      sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/123",
      sha256: "b".repeat(64),
      byteLength: 1400,
    },
  },
  provenance: { snapshotId: "catalog-snapshot-v1" },
};

const navigator = (overrides = {}) => ({
  async resolveStableSlug(slug) {
    return slug === hit.stableSlug ? hit : null;
  },
  async search() { return [hit]; },
  async hydrate(id) { return id === hit.id ? entity : null; },
  ...overrides,
});

test("all-catalog synthesis selection resolves exact identity and coverage without name inference", async () => {
  const requests = [];
  const coverage = { coverageId: "synthesis-coverage:example" };
  const selection = await resolveSynthesisCatalogSelection(
    hit.stableSlug,
    navigator(),
    {
      assetBasePath: "/dev-molecules/",
      async coverageLoader(identity, assetBasePath) {
        requests.push({ identity, assetBasePath });
        return coverage;
      },
    },
  );
  assert.equal(selection.catalogEntityId, hit.id);
  assert.equal(selection.catalogSnapshotId, "catalog-snapshot-v1");
  assert.equal(selection.preferredName, hit.preferredName);
  assert.equal(selection.coverage, coverage);
  assert.equal(selection.coverageLoadState, "ready");
  assert.equal(selection.canonicalSmiles, "CCOC");
  assert.equal(selection.structures.twoD.publicPath, "/dev-molecules/catalog/structures/example-2d.sdf");
  assert.equal(selection.structures.twoD.origin, "database-2d-record");
  assert.equal(selection.structures.twoD.provenance, "source_record");
  assert.equal(selection.structures.threeD.origin, "computed-3d-conformer");
  assert.equal(selection.structures.threeD.provenance, "computed");
  assert.deepEqual(requests, [{
    identity: {
      catalogEntityId: hit.id,
      catalogSnapshotId: "catalog-snapshot-v1",
      pubChemCid: 123,
      inchiKey: "ABCDEFGHIJKLMN-ABCDEFGHIJ-A",
    },
    assetBasePath: "/dev-molecules/",
  }]);
});

test("curated aliases bridge only through exact CID and InChIKey", async () => {
  const fallbackIdentity = {
    curatedMoleculeId: "molecule:example",
    preferredName: "Example",
    pubChemCid: 123,
    inchiKey: "ABCDEFGHIJKLMN-ABCDEFGHIJ-A",
  };
  const selection = await resolveSynthesisCatalogSelection(
    "example",
    navigator({ async resolveStableSlug() { return null; } }),
    { fallbackIdentity, async coverageLoader() { return null; } },
  );
  assert.equal(selection.curatedMoleculeId, "molecule:example");
  assert.equal(selection.coverageLoadState, "not_published");

  const drifted = await resolveSynthesisCatalogSelection(
    "example",
    navigator({
      async resolveStableSlug() { return null; },
      async hydrate() {
        return {
          ...entity,
          identity: { ...entity.identity, inchiKey: "ZZZZZZZZZZZZZZ-ABCDEFGHIJ-A" },
        };
      },
    }),
    { fallbackIdentity, async coverageLoader() { return null; } },
  );
  assert.equal(drifted, null);
});

test("coverage transport failure remains unavailable and never becomes no-source", async () => {
  const selection = await resolveSynthesisCatalogSelection(
    hit.stableSlug,
    navigator(),
    { async coverageLoader() { throw new Error("offline"); } },
  );
  assert.equal(selection.coverage, null);
  assert.equal(selection.coverageLoadState, "unavailable");
});

test("Synthesis Academy exposes complete-index search without importing pending route fixtures", async () => {
  const [hub, atlas, app, academy, instructor] = await Promise.all([
    readFile(new URL("../components/synthesis/SynthesisAcademyHub.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/SynthesisAtlas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/DevMoleculesApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/academy/AcademyHub.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/application/instructor-hub.ts", import.meta.url), "utf8"),
  ]);
  assert.match(hub, /data-synthesis-catalog-navigator="complete-index"/u);
  assert.match(hub, /data-synthesis-public-coverage-only=/u);
  assert.match(hub, /Public-alpha drafts stay permanently labelled pending here/u);
  assert.match(hub, /loadPublishedSynthesisRouteCount/u);
  assert.match(hub, /data-published-route-details=\{publishedRouteCount \?\?/u);
  assert.doesNotMatch(hub, /data-published-route-details="0"/u);
  assert.match(hub, /searchCatalog\(query, 10\)/u);
  assert.match(hub, /catalogSelection=\{catalogSelection\}/u);
  assert.match(atlas, /data-synthesis-atlas-coverage-only=/u);
  assert.match(atlas, /data-route-detail-gate="generated-artifact-required"/u);
  assert.match(atlas, /loadPublishedSynthesisRoutes/u);
  assert.match(atlas, /className=\{atlas\.srOnly\}/u);
  assert.match(app, /resolveSynthesisCatalogSelection\(route\.slug/u);
  assert.doesNotMatch(app, /synthesisRouteMolecule \? \(/u);
  assert.match(
    await readFile(new URL("../lib/application/synthesis-catalog.ts", import.meta.url), "utf8"),
    /loadBasicRecordSynthesisCoverage\(identity, \{ assetBasePath \}\)/u,
  );
  for (const source of [hub, atlas, app, academy, instructor]) {
    assert.doesNotMatch(source, /(?:data\/synthesis-atlas|synthesis-atlas-challenges|application\/synthesis-curriculum)/u);
  }
});
