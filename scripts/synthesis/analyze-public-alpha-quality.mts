import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import type { SynthesisCoverageRecord } from "../../lib/domain/synthesis-coverage";
import type {
  PublicAlphaSynthesisDraftGraph,
  PublicAlphaSynthesisDraftReference,
} from "../../lib/domain/public-alpha-synthesis-draft";
import { validatePublicAlphaSynthesisDraftGraph } from
  "../../lib/application/public-alpha-synthesis-draft";

export const SYNTHESIS_PUBLIC_ALPHA_QUALITY_PIPELINE_VERSION =
  "synthesis-public-alpha-quality-1.0.0" as const;
export const SYNTHESIS_PUBLIC_ALPHA_QA_SEED =
  "molevren-public-alpha-route-qa-v1" as const;
export const SYNTHESIS_PUBLIC_ALPHA_QA_SAMPLE_SIZE = 60 as const;

export const synthesisPublicAlphaQualityReportUrl = new URL(
  "../../public/catalog/synthesis/reports/public-alpha-quality.json",
  import.meta.url,
);

export const SYNTHESIS_MOLECULE_QUALITY_CLASSES = [
  "complete_learning_route",
  "substantive_partial_route",
  "fragmentary_route",
  "candidate_only",
  "no_supporting_source_resolved",
] as const;
export type SynthesisMoleculeQualityClass =
  typeof SYNTHESIS_MOLECULE_QUALITY_CLASSES[number];

export const SYNTHESIS_QUALITY_DOWNGRADE_REASONS = [
  "missing_exact_coverage_identity",
  "multiple_coverage_draft_references",
  "coverage_reference_without_index_entry",
  "index_entry_without_coverage_reference",
  "index_reference_mismatch",
  "index_identity_mismatch",
  "draft_exact_identity_mismatch",
  "draft_contract_validation_failed",
  "duplicate_graph_node_id",
  "dangling_material_reference",
  "dangling_step_reference",
  "dangling_citation_reference",
  "invalid_bridge_boundary",
  "detached_route_alternative",
  "target_material_missing",
  "target_step_output_mismatch",
  "graph_cycle_detected",
  "orphan_step_node",
  "orphan_material_node",
  "unused_citation",
  "unsupported_coverage_evidence_state",
] as const;
export type SynthesisQualityDowngradeReason =
  typeof SYNTHESIS_QUALITY_DOWNGRADE_REASONS[number];

type JsonObject = Readonly<Record<string, unknown>>;

