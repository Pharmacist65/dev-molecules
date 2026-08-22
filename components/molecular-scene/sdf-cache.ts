import { parseSdfV2000, type MoleculeStructure } from "@/lib/structure/sdf";

export type SdfTextLoader = (url: string) => Promise<string>;

interface CachedSdf {
  readonly url: string;
  readonly request: Promise<MoleculeStructure>;
}

async function fetchSdfText(url: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`SDF request failed with HTTP ${response.status}`);
  return response.text();
}

/**
 * Scene structures must contain 3D coordinates. When a PubChem identity is
 * known, it is also checked after parsing, before geometry reaches the renderer.
 */
export function validateSceneSdf(
  structure: MoleculeStructure,
  expectedPubChemCid?: number,
) {
  if (structure.dimension !== "3d") {
    throw new Error(
      `SDF dimension ${structure.dimension} does not match required 3d${
        expectedPubChemCid === undefined ? "" : ` for PubChem CID ${expectedPubChemCid}`
      }`,
    );
  }
  if (expectedPubChemCid === undefined) return structure;
  if (!Number.isInteger(expectedPubChemCid) || expectedPubChemCid <= 0) {
    throw new Error("Expected PubChem CID must be a positive integer");
  }

  const rawCid = structure.properties.PUBCHEM_COMPOUND_CID?.trim();
  if (!rawCid) {
    throw new Error(
      `SDF does not declare PUBCHEM_COMPOUND_CID for expected PubChem CID ${expectedPubChemCid}`,
    );
  }
  if (!/^\d+$/.test(rawCid)) {
    throw new Error(`SDF declares an invalid PubChem CID: ${rawCid}`);
  }

  const actualPubChemCid = Number(rawCid);
  if (!Number.isSafeInteger(actualPubChemCid) || actualPubChemCid !== expectedPubChemCid) {
    throw new Error(
      `SDF PubChem CID ${rawCid} does not match expected PubChem CID ${expectedPubChemCid}`,
    );
  }
  return structure;
}

/**
 * A lazy LRU of parsed structures. In-flight requests count toward the bound,
 * failures are evicted, and no missing record is replaced with generated data.
 */
export class BoundedSdfCache {
  readonly capacity: number;
  private readonly entries = new Map<string, CachedSdf>();
  private readonly loadText: SdfTextLoader;

  constructor(capacity = 40, loadText: SdfTextLoader = fetchSdfText) {
    this.capacity = Math.max(1, Math.min(40, Math.floor(capacity)));
    this.loadText = loadText;
  }

  get size() {
    return this.entries.size;
  }

  keys() {
    return [...this.entries.values()].map((entry) => entry.url);
  }

  get(url: string, expectedPubChemCid?: number) {
    if (!url.trim()) return Promise.reject(new Error("Structure URL is empty"));
    if (
      expectedPubChemCid !== undefined &&
      (!Number.isInteger(expectedPubChemCid) || expectedPubChemCid <= 0)
    ) {
      return Promise.reject(new Error("Expected PubChem CID must be a positive integer"));
    }

    const cacheKey = `${expectedPubChemCid ?? "unscoped"}\u0000${url}`;

    const cached = this.entries.get(cacheKey);
    if (cached) {
      this.entries.delete(cacheKey);
      this.entries.set(cacheKey, cached);
      return cached.request;
    }

    const request = this.loadText(url)
      .then(parseSdfV2000)
      .then((structure) => validateSceneSdf(structure, expectedPubChemCid));
    this.entries.set(cacheKey, { url, request });
    this.trim();
    void request.catch(() => {
      if (this.entries.get(cacheKey)?.request === request) this.entries.delete(cacheKey);
    });
    return request;
  }

  clear() {
    this.entries.clear();
  }

  private trim() {
    while (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}
