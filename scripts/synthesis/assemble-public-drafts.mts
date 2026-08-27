import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import type { SynthesisCoverageRecord } from "../../lib/domain/synthesis-coverage";
import type {
  SynthesisEvidenceAssociationAssessment,
  SynthesisResolvedReactionParticipant,
  SynthesisResolvedReactionSegment,
} from "../../lib/domain/synthesis-extraction";
import type {
  PublicAlphaSynthesisDraftAlternative,
  PublicAlphaSynthesisDraftAssemblyReport,
  PublicAlphaSynthesisDraftBridge,
  PublicAlphaSynthesisDraftCitation,
  PublicAlphaSynthesisDraftCompleteness,
  PublicAlphaSynthesisDraftGraph,
  PublicAlphaSynthesisDraftMaterial,
  PublicAlphaSynthesisDraftReference,
  PublicAlphaSynthesisDraftStep,
} from "../../lib/domain/public-alpha-synthesis-draft";
import { PUBLIC_ALPHA_SYNTHESIS_DRAFT_CHANNEL } from "../../lib/domain/public-alpha-synthesis-draft";
import type { SynthesisSourceEvidence } from "../../lib/domain/synthesis-route";

export const SYNTHESIS_ROUTE_ASSEMBLY_PIPELINE_VERSION =
  "synthesis-route-assembly-1.0.0" as const;

export const synthesisRouteAssemblyWorkUrl = new URL(
  "../../work/synthesis-route-assembly/v1/",
  import.meta.url,
);

interface DraftAssemblyInput {
  readonly coverage: readonly SynthesisCoverageRecord[];
  readonly evidence: readonly SynthesisSourceEvidence[];
  readonly assessments: readonly SynthesisEvidenceAssociationAssessment[];
  readonly segments: readonly SynthesisResolvedReactionSegment[];
  readonly generatedAt: string;
  readonly sourceContent: {
    readonly sourceLocatorCandidateDocuments: number;
    readonly accessibleFullTextDocuments: number;
  };
}

export interface PublicAlphaDraftAssemblyResult {
  readonly graphs: readonly PublicAlphaSynthesisDraftGraph[];
  readonly referencesByCoverageId: ReadonlyMap<
    string,
    readonly PublicAlphaSynthesisDraftReference[]
  >;
  readonly report: PublicAlphaSynthesisDraftAssemblyReport;
  readonly rejectionCounts: Readonly<Record<string, number>>;
}

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex").slice(0, 32);
const sortText = (left: string, right: string): number => left.localeCompare(right, "en");
const unique = <T,>(values: readonly T[]): readonly T[] => [...new Set(values)];

const graphIdFor = (coverageId: string): PublicAlphaSynthesisDraftGraph["graphId"] =>
  `synthesis-draft-graph:${hash(coverageId)}`;
const stepIdFor = (segmentId: string): PublicAlphaSynthesisDraftStep["id"] =>
  `synthesis-draft-step:${hash(segmentId)}`;
const materialIdFor = (inchiKey: string): PublicAlphaSynthesisDraftMaterial["id"] =>
  `synthesis-draft-material:${hash(inchiKey)}`;
const citationIdFor = (documentId: string): PublicAlphaSynthesisDraftCitation["id"] =>
  `synthesis-draft-citation:${hash(documentId)}`;

const safeDetailPathFor = (
  graphId: PublicAlphaSynthesisDraftGraph["graphId"],
): PublicAlphaSynthesisDraftReference["detailPath"] =>
  `/catalog/synthesis/drafts/${graphId.slice("synthesis-draft-graph:".length)}.json`;

const sourceRecordIdFromLocator = (value: string): string | null => {
  const pieces = value.split("/").filter(Boolean);
  const record = pieces.at(-1) ?? null;
  return record?.startsWith("ord-") ? record : null;
};

