import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { selectViewportSceneCandidateIds } = await tsImport(
  "../lib/application/explore-viewport.ts",
  import.meta.url,
);
const {
  STRUCTURE_GRAPH_COMPARISON_VERSION,
  compareStructureGraphs,
} = await tsImport("../lib/application/structure-comparison.ts", import.meta.url);
const { parseSdfV2000 } = await tsImport("../lib/structure/sdf.ts", import.meta.url);

const camera = {
  position: { x: 0, y: 0, z: 20 },
  target: { x: 0, y: 0, z: 0 },
  fov: 42,
};

test("near LOD is selected from the current viewport instead of catalog order", () => {
  const candidates = [
    { id: "offscreen-first", position: { x: 80, y: 80 } },
    { id: "edge", position: { x: 8, y: 1 } },
    { id: "center", position: { x: 0.2, y: 0.1 } },
    { id: "near", position: { x: 2, y: 1 } },
  ];
  const selected = selectViewportSceneCandidateIds({
    candidates,
    camera,
    viewportAspect: 16 / 9,
    limit: 2,
  });
  assert.deepEqual(selected, ["center", "near"]);
  assert.ok(!selected.includes("offscreen-first"));
});

test("panned viewport chooses the nearest visible records and stays bounded", () => {
  const candidates = Array.from({ length: 100 }, (_, index) => ({
    id: `molecule:${index}`,
    position: { x: index - 50, y: 0 },
  }));
  const selected = selectViewportSceneCandidateIds({
    candidates,
    camera: { ...camera, target: { x: 25, y: 0, z: 0 } },
    viewportAspect: 1,
    limit: 7,
  });
  assert.equal(selected.length, 7);
  assert.equal(selected[0], "molecule:75");
  assert.ok(selected.every((id) => Number(id.split(":")[1]) >= 68));
});

test("real sourced SDF graphs produce explicit common and changed atom masks", async () => {
  const [propranololSource, atenololSource] = await Promise.all([
    readFile(new URL("../public/structures/pubchem/cid-4946-3d.sdf", import.meta.url), "utf8"),
    readFile(new URL("../public/structures/pubchem/cid-2249-3d.sdf", import.meta.url), "utf8"),
  ]);
  const structures = [
    { id: "molecule:propranolol", structure: parseSdfV2000(propranololSource, "3d") },
    { id: "molecule:atenolol", structure: parseSdfV2000(atenololSource, "3d") },
  ];
  const analysis = compareStructureGraphs(structures);

  assert.equal(analysis.method, STRUCTURE_GRAPH_COMPARISON_VERSION);
  assert.ok(analysis.commonCoreAtomCount > 0);
  assert.ok(analysis.commonCoreBondCount > 0);
  assert.equal(analysis.masks.length, 2);
  for (const [index, mask] of analysis.masks.entries()) {
    const heavyAtomCount = structures[index].structure.atoms.filter(
      (atom) => atom.element !== "H",
    ).length;
    assert.equal(
      new Set([...mask.commonAtomIndices, ...mask.changedAtomIndices]).size,
      heavyAtomCount,
    );
    assert.ok(mask.changedAtomIndices.length > 0);
  }
  assert.match(analysis.limitation, /not an exact maximum-common-substructure/i);
});

test("graph comparison rejects invalid group size and duplicate identities", () => {
  const structure = {
    title: "fixture",
    program: "test",
    comment: "",
    dimension: "3d",
    atoms: [],
    bonds: [],
    properties: {},
  };
  assert.throws(() => compareStructureGraphs([{ id: "one", structure }]), /two to four/i);
  assert.throws(
    () => compareStructureGraphs([
      { id: "same", structure },
      { id: "same", structure },
    ]),
    /unique/i,
  );
});
