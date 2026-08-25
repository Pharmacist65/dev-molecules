import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("flagship Story and Reference modes render real audited sections", async () => {
  const [dossier, sections, learning] = await Promise.all([
    readSource("../components/dossier/DrugDossier.tsx"),
    readSource("../components/dossier/FlagshipDossierSections.tsx"),
    readSource("../components/dossier/FlagshipLearningTasks.tsx"),
  ]);

  for (const component of [
    "FlagshipProductAnchor",
    "FlagshipChemistryDetails",
    "FlagshipPharmacology",
    "FlagshipJourney",
    "FlagshipSynthesis",
    "FlagshipNomenclature",
    "FlagshipComparisons",
    "FlagshipLearningTasks",
  ]) {
    assert.match(dossier, new RegExp(`<${component}`, "u"), component);
  }

  assert.match(dossier, /tab === "comparisons"\) return dossier\.flagship\.comparisons\.status/u);
  assert.match(dossier, /tab === "learning"\) return dossier\.flagship\.learning\.status/u);
  assert.match(dossier, /activeTab === "synthesis"[\s\S]+<FlagshipSynthesis/u);
  assert.match(dossier, /activeTab === "nomenclature"[\s\S]+<FlagshipNomenclature/u);
  assert.match(dossier, /activeTab === "comparisons"[\s\S]+<FlagshipComparisons/u);

  assert.match(sections, /data-flagship-product-anchor=\{presentation\}/u);
  assert.match(sections, /data-flagship-journey=\{presentation\}/u);
  assert.match(sections, /data-flagship-synthesis=\{presentation\}/u);
  assert.match(sections, /data-flagship-nomenclature=\{presentation\}/u);
  assert.match(sections, /data-flagship-comparisons=\{presentation\}/u);
  assert.match(sections, /flagship\.comparisons\.content\.slice\(0, 4\)/u);
  assert.match(sections, /Operational laboratory conditions are not published/u);
  assert.doesNotMatch(sections, /MoleculeViewer/u);

  assert.match(learning, /type="radio"/u);
  assert.match(learning, /type="submit"/u);
  assert.match(learning, /data-answer-state=/u);
  assert.match(learning, /task\.options\.findIndex/u);
});

test("source drawer uses exact resolved metadata and stays closed by default", async () => {
  const sources = await readSource("../components/dossier/SourcesDrawer.tsx");

  assert.match(sources, /<details className=\{styles\.sourcesDrawer\} data-source-drawer="closed-by-default">/u);
  assert.doesNotMatch(sources, /<details[^>]+\sopen(?:=|\s|>)/u);
  assert.match(sources, /\{source\.scope\}/u);
  assert.match(sources, /source\.externalId/u);
  assert.match(sources, /source\.retrievedAt/u);
  assert.match(sources, /source\.license\.label/u);
  assert.match(sources, /reuseLabel\[source\.license\.reuseStatus\]/u);
  assert.match(sources, /technical \? <small>\{statusLabel\[source\.reviewStatus\]\[locale\]\}<\/small> : null/u);
  assert.doesNotMatch(sources, /not yet pinned|henüz belirli bir etiket/u);
});

test("flagship visual system is token-only and collapses to one column for narrow screens", async () => {
  const css = await readSource("../components/dossier/FlagshipDossier.module.css");

  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/iu);
  assert.doesNotMatch(css, /rgb\(/u);
  assert.match(css, /@media \(max-width: 430px\)/u);
  assert.match(css, /\.rawCode|\.materials code/u);
  assert.match(css, /overflow-x: auto/u);
  assert.match(css, /unicode-bidi: isolate/u);
});
