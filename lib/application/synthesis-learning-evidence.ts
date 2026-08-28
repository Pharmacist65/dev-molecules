import {
  resolveCatalogAssetPath,
  type CatalogNormalizedEntity,
} from "@/lib/catalog";
import type {
  CatalogComputedSynthesis3DAsset,
  CatalogSynthesis2DAsset,
  ComputedSynthesis3DAsset,
  ExactSynthesisLearningIdentity,
  ExactSynthesisLearningStepIdentity,
  ReactionClassEducationEntry,
  ReactionClassEducationLibrary,
  RdkitComputedSynthesis3DParameters,
  RdkitEnergyMinimizationState,
  RdkitGeneratedSynthesis3DAsset,
  StructuredSynthesisFact,
  StructuredSynthesisQuizGate,
  StructuredSynthesisTaskKind,
  SynthesisLearningEvidenceRegistry,
  SynthesisLearningEvidenceRegistryEntry,
  SynthesisLearningEvidenceReviewDecision,
  SynthesisLearningEvidenceReviewRegistry,
  SynthesisLearningCapabilityCounts,
  SynthesisIntermediate3DManifest,
  SynthesisIntermediate3DManifestEntry,
  SynthesisLearningStructureBundle,
  SynthesisMechanismAssuranceRecord,
  SynthesisStep3DGate,
  UnavailableSynthesis3DAsset,
  UnresolvedSynthesisMechanism,
} from "@/lib/domain/synthesis-learning-evidence";
import type { PublicAlphaSynthesisDraftGraph } from "@/lib/domain/public-alpha-synthesis-draft";

const INCHI_KEY = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u;
const SHA_256 = /^[a-f\d]{64}$/u;
const RDKIT_GENERATOR_VERSION = "2026.03.5" as const;
const RDKIT_SOURCE_URL =
  "https://www.rdkit.org/docs/GettingStartedInPython.html" as const;
const RDKIT_ENERGY_MINIMIZATION_STATES = new Set<RdkitEnergyMinimizationState>([
  "mmff94s_converged",
  "mmff94s_iteration_limit",
  "uff_converged",
  "uff_iteration_limit",
  "embedded_not_minimized_no_supported_force_field",
]);

export const CURRENT_SYNTHESIS_REACTION_CLASS_LIBRARY: ReactionClassEducationLibrary = {
  schemaVersion: 1,
  version: "molevren-reaction-class-education-1.0.0",
  observedClassSetState: "unresolved",
  observedReactionClassIds: [],
  entries: [],
};

const validReactionClassEntry = (
  entry: ReactionClassEducationEntry,
  libraryVersion: string,
): boolean =>
  entry.version === libraryVersion &&
  entry.reactionClassId.startsWith("reaction-class:") &&
  entry.canonicalName.trim().length > 0 &&
  entry.names.tr.trim().length > 0 &&
  entry.names.en.trim().length > 0 &&
  entry.generalTransformation.trim().length > 0 &&
  entry.mechanismStages.length > 0 &&
  entry.mechanismStages.every((stage) => stage.trim().length > 0) &&
  entry.limitations.length > 0 &&
  entry.limitations.every((limitation) => limitation.trim().length > 0) &&
  entry.educationSources.length > 0 &&
  entry.educationSources.every(
    (source) =>
      source.id.trim().length > 0 &&
      source.title.trim().length > 0 &&
      source.locator.trim().length > 0 &&
      validHttpsUrl(source.url),
  ) &&
  entry.genericMechanismDisclaimer ===
    "General reaction-class mechanism; it was not reported as the mechanism by this specific step source.";

/**
 * A versioned library may contain only classes actually observed and safely
 * normalized in the current evidence snapshot. An unresolved/empty observed
 * class set produces an empty library rather than seeding example chemistry.
 */
export const createReactionClassEducationLibrary = (
  version: string,
  observedReactionClassIds: readonly ReactionClassEducationEntry["reactionClassId"][],
  candidateEntries: readonly ReactionClassEducationEntry[],
): ReactionClassEducationLibrary => {
  const observed = [...new Set(observedReactionClassIds)];
  if (!version.trim() || observed.length === 0) {
    return {
      schemaVersion: 1,
      version: version.trim() || "unresolved",
      observedClassSetState: "unresolved",
      observedReactionClassIds: [],
      entries: [],
    };
  }
  const candidateById = new Map(
    candidateEntries.map((entry) => [entry.reactionClassId, entry] as const),
  );
  if (candidateById.size !== candidateEntries.length) {
    return {
      schemaVersion: 1,
      version,
      observedClassSetState: "unresolved",
      observedReactionClassIds: [],
      entries: [],
    };
  }
  const entries = observed.flatMap((id) => {
    const entry = candidateById.get(id);
    return entry && validReactionClassEntry(entry, version) ? [entry] : [];
  });
  if (entries.length !== observed.length) {
    return {
      schemaVersion: 1,
      version,
      observedClassSetState: "unresolved",
      observedReactionClassIds: [],
      entries: [],
    };
  }
  return {
    schemaVersion: 1,
    version,
    observedClassSetState: "resolved",
    observedReactionClassIds: observed,
    entries,
  };
};

export const getReactionClassEducationEntry = (
  library: ReactionClassEducationLibrary,
  reactionClassId: string,
): ReactionClassEducationEntry | null => {
  if (
    library.observedClassSetState !== "resolved" ||
    !library.observedReactionClassIds.includes(
      reactionClassId as ReactionClassEducationEntry["reactionClassId"],
    )
  ) {
    return null;
  }
  const matches = library.entries.filter(
    (entry) => entry.reactionClassId === reactionClassId,
  );
  return matches.length === 1 && validReactionClassEntry(matches[0], library.version)
    ? matches[0]
    : null;
};

export interface SynthesisLearningMaterialIdentityInput {
  readonly id: string;
  readonly inchiKey: string;
  readonly sourceSmiles: string;
  readonly exactIdentityResolved: boolean;
}

export interface ExactCatalogSynthesisAssetRecord {
  readonly catalogEntityId: string;
  readonly catalogSnapshotId: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly structures: {
    readonly twoD: CatalogNormalizedEntity["structures"]["twoD"];
    readonly threeD: CatalogNormalizedEntity["structures"]["threeD"];
  };
}

export interface SynthesisMaterialStructureResolution {
  readonly materialId: string;
  readonly inchiKey: string;
  readonly state:
    | "resolved"
    | "identity_unresolved"
    | "no_exact_catalog_identity"
    | "ambiguous_catalog_identity"
    | "catalog_asset_provenance_invalid";
}

export interface SynthesisMaterialStructureRegistry {
  readonly byInchiKey: ReadonlyMap<string, SynthesisLearningStructureBundle>;
  readonly resolutions: readonly SynthesisMaterialStructureResolution[];
  readonly exactComputed3DIdentityCount: number;
}

const unavailable3D = (
  reason: UnavailableSynthesis3DAsset["reason"],
): UnavailableSynthesis3DAsset => ({
  status: "unavailable",
  representation: "none",
  reason,
  syntheticFallbackCreated: false,
});

const validHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const validCatalogAsset = (
  asset: CatalogNormalizedEntity["structures"]["twoD"],
): boolean =>
  Boolean(asset) &&
  typeof asset.path === "string" &&
  asset.path.startsWith("/") &&
  asset.path.endsWith(".sdf") &&
  typeof asset.sha256 === "string" &&
  SHA_256.test(asset.sha256) &&
  typeof asset.byteLength === "number" &&
  asset.byteLength > 0 &&
  typeof asset.sourceUrl === "string" &&
  validHttpsUrl(asset.sourceUrl);

export const createIndependentSynthesis2DStructureBundle = (
  material: SynthesisLearningMaterialIdentityInput,
  reason: UnavailableSynthesis3DAsset["reason"] = "no_exact_catalog_identity",
): SynthesisLearningStructureBundle => {
  if (
    !material.exactIdentityResolved ||
    !INCHI_KEY.test(material.inchiKey) ||
    !material.sourceSmiles.trim()
  ) {
    throw new Error(
      `Independent synthesis redraw requires an exact resolved identity: ${material.id}.`,
    );
  }
  return {
    materialId: material.id,
    inchiKey: material.inchiKey,
    twoD: {
      status: "available",
      representation: "independent_smiles_redraw",
      sourceSmiles: material.sourceSmiles,
      inchiKey: material.inchiKey,
      identityResolution: "exact_inchi_key_computed",
      sourceFigureOrSchemeReused: false,
    },
    threeD: unavailable3D(reason),
  };
};

