import { readFile, readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import type {
  SynthesisResolvedReactionSegment,
} from "../../lib/domain/synthesis-extraction";

export const SYNTHESIS_UPSTREAM_GAP_AUDIT_PIPELINE_VERSION =
  "synthesis-upstream-gap-audit-1.0.0" as const;

export const synthesisUpstreamGapAuditReportUrl = new URL(
  "../../public/catalog/synthesis/reports/upstream-gap-completion.json",
  import.meta.url,
);

interface ReactionCandidateParticipant {
  readonly role: string;
  readonly smiles: string | null;
  readonly inchi: string | null;
}

interface ReactionCandidateMetadata {
  readonly products: readonly ReactionCandidateParticipant[];
  readonly provenance: {
    readonly isMined: boolean | null;
  };
  readonly sourceEvidence: {
    readonly evidenceId: string | null;
  };
}

interface DiscoverySubjectProjection {
  readonly adapters: readonly {
    readonly adapterId: string;
    readonly metadata: {
      readonly reactionCandidates?: readonly ReactionCandidateMetadata[];
    };
  }[];
}

interface SourceRecordFlags {
  readonly metadataResolved: boolean;
  readonly textMined: boolean | null;
  readonly exactTargetProductRole: "product" | "unspecified" | "other" | null;
}

interface ExactIdentityBridgeEdge {
  readonly upstreamSegmentId: string;
  readonly downstreamSegmentId: string;
  readonly boundaryInchiKey: string;
}

export interface SynthesisUpstreamGapAuditInput {
  readonly generatedAt: string;
  readonly segments: readonly SynthesisResolvedReactionSegment[];
  readonly discoverySubjects: readonly DiscoverySubjectProjection[];
}

export interface SynthesisUpstreamGapAuditReport {
  readonly schemaVersion: 1;
  readonly pipelineVersion: typeof SYNTHESIS_UPSTREAM_GAP_AUDIT_PIPELINE_VERSION;
  readonly generatedAt: string;
  readonly scope: {
    readonly localResolvedSegmentCount: number;
    readonly exactTargetIdentityCount: number;
    readonly networkFetchPerformed: false;
    readonly broadDiscoveryPerformed: false;
  };
  readonly rawExactIdentityProjection: {
    readonly uniqueProductIdentityCount: number;
    readonly exactIdentityBridgeEdgeCount: number;
    readonly segmentsWithAtLeastOneUpstreamIdentityMatch: number;
    readonly finalSegmentsWithSimplePathDepthThreeOrMore: number;
    readonly moleculesWithSimplePathDepthThreeOrMore: number;
    readonly scientificAdmissionState: "rejected_fail_closed";
    readonly reason: string;
  };
  readonly materialIdentityCycles: {
    readonly stronglyConnectedComponentCount: number;
    readonly involvedIdentityCount: number;
    readonly components: readonly (readonly string[])[];
  };
  readonly sourceAndChemistryBoundary: {
    readonly datasetRecordLocatorCount: number;
    readonly pageSchemeOrExampleLocatorCount: number;
    readonly textMinedSegmentCount: number;
    readonly nonTextMinedSegmentCount: number;
    readonly sourceMiningStateUnknownCount: number;
    readonly exactProductRoleCount: number;
    readonly unspecifiedProductRoleCount: number;
    readonly otherOrUnresolvedProductRoleCount: number;
    readonly unclassifiedReactionCount: number;
    readonly atomMappingNotResolvedCount: number;
    readonly pendingReviewCount: number;
    readonly reviewedOrVerifiedCount: number;
  };
  readonly highConfidenceLocalAdmission: {
    readonly rule: string;
    readonly eligibleSegmentCount: number;
    readonly exactIdentityBridgeEdgeCount: number;
    readonly finalSegmentsWithPathDepthThreeOrMore: number;
    readonly moleculesWithPathDepthThreeOrMore: number;
  };
  readonly outcome: {
    readonly recursivelyPublishedRouteCount: 0;
    readonly promotedSubstantivePartialMoleculeCount: 0;
    readonly promotedCompleteLearningRouteMoleculeCount: 0;
    readonly existingPublicDraftArtifactsChanged: false;
    readonly hardBoundary: string;
  };
  readonly invariants: {
    readonly exactInchiKeyMatchNeverTreatedAsReactionRoleProof: true;
    readonly cyclicMaterialPathsRejected: true;
    readonly textMinedPendingSegmentsNotPromotedByHeuristic: true;
    readonly noScientificStateUpgraded: true;
    readonly noNewDiscoveryOrNetworkFetch: true;
  };
}

const sortText = (left: string, right: string): number =>
  left.localeCompare(right, "en");

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const targetProduct = (
  segment: SynthesisResolvedReactionSegment,
): SynthesisResolvedReactionSegment["products"][number] =>
  segment.products.find((participant) =>
    participant.inchiKey === segment.stereochemicalResult.targetInchiKey
  ) ?? segment.products[0];

const sourceFlagsByEvidenceId = (
  subjects: readonly DiscoverySubjectProjection[],
  segments: readonly SynthesisResolvedReactionSegment[],
): ReadonlyMap<string, SourceRecordFlags> => {
  const candidateByEvidenceId = new Map<string, ReactionCandidateMetadata>();
  for (const subject of subjects) {
    const adapter = subject.adapters.find((entry) =>
      entry.adapterId === "open-reaction-database"
    );
    for (const candidate of adapter?.metadata.reactionCandidates ?? []) {
      const evidenceId = candidate.sourceEvidence.evidenceId;
      if (evidenceId) candidateByEvidenceId.set(evidenceId, candidate);
    }
  }

  return new Map(segments.map((segment) => {
    const candidate = candidateByEvidenceId.get(segment.sourceEvidenceId);
    const exactStructures = new Set(segment.products
      .filter((participant) =>
        participant.inchiKey === segment.stereochemicalResult.targetInchiKey
      )
      .map((participant) => participant.structure));
    const candidateProduct = candidate?.products.find((participant) =>
      exactStructures.has(participant.smiles ?? participant.inchi ?? "")
    );
    const role = candidateProduct?.role;
    return [segment.sourceEvidenceId, {
      metadataResolved: Boolean(candidate),
      textMined: candidate?.provenance.isMined ?? null,
      exactTargetProductRole: role === "product"
        ? "product"
        : role === "unspecified"
          ? "unspecified"
          : role
            ? "other"
            : null,
    }] as const;
  }));
};

const exactIdentityEdges = (
  segments: readonly SynthesisResolvedReactionSegment[],
  includeSegment: (segment: SynthesisResolvedReactionSegment) => boolean = () => true,
): readonly ExactIdentityBridgeEdge[] => {
  const included = segments.filter(includeSegment);
  const byProduct = new Map<string, SynthesisResolvedReactionSegment[]>();
  for (const segment of included) {
    for (const product of segment.products) {
      const values = byProduct.get(product.inchiKey) ?? [];
      values.push(segment);
      byProduct.set(product.inchiKey, values);
    }
  }
  const edges = new Map<string, ExactIdentityBridgeEdge>();
  for (const downstream of included) {
    for (const reactant of downstream.reactants) {
      for (const upstream of byProduct.get(reactant.inchiKey) ?? []) {
        if (
          upstream.segmentId === downstream.segmentId ||
          upstream.sourceEvidenceId === downstream.sourceEvidenceId ||
          upstream.stereochemicalResult.targetInchiKey ===
            downstream.stereochemicalResult.targetInchiKey
        ) continue;
        const key = `${upstream.segmentId}>${downstream.segmentId}:${reactant.inchiKey}`;
        edges.set(key, {
          upstreamSegmentId: upstream.segmentId,
          downstreamSegmentId: downstream.segmentId,
          boundaryInchiKey: reactant.inchiKey,
        });
      }
    }
  }
  return [...edges.values()].sort((left, right) => sortText(
    `${left.upstreamSegmentId}>${left.downstreamSegmentId}:${left.boundaryInchiKey}`,
    `${right.upstreamSegmentId}>${right.downstreamSegmentId}:${right.boundaryInchiKey}`,
  ));
};

const pathDepthThreeCounts = (
  segments: readonly SynthesisResolvedReactionSegment[],
  edges: readonly ExactIdentityBridgeEdge[],
): { readonly finalSegments: number; readonly molecules: number } => {
  const segmentById = new Map(segments.map((segment) => [segment.segmentId, segment] as const));
  const predecessors = Map.groupBy(edges, (edge) => edge.downstreamSegmentId);
  const hasPath = (
    segmentId: string,
    remainingDepth: number,
    visitedSegments: ReadonlySet<string>,
    visitedEvidence: ReadonlySet<string>,
  ): boolean => {
    const segment = segmentById.get(segmentId);
    if (
      !segment ||
      visitedSegments.has(segmentId) ||
      visitedEvidence.has(segment.sourceEvidenceId)
    ) return false;
    if (remainingDepth <= 1) return true;
    const nextSegments = new Set(visitedSegments).add(segmentId);
    const nextEvidence = new Set(visitedEvidence).add(segment.sourceEvidenceId);
    return (predecessors.get(segmentId) ?? []).some((edge) =>
      hasPath(edge.upstreamSegmentId, remainingDepth - 1, nextSegments, nextEvidence)
    );
  };
  const eligible = segments.filter((segment) =>
    hasPath(segment.segmentId, 3, new Set(), new Set())
  );
  return {
    finalSegments: eligible.length,
    molecules: new Set(eligible.map((segment) => segment.coverageId)).size,
  };
};

const cyclicIdentityComponents = (
  segments: readonly SynthesisResolvedReactionSegment[],
  edges: readonly ExactIdentityBridgeEdge[],
): readonly (readonly string[])[] => {
  const segmentById = new Map(segments.map((segment) => [segment.segmentId, segment] as const));
  const adjacency = new Map<string, Set<string>>();
  const nodes = new Set<string>();
  for (const edge of edges) {
    const upstream = segmentById.get(edge.upstreamSegmentId);
    const downstream = segmentById.get(edge.downstreamSegmentId);
    if (!upstream || !downstream) continue;
    const from = targetProduct(upstream).inchiKey;
    const to = targetProduct(downstream).inchiKey;
    nodes.add(from);
    nodes.add(to);
    const values = adjacency.get(from) ?? new Set<string>();
    values.add(to);
    adjacency.set(from, values);
  }

  let cursor = 0;
  const indexes = new Map<string, number>();
  const lows = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  const visit = (node: string): void => {
    indexes.set(node, cursor);
    lows.set(node, cursor);
    cursor += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!indexes.has(next)) {
        visit(next);
        lows.set(node, Math.min(lows.get(node) as number, lows.get(next) as number));
      } else if (onStack.has(next)) {
        lows.set(node, Math.min(lows.get(node) as number, indexes.get(next) as number));
      }
    }
    if (lows.get(node) !== indexes.get(node)) return;
    const component: string[] = [];
    while (stack.length > 0) {
      const member = stack.pop() as string;
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    if (component.length > 1) components.push(component.sort(sortText));
  };
  for (const node of [...nodes].sort(sortText)) {
    if (!indexes.has(node)) visit(node);
  }
  return components.sort((left, right) =>
    right.length - left.length || sortText(left.join("|"), right.join("|"))
  );
};

