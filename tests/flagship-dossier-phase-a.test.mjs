import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  collectFlagshipSourceIds,
  createDrugDossierByIdOrSlug,
  createFlagshipDossierSeed,
  curatedDossierMolecules,
  flagshipSourceRegistry,
  flagshipDossierMoleculeIds,
  hasCompleteEvidenceField,
  moleculeCatalog,
  resolveMolecularRecordRoute,
  sourceById,
  sourceRegistry,
  validateFlagshipDossierSeed,
} = await tsImport(
  "./helpers/flagship-phase-a-test-api.ts",
  import.meta.url,
);

const flagshipScenarios = [
  {
    slug: "propranolol",
    moleculeId: "molecule:propranolol",
    targetNames: [
      "ADRB1 · beta-1 adrenergic receptor",
      "ADRB2 · beta-2 adrenergic receptor",
    ],
    action: "antagonist",
    formId: "form:propranolol:hydrochloride",
    formulation: "TABLET",
    admeProfileCount: 1,
    missingProperty: "clearance",
    metaboliteEdges: 3,
  },
  {
    slug: "celecoxib",
    moleculeId: "molecule:celecoxib",
    targetNames: ["PTGS2 · cyclooxygenase-2"],
    action: "inhibitor",
    formId: "form:celecoxib:neutral",
    formulation: "CAPSULE",
    admeProfileCount: 2,
    missingProperty: "bioavailability",
    metaboliteEdges: 2,
  },
  {
    slug: "omeprazole",
    moleculeId: "molecule:omeprazole",
    targetNames: ["ATP4A · gastric H+/K+-ATPase alpha subunit"],
    action: "inhibitor",
    formId: "form:omeprazole:free-parent",
    formulation: "DELAYED-RELEASE CAPSULE",
    admeProfileCount: 2,
    missingProperty: "volumeOfDistribution",
    metaboliteEdges: 3,
  },
];

const sourceMetadata = (source) => ({
  externalId: source.externalId,
  retrievedAt: source.retrievedAt,
  license: source.license,
});

test("the three flagship dossiers remain separate from the 15-record seed catalog", () => {
  assert.equal(moleculeCatalog.length, 15);
  assert.equal(curatedDossierMolecules.length, 16);
  assert.deepEqual(
    [...flagshipDossierMoleculeIds].sort(),
    flagshipScenarios.map(({ moleculeId }) => moleculeId).sort(),
  );
  assert.equal(
    moleculeCatalog.some((record) => record.id === "molecule:omeprazole"),
    false,
  );
  assert.equal(
    curatedDossierMolecules.some((record) => record.id === "molecule:omeprazole"),
    true,
  );
  assert.equal(new Set(sourceRegistry.map((source) => source.id)).size, sourceRegistry.length);
});

test("the curated route resolves Omeprazole without widening the seed Atlas", async () => {
  let navigatorCalls = 0;
  const resolution = await resolveMolecularRecordRoute(
    "omeprazole",
    {
      async resolveStableSlug() {
        navigatorCalls += 1;
        return null;
      },
      async hydrate() {
        navigatorCalls += 1;
        return null;
      },
    },
    { curatedRecords: curatedDossierMolecules },
  );

  assert.equal(resolution.kind, "curated-dossier");
  assert.equal(resolution.molecule.id, "molecule:omeprazole");
  assert.equal(resolution.canonicalSlug, "omeprazole");
  assert.equal(navigatorCalls, 0);
});

