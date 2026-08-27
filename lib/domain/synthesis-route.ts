export type SynthesisCoverageId = `synthesis-coverage:${string}`;
export type SynthesisSearchId = `synthesis-search:${string}`;
export type CanonicalSynthesisRouteId = `synthesis-route:${string}`;
export type CanonicalSynthesisStepId = `synthesis-route-step:${string}`;
export type CanonicalSynthesisMaterialId = `synthesis-material:${string}`;
export type SynthesisSourceEvidenceId = `synthesis-source-evidence:${string}`;

export const SYNTHESIS_ROUTE_TYPES = [
  "patent_reported",
  "literature_reported",
  "teaching_reconstruction",
  "computational_proposed",
] as const;

export type CanonicalSynthesisRouteType =
  (typeof SYNTHESIS_ROUTE_TYPES)[number];

export const SYNTHESIS_REVIEW_STATES = [
  "pending",
  "reviewed",
  "verified",
  "withdrawn",
] as const;

export type SynthesisReviewState = (typeof SYNTHESIS_REVIEW_STATES)[number];

export const SYNTHESIS_APPLICABILITY_STATES = [
  "applicable",
  "not_applicable",
  "unclear",
] as const;

export type SynthesisApplicability =
  (typeof SYNTHESIS_APPLICABILITY_STATES)[number];

export const SYNTHESIS_ROUTE_COMPLETENESS_STATES = [
  "complete",
  "partial",
  "upstream_gap",
  "convergent_partial",
] as const;

export type SynthesisRouteCompleteness =
  (typeof SYNTHESIS_ROUTE_COMPLETENESS_STATES)[number];

export const SYNTHESIS_LICENSE_STATES = [
  "permitted",
  "attribution_required",
  "link_only",
  "restricted",
  "mixed",
  "unknown",
] as const;

export type SynthesisLicenseState =
  (typeof SYNTHESIS_LICENSE_STATES)[number];

/**
 * Exact target identity copied from the catalog snapshot. A synthesis route is
 * never allowed to silently move between a parent, salt, solvate or
 * stereoisomer merely because their display names are similar.
 */
export interface SynthesisIdentityScope {
  readonly catalogEntityId: string;
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly casNumber: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly connectivityKey: string;
  readonly stereochemicalKey: string;
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string | null;
  readonly sourceFormSmiles: string;
  readonly parentEntity: {
    readonly id: string;
    readonly relation: "self" | "form-of-parent" | "form-of-unresolved-parent";
    readonly resolutionStatus: "self" | "resolved" | "unresolved";
    readonly exactIdentity: {
      readonly catalogEntityId: string | null;
      readonly pubChemCid: number;
      readonly inchiKey: string;
    } | null;
    readonly resolutionEvidenceIds: readonly SynthesisSourceEvidenceId[];
  };
  readonly chemicalForm: {
    readonly id: string;
    readonly sourceKind:
      | "single-component-source-form"
      | "multicomponent-source-form";
    readonly normalizedKind:
      | "free_parent"
      | "salt"
      | "hydrate"
      | "solvate"
      | "other"
      | "unresolved";
    readonly componentCount: number;
    readonly parentResolutionStatus:
      | "not_applicable"
      | "resolved"
      | "unresolved";
  };
  readonly stereoisomer: {
    readonly id: string;
    readonly specified: boolean;
  };
}

export type SynthesisSourceKind =
  | "patent"
  | "journal"
  | "aggregator"
  | "open_reaction_dataset";

export interface SynthesisSourceLocator {
  readonly kind:
    | "patent_example"
    | "patent_scheme"
    | "journal_scheme"
    | "journal_figure"
    | "journal_section"
    | "dataset_record";
  readonly value: string;
  readonly page: string | null;
  readonly scheme: string | null;
  readonly example: string | null;
}

/**
 * Discovery candidates remain distinct from resolved direct evidence. Search
 * result URLs may be retained for internal discovery, but only a resolved
 * direct document with a human-resolvable locator can support a route.
 */
