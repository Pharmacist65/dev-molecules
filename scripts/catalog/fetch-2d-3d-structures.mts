import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

import type {
  CatalogStructureAsset,
  PubChemPropertyRow,
} from "../../lib/catalog/types";
import {
  catalogStructureOutputUrl,
  catalogSourceUrls,
  projectRoot,
} from "./catalog-config.mjs";

const sha256 = (content: Uint8Array): string =>
  createHash("sha256").update(content).digest("hex");

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchBytes = async (url: string): Promise<Uint8Array | null> => {
  const retryDelays = [0, 350, 1_000, 3_000, 8_000];
  let lastStatus = 0;
  for (const delay of retryDelays) {
    if (delay > 0) await sleep(delay);
    const response = await fetch(url, {
      headers: { Accept: "chemical/x-mdl-sdfile" },
    });
    lastStatus = response.status;
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
    if (response.status === 400 || response.status === 404) return null;
    if (response.status !== 429 && response.status < 500) {
      break;
    }
  }
  throw new Error(`Structure request failed (${lastStatus}) for ${url}`);
};

const hasExpectedIdentity = (
  bytes: Uint8Array,
  property: PubChemPropertyRow,
  dimension: "2d" | "3d",
): boolean => {
  const text = new TextDecoder().decode(bytes);
  if (
    !new RegExp(
      `> <PUBCHEM_COMPOUND_CID>\\r?\\n${property.cid}(?:\\r?\\n|$)`,
    ).test(text)
  ) {
    return false;
  }
  return (
    dimension === "3d" ||
    new RegExp(
      `> <PUBCHEM_IUPAC_INCHIKEY>\\r?\\n${property.inchiKey}(?:\\r?\\n|$)`,
    ).test(text)
  );
};

const loadReusableFixture = async (
  property: PubChemPropertyRow,
  dimension: "2d" | "3d",
): Promise<Uint8Array | null> => {
  const { cid } = property;
  const output = new URL(`cid-${cid}-${dimension}.sdf`, catalogStructureOutputUrl);
  try {
    const existing = new Uint8Array(await readFile(output));
    if (hasExpectedIdentity(existing, property, dimension)) return existing;
  } catch {
    // Fall through to the smaller checked regression-fixture directory.
  }
  const source = new URL(`public/structures/pubchem/cid-${cid}-${dimension}.sdf`, projectRoot);
  try {
    const bytes = new Uint8Array(await readFile(source));
    if (!hasExpectedIdentity(bytes, property, dimension)) return null;
    await copyFile(source, output);
    return bytes;
  } catch {
    return null;
  }
};

const assetFor = (
  property: PubChemPropertyRow,
  dimension: "2d" | "3d",
  bytes: Uint8Array,
): CatalogStructureAsset => {
  const filename = `cid-${property.cid}-${dimension}.sdf`;
  return {
    path: `/catalog/structures/pubchem/${filename}`,
    sha256: sha256(bytes),
    byteLength: bytes.byteLength,
    sourceUrl: `${catalogSourceUrls.pubChemPugRest}/compound/cid/${property.cid}/record/SDF?record_type=${dimension}`,
  };
};

const splitSdfRecords = (bytes: Uint8Array): readonly Uint8Array[] =>
  new TextDecoder()
    .decode(bytes)
    .split("$$$$")
    .map((record) => record.replace(/^\s+/, "").trimEnd())
    .filter(Boolean)
    .map((record) => new TextEncoder().encode(`${record}\n$$$$\n`));

const fetchBatch = async (
  properties: readonly PubChemPropertyRow[],
  dimension: "2d" | "3d",
): Promise<ReadonlyMap<number, Uint8Array>> => {
  const url = `${catalogSourceUrls.pubChemPugRest}/compound/cid/${properties
    .map((property) => property.cid)
    .join(",")}/record/SDF?record_type=${dimension}`;
  const response = await fetchBytes(url);
  if (response === null) return new Map();
  const byCid = new Map<number, Uint8Array>();
  for (const bytes of splitSdfRecords(response)) {
    const text = new TextDecoder().decode(bytes);
    const cidMatch = text.match(/> <PUBCHEM_COMPOUND_CID>\r?\n(\d+)(?:\r?\n|$)/);
    const cid = Number(cidMatch?.[1]);
    const property = properties.find((candidate) => candidate.cid === cid);
    if (property && bytes.byteLength >= 100 && hasExpectedIdentity(bytes, property, dimension)) {
      byCid.set(cid, bytes);
    }
  }
  return byCid;
};

