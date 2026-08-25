import type { MoleculeStructure } from "./sdf";
import { parseSdfV2000 } from "./sdf";
import { validateSdfResource } from "./sdf-resource";

export type PubChem2dDescriptorId =
  | "molecular-weight"
  | "complexity"
  | "hydrogen-bond-acceptors"
  | "hydrogen-bond-donors"
  | "rotatable-bonds"
  | "xlogp"
  | "exact-mass"
  | "topological-polar-surface-area"
  | "monoisotopic-mass"
  | "total-charge"
  | "heavy-atom-count";

export type PubChem2dDescriptorUnit = "g/mol" | "Da" | "Å²" | null;

export interface PubChem2dDescriptor {
  readonly id: PubChem2dDescriptorId;
  readonly value: number;
  readonly unit: PubChem2dDescriptorUnit;
  /** Exact field from the checked, CID-matched PubChem 2D SDF record. */
  readonly sourceField: string;
  readonly provenance: "pubchem-2d-sdf";
  /** Source-supported means copied from the source record, not independently verified. */
  readonly reviewStatus: "source-supported";
  readonly pubChemCid: number;
  readonly sourceUrl: string;
}

export interface PubChem2dDescriptorContract {
  readonly expectedPubChemCid: number;
  readonly sourceUrl: string;
}

export type PubChem2dDescriptorTextLoader = (assetUrl: string) => Promise<string>;

type DescriptorValueKind = "non-negative" | "positive" | "count" | "charge" | "xlogp";

interface DescriptorDefinition {
  readonly id: PubChem2dDescriptorId;
  readonly sourceFields: readonly string[];
  readonly unit: PubChem2dDescriptorUnit;
  readonly kind: DescriptorValueKind;
}

/**
 * Deliberately small allowlist. No value is inferred from atoms or another
 * descriptor: the exact named PubChem field must be present and valid.
 */
const DESCRIPTOR_DEFINITIONS: readonly DescriptorDefinition[] = [
  {
    id: "molecular-weight",
    sourceFields: ["PUBCHEM_MOLECULAR_WEIGHT"],
    unit: "g/mol",
    kind: "positive",
  },
  {
    id: "complexity",
    sourceFields: ["PUBCHEM_CACTVS_COMPLEXITY"],
    unit: null,
    kind: "non-negative",
  },
  {
    id: "hydrogen-bond-acceptors",
    sourceFields: ["PUBCHEM_CACTVS_HBOND_ACCEPTOR"],
    unit: null,
    kind: "count",
  },
  {
    id: "hydrogen-bond-donors",
    sourceFields: ["PUBCHEM_CACTVS_HBOND_DONOR"],
    unit: null,
    kind: "count",
  },
  {
    id: "rotatable-bonds",
    sourceFields: ["PUBCHEM_CACTVS_ROTATABLE_BOND"],
    unit: null,
    kind: "count",
  },
  {
    id: "xlogp",
    sourceFields: ["PUBCHEM_XLOGP3", "PUBCHEM_XLOGP3_AA"],
    unit: null,
    kind: "xlogp",
  },
  {
    id: "exact-mass",
    sourceFields: ["PUBCHEM_EXACT_MASS"],
    unit: "Da",
    kind: "positive",
  },
  {
    id: "topological-polar-surface-area",
    sourceFields: ["PUBCHEM_CACTVS_TPSA"],
    unit: "Å²",
    kind: "non-negative",
  },
  {
    id: "monoisotopic-mass",
    sourceFields: ["PUBCHEM_MONOISOTOPIC_WEIGHT"],
    unit: "Da",
    kind: "positive",
  },
  {
    id: "total-charge",
    sourceFields: ["PUBCHEM_TOTAL_CHARGE"],
    unit: null,
    kind: "charge",
  },
  {
    id: "heavy-atom-count",
    sourceFields: ["PUBCHEM_HEAVY_ATOM_COUNT"],
    unit: null,
    kind: "count",
  },
];

const STRICT_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function parseAllowedValue(rawValue: string, kind: DescriptorValueKind): number | null {
  const normalized = rawValue.trim();
  if (!STRICT_NUMBER.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  switch (kind) {
    case "count":
      return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000
        ? value
        : null;
    case "charge":
      return Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000
        ? Object.is(value, -0) ? 0 : value
        : null;
    case "positive":
      return value > 0 && value <= 10_000_000 ? value : null;
    case "non-negative":
      return value >= 0 && value <= 1_000_000_000 ? value : null;
    case "xlogp":
      return value >= -100 && value <= 100 ? Object.is(value, -0) ? 0 : value : null;
  }
}

function validatePubChem2dSourceUrl(sourceUrl: string, expectedPubChemCid: number): string {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("PubChem 2D descriptor source URL is invalid");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "pubchem.ncbi.nlm.nih.gov" ||
    parsed.pathname !== `/rest/pug/compound/cid/${expectedPubChemCid}/record/SDF` ||
    parsed.searchParams.get("record_type") !== "2d"
  ) {
    throw new Error("PubChem 2D descriptor source URL does not match the expected CID record");
  }
  return parsed.toString();
}

/**
 * Extracts only explicitly allowlisted numeric properties after the parsed SDF
 * passes exact CID and 2D validation. Missing or malformed fields are omitted.
 */
export function extractPubChem2dDescriptors(
  structure: MoleculeStructure,
  contract: PubChem2dDescriptorContract,
): readonly PubChem2dDescriptor[] {
  validateSdfResource(structure, {
    expectedDimension: "2d",
    expectedPubChemCid: contract.expectedPubChemCid,
  });
  const sourceUrl = validatePubChem2dSourceUrl(
    contract.sourceUrl,
    contract.expectedPubChemCid,
  );

  return DESCRIPTOR_DEFINITIONS.flatMap((definition) => {
    const sourceField = definition.sourceFields.find((field) =>
      Object.prototype.hasOwnProperty.call(structure.properties, field),
    );
    if (!sourceField) return [];

    const value = parseAllowedValue(structure.properties[sourceField] ?? "", definition.kind);
    if (value === null) return [];

    return [{
      id: definition.id,
      value,
      unit: definition.unit,
      sourceField,
      provenance: "pubchem-2d-sdf" as const,
      reviewStatus: "source-supported" as const,
      pubChemCid: contract.expectedPubChemCid,
      sourceUrl,
    }];
  });
}

async function fetchSameOriginSdfText(assetUrl: string): Promise<string> {
  const response = await fetch(assetUrl, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`PubChem 2D SDF request failed with HTTP ${response.status}`);
  }
  return response.text();
}

/** Loads the checked-in asset, then validates identity before exposing fields. */
export async function loadPubChem2dDescriptors(
  assetUrl: string,
  contract: PubChem2dDescriptorContract,
  loadText: PubChem2dDescriptorTextLoader = fetchSameOriginSdfText,
): Promise<readonly PubChem2dDescriptor[]> {
  if (!assetUrl.trim()) throw new Error("PubChem 2D descriptor asset URL is empty");
  const source = await loadText(assetUrl);
  return extractPubChem2dDescriptors(parseSdfV2000(source), contract);
}
