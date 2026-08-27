import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  SYNTHESIS_ASSESSMENT_STATES,
  SYNTHESIS_SOURCE_EVIDENCE_STATES,
} = await tsImport("../lib/domain/synthesis-coverage.ts", import.meta.url);
const {
  SYNTHESIS_APPLICABILITY_STATES,
  SYNTHESIS_REVIEW_STATES,
  SYNTHESIS_ROUTE_COMPLETENESS_STATES,
  SYNTHESIS_ROUTE_TYPES,
} = await tsImport("../lib/domain/synthesis-route.ts", import.meta.url);
const {
  getSynthesisCoveragePublicationDecision,
  getSynthesisRoutePublicationDecision,
  validateCanonicalSynthesisRoute,
  validateSynthesisCoverageRecord,
  validateSynthesisCoverageRouteLinks,
  validateSynthesisCoverageSnapshot,
} = await tsImport("../lib/domain/synthesis-validation.ts", import.meta.url);

const SNAPSHOT = "catalog-snapshot:test-v1";
const NOW = "2026-08-27T08:00:00.000Z";
const LATER = "2026-08-27T08:05:00.000Z";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const syntheticIdentity = {
  catalogEntityId: "molecule:synthetic-test-only",
  preferredName: "Synthetic test molecule",
  aliases: ["Synthetic test alias"],
  casNumber: "99999-99-9",
  pubChemCid: 999999999,
  inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBB-C",
  connectivityKey: "AAAAAAAAAAAAAA",
  stereochemicalKey: "BBBBBBBBBB",
  canonicalSmiles: "CCO",
  isomericSmiles: null,
  sourceFormSmiles: "CCO",
  parentEntity: {
    id: "parent:AAAAAAAAAAAAAA",
    relation: "self",
    resolutionStatus: "self",
    exactIdentity: {
      catalogEntityId: "molecule:synthetic-test-only",
      pubChemCid: 999999999,
      inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBB-C",
    },
    resolutionEvidenceIds: [],
  },
  chemicalForm: {
    id: "form:synthetic-test-only:components-1",
    sourceKind: "single-component-source-form",
    normalizedKind: "free_parent",
    componentCount: 1,
    parentResolutionStatus: "not_applicable",
  },
  stereoisomer: {
    id: "stereo:AAAAAAAAAAAAAA-BBBBBBBBBB-C",
    specified: false,
  },
};

const secondSyntheticIdentity = {
  ...syntheticIdentity,
  catalogEntityId: "molecule:synthetic-test-only-secondary",
  preferredName: "Synthetic test molecule secondary",
  aliases: ["Synthetic test alias secondary"],
  casNumber: "88888-88-8",
  pubChemCid: 888888888,
  inchiKey: "CCCCCCCCCCCCCC-DDDDDDDDDD-N",
  connectivityKey: "CCCCCCCCCCCCCC",
  stereochemicalKey: "DDDDDDDDDD",
  canonicalSmiles: "CCN",
  sourceFormSmiles: "CCN",
  parentEntity: {
    id: "parent:CCCCCCCCCCCCCC",
    relation: "self",
    resolutionStatus: "self",
    exactIdentity: {
      catalogEntityId: "molecule:synthetic-test-only-secondary",
      pubChemCid: 888888888,
      inchiKey: "CCCCCCCCCCCCCC-DDDDDDDDDD-N",
    },
    resolutionEvidenceIds: [],
  },
  chemicalForm: {
    id: "form:synthetic-test-only-secondary:components-1",
    sourceKind: "single-component-source-form",
    normalizedKind: "free_parent",
    componentCount: 1,
    parentResolutionStatus: "not_applicable",
  },
  stereoisomer: {
    id: "stereo:CCCCCCCCCCCCCC-DDDDDDDDDD-N",
    specified: false,
  },
};