/**
 * Admits the exact catalog 2D record while deliberately refusing the catalog
 * 3D file. This is the fail-closed target fallback used when no generated 3D
 * asset has passed the serialized-identity and provenance gates.
 */
export const createExactCatalogSynthesis2DOnlyBundleFromRecord = (
  material: SynthesisLearningMaterialIdentityInput,
  record: ExactCatalogSynthesisAssetRecord,
  assetBasePath = "/",
): SynthesisLearningStructureBundle | null => {
  if (
    !material.exactIdentityResolved ||
    !INCHI_KEY.test(material.inchiKey) ||
    record.inchiKey !== material.inchiKey ||
    !Number.isSafeInteger(record.pubChemCid) ||
    record.pubChemCid < 1 ||
    typeof record.catalogEntityId !== "string" ||
    !record.catalogEntityId.trim() ||
    typeof record.catalogSnapshotId !== "string" ||
    !record.catalogSnapshotId.trim() ||
    !validCatalogAsset(record.structures.twoD)
  ) {
    return null;
  }

  const identity: ExactSynthesisLearningIdentity = {
    catalogEntityId: record.catalogEntityId,
    catalogSnapshotId: record.catalogSnapshotId,
    pubChemCid: record.pubChemCid,
    inchiKey: record.inchiKey,
    identityMatch: "exact_inchi_key",
  };
  return {
    materialId: material.id,
    inchiKey: material.inchiKey,
    twoD: {
      status: "available",
      representation: "catalog_2d_record",
      assetId: `catalog-structure:2d:${record.structures.twoD.sha256}`,
      publicPath: resolveCatalogAssetPath(
        record.structures.twoD.path,
        assetBasePath,
      ),
      sourceUrl: record.structures.twoD.sourceUrl,
      sha256: record.structures.twoD.sha256,
      origin: "database-2d-record",
      provenance: "source_record",
      identity,
    },
    threeD: unavailable3D("computed_conformer_unavailable"),
  };
};

/**
 * Admits a catalog 2D/3D pair only through exact InChIKey identity and the
 * catalog's explicit computed-conformer boundary. Missing generator details
 * remain null; they are never invented from the coordinates.
 */
export const createExactCatalogSynthesisStructureBundleFromRecord = (
  material: SynthesisLearningMaterialIdentityInput,
  record: ExactCatalogSynthesisAssetRecord,
  assetBasePath = "/",
): SynthesisLearningStructureBundle | null => {
  if (
    !material.exactIdentityResolved ||
    !INCHI_KEY.test(material.inchiKey) ||
    record.inchiKey !== material.inchiKey ||
    !Number.isSafeInteger(record.pubChemCid) ||
    record.pubChemCid < 1 ||
    !record.catalogEntityId.trim() ||
    !record.catalogSnapshotId.trim() ||
    !validCatalogAsset(record.structures.twoD) ||
    !validCatalogAsset(record.structures.threeD)
  ) {
    return null;
  }

  const identity: ExactSynthesisLearningIdentity = {
    catalogEntityId: record.catalogEntityId,
    catalogSnapshotId: record.catalogSnapshotId,
    pubChemCid: record.pubChemCid,
    inchiKey: record.inchiKey,
    identityMatch: "exact_inchi_key",
  };
  const twoD: CatalogSynthesis2DAsset = {
    status: "available",
    representation: "catalog_2d_record",
    assetId: `catalog-structure:2d:${record.structures.twoD.sha256}`,
    publicPath: resolveCatalogAssetPath(record.structures.twoD.path, assetBasePath),
    sourceUrl: record.structures.twoD.sourceUrl,
    sha256: record.structures.twoD.sha256,
    origin: "database-2d-record",
    provenance: "source_record",
    identity,
  };
  const threeD: CatalogComputedSynthesis3DAsset = {
    status: "available",
    representation: "catalog_computed_conformer",
    assetId: `catalog-structure:3d:${record.structures.threeD.sha256}`,
    publicPath: resolveCatalogAssetPath(record.structures.threeD.path, assetBasePath),
    sourceUrl: record.structures.threeD.sourceUrl,
    sha256: record.structures.threeD.sha256,
    origin: "computed-3d-conformer",
    identity,
    provenance: {
      kind: "computed",
      generator: "PubChem computed conformer service",
      generatorVersion: null,
      parameters: null,
      generatedAt: null,
      structureHash: record.structures.threeD.sha256,
      source2DId: twoD.assetId,
      source2DRelationship:
        "exact_identity_anchor_not_disclosed_generator_input",
      energyMinimizationState: "not_disclosed_by_source",
      experimentalStructure: false,
      crystalStructure: false,
      bioactiveConformation: false,
    },
  };

  return {
    materialId: material.id,
    inchiKey: material.inchiKey,
    twoD,
    threeD,
  };
};

export const createExactCatalogSynthesisStructureBundle = (
  material: SynthesisLearningMaterialIdentityInput,
  entity: CatalogNormalizedEntity,
  assetBasePath = "/",
): SynthesisLearningStructureBundle | null =>
  createExactCatalogSynthesisStructureBundleFromRecord(
    material,
    {
      catalogEntityId: entity.id,
      catalogSnapshotId: entity.provenance.snapshotId,
      pubChemCid: entity.identity.pubChemCid,
      inchiKey: entity.identity.inchiKey,
      structures: entity.structures,
    },
    assetBasePath,
  );

/**
 * Build-time/catalog-hydration registry. Duplicate catalog identities fail
 * closed instead of selecting the first conformer by name or array order.
 */
export const buildSynthesisMaterialStructureRegistry = (
  materials: readonly SynthesisLearningMaterialIdentityInput[],
  entities: readonly CatalogNormalizedEntity[],
  assetBasePath = "/",
): SynthesisMaterialStructureRegistry => {
  const entitiesByInchiKey = new Map<string, CatalogNormalizedEntity[]>();
  for (const entity of entities) {
    entitiesByInchiKey.set(entity.identity.inchiKey, [
      ...(entitiesByInchiKey.get(entity.identity.inchiKey) ?? []),
      entity,
    ]);
  }

  const byInchiKey = new Map<string, SynthesisLearningStructureBundle>();
  const resolutions: SynthesisMaterialStructureResolution[] = [];
  const seenMaterialIdentity = new Set<string>();
  for (const material of materials) {
    const occurrenceKey = `${material.id}:${material.inchiKey}`;
    if (seenMaterialIdentity.has(occurrenceKey)) continue;
    seenMaterialIdentity.add(occurrenceKey);
    if (!material.exactIdentityResolved || !INCHI_KEY.test(material.inchiKey)) {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "identity_unresolved",
      });
      continue;
    }
    const matches = entitiesByInchiKey.get(material.inchiKey) ?? [];
    if (matches.length === 0) {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "no_exact_catalog_identity",
      });
      continue;
    }
    if (matches.length !== 1) {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "ambiguous_catalog_identity",
      });
      continue;
    }
    const bundle = createExactCatalogSynthesisStructureBundle(
      material,
      matches[0],
      assetBasePath,
    );
    if (!bundle) {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "catalog_asset_provenance_invalid",
      });
      continue;
    }
    byInchiKey.set(material.inchiKey, bundle);
    resolutions.push({
      materialId: material.id,
      inchiKey: material.inchiKey,
      state: "resolved",
    });
  }

  return {
    byInchiKey,
    resolutions,
    exactComputed3DIdentityCount: byInchiKey.size,
  };
};

export interface SynthesisStep3DGateInput {
  readonly id: string;
  readonly outputs: readonly {
    readonly id: string;
    readonly inchiKey: string;
    readonly exactIdentityResolved: boolean;
    readonly structureAssets: SynthesisLearningStructureBundle;
  }[];
}

