import { createMoleculeCatalog } from "../domain/catalog";
import { betaBlockers } from "./beta-blockers";
import { nsaids } from "./nsaids";

const catalog = createMoleculeCatalog([...betaBlockers, ...nsaids]);

export const moleculeCatalog = catalog.molecules;
export const moleculeById = catalog.byId;
export const moleculeByPubChemCid = catalog.byPubChemCid;
export const getCatalogMoleculeById = catalog.getById;
export const getCatalogMoleculeByPubChemCid = catalog.getByPubChemCid;
