import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  hasExactCtabAtomIndexMapping,
  parseSdfV2000,
} from "../lib/structure/sdf.ts";

const FIXTURE_DIRECTORY = new URL("../public/structures/pubchem/", import.meta.url);

test("parses fixed-width V2000 atoms, bonds, charges and provenance fields", () => {
  const sdf = [
    "charged-example",
    "  TestWriter  3D",
    "real coordinates",
    "  3  2  0  0  0  0            999 V2000",
    "    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
    "    1.2500    0.0000    0.3500 N   0  3  0  0  0  0  0  0  0  0  0  0",
    "   -1.1000    0.1000   -0.2500 O   0  0  0  0  0  0  0  0  0  0  0  0",
    "  1  2  1  0  0  0  0",
    "  1  3  2  0  0  0  0",
    "M  CHG  1   3  -1",
    "M  ISO  1   2  15",
    "M  END",
    "> <SOURCE_ID>",
    "example-42",
    "",
    "$$$$",
  ].join("\n");

  const structure = parseSdfV2000(sdf);

  assert.equal(structure.title, "charged-example");
  assert.equal(structure.dimension, "3d");
  assert.equal(structure.atoms.length, 3);
  assert.equal(structure.bonds.length, 2);
  assert.deepEqual(
    structure.atoms.map(({ element, formalCharge }) => ({ element, formalCharge })),
    [
      { element: "C", formalCharge: 0 },
      { element: "N", formalCharge: 1 },
      { element: "O", formalCharge: -1 },
    ],
  );
  assert.equal(structure.bonds[1].order, 2);
  assert.equal(structure.atoms[1].isotope, 15);
  assert.equal(structure.properties.SOURCE_ID, "example-42");
});

test("parses every checked-in PubChem structure without inventing connectivity", async () => {
  const fixtureNames = (await readdir(FIXTURE_DIRECTORY))
    .filter((name) => name.endsWith(".sdf"))
    .sort();

  assert.ok(fixtureNames.length > 0, "expected checked-in PubChem SDF assets");

  for (const fixtureName of fixtureNames) {
    const text = await readFile(new URL(fixtureName, FIXTURE_DIRECTORY), "utf8");
    const structure = parseSdfV2000(text);

    assert.ok(structure.atoms.length > 0, `${fixtureName}: atoms`);
    assert.ok(structure.bonds.length > 0, `${fixtureName}: bonds`);
    assert.ok(
      structure.bonds.every(
        (bond) =>
          bond.atomA >= 0 &&
          bond.atomA < structure.atoms.length &&
          bond.atomB >= 0 &&
          bond.atomB < structure.atoms.length,
      ),
      `${fixtureName}: bond indices`,
    );
    assert.equal(
      structure.dimension,
      fixtureName.includes("-3d.") ? "3d" : "2d",
      `${fixtureName}: declared coordinate dimension`,
    );
  }
});

test("keeps the PubChem CID 1978 atom and bond records exact", async () => {
  const text = await readFile(new URL("cid-1978-3d.sdf", FIXTURE_DIRECTORY), "utf8");
  const structure = parseSdfV2000(text);

  assert.equal(structure.title, "1978");
  assert.equal(structure.atoms.length, 52);
  assert.equal(structure.bonds.length, 52);
  assert.equal(structure.properties.PUBCHEM_COMPOUND_CID, "1978");
});

test("retains directional V2000 stereo bonds from canonical PubChem 2D records", async () => {
  const [timololText, nadololText] = await Promise.all([
    readFile(new URL("cid-33624-2d.sdf", FIXTURE_DIRECTORY), "utf8"),
    readFile(new URL("cid-39147-2d.sdf", FIXTURE_DIRECTORY), "utf8"),
  ]);
  const timolol = parseSdfV2000(timololText);
  const nadolol = parseSdfV2000(nadololText);

  assert.equal(timolol.bonds.filter((bond) => bond.stereo === 1).length, 1);
  assert.equal(nadolol.bonds.filter((bond) => bond.stereo === 6).length, 2);
});

test("enables cross-view highlighting only for exact CTAB atom-index mappings", async () => {
  const [twoDText, threeDText] = await Promise.all([
    readFile(new URL("cid-1978-2d.sdf", FIXTURE_DIRECTORY), "utf8"),
    readFile(new URL("cid-1978-3d.sdf", FIXTURE_DIRECTORY), "utf8"),
  ]);
  const twoD = parseSdfV2000(twoDText);
  const threeD = parseSdfV2000(threeDText);

  assert.equal(hasExactCtabAtomIndexMapping(twoD, threeD), true);
  assert.equal(
    hasExactCtabAtomIndexMapping(twoD, {
      ...threeD,
      atoms: [...threeD.atoms].reverse(),
    }),
    false,
  );
  assert.equal(
    hasExactCtabAtomIndexMapping(twoD, {
      ...threeD,
      bonds: threeD.bonds.slice(1),
    }),
    false,
  );
});

test("fails closed for unsupported or truncated structure data", () => {
  assert.throws(() => parseSdfV2000(""), /boş/i);
  assert.throws(
    () => parseSdfV2000("example\nwriter\n\n  0  0  0  0  0  0 V3000"),
    /V3000/i,
  );
  assert.throws(
    () =>
      parseSdfV2000(
        "example\nwriter\n\n  2  1  0  0  0  0            999 V2000\n",
      ),
    /kısa/i,
  );
});
