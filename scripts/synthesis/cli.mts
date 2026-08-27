import { discoverSynthesisCatalog } from "./discover-catalog.mjs";
import {
  extractSynthesisEvidenceCandidates,
  loadCompletedSynthesisExtraction,
} from "./extract-candidates.mjs";
import {
  migrateLegacySynthesisRoutes,
  type PrivateSynthesisMigrationInput,
} from "./migrate-legacy-routes.mjs";
import {
  publishSynthesisSnapshot,
  readPublishedSynthesisCoverageReport,
} from "./publish-snapshot.mjs";
import { validateGeneratedSynthesisSnapshot } from "./validate-generated-snapshot.mjs";
import { loadAcceptedSynthesisDiscoveryBaseline } from "./discover-catalog.mjs";
import {
  assemblePublicAlphaSynthesisDrafts,
  loadSynthesisSourceContentRunSummary,
  writePublicAlphaSynthesisDraftAssembly,
} from "./assemble-public-drafts.mjs";

const command = process.argv[2];
const args = process.argv.slice(3);
const flags = new Set(args);
const refreshOpenAccess = flags.has("--refresh-open-access") ||
  flags.has("--refresh-access");
const numberFlag = (name: string): number | undefined => {
  const value = args.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid numeric flag ${name}.`);
  return number;
};
const stringFlag = (name: string): string | undefined =>
  args.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);

const run = async (): Promise<unknown> => {
  switch (command) {
    case "discover": {
      let lastPrinted = 0;
      const result = await discoverSynthesisCatalog({
        refresh: flags.has("--refresh"),
        concurrency: numberFlag("--concurrency"),
        timeoutMs: numberFlag("--timeout-ms"),
        maxRetries: numberFlag("--max-retries"),
        maxCandidatesPerAdapter: numberFlag("--max-candidates"),
        onProgress: ({ completed, total, cached }) => {
          if (completed === total || completed - lastPrinted >= 25) {
            lastPrinted = completed;
            process.stderr.write(
              `[synthesis-discovery] ${completed}/${total} complete (${cached} cached)\n`,
            );
          }
        },
      });
      return {
        ...result.manifest,
        cachedSubjectCount: result.cachedSubjectCount,
      };
    }
    case "migrate": {
      const privateInputPath = stringFlag("--private-input");
      const privateInput = privateInputPath
        ? JSON.parse(await readFile(privateInputPath, "utf8")) as PrivateSynthesisMigrationInput
        : undefined;
      const result = await migrateLegacySynthesisRoutes({ privateInput });
      return result.migrationReport;
    }
    case "extract": {
      let lastPrinted = 0;
      const result = await extractSynthesisEvidenceCandidates({
        refreshOpenAccess,
        accessConcurrency: numberFlag("--access-concurrency"),
        timeoutMs: numberFlag("--timeout-ms"),
        maxRetries: numberFlag("--max-retries"),
        onProgress: ({ completed, total, phase }) => {
          if (completed === total || completed - lastPrinted >= 100) {
            lastPrinted = completed;
            process.stderr.write(
              `[synthesis-extraction:${phase}] ${completed}/${total} complete\n`,
            );
          }
        },
      });
      return {
        ...result.manifest,
        ord: result.ordAudit,
        journalIdentity: result.journalIdentityAudit,
      };
    }
    case "assemble": {
      const discovery = await loadAcceptedSynthesisDiscoveryBaseline();
      const extraction = await loadCompletedSynthesisExtraction();
      const result = assemblePublicAlphaSynthesisDrafts({
        coverage: discovery.subjects.map((subject) => subject.coverage),
        evidence: discovery.subjects.flatMap((subject) => subject.evidence),
        assessments: extraction.assessments,
        segments: extraction.resolvedSegments,
        generatedAt: extraction.manifest.generatedAt,
        sourceContent: await loadSynthesisSourceContentRunSummary(),
      });
      await writePublicAlphaSynthesisDraftAssembly(result);
      return { ...result.report, rejectionCounts: result.rejectionCounts };
    }
    case "publish":
      return publishSynthesisSnapshot();
    case "validate":
      return validateGeneratedSynthesisSnapshot();
    case "report":
      return readPublishedSynthesisCoverageReport();
    case "all": {
      const discovery = await discoverSynthesisCatalog({
        refresh: flags.has("--refresh"),
        concurrency: numberFlag("--concurrency"),
        timeoutMs: numberFlag("--timeout-ms"),
        maxRetries: numberFlag("--max-retries"),
        maxCandidatesPerAdapter: numberFlag("--max-candidates"),
      });
      const extraction = await extractSynthesisEvidenceCandidates({
        refreshOpenAccess,
        accessConcurrency: numberFlag("--access-concurrency"),
        timeoutMs: numberFlag("--timeout-ms"),
        maxRetries: numberFlag("--max-retries"),
      });
      const published = await publishSynthesisSnapshot();
      const validation = await validateGeneratedSynthesisSnapshot();
      return { discovery: discovery.manifest, extraction: extraction.manifest, published, validation };
    }
    default:
      throw new Error(
        "Usage: cli.mts <discover|extract|assemble|migrate|publish|validate|report|all> " +
          "[--refresh] [--refresh-open-access] [--concurrency=N] [--access-concurrency=N] " +
          "[--timeout-ms=N] [--max-retries=N] [--max-candidates=N] " +
          "[--private-input=/path/to/private-canonical-input.json]",
      );
  }
};

try {
  const result = await run();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
import { readFile } from "node:fs/promises";
