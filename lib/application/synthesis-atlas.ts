import type {
  SynthesisAtlasDirection,
  SynthesisAtlasLevel,
  SynthesisAtlasMaterial,
  SynthesisAtlasMaterialId,
  SynthesisAtlasRoute,
  SynthesisAtlasRouteId,
  SynthesisAtlasRouteKind,
  SynthesisAtlasStepId,
  SynthesisAtlasTransformation,
} from "../domain/synthesis-atlas";
import {
  canOpenSynthesisAtlasMechanism,
  canPresentSynthesisAtlasRouteAsReported,
  getSynthesisAtlasStepSequence,
  getSynthesisAtlasSourceGate,
} from "../domain/synthesis-atlas";
import type { BasicRecordSynthesisCoverage } from "./basic-record-synthesis-coverage";

export interface SynthesisAtlasPoint {
  readonly x: number;
  readonly y: number;
}

export interface SynthesisAtlasNodeGeometry extends SynthesisAtlasPoint {
  readonly materialId: SynthesisAtlasMaterialId;
}

export interface SynthesisAtlasEdgeGeometry {
  readonly stepId: SynthesisAtlasStepId;
  readonly inputMaterialId: SynthesisAtlasMaterialId;
  readonly outputMaterialId: SynthesisAtlasMaterialId;
  readonly from: SynthesisAtlasPoint;
  readonly to: SynthesisAtlasPoint;
  readonly label: SynthesisAtlasPoint;
}

export interface SynthesisAtlasGraphGeometry {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly SynthesisAtlasNodeGeometry[];
  readonly edges: readonly SynthesisAtlasEdgeGeometry[];
}

export interface SynthesisAtlasLevelTransition {
  readonly level: SynthesisAtlasLevel;
  readonly allowed: boolean;
  readonly reason: "allowed" | "step-required" | "mechanism-unavailable";
}

export interface SynthesisAtlasTargetProduct {
  readonly step: SynthesisAtlasTransformation;
  readonly material: SynthesisAtlasMaterial;
}

export type SynthesisAtlasRoutePresentation =
  | "foundational-education"
  | "source-reported"
  | "source-context-reconstruction"
  | "declared-gap-reconstruction"
  | "unavailable";

export type SynthesisAtlasRouteDetailMode = "student" | "reviewer";

export const getCanonicalCoverageRouteIdForAtlasRoute = (
  route: SynthesisAtlasRoute,
): `synthesis-route:${string}` =>
  route.id.replace(
    /^synthesis-atlas-route:/u,
    "synthesis-route:legacy-",
  ) as `synthesis-route:${string}`;

/**
 * Public route detail is admitted only by the canonical review + reuse
 * projection. The reviewer surface may inspect the curated draft, but never
 * changes its pending evidence label or makes it public.
 */
export const canOpenSynthesisAtlasRouteDetail = (
  route: SynthesisAtlasRoute,
  coverage: BasicRecordSynthesisCoverage | null,
  mode: SynthesisAtlasRouteDetailMode,
): boolean => {
  if (getSynthesisAtlasRoutePresentation(route) === "unavailable") return false;
  if (mode === "reviewer") return true;
  if (!coverage) return false;

  const routeId = getCanonicalCoverageRouteIdForAtlasRoute(route);
  const reference = coverage.routes.find((candidate) => candidate.routeId === routeId);
  const comparison = coverage.routeComparison.routes.find(
    (candidate) => candidate.routeId === routeId,
  );
  if (!reference || !comparison) return false;
  return (
    (reference.reviewState === "reviewed" || reference.reviewState === "verified") &&
    (reference.licenseState === "permitted" ||
      reference.licenseState === "attribution_required") &&
    comparison.comparisonAvailability === "available" &&
    comparison.publicationState !== "withheld" &&
    comparison.publicationState !== "unavailable"
  );
};

/**
 * Converts scientific evidence state into a fail-closed presentation state.
 * A route tagged `reported` in the dataset is not described as source-reported
 * unless every transformation is directly supported by its declared sources.
 */
export const getSynthesisAtlasRoutePresentation = (
  route: SynthesisAtlasRoute,
): SynthesisAtlasRoutePresentation => {
  if (route.kind === "foundational-education") return "foundational-education";
  if (canPresentSynthesisAtlasRouteAsReported(route)) return "source-reported";

  const sourceGate = getSynthesisAtlasSourceGate(route);
  if (sourceGate === "context-supported") return "source-context-reconstruction";
  if (sourceGate === "partial-with-declared-gap") return "declared-gap-reconstruction";
  return "unavailable";
};

/**
 * Resolves a route target only when the final forward transformation ends in
 * a curator-declared terminal drug role. Intermediate or subsequently consumed
 * outputs fail closed instead of being promoted to a target product in the UI.
 */
