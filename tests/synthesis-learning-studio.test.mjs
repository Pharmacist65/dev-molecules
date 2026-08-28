import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  classifySynthesisLearningQuality,
  createSynthesisLearningStudioModel,
} = await tsImport(
  "../lib/application/synthesis-learning-studio.ts",
  import.meta.url,
);
const {
  createExactCatalogSynthesisStructureBundleFromRecord,
} = await tsImport(
  "../lib/application/synthesis-learning-evidence.ts",
  import.meta.url,
);

const candidateCoverage = {
  publicAlphaDrafts: [],
  routes: [],
  sourceEvidenceState: "candidate_sources",
  bestOutcome: "candidate_only",
  evidenceProcessing: null,
  reportedRouteFoundPendingReview: false,
};

function graphWithDepth(depth) {
  const materials = Array.from({ length: depth + 1 }, (_, index) => ({
    id: `synthesis-draft-material:m${index}`,
    label: `M${index}`,
    displayRole: index === depth ? "exact_target" : index === 0 ? "source_input" : "route_intermediate",
    sourceSmiles: "C".repeat(index + 1),
    inchiKey: `${String.fromCharCode(65 + index).repeat(14)}-${String.fromCharCode(70 + index).repeat(10)}-A`,
    identityResolution: "exact_inchi_key_computed",
    structureRepresentation: "independent_smiles_redraw",
  }));
  const steps = Array.from({ length: depth }, (_, index) => ({
    id: `synthesis-draft-step:s${index}`,
    inputMaterialIds: [materials[index].id],
    outputMaterialIds: [materials[index + 1].id],
  }));
  return {
    routeCompleteness: "upstream_gap",
    materials,
    steps,
    bridges: steps.slice(1).map((step, index) => ({
      fromStepId: steps[index].id,
      toStepId: step.id,
    })),
  };
}

test("learning quality keeps candidate and no-source records distinct", () => {
  assert.equal(
    classifySynthesisLearningQuality(candidateCoverage, []),
    "candidate_only",
  );
  assert.equal(
    classifySynthesisLearningQuality(null, []),
    "no_supporting_source_resolved",
  );
});

test("coverage transport failure remains unavailable and never becomes no-source", () => {
  const selection = {
    catalogEntityId: "molecule:imported:example",
    preferredName: "Example",
    molecularFormula: "C2H6O",
    pubChemCid: 702,
    inchiKey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N",
    canonicalSmiles: "CCO",
    isomericSmiles: null,
    structures: {
      twoD: { publicPath: "/2d.sdf", sourceUrl: "https://example.test/2d", sha256: "a".repeat(64) },
      threeD: { publicPath: "/3d.sdf", sourceUrl: "https://example.test/3d", sha256: "b".repeat(64), origin: "computed-3d-conformer" },
    },
    curatedMoleculeId: null,
    coverage: null,
    coverageLoadState: "unavailable",
  };

  assert.equal(
    classifySynthesisLearningQuality(null, [], "unavailable"),
    "coverage_unavailable",
  );
  const model = createSynthesisLearningStudioModel(selection, []);
  assert.equal(model.quality, "coverage_unavailable");
  assert.equal(model.surfaceState, "coverage_unavailable");
  assert.notEqual(model.quality, "no_supporting_source_resolved");
});

test("substantive partial requires three sequential exact-identity transformations", () => {
  assert.equal(
    classifySynthesisLearningQuality(candidateCoverage, [graphWithDepth(1)]),
    "fragmentary_route",
  );
  assert.equal(
    classifySynthesisLearningQuality(candidateCoverage, [graphWithDepth(2)]),
    "fragmentary_route",
  );
  assert.equal(
    classifySynthesisLearningQuality(candidateCoverage, [graphWithDepth(3)]),
    "substantive_partial_route",
  );
});