interface ArtifactDescriptor {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

interface DraftIndexEntry extends JsonObject {
  readonly schemaVersion: 1;
  readonly graphId: string;
  readonly coverageId: string;
  readonly detailPath: string;
}

export interface LoadedPublicAlphaDraftQualityInput {
  readonly indexEntry: DraftIndexEntry;
  readonly graph: unknown;
}

export interface PublicAlphaSynthesisQualityInput {
  readonly catalogSnapshotId: string;
  readonly generatedAt: string;
  readonly coverageRecords: readonly SynthesisCoverageRecord[];
  readonly draftEntries: readonly LoadedPublicAlphaDraftQualityInput[];
}

export interface PublicAlphaGraphQualityMetrics {
  readonly stepNodeCount: number;
  readonly targetFormingStepCount: number;
  readonly upstreamStepCount: number;
  readonly materialNodeCount: number;
  readonly citationCount: number;
  readonly bridgeEdgeCount: number;
  readonly draftRouteCount: number;
  readonly sourceFragmentRouteCount: number;
  readonly teachingReconstructionRouteCount: number;
  readonly completeLearningRouteCount: number;
  readonly resolvedIntermediateCount: number;
  readonly unresolvedGapCount: number;
  readonly maxRouteDepth: number;
  readonly maxConnectedStepCount: number;
  readonly maxBranchWidth: number;
}

export interface SynthesisMoleculeQualityRecord {
  readonly coverageId: string;
  readonly catalogEntityId: string;
  readonly preferredName: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly qualityClass: SynthesisMoleculeQualityClass;
  readonly exactMolecularIdentityResolved: boolean;
  readonly resolvedDraftGraph: boolean;
  readonly graphId: string | null;
  readonly scientificReviewState: "pending";
  readonly verifiedScientificClaim: false;
  readonly graphMetrics: PublicAlphaGraphQualityMetrics | null;
  readonly downgradeReasons: readonly SynthesisQualityDowngradeReason[];
}

export interface SynthesisRouteQaSampleRecord {
  readonly selectionOrder: number;
  readonly selectionHash: string;
  readonly stratum:
    | "source_supported_fragment"
    | "teaching_upstream_gap"
    | "teaching_convergent_partial";
  readonly coverageId: string;
  readonly catalogEntityId: string;
  readonly preferredName: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly graphId: string;
  readonly detailPath: string;
  readonly alternativeId: string;
  readonly routeType: "source_supported_fragment" | "teaching_reconstruction";
  readonly routeCompleteness: "partial" | "upstream_gap" | "convergent_partial";
  readonly routeDepth: number;
  readonly connectedStepCount: number;
  readonly resolvedIntermediateCount: number;
  readonly sourceLocatorCount: number;
  readonly sourceLocators: readonly {
    readonly citationId: string;
    readonly sourceDocumentId: string;
    readonly kind: "dataset_record";
    readonly value: string;
  }[];
  readonly scientificReviewState: "pending";
  readonly verifiedScientificClaim: false;
  readonly humanQaState: "awaiting_review";
  readonly qaChecks: {
    readonly exactTargetIdentity: true;
    readonly exactSourceLocators: true;
    readonly independentStructureRedraw: true;
    readonly graphTopology: true;
    readonly operationalDetailsAbsent: true;
  };
}

export interface PublicAlphaSynthesisQualityReport {
  readonly schemaVersion: 1;
  readonly pipelineVersion: typeof SYNTHESIS_PUBLIC_ALPHA_QUALITY_PIPELINE_VERSION;
  readonly catalogSnapshotId: string;
  readonly generatedAt: string;
  readonly scope: {
    readonly coverageRecordCount: number;
    readonly indexedDraftGraphCount: number;
    readonly newDiscoveryPerformed: false;
    readonly networkFetchPerformed: false;
    readonly source: "generated_public_synthesis_snapshot";
  };
  readonly moleculeQuality: {
    readonly mutuallyExclusive: true;
    readonly exhaustive: true;
    readonly classifiedMoleculeCount: number;
    readonly byClass: Readonly<Record<SynthesisMoleculeQualityClass, number>>;
    readonly definitions: Readonly<Record<SynthesisMoleculeQualityClass, string>>;
    readonly records: readonly SynthesisMoleculeQualityRecord[];
  };
  readonly secondaryTopology: {
    readonly sourceSupportedConnectedDraftMolecules: number;
    readonly sourceSupportedFragmentDraftMolecules: number;
    readonly moleculesWithoutValidDraftGraph: number;
  };
  readonly routeDepth: {
    readonly validGraphCount: number;
    readonly draftRouteCount: number;
    readonly totalStepNodes: number;
    readonly targetFormingStepNodes: number;
    readonly upstreamStepNodes: number;
    readonly totalBridgeEdges: number;
    readonly perGraphResolvedIntermediateOccurrences: number;
    readonly uniqueResolvedIntermediateIdentities: number;
    readonly maximumGraphStepNodes: number;
    readonly maximumRouteDepth: number;
    readonly maximumConnectedStepsPerAlternative: number;
    readonly graphsByMaximumRouteDepth: {
      readonly one: number;
      readonly two: number;
      readonly threeOrMore: number;
    };
    readonly graphsByStepNodeCount: {
      readonly one: number;
      readonly twoToFive: number;
      readonly sixToTen: number;
      readonly elevenToTwenty: number;
      readonly twentyOneOrMore: number;
    };
    readonly graphsByResolvedUniqueIntermediateCount: {
      readonly zero: number;
      readonly one: number;
      readonly two: number;
      readonly threeToFour: number;
      readonly fiveOrMore: number;
    };
    readonly routesByDepth: {
      readonly one: number;
      readonly two: number;
      readonly threeOrMore: number;
    };
    readonly routesByConnectedStepCount: {
      readonly one: number;
      readonly two: number;
      readonly three: number;
      readonly fourOrMore: number;
    };
  };
  readonly graphIntegrity: {
    readonly graphsEvaluated: number;
    readonly exactIdentityPassed: number;
    readonly contractValidationPassed: number;
    readonly topologyValidationPassed: number;
    readonly acyclicGraphCount: number;
    readonly integrityDowngradedGraphCount: number;
    readonly orphanIndexGraphCount: number;
    readonly duplicateNodeIdCount: number;
    readonly danglingMaterialReferenceCount: number;
    readonly danglingStepReferenceCount: number;
    readonly danglingCitationReferenceCount: number;
    readonly invalidBridgeBoundaryCount: number;
    readonly detachedRouteAlternativeCount: number;
    readonly targetOutputMismatchCount: number;
    readonly graphCycleCount: number;
    readonly orphanStepNodeCount: number;
    readonly orphanMaterialNodeCount: number;
    readonly unusedCitationCount: number;
    readonly requestedBuckets: {
      readonly scope: "valid_public_alpha_graphs";
      readonly stepBucketUnit:
        "molecules_by_maximum_sequential_resolved_transformation_depth";
      readonly allReactantsResolved: number;
      readonly unresolvedReactants: number;
      readonly unresolvedProducts: number;
      readonly formConflict: number;
      readonly stereochemistryConflict: number;
      readonly bySequentialResolvedStepCount: {
        readonly one: number;
        readonly two: number;
        readonly threeToFour: number;
        readonly fiveOrMore: number;
      };
      readonly teachingBridge: number;
      readonly upstreamGap: number;
    };
  };
  readonly downgrades: {
    readonly moleculeCount: number;
    readonly byReason: Readonly<Record<SynthesisQualityDowngradeReason, number>>;
    readonly records: readonly {
      readonly coverageId: string;
      readonly graphId: string | null;
      readonly reasons: readonly SynthesisQualityDowngradeReason[];
    }[];
  };
  readonly qaSample: {
    readonly seed: typeof SYNTHESIS_PUBLIC_ALPHA_QA_SEED;
    readonly requestedSize: typeof SYNTHESIS_PUBLIC_ALPHA_QA_SAMPLE_SIZE;
    readonly actualSize: number;
    readonly eligibleDraftRouteCount: number;
    readonly deterministic: true;
    readonly sampleDigest: string;
    readonly byStratum: {
      readonly source_supported_fragment: number;
      readonly teaching_upstream_gap: number;
      readonly teaching_convergent_partial: number;
    };
    readonly records: readonly SynthesisRouteQaSampleRecord[];
  };
  readonly invariants: {
    readonly moleculeClassesMutuallyExclusive: true;
    readonly moleculeClassesExhaustCatalog: true;
    readonly exactIdentityRequiredForResolvedDraftClass: true;
    readonly invalidGraphsExcludedFromQaSample: true;
    readonly pendingNeverPresentedAsReviewedOrVerified: true;
    readonly noOperationalDetailsAnalyzedOrPublished: true;
    readonly noNewDiscoveryOrFetch: true;
  };
}

interface GraphInspection {
  readonly metrics: PublicAlphaGraphQualityMetrics;
  readonly reasons: readonly SynthesisQualityDowngradeReason[];
  readonly resolvedIntermediateInchiKeys: readonly string[];
  readonly cycleDetected: boolean;
  readonly routeCandidates: readonly Omit<SynthesisRouteQaSampleRecord,
    "selectionOrder" | "selectionHash">[];
  readonly counters: {
    readonly duplicateNodeIdCount: number;
    readonly danglingMaterialReferenceCount: number;
    readonly danglingStepReferenceCount: number;
    readonly danglingCitationReferenceCount: number;
    readonly invalidBridgeBoundaryCount: number;
    readonly detachedRouteAlternativeCount: number;
    readonly targetOutputMismatchCount: number;
    readonly orphanStepNodeCount: number;
    readonly orphanMaterialNodeCount: number;
    readonly unusedCitationCount: number;
  };
}

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasGraphTopologyArrays = (value: unknown): value is PublicAlphaSynthesisDraftGraph =>
  isObject(value) &&
  Array.isArray(value.materials) &&
  Array.isArray(value.steps) &&
  Array.isArray(value.bridges) &&
  Array.isArray(value.alternatives) &&
  Array.isArray(value.citations);
const isNonblank = (value: unknown): value is string =>
  typeof value === "string" && value.trim() === value && value.length > 0;
const INCHI_KEY = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u;
const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const sortText = (left: string, right: string): number =>
  left.localeCompare(right, "en");

const emptyCountRecord = <T extends string>(keys: readonly T[]): Record<T, number> =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;

const exactCoverageIdentity = (coverage: SynthesisCoverageRecord): boolean =>
  isNonblank(coverage.id) &&
  isNonblank(coverage.identityScope.catalogEntityId) &&
  isNonblank(coverage.identityScope.preferredName) &&
  Number.isSafeInteger(coverage.identityScope.pubChemCid) &&
  coverage.identityScope.pubChemCid > 0 &&
  INCHI_KEY.test(coverage.identityScope.inchiKey) &&
  isNonblank(coverage.identityScope.canonicalSmiles) &&
  isNonblank(coverage.identityScope.chemicalForm.normalizedKind) &&
  typeof coverage.identityScope.stereoisomer.specified === "boolean";

const referenceFromIndexEntry = (
  entry: DraftIndexEntry,
): PublicAlphaSynthesisDraftReference | null => {
  if (
    entry.schemaVersion !== 1 ||
    !isNonblank(entry.graphId) ||
    !isNonblank(entry.coverageId) ||
    !isNonblank(entry.detailPath)
  ) return null;
  const value = entry as JsonObject;
  return {
    schemaVersion: 1,
    graphId: value.graphId as PublicAlphaSynthesisDraftReference["graphId"],
    channel: value.channel as PublicAlphaSynthesisDraftReference["channel"],
    publicationState: value.publicationState as PublicAlphaSynthesisDraftReference["publicationState"],
    reviewState: value.reviewState as PublicAlphaSynthesisDraftReference["reviewState"],
    verifiedScientificClaim:
      value.verifiedScientificClaim as PublicAlphaSynthesisDraftReference["verifiedScientificClaim"],
    coverageId: value.coverageId as PublicAlphaSynthesisDraftReference["coverageId"],
    routeCompleteness:
      value.routeCompleteness as PublicAlphaSynthesisDraftReference["routeCompleteness"],
    draftRouteCount: value.draftRouteCount as number,
    extractedStepCount: value.extractedStepCount as number,
    teachingReconstructionCount: value.teachingReconstructionCount as number,
    resolvedIntermediateCount: value.resolvedIntermediateCount as number,
    unresolvedGapCount: value.unresolvedGapCount as number,
    licenseState: value.licenseState as PublicAlphaSynthesisDraftReference["licenseState"],
    detailPath: value.detailPath as PublicAlphaSynthesisDraftReference["detailPath"],
  };
};

const referencesEqual = (
  left: PublicAlphaSynthesisDraftReference,
  right: PublicAlphaSynthesisDraftReference,
): boolean => JSON.stringify(left) === JSON.stringify(right);

const indexIdentityMatches = (
  entry: DraftIndexEntry,
  coverage: SynthesisCoverageRecord,
): boolean =>
  entry.coverageId === coverage.id &&
  entry.catalogEntityId === coverage.identityScope.catalogEntityId &&
  entry.pubChemCid === coverage.identityScope.pubChemCid &&
  entry.inchiKey === coverage.identityScope.inchiKey;

const graphIdentityMatches = (
  value: unknown,
  coverage: SynthesisCoverageRecord,
): boolean => {
  if (!isObject(value) || !isObject(value.identity)) return false;
  return value.catalogSnapshotId === coverage.catalogSnapshotId &&
    value.identity.coverageId === coverage.id &&
    value.identity.catalogEntityId === coverage.identityScope.catalogEntityId &&
    value.identity.preferredName === coverage.identityScope.preferredName &&
    value.identity.pubChemCid === coverage.identityScope.pubChemCid &&
    value.identity.inchiKey === coverage.identityScope.inchiKey &&
    value.identity.chemicalForm === coverage.identityScope.chemicalForm.normalizedKind &&
    value.identity.stereochemistrySpecified === coverage.identityScope.stereoisomer.specified;
};

const countDuplicates = (values: readonly string[]): number =>
  values.length - new Set(values).size;

const inspectGraph = (
  graph: PublicAlphaSynthesisDraftGraph,
  coverage: SynthesisCoverageRecord,
): GraphInspection => {
  const reasons = new Set<SynthesisQualityDowngradeReason>();
  const materialById = new Map(graph.materials.map((item) => [item.id, item] as const));
  const stepById = new Map(graph.steps.map((item) => [item.id, item] as const));
  const citationById = new Map(graph.citations.map((item) => [item.id, item] as const));
  const duplicateNodeIdCount =
    countDuplicates(graph.materials.map((item) => item.id)) +
    countDuplicates(graph.steps.map((item) => item.id)) +
    countDuplicates(graph.bridges.map((item) => item.id)) +
    countDuplicates(graph.alternatives.map((item) => item.id)) +
    countDuplicates(graph.citations.map((item) => item.id));
  if (duplicateNodeIdCount > 0) reasons.add("duplicate_graph_node_id");

  let danglingMaterialReferenceCount = 0;
  let danglingCitationReferenceCount = 0;
  const referencedMaterialIds = new Set<string>();
  const referencedCitationIds = new Set<string>();
  for (const step of graph.steps) {
    for (const materialId of [...step.inputMaterialIds, ...step.outputMaterialIds]) {
      referencedMaterialIds.add(materialId);
      if (!materialById.has(materialId)) danglingMaterialReferenceCount += 1;
    }
    referencedCitationIds.add(step.citationId);
    if (!citationById.has(step.citationId)) danglingCitationReferenceCount += 1;
  }
  if (danglingMaterialReferenceCount > 0) reasons.add("dangling_material_reference");
  if (danglingCitationReferenceCount > 0) reasons.add("dangling_citation_reference");

  let danglingStepReferenceCount = 0;
  let invalidBridgeBoundaryCount = 0;
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const bridge of graph.bridges) {
    const from = stepById.get(bridge.fromStepId);
    const to = stepById.get(bridge.toStepId);
    if (!from || !to) {
      danglingStepReferenceCount += Number(!from) + Number(!to);
      continue;
    }
    const boundary = materialById.get(bridge.boundaryMaterialId);
    if (
      !boundary ||
      !from.outputMaterialIds.includes(bridge.boundaryMaterialId) ||
      !to.inputMaterialIds.includes(bridge.boundaryMaterialId) ||
      bridge.identityMatch !== "exact_inchi_key"
    ) invalidBridgeBoundaryCount += 1;
    incoming.set(to.id, [...(incoming.get(to.id) ?? []), from.id]);
    outgoing.set(from.id, [...(outgoing.get(from.id) ?? []), to.id]);
  }
  if (danglingStepReferenceCount > 0) reasons.add("dangling_step_reference");
  if (invalidBridgeBoundaryCount > 0) reasons.add("invalid_bridge_boundary");

