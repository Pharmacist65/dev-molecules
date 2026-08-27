import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  assemblePublicAlphaSynthesisDrafts,
  loadSynthesisSourceContentRunSummary,
} = await tsImport(
  "../scripts/synthesis/assemble-public-drafts.mts",
  import.meta.url,
);
const {
  loadPublicAlphaSynthesisDrafts,
  validatePublicAlphaSynthesisDraftGraph,
} = await tsImport(
  "../lib/application/public-alpha-synthesis-draft.ts",
  import.meta.url,
);

const projectUrl = new URL("../", import.meta.url);
const publicSynthesisUrl = new URL("public/catalog/synthesis/", projectUrl);
const discoverySubjectsUrl = new URL("work/synthesis-discovery/v1/subjects/", projectUrl);
const extractionUrl = new URL("work/synthesis-extraction/v2/", projectUrl);
const privateAssemblyInputUrls = [
  discoverySubjectsUrl,
  new URL("assessments/", extractionUrl),
  new URL("segments/", extractionUrl),
  new URL("run-manifest.json", extractionUrl),
  new URL("work/synthesis-source-content/v2/run-manifest.json", projectUrl),
];
const privateAssemblyInputsAvailable = await Promise.all(
  privateAssemblyInputUrls.map((url) => access(url)),
).then(() => true, () => false);

const readJson = async (url) => JSON.parse(await readFile(url, "utf8"));

const readJsonDirectory = async (directoryUrl) => {
  const names = (await readdir(directoryUrl))
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));
  return Promise.all(names.map((name) => readJson(new URL(name, directoryUrl))));
};

const jsonResponse = (value, status = 200) => new Response(
  JSON.stringify(value),
  { status, headers: { "Content-Type": "application/json" } },
);

const referenceFromIndexEntry = (entry) => ({
  schemaVersion: entry.schemaVersion,
  graphId: entry.graphId,
  channel: entry.channel,
  publicationState: entry.publicationState,
  reviewState: entry.reviewState,
  verifiedScientificClaim: entry.verifiedScientificClaim,
  coverageId: entry.coverageId,
  routeCompleteness: entry.routeCompleteness,
  draftRouteCount: entry.draftRouteCount,
  extractedStepCount: entry.extractedStepCount,
  teachingReconstructionCount: entry.teachingReconstructionCount,
  resolvedIntermediateCount: entry.resolvedIntermediateCount,
  unresolvedGapCount: entry.unresolvedGapCount,
  licenseState: entry.licenseState,
  detailPath: entry.detailPath,
});

const loadRepresentativeGeneratedGraph = async () => {
  const index = await readJson(new URL("drafts/index.json", publicSynthesisUrl));
  const entry = index.graphs.find((graph) => graph.teachingReconstructionCount > 0);
  assert.ok(entry, "generated public-alpha index must retain a teaching reconstruction");
  const detail = await readJson(new URL(`public${entry.detailPath}`, projectUrl));
  const reference = referenceFromIndexEntry(entry);
  const expected = {
    catalogSnapshotId: index.catalogSnapshotId,
    catalogEntityId: entry.catalogEntityId,
    coverageId: entry.coverageId,
    preferredName: detail.identity.preferredName,
    pubChemCid: entry.pubChemCid,
    inchiKey: entry.inchiKey,
    chemicalForm: detail.identity.chemicalForm,
    stereochemistrySpecified: detail.identity.stereochemistrySpecified,
  };
  return { index, entry, detail, reference, expected };
};

