import type { CatalogSearchRecord } from "@/lib/catalog";
import {
  STRUCTURAL_FINGERPRINT_VERSION,
  createCanonicalSmilesPathFingerprint,
  tanimotoSimilarity,
} from "@/lib/explore";

export interface LabStructureSnapshot {
  readonly smiles: string;
  readonly molfile: string;
  readonly inchiKey: string;
}

export interface LabSimilarityCandidate {
  readonly id: string;
  readonly name: string;
  readonly canonicalSmiles: string;
}

export interface LabSimilarityResult {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly method: typeof STRUCTURAL_FINGERPRINT_VERSION;
  readonly reviewStatus: "computed-unreviewed";
}

export type CatalogIdentityMatch =
  | { readonly status: "exact"; readonly record: CatalogSearchRecord }
  | { readonly status: "not-found" }
  | { readonly status: "ambiguous"; readonly recordIds: readonly string[] };

const INCHI_KEY_PATTERN = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/;

export function normalizeLabStructureSnapshot(
  input: LabStructureSnapshot,
): LabStructureSnapshot {
  const smiles = input.smiles.trim();
  const molfile = input.molfile.trim();
  const inchiKey = input.inchiKey.trim().toUpperCase();
  if (!smiles || !molfile || !INCHI_KEY_PATTERN.test(inchiKey)) {
    throw new Error("The local structure export is incomplete or has an invalid InChIKey.");
  }
  return { smiles, molfile, inchiKey };
}

export function findExactCatalogIdentityMatch(
  records: readonly CatalogSearchRecord[],
  inchiKey: string,
): CatalogIdentityMatch {
  const normalizedKey = inchiKey.trim().toUpperCase();
  if (!INCHI_KEY_PATTERN.test(normalizedKey)) return { status: "not-found" };
  const matches = records.filter(
    (record) => record.inchiKey.toUpperCase() === normalizedKey,
  );
  if (matches.length === 1 && matches[0]) {
    return { status: "exact", record: matches[0] };
  }
  if (matches.length > 1) {
    return {
      status: "ambiguous",
      recordIds: matches.map((record) => record.id).sort(),
    };
  }
  return { status: "not-found" };
}

export function rankComputedStructureSimilarity(
  draftSmiles: string,
  candidates: readonly LabSimilarityCandidate[],
  limit = 4,
): readonly LabSimilarityResult[] {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("Similarity result limit must be an integer from 1 to 20.");
  }
  const draft = createCanonicalSmilesPathFingerprint(draftSmiles.trim());
  return candidates
    .map<LabSimilarityResult>((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      score: Number(
        tanimotoSimilarity(
          draft,
          createCanonicalSmilesPathFingerprint(candidate.canonicalSmiles),
        ).toFixed(4),
      ),
      method: STRUCTURAL_FINGERPRINT_VERSION,
      reviewStatus: "computed-unreviewed" as const,
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export interface LocalLabProject {
  readonly schemaVersion: 1;
  readonly privacy: "device-local-export";
  readonly verification: "user-created-draft";
  readonly generatedAt: string;
  readonly structure: LabStructureSnapshot;
  readonly identityMatch: CatalogIdentityMatch;
  readonly similarity: readonly LabSimilarityResult[];
  readonly limitations: readonly string[];
}

export function createLocalLabProject(input: {
  readonly generatedAt: string;
  readonly structure: LabStructureSnapshot;
  readonly identityMatch: CatalogIdentityMatch;
  readonly similarity: readonly LabSimilarityResult[];
}): LocalLabProject {
  const generatedAt = new Date(input.generatedAt);
  if (Number.isNaN(generatedAt.valueOf())) {
    throw new Error("Local project export requires a valid timestamp.");
  }
  return {
    schemaVersion: 1,
    privacy: "device-local-export",
    verification: "user-created-draft",
    generatedAt: generatedAt.toISOString(),
    structure: normalizeLabStructureSnapshot(input.structure),
    identityMatch: input.identityMatch,
    similarity: input.similarity,
    limitations: [
      "A catalog miss is not evidence of novelty, patentability, biological activity, or synthesizability.",
      "Similarity uses the educational canonical-SMILES path fingerprint and is computed, not expert-reviewed.",
      "This file is created locally; the public static application does not provide private cloud storage.",
    ],
  };
}
