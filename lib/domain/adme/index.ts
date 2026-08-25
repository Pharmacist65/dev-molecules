import type { VerificationStatus } from "../evidence";
import type {
  ChemicalFormId,
  MoleculeId,
  RegulatoryProductId,
  SourceId,
} from "../ids";
import type { EvidenceField } from "../dossier/evidence-field";
import type { MetaboliteEdge } from "../metabolites";

export type AdmePhase =
  | "absorption"
  | "distribution"
  | "metabolism"
  | "excretion";

export interface AdmeEvidenceField<T = string | number>
  extends EvidenceField<T> {
  readonly id: string;
  readonly phase: AdmePhase;
  readonly label: string;
}

export interface AdministrationContext {
  readonly route: EvidenceField<string>;
  readonly formulation: EvidenceField<string> | null;
}

export interface AdmeProfile {
  readonly id: string;
  readonly molecularEntityId: MoleculeId;
  readonly chemicalFormId?: ChemicalFormId;
  readonly regulatoryProductId?: RegulatoryProductId;
  readonly administration: AdministrationContext;
  readonly absorption: readonly AdmeEvidenceField[];
  readonly distribution: readonly AdmeEvidenceField[];
  readonly metabolism: readonly AdmeEvidenceField[];
  readonly excretion: readonly AdmeEvidenceField[];
  readonly halfLife?: AdmeEvidenceField<number | string> | null;
  readonly bioavailability?: AdmeEvidenceField<number | string> | null;
  readonly proteinBinding?: AdmeEvidenceField<number | string> | null;
  readonly volumeOfDistribution?: AdmeEvidenceField<number | string> | null;
  readonly clearance?: AdmeEvidenceField<number | string> | null;
  readonly metabolites: readonly MetaboliteEdge[];
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
  readonly evidenceAvailability: "reviewed" | "source-supported" | "context-only";
  readonly limitations: readonly string[];
}
