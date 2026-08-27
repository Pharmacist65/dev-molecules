import type {
  SynthesisAtlasMaterial,
  SynthesisAtlasMaterialId,
  SynthesisAtlasRoute,
  SynthesisAtlasStepId,
  SynthesisAtlasTransformation,
} from "../domain/synthesis-atlas";

/**
 * Public-source retirement boundary.
 *
 * Real pending/link-only routes are private review inputs and are deliberately
 * absent from the current tracked tree and current release artifacts. Earlier
 * public-alpha commits may retain retired fixtures. Public runtime surfaces
 * therefore fail closed until a reviewed and rights-cleared projection is
 * published.
 */
export const synthesisAtlasRoutes: readonly SynthesisAtlasRoute[] = [];

export const synthesisAtlasRouteById: ReadonlyMap<string, SynthesisAtlasRoute> =
  new Map();

export const synthesisAtlasRoutesByMoleculeId: ReadonlyMap<
  string,
  readonly SynthesisAtlasRoute[]
> = new Map();

export const getSynthesisAtlasMaterial = (
  route: SynthesisAtlasRoute,
  materialId: SynthesisAtlasMaterialId,
): SynthesisAtlasMaterial | null =>
  route.materials.find((candidate) => candidate.id === materialId) ?? null;

export const getSynthesisAtlasStep = (
  route: SynthesisAtlasRoute,
  stepId: SynthesisAtlasStepId,
): SynthesisAtlasTransformation | null =>
  route.transformations.find((candidate) => candidate.id === stepId) ?? null;