test("flagship science is source-supported, route/form scoped, and never padded with assay values", () => {
  for (const scenario of flagshipScenarios) {
    const dossier = createDrugDossierByIdOrSlug(scenario.slug, "en");
    assert.ok(dossier?.flagship, `${scenario.slug} must have flagship content`);
    assert.equal(dossier.moleculeId, scenario.moleculeId);
    assert.equal(dossier.notForClinicalUse, true);

    const profile = dossier.admeProfiles[0];
    assert.ok(profile);
    assert.equal(dossier.admeProfiles.length, scenario.admeProfileCount);
    assert.equal(profile.chemicalFormId, scenario.formId);
    assert.equal(profile.administration.route.value, "ORAL");
    assert.equal(profile.administration.formulation?.value, scenario.formulation);
    assert.equal(profile[scenario.missingProperty], null);
    assert.equal(profile.reviewStatus, "source-supported");
    assert.equal(profile.evidenceAvailability, "source-supported");
    assert.equal(dossier.flagship.productAnchor.route, profile.administration.route.value);
    assert.equal(
      dossier.flagship.productAnchor.formulation,
      profile.administration.formulation?.value,
    );
    assert.equal(dossier.flagship.productAnchor.chemicalFormId, profile.chemicalFormId);
    assert.ok(dossier.flagship.comparisons.content.every((comparison) =>
      comparison.propertyDifferences.length > 0 &&
      comparison.targetActionDifference !== null &&
      comparison.targetActionDifference.sourceIds.length >= 2 &&
      comparison.propertyDifferences.every((field) => field.sourceIds.length >= 2)
    ));

    assert.deepEqual(
      dossier.pharmacology.primaryTargets.map((target) => target.targetName.value),
      scenario.targetNames,
    );
    assert.deepEqual(dossier.pharmacology.actionTypes, [scenario.action]);
    assert.equal(dossier.pharmacology.targets.length, 0);
    assert.equal(dossier.pharmacology.availability, "source-supported");
    assert.equal(dossier.pharmacology.reviewStatus, "source-supported");

    assert.equal(dossier.metabolites.edges.length, scenario.metaboliteEdges);
    assert.equal(dossier.metabolites.availability, "source-supported");
    assert.equal(dossier.flagship.synthesis.content?.operationalDetailsIncluded, false);
    assert.ok(
      dossier.flagship.synthesis.content?.materials
        .filter((material) => material.structureReviewStatus === "pending-review")
        .every((material) => material.smiles === null),
    );

    const coverage = new Map(
      dossier.coverage.map((indicator) => [indicator.dimension, indicator]),
    );
    for (const dimension of [
      "classification",
      "pharmacology",
      "adme",
      "synthesis",
      "nomenclature",
      "learning",
    ]) {
      assert.equal(coverage.get(dimension)?.status, "source-supported");
      assert.ok((coverage.get(dimension)?.availableFields ?? 0) > 0);
    }
  }
});

