import type { ChemicalForm, MoleculeRecord } from "../molecule";
import type { MoleculeId, SourceId } from "../ids";
import type { AdmeProfile } from "../adme";
import type { ClassificationProfile } from "../classifications";
import type { MetaboliteGraph } from "../metabolites";
import type { PharmacologyProfile } from "../pharmacology";
import type { FlagshipDossierContent } from "./flagship";
import type {
  DossierCoverageIndicator,
  EvidenceField,
  ResolvedDossierSource,
} from "./evidence-field";

export * from "./evidence-field";
export * from "./flagship";

export type DossierMode = "story" | "reference";

export interface DossierStructureAsset {
  readonly dimension: "2d" | "3d";
  readonly publicPath: string;
  readonly sourceUrl: string;
  readonly origin: string;
  readonly sourceId: SourceId;
}

export interface DossierChemistryOverview {
  readonly systematicName: EvidenceField<string> | null;
  readonly molecularFormula: EvidenceField<string>;
  readonly molecularWeight: EvidenceField<number>;
  readonly canonicalSmiles: EvidenceField<string>;
  readonly isomericSmiles: EvidenceField<string> | null;
  readonly inchiKey: EvidenceField<string>;
  readonly stereochemistry: EvidenceField<string> | null;
  readonly chemicalForms: readonly ChemicalForm[];
  readonly structures: readonly DossierStructureAsset[];
  /** No descriptor is calculated inside the UI layer. */
  readonly unavailableDescriptorKeys: readonly string[];
}

export interface DrugDossierRecord {
  readonly id: `dossier:${string}`;
  readonly moleculeId: MoleculeId;
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly chemistry: DossierChemistryOverview;
  readonly classifications: ClassificationProfile;
  readonly pharmacology: PharmacologyProfile;
  readonly admeProfiles: readonly AdmeProfile[];
  readonly metabolites: MetaboliteGraph;
  readonly coverage: readonly DossierCoverageIndicator[];
  readonly sources: readonly ResolvedDossierSource[];
  readonly limitations: readonly string[];
  /** Null for breadth-only records; populated only by the audited flagship registry. */
  readonly flagship: FlagshipDossierContent | null;
  readonly notForClinicalUse: true;
  /** Kept for integration with existing structure and learning components. */
  readonly sourceRecord: MoleculeRecord;
}
