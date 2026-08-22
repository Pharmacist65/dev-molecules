import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { BoundedSdfCache } = await tsImport(
  "../components/molecular-scene/sdf-cache.ts",
  import.meta.url,
);
const { MolecularSceneLoadError } = await tsImport(
  "../components/molecular-scene/ThreeJsMolecularSceneAdapter.ts",
  import.meta.url,
);

function sdfFor(
  title,
  { cid = 101, dimension = "3d", declaredCid = String(cid), includeCid = true } = {},
) {
  const lines = [
    title,
    `  SceneCache ${dimension.toUpperCase()}`,
    "",
    "  2  1  0  0  0  0            999 V2000",
    "    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
    dimension === "3d"
      ? "    1.2000    0.0000    0.2500 O   0  0  0  0  0  0  0  0  0  0  0  0"
      : "    1.2000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0",
    "  1  2  1  0  0  0  0",
    "M  END",
  ];
  if (includeCid) {
    lines.push("> <PUBCHEM_COMPOUND_CID>", declaredCid, "");
  }
  lines.push("$$$$");
  return lines.join("\n");
}

test("lazy SDF cache is hard-bounded to forty parsed/in-flight records", async () => {
  let loads = 0;
  const cache = new BoundedSdfCache(99, async (url) => {
    loads += 1;
    const index = Number(url.match(/\d+/)?.[0] ?? 0);
    return sdfFor(url, { cid: index + 1 });
  });

  for (let index = 0; index < 42; index += 1) {
    await cache.get(`/structure-${index}.sdf`, index + 1);
  }

  assert.equal(cache.capacity, 40);
  assert.equal(cache.size, 40);
  assert.equal(loads, 42);
  assert.ok(!cache.keys().includes("/structure-0.sdf"));
  assert.ok(!cache.keys().includes("/structure-1.sdf"));
});

test("cache reuses parsed SDF promises and updates LRU recency", async () => {
  let loads = 0;
  const cache = new BoundedSdfCache(3, async (url) => {
    loads += 1;
    return sdfFor(url, { cid: url.charCodeAt(1) });
  });

  const first = cache.get("/a.sdf", 97);
  const second = cache.get("/a.sdf", 97);
  assert.equal(first, second);
  await first;
  await cache.get("/b.sdf", 98);
  await cache.get("/c.sdf", 99);
  await cache.get("/a.sdf", 97);
  await cache.get("/d.sdf", 100);

  assert.equal(loads, 4);
  assert.deepEqual(cache.keys(), ["/c.sdf", "/a.sdf", "/d.sdf"]);
});

test("failed SDF records are evicted instead of cached as geometry", async () => {
  let attempt = 0;
  const cache = new BoundedSdfCache(4, async () => {
    attempt += 1;
    if (attempt === 1) throw new Error("not found");
    return sdfFor("retry-success", { cid: 808 });
  });

  await assert.rejects(cache.get("/missing.sdf", 808), /not found/);
  assert.equal(cache.size, 0);
  const structure = await cache.get("/missing.sdf", 808);
  assert.equal(structure.title, "retry-success");
  assert.equal(structure.atoms.length, 2);
  assert.equal(structure.bonds.length, 1);
});

test("scene cache rejects 2D records before they can become renderer geometry", async () => {
  const cache = new BoundedSdfCache(4, async () =>
    sdfFor("101", { cid: 101, dimension: "2d" }),
  );

  await assert.rejects(
    cache.get("/cid-101-3d.sdf", 101),
    /dimension 2d does not match required 3d.*CID 101/,
  );
  assert.equal(cache.size, 0);
});

test("non-PubChem 3D structures remain supported when no expected identity is supplied", async () => {
  const cache = new BoundedSdfCache(4, async () =>
    sdfFor("private-record", { includeCid: false }),
  );

  const structure = await cache.get("/private-3d.sdf");
  assert.equal(structure.dimension, "3d");
  assert.equal(structure.title, "private-record");
});

test("scene cache fails closed when PubChem identity is absent, malformed, or mismatched", async (t) => {
  await t.test("missing CID", async () => {
    const cache = new BoundedSdfCache(4, async () =>
      sdfFor("101", { cid: 101, includeCid: false }),
    );
    await assert.rejects(
      cache.get("/missing-cid.sdf", 101),
      /does not declare PUBCHEM_COMPOUND_CID.*CID 101/,
    );
    assert.equal(cache.size, 0);
  });

  await t.test("malformed CID", async () => {
    const cache = new BoundedSdfCache(4, async () =>
      sdfFor("101", { cid: 101, declaredCid: "101abc" }),
    );
    await assert.rejects(cache.get("/malformed-cid.sdf", 101), /invalid PubChem CID: 101abc/);
    assert.equal(cache.size, 0);
  });

  await t.test("different CID", async () => {
    const cache = new BoundedSdfCache(4, async () => sdfFor("202", { cid: 202 }));
    await assert.rejects(
      cache.get("/wrong-cid.sdf", 101),
      /SDF PubChem CID 202 does not match expected PubChem CID 101/,
    );
    assert.equal(cache.size, 0);
  });
});

test("cache identity includes expected PubChem CID and never reuses a valid geometry as another CID", async () => {
  let loads = 0;
  const cache = new BoundedSdfCache(4, async () => {
    loads += 1;
    return sdfFor("303", { cid: 303 });
  });

  await cache.get("/shared-url.sdf", 303);
  await assert.rejects(
    cache.get("/shared-url.sdf", 404),
    /SDF PubChem CID 303 does not match expected PubChem CID 404/,
  );
  assert.equal(loads, 2);
  assert.deepEqual(cache.keys(), ["/shared-url.sdf"]);
});

test("multi-structure load errors identify every molecule and reason", () => {
  const error = new MolecularSceneLoadError([
    { moleculeId: "molecule-alpha", reason: "SDF dimension 2d" },
    { moleculeId: "molecule-beta", reason: "PubChem CID mismatch" },
  ]);

  assert.match(error.message, /molecule-alpha: SDF dimension 2d/);
  assert.match(error.message, /molecule-beta: PubChem CID mismatch/);
  assert.deepEqual(error.failures, [
    { moleculeId: "molecule-alpha", reason: "SDF dimension 2d" },
    { moleculeId: "molecule-beta", reason: "PubChem CID mismatch" },
  ]);
});
