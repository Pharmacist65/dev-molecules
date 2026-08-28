import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  buildSynthesisLearningCoverageKpiReport,
  buildSynthesisTargetedGapRecordsReport,
  synthesisLearningCoverageKpiReportUrl,
  synthesisTargetedGapRecordsReportUrl,
} = await tsImport(
  "../scripts/synthesis/build-learning-coverage-kpi.mts",
  import.meta.url,
);
const {
  loadPublicAlphaSynthesisQualityInput,
} = await tsImport(
  "../scripts/synthesis/analyze-public-alpha-quality.mts",
  import.meta.url,
);
const {
  validateSynthesisRouteGapRecord,
} = await tsImport(
  "../lib/domain/synthesis-learning-coverage.ts",
  import.meta.url,
);

const input = await loadPublicAlphaSynthesisQualityInput();

test("five-state learning coverage exhausts all 1,552 canonical records without promotion", async () => {
  const report = buildSynthesisLearningCoverageKpiReport(input);
  const generated = JSON.parse(
    await readFile(synthesisLearningCoverageKpiReportUrl, "utf8"),
  );
  assert.deepEqual(generated, report);
  assert.deepEqual(report.scope, {
    canonicalCoverageRecordCount: 1_552,
    publicDraftGraphCount: 639,
    newDiscoveryPerformed: false,
    networkFetchPerformed: false,
    routePromotionPerformed: false,
  });
  assert.deepEqual(report.continuousEducationalRouteCoverage.byState, {
    complete_learning_route: 0,
    substantive_partial_route: 0,
    fragmentary_route: 639,
    candidate_only: 529,
    no_supporting_source_resolved: 384,
  });
  assert.equal(report.continuousEducationalRouteCoverage.total, 1_552);
  assert.equal(
    Object.values(report.continuousEducationalRouteCoverage.byState)
      .reduce((sum, count) => sum + count, 0),
    1_552,
  );
  assert.match(
    report.continuousEducationalRouteCoverage.projectionSha256,
    /^[a-f\d]{64}$/u,
  );
  assert.deepEqual(report.promotionOutcome, {
    promotedCompleteLearningRouteMolecules: 0,
    promotedSubstantivePartialRouteMolecules: 0,
    reason:
      "This build-time projection classifies existing canonical coverage and validated public-alpha graphs only; it performs no source discovery, chemistry inference, or route promotion.",
  });
  assert.ok(Object.values(report.invariants).every(Boolean));
});

test("gap and evidence KPIs retain source, mapping, and review boundaries", () => {
  const report = buildSynthesisLearningCoverageKpiReport(input);
  assert.deepEqual(report.gapCoverage, {
    coverageRecordsWithOpenGap: 1_552,
    resolvedGapRecordCount: 0,
    targetedGapRecordCount: 3_174,
    targetedGapCoverageRecordCount: 1_168,
    explicitPublicDraftGapOccurrences: 2_645,
    byPrimaryKind: {
      source_discovery: 384,
      route_extraction: 529,
      upstream_continuity: 639,
      intermediate_identity: 0,
      transformation: 0,
      form_or_stereochemistry: 0,
    },
    byPrimaryUnresolvedReason: {
      no_supporting_source_in_recorded_scope: 384,
      candidate_source_not_extracted: 529,
      candidate_source_details_redacted: 0,
      upstream_boundary_not_resolved: 639,
      adjacent_identity_not_resolved: 0,
      required_transformation_not_resolved: 0,
      source_locator_not_resolved: 0,
      form_or_stereochemistry_conflict: 0,
      atom_mapping_not_resolved: 0,
      scientific_review_pending: 0,
    },
    recordedUnresolvedBoundaries: {
      requiredTransformationNotResolvedStepCount: 4_342,
      atomMappingNotResolvedStepCount: 4_342,
      scientificReviewPendingDraftRouteCount: 2_645,
      sourceLocatorNotResolvedPublishedStepCount: 0,
    },
  });
  assert.deepEqual(report.evidenceBoundaries, {
    assessmentState: { not_assessed: 0, searching: 0, assessed: 1_552 },
    publicCoverageSourceState: {
      none_found: 384,
      candidate_sources: 1_168,
      direct_source_resolved: 0,
    },
    reviewState: { pending: 1_552, reviewed: 0, verified: 0, withdrawn: 0 },
    validatedPublicDraftMoleculesWithExactLocators: 639,
    publicDraftStepMappingState: { not_mapped: 4_342, computed: 0, reviewed: 0 },
    verifiedScientificClaimMoleculeCount: 0,
  });
  assert.deepEqual(report.learningFeatureKpis, {
    unit: "public_draft_route_alternative",
    totalPublicDraftRouteAlternatives: 2_645,
    routesWithComputedIntermediate3d: 451,
    computedIntermediate3dAssets: {
      unit: "exact_identity_route_boundary_material_asset",
      manifestPipelineVersion: "synthesis-intermediate-computed-3d-2.0.0",
      manifestGeneratedAt: "2026-08-28T03:22:05.000Z",
      mutuallyExclusive: true,
      exhaustive: true,
      total: 62,
      byProvenance: {
        rdkitGeneratedFromExactCatalog2d: 62,
        pubChemComputedFallback: 0,
      },
      rdkitGenerationFailureCount: 11,
      provenanceBoundary:
        "RDKit assets were generated locally from the recorded exact-identity catalog 2D SDF with versioned parameters. A strict local-generation failure remains 2D-only; no catalog 3D fallback is admitted without an independent structure-level exact-identity gate. No admitted asset is experimental, crystal, or bioactive structure evidence.",
    },
    routesWithMappedMechanism: 0,
    routesWithGeneralMechanismLesson: 0,
    routesWith2d3dMechanismSynchronization: 0,
    routesWithTypedLearningTask: 0,
    computedIntermediate3dBoundary:
      "Route count includes only alternatives containing an admitted exact-identity computed 3D asset for a text-mined route-boundary material. Failed strict generation remains 2D-only, and intermediate role remains pending scientific review.",
    recordingBoundary:
      "Only features explicitly recorded in the typed synthesis evidence artifacts are counted; absent fields are not inferred.",
  });
});

