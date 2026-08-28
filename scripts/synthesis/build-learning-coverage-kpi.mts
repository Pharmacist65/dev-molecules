import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { parseSynthesisIntermediate3DManifest } from
  "../../lib/application/synthesis-learning-evidence";
import type { SynthesisCoverageRecord } from "../../lib/domain/synthesis-coverage";
import type { SynthesisIntermediate3DManifest } from
  "../../lib/domain/synthesis-learning-evidence";
import {
  SYNTHESIS_EDUCATIONAL_COVERAGE_STATES,
  SYNTHESIS_GAP_KINDS,
  SYNTHESIS_GAP_UNRESOLVED_REASONS,
  type SynthesisEducationalCoverageProjection,
  type SynthesisEducationalCoverageState,
  type SynthesisGapKind,
  type SynthesisGapUnresolvedReason,
  type SynthesisRouteGapRecord,
  validateSynthesisRouteGapRecord,
} from "../../lib/domain/synthesis-learning-coverage";
import type { PublicAlphaSynthesisDraftGraph } from
  "../../lib/domain/public-alpha-synthesis-draft";
import {
  analyzePublicAlphaSynthesisQuality,
  loadPublicAlphaSynthesisQualityInput,
  type PublicAlphaSynthesisQualityInput,
  type SynthesisMoleculeQualityRecord,
} from "./analyze-public-alpha-quality.mjs";

export const SYNTHESIS_LEARNING_COVERAGE_KPI_PIPELINE_VERSION =
  "synthesis-learning-coverage-kpi-1.0.0" as const;

export const synthesisLearningCoverageKpiReportUrl = new URL(
  "../../public/catalog/synthesis/reports/continuous-learning-coverage.json",
  import.meta.url,
);

export const synthesisTargetedGapRecordsReportUrl = new URL(
  "../../public/catalog/synthesis/reports/targeted-gap-records.json",
  import.meta.url,
);

export const synthesisIntermediate3DAssetsReportUrl = new URL(
  "../../public/catalog/synthesis/reports/intermediate-3d-assets.json",
  import.meta.url,
);

const recordedIntermediate3DManifest = parseSynthesisIntermediate3DManifest(
  JSON.parse(await readFile(synthesisIntermediate3DAssetsReportUrl, "utf8")),
);

type CountBy<T extends string> = Readonly<Record<T, number>>;