// Fully synthetic test-only evidence; it is not a real source or route record.
const patentEvidence = {
  id: "synthesis-source-evidence:synthetic-test-only-patent-example",
  resolutionState: "resolved",
  sourceId: "source:synthetic-test-only-patent",
  sourceKind: "patent",
  documentId: "TEST-DOCUMENT-001",
  patentFamilyId: "synthetic-family:test-only",
  title: "Synthetic test-only transformation record",
  url: "https://example.invalid/synthetic-test-only",
  publicationYear: 2026,
  retrievedAt: NOW,
  documentSha256: HASH_A,
  locator: {
    kind: "patent_example",
    value: "Synthetic example locator",
    page: "1",
    scheme: null,
    example: "test-only",
  },
  supportScope: "complete_route",
  licenseState: "permitted",
  reuseMode: "derived_facts_with_attribution",
};

const journalEvidence = {
  ...patentEvidence,
  id: "synthesis-source-evidence:journal-route-scheme-2",
  sourceId: "source:journal-route-scheme-2",
  sourceKind: "journal",
  documentId: "doi:10.1000/example",
  patentFamilyId: null,
  title: "Independent reported route",
  url: "https://doi.org/10.1000/example",
  publicationYear: 2001,
  documentSha256: HASH_B,
  locator: {
    kind: "journal_scheme",
    value: "Scheme 2",
    page: "4",
    scheme: "2",
    example: null,
  },
  supportScope: "route_segment",
};

const searchProviders = (candidateCount = 0) => [
  {
    provider: "patent",
    adapterId: "patent-adapter",
    adapterVersion: "1.0.0",
    status: "completed",
    queryCount: 4,
    candidateCount,
    searchedAt: NOW,
    errors: [],
  },
  {
    provider: "journal",
    adapterId: "journal-adapter",
    adapterVersion: "1.0.0",
    status: "completed",
    queryCount: 4,
    candidateCount: 0,
    searchedAt: NOW,
    errors: [],
  },
  {
    provider: "open_reaction_dataset",
    adapterId: "reaction-adapter",
    adapterVersion: "1.0.0",
    status: "completed",
    queryCount: 2,
    candidateCount: 0,
    searchedAt: NOW,
    errors: [],
  },
];

const searchScope = (identity, candidateCount = 0) => ({
  searchId: `synthesis-search:${identity.catalogEntityId}`,
  pipelineVersion: "discovery@1.0.0",
  configurationHash: HASH_A,
  catalogSnapshotId: SNAPSHOT,
  startedAt: NOW,
  completedAt: LATER,
  aliasesQueried: [identity.preferredName, ...identity.aliases],
  identifiersQueried: [
    { kind: "pubchem_cid", value: String(identity.pubChemCid) },
    { kind: "preferred_name", value: identity.preferredName },
    {
      kind: identity.isomericSmiles ? "isomeric_smiles" : "canonical_smiles",
      value: identity.isomericSmiles ?? identity.canonicalSmiles,
    },
  ],
  providers: searchProviders(candidateCount),
  exhaustiveInternetSearch: false,
});

const noRouteCoverage = (identity) => ({
  schemaVersion: 1,
  id: `synthesis-coverage:${identity.catalogEntityId}`,
  catalogSnapshotId: SNAPSHOT,
  identityScope: identity,
  assessmentState: "assessed",
  sourceEvidenceState: "none_found",
  applicability: "unclear",
  reviewState: "pending",
  licenseState: "unknown",
  sourceSearchScope: searchScope(identity),
  sourceEvidenceIds: [],
  routes: [],
  unresolvedReasons: ["Reported synthesis: Not resolved"],
  updatedAt: LATER,
});

const startingA = {
  id: "synthesis-material:test-only-start-a",
  role: "starting_material",
  label: "Synthetic starting material A",
  identityResolution: "name_only",
  canonicalSmiles: "CN",
  isomericSmiles: null,
  inchiKey: null,
  sourceEvidenceIds: [patentEvidence.id],
};
const startingB = {
  id: "synthesis-material:test-only-start-b",
  role: "starting_material",
  label: "Synthetic starting material B",
  identityResolution: "connectivity_only",
  canonicalSmiles: "CO",
  isomericSmiles: null,
  inchiKey: null,
  sourceEvidenceIds: [patentEvidence.id],
};
const target = {
  id: "synthesis-material:test-only-target",
  role: "target_parent",
  label: "Synthetic test-only target",
  identityResolution: "exact_inchi_key",
  canonicalSmiles: syntheticIdentity.canonicalSmiles,
  isomericSmiles: null,
  inchiKey: syntheticIdentity.inchiKey,
  sourceEvidenceIds: [patentEvidence.id],
};

