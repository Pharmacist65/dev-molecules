export type CatalogJurisdiction = "US" | "EU" | "JP";

export type CatalogAdapterId =
  | "drugcentral-approved"
  | "drugcentral-structures"
  | "pubchem-pug-rest"
  | "openfda-drugsfda"
  | "ema-future"
  | "pmda-future";

export interface CatalogSourceDescriptor {
  readonly id: string;
  readonly adapter: CatalogAdapterId;
  readonly sourceUrl: string;
  readonly licenseUrl: string;
  readonly capturedAt: string;
  readonly sourceLastModified: string | null;
  readonly sha256: string | null;
  readonly totalSourceRows: number | null;
  readonly selectedRows: number;
  readonly role: "identity" | "structure" | "regulatory";
}

export interface DrugCentralApprovalRow {
  readonly drugCentralId: number;
  readonly name: string;
}

export interface DrugCentralStructureRow {
  readonly drugCentralId: number;
  readonly inn: string;
  readonly smiles: string;
  readonly inchi: string;
  readonly inchiKey: string;
  readonly casNumber: string | null;
}

export interface PubChemPropertyRow {
  readonly cid: number;
  readonly title: string | null;
  readonly molecularFormula: string;
  readonly molecularWeight: number;
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string | null;
  readonly inchiKey: string;
}

export interface CatalogStructureAsset {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly sourceUrl: string;
}

export interface CatalogSnapshotRecord {
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly approval: DrugCentralApprovalRow;
  readonly structure: DrugCentralStructureRow | null;
  readonly pubChem: PubChemPropertyRow | null;
  readonly assets: {
    readonly twoD: CatalogStructureAsset | null;
    readonly threeD: CatalogStructureAsset | null;
  };
  readonly unresolvedReason: string | null;
  readonly unresolvedStage?: CatalogUnresolvedStage;
}

export interface CatalogSnapshot {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly capturedAt: string;
  readonly scope: {
    readonly label: string;
    readonly jurisdictions: readonly CatalogJurisdiction[];
    readonly candidateCount: number;
    readonly exhaustive: false;
    readonly sourceSelectionExhaustive?: true;
    readonly selectionPolicy: string;
    readonly exclusions: readonly string[];
  };
  readonly sources: readonly CatalogSourceDescriptor[];
  readonly records: readonly CatalogSnapshotRecord[];
}

export interface CatalogApprovalListing {
  readonly id: string;
  readonly authority: "US FDA";
  readonly jurisdiction: "US";
  readonly kind: "approved-registry-listing";
  readonly sourceRecordId: string;
  readonly applicationNumber: null;
  readonly productId: null;
  readonly sourceId: string;
  readonly sourceLocator: string;
  readonly verification: "source-supported";
  readonly applicationLinkageStatus?: "unresolved";
  readonly jurisdictionEvidence?: "drugcentral-fda-list-membership";
  readonly limitations: readonly string[];
}

export interface CatalogNormalizedEntity {
  readonly id: string;
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly identity: {
    readonly pubChemCid: number;
    readonly inchiKey: string;
    readonly connectivityKey: string;
    readonly stereochemicalKey: string;
    readonly molecularFormula: string;
    readonly molecularWeight: number;
    readonly canonicalSmiles: string;
    readonly isomericSmiles: string | null;
    readonly structureSourceFormSmiles: string;
    readonly chargeLayer: string;
  };
  readonly parentEntity: {
    readonly id: string;
    readonly relation: "self" | "form-of-unresolved-parent";
    readonly resolutionStatus?: "self" | "unresolved";
    readonly limitations?: readonly string[];
  };
  readonly stereoisomer: {
    readonly id: string;
    readonly specified: boolean;
  };
  readonly chemicalForm: {
    readonly id: string;
    readonly kind: "single-component-source-form" | "multicomponent-source-form";
    readonly componentCount: number;
    readonly parentInchiKey: null;
    readonly parentResolutionStatus?: "not-applicable" | "unresolved";
    readonly parentResolutionReason?: string;
  };
  readonly activeIngredient: {
    readonly id: string;
    readonly sourceName: string;
    readonly verification?: "source-name-only";
    readonly limitations?: readonly string[];
  };
  readonly commercialProducts: readonly [];
  readonly commercialProductResolution?: {
    readonly status: "unresolved";
    readonly reason: string;
  };
  readonly approvals: readonly CatalogApprovalListing[];
  readonly structures: {
    readonly twoD: CatalogStructureAsset;
    readonly threeD: CatalogStructureAsset;
  };
  readonly therapeuticGroups: readonly ["unclassified"];
  readonly provenance: {
    readonly snapshotId: string;
    readonly sourceIds: readonly string[];
    readonly capturedAt: string;
  };
}