const isCanonicalRdkitParameters = (
  value: unknown,
): value is RdkitComputedSynthesis3DParameters => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parameters = value as Readonly<Record<string, unknown>>;
  return (
    parameters.embeddingMethod === "ETKDGv3" &&
    Number.isSafeInteger(parameters.randomSeed) &&
    Number(parameters.randomSeed) > 0 &&
    Number(parameters.randomSeed) <= 0x7fffffff &&
    parameters.randomSeedStrategy === "sha256_inchi_key_first_31_bits_nonzero" &&
    parameters.enforceChirality === true &&
    parameters.useRandomCoords === false &&
    parameters.useSmallRingTorsions === true &&
    parameters.useMacrocycleTorsions === true &&
    parameters.useMacrocycle14config === true &&
    parameters.useExpTorsionAnglePrefs === true &&
    parameters.useBasicKnowledge === true &&
    parameters.embedFragmentsSeparately === true &&
    parameters.numThreads === 1 &&
    parameters.explicitHydrogens === true &&
    parameters.sdfCoordinateDecimalPlaces === 4 &&
    parameters.nonplanarityMetric ===
      "unweighted_all_atom_best_fit_plane_rms_angstrom" &&
    parameters.nonplanarityThresholdAngstrom === 0.001 &&
    parameters.minimizationPreference === "MMFF94s_then_UFF" &&
    parameters.maxMinimizationIterations === 500
  );
};

const validGeneratedAt = (value: string): boolean =>
  value.trim().length > 0 && Number.isFinite(Date.parse(value));

const hasExactComputedAssetIdentity = (
  material: Pick<
    SynthesisLearningMaterialIdentityInput,
    "inchiKey" | "exactIdentityResolved"
  >,
  bundle: SynthesisLearningStructureBundle,
  asset: ComputedSynthesis3DAsset,
): boolean =>
  material.exactIdentityResolved &&
  INCHI_KEY.test(material.inchiKey) &&
  bundle.inchiKey === material.inchiKey &&
  bundle.twoD.representation === "catalog_2d_record" &&
  asset.origin === "computed-3d-conformer" &&
  asset.provenance.kind === "computed" &&
  asset.identity.identityMatch === "exact_inchi_key" &&
  asset.identity.inchiKey === material.inchiKey &&
  asset.identity.catalogEntityId === bundle.twoD.identity.catalogEntityId &&
  asset.identity.catalogSnapshotId === bundle.twoD.identity.catalogSnapshotId &&
  asset.identity.pubChemCid === bundle.twoD.identity.pubChemCid &&
  bundle.twoD.identity.inchiKey === material.inchiKey &&
  bundle.twoD.assetId === asset.provenance.source2DId &&
  asset.provenance.structureHash === asset.sha256 &&
  SHA_256.test(asset.sha256) &&
  asset.publicPath.startsWith("/") &&
  asset.publicPath.endsWith(".sdf") &&
  validHttpsUrl(asset.sourceUrl) &&
  asset.provenance.experimentalStructure === false &&
  asset.provenance.crystalStructure === false &&
  asset.provenance.bioactiveConformation === false;

export const hasExactComputedSynthesis3D = (
  material: Pick<
    SynthesisLearningMaterialIdentityInput,
    "inchiKey" | "exactIdentityResolved"
  >,
  bundle: SynthesisLearningStructureBundle,
): boolean => {
  const asset = bundle.threeD;
  if (
    asset.status !== "available" ||
    !hasExactComputedAssetIdentity(material, bundle, asset)
  ) {
    return false;
  }
  if (asset.representation === "catalog_computed_conformer") {
    return (
      asset.assetId === `catalog-structure:3d:${asset.sha256}` &&
      asset.provenance.generator === "PubChem computed conformer service" &&
      asset.provenance.generatorVersion === null &&
      asset.provenance.parameters === null &&
      asset.provenance.generatedAt === null &&
      asset.provenance.source2DRelationship ===
        "exact_identity_anchor_not_disclosed_generator_input" &&
      asset.provenance.energyMinimizationState === "not_disclosed_by_source"
    );
  }
  const energyState = asset.provenance.energyMinimizationState;
  return (
    asset.representation === "rdkit_generated_conformer" &&
    asset.assetId === `synthesis-generated-structure:3d:${asset.sha256}` &&
    asset.sourceUrl === RDKIT_SOURCE_URL &&
    asset.provenance.generator === "RDKit ETKDGv3" &&
    asset.provenance.generatorVersion === RDKIT_GENERATOR_VERSION &&
    validGeneratedAt(asset.provenance.generatedAt) &&
    asset.provenance.source2DRelationship === "generator_input" &&
    RDKIT_ENERGY_MINIMIZATION_STATES.has(energyState) &&
    (energyState === "embedded_not_minimized_no_supported_force_field"
      ? asset.provenance.minimizedEnergy === null
      : typeof asset.provenance.minimizedEnergy === "number" &&
        Number.isFinite(asset.provenance.minimizedEnergy)) &&
    isCanonicalRdkitParameters(asset.provenance.parameters)
  );
};

export const getSynthesisStep3DGate = (
  step: SynthesisStep3DGateInput,
  requestedOutputMaterialId: string,
): SynthesisStep3DGate => {
  const output = step.outputs.find(
    (material) => material.id === requestedOutputMaterialId,
  );
  if (!output) {
    return {
      state: "2d_only",
      reason: "not_step_output",
      materialId: null,
      inchiKey: null,
      asset: null,
    };
  }
  if (
    !output.exactIdentityResolved ||
    !INCHI_KEY.test(output.inchiKey) ||
    output.structureAssets.inchiKey !== output.inchiKey
  ) {
    return {
      state: "2d_only",
      reason: "identity_unresolved",
      materialId: output.id,
      inchiKey: output.inchiKey,
      asset: null,
    };
  }
  const asset = output.structureAssets.threeD;
  if (asset.status === "unavailable") {
    return {
      state: "2d_only",
      reason: asset.reason,
      materialId: output.id,
      inchiKey: output.inchiKey,
      asset: null,
    };
  }
  if (!hasExactComputedSynthesis3D(output, output.structureAssets)) {
    return {
      state: "2d_only",
      reason: "catalog_asset_provenance_invalid",
      materialId: output.id,
      inchiKey: output.inchiKey,
      asset: null,
    };
  }
  return {
    state: "allowed",
    reason: "exact_computed_conformer",
    materialId: output.id,
    inchiKey: output.inchiKey,
    asset,
  };
};

const mechanismCommon = {
  reactionFamily: null,
  nucleophile: null,
  electrophile: null,
  leavingGroup: null,
  bondFormationOrBreakage: null,
  functionalGroupTransformation: null,
  regioOrStereochemicalOutcome: null,
  commonMisconception:
    "A source-backed transformation does not by itself establish an electron-pushing mechanism.",
} as const;

export const createUnresolvedSynthesisMechanism = (): UnresolvedSynthesisMechanism => ({
  ...mechanismCommon,
  assurance: "mechanism_not_resolved",
  reviewState: "unavailable",
  specificStepSourceReportsMechanism: false,
  reactionClassEducationalOnly: false,
  curvedArrowEligible: false,
  visualizationState: "unavailable",
  sourceEvidenceIds: [],
  educationSourceIds: [],
});

export interface SynthesisMechanismResolutionInput {
  readonly stepIdentity: ExactSynthesisLearningStepIdentity;
  readonly evidenceRegistry: SynthesisLearningEvidenceRegistry;
  readonly reviewRegistry: SynthesisLearningEvidenceReviewRegistry;
  readonly reactionClassLibrary: ReactionClassEducationLibrary;
  readonly reactionClass: {
    readonly resolutionState: "unclassified" | "candidate" | "normalized";
    readonly id: ReactionClassEducationEntry["reactionClassId"] | null;
    readonly sourceEvidenceIds: readonly string[];
  };
  readonly sourceMechanismEvidence: {
    readonly sourceEvidenceIds: readonly string[];
  } | null;
  readonly atomMapping: {
    readonly state: "not_mapped" | "computed" | "reviewed";
    readonly electronMoveEndpointsResolved: boolean;
    readonly stepIdentity: ExactSynthesisLearningStepIdentity | null;
  };
}

const validExactIdentity = (
  identity: ExactSynthesisLearningIdentity,
): boolean =>
  identity.identityMatch === "exact_inchi_key" &&
  identity.catalogEntityId.trim().length > 0 &&
  identity.catalogSnapshotId.trim().length > 0 &&
  Number.isSafeInteger(identity.pubChemCid) &&
  identity.pubChemCid > 0 &&
  INCHI_KEY.test(identity.inchiKey);

