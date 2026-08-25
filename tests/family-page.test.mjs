import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  buildFamilyComparisonRows,
  buildFamilyFingerprintComparison,
  getFamilyCoverageGaps,
  validateDrugFamilyPageModel,
} = await tsImport("../lib/application/family-page.ts", import.meta.url);

const text = (tr, en) => ({ tr, en });
const source = {
  id: "source:fixture",
  label: "Curated fixture source",
  href: "https://example.org/source",
  verification: "source-supported",
};
const available = (value) => ({
  availability: "available",
  value,
  sources: [source],
});
const missing = (tr = "Kürate edilmedi", en = "Not curated") => ({
  availability: "missing",
  reason: text(tr, en),
});

const family = {
  id: "family:fixture",
  slug: "fixture-family",
  name: text("Örnek aile", "Fixture family"),
  kinds: ["therapeutic", "pharmacological"],
  overview: available(text("Kaynaklı özet", "Source-backed overview")),
  classifications: [
    {
      system: "therapeutic-atc",
      paths: [
        [
          { code: "C", label: text("Kardiyovasküler sistem", "Cardiovascular system") },
          { code: "C07", label: text("Beta blokerler", "Beta blockers") },
        ],
        [
          { code: "S", label: text("Duyu organları", "Sensory organs") },
          { code: "S01E", label: text("Glokom preparatları", "Antiglaucoma preparations") },
        ],
      ],
      sources: [source],
    },
    {
      system: "pharmacological-mechanism",
      paths: [[{ label: text("Reseptör antagonistleri", "Receptor antagonists") }]],
      sources: [source],
    },
    {
      system: "chemical-scaffold",
      paths: [[{ label: text("Ariloksipropanolaminler", "Aryloxypropanolamines") }]],
      sources: [source],
    },
  ],
  sharedMechanism: available([text("Kaynaklı ortak mekanizma", "Source-backed shared mechanism")]),
  primaryTargetFamilies: missing(),
  sharedStructuralMotifs: available([text("Ortak motif", "Shared motif")]),
  representatives: [
    {
      id: "drug:a",
      slug: "drug-a",
      name: "Drug A",
      formula: "C10H15NO",
      pubChemCid: 1,
      canonicalSmiles: "CC(C)NCC(O)COc1ccccc1",
      memberships: [
        { system: "therapeutic-atc", labels: [text("C07", "C07"), text("S01E", "S01E")] },
      ],
      comparison: {
        "primary-targets": available(text("Target A", "Target A")),
        "main-metabolic-pathway": available(text("Pathway A", "Pathway A")),
        "active-metabolites": missing(),
      },
    },
    {
      id: "drug:b",
      slug: "drug-b",
      name: "Drug B",
      formula: "C11H17NO2",
      pubChemCid: 2,
      canonicalSmiles: "CC(C)NCC(O)COc1ccc(C)cc1",
      memberships: [
        { system: "therapeutic-atc", labels: [text("C07", "C07")] },
        { system: "chemical-scaffold", labels: [text("Ortak iskelet", "Shared scaffold")] },
      ],
      comparison: {
        "primary-targets": available(text("Target B", "Target B")),
        "main-metabolic-pathway": available(text("Pathway B", "Pathway B")),
        "half-life-range": missing(),
      },
    },
  ],
  learningPath: [
    { id: "lesson:1", label: text("Yapıyı karşılaştır", "Compare structures"), href: "#academy/lesson-1" },
  ],
};

test("family model retains parallel and multiple classification paths", () => {
  assert.deepEqual(validateDrugFamilyPageModel(family), []);
  assert.equal(family.classifications.length, 3);
  assert.equal(family.classifications[0].paths.length, 2);
  assert.equal(family.representatives[0].memberships[0].labels.length, 2);
});

test("comparison table includes only fields sourced for at least two drugs", () => {
  const rows = buildFamilyComparisonRows(family.representatives);
  assert.deepEqual(rows.map((row) => row.field), [
    "primary-targets",
    "main-metabolic-pathway",
  ]);

  const gaps = getFamilyCoverageGaps(family.representatives);
  assert.ok(gaps[0].missingFields.includes("active-metabolites"));
  assert.ok(gaps[1].missingFields.includes("half-life-range"));
  assert.ok(gaps.every((gap) => gap.missingFields.includes("lipophilicity")));
});

test("fingerprint comparison is symmetric, deterministic, and explicitly bounded", () => {
  const comparison = buildFamilyFingerprintComparison(family.representatives);
  assert.ok(comparison);
  assert.equal(comparison.reviewStatus, "computed-unreviewed");
  assert.equal(comparison.similarities["drug:a"]["drug:a"], 1);
  assert.equal(
    comparison.similarities["drug:a"]["drug:b"],
    comparison.similarities["drug:b"]["drug:a"],
  );
  assert.match(comparison.limitation, /does not establish pharmacological, biological, or clinical similarity/i);
});

test("available family claims fail closed without provenance", () => {
  const invalid = {
    ...family,
    overview: { availability: "available", value: text("Özet", "Overview"), sources: [] },
  };
  const issues = validateDrugFamilyPageModel(invalid);
  assert.ok(issues.some((issue) => issue.path === "family.overview.sources"));
});

test("an empty kind list is valid only for a fully fail-closed candidate review set", () => {
  const candidateReviewSet = {
    ...family,
    kinds: [],
    overview: missing(),
    classifications: [],
    sharedMechanism: missing(),
    primaryTargetFamilies: missing(),
    sharedStructuralMotifs: missing(),
    representatives: family.representatives.map((drug) => ({
      ...drug,
      memberships: [],
    })),
  };
  assert.deepEqual(validateDrugFamilyPageModel(candidateReviewSet), []);

  const membershipClaimWithoutKind = {
    ...candidateReviewSet,
    representatives: [
      {
        ...candidateReviewSet.representatives[0],
        memberships: family.representatives[0].memberships,
      },
      candidateReviewSet.representatives[1],
    ],
  };
  assert.ok(
    validateDrugFamilyPageModel(membershipClaimWithoutKind).some(
      (issue) => issue.path === "family.kinds",
    ),
  );
});

test("Family Page exposes hierarchy, explicit gaps, source details, and lazy 3D", async () => {
  const [component, css] = await Promise.all([
    readFile(new URL("../components/atlas/FamilyPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas/FamilyPage.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /lazy\(\(\) => import\("\.\/AtlasSpatialView"\)\)/);
  assert.match(component, /family\.classifications\.map/);
  assert.match(component, /track\.paths\.map/);
  assert.match(component, /data-availability="missing"/);
  assert.match(component, /buildFamilyFingerprintComparison/);
  assert.match(component, /<details className=\{styles\.sources\}>/);
  assert.doesNotMatch(component, /<small>\{source\.verification\}<\/small>/);
  assert.match(component, /verificationLabels\[source\.verification\]\[locale\]/);
  assert.match(component, /aria-expanded=\{showSpatial\}/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /--family-ink:\s*var\(--color-text-on-ivory/u);
  assert.match(css, /--family-muted:\s*var\(--color-text-muted-on-ivory/u);
  assert.match(css, /background-color:\s*var\(--family-surface\)/u);
  assert.match(css, /background-image:\s*var\(--surface-reading/u);
});
