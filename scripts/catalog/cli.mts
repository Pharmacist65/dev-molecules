import { generateStaticCatalog } from "./build-catalog.mjs";
import { downloadSourceSnapshots } from "./download-source-snapshots.mjs";
import { generateEnrichmentReadinessReport } from "./enrich-catalog.mjs";
import { normalizeIdentities } from "./normalize-identities.mjs";
import { readCatalogReport } from "./report-catalog.mjs";
import { validateGeneratedCatalog } from "./validate-catalog.mjs";

const command = process.argv[2];
const flags = new Set(process.argv.slice(3));

const run = async (): Promise<unknown> => {
  switch (command) {
    case "download":
      return downloadSourceSnapshots({
        dryRun: flags.has("--dry-run"),
        refresh: flags.has("--refresh") || flags.has("--network"),
      });
    case "normalize": {
      const result = await normalizeIdentities();
      return {
        imported: result.entities.length,
        unresolved: result.unresolved.length,
        coverage: result.coverage,
      };
    }
    case "enrich":
      return generateEnrichmentReadinessReport();
    case "build":
      return generateStaticCatalog();
    case "validate":
      return validateGeneratedCatalog();
    case "report":
      return readCatalogReport();
    default:
      throw new Error(
        "Usage: cli.mts <download|normalize|enrich|build|validate|report> [--dry-run|--refresh]",
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
