import { resolveCatalogAssetPath } from "@/lib/catalog";
import {
  buildSynthesisMaterialStructureRegistryFromManifest,
  parseSynthesisIntermediate3DManifest,
} from "@/lib/application/synthesis-learning-evidence";
import {
  loadPublicAlphaSynthesisDrafts,
  type PublicAlphaSynthesisDraftClientOptions,
  type PublicAlphaSynthesisDraftIdentity,
} from "@/lib/application/public-alpha-synthesis-draft";
import type { SynthesisCatalogSelection } from "@/lib/application/synthesis-catalog";
import type { PublicAlphaSynthesisDraftGraph } from
  "@/lib/domain/public-alpha-synthesis-draft";
import type {
  SynthesisLearningStructureBundle,
} from "@/lib/domain/synthesis-learning-evidence";

export type SynthesisLearningStructureAssetAvailabilityState =
  | "not_applicable"
  | "loading"
  | "available"
  | "partially_available"
  | "scientifically_absent"
  | "transport_unavailable"
  | "provenance_unavailable";

export type SynthesisLearningStructureAssetAvailabilityReason =
  | "route_detail_not_requested"
  | "route_detail_unavailable"
  | "no_route_boundary_material"
  | "all_exact_catalog_assets_resolved"
  | "some_exact_catalog_assets_not_recorded"
  | "no_exact_catalog_asset_record"
  | "manifest_http_or_transport_failure"
  | "manifest_json_or_schema_invalid"
  | "catalog_snapshot_mismatch"
  | "registry_provenance_invalid";

export interface SynthesisLearningStructureAssetAvailability {
  readonly state: SynthesisLearningStructureAssetAvailabilityState;
  readonly reason: SynthesisLearningStructureAssetAvailabilityReason;
  readonly exactRouteBoundaryMaterialCount: number;
  readonly availableExactComputed3DCount: number;
  readonly unavailableExactComputed3DCount: number;
  readonly globalConformerAbsenceClaimed: false;
}

export const SYNTHESIS_LEARNING_STRUCTURE_ASSETS_LOADING:
SynthesisLearningStructureAssetAvailability = {
  state: "loading",
  reason: "route_detail_not_requested",
  exactRouteBoundaryMaterialCount: 0,
  availableExactComputed3DCount: 0,
  unavailableExactComputed3DCount: 0,
  globalConformerAbsenceClaimed: false,
};

export const SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE:
SynthesisLearningStructureAssetAvailability = {
  state: "not_applicable",
  reason: "route_detail_not_requested",
  exactRouteBoundaryMaterialCount: 0,
  availableExactComputed3DCount: 0,
  unavailableExactComputed3DCount: 0,
  globalConformerAbsenceClaimed: false,
};

export type SynthesisLearningStudioRouteDetail =
  | {
      readonly kind: "coverage_only";
      readonly graphs: readonly [];
      readonly structureAssetsByInchiKey: ReadonlyMap<
        string,
        SynthesisLearningStructureBundle
      >;
      readonly routeDetailLoadState: "ready";
      readonly structureAssetAvailability:
        SynthesisLearningStructureAssetAvailability;
    }
  | {
      readonly kind: "available";
      readonly graphs: readonly PublicAlphaSynthesisDraftGraph[];
      readonly structureAssetsByInchiKey: ReadonlyMap<
        string,
        SynthesisLearningStructureBundle
      >;
      readonly routeDetailLoadState: "ready";
      readonly structureAssetAvailability:
        SynthesisLearningStructureAssetAvailability;
    }
  | {
      readonly kind: "unavailable";
      readonly graphs: readonly [];
      readonly structureAssetsByInchiKey: ReadonlyMap<
        string,
        SynthesisLearningStructureBundle
      >;
      readonly routeDetailLoadState: "unavailable";
      readonly structureAssetAvailability:
        SynthesisLearningStructureAssetAvailability;
    };

export interface ExactRouteBoundaryMaterialInput {
  readonly id: string;
  readonly inchiKey: string;
  readonly sourceSmiles: string;
  readonly exactIdentityResolved: boolean;
}

const emptyRegistry = (): ReadonlyMap<
  string,
  SynthesisLearningStructureBundle
> => new Map();