  let detachedRouteAlternativeCount = 0;
  const referencedStepIds = new Set<string>();
  for (const alternative of graph.alternatives) {
    referencedStepIds.add(alternative.finalStepId);
    alternative.upstreamStepIds.forEach((id) => referencedStepIds.add(id));
    const final = stepById.get(alternative.finalStepId);
    if (!final || final.relationship !== "target_forming_segment") {
      danglingStepReferenceCount += 1;
      detachedRouteAlternativeCount += 1;
      continue;
    }
    for (const upstreamId of alternative.upstreamStepIds) {
      const upstream = stepById.get(upstreamId);
      if (
        !upstream ||
        upstream.relationship !== "upstream_source_segment" ||
        !graph.bridges.some((bridge) =>
          bridge.fromStepId === upstreamId && bridge.toStepId === alternative.finalStepId
        )
      ) detachedRouteAlternativeCount += 1;
    }
    if (
      (alternative.routeType === "teaching_reconstruction") !==
        (alternative.upstreamStepIds.length > 0)
    ) detachedRouteAlternativeCount += 1;
  }
  if (detachedRouteAlternativeCount > 0) reasons.add("detached_route_alternative");
  if (danglingStepReferenceCount > 0) reasons.add("dangling_step_reference");

  const exactTargetMaterials = graph.materials.filter((material) =>
    material.displayRole === "exact_target" &&
    material.inchiKey === coverage.identityScope.inchiKey &&
    material.identityResolution === "exact_inchi_key_computed"
  );
  if (exactTargetMaterials.length !== 1) reasons.add("target_material_missing");
  const exactTargetMaterialId = exactTargetMaterials[0]?.id;
  let targetOutputMismatchCount = 0;
  for (const step of graph.steps.filter((item) => item.relationship === "target_forming_segment")) {
    if (!exactTargetMaterialId || !step.outputMaterialIds.includes(exactTargetMaterialId)) {
      targetOutputMismatchCount += 1;
    }
  }
  if (targetOutputMismatchCount > 0) reasons.add("target_step_output_mismatch");

