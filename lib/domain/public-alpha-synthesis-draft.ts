import type { SynthesisCoverageId } from "./synthesis-route";

export const PUBLIC_ALPHA_SYNTHESIS_DRAFT_CHANNEL =
  "public_alpha_source_supported_draft" as const;

export type PublicAlphaSynthesisDraftCompleteness =
  | "partial"
  | "upstream_gap"
  | "convergent_partial";

/**
 * Browser-safe pointer to a separately gated, pending-review educational
 * graph. It is deliberately not a CanonicalSynthesisRoute reference.
 */
export interface PublicAlphaSynthesisDraftReference {
  readonly schemaVersion: 1;
  readonly graphId: `synthesis-draft-graph:${string}`;
  readonly channel: typeof PUBLIC_ALPHA_SYNTHESIS_DRAFT_CHANNEL;
  readonly publicationState: "source_supported_draft";
  readonly reviewState: "pending";
  readonly verifiedScientificClaim: false;
  readonly coverageId: SynthesisCoverageId;
  readonly routeCompleteness: PublicAlphaSynthesisDraftCompleteness;
  readonly draftRouteCount: number;
  readonly extractedStepCount: number;
  readonly teachingReconstructionCount: number;
  readonly resolvedIntermediateCount: number;
  readonly unresolvedGapCount: number;
  readonly licenseState: "attribution_required";
  readonly detailPath: `/catalog/synthesis/drafts/${string}.json`;
}

export interface PublicAlphaSynthesisDraftMaterial {
  readonly id: `synthesis-draft-material:${string}`;
  readonly label: string;
  readonly displayRole: "source_input" | "route_intermediate" | "exact_target";
  readonly sourceSmiles: string;
  readonly inchiKey: string;
  readonly identityResolution: "exact_inchi_key_computed";
  readonly structureRepresentation: "independent_smiles_redraw";
}

export interface PublicAlphaSynthesisDraftCitation {
  readonly id: `synthesis-draft-citation:${string}`;
  readonly sourceKind: "open_reaction_dataset";
  readonly sourceDocumentId: string;
  readonly label: string;
  readonly url: string;
  readonly locator: {
    readonly kind: "dataset_record";
    readonly value: string;
  };
  readonly supportScope: "single_step";
  readonly license: {
    readonly state: "attribution_required";
    readonly identifier: "CC-BY-SA-4.0";
    readonly attribution: string;
  };
  readonly sourceTextReused: false;
  readonly sourceFigureOrSchemeReused: false;
}

export interface PublicAlphaSynthesisDraftStep {
  readonly id: `synthesis-draft-step:${string}`;
  readonly relationship: "target_forming_segment" | "upstream_source_segment";
  readonly inputMaterialIds: readonly `synthesis-draft-material:${string}`[];
  readonly outputMaterialIds: readonly `synthesis-draft-material:${string}`[];
  readonly transformationClass: {
    readonly label: "Unclassified";
    readonly resolutionState: "not_computed";
  };
  readonly reactionOrderState: "not_resolved";
  readonly formedBondState: "not_resolved";
  readonly brokenBondState: "not_resolved";
  readonly atomMappingState: "not_mapped";
  readonly evidenceMode: "direct_structured_dataset_segment";
  readonly citationId: `synthesis-draft-citation:${string}`;
  readonly reviewState: "pending";
  readonly operationalDetailsIncluded: false;
}

export interface PublicAlphaSynthesisDraftBridge {
  readonly id: `synthesis-draft-bridge:${string}`;
  readonly fromStepId: `synthesis-draft-step:${string}`;
  readonly toStepId: `synthesis-draft-step:${string}`;
  readonly boundaryMaterialId: `synthesis-draft-material:${string}`;
  readonly identityMatch: "exact_inchi_key";
  readonly editorialBridge: "teaching_reconstruction";
  readonly reportedAsOneCompleteRoute: false;
}

