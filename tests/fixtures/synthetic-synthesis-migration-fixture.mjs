const NOW = "2026-01-02T00:00:00.000Z";

const SYNTHETIC_INCHI_KEYS = [
  "AAAAAAAAAAAAAA-BBBBBBBBBB-C",
  "CCCCCCCCCCCCCC-DDDDDDDDDD-E",
  "EEEEEEEEEEEEEE-FFFFFFFFFF-G",
  "GGGGGGGGGGGGGG-HHHHHHHHHH-I",
  "IIIIIIIIIIIIII-JJJJJJJJJJ-K",
  "KKKKKKKKKKKKKK-LLLLLLLLLL-M",
];

const identityFor = (index) => {
  const inchiKey = SYNTHETIC_INCHI_KEYS[index - 1];
  const [connectivityKey, stereochemicalKey] = inchiKey.split("-");
  const catalogEntityId = `synthetic-test-only-entity-${index}`;
  return {
    catalogEntityId,
    preferredName: `Synthetic test identity ${index}`,
    aliases: [`Synthetic test alias ${index}`],
    casNumber: `synthetic-test-only-${index}`,
    pubChemCid: 900_000 + index,
    inchiKey,
    connectivityKey,
    stereochemicalKey,
    canonicalSmiles: "C".repeat(index + 1),
    isomericSmiles: null,
    sourceFormSmiles: "C".repeat(index + 1),
    parentEntity: {
      id: `synthetic-test-only-parent-${index}`,
      relation: "self",
      resolutionStatus: "self",
      exactIdentity: { catalogEntityId, pubChemCid: 900_000 + index, inchiKey },
      resolutionEvidenceIds: [],
    },
    chemicalForm: {
      id: `synthetic-test-only-form-${index}`,
      sourceKind: "single-component-source-form",
      normalizedKind: "free_parent",
      componentCount: 1,
      parentResolutionStatus: "not_applicable",
    },
    stereoisomer: {
      id: `synthetic-test-only-stereo-${index}`,
      specified: false,
    },
  };
};

const evidenceFor = (index) => ({
  id: `synthesis-source-evidence:synthetic-test-only-${index}`,
  resolutionState: "resolved",
  sourceId: `source:synthetic-test-only-${index}`,
  sourceKind: "patent",
  documentId: `SYNTHETIC-TEST-DOCUMENT-${index}`,
  patentFamilyId: `synthetic-test-only-family-${index}`,
  title: `Synthetic test-only source ${index}`,
  url: `https://example.invalid/synthetic-test-only-document-${index}`,
  publicationYear: 2026,
  retrievedAt: NOW,
  documentSha256: null,
  locator: {
    kind: "patent_example",
    value: `Synthetic test-only locator ${index}`,
    page: String(index),
    scheme: null,
    example: `Synthetic ${index}`,
  },
  supportScope: index <= 2 ? "complete_route" : "route_segment",
  licenseState: "link_only",
  reuseMode: "metadata_and_link_only",
});

const material = ({ id, role, label, evidenceIds, identity = null }) => ({
  id: `synthesis-material:synthetic-test-only-${id}`,
  role,
  label,
  identityResolution: identity ? "exact_inchi_key" : "name_only",
  canonicalSmiles: identity?.canonicalSmiles ?? null,
  isomericSmiles: identity?.isomericSmiles ?? null,
  inchiKey: identity?.inchiKey ?? null,
  sourceEvidenceIds: evidenceIds,
});

const step = ({ id, order, inputs, outputs, evidenceIds, evidenceMode }) => ({
  id: `synthesis-route-step:synthetic-test-only-${id}`,
  order,
  inputMaterialIds: inputs,
  outputMaterialIds: outputs,
  title: `Synthetic test-only transformation ${id}`,
  reactionClass: {
    taxonomyId: null,
    label: "Synthetic unclassified transformation",
    normalizationState: "unclassified",
    provenance: {
      taxonomyName: null,
      taxonomyVersion: null,
      confidence: null,
      state: "not_computed",
    },
  },
  atomMapping: {
    mapperName: null,
    mapperVersion: null,
    confidence: null,
    state: "not_mapped",
    reason: "No atom-level assertion is made in this synthetic fixture.",
  },
  evidenceMode,
  sourceEvidenceIds: evidenceIds,
  bondChanges: [{
    kind: "formed",
    description: "Synthetic source-bounded connectivity change.",
    atoms: null,
    beforeOrder: null,
    afterOrder: null,
    mappingState: "not_mapped",
  }],
  stateChanges: [],
  reviewState: "pending",
  limitations: ["Synthetic test-only record without operational details."],
});

