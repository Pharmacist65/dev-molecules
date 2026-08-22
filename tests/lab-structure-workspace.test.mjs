import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  createLocalLabProject,
  findExactCatalogIdentityMatch,
  normalizeLabStructureSnapshot,
  rankComputedStructureSimilarity,
} = await tsImport("../lib/application/lab/structure-workspace.ts", import.meta.url);

const index = JSON.parse(
  await readFile(
    new URL("../public/catalog/search-index.v1.json", import.meta.url),
    "utf8",
  ),
);

test("exact catalog matching is InChIKey-bound and fail closed", () => {
  const propranolol = index.records.find((record) => record.pubChemCid === 4946);
  assert.ok(propranolol);
  const exact = findExactCatalogIdentityMatch(index.records, propranolol.inchiKey);
  assert.equal(exact.status, "exact");
  assert.equal(exact.record.pubChemCid, 4946);
  assert.deepEqual(
    findExactCatalogIdentityMatch(index.records, "AAAAAAAAAAAAAA-BBBBBBBBBB-C"),
    { status: "not-found" },
  );
  assert.deepEqual(findExactCatalogIdentityMatch(index.records, "not-an-inchikey"), {
    status: "not-found",
  });
});

test("duplicate identity keys fail closed as ambiguous", () => {
  const record = index.records[0];
  const duplicate = { ...record, id: `${record.id}:duplicate` };
  assert.deepEqual(
    findExactCatalogIdentityMatch([record, duplicate], record.inchiKey),
    { status: "ambiguous", recordIds: [record.id, duplicate.id].sort() },
  );
});

test("structure snapshots require real SMILES, molfile and InChIKey exports", () => {
  const normalized = normalizeLabStructureSnapshot({
    smiles: " CCO ",
    molfile: " molfile ",
    inchiKey: "lfqscwfljhtthz-uhfffaoysa-n",
  });
  assert.equal(normalized.inchiKey, "LFQSCWFLJHTTHZ-UHFFFAOYSA-N");
  assert.throws(() =>
    normalizeLabStructureSnapshot({ smiles: "CCO", molfile: "", inchiKey: "invalid" }),
  );
});

test("similarity is deterministic, bounded and never presented as verified", () => {
  const candidates = [
    { id: "ethanol", name: "Ethanol", canonicalSmiles: "CCO" },
    { id: "benzene", name: "Benzene", canonicalSmiles: "c1ccccc1" },
  ];
  const results = rankComputedStructureSimilarity("CCO", candidates, 2);
  assert.equal(results[0].id, "ethanol");
  assert.equal(results[0].score, 1);
  assert.equal(results[0].reviewStatus, "computed-unreviewed");
  assert.match(results[0].method, /canonical-smiles-path-fingerprint/);
});

test("local export preserves the user-draft and scientific boundary", () => {
  const project = createLocalLabProject({
    generatedAt: "2026-08-23T00:00:00.000Z",
    structure: {
      smiles: "CCO",
      molfile: "molfile",
      inchiKey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N",
    },
    identityMatch: { status: "not-found" },
    similarity: [],
  });
  assert.equal(project.privacy, "device-local-export");
  assert.equal(project.verification, "user-created-draft");
  assert.match(project.limitations.join(" "), /not evidence of novelty/i);
});
