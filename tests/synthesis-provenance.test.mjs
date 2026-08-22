import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { synthesisStories } = await tsImport(
  "../lib/data/synthesis-stories.ts",
  import.meta.url,
);
const { synthesisSourceRegistry } = await tsImport(
  "../lib/data/synthesis-sources.ts",
  import.meta.url,
);
const { sourceById } = await tsImport(
  "../lib/data/sources.ts",
  import.meta.url,
);
const { canPresentAsSourceReported } = await tsImport(
  "../lib/domain/synthesis.ts",
  import.meta.url,
);
const { validateSynthesisStory } = await tsImport(
  "../lib/domain/validators.ts",
  import.meta.url,
);

const synthesisSourcesById = new Map(
  synthesisSourceRegistry.map((source) => [source.id, source]),
);

test("three seed synthesis stories resolve to distinct direct primary patent documents", () => {
  assert.equal(synthesisStories.length, 3);
  assert.equal(synthesisSourceRegistry.length, 3);
  assert.equal(new Set(synthesisSourceRegistry.map((source) => source.id)).size, 3);

  for (const source of synthesisSourceRegistry) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "image-ppubs.uspto.gov");
    assert.match(
      url.pathname,
      /^\/dirsearch-public\/print\/downloadPdf\/\d+$/,
    );
    assert.equal(url.search, "", "primary sources must not be search-result URLs");
    assert.equal(source.kind, "patent");
    assert.equal(source.verification.status, "source-supported");
    assert.match(source.externalId, /^US \d[\d,]+ A$/);
  }

  for (const story of synthesisStories) {
    assert.match(story.version, /^\d+\.\d+\.\d+$/);
    assert.equal(story.routeType, "patent-reported");
    assert.equal(story.primarySourceAnchors.length, 1);
    const anchor = story.primarySourceAnchors[0];
    const source = synthesisSourcesById.get(anchor.sourceId);
    assert.ok(source, `${story.id} source must resolve`);
    assert.equal(anchor.url, source.url);
    assert.equal(anchor.locatorKind, "patent-example");
    assert.match(anchor.locator, /Example \d+/);
    assert.ok(anchor.supportScope.length > 40);
    assert.ok(story.sourceIds.includes(anchor.sourceId));
    assert.equal(canPresentAsSourceReported(story), true);
  }
});

test("route records expose material roles, bond changes, mapping scope and limitations", () => {
  for (const story of synthesisStories) {
    const materialIds = new Set([
      ...story.startingMaterials.map((material) => material.id),
      ...story.intermediates.map((material) => material.id),
      story.finalProduct.id,
    ]);
    assert.ok(story.startingMaterials.length >= 2, story.id);
    assert.ok(
      story.startingMaterials.every((material) => material.role === "starting-material"),
      story.id,
    );
    assert.ok(
      story.intermediates.every((material) => material.role === "intermediate"),
      story.id,
    );
    assert.equal(story.finalProduct.role, "final-product");
    assert.equal(story.finalProduct.structure.format, "smiles");
    assert.ok(story.reactionClasses.length >= 2);
    assert.equal(story.stereochemistry.sourcePresentation, "not-assigned");
    assert.ok(story.stereochemistry.teachingScope.length > 40);
    assert.ok(story.limitations.length >= 3);
    assert.equal(story.review.status, "source-audited-pending-expert-review");
    assert.equal(story.verification.status, "source-supported");

    const transformingSteps = story.steps.filter((step) => step.bondChanges.length > 0);
    assert.ok(transformingSteps.length >= 1, `${story.id} needs a real bond-change step`);

    for (const step of story.steps) {
      assert.ok(step.inputMaterialIds.length > 0, `${step.id} needs visual inputs`);
      assert.equal(
        new Set(step.inputMaterialIds).size,
        step.inputMaterialIds.length,
        `${step.id} has duplicate visual inputs`,
      );
      for (const materialId of step.inputMaterialIds) {
        assert.ok(materialIds.has(materialId), `${step.id} references unknown ${materialId}`);
      }
      if (step.bondChanges.length === 0) {
        assert.equal(
          step.outputMaterialId,
          null,
          `${step.id} must not invent an output for an orientation frame`,
        );
      } else {
        assert.ok(step.outputMaterialId, `${step.id} needs a visual output`);
        assert.ok(
          materialIds.has(step.outputMaterialId),
          `${step.id} references unknown ${step.outputMaterialId}`,
        );
      }
    }

    for (const step of transformingSteps) {
      assert.equal(step.atomMapping.status, "draft");
      assert.equal(step.atomMappingStatus, step.atomMapping.status);
      const mapIds = new Set(step.atomMapping.atoms.map((atom) => atom.mapId));
      assert.equal(mapIds.size, step.atomMapping.atoms.length);
      assert.ok(step.bondChanges.some((change) => change.kind === "formed"));
      assert.ok(step.bondChanges.some((change) => change.kind === "broken"));
      for (const change of step.bondChanges) {
        for (const mapId of change.atomMapIds) {
          assert.ok(mapIds.has(mapId), `${step.id} references unknown ${mapId}`);
        }
      }
    }
  }
});

test("synthesis stories validate when the primary-source registry is composed", () => {
  const knownSourceIds = new Set([
    ...sourceById.keys(),
    ...synthesisSourceRegistry.map((source) => source.id),
  ]);

  for (const story of synthesisStories) {
    const errors = validateSynthesisStory(story, knownSourceIds).filter(
      (issue) => issue.severity === "error",
    );
    assert.deepEqual(errors, [], story.id);
  }
});

test("educational route data excludes operational laboratory parameters", () => {
  const forbiddenKeys = new Set([
    "amount",
    "amounts",
    "apparatus",
    "concentration",
    "conditions",
    "duration",
    "pressure",
    "procedure",
    "quantity",
    "reagentEquivalents",
    "solvent",
    "temperature",
    "workup",
    "yield",
  ]);

  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `forbidden operational key: ${key}`);
      visit(child);
    }
  };

  visit(synthesisStories);
  const serialized = JSON.stringify(synthesisStories);
  assert.doesNotMatch(serialized, /\b\d+(?:\.\d+)?\s*(?:mg|g|kg|mL|mmol|mol)\b/i);
  assert.doesNotMatch(serialized, /°\s*[CF]|\bpH\s*\d/i);
  assert.ok(
    synthesisStories.every(
      (story) => story.safety.operationalDetailsIncluded === false,
    ),
  );
});

test("AI proposals and uncited drafts fail the source-reported presentation gate", () => {
  const sourceReported = synthesisStories[0];
  assert.equal(canPresentAsSourceReported(sourceReported), true);

  assert.equal(
    canPresentAsSourceReported({ ...sourceReported, routeType: "ai-proposed" }),
    false,
  );
  assert.equal(
    canPresentAsSourceReported({
      ...sourceReported,
      routeType: "educational-simplification",
    }),
    false,
  );
  assert.equal(
    canPresentAsSourceReported({ ...sourceReported, primarySourceAnchors: [] }),
    false,
  );
  assert.equal(
    canPresentAsSourceReported({
      ...sourceReported,
      primarySourceAnchors: [
        { ...sourceReported.primarySourceAnchors[0], url: "http://example.test" },
      ],
    }),
    false,
  );
});
