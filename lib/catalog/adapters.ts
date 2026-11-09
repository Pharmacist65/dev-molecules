import type {
  CatalogAdapterId,
  DrugCentralApprovalRow,
  DrugCentralStructureRow,
  PubChemPropertyRow,
} from "./types";

export interface AdapterCapability {
  readonly adapter: CatalogAdapterId;
  readonly status: "available" | "future";
  readonly networkRequired: boolean;
  readonly note: string;
}

const parseDelimitedLine = (line: string, delimiter: string): string[] => {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values.map((item) => item.trim());
};

export const drugCentralApprovedAdapter = {
  id: "drugcentral-approved" as const,
  parse(csv: string): readonly DrugCentralApprovalRow[] {
    const rows: DrugCentralApprovalRow[] = [];
    const seen = new Set<number>();
    for (const [lineIndex, rawLine] of csv.split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line) continue;
      const [idText, name, ...unexpected] = parseDelimitedLine(line, ",");
      const drugCentralId = Number(idText);
      if (
        unexpected.length > 0 ||
        !Number.isSafeInteger(drugCentralId) ||
        drugCentralId < 1 ||
        !name
      ) {
        throw new Error(`Invalid DrugCentral approval row at line ${lineIndex + 1}.`);
      }
      if (seen.has(drugCentralId)) {
        throw new Error(`Duplicate DrugCentral approval ID ${drugCentralId}.`);
      }
      seen.add(drugCentralId);
      rows.push({ drugCentralId, name });
    }
    return rows;
  },
};

export const drugCentralStructureAdapter = {
  id: "drugcentral-structures" as const,
  parse(tsv: string): readonly DrugCentralStructureRow[] {
    const lines = tsv.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      throw new Error("DrugCentral structure snapshot is empty.");
    }
    const header = parseDelimitedLine(lines[0], "\t");
    const expected = ["SMILES", "InChI", "InChIKey", "ID", "INN", "CAS_RN"];
    if (header.join("|") !== expected.join("|")) {
      throw new Error("Unexpected DrugCentral structure snapshot header.");
    }
    const rows: DrugCentralStructureRow[] = [];
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const [smiles, inchi, inchiKey, idText, inn, casNumber, ...unexpected] =
        parseDelimitedLine(lines[lineIndex], "\t");
      const drugCentralId = Number(idText);
      if (
        unexpected.length === 0 &&
        Number.isSafeInteger(drugCentralId) &&
        drugCentralId > 0 &&
        inn &&
        (!smiles || !inchi || !inchiKey)
      ) {
        // Undefined/partial structures are intentionally not promoted into the
        // resolvable structure set. Callers may retain the approval row as unresolved.
        continue;
      }
      if (
        unexpected.length > 0 ||
        !smiles ||
        !inchi ||
        !inchiKey ||
        !Number.isSafeInteger(drugCentralId) ||
        drugCentralId < 1 ||
        !inn
      ) {
        throw new Error(`Invalid DrugCentral structure row at line ${lineIndex + 1}.`);
      }
      rows.push({
        drugCentralId,
        inn,
        smiles,
        inchi,
        inchiKey,
        casNumber: casNumber || null,
      });
    }
    return rows;
  },
};

interface PubChemPropertyPayload {
  readonly PropertyTable?: {
    readonly Properties?: readonly Record<string, unknown>[];
  };
}

const requiredString = (
  row: Record<string, unknown>,
  keys: readonly string[],
  context: string,
): string => {
  for (const key of keys) {
    if (typeof row[key] === "string" && row[key].trim()) {
      return row[key].trim();
    }
  }
  throw new Error(`Missing ${keys.join("/")} in ${context}.`);
};

