import {
  BoundedLruCache,
  StaticCatalogClient,
  type CatalogManifest,
  type CatalogNormalizedEntity,
  type CatalogSearchRecord,
  type CatalogShard,
  type StaticCatalogClientOptions,
} from "@/lib/catalog";
import {
  createCategoricalLensProjection,
  createStructuralSimilarityProjection,
  getNearestStructuralNeighbors,
  type LensProjection,
} from "@/lib/explore";
import type { Locale } from "@/lib/i18n";

import {
  type ExploreCatalogView,
  type ExploreMoleculeView,
  resolvePublicAssetPath,
} from "./explore-catalog";
import { identifyFunctionalGroups } from "./molecule-learning";

export interface CatalogExpansion {
  readonly manifest: CatalogManifest;
  readonly entities: readonly CatalogNormalizedEntity[];
}

export interface IndexedCatalogHit {
  readonly id: string;
  readonly stableSlug: string;
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly formula: string;
  readonly pubChemCid: number;
}

export interface IndexedCatalogBrowsePage {
  readonly records: readonly IndexedCatalogHit[];
  readonly offset: number;
  readonly total: number;
  readonly nextOffset: number | null;
  readonly previousOffset: number | null;
}

/**
 * Exact-CID bridge between the complete imported index and the smaller,
 * human-reviewed resident catalog. A matching imported identity is an alias
 * of the reviewed record; it must never create a second molecule identity.
 */
export interface ReviewedCatalogIdentityIndex {
  readonly byPubChemCid: ReadonlyMap<number, ExploreMoleculeView>;
  readonly byCanonicalId: ReadonlyMap<string, ExploreMoleculeView>;
}

export interface IndexedCatalogNavigatorOptions extends StaticCatalogClientOptions {
  readonly maxHydratedEntries?: number;
}

export type CatalogJsonLoader = (url: string) => Promise<unknown>;
export const MAX_INITIAL_CATALOG_METADATA_RECORDS = 40;
export const MAX_INITIAL_CATALOG_SHARDS = 4;
export const DEFAULT_INDEXED_CATALOG_PAGE_SIZE = 12;
export const MAX_INDEXED_CATALOG_PAGE_SIZE = 40;
export const MAX_RUNTIME_HYDRATED_RECORDS = 16;
export const MIN_DISPLAY_STRUCTURE_NEIGHBOR_SCORE = 0.45;

export const isDisplayableStructureNeighborScore = (score: number): boolean =>
  Number.isFinite(score) && score >= MIN_DISPLAY_STRUCTURE_NEIGHBOR_SCORE && score <= 1;

export function createReviewedCatalogIdentityIndex(
  molecules: readonly ExploreMoleculeView[],
): ReviewedCatalogIdentityIndex {
  const byPubChemCid = new Map<number, ExploreMoleculeView>();
  const byCanonicalId = new Map<string, ExploreMoleculeView>();
  for (const molecule of molecules) {
    if (byCanonicalId.has(molecule.id)) {
      throw new Error(`Duplicate reviewed catalog molecule ID: ${molecule.id}`);
    }
    const pubChemCid = molecule.structure.pubChemCid;
    if (!Number.isSafeInteger(pubChemCid) || pubChemCid < 1) {
      throw new Error(`Invalid reviewed catalog PubChem CID for ${molecule.id}`);
    }
    if (byPubChemCid.has(pubChemCid)) {
      throw new Error(`Duplicate reviewed catalog PubChem CID: ${pubChemCid}`);
    }
    byCanonicalId.set(molecule.id, molecule);
    byPubChemCid.set(pubChemCid, molecule);
  }
  return { byPubChemCid, byCanonicalId };
}

/**
 * Converts an imported index hit to its reviewed identity only when PubChem
 * CID is an exact match. The imported stable slug remains accepted by the
 * index resolver, while newly written URLs use the reviewed canonical slug.
 */
export function canonicalizeIndexedCatalogHit(
  hit: IndexedCatalogHit,
  reviewed: ReviewedCatalogIdentityIndex,
): IndexedCatalogHit {
  const canonical = reviewed.byPubChemCid.get(hit.pubChemCid);
  if (!canonical) return hit;
  return {
    ...hit,
    id: canonical.id,
    stableSlug: getIndexedCatalogStableSlug(canonical.id),
    preferredName: canonical.name,
    formula: canonical.formula ?? hit.formula,
    aliases: [...new Set(hit.aliases.filter((alias) => alias !== canonical.name))],
  };
}

