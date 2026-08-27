import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = new URL("../", import.meta.url);
const publicRoot = new URL("public/", projectRoot);
const distRoot = new URL("dist-pages/", projectRoot);
const docsRoot = new URL("docs/", projectRoot);
const catalogSearchIndexUrl = new URL("public/catalog/search-index.v1.json", projectRoot);
const readmeUrl = new URL("README.md", projectRoot);
const releaseArtifactExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);
const documentationExtensions = new Set([".md", ".json", ".txt", ".html"]);
const trackedTextExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".scss",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".webmanifest",
  ".xml",
  ".yaml",
  ".yml",
]);

const execFileAsync = promisify(execFile);

const forbiddenPatterns = [
  {
    label: "real patent-backed synthesis source identifier",
    pattern: /(?:source|synthesis-source-evidence):patent-[a-z\d]/iu,
  },
  {
    label: "real route identifier",
    pattern: /synthesis-(?:atlas-)?route:(?!(?:synthetic|test-only|legacy-))[a-z\d]/iu,
  },
  {
    label: "real route-step identifier",
    pattern: /synthesis-(?:atlas-)?(?:route-)?step:(?!(?:synthetic|test-only))[a-z\d]/iu,
  },
  {
    label: "real route-material identifier",
    pattern: /synthesis-(?:atlas-)?material:(?!(?:synthetic|test-only))[a-z\d]/iu,
  },
  {
    label: "real route-derived challenge identifier",
    pattern: /synthesis-(?:atlas-)?challenge:(?!(?:synthetic|test-only))[a-z\d]/iu,
  },
  {
    label: "direct patent-document download locator",
    pattern: /(?:image-ppubs\.uspto\.gov|patentimages\.storage\.googleapis\.com)/iu,
  },
  {
    label: "raw patent-detail URL in executable or fixture source",
    pattern: /https?:\/\/patents\.google\.com\/patent\/(?!(?:\$\{|synthetic|fixture|test-only))[a-z\d]/iu,
    scope: "executable-or-fixture",
  },
  {
    label: "hard-coded molecule allowlist for route availability",
    pattern: /routeAvailable\s*=\s*\[[\s\S]{0,800}?molecule:(?!(?:synthetic|fixture|test-only))/iu,
    scope: "tracked-source",
  },
  {
    label: "unqualified human-facing synthesis-route availability claim",
    pattern: /(?:\ba source-linked educational route is available|reported synthesis evidence was identified|raporlanmış sentez kanıtı işaretlendi)/iu,
    scope: "presentation-or-release",
  },
  {
    label: "forced pending-reported-route presentation flag",
    pattern: /data-reported-route-found-pending-review\s*=\s*["'{]true/iu,
    scope: "all",
  },
  {
    label: "non-synthetic named route task identifier",
    pattern: /\bmission:(?!(?:synthetic|fixture|test-only))[a-z\d-]+-route-(?:order|sequence|steps?)\b/iu,
    scope: "tracked-source",
  },
  {
    label: "non-synthetic pending/reported route deep link fixture",
    pattern: /#academy\/synthesis\/(?!(?:synthetic|fixture|test-only))[a-z\d-]+\/(?:pending|proposed|reported)-route\b/iu,
    scope: "tracked-source",
  },
];

const excludedSourcePaths = new Set([
  "scripts/check-public-synthesis-boundary.mjs",
]);

const isExecutableOrFixtureSource = (file) =>
  /^(?:components|e2e|lib\/application|tests)\//u.test(file);

const isPresentationSource = (file) =>
  /^(?:components|e2e|lib\/application|lib\/data\/flagship-dossiers|tests)\//u.test(file);

const isReleaseArtifact = (file) =>
  /^(?:dist-pages|public)\//u.test(file);

const patternAppliesTo = (scope, file) => {
  if (!scope || scope === "all") return true;
  if (scope === "tracked-source") return !file.startsWith("public/") && !file.startsWith("dist-pages/");
  if (scope === "executable-or-fixture") return isExecutableOrFixtureSource(file);
  if (scope === "presentation-source") return isPresentationSource(file);
  if (scope === "presentation-or-release") {
    return isPresentationSource(file) || isReleaseArtifact(file);
  }
  return false;
};

const extensionOf = (name) => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot);
};

async function textArtifacts(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) return textArtifacts(url, extensions);
    return extensions.has(extensionOf(entry.name)) ? [url] : [];
  }));
  return nested.flat();
}

const relativePath = (url) => decodeURIComponent(url.href.replace(projectRoot.href, ""));

const trackedTextArtifacts = async () => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: fileURLToPath(projectRoot),
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return stdout
    .split("\0")
    .filter(Boolean)
    .filter((file) => trackedTextExtensions.has(extensionOf(file)))
    .filter(
      (file) =>
        file !== "README.md" &&
        !file.startsWith("docs/") &&
        !file.startsWith("public/") &&
        !file.startsWith("dist-pages/"),
    )
    .map((file) => new URL(file, projectRoot));
};

const normalizedIdentityNames = (record) =>
  [...new Set([record.preferredName, ...(record.aliases ?? [])])]
    .filter((value) => typeof value === "string")
    .map((value) => value.trim().toLocaleLowerCase("en"))
    .filter((value) => value.length >= 6);