export interface SynthesisSourceEvidence {
  readonly id: SynthesisSourceEvidenceId;
  readonly resolutionState: "candidate" | "resolved" | "rejected";
  readonly sourceId: `source:${string}` | null;
  readonly sourceKind: SynthesisSourceKind;
  readonly documentId: string;
  readonly patentFamilyId: string | null;
  readonly title: string;
  readonly url: string;
  readonly publicationYear: number | null;
  readonly retrievedAt: string;
  readonly documentSha256: string | null;
  readonly locator: SynthesisSourceLocator | null;
  readonly supportScope:
    | "identity_only"
    | "single_step"
    | "route_segment"
    | "complete_route";
  readonly licenseState: SynthesisLicenseState;
  readonly reuseMode:
    | "metadata_and_link_only"
    | "derived_facts_with_attribution"
    | "redistributable";
}

export interface CanonicalSynthesisMaterial {
  readonly id: CanonicalSynthesisMaterialId;
  readonly role:
    | "starting_material"
    | "intermediate"
    | "reagent_fragment"
    | "target_parent"
    | "target_form";
  readonly label: string;
  readonly identityResolution:
    | "exact_inchi_key"
    | "connectivity_only"
    | "name_only"
    | "unresolved";
  readonly canonicalSmiles: string | null;
  readonly isomericSmiles: string | null;
  readonly inchiKey: string | null;
  readonly sourceEvidenceIds: readonly SynthesisSourceEvidenceId[];
}

/** Atom references are pinned to the exact serialized structure they index. */
export interface CanonicalSynthesisAtomRef {
  readonly materialId: CanonicalSynthesisMaterialId;
  readonly atomMap: number;
  readonly element: string;
  readonly structureHash: string;
}

interface CanonicalSynthesisBondChangeBase {
  readonly kind: "formed" | "broken" | "order_changed";
  /** Source-bounded description; it is not an atom assignment. */
  readonly description: string;
}

export interface CanonicalSynthesisMappedBondChange
  extends CanonicalSynthesisBondChangeBase {
  readonly atoms: readonly [
    CanonicalSynthesisAtomRef,
    CanonicalSynthesisAtomRef,
  ];
  readonly beforeOrder: 0 | 1 | 1.5 | 2 | 3;
  readonly afterOrder: 0 | 1 | 1.5 | 2 | 3;
  readonly mappingState: "computed" | "reviewed";
}

/** A reported semantic change whose source does not locate exact atoms. */
export interface CanonicalSynthesisUnmappedBondChange
  extends CanonicalSynthesisBondChangeBase {
  readonly atoms: null;
  readonly beforeOrder: null;
  readonly afterOrder: null;
  readonly mappingState: "not_mapped";
}

export type CanonicalSynthesisBondChange =
  | CanonicalSynthesisMappedBondChange
  | CanonicalSynthesisUnmappedBondChange;

/** Form and protonation changes must not be misrepresented as covalent bonds. */
export interface CanonicalSynthesisStateChange {
  readonly kind:
    | "protonation"
    | "deprotonation"
    | "counterion_association"
    | "oxidation_state"
    | "stereochemical_state"
    | "tautomeric_state";
  readonly summary: string;
}

export interface CanonicalSynthesisStep {
  readonly id: CanonicalSynthesisStepId;
  readonly order: number;
  readonly inputMaterialIds: readonly CanonicalSynthesisMaterialId[];
  readonly outputMaterialIds: readonly CanonicalSynthesisMaterialId[];
  readonly title: string;
  readonly reactionClass: {
    readonly taxonomyId: string | null;
    readonly label: string;
    readonly normalizationState:
      | "normalized"
      | "candidate"
      | "unclassified";
  };
  readonly evidenceMode:
    | "direct_reported"
    | "source_context"
    | "reconstructed"
    | "computational";
  readonly sourceEvidenceIds: readonly SynthesisSourceEvidenceId[];
  readonly bondChanges: readonly CanonicalSynthesisBondChange[];
  readonly stateChanges: readonly CanonicalSynthesisStateChange[];
  readonly reviewState: SynthesisReviewState;
  readonly limitations: readonly string[];
}

