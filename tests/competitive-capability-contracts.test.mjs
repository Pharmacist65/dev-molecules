import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const capabilities = await tsImport(
  "../lib/domain/capabilities/index.ts",
  import.meta.url,
);

test("universal lookup cache is TTL-bound and capacity-bound", () => {
  let now = 1_000;
  const cache = capabilities.createBoundedLookupCache(
    { maxEntries: 2, maxAgeMs: 100 },
    () => now,
  );

  cache.set("a", { cid: 1 });
  cache.set("b", { cid: 2 });
  assert.equal(cache.get("a").cid, 1); // a is now most recently used
  cache.set("c", { cid: 3 });
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.size(), 2);

  now = 1_101;
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.size(), 0);
});

test("universal molecule records cannot silently become drug dossiers", () => {
  const eligible = capabilities.assessUniversalMoleculeBoundary({
    scope: "universal-molecule-lookup",
    providerId: "pubchem",
    providerRecordId: "2244",
  });
  assert.equal(eligible.eligible, true);

  const leakedDrugFields = capabilities.assessUniversalMoleculeBoundary({
    scope: "universal-molecule-lookup",
    providerId: "pubchem",
    providerRecordId: "2244",
    adme: { halfLife: "invented" },
    indications: ["invented"],
  });
  assert.equal(leakedDrugFields.eligible, false);
  assert.deepEqual(
    leakedDrugFields.violations.filter((violation) => /drug-only field/.test(violation)),
    [
      "Universal records cannot carry drug-only field: adme",
      "Universal records cannot carry drug-only field: indications",
    ],
  );
});

test("a Lens selection maps to both 2D and 3D or fails closed", () => {
  const mapping = [
    {
      canonicalAtomId: "atom:1",
      twoDimensionalAtomId: "2d:7",
      threeDimensionalAtomId: "3d:22",
    },
  ];
  assert.deepEqual(
    capabilities.mapLensSelectionAcrossRepresentations(["atom:1"], mapping),
    {
      ok: true,
      selection: {
        canonicalAtomIds: ["atom:1"],
        twoDimensionalAtomIds: ["2d:7"],
        threeDimensionalAtomIds: ["3d:22"],
      },
    },
  );
  assert.deepEqual(
    capabilities.mapLensSelectionAcrossRepresentations(["atom:missing"], mapping),
    { ok: false, missingCanonicalAtomIds: ["atom:missing"] },
  );

  assert.equal(
    capabilities.isLensFeatureEligible({
      id: "pharmacophore:1",
      kind: "pharmacophore-feature",
      label: "Donor",
      canonicalAtomIds: ["atom:1"],
      canonicalBondIds: [],
      origin: "computed",
      method: "",
      tool: null,
      sourceIds: [],
      limitations: [],
    }),
    false,
  );
});

test("Property Atlas values require provenance, method, conditions and uncertainty", () => {
  const base = {
    propertyId: "clogp",
    value: 2.3,
    unit: "dimensionless",
    valueKind: "computed",
    sourceIds: [],
    computationMethod: "XlogP-style calculation",
    tool: { name: "named-tool", version: "1.0.0" },
    conditions: { summary: "Neutral parent structure", values: {} },
    uncertainty: {
      kind: "estimated",
      value: null,
      unit: null,
      limitation: "Method-dependent estimate.",
    },
    limitations: ["Not an experimental logD value."],
  };
  assert.equal(capabilities.assessPropertyEligibility(base).eligible, true);
  assert.equal(
    capabilities.assessPropertyEligibility({ ...base, tool: null }).eligible,
    false,
  );
  assert.equal(
    capabilities.assessPropertyEligibility({
      ...base,
      propertyId: "aqueous-solubility",
    }).eligible,
    false,
  );
  assert.equal(
    capabilities.isPropertyComparisonSizeEligible([
      "molecule:a",
      "molecule:b",
      "molecule:c",
      "molecule:d",
      "molecule:e",
      "molecule:f",
    ]),
    true,
  );
  assert.equal(
    capabilities.isPropertyComparisonSizeEligible([
      "molecule:a",
      "molecule:b",
      "molecule:c",
      "molecule:d",
      "molecule:e",
      "molecule:f",
      "molecule:g",
    ]),
    false,
  );
});

test("expert measurements and experimental complexes retain scientific boundaries", () => {
  assert.equal(
    capabilities.isGeometryMeasurementEligible({
      kind: "torsion",
      atomIds: ["a", "b", "c"],
      value: 90,
      unit: "degree",
    }),
    false,
  );
  assert.equal(
    capabilities.isGeometryMeasurementEligible({
      kind: "distance",
      atomIds: ["a", "b"],
      value: 1.42,
      unit: "angstrom",
    }),
    true,
  );

  const predictedPose = capabilities.assessExperimentalComplexEligibility({
    id: "complex:1",
    moleculeId: "molecule:example",
    targetId: "target:example",
    targetName: "Example",
    targetFamily: "Example family",
    pdbId: "1ABC",
    evidenceKind: "predicted-ligand-pose",
    experimentalMethod: null,
    resolutionAngstrom: null,
    ligandInstanceId: null,
    bindingPocketId: null,
    contactingResidues: [],
    interactionTypes: [],
    pathwayIds: [],
    sourceIds: [],
    limitations: ["Predicted only."],
  });
  assert.equal(predictedPose.eligibleExperimentalComplex, false);
  assert.match(predictedPose.reasons.join(" "), /not an experimental bound structure/i);
});