const fetchBatchWithMissingRecovery = async (
  properties: readonly PubChemPropertyRow[],
  dimension: "2d" | "3d",
): Promise<ReadonlyMap<number, Uint8Array>> => {
  if (properties.length === 0) return new Map();
  let found: ReadonlyMap<number, Uint8Array>;
  try {
    found = await fetchBatch(properties, dimension);
  } catch (error) {
    if (properties.length === 1) throw error;
    const midpoint = Math.ceil(properties.length / 2);
    const left = await fetchBatchWithMissingRecovery(
      properties.slice(0, midpoint),
      dimension,
    );
    const right = await fetchBatchWithMissingRecovery(
      properties.slice(midpoint),
      dimension,
    );
    return new Map([...left, ...right]);
  }
  const missing = properties.filter((property) => !found.has(property.cid));
  if (missing.length === 0 || properties.length === 1) return found;
  const midpoint = Math.ceil(missing.length / 2);
  const left = await fetchBatchWithMissingRecovery(
    missing.slice(0, midpoint),
    dimension,
  );
  const right = await fetchBatchWithMissingRecovery(
    missing.slice(midpoint),
    dimension,
  );
  return new Map([...found, ...left, ...right]);
};

const fetchDimension = async (
  properties: readonly PubChemPropertyRow[],
  dimension: "2d" | "3d",
): Promise<ReadonlyMap<number, CatalogStructureAsset>> => {
  const assets = new Map<number, CatalogStructureAsset>();
  const requiresNetwork: PubChemPropertyRow[] = [];
  for (const property of properties) {
    const bytes = await loadReusableFixture(property, dimension);
    if (bytes) assets.set(property.cid, assetFor(property, dimension, bytes));
    else requiresNetwork.push(property);
  }

  const chunks: PubChemPropertyRow[][] = [];
  for (let index = 0; index < requiresNetwork.length; index += 20) {
    chunks.push(requiresNetwork.slice(index, index + 20));
  }
  const queue = [...chunks];
  const workers = Array.from({ length: 1 }, async () => {
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (!chunk) break;
      const records = await fetchBatchWithMissingRecovery(chunk, dimension);
      for (const property of chunk) {
        const bytes = records.get(property.cid);
        if (!bytes) continue;
        const output = new URL(
          `cid-${property.cid}-${dimension}.sdf`,
          catalogStructureOutputUrl,
        );
        await writeFile(output, bytes);
        assets.set(property.cid, assetFor(property, dimension, bytes));
      }
      await sleep(150);
    }
  });
  await Promise.all(workers);
  return assets;
};

export const fetchPubChemStructureAssets = async (
  properties: readonly PubChemPropertyRow[],
): Promise<
  ReadonlyMap<
    number,
    {
      readonly twoD: CatalogStructureAsset | null;
      readonly threeD: CatalogStructureAsset | null;
    }
  >
> => {
  await mkdir(catalogStructureOutputUrl, { recursive: true });
  const uniqueProperties = [
    ...new Map(properties.map((property) => [property.cid, property])).values(),
  ];
  // A record is publishable only as a complete pair. Resolve the scarcer 3D
  // conformer first so refreshes do not download 2D assets that cannot ship.
  const threeD = await fetchDimension(uniqueProperties, "3d");
  const twoD = await fetchDimension(
    uniqueProperties.filter((property) => threeD.has(property.cid)),
    "2d",
  );
  return new Map(
    uniqueProperties.map((property) => [
      property.cid,
      {
        twoD: twoD.get(property.cid) ?? null,
        threeD: threeD.get(property.cid) ?? null,
      },
    ]),
  );
};
