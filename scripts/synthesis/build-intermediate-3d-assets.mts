import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  applyRdkitGeneratedConformersToManifest,
  buildSynthesisIntermediate3DManifest,
  parseSynthesisIntermediate3DGenerationReport,
  parseSynthesisIntermediate3DManifest,
} from "../../lib/application/synthesis-learning-evidence";
import type { CatalogShard } from "../../lib/catalog/sharding";
import type {
  CatalogManifest,
  CatalogNormalizedEntity,
} from "../../lib/catalog/types";
import type { PublicAlphaSynthesisDraftGraph } from
  "../../lib/domain/public-alpha-synthesis-draft";
import {
  analyzePublicAlphaSynthesisQuality,
  loadPublicAlphaSynthesisQualityInput,
} from "./analyze-public-alpha-quality.mjs";

export const synthesisIntermediate3DManifestUrl = new URL(
  "../../public/catalog/synthesis/reports/intermediate-3d-assets.json",
  import.meta.url,
);

const projectRootPath = fileURLToPath(new URL("../../", import.meta.url));
const publicRootPath = fileURLToPath(new URL("../../public/", import.meta.url));
const generatedAssetDirectory = join(
  publicRootPath,
  "catalog/synthesis/intermediate-3d",
);
const generatorScriptPath = fileURLToPath(
  new URL("./generate_intermediate_conformers.py", import.meta.url),
);
const RDKIT_GENERATED_AT = "2026-08-28T03:22:05.000Z";
const REQUIRED_RDKIT_VERSION = "2026.03.5";

const catalogManifestUrl = new URL(
  "../../public/catalog/manifest.json",
  import.meta.url,
);

const readJson = async <Value,>(url: URL): Promise<Value> =>
  JSON.parse(await readFile(url, "utf8")) as Value;

const stableJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;

const randomSeedForInchiKey = (inchiKey: string): number => {
  const digest = createHash("sha256")
    .update(inchiKey, "utf8")
    .digest();
  const first31Bits = (
    (((digest[0] << 24) >>> 0) |
      (digest[1] << 16) |
      (digest[2] << 8) |
      digest[3]) >>> 0
  ) & 0x7fffffff;
  return first31Bits === 0 ? 1 : first31Bits;
};

const runPythonGenerator = async (
  planPath: string,
  reportPath: string,
): Promise<void> => {
  const pythonExecutable = process.env.MOLEVREN_RDKIT_PYTHON?.trim() || "python3";
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      pythonExecutable,
      [generatorScriptPath, "--plan", planPath, "--report", reportPath],
      { cwd: projectRootPath, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        if (stdout.trim()) process.stdout.write(stdout);
        resolve();
        return;
      }
      reject(new Error(
        `RDKit conformer generation failed (${code ?? "signal"}): ${stderr.trim()}`,
      ));
    });
  });
};

const loadCatalogEntities = async (
  expectedSnapshotId: string,
): Promise<readonly CatalogNormalizedEntity[]> => {
  const manifest = await readJson<CatalogManifest>(catalogManifestUrl);
  if (
    manifest.schemaVersion !== 1 ||
    manifest.snapshotId !== expectedSnapshotId ||
    !Number.isSafeInteger(manifest.recordCount) ||
    manifest.recordCount < 1
  ) {
    throw new Error("Catalog and synthesis snapshots are not aligned for 3D assets.");
  }
  const descriptors = manifest.shards.filter(
    (descriptor) => descriptor.dimension === "alphabetic",
  );
  const shards = await Promise.all(descriptors.map(async (descriptor) => {
    const shard = await readJson<CatalogShard>(
      new URL(`../../public/catalog/${descriptor.path}`, import.meta.url),
    );
    if (
      shard.schemaVersion !== 1 ||
      shard.snapshotId !== manifest.snapshotId ||
      shard.dimension !== "alphabetic" ||
      shard.records.length !== descriptor.count
    ) {
      throw new Error(`Catalog shard failed its snapshot boundary: ${descriptor.id}.`);
    }
    return shard.records;
  }));
  const entities = shards.flat();
  if (
    entities.length !== manifest.recordCount ||
    new Set(entities.map((entity) => entity.id)).size !== entities.length ||
    entities.some((entity) => entity.provenance.snapshotId !== manifest.snapshotId)
  ) {
    throw new Error("Alphabetic catalog shards are incomplete or cross snapshots.");
  }
  return entities;
};

