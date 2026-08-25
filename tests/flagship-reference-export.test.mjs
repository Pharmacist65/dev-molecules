import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { createDrugDossierByIdOrSlug } = await tsImport(
  "../lib/application/dossier/index.ts",
  import.meta.url,
);
const {
  createFlagshipReferenceExport,
  flagshipReferenceExportFilename,
  serializeFlagshipReferenceExport,
} = await tsImport(
  "../lib/application/dossier/reference-export.ts",
  import.meta.url,
);

for (const slug of ["propranolol", "celecoxib", "omeprazole"]) {
  test(`${slug} reference JSON retains evidence boundaries and resolved sources`, () => {
    const dossier = createDrugDossierByIdOrSlug(slug, "en");
    assert.ok(dossier?.flagship);

    const exported = createFlagshipReferenceExport(dossier, "en");
    assert.equal(exported.schema, "molevren.flagship-reference.v1");
    assert.equal(exported.locale, "en");
    assert.deepEqual(exported.boundaries, {
      presentation: "reference",
      exportScope: "currently-materialized-record",
      notForClinicalUse: true,
      containsDerivedScience: false,
    });
    assert.equal(exported.productAnchor.sourceId.startsWith("source:"), true);
    assert.ok(exported.sources.length > 0);
    assert.ok(exported.sources.every((source) =>
      source.url.startsWith("https://") &&
      source.license.label.length > 0 &&
      source.license.reuseStatus.length > 0
    ));
    assert.ok(Array.isArray(exported.flagship.explicitMissingFields));
    assert.ok(Array.isArray(exported.limitations));
    assert.ok(exported.adme.every((profile) =>
      [
        "chemicalFormId",
        "regulatoryProductId",
        "halfLife",
        "bioavailability",
        "proteinBinding",
        "volumeOfDistribution",
        "clearance",
      ].every((key) => Object.hasOwn(profile, key))
    ));

    const field = exported.chemistry.molecularWeight;
    assert.equal(Object.hasOwn(field, "valueQualifier"), true);
    assert.equal(field.valueQualifier, null);
    assert.equal(Object.hasOwn(field.conditions, "coefficientOfVariationPercent"), true);
    assert.equal(field.conditions.coefficientOfVariationPercent, null);

    const serialized = serializeFlagshipReferenceExport(dossier, "en");
    assert.equal(serialized.endsWith("\n"), true);
    assert.deepEqual(JSON.parse(serialized), exported);
    assert.equal(
      flagshipReferenceExportFilename(dossier, "en"),
      `molevren-${slug}-en-reference.json`,
    );
  });
}

test("reference export fails closed for breadth-only and unresolved-source records", () => {
  const breadthOnly = createDrugDossierByIdOrSlug("aspirin", "en");
  assert.ok(breadthOnly);
  assert.equal(breadthOnly.flagship, null);
  assert.throws(
    () => createFlagshipReferenceExport(breadthOnly, "en"),
    /not a materialized flagship dossier/,
  );

  const flagship = createDrugDossierByIdOrSlug("propranolol", "en");
  assert.ok(flagship?.flagship);
  assert.throws(
    () => createFlagshipReferenceExport({ ...flagship, sources: [] }, "en"),
    /unresolved source/,
  );
});
