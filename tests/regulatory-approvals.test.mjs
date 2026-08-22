import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  canonicalRegulatorySnapshot,
  regulatoryProductSeeds,
  regulatoryProducts,
} = await tsImport("../lib/data/regulatory-approvals.ts", import.meta.url);
const { moleculeCatalog } = await tsImport("../lib/data/catalog.ts", import.meta.url);
const { sourceById } = await tsImport("../lib/data/sources.ts", import.meta.url);
const { validateMoleculeRecord } = await tsImport(
  "../lib/domain/validators.ts",
  import.meta.url,
);

test("all 15 seed molecules retain exact, reproducibly hashed Drugs@FDA product anchors", () => {
  assert.equal(regulatoryProducts.length, 15);
  assert.equal(regulatoryProductSeeds.length, 15);
  assert.equal(
    new Set(
      regulatoryProducts.map(
        (product) => `${product.applicationNumber}:${product.productNumber}`,
      ),
    ).size,
    15,
  );

  for (const seed of regulatoryProductSeeds) {
    const canonical = JSON.stringify(canonicalRegulatorySnapshot(seed));
    const digest = createHash("sha256").update(canonical).digest("hex");
    assert.equal(digest, seed.canonicalSha256, `${seed.slug} snapshot hash drifted`);
  }
});

test("approval evidence resolves through an explicit chemical form and official source", () => {
  const knownSourceIds = new Set(sourceById.keys());
  for (const molecule of moleculeCatalog) {
    assert.equal(molecule.regulatoryProducts.length, 1, molecule.id);
    const product = molecule.regulatoryProducts[0];
    assert.equal(product.moleculeId, molecule.id);
    assert.ok(
      molecule.forms.some((form) => form.id === product.chemicalFormId),
      `${molecule.id} must resolve approval through ${product.chemicalFormId}`,
    );
    assert.equal(product.relationship, "approved-product-linked-via-chemical-form");
    assert.deepEqual(product.approvalAction, {
      submissionType: "ORIG",
      submissionNumber: "1",
      submissionStatus: "AP",
      actionDate: product.approvalAction.actionDate,
    });
    assert.ok(sourceById.has(product.sourceId));
    assert.match(product.sourceUrl, /accessdata\.fda\.gov/);
    assert.match(product.apiQueryUrl, /api\.fda\.gov\/drug\/drugsfda\.json/);
    assert.equal(
      validateMoleculeRecord(molecule, knownSourceIds).filter(
        (issue) => issue.severity === "error",
      ).length,
      0,
      molecule.id,
    );
  }
});

test("salt product approvals never attach directly to the normalized parent identity", () => {
  const saltAnchors = new Map([
    ["molecule:propranolol", "form:propranolol:hydrochloride"],
    ["molecule:metoprolol", "form:metoprolol:tartrate"],
    ["molecule:bisoprolol", "form:bisoprolol:fumarate"],
    ["molecule:labetalol", "form:labetalol:hydrochloride"],
    ["molecule:timolol", "form:timolol:maleate"],
    ["molecule:nebivolol", "form:nebivolol:hydrochloride"],
    ["molecule:acebutolol", "form:acebutolol:hydrochloride"],
    ["molecule:diclofenac", "form:diclofenac:sodium"],
  ]);

  for (const [moleculeId, formId] of saltAnchors) {
    const molecule = moleculeCatalog.find((candidate) => candidate.id === moleculeId);
    assert.ok(molecule, moleculeId);
    assert.equal(molecule.regulatoryProducts[0].chemicalFormId, formId);
    const approvalClaim = molecule.claims.find((claim) => claim.category === "approval");
    assert.equal(approvalClaim?.subjectId, formId);
    assert.notEqual(approvalClaim?.subjectId, molecule.identity.pubChemCid);
  }
});

test("invalid approval action or unresolved form fails domain validation", () => {
  const molecule = moleculeCatalog[0];
  const product = molecule.regulatoryProducts[0];
  const invalid = {
    ...molecule,
    regulatoryProducts: [
      {
        ...product,
        chemicalFormId: "form:missing:form",
        approvalAction: { ...product.approvalAction, submissionStatus: "TA" },
      },
    ],
  };
  const issueCodes = validateMoleculeRecord(invalid, new Set(sourceById.keys())).map(
    (issue) => issue.code,
  );
  assert.ok(issueCodes.includes("regulatory-form-missing"));
  assert.ok(issueCodes.includes("unapproved-regulatory-action"));
});
