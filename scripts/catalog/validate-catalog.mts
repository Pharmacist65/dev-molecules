import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import type {
  CatalogCoverage,
  CatalogManifest,
  CatalogNormalizedEntity,
  CatalogUnresolvedRecord,
} from "../../lib/catalog/types";
import type { CatalogSearchIndex, CatalogShard } from "../../lib/catalog/sharding";
import { catalogOutputUrl } from "./catalog-config.mjs";

const readJson = async <Value,>(relativePath: string): Promise<Value> =>
  JSON.parse(await readFile(new URL(relativePath, catalogOutputUrl), "utf8")) as Value;

const sha256 = (content: Uint8Array): string =>
  createHash("sha256").update(content).digest("hex");

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message);
};

export interface CatalogValidationSummary {
  readonly valid: true;
  readonly snapshotId: string;
  readonly recordCount: number;
  readonly alphabeticShardCount: number;
  readonly therapeuticShardCount: number;
  readonly structureAssetsChecked: number;
}

export const validateGeneratedCatalog = async (): Promise<CatalogValidationSummary> => {
  const manifest = await readJson<CatalogManifest>("manifest.json");
  const searchIndex = await readJson<CatalogSearchIndex>(manifest.searchIndex);
  const coverageReport = await readJson<{ readonly coverage: CatalogCoverage }>(
    manifest.reports.coverage,
  );
  const unresolvedReport = await readJson<{
    readonly count: number;
    readonly records: readonly CatalogUnresolvedRecord[];
  }>(
    manifest.reports.unresolved,
  );
  assert(manifest.schemaVersion === 1, "Unsupported public catalog manifest schema.");
  assert(manifest.recordCount > 0, "Generated catalog must contain resolved records.");
  assert(
    manifest.scope.sourceSelectionExhaustive === true,
    "Selected source rows must be processed exhaustively.",
  );
  assert(
    searchIndex.records.length === manifest.recordCount,
    "Search index count does not match manifest.",
  );
  assert(
    coverageReport.coverage.imported === manifest.recordCount,
    "Coverage count does not match manifest.",
  );
  assert(
    coverageReport.coverage.unresolved === unresolvedReport.count,
    "Unresolved report count does not match coverage.",
  );
  assert(
    coverageReport.coverage.sourceSnapshotCandidates ===
      coverageReport.coverage.sourceRegistryRows,
    "All selected registry rows must be represented in the snapshot.",
  );
  assert(
    coverageReport.coverage.candidateAccountingTotal ===
      coverageReport.coverage.sourceSnapshotCandidates,
    "Imported, unresolved and exactly merged rows do not account for every source row.",
  );
  assert(
    unresolvedReport.records.length === unresolvedReport.count &&
      unresolvedReport.records.every((record) => record.failClosed),
    "Every unresolved source row must remain record-level and fail closed.",
  );

  const alphabetic = manifest.shards.filter((shard) => shard.dimension === "alphabetic");
  const therapeutic = manifest.shards.filter((shard) => shard.dimension === "therapeutic");
  assert(alphabetic.length > 1, "Catalog must be split across alphabetic shards.");
  assert(therapeutic.length > 0, "Catalog must include therapeutic shards.");
  const alphaEntities = (
    await Promise.all(
      alphabetic.map(async (descriptor) => {
        const shard = await readJson<CatalogShard>(descriptor.path);
        assert(shard.records.length === descriptor.count, `Shard count mismatch: ${descriptor.id}`);
        return shard.records;
      }),
    )
  ).flat();
  assert(alphaEntities.length === manifest.recordCount, "Alphabetic shards lost records.");
  const ids = new Set(alphaEntities.map((entity) => entity.id));
  assert(ids.size === alphaEntities.length, "Alphabetic shards contain duplicate entities.");
  assert(
    new Set(searchIndex.records.map((record) => record.id)).size === manifest.recordCount,
    "Search index contains duplicate IDs.",
  );

  let structureAssetsChecked = 0;
  const referencedStructureFiles = new Set<string>();
  for (const entity of alphaEntities as readonly CatalogNormalizedEntity[]) {
    assert(
      entity.approvals.every(
        (approval) =>
          approval.applicationNumber === null &&
          approval.productId === null &&
          approval.applicationLinkageStatus === "unresolved" &&
          approval.jurisdictionEvidence === "drugcentral-fda-list-membership",
      ),
      `Approval/product linkage state is implicit for ${entity.id}.`,
    );
    assert(
      entity.commercialProducts.length === 0 &&
        entity.commercialProductResolution?.status === "unresolved",
      `Commercial-product resolution state is implicit for ${entity.id}.`,
    );
    assert(
      entity.chemicalForm.parentResolutionStatus ===
        (entity.chemicalForm.componentCount === 1 ? "not-applicable" : "unresolved"),
      `Parent-form resolution state is inconsistent for ${entity.id}.`,
    );
    for (const [dimension, asset] of [
      ["2D", entity.structures.twoD],
      ["3D", entity.structures.threeD],
    ] as const) {
      assert(
        asset.path.startsWith("/catalog/structures/pubchem/"),
        `Unsafe structure path for ${entity.id}.`,
      );
      const relativePath = asset.path.replace(/^\/catalog\//, "");
      referencedStructureFiles.add(relativePath.replace(/^structures\/pubchem\//, ""));
      const content = new Uint8Array(
        await readFile(new URL(relativePath, catalogOutputUrl)),
      );
      assert(content.byteLength === asset.byteLength, `${dimension} byte length mismatch.`);
      assert(sha256(content) === asset.sha256, `${dimension} SHA-256 mismatch.`);
      const text = new TextDecoder().decode(content);
      assert(
        new RegExp(
          `> <PUBCHEM_COMPOUND_CID>\\r?\\n${entity.identity.pubChemCid}(?:\\r?\\n|$)`,
        ).test(text),
        `${dimension} SDF does not contain its exact PubChem CID property.`,
      );
      if (dimension === "2D") {
        assert(
          new RegExp(
            `> <PUBCHEM_IUPAC_INCHIKEY>\\r?\\n${entity.identity.inchiKey}(?:\\r?\\n|$)`,
          ).test(text),
          `${dimension} SDF does not contain its exact PubChem InChIKey property.`,
        );
      }
      structureAssetsChecked += 1;
    }
  }
  const structureFiles = (await readdir(new URL("structures/pubchem/", catalogOutputUrl)))
    .filter((filename) => filename.endsWith(".sdf"))
    .sort();
  assert(
    structureFiles.length === structureAssetsChecked,
    "Catalog structure directory contains orphan or partial SDF assets.",
  );
  assert(
    structureFiles.every((filename) => referencedStructureFiles.has(filename)),
    "Catalog structure directory contains an unreferenced SDF asset.",
  );
  return {
    valid: true,
    snapshotId: manifest.snapshotId,
    recordCount: manifest.recordCount,
    alphabeticShardCount: alphabetic.length,
    therapeuticShardCount: therapeutic.length,
    structureAssetsChecked,
  };
};
