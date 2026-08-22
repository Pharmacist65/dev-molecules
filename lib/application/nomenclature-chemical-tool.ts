import type { AcademyLocale } from "@/lib/domain/nomenclature-academy";

export type ChemicalToolProvenance = "curated-name-structure-registry@1";

export interface ChemicalStructureRecord {
  readonly structureId: string;
  readonly canonicalSmiles: string;
  readonly canonicalName: Readonly<Record<AcademyLocale, string>>;
  readonly acceptedNames: Readonly<Record<AcademyLocale, readonly string[]>>;
}

export type ChemicalToolResult<T> =
  | {
      readonly status: "curated-match";
      readonly value: T;
      readonly provenance: ChemicalToolProvenance;
    }
  | {
      readonly status: "unsupported";
      readonly reason: "name-not-curated" | "structure-not-curated" | "round-trip-mismatch";
    };

export interface NameToStructureResult {
  readonly structureId: string;
  readonly canonicalSmiles: string;
  readonly canonicalName: string;
}

export interface StructureToNameResult {
  readonly structureId: string;
  readonly canonicalName: string;
  readonly acceptedAnswers: readonly string[];
}

export interface ChemicalToolAdapter {
  nameToStructure(
    name: string,
    locale: AcademyLocale,
  ): Promise<ChemicalToolResult<NameToStructureResult>>;
  structureToName(
    canonicalSmiles: string,
    locale: AcademyLocale,
  ): Promise<ChemicalToolResult<StructureToNameResult>>;
  verifyRoundTrip(
    name: string,
    locale: AcademyLocale,
  ): Promise<ChemicalToolResult<NameToStructureResult>>;
}

const provenance: ChemicalToolProvenance = "curated-name-structure-registry@1";

function normalizeName(value: string, locale: AcademyLocale): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Local deterministic adapter used until an independently validated OPSIN or
 * RDKit service is connected. It fails closed for every non-curated name and
 * does not call an LLM or attempt a chemical guess.
 */
export class CuratedChemicalToolAdapter implements ChemicalToolAdapter {
  readonly #records: readonly ChemicalStructureRecord[];

  constructor(records: readonly ChemicalStructureRecord[]) {
    this.#records = records;
  }

  async nameToStructure(
    name: string,
    locale: AcademyLocale,
  ): Promise<ChemicalToolResult<NameToStructureResult>> {
    const normalized = normalizeName(name, locale);
    const record = this.#records.find((candidate) =>
      [candidate.canonicalName[locale], ...candidate.acceptedNames[locale]].some(
        (accepted) => normalizeName(accepted, locale) === normalized,
      ),
    );
    if (!record) return { status: "unsupported", reason: "name-not-curated" };
    return {
      status: "curated-match",
      provenance,
      value: {
        structureId: record.structureId,
        canonicalSmiles: record.canonicalSmiles,
        canonicalName: record.canonicalName[locale],
      },
    };
  }

  async structureToName(
    canonicalSmiles: string,
    locale: AcademyLocale,
  ): Promise<ChemicalToolResult<StructureToNameResult>> {
    const record = this.#records.find(
      (candidate) => candidate.canonicalSmiles === canonicalSmiles,
    );
    if (!record) return { status: "unsupported", reason: "structure-not-curated" };
    return {
      status: "curated-match",
      provenance,
      value: {
        structureId: record.structureId,
        canonicalName: record.canonicalName[locale],
        acceptedAnswers: [record.canonicalName[locale], ...record.acceptedNames[locale]],
      },
    };
  }

  async verifyRoundTrip(
    name: string,
    locale: AcademyLocale,
  ): Promise<ChemicalToolResult<NameToStructureResult>> {
    const structure = await this.nameToStructure(name, locale);
    if (structure.status !== "curated-match") return structure;
    const nameResult = await this.structureToName(
      structure.value.canonicalSmiles,
      locale,
    );
    if (nameResult.status !== "curated-match") {
      return { status: "unsupported", reason: "round-trip-mismatch" };
    }
    const normalizedInput = normalizeName(name, locale);
    const matches = nameResult.value.acceptedAnswers.some(
      (accepted) => normalizeName(accepted, locale) === normalizedInput,
    );
    return matches
      ? structure
      : { status: "unsupported", reason: "round-trip-mismatch" };
  }
}
