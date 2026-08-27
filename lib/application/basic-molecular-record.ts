import {
  getIndexedCatalogStableSlug,
  type IndexedCatalogHit,
} from "./catalog-expansion";
import {
  createCanonicalSmilesPathFingerprint,
  tanimotoSimilarity,
} from "@/lib/explore";
import {
  resolveCatalogAssetPath,
  type CatalogNormalizedEntity,
} from "@/lib/catalog";
import type { MoleculeRecord } from "@/lib/domain/molecule";
import {
  loadPubChem2dDescriptors,
  type PubChem2dDescriptor,
  type PubChem2dDescriptorContract,
  type PubChem2dDescriptorId,
  type PubChem2dDescriptorUnit,
} from "@/lib/structure/pubchem-2d-descriptors";
import {
  loadBasicRecordSynthesisCoverage,
  type BasicRecordSynthesisCoverage,
  type BasicRecordSynthesisCoverageLoader,
} from "./basic-record-synthesis-coverage";

export type BasicRecordCoverageDimension =
  | "identity"
  | "structure"
  | "classification"
  | "pharmacology"
  | "adme"
  | "metabolites"
  | "synthesis"
  | "nomenclature"
  | "learning";

export type BasicRecordCoverageStatus =
  | "available"
  | "partial"
  | "unavailable";

export interface BasicRecordCoverageItem {
  readonly dimension: BasicRecordCoverageDimension;
  readonly status: BasicRecordCoverageStatus;
}

interface BasicRecordFallbackProperty {
  readonly id: "molecular-weight";
  readonly value: number;
  readonly unit: "g/mol";
  readonly provenance: "pubchem-property-record";
  readonly reviewStatus: "source-supported";
  readonly pubChemCid: number;
  readonly sourceUrl: string;
}

export type BasicRecordProperty =
  | PubChem2dDescriptor
  | BasicRecordFallbackProperty;

export type BasicRecordPropertyId = PubChem2dDescriptorId;
export type BasicRecordPropertyUnit = PubChem2dDescriptorUnit;

export type BasicRecordDescriptorLoader = (
  assetUrl: string,
  contract: PubChem2dDescriptorContract,
) => Promise<readonly PubChem2dDescriptor[]>;

export interface BasicRecordStructure {
  readonly dimension: "2d" | "3d";
  readonly publicPath: string;
  readonly sourceUrl: string;
  readonly origin: "database-2d-record" | "computed-3d-conformer";
  readonly reviewStatus: "source-supported";
}

export interface BasicRecordSource {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly role: "identity" | "2d-structure" | "3d-conformer" | "source-listing";
}

export interface BasicRecordStructuralNeighbor {
  readonly id: string;
  readonly stableSlug: string;
  readonly preferredName: string;
  readonly molecularFormula: string;
  readonly pubChemCid: number;
  readonly score: number;
  readonly method: "canonical-smiles-path-fingerprint";
  readonly reviewStatus: "computed-unreviewed";
}

export interface BasicMolecularRecord {
  readonly kind: "basic-molecular-record";
  readonly id: string;
  readonly stableSlug: string;
  readonly preferredName: string;
  readonly aliases: readonly string[];
  readonly identity: {
    readonly molecularFormula: string;
    readonly pubChemCid: number;
    readonly canonicalSmiles: string;
    readonly isomericSmiles: string | null;
    readonly inchiKey: string;
    readonly reviewStatus: "source-supported";
  };
  readonly structures: readonly [BasicRecordStructure, BasicRecordStructure];
  readonly properties: readonly BasicRecordProperty[];
  readonly coverage: readonly BasicRecordCoverageItem[];
  readonly synthesisCoverage: BasicRecordSynthesisCoverage | null;
  readonly sources: readonly BasicRecordSource[];
  readonly provenance: {
    readonly snapshotId: string;
    readonly capturedAt: string;
    readonly sourceIds: readonly string[];
  };
  readonly structuralNeighbors: readonly BasicRecordStructuralNeighbor[];
  readonly limitations: readonly [string, string];
}

export interface BasicMolecularRecordNavigator {
  resolveStableSlug(stableSlug: string): Promise<IndexedCatalogHit | null>;
  hydrate(entityId: string): Promise<CatalogNormalizedEntity | null>;
}

export type MolecularRecordRouteResolution =
  | {
      readonly kind: "curated-dossier";
      readonly molecule: MoleculeRecord;
      readonly canonicalSlug: string;
      readonly requestedHit: IndexedCatalogHit | null;
    }
  | {
      readonly kind: "basic-molecular-record";
      readonly hit: IndexedCatalogHit;
      readonly entity: CatalogNormalizedEntity;
      readonly record: BasicMolecularRecord;
    }
  | {
      readonly kind: "unavailable";
      readonly reason:
        | "invalid-slug"
        | "not-indexed"
        | "entity-unavailable"
        | "identity-mismatch";
    };

