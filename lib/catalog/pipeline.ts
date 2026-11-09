import {
  catalogSlug,
  countSmilesComponents,
  createFormAwareIdentityKey,
  entitySortKey,
  extractInchiChargeLayer,
  normalizeCatalogName,
  parseInchiKey,
} from "./identity";
import type {
  CatalogApprovalListing,
  CatalogBuildResult,
  CatalogNormalizedEntity,
  CatalogSnapshot,
  CatalogSnapshotRecord,
  CatalogUnresolvedRecord,
} from "./types";

const unresolved = (
  record: CatalogSnapshotRecord,
  stage: CatalogUnresolvedRecord["stage"],
  reason: string,
): CatalogUnresolvedRecord => ({
  sourceRecordId: `drugcentral:${record.approval.drugCentralId}`,
  preferredName: record.preferredName,
  stage,
  reason,
  failClosed: true,
});

const approvalFor = (
  record: CatalogSnapshotRecord,
  snapshot: CatalogSnapshot,
): CatalogApprovalListing => ({
  id: `approval-listing:drugcentral-fda:${record.approval.drugCentralId}`,
  authority: "US FDA",
  jurisdiction: "US",
  kind: "approved-registry-listing",
  sourceRecordId: `drugcentral:${record.approval.drugCentralId}`,
  applicationNumber: null,
  productId: null,
  sourceId: snapshot.sources.find((source) => source.adapter === "drugcentral-approved")
    ?.id ?? "source:drugcentral-fda-approved",
  sourceLocator: `https://drugcentral.org/?q=${encodeURIComponent(record.approval.name)}`,
  verification: "source-supported",
  applicationLinkageStatus: "unresolved",
  jurisdictionEvidence: "drugcentral-fda-list-membership",
  limitations: [
    "This is a DrugCentral approval-list membership record, not an exact FDA application or product record.",
    "Application, product and chemical-form linkage remains empty until exact openFDA enrichment succeeds.",
  ],
});

const createEntity = (
  record: CatalogSnapshotRecord,
  snapshot: CatalogSnapshot,
): CatalogNormalizedEntity | CatalogUnresolvedRecord => {
  if (record.unresolvedReason) {
    return unresolved(
      record,
      record.unresolvedStage ?? "source-selection",
      record.unresolvedReason,
    );
  }
  if (!record.structure) {
    return unresolved(
      record,
      "identity-normalization",
      "No DrugCentral structure identity is present; no chemical identity was inferred.",
    );
  }
  if (!record.pubChem) {
    return unresolved(
      record,
      "pubchem-resolution",
      "No unique PubChem compound matched the selected source identity.",
    );
  }
  const sourceKey = record.structure.inchiKey.toUpperCase();
  const pubChemKey = record.pubChem.inchiKey.toUpperCase();
  if (sourceKey !== pubChemKey) {
    return unresolved(
      record,
      "pubchem-resolution",
      `DrugCentral/PubChem InChIKey mismatch (${sourceKey} vs ${pubChemKey}).`,
    );
  }
  const keyParts = parseInchiKey(pubChemKey);
  if (!keyParts) {
    return unresolved(record, "identity-normalization", "Invalid standard InChIKey.");
  }
  if (!record.assets.twoD || !record.assets.threeD) {
    return unresolved(
      record,
      "structure-resolution",
      "Both a source-matched 2D SDF and a source-matched 3D SDF are required.",
    );
  }

  const componentCount = countSmilesComponents(record.structure.smiles);
  const slug = catalogSlug(record.preferredName);
  const identitySuffix = pubChemKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const entityId = `molecule:imported:${slug}-${identitySuffix}`;
  const formId = `form:${identitySuffix}:components-${componentCount}`;
  const stereoSpecified = /\/(?:b|t)[^/]+/.test(record.structure.inchi);
  const chargeLayer = extractInchiChargeLayer(record.structure.inchi);

  return {
    id: entityId,
    preferredName: record.preferredName,
    aliases: [...new Set([record.approval.name, record.structure.inn, ...record.aliases])]
      .filter((alias) => normalizeCatalogName(alias) !== normalizeCatalogName(record.preferredName))
      .sort((left, right) => left.localeCompare(right, "en")),
    identity: {
      pubChemCid: record.pubChem.cid,
      inchiKey: pubChemKey,
      connectivityKey: keyParts.connectivity,
      stereochemicalKey: keyParts.stereoAndProtonation,
      molecularFormula: record.pubChem.molecularFormula,
      molecularWeight: record.pubChem.molecularWeight,
      canonicalSmiles: record.pubChem.canonicalSmiles,
      isomericSmiles: record.pubChem.isomericSmiles,
      structureSourceFormSmiles: record.structure.smiles,
      chargeLayer,
    },
    parentEntity: {
      id: `parent:${keyParts.connectivity}`,
      relation: componentCount === 1 ? "self" : "form-of-unresolved-parent",
      resolutionStatus: componentCount === 1 ? "self" : "unresolved",
      limitations:
        componentCount === 1
          ? []
          : [
              "The source proves a multicomponent chemical form, but no exact parent/active-moiety InChIKey relation is available in the selected snapshots.",
            ],
    },
    stereoisomer: {
      id: `stereo:${pubChemKey}`,
      specified: stereoSpecified,
    },
    chemicalForm: {
      id: formId,
      kind:
        componentCount === 1
          ? "single-component-source-form"
          : "multicomponent-source-form",
      componentCount,
      parentInchiKey: null,
      parentResolutionStatus:
        componentCount === 1 ? "not-applicable" : "unresolved",
      parentResolutionReason:
        componentCount === 1
          ? "This source identity is single-component; a separate parent-form link is not required."
          : "No exact source-backed parent-form InChIKey relation is available.",
    },
    activeIngredient: {
      id: `ingredient:drugcentral:${record.approval.drugCentralId}`,
      sourceName: record.approval.name,
      verification: "source-name-only",
      limitations: [
        "The FDA-list name is retained as the source ingredient label; exact product, active-moiety and salt-parent linkage is unresolved.",
      ],
    },
    commercialProducts: [],
    commercialProductResolution: {
      status: "unresolved",
      reason:
        "No exact FDA application/product/form linkage was selected; an empty list must not be read as proof that commercial products do not exist.",
    },
    approvals: [approvalFor(record, snapshot)],
    structures: {
      twoD: record.assets.twoD,
      threeD: record.assets.threeD,
    },
    therapeuticGroups: ["unclassified"],
    provenance: {
      snapshotId: snapshot.snapshotId,
      sourceIds: snapshot.sources
        .filter((source) => source.selectedRows > 0)
        .map((source) => source.id),
      capturedAt: snapshot.capturedAt,
    },
  };
};

