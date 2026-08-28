import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  analyzePublicAlphaSynthesisQuality,
  loadPublicAlphaSynthesisQualityInput,
  synthesisPublicAlphaQualityReportUrl,
} = await tsImport(
  "../scripts/synthesis/analyze-public-alpha-quality.mts",
  import.meta.url,
);

const qualityInput = await loadPublicAlphaSynthesisQualityInput();

const qualityRecord = (report, coverageId) => {
  const record = report.moleculeQuality.records.find((item) => item.coverageId === coverageId);
  assert.ok(record, `missing quality record for ${coverageId}`);
  return record;
};

test("quality analysis exhausts 1,552 molecules exactly once at the audited graph-depth counts", async () => {
  const report = analyzePublicAlphaSynthesisQuality(qualityInput);
  const generated = JSON.parse(await readFile(synthesisPublicAlphaQualityReportUrl, "utf8"));
  assert.deepEqual(generated, report);

  assert.deepEqual(report.moleculeQuality.byClass, {
    complete_learning_route: 0,
    substantive_partial_route: 0,
    fragmentary_route: 639,
    candidate_only: 529,
    no_supporting_source_resolved: 384,
  });
  assert.deepEqual(report.secondaryTopology, {
    sourceSupportedConnectedDraftMolecules: 231,
    sourceSupportedFragmentDraftMolecules: 408,
    moleculesWithoutValidDraftGraph: 913,
  });
  assert.deepEqual(Object.keys(report.moleculeQuality.definitions), [
    "complete_learning_route",
    "substantive_partial_route",
    "fragmentary_route",
    "candidate_only",
    "no_supporting_source_resolved",
  ]);
  assert.equal(report.moleculeQuality.classifiedMoleculeCount, 1_552);
  assert.equal(report.moleculeQuality.records.length, 1_552);
  assert.equal(
    new Set(report.moleculeQuality.records.map((record) => record.coverageId)).size,
    1_552,
  );
  assert.deepEqual(report.routeDepth, {
    validGraphCount: 639,
    draftRouteCount: 2_645,
    totalStepNodes: 4_342,
    targetFormingStepNodes: 2_645,
    upstreamStepNodes: 1_697,
    totalBridgeEdges: 3_033,
    perGraphResolvedIntermediateOccurrences: 307,
    uniqueResolvedIntermediateIdentities: 73,
    maximumGraphStepNodes: 35,
    maximumRouteDepth: 2,
    maximumConnectedStepsPerAlternative: 19,
    graphsByMaximumRouteDepth: { one: 408, two: 231, threeOrMore: 0 },
    graphsByStepNodeCount: {
      one: 113,
      twoToFive: 207,
      sixToTen: 184,
      elevenToTwenty: 117,
      twentyOneOrMore: 18,
    },
    graphsByResolvedUniqueIntermediateCount: {
      zero: 408,
      one: 173,
      two: 44,
      threeToFour: 14,
      fiveOrMore: 0,
    },
    routesByDepth: { one: 2_165, two: 480, threeOrMore: 0 },
    routesByConnectedStepCount: { one: 2_165, two: 13, three: 33, fourOrMore: 434 },
  });
  assert.deepEqual(report.graphIntegrity, {
    graphsEvaluated: 639,
    exactIdentityPassed: 639,
    contractValidationPassed: 639,
    topologyValidationPassed: 639,
    acyclicGraphCount: 639,
    integrityDowngradedGraphCount: 0,
    orphanIndexGraphCount: 0,
    duplicateNodeIdCount: 0,
    danglingMaterialReferenceCount: 0,
    danglingStepReferenceCount: 0,
    danglingCitationReferenceCount: 0,
    invalidBridgeBoundaryCount: 0,
    detachedRouteAlternativeCount: 0,
    targetOutputMismatchCount: 0,
    graphCycleCount: 0,
    orphanStepNodeCount: 0,
    orphanMaterialNodeCount: 0,
    unusedCitationCount: 0,
    requestedBuckets: {
      scope: "valid_public_alpha_graphs",
      stepBucketUnit: "molecules_by_maximum_sequential_resolved_transformation_depth",
      allReactantsResolved: 639,
      unresolvedReactants: 0,
      unresolvedProducts: 0,
      formConflict: 0,
      stereochemistryConflict: 0,
      bySequentialResolvedStepCount: {
        one: 408,
        two: 231,
        threeToFour: 0,
        fiveOrMore: 0,
      },
      teachingBridge: 231,
      upstreamGap: 639,
    },
  });
  assert.equal(report.downgrades.moleculeCount, 0);
  assert.ok(Object.values(report.downgrades.byReason).every((count) => count === 0));
});