export function canonicalizeIndexedCatalogBrowsePage(
  page: IndexedCatalogBrowsePage,
  reviewed: ReviewedCatalogIdentityIndex,
): IndexedCatalogBrowsePage {
  return {
    ...page,
    records: page.records.map((record) => canonicalizeIndexedCatalogHit(record, reviewed)),
  };
}

/**
 * Keeps runtime-only entity hydration bounded without evicting the seed window.
 * Re-selecting a record refreshes its recency instead of duplicating it.
 */
export function retainHydratedCatalogEntity(
  current: readonly CatalogNormalizedEntity[],
  entity: CatalogNormalizedEntity,
  limit = MAX_RUNTIME_HYDRATED_RECORDS,
): readonly CatalogNormalizedEntity[] {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Runtime catalog entity limit must be a positive safe integer.");
  }
  return [...current.filter((candidate) => candidate.id !== entity.id), entity].slice(-limit);
}

const jsonLoader: CatalogJsonLoader = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  return response.json() as Promise<unknown>;
};

function isManifest(value: unknown): value is CatalogManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<CatalogManifest>;
  return (
    manifest.schemaVersion === 1 &&
    typeof manifest.snapshotId === "string" &&
    Number.isSafeInteger(manifest.recordCount) &&
    Array.isArray(manifest.shards)
  );
}

function isShard(value: unknown): value is CatalogShard {
  if (!value || typeof value !== "object") return false;
  const shard = value as Partial<CatalogShard>;
  return shard.schemaVersion === 1 && Array.isArray(shard.records);
}

function safeCatalogPath(path: string) {
  if (path.startsWith("/") || path.includes("..") || !path.endsWith(".json")) {
    throw new Error(`Unsafe catalog shard path: ${path}`);
  }
  return path;
}

function selectRepresentativeAlphabeticShards(
  shards: readonly CatalogManifest["shards"][number][],
) {
  if (shards.length <= MAX_INITIAL_CATALOG_SHARDS) return [...shards];
  const lastIndex = shards.length - 1;
  return [
    ...new Set(
      Array.from({ length: MAX_INITIAL_CATALOG_SHARDS }, (_, index) =>
        Math.round((index * lastIndex) / (MAX_INITIAL_CATALOG_SHARDS - 1)),
      ),
    ),
  ].flatMap((index) => (shards[index] ? [shards[index]] : []));
}

function interleaveInitialRecords(
  shards: readonly (readonly CatalogNormalizedEntity[])[],
) {
  const selected: CatalogNormalizedEntity[] = [];
  let recordIndex = 0;
  while (selected.length < MAX_INITIAL_CATALOG_METADATA_RECORDS) {
    let added = false;
    for (const records of shards) {
      const entity = records[recordIndex];
      if (!entity) continue;
      selected.push(entity);
      added = true;
      if (selected.length >= MAX_INITIAL_CATALOG_METADATA_RECORDS) break;
    }
    if (!added) break;
    recordIndex += 1;
  }
  return selected;
}

