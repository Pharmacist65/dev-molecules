import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  STRUCTURAL_FINGERPRINT_VERSION,
  createCanonicalSmilesPathFingerprint,
  createStructuralSimilarityProjection,
  getNearestStructuralNeighbors,
  tanimotoSimilarity,
} = await tsImport("../lib/explore/fingerprint.ts", import.meta.url);

const definition = {
  lensId: "similarity",
  projectionId: "projection:test:smiles-path-v1",
  inputVersion: "fixture:v1",
  generatedAt: "2026-08-22T00:00:00.000Z",
  meaning: "Canonical-SMILES path-feature similarity.",
  doesNotMean: "Not a pharmacology or efficacy measurement.",
  verificationStatus: "source-supported",
};

const items = [
  { id: "propranolol", canonicalSmiles: "CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O" },
  { id: "metoprolol", canonicalSmiles: "CC(C)NCC(COC1=CC=C(C=C1)CCOC)O" },
  { id: "aspirin", canonicalSmiles: "CC(=O)OC1=CC=CC=C1C(=O)O" },
];

test("canonical-SMILES fingerprints expose deterministic Tanimoto similarity", () => {
  const propranolol = createCanonicalSmilesPathFingerprint(items[0].canonicalSmiles);
  const metoprolol = createCanonicalSmilesPathFingerprint(items[1].canonicalSmiles);
  const aspirin = createCanonicalSmilesPathFingerprint(items[2].canonicalSmiles);

  assert.equal(tanimotoSimilarity(propranolol, propranolol), 1);
  assert.ok(tanimotoSimilarity(propranolol, metoprolol) > tanimotoSimilarity(propranolol, aspirin));
});

test("similarity projection is versioned, order-independent and bounded", () => {
  const first = createStructuralSimilarityProjection(definition, items);
  const reversed = createStructuralSimilarityProjection(definition, [...items].reverse());

  assert.equal(first.algorithm, "canonical-smiles-path-fingerprint");
  assert.equal(first.algorithmVersion, STRUCTURAL_FINGERPRINT_VERSION);
  assert.equal(first.inputHash, reversed.inputHash);
  assert.deepEqual(first.coordinates, reversed.coordinates);
  assert.deepEqual(first.similarities, reversed.similarities);
  for (const coordinate of Object.values(first.coordinates)) {
    assert.ok(coordinate.x >= 10 && coordinate.x <= 90);
    assert.ok(coordinate.y >= 10 && coordinate.y <= 90);
  }
  assert.deepEqual(getNearestStructuralNeighbors(first, "propranolol", 1), [
    { id: "metoprolol", score: first.similarities.propranolol.metoprolol },
  ]);
});

test("empty or duplicate structural input fails closed", () => {
  assert.throws(() => createStructuralSimilarityProjection(definition, []), /needs molecules/);
  assert.throws(
    () => createStructuralSimilarityProjection(definition, [items[0], items[0]]),
    /duplicate molecule IDs/,
  );
  assert.throws(() => createCanonicalSmilesPathFingerprint(""), /cannot produce/);
});
