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

export function canPresentMetaboliteEdge(
  edge: MetaboliteEdge,
  resolveSource: MetaboliteSourceResolver,
): boolean {
  const fields = [
    edge.transformationClass,
    edge.activity,
    ...(edge.enzyme ? [edge.enzyme] : []),
  ];
  if (!isReviewedStatus(edge.reviewStatus)) return false;
  if (!fields.every((field) => hasCompleteEvidenceField(field) && isReviewedStatus(field.reviewStatus))) {
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
      isReviewedStatus(source.verification.status) &&
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
    structure2dPath: null,
    structure3dPath: null,
  };
  const acceptedEdges = edges.filter((edge) => canPresentMetaboliteEdge(edge, resolveSource));
  const acceptedNodeIds = new Set(acceptedEdges.map((edge) => edge.metaboliteNodeId));
  const acceptedNodes = nodes.filter((node) =>
    acceptedNodeIds.has(node.id) &&
    hasCompleteEvidenceField(node.label) &&
    isReviewedStatus(node.label.reviewStatus) &&
    Boolean(resolveSource(node.label.sourceId)?.url));

  const acceptedEdgesWithNodes = acceptedEdges.filter((edge) =>
    acceptedNodes.some((node) => node.id === edge.metaboliteNodeId));

  return {
    moleculeId,
    nodes: [parentNode, ...acceptedNodes],
    edges: acceptedEdgesWithNodes,
    availability: acceptedEdgesWithNodes.length > 0 ? "reviewed" : "unavailable",
    unavailableReason: acceptedEdgesWithNodes.length > 0
      ? null
      : locale === "tr"
        ? "Bu molekül için incelenmiş metabolit bağlantısı henüz yok; ağ boşluğu metabolit bulunmadığı anlamına gelmez."
        : "No reviewed metabolite edge is available for this molecule yet; an empty graph does not mean that no metabolites exist.",
  };
}
