import { moleculeCatalog } from "./catalog";
import { omeprazoleFlagshipMolecule } from "./flagship-molecules";

/** Dossier depth is independent from the fixed 15-record Atlas seed. */
export const curatedDossierMolecules = [
  ...moleculeCatalog,
  omeprazoleFlagshipMolecule,
] as const;

export const curatedDossierMoleculeById = new Map(
  curatedDossierMolecules.map((molecule) => [molecule.id, molecule]),
);
