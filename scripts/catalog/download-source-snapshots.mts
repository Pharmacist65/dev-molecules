import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";

import {
  drugCentralApprovedAdapter,
  drugCentralStructureAdapter,
} from "../../lib/catalog/adapters";
import { normalizeCatalogName } from "../../lib/catalog/identity";
import type {
  CatalogSnapshot,
  CatalogSnapshotRecord,
  CatalogSourceDescriptor,
} from "../../lib/catalog/types";
import {
  catalogSelectionPolicy,
  catalogSourceUrls,
  catalogStructureOutputUrl,
  snapshotUrl,
} from "./catalog-config.mjs";
import { fetchPubChemStructureAssets } from "./fetch-2d-3d-structures.mjs";
import { resolvePubChemProperties } from "./resolve-pubchem-cids.mjs";

const sha256 = (content: string): string =>
  createHash("sha256").update(content).digest("hex");

const fetchText = async (
  url: string,
): Promise<{ readonly content: string; readonly lastModified: string | null }> => {
  const retryDelays = [0, 500, 1_500, 4_000];
  let lastStatus = 0;
  for (const delay of retryDelays) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const response = await fetch(url, { headers: { Accept: "text/plain,*/*" } });
    lastStatus = response.status;
    if (response.ok) {
      return {
        content: await response.text(),
        lastModified: response.headers.get("last-modified"),
      };
    }
    if (response.status !== 429 && response.status < 500) break;
  }
  throw new Error(`Catalog source request failed (${lastStatus}) for ${url}`);
};

export interface CatalogDownloadOptions {
  readonly dryRun?: boolean;
  readonly refresh?: boolean;
}

export interface CatalogDownloadSummary {
  readonly mode: "dry-run" | "checked-snapshot" | "refreshed";
  readonly snapshotPath: string;
  readonly selectedCandidates: number;
  readonly structureCandidates?: number;
  readonly pubChemResolved?: number;
  readonly completeStructurePairs?: number;
  readonly unresolved?: number;
  readonly networkRequestsPlanned: boolean;
}

const readCheckedSnapshot = async (): Promise<CatalogSnapshot> =>
  JSON.parse(await readFile(snapshotUrl, "utf8")) as CatalogSnapshot;

const checkedSnapshotSummary = async (
  mode: "dry-run" | "checked-snapshot" = "checked-snapshot",
  networkRequestsPlanned = false,
): Promise<CatalogDownloadSummary> => {
  const snapshot = await readCheckedSnapshot();
  const structureCandidates = snapshot.records.filter(
    (record) => record.structure !== null,
  ).length;
  const pubChemResolved = snapshot.records.filter(
    (record) => record.pubChem !== null,
  ).length;
  const completeStructurePairs = snapshot.records.filter(
    (record) => record.assets.twoD !== null && record.assets.threeD !== null,
  ).length;
  return {
    mode,
    snapshotPath: snapshotUrl.pathname,
    selectedCandidates: snapshot.records.length,
    structureCandidates,
    pubChemResolved,
    completeStructurePairs,
    unresolved: snapshot.records.length - completeStructurePairs,
    networkRequestsPlanned,
  };
};

const uniqueAliases = (
  preferredName: string,
  values: readonly (string | null | undefined)[],
): readonly string[] => {
  const preferredKey = normalizeCatalogName(preferredName);
  return [...new Map(
    values
      .filter((value): value is string => Boolean(value?.trim()))
      .filter((value) => normalizeCatalogName(value) !== preferredKey)
      .map((value) => [normalizeCatalogName(value), value]),
  ).values()].sort((left, right) => left.localeCompare(right, "en"));
};