const reportedStep = {
  id: "synthesis-route-step:test-only-01",
  order: 1,
  inputMaterialIds: [startingA.id, startingB.id],
  outputMaterialIds: [target.id],
  title: "Synthetic test-only transformation",
  reactionClass: {
    taxonomyId: "rxn:test-only-transformation",
    label: "Amine test transformation",
    normalizationState: "normalized",
    provenance: {
      taxonomyName: "Molevren reaction taxonomy",
      taxonomyVersion: "test-v1",
      confidence: 1,
      state: "reviewed",
    },
  },
  atomMapping: {
    mapperName: "manual-test-fixture-review",
    mapperVersion: "test-v1",
    confidence: 1,
    state: "reviewed",
    reason: "The test fixture's mapped bond change was explicitly reviewed.",
  },
  evidenceMode: "direct_reported",
  sourceEvidenceIds: [patentEvidence.id],
  bondChanges: [
    {
      kind: "formed",
      description: "C–N bond formation",
      atoms: [
        {
          materialId: target.id,
          atomMap: 1,
          element: "C",
          structureHash: HASH_B,
        },
        {
          materialId: target.id,
          atomMap: 2,
          element: "N",
          structureHash: HASH_B,
        },
      ],
      beforeOrder: 0,
      afterOrder: 1,
      mappingState: "reviewed",
    },
  ],
  stateChanges: [],
  reviewState: "reviewed",
  limitations: ["No scale, quantities, conditions or work-up are supplied."],
};

const validReportedRoute = {
  schemaVersion: 1,
  id: "synthesis-route:synthetic-test-only-test-document-example-4",
  coverageId: `synthesis-coverage:${syntheticIdentity.catalogEntityId}`,
  version: "1.0.0",
  identityScope: syntheticIdentity,
  applicability: "applicable",
  routeCompleteness: "complete",
  reviewState: "reviewed",
  licenseState: "permitted",
  routeFamilyId: "route-family:synthetic-test-only",
  variantKind: "original_patent",
  publicationYear: 2026,
  title: "Synthetic test molecule patent-reported test transformation",
  startBoundary: "Preformed synthetic precursor A and synthetic precursor B",
  stereochemicalStrategy: "Racemic connectivity; no absolute configuration claim.",
  targetMaterialId: target.id,
  materials: [startingA, startingB, target],
  steps: [reportedStep],
  gaps: [],
  sourceEvidenceIds: [patentEvidence.id],
  reviewEvents: [
    {
      reviewerId: "reviewer:chemistry-01",
      reviewerName: "Named chemistry reviewer",
      role: "chemistry_reviewer",
      routeVersion: "1.0.0",
      scopes: ["identity", "route", "reaction_class", "atom_mapping"],
      decision: "approve",
      reviewedAt: LATER,
    },
  ],
  safety: { operationalDetailsIncluded: false },
  routeType: "patent_reported",
  reportedSegments: [{
    sourceSegmentId: "synthetic-source-segment:test-only",
    stepIds: [reportedStep.id],
    sourceEvidenceIds: [patentEvidence.id],
  }],
  reportedCompleteRouteSourceIds: [patentEvidence.id],
};