const containsCatalogIdentity = (window, record) => {
  const normalizedWindow = window.toLocaleLowerCase("en");
  if (typeof record.id === "string" && normalizedWindow.includes(record.id.toLocaleLowerCase("en"))) {
    return true;
  }
  if (
    typeof record.inchiKey === "string" &&
    normalizedWindow.includes(record.inchiKey.toLocaleLowerCase("en"))
  ) {
    return true;
  }
  if (normalizedIdentityNames(record).some((name) => normalizedWindow.includes(name))) {
    return true;
  }
  if (Number.isSafeInteger(record.pubChemCid)) {
    const cid = String(record.pubChemCid);
    const contextualCid = new RegExp(
      `(?:pub\\s*chem\\s*cid|pubChemCid|\\bcid)\\D{0,12}${cid}\\b`,
      "iu",
    );
    return contextualCid.test(window);
  }
  return false;
};

const patentOrPendingLocatorSignals = [
  /\bsource\s*:\s*["']PAT["']/giu,
  /https?:\/\/patents\.google\.com\/patent\//giu,
  /\bprovider\s*:\s*["'](?:EPO|USPTO|WIPO|patent)["']/giu,
  /\b(?:documentId|patent)\s*:\s*["'][A-Z]{2}\s?[\d,]{5,}[A-Z]\d?["']/giu,
  /\b(?:verificationStatus|reviewState)\s*:\s*["']pending(?:-review)?["'][\s\S]{0,800}?\blocator\s*:/giu,
];

/**
 * Detects a test/e2e fixture that joins an actual catalog identity to a patent
 * or pending exact locator. The catalog itself supplies the identity markers;
 * no molecule-specific canary is embedded in this public guard.
 */
export const hasCatalogBoundSynthesisFixture = (contents, catalogRecords) => {
  for (const signal of patentOrPendingLocatorSignals) {
    signal.lastIndex = 0;
    for (const match of contents.matchAll(signal)) {
      const start = Math.max(0, match.index - 2_500);
      const end = Math.min(contents.length, match.index + match[0].length + 2_500);
      const window = contents.slice(start, end);
      if (catalogRecords.some((record) => containsCatalogIdentity(window, record))) {
        return true;
      }
    }
  }
  return false;
};

export const findPublicSynthesisBoundaryViolations = (
  file,
  contents,
  catalogRecords = [],
) => {
  if (excludedSourcePaths.has(file)) return [];
  const violations = [];
  for (const { label, pattern, scope } of forbiddenPatterns) {
    if (!patternAppliesTo(scope, file)) continue;
    if (pattern.test(contents)) violations.push({ file, label });
  }
  if (
    /^(?:e2e|tests)\//u.test(file) &&
    hasCatalogBoundSynthesisFixture(contents, catalogRecords)
  ) {
    violations.push({
      file,
      label: "real catalog identity bound to patent or pending-locator fixture",
    });
  }
  return violations;
};

const scanArtifacts = async (artifacts, catalogRecords) => {
  const violations = [];
  for (const artifact of artifacts) {
    const file = relativePath(artifact);
    if (excludedSourcePaths.has(file)) continue;
    let contents;
    try {
      contents = await readFile(artifact, "utf8");
    } catch (error) {
      // A path staged for deletion remains in `git ls-files --cached` until the
      // next commit. It is not part of the working-tree publication boundary.
      if (error && typeof error === "object" && error.code === "ENOENT") continue;
      throw error;
    }
    violations.push(
      ...findPublicSynthesisBoundaryViolations(file, contents, catalogRecords),
    );
  }
  return violations;
};

export async function scanPublicSynthesisBoundary({
  requireDist = true,
  includeDist = true,
} = {}) {
  const roots = [{ label: "public", url: publicRoot }];
  if (includeDist) {
    try {
      await readdir(distRoot);
      roots.push({ label: "dist-pages", url: distRoot });
    } catch (error) {
      if (requireDist) {
        throw new Error("dist-pages is missing; run npm run build:pages before the boundary scan.", {
          cause: error,
        });
      }
    }
  }

  const artifacts = (
    await Promise.all(roots.map(({ url }) => textArtifacts(url, releaseArtifactExtensions)))
  ).flat();
  if (artifacts.length === 0) {
    throw new Error("No public JavaScript, JSON, or source-map artifacts were found.");
  }
  const documentationArtifacts = [
    readmeUrl,
    ...(await textArtifacts(docsRoot, documentationExtensions)),
  ];
  const sourceArtifacts = await trackedTextArtifacts();
  const catalogIndex = JSON.parse(await readFile(catalogSearchIndexUrl, "utf8"));
  if (!Array.isArray(catalogIndex.records) || catalogIndex.records.length === 0) {
    throw new Error("Catalog search index is unavailable for synthesis-fixture boundary checks.");
  }
  const violations = await scanArtifacts([
    ...artifacts,
    ...documentationArtifacts,
    ...sourceArtifacts,
  ], catalogIndex.records);
  if (violations.length > 0) {
    const detail = violations
      .map(({ file, label }) => `${file}: ${label}`)
      .join("\n");
    throw new Error(`Pending/private synthesis detail crossed the public boundary:\n${detail}`);
  }
  return {
    roots: roots.map(({ label }) => label),
    artifactCount: artifacts.length,
    documentationArtifactCount: documentationArtifacts.length,
    sourceArtifactCount: sourceArtifacts.length,
    totalArtifactCount:
      artifacts.length + documentationArtifacts.length + sourceArtifacts.length,
    patternCount: forbiddenPatterns.length,
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  scanPublicSynthesisBoundary({ requireDist: true })
    .then((result) => {
      process.stdout.write(
        `Public synthesis boundary passed: ${result.artifactCount} release artifacts + ${result.documentationArtifactCount} documentation artifacts + ${result.sourceArtifactCount} tracked-source artifacts, ${result.patternCount} generic patterns.\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