export interface SynthesisLearningCoverageKpiReport {
  readonly schemaVersion: 1;
  readonly pipelineVersion: typeof SYNTHESIS_LEARNING_COVERAGE_KPI_PIPELINE_VERSION;
  readonly catalogSnapshotId: string;
  readonly generatedAt: string;
  readonly scope: {
    readonly canonicalCoverageRecordCount: number;
    readonly publicDraftGraphCount: number;
    readonly newDiscoveryPerformed: false;
    readonly networkFetchPerformed: false;
    readonly routePromotionPerformed: false;
  };
  readonly continuousEducationalRouteCoverage: {
    readonly unit: "exact_catalog_molecule";
    readonly mutuallyExclusive: true;
    readonly exhaustive: true;
    readonly total: number;
    readonly byState: CountBy<SynthesisEducationalCoverageState>;
    readonly projectionSha256: string;
  };
  readonly gapCoverage: {
    readonly coverageRecordsWithOpenGap: number;
    readonly resolvedGapRecordCount: 0;
    readonly targetedGapRecordCount: number;
    readonly targetedGapCoverageRecordCount: number;
    readonly explicitPublicDraftGapOccurrences: number;
    readonly byPrimaryKind: CountBy<SynthesisGapKind>;
    readonly byPrimaryUnresolvedReason: CountBy<SynthesisGapUnresolvedReason>;
    readonly recordedUnresolvedBoundaries: {
      readonly requiredTransformationNotResolvedStepCount: number;
      readonly atomMappingNotResolvedStepCount: number;
      readonly scientificReviewPendingDraftRouteCount: number;
      readonly sourceLocatorNotResolvedPublishedStepCount: number;
    };
  };
  readonly evidenceBoundaries: {
    readonly assessmentState: CountBy<"not_assessed" | "searching" | "assessed">;
    readonly publicCoverageSourceState: CountBy<
      "none_found" | "candidate_sources" | "direct_source_resolved"
    >;
    readonly reviewState: CountBy<"pending" | "reviewed" | "verified" | "withdrawn">;
    readonly validatedPublicDraftMoleculesWithExactLocators: number;
    readonly publicDraftStepMappingState: CountBy<
      "not_mapped" | "computed" | "reviewed"
    >;
    readonly verifiedScientificClaimMoleculeCount: number;
  };
  readonly learningFeatureKpis: {
    readonly unit: "public_draft_route_alternative";
    readonly totalPublicDraftRouteAlternatives: number;
    readonly routesWithComputedIntermediate3d: number;
    readonly computedIntermediate3dAssets: {
      readonly unit: "exact_identity_route_boundary_material_asset";
      readonly manifestPipelineVersion:
        SynthesisIntermediate3DManifest["pipelineVersion"];
      readonly manifestGeneratedAt: string;
      readonly mutuallyExclusive: true;
      readonly exhaustive: true;
      readonly total: number;
      readonly byProvenance: {
        readonly rdkitGeneratedFromExactCatalog2d: number;
        readonly pubChemComputedFallback: number;
      };
      readonly rdkitGenerationFailureCount: number;
      readonly provenanceBoundary:
        "RDKit assets were generated locally from the recorded exact-identity catalog 2D SDF with versioned parameters. A strict local-generation failure remains 2D-only; no catalog 3D fallback is admitted without an independent structure-level exact-identity gate. No admitted asset is experimental, crystal, or bioactive structure evidence.";
    };
    readonly routesWithMappedMechanism: number;
    readonly routesWithGeneralMechanismLesson: number;
    readonly routesWith2d3dMechanismSynchronization: number;
    readonly routesWithTypedLearningTask: number;
    readonly computedIntermediate3dBoundary:
      "Route count includes only alternatives containing an admitted exact-identity computed 3D asset for a text-mined route-boundary material. Failed strict generation remains 2D-only, and intermediate role remains pending scientific review.";
    readonly recordingBoundary:
      "Only features explicitly recorded in the typed synthesis evidence artifacts are counted; absent fields are not inferred.";
  };
  readonly promotionOutcome: {
    readonly promotedCompleteLearningRouteMolecules: 0;
    readonly promotedSubstantivePartialRouteMolecules: 0;
    readonly reason:
      "This build-time projection classifies existing canonical coverage and validated public-alpha graphs only; it performs no source discovery, chemistry inference, or route promotion.";
  };
  readonly invariants: {
    readonly everyCanonicalCoverageRecordClassifiedExactlyOnce: true;
    readonly noTransportOrMissingArtifactConvertedToNoSource: true;
    readonly candidateSourceNeverCountedAsDirectEvidence: true;
    readonly exactIdentityRequiredForResolvedRouteClass: true;
    readonly unmappedStepsNeverCountedAsMappedMechanisms: true;
    readonly pendingNeverCountedAsVerified: true;
    readonly noScientificClaimOrRoutePromotionInvented: true;
  };
}

export interface SynthesisTargetedGapRecordsReport {
  readonly schemaVersion: 1;
  readonly pipelineVersion: typeof SYNTHESIS_LEARNING_COVERAGE_KPI_PIPELINE_VERSION;
  readonly catalogSnapshotId: string;
  readonly generatedAt: string;
  readonly scope: {
    readonly gapRecordUnit:
      "public_draft_alternative_gap_occurrence_or_candidate_only_target";
    readonly publicDraftAlternativeGapOccurrenceCount: number;
    readonly candidateOnlyExtractionGapCount: number;
    readonly targetScopeSummary: {
      readonly fragmentaryTargetCount: number;
      readonly candidateOnlyTargetCount: number;
      readonly targetCount: number;
    };
    readonly publicEvidenceDetailsMayBeRedacted: true;
  };
  readonly summary: {
    readonly recordCount: number;
    readonly unresolvedCount: number;
    readonly candidateSourcesCount: number;
    readonly resolvedCount: 0;
    readonly recordsSha256: string;
  };
  readonly records: readonly SynthesisRouteGapRecord[];
  readonly invariants: {
    readonly exactTargetAssociationViaCoverageId: true;
    readonly unknownAdjacentIdentitiesRemainUnresolved: true;
    readonly unknownTransformationRemainsUnresolved: true;
    readonly redactedCandidateDetailsNeverInvented: true;
    readonly noGapMarkedContinuousOrResolved: true;
  };
}

