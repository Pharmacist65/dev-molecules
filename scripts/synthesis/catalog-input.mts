import { readFile } from "node:fs/promises";

import { buildCatalogSnapshot } from "../../lib/catalog/pipeline";
import type {
  CatalogNormalizedEntity,
  CatalogSnapshot,
  CatalogSnapshotRecord,
} from "../../lib/catalog/types";
import { snapshotUrl } from "../catalog/catalog-config.mjs";

/** Snapshot-specific release invariant, not a schema or product ceiling. */
export const CHECKED_SYNTHESIS_DISCOVERY_SUBJECT_COUNT = 1_552;

export interface SynthesisDiscoverySubject {
  readonly schemaVersion: 1;
  readonly subjectId: `synthesis-discovery-subject:${string}`;
  readonly catalogEntityId: string;
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly identity: {
    readonly pubChemCid: number;
    readonly inchiKey: string;
    readonly connectivityKey: string;
    readonly stereochemicalAndProtonationKey: string;
    readonly canonicalSmiles: string;
    readonly isomericSmiles: string | null;
    readonly molecularFormula: string;
  };
  /** Exact chemical form represented by the checked source identity. */
  readonly formIdentity: {
    readonly chemicalFormId: string;
    readonly kind: CatalogNormalizedEntity["chemicalForm"]["kind"];
    readonly componentCount: number;
    readonly sourceFormSmiles: string;
    readonly sourceInchi: string;
    readonly sourceInchiKey: string;
    readonly chargeLayer: string;
  };
  /** Stereo state is retained exactly; no R/S assignment is inferred here. */
  readonly stereochemistryIdentity: {
    readonly stereoisomerId: string;
    readonly specifiedInSourceInchi: boolean;
    readonly isomericSmiles: string | null;
    readonly inchiKeyStereoAndProtonationBlock: string;
  };
  readonly parentResolution: {
    readonly catalogParentEntityId: string;
    readonly catalogRelation: CatalogNormalizedEntity["parentEntity"]["relation"];
    readonly catalogResolutionStatus: "self" | "unresolved";
    readonly chemicalFormParentResolutionStatus: "not-applicable" | "unresolved";
    readonly parentInchiKey: null;
    /**
     * The current catalog proves an exact source form, not a pharmaceutical
     * free-parent/salt/hydrate/solvate relationship.
     */
    readonly freeParentSaltHydrateSolvateRelation: "unresolved";
    readonly limitations: readonly string[];
  };
  readonly sourceIdentity: {
    readonly snapshotId: string;
    readonly sourceRecordId: `drugcentral:${number}`;
    readonly drugCentralId: number;
    readonly approvalName: string;
    readonly inn: string;
    readonly casNumber: string;
    readonly sourceIds: readonly string[];
    readonly capturedAt: string;
  };
}

export interface SynthesisCatalogInputOptions {
  readonly expectedSubjectCount?: number;
}

