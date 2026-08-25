import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { createAcademyScienceLesson } = await tsImport(
  "../lib/application/academy-science-lessons.ts",
  import.meta.url,
);
const { createDrugDossierByIdOrSlug } = await tsImport(
  "../lib/application/dossier/index.ts",
  import.meta.url,
);
const { canPresentTargetInteraction } = await tsImport(
  "../lib/application/pharmacology/index.ts",
  import.meta.url,
);
const {
  canPresentAdmeField,
  presentAdministrationRoute,
  presentDosageForm,
} = await tsImport(
  "../lib/application/adme/index.ts",
  import.meta.url,
);
const { canPresentMetaboliteEdge } = await tsImport(
  "../lib/application/metabolites/index.ts",
  import.meta.url,
);

const verifiedSource = (id, scope) => ({
  id,
  provider: "Test evidence registry",
  kind: "journal",
  title: "Test-only source contract",
  externalId: "TEST-1",
  url: "https://example.test/direct-source",
  retrievedAt: "2026-08-23",
  scope,
  license: { label: "test", url: null, reuseStatus: "restricted" },
  verification: { status: "verified" },
});

const field = (value, sourceId, overrides = {}) => ({
  value,
  unit: typeof value === "number" ? "nM" : null,
  conditions: { note: "Test-only direct assay context." },
  sourceId,
  evidenceType: "direct-experimental",
  reviewStatus: "verified",
  ...overrides,
});

test("route/form context is isolated and never populated as inferred ADME", () => {
  const oral = createDrugDossierByIdOrSlug("metoprolol", "en");
  const intravenous = createDrugDossierByIdOrSlug("labetalol", "en");
  const ophthalmic = createDrugDossierByIdOrSlug("timolol", "en");
  assert.ok(oral && intravenous && ophthalmic);

  assert.equal(oral.admeProfiles[0]?.administration.route.value, "ORAL");
  assert.equal(intravenous.admeProfiles[0]?.administration.route.value, "INTRAVENOUS");
  assert.equal(ophthalmic.admeProfiles[0]?.administration.route.value, "OPHTHALMIC");
  for (const dossier of [oral, intravenous, ophthalmic]) {
    const profile = dossier.admeProfiles[0];
    assert.ok(profile);
    assert.equal(profile.evidenceAvailability, "context-only");
    assert.deepEqual(profile.absorption, []);
    assert.deepEqual(profile.distribution, []);
    assert.deepEqual(profile.metabolism, []);
    assert.deepEqual(profile.excretion, []);
  }
});

test("route and dosage-form context is localized only at the presentation boundary", () => {
  assert.equal(presentAdministrationRoute("ORAL", "tr"), "Oral");
  assert.equal(presentAdministrationRoute("INTRAVENOUS", "tr"), "İntravenöz");
  assert.equal(presentAdministrationRoute("OPHTHALMIC", "tr"), "Oftalmik");
  assert.equal(presentAdministrationRoute("TOPICAL", "tr"), "Topikal");
  assert.equal(presentAdministrationRoute("INTRAVENOUS", "en"), "Intravenous");
  assert.equal(presentDosageForm("CAPSULE, EXTENDED RELEASE", "tr"), "Uzatılmış salımlı kapsül");
  assert.equal(presentDosageForm("IMMEDIATE-RELEASE TABLET", "tr"), "Hemen salımlı tablet");
  assert.equal(presentDosageForm("IMMEDIATE-RELEASE TABLET", "en"), "Immediate-release tablet");
  assert.equal(presentDosageForm("DELAYED-RELEASE CAPSULE", "tr"), "Gecikmeli salımlı kapsül");
  assert.equal(presentDosageForm("DELAYED-RELEASE CAPSULE", "en"), "Delayed-release capsule");
  assert.equal(presentDosageForm("BUFFERED ORAL SOLUTION", "tr"), "Tamponlanmış oral çözelti");
  assert.equal(presentDosageForm("FORMULATION NOT STATED IN SOURCE", "tr"), "Form kaynakta belirtilmemiş");
  assert.equal(presentDosageForm("FORMULATION NOT STATED IN SOURCE", "en"), "Form not stated in source");
  assert.equal(presentDosageForm("SOLUTION/DROPS", "tr"), "Damla çözelti");
  assert.equal(presentDosageForm("SUSPENSION", "tr"), "Süspansiyon");
  assert.equal(presentDosageForm("CAPSULE", "en"), "Capsule");

  const turkishLesson = createAcademyScienceLesson("adme", "labetalol", "tr");
  assert.ok(turkishLesson.administrationContexts.length > 0);
  assert.equal(turkishLesson.administrationContexts[0]?.route, "İntravenöz");
  assert.doesNotMatch(
    turkishLesson.administrationContexts
      .flatMap((context) => [context.route, context.formulation ?? ""])
      .join(" "),
    /\b(?:INTRAVENOUS|CAPSULE, EXTENDED RELEASE|SOLUTION\/DROPS|SUSPENSION)\b/u,
  );
});

