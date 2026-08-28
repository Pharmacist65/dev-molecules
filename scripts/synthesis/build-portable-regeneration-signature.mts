import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const repositoryRoot = process.cwd();
const intermediateDirectory = resolve(
  repositoryRoot,
  "public/catalog/synthesis/intermediate-3d",
);
const manifestPath = resolve(
  repositoryRoot,
  "public/catalog/synthesis/reports/intermediate-3d-assets.json",
);
const learningCoveragePath = resolve(
  repositoryRoot,
  "public/catalog/synthesis/reports/continuous-learning-coverage.json",
);
const targetedGapsPath = resolve(
  repositoryRoot,
  "public/catalog/synthesis/reports/targeted-gap-records.json",
);

const stableJson = (value: JsonValue): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
    .join(",")}}`;
};

const readJson = async (path: string): Promise<Record<string, JsonValue>> => {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected a JSON object at ${path}.`);
  }
  return value as Record<string, JsonValue>;
};

const portableManifest = (
  manifest: Record<string, JsonValue>,
): Record<string, JsonValue> => {
  if (!Array.isArray(manifest.entries)) {
    throw new Error("Intermediate 3D manifest entries are unavailable.");
  }
  return {
    ...manifest,
    entries: manifest.entries.map((rawEntry) => {
      if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
        throw new Error("Intermediate 3D manifest entry is invalid.");
      }
      const entry = rawEntry as Record<string, JsonValue>;
      const rawThreeD = entry.threeD;
      if (!rawThreeD || typeof rawThreeD !== "object" || Array.isArray(rawThreeD)) {
        throw new Error("Intermediate 3D manifest entry has no 3D record.");
      }
      const threeD = rawThreeD as Record<string, JsonValue>;
      const rawProvenance = threeD.provenance;
      if (
        !rawProvenance ||
        typeof rawProvenance !== "object" ||
        Array.isArray(rawProvenance)
      ) {
        throw new Error("Intermediate 3D manifest entry has no provenance record.");
      }
      const provenance = rawProvenance as Record<string, JsonValue>;
      const portableThreeD = Object.fromEntries(
        Object.entries(threeD).filter(
          ([key]) => key !== "assetId" && key !== "sha256",
        ),
      ) as Record<string, JsonValue>;
      const portableProvenance = Object.fromEntries(
        Object.entries(provenance).filter(
          ([key]) =>
            key !== "minimizedEnergy" &&
            key !== "planeOfBestFitRmsAngstrom" &&
            key !== "structureHash",
        ),
      ) as Record<string, JsonValue>;
      return {
        ...entry,
        threeD: {
          ...portableThreeD,
          provenance: portableProvenance,
        },
      };
    }),
  };
};

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const semanticSignature = async (): Promise<string> => {
  const [manifest, learningCoverage, targetedGaps] = await Promise.all([
    readJson(manifestPath),
    readJson(learningCoveragePath),
    readJson(targetedGapsPath),
  ]);
  return sha256(stableJson({
    manifest: portableManifest(manifest),
    learningCoverage,
    targetedGaps,
  }));
};

const byteSignature = async (): Promise<string> => {
  const sdfFiles = (await readdir(intermediateDirectory))
    .filter((fileName) => fileName.endsWith(".sdf"))
    .sort();
  const files = [
    ...sdfFiles.map((fileName) => ({
      label: `intermediate-3d/${fileName}`,
      path: resolve(intermediateDirectory, fileName),
    })),
    { label: "reports/continuous-learning-coverage.json", path: learningCoveragePath },
    { label: "reports/intermediate-3d-assets.json", path: manifestPath },
    { label: "reports/targeted-gap-records.json", path: targetedGapsPath },
  ].sort((left, right) => left.label.localeCompare(right.label));
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file.label);
    digest.update("\0");
    digest.update(await readFile(file.path));
    digest.update("\0");
  }
  return digest.digest("hex");
};

const modeArgument = process.argv.find((argument) => argument.startsWith("--mode="));
const mode = modeArgument?.slice("--mode=".length) ?? "semantic";
if (mode !== "semantic" && mode !== "bytes") {
  throw new Error(`Unsupported signature mode: ${mode}.`);
}

const digest = mode === "semantic"
  ? await semanticSignature()
  : await byteSignature();
process.stdout.write(`${digest}\n`);