test("the 60-route QA sample is deterministic, stratified, and never upgrades pending science", () => {
  const forward = analyzePublicAlphaSynthesisQuality(qualityInput);
  const reversed = analyzePublicAlphaSynthesisQuality({
    ...qualityInput,
    coverageRecords: [...qualityInput.coverageRecords].reverse(),
    draftEntries: [...qualityInput.draftEntries].reverse(),
  });
  assert.equal(forward.qaSample.actualSize, 60);
  assert.equal(forward.qaSample.eligibleDraftRouteCount, 2_645);
  assert.deepEqual(forward.qaSample.byStratum, {
    source_supported_fragment: 20,
    teaching_upstream_gap: 20,
    teaching_convergent_partial: 20,
  });
  assert.equal(
    forward.qaSample.sampleDigest,
    "f70eee0433789362e6c27190e6ab8d1164e2c9ac578fbfd4791a1d3151621d3f",
  );
  assert.equal(reversed.qaSample.sampleDigest, forward.qaSample.sampleDigest);
  assert.deepEqual(
    reversed.qaSample.records.map((record) => record.alternativeId),
    forward.qaSample.records.map((record) => record.alternativeId),
  );
  assert.ok(forward.qaSample.records.every((record) =>
    record.scientificReviewState === "pending" &&
    record.verifiedScientificClaim === false &&
    record.humanQaState === "awaiting_review" &&
    record.sourceLocatorCount === record.sourceLocators.length &&
    record.sourceLocators.length > 0 &&
    record.sourceLocators.every((source) =>
      source.kind === "dataset_record" &&
      source.value.endsWith(`/${source.sourceDocumentId}`)
    ) &&
    Object.values(record.qaChecks).every(Boolean)
  ));
});

test("missing exact identity and mismatched graph identity downgrade the molecule fail closed", () => {
  const targetDraft = qualityInput.draftEntries[0];
  const coverageId = targetDraft.indexEntry.coverageId;
  const targetCoverage = qualityInput.coverageRecords.find((record) => record.id === coverageId);
  assert.ok(targetCoverage);

  const missingIdentity = analyzePublicAlphaSynthesisQuality({
    ...qualityInput,
    coverageRecords: qualityInput.coverageRecords.map((record) => record.id === coverageId
      ? {
          ...record,
          identityScope: { ...record.identityScope, inchiKey: "identity-not-resolved" },
        }
      : record),
  });
  assert.deepEqual(
    qualityRecord(missingIdentity, coverageId).downgradeReasons,
    ["missing_exact_coverage_identity"],
  );
  assert.equal(qualityRecord(missingIdentity, coverageId).qualityClass, "candidate_only");
  assert.equal(
    qualityRecord(missingIdentity, coverageId).exactMolecularIdentityResolved,
    false,
  );
  assert.equal(qualityRecord(missingIdentity, coverageId).resolvedDraftGraph, false);

  const wrongGraphIdentity = analyzePublicAlphaSynthesisQuality({
    ...qualityInput,
    draftEntries: qualityInput.draftEntries.map((entry) =>
      entry.indexEntry.graphId === targetDraft.indexEntry.graphId
        ? {
            ...entry,
            graph: {
              ...entry.graph,
              identity: {
                ...entry.graph.identity,
                inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBB-C",
              },
            },
          }
        : entry
    ),
  });
  assert.deepEqual(
    qualityRecord(wrongGraphIdentity, coverageId).downgradeReasons,
    ["draft_exact_identity_mismatch"],
  );
  assert.equal(wrongGraphIdentity.graphIntegrity.exactIdentityPassed, 638);
  assert.equal(wrongGraphIdentity.graphIntegrity.integrityDowngradedGraphCount, 1);
});

test("detached teaching topology is recorded and excluded from resolved metrics and QA", () => {
  const targetDraft = qualityInput.draftEntries.find((entry) =>
    entry.graph.alternatives.some((alternative) =>
      alternative.routeType === "teaching_reconstruction"
    )
  );
  assert.ok(targetDraft);
  const teachingAlternative = targetDraft.graph.alternatives.find(
    (alternative) => alternative.routeType === "teaching_reconstruction",
  );
  assert.ok(teachingAlternative);
  const bridge = targetDraft.graph.bridges.find((item) =>
    item.toStepId === teachingAlternative.finalStepId &&
    teachingAlternative.upstreamStepIds.includes(item.fromStepId)
  );
  assert.ok(bridge);

  const report = analyzePublicAlphaSynthesisQuality({
    ...qualityInput,
    draftEntries: qualityInput.draftEntries.map((entry) =>
      entry.indexEntry.graphId === targetDraft.indexEntry.graphId
        ? {
            ...entry,
            graph: {
              ...entry.graph,
              bridges: entry.graph.bridges.filter((item) => item.id !== bridge.id),
            },
          }
        : entry
    ),
  });
  const record = qualityRecord(report, targetDraft.indexEntry.coverageId);
  assert.equal(record.qualityClass, "candidate_only");
  assert.ok(record.downgradeReasons.includes("draft_contract_validation_failed"));
  assert.ok(record.downgradeReasons.includes("detached_route_alternative"));
  assert.equal(record.graphMetrics, null);
  assert.equal(report.graphIntegrity.contractValidationPassed, 638);
  assert.equal(report.graphIntegrity.topologyValidationPassed, 638);
  assert.ok(report.graphIntegrity.detachedRouteAlternativeCount > 0);
  assert.ok(report.qaSample.records.every(
    (sample) => sample.graphId !== targetDraft.indexEntry.graphId,
  ));
});