const segmentRejectionReason = (
  segment: SynthesisResolvedReactionSegment,
  coverage: SynthesisCoverageRecord | undefined,
  assessment: SynthesisEvidenceAssociationAssessment | undefined,
  evidence: SynthesisSourceEvidence | undefined,
): string | null => {
  if (!coverage) return "coverage_missing";
  if (!assessment) return "exact_association_missing";
  if (
    assessment.coverageId !== segment.coverageId ||
    assessment.sourceEvidenceId !== segment.sourceEvidenceId ||
    assessment.extractedSegmentId !== segment.segmentId ||
    assessment.extractionOutcome !== "resolved" ||
    assessment.sourceEvidenceState !== "direct_segment" ||
    assessment.exactLocatorResolved !== true ||
    assessment.sourceLocatorValue !== segment.sourceLocator.value ||
    assessment.identityResolution.molecularIdentity !== "exact_structure_computed" ||
    assessment.identityResolution.formIdentity !== "exact" ||
    assessment.identityResolution.stereochemistry !== "exact" ||
    assessment.reviewState !== "pending" ||
    assessment.operationalDetailsIncluded !== false
  ) return "association_gate_failed";
  if (
    segment.operationalDetailsIncluded !== false ||
    segment.reviewState !== "pending" ||
    segment.applicability !== "applicable" ||
    segment.stereochemicalResult.state !== "exact_target_product_identity" ||
    segment.stereochemicalResult.formCompatibility !== "exact" ||
    segment.stereochemicalResult.stereochemistryCompatibility !== "exact" ||
    segment.stereochemicalResult.targetInchiKey !== coverage.identityScope.inchiKey ||
    !segment.products.some((product) => product.inchiKey === coverage.identityScope.inchiKey)
  ) return "target_identity_gate_failed";
  if (
    segment.reactants.length === 0 ||
    segment.products.length === 0 ||
    [...segment.reactants, ...segment.products].some((participant) =>
      participant.identityResolution !== "exact_inchi_key_computed" ||
      !participant.smiles ||
      !/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u.test(participant.inchiKey)
    )
  ) return "participant_identity_gate_failed";
  const locatorRecord = sourceRecordIdFromLocator(segment.sourceLocator.value);
  if (
    !evidence ||
    evidence.sourceKind !== "open_reaction_dataset" ||
    evidence.documentId !== locatorRecord ||
    evidence.documentId !== assessment.globalDocumentKey.split(":").at(-1) ||
    evidence.locator?.kind !== "dataset_record" ||
    evidence.locator.value !== segment.sourceLocator.value ||
    evidence.url !== `https://open-reaction-database.org/id/${evidence.documentId}` ||
    evidence.licenseState !== "attribution_required" ||
    evidence.reuseMode !== "derived_facts_with_attribution" ||
    evidence.supportScope !== "single_step"
  ) return "source_locator_or_rights_gate_failed";
  return null;
};

const displayLabel = (participant: SynthesisResolvedReactionParticipant): string =>
  participant.name?.trim() || `Exact structure ${participant.inchiKey.slice(0, 14)}`;

const materialRolePriority = (
  role: PublicAlphaSynthesisDraftMaterial["displayRole"],
): number => role === "exact_target" ? 3 : role === "route_intermediate" ? 2 : 1;