test("canonical status vocabularies preserve the exact requested values", () => {
  assert.deepEqual(SYNTHESIS_ASSESSMENT_STATES, [
    "not_assessed",
    "searching",
    "assessed",
  ]);
  assert.deepEqual(SYNTHESIS_SOURCE_EVIDENCE_STATES, [
    "none_found",
    "candidate_sources",
    "direct_source_resolved",
  ]);
  assert.deepEqual(SYNTHESIS_ROUTE_TYPES, [
    "patent_reported",
    "literature_reported",
    "teaching_reconstruction",
    "computational_proposed",
  ]);
  assert.deepEqual(SYNTHESIS_REVIEW_STATES, [
    "pending",
    "reviewed",
    "verified",
    "withdrawn",
  ]);
  assert.deepEqual(SYNTHESIS_APPLICABILITY_STATES, [
    "applicable",
    "not_applicable",
    "unclear",
  ]);
  assert.deepEqual(SYNTHESIS_ROUTE_COMPLETENESS_STATES, [
    "complete",
    "partial",
    "upstream_gap",
    "convergent_partial",
    "unknown",
  ]);
});

test("an assessed no-route record remains publishable without implying novelty or impossibility", () => {
  const coverage = noRouteCoverage(secondSyntheticIdentity);
  assert.deepEqual(validateSynthesisCoverageRecord(coverage), []);
  assert.deepEqual(getSynthesisCoveragePublicationDecision(coverage), {
    coverageAllowed: true,
    blockerCodes: [],
  });
  assert.equal(coverage.sourceEvidenceState, "none_found");
  assert.match(coverage.unresolvedReasons[0], /Not resolved/);
  assert.doesNotMatch(
    coverage.unresolvedReasons.join(" "),
    /novel|patentable|impossible|unsynthesizable/i,
  );
});

test("pending discovery cannot inflate applicability without resolved direct route evidence", () => {
  const noneFoundApplicable = {
    ...noRouteCoverage(secondSyntheticIdentity),
    applicability: "applicable",
  };
  assert.ok(
    validateSynthesisCoverageRecord(noneFoundApplicable)
      .some((issue) =>
        issue.code === "applicable-synthesis-without-direct-route-evidence"
      ),
  );

  const candidateEvidence = {
    ...patentEvidence,
    resolutionState: "candidate",
    sourceId: null,
    locator: null,
    supportScope: "route_segment",
  };
  const candidateApplicable = {
    ...noRouteCoverage(syntheticIdentity),
    sourceEvidenceState: "candidate_sources",
    applicability: "applicable",
    sourceSearchScope: searchScope(syntheticIdentity, 1),
    sourceEvidenceIds: [candidateEvidence.id],
  };
  assert.ok(
    validateSynthesisCoverageRecord(candidateApplicable, [candidateEvidence])
      .some((issue) =>
        issue.code === "applicable-synthesis-without-direct-route-evidence"
      ),
  );
});

test("assessed coverage separates exact identity from the CID, name and SMILES actually queried", () => {
  const missingSmilesQuery = {
    ...noRouteCoverage(syntheticIdentity),
    sourceSearchScope: {
      ...searchScope(syntheticIdentity),
      identifiersQueried: searchScope(syntheticIdentity)
        .identifiersQueried.filter((query) => query.kind !== "canonical_smiles"),
    },
  };
  const codes = validateSynthesisCoverageRecord(missingSmilesQuery)
    .map((issue) => issue.code);
  assert.ok(codes.includes("missing-synthesis-smiles-query"));
  assert.equal(
    searchScope(syntheticIdentity).identifiersQueried.some(
      (query) => query.kind === "cas_number" || query.kind === "inchi_key",
    ),
    false,
  );

  const missingPatentProvider = {
    ...noRouteCoverage(syntheticIdentity),
    sourceSearchScope: {
      ...searchScope(syntheticIdentity),
      providers: searchProviders().filter((item) => item.provider !== "patent"),
    },
  };
  assert.ok(
    validateSynthesisCoverageRecord(missingPatentProvider)
      .some((issue) => issue.code === "missing-synthesis-search-provider"),
  );
});

