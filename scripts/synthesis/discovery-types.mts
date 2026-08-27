import type {
  SynthesisCoverageRecord,
  SynthesisSearchProviderAttempt,
} from "../../lib/domain/synthesis-coverage";
import type {
  SynthesisSourceEvidence,
  SynthesisSourceEvidenceId,
} from "../../lib/domain/synthesis-route";
import type { SynthesisDiscoverySubject } from "./catalog-input.mjs";

export type SynthesisDiscoveryAdapterId =
  | "pubchem-manufacturing"
  | "europe-pmc"
  | "europe-pmc-patents"
  | "open-reaction-database";

/**
 * A deliberately non-operational participant projection from one ORD record.
 * Amounts, conditions, workups, yields and procedures are never copied into
 * the discovery candidate envelope.
 */
export interface SynthesisReactionFragmentParticipant {
  readonly role:
    | "reactant"
    | "reagent"
    | "solvent"
    | "catalyst"
    | "workup"
    | "product"
    | "byproduct"
    | "side_product"
    | "unspecified";
  readonly name: string | null;
  readonly smiles: string | null;
  readonly inchi: string | null;
  readonly inchiKey: string | null;
  readonly casNumber: string | null;
  readonly pubChemCid: string | null;
  readonly identityResolution:
    | "exact_inchi_key"
    | "inchi"
    | "structure_only"
    | "name_only"
    | "unresolved";
}

/**
 * A normalized exact-product discovery hit is a candidate fragment, never a
 * canonical reported, teaching or computational route. It must pass original
 * source resolution, atom mapping and scientific review before promotion into
 * any canonical synthesis content.
 */
export interface SynthesisReactionFragmentCandidate {
  readonly schemaVersion: 1;
  readonly candidateKind: "single_step_reaction_fragment";
  readonly candidateState: "candidate";
  readonly reviewState: "pending";
  readonly decodeState: "decoded" | "missing_proto" | "decode_failed";
  readonly routeCompleteness: "partial" | "upstream_gap";
  readonly inputs: readonly SynthesisReactionFragmentParticipant[];
  readonly products: readonly SynthesisReactionFragmentParticipant[];
  readonly reactionClass: {
    readonly taxonomyId: null;
    readonly label: "Unclassified";
    readonly normalizationState: "unclassified";
  };
  readonly bondChanges: {
    readonly mappingState: "not_mapped";
    readonly formed: readonly [];
    readonly broken: readonly [];
    readonly orderChanged: readonly [];
  };
  readonly provenance: {
    readonly datasetId: string | null;
    readonly reactionId: string | null;
    readonly doi: string | null;
    readonly patent: string | null;
    readonly publicationUrl: string | null;
    readonly isMined: boolean | null;
  };
  readonly sourceEvidence: {
    readonly evidenceId: SynthesisSourceEvidenceId | null;
    readonly resolutionState: "candidate";
    readonly sourceKind: "open_reaction_dataset";
  };
  readonly licenseState: "attribution_required";
  readonly reuseMode: "derived_facts_with_attribution";
  readonly operationalDetailsIncluded: false;
  readonly limitations: readonly string[];
}

export interface SynthesisDiscoveryAdapterResult {
  readonly adapterId: SynthesisDiscoveryAdapterId;
  readonly attempt: SynthesisSearchProviderAttempt;
  readonly evidence: readonly SynthesisSourceEvidence[];
  /** Provider metadata only; never copied publisher prose or experimental recipes. */
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SynthesisDiscoverySubjectResult {
  readonly schemaVersion: 1;
  readonly pipelineVersion: string;
  readonly configurationHash: string;
  readonly subject: SynthesisDiscoverySubject;
  readonly coverage: SynthesisCoverageRecord;
  readonly evidence: readonly SynthesisSourceEvidence[];
  readonly adapters: readonly SynthesisDiscoveryAdapterResult[];
  readonly completedAt: string;
}

export interface SynthesisDiscoveryRunManifest {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly pipelineVersion: string;
  readonly configurationHash: string;
  readonly catalogSnapshotId: string;
  readonly subjectCount: number;
  readonly completedSubjectCount: number;
  readonly assessedSubjectCount: number;
  readonly searchingSubjectCount: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly adapters: readonly {
    readonly id: SynthesisDiscoveryAdapterId;
    readonly version: string;
    readonly required: true;
  }[];
}