const COVERAGE_DIMENSIONS: readonly BasicRecordCoverageDimension[] = [
  "identity",
  "structure",
  "classification",
  "pharmacology",
  "adme",
  "metabolites",
  "synthesis",
  "nomenclature",
  "learning",
];

const BASIC_RECORD_NEIGHBOR_LIMIT = 4;
export const BASIC_RECORD_NEIGHBOR_MINIMUM_SCORE = 0.45;

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const normalizeAliases = (
  preferredName: string,
  aliases: readonly string[],
): readonly string[] => {
  const preferred = preferredName.trim().toLocaleLowerCase("en");
  return [...new Set(aliases.map((alias) => alias.trim()).filter(Boolean))]
    .filter((alias) => alias.toLocaleLowerCase("en") !== preferred);
};

const isMatchingCatalogEntity = (
  hit: IndexedCatalogHit,
  entity: CatalogNormalizedEntity,
): boolean =>
  entity.id === hit.id &&
  entity.identity.pubChemCid === hit.pubChemCid &&
  entity.identity.molecularFormula === hit.formula &&
  entity.preferredName === hit.preferredName;

export function getBasicRecordSynthesisCoverageStatus(
  synthesisCoverage: BasicRecordSynthesisCoverage | null,
): BasicRecordCoverageStatus {
  if (!synthesisCoverage) return "unavailable";
  const hasVerifiedCompleteReportedRoute = synthesisCoverage.routes.some((route) =>
    (route.routeType === "patent_reported" || route.routeType === "literature_reported") &&
    route.routeCompleteness === "complete" &&
    route.reviewState === "verified",
  );
  return hasVerifiedCompleteReportedRoute ? "available" : "partial";
}

const createBasicRecordCoverage = (
  synthesisCoverage: BasicRecordSynthesisCoverage | null,
): readonly BasicRecordCoverageItem[] =>
  COVERAGE_DIMENSIONS.map((dimension) => ({
    dimension,
    status:
      dimension === "identity" || dimension === "structure"
        ? "available"
        : dimension === "synthesis"
          ? getBasicRecordSynthesisCoverageStatus(synthesisCoverage)
          : "unavailable",
  }));

/**
 * Compares only the already resident metadata window. The score is a computed,
 * unreviewed canonical-SMILES path-fingerprint hint; it is deliberately not a
 * pharmacology, bioactivity, scaffold-membership, or clinical-similarity claim.
 */
export function createResidentWindowStructuralNeighbors(
  selected: CatalogNormalizedEntity,
  residentEntities: readonly CatalogNormalizedEntity[],
  limit = BASIC_RECORD_NEIGHBOR_LIMIT,
): readonly BasicRecordStructuralNeighbor[] {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 12) {
    throw new Error("Basic record neighbor limit must be an integer from 0 to 12.");
  }
  if (
    limit === 0 ||
    residentEntities.length === 0 ||
    !selected.identity.canonicalSmiles.trim()
  ) return [];

  let selectedFingerprint: ReadonlySet<number>;
  try {
    selectedFingerprint = createCanonicalSmilesPathFingerprint(
      selected.identity.canonicalSmiles,
    );
  } catch {
    return [];
  }

  const uniqueCandidates = new Map<string, CatalogNormalizedEntity>();
  for (const candidate of residentEntities) {
    if (candidate.id !== selected.id) uniqueCandidates.set(candidate.id, candidate);
  }

  return [...uniqueCandidates.values()]
    .flatMap((candidate): readonly BasicRecordStructuralNeighbor[] => {
      try {
        const score = tanimotoSimilarity(
          selectedFingerprint,
          createCanonicalSmilesPathFingerprint(
            candidate.identity.canonicalSmiles,
          ),
        );
        if (!Number.isFinite(score) || score < BASIC_RECORD_NEIGHBOR_MINIMUM_SCORE || score > 1) {
          return [];
        }
        return [{
          id: candidate.id,
          stableSlug: getIndexedCatalogStableSlug(candidate.id),
          preferredName: candidate.preferredName,
          molecularFormula: candidate.identity.molecularFormula,
          pubChemCid: candidate.identity.pubChemCid,
          score: Number(score.toFixed(3)),
          method: "canonical-smiles-path-fingerprint",
          reviewStatus: "computed-unreviewed",
        }];
      } catch {
        return [];
      }
    })
    .sort((left, right) =>
      right.score - left.score || left.preferredName.localeCompare(right.preferredName, "en"),
    )
    .slice(0, limit);
}

