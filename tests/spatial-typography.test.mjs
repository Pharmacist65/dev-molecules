import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../components/universe/MoleculeUniverse.module.css", import.meta.url),
  "utf8",
);

const contractMarker = "Spatial Atlas critical readability contract";
const contract = css.slice(css.indexOf(contractMarker));

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blockFor(selector) {
  const match = contract.match(
    new RegExp(`(?:^|\\n)[^{}]*${escapeRegExp(selector)}[^{}]*\\{([^}]*)\\}`, "m"),
  );
  assert.ok(match, `missing Spatial Atlas typography rule for ${selector}`);
  return match[1];
}

function remFontSize(selector) {
  const block = blockFor(selector);
  const match = block.match(/font-size:\s*([0-9.]+)rem/);
  assert.ok(match, `missing rem font-size for ${selector}`);
  return Number(match[1]);
}

test("critical Spatial Atlas learner controls keep a 13px minimum type size", () => {
  assert.notEqual(css.indexOf(contractMarker), -1);

  for (const selector of [
    ".searchField label",
    ".searchControl input",
    ".lensDisclosureButton span",
    ".lensDisclosureButton strong",
    ".lensButton",
    ".lensMeaning",
    ".breadcrumb",
    ".clusterGlyph strong",
    ".nearClusterRegions strong",
    ".universeCamera button",
    ".universeCamera output",
  ]) {
    assert.ok(
      remFontSize(selector) >= 0.8125,
      `${selector} must remain at least 0.8125rem (13px at the default root)`,
    );
  }
});

test("Spatial Atlas learner-facing prose keeps the 15px body-text floor", () => {
  for (const selector of [
    ".description",
    ".lensDescription",
    ".lensMeaning",
    ".lensCaveat",
    ".studentHint",
    ".lodStatus",
    ".stageStatus",
    ".footer",
    ".indexedResults > p",
  ]) {
    assert.ok(
      remFontSize(selector) >= 0.9375,
      `${selector} must remain at least 0.9375rem (15px at the default root)`,
    );
  }

  assert.match(contract, /\.lensDescription\s*\{[^}]*white-space:\s*normal/s);
});

test("mobile Spatial Atlas stacks status above its enlarged camera controls", () => {
  const mobileContract = contract.slice(contract.lastIndexOf("@media (max-width: 720px)"));

  assert.match(mobileContract, /\.lodStatus\s*\{[^}]*bottom:\s*4\.65rem/s);
  assert.match(mobileContract, /\.universeCamera\s*\{[^}]*left:\s*0\.75rem/s);
  assert.match(mobileContract, /\.universeCamera\s*\{[^}]*overflow-x:\s*auto/s);
});
