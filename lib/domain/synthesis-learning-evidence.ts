export type SynthesisLearningMaterialId = string;

export interface ExactSynthesisLearningIdentity {
  readonly catalogEntityId: string;
  readonly catalogSnapshotId: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly identityMatch: "exact_inchi_key";
}

export interface ExactSynthesisLearningStepIdentity {
  readonly stepId: string;
  readonly targetIdentity: ExactSynthesisLearningIdentity;
}

export type SynthesisLearningEvidenceSupportScope =
  | "exact_step_mechanism"
  | "reaction_class_assignment"
  | "structured_fact";

/**
 * Browser-safe, normalized evidence association. Admission code must still
 * resolve the matching review decision before exposing a scientific claim.
 */
export interface SynthesisLearningEvidenceRegistryEntry {
  readonly id: string;
  readonly stepIdentity: ExactSynthesisLearningStepIdentity;
  readonly sourceDocumentId: string;
  readonly sourceUrl: string;
  readonly sourceLocator: string;
  readonly supportScopes: readonly SynthesisLearningEvidenceSupportScope[];
  readonly reactionClassId: ReactionClassEducationEntry["reactionClassId"] | null;
  readonly structuredFactIds: readonly StructuredSynthesisFact["id"][];
}

export interface SynthesisLearningEvidenceRegistry {
  readonly schemaVersion: 1;
  readonly entries: readonly SynthesisLearningEvidenceRegistryEntry[];
}

export interface SynthesisLearningEvidenceReviewDecision {
  readonly id: string;
  readonly evidenceId: SynthesisLearningEvidenceRegistryEntry["id"];
  readonly stepIdentity: ExactSynthesisLearningStepIdentity;
  readonly reviewState: "pending" | "reviewed" | "verified" | "withdrawn";
}

export interface SynthesisLearningEvidenceReviewRegistry {
  readonly schemaVersion: 1;
  readonly decisions: readonly SynthesisLearningEvidenceReviewDecision[];
}

export interface IndependentSynthesis2DRedraw {
  readonly status: "available";
  readonly representation: "independent_smiles_redraw";
  readonly sourceSmiles: string;
  readonly inchiKey: string;
  readonly identityResolution: "exact_inchi_key_computed";
  readonly sourceFigureOrSchemeReused: false;
}

export interface CatalogSynthesis2DAsset {
  readonly status: "available";
  readonly representation: "catalog_2d_record";
  readonly assetId: `catalog-structure:2d:${string}`;
  readonly publicPath: string;
  readonly sourceUrl: string;
  readonly sha256: string;
  readonly origin: "database-2d-record";
  readonly provenance: "source_record";
  readonly identity: ExactSynthesisLearningIdentity;
}

export interface ComputedSynthesis3DProvenance {
  readonly kind: "computed";
  readonly generator: "PubChem computed conformer service";
  /** The checked catalog snapshot does not disclose these generator details. */
  readonly generatorVersion: null;
  readonly parameters: null;
  readonly generatedAt: null;
  readonly structureHash: string;
  /** Exact-identity anchor only; it is not asserted to be the conformer generator input. */
  readonly source2DId: CatalogSynthesis2DAsset["assetId"];
  readonly source2DRelationship:
    "exact_identity_anchor_not_disclosed_generator_input";
  readonly energyMinimizationState: "not_disclosed_by_source";
  readonly experimentalStructure: false;
  readonly crystalStructure: false;
  readonly bioactiveConformation: false;
}

export interface CatalogComputedSynthesis3DAsset {
  readonly status: "available";
  readonly representation: "catalog_computed_conformer";
  readonly assetId: `catalog-structure:3d:${string}`;
  readonly publicPath: string;
  readonly sourceUrl: string;
  readonly sha256: string;
  readonly origin: "computed-3d-conformer";
  readonly identity: ExactSynthesisLearningIdentity;
  readonly provenance: ComputedSynthesis3DProvenance;
}