const reportedRouteFor = (index, evidence, routeCompleteness) => {
  const identity = identityFor(index);
  const sourceIds = [evidence.id];
  const start = material({
    id: `route-${index}-start`,
    role: "starting_material",
    label: `Synthetic starting boundary ${index}`,
    evidenceIds: sourceIds,
  });
  const target = material({
    id: `route-${index}-target`,
    role: "target_parent",
    label: identity.preferredName,
    evidenceIds: sourceIds,
    identity,
  });
  const routeStep = step({
    id: `route-${index}-step-1`,
    order: 1,
    inputs: [start.id],
    outputs: [target.id],
    evidenceIds: sourceIds,
    evidenceMode: "direct_reported",
  });
  const complete = routeCompleteness === "complete";
  return {
    schemaVersion: 1,
    id: `synthesis-route:synthetic-test-only-${index}`,
    coverageId: `synthesis-coverage:${identity.catalogEntityId}`,
    version: "1.0.0",
    identityScope: identity,
    applicability: "applicable",
    routeCompleteness,
    reviewState: "pending",
    licenseState: "link_only",
    routeFamilyId: `synthetic-test-only-route-family-${index}`,
    variantKind: "original_patent",
    publicationYear: 2026,
    title: `Synthetic test-only reported route ${index}`,
    startBoundary: `Synthetic test-only boundary ${index}`,
    stereochemicalStrategy: "No stereochemical assignment is asserted.",
    targetMaterialId: target.id,
    materials: [start, target],
    steps: [routeStep],
    gaps: complete ? [] : [{
      positionAfterStepId: null,
      kind: "upstream_precursor",
      description: "Synthetic upstream boundary is intentionally unresolved.",
    }],
    sourceEvidenceIds: sourceIds,
    reviewEvents: [],
    safety: { operationalDetailsIncluded: false },
    routeType: "patent_reported",
    reportedSegments: [{
      sourceSegmentId: `synthetic-test-only-segment-${index}`,
      stepIds: [routeStep.id],
      sourceEvidenceIds: sourceIds,
    }],
    reportedCompleteRouteSourceIds: complete ? sourceIds : [],
  };
};

const teachingRouteFor = (evidenceA, evidenceB) => {
  const identity = identityFor(6);
  const sourceA = [evidenceA.id];
  const sourceB = [evidenceB.id];
  const routeSources = [evidenceA.id, evidenceB.id];
  const startA = material({
    id: "route-6-start-a",
    role: "starting_material",
    label: "Synthetic teaching boundary A",
    evidenceIds: sourceA,
  });
  const startB = material({
    id: "route-6-start-b",
    role: "starting_material",
    label: "Synthetic teaching boundary B",
    evidenceIds: sourceB,
  });
  const bridgeIdentity = {
    canonicalSmiles: "CCN",
    isomericSmiles: null,
    inchiKey: "MMMMMMMMMMMMMM-NNNNNNNNNN-O",
  };
  const bridge = material({
    id: "route-6-bridge",
    role: "intermediate",
    label: "Synthetic exact bridge",
    evidenceIds: routeSources,
    identity: bridgeIdentity,
  });
  const target = material({
    id: "route-6-target",
    role: "target_parent",
    label: identity.preferredName,
    evidenceIds: sourceB,
    identity,
  });
  const stepA = step({
    id: "route-6-step-1",
    order: 1,
    inputs: [startA.id],
    outputs: [bridge.id],
    evidenceIds: sourceA,
    evidenceMode: "reconstructed",
  });
  const stepB = step({
    id: "route-6-step-2",
    order: 2,
    inputs: [bridge.id, startB.id],
    outputs: [target.id],
    evidenceIds: sourceB,
    evidenceMode: "reconstructed",
  });
  return {
    schemaVersion: 1,
    id: "synthesis-route:synthetic-test-only-6",
    coverageId: `synthesis-coverage:${identity.catalogEntityId}`,
    version: "1.0.0",
    identityScope: identity,
    applicability: "applicable",
    routeCompleteness: "convergent_partial",
    reviewState: "pending",
    licenseState: "link_only",
    routeFamilyId: "synthetic-test-only-route-family-6",
    variantKind: "alternative",
    publicationYear: 2026,
    title: "Synthetic test-only teaching reconstruction",
    startBoundary: "Two synthetic source-bounded inputs",
    stereochemicalStrategy: "No stereochemical assignment is asserted.",
    targetMaterialId: target.id,
    materials: [startA, startB, bridge, target],
    steps: [stepA, stepB],
    gaps: [{
      positionAfterStepId: stepA.id,
      kind: "source_conflict",
      description: "The inter-document connection remains educational and pending review.",
    }],
    sourceEvidenceIds: routeSources,
    reviewEvents: [],
    safety: { operationalDetailsIncluded: false },
    routeType: "teaching_reconstruction",
    segments: [
      {
        sourceSegmentId: "synthetic-test-only-teaching-segment-a",
        stepIds: [stepA.id],
        sourceEvidenceIds: sourceA,
        sourceLocator: evidenceA.locator,
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
        reviewState: "pending",
      },
      {
        sourceSegmentId: "synthetic-test-only-teaching-segment-b",
        stepIds: [stepB.id],
        sourceEvidenceIds: sourceB,
        sourceLocator: evidenceB.locator,
        identityResolution: {
          molecularIdentity: "exact_inchi_key",
          formRelationship: "exact",
          stereochemistry: "exact",
        },
        editorialBridge: {
          state: "educational_bridge",
          fromSourceSegmentId: "synthetic-test-only-teaching-segment-a",
          boundaryMaterialId: bridge.id,
          reportedAsOneCompleteRoute: false,
          description: "Synthetic exact boundary joins independent test documents.",
        },
        reviewState: "pending",
      },
    ],
  };
};

