import type { VerificationStatus } from "../evidence";
import type { MoleculeId, SourceId } from "../ids";
import type { EvidenceField } from "../dossier/evidence-field";

export type MetaboliteActivity =
  | "active"
  | "inactive"
  | "reactive-toxic"
  | "unknown";

export interface MetaboliteNode {
  readonly id: string;
  readonly moleculeId: MoleculeId | null;
  readonly label: EvidenceField<string>;
  readonly role: "parent" | "metabolite";
  readonly structure2dPath: string | null;
  readonly structure3dPath: string | null;
}

export interface MetaboliteEdge {
  readonly id: string;
  readonly parentNodeId: string;
  readonly metaboliteNodeId: string;
  readonly enzyme: EvidenceField<string> | null;
  readonly transformationClass: EvidenceField<string>;
  readonly activity: EvidenceField<MetaboliteActivity>;
  readonly sourceIds: readonly SourceId[];
  readonly reviewStatus: VerificationStatus;
}

export interface MetaboliteGraph {
  readonly moleculeId: MoleculeId;
  readonly nodes: readonly MetaboliteNode[];
  readonly edges: readonly MetaboliteEdge[];
  readonly availability: "reviewed" | "source-supported" | "unavailable";
  readonly unavailableReason: string | null;
}
