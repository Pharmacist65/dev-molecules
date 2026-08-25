import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  extractPubChem2dDescriptors,
  loadPubChem2dDescriptors,
} = await tsImport(
  "../lib/structure/pubchem-2d-descriptors.ts",
  import.meta.url,
);
const { parseSdfV2000 } = await tsImport(
  "../lib/structure/sdf.ts",
  import.meta.url,
);

const BETA_SITOSTEROL_CID = 222284;
const BETA_SITOSTEROL_SOURCE =
  "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/222284/record/SDF?record_type=2d";
const betaSitosterolSdf = await readFile(
  new URL(
    "../public/catalog/structures/pubchem/cid-222284-2d.sdf",
    import.meta.url,
  ),
  "utf8",
);

const descriptorContract = {
  expectedPubChemCid: BETA_SITOSTEROL_CID,
  sourceUrl: BETA_SITOSTEROL_SOURCE,
};

test("exact-CID PubChem 2D evidence exposes every available allowlisted descriptor", () => {
  const descriptors = extractPubChem2dDescriptors(
    parseSdfV2000(betaSitosterolSdf),
    descriptorContract,
  );

  assert.deepEqual(
    descriptors.map((descriptor) => descriptor.id),
    [
      "molecular-weight",
      "complexity",
      "hydrogen-bond-acceptors",
      "hydrogen-bond-donors",
      "rotatable-bonds",
      "xlogp",
      "exact-mass",
      "topological-polar-surface-area",
      "monoisotopic-mass",
      "total-charge",
      "heavy-atom-count",
    ],
  );
  assert.deepEqual(
    Object.fromEntries(descriptors.map(({ id, value }) => [id, value])),
    {
      "molecular-weight": 414.7,
      complexity: 634,
      "hydrogen-bond-acceptors": 1,
      "hydrogen-bond-donors": 1,
      "rotatable-bonds": 6,
      xlogp: 9.3,
      "exact-mass": 414.386166214,
      "topological-polar-surface-area": 20.2,
      "monoisotopic-mass": 414.386166214,
      "total-charge": 0,
      "heavy-atom-count": 30,
    },
  );
  assert.ok(descriptors.every((descriptor) => descriptor.provenance === "pubchem-2d-sdf"));
  assert.ok(descriptors.every((descriptor) => descriptor.reviewStatus === "source-supported"));
  assert.ok(descriptors.every((descriptor) => descriptor.pubChemCid === BETA_SITOSTEROL_CID));
  assert.ok(descriptors.every((descriptor) => descriptor.sourceUrl === BETA_SITOSTEROL_SOURCE));
});

test("missing, malformed, and out-of-domain fields fail closed without inferred replacements", () => {
  const parsed = parseSdfV2000(betaSitosterolSdf);
  const structure = {
    ...parsed,
    properties: {
      ...parsed.properties,
      PUBCHEM_CACTVS_COMPLEXITY: "NaN",
      PUBCHEM_CACTVS_HBOND_ACCEPTOR: "1.5",
      PUBCHEM_CACTVS_HBOND_DONOR: "-1",
      PUBCHEM_CACTVS_ROTATABLE_BOND: "6\n7",
      PUBCHEM_EXACT_MASS: "0",
      PUBCHEM_CACTVS_TPSA: "-0.1",
      PUBCHEM_MONOISOTOPIC_WEIGHT: "Infinity",
      PUBCHEM_TOTAL_CHARGE: "0.2",
      PUBCHEM_HEAVY_ATOM_COUNT: "1000001",
    },
  };
  delete structure.properties.PUBCHEM_XLOGP3_AA;

  const descriptors = extractPubChem2dDescriptors(structure, descriptorContract);
  assert.deepEqual(
    descriptors.map((descriptor) => descriptor.id),
    ["molecular-weight"],
  );
});

test("descriptor extraction rejects wrong identity, wrong dimension, and mismatched source provenance", () => {
  const structure = parseSdfV2000(betaSitosterolSdf);
  assert.throws(
    () => extractPubChem2dDescriptors(structure, {
      ...descriptorContract,
      expectedPubChemCid: 2284,
    }),
    /does not match expected PubChem CID 2284/,
  );
  assert.throws(
    () => extractPubChem2dDescriptors({ ...structure, dimension: "3d" }, descriptorContract),
    /dimension 3d does not match required 2d/,
  );
  assert.throws(
    () => extractPubChem2dDescriptors(structure, {
      ...descriptorContract,
      sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/222284",
    }),
    /source URL does not match the expected CID record/,
  );
});

test("descriptor loader reads only the supplied local asset path before validation", async () => {
  const requested = [];
  const descriptors = await loadPubChem2dDescriptors(
    "/dev-molecules/catalog/structures/pubchem/cid-222284-2d.sdf",
    descriptorContract,
    async (assetUrl) => {
      requested.push(assetUrl);
      return betaSitosterolSdf;
    },
  );
  assert.deepEqual(requested, [
    "/dev-molecules/catalog/structures/pubchem/cid-222284-2d.sdf",
  ]);
  assert.equal(descriptors.length, 11);
});