const graphForCoverage = (
  coverage: SynthesisCoverageRecord,
  finalSegments: readonly SynthesisResolvedReactionSegment[],
  eligibleSegmentsByProduct: ReadonlyMap<string, readonly SynthesisResolvedReactionSegment[]>,
  evidenceById: ReadonlyMap<string, SynthesisSourceEvidence>,
  catalogSnapshotId: string,
  generatedAt: string,
): PublicAlphaSynthesisDraftGraph => {
  const finalTargetKey = coverage.identityScope.inchiKey;
  const finalIds = new Set(finalSegments.map((segment) => segment.segmentId));
  const upstreamByFinalId = new Map<string, SynthesisResolvedReactionSegment[]>();
  const bridgeKeysByFinalId = new Map<string, Set<string>>();
  for (const final of finalSegments) {
    const upstream = new Map<string, SynthesisResolvedReactionSegment>();
    const bridgeKeys = new Set<string>();
    for (const reactant of final.reactants) {
      for (const candidate of eligibleSegmentsByProduct.get(reactant.inchiKey) ?? []) {
        if (
          candidate.segmentId === final.segmentId ||
          candidate.stereochemicalResult.targetInchiKey === finalTargetKey ||
          candidate.sourceEvidenceId === final.sourceEvidenceId
        ) continue;
        upstream.set(candidate.segmentId, candidate);
        bridgeKeys.add(reactant.inchiKey);
      }
    }
    upstreamByFinalId.set(
      final.segmentId,
      [...upstream.values()].sort((left, right) => sortText(left.segmentId, right.segmentId)),
    );
    bridgeKeysByFinalId.set(final.segmentId, bridgeKeys);
  }

  const usedSegments = new Map<string, SynthesisResolvedReactionSegment>();
  for (const segment of finalSegments) usedSegments.set(segment.segmentId, segment);
  for (const values of upstreamByFinalId.values()) {
    for (const segment of values) usedSegments.set(segment.segmentId, segment);
  }
  const sortedSegments = [...usedSegments.values()].sort((left, right) =>
    sortText(left.segmentId, right.segmentId)
  );
  const bridgedMaterialKeys = new Set(
    [...bridgeKeysByFinalId.values()].flatMap((keys) => [...keys]),
  );
  const materialByKey = new Map<string, PublicAlphaSynthesisDraftMaterial>();
  const addMaterial = (
    participant: SynthesisResolvedReactionParticipant,
    role: PublicAlphaSynthesisDraftMaterial["displayRole"],
  ): void => {
    const existing = materialByKey.get(participant.inchiKey);
    const next: PublicAlphaSynthesisDraftMaterial = {
      id: materialIdFor(participant.inchiKey),
      label: displayLabel(participant),
      displayRole: role,
      sourceSmiles: participant.smiles as string,
      inchiKey: participant.inchiKey,
      identityResolution: "exact_inchi_key_computed",
      structureRepresentation: "independent_smiles_redraw",
    };
    if (!existing || materialRolePriority(role) > materialRolePriority(existing.displayRole)) {
      materialByKey.set(participant.inchiKey, next);
    }
  };
  for (const segment of sortedSegments) {
    for (const participant of segment.reactants) {
      addMaterial(
        participant,
        bridgedMaterialKeys.has(participant.inchiKey)
          ? "route_intermediate"
          : "source_input",
      );
    }
    for (const participant of segment.products) {
      addMaterial(
        participant,
        participant.inchiKey === finalTargetKey ? "exact_target" : "route_intermediate",
      );
    }
  }

  const citationsByEvidenceId = new Map<string, PublicAlphaSynthesisDraftCitation>();
  for (const segment of sortedSegments) {
    if (citationsByEvidenceId.has(segment.sourceEvidenceId)) continue;
    const source = evidenceById.get(segment.sourceEvidenceId);
    if (!source) throw new Error(`Missing admitted source for ${segment.segmentId}.`);
    citationsByEvidenceId.set(segment.sourceEvidenceId, {
      id: citationIdFor(source.documentId),
      sourceKind: "open_reaction_dataset",
      sourceDocumentId: source.documentId,
      label: source.title,
      url: source.url,
      locator: { kind: "dataset_record", value: segment.sourceLocator.value },
      supportScope: "single_step",
      license: {
        state: "attribution_required",
        identifier: "CC-BY-SA-4.0",
        attribution: "Open Reaction Database (ORD), CC BY-SA 4.0",
      },
      sourceTextReused: false,
      sourceFigureOrSchemeReused: false,
    });
  }
  const steps: PublicAlphaSynthesisDraftStep[] = sortedSegments.map((segment) => ({
    id: stepIdFor(segment.segmentId),
    relationship: finalIds.has(segment.segmentId)
      ? "target_forming_segment"
      : "upstream_source_segment",
    inputMaterialIds: segment.reactants.map((item) => materialIdFor(item.inchiKey)),
    outputMaterialIds: segment.products.map((item) => materialIdFor(item.inchiKey)),
    transformationClass: { label: "Unclassified", resolutionState: "not_computed" },
    reactionOrderState: "not_resolved",
    formedBondState: "not_resolved",
    brokenBondState: "not_resolved",
    atomMappingState: "not_mapped",
    evidenceMode: "direct_structured_dataset_segment",
    citationId: citationsByEvidenceId.get(segment.sourceEvidenceId)?.id as PublicAlphaSynthesisDraftCitation["id"],
    reviewState: "pending",
    operationalDetailsIncluded: false,
  }));

  const bridges: PublicAlphaSynthesisDraftBridge[] = [];
  const bridgeIds = new Set<string>();
  for (const final of finalSegments) {
    for (const upstream of upstreamByFinalId.get(final.segmentId) ?? []) {
      for (const reactant of final.reactants) {
        if (!upstream.products.some((product) => product.inchiKey === reactant.inchiKey)) continue;
        const key = `${upstream.segmentId}>${final.segmentId}:${reactant.inchiKey}`;
        if (bridgeIds.has(key)) continue;
        bridgeIds.add(key);
        bridges.push({
          id: `synthesis-draft-bridge:${hash(key)}`,
          fromStepId: stepIdFor(upstream.segmentId),
          toStepId: stepIdFor(final.segmentId),
          boundaryMaterialId: materialIdFor(reactant.inchiKey),
          identityMatch: "exact_inchi_key",
          editorialBridge: "teaching_reconstruction",
          reportedAsOneCompleteRoute: false,
        });
      }
    }
  }
  bridges.sort((left, right) => sortText(left.id, right.id));

  const alternatives: PublicAlphaSynthesisDraftAlternative[] = finalSegments.map((segment) => {
    const upstream = upstreamByFinalId.get(segment.segmentId) ?? [];
    const bridgedInputCount = bridgeKeysByFinalId.get(segment.segmentId)?.size ?? 0;
    const routeCompleteness: PublicAlphaSynthesisDraftCompleteness =
      bridgedInputCount >= 2 ? "convergent_partial" : "upstream_gap";
    return {
      id: `synthesis-draft-alternative:${hash(segment.segmentId)}`,
      finalStepId: stepIdFor(segment.segmentId),
      upstreamStepIds: upstream.map((item) => stepIdFor(item.segmentId)),
      routeType: upstream.length > 0
        ? "teaching_reconstruction"
        : "source_supported_fragment",
      routeCompleteness,
      unresolvedGapCount: 1,
    };
  });
  const graphCompleteness: PublicAlphaSynthesisDraftCompleteness = alternatives.some(
    (alternative) => alternative.routeCompleteness === "convergent_partial",
  ) ? "convergent_partial" : "upstream_gap";

  return {
    schemaVersion: 1,
    graphId: graphIdFor(coverage.id),
    channel: PUBLIC_ALPHA_SYNTHESIS_DRAFT_CHANNEL,
    publicationState: "source_supported_draft",
    publicationLabel: {
      tr: "KAYNAK DESTEKLİ TASLAK — UZMAN İNCELEMESİ BEKLİYOR",
      en: "SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING",
    },
    catalogSnapshotId,
    generatedAt,
    identity: {
      coverageId: coverage.id,
      catalogEntityId: coverage.identityScope.catalogEntityId,
      preferredName: coverage.identityScope.preferredName,
      pubChemCid: coverage.identityScope.pubChemCid,
      inchiKey: coverage.identityScope.inchiKey,
      chemicalForm: coverage.identityScope.chemicalForm.normalizedKind,
      stereochemistrySpecified: coverage.identityScope.stereoisomer.specified,
    },
    assurance: {
      reviewState: "pending",
      expertReviewRequired: true,
      verifiedScientificClaim: false,
      exactTargetIdentity: true,
      formConflict: false,
      stereochemistryConflict: false,
      operationalDetailsIncluded: false,
      contentOrigin: "independent_smiles_redraw",
      rightsDecisionState: "approved_for_independent_redraw_with_attribution",
      rightsPolicyVersion: "ord-independent-redraw-1.0.0",
      sourceTextReused: false,
      sourceFigureOrSchemeReused: false,
    },
    routeCompleteness: graphCompleteness,
    materials: [...materialByKey.values()].sort((left, right) => sortText(left.id, right.id)),
    steps,
    bridges,
    alternatives,
    citations: [...citationsByEvidenceId.values()].sort((left, right) =>
      sortText(left.id, right.id)
    ),
    limitations: [
      "Each displayed step is an independently redrawn projection of one exact-target ORD dataset record; it is not an expert-reviewed reported route.",
      "Exact-structure bridges join separate source records for teaching only and are never presented as one source-reported complete route.",
      "Reaction class, atom mapping, formed bonds and broken bonds remain unresolved and are not inferred.",
      "No quantities, conditions, time, temperature, workup, purification, yield or scale are published.",
      "Every alternative retains an explicit upstream gap; completeness and laboratory reproducibility have not been established.",
    ],
  };
};

