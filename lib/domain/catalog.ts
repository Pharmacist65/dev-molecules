import type { MoleculeId } from "./ids";
import type { MoleculeRecord } from "./molecule";

export interface MoleculeCatalog {
  readonly molecules: readonly MoleculeRecord[];
  readonly byId: ReadonlyMap<MoleculeId, MoleculeRecord>;
  readonly byPubChemCid: ReadonlyMap<number, MoleculeRecord>;
  getById(moleculeId: MoleculeId): MoleculeRecord | undefined;
  getByPubChemCid(pubChemCid: number): MoleculeRecord | undefined;
}

/**
 * Creates a class-agnostic catalog index. Duplicate identity keys fail closed
 * so a later seed family cannot silently replace an existing molecule.
 */
export const createMoleculeCatalog = (
  molecules: readonly MoleculeRecord[],
): MoleculeCatalog => {
  const byId = new Map<MoleculeId, MoleculeRecord>();
  const byPubChemCid = new Map<number, MoleculeRecord>();

  for (const molecule of molecules) {
    if (byId.has(molecule.id)) {
      throw new Error(`Duplicate catalog molecule ID: ${molecule.id}`);
    }
    if (byPubChemCid.has(molecule.identity.pubChemCid)) {
      throw new Error(
        `Duplicate catalog PubChem CID: ${molecule.identity.pubChemCid}`,
      );
    }
    byId.set(molecule.id, molecule);
    byPubChemCid.set(molecule.identity.pubChemCid, molecule);
  }

  return {
    molecules: [...molecules],
    byId,
    byPubChemCid,
    getById: (moleculeId) => byId.get(moleculeId),
    getByPubChemCid: (pubChemCid) => byPubChemCid.get(pubChemCid),
  };
};