const availability = (
  state: SynthesisLearningStructureAssetAvailabilityState,
  reason: SynthesisLearningStructureAssetAvailabilityReason,
  materialCount: number,
  availableCount: number,
): SynthesisLearningStructureAssetAvailability => ({
  state,
  reason,
  exactRouteBoundaryMaterialCount: materialCount,
  availableExactComputed3DCount: availableCount,
  unavailableExactComputed3DCount: Math.max(0, materialCount - availableCount),
  globalConformerAbsenceClaimed: false,
});

/**
 * Selects exact-identity intermediate and target route boundaries from the
 * validated public-alpha graph. Source inputs remain independent 2D redraws;
 * React never makes this scientific asset-selection decision.
 */
export const selectExactRouteBoundaryMaterials = (
  graphs: readonly PublicAlphaSynthesisDraftGraph[],
): readonly ExactRouteBoundaryMaterialInput[] => [
  ...new Map(
    graphs.flatMap((graph) => graph.materials)
      .filter((material) =>
        material.displayRole === "route_intermediate" ||
        material.displayRole === "exact_target"
      )
      .map((material) => [
        material.inchiKey,
        {
          id: material.id,
          inchiKey: material.inchiKey,
          sourceSmiles: material.sourceSmiles,
          exactIdentityResolved:
            material.identityResolution === "exact_inchi_key_computed",
        },
      ] as const),
  ).values(),
];

export interface LoadSynthesisLearningStructureAssetsOptions {
  readonly assetBasePath?: string;
  readonly fetchImpl?: typeof fetch;
}

export interface LoadedSynthesisLearningStructureAssets {
  readonly structureAssetsByInchiKey: ReadonlyMap<
    string,
    SynthesisLearningStructureBundle
  >;
  readonly availability: SynthesisLearningStructureAssetAvailability;
}

/**
 * Loads the portable manifest with separate transport and provenance failure
 * states. A missing/corrupt manifest never becomes a scientific statement
 * that a conformer does not exist.
 */