test("private public-alpha route assembly reproduces the accepted checkpoint when extraction inputs are present", {
  skip: privateAssemblyInputsAvailable
    ? false
    : "private extraction workspace is intentionally not checked into the release repository",
}, async () => {
  const [subjects, assessmentShards, segmentShards, extractionManifest, sourceContent] =
    await Promise.all([
      readJsonDirectory(discoverySubjectsUrl),
      readJsonDirectory(new URL("assessments/", extractionUrl)),
      readJsonDirectory(new URL("segments/", extractionUrl)),
      readJson(new URL("run-manifest.json", extractionUrl)),
      loadSynthesisSourceContentRunSummary(),
    ]);

  const result = assemblePublicAlphaSynthesisDrafts({
    coverage: subjects.map((subject) => subject.coverage),
    evidence: subjects.flatMap((subject) => subject.evidence),
    assessments: assessmentShards.flatMap((shard) => shard.assessments),
    segments: segmentShards.flatMap((shard) => shard.segments),
    generatedAt: extractionManifest.generatedAt,
    sourceContent,
  });

  assert.deepEqual({
    catalogCoverageCount: result.report.catalogCoverageCount,
    directSourceSegmentsExamined: result.report.directSourceSegmentsExamined,
    directSourceSegmentsAdmitted: result.report.directSourceSegmentsAdmitted,
    directSourceSegmentsRejected: result.report.directSourceSegmentsRejected,
    sourceLocatorCandidateDocumentsExamined:
      result.report.sourceLocatorCandidateDocumentsExamined,
    sourceLocatorCandidateDocumentsPromotedToSteps:
      result.report.sourceLocatorCandidateDocumentsPromotedToSteps,
    accessibleFullTextDocumentsPreviouslyInspected:
      result.report.accessibleFullTextDocumentsPreviouslyInspected,
    publicDraftRoutes: result.report.publicDraftRoutes,
    partialRoutes: result.report.partialRoutes,
    routeGraphs: result.report.routeGraphs,
    extractedSteps: result.report.extractedSteps,
    resolvedIntermediates: result.report.resolvedIntermediates,
    exactTeachingBridgeCount: result.report.exactTeachingBridgeCount,
    unresolvedGaps: result.report.unresolvedGaps,
    teachingReconstructions: result.report.teachingReconstructions,
    reviewedRoutes: result.report.reviewedRoutes,
  }, {
    catalogCoverageCount: 1_552,
    directSourceSegmentsExamined: 2_645,
    directSourceSegmentsAdmitted: 2_645,
    directSourceSegmentsRejected: 0,
    sourceLocatorCandidateDocumentsExamined: 1_720,
    sourceLocatorCandidateDocumentsPromotedToSteps: 0,
    accessibleFullTextDocumentsPreviouslyInspected: 4_644,
    publicDraftRoutes: 2_645,
    partialRoutes: 2_645,
    routeGraphs: 639,
    extractedSteps: 2_645,
    resolvedIntermediates: 73,
    exactTeachingBridgeCount: 3_033,
    unresolvedGaps: 2_645,
    teachingReconstructions: 231,
    reviewedRoutes: 0,
  });
  assert.deepEqual(result.report.byCompleteness, {
    partial: 0,
    upstream_gap: 2_587,
    convergent_partial: 58,
  });
  assert.deepEqual(result.report.invariants, {
    noNewDiscoveryPerformed: true,
    everyPublishedStepHasExactTargetAssociation: true,
    everyPublishedStepHasExactLocator: true,
    everyPublishedStructureIsIndependentRedrawInput: true,
    operationalDetailsPublished: false,
    pendingDisplayedAsReviewedOrVerified: false,
  });
  assert.deepEqual(result.rejectionCounts, {});
  assert.equal(result.graphs.length, result.referencesByCoverageId.size);

  for (const graph of result.graphs) {
    const references = result.referencesByCoverageId.get(graph.identity.coverageId);
    assert.equal(references?.length, 1);
    validatePublicAlphaSynthesisDraftGraph(graph, {
      catalogSnapshotId: graph.catalogSnapshotId,
      catalogEntityId: graph.identity.catalogEntityId,
      coverageId: graph.identity.coverageId,
      preferredName: graph.identity.preferredName,
      pubChemCid: graph.identity.pubChemCid,
      inchiKey: graph.identity.inchiKey,
      chemicalForm: graph.identity.chemicalForm,
      stereochemistrySpecified: graph.identity.stereochemistrySpecified,
    }, references[0]);
  }
});

