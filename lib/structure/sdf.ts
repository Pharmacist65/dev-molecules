export type StructureDimension = "2d" | "3d";

export interface SdfAtom {
  /** Zero-based position in the CTAB atom block. */
  readonly index: number;
  readonly element: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly formalCharge: number;
  /** V2000 atom-block mass difference; not an absolute isotope mass. */
  readonly massDifference: number;
  /** Absolute isotope mass when supplied through an M  ISO record. */
  readonly isotope: number | null;
}

export interface SdfBond {
  /** Zero-based position in the CTAB bond block. */
  readonly index: number;
  /** Zero-based atom indices. */
  readonly atomA: number;
  readonly atomB: number;
  readonly order: number;
  readonly stereo: number;
}

export interface MoleculeStructure {
  readonly title: string;
  readonly program: string;
  readonly comment: string;
  readonly dimension: StructureDimension;
  readonly atoms: readonly SdfAtom[];
  readonly bonds: readonly SdfBond[];
  readonly properties: Readonly<Record<string, string>>;
}

/**
 * Returns true only when two independently loaded CTAB records preserve the
 * same atom indices and bond graph. Matching molecular identity alone is not
 * enough for cross-view atom highlighting.
 */
export function hasExactCtabAtomIndexMapping(
  left: MoleculeStructure,
  right: MoleculeStructure,
): boolean {
  if (left.atoms.length !== right.atoms.length || left.bonds.length !== right.bonds.length) {
    return false;
  }
  if (!left.atoms.every((atom, index) => {
    const candidate = right.atoms[index];
    return Boolean(
      candidate &&
      atom.index === candidate.index &&
      atom.element === candidate.element &&
      atom.formalCharge === candidate.formalCharge &&
      atom.isotope === candidate.isotope,
    );
  })) return false;

  const bondKey = (bond: SdfBond): string => {
    const start = Math.min(bond.atomA, bond.atomB);
    const end = Math.max(bond.atomA, bond.atomB);
    return `${start}:${end}:${bond.order}`;
  };
  const leftBonds = left.bonds.map(bondKey).sort();
  const rightBonds = right.bonds.map(bondKey).sort();
  return leftBonds.every((key, index) => key === rightBonds[index]);
}

const V2000_CHARGE_CODES: Readonly<Record<number, number>> = {
  1: 3,
  2: 2,
  3: 1,
  5: -1,
  6: -2,
  7: -3,
};

