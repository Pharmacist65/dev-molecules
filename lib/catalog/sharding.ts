import { catalogAdapterCapabilities } from "./adapters";
import { normalizeCatalogName } from "./identity";
import type {
  CatalogBuildResult,
  CatalogManifest,
  CatalogNormalizedEntity,
  CatalogShardDescriptor,
  CatalogSnapshot,
} from "./types";

export interface CatalogSearchIndex {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly records: readonly {
    readonly id: string;
    readonly preferredName: string;
    readonly aliases: readonly string[];
    readonly formula: string;
    readonly inchiKey: string;
    readonly pubChemCid: number;
    readonly tokens: readonly string[];
    readonly shardIds: readonly string[];
  }[];
}

export interface CatalogShard {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly dimension: "alphabetic" | "therapeutic";
  readonly key: string;
  readonly records: readonly CatalogNormalizedEntity[];
}

const alphabeticBucket = (name: string): string => {
  const first = normalizeCatalogName(name).charAt(0);
  if (first >= "a" && first <= "z") return first;
  return "other";
};

const tokenize = (values: readonly string[]): readonly string[] =>
  [...new Set(
    values
      .flatMap((value) => normalizeCatalogName(value).split(" "))
      .filter((value) => value.length >= 2),
  )].sort((left, right) => left.localeCompare(right, "en"));

export const buildCatalogSearchIndex = (
  snapshotId: string,
  entities: readonly CatalogNormalizedEntity[],
): CatalogSearchIndex => ({
  schemaVersion: 1,
  snapshotId,
  records: entities.map((entity) => ({
    id: entity.id,
    preferredName: entity.preferredName,
    aliases: entity.aliases,
    formula: entity.identity.molecularFormula,
    inchiKey: entity.identity.inchiKey,
    pubChemCid: entity.identity.pubChemCid,
    tokens: tokenize([
      entity.preferredName,
      ...entity.aliases,
      entity.identity.molecularFormula,
      entity.identity.inchiKey,
      String(entity.identity.pubChemCid),
    ]),
    shardIds: [
      `alphabetic:${alphabeticBucket(entity.preferredName)}`,
      ...entity.therapeuticGroups.map((group) => `therapeutic:${group}`),
    ],
  })),
});

export const buildCatalogShards = (
  snapshotId: string,
  entities: readonly CatalogNormalizedEntity[],
): readonly CatalogShard[] => {
  const groups = new Map<string, CatalogNormalizedEntity[]>();
  for (const entity of entities) {
    const alphaKey = `alphabetic:${alphabeticBucket(entity.preferredName)}`;
    const alpha = groups.get(alphaKey) ?? [];
    alpha.push(entity);
    groups.set(alphaKey, alpha);
    for (const therapeutic of entity.therapeuticGroups) {
      const therapeuticKey = `therapeutic:${therapeutic}`;
      const records = groups.get(therapeuticKey) ?? [];
      records.push(entity);
      groups.set(therapeuticKey, records);
    }
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([compositeKey, records]) => {
      const [dimension, key] = compositeKey.split(":") as [
        "alphabetic" | "therapeutic",
        string,
      ];
      return {
        schemaVersion: 1,
        snapshotId,
        dimension,
        key,
        records,
      };
    });
};

export const shardPath = (shard: CatalogShard): string =>
  `shards/${shard.dimension}/${shard.key}.json`;

export const buildCatalogManifest = (
  snapshot: CatalogSnapshot,
  build: CatalogBuildResult,
  shards: readonly CatalogShard[],
): CatalogManifest => {
  const descriptors: CatalogShardDescriptor[] = shards.map((shard) => ({
    id: `${shard.dimension}:${shard.key}`,
    dimension: shard.dimension,
    label: shard.key,
    path: shardPath(shard),
    count: shard.records.length,
  }));
  return {
    schemaVersion: 1,
    snapshotId: snapshot.snapshotId,
    generatedAt: snapshot.capturedAt,
    scope: snapshot.scope,
    recordCount: build.entities.length,
    searchIndex: "search-index.v1.json",
    reports: {
      coverage: "reports/coverage.json",
      unresolved: "reports/unresolved.json",
    },
    projections: {
      therapeutic: "projections/therapeutic.json",
    },
    shards: descriptors,
    structureLoading: "per-molecule-lazy",
    cachePolicy: {
      strategy: "bounded-lru",
      defaultMaxEntries: 24,
    },
    adapterCapabilities: catalogAdapterCapabilities.map((capability) => ({
      adapter: capability.adapter,
      status:
        capability.adapter === "drugcentral-approved" ||
        capability.adapter === "drugcentral-structures" ||
        capability.adapter === "pubchem-pug-rest"
          ? "used"
          : capability.status,
    })),
  };
};