test("public-alpha loader accepts an exact generated index/detail pair and keeps it pending", async () => {
  const { index, detail, reference, expected } = await loadRepresentativeGeneratedGraph();
  const requested = [];
  const graphs = await loadPublicAlphaSynthesisDrafts(expected, [reference], {
    assetBasePath: "/dev-molecules/",
    fetchImpl: async (url) => {
      requested.push(String(url));
      return String(url).endsWith("/drafts/index.json")
        ? jsonResponse(index)
        : jsonResponse(detail);
    },
  });

  assert.deepEqual(requested, [
    "/dev-molecules/catalog/synthesis/drafts/index.json",
    `/dev-molecules${reference.detailPath}`,
  ]);
  assert.equal(graphs.length, 1);
  assert.equal(graphs[0].graphId, reference.graphId);
  assert.equal(graphs[0].assurance.reviewState, "pending");
  assert.equal(graphs[0].assurance.verifiedScientificClaim, false);
  assert.equal(graphs[0].identity.coverageId, reference.coverageId);
  assert.equal(graphs[0].identity.catalogEntityId, expected.catalogEntityId);
  assert.equal(graphs[0].identity.preferredName, expected.preferredName);
  assert.equal(graphs[0].identity.pubChemCid, expected.pubChemCid);
  assert.equal(graphs[0].identity.inchiKey, expected.inchiKey);
  assert.equal(graphs[0].identity.chemicalForm, expected.chemicalForm);
  assert.equal(
    graphs[0].identity.stereochemistrySpecified,
    expected.stereochemistrySpecified,
  );
  assert.ok(graphs[0].bridges.length > 0);
  assert.ok(graphs[0].alternatives.some((route) => route.routeType === "teaching_reconstruction"));
});

test("public-alpha loader fails closed on identity, review, rights, locator, and operational mutations", async () => {
  const { index, detail, reference, expected } = await loadRepresentativeGeneratedGraph();
  const otherInchiKey = expected.inchiKey === "AAAAAAAAAAAAAA-BBBBBBBBBB-C"
    ? "CCCCCCCCCCCCCC-DDDDDDDDDD-E"
    : "AAAAAAAAAAAAAA-BBBBBBBBBB-C";
  const mutations = [
    {
      label: "exact identity",
      expectedError: /identity or assurance gate/u,
      detail: {
        ...detail,
        identity: { ...detail.identity, inchiKey: otherInchiKey },
      },
    },
    {
      label: "form identity",
      expectedError: /identity or assurance gate/u,
      detail: {
        ...detail,
        identity: { ...detail.identity, chemicalForm: "salt" },
      },
    },
    {
      label: "stereochemistry identity",
      expectedError: /identity or assurance gate/u,
      detail: {
        ...detail,
        identity: {
          ...detail.identity,
          stereochemistrySpecified: !detail.identity.stereochemistrySpecified,
        },
      },
    },
    {
      label: "pending review cannot become verified",
      expectedError: /identity or assurance gate/u,
      detail: {
        ...detail,
        assurance: {
          ...detail.assurance,
          reviewState: "verified",
          verifiedScientificClaim: true,
        },
      },
    },
    {
      label: "reuse rights",
      expectedError: /locator or rights gate/u,
      detail: {
        ...detail,
        citations: detail.citations.map((citation, index) => index === 0
          ? { ...citation, license: { ...citation.license, state: "permitted" } }
          : citation),
      },
    },
    {
      label: "exact source locator",
      expectedError: /locator or rights gate/u,
      detail: {
        ...detail,
        citations: detail.citations.map((citation, index) => index === 0
          ? { ...citation, locator: { ...citation.locator, value: "dataset_record/ord-wrong" } }
          : citation),
      },
    },
    {
      label: "embedded camel-case operational field",
      expectedError: /Operational synthesis field.*temperatureCelsius/u,
      detail: {
        ...detail,
        steps: detail.steps.map((step, index) => index === 0
          ? {
              ...step,
              educationalPresentation: {
                summary: "must still be recursively inspected",
                temperatureCelsius: 22,
              },
            }
          : step),
      },
    },
  ];

  for (const mutation of mutations) {
    await assert.rejects(
      loadPublicAlphaSynthesisDrafts(expected, [reference], {
        fetchImpl: async (url) => String(url).endsWith("/drafts/index.json")
          ? jsonResponse(index)
          : jsonResponse(mutation.detail),
      }),
      mutation.expectedError,
      mutation.label,
    );
  }

  const verifiedIndex = {
    ...index,
    graphs: index.graphs.map((entry) => entry.graphId === reference.graphId
      ? { ...entry, reviewState: "verified", verifiedScientificClaim: true }
      : entry),
  };
  await assert.rejects(
    loadPublicAlphaSynthesisDrafts(expected, [reference], {
      fetchImpl: async () => jsonResponse(verifiedIndex),
    }),
    /Invalid public-alpha synthesis draft reference/u,
  );
});

