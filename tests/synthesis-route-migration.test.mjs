import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const { synthesisAtlasRoutes } = await tsImport(
  "../lib/data/synthesis-atlas.ts",
  import.meta.url,
);
const { validateCanonicalSynthesisRoute } = await tsImport(
  "../lib/domain/synthesis-validation.ts",
  import.meta.url,
);
const { loadSynthesisDiscoverySubjects } = await tsImport(
  "../scripts/synthesis/catalog-input.mts",
  import.meta.url,
);
const {
  LEGACY_SYNTHESIS_ROUTE_COUNT,
  migrateLegacySynthesisRoutes,
} = await tsImport(
  "../scripts/synthesis/migrate-legacy-routes.mts",
  import.meta.url,
);

const migration = await migrateLegacySynthesisRoutes();
const routeById = new Map(migration.routes.map((route) => [route.id, route]));
const legacyRouteById = new Map(synthesisAtlasRoutes.map((route) => [route.id, route]));

const canonicalRouteForLegacy = (legacyRouteId) => {
  const entry = migration.migrationReport.entries.find(
    (candidate) => candidate.legacyRouteId === legacyRouteId,
  );
  assert.ok(entry, legacyRouteId);
  const route = routeById.get(entry.canonicalRouteId);
  assert.ok(route, entry.canonicalRouteId);
  return { entry, route };
};

test("legacy migration accounts for all 6 routes and yields validator-clean canonical records", () => {
  const { migrationReport, routes, evidence } = migration;

  assert.equal(LEGACY_SYNTHESIS_ROUTE_COUNT, 6);
  assert.equal(migrationReport.expectedLegacyRouteCount, 6);
  assert.equal(migrationReport.legacyRouteCount, 6);
  assert.equal(migrationReport.accountedRouteCount, 6);
  assert.equal(routes.length, 6);
  assert.equal(new Set(routes.map((route) => route.id)).size, 6);
  assert.equal(new Set(migrationReport.entries.map((entry) => entry.legacyRouteId)).size, 6);
  assert.deepEqual(
    new Set(migrationReport.entries.map((entry) => entry.legacyRouteId)),
    new Set(synthesisAtlasRoutes.map((route) => route.id)),
  );
  assert.deepEqual(migrationReport.routeTypeCounts, {
    patent_reported: 5,
    literature_reported: 0,
    teaching_reconstruction: 1,
    computational_proposed: 0,
  });
  assert.equal(migrationReport.invariants.allSixLegacyRoutesAccounted, true);
  assert.equal(migrationReport.invariants.exactCidAndInchiKeyJoin, true);
  assert.equal(migrationReport.invariants.operationalDetailsIncluded, false);

  for (const route of routes) {
    const errors = validateCanonicalSynthesisRoute(route, evidence).filter(
      (issue) => issue.severity === "error",
    );
    assert.deepEqual(errors, [], `${route.id}: ${JSON.stringify(errors)}`);
    assert.equal(route.safety.operationalDetailsIncluded, false);
    assert.ok(route.stereochemicalStrategy.trim().length > 0, route.id);
  }
});

test("every route joins the exact catalog CID and InChIKey and targets that exact identity", () => {
  const expected = new Map([
    ["molecule:propranolol", [4946, "AQHHHDLHHXJYJD-UHFFFAOYSA-N"]],
    ["molecule:atenolol", [2249, "METKIMKYRPQLGS-UHFFFAOYSA-N"]],
    ["molecule:carvedilol", [2585, "OGHNVEJMJSYVRP-UHFFFAOYSA-N"]],
  ]);

  for (const entry of migration.migrationReport.entries) {
    const legacyRoute = legacyRouteById.get(entry.legacyRouteId);
    const canonicalRoute = routeById.get(entry.canonicalRouteId);
    assert.ok(legacyRoute);
    assert.ok(canonicalRoute);
    const [cid, inchiKey] = expected.get(legacyRoute.moleculeId);
    assert.equal(entry.joinedPubChemCid, cid);
    assert.equal(entry.joinedInchiKey, inchiKey);
    assert.equal(canonicalRoute.identityScope.pubChemCid, cid);
    assert.equal(canonicalRoute.identityScope.inchiKey, inchiKey);
    assert.equal(
      canonicalRoute.coverageId,
      `synthesis-coverage:${canonicalRoute.identityScope.catalogEntityId}`,
    );
    assert.equal(
      canonicalRoute.stereochemicalStrategy,
      legacyRoute.stereochemistryScope.en,
    );

    const target = canonicalRoute.materials.find(
      (material) => material.id === canonicalRoute.targetMaterialId,
    );
    assert.ok(target);
    assert.equal(target.role, "target_parent");
    assert.equal(target.identityResolution, "exact_inchi_key");
    assert.equal(target.inchiKey, inchiKey);
    assert.equal(target.canonicalSmiles, canonicalRoute.identityScope.canonicalSmiles);
    assert.ok(
      canonicalRoute.steps.some((step) =>
        step.outputMaterialIds.includes(canonicalRoute.targetMaterialId),
      ),
      canonicalRoute.id,
    );
  }
});

