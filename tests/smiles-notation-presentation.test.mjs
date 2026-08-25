import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("SMILES presentation preserves raw notation while explaining local stereo markers", async () => {
  const [panel, css] = await Promise.all([
    readSource("../components/chemistry/SmilesNotationPanel.tsx"),
    readSource("../components/chemistry/SmilesNotationPanel.module.css"),
  ]);

  assert.match(panel, /navigator\.clipboard\.writeText\(value\)/u);
  assert.match(panel, /Values are deliberately copied and rendered without trimming or normalizing/u);
  assert.match(panel, /yerel komşu sırasına göre stereokimyasal yönelimi kodlar; doğrudan R veya S anlamına gelmez/u);
  assert.match(panel, /local neighbour order in that traversal; they do not directly mean R or S/u);
  assert.match(panel, /<code className=\{styles\.marker\}>@<\/code>/u);
  assert.match(panel, /<code className=\{styles\.marker\}>@@<\/code>/u);
  assert.match(panel, /mode === "student" \? \([\s\S]+<details className=\{styles\.rawDetails\}>/u);
  assert.match(panel, /<details className=\{styles\.rawDetails\}>[\s\S]+\{rawFields\}[\s\S]+\{copyStatus\}[\s\S]+<\/details>/u);
  assert.match(panel, /mode === "reference" \? \([\s\S]+\{rawFields\}[\s\S]+\{copyStatus\}/u);
  assert.match(panel, /data-field-status="missing"/u);
  assert.match(panel, /The connectivity \/ canonical SMILES is not substituted for it/u);
  assert.doesNotMatch(panel, /isomericSmiles\s*\?\?\s*canonicalSmiles/u);

  assert.match(css, /\.panel \.marker\s*\{[\s\S]+display: inline/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+width: 100%/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+overflow-x: auto/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+white-space: pre/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+word-break: normal/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+direction: ltr/u);
  assert.match(css, /\.panel \.rawCode\s*\{[\s\S]+unicode-bidi: isolate/u);
  assert.match(panel, /tabIndex=\{0\}/u);
  assert.match(panel, /aria-labelledby=\{labelId\}/u);
  assert.match(css, /\.panel \.rawCode:focus-visible/u);
  assert.doesNotMatch(css, /\.orientation small\s*\{[\s\S]*?color: var\(--color-text-faint-on-ivory\)/u);
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
