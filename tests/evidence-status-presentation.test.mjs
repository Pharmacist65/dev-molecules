import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { presentEvidenceStatus } = await tsImport(
  "../lib/application/evidence-status-presentation.ts",
  import.meta.url,
);
const { createTranslator } = await tsImport("../lib/i18n/index.ts", import.meta.url);

test("evidence status presentation localizes known values and fails closed", () => {
  const tr = createTranslator("tr");
  const en = createTranslator("en");

  assert.equal(presentEvidenceStatus("exact-curated-match", tr), "Kesin kontrollü eşleşme");
  assert.equal(presentEvidenceStatus("pending", tr), "İnceleme bekliyor");
  assert.equal(presentEvidenceStatus("source-supported", en), "Source supported");
  assert.equal(presentEvidenceStatus("unexpected-runtime-value", tr), "Bilinmiyor");
});
