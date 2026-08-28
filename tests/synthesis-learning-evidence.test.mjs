import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  CURRENT_SYNTHESIS_REACTION_CLASS_LIBRARY,
  buildSynthesisMaterialStructureRegistry,
  buildSynthesisMaterialStructureRegistryFromManifest,
  createExactCatalogSynthesisStructureBundle,
  createIndependentSynthesis2DStructureBundle,
  createReactionClassEducationLibrary,
  createUnresolvedSynthesisMechanism,
  deriveStructuredSynthesisQuizGate,
  getReactionClassEducationEntry,
  getSynthesisStep3DGate,
  parseSynthesisIntermediate3DManifest,
  resolveSynthesisMechanismAssurance,
  summarizeSynthesisLearningCapabilities,
} = await tsImport(
  "../lib/application/synthesis-learning-evidence.ts",
  import.meta.url,
);

const material = {
  id: "synthesis-draft-material:exact",
  inchiKey: "ABCDEFGHIJKLMN-ABCDEFGHIJ-A",
  sourceSmiles: "CCO",
  exactIdentityResolved: true,
};

const asset = (dimension, shaCharacter = dimension === "2d" ? "a" : "b") => ({
  path: `/catalog/structures/pubchem/cid-123-${dimension}.sdf`,
  sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/123/record/SDF?record_type=${dimension}`,
  sha256: shaCharacter.repeat(64),
  byteLength: 1200,
});

const entity = {
  id: "molecule:imported:exact",
  identity: { pubChemCid: 123, inchiKey: material.inchiKey },
  structures: { twoD: asset("2d"), threeD: asset("3d") },
  provenance: { snapshotId: "catalog-snapshot-v1" },
};

const exactTargetIdentity = {
  catalogEntityId: entity.id,
  catalogSnapshotId: entity.provenance.snapshotId,
  pubChemCid: entity.identity.pubChemCid,
  inchiKey: entity.identity.inchiKey,
  identityMatch: "exact_inchi_key",
};

const exactStepIdentity = {
  stepId: "synthesis-draft-step:test-only",
  targetIdentity: exactTargetIdentity,
};

const emptyEvidenceRegistry = { schemaVersion: 1, entries: [] };
const emptyReviewRegistry = { schemaVersion: 1, decisions: [] };

test("exact catalog identity admits only a source 2D + computed 3D provenance pair", () => {
  const bundle = createExactCatalogSynthesisStructureBundle(
    material,
    entity,
    "/dev-molecules/",
  );
  assert.ok(bundle);
  assert.equal(bundle.twoD.representation, "catalog_2d_record");
  assert.equal(bundle.twoD.identity.identityMatch, "exact_inchi_key");
  assert.equal(bundle.threeD.status, "available");
  assert.equal(bundle.threeD.origin, "computed-3d-conformer");
  assert.equal(bundle.threeD.provenance.kind, "computed");
  assert.equal(bundle.threeD.provenance.source2DId, bundle.twoD.assetId);
  assert.equal(
    bundle.threeD.provenance.source2DRelationship,
    "exact_identity_anchor_not_disclosed_generator_input",
  );
  assert.equal(bundle.threeD.provenance.generatorVersion, null);
  assert.equal(bundle.threeD.provenance.parameters, null);
  assert.equal(bundle.threeD.provenance.generatedAt, null);
  assert.equal(bundle.threeD.provenance.energyMinimizationState, "not_disclosed_by_source");
  assert.equal(bundle.threeD.provenance.experimentalStructure, false);
  assert.equal(bundle.threeD.provenance.crystalStructure, false);
  assert.equal(bundle.threeD.provenance.bioactiveConformation, false);
  assert.match(bundle.threeD.publicPath, /^\/dev-molecules\/catalog\//u);

  assert.equal(
    createExactCatalogSynthesisStructureBundle(material, {
      ...entity,
      identity: { ...entity.identity, inchiKey: "ZZZZZZZZZZZZZZ-ABCDEFGHIJ-A" },
    }),
    null,
  );
  assert.equal(
    createExactCatalogSynthesisStructureBundle(material, {
      ...entity,
      structures: {
        ...entity.structures,
        threeD: { ...entity.structures.threeD, sha256: "not-a-hash" },
      },
    }),
    null,
  );
});

test("catalog registry fails closed for ambiguous, missing, and invalid provenance", () => {
  const exact = buildSynthesisMaterialStructureRegistry([material], [entity]);
  assert.equal(exact.exactComputed3DIdentityCount, 1);
  assert.equal(exact.resolutions[0].state, "resolved");

  const ambiguous = buildSynthesisMaterialStructureRegistry(
    [material],
    [entity, { ...entity, id: "molecule:imported:duplicate" }],
  );
  assert.equal(ambiguous.exactComputed3DIdentityCount, 0);
  assert.equal(ambiguous.resolutions[0].state, "ambiguous_catalog_identity");

  const missing = buildSynthesisMaterialStructureRegistry([material], []);
  assert.equal(missing.resolutions[0].state, "no_exact_catalog_identity");
  const unresolved = buildSynthesisMaterialStructureRegistry(
    [{ ...material, exactIdentityResolved: false }],
    [entity],
  );
  assert.equal(unresolved.resolutions[0].state, "identity_unresolved");
});

test("independent 2D redraw refuses to label an unresolved identity as exact", () => {
  assert.throws(
    () => createIndependentSynthesis2DStructureBundle({
      ...material,
      exactIdentityResolved: false,
    }),
    /requires an exact resolved identity/iu,
  );
  assert.throws(
    () => createIndependentSynthesis2DStructureBundle({
      ...material,
      inchiKey: "not-an-inchi-key",
    }),
    /requires an exact resolved identity/iu,
  );
});

test("step to 3D opens only an exact computed output and never fabricates an intermediate", () => {
  const exactBundle = createExactCatalogSynthesisStructureBundle(material, entity);
  assert.ok(exactBundle);
  const output = { ...material, structureAssets: exactBundle };
  const step = { id: "step:one", outputs: [output] };
  const allowed = getSynthesisStep3DGate(step, material.id);
  assert.equal(allowed.state, "allowed");
  assert.equal(allowed.asset.provenance.kind, "computed");

  const unknown = getSynthesisStep3DGate(step, "synthesis-draft-material:other");
  assert.deepEqual(
    { state: unknown.state, reason: unknown.reason },
    { state: "2d_only", reason: "not_step_output" },
  );
  const redrawOnly = createIndependentSynthesis2DStructureBundle(material);
  assert.equal(redrawOnly.threeD.syntheticFallbackCreated, false);
  const no3d = getSynthesisStep3DGate(
    { id: "step:two", outputs: [{ ...material, structureAssets: redrawOnly }] },
    material.id,
  );
  assert.deepEqual(
    { state: no3d.state, reason: no3d.reason },
    { state: "2d_only", reason: "no_exact_catalog_identity" },
  );
});

const reactionClassEntry = {
  reactionClassId: "reaction-class:test-only",
  canonicalName: "Synthetic test class",
  names: { tr: "Sentetik test sınıfı", en: "Synthetic test class" },
  generalTransformation: "Synthetic test transformation",
  typicalNucleophile: null,
  typicalElectrophile: null,
  leavingGroupPattern: null,
  mechanismStages: ["Synthetic structured stage"],
  stereochemicalNotes: [],
  limitations: ["Test-only entry; not product chemistry."],
  educationSources: [{
    id: "education-source:test-only",
    title: "Synthetic source",
    url: "https://example.test/education",
    locator: "Test section",
    licenseState: "link_only",
    reviewState: "reviewed",
  }],
  version: "library-1",
  genericMechanismDisclaimer:
    "General reaction-class mechanism; it was not reported as the mechanism by this specific step source.",
};

const reactionClassLibrary = createReactionClassEducationLibrary(
  "library-1",
  [reactionClassEntry.reactionClassId],
  [reactionClassEntry],
);

const mechanismEvidenceEntry = {
  id: "source-evidence:mechanism-test-only",
  stepIdentity: exactStepIdentity,
  sourceDocumentId: "document:mechanism-test-only",
  sourceUrl: "https://example.test/mechanism",
  sourceLocator: "Scheme test-only, panel A",
  supportScopes: ["exact_step_mechanism"],
  reactionClassId: null,
  structuredFactIds: [],
};

const reactionClassEvidenceEntry = {
  id: "source-evidence:reaction-class-test-only",
  stepIdentity: exactStepIdentity,
  sourceDocumentId: "document:reaction-class-test-only",
  sourceUrl: "https://example.test/reaction-class",
  sourceLocator: "Dataset record test-only",
  supportScopes: ["reaction_class_assignment"],
  reactionClassId: reactionClassEntry.reactionClassId,
  structuredFactIds: [],
};

const mechanismEvidenceRegistry = {
  schemaVersion: 1,
  entries: [mechanismEvidenceEntry, reactionClassEvidenceEntry],
};

const mechanismReviewRegistry = {
  schemaVersion: 1,
  decisions: [
    {
      id: "review-decision:mechanism-test-only",
      evidenceId: mechanismEvidenceEntry.id,
      stepIdentity: exactStepIdentity,
      reviewState: "pending",
    },
    {
      id: "review-decision:reaction-class-test-only",
      evidenceId: reactionClassEvidenceEntry.id,
      stepIdentity: exactStepIdentity,
      reviewState: "reviewed",
    },
  ],
};

const emptyMechanismInput = {
  stepIdentity: exactStepIdentity,
  evidenceRegistry: emptyEvidenceRegistry,
  reviewRegistry: emptyReviewRegistry,
  reactionClassLibrary: CURRENT_SYNTHESIS_REACTION_CLASS_LIBRARY,
  reactionClass: {
    resolutionState: "unclassified",
    id: null,
    sourceEvidenceIds: [],
  },
  sourceMechanismEvidence: null,
  atomMapping: {
    state: "not_mapped",
    electronMoveEndpointsResolved: false,
    stepIdentity: null,
  },
};

test("mechanism assurance resolves only registry-bound exact-step evidence", () => {
  const unresolved = resolveSynthesisMechanismAssurance(emptyMechanismInput);
  assert.equal(unresolved.assurance, "mechanism_not_resolved");
  assert.equal(unresolved.curvedArrowEligible, false);

  const education = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    reactionClassLibrary,
    reactionClass: {
      resolutionState: "normalized",
      id: reactionClassEntry.reactionClassId,
      sourceEvidenceIds: [reactionClassEvidenceEntry.id],
    },
  });
  assert.equal(education.assurance, "reaction_class_educational_mechanism");
  assert.equal(education.specificStepSourceReportsMechanism, false);
  assert.equal(education.visualizationState, "general_reaction_class");
  assert.equal(education.reactionClassLibraryVersion, reactionClassLibrary.version);
  assert.deepEqual(education.sourceEvidenceIds, [reactionClassEvidenceEntry.id]);
  assert.equal(education.curvedArrowEligible, false);

  const noProvidedLibrary = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    reactionClass: {
      resolutionState: "normalized",
      id: reactionClassEntry.reactionClassId,
      sourceEvidenceIds: [reactionClassEvidenceEntry.id],
    },
  });
  assert.equal(noProvidedLibrary.assurance, "mechanism_not_resolved");

  const supported = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    sourceMechanismEvidence: {
      sourceEvidenceIds: [mechanismEvidenceEntry.id],
    },
  });
  assert.equal(supported.assurance, "source_supported_mechanism");
  assert.equal(supported.reviewState, "pending");
  assert.equal(supported.sourceLocator, mechanismEvidenceEntry.sourceLocator);
  assert.equal(supported.visualizationState, "source_supported_unmapped");
  assert.equal(supported.curvedArrowEligible, false);

  const unregistered = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    sourceMechanismEvidence: {
      sourceEvidenceIds: ["source-evidence:caller-assertion-only"],
    },
  });
  assert.equal(unregistered.assurance, "mechanism_not_resolved");

  const wrongStep = {
    ...exactStepIdentity,
    stepId: "synthesis-draft-step:other",
  };
  const crossStep = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    stepIdentity: wrongStep,
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    sourceMechanismEvidence: {
      sourceEvidenceIds: [mechanismEvidenceEntry.id],
    },
  });
  assert.equal(crossStep.assurance, "mechanism_not_resolved");

  const crossIdentity = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    stepIdentity: {
      ...exactStepIdentity,
      targetIdentity: {
        ...exactTargetIdentity,
        inchiKey: "ZZZZZZZZZZZZZZ-ABCDEFGHIJ-A",
      },
    },
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    sourceMechanismEvidence: {
      sourceEvidenceIds: [mechanismEvidenceEntry.id],
    },
  });
  assert.equal(crossIdentity.assurance, "mechanism_not_resolved");

  const computedMapping = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    sourceMechanismEvidence: {
      sourceEvidenceIds: [mechanismEvidenceEntry.id],
    },
    atomMapping: {
      state: "computed",
      electronMoveEndpointsResolved: true,
      stepIdentity: exactStepIdentity,
    },
  });
  assert.equal(computedMapping.visualizationState, "source_supported_unmapped");
  assert.equal(computedMapping.curvedArrowEligible, false);

  const mapped = resolveSynthesisMechanismAssurance({
    ...emptyMechanismInput,
    evidenceRegistry: mechanismEvidenceRegistry,
    reviewRegistry: mechanismReviewRegistry,
    sourceMechanismEvidence: {
      sourceEvidenceIds: [mechanismEvidenceEntry.id],
    },
    atomMapping: {
      state: "reviewed",
      electronMoveEndpointsResolved: true,
      stepIdentity: exactStepIdentity,
    },
  });
  assert.equal(mapped.visualizationState, "mapped_molecule_specific");
  assert.equal(mapped.curvedArrowEligible, true);
});

test("reaction-class library remains empty until the observed set and education sources resolve", () => {
  assert.equal(CURRENT_SYNTHESIS_REACTION_CLASS_LIBRARY.observedClassSetState, "unresolved");
  assert.deepEqual(CURRENT_SYNTHESIS_REACTION_CLASS_LIBRARY.entries, []);
  assert.equal(
    createReactionClassEducationLibrary("library-1", [], []).entries.length,
    0,
  );

  assert.equal(reactionClassLibrary.observedClassSetState, "resolved");
  assert.equal(
    getReactionClassEducationEntry(
      reactionClassLibrary,
      reactionClassEntry.reactionClassId,
    ),
    reactionClassEntry,
  );
});

test("quiz gate admits only reviewed resolved exact source facts and rejects pending facts", () => {
  const resolvedFactId = "synthesis-fact:resolved-class";
  const quizEvidence = {
    id: "source-evidence:quiz-test-only",
    stepIdentity: exactStepIdentity,
    sourceDocumentId: "document:quiz-test-only",
    sourceUrl: "https://example.test/quiz",
    sourceLocator: "Dataset record test-only",
    supportScopes: ["structured_fact"],
    reactionClassId: null,
    structuredFactIds: [resolvedFactId],
  };
  const quizContext = {
    stepIdentity: exactStepIdentity,
    evidenceRegistry: { schemaVersion: 1, entries: [quizEvidence] },
    reviewRegistry: {
      schemaVersion: 1,
      decisions: [{
        id: "review-decision:quiz-test-only",
        evidenceId: quizEvidence.id,
        stepIdentity: exactStepIdentity,
        reviewState: "reviewed",
      }],
    },
  };
  const facts = [
    {
      id: resolvedFactId,
      stepIdentity: exactStepIdentity,
      kind: "reaction_class",
      value: "Synthetic test class",
      resolutionState: "resolved",
      origin: "source_supported",
      exactIdentityResolved: true,
      sourceEvidenceIds: [quizEvidence.id],
      sourceLocator: "Dataset record test-only",
      reviewState: "reviewed",
    },
    {
      id: "synthesis-fact:predicted-bond",
      stepIdentity: exactStepIdentity,
      kind: "formed_bond",
      value: "C-N",
      resolutionState: "resolved",
      origin: "predicted",
      exactIdentityResolved: true,
      sourceEvidenceIds: ["model:test-only"],
      sourceLocator: "Model output",
      reviewState: "pending",
    },
    {
      id: "synthesis-fact:pending-order",
      stepIdentity: exactStepIdentity,
      kind: "step_order",
      value: "2",
      resolutionState: "resolved",
      origin: "source_supported",
      exactIdentityResolved: true,
      sourceEvidenceIds: [quizEvidence.id],
      sourceLocator: "Dataset record test-only",
      reviewState: "pending",
    },
    {
      id: "synthesis-fact:caller-assertion-only",
      stepIdentity: exactStepIdentity,
      kind: "formed_bond",
      value: "C-N",
      resolutionState: "resolved",
      origin: "source_supported",
      exactIdentityResolved: true,
      sourceEvidenceIds: ["source-evidence:not-registered"],
      sourceLocator: "Caller supplied locator",
      reviewState: "reviewed",
    },
  ];
  const gate = deriveStructuredSynthesisQuizGate(facts, quizContext);
  assert.equal(gate.state, "eligible");
  assert.deepEqual(gate.eligibleTaskKinds, ["choose_reaction_class"]);
  assert.deepEqual(gate.admittedFactIds, [resolvedFactId]);
  assert.ok(gate.rejectedFactIds.includes("synthesis-fact:pending-order"));
  assert.ok(gate.rejectedFactIds.includes("synthesis-fact:caller-assertion-only"));
  assert.equal(gate.rejectedFactIds.length, 3);
  assert.equal(gate.llmChemistryFactGenerationAllowed, false);
  assert.equal(deriveStructuredSynthesisQuizGate(facts).state, "ineligible");
  assert.equal(
    deriveStructuredSynthesisQuizGate(facts, {
      ...quizContext,
      stepIdentity: {
        ...exactStepIdentity,
        stepId: "synthesis-draft-step:other",
      },
    }).state,
    "ineligible",
  );
  assert.equal(deriveStructuredSynthesisQuizGate([]).state, "ineligible");
});

test("current unresolved mechanism and empty facts report zero mechanism and quiz coverage", () => {
  const redrawOnly = createIndependentSynthesis2DStructureBundle(material);
  const counts = summarizeSynthesisLearningCapabilities([{
    steps: [{
      inputs: [{ structureAssets: redrawOnly }],
      outputs: [{ structureAssets: redrawOnly }],
      mechanism: createUnresolvedSynthesisMechanism(),
      quizGate: deriveStructuredSynthesisQuizGate([]),
    }],
  }]);
  assert.deepEqual(counts, {
    materialsWithCatalogComputed3D: 0,
    sourceSupportedMechanisms: 0,
    reactionClassEducationalMechanisms: 0,
    mappedMoleculeSpecificMechanisms: 0,
    structuredLearningTasks: 0,
  });
});

test("strict generation admits 62 of 73 observed route-boundary identities and leaves failures 2D-only", async () => {
  const draftDirectory = new URL("../public/catalog/synthesis/drafts/", import.meta.url);
  const graphFiles = (await readdir(draftDirectory)).filter((name) =>
    /^[a-f\d]{32}\.json$/u.test(name),
  );
  const materialByInchiKey = new Map();
  for (const fileName of graphFiles) {
    const graph = JSON.parse(await readFile(new URL(fileName, draftDirectory), "utf8"));
    for (const candidate of graph.materials) {
      if (candidate.displayRole !== "route_intermediate") continue;
      if (!materialByInchiKey.has(candidate.inchiKey)) {
        materialByInchiKey.set(candidate.inchiKey, {
          id: candidate.id,
          inchiKey: candidate.inchiKey,
          sourceSmiles: candidate.sourceSmiles,
          exactIdentityResolved: candidate.identityResolution === "exact_inchi_key_computed",
        });
      }
    }
  }

  const manifest = JSON.parse(
    await readFile(new URL("../public/catalog/manifest.json", import.meta.url), "utf8"),
  );
  const entities = [];
  for (const descriptor of manifest.shards.filter((item) => item.dimension === "alphabetic")) {
    const shard = JSON.parse(
      await readFile(new URL(`../public/catalog/${descriptor.path}`, import.meta.url), "utf8"),
    );
    entities.push(...shard.records);
  }
  const registry = buildSynthesisMaterialStructureRegistry(
    [...materialByInchiKey.values()],
    entities,
    "/dev-molecules/",
  );
  assert.equal(materialByInchiKey.size, 73);
  assert.equal(registry.exactComputed3DIdentityCount, 73);
  assert.equal(registry.resolutions.filter((item) => item.state !== "resolved").length, 0);
  for (const bundle of registry.byInchiKey.values()) {
    assert.equal(bundle.threeD.status, "available");
    assert.equal(bundle.threeD.provenance.kind, "computed");
    assert.equal(
      bundle.threeD.provenance.source2DRelationship,
      "exact_identity_anchor_not_disclosed_generator_input",
    );
    assert.equal(bundle.threeD.provenance.experimentalStructure, false);
  }

  const assetManifest = parseSynthesisIntermediate3DManifest(JSON.parse(
    await readFile(
      new URL(
        "../public/catalog/synthesis/reports/intermediate-3d-assets.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ));
  assert.deepEqual(assetManifest.summary, {
    observedExactRouteBoundaryMaterialIdentityCount: 73,
    computedRouteBoundaryMaterial3dAssetCount: 62,
    rdkitGeneratedRouteBoundaryMaterial3dAssetCount: 62,
    catalogComputedFallback3dAssetCount: 0,
    rdkitGenerationFailureCount: 11,
    routeAlternativesWithComputedIntermediate3d: 451,
    unresolvedRouteBoundaryMaterialIdentityCount: 11,
  });
  assert.equal(assetManifest.generationFailures.length, 11);
  assert.ok(assetManifest.generationFailures.every(
    (failure) => failure.fallbackState === "two_d_only_fail_closed",
  ));
  assert.equal(assetManifest.unresolvedInchiKeys.length, 11);
  assert.equal(
    assetManifest.entries.filter(
      (entry) => entry.threeD.representation === "rdkit_generated_conformer",
    ).length,
    62,
  );
  assert.equal(
    assetManifest.entries.filter(
      (entry) => entry.threeD.representation === "catalog_computed_conformer",
    ).length,
    0,
  );
  assert.ok(assetManifest.entries.every((entry) =>
    entry.materialRole === "pending_route_boundary_material" &&
    entry.materialRoleReviewState === "pending" &&
    entry.materialRoleDisclosure ===
      "Exact-identity route-boundary material; intermediate role pending scientific review."
  ));
  const portableRegistry = buildSynthesisMaterialStructureRegistryFromManifest(
    [...materialByInchiKey.values()],
    assetManifest,
    "/dev-molecules/",
  );
  assert.equal(portableRegistry.exactComputed3DIdentityCount, 62);
  assert.equal(
    portableRegistry.resolutions.filter((item) => item.state === "resolved").length,
    62,
  );
  assert.equal(
    portableRegistry.resolutions.filter(
      (item) => item.state === "no_exact_catalog_identity",
    ).length,
    11,
  );
  for (const bundle of portableRegistry.byInchiKey.values()) {
    assert.match(bundle.threeD.publicPath, /^\/dev-molecules\/catalog\//u);
    if (bundle.threeD.representation === "rdkit_generated_conformer") {
      assert.equal(bundle.threeD.provenance.generator, "RDKit ETKDGv3");
      assert.equal(bundle.threeD.provenance.generatorVersion, "2026.03.5");
      assert.equal(bundle.threeD.provenance.source2DRelationship, "generator_input");
      assert.equal(bundle.threeD.provenance.experimentalStructure, false);
      const assetBytes = await readFile(new URL(
        `../public${bundle.threeD.publicPath.replace("/dev-molecules", "")}`,
        import.meta.url,
      ));
      const assetText = assetBytes.toString("utf8");
      assert.match(
        assetText,
        new RegExp(
          `>  <PUBCHEM_COMPOUND_CID>[^\\n]*\\n${bundle.threeD.identity.pubChemCid}\\n`,
          "u",
        ),
      );
      assert.equal(
        createHash("sha256").update(assetBytes).digest("hex"),
        bundle.threeD.sha256,
      );
    }
  }

  const tampered = structuredClone(assetManifest);
  const generatedEntry = tampered.entries.find(
    (entry) => entry.threeD.representation === "rdkit_generated_conformer",
  );
  assert.ok(generatedEntry);
  generatedEntry.threeD.provenance.source2DId = "catalog-structure:2d:tampered";
  assert.throws(
    () => parseSynthesisIntermediate3DManifest(tampered),
    /provenance boundary/iu,
  );
});
