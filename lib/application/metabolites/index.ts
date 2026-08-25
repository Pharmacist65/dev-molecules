import type { SourceReference } from "@/lib/domain/evidence";
import type { MoleculeId, SourceId } from "@/lib/domain/ids";
import {
  hasCompleteEvidenceField,
  isReviewedStatus,
  type EvidenceField,
} from "@/lib/domain/dossier";
import type {
  MetaboliteEdge,
  MetaboliteGraph,
  MetaboliteNode,
} from "@/lib/domain/metabolites";

export type MetaboliteSourceResolver = (
  sourceId: SourceId,
) => SourceReference | undefined;

const metaboliteEvidenceScope = /metabolite|metaboli|biotransformation|enzyme/i;

const isSourcePresentableStatus = (
  status: EvidenceField<unknown>["reviewStatus"],
): boolean => isReviewedStatus(status) || status === "source-supported";

const resolvedNodeProvenance = (
  sourceId: SourceId,
  resolveSource: MetaboliteSourceResolver,
): MetaboliteNode["provenance"] => {
  const source = resolveSource(sourceId);
  if (!source?.url || !isSourcePresentableStatus(source.verification.status)) {
    return null;
  }
  return {
    sourceId,
    provider: source.provider,
    title: source.title,
    externalId: source.externalId,
    url: source.url,
  };
};

const presentableStructure = (
  node: MetaboliteNode,
  resolveSource: MetaboliteSourceResolver,
): MetaboliteNode["structure2dSmiles"] => {
  const structure = node.structure2dSmiles;
  if (
    !structure ||
    !hasCompleteEvidenceField(structure) ||
    !isSourcePresentableStatus(structure.reviewStatus)
  ) {
    return null;
  }
  const source = resolveSource(structure.sourceId);
  return source?.url && isSourcePresentableStatus(source.verification.status)
    ? structure
    : null;
};

export function canPresentMetaboliteEdge(
  edge: MetaboliteEdge,
  resolveSource: MetaboliteSourceResolver,
): boolean {
  const fields = [
    edge.transformationClass,
    edge.activity,
    ...(edge.enzyme ? [edge.enzyme] : []),
  ];
  if (!isSourcePresentableStatus(edge.reviewStatus)) return false;
  if (!fields.every((field) => hasCompleteEvidenceField(field) && isSourcePresentableStatus(field.reviewStatus))) {
    return false;
  }
  if (
    edge.activity.value === "reactive-toxic" &&
    edge.activity.evidenceType !== "direct-experimental"
  ) {
    return false;
  }
  const fieldSourceIds = new Set(fields.map((field) => field.sourceId));
  const declaredSourceIds = new Set(edge.sourceIds);
  if (
    declaredSourceIds.size === 0 ||
    edge.sourceIds.some((sourceId) => !fieldSourceIds.has(sourceId)) ||
    [...fieldSourceIds].some((sourceId) => !declaredSourceIds.has(sourceId))
  ) {
    return false;
  }
  return edge.sourceIds.length > 0 && edge.sourceIds.every((sourceId) => {
    const source = resolveSource(sourceId);
    return Boolean(
      source?.url &&
      isSourcePresentableStatus(source.verification.status) &&
      metaboliteEvidenceScope.test(source.scope),
    );
  });
}

export function createMetaboliteGraph(
  moleculeId: MoleculeId,
  parentLabel: EvidenceField<string>,
  nodes: readonly MetaboliteNode[],
  edges: readonly MetaboliteEdge[],
  resolveSource: MetaboliteSourceResolver,
  locale: "tr" | "en",
): MetaboliteGraph {
  const parentNode: MetaboliteNode = {
    id: `metabolite-node:${moleculeId}:parent`,
    moleculeId,
    label: parentLabel,
    role: "parent",
    structure2dSmiles: null,
    provenance: resolvedNodeProvenance(parentLabel.sourceId, resolveSource),
    structure2dPath: null,
    structure3dPath: null,
  };
  const acceptedEdges = edges.filter((edge) => canPresentMetaboliteEdge(edge, resolveSource));
  const acceptedNodeIds = new Set(acceptedEdges.map((edge) => edge.metaboliteNodeId));
  const acceptedNodes = nodes
    .filter((node) =>
      acceptedNodeIds.has(node.id) &&
      hasCompleteEvidenceField(node.label) &&
      isSourcePresentableStatus(node.label.reviewStatus) &&
      Boolean(resolveSource(node.label.sourceId)?.url))
    .map((node) => {
      const structure2dSmiles = presentableStructure(node, resolveSource);
      return {
        ...node,
        structure2dSmiles,
        provenance: resolvedNodeProvenance(
          structure2dSmiles?.sourceId ?? node.label.sourceId,
          resolveSource,
        ),
      };
    });

  const acceptedEdgesWithNodes = acceptedEdges.filter((edge) =>
    acceptedNodes.some((node) => node.id === edge.metaboliteNodeId));
  const allAcceptedEvidenceReviewed =
    acceptedEdgesWithNodes.length > 0 &&
    acceptedEdgesWithNodes.every((edge) =>
      isReviewedStatus(edge.reviewStatus) &&
      isReviewedStatus(edge.transformationClass.reviewStatus) &&
      isReviewedStatus(edge.activity.reviewStatus) &&
      (!edge.enzyme || isReviewedStatus(edge.enzyme.reviewStatus))) &&
    acceptedNodes.every((node) => isReviewedStatus(node.label.reviewStatus));

  return {
    moleculeId,
    nodes: [parentNode, ...acceptedNodes],
    edges: acceptedEdgesWithNodes,
    availability: acceptedEdgesWithNodes.length > 0
      ? allAcceptedEvidenceReviewed
        ? "reviewed"
        : "source-supported"
      : "unavailable",
    unavailableReason: acceptedEdgesWithNodes.length > 0
      ? null
      : locale === "tr"
        ? "Bu molekül için incelenmiş metabolit bağlantısı henüz yok; ağ boşluğu metabolit bulunmadığı anlamına gelmez."
        : "No reviewed metabolite edge is available for this molecule yet; an empty graph does not mean that no metabolites exist.",
  };
}