const sameExactIdentity = (
  left: ExactSynthesisLearningIdentity,
  right: ExactSynthesisLearningIdentity,
): boolean =>
  validExactIdentity(left) &&
  validExactIdentity(right) &&
  left.catalogEntityId === right.catalogEntityId &&
  left.catalogSnapshotId === right.catalogSnapshotId &&
  left.pubChemCid === right.pubChemCid &&
  left.inchiKey === right.inchiKey &&
  left.identityMatch === right.identityMatch;

const validStepIdentity = (
  identity: ExactSynthesisLearningStepIdentity,
): boolean =>
  identity.stepId.trim().length > 0 && validExactIdentity(identity.targetIdentity);

const sameStepIdentity = (
  left: ExactSynthesisLearningStepIdentity,
  right: ExactSynthesisLearningStepIdentity,
): boolean =>
  validStepIdentity(left) &&
  validStepIdentity(right) &&
  left.stepId === right.stepId &&
  sameExactIdentity(left.targetIdentity, right.targetIdentity);

const uniqueNonblank = (values: readonly string[]): readonly string[] | null => {
  if (values.length === 0 || values.some((value) => !value.trim())) return null;
  const unique = [...new Set(values)];
  return unique.length === values.length ? unique : null;
};

type ResolvedEvidenceAssociation = {
  readonly entry: SynthesisLearningEvidenceRegistryEntry;
  readonly decision: SynthesisLearningEvidenceReviewDecision;
};

const validEvidenceRegistryEntry = (
  entry: SynthesisLearningEvidenceRegistryEntry,
): boolean => {
  const scopes = new Set(entry.supportScopes);
  if (
    !entry.id.trim() ||
    !validStepIdentity(entry.stepIdentity) ||
    !entry.sourceDocumentId.trim() ||
    !validHttpsUrl(entry.sourceUrl) ||
    !entry.sourceLocator.trim() ||
    scopes.size !== entry.supportScopes.length ||
    entry.supportScopes.length === 0
  ) return false;
  if (
    scopes.has("reaction_class_assignment") !==
      Boolean(entry.reactionClassId?.startsWith("reaction-class:"))
  ) return false;
  if (
    scopes.has("structured_fact") !== (entry.structuredFactIds.length > 0) ||
    new Set(entry.structuredFactIds).size !== entry.structuredFactIds.length ||
    entry.structuredFactIds.some((id) => !id.startsWith("synthesis-fact:"))
  ) return false;
  return true;
};

const validReviewDecision = (
  decision: SynthesisLearningEvidenceReviewDecision,
): boolean =>
  decision.id.trim().length > 0 &&
  decision.evidenceId.trim().length > 0 &&
  validStepIdentity(decision.stepIdentity) &&
  ["pending", "reviewed", "verified", "withdrawn"].includes(
    decision.reviewState,
  );

const resolveEvidenceAssociations = (
  evidenceIds: readonly string[],
  stepIdentity: ExactSynthesisLearningStepIdentity,
  evidenceRegistry: SynthesisLearningEvidenceRegistry,
  reviewRegistry: SynthesisLearningEvidenceReviewRegistry,
  supportScope: SynthesisLearningEvidenceRegistryEntry["supportScopes"][number],
  entryMatches: (entry: SynthesisLearningEvidenceRegistryEntry) => boolean = () => true,
): readonly ResolvedEvidenceAssociation[] | null => {
  const ids = uniqueNonblank(evidenceIds);
  if (
    !ids ||
    !validStepIdentity(stepIdentity) ||
    evidenceRegistry.schemaVersion !== 1 ||
    reviewRegistry.schemaVersion !== 1 ||
    new Set(evidenceRegistry.entries.map((entry) => entry.id)).size !==
      evidenceRegistry.entries.length ||
    new Set(reviewRegistry.decisions.map((decision) => decision.id)).size !==
      reviewRegistry.decisions.length ||
    !evidenceRegistry.entries.every(validEvidenceRegistryEntry) ||
    !reviewRegistry.decisions.every(validReviewDecision)
  ) return null;

  const resolved = ids.flatMap((id): readonly ResolvedEvidenceAssociation[] => {
    const entries = evidenceRegistry.entries.filter((entry) => entry.id === id);
    if (entries.length !== 1) return [];
    const entry = entries[0];
    if (
      !sameStepIdentity(entry.stepIdentity, stepIdentity) ||
      !entry.supportScopes.includes(supportScope) ||
      !entryMatches(entry)
    ) return [];
    const decisions = reviewRegistry.decisions.filter((decision) =>
      decision.evidenceId === id &&
      sameStepIdentity(decision.stepIdentity, stepIdentity)
    );
    return decisions.length === 1 ? [{ entry, decision: decisions[0] }] : [];
  });
  return resolved.length === ids.length ? resolved : null;
};

const aggregateReviewState = (
  associations: readonly ResolvedEvidenceAssociation[],
): "pending" | "reviewed" | "verified" | null => {
  const states = associations.map(({ decision }) => decision.reviewState);
  if (states.length === 0 || states.includes("withdrawn")) return null;
  if (states.includes("pending")) return "pending";
  if (states.includes("reviewed")) return "reviewed";
  return states.every((state) => state === "verified") ? "verified" : null;
};

export const resolveSynthesisMechanismAssurance = (
  input: SynthesisMechanismResolutionInput,
): SynthesisMechanismAssuranceRecord => {
  const mechanismAssociations = input.sourceMechanismEvidence
    ? resolveEvidenceAssociations(
        input.sourceMechanismEvidence.sourceEvidenceIds,
        input.stepIdentity,
        input.evidenceRegistry,
        input.reviewRegistry,
        "exact_step_mechanism",
      )
    : null;
  const mechanismReviewState = mechanismAssociations
    ? aggregateReviewState(mechanismAssociations)
    : null;
  const mechanismLocators = new Set(
    mechanismAssociations?.map(({ entry }) => entry.sourceLocator) ?? [],
  );
  const mechanismLocator = mechanismAssociations?.[0]?.entry.sourceLocator ?? null;
  if (
    mechanismAssociations &&
    mechanismReviewState &&
    mechanismLocator &&
    mechanismLocators.size === 1
  ) {
    const mapped = input.atomMapping.state === "reviewed" &&
      input.atomMapping.electronMoveEndpointsResolved &&
      Boolean(
        input.atomMapping.stepIdentity &&
        sameStepIdentity(input.atomMapping.stepIdentity, input.stepIdentity),
      );
    return {
      ...mechanismCommon,
      assurance: "source_supported_mechanism",
      reviewState: mechanismReviewState,
      sourceLocator: mechanismLocator,
      specificStepSourceReportsMechanism: true,
      reactionClassEducationalOnly: false,
      curvedArrowEligible: mapped,
      visualizationState: mapped
        ? "mapped_molecule_specific"
        : "source_supported_unmapped",
      sourceEvidenceIds: mechanismAssociations.map(({ entry }) => entry.id),
      educationSourceIds: [],
    };
  }

  const reactionClassEntry = input.reactionClass.id
    ? getReactionClassEducationEntry(
        input.reactionClassLibrary,
        input.reactionClass.id,
      )
    : null;
  const classAssociations = reactionClassEntry &&
      input.reactionClass.resolutionState === "normalized"
    ? resolveEvidenceAssociations(
        input.reactionClass.sourceEvidenceIds,
        input.stepIdentity,
        input.evidenceRegistry,
        input.reviewRegistry,
        "reaction_class_assignment",
        (entry) => entry.reactionClassId === reactionClassEntry.reactionClassId,
      )
    : null;
  const classReviewState = classAssociations
    ? aggregateReviewState(classAssociations)
    : null;
  const educationSourceReviewStates = reactionClassEntry?.educationSources.map(
    (source) => source.reviewState,
  ) ?? [];
  const educationSourcesReviewed = educationSourceReviewStates.length > 0 &&
    educationSourceReviewStates.every(
      (state) => state === "reviewed" || state === "verified",
    );
  if (
    reactionClassEntry &&
    classAssociations &&
    (classReviewState === "reviewed" || classReviewState === "verified") &&
    educationSourcesReviewed
  ) {
    const educationReviewState = educationSourceReviewStates.every(
      (state) => state === "verified",
    )
      ? "verified" as const
      : "reviewed" as const;
    const reviewState = classReviewState === "verified" &&
        educationReviewState === "verified"
      ? "verified" as const
      : "reviewed" as const;
    return {
      ...mechanismCommon,
      assurance: "reaction_class_educational_mechanism",
      reviewState,
      reactionClassId: reactionClassEntry.reactionClassId,
      reactionClassLibraryVersion: input.reactionClassLibrary.version,
      reactionFamily: reactionClassEntry.canonicalName,
      nucleophile: reactionClassEntry.typicalNucleophile,
      electrophile: reactionClassEntry.typicalElectrophile,
      leavingGroup: reactionClassEntry.leavingGroupPattern,
      functionalGroupTransformation: reactionClassEntry.generalTransformation,
      specificStepSourceReportsMechanism: false,
      reactionClassEducationalOnly: true,
      curvedArrowEligible: false,
      visualizationState: "general_reaction_class",
      sourceEvidenceIds: classAssociations.map(({ entry }) => entry.id),
      educationSourceIds: reactionClassEntry.educationSources.map(
        (source) => source.id,
      ),
      disclaimer: reactionClassEntry.genericMechanismDisclaimer,
    };
  }

  return createUnresolvedSynthesisMechanism();
};

