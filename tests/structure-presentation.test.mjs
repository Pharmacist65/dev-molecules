import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { getStructureProvenancePresentation } = await tsImport(
  "../lib/application/structure-presentation.ts",
  import.meta.url,
);

test("structure provenance wording distinguishes computed, broad experimental and bound-pose origins", () => {
  assert.equal(
    getStructureProvenancePresentation({
      dimension: "3d",
      origin: "computed-3d-conformer",
      sourceLabel: "PubChem PUG REST",
    }).heading,
    "PUBCHEM HESAPLANMIŞ 3B KONFORMER",
  );
  assert.equal(
    getStructureProvenancePresentation({
      dimension: "3d",
      origin: "experimental-structure",
    }).heading,
    "DENEYSEL 3B YAPI",
  );
  assert.equal(
    getStructureProvenancePresentation({
      dimension: "3d",
      origin: "experimental-bound-pose",
    }).heading,
    "DENEYSEL BAĞLI POZ",
  );
});

test("unknown origin fails closed and 2D provenance never falls back to 3D wording", () => {
  assert.match(
    getStructureProvenancePresentation({ dimension: "3d", origin: "unreviewed-origin" })
      .heading,
    /İNCELEMEDE/,
  );
  assert.equal(
    getStructureProvenancePresentation({
      dimension: "2d",
      origin: "computed-3d-conformer",
      sourceId: "source:pubchem-4946",
    }).heading,
    "PUBCHEM CANONICAL 2B KAYIT",
  );
});