export interface RdkitComputedSynthesis3DParameters {
  readonly embeddingMethod: "ETKDGv3";
  readonly randomSeed: number;
  readonly randomSeedStrategy: "sha256_inchi_key_first_31_bits_nonzero";
  readonly enforceChirality: true;
  readonly useRandomCoords: false;
  readonly useSmallRingTorsions: true;
  readonly useMacrocycleTorsions: true;
  readonly useMacrocycle14config: true;
  readonly useExpTorsionAnglePrefs: true;
  readonly useBasicKnowledge: true;
  readonly embedFragmentsSeparately: true;
  readonly numThreads: 1;
  readonly explicitHydrogens: true;
  readonly sdfCoordinateDecimalPlaces: 4;
  readonly nonplanarityMetric:
    "unweighted_all_atom_best_fit_plane_rms_angstrom";
  readonly nonplanarityThresholdAngstrom: 0.001;
  readonly minimizationPreference: "MMFF94s_then_UFF";
  readonly maxMinimizationIterations: 500;
}

export type RdkitEnergyMinimizationState =
  | "mmff94s_converged"
  | "mmff94s_iteration_limit"
  | "uff_converged"
  | "uff_iteration_limit"
  | "embedded_not_minimized_no_supported_force_field";

export interface RdkitComputedSynthesis3DProvenance {
  readonly kind: "computed";
  readonly generator: "RDKit ETKDGv3";
  readonly generatorVersion: "2026.03.5";
  readonly parameters: RdkitComputedSynthesis3DParameters;
  readonly generatedAt: string;
  readonly structureHash: string;
  readonly source2DId: CatalogSynthesis2DAsset["assetId"];
  readonly source2DRelationship: "generator_input";
  readonly energyMinimizationState: RdkitEnergyMinimizationState;
  readonly minimizedEnergy: number | null;
  readonly experimentalStructure: false;
  readonly crystalStructure: false;
  readonly bioactiveConformation: false;
}

export interface RdkitGeneratedSynthesis3DAsset {
  readonly status: "available";
  readonly representation: "rdkit_generated_conformer";
  readonly assetId: `synthesis-generated-structure:3d:${string}`;
  readonly publicPath: string;
  readonly sourceUrl: "https://www.rdkit.org/docs/GettingStartedInPython.html";
  readonly sha256: string;
  readonly origin: "computed-3d-conformer";
  readonly identity: ExactSynthesisLearningIdentity;
  readonly provenance: RdkitComputedSynthesis3DProvenance;
}

export type ComputedSynthesis3DAsset =
  | CatalogComputedSynthesis3DAsset
  | RdkitGeneratedSynthesis3DAsset;

export type Synthesis3DUnavailableReason =
  | "identity_unresolved"
  | "no_exact_catalog_identity"
  | "ambiguous_catalog_identity"
  | "catalog_asset_provenance_invalid"
  | "computed_conformer_unavailable";

export interface UnavailableSynthesis3DAsset {
  readonly status: "unavailable";
  readonly representation: "none";
  readonly reason: Synthesis3DUnavailableReason;
  readonly syntheticFallbackCreated: false;
}

export interface SynthesisLearningStructureBundle {
  readonly materialId: SynthesisLearningMaterialId;
  readonly inchiKey: string;
  readonly twoD: IndependentSynthesis2DRedraw | CatalogSynthesis2DAsset;
  readonly threeD: ComputedSynthesis3DAsset | UnavailableSynthesis3DAsset;
}

export type SynthesisStep3DGate =
  | {
      readonly state: "allowed";
      readonly reason: "exact_computed_conformer";
      readonly materialId: SynthesisLearningMaterialId;
      readonly inchiKey: string;
      readonly asset: ComputedSynthesis3DAsset;
    }
  | {
      readonly state: "2d_only";
      readonly reason:
        | "not_step_output"
        | "identity_unresolved"
        | Synthesis3DUnavailableReason;
      readonly materialId: SynthesisLearningMaterialId | null;
      readonly inchiKey: string | null;
      readonly asset: null;
    };

export type SynthesisMechanismVisualizationState =
  | "unavailable"
  | "general_reaction_class"
  | "source_supported_unmapped"
  | "mapped_molecule_specific";