export interface SynthesisRouteGap {
  readonly positionAfterStepId: CanonicalSynthesisStepId | null;
  readonly kind:
    | "upstream_precursor"
    | "missing_intermediate"
    | "unresolved_transformation"
    | "identity_conflict"
    | "source_conflict";
  readonly description: string;
}

export interface SynthesisReviewEvent {
  readonly reviewerId: string;
  readonly reviewerName: string;
  readonly role: "scientific_policy_authority" | "chemistry_reviewer";
  readonly routeVersion: string;
  readonly scopes: readonly (
    | "identity"
    | "nomenclature"
    | "route"
    | "reaction_class"
    | "atom_mapping"
    | "teaching_depth"
  )[];
  readonly decision: "approve" | "request_changes" | "reject" | "withdraw";
  readonly reviewedAt: string;
}

export interface CanonicalSynthesisRouteBase {
  readonly schemaVersion: 1;
  readonly id: CanonicalSynthesisRouteId;
  readonly coverageId: SynthesisCoverageId;
  readonly version: string;
  readonly identityScope: SynthesisIdentityScope;
  readonly applicability: SynthesisApplicability;
  readonly routeCompleteness: SynthesisRouteCompleteness;
  readonly reviewState: SynthesisReviewState;
  readonly licenseState: SynthesisLicenseState;
  readonly routeFamilyId: string;
  readonly variantKind:
    | "original_patent"
    | "literature"
    | "improved_process"
    | "asymmetric_chiral"
    | "alternative";
  readonly publicationYear: number | null;
  readonly title: string;
  /** Completeness is scoped to this explicit start boundary, not all upstream chemistry. */
  readonly startBoundary: string;
  /** Route-specific strategy; never inferred from @/@@ notation alone. */
  readonly stereochemicalStrategy: string;
  readonly targetMaterialId: CanonicalSynthesisMaterialId;
  readonly materials: readonly CanonicalSynthesisMaterial[];
  readonly steps: readonly CanonicalSynthesisStep[];
  readonly gaps: readonly SynthesisRouteGap[];
  readonly sourceEvidenceIds: readonly SynthesisSourceEvidenceId[];
  readonly reviewEvents: readonly SynthesisReviewEvent[];
  readonly safety: {
    readonly operationalDetailsIncluded: false;
  };
}

export interface CanonicalReportedSynthesisRoute
  extends CanonicalSynthesisRouteBase {
  readonly routeType: "patent_reported" | "literature_reported";
  /** Sources that explicitly report this declared route, rather than fragments. */
  readonly reportedCompleteRouteSourceIds: readonly [
    SynthesisSourceEvidenceId,
    ...SynthesisSourceEvidenceId[],
  ];
}

export interface CanonicalTeachingReconstructionRoute
  extends CanonicalSynthesisRouteBase {
  readonly routeType: "teaching_reconstruction";
  readonly segments: readonly {
    readonly stepIds: readonly [
      CanonicalSynthesisStepId,
      ...CanonicalSynthesisStepId[],
    ];
    readonly sourceEvidenceIds: readonly [
      SynthesisSourceEvidenceId,
      ...SynthesisSourceEvidenceId[],
    ];
  }[];
}

export interface CanonicalComputationalProposedRoute
  extends CanonicalSynthesisRouteBase {
  readonly routeType: "computational_proposed";
  readonly proposal: {
    readonly engine: string;
    readonly engineVersion: string;
    readonly runId: string;
    readonly generatedAt: string;
    readonly inputHash: string;
    readonly confidence: number | null;
  };
}

export type CanonicalSynthesisRoute =
  | CanonicalReportedSynthesisRoute
  | CanonicalTeachingReconstructionRoute
  | CanonicalComputationalProposedRoute;