export const assemblePublicAlphaSynthesisDrafts = (
  input: DraftAssemblyInput,
): PublicAlphaDraftAssemblyResult => {
  const coverageById = new Map(input.coverage.map((item) => [item.id, item] as const));
  const evidenceById = new Map(input.evidence.map((item) => [item.id, item] as const));
  const assessmentBySegmentId = new Map(
    input.assessments.flatMap((assessment) => assessment.extractedSegmentId
      ? [[assessment.extractedSegmentId, assessment] as const]
      : []),
  );
  const rejectionCounts: Record<string, number> = {};
  const eligibleSegments = input.segments.filter((segment) => {
    const reason = segmentRejectionReason(
      segment,
      coverageById.get(segment.coverageId),
      assessmentBySegmentId.get(segment.segmentId),
      evidenceById.get(segment.sourceEvidenceId),
    );
    if (!reason) return true;
    rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1;
    return false;
  }).sort((left, right) => sortText(left.segmentId, right.segmentId));

  const segmentsByCoverage = new Map<
    SynthesisCoverageRecord["id"],
    SynthesisResolvedReactionSegment[]
  >();
  const segmentsByProduct = new Map<string, SynthesisResolvedReactionSegment[]>();
  for (const segment of eligibleSegments) {
    const coverageSegments = segmentsByCoverage.get(segment.coverageId) ?? [];
    coverageSegments.push(segment);
    segmentsByCoverage.set(segment.coverageId, coverageSegments);
    for (const product of segment.products) {
      const productSegments = segmentsByProduct.get(product.inchiKey) ?? [];
      productSegments.push(segment);
      segmentsByProduct.set(product.inchiKey, productSegments);
    }
  }
  const graphs = [...segmentsByCoverage.entries()].map(([coverageId, segments]) => {
    const coverage = coverageById.get(coverageId);
    if (!coverage) throw new Error(`Missing coverage during graph assembly: ${coverageId}.`);
    return graphForCoverage(
      coverage,
      segments,
      segmentsByProduct,
      evidenceById,
      coverage.catalogSnapshotId,
      input.generatedAt,
    );
  }).sort((left, right) => sortText(left.graphId, right.graphId));

  const referencesByCoverageId = new Map<string, readonly PublicAlphaSynthesisDraftReference[]>();
  for (const graph of graphs) {
    const reference: PublicAlphaSynthesisDraftReference = {
      schemaVersion: 1,
      graphId: graph.graphId,
      channel: PUBLIC_ALPHA_SYNTHESIS_DRAFT_CHANNEL,
      publicationState: "source_supported_draft",
      reviewState: "pending",
      verifiedScientificClaim: false,
      coverageId: graph.identity.coverageId,
      routeCompleteness: graph.routeCompleteness,
      draftRouteCount: graph.alternatives.length,
      extractedStepCount: graph.steps.length,
      teachingReconstructionCount: graph.alternatives.filter(
        (alternative) => alternative.routeType === "teaching_reconstruction",
      ).length,
      resolvedIntermediateCount: new Set(
        graph.bridges.map((bridge) => bridge.boundaryMaterialId),
      ).size,
      unresolvedGapCount: graph.alternatives.reduce(
        (sum, alternative) => sum + alternative.unresolvedGapCount,
        0,
      ),
      licenseState: "attribution_required",
      detailPath: safeDetailPathFor(graph.graphId),
    };
    referencesByCoverageId.set(graph.identity.coverageId, [reference]);
  }

  const allAlternatives = graphs.flatMap((graph) => graph.alternatives);
  const uniqueResolvedIntermediates = new Set(
    graphs.flatMap((graph) => graph.bridges.map((bridge) => {
      const material = graph.materials.find((item) => item.id === bridge.boundaryMaterialId);
      return material?.inchiKey ?? bridge.boundaryMaterialId;
    })),
  );
  const teachingGraphs = graphs.filter((graph) =>
    graph.alternatives.some((alternative) => alternative.routeType === "teaching_reconstruction")
  );
  const graphCoverageIds = new Set(graphs.map((graph) => graph.identity.coverageId));
  const coverageSurfaceCounts = {
    public_draft_partial: graphCoverageIds.size,
    candidate_only: input.coverage.filter((record) =>
      !graphCoverageIds.has(record.id) && record.sourceEvidenceState === "candidate_sources"
    ).length,
    no_supporting_source_resolved: input.coverage.filter((record) =>
      !graphCoverageIds.has(record.id) && record.sourceEvidenceState === "none_found"
    ).length,
  };
  if (
    coverageSurfaceCounts.public_draft_partial +
      coverageSurfaceCounts.candidate_only +
      coverageSurfaceCounts.no_supporting_source_resolved !== input.coverage.length
  ) {
    throw new Error("Public synthesis surface distribution does not cover the full catalog.");
  }
  const report: PublicAlphaSynthesisDraftAssemblyReport = {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_ROUTE_ASSEMBLY_PIPELINE_VERSION,
    generatedAt: input.generatedAt,
    catalogCoverageCount: input.coverage.length,
    directSourceSegmentsExamined: input.segments.length,
    directSourceSegmentsAdmitted: eligibleSegments.length,
    directSourceSegmentsRejected: input.segments.length - eligibleSegments.length,
    sourceLocatorCandidateDocumentsExamined:
      input.sourceContent.sourceLocatorCandidateDocuments,
    sourceLocatorCandidateDocumentsPromotedToSteps: 0,
    accessibleFullTextDocumentsPreviouslyInspected:
      input.sourceContent.accessibleFullTextDocuments,
    publicDraftRoutes: allAlternatives.length,
    partialRoutes: allAlternatives.length,
    routeGraphs: graphs.length,
    extractedSteps: eligibleSegments.length,
    resolvedIntermediates: uniqueResolvedIntermediates.size,
    exactTeachingBridgeCount: unique(
      graphs.flatMap((graph) => graph.bridges.map((bridge) =>
        `${bridge.fromStepId}>${bridge.toStepId}:${bridge.boundaryMaterialId}`
      )),
    ).length,
    unresolvedGaps: allAlternatives.reduce(
      (sum, alternative) => sum + alternative.unresolvedGapCount,
      0,
    ),
    teachingReconstructions: teachingGraphs.length,
    reviewedRoutes: 0,
    coverageSurfaceCounts,
    byCompleteness: {
      partial: allAlternatives.filter((item) => item.routeCompleteness === "partial").length,
      upstream_gap: allAlternatives.filter((item) => item.routeCompleteness === "upstream_gap").length,
      convergent_partial: allAlternatives.filter(
        (item) => item.routeCompleteness === "convergent_partial",
      ).length,
    },
    candidateOnlyBoundary:
      "The 1,720 source-locator candidate documents retain name-only, form/stereo-unresolved context and no exact participant graph; none was promoted to a step or route.",
    invariants: {
      noNewDiscoveryPerformed: true,
      everyPublishedStepHasExactTargetAssociation: true,
      everyPublishedStepHasExactLocator: true,
      everyPublishedStructureIsIndependentRedrawInput: true,
      operationalDetailsPublished: false,
      pendingDisplayedAsReviewedOrVerified: false,
    },
  };
  return { graphs, referencesByCoverageId, report, rejectionCounts };
};

