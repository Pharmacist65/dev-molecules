import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(path, import.meta.url), "utf8");

test("Ketcher fits both the initial and subsequently imported structures", async () => {
  const [source, fitSource, css] = await Promise.all([
    readSource("../components/lab/KetcherEditorSurface.tsx"),
    readSource("../components/lab/ketcher-fit.ts"),
    readSource("../components/lab/LabHub.module.css"),
  ]);

  assert.match(
    source,
    /setMolecule\(initialStructure,\s*\{\s*needZoom:\s*true\s*\}\)/u,
  );
  assert.match(
    source,
    /setMolecule\(structure,\s*\{\s*needZoom:\s*true\s*\}\)/u,
  );
  assert.match(source, /fitAfterLayout\(ketcher\)/u);
  assert.match(fitSource, /ketcher\.editor\.zoomAccordingContent\(structure\)/u);
  assert.match(fitSource, /ketcher\.editor\.centerStruct\(\)/u);
  assert.match(css, /\.ketcherFrame\s*\{\s*height:\s*clamp\(/u);
  assert.match(css, /\.ketcherFrame\s*>\s*div\s*\{\s*height:\s*100%/u);
});

test("the hero search uses its concise translated label as the real placeholder", async () => {
  const source = await readSource("../components/platform/CatalogSearch.tsx");

  assert.match(source, /const searchLabel = t\("search\.label"\)/u);
  assert.match(
    source,
    /variant === "hero" \? searchLabel : t\("search\.placeholder"\)/u,
  );
  assert.doesNotMatch(source, /matchMedia|innerWidth|useMediaQuery/u);
});

test("Ketcher runtime errors remain localized at the public UI boundary", async () => {
  const [surface, workspace] = await Promise.all([
    readFile(
      new URL("../components/lab/KetcherEditorSurface.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/lab/KetcherWorkspace.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(surface, /localizedEditorError\(locale\)/);
  assert.match(surface, /errorHandler=\{\(\) => onError\?\.\(localizedEditorError\(locale\)\)\}/);
  assert.doesNotMatch(surface, /error instanceof Error\s*\? error\.message/);
  assert.match(workspace, /catch \{\s*setError\(t\.error\)/s);
  assert.doesNotMatch(workspace, /reason instanceof Error \? reason\.message/);
});

test("learner-facing Academy and Synthesis type respects the readable floor", async () => {
  const [academyCss, synthesisCss] = await Promise.all([
    readSource("../components/platform/NomenclatureAcademy.module.css"),
    readSource("../components/platform/SynthesisAtlas.module.css"),
  ]);

  assert.match(academyCss, /--academy-body-size:\s*1rem/u);
  assert.match(academyCss, /--academy-secondary-size:\s*0\.875rem/u);
  assert.match(academyCss, /--academy-ui-label-size:\s*0\.8125rem/u);
  assert.match(synthesisCss, /--atlas-body-size:\s*1rem/u);
  assert.match(synthesisCss, /--atlas-secondary-size:\s*0\.875rem/u);
  assert.match(synthesisCss, /--atlas-ui-label-size:\s*0\.8125rem/u);

  // Atom, charge, and placement glyphs are part of the chemical diagrams,
  // rather than prose or controls. Their fixed SVG sizing is intentional.
  assert.match(academyCss, /\.atomCharge\s*\{[^}]*font-size:\s*11px/isu);
  assert.match(academyCss, /\.sequenceBadge text\s*\{[^}]*font-size:\s*9px/isu);
  assert.match(academyCss, /\.placementBadge text\s*\{[^}]*font-size:\s*9px/isu);

  const learnerCss = academyCss
    .replace(/\.atomNode > text\s*\{[^}]*\}/gsu, "")
    .replace(/\.atomCharge\s*\{[^}]*\}/gsu, "")
    .replace(/\.sequenceBadge text\s*\{[^}]*\}/gsu, "")
    .replace(/\.placementBadge text\s*\{[^}]*\}/gsu, "");

  for (const [name, css] of [
    ["Nomenclature Academy", learnerCss],
    ["Synthesis Atlas", synthesisCss],
  ]) {
    const declarations = [
      ...css.matchAll(/(?:^|[;{])\s*font(?:-size)?\s*:\s*([^;}]+)/gmu),
    ].map((match) => match[1]);

    for (const declaration of declarations) {
      for (const size of declaration.matchAll(/([0-9]*\.?[0-9]+)rem\b/gu)) {
        assert.ok(
          Number(size[1]) >= 0.8125,
          `${name} contains learner-facing type below 13px: ${declaration.trim()}`,
        );
      }
      for (const size of declaration.matchAll(/([0-9]*\.?[0-9]+)px\b/gu)) {
        assert.ok(
          Number(size[1]) >= 13,
          `${name} contains learner-facing type below 13px: ${declaration.trim()}`,
        );
      }
    }
  }
});