test("generated public-alpha graph fails closed when index identity or route topology is detached", async () => {
  const { index, detail, reference, expected } = await loadRepresentativeGeneratedGraph();
  const teachingAlternative = detail.alternatives.find(
    (alternative) => alternative.routeType === "teaching_reconstruction",
  );
  assert.ok(teachingAlternative);
  assert.ok(teachingAlternative.upstreamStepIds.length > 0);
  const connectedBridge = detail.bridges.find((bridge) =>
    bridge.toStepId === teachingAlternative.finalStepId &&
    teachingAlternative.upstreamStepIds.includes(bridge.fromStepId)
  );
  assert.ok(connectedBridge);

  const topologyMutations = [
    {
      label: "bridge without its exact shared-material boundary",
      detail: {
        ...detail,
        bridges: detail.bridges.map((bridge) => bridge.id === connectedBridge.id
          ? {
              ...bridge,
              boundaryMaterialId: detail.materials.find(
                (material) => material.displayRole === "exact_target",
              ).id,
            }
          : bridge),
      },
      expectedError: /exact shared material boundary/u,
    },
    {
      label: "teaching alternative detached from its evidence bridge",
      detail: {
        ...detail,
        bridges: detail.bridges.filter((bridge) => bridge.id !== connectedBridge.id),
      },
      expectedError: /route alternative topology is inconsistent/u,
    },
    {
      label: "upstream steps relabeled as a source fragment",
      detail: {
        ...detail,
        alternatives: detail.alternatives.map((alternative) =>
          alternative.id === teachingAlternative.id
            ? { ...alternative, routeType: "source_supported_fragment" }
            : alternative
        ),
      },
      expectedError: /route alternative topology is inconsistent/u,
    },
  ];

  for (const mutation of topologyMutations) {
    await assert.rejects(
      loadPublicAlphaSynthesisDrafts(expected, [reference], {
        fetchImpl: async (url) => String(url).endsWith("/drafts/index.json")
          ? jsonResponse(index)
          : jsonResponse(mutation.detail),
      }),
      mutation.expectedError,
      mutation.label,
    );
  }

  const wrongIndexIdentity = {
    ...index,
    graphs: index.graphs.map((entry) => entry.graphId === reference.graphId
      ? { ...entry, inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBB-C" }
      : entry),
  };
  let detailRequested = false;
  await assert.rejects(
    loadPublicAlphaSynthesisDrafts(expected, [reference], {
      fetchImpl: async (url) => {
        if (String(url).endsWith("/drafts/index.json")) return jsonResponse(wrongIndexIdentity);
        detailRequested = true;
        return jsonResponse(detail);
      },
    }),
    /index does not match the exact coverage identity/u,
  );
  assert.equal(detailRequested, false, "identity mismatch must stop before detail fetch");
});