function parseFixedInteger(line: string, start: number, end: number) {
  const value = Number.parseInt(line.slice(start, end).trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function parseFixedFloat(line: string, start: number, end: number) {
  const value = Number.parseFloat(line.slice(start, end).trim());
  return Number.isFinite(value) ? value : null;
}

function canonicalElement(rawElement: string) {
  const value = rawElement.trim();
  if (!/^[A-Za-z][A-Za-z]?$/.test(value)) {
    throw new Error(`Geçersiz atom sembolü: ${value || "boş"}`);
  }

  return `${value[0].toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function parseMProperty(
  line: string,
  expectedTag: "CHG" | "ISO",
  atoms: SdfAtom[],
) {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "M" || tokens[1] !== expectedTag) return;

  const pairCount = Number.parseInt(tokens[2] ?? "", 10);
  if (!Number.isInteger(pairCount) || pairCount < 0) return;

  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    const atomIndex = Number.parseInt(tokens[3 + pairIndex * 2] ?? "", 10) - 1;
    const value = Number.parseInt(tokens[4 + pairIndex * 2] ?? "", 10);
    const atom = atoms[atomIndex];

    if (!atom || !Number.isInteger(value)) continue;
    atoms[atomIndex] =
      expectedTag === "CHG"
        ? { ...atom, formalCharge: value }
        : { ...atom, isotope: value };
  }
}

function parseDataFields(lines: readonly string[], startIndex: number) {
  const properties: Record<string, string> = {};
  let lineIndex = startIndex;

  while (lineIndex < lines.length) {
    const header = lines[lineIndex];
    if (header.trim() === "$$$$") break;

    const fieldMatch = /^>\s*<([^>]+)>/.exec(header);
    if (!fieldMatch) {
      lineIndex += 1;
      continue;
    }

    const fieldName = fieldMatch[1].trim();
    const values: string[] = [];
    lineIndex += 1;

    while (
      lineIndex < lines.length &&
      lines[lineIndex].trim() !== "" &&
      lines[lineIndex].trim() !== "$$$$"
    ) {
      values.push(lines[lineIndex]);
      lineIndex += 1;
    }

    if (fieldName) properties[fieldName] = values.join("\n").trim();
  }

  return properties;
}

function inferDimension(
  atoms: readonly SdfAtom[],
  program: string,
  properties: Readonly<Record<string, string>>,
): StructureDimension {
  const zValues = atoms.map((atom) => atom.z);
  const zSpread = Math.max(...zValues) - Math.min(...zValues);
  const coordinateType = properties.PUBCHEM_COORDINATE_TYPE?.split(/\s+/) ?? [];

  if (
    zSpread > 0.0001 ||
    /3D\b/i.test(program) ||
    coordinateType.includes("2")
  ) {
    return "3d";
  }

  return "2d";
}

/**
 * Parses the first MDL Molfile/SDF V2000 record without inferring any atoms,
 * bonds or coordinates. Unsupported or malformed structures fail closed.
 */
export function parseSdfV2000(source: string): MoleculeStructure {
  if (!source.trim()) throw new Error("SDF içeriği boş.");

  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const countsLineIndex = lines.findIndex((line) => /\bV2000\b/.test(line));

  if (countsLineIndex < 0) {
    if (source.includes("V3000")) {
      throw new Error("V3000 yapıları bu görüntüleyici tarafından desteklenmiyor.");
    }
    throw new Error("Geçerli bir V2000 counts satırı bulunamadı.");
  }

  const countsLine = lines[countsLineIndex];
  const fallbackCounts = countsLine.trim().split(/\s+/);
  const atomCount =
    parseFixedInteger(countsLine, 0, 3) ?? Number.parseInt(fallbackCounts[0], 10);
  const bondCount =
    parseFixedInteger(countsLine, 3, 6) ?? Number.parseInt(fallbackCounts[1], 10);

  if (!Number.isInteger(atomCount) || atomCount <= 0) {
    throw new Error("SDF atom sayısı geçersiz.");
  }
  if (!Number.isInteger(bondCount) || bondCount < 0) {
    throw new Error("SDF bağ sayısı geçersiz.");
  }

  const atomStart = countsLineIndex + 1;
  const bondStart = atomStart + atomCount;
  const ctabEnd = bondStart + bondCount;
  if (lines.length < ctabEnd) {
    throw new Error("SDF atom veya bağ bloğu beklenenden kısa.");
  }

  const atoms: SdfAtom[] = [];
  for (let atomIndex = 0; atomIndex < atomCount; atomIndex += 1) {
    const line = lines[atomStart + atomIndex];
    const fallback = line.trim().split(/\s+/);
    const x = parseFixedFloat(line, 0, 10) ?? Number.parseFloat(fallback[0]);
    const y = parseFixedFloat(line, 10, 20) ?? Number.parseFloat(fallback[1]);
    const z = parseFixedFloat(line, 20, 30) ?? Number.parseFloat(fallback[2]);
    const element = canonicalElement(line.slice(31, 34).trim() || fallback[3] || "");
    const massDifference = parseFixedInteger(line, 34, 36) ?? 0;
    const chargeCode = parseFixedInteger(line, 36, 39) ?? 0;

    if (![x, y, z].every(Number.isFinite)) {
      throw new Error(`Atom ${atomIndex + 1} için koordinatlar geçersiz.`);
    }

    atoms.push({
      index: atomIndex,
      element,
      x,
      y,
      z,
      formalCharge: V2000_CHARGE_CODES[chargeCode] ?? 0,
      massDifference,
      isotope: null,
    });
  }

  const bonds: SdfBond[] = [];
  for (let bondIndex = 0; bondIndex < bondCount; bondIndex += 1) {
    const line = lines[bondStart + bondIndex];
    const fallback = line.trim().split(/\s+/);
    const atomA =
      (parseFixedInteger(line, 0, 3) ?? Number.parseInt(fallback[0], 10)) - 1;
    const atomB =
      (parseFixedInteger(line, 3, 6) ?? Number.parseInt(fallback[1], 10)) - 1;
    const order =
      parseFixedInteger(line, 6, 9) ?? Number.parseInt(fallback[2], 10);
    const stereo =
      parseFixedInteger(line, 9, 12) ?? Number.parseInt(fallback[3] || "0", 10);

    if (
      !Number.isInteger(atomA) ||
      !Number.isInteger(atomB) ||
      atomA < 0 ||
      atomB < 0 ||
      atomA >= atomCount ||
      atomB >= atomCount ||
      atomA === atomB
    ) {
      throw new Error(`Bağ ${bondIndex + 1} geçersiz atom indeksleri içeriyor.`);
    }
    if (!Number.isInteger(order) || order < 1 || order > 4) {
      throw new Error(`Bağ ${bondIndex + 1} için bağ derecesi desteklenmiyor.`);
    }

    bonds.push({ index: bondIndex, atomA, atomB, order, stereo });
  }

  let mEndIndex = ctabEnd;
  while (mEndIndex < lines.length && lines[mEndIndex].trim() !== "M  END") {
    parseMProperty(lines[mEndIndex], "CHG", atoms);
    parseMProperty(lines[mEndIndex], "ISO", atoms);
    mEndIndex += 1;
  }
  if (mEndIndex >= lines.length) throw new Error("SDF M  END satırı bulunamadı.");

  const properties = parseDataFields(lines, mEndIndex + 1);
  const program = lines[Math.max(0, countsLineIndex - 2)]?.trim() ?? "";

  return {
    title: lines[Math.max(0, countsLineIndex - 3)]?.trim() ?? "",
    program,
    comment: lines[Math.max(0, countsLineIndex - 1)]?.trim() ?? "",
    dimension: inferDimension(atoms, program, properties),
    atoms,
    bonds,
    properties,
  };
}