test("coverage snapshot validation enforces one exact form/stereo identity per catalog record", () => {
  const records = [
    noRouteCoverage(syntheticIdentity),
    noRouteCoverage(secondSyntheticIdentity),
  ];
  const manifest = {
    schemaVersion: 1,
    catalogSnapshotId: SNAPSHOT,
    pipelineVersion: "discovery@1.0.0",
    generatedAt: LATER,
    recordCount: 2,
    coverageSha256: HASH_A,
  };
  assert.deepEqual(
    validateSynthesisCoverageSnapshot(
      records,
      [syntheticIdentity, secondSyntheticIdentity],
      manifest,
    ),
    [],
  );

  const drifted = [{
    ...records[0],
    identityScope: {
      ...records[0].identityScope,
      chemicalForm: {
        ...records[0].identityScope.chemicalForm,
        normalizedKind: "salt",
      },
    },
  }, records[1]];
  assert.ok(
    validateSynthesisCoverageSnapshot(
      drifted,
      [syntheticIdentity, secondSyntheticIdentity],
      manifest,
    ).some((issue) => issue.code === "synthesis-coverage-identity-drift"),
  );
  assert.ok(
    validateSynthesisCoverageSnapshot(
      records.slice(0, 1),
      [syntheticIdentity, secondSyntheticIdentity],
      manifest,
    ).some((issue) => issue.code === "synthesis-coverage-count-mismatch"),
  );
});

test("a direct, reviewed reported route passes the scientific publication gate", () => {
  assert.deepEqual(
    validateCanonicalSynthesisRoute(validReportedRoute, [patentEvidence]),
    [],
  );
  assert.deepEqual(
    getSynthesisRoutePublicationDecision(validReportedRoute, [patentEvidence]),
    {
      routeSummaryAllowed: true,
      routeDetailAllowed: true,
      presentation: "reported_route",
      blockerCodes: [],
    },
  );

  const linkOnlyEvidence = {
    ...patentEvidence,
    licenseState: "link_only",
    reuseMode: "metadata_and_link_only",
  };
  const linkOnlyDecision = getSynthesisRoutePublicationDecision(
    { ...validReportedRoute, licenseState: "link_only" },
    [linkOnlyEvidence],
  );
  assert.equal(linkOnlyDecision.routeSummaryAllowed, false);
  assert.equal(linkOnlyDecision.routeDetailAllowed, false);
  assert.equal(linkOnlyDecision.presentation, "withheld");
});

test("coverage route summaries remain linked to the exact canonical route identity", () => {
  const coverage = {
    ...noRouteCoverage(syntheticIdentity),
    sourceEvidenceState: "direct_source_resolved",
    applicability: "applicable",
    reviewState: "reviewed",
    licenseState: "permitted",
    sourceSearchScope: searchScope(syntheticIdentity, 1),
    sourceEvidenceIds: [patentEvidence.id],
    routes: [{
      routeId: validReportedRoute.id,
      routeType: validReportedRoute.routeType,
      routeCompleteness: validReportedRoute.routeCompleteness,
      reviewState: validReportedRoute.reviewState,
      licenseState: validReportedRoute.licenseState,
    }],
    unresolvedReasons: [],
  };
  assert.deepEqual(
    validateSynthesisCoverageRecord(coverage, [patentEvidence]),
    [],
  );
  assert.deepEqual(
    validateSynthesisCoverageRouteLinks([coverage], [validReportedRoute]),
    [],
  );

  const drifted = {
    ...coverage,
    routes: [{ ...coverage.routes[0], routeType: "teaching_reconstruction" }],
  };
  assert.ok(
    validateSynthesisCoverageRouteLinks([drifted], [validReportedRoute])
      .some((issue) => issue.code === "linked-synthesis-route-summary-drift"),
  );
});

test("candidate evidence and source-context steps never pass as a reported route", () => {
  const candidate = {
    ...patentEvidence,
    resolutionState: "candidate",
    sourceId: null,
    locator: null,
    supportScope: "route_segment",
  };
  const contextRoute = {
    ...validReportedRoute,
    steps: [{ ...reportedStep, evidenceMode: "source_context" }],
  };
  const codes = validateCanonicalSynthesisRoute(contextRoute, [candidate])
    .map((issue) => issue.code);
  assert.ok(
    codes.includes("complete-reported-synthesis-without-complete-direct-source"),
  );
  assert.ok(codes.includes("reported-synthesis-has-nondirect-step"));
  assert.equal(
    getSynthesisRoutePublicationDecision(contextRoute, [candidate]).presentation,
    "withheld",
  );
});