export interface PublicAlphaSynthesisDraftAlternative {
  readonly id: `synthesis-draft-alternative:${string}`;
  readonly finalStepId: `synthesis-draft-step:${string}`;
  readonly upstreamStepIds: readonly `synthesis-draft-step:${string}`[];
  readonly routeType: "source_supported_fragment" | "teaching_reconstruction";
  readonly routeCompleteness: PublicAlphaSynthesisDraftCompleteness;
  readonly unresolvedGapCount: 1;
}

export interface PublicAlphaSynthesisDraftGraph {
  readonly schemaVersion: 1;
  readonly graphId: PublicAlphaSynthesisDraftReference["graphId"];
  readonly channel: typeof PUBLIC_ALPHA_SYNTHESIS_DRAFT_CHANNEL;
  readonly publicationState: "source_supported_draft";
  readonly publicationLabel: {
    readonly tr: "KAYNAK DESTEKLİ TASLAK — UZMAN İNCELEMESİ BEKLİYOR";
    readonly en: "SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING";
  };
  readonly catalogSnapshotId: string;
  readonly generatedAt: string;
  readonly identity: {
    readonly coverageId: SynthesisCoverageId;
    readonly catalogEntityId: string;
    readonly preferredName: string;
    readonly pubChemCid: number;
    readonly inchiKey: string;
    readonly chemicalForm: string;
    readonly stereochemistrySpecified: boolean;
  };
  readonly assurance: {
    readonly reviewState: "pending";
    readonly expertReviewRequired: true;
    readonly verifiedScientificClaim: false;
    readonly exactTargetIdentity: true;
    readonly formConflict: false;
    readonly stereochemistryConflict: false;
    readonly operationalDetailsIncluded: false;
    readonly contentOrigin: "independent_smiles_redraw";
    readonly rightsDecisionState: "approved_for_independent_redraw_with_attribution";
    readonly rightsPolicyVersion: "ord-independent-redraw-1.0.0";
    readonly sourceTextReused: false;
    readonly sourceFigureOrSchemeReused: false;
  };
  readonly routeCompleteness: PublicAlphaSynthesisDraftCompleteness;
  readonly materials: readonly PublicAlphaSynthesisDraftMaterial[];
  readonly steps: readonly PublicAlphaSynthesisDraftStep[];
  readonly bridges: readonly PublicAlphaSynthesisDraftBridge[];
  readonly alternatives: readonly PublicAlphaSynthesisDraftAlternative[];
  readonly citations: readonly PublicAlphaSynthesisDraftCitation[];
  readonly limitations: readonly string[];
}

export interface PublicAlphaSynthesisDraftAssemblyReport {
  readonly schemaVersion: 1;
  readonly pipelineVersion: "synthesis-route-assembly-1.0.0";
  readonly generatedAt: string;
  readonly catalogCoverageCount: number;
  readonly directSourceSegmentsExamined: number;
  readonly directSourceSegmentsAdmitted: number;
  readonly directSourceSegmentsRejected: number;
  readonly sourceLocatorCandidateDocumentsExamined: number;
  readonly sourceLocatorCandidateDocumentsPromotedToSteps: 0;
  readonly accessibleFullTextDocumentsPreviouslyInspected: number;
  readonly publicDraftRoutes: number;
  readonly partialRoutes: number;
  readonly routeGraphs: number;
  readonly extractedSteps: number;
  readonly resolvedIntermediates: number;
  readonly exactTeachingBridgeCount: number;
  readonly unresolvedGaps: number;
  readonly teachingReconstructions: number;
  readonly reviewedRoutes: 0;
  readonly coverageSurfaceCounts: {
    readonly public_draft_partial: number;
    readonly candidate_only: number;
    readonly no_supporting_source_resolved: number;
  };
  readonly byCompleteness: Readonly<Record<PublicAlphaSynthesisDraftCompleteness, number>>;
  readonly candidateOnlyBoundary: string;
  readonly invariants: {
    readonly noNewDiscoveryPerformed: true;
    readonly everyPublishedStepHasExactTargetAssociation: true;
    readonly everyPublishedStepHasExactLocator: true;
    readonly everyPublishedStructureIsIndependentRedrawInput: true;
    readonly operationalDetailsPublished: false;
    readonly pendingDisplayedAsReviewedOrVerified: false;
  };
}