const emptyCounts = <T extends string>(keys: readonly T[]): Record<T, number> =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;

const sortText = (left: string, right: string): number =>
  left.localeCompare(right, "en");

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const isDraftGraph = (value: unknown): value is PublicAlphaSynthesisDraftGraph => {
  if (!value || typeof value !== "object") return false;
  const record = value as Readonly<Record<string, unknown>>;
  return record.schemaVersion === 1 &&
    Array.isArray(record.steps) &&
    Array.isArray(record.alternatives) &&
    Array.isArray(record.citations);
};

const primaryGap = (
  state: SynthesisEducationalCoverageState,
): readonly [SynthesisGapKind | null, SynthesisGapUnresolvedReason | null] => {
  if (state === "complete_learning_route") return [null, null];
  if (state === "candidate_only") {
    return ["route_extraction", "candidate_source_not_extracted"];
  }
  if (state === "no_supporting_source_resolved") {
    return ["source_discovery", "no_supporting_source_in_recorded_scope"];
  }
  return ["upstream_continuity", "upstream_boundary_not_resolved"];
};

const unresolvedIdentity = {
  resolutionState: "unresolved",
  identityId: null,
  inchiKey: null,
  canonicalSmiles: null,
} as const;

const unresolvedTransformation = {
  resolutionState: "unresolved",
  reactionClassId: null,
  formedBond: null,
  brokenBond: null,
} as const;

const pendingReviewBoundary = {
  reviewState: "pending",
  verifiedScientificClaim: false,
  verifiedPublicationEligible: false,
} as const;

const unmappedBoundary = {
  state: "not_mapped",
  mappingArtifactId: null,
  atomSpecificClaimsAllowed: false,
} as const;

const createProjection = (
  coverage: SynthesisCoverageRecord,
  quality: SynthesisMoleculeQualityRecord,
): SynthesisEducationalCoverageProjection => {
  if (quality.coverageId !== coverage.id ||
      quality.catalogEntityId !== coverage.identityScope.catalogEntityId) {
    throw new Error(`Coverage/quality identity drift: ${coverage.id}.`);
  }
  if (!quality.exactMolecularIdentityResolved || quality.downgradeReasons.length > 0) {
    throw new Error(`Coverage cannot be placed in a resolved five-state projection: ${coverage.id}.`);
  }
  const state = quality.qualityClass;
  const maximumDepth = quality.graphMetrics?.maxRouteDepth ?? 0;
  if (state === "complete_learning_route" &&
      (quality.graphMetrics?.completeLearningRouteCount ?? 0) < 1) {
    throw new Error(`Complete route lacks a validated continuous path: ${coverage.id}.`);
  }
  if (state === "substantive_partial_route" && maximumDepth < 3) {
    throw new Error(`Substantive route has fewer than three resolved transformations: ${coverage.id}.`);
  }
  if (state === "fragmentary_route" && (maximumDepth < 1 || maximumDepth > 2)) {
    throw new Error(`Fragmentary route is outside the one-to-two-step boundary: ${coverage.id}.`);
  }
  if ((state === "candidate_only" || state === "no_supporting_source_resolved") &&
      quality.resolvedDraftGraph) {
    throw new Error(`Non-route state unexpectedly owns a validated draft graph: ${coverage.id}.`);
  }
  if (state === "candidate_only" && coverage.sourceEvidenceState !== "candidate_sources") {
    throw new Error(`Candidate-only state lacks recorded candidate sources: ${coverage.id}.`);
  }
  if (state === "no_supporting_source_resolved" &&
      (coverage.assessmentState !== "assessed" || coverage.sourceEvidenceState !== "none_found")) {
    throw new Error(`No-source state is not an assessed scoped-search result: ${coverage.id}.`);
  }
  const [primaryGapKind, primaryUnresolvedReason] = primaryGap(state);
  return {
    coverageId: coverage.id,
    catalogEntityId: coverage.identityScope.catalogEntityId,
    state,
    assessmentState: coverage.assessmentState,
    sourceEvidenceState: coverage.sourceEvidenceState,
    reviewState: coverage.reviewState,
    exactTargetIdentityResolved: quality.exactMolecularIdentityResolved,
    maximumContinuousResolvedTransformationCount: maximumDepth,
    canonicalRouteCount: coverage.routes.length,
    publicDraftRouteCount: quality.graphMetrics?.draftRouteCount ?? 0,
    explicitRouteGapCount: quality.graphMetrics?.unresolvedGapCount ?? 0,
    primaryGapKind,
    primaryUnresolvedReason,
    verifiedScientificClaim: quality.verifiedScientificClaim,
  };
};

