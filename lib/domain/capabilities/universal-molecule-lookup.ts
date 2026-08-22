import type { MoleculeId, SourceId } from "../ids";
import type { ScientificPortResult } from "./common";

export type MoleculeCatalogScope =
  | "curated-drug-atlas"
  | "universal-molecule-lookup";

export interface CuratedDrugAtlasRecordRef {
  readonly scope: "curated-drug-atlas";
  readonly moleculeId: MoleculeId;
  readonly catalogSnapshotId: string;
  readonly identitySourceIds: readonly SourceId[];
}

export interface ExactCatalogIdentityBridge {
  readonly universalId: `universal:${string}`;
  readonly curatedMoleculeId: MoleculeId;
  readonly matchBasis: "exact-inchi-key" | "exact-pubchem-cid";
  readonly sourceIds: readonly SourceId[];
  readonly resolutionStatus: "exact-unambiguous";
}

export type UniversalLookupQuery =
  | { readonly kind: "name"; readonly value: string }
  | { readonly kind: "synonym"; readonly value: string }
  | { readonly kind: "formula"; readonly value: string }
  | { readonly kind: "smiles"; readonly value: string }
  | { readonly kind: "inchi-key"; readonly value: string }
  | { readonly kind: "pubchem-cid"; readonly value: number }
  | {
      readonly kind: "structure";
      readonly value: string;
      readonly format: "mol" | "sdf" | "smiles";
    };

export interface UniversalStructureRef {
  readonly dimension: "2d" | "3d";
  readonly format: "sdf" | "mol";
  readonly locator: string;
  readonly conformerOrigin:
    | "provider-record"
    | "named-computation"
    | "not-applicable";
  readonly conformerMethod: string | null;
}

/**
 * A universal result is an identity/structure record, never an implicit drug
 * dossier. Drug approval, indication, ADME, pharmacology, and synthesis fields
 * are deliberately absent.
 */
export interface UniversalMoleculeRecord {
  readonly scope: "universal-molecule-lookup";
  readonly universalId: `universal:${string}`;
  readonly providerId: string;
  readonly providerRecordId: string;
  readonly pubChemCid: number | null;
  readonly preferredName: string;
  readonly synonyms: readonly string[];
  readonly formula: string | null;
  readonly canonicalSmiles: string | null;
  readonly isomericSmiles: string | null;
  readonly inchiKey: string | null;
  readonly structures: readonly UniversalStructureRef[];
  readonly retrievedAt: string;
}

export type ScopedMoleculeRecordRef =
  | CuratedDrugAtlasRecordRef
  | UniversalMoleculeRecord;

export interface UniversalLookupCachePolicy {
  readonly maxEntries: number;
  readonly maxAgeMs: number;
}

export interface UniversalMoleculeLookupPort {
  readonly providerId: string;
  readonly cachePolicy: UniversalLookupCachePolicy;
  readonly supportedQueries: readonly UniversalLookupQuery["kind"][];
  lookup(
    query: UniversalLookupQuery,
    signal?: AbortSignal,
  ): Promise<ScientificPortResult<UniversalMoleculeRecord>>;
}

export interface BoundedLookupCache<V> {
  readonly policy: UniversalLookupCachePolicy;
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  has(key: string): boolean;
  size(): number;
  clear(): void;
}

const assertValidCachePolicy = (policy: UniversalLookupCachePolicy): void => {
  if (!Number.isInteger(policy.maxEntries) || policy.maxEntries < 1) {
    throw new Error("Universal lookup cache maxEntries must be a positive integer.");
  }
  if (!Number.isFinite(policy.maxAgeMs) || policy.maxAgeMs < 1) {
    throw new Error("Universal lookup cache maxAgeMs must be positive.");
  }
};

/** In-memory LRU/TTL cache suitable for bounded provider responses. */
export const createBoundedLookupCache = <V>(
  policy: UniversalLookupCachePolicy,
  now: () => number = Date.now,
): BoundedLookupCache<V> => {
  assertValidCachePolicy(policy);
  const entries = new Map<string, { readonly value: V; readonly expiresAt: number }>();

  const removeExpired = (): void => {
    const timestamp = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= timestamp) entries.delete(key);
    }
  };

  const get = (key: string): V | undefined => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  };

  return {
    policy,
    get,
    set(key, value) {
      removeExpired();
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + policy.maxAgeMs });
      while (entries.size > policy.maxEntries) {
        const oldestKey = entries.keys().next().value as string | undefined;
        if (oldestKey === undefined) break;
        entries.delete(oldestKey);
      }
    },
    has(key) {
      return get(key) !== undefined;
    },
    size() {
      removeExpired();
      return entries.size;
    },
    clear() {
      entries.clear();
    },
  };
};

const DRUG_ONLY_FIELDS = new Set([
  "adme",
  "approval",
  "approvals",
  "indication",
  "indications",
  "metabolites",
  "pharmacology",
  "regulatoryProducts",
  "synthesis",
  "targets",
]);

export interface UniversalBoundaryAssessment {
  readonly eligible: boolean;
  readonly violations: readonly string[];
}

/** Runtime guard for provider payloads before they enter the universal scope. */
export const assessUniversalMoleculeBoundary = (
  candidate: unknown,
): UniversalBoundaryAssessment => {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { eligible: false, violations: ["Record must be an object."] };
  }
  const record = candidate as Record<string, unknown>;
  const violations = Object.keys(record)
    .filter((key) => DRUG_ONLY_FIELDS.has(key))
    .map((key) => `Universal records cannot carry drug-only field: ${key}`);
  if (record.scope !== "universal-molecule-lookup") {
    violations.push("Universal records require the universal-molecule-lookup scope.");
  }
  if (typeof record.providerId !== "string" || !record.providerId.trim()) {
    violations.push("Universal records require a provider ID.");
  }
  if (typeof record.providerRecordId !== "string" || !record.providerRecordId.trim()) {
    violations.push("Universal records require a provider record ID.");
  }
  return { eligible: violations.length === 0, violations };
};