const auditEntryFor = (route, index, exclusions) => {
  const retained = route.steps.map((routeStep, stepIndex) => ({
    legacyStepRef: `synthetic-test-only-legacy-step-${index}-${stepIndex + 1}`,
    disposition: "retained",
    canonicalStepId: routeStep.id,
    exclusionReason: null,
  }));
  const excluded = exclusions.map((exclusionReason, exclusionIndex) => ({
    legacyStepRef: `synthetic-test-only-excluded-step-${index}-${exclusionIndex + 1}`,
    disposition: "excluded",
    canonicalStepId: null,
    exclusionReason,
  }));
  return {
    legacyRouteRef: `synthetic-test-only-legacy-route-${index}`,
    canonicalRouteId: route.id,
    legacyTargetIdentity: {
      catalogEntityId: route.identityScope.catalogEntityId,
      pubChemCid: route.identityScope.pubChemCid,
      inchiKey: route.identityScope.inchiKey,
    },
    legacyStepCount: retained.length + excluded.length,
    stepDispositions: [...retained, ...excluded],
  };
};

export const makeSyntheticPrivateMigrationInput = () => {
  const evidence = Array.from({ length: 6 }, (_, index) => evidenceFor(index + 1));
  const routes = [
    reportedRouteFor(1, evidence[0], "complete"),
    reportedRouteFor(2, evidence[1], "complete"),
    reportedRouteFor(3, evidence[2], "upstream_gap"),
    reportedRouteFor(4, evidence[3], "upstream_gap"),
    reportedRouteFor(5, evidence[4], "upstream_gap"),
    teachingRouteFor(evidence[4], evidence[5]),
  ];
  const legacyAudit = [
    auditEntryFor(routes[0], 1, ["target_form_identity_divergence"]),
    auditEntryFor(routes[1], 2, []),
    auditEntryFor(routes[2], 3, ["source_context_not_promoted"]),
    auditEntryFor(routes[3], 4, ["source_context_not_promoted"]),
    auditEntryFor(routes[4], 5, ["source_context_not_promoted"]),
    auditEntryFor(routes[5], 6, []),
  ];
  return {
    schemaVersion: 1,
    routes,
    evidence,
    legacyAudit,
    migrationReport: {
      schemaVersion: 1,
      migrationVersion: "synthetic-test-only-migration-1.0.0",
      expectedLegacyRouteCount: 6,
      legacyRouteCount: 6,
      accountedRouteCount: 6,
      evidenceCount: 6,
      routeTypeCounts: {
        patent_reported: 5,
        literature_reported: 0,
        teaching_reconstruction: 1,
        computational_proposed: 0,
      },
      routeCompletenessCounts: {
        complete: 2,
        partial: 0,
        upstream_gap: 3,
        convergent_partial: 1,
        unknown: 0,
      },
      reviewStateCounts: {
        pending: 6,
        reviewed: 0,
        verified: 0,
        withdrawn: 0,
      },
      licenseStateCounts: {
        permitted: 0,
        attribution_required: 0,
        link_only: 6,
        restricted: 0,
        mixed: 0,
        unknown: 0,
      },
      evidenceSourceKindCounts: {
        patent: 6,
        journal: 0,
        aggregator: 0,
        open_reaction_dataset: 0,
      },
      patentFamilyCount: 6,
      excludedSourceContextStepCount: 3,
      excludedTargetFormStepCount: 1,
      invariants: {
        allSixLegacyRoutesAccounted: true,
        exactCidAndInchiKeyJoin: true,
        operationalDetailsIncluded: false,
      },
    },
  };
};