/** Loads metadata shards only; 2D/3D structure assets remain scene-lazy. */
export async function loadCatalogExpansion(
  assetBasePath = "/",
  loadJson: CatalogJsonLoader = jsonLoader,
): Promise<CatalogExpansion> {
  const catalogRoot = resolvePublicAssetPath("/catalog/", assetBasePath);
  const manifestValue = await loadJson(`${catalogRoot}manifest.json`);
  if (!isManifest(manifestValue)) throw new Error("Catalog manifest is invalid");

  const alphabeticShards = manifestValue.shards.filter(
    (shard) => shard.dimension === "alphabetic",
  );
  const initialShards = selectRepresentativeAlphabeticShards(alphabeticShards);
  const loaded = await Promise.all(
    initialShards.map(async (descriptor) => {
      const value = await loadJson(`${catalogRoot}${safeCatalogPath(descriptor.path)}`);
      if (!isShard(value) || value.snapshotId !== manifestValue.snapshotId) {
        throw new Error(`Catalog shard ${descriptor.id} is invalid`);
      }
      if (value.records.length !== descriptor.count) {
        throw new Error(`Catalog shard ${descriptor.id} count does not match manifest`);
      }
      return value.records;
    }),
  );
  const entities = interleaveInitialRecords(loaded);
  const ids = new Set(entities.map((entity) => entity.id));
  const expectedInitialCount = Math.min(
    manifestValue.recordCount,
    MAX_INITIAL_CATALOG_METADATA_RECORDS,
  );
  if (ids.size !== entities.length || entities.length !== expectedInitialCount) {
    throw new Error("Catalog expansion has duplicate or missing entity records");
  }
  return { manifest: manifestValue, entities };
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const EXPANSION_ACCENTS = [
  "#4f7fe4",
  "#f47a32",
  "#7d5fd0",
  "#2f6bb2",
  "#dc5d7d",
  "#e49b32",
] as const;

export function createExpandedExploreMolecule(
  entity: CatalogNormalizedEntity,
  locale: Locale,
  assetBasePath: string,
): ExploreMoleculeView {
  const pending = locale === "tr"
    ? "Sınıflandırılmamış · kürasyon bekliyor"
    : "Unclassified · curation pending";
  const functionalGroups = identifyFunctionalGroups(entity.identity.canonicalSmiles, locale);
  const sourceLabel = `PubChem PUG REST · CID ${entity.identity.pubChemCid}`;
  const sourceUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${entity.identity.pubChemCid}`;
  return {
    id: entity.id,
    name: entity.preferredName,
    canonicalSmiles: entity.identity.canonicalSmiles,
    formula: entity.identity.molecularFormula,
    category: pending,
    summary:
      locale === "tr"
        ? "Kaynak eşleşmeli katalog kaydı; eğitim sınıflandırması henüz kürate edilmedi."
        : "Source-matched catalog record; educational classification has not yet been curated.",
    lensValues: {
      therapeutic: pending,
      target: pending,
      scaffold: pending,
      "structural-similarity": pending,
    },
    lensKeys: {
      therapeutic: "unclassified",
      target: "unclassified",
      scaffold: "unclassified",
      "structural-similarity": "unclassified",
    },
    lensAliases: {
      therapeutic: ["unclassified", "Sınıflandırılmamış · kürasyon bekliyor", "Unclassified · curation pending"],
      target: ["unclassified", "Sınıflandırılmamış · kürasyon bekliyor", "Unclassified · curation pending"],
      scaffold: ["unclassified", "Sınıflandırılmamış · kürasyon bekliyor", "Unclassified · curation pending"],
      "structural-similarity": ["unclassified", "Sınıflandırılmamış · kürasyon bekliyor", "Unclassified · curation pending"],
    },
    coordinates: {},
    evidenceLabel:
      locale === "tr"
        ? "Kaynak eşleşmeli kimlik · eğitim sınıflandırması bekliyor"
        : "Source-matched identity · educational classification pending",
    evidenceTone: "supported",
    accent: EXPANSION_ACCENTS[stableHash(entity.id) % EXPANSION_ACCENTS.length]!,
    studentProfile: {
      functionalGroups,
      functionalGroupsStatus: "computed-unreviewed",
      scaffoldFamily: pending,
      scaffoldDetail: pending,
      drugClass: pending,
      mechanismSummary:
        locale === "tr"
          ? "Bu kayıt için mekanizma anlatımı henüz kürate edilmedi."
          : "A mechanism lesson has not yet been curated for this record.",
      synthesisScope:
        locale === "tr"
          ? "Bu kayıt için kaynak bağlantılı eğitim rotası henüz yok."
          : "No source-linked educational route is available for this record yet.",
      nomenclatureLesson:
        functionalGroups.length > 0
          ? functionalGroups.slice(0, 3).join(" · ")
          : pending,
    },
    structuralNeighbors: [],
    structure: {
      pubChemCid: entity.identity.pubChemCid,
      twoDUrl: resolvePublicAssetPath(entity.structures.twoD.path, assetBasePath),
      threeDUrl: resolvePublicAssetPath(entity.structures.threeD.path, assetBasePath),
      sourceLabel,
      sourceId: `source:pubchem-${entity.identity.pubChemCid}`,
      sourceHref: sourceUrl,
      originLabel: "computed-3d-conformer",
      reviewStatus: "source-supported",
      twoDSourceLabel: sourceLabel,
      twoDSourceId: `source:pubchem-${entity.identity.pubChemCid}`,
      twoDSourceHref: sourceUrl,
      twoDOriginLabel: "database-2d-record",
      twoDReviewStatus: "source-supported",
    },
  };
}

export function mergeCatalogExpansionIntoExplore(
  seed: ExploreCatalogView,
  expansion: CatalogExpansion,
  locale: Locale,
  assetBasePath = "/",
): ExploreCatalogView {
  const seedCids = new Set(seed.molecules.map((molecule) => molecule.structure.pubChemCid));
  const imported = expansion.entities
    .filter((entity) => !seedCids.has(entity.identity.pubChemCid))
    .map((entity) => createExpandedExploreMolecule(entity, locale, assetBasePath));
  const molecules = [...seed.molecules, ...imported];
  const inputVersion = `${expansion.manifest.snapshotId}:merged:${molecules.length}`;

  const categorical = seed.lenses
    .filter((lens) => lens.id !== "structural-similarity")
    .map((lens) =>
      createCategoricalLensProjection(
        {
          lensId: lens.id,
          projectionId: `projection:${lens.id}:catalog-expansion-v1`,
          algorithmVersion: "categorical-layout@1.0.0",
          inputVersion,
          generatedAt: expansion.manifest.generatedAt,
          meaning: lens.meaning,
          doesNotMean: lens.doesNotMean,
          verificationStatus: "pending-review",
        },
        molecules.map((molecule) => ({
          id: molecule.id,
          category: molecule.lensValues[lens.id] ?? molecule.category ?? "Unclassified",
        })),
      ),
    );
  const structural = createStructuralSimilarityProjection(
    {
      lensId: "structural-similarity",
      projectionId: "projection:structural-similarity:catalog-expansion-v1",
      inputVersion,
      generatedAt: expansion.manifest.generatedAt,
      meaning:
        seed.lenses.find((lens) => lens.id === "structural-similarity")?.meaning ?? "",
      doesNotMean:
        seed.lenses.find((lens) => lens.id === "structural-similarity")?.doesNotMean ?? "",
      verificationStatus: "source-supported",
    },
    molecules.map((molecule) => {
      const canonicalSmiles =
        molecule.canonicalSmiles;
      if (!canonicalSmiles) {
        throw new Error(`No canonical SMILES for expanded record ${molecule.id}`);
      }
      return { id: molecule.id, canonicalSmiles };
    }),
  );
  const projections: readonly LensProjection[] = [...categorical, structural];
  const projectionByLens = new Map(projections.map((projection) => [projection.lensId, projection]));
  const updatedMolecules = molecules.map((molecule) => ({
    ...molecule,
    coordinates: Object.fromEntries(
      projections.flatMap((projection) => {
        const coordinate = projection.coordinates[molecule.id];
        return coordinate ? [[projection.lensId, coordinate] as const] : [];
      }),
    ),
    structuralNeighbors: getNearestStructuralNeighbors(structural, molecule.id, 12)
      .filter((neighbor) => isDisplayableStructureNeighborScore(neighbor.score))
      .slice(0, 4),
  }));
  const lenses = seed.lenses.map((lens) => {
    const projection = projectionByLens.get(lens.id);
    if (!projection) throw new Error(`Missing expanded projection for ${lens.id}`);
    return {
      ...lens,
      projectionId: projection.projectionId,
      algorithm: projection.algorithm,
      algorithmVersion: projection.algorithmVersion,
      inputVersion: projection.inputVersion,
      inputHash: projection.inputHash,
      generatedAt: projection.generatedAt,
      verificationStatus: projection.verificationStatus,
    };
  });

  return { molecules: updatedMolecules, lenses, projections };
}

export function getIndexedCatalogStableSlug(entityId: string): string {
  const separatorIndex = Math.max(entityId.lastIndexOf(":"), entityId.lastIndexOf("/"));
  return separatorIndex >= 0 ? entityId.slice(separatorIndex + 1) : entityId;
}

const toIndexedCatalogHit = (record: CatalogSearchRecord): IndexedCatalogHit => ({
  id: record.id,
  stableSlug: getIndexedCatalogStableSlug(record.id),
  preferredName: record.preferredName,
  aliases: record.aliases,
  formula: record.formula,
  pubChemCid: record.pubChemCid,
});

const validatePage = (offset: number, limit: number) => {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Catalog browse offset must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_INDEXED_CATALOG_PAGE_SIZE) {
    throw new Error(
      `Catalog browse limit must be an integer from 1 to ${MAX_INDEXED_CATALOG_PAGE_SIZE}.`,
    );
  }
};

/**
 * Production read path for the full static catalog. The compact index may span
 * the complete snapshot, while entity and structure hydration remain lazy and
 * bounded. Structure bytes are still owned by the scene's existing SDF cache.
 */
export class IndexedCatalogNavigator {
  readonly #client: StaticCatalogClient;
  readonly #entities: BoundedLruCache<
    string,
    Promise<CatalogNormalizedEntity | null>
  >;
  #recordsByStableSlug: Promise<ReadonlyMap<string, CatalogSearchRecord>> | null = null;

  constructor(options: IndexedCatalogNavigatorOptions = {}) {
    const {
      maxHydratedEntries = MAX_RUNTIME_HYDRATED_RECORDS,
      ...clientOptions
    } = options;
    this.#client = new StaticCatalogClient(clientOptions);
    this.#entities = new BoundedLruCache(maxHydratedEntries);
  }

  async manifest(): Promise<CatalogManifest> {
    const [manifest, index] = await Promise.all([
      this.#client.loadManifest(),
      this.#client.loadSearchIndex(),
    ]);
    if (index.snapshotId !== manifest.snapshotId) {
      throw new Error("Catalog index snapshot does not match the manifest.");
    }
    if (index.records.length !== manifest.recordCount) {
      throw new Error("Catalog index count does not match the manifest.");
    }
    return manifest;
  }

  async search(
    query: string,
    limit = DEFAULT_INDEXED_CATALOG_PAGE_SIZE,
  ): Promise<readonly IndexedCatalogHit[]> {
    validatePage(0, limit);
    await this.manifest();
    return (await this.#client.search(query, limit)).map(toIndexedCatalogHit);
  }

  async browse(
    offset = 0,
    limit = DEFAULT_INDEXED_CATALOG_PAGE_SIZE,
  ): Promise<IndexedCatalogBrowsePage> {
    validatePage(offset, limit);
    const manifest = await this.manifest();
    const index = await this.#client.loadSearchIndex();
    const ordered = [...index.records].sort((left, right) =>
      left.preferredName.localeCompare(right.preferredName, "en"),
    );
    const boundedOffset = Math.min(offset, Math.max(0, ordered.length - 1));
    const records = ordered
      .slice(boundedOffset, boundedOffset + limit)
      .map(toIndexedCatalogHit);
    return {
      records,
      offset: boundedOffset,
      total: manifest.recordCount,
      nextOffset:
        boundedOffset + records.length < manifest.recordCount
          ? boundedOffset + records.length
          : null,
      previousOffset: boundedOffset > 0 ? Math.max(0, boundedOffset - limit) : null,
    };
  }

  /**
   * Resolves only the canonical URL slug encoded in the compact catalog index.
   * The map is constructed once per navigator and does not hydrate any shard or
   * structure bytes. Ambiguous generated slugs fail closed.
   */
  async resolveStableSlug(stableSlug: string): Promise<IndexedCatalogHit | null> {
    if (
      !stableSlug ||
      stableSlug !== stableSlug.trim() ||
      stableSlug.length > 512
    ) {
      return null;
    }
    const records = await this.#loadStableSlugIndex();
    const record = records.get(stableSlug);
    return record ? toIndexedCatalogHit(record) : null;
  }

  async hydrate(entityId: string): Promise<CatalogNormalizedEntity | null> {
    const normalizedId = entityId.trim();
    if (!normalizedId) return null;
    const cached = this.#entities.get(normalizedId);
    if (cached) return cached;
    const request = this.#loadEntity(normalizedId);
    this.#entities.set(normalizedId, request);
    try {
      return await request;
    } catch (error) {
      this.#entities.delete(normalizedId);
      throw error;
    }
  }

  async #loadEntity(entityId: string): Promise<CatalogNormalizedEntity | null> {
    const manifest = await this.manifest();
    const entity = await this.#client.loadEntity(entityId);
    if (!entity) return null;
    if (entity.provenance.snapshotId !== manifest.snapshotId) {
      throw new Error(`Catalog entity ${entityId} belongs to a different snapshot.`);
    }
    return entity;
  }

  async #loadStableSlugIndex(): Promise<ReadonlyMap<string, CatalogSearchRecord>> {
    if (!this.#recordsByStableSlug) {
      this.#recordsByStableSlug = this.manifest().then(async () => {
        const index = await this.#client.loadSearchIndex();
        const records = new Map<string, CatalogSearchRecord>();
        for (const record of index.records) {
          const slug = getIndexedCatalogStableSlug(record.id);
          if (!slug) throw new Error(`Catalog entity ${record.id} has no stable slug.`);
          const existing = records.get(slug);
          if (existing && existing.id !== record.id) {
            throw new Error(`Catalog stable slug is ambiguous: ${slug}.`);
          }
          records.set(slug, record);
        }
        return records;
      });
    }
    try {
      return await this.#recordsByStableSlug;
    } catch (error) {
      this.#recordsByStableSlug = null;
      throw error;
    }
  }
}