const mergeDuplicate = (
  existing: CatalogNormalizedEntity,
  next: CatalogNormalizedEntity,
): CatalogNormalizedEntity => ({
  ...existing,
  aliases: [...new Set([...existing.aliases, ...next.aliases])].sort((left, right) =>
    left.localeCompare(right, "en"),
  ),
  approvals: [...new Map(
    [...existing.approvals, ...next.approvals].map((approval) => [approval.id, approval]),
  ).values()],
});

export const buildCatalogSnapshot = (snapshot: CatalogSnapshot): CatalogBuildResult => {
  if (snapshot.schemaVersion !== 1) {
    throw new Error("Unsupported catalog snapshot schema.");
  }
  if (snapshot.scope.candidateCount !== snapshot.records.length) {
    throw new Error("Catalog snapshot candidate count does not match its records.");
  }

  const entitiesByIdentity = new Map<string, CatalogNormalizedEntity>();
  const unresolvedRecords: CatalogUnresolvedRecord[] = [];
  let duplicatesMerged = 0;

  for (const record of snapshot.records) {
    const normalized = createEntity(record, snapshot);
    if ("failClosed" in normalized) {
      unresolvedRecords.push(normalized);
      continue;
    }
    const identityKey = createFormAwareIdentityKey(record);
    if (!identityKey) {
      unresolvedRecords.push(
        unresolved(record, "identity-normalization", "A form-aware identity key could not be built."),
      );
      continue;
    }
    const existing = entitiesByIdentity.get(identityKey);
    if (existing) {
      if (existing.identity.pubChemCid !== normalized.identity.pubChemCid) {
        unresolvedRecords.push(
          unresolved(
            record,
            "deduplication",
            "An exact form/stereo key resolved to conflicting PubChem CIDs.",
          ),
        );
        continue;
      }
      entitiesByIdentity.set(identityKey, mergeDuplicate(existing, normalized));
      duplicatesMerged += 1;
    } else {
      entitiesByIdentity.set(identityKey, normalized);
    }
  }

  const entities = [...entitiesByIdentity.values()].sort((left, right) =>
    entitySortKey(left).localeCompare(entitySortKey(right), "en"),
  );
  const entitiesByName = new Map<string, CatalogNormalizedEntity[]>();
  for (const entity of entities) {
    const nameKey = normalizeCatalogName(entity.preferredName);
    const namedEntities = entitiesByName.get(nameKey) ?? [];
    namedEntities.push(entity);
    entitiesByName.set(nameKey, namedEntities);
  }
  const displayNameIdentityConflicts = [...entitiesByName.entries()]
    .filter(([, namedEntities]) => namedEntities.length > 1)
    .map(([normalizedName, namedEntities]) => {
      const differences: (
        | "connectivity"
        | "stereochemistry"
        | "charge-or-protonation"
        | "source-form"
      )[] = [];
      if (new Set(namedEntities.map((entity) => entity.identity.connectivityKey)).size > 1) {
        differences.push("connectivity");
      }
      if (new Set(namedEntities.map((entity) => entity.identity.stereochemicalKey)).size > 1) {
        differences.push("stereochemistry");
      }
      if (new Set(namedEntities.map((entity) => entity.identity.chargeLayer)).size > 1) {
        differences.push("charge-or-protonation");
      }
      if (
        new Set(
          namedEntities.map(
            (entity) =>
              `${entity.chemicalForm.componentCount}|${entity.identity.structureSourceFormSmiles}`,
          ),
        ).size > 1
      ) {
        differences.push("source-form");
      }
      return {
        normalizedName,
        entityIds: namedEntities.map((entity) => entity.id),
        sourceRecordIds: namedEntities.flatMap((entity) =>
          entity.approvals.map((approval) => approval.sourceRecordId),
        ),
        differences,
      };
    })
    .sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, "en"));
  const exactDuplicateGroups = entities
    .filter((entity) => entity.approvals.length > 1)
    .map((entity) => ({
      entityId: entity.id,
      inchiKey: entity.identity.inchiKey,
      sourceRecordIds: entity.approvals.map((approval) => approval.sourceRecordId).sort(),
    }));
  const importedRecordIds = new Set(
    entities.flatMap((entity) =>
      entity.approvals.map((approval) => approval.sourceRecordId),
    ),
  );
  const sourceIdentityRecords = snapshot.records.flatMap((record) =>
    record.structure
      ? [
          {
            record,
            structure: record.structure,
            sourceRecordId: `drugcentral:${record.approval.drugCentralId}`,
          },
        ]
      : [],
  );
  const sourceRecordsByInchiKey = new Map<
    string,
    typeof sourceIdentityRecords
  >();
  const sourceRecordsByName = new Map<string, typeof sourceIdentityRecords>();
  for (const sourceRecord of sourceIdentityRecords) {
    const inchiKey = sourceRecord.structure.inchiKey.toUpperCase();
    const keyed = sourceRecordsByInchiKey.get(inchiKey) ?? [];
    keyed.push(sourceRecord);
    sourceRecordsByInchiKey.set(inchiKey, keyed);
    const name = normalizeCatalogName(sourceRecord.record.approval.name);
    const named = sourceRecordsByName.get(name) ?? [];
    named.push(sourceRecord);
    sourceRecordsByName.set(name, named);
  }
  const sourceIdentityRepeatGroups = [...sourceRecordsByInchiKey.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([inchiKey, records]) => ({
      inchiKey,
      sourceRecordIds: records.map((item) => item.sourceRecordId).sort(),
      sourceFormSmiles: [...new Set(records.map((item) => item.structure.smiles))].sort(),
      importedRecordIds: records
        .map((item) => item.sourceRecordId)
        .filter((id) => importedRecordIds.has(id))
        .sort(),
      unresolvedRecordIds: records
        .map((item) => item.sourceRecordId)
        .filter((id) => !importedRecordIds.has(id))
        .sort(),
    }));
  const sourceNameIdentityConflicts = [...sourceRecordsByName.entries()]
    .filter(
      ([, records]) =>
        new Set(records.map((item) => item.structure.inchiKey.toUpperCase())).size > 1,
    )
    .map(([normalizedName, records]) => {
      const keyParts = records
        .map((item) => parseInchiKey(item.structure.inchiKey))
        .filter((parts): parts is NonNullable<typeof parts> => parts !== null);
      const differences: (
        | "connectivity"
        | "stereochemistry"
        | "charge-or-protonation"
        | "source-form"
      )[] = [];
      if (new Set(keyParts.map((parts) => parts.connectivity)).size > 1) {
        differences.push("connectivity");
      }
      if (new Set(keyParts.map((parts) => parts.stereoAndProtonation)).size > 1) {
        differences.push("stereochemistry");
      }
      if (
        new Set(
          records.map((item) => extractInchiChargeLayer(item.structure.inchi)),
        ).size > 1
      ) {
        differences.push("charge-or-protonation");
      }
      if (
        new Set(
          records.map(
            (item) =>
              `${countSmilesComponents(item.structure.smiles)}|${item.structure.smiles}`,
          ),
        ).size > 1
      ) {
        differences.push("source-form");
      }
      return {
        normalizedName,
        sourceRecordIds: records.map((item) => item.sourceRecordId).sort(),
        inchiKeys: [...new Set(
          records.map((item) => item.structure.inchiKey.toUpperCase()),
        )].sort(),
        differences,
      };
    })
    .sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, "en"));
  const multicomponentSourceForms = sourceIdentityRecords
    .filter((item) => countSmilesComponents(item.structure.smiles) > 1)
    .map((item) => ({
      sourceRecordId: item.sourceRecordId,
      preferredName: item.record.preferredName,
      inchiKey: item.structure.inchiKey.toUpperCase(),
      componentCount: countSmilesComponents(item.structure.smiles),
      importStatus: importedRecordIds.has(item.sourceRecordId)
        ? ("imported" as const)
        : ("unresolved" as const),
    }));
  const stereochemistrySpecifiedSourceRecords = sourceIdentityRecords
    .filter((item) => /\/(?:b|t)[^/]+/.test(item.structure.inchi))
    .map((item) => item.sourceRecordId)
    .sort();
  const chargedOrProtonatedSourceRecords = sourceIdentityRecords
    .map((item) => ({
      sourceRecordId: item.sourceRecordId,
      inchiKey: item.structure.inchiKey.toUpperCase(),
      chargeLayer: extractInchiChargeLayer(item.structure.inchi),
    }))
    .filter((item) => item.chargeLayer !== "none")
    .sort((left, right) => left.sourceRecordId.localeCompare(right.sourceRecordId, "en"));
  const formStereoConflicts = displayNameIdentityConflicts.length;
  const sourceRegistryRows = Math.max(
    0,
    ...snapshot.sources
      .filter((source) => source.adapter === "drugcentral-approved")
      .map((source) => source.totalSourceRows ?? 0),
  );
  const sourceStructureMatched = snapshot.records.filter(
    (record) => record.structure !== null,
  ).length;
  const sourceStructureMissing = snapshot.records.length - sourceStructureMatched;

  return {
    entities,
    unresolved: unresolvedRecords.sort((left, right) =>
      left.sourceRecordId.localeCompare(right.sourceRecordId, "en"),
    ),
    coverage: {
      snapshotId: snapshot.snapshotId,
      capturedAt: snapshot.capturedAt,
      sourceSnapshotCandidates: snapshot.records.length,
      sourceRegistryRows,
      sourceStructureMatched,
      sourceStructureMissing,
      eligibleSmallMoleculeRecords: sourceStructureMatched,
      imported: entities.length,
      pubChemResolved: snapshot.records.filter((record) => record.pubChem !== null).length,
      structures2dResolved: snapshot.records.filter((record) => record.assets.twoD !== null)
        .length,
      structures3dResolved: snapshot.records.filter(
        (record) => record.assets.threeD !== null,
      ).length,
      unresolved: unresolvedRecords.length,
      candidateAccountingTotal:
        entities.length + unresolvedRecords.length + duplicatesMerged,
      duplicatesMerged,
      formStereoConflicts,
      displayNameIdentityConflictGroups: displayNameIdentityConflicts.length,
      sourceIdentityRepeatGroups: sourceIdentityRepeatGroups.length,
      sourceNameIdentityConflictGroups: sourceNameIdentityConflicts.length,
      multicomponentSourceForms: multicomponentSourceForms.length,
      stereochemistrySpecified: stereochemistrySpecifiedSourceRecords.length,
      chargedOrProtonatedSourceIdentities:
        chargedOrProtonatedSourceRecords.length,
      multicomponentParentRelationUnresolved: multicomponentSourceForms.length,
      productApplicationLinkageUnresolved: snapshot.records.length,
      jurisdictionSourceSupported: snapshot.records.length,
      therapeuticClassificationUnresolved: entities.length,
    },
    identityAudit: {
      exactDuplicateGroups,
      displayNameIdentityConflicts,
      sourceIdentityRepeatGroups,
      sourceNameIdentityConflicts,
      multicomponentSourceForms,
      stereochemistrySpecifiedSourceRecords,
      chargedOrProtonatedSourceRecords,
    },
  };
};