const pruneUnreferencedStructures = async (
  records: readonly CatalogSnapshotRecord[],
): Promise<void> => {
  const referenced = new Set(
    records.flatMap((record) =>
      [record.assets.twoD?.path, record.assets.threeD?.path]
        .filter((path): path is string => Boolean(path))
        .map((path) => path.slice(path.lastIndexOf("/") + 1)),
    ),
  );
  for (const filename of await readdir(catalogStructureOutputUrl)) {
    if (/^cid-\d+-(?:2d|3d)\.sdf$/.test(filename) && !referenced.has(filename)) {
      await unlink(new URL(filename, catalogStructureOutputUrl));
    }
  }
};

export const downloadSourceSnapshots = async (
  options: CatalogDownloadOptions = {},
): Promise<CatalogDownloadSummary> => {
  if (options.dryRun) {
    return checkedSnapshotSummary("dry-run", Boolean(options.refresh));
  }
  if (!options.refresh) return checkedSnapshotSummary();

  const [approvalDownload, structureDownload] = await Promise.all([
    fetchText(catalogSourceUrls.drugCentralApproved),
    fetchText(catalogSourceUrls.drugCentralStructures),
  ]);
  const approvalRows = drugCentralApprovedAdapter.parse(approvalDownload.content);
  const structureRows = drugCentralStructureAdapter.parse(structureDownload.content);
  const structureSourceRowCount = Math.max(
    0,
    structureDownload.content.split(/\r?\n/).filter(Boolean).length - 1,
  );
  const structuresById = new Map(
    structureRows.map((structure) => [structure.drugCentralId, structure]),
  );
  const selectedCandidates = approvalRows.flatMap((approval) => {
    const structure = structuresById.get(approval.drugCentralId);
    return structure
      ? [
          {
            structure,
            acceptedNames: [approval.name, structure.inn],
          },
        ]
      : [];
  });

  const propertiesByDrugCentralId = await resolvePubChemProperties(selectedCandidates);
  const assetsByCid = await fetchPubChemStructureAssets([
    ...new Map(
      [...propertiesByDrugCentralId.values()].map((property) => [property.cid, property]),
    ).values(),
  ]);

  const records: CatalogSnapshotRecord[] = approvalRows.map((approval) => {
    const structure = structuresById.get(approval.drugCentralId) ?? null;
    const pubChem = propertiesByDrugCentralId.get(approval.drugCentralId) ?? null;
    const assets = pubChem ? assetsByCid.get(pubChem.cid) : null;
    const preferredName = pubChem?.title ?? structure?.inn ?? approval.name;
    const aliases = uniqueAliases(preferredName, [approval.name, structure?.inn]);
    if (!structure) {
      return {
        preferredName,
        aliases,
        approval,
        structure: null,
        pubChem: null,
        assets: { twoD: null, threeD: null },
        unresolvedStage: "identity-normalization",
        unresolvedReason:
          "No complete DrugCentral SMILES/InChI/InChIKey structure exists for this FDA-list row in the selected structure snapshot; no chemical identity was inferred.",
      };
    }
    if (!pubChem) {
      return {
        preferredName,
        aliases,
        approval,
        structure,
        pubChem: null,
        assets: { twoD: null, threeD: null },
        unresolvedStage: "pubchem-resolution",
        unresolvedReason:
          "The exact DrugCentral InChIKey did not resolve to one unique PubChem CID; no name-based fallback was used.",
      };
    }
    const resolvedTwoD = assets?.twoD ?? null;
    const resolvedThreeD = assets?.threeD ?? null;
    const hasCompletePair = resolvedTwoD !== null && resolvedThreeD !== null;
    const twoD = hasCompletePair ? resolvedTwoD : null;
    const threeD = hasCompletePair ? resolvedThreeD : null;
    return {
      preferredName,
      aliases,
      approval,
      structure,
      pubChem,
      assets: { twoD, threeD },
      unresolvedStage:
        twoD === null || threeD === null ? "structure-resolution" : undefined,
      unresolvedReason:
        resolvedTwoD === null && resolvedThreeD === null
          ? "PubChem resolved the exact identity, but neither a verified 2D nor 3D SDF asset pair was available."
          : resolvedTwoD === null
            ? "PubChem resolved the exact identity, but a verified 2D SDF asset was unavailable."
            : resolvedThreeD === null
              ? "PubChem resolved the exact identity, but a verified 3D conformer SDF was unavailable."
              : null,
    };
  });

  const capturedAt = new Date().toISOString();
  const completeStructurePairs = records.filter(
    (record) => record.assets.twoD !== null && record.assets.threeD !== null,
  ).length;
  const sourceDescriptors: CatalogSourceDescriptor[] = [
    {
      id: "source:drugcentral-fda-approved-all-v1",
      adapter: "drugcentral-approved",
      sourceUrl: catalogSourceUrls.drugCentralApproved,
      licenseUrl: catalogSourceUrls.drugCentralLicense,
      capturedAt,
      sourceLastModified: approvalDownload.lastModified,
      sha256: sha256(approvalDownload.content),
      totalSourceRows: approvalRows.length,
      selectedRows: approvalRows.length,
      role: "regulatory",
    },
    {
      id: "source:drugcentral-structures-2021-09-eligible-v1",
      adapter: "drugcentral-structures",
      sourceUrl: catalogSourceUrls.drugCentralStructures,
      licenseUrl: catalogSourceUrls.drugCentralLicense,
      capturedAt,
      sourceLastModified: structureDownload.lastModified,
      sha256: sha256(structureDownload.content),
      totalSourceRows: structureSourceRowCount,
      selectedRows: selectedCandidates.length,
      role: "identity",
    },
    {
      id: "source:pubchem-pug-rest-exact-inchikey-v1",
      adapter: "pubchem-pug-rest",
      sourceUrl: catalogSourceUrls.pubChemPugRest,
      licenseUrl: catalogSourceUrls.pubChemDocs,
      capturedAt,
      sourceLastModified: null,
      sha256: null,
      totalSourceRows: null,
      selectedRows: records.filter((record) => record.pubChem !== null).length,
      role: "structure",
    },
  ];
  const snapshot: CatalogSnapshot = {
    schemaVersion: 1,
    snapshotId: `drugcentral-fda-pubchem-eligible-${capturedAt.slice(0, 10)}`,
    capturedAt,
    scope: {
      label:
        "All rows in the selected DrugCentral FDA list evaluated against exact DrugCentral and PubChem structure evidence",
      jurisdictions: [...catalogSelectionPolicy.jurisdictions],
      candidateCount: records.length,
      exhaustive: false,
      sourceSelectionExhaustive: true,
      selectionPolicy:
        `Every one of the ${approvalRows.length} source FDA-list rows is evaluated. Import requires a complete same-ID DrugCentral structure, one exact PubChem InChIKey match, and verified local 2D/3D SDF assets.`,
      exclusions: [
        "The selected DrugCentral FDA list is evaluated exhaustively, but it is not asserted to be the complete global approved-drug universe.",
        "Rows without a complete same-ID small-molecule structure, one exact PubChem identity, or both verified SDF dimensions fail closed and remain in the unresolved report.",
        "DrugCentral list membership does not prove an FDA application, product, dosage form, salt, parent, or active-moiety relationship; those fields remain unresolved.",
        "Biologics and mixtures without a source-proven single chemical identity are not converted into synthetic small molecules.",
        "EMA and PMDA direct snapshots are not configured in this version.",
      ],
    },
    sources: sourceDescriptors,
    records,
  };
  await mkdir(new URL("./", snapshotUrl), { recursive: true });
  await writeFile(snapshotUrl, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await pruneUnreferencedStructures(records);

  return {
    mode: "refreshed",
    snapshotPath: snapshotUrl.pathname,
    selectedCandidates: records.length,
    structureCandidates: selectedCandidates.length,
    pubChemResolved: records.filter((record) => record.pubChem !== null).length,
    completeStructurePairs,
    unresolved: records.length - completeStructurePairs,
    networkRequestsPlanned: true,
  };
};