export const writePublicAlphaSynthesisDraftAssembly = async (
  result: PublicAlphaDraftAssemblyResult,
): Promise<void> => {
  await rm(synthesisRouteAssemblyWorkUrl, { recursive: true, force: true });
  await mkdir(new URL("graphs/", synthesisRouteAssemblyWorkUrl), { recursive: true });
  await Promise.all(result.graphs.map((graph) =>
    writeFile(
      new URL(`${graph.graphId.slice("synthesis-draft-graph:".length)}.json`, new URL("graphs/", synthesisRouteAssemblyWorkUrl)),
      stableJson(graph),
      "utf8",
    )
  ));
  await writeFile(
    new URL("assembly-report.json", synthesisRouteAssemblyWorkUrl),
    stableJson({ ...result.report, rejectionCounts: result.rejectionCounts }),
    "utf8",
  );
};

export const loadSynthesisSourceContentRunSummary = async (): Promise<
  DraftAssemblyInput["sourceContent"]
> => {
  const manifest = JSON.parse(await readFile(
    new URL("../../work/synthesis-source-content/v2/run-manifest.json", import.meta.url),
    "utf8",
  )) as {
    readonly runState: string;
    readonly routeExtractionStateCounts: Readonly<Record<string, number>>;
    readonly accessStateCounts: Readonly<Record<string, number>>;
    readonly fullTextStored: boolean;
  };
  if (manifest.runState !== "complete" || manifest.fullTextStored !== false) {
    throw new Error("Source-content checkpoint is incomplete or violates the no-source-text boundary.");
  }
  return {
    sourceLocatorCandidateDocuments:
      manifest.routeExtractionStateCounts.source_locator_candidate ?? 0,
    accessibleFullTextDocuments: manifest.accessStateCounts.full_text_accessible ?? 0,
  };
};