  const colors = new Map<string, "visiting" | "visited">();
  let cycleDetected = false;
  const visit = (stepId: string): void => {
    if (colors.get(stepId) === "visiting") {
      cycleDetected = true;
      return;
    }
    if (colors.get(stepId) === "visited") return;
    colors.set(stepId, "visiting");
    for (const next of outgoing.get(stepId) ?? []) visit(next);
    colors.set(stepId, "visited");
  };
  graph.steps.forEach((step) => visit(step.id));
  if (cycleDetected) reasons.add("graph_cycle_detected");

  const orphanStepNodeCount = graph.steps.filter((step) => !referencedStepIds.has(step.id)).length;
  const orphanMaterialNodeCount = graph.materials.filter(
    (material) => !referencedMaterialIds.has(material.id),
  ).length;
  const unusedCitationCount = graph.citations.filter(
    (citation) => !referencedCitationIds.has(citation.id),
  ).length;
  if (orphanStepNodeCount > 0) reasons.add("orphan_step_node");
  if (orphanMaterialNodeCount > 0) reasons.add("orphan_material_node");
  if (unusedCitationCount > 0) reasons.add("unused_citation");

  const depthMemo = new Map<string, number>();
  const depthFor = (stepId: string, visiting = new Set<string>()): number => {
    if (cycleDetected || visiting.has(stepId)) return 0;
    const memoized = depthMemo.get(stepId);
    if (memoized !== undefined) return memoized;
    const nextVisiting = new Set(visiting).add(stepId);
    const predecessors = incoming.get(stepId) ?? [];
    const depth = predecessors.length === 0
      ? 1
      : 1 + Math.max(...predecessors.map((id) => depthFor(id, nextVisiting)));
    depthMemo.set(stepId, depth);
    return depth;
  };
  const routeDepths = graph.alternatives.map((alternative) =>
    depthFor(alternative.finalStepId)
  );
  const maxRouteDepth = routeDepths.length > 0 ? Math.max(...routeDepths) : 0;
  const bridgeIntermediateIds = new Set(graph.bridges.map((bridge) =>
    bridge.boundaryMaterialId
  ));
  const resolvedIntermediateInchiKeys = [...bridgeIntermediateIds].flatMap((id) => {
    const material = materialById.get(id);
    return material && INCHI_KEY.test(material.inchiKey) ? [material.inchiKey] : [];
  });

  const routeCandidates = graph.alternatives.map((alternative) => {
    const routeStepIds = new Set([alternative.finalStepId, ...alternative.upstreamStepIds]);
    const citations = new Set(graph.steps.flatMap((step) =>
      routeStepIds.has(step.id) ? [step.citationId] : []
    ));
    const sourceLocators = [...citations].map((citationId) => {
      const citation = citationById.get(citationId);
      if (!citation) throw new Error(`Validated route lost citation ${citationId}.`);
      return {
        citationId,
        sourceDocumentId: citation.sourceDocumentId,
        kind: citation.locator.kind,
        value: citation.locator.value,
      };
    }).sort((left, right) => sortText(left.citationId, right.citationId));
    const intermediateIds = new Set(graph.bridges.flatMap((bridge) =>
      bridge.toStepId === alternative.finalStepId &&
        alternative.upstreamStepIds.includes(bridge.fromStepId)
        ? [bridge.boundaryMaterialId]
        : []
    ));
    const stratum = alternative.routeType === "source_supported_fragment"
      ? "source_supported_fragment" as const
      : alternative.routeCompleteness === "convergent_partial"
        ? "teaching_convergent_partial" as const
        : "teaching_upstream_gap" as const;
    return {
      stratum,
      coverageId: coverage.id,
      catalogEntityId: coverage.identityScope.catalogEntityId,
      preferredName: coverage.identityScope.preferredName,
      pubChemCid: coverage.identityScope.pubChemCid,
      inchiKey: coverage.identityScope.inchiKey,
      graphId: graph.graphId,
      detailPath: `/catalog/synthesis/drafts/${graph.graphId.slice(
        "synthesis-draft-graph:".length,
      )}.json`,
      alternativeId: alternative.id,
      routeType: alternative.routeType,
      routeCompleteness: alternative.routeCompleteness,
      routeDepth: depthFor(alternative.finalStepId),
      connectedStepCount: routeStepIds.size,
      resolvedIntermediateCount: intermediateIds.size,
      sourceLocatorCount: sourceLocators.length,
      sourceLocators,
      scientificReviewState: "pending" as const,
      verifiedScientificClaim: false as const,
      humanQaState: "awaiting_review" as const,
      qaChecks: {
        exactTargetIdentity: true as const,
        exactSourceLocators: true as const,
        independentStructureRedraw: true as const,
        graphTopology: true as const,
        operationalDetailsAbsent: true as const,
      },
    };
  });

