import type {
  DossierLocale,
  FlagshipDossierSeed,
} from "@/lib/domain/dossier";
import type { MoleculeId } from "@/lib/domain/ids";

import { createCelecoxibFlagshipSeed } from "./celecoxib";
import { createOmeprazoleFlagshipSeed } from "./omeprazole";
import { createPropranololFlagshipSeed } from "./propranolol";

const builders: ReadonlyMap<
  MoleculeId,
  (locale: DossierLocale) => FlagshipDossierSeed
> = new Map([
  ["molecule:propranolol", createPropranololFlagshipSeed],
  ["molecule:celecoxib", createCelecoxibFlagshipSeed],
  ["molecule:omeprazole", createOmeprazoleFlagshipSeed],
]);

export const flagshipDossierMoleculeIds = [...builders.keys()] as const;

export function createFlagshipDossierSeed(
  moleculeId: MoleculeId,
  locale: DossierLocale,
): FlagshipDossierSeed | null {
  return builders.get(moleculeId)?.(locale) ?? null;
}