export const loadSynthesisLearningStructureAssets = async (
  graphs: readonly PublicAlphaSynthesisDraftGraph[],
  selection: Pick<SynthesisCatalogSelection, "catalogSnapshotId">,
  options: LoadSynthesisLearningStructureAssetsOptions = {},
): Promise<LoadedSynthesisLearningStructureAssets> => {
  const materials = selectExactRouteBoundaryMaterials(graphs);
  if (materials.length === 0) {
    return {
      structureAssetsByInchiKey: emptyRegistry(),
      availability: availability(
        "not_applicable",
        "no_route_boundary_material",
        0,
        0,
      ),
    };
  }

  const path = resolveCatalogAssetPath(
    "/catalog/synthesis/reports/intermediate-3d-assets.json",
    options.assetBasePath,
  );
  const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  let response: Response;
  try {
    response = await fetchImpl(path, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return {
      structureAssetsByInchiKey: emptyRegistry(),
      availability: availability(
        "transport_unavailable",
        "manifest_http_or_transport_failure",
        materials.length,
        0,
      ),
    };
  }
  if (!response.ok) {
    return {
      structureAssetsByInchiKey: emptyRegistry(),
      availability: availability(
        "transport_unavailable",
        "manifest_http_or_transport_failure",
        materials.length,
        0,
      ),
    };
  }

  let rawManifest: unknown;
  try {
    rawManifest = await response.json();
  } catch {
    return {
      structureAssetsByInchiKey: emptyRegistry(),
      availability: availability(
        "provenance_unavailable",
        "manifest_json_or_schema_invalid",
        materials.length,
        0,
      ),
    };
  }

  let manifest;
  try {
    manifest = parseSynthesisIntermediate3DManifest(rawManifest);
  } catch {
    return {
      structureAssetsByInchiKey: emptyRegistry(),
      availability: availability(
        "provenance_unavailable",
        "manifest_json_or_schema_invalid",
        materials.length,
        0,
      ),
    };
  }
  if (manifest.catalogSnapshotId !== selection.catalogSnapshotId) {
    return {
      structureAssetsByInchiKey: emptyRegistry(),
      availability: availability(
        "provenance_unavailable",
        "catalog_snapshot_mismatch",
        materials.length,
        0,
      ),
    };
  }

  const registry = buildSynthesisMaterialStructureRegistryFromManifest(
    materials,
    manifest,
    options.assetBasePath,
  );
  if (registry.resolutions.some((resolution) =>
    resolution.state !== "resolved" &&
    resolution.state !== "no_exact_catalog_identity"
  )) {
    return {
      structureAssetsByInchiKey: emptyRegistry(),
      availability: availability(
        "provenance_unavailable",
        "registry_provenance_invalid",
        materials.length,
        0,
      ),
    };
  }

  const availableCount = registry.exactComputed3DIdentityCount;
  const state: SynthesisLearningStructureAssetAvailabilityState =
    availableCount === materials.length
      ? "available"
      : availableCount > 0
        ? "partially_available"
        : "scientifically_absent";
  const reason: SynthesisLearningStructureAssetAvailabilityReason =
    state === "available"
      ? "all_exact_catalog_assets_resolved"
      : state === "partially_available"
        ? "some_exact_catalog_assets_not_recorded"
        : "no_exact_catalog_asset_record";
  return {
    structureAssetsByInchiKey: registry.byInchiKey,
    availability: availability(
      state,
      reason,
      materials.length,
      availableCount,
    ),
  };
};

type PublicDraftLoader = typeof loadPublicAlphaSynthesisDrafts;

export interface LoadSynthesisLearningStudioRouteDetailOptions
  extends PublicAlphaSynthesisDraftClientOptions {
  readonly draftLoader?: PublicDraftLoader;
}

const routeIdentity = (
  selection: SynthesisCatalogSelection,
): PublicAlphaSynthesisDraftIdentity | null => {
  const coverage = selection.coverage;
  if (!coverage) return null;
  return {
    catalogSnapshotId: coverage.catalogSnapshotId,
    catalogEntityId: selection.catalogEntityId,
    coverageId: coverage.coverageId,
    preferredName: selection.preferredName,
    pubChemCid: selection.pubChemCid,
    inchiKey: selection.inchiKey,
    chemicalForm: coverage.chemicalFormKind,
    stereochemistrySpecified: coverage.stereochemistrySpecified,
  };
};

/** Shared controller used by both compact and Full Atlas Studio surfaces. */
export const loadSynthesisLearningStudioRouteDetail = async (
  selection: SynthesisCatalogSelection,
  options: LoadSynthesisLearningStudioRouteDetailOptions = {},
): Promise<SynthesisLearningStudioRouteDetail> => {
  const coverage = selection.coverage;
  const identity = routeIdentity(selection);
  if (!coverage || !identity || coverage.publicAlphaDrafts.length === 0) {
    return {
      kind: "coverage_only",
      graphs: [],
      structureAssetsByInchiKey: emptyRegistry(),
      routeDetailLoadState: "ready",
      structureAssetAvailability:
        SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE,
    };
  }

  const draftLoader = options.draftLoader ?? loadPublicAlphaSynthesisDrafts;
  let graphs: readonly PublicAlphaSynthesisDraftGraph[];
  try {
    graphs = await draftLoader(identity, coverage.publicAlphaDrafts, {
      assetBasePath: options.assetBasePath,
      fetchImpl: options.fetchImpl,
    });
  } catch {
    return {
      kind: "unavailable",
      graphs: [],
      structureAssetsByInchiKey: emptyRegistry(),
      routeDetailLoadState: "unavailable",
      structureAssetAvailability: availability(
        "not_applicable",
        "route_detail_unavailable",
        0,
        0,
      ),
    };
  }
  if (graphs.length === 0) {
    return {
      kind: "coverage_only",
      graphs: [],
      structureAssetsByInchiKey: emptyRegistry(),
      routeDetailLoadState: "ready",
      structureAssetAvailability:
        SYNTHESIS_LEARNING_STRUCTURE_ASSETS_NOT_APPLICABLE,
    };
  }

  const structures = await loadSynthesisLearningStructureAssets(
    graphs,
    selection,
    options,
  );
  return {
    kind: "available",
    graphs,
    structureAssetsByInchiKey: structures.structureAssetsByInchiKey,
    routeDetailLoadState: "ready",
    structureAssetAvailability: structures.availability,
  };
};