  return {
    metrics: {
      stepNodeCount: graph.steps.length,
      targetFormingStepCount: graph.steps.filter(
        (step) => step.relationship === "target_forming_segment",
      ).length,
      upstreamStepCount: graph.steps.filter(
        (step) => step.relationship === "upstream_source_segment",
      ).length,
      materialNodeCount: graph.materials.length,
      citationCount: graph.citations.length,
      bridgeEdgeCount: graph.bridges.length,
      draftRouteCount: graph.alternatives.length,
      sourceFragmentRouteCount: graph.alternatives.filter(
        (alternative) => alternative.routeType === "source_supported_fragment",
      ).length,
      teachingReconstructionRouteCount: graph.alternatives.filter(
        (alternative) => alternative.routeType === "teaching_reconstruction",
      ).length,
      completeLearningRouteCount: graph.alternatives.filter((alternative) =>
        Number(alternative.unresolvedGapCount) === 0 &&
        depthFor(alternative.finalStepId) >= 1
      ).length,
      resolvedIntermediateCount: bridgeIntermediateIds.size,
      unresolvedGapCount: graph.alternatives.reduce(
        (sum, alternative) => sum + alternative.unresolvedGapCount,
        0,
      ),
      maxRouteDepth,
      maxConnectedStepCount: graph.alternatives.length === 0
        ? 0
        : Math.max(...graph.alternatives.map(
          (alternative) => 1 + new Set(alternative.upstreamStepIds).size,
        )),
      maxBranchWidth: graph.alternatives.length === 0
        ? 0
        : Math.max(...graph.alternatives.map(
          (alternative) => new Set(alternative.upstreamStepIds).size,
        )),
    },
    reasons: [...reasons].sort(sortText),
    resolvedIntermediateInchiKeys,
    cycleDetected,
    routeCandidates,
    counters: {
      duplicateNodeIdCount,
      danglingMaterialReferenceCount,
      danglingStepReferenceCount,
      danglingCitationReferenceCount,
      invalidBridgeBoundaryCount,
      detachedRouteAlternativeCount,
      targetOutputMismatchCount,
      orphanStepNodeCount,
      orphanMaterialNodeCount,
      unusedCitationCount,
    },
  };
};

const sampleRoutes = (
  candidates: readonly Omit<SynthesisRouteQaSampleRecord,
    "selectionOrder" | "selectionHash">[],
): PublicAlphaSynthesisQualityReport["qaSample"] => {
  const ranked = candidates.map((candidate) => ({
    candidate,
    selectionHash: sha256(
      `${SYNTHESIS_PUBLIC_ALPHA_QA_SEED}|${candidate.graphId}|${candidate.alternativeId}`,
    ),
  })).sort((left, right) =>
    sortText(left.selectionHash, right.selectionHash) ||
    sortText(left.candidate.alternativeId, right.candidate.alternativeId)
  );
  const strata = [
    "source_supported_fragment",
    "teaching_upstream_gap",
    "teaching_convergent_partial",
  ] as const;
  const selected = new Map<string, typeof ranked[number]>();
  const quota = Math.floor(SYNTHESIS_PUBLIC_ALPHA_QA_SAMPLE_SIZE / strata.length);
  for (const stratum of strata) {
    for (const item of ranked.filter((entry) => entry.candidate.stratum === stratum).slice(0, quota)) {
      selected.set(item.candidate.alternativeId, item);
    }
  }
  for (const item of ranked) {
    if (selected.size >= SYNTHESIS_PUBLIC_ALPHA_QA_SAMPLE_SIZE) break;
    selected.set(item.candidate.alternativeId, item);
  }
  const records = [...selected.values()].sort((left, right) => {
    const leftStratum = strata.indexOf(left.candidate.stratum);
    const rightStratum = strata.indexOf(right.candidate.stratum);
    return leftStratum - rightStratum || sortText(left.selectionHash, right.selectionHash);
  }).map((item, index): SynthesisRouteQaSampleRecord => ({
    selectionOrder: index + 1,
    selectionHash: item.selectionHash,
    ...item.candidate,
  }));
  const byStratum = {
    source_supported_fragment: records.filter(
      (record) => record.stratum === "source_supported_fragment",
    ).length,
    teaching_upstream_gap: records.filter(
      (record) => record.stratum === "teaching_upstream_gap",
    ).length,
    teaching_convergent_partial: records.filter(
      (record) => record.stratum === "teaching_convergent_partial",
    ).length,
  };
  return {
    seed: SYNTHESIS_PUBLIC_ALPHA_QA_SEED,
    requestedSize: SYNTHESIS_PUBLIC_ALPHA_QA_SAMPLE_SIZE,
    actualSize: records.length,
    eligibleDraftRouteCount: candidates.length,
    deterministic: true,
    sampleDigest: sha256(records.map((record) => record.alternativeId).join("\n")),
    byStratum,
    records,
  };
};

const graphReferenceForCoverage = (
  coverage: SynthesisCoverageRecord,
): readonly PublicAlphaSynthesisDraftReference[] => coverage.publicAlphaDrafts ?? [];

