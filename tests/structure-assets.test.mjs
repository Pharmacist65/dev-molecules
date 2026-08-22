import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";
import { createMoleculeStructureProvider } from "../lib/domain/structure.ts";
import { createPubChemStructureSet } from "../lib/data/pubchem-structures.ts";

const assetDirectory = new URL("../public/structures/pubchem/", import.meta.url);

const parseSdf = (contents, filename) => {
  const lines = contents.split(/\r?\n/);
  assert.ok(lines.length > 5, `${filename} must contain an SDF record`);

  const counts = lines[3];
  assert.match(counts, /V2000\s*$/, `${filename} must be SDF V2000`);
  const atomCount = Number.parseInt(counts.slice(0, 3), 10);
  const bondCount = Number.parseInt(counts.slice(3, 6), 10);
  assert.ok(atomCount > 0, `${filename} must contain atoms`);
  assert.ok(bondCount > 0, `${filename} must contain bonds`);

  const atoms = lines.slice(4, 4 + atomCount).map((line) => ({
    z: Number.parseFloat(line.slice(20, 30)),
    element: line.slice(31, 34).trim(),
  }));
  assert.ok(atoms.every(({ z }) => Number.isFinite(z)), `${filename} has invalid coordinates`);
  assert.ok(atoms.some(({ element }) => element === "H"), `${filename} must encode hydrogens explicitly`);

  const cidMatch = contents.match(/> <PUBCHEM_COMPOUND_CID>\r?\n(\d+)/);
  assert.ok(cidMatch, `${filename} must carry PUBCHEM_COMPOUND_CID`);
  const formulaMatch = contents.match(
    /> <PUBCHEM_MOLECULAR_FORMULA>\r?\n([^\r\n]+)/,
  );
  const inchiKeyMatch = contents.match(
    /> <PUBCHEM_IUPAC_INCHIKEY>\r?\n([^\r\n]+)/,
  );
  return {
    titleCid: Number.parseInt(lines[0].trim(), 10),
    propertyCid: Number.parseInt(cidMatch[1], 10),
    atomCount,
    bondCount,
    atoms,
    formula: formulaMatch?.[1] ?? null,
    inchiKey: inchiKeyMatch?.[1] ?? null,
  };
};

const formulaFromAtoms = (atoms) => {
  const counts = new Map();
  for (const { element } of atoms) {
    counts.set(element, (counts.get(element) ?? 0) + 1);
  }
  const orderedElements = [
    ...(["C", "H"].filter((element) => counts.has(element))),
    ...[...counts.keys()]
      .filter((element) => element !== "C" && element !== "H")
      .sort(),
  ];
  return orderedElements
    .map((element) => `${element}${counts.get(element) === 1 ? "" : counts.get(element)}`)
    .join("");
};

