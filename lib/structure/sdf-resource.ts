import {
  parseSdfV2000,
  type MoleculeStructure,
  type StructureDimension,
} from "./sdf";

export interface SdfPropertyIdentityExpectation {
  /** Exact SDF data-field name, for example `SOURCE_RECORD_ID`. */
  readonly propertyName: string;
  /** Exact trimmed value required before the structure may be rendered. */
  readonly expectedValue: string;
  /** Human-readable identity name used only in diagnostic errors. */
  readonly label?: string;
}

export interface SdfResourceContract {
  readonly expectedDimension?: StructureDimension;
  readonly expectedPubChemCid?: number;
  /** Source-agnostic identity check for non-PubChem SDF data fields. */
  readonly expectedIdentity?: SdfPropertyIdentityExpectation;
}

export type SdfResourceTextLoader = (url: string) => Promise<string>;

interface NormalizedSdfResourceContract {
  readonly expectedDimension: StructureDimension | null;
  readonly expectedPubChemCid: number | null;
  readonly expectedIdentity: SdfPropertyIdentityExpectation | null;
}

interface CachedSdfResource {
  readonly url: string;
  readonly request: Promise<MoleculeStructure>;
  structure: MoleculeStructure | null;
}

function normalizeContract(
  contract: SdfResourceContract = {},
): NormalizedSdfResourceContract {
  const expectedPubChemCid = contract.expectedPubChemCid ?? null;
  if (
    expectedPubChemCid !== null &&
    (!Number.isSafeInteger(expectedPubChemCid) || expectedPubChemCid <= 0)
  ) {
    throw new Error("Expected PubChem CID must be a positive safe integer");
  }

  const expectedIdentity = contract.expectedIdentity
    ? {
        propertyName: contract.expectedIdentity.propertyName.trim(),
        expectedValue: contract.expectedIdentity.expectedValue.trim(),
        label: contract.expectedIdentity.label?.trim() || undefined,
      }
    : null;
  if (expectedIdentity && !expectedIdentity.propertyName) {
    throw new Error("Expected SDF identity property name must not be empty");
  }
  if (expectedIdentity && !expectedIdentity.expectedValue) {
    throw new Error("Expected SDF identity value must not be empty");
  }

  return {
    expectedDimension: contract.expectedDimension ?? null,
    expectedPubChemCid,
    expectedIdentity,
  };
}

function contractCacheKey(
  url: string,
  contract: NormalizedSdfResourceContract,
) {
  return JSON.stringify([
    url,
    contract.expectedDimension,
    contract.expectedPubChemCid,
    contract.expectedIdentity?.propertyName ?? null,
    contract.expectedIdentity?.expectedValue ?? null,
  ]);
}

function validateExactPropertyIdentity(
  structure: MoleculeStructure,
  expectation: SdfPropertyIdentityExpectation,
) {
  const identityLabel = expectation.label || expectation.propertyName;
  const actualValue = structure.properties[expectation.propertyName]?.trim();
  if (!actualValue) {
    throw new Error(`SDF does not declare ${identityLabel}`);
  }
  if (actualValue !== expectation.expectedValue) {
    throw new Error(
      `SDF ${identityLabel} ${actualValue} does not match expected ${expectation.expectedValue}`,
    );
  }
}

/**
 * Validates renderer-facing structure data after parsing. A parseable record is
 * not renderable until every supplied dimension and identity expectation passes.
 */
export function validateSdfResource(
  structure: MoleculeStructure,
  contract: SdfResourceContract = {},
) {
  return validateNormalizedSdfResource(structure, normalizeContract(contract));
}

function validateNormalizedSdfResource(
  structure: MoleculeStructure,
  normalized: NormalizedSdfResourceContract,
) {

  if (
    normalized.expectedDimension !== null &&
    structure.dimension !== normalized.expectedDimension
  ) {
    throw new Error(
      `SDF dimension ${structure.dimension} does not match required ${normalized.expectedDimension}`,
    );
  }

  if (normalized.expectedPubChemCid !== null) {
    const rawCid = structure.properties.PUBCHEM_COMPOUND_CID?.trim();
    if (!rawCid) {
      throw new Error(
        `SDF does not declare PUBCHEM_COMPOUND_CID for expected PubChem CID ${normalized.expectedPubChemCid}`,
      );
    }
    if (!/^\d+$/.test(rawCid)) {
      throw new Error(`SDF declares an invalid PubChem CID: ${rawCid}`);
    }
    const actualPubChemCid = Number(rawCid);
    if (
      !Number.isSafeInteger(actualPubChemCid) ||
      actualPubChemCid !== normalized.expectedPubChemCid
    ) {
      throw new Error(
        `SDF PubChem CID ${rawCid} does not match expected PubChem CID ${normalized.expectedPubChemCid}`,
      );
    }
  }

  if (normalized.expectedIdentity) {
    validateExactPropertyIdentity(structure, normalized.expectedIdentity);
  }

  return structure;
}

async function fetchSdfText(url: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`SDF request failed with HTTP ${response.status}`);
  return response.text();
}

/**
 * Small renderer cache. Contracts are part of the key, in-flight requests are
 * shared, and failed validation/fetches are evicted so retry can load fresh data.
 */
export class SdfResourceCache {
  readonly capacity: number;
  private readonly entries = new Map<string, CachedSdfResource>();
  private readonly loadText: SdfResourceTextLoader;

  constructor(capacity = 48, loadText: SdfResourceTextLoader = fetchSdfText) {
    this.capacity = Math.max(1, Math.min(96, Math.floor(capacity)));
    this.loadText = loadText;
  }

  get size() {
    return this.entries.size;
  }

  get(
    url: string,
    contract: SdfResourceContract = {},
  ): Promise<MoleculeStructure> {
    if (!url.trim()) return Promise.reject(new Error("Structure URL is empty"));

    let normalized: NormalizedSdfResourceContract;
    try {
      normalized = normalizeContract(contract);
    } catch (error) {
      return Promise.reject(error);
    }
    const cacheKey = contractCacheKey(url, normalized);
    const cached = this.entries.get(cacheKey);
    if (cached) {
      this.touch(cacheKey, cached);
      return cached.request;
    }

    const request = this.loadText(url)
      .then(parseSdfV2000)
      .then((structure) => validateNormalizedSdfResource(structure, normalized));
    const entry: CachedSdfResource = { url, request, structure: null };
    this.entries.set(cacheKey, entry);
    this.trim();

    void request.then(
      (structure) => {
        if (this.entries.get(cacheKey)?.request === request) {
          entry.structure = structure;
        }
      },
      () => {
        if (this.entries.get(cacheKey)?.request === request) {
          this.entries.delete(cacheKey);
        }
      },
    );
    return request;
  }

  peek(url: string, contract: SdfResourceContract = {}) {
    try {
      const cacheKey = contractCacheKey(url, normalizeContract(contract));
      const cached = this.entries.get(cacheKey);
      if (!cached?.structure) return null;
      return cached.structure;
    } catch {
      return null;
    }
  }

  clear() {
    this.entries.clear();
  }

  private touch(cacheKey: string, entry: CachedSdfResource) {
    this.entries.delete(cacheKey);
    this.entries.set(cacheKey, entry);
  }

  private trim() {
    while (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}
