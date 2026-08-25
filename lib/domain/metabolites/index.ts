import type { VerificationStatus } from "../evidence";
import type { MoleculeId, SourceId } from "../ids";
import type { EvidenceField } from "../dossier/evidence-field";

export type MetaboliteActivity =
  | "active"
  | "active-beta-blocker-preclinical"
  | "inactive"
  | "very-little-or-no-antisecretory"
  | "reactive-toxic"
  | "unknown";

export interface MetaboliteNodeProvenance {
  readonly sourceId: SourceId;
  readonly provider: string;
  readonly title: string;
  readonly externalId: string;
  readonly url: string;
}

export interface MetaboliteNode {
  readonly id: string;
  readonly moleculeId: MoleculeId | null;
  readonly label: EvidenceField<string>;
  readonly role: "parent" | "metabolite";
  /** Exact source-supported connectivity string used only to draw the 2D view. */
  readonly structure2dSmiles: EvidenceField<string> | null;
  /** Resolved by the application boundary; seed data must not invent URLs. */
  readonly provenance: MetaboliteNodeProvenance | null;
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