test("targeted gap report records every draft-alternative gap and candidate-only extraction gap", async () => {
  const report = buildSynthesisTargetedGapRecordsReport(input);
  const generated = JSON.parse(
    await readFile(synthesisTargetedGapRecordsReportUrl, "utf8"),
  );
  assert.deepEqual(generated, report);
  assert.deepEqual(report.scope, {
    gapRecordUnit: "public_draft_alternative_gap_occurrence_or_candidate_only_target",
    publicDraftAlternativeGapOccurrenceCount: 2_645,
    candidateOnlyExtractionGapCount: 529,
    targetScopeSummary: {
      fragmentaryTargetCount: 639,
      candidateOnlyTargetCount: 529,
      targetCount: 1_168,
    },
    publicEvidenceDetailsMayBeRedacted: true,
  });
  assert.equal(report.summary.recordCount, 3_174);
  assert.equal(report.summary.unresolvedCount, 2_645);
  assert.equal(report.summary.candidateSourcesCount, 529);
  assert.equal(report.summary.resolvedCount, 0);
  assert.match(report.summary.recordsSha256, /^[a-f\d]{64}$/u);
  assert.equal(new Set(report.records.map((record) => record.gapId)).size, 3_174);
  assert.equal(new Set(report.records.map((record) => record.coverageId)).size, 1_168);
  assert.equal(
    report.records.filter((record) => record.routeId?.startsWith("synthesis-draft-alternative:")).length,
    2_645,
  );
  assert.equal(report.records.filter((record) => record.routeId === null).length, 529);
  assert.ok(report.records.every((record) =>
    record.gapId.startsWith("synthesis-gap:") &&
    record.fromIdentity.resolutionState === "unresolved" &&
    record.toIdentity.resolutionState === "unresolved" &&
    record.requiredTransformation.resolutionState === "unresolved" &&
    Array.isArray(record.candidateSources) &&
    record.resolvedSourceId === null &&
    record.resolvedAt === null &&
    record.continuousEdgeEligible === false &&
    record.reviewBoundary.reviewState === "pending" &&
    record.reviewBoundary.verifiedScientificClaim === false &&
    validateSynthesisRouteGapRecord(record).length === 0
  ));
  assert.ok(Object.values(report.invariants).every(Boolean));
});

test("KPI and targeted gap records are deterministic under input reordering", () => {
  const reversed = {
    ...input,
    coverageRecords: [...input.coverageRecords].reverse(),
    draftEntries: [...input.draftEntries].reverse(),
  };
  const forwardKpi = buildSynthesisLearningCoverageKpiReport(input);
  const reversedKpi = buildSynthesisLearningCoverageKpiReport(reversed);
  assert.equal(
    reversedKpi.continuousEducationalRouteCoverage.projectionSha256,
    forwardKpi.continuousEducationalRouteCoverage.projectionSha256,
  );
  const forwardGaps = buildSynthesisTargetedGapRecordsReport(input);
  const reversedGaps = buildSynthesisTargetedGapRecordsReport(reversed);
  assert.equal(reversedGaps.summary.recordsSha256, forwardGaps.summary.recordsSha256);
  assert.deepEqual(
    reversedGaps.records.map((record) => record.gapId),
    forwardGaps.records.map((record) => record.gapId),
  );
});

test("an incomplete assessment can never be coerced into no-supporting-source", () => {
  const noSource = input.coverageRecords.find(
    (record) => record.sourceEvidenceState === "none_found",
  );
  assert.ok(noSource);
  const incomplete = {
    ...input,
    coverageRecords: input.coverageRecords.map((record) => record.id === noSource.id
      ? { ...record, assessmentState: "searching" }
      : record),
  };
  assert.throws(
    () => buildSynthesisLearningCoverageKpiReport(incomplete),
    /not an assessed scoped-search result/iu,
  );
});

test("gap validator rejects source, continuity, mapping, and review overclaims", () => {
  const valid = buildSynthesisTargetedGapRecordsReport(input).records[0];
  const invalid = {
    ...valid,
    continuousEdgeEligible: true,
    mappingBoundary: {
      state: "computed_unreviewed",
      mappingArtifactId: "mapping:unreviewed",
      atomSpecificClaimsAllowed: true,
    },
    reviewBoundary: {
      reviewState: "pending",
      verifiedScientificClaim: true,
      verifiedPublicationEligible: true,
    },
  };
  assert.deepEqual(
    validateSynthesisRouteGapRecord(invalid).map((issue) => issue.code).sort(),
    [
      "review_boundary_overclaim",
      "unresolved_gap_claims_resolution",
      "unreviewed_mapping_allows_atom_claims",
    ],
  );
});
