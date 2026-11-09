import { BoundedLruCache } from "./cache";
import { normalizeCatalogName } from "./identity";
import type { CatalogSearchIndex, CatalogShard } from "./sharding";
import type {
  CatalogManifest,
  CatalogNormalizedEntity,
  CatalogStructureAsset,
} from "./types";

export const resolveCatalogAssetPath = (
  publicPath: string,
  basePath = "/",
): string => {
  const relative = publicPath.replace(/^\/+/, "");
  const normalizedBase = `/${basePath.replace(/^\/+|\/+$/g, "")}`;
  return normalizedBase === "/" ? `/${relative}` : `${normalizedBase}/${relative}`;
};

export interface StaticCatalogClientOptions {
  readonly basePath?: string;
  readonly fetchImpl?: typeof fetch;
  readonly maxShardEntries?: number;
  readonly maxStructureEntries?: number;
}

export type CatalogSearchRecord = CatalogSearchIndex["records"][number];

const ensureOk = async (response: Response, path: string): Promise<Response> => {
  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status}) for ${path}.`);
  }
  return response;
};

export class StaticCatalogClient {
  readonly #basePath: string;
  readonly #fetch: typeof fetch;
  readonly #shards: BoundedLruCache<string, Promise<CatalogShard>>;
  readonly #structures: BoundedLruCache<string, Promise<string>>;
  #manifest: Promise<CatalogManifest> | null = null;
  #searchIndex: Promise<CatalogSearchIndex> | null = null;

  constructor(options: StaticCatalogClientOptions = {}) {
    this.#basePath = options.basePath ?? "/";
    // Chromium's Window.fetch requires its receiver; keeping the bare method
    // as a class field causes an "Illegal invocation" in the production UI.
    this.#fetch = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
    this.#shards = new BoundedLruCache(options.maxShardEntries ?? 8);
    this.#structures = new BoundedLruCache(options.maxStructureEntries ?? 24);
  }

  async loadManifest(): Promise<CatalogManifest> {
    this.#manifest ??= this.#loadJson<CatalogManifest>("/catalog/manifest.json");
    try {
      const manifest = await this.#manifest;
      if (manifest.schemaVersion !== 1 || manifest.structureLoading !== "per-molecule-lazy") {
        throw new Error("Unsupported static catalog manifest.");
      }
      return manifest;
    } catch (error) {
      this.#manifest = null;
      throw error;
    }
  }

  async loadSearchIndex(): Promise<CatalogSearchIndex> {
    if (!this.#searchIndex) {
      this.#searchIndex = this.loadManifest().then((manifest) =>
        this.#loadJson<CatalogSearchIndex>(`/catalog/${manifest.searchIndex}`),
      );
    }
    try {
      const index = await this.#searchIndex;
      if (index.schemaVersion !== 1 || !Array.isArray(index.records)) {
        throw new Error("Unsupported static catalog search index.");
      }
      return index;
    } catch (error) {
      this.#searchIndex = null;
      throw error;
    }
  }

  async search(query: string, limit = 20): Promise<readonly CatalogSearchRecord[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("Catalog search limit must be an integer from 1 to 100.");
    }
    const normalized = normalizeCatalogName(query);
    if (normalized.length < 2) return [];
    const terms = normalized.split(" ");
    const index = await this.loadSearchIndex();
    return index.records
      .filter((record) =>
        terms.every((term) =>
          [
            normalizeCatalogName(record.preferredName),
            ...record.aliases.map(normalizeCatalogName),
            ...record.tokens,
          ].some((candidate) => candidate.includes(term)),
        ),
      )
      .sort((left, right) => {
        const leftName = normalizeCatalogName(left.preferredName);
        const rightName = normalizeCatalogName(right.preferredName);
        const leftRank = leftName.startsWith(normalized) ? 0 : 1;
        const rightRank = rightName.startsWith(normalized) ? 0 : 1;
        return leftRank - rightRank || leftName.localeCompare(rightName, "en");
      })
      .slice(0, limit);
  }

  async loadEntity(entityId: string): Promise<CatalogNormalizedEntity | null> {
    const [manifest, index] = await Promise.all([
      this.loadManifest(),
      this.loadSearchIndex(),
    ]);
    const searchRecord = index.records.find((record) => record.id === entityId);
    if (!searchRecord) return null;
    const shardId = searchRecord.shardIds.find((id) => id.startsWith("alphabetic:"));
    const descriptor = manifest.shards.find((shard) => shard.id === shardId);
    if (!descriptor) {
      throw new Error(`Catalog entity ${entityId} has no resolvable alphabetic shard.`);
    }
    const shard = await this.#loadShard(descriptor.path);
    return shard.records.find((entity) => entity.id === entityId) ?? null;
  }

  async loadStructure(
    entity: CatalogNormalizedEntity,
    dimension: "2d" | "3d",
  ): Promise<string> {
    const asset = dimension === "2d" ? entity.structures.twoD : entity.structures.threeD;
    const cacheKey = `${entity.id}:${dimension}:${asset.sha256}`;
    const cached = this.#structures.get(cacheKey);
    if (cached) return cached;
    const request = this.#loadStructureText(entity, dimension, asset);
    this.#structures.set(cacheKey, request);
    try {
      return await request;
    } catch (error) {
      this.#structures.delete(cacheKey);
      throw error;
    }
  }

  async #loadShard(relativePath: string): Promise<CatalogShard> {
    const cached = this.#shards.get(relativePath);
    if (cached) return cached;
    const request = this.#loadJson<CatalogShard>(`/catalog/${relativePath}`);
    this.#shards.set(relativePath, request);
    try {
      const shard = await request;
      if (shard.schemaVersion !== 1 || !Array.isArray(shard.records)) {
        throw new Error(`Unsupported static catalog shard: ${relativePath}.`);
      }
      return shard;
    } catch (error) {
      this.#shards.delete(relativePath);
      throw error;
    }
  }

  async #loadStructureText(
    entity: CatalogNormalizedEntity,
    dimension: "2d" | "3d",
    asset: CatalogStructureAsset,
  ): Promise<string> {
    const path = resolveCatalogAssetPath(asset.path, this.#basePath);
    const text = await (await ensureOk(await this.#fetch(path), path)).text();
    const cidPattern = new RegExp(
      `> <PUBCHEM_COMPOUND_CID>\\r?\\n${entity.identity.pubChemCid}(?:\\r?\\n|$)`,
    );
    const keyPattern = new RegExp(
      `> <PUBCHEM_IUPAC_INCHIKEY>\\r?\\n${entity.identity.inchiKey}(?:\\r?\\n|$)`,
    );
    if (!cidPattern.test(text) || (dimension === "2d" && !keyPattern.test(text))) {
      throw new Error(`Catalog ${dimension.toUpperCase()} structure identity mismatch.`);
    }
    return text;
  }

  async #loadJson<Value>(publicPath: string): Promise<Value> {
    const path = resolveCatalogAssetPath(publicPath, this.#basePath);
    return (await ensureOk(await this.#fetch(path), path)).json() as Promise<Value>;
  }
}