const taskKindByFactKind: Readonly<
  Record<StructuredSynthesisFact["kind"], StructuredSynthesisTaskKind>
> = {
  step_order: "choose_next_step",
  reaction_class: "choose_reaction_class",
  formed_bond: "identify_formed_bond",
  changed_functional_group: "identify_functional_group_change",
  precursor_identity: "choose_precursor",
  scaffold_contribution: "identify_scaffold_contribution",
  target_form_relation: "distinguish_target_form",
};

export interface StructuredSynthesisQuizGateContext {
  readonly stepIdentity: ExactSynthesisLearningStepIdentity;
  readonly evidenceRegistry: SynthesisLearningEvidenceRegistry;
  readonly reviewRegistry: SynthesisLearningEvidenceReviewRegistry;
}

const isAdmissibleQuizFact = (
  fact: StructuredSynthesisFact,
  context: StructuredSynthesisQuizGateContext | undefined,
): boolean => {
  if (
    !context ||
    fact.resolutionState !== "resolved" ||
    fact.origin !== "source_supported" ||
    !fact.exactIdentityResolved ||
    (fact.reviewState !== "reviewed" && fact.reviewState !== "verified") ||
    !fact.value.trim() ||
    !fact.sourceLocator?.trim() ||
    !sameStepIdentity(fact.stepIdentity, context.stepIdentity)
  ) return false;
  const associations = resolveEvidenceAssociations(
    fact.sourceEvidenceIds,
    context.stepIdentity,
    context.evidenceRegistry,
    context.reviewRegistry,
    "structured_fact",
    (entry) =>
      entry.structuredFactIds.includes(fact.id) &&
      entry.sourceLocator === fact.sourceLocator,
  );
  if (!associations) return false;
  const reviewState = aggregateReviewState(associations);
  return (reviewState === "reviewed" || reviewState === "verified") &&
    reviewState === fact.reviewState;
};

/** Quiz eligibility is derived only from structured source facts; no prompt or LLM may add chemistry. */
export const deriveStructuredSynthesisQuizGate = (
  facts: readonly StructuredSynthesisFact[],
  context?: StructuredSynthesisQuizGateContext,
): StructuredSynthesisQuizGate => {
  const admitted = facts.filter((fact) => isAdmissibleQuizFact(fact, context));
  const admittedIds = new Set(admitted.map((fact) => fact.id));
  const eligibleTaskKinds = [
    ...new Set(admitted.map((fact) => taskKindByFactKind[fact.kind])),
  ];
  return {
    state: eligibleTaskKinds.length > 0 ? "eligible" : "ineligible",
    eligibleTaskKinds,
    admittedFactIds: admitted.map((fact) => fact.id),
    rejectedFactIds: facts
      .filter((fact) => !admittedIds.has(fact.id))
      .map((fact) => fact.id),
    llmChemistryFactGenerationAllowed: false,
  };
};

export interface SynthesisLearningCapabilityRouteInput {
  readonly steps: readonly {
    readonly inputs: readonly { readonly structureAssets: SynthesisLearningStructureBundle }[];
    readonly outputs: readonly { readonly structureAssets: SynthesisLearningStructureBundle }[];
    readonly mechanism: SynthesisMechanismAssuranceRecord;
    readonly quizGate: StructuredSynthesisQuizGate;
  }[];
}

export const summarizeSynthesisLearningCapabilities = (
  routes: readonly SynthesisLearningCapabilityRouteInput[],
): SynthesisLearningCapabilityCounts => {
  const computed3DIdentities = new Set<string>();
  let sourceSupportedMechanisms = 0;
  let reactionClassEducationalMechanisms = 0;
  let mappedMoleculeSpecificMechanisms = 0;
  let structuredLearningTasks = 0;
  for (const step of routes.flatMap((route) => route.steps)) {
    for (const material of [...step.inputs, ...step.outputs]) {
      if (material.structureAssets.threeD.status === "available") {
        computed3DIdentities.add(material.structureAssets.inchiKey);
      }
    }
    if (step.mechanism.assurance === "source_supported_mechanism") {
      sourceSupportedMechanisms += 1;
    }
    if (step.mechanism.assurance === "reaction_class_educational_mechanism") {
      reactionClassEducationalMechanisms += 1;
    }
    if (step.mechanism.visualizationState === "mapped_molecule_specific") {
      mappedMoleculeSpecificMechanisms += 1;
    }
    structuredLearningTasks += step.quizGate.eligibleTaskKinds.length;
  }
  return {
    materialsWithCatalogComputed3D: computed3DIdentities.size,
    sourceSupportedMechanisms,
    reactionClassEducationalMechanisms,
    mappedMoleculeSpecificMechanisms,
    structuredLearningTasks,
  };
};

const compareText = (left: string, right: string): number =>
  left.localeCompare(right, "en");

/**
 * Produces a typed, countable feature artifact from already checked catalog
 * assets. It performs no conformer generation and never promotes route or
 * mechanism evidence.
 */