export const analyzePublicAlphaSynthesisQuality = (
  input: PublicAlphaSynthesisQualityInput,
): PublicAlphaSynthesisQualityReport => {
  const coverageRecords = [...input.coverageRecords].sort((left, right) =>
    sortText(left.id, right.id)
  );
  if (
    new Set(coverageRecords.map((record) => record.id)).size !== coverageRecords.length ||
    coverageRecords.some((record) => record.catalogSnapshotId !== input.catalogSnapshotId)
  ) throw new Error("Coverage input is duplicated or crosses catalog snapshots.");

  const draftEntriesByCoverage = Map.groupBy(input.draftEntries, (entry) =>
    String(entry.indexEntry.coverageId)
  );
  const coverageIds = new Set<string>(coverageRecords.map((record) => record.id));
  const orphanIndexGraphCount = input.draftEntries.filter(
    (entry) => !coverageIds.has(String(entry.indexEntry.coverageId)),
  ).length;
  const byClass = emptyCountRecord(SYNTHESIS_MOLECULE_QUALITY_CLASSES);
  const byReason = emptyCountRecord(SYNTHESIS_QUALITY_DOWNGRADE_REASONS);
  const qualityRecords: SynthesisMoleculeQualityRecord[] = [];
  const validInspections: GraphInspection[] = [];
  const validGraphs: PublicAlphaSynthesisDraftGraph[] = [];
  const qaCandidates: Omit<SynthesisRouteQaSampleRecord,
    "selectionOrder" | "selectionHash">[] = [];
  const integrity = {
    graphsEvaluated: input.draftEntries.length,
    exactIdentityPassed: 0,
    contractValidationPassed: 0,
    topologyValidationPassed: 0,
    acyclicGraphCount: 0,
    integrityDowngradedGraphCount: 0,
    orphanIndexGraphCount,
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
  };

  for (const coverage of coverageRecords) {
    const reasons = new Set<SynthesisQualityDowngradeReason>();
    const exactIdentity = exactCoverageIdentity(coverage);
    if (!exactIdentity) reasons.add("missing_exact_coverage_identity");
    const coverageReferences = graphReferenceForCoverage(coverage);
    const indexEntries = draftEntriesByCoverage.get(coverage.id) ?? [];
    if (coverageReferences.length > 1) reasons.add("multiple_coverage_draft_references");
    if (coverageReferences.length > 0 && indexEntries.length === 0) {
      reasons.add("coverage_reference_without_index_entry");
    }
    if (indexEntries.length > 0 && coverageReferences.length === 0) {
      reasons.add("index_entry_without_coverage_reference");
    }
    if (indexEntries.length > 1) reasons.add("multiple_coverage_draft_references");

    let graphId: string | null = coverageReferences[0]?.graphId ??
      (isNonblank(indexEntries[0]?.indexEntry.graphId)
        ? indexEntries[0].indexEntry.graphId
        : null);
    let graphMetrics: PublicAlphaGraphQualityMetrics | null = null;
    let graphValid = false;
    if (
      exactIdentity &&
      coverageReferences.length === 1 &&
      indexEntries.length === 1
    ) {
      const reference = coverageReferences[0];
      const draftEntry = indexEntries[0];
      const indexedReference = referenceFromIndexEntry(draftEntry.indexEntry);
      graphId = reference.graphId;
      if (!indexedReference || !referencesEqual(indexedReference, reference)) {
        reasons.add("index_reference_mismatch");
      }
      const indexIdentityExact = indexIdentityMatches(draftEntry.indexEntry, coverage);
      if (!indexIdentityExact) {
        reasons.add("index_identity_mismatch");
      }
      const graphIdentityExact = graphIdentityMatches(draftEntry.graph, coverage);
      if (!graphIdentityExact) {
        reasons.add("draft_exact_identity_mismatch");
      }
      if (indexIdentityExact && graphIdentityExact) integrity.exactIdentityPassed += 1;
      let validatedGraph: PublicAlphaSynthesisDraftGraph | null = null;
      if (reasons.size === 0) {
        try {
          validatedGraph = validatePublicAlphaSynthesisDraftGraph(
            draftEntry.graph,
            {
              catalogSnapshotId: input.catalogSnapshotId,
              catalogEntityId: coverage.identityScope.catalogEntityId,
              coverageId: coverage.id,
              preferredName: coverage.identityScope.preferredName,
              pubChemCid: coverage.identityScope.pubChemCid,
              inchiKey: coverage.identityScope.inchiKey,
              chemicalForm: coverage.identityScope.chemicalForm.normalizedKind,
              stereochemistrySpecified: coverage.identityScope.stereoisomer.specified,
            },
            reference,
          );
          integrity.contractValidationPassed += 1;
        } catch {
          reasons.add("draft_contract_validation_failed");
        }
      }
      let inspection: GraphInspection | null = null;
      if (reasons.size === 0 ||
          (reasons.size === 1 && reasons.has("draft_contract_validation_failed"))) {
        if (hasGraphTopologyArrays(draftEntry.graph)) {
          try {
            inspection = inspectGraph(draftEntry.graph, coverage);
          } catch {
            reasons.add("draft_contract_validation_failed");
          }
        }
      }
      if (inspection) {
        graphMetrics = inspection.metrics;
        inspection.reasons.forEach((reason) => reasons.add(reason));
        for (const [key, count] of Object.entries(inspection.counters)) {
          integrity[key as keyof typeof inspection.counters] += count;
        }
        integrity.graphCycleCount += Number(inspection.cycleDetected);
        if (!inspection.cycleDetected) integrity.acyclicGraphCount += 1;
        if (inspection.reasons.length === 0 && validatedGraph) {
          integrity.topologyValidationPassed += 1;
          graphValid = true;
          validInspections.push(inspection);
          validGraphs.push(validatedGraph);
          qaCandidates.push(...inspection.routeCandidates);
        }
      }
    }

    let qualityClass: SynthesisMoleculeQualityClass;
    if (reasons.size > 0) {
      qualityClass = coverage.sourceEvidenceState === "candidate_sources"
        ? "candidate_only"
        : "no_supporting_source_resolved";
      if (indexEntries.length > 0) integrity.integrityDowngradedGraphCount += indexEntries.length;
    } else if (graphValid && graphMetrics) {
      const hasContinuousStartToTargetRoute = graphMetrics.completeLearningRouteCount > 0;
      qualityClass = hasContinuousStartToTargetRoute
        ? "complete_learning_route"
        : graphMetrics.maxRouteDepth >= 3
          ? "substantive_partial_route"
          : "fragmentary_route";
    } else if (coverage.sourceEvidenceState === "candidate_sources") {
      qualityClass = "candidate_only";
    } else if (coverage.sourceEvidenceState === "none_found") {
      qualityClass = "no_supporting_source_resolved";
    } else {
      reasons.add("unsupported_coverage_evidence_state");
      qualityClass = "no_supporting_source_resolved";
    }
    const sortedReasons = [...reasons].sort(sortText);
    sortedReasons.forEach((reason) => { byReason[reason] += 1; });
    byClass[qualityClass] += 1;
    qualityRecords.push({
      coverageId: coverage.id,
      catalogEntityId: coverage.identityScope.catalogEntityId,
      preferredName: coverage.identityScope.preferredName,
      pubChemCid: coverage.identityScope.pubChemCid,
      inchiKey: coverage.identityScope.inchiKey,
      qualityClass,
      exactMolecularIdentityResolved: exactIdentity,
      resolvedDraftGraph: graphValid,
      graphId,
      scientificReviewState: "pending",
      verifiedScientificClaim: false,
      graphMetrics: graphValid ? graphMetrics : null,
      downgradeReasons: sortedReasons,
    });
  }

  const validMetrics = validInspections.map((inspection) => inspection.metrics);
  const resolvedIntermediateKeys = new Set(validInspections.flatMap(
    (inspection) => inspection.resolvedIntermediateInchiKeys,
  ));
  const routeDepths = validInspections.flatMap((inspection) =>
    inspection.routeCandidates.map((candidate) => candidate.routeDepth)
  );
  const connectedStepCounts = validInspections.flatMap((inspection) =>
    inspection.routeCandidates.map((candidate) => candidate.connectedStepCount)
  );
  const routeDepth = {
    validGraphCount: validGraphs.length,
    draftRouteCount: validMetrics.reduce((sum, metric) => sum + metric.draftRouteCount, 0),
    totalStepNodes: validMetrics.reduce((sum, metric) => sum + metric.stepNodeCount, 0),
    targetFormingStepNodes: validMetrics.reduce(
      (sum, metric) => sum + metric.targetFormingStepCount,
      0,
    ),
    upstreamStepNodes: validMetrics.reduce((sum, metric) => sum + metric.upstreamStepCount, 0),
    totalBridgeEdges: validMetrics.reduce((sum, metric) => sum + metric.bridgeEdgeCount, 0),
    perGraphResolvedIntermediateOccurrences: validMetrics.reduce(
      (sum, metric) => sum + metric.resolvedIntermediateCount,
      0,
    ),
    uniqueResolvedIntermediateIdentities: resolvedIntermediateKeys.size,
    maximumGraphStepNodes: validMetrics.length === 0
      ? 0
      : Math.max(...validMetrics.map((metric) => metric.stepNodeCount)),
    maximumRouteDepth: validMetrics.length === 0
      ? 0
      : Math.max(...validMetrics.map((metric) => metric.maxRouteDepth)),
    maximumConnectedStepsPerAlternative: validMetrics.length === 0
      ? 0
      : Math.max(...validMetrics.map((metric) => metric.maxConnectedStepCount)),
    graphsByMaximumRouteDepth: {
      one: validMetrics.filter((metric) => metric.maxRouteDepth === 1).length,
      two: validMetrics.filter((metric) => metric.maxRouteDepth === 2).length,
      threeOrMore: validMetrics.filter((metric) => metric.maxRouteDepth >= 3).length,
    },
    graphsByStepNodeCount: {
      one: validMetrics.filter((metric) => metric.stepNodeCount === 1).length,
      twoToFive: validMetrics.filter((metric) =>
        metric.stepNodeCount >= 2 && metric.stepNodeCount <= 5
      ).length,
      sixToTen: validMetrics.filter((metric) =>
        metric.stepNodeCount >= 6 && metric.stepNodeCount <= 10
      ).length,
      elevenToTwenty: validMetrics.filter((metric) =>
        metric.stepNodeCount >= 11 && metric.stepNodeCount <= 20
      ).length,
      twentyOneOrMore: validMetrics.filter((metric) => metric.stepNodeCount >= 21).length,
    },
    graphsByResolvedUniqueIntermediateCount: {
      zero: validMetrics.filter((metric) => metric.resolvedIntermediateCount === 0).length,
      one: validMetrics.filter((metric) => metric.resolvedIntermediateCount === 1).length,
      two: validMetrics.filter((metric) => metric.resolvedIntermediateCount === 2).length,
      threeToFour: validMetrics.filter((metric) =>
        metric.resolvedIntermediateCount >= 3 && metric.resolvedIntermediateCount <= 4
      ).length,
      fiveOrMore: validMetrics.filter((metric) => metric.resolvedIntermediateCount >= 5).length,
    },
    routesByDepth: {
      one: routeDepths.filter((depth) => depth === 1).length,
      two: routeDepths.filter((depth) => depth === 2).length,
      threeOrMore: routeDepths.filter((depth) => depth >= 3).length,
    },
    routesByConnectedStepCount: {
      one: connectedStepCounts.filter((count) => count === 1).length,
      two: connectedStepCounts.filter((count) => count === 2).length,
      three: connectedStepCounts.filter((count) => count === 3).length,
      fourOrMore: connectedStepCounts.filter((count) => count >= 4).length,
    },
  };
  const qaSample = sampleRoutes(qaCandidates);
  const downgradeRecords = qualityRecords.filter(
    (record) => record.downgradeReasons.length > 0,
  ).map((record) => ({
    coverageId: record.coverageId,
    graphId: record.graphId,
    reasons: record.downgradeReasons,
  }));
  const classifiedCount = Object.values(byClass).reduce((sum, count) => sum + count, 0);
  if (classifiedCount !== coverageRecords.length) {
    throw new Error("Molecule quality classes do not exhaust the catalog exactly once.");
  }
  return {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_PUBLIC_ALPHA_QUALITY_PIPELINE_VERSION,
    catalogSnapshotId: input.catalogSnapshotId,
    generatedAt: input.generatedAt,
    scope: {
      coverageRecordCount: coverageRecords.length,
      indexedDraftGraphCount: input.draftEntries.length,
      newDiscoveryPerformed: false,
      networkFetchPerformed: false,
      source: "generated_public_synthesis_snapshot",
    },
    moleculeQuality: {
      mutuallyExclusive: true,
      exhaustive: true,
      classifiedMoleculeCount: classifiedCount,
      byClass,
      definitions: {
        complete_learning_route:
          "At least one continuous resolved start-to-target path with no recorded upstream gap.",
        substantive_partial_route:
          "No complete path; at least three sequential resolved transformations connect toward the exact target.",
        fragmentary_route:
          "A source-supported exact-target graph resolves only one or two sequential transformations and retains an upstream gap.",
        candidate_only:
          "Candidate source evidence exists, but no exact-identity route graph passes the public-alpha quality gate.",
        no_supporting_source_resolved:
          "No supporting source was resolved within the recorded search scope; this is not a novelty or synthesizability claim.",
      },
      records: qualityRecords,
    },
    secondaryTopology: {
      sourceSupportedConnectedDraftMolecules: validMetrics.filter((metric) =>
        metric.teachingReconstructionRouteCount > 0 && metric.maxRouteDepth >= 2
      ).length,
      sourceSupportedFragmentDraftMolecules: validMetrics.filter((metric) =>
        metric.teachingReconstructionRouteCount === 0 || metric.maxRouteDepth < 2
      ).length,
      moleculesWithoutValidDraftGraph: coverageRecords.length - validGraphs.length,
    },
    routeDepth,
    graphIntegrity: {
      ...integrity,
      requestedBuckets: {
        scope: "valid_public_alpha_graphs",
        stepBucketUnit:
          "molecules_by_maximum_sequential_resolved_transformation_depth",
        allReactantsResolved: validGraphs.filter((graph) => graph.steps.every((step) =>
          step.inputMaterialIds.every((materialId) => graph.materials.some((material) =>
            material.id === materialId &&
            material.identityResolution === "exact_inchi_key_computed" &&
            INCHI_KEY.test(material.inchiKey)
          ))
        )).length,
        unresolvedReactants: validGraphs.filter((graph) => graph.steps.some((step) =>
          step.inputMaterialIds.some((materialId) => !graph.materials.some((material) =>
            material.id === materialId &&
            material.identityResolution === "exact_inchi_key_computed" &&
            INCHI_KEY.test(material.inchiKey)
          ))
        )).length,
        unresolvedProducts: validGraphs.filter((graph) => graph.steps.some((step) =>
          step.outputMaterialIds.some((materialId) => !graph.materials.some((material) =>
            material.id === materialId &&
            material.identityResolution === "exact_inchi_key_computed" &&
            INCHI_KEY.test(material.inchiKey)
          ))
        )).length,
        formConflict: validGraphs.filter((graph) => graph.assurance.formConflict).length,
        stereochemistryConflict: validGraphs.filter(
          (graph) => graph.assurance.stereochemistryConflict,
        ).length,
        bySequentialResolvedStepCount: {
          one: validMetrics.filter((metric) => metric.maxRouteDepth === 1).length,
          two: validMetrics.filter((metric) => metric.maxRouteDepth === 2).length,
          threeToFour: validMetrics.filter((metric) =>
            metric.maxRouteDepth >= 3 && metric.maxRouteDepth <= 4
          ).length,
          fiveOrMore: validMetrics.filter((metric) => metric.maxRouteDepth >= 5).length,
        },
        teachingBridge: validGraphs.filter((graph) => graph.bridges.length > 0).length,
        upstreamGap: validGraphs.filter((graph) => graph.alternatives.some(
          (alternative) => alternative.unresolvedGapCount > 0,
        )).length,
      },
    },
    downgrades: {
      moleculeCount: downgradeRecords.length,
      byReason,
      records: downgradeRecords,
    },
    qaSample,
    invariants: {
      moleculeClassesMutuallyExclusive: true,
      moleculeClassesExhaustCatalog: true,
      exactIdentityRequiredForResolvedDraftClass: true,
      invalidGraphsExcludedFromQaSample: true,
      pendingNeverPresentedAsReviewedOrVerified: true,
      noOperationalDetailsAnalyzedOrPublished: true,
      noNewDiscoveryOrFetch: true,
    },
  };
};