test("target interactions require reviewed fields, units, conditions, and a target-scoped source", () => {
  const sourceId = "source:test-target-direct";
  const interaction = {
    id: "target-interaction:test",
    targetName: field("Test target", sourceId),
    targetFamily: field("Test family", sourceId),
    action: field("inhibitor", sourceId),
    measurementType: field("IC50", sourceId),
    measurement: field(12, sourceId),
    species: field("Human", sourceId),
    assayContext: field("Cell-free binding assay", sourceId),
    sourceIds: [sourceId],
    reviewStatus: "verified",
  };
  const targetResolver = (id) => id === sourceId
    ? verifiedSource(id, "Direct target binding and bioactivity assay evidence.")
    : undefined;

  assert.equal(canPresentTargetInteraction(interaction, targetResolver), true);
  assert.equal(canPresentTargetInteraction(interaction, () => undefined), false);
  assert.equal(
    canPresentTargetInteraction(
      { ...interaction, measurement: field(12, sourceId, { unit: null }) },
      targetResolver,
    ),
    false,
  );
  assert.equal(
    canPresentTargetInteraction(
      { ...interaction, reviewStatus: "pending-review" },
      targetResolver,
    ),
    false,
  );
  assert.equal(
    canPresentTargetInteraction(
      interaction,
      () => verifiedSource(sourceId, "Normalized chemical identity only."),
    ),
    false,
  );
});

test("ADME measurements require units/conditions and an ADME-scoped source", () => {
  const sourceId = "source:test-adme-direct";
  const admeField = {
    id: "adme-field:test-half-life",
    phase: "excretion",
    label: "Half-life",
    ...field(4.5, sourceId, {
      unit: "h",
      conditions: {
        note: "Healthy adult participants after one oral administration.",
        route: "ORAL",
        population: "Healthy adults",
      },
    }),
  };
  const resolver = () => verifiedSource(
    sourceId,
    "Human pharmacokinetic ADME and half-life measurements.",
  );

  assert.equal(canPresentAdmeField(admeField, resolver), true);
  assert.equal(canPresentAdmeField({ ...admeField, unit: null }, resolver), false);
  assert.equal(
    canPresentAdmeField(admeField, () => verifiedSource(sourceId, "Product identity only.")),
    false,
  );
});

test("reactive/toxic metabolite edges require direct experimental evidence", () => {
  const sourceId = "source:test-metabolite-direct";
  const baseEdge = {
    id: "metabolite-edge:test",
    parentNodeId: "parent:test",
    metaboliteNodeId: "metabolite:test",
    enzyme: field("Test enzyme", sourceId),
    transformationClass: field("Oxidation", sourceId),
    activity: field("reactive-toxic", sourceId),
    sourceIds: [sourceId],
    reviewStatus: "verified",
  };
  const resolver = () => verifiedSource(
    sourceId,
    "Direct metabolite and biotransformation enzyme evidence.",
  );

  assert.equal(canPresentMetaboliteEdge(baseEdge, resolver), true);
  assert.equal(
    canPresentMetaboliteEdge(
      {
        ...baseEdge,
        activity: field("reactive-toxic", sourceId, {
          evidenceType: "literature-reported",
        }),
      },
      resolver,
    ),
    false,
  );
});