/**
 * Builds a portable exact-identity registry, then attempts deterministic local
 * RDKit conformer generation for every admitted route-boundary identity. A
 * molecule-level failure is retained explicitly and remains 2D-only. No
 * catalog 3D file is admitted as a fallback without a separate serialized-
 * identity validation gate. This does no discovery and never promotes the
 * scientific role of a route material.
 */
export const runSynthesisIntermediate3DManifestBuild = async () => {
  const input = await loadPublicAlphaSynthesisQualityInput();
  const quality = analyzePublicAlphaSynthesisQuality(input);
  if (
    quality.downgrades.moleculeCount !== 0 ||
    quality.routeDepth.validGraphCount !== input.draftEntries.length
  ) {
    throw new Error(
      "Only the complete validated public-alpha graph set may enter the 3D manifest.",
    );
  }
  const entities = await loadCatalogEntities(input.catalogSnapshotId);
  const graphs = input.draftEntries.map(
    (entry) => entry.graph as PublicAlphaSynthesisDraftGraph,
  );
  const fallbackManifest = parseSynthesisIntermediate3DManifest(
    buildSynthesisIntermediate3DManifest(
      graphs,
      entities,
      input.catalogSnapshotId,
      input.generatedAt,
    ),
  );
  await mkdir(generatedAssetDirectory, { recursive: true });
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "molevren-rdkit-"));
  const planPath = join(temporaryDirectory, "plan.json");
  const reportPath = join(temporaryDirectory, "report.json");
  const outputPathByInchiKey = new Map<string, string>();
  const planEntries = fallbackManifest.entries.map((entry) => {
    const outputPath = join(
      generatedAssetDirectory,
      `${entry.inchiKey.toLowerCase()}.sdf`,
    );
    outputPathByInchiKey.set(entry.inchiKey, outputPath);
    return {
      inchiKey: entry.inchiKey,
      pubChemCid: entry.pubChemCid,
      source2DPath: join(publicRootPath, entry.twoD.publicPath.slice(1)),
      source2DId: entry.twoD.assetId,
      outputPath,
      randomSeed: randomSeedForInchiKey(entry.inchiKey),
    };
  });
  let manifest;
  try {
    await writeFile(planPath, stableJson({
      schemaVersion: 1,
      requiredRdkitVersion: REQUIRED_RDKIT_VERSION,
      generatedAt: RDKIT_GENERATED_AT,
      entries: planEntries,
    }), "utf8");
    await runPythonGenerator(planPath, reportPath);
    const report = parseSynthesisIntermediate3DGenerationReport(
      await readJson<unknown>(pathToFileURL(reportPath)),
    );
    for (const entry of report.entries) {
      const outputPath = outputPathByInchiKey.get(entry.inchiKey);
      if (!outputPath) {
        throw new Error(`Unplanned RDKit output identity: ${entry.inchiKey}.`);
      }
      const actualHash = createHash("sha256")
        .update(await readFile(outputPath))
        .digest("hex");
      if (actualHash !== entry.sha256) {
        throw new Error(`RDKit output hash mismatch for ${entry.inchiKey}.`);
      }
    }
    manifest = applyRdkitGeneratedConformersToManifest(
      fallbackManifest,
      report,
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
  await writeFile(synthesisIntermediate3DManifestUrl, stableJson(manifest), "utf8");
  return manifest;
};

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    const manifest = await runSynthesisIntermediate3DManifestBuild();
    process.stdout.write(`${JSON.stringify({
      pipelineVersion: manifest.pipelineVersion,
      catalogSnapshotId: manifest.catalogSnapshotId,
      summary: manifest.summary,
      boundaries: manifest.boundaries,
    }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