export const getSynthesisAtlasTargetProduct = (
  route: SynthesisAtlasRoute,
): SynthesisAtlasTargetProduct | null => {
  const step = getSynthesisAtlasStepSequence(route, "forward").at(-1) ?? null;
  if (!step?.outputMaterialId) return null;

  const material = route.materials.find(
    (candidate) => candidate.id === step.outputMaterialId,
  );
  if (!material || !["active-parent", "chemical-form"].includes(material.role)) {
    return null;
  }

  const isConsumedElsewhere = route.transformations.some(
    (candidate) =>
      candidate.id !== step.id &&
      candidate.inputMaterialIds.includes(material.id),
  );
  return isConsumedElsewhere ? null : { step, material };
};

const X_SPACING = 360;
const Y_SPACING = 218;
const X_INSET = 126;
const Y_INSET = 108;
const NODE_HALF_WIDTH = 104;

export const getSynthesisAtlasGraphGeometry = (
  route: SynthesisAtlasRoute,
  direction: SynthesisAtlasDirection,
): SynthesisAtlasGraphGeometry => {
  const maxColumn = Math.max(0, ...route.materials.map((item) => item.layout.column));
  const maxRow = Math.max(0, ...route.materials.map((item) => item.layout.row));
  const width = Math.max(760, maxColumn * X_SPACING + X_INSET * 2);
  const height = Math.max(430, maxRow * Y_SPACING + Y_INSET * 2);

  const nodes = route.materials.map((item) => {
    const column = direction === "forward"
      ? item.layout.column
      : maxColumn - item.layout.column;
    return {
      materialId: item.id,
      x: X_INSET + column * X_SPACING,
      y: Y_INSET + item.layout.row * Y_SPACING,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.materialId, node] as const));

  const edges: SynthesisAtlasEdgeGeometry[] = [];
  for (const transformation of route.transformations) {
    if (!transformation.outputMaterialId) continue;
    const outputNode = nodeById.get(transformation.outputMaterialId);
    if (!outputNode) continue;

    for (const inputMaterialId of transformation.inputMaterialIds) {
      const inputNode = nodeById.get(inputMaterialId);
      if (!inputNode) continue;
      const source = direction === "forward" ? inputNode : outputNode;
      const target = direction === "forward" ? outputNode : inputNode;
      const from = {
        x: source.x + (target.x >= source.x ? NODE_HALF_WIDTH : -NODE_HALF_WIDTH),
        y: source.y,
      };
      const to = {
        x: target.x + (target.x >= source.x ? -NODE_HALF_WIDTH : NODE_HALF_WIDTH),
        y: target.y,
      };
      edges.push({
        stepId: transformation.id,
        inputMaterialId,
        outputMaterialId: transformation.outputMaterialId,
        from,
        to,
        label: {
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2,
        },
      });
    }
  }

  return { width, height, nodes, edges };
};

export const getSynthesisAtlasStepForMaterial = (
  route: SynthesisAtlasRoute,
  materialId: SynthesisAtlasMaterialId,
  direction: SynthesisAtlasDirection,
): SynthesisAtlasStepId | null => {
  const producing = route.transformations.find(
    (candidate) => candidate.outputMaterialId === materialId,
  );
  const consuming = [...route.transformations]
    .sort((left, right) => left.order - right.order)
    .find((candidate) => candidate.inputMaterialIds.includes(materialId));

  return direction === "forward"
    ? producing?.id ?? consuming?.id ?? null
    : consuming?.id ?? producing?.id ?? null;
};

export const resolveSynthesisAtlasRoute = (
  routes: readonly SynthesisAtlasRoute[],
  moleculeId: string,
  preferredKind: SynthesisAtlasRouteKind = "reported",
): SynthesisAtlasRoute | null =>
  routes.find(
    (candidate) =>
      candidate.moleculeId === moleculeId && candidate.kind === preferredKind,
  ) ??
  routes.find((candidate) => candidate.moleculeId === moleculeId) ??
  routes[0] ??
  null;

export const getSiblingSynthesisAtlasRoute = (
  routes: readonly SynthesisAtlasRoute[],
  currentRouteId: SynthesisAtlasRouteId,
  nextKind: SynthesisAtlasRouteKind,
): SynthesisAtlasRoute | null => {
  const current = routes.find((candidate) => candidate.id === currentRouteId);
  if (!current) return null;
  return routes.find(
    (candidate) =>
      candidate.moleculeId === current.moleculeId && candidate.kind === nextKind,
  ) ?? null;
};

/**
 * The route → step → mechanism hierarchy is enforced here rather than in the
 * component. Mechanism entry fails closed when no curated layer exists.
 */
export const requestSynthesisAtlasLevel = (
  route: SynthesisAtlasRoute,
  requestedLevel: SynthesisAtlasLevel,
  activeStepId: SynthesisAtlasStepId | null,
): SynthesisAtlasLevelTransition => {
  if (requestedLevel === "route") {
    return { level: "route", allowed: true, reason: "allowed" };
  }
  if (!activeStepId) {
    return { level: "route", allowed: false, reason: "step-required" };
  }
  if (requestedLevel === "mechanism" && !canOpenSynthesisAtlasMechanism(route, activeStepId)) {
    return { level: "step", allowed: false, reason: "mechanism-unavailable" };
  }
  return { level: requestedLevel, allowed: true, reason: "allowed" };
};
