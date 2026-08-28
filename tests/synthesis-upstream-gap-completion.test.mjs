import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  analyzeUpstreamGapCompletion,
  loadUpstreamGapCompletionAuditInput,
  synthesisUpstreamGapAuditReportUrl,
} = await tsImport(
  "../scripts/synthesis/analyze-upstream-gap-completion.mts",
  import.meta.url,
);

const input = await loadUpstreamGapCompletionAuditInput();

test("upstream completion audit rejects raw exact-identity recursion at the recorded evidence boundary", async () => {
  const report = analyzeUpstreamGapCompletion(input);
  const generated = JSON.parse(
    await readFile(synthesisUpstreamGapAuditReportUrl, "utf8"),
  );
  assert.deepEqual(generated, report);

  assert.deepEqual(report.scope, {
    localResolvedSegmentCount: 2_645,
    exactTargetIdentityCount: 2_645,
    networkFetchPerformed: false,
    broadDiscoveryPerformed: false,
  });
  assert.deepEqual(report.rawExactIdentityProjection, {
    uniqueProductIdentityCount: 639,
    exactIdentityBridgeEdgeCount: 3_033,
    segmentsWithAtLeastOneUpstreamIdentityMatch: 480,
    finalSegmentsWithSimplePathDepthThreeOrMore: 324,
    moleculesWithSimplePathDepthThreeOrMore: 156,
    scientificAdmissionState: "rejected_fail_closed",
    reason:
      "An exact reactant/product InChIKey join proves boundary identity only; with mined participant-role errors, unresolved atom mapping and identity cycles, it does not prove a sequential synthesis transformation.",
  });
  assert.equal(report.materialIdentityCycles.stronglyConnectedComponentCount, 7);
  assert.equal(report.materialIdentityCycles.involvedIdentityCount, 16);
  assert.ok(report.materialIdentityCycles.components.some((component) =>
    component.includes("MHAJPDPJQMAIIY-UHFFFAOYSA-N") &&
    component.includes("MYMOFIZGZYHOMD-UHFFFAOYSA-N")
  ));
});

test("no local segment set passes the conservative high-confidence recursive admission gate", () => {
  const report = analyzeUpstreamGapCompletion(input);
  assert.deepEqual(report.sourceAndChemistryBoundary, {
    datasetRecordLocatorCount: 2_645,
    pageSchemeOrExampleLocatorCount: 0,
    textMinedSegmentCount: 2_635,
    nonTextMinedSegmentCount: 10,
    sourceMiningStateUnknownCount: 0,
    exactProductRoleCount: 2_281,
    unspecifiedProductRoleCount: 364,
    otherOrUnresolvedProductRoleCount: 0,
    unclassifiedReactionCount: 2_645,
    atomMappingNotResolvedCount: 2_645,
    pendingReviewCount: 2_645,
    reviewedOrVerifiedCount: 0,
  });
  assert.deepEqual({
    eligibleSegmentCount: report.highConfidenceLocalAdmission.eligibleSegmentCount,
    exactIdentityBridgeEdgeCount:
      report.highConfidenceLocalAdmission.exactIdentityBridgeEdgeCount,
    finalSegmentsWithPathDepthThreeOrMore:
      report.highConfidenceLocalAdmission.finalSegmentsWithPathDepthThreeOrMore,
    moleculesWithPathDepthThreeOrMore:
      report.highConfidenceLocalAdmission.moleculesWithPathDepthThreeOrMore,
  }, {
    eligibleSegmentCount: 0,
    exactIdentityBridgeEdgeCount: 0,
    finalSegmentsWithPathDepthThreeOrMore: 0,
    moleculesWithPathDepthThreeOrMore: 0,
  });
  assert.deepEqual(report.outcome, {
    recursivelyPublishedRouteCount: 0,
    promotedSubstantivePartialMoleculeCount: 0,
    promotedCompleteLearningRouteMoleculeCount: 0,
    existingPublicDraftArtifactsChanged: false,
    hardBoundary:
      "The local checkpoint has no high-confidence bridge, no mapped or reviewed reaction step, and no exact original page/scheme/example locator. Recursive publication would promote text-mined participant co-occurrence into a scientific route claim.",
  });
  assert.deepEqual(report.invariants, {
    exactInchiKeyMatchNeverTreatedAsReactionRoleProof: true,
    cyclicMaterialPathsRejected: true,
    textMinedPendingSegmentsNotPromotedByHeuristic: true,
    noScientificStateUpgraded: true,
    noNewDiscoveryOrNetworkFetch: true,
  });
});
