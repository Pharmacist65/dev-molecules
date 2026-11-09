import { readFile } from "node:fs/promises";

import { buildCatalogSnapshot } from "../../lib/catalog/pipeline";
import type { CatalogBuildResult, CatalogSnapshot } from "../../lib/catalog/types";
import { snapshotUrl } from "./catalog-config.mjs";

export const normalizeIdentities = async (): Promise<CatalogBuildResult> => {
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8")) as CatalogSnapshot;
  return buildCatalogSnapshot(snapshot);
};