const artifactUrl = (path: string): URL => {
  if (
    !path.startsWith("/catalog/synthesis/") ||
    path.includes("..") ||
    path.includes("\\")
  ) throw new Error(`Unsafe synthesis quality artifact path: ${path}.`);
  return new URL(`../../public${path}`, import.meta.url);
};

const readArtifact = async <T,>(descriptor: ArtifactDescriptor): Promise<T> => {
  const text = await readFile(artifactUrl(descriptor.path), "utf8");
  if (
    Buffer.byteLength(text) !== descriptor.byteLength ||
    sha256(text) !== descriptor.sha256
  ) throw new Error(`Synthesis quality input digest mismatch: ${descriptor.path}.`);
  return JSON.parse(text) as T;
};

export const loadPublicAlphaSynthesisQualityInput = async (): Promise<
  PublicAlphaSynthesisQualityInput
> => {
  const manifest = JSON.parse(await readFile(
    new URL("../../public/catalog/synthesis/manifest.json", import.meta.url),
    "utf8",
  )) as {
    readonly schemaVersion: number;
    readonly catalogSnapshotId: string;
    readonly generatedAt: string;
    readonly recordCount: number;
    readonly shards: readonly ArtifactDescriptor[];
    readonly drafts: {
      readonly index: ArtifactDescriptor;
      readonly details: readonly ArtifactDescriptor[];
      readonly routeGraphCount: number;
    };
  };
  if (
    manifest.schemaVersion !== 1 ||
    !isNonblank(manifest.catalogSnapshotId) ||
    !isNonblank(manifest.generatedAt) ||
    !Array.isArray(manifest.shards) ||
    !Array.isArray(manifest.drafts?.details)
  ) throw new Error("Unsupported public synthesis manifest for quality analysis.");
  const shards = await Promise.all(manifest.shards.map((descriptor) => readArtifact<{
    readonly catalogSnapshotId: string;
    readonly records: readonly SynthesisCoverageRecord[];
  }>(descriptor)));
  const coverageRecords = shards.flatMap((shard) => {
    if (shard.catalogSnapshotId !== manifest.catalogSnapshotId || !Array.isArray(shard.records)) {
      throw new Error("Synthesis coverage shard crossed catalog snapshots.");
    }
    return shard.records;
  });
  const index = await readArtifact<{
    readonly schemaVersion: number;
    readonly channel: string;
    readonly catalogSnapshotId: string;
    readonly graphs: readonly DraftIndexEntry[];
  }>(manifest.drafts.index);
  if (
    index.schemaVersion !== 1 ||
    index.channel !== "public_alpha_source_supported_draft" ||
    index.catalogSnapshotId !== manifest.catalogSnapshotId ||
    !Array.isArray(index.graphs)
  ) throw new Error("Unsupported public-alpha draft index for quality analysis.");
  const descriptorByPath = new Map(
    manifest.drafts.details.map((descriptor) => [descriptor.path, descriptor] as const),
  );
  const draftEntries = await Promise.all(index.graphs.map(async (indexEntry) => {
    const descriptor = descriptorByPath.get(indexEntry.detailPath);
    if (!descriptor) throw new Error(`Missing draft descriptor: ${indexEntry.detailPath}.`);
    return {
      indexEntry,
      graph: await readArtifact<unknown>(descriptor),
    };
  }));
  if (
    coverageRecords.length !== manifest.recordCount ||
    draftEntries.length !== manifest.drafts.routeGraphCount ||
    descriptorByPath.size !== draftEntries.length
  ) throw new Error("Public synthesis quality inputs are incomplete or orphaned.");
  return {
    catalogSnapshotId: manifest.catalogSnapshotId,
    generatedAt: manifest.generatedAt,
    coverageRecords,
    draftEntries,
  };
};

export const runPublicAlphaSynthesisQualityAnalysis = async (): Promise<
  PublicAlphaSynthesisQualityReport
> => {
  const report = analyzePublicAlphaSynthesisQuality(
    await loadPublicAlphaSynthesisQualityInput(),
  );
  await writeFile(synthesisPublicAlphaQualityReportUrl, stableJson(report), "utf8");
  return report;
};

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    const report = await runPublicAlphaSynthesisQualityAnalysis();
    process.stdout.write(`${JSON.stringify({
      pipelineVersion: report.pipelineVersion,
      catalogSnapshotId: report.catalogSnapshotId,
      moleculeQuality: report.moleculeQuality.byClass,
      routeDepth: report.routeDepth,
      graphIntegrity: report.graphIntegrity,
      downgrades: report.downgrades.moleculeCount,
      qaSample: {
        actualSize: report.qaSample.actualSize,
        eligibleDraftRouteCount: report.qaSample.eligibleDraftRouteCount,
        byStratum: report.qaSample.byStratum,
        sampleDigest: report.qaSample.sampleDigest,
      },
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