export const buildSynthesisIntermediate3DManifest = (
  graphs: readonly PublicAlphaSynthesisDraftGraph[],
  entities: readonly CatalogNormalizedEntity[],
  catalogSnapshotId: string,
  generatedAt: string,
  assetBasePath = "/",
): SynthesisIntermediate3DManifest => {
  const intermediateByInchiKey = new Map<
    string,
    SynthesisLearningMaterialIdentityInput
  >();
  for (const graph of graphs) {
    for (const material of graph.materials) {
      if (material.displayRole !== "route_intermediate") continue;
      if (!intermediateByInchiKey.has(material.inchiKey)) {
        intermediateByInchiKey.set(material.inchiKey, {
          id: material.id,
          inchiKey: material.inchiKey,
          sourceSmiles: material.sourceSmiles,
          exactIdentityResolved:
            material.identityResolution === "exact_inchi_key_computed",
        });
      }
    }
  }

  const registry = buildSynthesisMaterialStructureRegistry(
    [...intermediateByInchiKey.values()],
    entities,
    assetBasePath,
  );
  const alternativeIdsByInchiKey = new Map<string, Set<string>>();
  const alternativesWithComputedIntermediate = new Set<string>();
  for (const graph of graphs) {
    const materialById = new Map(
      graph.materials.map((material) => [material.id, material] as const),
    );
    const stepById = new Map(
      graph.steps.map((step) => [step.id, step] as const),
    );
    for (const alternative of graph.alternatives) {
      const scopedAlternativeId = `${graph.graphId}/${alternative.id}`;
      const intermediateKeys = new Set<string>();
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
          if (
            material?.displayRole === "route_intermediate" &&
            registry.byInchiKey.has(material.inchiKey)
          ) {
            intermediateKeys.add(material.inchiKey);
          }
        }
      }
      if (intermediateKeys.size > 0) {
        alternativesWithComputedIntermediate.add(scopedAlternativeId);
      }
      for (const inchiKey of intermediateKeys) {
        const ids = alternativeIdsByInchiKey.get(inchiKey) ?? new Set<string>();
        ids.add(scopedAlternativeId);
        alternativeIdsByInchiKey.set(inchiKey, ids);
      }
    }
  }

  const entries = [...registry.byInchiKey.entries()]
    .flatMap(([inchiKey, bundle]): readonly SynthesisIntermediate3DManifestEntry[] => {
      if (
        bundle.twoD.representation !== "catalog_2d_record" ||
        bundle.threeD.status !== "available"
      ) {
        return [];
      }
      return [{
        inchiKey,
        catalogEntityId: bundle.threeD.identity.catalogEntityId,
        catalogSnapshotId: bundle.threeD.identity.catalogSnapshotId,
        pubChemCid: bundle.threeD.identity.pubChemCid,
        materialRole: "pending_route_boundary_material",
        materialRoleReviewState: "pending",
        materialRoleDisclosure:
          "Exact-identity route-boundary material; intermediate role pending scientific review.",
        twoD: bundle.twoD,
        threeD: bundle.threeD,
        routeAlternativeIds: [
          ...(alternativeIdsByInchiKey.get(inchiKey) ?? []),
        ].sort(compareText),
      }];
    })
    .sort((left, right) => compareText(left.inchiKey, right.inchiKey));
  const unresolvedInchiKeys = [...intermediateByInchiKey.keys()]
    .filter((inchiKey) => !registry.byInchiKey.has(inchiKey))
    .sort(compareText);

  return {
    schemaVersion: 1,
    pipelineVersion: "synthesis-intermediate-computed-3d-2.0.0",
    catalogSnapshotId,
    generatedAt,
    summary: {
      observedExactRouteBoundaryMaterialIdentityCount:
        intermediateByInchiKey.size,
      computedRouteBoundaryMaterial3dAssetCount: entries.length,
      rdkitGeneratedRouteBoundaryMaterial3dAssetCount: 0,
      catalogComputedFallback3dAssetCount: entries.length,
      rdkitGenerationFailureCount: 0,
      routeAlternativesWithComputedIntermediate3d:
        alternativesWithComputedIntermediate.size,
      unresolvedRouteBoundaryMaterialIdentityCount: unresolvedInchiKeys.length,
    },
    entries,
    unresolvedInchiKeys,
    generationFailures: [],
    boundaries: {
      exactInchiKeyRequired: true,
      catalog2dPairRequired: true,
      computedProvenanceRequired: true,
      catalogFallback3dSource2dRelationship:
        "exact_identity_anchor_not_disclosed_generator_input",
      rdkitGenerated3dSource2dRelationship: "generator_input",
      rdkitGeneratorVersion: RDKIT_GENERATOR_VERSION,
      rdkitParametersRecorded: true,
      routeBoundaryMaterialRoleState: "pending_review",
      routeBoundaryMaterialDisclosure:
        "Exact-identity route-boundary material; intermediate role pending scientific review.",
      missingGeneratorDetailsInvented: false,
      experimentalStructureClaimed: false,
      syntheticIntermediateFallbackCreated: false,
      generationFailurePolicy: "two_d_only_fail_closed",
    },
  };
};

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isExactManifestEntry = (
  value: unknown,
  catalogSnapshotId: string,
): value is SynthesisIntermediate3DManifestEntry => {
  if (!isObject(value) || !isObject(value.twoD) || !isObject(value.threeD)) {
    return false;
  }
  const twoD = value.twoD;
  const threeD = value.threeD;
  if (
    !isObject(twoD.identity) ||
    !isObject(threeD.identity) ||
    !isObject(threeD.provenance)
  ) {
    return false;
  }
  const shared3DBoundary =
    threeD.status === "available" &&
    typeof threeD.publicPath === "string" && threeD.publicPath.startsWith("/") &&
    threeD.publicPath.endsWith(".sdf") &&
    typeof threeD.sourceUrl === "string" && validHttpsUrl(threeD.sourceUrl) &&
    typeof threeD.sha256 === "string" && SHA_256.test(threeD.sha256) &&
    threeD.origin === "computed-3d-conformer" &&
    threeD.identity.catalogEntityId === value.catalogEntityId &&
    threeD.identity.catalogSnapshotId === catalogSnapshotId &&
    threeD.identity.pubChemCid === value.pubChemCid &&
    threeD.identity.inchiKey === value.inchiKey &&
    threeD.identity.identityMatch === "exact_inchi_key" &&
    threeD.provenance.kind === "computed" &&
    threeD.provenance.structureHash === threeD.sha256 &&
    threeD.provenance.source2DId === twoD.assetId &&
    threeD.provenance.experimentalStructure === false &&
    threeD.provenance.crystalStructure === false &&
    threeD.provenance.bioactiveConformation === false;
  const catalog3DBoundary =
    threeD.representation === "catalog_computed_conformer" &&
    typeof threeD.assetId === "string" &&
    threeD.assetId === `catalog-structure:3d:${String(threeD.sha256)}` &&
    threeD.provenance.generator === "PubChem computed conformer service" &&
    threeD.provenance.generatorVersion === null &&
    threeD.provenance.parameters === null &&
    threeD.provenance.generatedAt === null &&
    threeD.provenance.source2DRelationship ===
      "exact_identity_anchor_not_disclosed_generator_input" &&
    threeD.provenance.energyMinimizationState === "not_disclosed_by_source";
  const energyState = threeD.provenance.energyMinimizationState;
  const rdkit3DBoundary =
    threeD.representation === "rdkit_generated_conformer" &&
    typeof threeD.assetId === "string" &&
    threeD.assetId === `synthesis-generated-structure:3d:${String(threeD.sha256)}` &&
    threeD.sourceUrl === RDKIT_SOURCE_URL &&
    threeD.provenance.generator === "RDKit ETKDGv3" &&
    threeD.provenance.generatorVersion === RDKIT_GENERATOR_VERSION &&
    typeof threeD.provenance.generatedAt === "string" &&
    validGeneratedAt(threeD.provenance.generatedAt) &&
    threeD.provenance.source2DRelationship === "generator_input" &&
    typeof energyState === "string" &&
    RDKIT_ENERGY_MINIMIZATION_STATES.has(
      energyState as RdkitEnergyMinimizationState,
    ) &&
    (energyState === "embedded_not_minimized_no_supported_force_field"
      ? threeD.provenance.minimizedEnergy === null
      : typeof threeD.provenance.minimizedEnergy === "number" &&
        Number.isFinite(threeD.provenance.minimizedEnergy)) &&
    isCanonicalRdkitParameters(threeD.provenance.parameters);
  return (
    typeof value.inchiKey === "string" && INCHI_KEY.test(value.inchiKey) &&
    typeof value.catalogEntityId === "string" && value.catalogEntityId.length > 0 &&
    value.catalogSnapshotId === catalogSnapshotId &&
    Number.isSafeInteger(value.pubChemCid) && Number(value.pubChemCid) > 0 &&
    value.materialRole === "pending_route_boundary_material" &&
    value.materialRoleReviewState === "pending" &&
    value.materialRoleDisclosure ===
      "Exact-identity route-boundary material; intermediate role pending scientific review." &&
    twoD.status === "available" &&
    twoD.representation === "catalog_2d_record" &&
    typeof twoD.assetId === "string" && twoD.assetId.startsWith("catalog-structure:2d:") &&
    typeof twoD.publicPath === "string" && twoD.publicPath.startsWith("/") &&
    typeof twoD.sourceUrl === "string" && validHttpsUrl(twoD.sourceUrl) &&
    typeof twoD.sha256 === "string" && SHA_256.test(twoD.sha256) &&
    twoD.origin === "database-2d-record" && twoD.provenance === "source_record" &&
    twoD.identity.catalogEntityId === value.catalogEntityId &&
    twoD.identity.catalogSnapshotId === catalogSnapshotId &&
    twoD.identity.pubChemCid === value.pubChemCid &&
    twoD.identity.inchiKey === value.inchiKey &&
    twoD.identity.identityMatch === "exact_inchi_key" &&
    shared3DBoundary &&
    (catalog3DBoundary || rdkit3DBoundary) &&
    Array.isArray(value.routeAlternativeIds) &&
    value.routeAlternativeIds.every(
      (id) => typeof id === "string" && id.trim().length > 0,
    )
  );
};

