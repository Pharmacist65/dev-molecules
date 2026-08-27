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

const propranololIdentity = {
  catalogEntityId: "molecule:propranolol",
  preferredName: "Propranolol",
  aliases: ["Propanolol"],
  casNumber: "525-66-6",
  pubChemCid: 4946,
  inchiKey: "KZJWDPNRJALLNS-VJSFXXLFSA-N",
  connectivityKey: "KZJWDPNRJALLNS",
  stereochemicalKey: "VJSFXXLFSA",
  canonicalSmiles: "CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O",
  isomericSmiles: null,
  sourceFormSmiles: "CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O",
  parentEntity: {
    id: "parent:KZJWDPNRJALLNS",
    relation: "self",
    resolutionStatus: "self",
    exactIdentity: {
      catalogEntityId: "molecule:propranolol",
      pubChemCid: 4946,
      inchiKey: "KZJWDPNRJALLNS-VJSFXXLFSA-N",
    },
    resolutionEvidenceIds: [],
  },
  chemicalForm: {
    id: "form:kzjwdpnrjallns-vjsfxxlfsa-n:components-1",
    sourceKind: "single-component-source-form",
    normalizedKind: "free_parent",
    componentCount: 1,
    parentResolutionStatus: "not_applicable",
  },
  stereoisomer: {
    id: "stereo:KZJWDPNRJALLNS-VJSFXXLFSA-N",
    specified: false,
  },
};

const aspirinIdentity = {
  ...propranololIdentity,
  catalogEntityId: "molecule:aspirin",
  preferredName: "Aspirin",
  aliases: ["Acetylsalicylic acid"],
  casNumber: "50-78-2",
  pubChemCid: 2244,
  inchiKey: "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
  connectivityKey: "BSYNRYMUTXBXSQ",
  stereochemicalKey: "UHFFFAOYSA",
  canonicalSmiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
  sourceFormSmiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
  parentEntity: {
    id: "parent:BSYNRYMUTXBXSQ",
    relation: "self",
    resolutionStatus: "self",
    exactIdentity: {
      catalogEntityId: "molecule:aspirin",
      pubChemCid: 2244,
      inchiKey: "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
    },
    resolutionEvidenceIds: [],
  },
  chemicalForm: {
    id: "form:bsynrymutxbxsq-uhfffaoysa-n:components-1",
    sourceKind: "single-component-source-form",
    normalizedKind: "free_parent",
    componentCount: 1,
    parentResolutionStatus: "not_applicable",
  },
  stereoisomer: {
    id: "stereo:BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
    specified: false,
  },
};

const patentEvidence = {
  id: "synthesis-source-evidence:us3337628a-example-4",
  resolutionState: "resolved",
  sourceId: "source:patent-us3337628a",
  sourceKind: "patent",
  documentId: "US3337628A",
  patentFamilyId: "family:us3337628",
  title: "3-Naphthyloxy-2-hydroxypropylamines",
  url: "https://patents.google.com/patent/US3337628A/en",
  publicationYear: 1967,
  retrievedAt: NOW,
  documentSha256: HASH_A,
  locator: {
    kind: "patent_example",
    value: "Example 4, named starting pair and product paragraph",
    page: "7",
    scheme: null,
    example: "4",
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
  id: "synthesis-material:propranolol-epoxide",
  role: "starting_material",
  label: "Naphthoxy epoxide",
  identityResolution: "name_only",
  canonicalSmiles: null,
  isomericSmiles: null,
  inchiKey: null,
  sourceEvidenceIds: [patentEvidence.id],
};
const startingB = {
  id: "synthesis-material:isopropylamine",
  role: "starting_material",
  label: "Isopropylamine",
  identityResolution: "connectivity_only",
  canonicalSmiles: "CC(C)N",
  isomericSmiles: null,
  inchiKey: null,
  sourceEvidenceIds: [patentEvidence.id],
};
const target = {
  id: "synthesis-material:propranolol-parent",
  role: "target_parent",
  label: "Propranolol parent",
  identityResolution: "exact_inchi_key",
  canonicalSmiles: propranololIdentity.canonicalSmiles,
  isomericSmiles: null,
  inchiKey: propranololIdentity.inchiKey,
  sourceEvidenceIds: [patentEvidence.id],
};

const reportedStep = {
  id: "synthesis-route-step:propranolol-01",
  order: 1,
  inputMaterialIds: [startingA.id, startingB.id],
  outputMaterialIds: [target.id],
  title: "Open the epoxide with the amine",
  reactionClass: {
    taxonomyId: "rxn:epoxide-aminolysis",
    label: "Amine epoxide opening",
    normalizationState: "normalized",
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
  id: "synthesis-route:propranolol-us3337628a-example-4",
  coverageId: `synthesis-coverage:${propranololIdentity.catalogEntityId}`,
  version: "1.0.0",
  identityScope: propranololIdentity,
  applicability: "applicable",
  routeCompleteness: "complete",
  reviewState: "reviewed",
  licenseState: "permitted",
  routeFamilyId: "route-family:propranolol-epoxide-opening",
  variantKind: "original_patent",
  publicationYear: 1967,
  title: "Propranolol patent-reported epoxide opening",
  startBoundary: "Preformed naphthoxy epoxide and isopropylamine",
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
  ]);
});