const requireText = (value: string | null | undefined, field: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Synthesis catalog input is missing ${field}.`);
  return normalized;
};

const sourceRecordIdFor = (record: CatalogSnapshotRecord): `drugcentral:${number}` =>
  `drugcentral:${record.approval.drugCentralId}`;

const indexSourceRecords = (
  snapshot: CatalogSnapshot,
): ReadonlyMap<`drugcentral:${number}`, CatalogSnapshotRecord> => {
  const records = new Map<`drugcentral:${number}`, CatalogSnapshotRecord>();
  for (const record of snapshot.records) {
    const sourceRecordId = sourceRecordIdFor(record);
    if (records.has(sourceRecordId)) {
      throw new Error(`Duplicate catalog source identity: ${sourceRecordId}.`);
    }
    records.set(sourceRecordId, record);
  }
  return records;
};

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "en"),
  );

const subjectFor = (
  snapshot: CatalogSnapshot,
  entity: CatalogNormalizedEntity,
  recordsBySourceId: ReadonlyMap<`drugcentral:${number}`, CatalogSnapshotRecord>,
): SynthesisDiscoverySubject => {
  if (entity.approvals.length !== 1) {
    throw new Error(
      `Synthesis discovery requires one exact source identity for ${entity.id}; received ${entity.approvals.length}.`,
    );
  }

  const sourceRecordId = entity.approvals[0].sourceRecordId;
  if (!/^drugcentral:\d+$/u.test(sourceRecordId)) {
    throw new Error(`Unsupported synthesis source record ID: ${sourceRecordId}.`);
  }
  const typedSourceRecordId = sourceRecordId as `drugcentral:${number}`;
  const record = recordsBySourceId.get(typedSourceRecordId);
  if (!record) {
    throw new Error(`Catalog entity ${entity.id} has no matching source record.`);
  }
  if (record.unresolvedReason !== null || !record.structure || !record.pubChem) {
    throw new Error(`Catalog entity ${entity.id} joined to an unresolved source identity.`);
  }

  const sourceInchiKey = requireText(record.structure.inchiKey, "source InChIKey").toUpperCase();
  const sourceInchi = requireText(record.structure.inchi, "source InChI");
  const sourceFormSmiles = requireText(record.structure.smiles, "source-form SMILES");
  const casNumber = requireText(record.structure.casNumber, "CAS number");
  if (
    record.structure.drugCentralId !== record.approval.drugCentralId ||
    entity.identity.inchiKey !== sourceInchiKey ||
    record.pubChem.inchiKey.toUpperCase() !== sourceInchiKey ||
    entity.identity.pubChemCid !== record.pubChem.cid ||
    entity.identity.canonicalSmiles !== record.pubChem.canonicalSmiles ||
    entity.identity.isomericSmiles !== record.pubChem.isomericSmiles ||
    entity.identity.structureSourceFormSmiles !== sourceFormSmiles ||
    entity.preferredName !== record.preferredName ||
    entity.provenance.snapshotId !== snapshot.snapshotId
  ) {
    throw new Error(`Catalog/source identity mismatch for ${entity.id}.`);
  }

  const limitations = uniqueSorted([
    ...(entity.parentEntity.limitations ?? []),
    ...(entity.activeIngredient.limitations ?? []),
    entity.chemicalForm.parentResolutionReason ?? "",
    "The checked catalog preserves the exact source form but does not resolve a free-parent, salt, hydrate, solvate or active-moiety relationship.",
  ]);

  return {
    schemaVersion: 1,
    subjectId: `synthesis-discovery-subject:${entity.identity.inchiKey.toLowerCase()}`,
    catalogEntityId: entity.id,
    preferredName: entity.preferredName,
    aliases: [...entity.aliases],
    identity: {
      pubChemCid: entity.identity.pubChemCid,
      inchiKey: entity.identity.inchiKey,
      connectivityKey: entity.identity.connectivityKey,
      stereochemicalAndProtonationKey: entity.identity.stereochemicalKey,
      canonicalSmiles: entity.identity.canonicalSmiles,
      isomericSmiles: entity.identity.isomericSmiles,
      molecularFormula: entity.identity.molecularFormula,
    },
    formIdentity: {
      chemicalFormId: entity.chemicalForm.id,
      kind: entity.chemicalForm.kind,
      componentCount: entity.chemicalForm.componentCount,
      sourceFormSmiles,
      sourceInchi,
      sourceInchiKey,
      chargeLayer: entity.identity.chargeLayer,
    },
    stereochemistryIdentity: {
      stereoisomerId: entity.stereoisomer.id,
      specifiedInSourceInchi: entity.stereoisomer.specified,
      isomericSmiles: entity.identity.isomericSmiles,
      inchiKeyStereoAndProtonationBlock: entity.identity.stereochemicalKey,
    },
    parentResolution: {
      catalogParentEntityId: entity.parentEntity.id,
      catalogRelation: entity.parentEntity.relation,
      catalogResolutionStatus: entity.parentEntity.resolutionStatus ?? "unresolved",
      chemicalFormParentResolutionStatus:
        entity.chemicalForm.parentResolutionStatus ?? "unresolved",
      parentInchiKey: entity.chemicalForm.parentInchiKey,
      freeParentSaltHydrateSolvateRelation: "unresolved",
      limitations,
    },
    sourceIdentity: {
      snapshotId: snapshot.snapshotId,
      sourceRecordId: typedSourceRecordId,
      drugCentralId: record.approval.drugCentralId,
      approvalName: requireText(record.approval.name, "approval name"),
      inn: requireText(record.structure.inn, "DrugCentral INN"),
      casNumber,
      sourceIds: [...entity.provenance.sourceIds],
      capturedAt: snapshot.capturedAt,
    },
  };
};

const assertUnique = (
  subjects: readonly SynthesisDiscoverySubject[],
  field: string,
  valueFor: (subject: SynthesisDiscoverySubject) => string | number,
): void => {
  const values = subjects.map(valueFor);
  if (new Set(values).size !== values.length) {
    throw new Error(`Synthesis discovery subjects contain duplicate ${field}.`);
  }
};

export const buildSynthesisDiscoverySubjects = (
  snapshot: CatalogSnapshot,
  options: SynthesisCatalogInputOptions = {},
): readonly SynthesisDiscoverySubject[] => {
  const expectedSubjectCount =
    options.expectedSubjectCount ?? CHECKED_SYNTHESIS_DISCOVERY_SUBJECT_COUNT;
  if (!Number.isSafeInteger(expectedSubjectCount) || expectedSubjectCount < 1) {
    throw new Error("Expected synthesis discovery subject count must be a positive integer.");
  }

  const recordsBySourceId = indexSourceRecords(snapshot);
  const catalog = buildCatalogSnapshot(snapshot);
  const subjects = catalog.entities
    .map((entity) => subjectFor(snapshot, entity, recordsBySourceId))
    .sort((left, right) =>
      left.catalogEntityId < right.catalogEntityId
        ? -1
        : left.catalogEntityId > right.catalogEntityId
          ? 1
          : 0,
    );

  if (subjects.length !== expectedSubjectCount) {
    throw new Error(
      `Synthesis discovery subject count mismatch: expected ${expectedSubjectCount}, received ${subjects.length}.`,
    );
  }
  assertUnique(subjects, "subject IDs", (subject) => subject.subjectId);
  assertUnique(subjects, "catalog entity IDs", (subject) => subject.catalogEntityId);
  assertUnique(subjects, "PubChem CIDs", (subject) => subject.identity.pubChemCid);
  assertUnique(subjects, "InChIKeys", (subject) => subject.identity.inchiKey);
  assertUnique(subjects, "source record IDs", (subject) => subject.sourceIdentity.sourceRecordId);

  return subjects;
};

export const loadSynthesisDiscoverySubjects = async (
  options: SynthesisCatalogInputOptions = {},
): Promise<readonly SynthesisDiscoverySubject[]> => {
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8")) as CatalogSnapshot;
  return buildSynthesisDiscoverySubjects(snapshot, options);
};
