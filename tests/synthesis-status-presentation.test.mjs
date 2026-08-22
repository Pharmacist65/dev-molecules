import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  getAtomMappingStatusLabel,
  getEvidenceLevelLabel,
} = await tsImport(
  "../lib/application/synthesis-status-presentation.ts",
  import.meta.url,
);

const atomMappingLabels = {
  reviewed: { en: "Reviewed", tr: "İncelendi" },
  draft: {
    en: "Draft — expert review pending",
    tr: "Taslak — uzman incelemesi bekliyor",
  },
  "not-mapped": { en: "Not mapped", tr: "Eşlenmedi" },
  "not-applicable": { en: "Not applicable", tr: "Uygulanamaz" },
};

const evidenceLabels = {
  "direct-experimental": {
    en: "Direct experimental evidence",
    tr: "Doğrudan deneysel kanıt",
  },
  regulatory: { en: "Regulatory source", tr: "Düzenleyici kurum kaynağı" },
  "curated-database": {
    en: "Curated database record",
    tr: "Küratörlü veri tabanı kaydı",
  },
  "literature-reported": {
    en: "Reported in the literature",
    tr: "Literatürde bildirilmiş",
  },
  "analog-supported": {
    en: "Supported by analog evidence",
    tr: "Analog kanıtıyla desteklenmiş",
  },
  computed: { en: "Computed result", tr: "Hesaplanmış sonuç" },
  "model-predicted": { en: "Model prediction", tr: "Model tahmini" },
  "educational-simplification": {
    en: "Educational simplification",
    tr: "Eğitim amaçlı sadeleştirme",
  },
  "no-evidence": { en: "No evidence", tr: "Kanıt yok" },
};

test("every synthesis atom-mapping and evidence status has an explicit TR/EN label", () => {
  for (const [status, expected] of Object.entries(atomMappingLabels)) {
    assert.equal(getAtomMappingStatusLabel(status, "en"), expected.en);
    assert.equal(getAtomMappingStatusLabel(status, "tr"), expected.tr);
    assert.notEqual(getAtomMappingStatusLabel(status, "en"), status);
    assert.notEqual(getAtomMappingStatusLabel(status, "tr"), status);
  }

  for (const [level, expected] of Object.entries(evidenceLabels)) {
    assert.equal(getEvidenceLevelLabel(level, "en"), expected.en);
    assert.equal(getEvidenceLevelLabel(level, "tr"), expected.tr);
    assert.notEqual(getEvidenceLevelLabel(level, "en"), level);
    assert.notEqual(getEvidenceLevelLabel(level, "tr"), level);
  }
});

test("unexpected runtime statuses fail closed instead of echoing raw input", () => {
  assert.equal(getAtomMappingStatusLabel("unexpected-status", "en"), "Not specified");
  assert.equal(getAtomMappingStatusLabel("unexpected-status", "tr"), "Belirtilmedi");
  assert.equal(getEvidenceLevelLabel("unexpected-level", "en"), "Not specified");
  assert.equal(getEvidenceLevelLabel("unexpected-level", "tr"), "Belirtilmedi");
});

test("Synthesis Theatre never renders serialized step statuses directly", async () => {
  const source = await readFile(
    new URL("../components/platform/SynthesisTheatre.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /\{\s*activeStep\.(?:atomMappingStatus|evidenceLevel)\s*\}/u,
  );
  assert.match(source, /getAtomMappingStatusLabel\(activeStep\.atomMappingStatus, locale\)/u);
  assert.match(source, /getEvidenceLevelLabel\(activeStep\.evidenceLevel, locale\)/u);
});