test("an assessed no-route record remains publishable without implying novelty or impossibility", () => {
  const coverage = noRouteCoverage(aspirinIdentity);
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
    ...noRouteCoverage(aspirinIdentity),
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
    ...noRouteCoverage(propranololIdentity),
    sourceEvidenceState: "candidate_sources",
    applicability: "applicable",
    sourceSearchScope: searchScope(propranololIdentity, 1),
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
    ...noRouteCoverage(propranololIdentity),
    sourceSearchScope: {
      ...searchScope(propranololIdentity),
      identifiersQueried: searchScope(propranololIdentity)
        .identifiersQueried.filter((query) => query.kind !== "canonical_smiles"),
    },
  };
  const codes = validateSynthesisCoverageRecord(missingSmilesQuery)
    .map((issue) => issue.code);
  assert.ok(codes.includes("missing-synthesis-smiles-query"));
  assert.equal(
    searchScope(propranololIdentity).identifiersQueried.some(
      (query) => query.kind === "cas_number" || query.kind === "inchi_key",
    ),
    false,
  );

  const missingPatentProvider = {
    ...noRouteCoverage(propranololIdentity),
    sourceSearchScope: {
      ...searchScope(propranololIdentity),
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
    noRouteCoverage(propranololIdentity),
    noRouteCoverage(aspirinIdentity),
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
      [propranololIdentity, aspirinIdentity],
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
      [propranololIdentity, aspirinIdentity],
      manifest,
    ).some((issue) => issue.code === "synthesis-coverage-identity-drift"),
  );
  assert.ok(
    validateSynthesisCoverageSnapshot(
      records.slice(0, 1),
      [propranololIdentity, aspirinIdentity],
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
    ...noRouteCoverage(propranololIdentity),
    sourceEvidenceState: "direct_source_resolved",
    applicability: "applicable",
    reviewState: "reviewed",
    licenseState: "permitted",
    sourceSearchScope: searchScope(propranololIdentity, 1),
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
  assert.ok(codes.includes("reported-synthesis-without-complete-direct-source"));
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
      stepIds: [reportedStep.id],
      sourceEvidenceIds: [patentEvidence.id],
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
    id: "synthesis-material:propranolol-reconstructed-intermediate",
    role: "intermediate",
    label: "Source-bounded intermediate",
    identityResolution: "name_only",
    canonicalSmiles: null,
    isomericSmiles: null,
    inchiKey: null,
    sourceEvidenceIds: [patentEvidence.id],
  };
  const firstSegmentStep = {
    ...reportedStep,
    id: "synthesis-route-step:propranolol-reconstruction-01",
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
    id: "synthesis-route-step:propranolol-reconstruction-02",
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
        stepIds: [firstSegmentStep.id],
        sourceEvidenceIds: [patentEvidence.id],
      },
      {
        stepIds: [secondSegmentStep.id],
        sourceEvidenceIds: [secondDocument.id],
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
      inchiKey: aspirinIdentity.inchiKey,
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