export const pubChemPugRestAdapter = {
  id: "pubchem-pug-rest" as const,
  parseProperties(payload: unknown): readonly PubChemPropertyRow[] {
    const table = payload as PubChemPropertyPayload;
    const properties = table.PropertyTable?.Properties;
    if (!Array.isArray(properties)) {
      throw new Error("Unexpected PubChem PUG REST property payload.");
    }
    return properties.map((property, index) => {
      const cid = Number(property.CID);
      const molecularWeight = Number(property.MolecularWeight);
      if (!Number.isSafeInteger(cid) || cid < 1 || !Number.isFinite(molecularWeight)) {
        throw new Error(`Invalid PubChem property row at index ${index}.`);
      }
      const canonicalSmiles = requiredString(
        property,
        ["ConnectivitySMILES", "CanonicalSMILES", "SMILES"],
        `PubChem row ${cid}`,
      );
      const broadSmiles =
        typeof property.SMILES === "string" && property.SMILES.trim()
          ? property.SMILES.trim()
          : null;
      const explicitIsomeric =
        typeof property.IsomericSMILES === "string" && property.IsomericSMILES.trim()
          ? property.IsomericSMILES.trim()
          : null;
      return {
        cid,
        title:
          typeof property.Title === "string" && property.Title.trim()
            ? property.Title.trim()
            : null,
        molecularFormula: requiredString(
          property,
          ["MolecularFormula"],
          `PubChem row ${cid}`,
        ),
        molecularWeight,
        canonicalSmiles,
        isomericSmiles:
          explicitIsomeric ?? (broadSmiles !== canonicalSmiles ? broadSmiles : null),
        inchiKey: requiredString(property, ["InChIKey"], `PubChem row ${cid}`),
      };
    });
  },
};

export interface OpenFdaProductRecord {
  readonly applicationNumber: string;
  readonly sponsorName: string;
  readonly productNumber: string;
  readonly brandName: string;
  readonly dosageForm: string;
  readonly route: string;
  readonly marketingStatus: string;
  readonly activeIngredients: readonly {
    readonly name: string;
    readonly strength: string;
  }[];
}

export const openFdaDrugsFdaAdapter = {
  id: "openfda-drugsfda" as const,
  parse(payload: unknown): readonly OpenFdaProductRecord[] {
    if (!payload || typeof payload !== "object") {
      throw new Error("Unexpected openFDA payload.");
    }
    const results = (payload as { results?: unknown }).results;
    if (!Array.isArray(results)) {
      throw new Error("openFDA payload has no results array.");
    }
    const records: OpenFdaProductRecord[] = [];
    for (const result of results) {
      if (!result || typeof result !== "object") {
        throw new Error("Invalid openFDA application record.");
      }
      const application = result as Record<string, unknown>;
      const applicationNumber = application.application_number;
      const sponsorName = application.sponsor_name;
      const products = application.products;
      if (
        typeof applicationNumber !== "string" ||
        typeof sponsorName !== "string" ||
        !Array.isArray(products)
      ) {
        throw new Error("Incomplete openFDA application record.");
      }
      for (const product of products) {
        if (!product || typeof product !== "object") {
          throw new Error(`Invalid openFDA product in ${applicationNumber}.`);
        }
        const value = product as Record<string, unknown>;
        const ingredients = value.active_ingredients;
        if (!Array.isArray(ingredients)) {
          throw new Error(`Missing active ingredients in ${applicationNumber}.`);
        }
        records.push({
          applicationNumber,
          sponsorName,
          productNumber: requiredString(value, ["product_number"], applicationNumber),
          brandName: requiredString(value, ["brand_name"], applicationNumber),
          dosageForm: requiredString(value, ["dosage_form"], applicationNumber),
          route: requiredString(value, ["route"], applicationNumber),
          marketingStatus: requiredString(
            value,
            ["marketing_status"],
            applicationNumber,
          ),
          activeIngredients: ingredients.map((ingredient) => {
            if (!ingredient || typeof ingredient !== "object") {
              throw new Error(`Invalid active ingredient in ${applicationNumber}.`);
            }
            const item = ingredient as Record<string, unknown>;
            return {
              name: requiredString(item, ["name"], applicationNumber),
              strength: requiredString(item, ["strength"], applicationNumber),
            };
          }),
        });
      }
    }
    return records;
  },
};

export const catalogAdapterCapabilities: readonly AdapterCapability[] = [
  {
    adapter: "drugcentral-approved",
    status: "available",
    networkRequired: true,
    note: "All-row snapshot importer for a selected DrugCentral approval list.",
  },
  {
    adapter: "drugcentral-structures",
    status: "available",
    networkRequired: true,
    note: "SMILES/InChI identity snapshot adapter.",
  },
  {
    adapter: "pubchem-pug-rest",
    status: "available",
    networkRequired: true,
    note: "Exact InChIKey resolution and 2D/3D SDF retrieval.",
  },
  {
    adapter: "openfda-drugsfda",
    status: "available",
    networkRequired: true,
    note: "Product/application adapter; not selected for the current bounded snapshot.",
  },
  {
    adapter: "ema-future",
    status: "future",
    networkRequired: true,
    note: "No direct EMA snapshot is configured; records are never inferred.",
  },
  {
    adapter: "pmda-future",
    status: "future",
    networkRequired: true,
    note: "No direct PMDA snapshot is configured; records are never inferred.",
  },
];
