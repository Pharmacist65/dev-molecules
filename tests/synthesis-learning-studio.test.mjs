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