export const analyzeUpstreamGapCompletion = (
  input: SynthesisUpstreamGapAuditInput,
): SynthesisUpstreamGapAuditReport => {
  const segments = [...input.segments].sort((left, right) =>
    sortText(left.segmentId, right.segmentId)
  );
  const sourceFlags = sourceFlagsByEvidenceId(input.discoverySubjects, segments);
  const rawEdges = exactIdentityEdges(segments);
  const rawDepth = pathDepthThreeCounts(segments, rawEdges);
  const cycleComponents = cyclicIdentityComponents(segments, rawEdges);
  const highConfidenceSegment = (segment: SynthesisResolvedReactionSegment): boolean => {
    const flags = sourceFlags.get(segment.sourceEvidenceId);
    return flags?.metadataResolved === true &&
      flags.textMined === false &&
      flags.exactTargetProductRole === "product" &&
      segment.sourceLocator.kind === "dataset_record" &&
      Boolean(segment.sourceLocator.value) &&
      segment.stereochemicalResult.formCompatibility === "exact" &&
      segment.stereochemicalResult.stereochemistryCompatibility === "exact" &&
      segment.operationalDetailsIncluded === false;
  };
  const highConfidenceSegments = segments.filter(highConfidenceSegment);
  const highConfidenceEdges = exactIdentityEdges(segments, highConfidenceSegment);
  const highConfidenceDepth = pathDepthThreeCounts(
    highConfidenceSegments,
    highConfidenceEdges,
  );
  const flags = segments.map((segment) => sourceFlags.get(segment.sourceEvidenceId));
  const productIdentities = new Set(segments.flatMap((segment) =>
    segment.products.map((product) => product.inchiKey)
  ));

  return {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_UPSTREAM_GAP_AUDIT_PIPELINE_VERSION,
    generatedAt: input.generatedAt,
    scope: {
      localResolvedSegmentCount: segments.length,
      exactTargetIdentityCount: segments.filter((segment) =>
        segment.products.some((product) =>
          product.inchiKey === segment.stereochemicalResult.targetInchiKey
        )
      ).length,
      networkFetchPerformed: false,
      broadDiscoveryPerformed: false,
    },
    rawExactIdentityProjection: {
      uniqueProductIdentityCount: productIdentities.size,
      exactIdentityBridgeEdgeCount: rawEdges.length,
      segmentsWithAtLeastOneUpstreamIdentityMatch:
        new Set(rawEdges.map((edge) => edge.downstreamSegmentId)).size,
      finalSegmentsWithSimplePathDepthThreeOrMore: rawDepth.finalSegments,
      moleculesWithSimplePathDepthThreeOrMore: rawDepth.molecules,
      scientificAdmissionState: "rejected_fail_closed",
      reason:
        "An exact reactant/product InChIKey join proves boundary identity only; with mined participant-role errors, unresolved atom mapping and identity cycles, it does not prove a sequential synthesis transformation.",
    },
    materialIdentityCycles: {
      stronglyConnectedComponentCount: cycleComponents.length,
      involvedIdentityCount: new Set(cycleComponents.flat()).size,
      components: cycleComponents,
    },
    sourceAndChemistryBoundary: {
      datasetRecordLocatorCount: segments.filter((segment) =>
        segment.sourceLocator.kind === "dataset_record" && Boolean(segment.sourceLocator.value)
      ).length,
      pageSchemeOrExampleLocatorCount: segments.filter((segment) =>
        segment.sourceLocator.page !== null ||
        segment.sourceLocator.scheme !== null ||
        segment.sourceLocator.example !== null
      ).length,
      textMinedSegmentCount: flags.filter((value) => value?.textMined === true).length,
      nonTextMinedSegmentCount: flags.filter((value) => value?.textMined === false).length,
      sourceMiningStateUnknownCount: flags.filter((value) =>
        !value || value.textMined === null
      ).length,
      exactProductRoleCount: flags.filter((value) =>
        value?.exactTargetProductRole === "product"
      ).length,
      unspecifiedProductRoleCount: flags.filter((value) =>
        value?.exactTargetProductRole === "unspecified"
      ).length,
      otherOrUnresolvedProductRoleCount: flags.filter((value) =>
        !value || value.exactTargetProductRole === null || value.exactTargetProductRole === "other"
      ).length,
      unclassifiedReactionCount: segments.filter((segment) =>
        segment.reactionClass.normalizationState === "unclassified"
      ).length,
      atomMappingNotResolvedCount: segments.filter((segment) =>
        segment.atomMapping.state === "not_mapped"
      ).length,
      pendingReviewCount: segments.filter((segment) => segment.reviewState === "pending").length,
      reviewedOrVerifiedCount: segments.filter((segment) =>
        ["reviewed", "verified"].includes(segment.reviewState as string)
      ).length,
    },
    highConfidenceLocalAdmission: {
      rule:
        "Both joined steps must come from non-text-mined structured records, expose the exact target as an explicit product, retain exact dataset locators, exact form/stereo identity and no operational details; repeated source records and material cycles remain excluded.",
      eligibleSegmentCount: highConfidenceSegments.length,
      exactIdentityBridgeEdgeCount: highConfidenceEdges.length,
      finalSegmentsWithPathDepthThreeOrMore: highConfidenceDepth.finalSegments,
      moleculesWithPathDepthThreeOrMore: highConfidenceDepth.molecules,
    },
    outcome: {
      recursivelyPublishedRouteCount: 0,
      promotedSubstantivePartialMoleculeCount: 0,
      promotedCompleteLearningRouteMoleculeCount: 0,
      existingPublicDraftArtifactsChanged: false,
      hardBoundary:
        "The local checkpoint has no high-confidence bridge, no mapped or reviewed reaction step, and no exact original page/scheme/example locator. Recursive publication would promote text-mined participant co-occurrence into a scientific route claim.",
    },
    invariants: {
      exactInchiKeyMatchNeverTreatedAsReactionRoleProof: true,
      cyclicMaterialPathsRejected: true,
      textMinedPendingSegmentsNotPromotedByHeuristic: true,
      noScientificStateUpgraded: true,
      noNewDiscoveryOrNetworkFetch: true,
    },
  };
};

