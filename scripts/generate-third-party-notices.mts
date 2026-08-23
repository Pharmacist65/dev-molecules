import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

interface LockPackage {
  readonly dev?: boolean;
  readonly license?: string;
  readonly optional?: boolean;
  readonly version?: string;
}

interface PackageLock {
  readonly packages?: Readonly<Record<string, LockPackage>>;
}

interface PackageMetadata {
  readonly name?: string;
  readonly version?: string;
  readonly license?: string | Readonly<{ readonly type?: string }>;
  readonly repository?: string | Readonly<{ readonly url?: string }>;
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputPath = path.join(projectRoot, "public", "THIRD_PARTY_NOTICES.txt");
const checkOnly = process.argv.includes("--check");

const normalize = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();

const repositoryUrl = (repository: PackageMetadata["repository"]): string | null => {
  if (typeof repository === "string") return repository;
  return repository?.url ?? null;
};

const declaredLicense = (
  metadata: PackageMetadata,
  fallback: LockPackage,
): string => {
  if (typeof metadata.license === "string") return metadata.license;
  return metadata.license?.type ?? fallback.license ?? "UNDECLARED";
};

async function readLicenseFiles(packageDirectory: string): Promise<readonly string[]> {
  const entries = await readdir(packageDirectory, { withFileTypes: true });
  const filenames = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  return Promise.all(
    filenames.map(async (filename) => {
      const body = normalize(await readFile(path.join(packageDirectory, filename), "utf8"));
      return `${filename}\n${"-".repeat(filename.length)}\n${body}`;
    }),
  );
}

async function createNotice(): Promise<string> {
  const [curatedNotice, lockText] = await Promise.all([
    readFile(path.join(projectRoot, "THIRD_PARTY_NOTICES.md"), "utf8"),
    readFile(path.join(projectRoot, "package-lock.json"), "utf8"),
  ]);
  const lock = JSON.parse(lockText) as PackageLock;
  const packageEntries = Object.entries(lock.packages ?? {})
    .filter(([packagePath, metadata]) => packagePath.startsWith("node_modules/") && metadata.dev !== true)
    .sort(([left], [right]) => left.localeCompare(right, "en"));

  const sections = await Promise.all(
    packageEntries.map(async ([packagePath, lockMetadata]) => {
      const packageDirectory = path.join(projectRoot, packagePath);
      const metadata = JSON.parse(
        await readFile(path.join(packageDirectory, "package.json"), "utf8"),
      ) as PackageMetadata;
      const name = metadata.name ?? packagePath.replace(/^node_modules\//, "");
      const version = metadata.version ?? lockMetadata.version ?? "unknown";
      const license = declaredLicense(metadata, lockMetadata);
      const repository = repositoryUrl(metadata.repository);
      const licenseFiles = await readLicenseFiles(packageDirectory);
      const header = [
        `${name}@${version}`,
        `Declared license: ${license}`,
        ...(repository ? [`Repository: ${repository}`] : []),
      ].join("\n");
      const body = licenseFiles.length > 0
        ? licenseFiles.join("\n\n")
        : "No package-local license or notice file was present; retain the declared license metadata above.";
      return `${"=".repeat(80)}\n${header}\n\n${body}`;
    }),
  );

  return [
    "DEV MOLECULES — PUBLIC THIRD-PARTY AND DATA NOTICES",
    "Generated deterministically from package-lock.json and installed package license files.",
    "This notice does not grant a license to Dev Molecules application code.",
    "",
    normalize(curatedNotice),
    "",
    "# Complete non-development npm dependency license inventory",
    "",
    ...sections,
    "",
  ].join("\n");
}

const expected = await createNotice();
if (checkOnly) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (normalize(current) !== normalize(expected)) {
    throw new Error("public/THIRD_PARTY_NOTICES.txt is missing or stale. Run npm run licenses:generate.");
  }
} else {
  await writeFile(outputPath, expected, "utf8");
}
