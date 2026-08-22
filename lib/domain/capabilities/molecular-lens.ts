import type { ScientificPortResult } from "./common";

export type MolecularLensKind =
  | "functional-group"
  | "aromatic-ring"
  | "non-aromatic-ring"
  | "heterocycle"
  | "scaffold"
  | "stereocenter"
  | "formal-charge"
  | "hydrogen-bond-donor"
  | "hydrogen-bond-acceptor"
  | "ionizable-region"
  | "polar-region"
  | "non-polar-region"
  | "user-selected-substructure"
  | "pharmacophore-feature";

export interface CanonicalAtomMapping {
  readonly canonicalAtomId: string;
  readonly twoDimensionalAtomId: string;
  readonly threeDimensionalAtomId: string;
}

export interface LensFeature {
  readonly id: string;
  readonly kind: MolecularLensKind;
  readonly label: string;
  readonly canonicalAtomIds: readonly string[];
  readonly canonicalBondIds: readonly string[];
  readonly origin: "curated" | "computed" | "user-selected";
  readonly method: string | null;
  readonly tool: { readonly name: string; readonly version: string } | null;
  readonly sourceIds: readonly `source:${string}`[];
  readonly limitations: readonly string[];
}

export interface LensAnalysisRequest {
  readonly moleculeIdentity: string;
  readonly structureIdentity: string;
  readonly requestedKinds: readonly MolecularLensKind[];
}

export interface LensAnalysis {
  readonly moleculeIdentity: string;
  readonly structureIdentity: string;
  readonly atomMapping: readonly CanonicalAtomMapping[];
  readonly features: readonly LensFeature[];
}

export interface MolecularLensPort {
  readonly adapterId: string;
  analyze(
    request: LensAnalysisRequest,
    signal?: AbortSignal,
  ): Promise<ScientificPortResult<LensAnalysis>>;
}

export interface MappedLensSelection {
  readonly canonicalAtomIds: readonly string[];
  readonly twoDimensionalAtomIds: readonly string[];
  readonly threeDimensionalAtomIds: readonly string[];
}

export type LensSelectionMappingResult =
  | { readonly ok: true; readonly selection: MappedLensSelection }
  | { readonly ok: false; readonly missingCanonicalAtomIds: readonly string[] };

/** Maps one canonical selection to both representations and fails on drift. */
export const mapLensSelectionAcrossRepresentations = (
  canonicalAtomIds: readonly string[],
  mapping: readonly CanonicalAtomMapping[],
): LensSelectionMappingResult => {
  const byCanonicalId = new Map(mapping.map((item) => [item.canonicalAtomId, item]));
  const missingCanonicalAtomIds = canonicalAtomIds.filter(
    (atomId) => !byCanonicalId.has(atomId),
  );
  if (missingCanonicalAtomIds.length > 0) {
    return { ok: false, missingCanonicalAtomIds };
  }
  return {
    ok: true,
    selection: {
      canonicalAtomIds: [...canonicalAtomIds],
      twoDimensionalAtomIds: canonicalAtomIds.map(
        (atomId) => byCanonicalId.get(atomId)!.twoDimensionalAtomId,
      ),
      threeDimensionalAtomIds: canonicalAtomIds.map(
        (atomId) => byCanonicalId.get(atomId)!.threeDimensionalAtomId,
      ),
    },
  };
};

export const isLensFeatureEligible = (feature: LensFeature): boolean => {
  if (feature.canonicalAtomIds.length === 0) return false;
  if (feature.kind !== "pharmacophore-feature") return true;
  if (feature.origin === "curated") return feature.sourceIds.length > 0;
  if (feature.origin !== "computed") return false;
  return Boolean(
    feature.method?.trim() && feature.tool?.name.trim() && feature.tool.version.trim(),
  );
};
