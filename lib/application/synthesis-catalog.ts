import {
  resolveCatalogAssetPath,
  type CatalogNormalizedEntity,
} from "@/lib/catalog";

import type { IndexedCatalogHit } from "./catalog-expansion";
import {
  loadBasicRecordSynthesisCoverage,
  type BasicRecordSynthesisCoverage,
  type BasicRecordSynthesisCoverageLoader,
} from "./basic-record-synthesis-coverage";

export interface SynthesisCatalogNavigator {
  resolveStableSlug(stableSlug: string): Promise<IndexedCatalogHit | null>;
  search(query: string, limit?: number): Promise<readonly IndexedCatalogHit[]>;
  hydrate(entityId: string): Promise<CatalogNormalizedEntity | null>;
}

export interface SynthesisCatalogFallbackIdentity {
  readonly curatedMoleculeId: string;
  readonly preferredName: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
}

export interface SynthesisCatalogSelection {
  readonly catalogEntityId: string;
  readonly stableSlug: string;
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly molecularFormula: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string | null;
  readonly structures: {
    readonly twoD: {
      readonly publicPath: string;
      readonly sourceUrl: string;
      readonly sha256: string;
    };
    readonly threeD: {
      readonly publicPath: string;
      readonly sourceUrl: string;
      readonly sha256: string;
      readonly origin: "computed-3d-conformer";
    };
  };
  readonly curatedMoleculeId: string | null;
  readonly coverage: BasicRecordSynthesisCoverage | null;
  readonly coverageLoadState: "ready" | "not_published" | "unavailable";
}

export interface ResolveSynthesisCatalogSelectionOptions {
  readonly assetBasePath?: string;
  readonly fallbackIdentity?: SynthesisCatalogFallbackIdentity;
  readonly coverageLoader?: BasicRecordSynthesisCoverageLoader;
}

const exactFallbackMatch = (
  entity: CatalogNormalizedEntity,
  fallback: SynthesisCatalogFallbackIdentity,
): boolean =>
  entity.identity.pubChemCid === fallback.pubChemCid &&
  entity.identity.inchiKey === fallback.inchiKey;

const exactHitEntityMatch = (
  hit: IndexedCatalogHit,
  entity: CatalogNormalizedEntity,
): boolean =>
  entity.id === hit.id &&
  entity.preferredName === hit.preferredName &&
  entity.identity.pubChemCid === hit.pubChemCid &&
  entity.identity.molecularFormula === hit.formula;

/**
 * Resolves a synthesis surface through the complete catalog index. Curated
 * aliases may bridge to the indexed record only through exact CID + InChIKey;
 * names alone never grant route access.
 */
export async function resolveSynthesisCatalogSelection(
  stableSlug: string,
  navigator: SynthesisCatalogNavigator,
  options: ResolveSynthesisCatalogSelectionOptions = {},
): Promise<SynthesisCatalogSelection | null> {
  const normalizedSlug = stableSlug.trim();
  if (!normalizedSlug || normalizedSlug !== stableSlug || normalizedSlug.length > 512) {
    return null;
  }

  let hit = await navigator.resolveStableSlug(normalizedSlug);
  if (!hit && options.fallbackIdentity) {
    const candidates = await navigator.search(options.fallbackIdentity.inchiKey, 12);
    const exactCandidates = candidates.filter(
      (candidate) => candidate.pubChemCid === options.fallbackIdentity?.pubChemCid,
    );
    if (exactCandidates.length !== 1) return null;
    hit = exactCandidates[0] ?? null;
  }
  if (!hit) return null;

  const entity = await navigator.hydrate(hit.id);
  if (!entity || !exactHitEntityMatch(hit, entity)) return null;
  if (options.fallbackIdentity && !exactFallbackMatch(entity, options.fallbackIdentity)) {
    return null;
  }

  const coverageLoader: BasicRecordSynthesisCoverageLoader =
    options.coverageLoader ?? ((identity, assetBasePath) =>
      loadBasicRecordSynthesisCoverage(identity, { assetBasePath }));
  let coverage: BasicRecordSynthesisCoverage | null = null;
  let coverageLoadState: SynthesisCatalogSelection["coverageLoadState"] = "ready";
  try {
    coverage = await coverageLoader(
      {
        catalogEntityId: entity.id,
        catalogSnapshotId: entity.provenance.snapshotId,
        pubChemCid: entity.identity.pubChemCid,
        inchiKey: entity.identity.inchiKey,
      },
      options.assetBasePath,
    );
    if (!coverage) coverageLoadState = "not_published";
  } catch {
    coverageLoadState = "unavailable";
  }

  return {
    catalogEntityId: entity.id,
    stableSlug: hit.stableSlug,
    preferredName: entity.preferredName,
    aliases: entity.aliases,
    molecularFormula: entity.identity.molecularFormula,
    pubChemCid: entity.identity.pubChemCid,
    inchiKey: entity.identity.inchiKey,
    canonicalSmiles: entity.identity.canonicalSmiles,
    isomericSmiles: entity.identity.isomericSmiles,
    structures: {
      twoD: {
        publicPath: resolveCatalogAssetPath(
          entity.structures.twoD.path,
          options.assetBasePath,
        ),
        sourceUrl: entity.structures.twoD.sourceUrl,
        sha256: entity.structures.twoD.sha256,
      },
      threeD: {
        publicPath: resolveCatalogAssetPath(
          entity.structures.threeD.path,
          options.assetBasePath,
        ),
        sourceUrl: entity.structures.threeD.sourceUrl,
        sha256: entity.structures.threeD.sha256,
        origin: "computed-3d-conformer",
      },
    },
    curatedMoleculeId: options.fallbackIdentity?.curatedMoleculeId ?? null,
    coverage,
    coverageLoadState,
  };
}