test("resolved dossier sources retain identifiers, retrieval dates, and licenses", () => {
  for (const { slug, moleculeId } of flagshipScenarios) {
    const seed = createFlagshipDossierSeed(moleculeId, "en");
    const dossier = createDrugDossierByIdOrSlug(slug, "en");
    assert.ok(seed && dossier);

    const resolvedIds = new Set(dossier.sources.map((source) => source.id));
    for (const sourceId of collectFlagshipSourceIds(seed)) {
      assert.equal(resolvedIds.has(sourceId), true, `${slug}: ${sourceId}`);
    }
    for (const resolved of dossier.sources) {
      const registered = sourceById.get(resolved.id);
      assert.ok(registered);
      assert.match(resolved.url, /^https:\/\//);
      assert.deepEqual(sourceMetadata(resolved), sourceMetadata(registered));
      assert.ok(resolved.externalId.length > 0);
      assert.match(resolved.retrievedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(resolved.license.label.length > 0);
      assert.ok(["permitted", "attribution-required", "restricted", "unknown"].includes(
        resolved.license.reuseStatus,
      ));
    }
  }

  assert.equal(
    sourceById.get("source:dailymed-propranolol-tablet-554c7446")?.license.reuseStatus,
    "unknown",
  );
  assert.equal(
    sourceById.get("source:fda-celecoxib-020998-s058-2024")?.license.reuseStatus,
    "unknown",
  );
  assert.equal(
    sourceById.get("source:drugsfda-valdecoxib-nda021341")?.license.reuseStatus,
    "permitted",
  );
  assert.equal(
    sourceById.get("source:federal-register-valdecoxib-withdrawal-2013-18657")?.license.reuseStatus,
    "permitted",
  );
  assert.equal(
    sourceById.get("source:federal-register-rofecoxib-withdrawal-2022-19740")?.license.reuseStatus,
    "permitted",
  );
  assert.equal(
    sourceById.get("source:pubmed-9593713")?.externalId,
    "PMID 9593713; DOI 10.1074/jbc.273.22.13719",
  );
  assert.equal(
    sourceById.get("source:pmc-7500594")?.license.reuseStatus,
    "permitted",
  );
  assert.equal(
    sourceById.get("source:pubmed-4400184")?.externalId,
    "PMID 4400184; PMCID PMC1665931; DOI 10.1111/j.1476-5381.1971.tb07171.x",
  );
  assert.ok(
    flagshipSourceRegistry.every((source) =>
      source.verification.status !== "verified"),
  );
});

test("route/form conditions and explicit scientific holds remain visible", () => {
  const celecoxib = createDrugDossierByIdOrSlug("celecoxib", "en");
  const propranolol = createDrugDossierByIdOrSlug("propranolol", "en");
  const omeprazole = createDrugDossierByIdOrSlug("omeprazole", "en");
  assert.ok(celecoxib?.flagship && propranolol?.flagship && omeprazole?.flagship);

  const celecoxibConditions = celecoxib.admeProfiles[0].absorption[0].conditions;
  assert.equal(celecoxibConditions.dose, "200 mg");
  assert.equal(celecoxibConditions.fedState, "fasted");
  assert.equal(celecoxibConditions.cohortSize, 36);
  assert.equal(celecoxibConditions.studyDesign, "Single-dose pharmacokinetic study");
  assert.equal(celecoxibConditions.coefficientOfVariationPercent, 38);
  assert.equal(celecoxib.admeProfiles[0].absorption[1].conditions.coefficientOfVariationPercent, 37);
  assert.equal(celecoxib.admeProfiles[0].halfLife.conditions.coefficientOfVariationPercent, 31);
  assert.equal(celecoxib.admeProfiles[0].volumeOfDistribution.conditions.coefficientOfVariationPercent, 34);
  assert.equal(celecoxib.admeProfiles[0].clearance.conditions.coefficientOfVariationPercent, 28);
  assert.equal(celecoxib.admeProfiles[0].clearance.unit, "L/h");
  assert.equal(celecoxib.admeProfiles[0].proteinBinding.conditions.cohortSize, undefined);
  assert.equal(
    celecoxib.admeProfiles[0].metabolism[0].conditions.dose,
    undefined,
  );
  const celecoxibMassBalance = celecoxib.admeProfiles.find((profile) =>
    profile.administration.formulation?.value === "FORMULATION NOT STATED IN SOURCE");
  assert.ok(celecoxibMassBalance);
  assert.deepEqual(
    celecoxibMassBalance.excretion.map((field) => [field.value, field.valueQualifier]),
    [[57, "approximately"], [27, "approximately"]],
  );
  assert.equal(
    celecoxib.flagship.productAnchor.secondarySources[0]?.sourceId,
    "source:dailymed-celecoxib-stale-8d52185d",
  );
  assert.equal(
    celecoxib.sources.find((source) =>
      source.id === "source:dailymed-celecoxib-stale-8d52185d")?.reviewStatus,
    "conflicting",
  );
  const celecoxibDescriptors = celecoxib.flagship.descriptors.content
    .filter((descriptor) => descriptor.field !== null)
    .map((descriptor) => descriptor.field);
  assert.ok(celecoxibDescriptors.every((field) =>
    field.dimensionless === true && hasCompleteEvidenceField(field)));
  assert.equal(celecoxib.admeProfiles[0].proteinBinding.valueQualifier, "approximately");

  const omeprazoleCapsule = omeprazole.admeProfiles.find((profile) =>
    profile.administration.formulation?.value === "DELAYED-RELEASE CAPSULE");
  const omeprazoleBufferedSolution = omeprazole.admeProfiles.find((profile) =>
    profile.administration.formulation?.value === "BUFFERED ORAL SOLUTION");
  assert.ok(omeprazoleCapsule && omeprazoleBufferedSolution);
  assert.equal(omeprazoleCapsule.bioavailability.conditions.dose, "20–40 mg");
  assert.equal(omeprazoleCapsule.halfLife.conditions.population, "Healthy subjects");
  assert.equal(omeprazoleCapsule.clearance.conditions.population, "Healthy subjects");
  assert.equal(omeprazoleBufferedSolution.excretion[0].value, 77);
  assert.equal(omeprazoleBufferedSolution.excretion[0].valueQualifier, "approximately");
  assert.equal(
    omeprazoleBufferedSolution.excretion[0].conditions.formulation,
    "BUFFERED ORAL SOLUTION",
  );
  assert.equal(omeprazoleCapsule.bioavailability.valueQualifier, "range");
  assert.equal(omeprazoleCapsule.proteinBinding.valueQualifier, "approximately");
  assert.equal(omeprazoleCapsule.halfLife.valueQualifier, "range");
  assert.equal(omeprazoleCapsule.clearance.valueQualifier, "range");
  assert.ok(
    omeprazole.pharmacology.primaryTargets[0].sourceIds.includes("source:pubmed-9593713"),
  );
  assert.ok(
    omeprazole.pharmacology.mechanismClaims[0].sourceIds.includes("source:pmc-7500594"),
  );
  assert.deepEqual(
    new Set(omeprazole.metabolites.edges.map((edge) => edge.activity.value)),
    new Set(["very-little-or-no-antisecretory"]),
  );
  assert.ok(
    omeprazole.metabolites.edges.every((edge) =>
      /very little or no antisecretory activity/i.test(edge.activity.conditions.note ?? "")),
  );
  const propranololActivityByEdge = new Map(
    propranolol.metabolites.edges.map((edge) => [edge.id, edge.activity]),
  );
  assert.equal(
    propranololActivityByEdge.get("metabolite-edge:propranolol:4-hydroxy")?.value,
    "active-beta-blocker-preclinical",
  );
  assert.equal(
    propranololActivityByEdge.get("metabolite-edge:propranolol:4-hydroxy")?.sourceId,
    "source:pubmed-4400184",
  );
  assert.match(
    propranololActivityByEdge.get("metabolite-edge:propranolol:4-hydroxy")?.conditions.note ?? "",
    /animal|cat|guinea-pig/i,
  );
  assert.ok(
    propranolol.metabolites.edges
      .filter((edge) => edge.id !== "metabolite-edge:propranolol:4-hydroxy")
      .every((edge) => edge.activity.value === "unknown"),
  );
  assert.equal(propranolol.admeProfiles[0].bioavailability.valueQualifier, "approximately");
  assert.equal(propranolol.admeProfiles[0].proteinBinding.valueQualifier, "approximately");
  assert.equal(propranolol.admeProfiles[0].volumeOfDistribution.valueQualifier, "approximately");
  assert.equal(propranolol.admeProfiles[0].halfLife.valueQualifier, "range");

  assert.match(propranolol.flagship.explicitMissingFields.join(" "), /clearance/i);
  assert.match(
    celecoxib.flagship.explicitMissingFields.join(" "),
    /bioavailability.*null|not studied/i,
  );
  assert.match(omeprazole.flagship.explicitMissingFields.join(" "), /volume of distribution/i);
  assert.match(omeprazole.flagship.nomenclature.content?.conflictNote ?? "", /5-methoxy.*6-methoxy.*rac-5/i);
  assert.equal(omeprazole.chemistry.isomericSmiles, null);
});

test("synthesis, nomenclature, and comparisons expose complete bounded graphs", () => {
  const propranolol = createDrugDossierByIdOrSlug("propranolol", "en");
  const celecoxib = createDrugDossierByIdOrSlug("celecoxib", "en");
  const omeprazole = createDrugDossierByIdOrSlug("omeprazole", "en");
  assert.ok(propranolol?.flagship && celecoxib?.flagship && omeprazole?.flagship);

  for (const dossier of [propranolol, celecoxib, omeprazole]) {
    const synthesis = dossier.flagship.synthesis.content;
    assert.ok(synthesis);
    const materialIds = new Set(synthesis.materials.map((material) => material.id));
    for (const step of synthesis.steps) {
      assert.ok(step.inputMaterialIds.length > 0);
      assert.ok(step.inputMaterialIds.every((id) => materialIds.has(id)));
      assert.ok(step.outputMaterialId === null || materialIds.has(step.outputMaterialId));
    }
    assert.ok(
      synthesis.materials
        .filter((material) => material.smiles !== null)
        .every((material) => material.structureReviewStatus === "source-supported"),
    );
    for (const comparator of dossier.flagship.comparisons.content) {
      assert.ok(comparator.changedGroups.length > 0);
      assert.ok(comparator.propertyDifferences.length > 0);
      assert.ok(comparator.targetActionDifference);
      assert.ok(comparator.limitations.length > 0);
      assert.ok(
        comparator.changedGroups.every((field) =>
          comparator.sourceIds.includes(field.sourceId)),
      );
    }
    assert.deepEqual(
      new Set(dossier.admeProfiles[0].metabolites.map((edge) => edge.id)),
      new Set(dossier.metabolites.edges.map((edge) => edge.id)),
    );
    assert.ok(
      dossier.classifications.chemical.every((item) =>
        item.label.evidenceType === "curated-database"),
    );
    assert.ok(
      [...dossier.classifications.therapeutic, ...dossier.classifications.pharmacological]
        .every((item) => item.label.evidenceType === "regulatory"),
    );
  }

  assert.ok(
    propranolol.flagship.comparisons.content.every((item) =>
      item.targetActionDifference !== null),
  );
  assert.ok(
    celecoxib.flagship.comparisons.content.every((item) =>
      item.regulatoryContext !== null &&
      /withdrawn/i.test(item.regulatoryContext.value) &&
      /source:federal-register-/.test(item.regulatoryContext.sourceId)),
  );
  assert.ok(
    omeprazole.flagship.comparisons.content.every((item) =>
      item.targetActionDifference !== null && item.regulatoryContext === null),
  );

  const propranololNames = propranolol.flagship.nomenclature.content;
  assert.ok(propranololNames);
  assert.equal(
    propranololNames.variants[0].name.value,
    "1-naphthalen-1-yloxy-3-(propan-2-ylamino)propan-2-ol",
  );
  assert.ok(
    propranololNames.segments.some((segment) =>
      segment.text === "3-(propan-2-ylamino)"),
  );
  assert.ok(
    propranololNames.segments.some((segment) =>
      segment.text === "1-(naphthalen-1-yloxy)"),
  );
  assert.ok(
    celecoxib.flagship.nomenclature.content?.segments.some((segment) =>
      segment.text === "5-(4-methylphenyl)"),
  );
  assert.deepEqual(
    omeprazole.flagship.nomenclature.content?.variants.map((variant) => variant.name.value),
    [
      "6-methoxy-2-[(4-methoxy-3,5-dimethylpyridin-2-yl)methylsulfinyl]-1H-benzimidazole",
      "5-methoxy-2-[[(4-methoxy-3,5-dimethyl-2-pyridinyl)methyl]sulfinyl]-1H-benzimidazole",
      "rac-5-methoxy-2-{[(4-methoxy-3,5-dimethylpyridin-2-yl)methyl]sulfinyl}-1H-benzimidazole",
    ],
  );
  const lansoprazoleDifference = omeprazole.flagship.comparisons.content.find((item) =>
    item.id === "comparison:omeprazole:lansoprazole")?.changedGroups[0]?.value ?? "";
  assert.match(lansoprazoleDifference, /3-methyl\/4-\(2,2,2-trifluoroethoxy\)/);
  assert.match(lansoprazoleDifference, /unsubstituted benzimidazole/);
  assert.ok(propranolol.flagship.chemistryAnnotations.content.some((item) =>
    item.id === "annotation:propranolol:secondary-amine"));
  assert.ok(celecoxib.flagship.chemistryAnnotations.content.some((item) =>
    item.id === "annotation:celecoxib:trifluoromethyl"));
  assert.ok(omeprazole.flagship.chemistryAnnotations.content.some((item) =>
    item.id === "annotation:omeprazole:methoxy"));
});

test("TR and EN materializations keep scientific values and provenance stable", () => {
  for (const { slug } of flagshipScenarios) {
    const tr = createDrugDossierByIdOrSlug(slug, "tr");
    const en = createDrugDossierByIdOrSlug(slug, "en");
    assert.ok(tr?.flagship && en?.flagship);

    assert.equal(tr.flagship.productAnchor.sourceId, en.flagship.productAnchor.sourceId);
    assert.equal(
      tr.flagship.productAnchor.sourceEffectiveDate,
      en.flagship.productAnchor.sourceEffectiveDate,
    );
    assert.equal(tr.flagship.productAnchor.route, en.flagship.productAnchor.route);
    assert.equal(tr.flagship.productAnchor.formulation, en.flagship.productAnchor.formulation);
    const scientificFieldContract = (dossier) => dossier.admeProfiles.flatMap((profile) =>
      [...profile.absorption, ...profile.distribution, ...profile.metabolism, ...profile.excretion]
        .map((field) => [
          field.id,
          field.unit,
          field.sourceId,
          field.conditions.route,
          field.conditions.formulation,
          field.conditions.dose,
          field.conditions.fedState,
          field.conditions.cohortSize,
          field.unit ? field.value : null,
        ]));
    assert.deepEqual(scientificFieldContract(tr), scientificFieldContract(en));
    assert.deepEqual(
      tr.pharmacology.primaryTargets.map((target) => target.sourceIds),
      en.pharmacology.primaryTargets.map((target) => target.sourceIds),
    );
    assert.notEqual(tr.flagship.productAnchor.boundary, en.flagship.productAnchor.boundary);
  }
});

test("flagship validation fails closed on unresolved sources, missing form, and operational synthesis", () => {
  const seed = createFlagshipDossierSeed("molecule:propranolol", "en");
  assert.ok(seed);
  assert.deepEqual(validateFlagshipDossierSeed(seed, (id) => sourceById.get(id)), []);

  const unresolved = {
    ...seed,
    content: {
      ...seed.content,
      productAnchor: {
        ...seed.content.productAnchor,
        sourceId: "source:not-registered",
      },
    },
  };
  assert.ok(
    validateFlagshipDossierSeed(unresolved, (id) => sourceById.get(id))
      .some((issue) => issue.code === "source-unresolved"),
  );

  const missingForm = {
    ...seed,
    admeProfiles: [{
      ...seed.admeProfiles[0],
      administration: {
        ...seed.admeProfiles[0].administration,
        formulation: null,
      },
    }],
  };
  assert.ok(
    validateFlagshipDossierSeed(missingForm, (id) => sourceById.get(id))
      .some((issue) => issue.code === "adme-form-missing"),
  );

  const operational = {
    ...seed,
    content: {
      ...seed.content,
      synthesis: {
        ...seed.content.synthesis,
        content: {
          ...seed.content.synthesis.content,
          operationalDetailsIncluded: true,
        },
      },
    },
  };
  assert.ok(
    validateFlagshipDossierSeed(operational, (id) => sourceById.get(id))
      .some((issue) => issue.code === "synthesis-operational-content"),
  );
});
