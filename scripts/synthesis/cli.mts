import { discoverSynthesisCatalog } from "./discover-catalog.mjs";
import { migrateLegacySynthesisRoutes } from "./migrate-legacy-routes.mjs";
import {
  publishSynthesisSnapshot,
  readPublishedSynthesisCoverageReport,
} from "./publish-snapshot.mjs";
import { validateGeneratedSynthesisSnapshot } from "./validate-generated-snapshot.mjs";

const command = process.argv[2];
const args = process.argv.slice(3);
const flags = new Set(args);
const numberFlag = (name: string): number | undefined => {
  const value = args.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid numeric flag ${name}.`);
  return number;
};

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
      const result = await migrateLegacySynthesisRoutes();
      return result.migrationReport;
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
      const published = await publishSynthesisSnapshot();
      const validation = await validateGeneratedSynthesisSnapshot();
      return { discovery: discovery.manifest, published, validation };
    }
    default:
      throw new Error(
        "Usage: cli.mts <discover|migrate|publish|validate|report|all> " +
          "[--refresh] [--concurrency=N] [--timeout-ms=N] [--max-retries=N] [--max-candidates=N]",
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
