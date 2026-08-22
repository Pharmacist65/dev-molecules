import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { SdfResourceCache } = await tsImport(
  "../lib/structure/sdf-resource.ts",
  import.meta.url,
);

function sdfFor(
  title,
  {
    cid = 101,
    dimension = "2d",
    includeCid = true,
    sourceRecordId,
  } = {},
) {
  const lines = [
    title,
    `  PreviewResource ${dimension.toUpperCase()}`,
    "",
    "  2  1  0  0  0  0            999 V2000",
    "    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
    dimension === "3d"
      ? "    1.2000    0.0000    0.2500 O   0  0  0  0  0  0  0  0  0  0  0  0"
      : "    1.2000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0",
    "  1  2  1  0  0  0  0",
    "M  END",
  ];
  if (includeCid) lines.push("> <PUBCHEM_COMPOUND_CID>", String(cid), "");
  if (sourceRecordId) lines.push("> <SOURCE_RECORD_ID>", sourceRecordId, "");
  lines.push("$$$$");
  return lines.join("\n");
}

test("2D preview resource rejects a parseable SDF with the wrong PubChem CID", async () => {
  const cache = new SdfResourceCache(4, async () => sdfFor("wrong", { cid: 202 }));

  await assert.rejects(
    cache.get("/cid-101-2d.sdf", {
      expectedDimension: "2d",
      expectedPubChemCid: 101,
    }),
    /PubChem CID 202 does not match expected PubChem CID 101/,
  );
  assert.equal(cache.size, 0, "identity failures must be evicted");
});

test("2D preview resource rejects a 3D SDF served from a 2D URL", async () => {
  const cache = new SdfResourceCache(4, async () =>
    sdfFor("wrong-dimension", { cid: 101, dimension: "3d" }),
  );

  await assert.rejects(
    cache.get("/cid-101-2d.sdf", {
      expectedDimension: "2d",
      expectedPubChemCid: 101,
    }),
    /dimension 3d does not match required 2d/,
  );
  assert.equal(cache.size, 0, "dimension failures must be evicted");
});

test("2D preview resource accepts a matching PubChem 2D record", async () => {
  const cache = new SdfResourceCache(4, async () => sdfFor("valid", { cid: 101 }));

  const structure = await cache.get("/cid-101-2d.sdf", {
    expectedDimension: "2d",
    expectedPubChemCid: 101,
  });

  assert.equal(structure.title, "valid");
  assert.equal(structure.dimension, "2d");
  assert.equal(structure.properties.PUBCHEM_COMPOUND_CID, "101");
});

test("generic non-PubChem 2D records work when no PubChem identity is expected", async () => {
  const cache = new SdfResourceCache(4, async () =>
    sdfFor("private", {
      includeCid: false,
      sourceRecordId: "teaching-record-7",
    }),
  );

  const structure = await cache.get("/private-2d.sdf", {
    expectedDimension: "2d",
  });

  assert.equal(structure.title, "private");
  assert.equal(structure.dimension, "2d");
  assert.equal(structure.properties.PUBCHEM_COMPOUND_CID, undefined);
});

test("source-agnostic identity and cache keys prevent cross-record reuse", async () => {
  let loads = 0;
  const cache = new SdfResourceCache(4, async () => {
    loads += 1;
    return sdfFor("private", {
      includeCid: false,
      sourceRecordId: "teaching-record-7",
    });
  });

  const identity = {
    propertyName: "SOURCE_RECORD_ID",
    expectedValue: "teaching-record-7",
    label: "source record ID",
  };
  await cache.get("/shared-private.sdf", {
    expectedDimension: "2d",
    expectedIdentity: identity,
  });
  await assert.rejects(
    cache.get("/shared-private.sdf", {
      expectedDimension: "2d",
      expectedIdentity: { ...identity, expectedValue: "teaching-record-8" },
    }),
    /source record ID teaching-record-7 does not match expected teaching-record-8/,
  );

  assert.equal(loads, 2);
  assert.equal(cache.size, 1, "only the valid identity-scoped record remains cached");
});