test("export and quantum contracts reject screenshot-like or decorative evidence gaps", () => {
  const exportAssessment = capabilities.assessFigureExportRequest({
    moleculeIds: ["molecule:a"],
    representation: "3d",
    format: "svg",
    resolution: "high",
    widthPx: 1920,
    heightPx: 1080,
    transparentBackground: true,
    aspectRatio: "16:9",
    labelMode: "labelled",
    includeCitationStrip: true,
    highlightedFeatureIds: ["feature:ring"],
    sourceIds: [],
  });
  assert.equal(exportAssessment.eligible, false);
  assert.match(exportAssessment.reasons.join(" "), /SVG export is limited to 2D/i);
  assert.match(exportAssessment.reasons.join(" "), /citation strip/i);

  const quantumAssessment = capabilities.assessQuantumDataEligibility({
    id: "quantum:1",
    moleculeIdentity: "molecule:a",
    fields: [
      {
        kind: "homo",
        value: null,
        unit: null,
        surfaceLocator: null,
        structureIdentity: "structure:a",
      },
    ],
    status: "computed",
    sourceIds: [],
    backendId: null,
    method: "",
    basis: "",
    tool: { name: "", version: "" },
    conditions: "",
    limitations: [],
  });
  assert.equal(quantumAssessment.eligible, false);
  assert.ok(quantumAssessment.reasons.length >= 5);
});

test("interfaces and placeholders never satisfy the shipped evidence gate", () => {
  const architectureOnly = capabilities.evaluateFeatureReadiness({
    featureId: "property-atlas",
    scopeDecision: "in-scope",
    outOfScopeReason: null,
    evidence: {
      architectureContractPath: "lib/domain/capabilities/property-atlas.ts",
      realUserFlow: false,
      realSourceOrStructureData: false,
      automatedTest: {
        path: "tests/competitive-capability-contracts.test.mjs",
        passing: true,
      },
      screenshot: null,
    },
  });
  assert.equal(architectureOnly.status, "partial");
  assert.deepEqual(architectureOnly.failedShippingGates, [
    "real user flow",
    "real source or structure data",
    "current committed screenshot",
  ]);

  const routeAssessment = capabilities.assessFeatureRouteRegistration({
    featureId: "property-atlas",
    enabled: false,
    exposure: "primary-navigation",
    route: "/#property-atlas",
    placeholder: true,
    fallbackRoute: null,
    honestAvailabilityLabel: null,
    readiness: architectureOnly,
  });
  assert.equal(routeAssessment.eligible, false);
  assert.equal(routeAssessment.violations.length, 3);

  const shipped = capabilities.evaluateFeatureReadiness({
    featureId: "demonstration-only",
    scopeDecision: "in-scope",
    outOfScopeReason: null,
    evidence: {
      architectureContractPath: "lib/domain/example.ts",
      realUserFlow: true,
      realSourceOrStructureData: true,
      automatedTest: { path: "tests/example.test.mjs", passing: true },
      screenshot: {
        path: "docs/assets/screenshots/example.png",
        committed: true,
        current: true,
      },
    },
  });
  assert.equal(shipped.status, "shipped");
});

test("benchmark documents preserve the required products, fields, and matrix columns", async () => {
  const [benchmark, matrix, strategy] = await Promise.all([
    readFile(new URL("../docs/product/COMPETITIVE_BENCHMARK.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/product/FEATURE_PARITY_MATRIX.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/product/DIFFERENTIATION_STRATEGY.md", import.meta.url), "utf8"),
  ]);

  for (const product of ["MolecuLens", "MolAtlas", "MolScope", "MolVerse"]) {
    assert.match(benchmark, new RegExp(`^## ${product}$`, "m"));
  }
  for (const field of [
    "Product type",
    "Target users",
    "Core user jobs",
    "Search and input methods",
    "2D capabilities",
    "3D capabilities",
    "Analysis capabilities",
    "Educational capabilities",
    "AI capabilities",
    "Export capabilities",
    "Mobile/touch quality",
    "Scientific limitations",
    "What Dev Molecules should match",
    "What Dev Molecules should deliberately not copy",
    "What Dev Molecules must exceed",
  ]) {
    const matches = benchmark.match(new RegExp(`^\\| ${field} \\|`, "gm"));
    assert.equal(matches?.length, 4, `${field} should appear once for every benchmark`);
  }

  assert.match(
    matrix,
    /^\| Benchmark \| Capability \| Relevant to Dev Molecules\? \| Current Dev Molecules status \| Planned phase \| Data\/source dependency \| Implementation evidence \| Automated test \| Screenshot \| Limitation \| Final status \|$/m,
  );
  assert.match(strategy, /^### Curated Drug Atlas$/m);
  assert.match(strategy, /^### Universal Molecule Lookup$/m);
});

test("the parity matrix ships only evidence-complete flows, never contract-only work", async () => {
  const matrix = await readFile(
    new URL("../docs/product/FEATURE_PARITY_MATRIX.md", import.meta.url),
    "utf8",
  );
  const rows = matrix
    .split("\n")
    .filter((line) =>
      line.startsWith("|") &&
      !line.startsWith("| ---") &&
      !line.startsWith("| Benchmark"),
    );
  assert.ok(rows.length >= 30);

  const approvedDrugSearch = rows.find((line) =>
    line.includes("Common/generic approved-drug search"),
  );
  assert.ok(approvedDrugSearch);
  assert.equal(approvedDrugSearch.split("|").at(-2)?.trim(), "shipped");
  assert.match(approvedDrugSearch, /e2e\/dev-molecules-v2\.spec\.ts/);
  assert.match(approvedDrugSearch, /docs\/assets\/screenshots\/(?:home-en|atlas-browse)\.png/);

  for (const row of rows.filter((line) =>
    /contract only|contracts only|port and display eligibility gate exist|ports exist/i.test(line),
  )) {
    assert.notEqual(
      row.split("|").at(-2)?.trim(),
      "shipped",
      `contract-only row must remain unshipped: ${row}`,
    );
  }
});
