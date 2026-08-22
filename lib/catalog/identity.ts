import type {
  CatalogNormalizedEntity,
  CatalogSnapshotRecord,
} from "./types";

const INCHI_KEY_PATTERN = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/;

export interface InchiKeyParts {
  readonly connectivity: string;
  readonly stereoAndProtonation: string;
  readonly version: string;
}

export const parseInchiKey = (inchiKey: string): InchiKeyParts | null => {
  const normalized = inchiKey.trim().toUpperCase();
  if (!INCHI_KEY_PATTERN.test(normalized)) {
    return null;
  }
  const [connectivity, stereoAndProtonation, version] = normalized.split("-");
  return { connectivity, stereoAndProtonation, version };
};

export const normalizeCatalogName = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

export const catalogSlug = (name: string): string =>
  normalizeCatalogName(name).replace(/\s+/g, "-") || "unnamed";

export const countSmilesComponents = (smiles: string): number =>
  smiles.split(".").filter(Boolean).length;

/** Returns only source-proven standard InChI charge/protonation layers. */
export const extractInchiChargeLayer = (inchi: string): string => {
  const layers = inchi
    .split("/")
    .filter((layer) => layer.startsWith("q") || layer.startsWith("p"));
  return layers.length > 0 ? layers.join("/") : "none";
};

/**
 * Form and stereochemistry deliberately participate in the key. Records with
 * the same name or connectivity block are not silently collapsed.
 */
export const createFormAwareIdentityKey = (
  record: Pick<CatalogSnapshotRecord, "structure" | "pubChem">,
): string | null => {
  if (!record.structure || !record.pubChem) {
    return null;
  }
  const parts = parseInchiKey(record.pubChem.inchiKey);
  if (!parts) {
    return null;
  }
  const componentCount = countSmilesComponents(record.structure.smiles);
  return [
    record.pubChem.inchiKey,
    record.structure.smiles,
    `components:${componentCount}`,
  ].join("|");
};

export const entitySortKey = (
  entity: Pick<CatalogNormalizedEntity, "preferredName" | "identity" | "chemicalForm">,
): string =>
  [
    normalizeCatalogName(entity.preferredName),
    entity.identity.inchiKey,
    entity.chemicalForm.id,
  ].join("|");