export const buildSynthesisTargetedGapRecordsReport = (
  input: PublicAlphaSynthesisQualityInput,
  quality = analyzePublicAlphaSynthesisQuality(input),
): SynthesisTargetedGapRecordsReport => {
  if (quality.downgrades.moleculeCount > 0) {
    throw new Error("Downgraded graph evidence cannot enter the targeted gap queue.");
  }
  const coverageById = new Map(input.coverageRecords.map((record) => [record.id, record] as const));
  const eligible = quality.moleculeQuality.records
    .filter((record) =>
      record.qualityClass === "fragmentary_route" ||
      record.qualityClass === "candidate_only"
    )
    .sort((left, right) => sortText(left.coverageId, right.coverageId));
  const graphByCoverageId = new Map<string, PublicAlphaSynthesisDraftGraph>();
  for (const entry of input.draftEntries) {
    if (!isDraftGraph(entry.graph)) continue;
    const coverageId = String(entry.indexEntry.coverageId);
    if (graphByCoverageId.has(coverageId)) {
      throw new Error(`Multiple public draft graphs found for targeted gap: ${coverageId}.`);
    }
    graphByCoverageId.set(coverageId, entry.graph);
  }
  const createGap = (
    record: SynthesisMoleculeQualityRecord,
    routeId: string | null,
    occurrenceIndex: number,
  ): SynthesisRouteGapRecord => {
    const coverage = coverageById.get(record.coverageId as SynthesisCoverageRecord["id"]);
    if (!coverage) throw new Error(`Missing canonical coverage for targeted gap: ${record.coverageId}.`);
    const fragmentary = record.qualityClass === "fragmentary_route";
    const gapId = `synthesis-gap:${sha256(
      `${input.catalogSnapshotId}|${record.coverageId}|${record.qualityClass}|${routeId ?? "candidate-only-extraction"}|${occurrenceIndex}`,
    ).slice(0, 32)}` as const;
    const gap: SynthesisRouteGapRecord = fragmentary
      ? {
          schemaVersion: 1,
          gapId,
          coverageId: coverage.id,
          routeId,
          kind: "upstream_continuity",
          fromIdentity: unresolvedIdentity,
          toIdentity: unresolvedIdentity,
          requiredTransformation: unresolvedTransformation,
          candidateSources: [],
          sourceBoundary: {
            state: "none_resolved",
            resolvedSourceId: null,
            resolvedLocator: null,
          },
          mappingBoundary: unmappedBoundary,
          reviewBoundary: pendingReviewBoundary,
          resolutionState: "unresolved",
          unresolvedReasons: [
            "upstream_boundary_not_resolved",
            "required_transformation_not_resolved",
            "atom_mapping_not_resolved",
            "scientific_review_pending",
          ],
          resolvedSourceId: null,
          resolvedAt: null,
          continuousEdgeEligible: false,
        }
      : {
          schemaVersion: 1,
          gapId,
          coverageId: coverage.id,
          routeId: null,
          kind: "route_extraction",
          fromIdentity: unresolvedIdentity,
          toIdentity: unresolvedIdentity,
          requiredTransformation: unresolvedTransformation,
          candidateSources: [],
          sourceBoundary: {
            state: "candidate_only",
            resolvedSourceId: null,
            resolvedLocator: null,
            candidateDetailsRedacted: true,
          },
          mappingBoundary: unmappedBoundary,
          reviewBoundary: pendingReviewBoundary,
          resolutionState: "candidate_sources",
          unresolvedReasons: [
            "candidate_source_not_extracted",
            "candidate_source_details_redacted",
            "source_locator_not_resolved",
            "scientific_review_pending",
          ],
          resolvedSourceId: null,
          resolvedAt: null,
          continuousEdgeEligible: false,
        };
    const issues = validateSynthesisRouteGapRecord(gap, `records.${gap.gapId}`);
    if (issues.length > 0) {
      throw new Error(`Invalid targeted gap ${gap.gapId}: ${issues.map((issue) => issue.code).join(", ")}.`);
    }
    return gap;
  };
  const records = eligible.flatMap((record): readonly SynthesisRouteGapRecord[] => {
    if (record.qualityClass === "candidate_only") {
      return [createGap(record, null, 0)];
    }
    const graph = graphByCoverageId.get(record.coverageId);
    if (!graph || graph.identity.coverageId !== record.coverageId) {
      throw new Error(`Missing exact public draft graph for targeted gap: ${record.coverageId}.`);
    }
    return [...graph.alternatives]
      .sort((left, right) => sortText(left.id, right.id))
      .flatMap((alternative) => Array.from(
        { length: alternative.unresolvedGapCount },
        (_, occurrenceIndex) => createGap(record, alternative.id, occurrenceIndex),
      ));
  });
  const fragmentaryTargetCount = eligible.filter(
    (record) => record.qualityClass === "fragmentary_route",
  ).length;
  const candidateOnlyTargetCount = eligible.length - fragmentaryTargetCount;
  return {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_LEARNING_COVERAGE_KPI_PIPELINE_VERSION,
    catalogSnapshotId: input.catalogSnapshotId,
    generatedAt: input.generatedAt,
    scope: {
      gapRecordUnit: "public_draft_alternative_gap_occurrence_or_candidate_only_target",
      publicDraftAlternativeGapOccurrenceCount: records.filter(
        (record) => record.routeId !== null,
      ).length,
      candidateOnlyExtractionGapCount: records.filter(
        (record) => record.routeId === null,
      ).length,
      targetScopeSummary: {
        fragmentaryTargetCount,
        candidateOnlyTargetCount,
        targetCount: eligible.length,
      },
      publicEvidenceDetailsMayBeRedacted: true,
    },
    summary: {
      recordCount: records.length,
      unresolvedCount: records.filter((record) => record.resolutionState === "unresolved").length,
      candidateSourcesCount: records.filter(
        (record) => record.resolutionState === "candidate_sources",
      ).length,
      resolvedCount: 0,
      recordsSha256: sha256(stableJson(records)),
    },
    records,
    invariants: {
      exactTargetAssociationViaCoverageId: true,
      unknownAdjacentIdentitiesRemainUnresolved: true,
      unknownTransformationRemainsUnresolved: true,
      redactedCandidateDetailsNeverInvented: true,
      noGapMarkedContinuousOrResolved: true,
    },
  };
};

