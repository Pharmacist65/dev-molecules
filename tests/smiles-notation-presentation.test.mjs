import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const {
  createSmilesNotationPresentation,
  DAYLIGHT_SMILES_ISOMERISM_URL,
  OPENSMILES_SPECIFICATION_URL,
} = await tsImport("../lib/application/smiles-notation-presentation.ts", import.meta.url);

test("SMILES presentation distinguishes atom stereo, directional bonds, and missing source fields", () => {
  const atomStereo = createSmilesNotationPresentation({
    canonicalSmiles: "CC(O)F",
    isomericSmiles: "C[C@H](O)F",
    locale: "tr",
  });
  assert.equal(atomStereo.hasIsomericSmiles, true);
  assert.equal(atomStereo.hasAtomStereo, true);
  assert.equal(atomStereo.atomStereoMode, "tetrahedral-shorthand");
  assert.equal(atomStereo.hasDirectionalBondMarkers, false);
  assert.equal(atomStereo.copy.guideTitle, "SMILES nedir?");
  assert.match(atomStereo.copy.stereoQuestion, /yerel yönelim ve mutlak konfigürasyon/u);
  assert.match(atomStereo.copy.stereoAnswer, /doğrudan R veya S anlamına gelmez/u);
  assert.match(atomStereo.copy.stereoAnswer, /@TH1 ve @TH2/u);
  assert.match(atomStereo.copy.absoluteConfiguration, /Cahn–Ingold–Prelog \(CIP\)/u);

  const doubleBondStereo = createSmilesNotationPresentation({
    canonicalSmiles: "FC=CF",
    isomericSmiles: "F/C=C/F",
    locale: "en",
  });
  assert.equal(doubleBondStereo.hasIsomericSmiles, true);
  assert.equal(doubleBondStereo.hasAtomStereo, false);
  assert.equal(doubleBondStereo.hasDirectionalBondMarkers, true);
  assert.match(doubleBondStereo.copy.bondStereo, /directional-bond markers/u);
  assert.match(doubleBondStereo.copy.bondStereo, /neither marker alone is a direct E or Z label/u);

  const explicitChiralClass = createSmilesNotationPresentation({
    canonicalSmiles: "F[Po](Cl)(Br)I",
    isomericSmiles: "F[Po@SP1](Cl)(Br)I",
    locale: "en",
  });
  assert.equal(explicitChiralClass.hasAtomStereo, true);
  assert.equal(explicitChiralClass.atomStereoMode, "explicit-class");
  assert.match(explicitChiralClass.copy.explicitStereoAnswer, /class-specific neighbour order/u);
  assert.match(explicitChiralClass.copy.explicitStereoAnswer, /does not apply to those centres/u);

  const mixedStereoClasses = createSmilesNotationPresentation({
    canonicalSmiles: "CC(O)F.F[Po](Cl)(Br)I",
    isomericSmiles: "C[C@H](O)F.F[Po@SP1](Cl)(Br)I",
    locale: "en",
  });
  assert.equal(mixedStereoClasses.atomStereoMode, "mixed");
  assert.match(mixedStereoClasses.copy.mixedStereoAnswer, /both tetrahedral/u);

  const alleneLike = createSmilesNotationPresentation({
    canonicalSmiles: "OC(Cl)=[C@]=C(C)F",
    isomericSmiles: null,
    locale: "en",
  });
  assert.equal(alleneLike.hasIsomericSmiles, false);
  assert.equal(alleneLike.hasAtomStereo, true);
  assert.equal(alleneLike.atomStereoMode, "tetrahedral-shorthand");
  assert.match(alleneLike.copy.stereoAnswer, /neither directly means R or S/u);

  const combined = createSmilesNotationPresentation({
    canonicalSmiles: "CC=CC(O)F",
    isomericSmiles: "C/C=C/[C@H](O)F",
    locale: "tr",
  });
  assert.equal(combined.hasAtomStereo, true);
  assert.equal(combined.hasDirectionalBondMarkers, true);
  assert.match(combined.copy.statusAtomAndBond, /atom stereokimyası ve yönlü bağ/u);

  const missing = createSmilesNotationPresentation({
    canonicalSmiles: "CCO",
    isomericSmiles: null,
    locale: "tr",
  });
  assert.equal(missing.hasIsomericSmiles, false);
  assert.equal(missing.atomStereoMode, null);
  assert.match(missing.copy.missing, /tek başına molekülün akiral olduğunu/u);
  assert.equal(OPENSMILES_SPECIFICATION_URL, "https://opensmiles.org/opensmiles.html");
  assert.match(DAYLIGHT_SMILES_ISOMERISM_URL, /daylight\.com/u);
});

