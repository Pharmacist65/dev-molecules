import { pubChemPugRestAdapter } from "../../lib/catalog/adapters";
import { normalizeCatalogName } from "../../lib/catalog/identity";
import type {
  DrugCentralStructureRow,
  PubChemPropertyRow,
} from "../../lib/catalog/types";
import { catalogSourceUrls } from "./catalog-config.mjs";

const PROPERTY_LIST = [
  "Title",
  "MolecularFormula",
  "MolecularWeight",
  "CanonicalSMILES",
  "IsomericSMILES",
  "InChIKey",
].join(",");

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchJson = async (url: string): Promise<unknown | null> => {
  const retryDelays = [0, 350, 1_000, 3_000, 8_000];
  let lastStatus = 0;
  for (const delay of retryDelays) {
    if (delay > 0) await sleep(delay);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    lastStatus = response.status;
    if (response.ok) return response.json();
    if (response.status === 400 || response.status === 404) return null;
    if (response.status !== 429 && response.status < 500) break;
  }
  throw new Error(`PubChem request failed (${lastStatus}) for ${url}`);
};

const resolveKeyChunk = async (
  keys: readonly string[],
): Promise<readonly PubChemPropertyRow[]> => {
  const response = await fetchJson(
    `${catalogSourceUrls.pubChemPugRest}/compound/inchikey/${keys.join(",")}/property/${PROPERTY_LIST}/JSON`,
  );
  if (response !== null) return pubChemPugRestAdapter.parseProperties(response);
  if (keys.length === 1) return [];
  const midpoint = Math.ceil(keys.length / 2);
  const [left, right] = await Promise.all([
    resolveKeyChunk(keys.slice(0, midpoint)),
    resolveKeyChunk(keys.slice(midpoint)),
  ]);
  return [...left, ...right];
};

export const resolvePubChemProperties = async (
  candidates: readonly {
    readonly structure: DrugCentralStructureRow;
    readonly acceptedNames: readonly string[];
  }[],
): Promise<ReadonlyMap<number, PubChemPropertyRow>> => {
  const keys = [
    ...new Set(
      candidates.map(({ structure }) => structure.inchiKey.toUpperCase()),
    ),
  ];
  const chunks: string[][] = [];
  for (let index = 0; index < keys.length; index += 24) {
    chunks.push(keys.slice(index, index + 24));
  }
  const properties: PubChemPropertyRow[] = [];
  const queue = [...chunks];
  const workers = Array.from({ length: 3 }, async () => {
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (!chunk) break;
      properties.push(...(await resolveKeyChunk(chunk)));
      // PubChem asks clients to remain below five dynamic requests per second.
      await sleep(150);
    }
  });
  await Promise.all(workers);

  const candidatesByKey = new Map<string, PubChemPropertyRow[]>();
  for (const property of properties) {
    const key = property.inchiKey.toUpperCase();
    const candidates = candidatesByKey.get(key) ?? [];
    if (!candidates.some((candidate) => candidate.cid === property.cid)) {
      candidates.push(property);
    }
    candidatesByKey.set(key, candidates);
  }
  const resolved = new Map<number, PubChemPropertyRow>();

  for (const { structure, acceptedNames } of candidates) {
    const exactCandidates =
      candidatesByKey.get(structure.inchiKey.toUpperCase()) ?? [];
    const accepted = new Set(acceptedNames.map(normalizeCatalogName));
    const titleMatches = exactCandidates.filter(
      (candidate) =>
        candidate.title !== null && accepted.has(normalizeCatalogName(candidate.title)),
    );
    // The name is used only to disambiguate CIDs that already share the exact
    // source InChIKey. It is never used as a name-to-structure fallback.
    const selected =
      titleMatches.length === 1
        ? titleMatches[0]
        : titleMatches.length === 0 && exactCandidates.length === 1
          ? exactCandidates[0]
          : null;
    if (selected) resolved.set(structure.drugCentralId, selected);
  }
  return resolved;
};
