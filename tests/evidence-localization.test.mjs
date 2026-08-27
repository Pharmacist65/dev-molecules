import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { createLocalEvidenceCard } = await tsImport(
  "../lib/application/evidence-card.ts",
  import.meta.url,
);

test("curated evidence cards preserve stable science fields while localizing prose", () => {
  const tr = createLocalEvidenceCard(
    "molecule:propranolol",
    "Hangi kanıt var?",
    "tr",
  );
  const en = createLocalEvidenceCard(
    "molecule:propranolol",
    "What evidence is available?",
    "en",
  );

  assert.ok(tr);
  assert.ok(en);
  assert.equal(tr.locale, "tr");
  assert.equal(en.locale, "en");
  assert.equal(tr.moleculeId, en.moleculeId);
  assert.equal(tr.identityStatus, en.identityStatus);
  assert.equal(tr.synthesisStatus, "not-assessed");
  assert.equal(en.synthesisStatus, "not-assessed");
  assert.deepEqual(tr.findings.find((finding) => finding.label === "Sentez anlatısı")?.sourceIds, []);
  assert.deepEqual(en.findings.find((finding) => finding.label === "Synthesis narrative")?.sourceIds, []);
  assert.match(tr.summary, /doğrulanmış kimlik/i);
  assert.match(en.summary, /verified identity/i);
  assert.equal(tr.findings[0].label, "Kimlik");
  assert.equal(en.findings[0].label, "Identity");
  assert.match(tr.limitations[2], /yenilik/i);
  assert.match(en.limitations[2], /novelty/i);
  assert.equal(tr.notFoundIsNoveltyEvidence, false);
  assert.equal(en.notFoundIsNoveltyEvidence, false);
});

test("cards without a synthesis story localize the explicit not-assessed boundary", () => {
  const tr = createLocalEvidenceCard("molecule:ibuprofen", "Kanıt?", "tr");
  const en = createLocalEvidenceCard("molecule:ibuprofen", "Evidence?", "en");

  assert.ok(tr);
  assert.ok(en);
  assert.equal(tr.synthesisStatus, "not-assessed");
  assert.equal(en.synthesisStatus, "not-assessed");
  assert.match(tr.summary, /değerlendirilmedi/i);
  assert.match(en.summary, /not assessed/i);
});