test("SMILES UI preserves exact notation while teaching the notation before exposing strings", async () => {
  const [panel, presentation, css] = await Promise.all([
    readSource("../components/chemistry/SmilesNotationPanel.tsx"),
    readSource("../lib/application/smiles-notation-presentation.ts"),
    readSource("../components/chemistry/SmilesNotationPanel.module.css"),
  ]);

  assert.match(panel, /navigator\.clipboard\.writeText\(value\)/u);
  assert.match(panel, /Values are deliberately copied and rendered without trimming or normalizing/u);
  assert.match(panel, /createSmilesNotationPresentation\(\{[\s\S]*canonicalSmiles,[\s\S]*isomericSmiles,[\s\S]*locale,[\s\S]*\}\)/u);
  assert.match(panel, /presentation\.atomStereoMode/u);
  assert.match(panel, /labels\.mixedStereoTitle/u);
  assert.match(panel, /labels\.stereoAnswer[\s\S]*labels\.explicitStereoAnswer/u);
  assert.doesNotMatch(panel, /const copyByLocale/u);
  assert.match(presentation, /Simplified Molecular Input Line Entry System/u);
  assert.match(presentation, /SMILES stereokimyası: yerel yönelim ve mutlak konfigürasyon/u);
  assert.match(presentation, /SMILES stereochemistry: local orientation and absolute configuration/u);
  assert.match(presentation, /N\[C@\]\(Br\)\(O\)C/u);
  assert.match(presentation, /C\[C@@\]\(Br\)\(O\)N/u);
  assert.doesNotMatch(presentation, /kaynakta kanonik|canonical at source/iu);
  assert.doesNotMatch(presentation, /Ham kaynak|raw source|aynen kopyala|copy exactly|not substituted/iu);
  assert.match(panel, /<code className=\{styles\.marker\}>@<\/code>/u);
  assert.match(panel, /<code className=\{styles\.marker\}>@@<\/code>/u);
  assert.match(panel, /<h3 id=\{guideTitleId\}>\{labels\.guideTitle\}<\/h3>/u);
  assert.match(panel, /presentation\.hasAtomStereo/u);
  assert.match(panel, /presentation\.hasDirectionalBondMarkers/u);
  assert.match(panel, /<code className=\{styles\.marker\}>\{"\\\\"\}<\/code>/u);
  assert.match(panel, /mode === "student" \? \([\s\S]+<details className=\{styles\.rawDetails\}>/u);
  assert.match(panel, /<details className=\{styles\.rawDetails\}>[\s\S]+\{rawFields\}[\s\S]+\{copyStatus\}[\s\S]+<\/details>/u);
  assert.match(panel, /mode === "reference" \? \([\s\S]+\{rawFields\}[\s\S]+\{copyStatus\}/u);
  assert.match(panel, /data-field-status="missing"/u);
  assert.doesNotMatch(panel, /isomericSmiles\s*\?\?\s*canonicalSmiles/u);
  assert.doesNotMatch(panel, /\.trim\(\)|\.normalize\(|\.replace\(/u);

  assert.match(css, /\.panel \.marker\s*\{[\s\S]+display: inline/u);
  assert.match(css, /\.notationTypes\s*\{[\s\S]+grid-template-columns: repeat\(2/u);
  assert.match(css, /\.markerLegend\s*\{[\s\S]+grid-template-columns: repeat\(2/u);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]+\.notationTypes,[\s\S]+grid-template-columns: 1fr/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+width: 100%/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+overflow-x: auto/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+white-space: pre/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+word-break: normal/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+direction: ltr/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+unicode-bidi: isolate/u);
  assert.match(panel, /tabIndex=\{0\}/u);
  assert.match(panel, /aria-labelledby=\{labelId\}/u);
  assert.match(css, /\.panel \.rawCode:focus-visible/u);
  assert.doesNotMatch(css, /\.guideHeader p\s*\{[\s\S]*?color: var\(--color-text-faint-on-ivory\)/u);
  assert.doesNotMatch(css, /\.copyStatus\s*\{[\s\S]*?color: var\(--color-text-faint-on-ivory\)/u);
});

test("Basic Record and Dossier keep Student, Story, and Reference SMILES density distinct", async () => {
  const [basicRecord, chemistryOverview, dossier] = await Promise.all([
    readSource("../components/basic-record/BasicMolecularRecord.tsx"),
    readSource("../components/dossier/ChemistryOverview.tsx"),
    readSource("../components/dossier/DrugDossier.tsx"),
  ]);

  assert.match(basicRecord, /data-basic-record-smiles="student"/u);
  assert.match(basicRecord, /isomericSmiles=\{record\.identity\.isomericSmiles\}/u);
  assert.match(basicRecord, /mode="student"/u);
  assert.doesNotMatch(basicRecord, /record\.identity\.isomericSmiles\s*\|\|\s*record\.identity\.canonicalSmiles/u);

  assert.match(chemistryOverview, /canonicalSmiles=\{dossier\.chemistry\.canonicalSmiles\.value\}/u);
  assert.match(chemistryOverview, /isomericSmiles=\{dossier\.chemistry\.isomericSmiles\?\.value \?\? null\}/u);
  assert.match(chemistryOverview, /smilesMode = compact \? "story" : "student"/u);
  assert.match(chemistryOverview, /mode=\{smilesMode\}/u);

  assert.match(dossier, /smilesMode="student"/u);
  assert.match(dossier, /compact smilesMode="story"/u);
  assert.match(dossier, /smilesMode="reference"/u);
});