test("a teaching reconstruction requires multiple direct documents and cannot be verified", () => {
  const reconstruction = {
    ...validReportedRoute,
    routeType: "teaching_reconstruction",
    reviewState: "verified",
    steps: [{ ...reportedStep, reviewState: "verified" }],
    segments: [{
      sourceSegmentId: "source-segment:teaching-patent-example-4",
      stepIds: [reportedStep.id],
      sourceEvidenceIds: [patentEvidence.id],
      sourceLocator: patentEvidence.locator,
      identityResolution: {
        molecularIdentity: "exact_inchi_key",
        formRelationship: "exact",
        stereochemistry: "exact",
      },
      editorialBridge: {
        state: "none",
        fromSourceSegmentId: null,
        boundaryMaterialId: null,
        reportedAsOneCompleteRoute: false,
        description: null,
      },
      reviewState: "reviewed",
    }],
  };
  const codes = validateCanonicalSynthesisRoute(reconstruction, [patentEvidence])
    .map((issue) => issue.code);
  assert.ok(codes.includes("teaching-reconstruction-needs-multiple-sources"));
  assert.ok(codes.includes("teaching-reconstruction-marked-verified"));
  assert.ok(codes.includes("non-reported-synthesis-step-marked-verified"));

  const secondDocument = {
    ...journalEvidence,
    supportScope: "single_step",
  };
  const reconstructedIntermediate = {
    id: "synthesis-material:synthetic-test-only-reconstructed-intermediate",
    role: "intermediate",
    label: "Source-bounded intermediate",
    identityResolution: "exact_inchi_key",
    canonicalSmiles: "CCO",
    isomericSmiles: null,
    inchiKey: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N",
    sourceEvidenceIds: [patentEvidence.id, secondDocument.id],
  };
  const firstSegmentStep = {
    ...reportedStep,
    id: "synthesis-route-step:synthetic-test-only-reconstruction-01",
    inputMaterialIds: [startingA.id],
    outputMaterialIds: [reconstructedIntermediate.id],
    sourceEvidenceIds: [patentEvidence.id],
    reviewState: "reviewed",
    bondChanges: reportedStep.bondChanges.map((change) => ({
      ...change,
      atoms: change.atoms.map((atom) => ({
        ...atom,
        materialId: reconstructedIntermediate.id,
      })),
    })),
  };
  const secondSegmentStep = {
    ...reportedStep,
    id: "synthesis-route-step:synthetic-test-only-reconstruction-02",
    order: 2,
    inputMaterialIds: [reconstructedIntermediate.id, startingB.id],
    sourceEvidenceIds: [secondDocument.id],
    reviewState: "reviewed",
  };
  const twoSourceReconstruction = {
    ...reconstruction,
    reviewState: "reviewed",
    steps: [firstSegmentStep, secondSegmentStep],
    sourceEvidenceIds: [patentEvidence.id, secondDocument.id],
    materials: [
      startingA,
      { ...startingB, sourceEvidenceIds: [secondDocument.id] },
      reconstructedIntermediate,
      { ...target, sourceEvidenceIds: [secondDocument.id] },
    ],
    segments: [
      {
        sourceSegmentId: "source-segment:teaching-patent-example-4",
        stepIds: [firstSegmentStep.id],
        sourceEvidenceIds: [patentEvidence.id],
        sourceLocator: patentEvidence.locator,
        identityResolution: {
          molecularIdentity: "exact_inchi_key",
          formRelationship: "exact",
          stereochemistry: "exact",
        },
        editorialBridge: {
          state: "none",
          fromSourceSegmentId: null,
          boundaryMaterialId: null,
          reportedAsOneCompleteRoute: false,
          description: null,
        },
        reviewState: "reviewed",
      },
      {
        sourceSegmentId: "source-segment:teaching-journal-scheme-2",
        stepIds: [secondSegmentStep.id],
        sourceEvidenceIds: [secondDocument.id],
        sourceLocator: secondDocument.locator,
        identityResolution: {
          molecularIdentity: "exact_inchi_key",
          formRelationship: "source_backed_compatible",
          stereochemistry: "source_backed_compatible",
        },
        editorialBridge: {
          state: "educational_bridge",
          fromSourceSegmentId: "source-segment:teaching-patent-example-4",
          boundaryMaterialId: reconstructedIntermediate.id,
          reportedAsOneCompleteRoute: false,
          description: "This connection is an explicitly disclosed educational bridge between independently sourced segments.",
        },
        reviewState: "reviewed",
      },
    ],
  };
  assert.deepEqual(
    validateCanonicalSynthesisRoute(
      twoSourceReconstruction,
      [patentEvidence, secondDocument],
    ),
    [],
  );
  assert.equal(
    getSynthesisRoutePublicationDecision(
      twoSourceReconstruction,
      [patentEvidence, secondDocument],
    ).presentation,
    "teaching_reconstruction",
  );

  const mismatchedSegmentEvidence = {
    ...twoSourceReconstruction,
    segments: [
      {
        ...twoSourceReconstruction.segments[0],
        stepIds: [firstSegmentStep.id],
        sourceEvidenceIds: [secondDocument.id],
      },
      twoSourceReconstruction.segments[1],
    ],
  };
  assert.ok(
    validateCanonicalSynthesisRoute(
      mismatchedSegmentEvidence,
      [patentEvidence, secondDocument],
    ).some((issue) => issue.code === "reconstruction-segment-step-source-mismatch"),
  );
});

