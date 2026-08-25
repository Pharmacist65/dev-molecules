import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  getDrugHash,
  getPrimaryNavigationSection,
  getSynthesisAcademyHash,
  parsePlatformHash,
} = await tsImport("../lib/application/platform-route.ts", import.meta.url);

test("new product hashes resolve to stable primary sections", () => {
  assert.deepEqual(parsePlatformHash("#home"), { section: "home" });
  assert.deepEqual(parsePlatformHash("#atlas"), {
    section: "atlas",
    atlasView: "browse",
  });
  assert.deepEqual(parsePlatformHash("#atlas/spatial"), {
    section: "atlas",
    atlasView: "spatial",
  });
  assert.deepEqual(parsePlatformHash("#drug/celecoxib"), {
    section: "drug",
    slug: "celecoxib",
  });
  assert.deepEqual(
    parsePlatformHash("#drug/beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n"),
    {
      section: "drug",
      slug: "beta-sitosterol-kzjwdpnrjallns-vjsfxxlfsa-n",
    },
  );
  assert.deepEqual(parsePlatformHash("#family/beta-blockers"), {
    section: "family",
    familyId: "beta-blockers",
  });
  assert.deepEqual(parsePlatformHash("#academy/pharmacology/targets-01"), {
    section: "academy",
    academyArea: "pharmacology",
    lessonId: "targets-01",
  });
  assert.deepEqual(parsePlatformHash("#academy/module/adme"), {
    section: "academy",
    academyArea: "module",
    lessonId: "adme",
  });
  assert.deepEqual(parsePlatformHash("#academy/synthesis/celecoxib/reported-route"), {
    section: "academy",
    academyArea: "synthesis",
    slug: "celecoxib",
    routeId: "reported-route",
  });
});

test("retired top-level modes redirect deterministically without erasing spatial deep links", () => {
  assert.equal(parsePlatformHash("#explore").canonicalHash, "#atlas/spatial");
  assert.equal(parsePlatformHash("#learn").canonicalHash, "#academy");
  assert.equal(parsePlatformHash("#build").canonicalHash, "#lab");
  assert.equal(parsePlatformHash("#teach").canonicalHash, "#instructor");
  assert.deepEqual(parsePlatformHash("#discover"), {
    section: "lab",
    canonicalHash: "#lab",
  });

  for (const hash of [
    "#universe",
    "#molecule/propranolol",
    "#cluster/therapeutic/Cardiovascular",
    "#compare/propranolol,atenolol",
  ]) {
    const route = parsePlatformHash(hash);
    assert.equal(route.section, "atlas");
    assert.equal(route.atlasView, "spatial");
    assert.equal(route.legacySpatialHash, true);
    assert.equal(route.canonicalHash, undefined);
  }
});

test("malformed entity routes fail closed to a known page", () => {
  assert.equal(parsePlatformHash("#drug/%E0%A4%A").canonicalHash, "#atlas");
  assert.equal(parsePlatformHash("#family/").canonicalHash, "#atlas");
  assert.equal(parsePlatformHash("#unknown").canonicalHash, "#home");
  assert.equal(getDrugHash(""), "#atlas");
  assert.equal(getDrugHash("celecoxib"), "#drug/celecoxib");
  assert.equal(getSynthesisAcademyHash(""), "#academy");
  assert.equal(
    getSynthesisAcademyHash("carvedilol", "atlas"),
    "#academy/synthesis/carvedilol/atlas",
  );
  assert.equal(
    getPrimaryNavigationSection(parsePlatformHash("#drug/celecoxib")),
    "atlas",
  );
});

test("Home keeps Atlas, Dossier, Academy, Lab, and Three.js behind lazy route boundaries", async () => {
  const [appSource, homeSource] = await Promise.all([
    readFile(new URL("../components/platform/DevMoleculesApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/platform/HomeLanding.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(appSource, /import\s+\{[^}]*MoleculeUniverse[^}]*\}\s+from/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*\n?\s*import\("@\/components\/atlas"\)/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*\n?\s*import\("@\/components\/dossier"\)/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*\n?\s*import\("@\/components\/academy"\)/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*\n?\s*import\("@\/components\/synthesis"\)/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*\n?\s*import\("@\/components\/lab"\)/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*\n?\s*import\("@\/components\/instructor"\)/);
  assert.match(appSource, /lazy\(\(\)\s*=>\s*\n?\s*import\("@\/components\/reviewer"\)/);
  assert.match(appSource, /<ReviewerConsole[\s\S]*adapter=\{null\}/);
  assert.match(homeSource, /lazy\(\(\)\s*=>\s*import\("\.\/HomeMoleculeStage"\)\)/);
});