test("source-context upstream chemistry is excluded from reported steps and retained as gaps", () => {
  assert.equal(migration.migrationReport.excludedSourceContextStepCount, 3);
  assert.equal(migration.migrationReport.excludedTargetFormStepCount, 1);

  for (const entry of migration.migrationReport.entries) {
    const legacyRoute = legacyRouteById.get(entry.legacyRouteId);
    const canonicalRoute = routeById.get(entry.canonicalRouteId);
    assert.ok(legacyRoute);
    assert.ok(canonicalRoute);
    const retained = new Set(entry.retainedLegacyStepIds);
    const excluded = new Set(entry.exclusions.map((exclusion) => exclusion.legacyStepId));
    assert.equal(retained.size + excluded.size, legacyRoute.transformations.length);

    for (const stepId of retained) {
      assert.equal(
        legacyRoute.transformations.find((step) => step.id === stepId)?.evidenceState,
        "direct-source",
        stepId,
      );
    }
    for (const legacyStep of legacyRoute.transformations.filter(
      (step) => step.evidenceState === "source-context",
    )) {
      assert.ok(excluded.has(legacyStep.id), legacyStep.id);
      assert.equal(
        entry.exclusions.find((exclusion) => exclusion.legacyStepId === legacyStep.id)?.reason,
        "source_context_not_promoted",
      );
    }
    assert.ok(
      canonicalRoute.steps.every((step) => step.evidenceMode === "direct_reported"),
      canonicalRoute.id,
    );
    if (entry.exclusions.some((item) => item.reason === "source_context_not_promoted")) {
      assert.ok(
        canonicalRoute.gaps.some((gap) => gap.kind === "upstream_precursor"),
        canonicalRoute.id,
      );
      assert.equal(canonicalRoute.routeCompleteness, "upstream_gap");
    }
  }
});

test("the two-patent carvedilol composite is a source-bounded teaching reconstruction", () => {
  const { route } = canonicalRouteForLegacy(
    "synthesis-atlas-route:carvedilol-reported",
  );
  assert.equal(route.routeType, "teaching_reconstruction");
  assert.equal(route.reviewState, "pending");
  assert.equal(route.routeCompleteness, "convergent_partial");
  assert.equal(route.segments.length, 2);
  assert.equal(new Set(route.segments.flatMap((segment) => segment.sourceEvidenceIds)).size, 2);
  assert.deepEqual(
    new Set(route.segments.flatMap((segment) => segment.stepIds)),
    new Set(route.steps.map((step) => step.id)),
  );
  const families = new Set(
    route.sourceEvidenceIds.map(
      (evidenceId) => migration.evidence.find((item) => item.id === evidenceId)?.patentFamilyId,
    ),
  );
  assert.equal(families.size, 2);
  assert.ok(route.gaps.some((gap) => /N-benzyl amine branch/u.test(gap.description)));
});

test("propranolol free-base migration does not turn hydrochloride formation into a covalent target step", () => {
  const { entry, route } = canonicalRouteForLegacy(
    "synthesis-atlas-route:propranolol-reported",
  );
  assert.equal(route.identityScope.pubChemCid, 4946);
  assert.equal(route.identityScope.inchiKey, "AQHHHDLHHXJYJD-UHFFFAOYSA-N");
  assert.equal(
    entry.exclusions.find(
      (exclusion) => exclusion.legacyStepId === "synthesis-atlas-step:propranolol-rep-03",
    )?.reason,
    "target_form_identity_divergence",
  );
  assert.ok(route.materials.every((material) => !/hydrochloride/iu.test(material.label)));
  assert.ok(route.materials.every((material) => !material.canonicalSmiles?.includes(".")));
  assert.ok(
    route.steps.every((step) =>
      step.stateChanges.every((change) => change.kind !== "counterion_association"),
    ),
  );
  assert.ok(
    route.steps.flatMap((step) => step.bondChanges).every(
      (change) =>
        change.mappingState === "not_mapped" &&
        change.atoms === null &&
        change.beforeOrder === null &&
        change.afterOrder === null &&
        change.description.trim().length > 0,
    ),
  );
  assert.match(
    route.steps.at(-1).limitations.join(" "),
    /distinct chemical form.*not a covalent target transformation/iu,
  );
});

test("resolved migration evidence preserves each exact legacy document anchor and locator", () => {
  for (const legacyRoute of synthesisAtlasRoutes) {
    for (const anchor of legacyRoute.sourceAnchors) {
      const evidence = migration.evidence.find((item) => item.sourceId === anchor.sourceId);
      assert.ok(evidence, anchor.sourceId);
      assert.equal(evidence.resolutionState, "resolved");
      assert.equal(evidence.sourceKind, "patent");
      assert.equal(evidence.title, anchor.title);
      assert.equal(evidence.url, anchor.url);
      assert.equal(evidence.locator?.value, anchor.locator.en);
      assert.match(evidence.locator?.kind ?? "", /^patent_(?:example|scheme)$/u);
      assert.equal(evidence.licenseState, "link_only");
      assert.equal(evidence.reuseMode, "metadata_and_link_only");
    }
  }
});

test("a CID-only match cannot bypass an InChIKey mismatch", async () => {
  const subjects = await loadSynthesisDiscoverySubjects();
  const tampered = subjects.map((subject) =>
    subject.identity.pubChemCid === 4946
      ? {
          ...subject,
          identity: {
            ...subject.identity,
            inchiKey: "AAAAAAAAAAAAAA-UHFFFAOYSA-N",
          },
        }
      : subject,
  );
  await assert.rejects(
    migrateLegacySynthesisRoutes({ subjects: tampered }),
    /Exact CID\/InChIKey synthesis identity join failed/u,
  );
});