test("a computational proposal stays predicted even after review and can never be verified", () => {
  const computational = {
    ...validReportedRoute,
    routeType: "computational_proposed",
    variantKind: "alternative",
    steps: [{
      ...reportedStep,
      evidenceMode: "computational",
      sourceEvidenceIds: [],
      reviewState: "reviewed",
    }],
    materials: [startingA, startingB, target].map((material) => ({
      ...material,
      sourceEvidenceIds: [],
    })),
    sourceEvidenceIds: [],
    proposal: {
      engine: "retrosynthesis-engine",
      engineVersion: "1.2.0",
      runId: "proposal-run:001",
      generatedAt: NOW,
      inputHash: HASH_A,
      confidence: 0.62,
    },
  };
  assert.deepEqual(validateCanonicalSynthesisRoute(computational, []), []);
  const decision = getSynthesisRoutePublicationDecision(computational, []);
  assert.equal(decision.presentation, "computationally_proposed_route");
  assert.equal(decision.routeDetailAllowed, true);

  const invalid = {
    ...computational,
    reviewState: "verified",
    steps: [{ ...computational.steps[0], reviewState: "verified" }],
  };
  const codes = validateCanonicalSynthesisRoute(invalid, [])
    .map((issue) => issue.code);
  assert.ok(codes.includes("computational-synthesis-marked-verified"));
  assert.ok(codes.includes("non-reported-synthesis-step-marked-verified"));
  assert.equal(
    getSynthesisRoutePublicationDecision(invalid, []).presentation,
    "withheld",
  );
});

test("target identity drift, operational fields and covalent-less frames fail closed", () => {
  const unsafe = {
    ...validReportedRoute,
    targetMaterialId: target.id,
    materials: [startingA, startingB, {
      ...target,
      inchiKey: secondSyntheticIdentity.inchiKey,
    }],
    steps: [{
      ...reportedStep,
      bondChanges: [],
      stateChanges: [],
      yield: "75%",
    }],
  };
  const codes = validateCanonicalSynthesisRoute(unsafe, [patentEvidence])
    .map((issue) => issue.code);
  assert.ok(codes.includes("synthesis-target-identity-mismatch"));
  assert.ok(codes.includes("synthesis-step-without-change"));
  assert.ok(codes.includes("operational-synthesis-key"));
  assert.equal(
    getSynthesisRoutePublicationDecision(unsafe, [patentEvidence]).presentation,
    "withheld",
  );
});