export function createBasicMolecularRecord(
  hit: IndexedCatalogHit,
  entity: CatalogNormalizedEntity,
  options: {
    readonly assetBasePath?: string;
    readonly residentEntities?: readonly CatalogNormalizedEntity[];
    readonly descriptors?: readonly PubChem2dDescriptor[];
    readonly synthesisCoverage?: BasicRecordSynthesisCoverage | null;
  } = {},
): BasicMolecularRecord {
  if (!isMatchingCatalogEntity(hit, entity)) {
    throw new Error("Catalog hit and hydrated entity identity do not match.");
  }
  if (
    !entity.identity.canonicalSmiles.trim() ||
    !entity.identity.inchiKey.trim() ||
    !entity.structures.twoD.path.trim() ||
    !entity.structures.threeD.path.trim()
  ) {
    throw new Error("Resolved catalog entity is missing required identity or structure fields.");
  }

  const descriptorById = new Map<PubChem2dDescriptorId, PubChem2dDescriptor>();
  for (const descriptor of options.descriptors ?? []) {
    if (
      descriptor.provenance !== "pubchem-2d-sdf" ||
      descriptor.reviewStatus !== "source-supported" ||
      descriptor.pubChemCid !== entity.identity.pubChemCid ||
      descriptor.sourceUrl !== entity.structures.twoD.sourceUrl ||
      descriptorById.has(descriptor.id)
    ) {
      throw new Error("Basic record descriptor evidence does not match its PubChem 2D source.");
    }
    descriptorById.set(descriptor.id, descriptor);
  }

  const properties: BasicRecordProperty[] = [...descriptorById.values()];
  if (
    !descriptorById.has("molecular-weight") &&
    Number.isFinite(entity.identity.molecularWeight) &&
    entity.identity.molecularWeight > 0
  ) {
    properties.unshift({
      id: "molecular-weight",
      value: entity.identity.molecularWeight,
      unit: "g/mol",
      provenance: "pubchem-property-record",
      reviewStatus: "source-supported",
      pubChemCid: entity.identity.pubChemCid,
      sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${entity.identity.pubChemCid}`,
    });
  }

  const sources: BasicRecordSource[] = [
    {
      id: `pubchem-identity:${entity.identity.pubChemCid}`,
      label: `PubChem CID ${entity.identity.pubChemCid}`,
      href: `https://pubchem.ncbi.nlm.nih.gov/compound/${entity.identity.pubChemCid}`,
      role: "identity",
    },
    {
      id: `pubchem-2d:${entity.identity.pubChemCid}`,
      label: "PubChem 2D SDF record",
      href: entity.structures.twoD.sourceUrl,
      role: "2d-structure",
    },
    {
      id: `pubchem-3d:${entity.identity.pubChemCid}`,
      label: "PubChem computed 3D conformer",
      href: entity.structures.threeD.sourceUrl,
      role: "3d-conformer",
    },
  ];
  for (const approval of entity.approvals) {
    if (!isHttpUrl(approval.sourceLocator)) continue;
    sources.push({
      id: approval.id,
      label: "DrugCentral source-list membership",
      href: approval.sourceLocator,
      role: "source-listing",
    });
  }

  return {
    kind: "basic-molecular-record",
    id: entity.id,
    stableSlug: hit.stableSlug,
    preferredName: entity.preferredName,
    aliases: normalizeAliases(entity.preferredName, entity.aliases),
    identity: {
      molecularFormula: entity.identity.molecularFormula,
      pubChemCid: entity.identity.pubChemCid,
      canonicalSmiles: entity.identity.canonicalSmiles,
      isomericSmiles: entity.identity.isomericSmiles?.trim() || null,
      inchiKey: entity.identity.inchiKey,
      reviewStatus: "source-supported",
    },
    structures: [
      {
        dimension: "2d",
        publicPath: resolveCatalogAssetPath(
          entity.structures.twoD.path,
          options.assetBasePath,
        ),
        sourceUrl: entity.structures.twoD.sourceUrl,
        origin: "database-2d-record",
        reviewStatus: "source-supported",
      },
      {
        dimension: "3d",
        publicPath: resolveCatalogAssetPath(
          entity.structures.threeD.path,
          options.assetBasePath,
        ),
        sourceUrl: entity.structures.threeD.sourceUrl,
        origin: "computed-3d-conformer",
        reviewStatus: "source-supported",
      },
    ],
    properties,
    coverage: createBasicRecordCoverage(options.synthesisCoverage ?? null),
    synthesisCoverage: options.synthesisCoverage ?? null,
    sources: sources.filter((source) => isHttpUrl(source.href)),
    provenance: {
      snapshotId: entity.provenance.snapshotId,
      capturedAt: entity.provenance.capturedAt,
      sourceIds: entity.provenance.sourceIds,
    },
    structuralNeighbors: createResidentWindowStructuralNeighbors(
      entity,
      options.residentEntities ?? [],
    ),
    limitations: [
      options.synthesisCoverage
        ? "Synthesis discovery coverage is present; candidate sources, pending routes, teaching reconstructions, and computational proposals are not verified synthesis claims."
        : "No curated pharmacology, ADME, metabolite, synthesis, nomenclature, or learning-depth claim is supplied by this basic record.",
      "Computed structure-neighbor hints do not establish pharmacological, biological, or clinical similarity.",
    ],
  };
}

const curatedStableSlug = (record: MoleculeRecord): string =>
  getIndexedCatalogStableSlug(record.id);

function findDirectCuratedRecord(
  stableSlug: string,
  curatedRecords: readonly MoleculeRecord[],
): MoleculeRecord | null {
  return curatedRecords.find((record) => curatedStableSlug(record) === stableSlug) ?? null;
}

/**
 * Stable route resolution always checks a canonical curated slug first, then
 * resolves the compact index without touching a shard. Only the selected
 * non-seed entity is hydrated. Exact PubChem CID is the sole bridge from an
 * imported index identity to a curated dossier.
 */
export async function resolveMolecularRecordRoute(
  stableSlug: string,
  navigator: BasicMolecularRecordNavigator,
  options: {
    readonly curatedRecords: readonly MoleculeRecord[];
    readonly assetBasePath?: string;
    readonly residentEntities?: readonly CatalogNormalizedEntity[];
    readonly descriptorLoader?: BasicRecordDescriptorLoader;
    readonly synthesisCoverageLoader?: BasicRecordSynthesisCoverageLoader;
  },
): Promise<MolecularRecordRouteResolution> {
  const normalizedSlug = stableSlug.trim();
  if (!normalizedSlug || normalizedSlug !== stableSlug || normalizedSlug.length > 512) {
    return { kind: "unavailable", reason: "invalid-slug" };
  }

  const directCurated = findDirectCuratedRecord(
    normalizedSlug,
    options.curatedRecords,
  );
  if (directCurated) {
    return {
      kind: "curated-dossier",
      molecule: directCurated,
      canonicalSlug: curatedStableSlug(directCurated),
      requestedHit: null,
    };
  }

  const hit = await navigator.resolveStableSlug(normalizedSlug);
  if (!hit) return { kind: "unavailable", reason: "not-indexed" };

  const curated = options.curatedRecords.find(
    (record) => record.identity.pubChemCid === hit.pubChemCid,
  );
  if (curated) {
    return {
      kind: "curated-dossier",
      molecule: curated,
      canonicalSlug: curatedStableSlug(curated),
      requestedHit: hit,
    };
  }

  const entity = await navigator.hydrate(hit.id);
  if (!entity) return { kind: "unavailable", reason: "entity-unavailable" };
  if (!isMatchingCatalogEntity(hit, entity)) {
    return { kind: "unavailable", reason: "identity-mismatch" };
  }

  const twoDAssetPath = resolveCatalogAssetPath(
    entity.structures.twoD.path,
    options.assetBasePath,
  );
  const descriptorRequest = (options.descriptorLoader ?? loadPubChem2dDescriptors)(
    twoDAssetPath,
    {
      expectedPubChemCid: entity.identity.pubChemCid,
      sourceUrl: entity.structures.twoD.sourceUrl,
    },
  ).catch((): readonly PubChem2dDescriptor[] => {
    // Descriptor evidence is optional. A failed/mismatched/malformed SDF adds
    // no descriptor claim, while the already matched identity record remains.
    return [];
  });
  const synthesisCoverageRequest = (
    options.synthesisCoverageLoader
      ? options.synthesisCoverageLoader(
          {
            catalogEntityId: entity.id,
            catalogSnapshotId: entity.provenance.snapshotId,
            pubChemCid: entity.identity.pubChemCid,
            inchiKey: entity.identity.inchiKey,
          },
          options.assetBasePath,
        )
      : loadBasicRecordSynthesisCoverage(
          {
            catalogEntityId: entity.id,
            catalogSnapshotId: entity.provenance.snapshotId,
            pubChemCid: entity.identity.pubChemCid,
            inchiKey: entity.identity.inchiKey,
          },
          { assetBasePath: options.assetBasePath },
        )
  ).catch(() => null);
  const [descriptors, synthesisCoverage] = await Promise.all([
    descriptorRequest,
    synthesisCoverageRequest,
  ]);

  try {
    return {
      kind: "basic-molecular-record",
      hit,
      entity,
      record: createBasicMolecularRecord(hit, entity, {
        assetBasePath: options.assetBasePath,
        residentEntities: options.residentEntities,
        descriptors,
        synthesisCoverage,
      }),
    };
  } catch {
    return { kind: "unavailable", reason: "identity-mismatch" };
  }
}
