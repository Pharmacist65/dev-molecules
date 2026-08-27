import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const outputRoot = new URL("../dist-pages/", import.meta.url);
const {
  findPublicSynthesisBoundaryViolations,
  hasCatalogBoundSynthesisFixture,
  scanPublicSynthesisBoundary,
} = await import("../scripts/check-public-synthesis-boundary.mjs");

test("catalog-bound patent fixtures are rejected without molecule-specific canaries", () => {
  const catalogRecords = [{
    id: "molecule:catalog-compound-alpha",
    preferredName: "Catalog Compound Alpha",
    aliases: ["Catalog Alpha"],
    inchiKey: "GGGGGGGGGGGGGG-HHHHHHHHHH-N",
    pubChemCid: 987_654_321,
  }];
  assert.equal(
    hasCatalogBoundSynthesisFixture(
      `const record = { subjectLabel: "Catalog Compound Alpha", source: "PAT", locator: "fixture section" };`,
      catalogRecords,
    ),
    true,
  );
  assert.equal(
    hasCatalogBoundSynthesisFixture(
      `const record = { subjectLabel: "Synthetic Compound Alpha", source: "PAT", locator: "fixture section" };`,
      catalogRecords,
    ),
    false,
  );
  assert.equal(
    hasCatalogBoundSynthesisFixture(
      `const record = { subjectLabel: "Catalog Compound Alpha", source: "curated catalog" };`,
      catalogRecords,
    ),
    false,
  );
});

test("release artifacts are rejected for positive route claims and forced pending flags", () => {
  const humanClaim = ["Reported synthesis", "evidence was identified"].join(" ");
  const forcedPendingFlag = [
    "data-reported-route-found-",
    'pending-review="true"',
  ].join("");

  const distViolations = findPublicSynthesisBoundaryViolations(
    "dist-pages/_next/static/chunks/app.js",
    `${humanClaim}\n${forcedPendingFlag}`,
  );
  assert.deepEqual(
    distViolations.map(({ label }) => label).sort(),
    [
      "forced pending-reported-route presentation flag",
      "unqualified human-facing synthesis-route availability claim",
    ],
  );

  const publicViolations = findPublicSynthesisBoundaryViolations(
    "public/locales/en.json",
    humanClaim,
  );
  assert.deepEqual(publicViolations.map(({ label }) => label), [
    "unqualified human-facing synthesis-route availability claim",
  ]);
});

test("built public artifacts contain no pending synthesis-detail canaries", async (context) => {
  try {
    await access(outputRoot);
  } catch {
    context.skip("dist-pages is absent; the release-artifact job runs the mandatory scanner after build:pages");
    return;
  }
  const result = await scanPublicSynthesisBoundary({ requireDist: true });
  assert.ok(result.artifactCount > 0);
  assert.deepEqual(result.roots, ["public", "dist-pages"]);
});
