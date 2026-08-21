import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMoleculeCatalog } from "../lib/domain/catalog.ts";
import { getPrimaryClassification } from "../lib/domain/molecule.ts";

test("generic molecule catalog indexes unrelated families without a fixture ceiling", () => {
  const alpha = {
    id: "molecule:alpha",
    identity: { pubChemCid: 101 },
  };
  const omega = {
    id: "molecule:omega",
    identity: { pubChemCid: 909 },
  };
  const catalog = createMoleculeCatalog([alpha, omega]);

  assert.equal(catalog.molecules.length, 2);
  assert.equal(catalog.getById("molecule:omega"), omega);
  assert.equal(catalog.getByPubChemCid(101), alpha);
  assert.equal(catalog.getByPubChemCid(404), undefined);
  assert.throws(
    () => createMoleculeCatalog([alpha, { ...omega, id: "molecule:alpha" }]),
    /Duplicate catalog molecule ID/,
  );
  assert.throws(
    () =>
      createMoleculeCatalog([
        alpha,
        { ...omega, identity: { pubChemCid: alpha.identity.pubChemCid } },
      ]),
    /Duplicate catalog PubChem CID/,
  );
});

test("classification selection is axis-based rather than beta-blocker-specific", () => {
  const molecule = {
    classifications: [
      {
        axis: "therapeutic-area",
        value: "pain-and-inflammation",
        label: "Pain & inflammation",
        isPrimary: true,
      },
      {
        axis: "structural-family",
        value: "arylpropionic-acid",
        label: "Arylpropionic acid",
        isPrimary: true,
      },
    ],
  };

  assert.equal(
    getPrimaryClassification(molecule, "therapeutic-area")?.value,
    "pain-and-inflammation",
  );
  assert.equal(
    getPrimaryClassification(molecule, "structural-family")?.label,
    "Arylpropionic acid",
  );
  assert.equal(getPrimaryClassification(molecule, "target-profile"), undefined);
});

test("production catalog composes both seed families and removes the mandatory beta profile", async () => {
  const [catalogSource, moleculeDomain, betaSource, nsaidSource] = await Promise.all([
    readFile(new URL("../lib/data/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/domain/molecule.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/data/beta-blockers.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/data/nsaids.ts", import.meta.url), "utf8"),
  ]);

  const betaSeedCount = [...betaSource.matchAll(/^\s+cid:\s*(\d+),$/gm)].length;
  const nsaidSeedCount = [...nsaidSource.matchAll(/^\s+cid:\s*(\d+),$/gm)].length;

  assert.ok(betaSeedCount >= 10, "the original seed family must be preserved");
  assert.ok(nsaidSeedCount >= 5, "the second family must remain a real catalog slice");
  assert.ok(betaSeedCount + nsaidSeedCount >= 15, "seed counts are a floor, not a ceiling");
  assert.match(catalogSource, /\.\.\.betaBlockers, \.\.\.nsaids/);
  assert.match(moleculeDomain, /readonly classifications:/);
  assert.match(moleculeDomain, /readonly educationalProfile:/);
  assert.doesNotMatch(moleculeDomain, /readonly betaBlockerProfile:/);

  for (const source of [betaSource, nsaidSource]) {
    const classificationSection = source.match(
      /classifications:\s*\[([\s\S]*?)\n\s*\],\n\s*educationalProfile:/,
    );
    assert.ok(classificationSection, "each family must emit generic classifications");
    assert.match(classificationSection[1], /verification:\s*pending\(/);
    assert.doesNotMatch(
      classificationSection[1],
      /verification:\s*\{\s*status:\s*"verified"/,
      "educational classifications must not be invented as verified science",
    );
  }
});