test("studio model keeps an unadmitted target 3D fail-closed while mechanisms and quiz facts stay zero", () => {
  const selection = {
    catalogEntityId: "molecule:imported:example",
    catalogSnapshotId: "catalog-snapshot-v1",
    stableSlug: "example",
    preferredName: "Example",
    aliases: [],
    molecularFormula: "C2H6O",
    pubChemCid: 702,
    inchiKey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N",
    canonicalSmiles: "CCO",
    isomericSmiles: null,
    structures: {
      twoD: {
        publicPath: "/catalog/structures/example-2d.sdf",
        sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/702",
        sha256: "a".repeat(64),
        byteLength: 1200,
        origin: "database-2d-record",
        provenance: "source_record",
      },
      threeD: {
        publicPath: "/catalog/structures/example-3d.sdf",
        sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/702",
        sha256: "b".repeat(64),
        byteLength: 1400,
        origin: "computed-3d-conformer",
        provenance: "computed",
      },
    },
    curatedMoleculeId: null,
    coverage: candidateCoverage,
    coverageLoadState: "ready",
  };
  const graph = {
    routeCompleteness: "upstream_gap",
    generatedAt: "2026-08-28T00:00:00.000Z",
    limitations: ["Synthetic test graph."],
    materials: [
      {
        id: "synthesis-draft-material:input",
        label: "Input",
        displayRole: "source_input",
        sourceSmiles: "C",
        inchiKey: "VNWKTOKETHGBQD-UHFFFAOYSA-N",
        identityResolution: "exact_inchi_key_computed",
        structureRepresentation: "independent_smiles_redraw",
      },
      {
        id: "synthesis-draft-material:target",
        label: "Example",
        displayRole: "exact_target",
        sourceSmiles: "CCO",
        inchiKey: selection.inchiKey,
        identityResolution: "exact_inchi_key_computed",
        structureRepresentation: "independent_smiles_redraw",
      },
    ],
    steps: [{
      id: "synthesis-draft-step:one",
      relationship: "target_forming_segment",
      inputMaterialIds: ["synthesis-draft-material:input"],
      outputMaterialIds: ["synthesis-draft-material:target"],
      citationId: "synthesis-draft-citation:one",
    }],
    bridges: [],
    alternatives: [{
      id: "synthesis-draft-alternative:one",
      finalStepId: "synthesis-draft-step:one",
      upstreamStepIds: [],
      routeType: "source_supported_fragment",
      routeCompleteness: "upstream_gap",
      unresolvedGapCount: 1,
    }],
    citations: [{
      id: "synthesis-draft-citation:one",
      label: "Synthetic ORD record",
      locator: { value: "Dataset record/ord-synthetic" },
      url: "https://open-reaction-database.org/id/ord-synthetic",
    }],
  };
  const sourceInput = graph.materials[0];
  const registeredSourceInput = createExactCatalogSynthesisStructureBundleFromRecord(
    {
      id: sourceInput.id,
      inchiKey: sourceInput.inchiKey,
      sourceSmiles: sourceInput.sourceSmiles,
      exactIdentityResolved: true,
    },
    {
      catalogEntityId: "molecule:imported:input",
      catalogSnapshotId: selection.catalogSnapshotId,
      pubChemCid: 297,
      inchiKey: sourceInput.inchiKey,
      structures: {
        twoD: {
          path: "/catalog/structures/input-2d.sdf",
          sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/297",
          sha256: "c".repeat(64),
          byteLength: 900,
        },
        threeD: {
          path: "/catalog/structures/input-3d.sdf",
          sourceUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/297",
          sha256: "d".repeat(64),
          byteLength: 1100,
        },
      },
    },
  );
  assert.ok(registeredSourceInput);
  const model = createSynthesisLearningStudioModel(selection, [graph], {
    structureAssetsByInchiKey: new Map([
      [sourceInput.inchiKey, registeredSourceInput],
    ]),
  });
  const step = model.routes[0].steps[0];
  assert.equal(step.outputs[0].structureAssets.threeD.status, "unavailable");
  assert.equal(
    step.outputs[0].structureAssets.threeD.reason,
    "computed_conformer_unavailable",
  );
  assert.equal(model.targetStructureAssets.threeD.status, "unavailable");
  assert.equal(model.targetStructureAssets.twoD.representation, "catalog_2d_record");
  assert.equal(step.inputs[0].structureAssets.threeD.status, "unavailable");
  assert.equal(step.inputs[0].structureAssets.threeD.syntheticFallbackCreated, false);
  assert.equal(step.mechanism.assurance, "mechanism_not_resolved");
  assert.equal(step.quizGate.state, "ineligible");
  assert.deepEqual(model.capabilityCounts, {
    materialsWithCatalogComputed3D: 0,
    sourceSupportedMechanisms: 0,
    reactionClassEducationalMechanisms: 0,
    mappedMoleculeSpecificMechanisms: 0,
    structuredLearningTasks: 0,
  });
});