export interface ReactionClassEducationSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly locator: string;
  readonly licenseState:
    | "permitted"
    | "attribution_required"
    | "link_only";
  readonly reviewState: "pending" | "reviewed" | "verified";
}

export interface ReactionClassEducationEntry {
  readonly reactionClassId: `reaction-class:${string}`;
  readonly canonicalName: string;
  readonly names: {
    readonly tr: string;
    readonly en: string;
  };
  readonly generalTransformation: string;
  readonly typicalNucleophile: string | null;
  readonly typicalElectrophile: string | null;
  readonly leavingGroupPattern: string | null;
  readonly mechanismStages: readonly string[];
  readonly stereochemicalNotes: readonly string[];
  readonly limitations: readonly string[];
  readonly educationSources: readonly ReactionClassEducationSource[];
  readonly version: string;
  readonly genericMechanismDisclaimer:
    "General reaction-class mechanism; it was not reported as the mechanism by this specific step source.";
}

export interface ReactionClassEducationLibrary {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly observedClassSetState: "resolved" | "unresolved";
  readonly observedReactionClassIds: readonly ReactionClassEducationEntry["reactionClassId"][];
  readonly entries: readonly ReactionClassEducationEntry[];
}

interface SynthesisMechanismAssuranceBase {
  readonly reactionFamily: string | null;
  readonly nucleophile: string | null;
  readonly electrophile: string | null;
  readonly leavingGroup: string | null;
  readonly bondFormationOrBreakage: string | null;
  readonly functionalGroupTransformation: string | null;
  readonly regioOrStereochemicalOutcome: string | null;
  readonly commonMisconception: string;
  readonly curvedArrowEligible: boolean;
  readonly visualizationState: SynthesisMechanismVisualizationState;
  readonly sourceEvidenceIds: readonly string[];
  readonly educationSourceIds: readonly string[];
}

export interface UnresolvedSynthesisMechanism
  extends SynthesisMechanismAssuranceBase {
  readonly assurance: "mechanism_not_resolved";
  readonly reviewState: "unavailable";
  readonly specificStepSourceReportsMechanism: false;
  readonly reactionClassEducationalOnly: false;
  readonly curvedArrowEligible: false;
  readonly visualizationState: "unavailable";
}

export interface ReactionClassEducationalMechanism
  extends SynthesisMechanismAssuranceBase {
  readonly assurance: "reaction_class_educational_mechanism";
  readonly reviewState: "pending" | "reviewed" | "verified";
  readonly reactionClassId: string;
  readonly reactionClassLibraryVersion: string;
  readonly specificStepSourceReportsMechanism: false;
  readonly reactionClassEducationalOnly: true;
  readonly curvedArrowEligible: false;
  readonly visualizationState: "general_reaction_class";
  readonly disclaimer:
    "General reaction-class mechanism; it was not reported as the mechanism by this specific step source.";
}

export interface SourceSupportedSynthesisMechanism
  extends SynthesisMechanismAssuranceBase {
  readonly assurance: "source_supported_mechanism";
  readonly reviewState: "pending" | "reviewed" | "verified";
  readonly sourceLocator: string;
  readonly specificStepSourceReportsMechanism: true;
  readonly reactionClassEducationalOnly: false;
  readonly visualizationState:
    | "source_supported_unmapped"
    | "mapped_molecule_specific";
}

export type SynthesisMechanismAssuranceRecord =
  | UnresolvedSynthesisMechanism
  | ReactionClassEducationalMechanism
  | SourceSupportedSynthesisMechanism;

export type StructuredSynthesisFactKind =
  | "step_order"
  | "reaction_class"
  | "formed_bond"
  | "changed_functional_group"
  | "precursor_identity"
  | "scaffold_contribution"
  | "target_form_relation";

export interface StructuredSynthesisFact {
  readonly id: `synthesis-fact:${string}`;
  readonly stepIdentity: ExactSynthesisLearningStepIdentity;
  readonly kind: StructuredSynthesisFactKind;
  readonly value: string;
  readonly resolutionState: "resolved" | "unresolved";
  readonly origin: "source_supported" | "educational" | "predicted";
  readonly exactIdentityResolved: boolean;
  readonly sourceEvidenceIds: readonly string[];
  readonly sourceLocator: string | null;
  readonly reviewState: "pending" | "reviewed" | "verified" | "withdrawn";
}

