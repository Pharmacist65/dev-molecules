import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { createDrugDossierByIdOrSlug } = await tsImport(
  "../lib/application/dossier/index.ts",
  import.meta.url,
);

const scenarios = [
  {
    slug: "propranolol",
    moleculeId: "molecule:propranolol",
    route: "ORAL",
    formulation: "TABLET",
    missingKey: "clearance",
    targets: [
      "ADRB1 · beta-1 adrenergic receptor",
      "ADRB2 · beta-2 adrenergic receptor",
    ],
    metaboliteEdges: 3,
  },
  {
    slug: "celecoxib",
    moleculeId: "molecule:celecoxib",
    route: "ORAL",
    formulation: "CAPSULE",
    missingKey: "bioavailability",
    targets: ["PTGS2 · cyclooxygenase-2"],
    metaboliteEdges: 2,
  },
  {
    slug: "omeprazole",
    moleculeId: "molecule:omeprazole",
    route: "ORAL",
    formulation: "DELAYED-RELEASE CAPSULE",
    missingKey: "volumeOfDistribution",
    targets: ["ATP4A · gastric H+/K+-ATPase alpha subunit"],
    metaboliteEdges: 3,
  },
];

const evidenceSourceIds = (dossier) => {
  const ids = [];
  for (const node of dossier.metabolites.nodes) ids.push(node.label.sourceId);
  for (const edge of dossier.metabolites.edges) {
    ids.push(...edge.sourceIds);
    ids.push(edge.transformationClass.sourceId, edge.activity.sourceId);
    if (edge.enzyme) ids.push(edge.enzyme.sourceId);
  }
  return ids;
};

test("flagship release contract keeps stable identities and complete audited sections in TR and EN", () => {
  for (const scenario of scenarios) {
    for (const locale of ["tr", "en"]) {
      const bySlug = createDrugDossierByIdOrSlug(scenario.slug, locale);
      const byId = createDrugDossierByIdOrSlug(scenario.moleculeId, locale);
      assert.ok(bySlug?.flagship, `${scenario.slug}/${locale}: flagship route`);
      assert.ok(byId?.flagship, `${scenario.moleculeId}/${locale}: stable id route`);
      assert.equal(bySlug.moleculeId, scenario.moleculeId);
      assert.equal(byId.moleculeId, scenario.moleculeId);

      const profile = bySlug.admeProfiles[0];
      assert.ok(profile, `${scenario.slug}/${locale}: route/form ADME profile`);
      assert.equal(profile.administration.route.value, scenario.route);
      assert.equal(profile.administration.formulation?.value, scenario.formulation);
      assert.equal(profile[scenario.missingKey], null);

      assert.deepEqual(
        bySlug.pharmacology.primaryTargets.map((target) => target.targetName.value),
        scenario.targets,
      );
      assert.equal(bySlug.metabolites.edges.length, scenario.metaboliteEdges);

      const sourceIds = new Set(bySlug.sources.map((source) => source.id));
      for (const sourceId of evidenceSourceIds(bySlug)) {
        assert.equal(
          sourceIds.has(sourceId),
          true,
          `${scenario.slug}/${locale}: metabolite source ${sourceId} must resolve`,
        );
      }

      const flagship = bySlug.flagship;
      assert.equal(flagship.synthesis.status, "unavailable");
      assert.equal(flagship.synthesis.content, null);
      assert.deepEqual(flagship.synthesis.sourceIds, []);
      assert.equal(flagship.nomenclature.status, "source-supported");
      assert.ok((flagship.nomenclature.content?.segments.length ?? 0) > 0);
      assert.equal(flagship.comparisons.status, "source-supported");
      assert.ok(flagship.comparisons.content.length > 0);
      assert.ok(flagship.comparisons.content.every((comparison) =>
        comparison.propertyDifferences.length > 0 &&
        comparison.targetActionDifference !== null &&
        comparison.targetActionDifference.sourceIds.length >= 2
      ));
      assert.equal(flagship.learning.status, "source-supported");
      assert.ok(flagship.learning.content.length >= 2);
      assert.equal(flagship.learning.content.some((task) => task.kind === "synthesis"), false);
      assert.ok(flagship.explicitMissingFields.length > 0);

      for (const task of flagship.learning.content) {
        assert.ok(task.prompt.length > 0);
        assert.ok(task.explanation.length > 0);
        assert.ok(task.options.length >= 2);
        assert.equal(
          task.options.some((option) => option.id === task.correctOptionId),
          true,
          `${scenario.slug}/${locale}: ${task.id} must have a selectable answer`,
        );
        for (const sourceId of task.sourceIds) {
          assert.equal(
            sourceIds.has(sourceId),
            true,
            `${scenario.slug}/${locale}: learning source ${sourceId} must resolve`,
          );
        }
      }
    }
  }
});

test("flagship source links are direct and unknown ADME values stay explicit", () => {
  for (const scenario of scenarios) {
    const dossier = createDrugDossierByIdOrSlug(scenario.slug, "en");
    assert.ok(dossier?.flagship);
    assert.ok(dossier.flagship.explicitMissingFields.some((field) =>
      /null|not found|not studied|absent|hold/i.test(field)
    ));
    assert.ok(dossier.sources.length > 0);
    for (const source of dossier.sources) {
      assert.match(source.url, /^https:\/\//);
      assert.doesNotMatch(source.url, /(?:google|bing|duckduckgo)\.[^/]+\/search/iu);
      assert.ok(source.externalId.length > 0);
      assert.match(source.retrievedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});