export const buildSynthesisLearningCoverageKpiReport = (
  input: PublicAlphaSynthesisQualityInput,
  intermediate3DManifest: SynthesisIntermediate3DManifest =
    recordedIntermediate3DManifest,
): SynthesisLearningCoverageKpiReport => {
  const quality = analyzePublicAlphaSynthesisQuality(input);
  const targetedGapReport = buildSynthesisTargetedGapRecordsReport(input, quality);
  if (quality.downgrades.moleculeCount > 0) {
    throw new Error("Invalid or downgraded graphs cannot be coerced into the five-state KPI report.");
  }
  const coverageById = new Map(input.coverageRecords.map((record) => [record.id, record] as const));
  const qualityById = new Map(quality.moleculeQuality.records.map((record) => [record.coverageId, record] as const));
  if (coverageById.size !== input.coverageRecords.length ||
      qualityById.size !== quality.moleculeQuality.records.length ||
      coverageById.size !== qualityById.size) {
    throw new Error("Canonical coverage and quality projections are not one-to-one.");
  }
  const projections = [...coverageById.values()]
    .sort((left, right) => sortText(left.id, right.id))
    .map((coverage) => {
      const qualityRecord = qualityById.get(coverage.id);
      if (!qualityRecord) throw new Error(`Missing quality projection: ${coverage.id}.`);
      return createProjection(coverage, qualityRecord);
    });

  const byState = emptyCounts(SYNTHESIS_EDUCATIONAL_COVERAGE_STATES);
  const byPrimaryKind = emptyCounts(SYNTHESIS_GAP_KINDS);
  const byPrimaryUnresolvedReason = emptyCounts(SYNTHESIS_GAP_UNRESOLVED_REASONS);
  const assessmentState = emptyCounts(["not_assessed", "searching", "assessed"] as const);
  const publicCoverageSourceState = emptyCounts([
    "none_found",
    "candidate_sources",
    "direct_source_resolved",
  ] as const);
  const reviewState = emptyCounts(["pending", "reviewed", "verified", "withdrawn"] as const);
  for (const projection of projections) {
    byState[projection.state] += 1;
    assessmentState[projection.assessmentState] += 1;
    publicCoverageSourceState[projection.sourceEvidenceState] += 1;
    reviewState[projection.reviewState] += 1;
    if (projection.primaryGapKind) byPrimaryKind[projection.primaryGapKind] += 1;
    if (projection.primaryUnresolvedReason) {
      byPrimaryUnresolvedReason[projection.primaryUnresolvedReason] += 1;
    }
  }

  const validGraphCoverageIds = new Set(
    quality.moleculeQuality.records
      .filter((record) => record.resolvedDraftGraph)
      .map((record) => record.coverageId),
  );
  const draftGraphs = input.draftEntries.flatMap((entry) =>
    validGraphCoverageIds.has(String(entry.indexEntry.coverageId)) && isDraftGraph(entry.graph)
      ? [entry.graph]
      : [],
  );
  if (draftGraphs.length !== quality.routeDepth.validGraphCount) {
    throw new Error("Validated draft graph set is incomplete for KPI analysis.");
  }
  if (intermediate3DManifest.catalogSnapshotId !== input.catalogSnapshotId) {
    throw new Error("Intermediate 3D assets crossed the synthesis catalog snapshot.");
  }
  const routeBoundaryKeysByAlternativeId = new Map<string, Set<string>>();
  for (const graph of draftGraphs) {
    const materialById = new Map(
      graph.materials.map((material) => [material.id, material] as const),
    );
    const stepById = new Map(
      graph.steps.map((step) => [step.id, step] as const),
    );
    for (const alternative of graph.alternatives) {
      const scopedAlternativeId = `${graph.graphId}/${alternative.id}`;
      const routeBoundaryKeys = new Set<string>();
      for (const stepId of [
        ...alternative.upstreamStepIds,
        alternative.finalStepId,
      ]) {
        const step = stepById.get(stepId);
        if (!step) continue;
        for (const materialId of [
          ...step.inputMaterialIds,
          ...step.outputMaterialIds,
        ]) {
          const material = materialById.get(materialId);
          if (material?.displayRole === "route_intermediate") {
            routeBoundaryKeys.add(material.inchiKey);
          }
        }
      }
      routeBoundaryKeysByAlternativeId.set(
        scopedAlternativeId,
        routeBoundaryKeys,
      );
    }
  }
  const computedIntermediate3DRoutes = new Set<string>();
  let rdkitGeneratedFromExactCatalog2d = 0;
  let pubChemComputedFallback = 0;
  for (const entry of intermediate3DManifest.entries) {
    if (entry.threeD.representation === "rdkit_generated_conformer") {
      rdkitGeneratedFromExactCatalog2d += 1;
    } else {
      pubChemComputedFallback += 1;
    }
    for (const routeAlternativeId of entry.routeAlternativeIds) {
      if (
        !routeBoundaryKeysByAlternativeId
          .get(routeAlternativeId)
          ?.has(entry.inchiKey)
      ) {
        throw new Error(
          `Intermediate 3D asset lacks its exact route-boundary association: ${routeAlternativeId}.`,
        );
      }
      computedIntermediate3DRoutes.add(routeAlternativeId);
    }
  }
  if (
    rdkitGeneratedFromExactCatalog2d + pubChemComputedFallback !==
      intermediate3DManifest.entries.length ||
    intermediate3DManifest.summary.computedRouteBoundaryMaterial3dAssetCount !==
      intermediate3DManifest.entries.length ||
    intermediate3DManifest.summary.rdkitGeneratedRouteBoundaryMaterial3dAssetCount !==
      rdkitGeneratedFromExactCatalog2d ||
    intermediate3DManifest.summary.catalogComputedFallback3dAssetCount !==
      pubChemComputedFallback ||
    intermediate3DManifest.summary.rdkitGenerationFailureCount !==
      intermediate3DManifest.generationFailures.length
  ) {
    throw new Error("Intermediate 3D provenance counts drifted from the manifest entries.");
  }
  if (
    computedIntermediate3DRoutes.size !==
    intermediate3DManifest.summary.routeAlternativesWithComputedIntermediate3d
  ) {
    throw new Error("Intermediate 3D route count drifted from its manifest.");
  }
  const draftSteps = draftGraphs.flatMap((graph) => graph.steps);
  const mappingState = emptyCounts(["not_mapped", "computed", "reviewed"] as const);
  for (const step of draftSteps) {
    if (step.atomMappingState !== "not_mapped") {
      throw new Error(`Unsupported public-alpha atom-mapping state: ${String(step.atomMappingState)}.`);
    }
    mappingState.not_mapped += 1;
  }
  const exactLocatorMoleculeCount = draftGraphs.filter((graph) =>
    graph.steps.length > 0 && graph.steps.every((step) => {
      const citation = graph.citations.find((item) => item.id === step.citationId);
      return citation?.locator.kind === "dataset_record" && citation.locator.value.trim().length > 0;
    })
  ).length;
  if (exactLocatorMoleculeCount !== draftGraphs.length) {
    throw new Error("A public draft step lacks an exact source locator.");
  }

  const openGapProjections = projections.filter((projection) =>
    projection.state !== "complete_learning_route"
  );
  const verifiedScientificClaimMoleculeCount = projections.filter(
    (projection) => projection.verifiedScientificClaim,
  ).length;
  if (verifiedScientificClaimMoleculeCount > reviewState.verified) {
    throw new Error("Verified scientific claims exceed verified review decisions.");
  }

  return {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_LEARNING_COVERAGE_KPI_PIPELINE_VERSION,
    catalogSnapshotId: input.catalogSnapshotId,
    generatedAt: input.generatedAt,
    scope: {
      canonicalCoverageRecordCount: projections.length,
      publicDraftGraphCount: draftGraphs.length,
      newDiscoveryPerformed: false,
      networkFetchPerformed: false,
      routePromotionPerformed: false,
    },
    continuousEducationalRouteCoverage: {
      unit: "exact_catalog_molecule",
      mutuallyExclusive: true,
      exhaustive: true,
      total: projections.length,
      byState,
      projectionSha256: sha256(stableJson(projections)),
    },
    gapCoverage: {
      coverageRecordsWithOpenGap: openGapProjections.length,
      resolvedGapRecordCount: 0,
      targetedGapRecordCount: targetedGapReport.summary.recordCount,
      targetedGapCoverageRecordCount:
        targetedGapReport.scope.targetScopeSummary.targetCount,
      explicitPublicDraftGapOccurrences: projections.reduce(
        (sum, projection) => sum + projection.explicitRouteGapCount,
        0,
      ),
      byPrimaryKind,
      byPrimaryUnresolvedReason,
      recordedUnresolvedBoundaries: {
        requiredTransformationNotResolvedStepCount: draftSteps.length,
        atomMappingNotResolvedStepCount: mappingState.not_mapped,
        scientificReviewPendingDraftRouteCount: quality.routeDepth.draftRouteCount,
        sourceLocatorNotResolvedPublishedStepCount: 0,
      },
    },
    evidenceBoundaries: {
      assessmentState,
      publicCoverageSourceState,
      reviewState,
      validatedPublicDraftMoleculesWithExactLocators: exactLocatorMoleculeCount,
      publicDraftStepMappingState: mappingState,
      verifiedScientificClaimMoleculeCount,
    },
    learningFeatureKpis: {
      unit: "public_draft_route_alternative",
      totalPublicDraftRouteAlternatives: quality.routeDepth.draftRouteCount,
      routesWithComputedIntermediate3d: computedIntermediate3DRoutes.size,
      computedIntermediate3dAssets: {
        unit: "exact_identity_route_boundary_material_asset",
        manifestPipelineVersion: intermediate3DManifest.pipelineVersion,
        manifestGeneratedAt: intermediate3DManifest.generatedAt,
        mutuallyExclusive: true,
        exhaustive: true,
        total: intermediate3DManifest.entries.length,
        byProvenance: {
          rdkitGeneratedFromExactCatalog2d,
          pubChemComputedFallback,
        },
        rdkitGenerationFailureCount:
          intermediate3DManifest.generationFailures.length,
        provenanceBoundary: "RDKit assets were generated locally from the recorded exact-identity catalog 2D SDF with versioned parameters. A strict local-generation failure remains 2D-only; no catalog 3D fallback is admitted without an independent structure-level exact-identity gate. No admitted asset is experimental, crystal, or bioactive structure evidence.",
      },
      routesWithMappedMechanism: 0,
      routesWithGeneralMechanismLesson: 0,
      routesWith2d3dMechanismSynchronization: 0,
      routesWithTypedLearningTask: 0,
      computedIntermediate3dBoundary: "Route count includes only alternatives containing an admitted exact-identity computed 3D asset for a text-mined route-boundary material. Failed strict generation remains 2D-only, and intermediate role remains pending scientific review.",
      recordingBoundary: "Only features explicitly recorded in the typed synthesis evidence artifacts are counted; absent fields are not inferred.",
    },
    promotionOutcome: {
      promotedCompleteLearningRouteMolecules: 0,
      promotedSubstantivePartialRouteMolecules: 0,
      reason: "This build-time projection classifies existing canonical coverage and validated public-alpha graphs only; it performs no source discovery, chemistry inference, or route promotion.",
    },
    invariants: {
      everyCanonicalCoverageRecordClassifiedExactlyOnce: true,
      noTransportOrMissingArtifactConvertedToNoSource: true,
      candidateSourceNeverCountedAsDirectEvidence: true,
      exactIdentityRequiredForResolvedRouteClass: true,
      unmappedStepsNeverCountedAsMappedMechanisms: true,
      pendingNeverCountedAsVerified: true,
      noScientificClaimOrRoutePromotionInvented: true,
    },
  };
};

export const runSynthesisLearningCoverageKpiReport = async (): Promise<
  {
    readonly kpiReport: SynthesisLearningCoverageKpiReport;
    readonly targetedGapReport: SynthesisTargetedGapRecordsReport;
  }
> => {
  const input = await loadPublicAlphaSynthesisQualityInput();
  const kpiReport = buildSynthesisLearningCoverageKpiReport(input);
  const targetedGapReport = buildSynthesisTargetedGapRecordsReport(input);
  await Promise.all([
    writeFile(synthesisLearningCoverageKpiReportUrl, stableJson(kpiReport), "utf8"),
    writeFile(synthesisTargetedGapRecordsReportUrl, stableJson(targetedGapReport), "utf8"),
  ]);
  return { kpiReport, targetedGapReport };
};

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    const { kpiReport: report, targetedGapReport } =
      await runSynthesisLearningCoverageKpiReport();
    process.stdout.write(`${JSON.stringify({
      pipelineVersion: report.pipelineVersion,
      coverage: report.continuousEducationalRouteCoverage,
      gapCoverage: report.gapCoverage,
      learningFeatureKpis: report.learningFeatureKpis,
      targetedGapSummary: targetedGapReport.summary,
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
