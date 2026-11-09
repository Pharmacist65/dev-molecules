import { readFile } from "node:fs/promises";

import type { CatalogCoverage, CatalogManifest } from "../../lib/catalog/types";
import { catalogOutputUrl } from "./catalog-config.mjs";

export const readCatalogReport = async () => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", catalogOutputUrl), "utf8"),
  ) as CatalogManifest;
  const report = JSON.parse(
    await readFile(new URL(manifest.reports.coverage, catalogOutputUrl), "utf8"),
  ) as { readonly coverage: CatalogCoverage };
  return {
    scope: manifest.scope.label,
    snapshot: manifest.snapshotId,
    sourceRegistryRows: report.coverage.sourceRegistryRows,
    selectedCandidates: report.coverage.sourceSnapshotCandidates,
    sourceStructureMatched: report.coverage.sourceStructureMatched,
    sourceStructureMissing: report.coverage.sourceStructureMissing,
    eligibleSmallMoleculeRecords: report.coverage.eligibleSmallMoleculeRecords,
    imported: report.coverage.imported,
    pubChemResolved: report.coverage.pubChemResolved,
    structures2dResolved: report.coverage.structures2dResolved,
    structuresResolved: report.coverage.structures3dResolved,
    unresolved: report.coverage.unresolved,
    duplicatesMerged: report.coverage.duplicatesMerged,
    formStereoConflicts: report.coverage.formStereoConflicts,
    displayNameIdentityConflictGroups:
      report.coverage.displayNameIdentityConflictGroups,
    sourceIdentityRepeatGroups: report.coverage.sourceIdentityRepeatGroups,
    sourceNameIdentityConflictGroups:
      report.coverage.sourceNameIdentityConflictGroups,
    multicomponentSourceForms: report.coverage.multicomponentSourceForms,
    stereochemistrySpecified: report.coverage.stereochemistrySpecified,
    chargedOrProtonatedSourceIdentities:
      report.coverage.chargedOrProtonatedSourceIdentities,
    multicomponentParentRelationUnresolved:
      report.coverage.multicomponentParentRelationUnresolved,
    productApplicationLinkageUnresolved:
      report.coverage.productApplicationLinkageUnresolved,
    exhaustive: manifest.scope.exhaustive,
    sourceSelectionExhaustive: manifest.scope.sourceSelectionExhaustive ?? false,
  };
};
