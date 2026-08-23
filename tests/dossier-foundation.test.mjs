import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  createDrugDossierByIdOrSlug,
  getDossierLearningAvailability,
  resolveDossierMolecule,
} = await tsImport("../lib/application/dossier/index.ts", import.meta.url);

test("reviewed identity and structure do not elevate missing scientific layers", () => {
  const dossier = createDrugDossierByIdOrSlug(
    "propranolol",
    "en",
    "/dev-molecules/",
  );
  assert.ok(dossier);
  const coverage = new Map(
    dossier.coverage.map((indicator) => [indicator.dimension, indicator.status]),
  );

  assert.equal(coverage.get("identity"), "reviewed");
  assert.equal(coverage.get("structure"), "reviewed");
  assert.equal(coverage.get("classification"), "pending-review");
  assert.equal(coverage.get("pharmacology"), "unavailable");
  assert.equal(coverage.get("adme"), "unavailable");
  assert.equal(coverage.get("nomenclature"), "unavailable");
  assert.equal(dossier.pharmacology.targets.length, 0);
  assert.equal(dossier.metabolites.edges.length, 0);
  assert.match(dossier.metabolites.unavailableReason, /does not mean/i);
  assert.ok(dossier.sources.every((source) => source.url.startsWith("https://")));
  assert.ok(
    dossier.chemistry.structures.every((structure) =>
      structure.publicPath.startsWith("/dev-molecules/structures/")),
  );
});

test("drug-specific lesson links fail closed against dossier coverage", () => {
  const propranolol = createDrugDossierByIdOrSlug("propranolol", "en");
  const celecoxib = createDrugDossierByIdOrSlug("celecoxib", "en");
  assert.ok(propranolol);
  assert.ok(celecoxib);

  assert.equal(getDossierLearningAvailability(propranolol).nomenclature, false);
  assert.equal(getDossierLearningAvailability(celecoxib).nomenclature, false);
  assert.equal(
    getDossierLearningAvailability(celecoxib).synthesis,
    celecoxib.coverage.find((item) => item.dimension === "synthesis")?.status === "source-supported",
  );
});

test("canonical IDs, slugs, and malformed links resolve or fail closed", () => {
  assert.equal(resolveDossierMolecule("molecule:celecoxib")?.id, "molecule:celecoxib");
  assert.equal(resolveDossierMolecule("celecoxib")?.id, "molecule:celecoxib");
  assert.equal(resolveDossierMolecule("%E0%A4%A"), null);
  assert.equal(createDrugDossierByIdOrSlug("not-in-curated-catalog", "tr"), null);
});

test("dossier UI contract keeps sources closed and exposes story/reference modes", async () => {
  const sourceDrawer = await readFile(
    new URL("../components/dossier/SourcesDrawer.tsx", import.meta.url),
    "utf8",
  );
  const dossierComponent = await readFile(
    new URL("../components/dossier/DrugDossier.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sourceDrawer, /<details[^>]+data-source-drawer="closed-by-default"/);
  assert.doesNotMatch(sourceDrawer, /<details[^>]+\sopen(?:=|\s|>)/);
  assert.match(dossierComponent, /data-dossier-mode=\{mode\}/);
  assert.match(dossierComponent, /aria-pressed=\{mode === "story"\}/);
  assert.match(dossierComponent, /aria-pressed=\{mode === "reference"\}/);
  assert.match(dossierComponent, /data-reference-tab=\{activeTab\}/);
  assert.match(dossierComponent, /getDossierLearningAvailability\(dossier\)/);
  assert.doesNotMatch(dossierComponent, /<dt>FORMULA<\/dt>/);
  assert.doesNotMatch(dossierComponent, /<dt>MOLAR MASS<\/dt>/);
});