export type CatalogUnresolvedStage =
  | "source-selection"
  | "identity-normalization"
  | "pubchem-resolution"
  | "structure-resolution"
  | "deduplication";

export interface CatalogUnresolvedRecord {
  readonly sourceRecordId: string;
  readonly preferredName: string;
  readonly stage: CatalogUnresolvedStage;
  readonly reason: string;
  readonly failClosed: true;
}

export interface CatalogCoverage {
  readonly snapshotId: string;
  readonly capturedAt: string;
  readonly sourceSnapshotCandidates: number;
  readonly sourceRegistryRows: number;
  readonly sourceStructureMatched?: number;
  readonly sourceStructureMissing?: number;
  readonly eligibleSmallMoleculeRecords: number;
  readonly imported: number;
  readonly pubChemResolved: number;
  readonly structures2dResolved: number;
  readonly structures3dResolved: number;
  readonly unresolved: number;
  readonly candidateAccountingTotal?: number;
  readonly duplicatesMerged: number;
  /** Legacy summary of display-name groups that preserve distinct form/stereo identities. */
  readonly formStereoConflicts: number;
  readonly displayNameIdentityConflictGroups?: number;
  readonly sourceIdentityRepeatGroups?: number;
  readonly sourceNameIdentityConflictGroups?: number;
  readonly multicomponentSourceForms?: number;
  readonly stereochemistrySpecified?: number;
  readonly chargedOrProtonatedSourceIdentities?: number;
  readonly multicomponentParentRelationUnresolved?: number;
  readonly productApplicationLinkageUnresolved?: number;
  readonly jurisdictionSourceSupported?: number;
  readonly therapeuticClassificationUnresolved: number;
}

export interface CatalogIdentityAudit {
  readonly exactDuplicateGroups: readonly {
    readonly entityId: string;
    readonly inchiKey: string;
    readonly sourceRecordIds: readonly string[];
  }[];
  readonly displayNameIdentityConflicts: readonly {
    readonly normalizedName: string;
    readonly entityIds: readonly string[];
    readonly sourceRecordIds: readonly string[];
    readonly differences: readonly (
      | "connectivity"
      | "stereochemistry"
      | "charge-or-protonation"
      | "source-form"
    )[];
  }[];
  readonly sourceIdentityRepeatGroups?: readonly {
    readonly inchiKey: string;
    readonly sourceRecordIds: readonly string[];
    readonly sourceFormSmiles: readonly string[];
    readonly importedRecordIds: readonly string[];
    readonly unresolvedRecordIds: readonly string[];
  }[];
  readonly sourceNameIdentityConflicts?: readonly {
    readonly normalizedName: string;
    readonly sourceRecordIds: readonly string[];
    readonly inchiKeys: readonly string[];
    readonly differences: readonly (
      | "connectivity"
      | "stereochemistry"
      | "charge-or-protonation"
      | "source-form"
    )[];
  }[];
  readonly multicomponentSourceForms?: readonly {
    readonly sourceRecordId: string;
    readonly preferredName: string;
    readonly inchiKey: string;
    readonly componentCount: number;
    readonly importStatus: "imported" | "unresolved";
  }[];
  readonly stereochemistrySpecifiedSourceRecords?: readonly string[];
  readonly chargedOrProtonatedSourceRecords?: readonly {
    readonly sourceRecordId: string;
    readonly inchiKey: string;
    readonly chargeLayer: string;
  }[];
}

export interface CatalogBuildResult {
  readonly entities: readonly CatalogNormalizedEntity[];
  readonly unresolved: readonly CatalogUnresolvedRecord[];
  readonly coverage: CatalogCoverage;
  readonly identityAudit: CatalogIdentityAudit;
}

export interface CatalogShardDescriptor {
  readonly id: string;
  readonly dimension: "alphabetic" | "therapeutic";
  readonly label: string;
  readonly path: string;
  readonly count: number;
}

export interface CatalogManifest {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly generatedAt: string;
  readonly scope: CatalogSnapshot["scope"];
  readonly recordCount: number;
  readonly searchIndex: string;
  readonly reports: {
    readonly coverage: string;
    readonly unresolved: string;
  };
  readonly projections: {
    readonly therapeutic: string;
  };
  readonly shards: readonly CatalogShardDescriptor[];
  readonly structureLoading: "per-molecule-lazy";
  readonly cachePolicy: {
    readonly strategy: "bounded-lru";
    readonly defaultMaxEntries: number;
  };
  readonly adapterCapabilities: readonly {
    readonly adapter: CatalogAdapterId;
    readonly status: "used" | "available" | "future";
  }[];
}