test("every catalog PubChem CID has CID-matched, non-empty 2D and 3D SDF assets", async () => {
  const catalogSources = await Promise.all(
    ["beta-blockers.ts", "nsaids.ts"].map((filename) =>
      readFile(new URL(`../lib/data/${filename}`, import.meta.url), "utf8"),
    ),
  );
  const catalogRecords = catalogSources.flatMap((source) =>
    [
      ...source.matchAll(
        /^ {2}\{\r?\n {4}slug: "([^"]+)",[\s\S]*?^ {4}cid: (\d+),[\s\S]*?^ {4}formula: "([^"]+)",[\s\S]*?^ {4}inchiKey: "([A-Z]{14}-[A-Z]{10}-[A-Z])",/gm,
      ),
    ].map((match) => ({
      slug: match[1],
      cid: Number.parseInt(match[2], 10),
      formula: match[3],
      inchiKey: match[4],
    })),
  );
  const catalogCids = catalogRecords.map((record) => record.cid);
  const recordByCid = new Map(catalogRecords.map((record) => [record.cid, record]));

  assert.ok(catalogCids.length > 0, "catalog must contain PubChem identities");
  assert.equal(new Set(catalogCids).size, catalogCids.length, "catalog CIDs must be unique");

  const sourceRegistry = await readFile(
    new URL("../lib/data/sources.ts", import.meta.url),
    "utf8",
  );
  const registeredCids = [
    ...sourceRegistry.matchAll(/^ {2}\["[^"]+", "[^"]+", (\d+)\],$/gm),
  ].map((match) => Number.parseInt(match[1], 10));
  assert.deepEqual(
    [...registeredCids].sort((a, b) => a - b),
    [...catalogCids].sort((a, b) => a - b),
    "every catalog identity must have a PubChem source record",
  );

  const filenames = (await readdir(assetDirectory))
    .filter((filename) => /^cid-\d+-(?:2d|3d)\.sdf$/.test(filename))
    .sort();
  const expectedFilenames = catalogCids
    .flatMap((cid) => [`cid-${cid}-2d.sdf`, `cid-${cid}-3d.sdf`])
    .sort();
  assert.deepEqual(filenames, expectedFilenames);

  for (const cid of catalogCids) {
    const parsed = {};
    const catalogRecord = recordByCid.get(cid);
    assert.ok(catalogRecord, `CID ${cid} must retain catalog identity metadata`);

    for (const dimension of ["2d", "3d"]) {
      const filename = `cid-${cid}-${dimension}.sdf`;
      const fileUrl = new URL(`../public/structures/pubchem/${filename}`, import.meta.url);
      const fileStat = await stat(fileUrl);
      assert.ok(fileStat.size > 0, `${filename} must not be empty`);

      const contents = await readFile(fileUrl, "utf8");
      assert.match(contents, /\$\$\$\$\s*$/, `${filename} must terminate as an SDF record`);
      parsed[dimension] = parseSdf(contents, filename);
      assert.equal(parsed[dimension].titleCid, cid, `${filename} title CID mismatch`);
      assert.equal(parsed[dimension].propertyCid, cid, `${filename} property CID mismatch`);
      assert.equal(formulaFromAtoms(parsed[dimension].atoms), catalogRecord.formula);
      if (dimension === "2d") {
        assert.equal(parsed[dimension].formula, catalogRecord.formula);
        assert.equal(parsed[dimension].inchiKey, catalogRecord.inchiKey);
      }
    }

    assert.equal(parsed["2d"].atomCount, parsed["3d"].atomCount);
    assert.equal(parsed["2d"].bondCount, parsed["3d"].bondCount);
    assert.ok(parsed["2d"].atoms.every(({ z }) => Math.abs(z) < 1e-8));
    assert.ok(parsed["3d"].atoms.some(({ z }) => Math.abs(z) > 1e-4));
  }
});

test("catalog records attach generated structure sets", async () => {
  const moleculeDomain = await readFile(
    new URL("../lib/domain/molecule.ts", import.meta.url),
    "utf8",
  );
  const catalogSources = await Promise.all(
    ["beta-blockers.ts", "nsaids.ts"].map((filename) =>
      readFile(new URL(`../lib/data/${filename}`, import.meta.url), "utf8"),
    ),
  );
  assert.match(moleculeDomain, /readonly structures: MoleculeStructureSet/);
  for (const catalogSource of catalogSources) {
    assert.match(catalogSource, /structures: createPubChemStructureSet\(/);
  }
});

test("PubChem structure records retain source, origin, and review provenance", () => {
  const structures = createPubChemStructureSet({
    moleculeId: "molecule:example",
    pubChemCid: 123,
    sourceId: "source:pubchem-123",
  });

  assert.equal(structures.twoDimensional.publicPath, "/structures/pubchem/cid-123-2d.sdf");
  assert.equal(structures.threeDimensional.publicPath, "/structures/pubchem/cid-123-3d.sdf");
  assert.equal(structures.twoDimensional.origin, "database-2d-record");
  assert.equal(structures.threeDimensional.origin, "computed-3d-conformer");

  for (const asset of [structures.twoDimensional, structures.threeDimensional]) {
    assert.equal(asset.sourceId, "source:pubchem-123");
    assert.equal(asset.sourceProvider, "PubChem PUG REST");
    assert.equal(asset.sourceExternalId, "PubChem CID 123");
    assert.match(asset.sourceUrl, /\/compound\/cid\/123\/record\/SDF\?record_type=(?:2d|3d)$/);
    assert.equal(asset.hydrogenEncoding, "explicit");
    assert.equal(asset.verification.status, "verified");
    assert.equal(asset.verification.reviewedAt, "2026-08-21");
  }
});

test("structure provider resolves arbitrary catalogs by molecule ID and CID", () => {
  const makeSet = (slug, cid) => {
    const moleculeId = `molecule:${slug}`;
    const shared = {
      moleculeId,
      pubChemCid: cid,
      format: "sdf-v2000",
      mediaType: "chemical/x-mdl-sdfile",
      sourceId: `source:pubchem-${cid}`,
      sourceProvider: "Test PubChem provider",
      sourceExternalId: `PubChem CID ${cid}`,
      sourceUrl: `https://example.test/${cid}`,
      retrievedAt: "2026-08-21",
      hydrogenEncoding: "explicit",
      verification: { status: "verified" },
    };
    return {
      moleculeId,
      pubChemCid: cid,
      twoDimensional: {
        ...shared,
        id: `structure:${slug}-2d`,
        dimension: "2d",
        publicPath: `/structures/${cid}-2d.sdf`,
        origin: "database-2d-record",
      },
      threeDimensional: {
        ...shared,
        id: `structure:${slug}-3d`,
        dimension: "3d",
        publicPath: `/structures/${cid}-3d.sdf`,
        origin: "computed-3d-conformer",
      },
    };
  };

  const alpha = makeSet("alpha", 101);
  const gamma = makeSet("gamma", 303);
  const provider = createMoleculeStructureProvider([alpha, gamma], "test-provider");

  assert.equal(provider.providerId, "test-provider");
  assert.equal(provider.getByMoleculeId("molecule:alpha"), alpha);
  assert.equal(provider.getByPubChemCid(303), gamma);
  assert.equal(provider.getAsset("molecule:alpha", "3d"), alpha.threeDimensional);
  assert.equal(provider.getAsset(303, "2d"), gamma.twoDimensional);
  assert.equal(provider.getByPubChemCid(999), undefined);
  assert.throws(
    () => createMoleculeStructureProvider([alpha, makeSet("alpha", 202)]),
    /Duplicate structure molecule ID/,
  );
  assert.throws(
    () => createMoleculeStructureProvider([alpha, makeSet("beta", 101)]),
    /Duplicate structure PubChem CID/,
  );
});
