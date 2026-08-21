import { createMoleculeStructureProvider } from "../domain/structure";
import { moleculeCatalog } from "./catalog";

/**
 * Catalog-wide lookup used by viewers and loaders. The provider indexes records
 * already attached to molecules, so its behavior does not depend on a class,
 * a fixed seed count, or component-owned chemistry rules.
 */
export const moleculeStructureProvider = createMoleculeStructureProvider(
  moleculeCatalog.map((molecule) => molecule.structures),
  "pubchem-catalog-structures",
);