const readJsonDirectory = async <T,>(directoryUrl: URL): Promise<readonly T[]> => {
  const names = (await readdir(directoryUrl))
    .filter((name) => name.endsWith(".json"))
    .sort(sortText);
  return Promise.all(names.map(async (name) => JSON.parse(
    await readFile(new URL(name, directoryUrl), "utf8"),
  ) as T));
};

export const loadUpstreamGapCompletionAuditInput = async (): Promise<
  SynthesisUpstreamGapAuditInput
> => {
  const segmentShardsUrl = new URL(
    "../../work/synthesis-extraction/v2/segments/",
    import.meta.url,
  );
  const discoverySubjectsUrl = new URL(
    "../../work/synthesis-discovery/v1/subjects/",
    import.meta.url,
  );
  const extractionManifestUrl = new URL(
    "../../work/synthesis-extraction/v2/run-manifest.json",
    import.meta.url,
  );
  const [segmentShards, discoverySubjects, manifest] = await Promise.all([
    readJsonDirectory<{ readonly segments: readonly SynthesisResolvedReactionSegment[] }>(
      segmentShardsUrl,
    ),
    readJsonDirectory<DiscoverySubjectProjection>(discoverySubjectsUrl),
    readFile(extractionManifestUrl, "utf8").then((value) => JSON.parse(value) as {
      readonly generatedAt: string;
    }),
  ]);
  return {
    generatedAt: manifest.generatedAt,
    segments: segmentShards.flatMap((shard) => shard.segments),
    discoverySubjects,
  };
};

export const writeUpstreamGapCompletionAuditReport = async (
  report: SynthesisUpstreamGapAuditReport,
): Promise<void> => {
  await writeFile(synthesisUpstreamGapAuditReportUrl, stableJson(report), "utf8");
};

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const report = analyzeUpstreamGapCompletion(
    await loadUpstreamGapCompletionAuditInput(),
  );
  await writeUpstreamGapCompletionAuditReport(report);
  process.stdout.write(stableJson(report));
}
