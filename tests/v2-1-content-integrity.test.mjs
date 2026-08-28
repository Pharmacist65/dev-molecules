import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");
const { messages } = await tsImport("../lib/i18n/messages.ts", import.meta.url);
const { createExploreCatalogView } = await tsImport(
  "../lib/application/explore-catalog.ts",
  import.meta.url,
);
const { moleculeCatalog } = await tsImport("../lib/data/catalog.ts", import.meta.url);

test("Home keeps the exact human TR/EN lead and collapses technical scope", async () => {
  const [source, stage] = await Promise.all([
    readSource("../components/platform/HomeLanding.tsx"),
    readSource("../components/platform/HomeMoleculeStage.tsx"),
  ]);

  assert.equal(
    messages.en["home.description"],
    "Search 1,552 resolved molecular structures, inspect them in 2D and 3D, and continue into chemistry and learning content where curated coverage exists.",
  );
  assert.equal(
    messages.tr["home.description"],
    "1.552 çözümlenmiş moleküler yapıyı ara, 2B ve 3B incele; derinleştirilmiş ilaç kayıtlarında kimya ve öğrenme içeriklerine ilerle.",
  );
  assert.equal(messages.en["home.catalogScopeTitle"], "Catalog scope and sources");
  assert.equal(messages.tr["home.catalogScopeTitle"], "Katalog kapsamı ve kaynaklar");
  assert.equal(messages.en["home.familiesLabel"], "Candidate records");
  assert.equal(messages.tr["home.familiesLabel"], "Aday kayıtlar");
  assert.match(source, /<details className=\{styles\.catalogScope\} data-catalog-scope="collapsed">/u);
  assert.doesNotMatch(source, /<details[^>]+\sopen(?:=|\s|>)/u);
  assert.match(source, /https:\/\/drugcentral\.org\/static\/FDA_Approved\.csv/u);
  assert.match(source, /https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\//u);
  assert.match(stage, /copyMode="student"/u);
  assert.equal(messages.en["viewer.readingSdf"], "Preparing the molecular view…");
  assert.equal(messages.tr["viewer.readingSdf"], "Moleküler görünüm hazırlanıyor…");
});

test("Dossier exposes coverage first and renders each empty science section once", async () => {
  const [dossier, chemistry, sources, pharmacology, adme, journey, app] = await Promise.all([
    readSource("../components/dossier/DrugDossier.tsx"),
    readSource("../components/dossier/ChemistryOverview.tsx"),
    readSource("../components/dossier/SourcesDrawer.tsx"),
    readSource("../components/pharmacology/PharmacologyPanel.tsx"),
    readSource("../components/adme/AdmePanel.tsx"),
    readSource("../components/adme/DrugJourney.tsx"),
    readSource("../components/platform/DevMoleculesApp.tsx"),
  ]);

  const availabilityIndex = dossier.indexOf('data-dossier-availability="upfront"');
  const storyIndex = dossier.indexOf('{mode === "story" ? (');
  assert.ok(availabilityIndex > 0 && availabilityIndex < storyIndex);
  assert.match(dossier, /data-tab-availability=\{tabAvailability\(tab\)\}/u);
  assert.match(dossier, /data-empty-coverage=\{available \? undefined : section\}/u);
  assert.match(dossier, /section="synthesis"/u);
  assert.match(dossier, /function SynthesisJourneyCta/u);
  assert.match(dossier, /getSynthesisAcademyHash\(moleculeSlug, "atlas"\)/u);
  assert.equal(dossier.match(/<SynthesisJourneyCta/gu)?.length, 3);
  assert.match(app, /onOpenSynthesis=\{\(moleculeId\) => \{[\s\S]+getSynthesisAcademyHash\(getMoleculeSlug\(moleculeId\), "atlas"\)/u);
  assert.match(app, /route\.academyArea === "synthesis" && route\.slug/u);
  assert.match(app, /route\.academyArea === "synthesis" && !route\.slug\) return "synthesis-atlas"/u);
  assert.match(chemistry, /Bu Dossier'a henüz aktarılmayan tanımlayıcılar/u);
  assert.match(chemistry, /Descriptors not yet normalized into this Dossier/u);
  assert.doesNotMatch(chemistry, /Descriptors awaiting a source|Kaynak bekleyen tanımlayıcılar/u);
  assert.match(chemistry, /"h-bond-donors": \{ tr: "Hidrojen bağı vericileri", en: "Hydrogen-bond donors" \}/u);
  assert.match(chemistry, /originLabel=\{threeD\.origin\}/u);
  assert.match(chemistry, /twoDOriginLabel=\{twoD\?\.origin\}/u);
  assert.doesNotMatch(chemistry, /originLabel=\{labels\./u);
  assert.match(sources, /\{source\.scope\}/u);
  assert.doesNotMatch(sources, /presentSourceScope\(source\.id, locale\)/u);
  assert.match(sources, /scope: "Desteklediği kapsam"/u);
  assert.match(sources, /scope: "Supported scope"/u);
  assert.match(dossier, /hasJourneyEvidence \? <DrugJourney/u);
  assert.match(dossier, /dossier\.metabolites\.edges\.length > 0 \? <MetaboliteGraph/u);
  assert.doesNotMatch(dossier, /function LearningLinks/u);

  assert.match(pharmacology, /profile\.targets\.length === 0/u);
  assert.match(pharmacology, /data-empty-coverage="pharmacology"/u);
  assert.match(adme, /const hasAnyMeasurements = profiles\.some\(profileHasMeasurements\)/u);
  assert.match(adme, /data-empty-coverage="adme"/u);
  const emptyAdmeBranch = adme.slice(
    adme.indexOf("if (!hasAnyMeasurements)"),
    adme.indexOf("data-adme-measurements=\"available\""),
  );
  assert.equal(emptyAdmeBranch.match(/labels\.routeNotMeasurement/gu)?.length, 1);
  assert.doesNotMatch(journey, /not an ADME measurement|ADME ölçümü değildir/iu);
  assert.match(adme, /filter\(\(\[, , fields\]\) => fields\.length > 0\)/u);
});

test("Student Spatial uses neutral candidate copy while Reviewer keeps raw evidence", async () => {
  const [source, sceneSource] = await Promise.all([
    readSource("../components/universe/MoleculeUniverse.tsx"),
    readSource("../components/molecular-scene/SharedMolecularScene.tsx"),
  ]);
  const english = createExploreCatalogView(moleculeCatalog, "en");
  const turkish = createExploreCatalogView(moleculeCatalog, "tr");

  assert.equal(messages.en["explore.clusterCount.one"], "{count} cluster");
  assert.equal(messages.en["explore.clusterCount.other"], "{count} clusters");
  assert.equal(messages.tr["explore.clusterCount.one"], "{count} küme");
  assert.equal(messages.tr["explore.clusterCount.other"], "{count} küme");
  assert.equal(messages.en["explore.candidateRecords"], "Candidate records");
  assert.equal(messages.tr["explore.candidateRecords"], "Aday kayıtlar");
  assert.ok(english.molecules.every((molecule) =>
    ["therapeutic", "target", "scaffold"].every((lensId) =>
      molecule.lensValues[lensId] === "Candidate records" &&
      molecule.lensKeys[lensId] === "candidate-records"
    ) &&
    molecule.lensValues["structural-similarity"] === "Representative structures" &&
    molecule.lensKeys["structural-similarity"] === "representative-structures"
  ));
  assert.ok(turkish.molecules.every((molecule) =>
    molecule.lensValues.target === "Aday kayıtlar" &&
    molecule.lensKeys.target === "candidate-records" &&
    molecule.lensValues["structural-similarity"] === "Temsilî yapılar" &&
    molecule.lensKeys["structural-similarity"] === "representative-structures"
  ));
  assert.ok(english.molecules.every((molecule) =>
    molecule.lensAliases.target.includes("classification-review-in-progress") &&
    molecule.lensAliases["structural-similarity"].includes(
      "computed-structural-view-unreviewed",
    )
  ));
  assert.match(source, /sceneSample: "Representative structures · \{count\}"/u);
  assert.match(source, /sceneSample: "Temsilî yapılar · \{count\}"/u);
  assert.match(source, /STUDENT_CANDIDATE_RECORDS_KEYS/u);
  assert.match(source, /STUDENT_REPRESENTATIVE_STRUCTURES_KEY/u);
  assert.match(source, /presentationMode === "reviewer"[\s\S]+reviewerLensValues/u);
  assert.match(source, /presentationMode === "reviewer" && \(activeLens\?\.algorithmVersion \|\| activeLens\?\.inputHash\)/u);
  assert.match(source, /presentationMode === "reviewer" && unprojectedSceneMolecules\.length > 0/u);
  assert.match(source, /presentationMode === "reviewer" && comparisonFingerprintScore !== null/u);
  assert.match(source, /presentationMode !== "reviewer" \|\| comparisonMolecules\.length < 2/u);
  assert.match(source, /item\.verificationStatus === "expert-reviewed"/u);
  assert.match(source, /item\.sourceIds\.length > 0/u);
  assert.match(source, /new Set\(evidence\.map\(\(item\) => item\?\.value\)/u);
  assert.match(source, /copyMode=\{presentationMode === "student" \? "student" : "default"\}/u);
  assert.match(sceneSource, /viewer\.studentCanvasFallback/u);
  assert.match(sceneSource, /viewer\.studentLoadingTitle/u);
  assert.match(sceneSource, /viewer\.studentErrorTitle/u);
  assert.match(source, /studentClassificationEntries/u);
  assert.match(source, /t\("explore\.candidateRecordsBoundary"\)/u);
  assert.match(source, /presentationMode === "reviewer" \? \([\s\S]*functionalMotifReviewerHints/u);
  assert.doesNotMatch(source, /similarMoleculesBoundary: "[^"]*(?:incelenmemiş|has not been reviewed)/iu);
});

test("Touched learner surfaces keep the typography floor explicit", async () => {
  const [homeCss, dossierCss, admeCss, pharmacologyCss, universeCss, atlasCss, viewerCss] = await Promise.all([
    readSource("../components/platform/HomeLanding.module.css"),
    readSource("../components/dossier/DrugDossier.module.css"),
    readSource("../components/adme/Adme.module.css"),
    readSource("../components/pharmacology/PharmacologyPanel.module.css"),
    readSource("../components/universe/MoleculeUniverse.module.css"),
    readSource("../components/atlas/DrugAtlas.module.css"),
    readSource("../components/molecule-viewer/MoleculeViewer.module.css"),
  ]);

  assert.match(homeCss, /\.page\s*\{[^}]*font-size:\s*1rem/su);
  assert.match(dossierCss, /Learner-facing typography contract/u);
  assert.match(dossierCss, /\.unavailableDossier\s*\{[^}]*font-size:\s*1rem/su);
  assert.match(dossierCss, /\.unavailableDossier > button\s*\{[^}]*font-size:\s*0\.875rem/su);
  assert.doesNotMatch(dossierCss, /font:\s*700\s+0\.72rem/u);
  assert.doesNotMatch(dossierCss, /font-size:\s*0\.79rem/u);
  assert.match(admeCss, /font-size:\s*1rem/u);
  assert.match(pharmacologyCss, /font-size:\s*1rem/u);
  assert.match(universeCss, /\.universe\[data-presentation-mode="student"\][\s\S]*font-size:\s*1rem/u);
  assert.match(universeCss, /font-size:\s*max\(0\.875rem, 1em\)/u);
  assert.match(atlasCss, /Public Atlas typography contract/u);
  assert.match(atlasCss, /\.atlas\s*\{[^}]*font-size:\s*1rem/su);
  assert.match(viewerCss, /Shared public-viewer typography contract/u);
  assert.match(viewerCss, /\.viewer\s*\{[^}]*font-size:\s*1rem/su);
  for (const css of [homeCss, dossierCss, admeCss, pharmacologyCss, universeCss, atlasCss, viewerCss]) {
    assert.match(css, /0\.875rem/u, "secondary or interactive copy must retain a 14px floor");
  }
});