export const parseSynthesisIntermediate3DManifest = (
  value: unknown,
): SynthesisIntermediate3DManifest => {
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    value.pipelineVersion !== "synthesis-intermediate-computed-3d-2.0.0" ||
    typeof value.catalogSnapshotId !== "string" ||
    !value.catalogSnapshotId.trim() ||
    typeof value.generatedAt !== "string" ||
    !value.generatedAt.trim() ||
    !isObject(value.summary) ||
    !Array.isArray(value.entries) ||
    !Array.isArray(value.unresolvedInchiKeys) ||
    !Array.isArray(value.generationFailures) ||
    !isObject(value.boundaries)
  ) {
    throw new Error("Unsupported synthesis intermediate 3D manifest.");
  }
  const entries = value.entries;
  const unresolvedInchiKeys = value.unresolvedInchiKeys;
  const rdkitEntryCount = entries.filter(
    (entry) => isObject(entry) && isObject(entry.threeD) &&
      entry.threeD.representation === "rdkit_generated_conformer",
  ).length;
  const catalogFallbackCount = entries.filter(
    (entry) => isObject(entry) && isObject(entry.threeD) &&
      entry.threeD.representation === "catalog_computed_conformer",
  ).length;
  const generationFailures = value.generationFailures;
  const failedInchiKeys = new Set<string>();
  const validGenerationFailures = generationFailures.every((failure) => {
    if (
      !isObject(failure) ||
      typeof failure.inchiKey !== "string" ||
      !INCHI_KEY.test(failure.inchiKey) ||
      typeof failure.reason !== "string" ||
      !failure.reason.trim() ||
      failure.fallbackState !== "two_d_only_fail_closed" ||
      failedInchiKeys.has(failure.inchiKey)
    ) {
      return false;
    }
    failedInchiKeys.add(failure.inchiKey);
    return unresolvedInchiKeys.includes(failure.inchiKey) &&
      !entries.some(
        (entry) => isObject(entry) && entry.inchiKey === failure.inchiKey,
      );
  });
  if (
    !entries.every((entry) =>
      isExactManifestEntry(entry, value.catalogSnapshotId as string)
    ) ||
    new Set(entries.map((entry) => entry.inchiKey)).size !== entries.length ||
    !unresolvedInchiKeys.every(
      (inchiKey) => typeof inchiKey === "string" && INCHI_KEY.test(inchiKey),
    ) ||
    value.summary.observedExactRouteBoundaryMaterialIdentityCount !==
      entries.length + unresolvedInchiKeys.length ||
    value.summary.computedRouteBoundaryMaterial3dAssetCount !== entries.length ||
    value.summary.rdkitGeneratedRouteBoundaryMaterial3dAssetCount !==
      rdkitEntryCount ||
    value.summary.catalogComputedFallback3dAssetCount !== catalogFallbackCount ||
    value.summary.rdkitGenerationFailureCount !== generationFailures.length ||
    !validGenerationFailures ||
    !Number.isSafeInteger(value.summary.routeAlternativesWithComputedIntermediate3d) ||
    Number(value.summary.routeAlternativesWithComputedIntermediate3d) < 0 ||
    value.summary.unresolvedRouteBoundaryMaterialIdentityCount !==
      unresolvedInchiKeys.length ||
    value.boundaries.exactInchiKeyRequired !== true ||
    value.boundaries.catalog2dPairRequired !== true ||
    value.boundaries.computedProvenanceRequired !== true ||
    value.boundaries.catalogFallback3dSource2dRelationship !==
      "exact_identity_anchor_not_disclosed_generator_input" ||
    value.boundaries.rdkitGenerated3dSource2dRelationship !== "generator_input" ||
    value.boundaries.rdkitGeneratorVersion !== RDKIT_GENERATOR_VERSION ||
    value.boundaries.rdkitParametersRecorded !== true ||
    value.boundaries.routeBoundaryMaterialRoleState !== "pending_review" ||
    value.boundaries.routeBoundaryMaterialDisclosure !==
      "Exact-identity route-boundary material; intermediate role pending scientific review." ||
    value.boundaries.missingGeneratorDetailsInvented !== false ||
    value.boundaries.experimentalStructureClaimed !== false ||
    value.boundaries.syntheticIntermediateFallbackCreated !== false ||
    value.boundaries.generationFailurePolicy !== "two_d_only_fail_closed"
  ) {
    throw new Error("Synthesis intermediate 3D manifest failed its provenance boundary.");
  }
  const routeAlternativeIds = new Set(
    entries.flatMap((entry) => entry.routeAlternativeIds),
  );
  if (
    routeAlternativeIds.size !==
    value.summary.routeAlternativesWithComputedIntermediate3d
  ) {
    throw new Error("Synthesis intermediate 3D route count does not match its entries.");
  }
  return value as unknown as SynthesisIntermediate3DManifest;
};

export interface SynthesisIntermediate3DGenerationReportEntry {
  readonly inchiKey: string;
  readonly outputPath: string;
  readonly sha256: string;
  readonly source2DId: CatalogSynthesis2DAsset["assetId"];
  readonly generator: "RDKit ETKDGv3";
  readonly generatorVersion: "2026.03.5";
  readonly generatedAt: string;
  readonly parameters: RdkitComputedSynthesis3DParameters;
  readonly energyMinimizationState: RdkitEnergyMinimizationState;
  readonly minimizedEnergy: number | null;
  readonly experimentalStructure: false;
  readonly crystalStructure: false;
  readonly bioactiveConformation: false;
}

export interface SynthesisIntermediate3DGenerationReport {
  readonly schemaVersion: 1;
  readonly generator: "RDKit ETKDGv3";
  readonly generatorVersion: "2026.03.5";
  readonly generatedAt: string;
  readonly requestedCount: number;
  readonly generatedCount: number;
  readonly failureCount: number;
  readonly entries: readonly SynthesisIntermediate3DGenerationReportEntry[];
  readonly failures: readonly {
    readonly inchiKey: string;
    readonly reason: string;
  }[];
}

export const parseSynthesisIntermediate3DGenerationReport = (
  value: unknown,
): SynthesisIntermediate3DGenerationReport => {
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    value.generator !== "RDKit ETKDGv3" ||
    value.generatorVersion !== RDKIT_GENERATOR_VERSION ||
    typeof value.generatedAt !== "string" ||
    !validGeneratedAt(value.generatedAt) ||
    !Number.isSafeInteger(value.requestedCount) ||
    Number(value.requestedCount) < 0 ||
    !Number.isSafeInteger(value.generatedCount) ||
    !Number.isSafeInteger(value.failureCount) ||
    !Array.isArray(value.entries) ||
    !Array.isArray(value.failures)
  ) {
    throw new Error("Unsupported synthesis intermediate 3D generation report.");
  }
  const entries = value.entries;
  const failures = value.failures;
  const generatedIdentities = new Set<string>();
  const validEntries = entries.every((entry) => {
    if (!isObject(entry) || !isObject(entry.parameters)) return false;
    const energyState = entry.energyMinimizationState;
    if (
      typeof entry.inchiKey !== "string" ||
      !INCHI_KEY.test(entry.inchiKey) ||
      generatedIdentities.has(entry.inchiKey) ||
      typeof entry.outputPath !== "string" ||
      !entry.outputPath.trim() ||
      typeof entry.sha256 !== "string" ||
      !SHA_256.test(entry.sha256) ||
      typeof entry.source2DId !== "string" ||
      !entry.source2DId.startsWith("catalog-structure:2d:") ||
      entry.generator !== "RDKit ETKDGv3" ||
      entry.generatorVersion !== RDKIT_GENERATOR_VERSION ||
      entry.generatedAt !== value.generatedAt ||
      typeof energyState !== "string" ||
      !RDKIT_ENERGY_MINIMIZATION_STATES.has(
        energyState as RdkitEnergyMinimizationState,
      ) ||
      !isCanonicalRdkitParameters(entry.parameters) ||
      (energyState === "embedded_not_minimized_no_supported_force_field"
        ? entry.minimizedEnergy !== null
        : typeof entry.minimizedEnergy !== "number" ||
          !Number.isFinite(entry.minimizedEnergy)) ||
      entry.experimentalStructure !== false ||
      entry.crystalStructure !== false ||
      entry.bioactiveConformation !== false
    ) {
      return false;
    }
    generatedIdentities.add(entry.inchiKey);
    return true;
  });
  const failedIdentities = new Set<string>();
  const validFailures = failures.every((failure) => {
    if (
      !isObject(failure) ||
      typeof failure.inchiKey !== "string" ||
      !INCHI_KEY.test(failure.inchiKey) ||
      generatedIdentities.has(failure.inchiKey) ||
      failedIdentities.has(failure.inchiKey) ||
      typeof failure.reason !== "string" ||
      !failure.reason.trim()
    ) {
      return false;
    }
    failedIdentities.add(failure.inchiKey);
    return true;
  });
  if (
    !validEntries ||
    !validFailures ||
    value.generatedCount !== entries.length ||
    value.failureCount !== failures.length ||
    value.requestedCount !== entries.length + failures.length
  ) {
    throw new Error("Synthesis intermediate 3D generation report failed validation.");
  }
  return value as unknown as SynthesisIntermediate3DGenerationReport;
};