export type StructuredSynthesisTaskKind =
  | "choose_next_step"
  | "choose_reaction_class"
  | "identify_formed_bond"
  | "identify_functional_group_change"
  | "choose_precursor"
  | "identify_scaffold_contribution"
  | "distinguish_target_form";

export interface StructuredSynthesisQuizGate {
  readonly state: "eligible" | "ineligible";
  readonly eligibleTaskKinds: readonly StructuredSynthesisTaskKind[];
  readonly admittedFactIds: readonly StructuredSynthesisFact["id"][];
  readonly rejectedFactIds: readonly StructuredSynthesisFact["id"][];
  readonly llmChemistryFactGenerationAllowed: false;
}

export interface SynthesisLearningCapabilityCounts {
  readonly materialsWithCatalogComputed3D: number;
  readonly sourceSupportedMechanisms: number;
  readonly reactionClassEducationalMechanisms: number;
  readonly mappedMoleculeSpecificMechanisms: number;
  readonly structuredLearningTasks: number;
}

export interface SynthesisIntermediate3DManifestEntry {
  readonly inchiKey: string;
  readonly catalogEntityId: string;
  readonly catalogSnapshotId: string;
  readonly pubChemCid: number;
  readonly materialRole: "pending_route_boundary_material";
  readonly materialRoleReviewState: "pending";
  readonly materialRoleDisclosure:
    "Exact-identity route-boundary material; intermediate role pending scientific review.";
  readonly twoD: CatalogSynthesis2DAsset;
  readonly threeD: ComputedSynthesis3DAsset;
  readonly routeAlternativeIds: readonly string[];
}

export interface SynthesisIntermediate3DGenerationFailure {
  readonly inchiKey: string;
  readonly reason: string;
  /** Failed strict generation remains 2D-only; no unvalidated 3D is substituted. */
  readonly fallbackState: "two_d_only_fail_closed";
}

export interface SynthesisIntermediate3DManifest {
  readonly schemaVersion: 1;
  readonly pipelineVersion: "synthesis-intermediate-computed-3d-2.0.0";
  readonly catalogSnapshotId: string;
  readonly generatedAt: string;
  readonly summary: {
    readonly observedExactRouteBoundaryMaterialIdentityCount: number;
    readonly computedRouteBoundaryMaterial3dAssetCount: number;
    readonly rdkitGeneratedRouteBoundaryMaterial3dAssetCount: number;
    readonly catalogComputedFallback3dAssetCount: number;
    readonly rdkitGenerationFailureCount: number;
    readonly routeAlternativesWithComputedIntermediate3d: number;
    readonly unresolvedRouteBoundaryMaterialIdentityCount: number;
  };
  readonly entries: readonly SynthesisIntermediate3DManifestEntry[];
  readonly unresolvedInchiKeys: readonly string[];
  readonly generationFailures: readonly SynthesisIntermediate3DGenerationFailure[];
  readonly boundaries: {
    readonly exactInchiKeyRequired: true;
    readonly catalog2dPairRequired: true;
    readonly computedProvenanceRequired: true;
    readonly catalogFallback3dSource2dRelationship:
      "exact_identity_anchor_not_disclosed_generator_input";
    readonly rdkitGenerated3dSource2dRelationship: "generator_input";
    readonly rdkitGeneratorVersion: "2026.03.5";
    readonly rdkitParametersRecorded: true;
    readonly routeBoundaryMaterialRoleState: "pending_review";
    readonly routeBoundaryMaterialDisclosure:
      "Exact-identity route-boundary material; intermediate role pending scientific review.";
    readonly missingGeneratorDetailsInvented: false;
    readonly experimentalStructureClaimed: false;
    readonly syntheticIntermediateFallbackCreated: false;
    readonly generationFailurePolicy: "two_d_only_fail_closed";
  };
}