export const applyRdkitGeneratedConformersToManifest = (
  manifestValue: SynthesisIntermediate3DManifest,
  reportValue: SynthesisIntermediate3DGenerationReport,
  publicPathForInchiKey: (inchiKey: string) => string = (inchiKey) =>
    `/catalog/synthesis/intermediate-3d/${inchiKey.toLowerCase()}.sdf`,
): SynthesisIntermediate3DManifest => {
  const manifest = parseSynthesisIntermediate3DManifest(manifestValue);
  const report = parseSynthesisIntermediate3DGenerationReport(reportValue);
  const requested = new Set([
    ...report.entries.map((entry) => entry.inchiKey),
    ...report.failures.map((failure) => failure.inchiKey),
  ]);
  const manifestIdentities = new Set(manifest.entries.map((entry) => entry.inchiKey));
  if (
    requested.size !== manifestIdentities.size ||
    [...requested].some((inchiKey) => !manifestIdentities.has(inchiKey))
  ) {
    throw new Error("RDKit generation report does not cover the exact manifest identity set.");
  }
  const generatedByInchiKey = new Map(
    report.entries.map((entry) => [entry.inchiKey, entry] as const),
  );
  const failedInchiKeys = new Set(report.failures.map((failure) => failure.inchiKey));
  const entries = manifest.entries.flatMap((entry): readonly SynthesisIntermediate3DManifestEntry[] => {
    const generated = generatedByInchiKey.get(entry.inchiKey);
    if (!generated) {
      if (!failedInchiKeys.has(entry.inchiKey)) {
        throw new Error(`Invalid RDKit failure boundary for ${entry.inchiKey}.`);
      }
      return [];
    }
    if (generated.source2DId !== entry.twoD.assetId) {
      throw new Error(`RDKit source 2D identity mismatch for ${entry.inchiKey}.`);
    }
    const publicPath = publicPathForInchiKey(entry.inchiKey);
    if (!publicPath.startsWith("/") || !publicPath.endsWith(".sdf")) {
      throw new Error(`Invalid RDKit public asset path for ${entry.inchiKey}.`);
    }
    const threeD: RdkitGeneratedSynthesis3DAsset = {
      status: "available",
      representation: "rdkit_generated_conformer",
      assetId: `synthesis-generated-structure:3d:${generated.sha256}`,
      publicPath,
      sourceUrl: RDKIT_SOURCE_URL,
      sha256: generated.sha256,
      origin: "computed-3d-conformer",
      identity: entry.twoD.identity,
      provenance: {
        kind: "computed",
        generator: generated.generator,
        generatorVersion: generated.generatorVersion,
        parameters: generated.parameters,
        generatedAt: generated.generatedAt,
        structureHash: generated.sha256,
        source2DId: generated.source2DId,
        source2DRelationship: "generator_input",
        energyMinimizationState: generated.energyMinimizationState,
        minimizedEnergy: generated.minimizedEnergy,
        experimentalStructure: false,
        crystalStructure: false,
        bioactiveConformation: false,
      },
    };
    return [{ ...entry, threeD }];
  });
  const rdkitGeneratedCount = entries.filter(
    (entry) => entry.threeD.representation === "rdkit_generated_conformer",
  ).length;
  const unresolvedInchiKeys = [
    ...new Set([
      ...manifest.unresolvedInchiKeys,
      ...report.failures.map((failure) => failure.inchiKey),
    ]),
  ].sort(compareText);
  const routeAlternativesWithComputedIntermediate3d = new Set(
    entries.flatMap((entry) => entry.routeAlternativeIds),
  ).size;
  const result: SynthesisIntermediate3DManifest = {
    ...manifest,
    generatedAt: report.generatedAt,
    entries,
    generationFailures: report.failures
      .map((failure) => ({
        ...failure,
        fallbackState: "two_d_only_fail_closed" as const,
      }))
      .sort((left, right) => compareText(left.inchiKey, right.inchiKey)),
    summary: {
      ...manifest.summary,
      computedRouteBoundaryMaterial3dAssetCount: entries.length,
      rdkitGeneratedRouteBoundaryMaterial3dAssetCount: rdkitGeneratedCount,
      catalogComputedFallback3dAssetCount: entries.length - rdkitGeneratedCount,
      rdkitGenerationFailureCount: report.failures.length,
      routeAlternativesWithComputedIntermediate3d,
      unresolvedRouteBoundaryMaterialIdentityCount: unresolvedInchiKeys.length,
    },
    unresolvedInchiKeys,
  };
  return parseSynthesisIntermediate3DManifest(result);
};

export interface LoadSynthesisIntermediate3DManifestOptions {
  readonly assetBasePath?: string;
  readonly fetchImpl?: typeof fetch;
}

export const loadSynthesisIntermediate3DManifest = async (
  options: LoadSynthesisIntermediate3DManifestOptions = {},
): Promise<SynthesisIntermediate3DManifest> => {
  const path = resolveCatalogAssetPath(
    "/catalog/synthesis/reports/intermediate-3d-assets.json",
    options.assetBasePath,
  );
  const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const response = await fetchImpl(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Synthesis intermediate 3D manifest request failed (${response.status}).`);
  }
  return parseSynthesisIntermediate3DManifest(await response.json());
};

export const buildSynthesisMaterialStructureRegistryFromManifest = (
  materials: readonly SynthesisLearningMaterialIdentityInput[],
  manifest: SynthesisIntermediate3DManifest,
  assetBasePath = "/",
): SynthesisMaterialStructureRegistry => {
  const entryByInchiKey = new Map(
    manifest.entries.map((entry) => [entry.inchiKey, entry] as const),
  );
  const byInchiKey = new Map<string, SynthesisLearningStructureBundle>();
  const resolutions: SynthesisMaterialStructureResolution[] = [];
  for (const material of materials) {
    if (!material.exactIdentityResolved || !INCHI_KEY.test(material.inchiKey)) {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "identity_unresolved",
      });
      continue;
    }
    const entry = entryByInchiKey.get(material.inchiKey);
    if (!entry) {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "no_exact_catalog_identity",
      });
      continue;
    }
    if (entry.threeD.representation !== "rdkit_generated_conformer") {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "catalog_asset_provenance_invalid",
      });
      continue;
    }
    const bundle: SynthesisLearningStructureBundle = {
      materialId: material.id,
      inchiKey: material.inchiKey,
      twoD: {
        ...entry.twoD,
        publicPath: resolveCatalogAssetPath(entry.twoD.publicPath, assetBasePath),
      },
      threeD: {
        ...entry.threeD,
        publicPath: resolveCatalogAssetPath(entry.threeD.publicPath, assetBasePath),
      },
    };
    if (!hasExactComputedSynthesis3D(material, bundle)) {
      resolutions.push({
        materialId: material.id,
        inchiKey: material.inchiKey,
        state: "catalog_asset_provenance_invalid",
      });
      continue;
    }
    byInchiKey.set(material.inchiKey, bundle);
    resolutions.push({
      materialId: material.id,
      inchiKey: material.inchiKey,
      state: "resolved",
    });
  }
  return {
    byInchiKey,
    resolutions,
    exactComputed3DIdentityCount: byInchiKey.size,
  };
};
