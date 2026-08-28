import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

const { createSynthesisLearningStudioModel } = await tsImport(
  "../lib/application/synthesis-learning-studio.ts",
  import.meta.url,
);
const { loadPublicAlphaSynthesisQualityInput } = await tsImport(
  "../scripts/synthesis/analyze-public-alpha-quality.mts",
  import.meta.url,
);

const flagshipExpectations = [
  {
    slug: "propranolol",
    catalogEntityId: "molecule:imported:propranolol-aqhhhdlhhxjyjd-uhfffaoysa-n",
    name: "Propranolol",
    pubChemCid: 4946,
    inchiKey: "AQHHHDLHHXJYJD-UHFFFAOYSA-N",
    quality: "fragmentary_route",
    sourceStatus: "candidate_sources",
  },
  {
    slug: "celecoxib",
    catalogEntityId: "molecule:imported:celecoxib-rzekvgvhfleqil-uhfffaoysa-n",
    name: "Celecoxib",
    pubChemCid: 2662,
    inchiKey: "RZEKVGVHFLEQIL-UHFFFAOYSA-N",
    quality: "fragmentary_route",
    sourceStatus: "candidate_sources",
  },
  {
    slug: "omeprazole",
    catalogEntityId: "molecule:imported:omeprazole-subdbmmjdzjvos-uhfffaoysa-n",
    name: "Omeprazole",
    pubChemCid: 4594,
    inchiKey: "SUBDBMMJDZJVOS-UHFFFAOYSA-N",
    quality: "no_supporting_source_resolved",
    sourceStatus: "none_found",
  },
];

test("embedded Studio resolves exact identity, validates drafts and fails closed", async () => {
  const source = await readSource("../components/synthesis/EmbeddedSynthesisLearningStudio.tsx");

  assert.match(source, /resolveSynthesisCatalogSelection\(stableSlug, navigator/u);
  assert.match(source, /fallbackIdentity: exactFallbackIdentity/u);
  assert.match(source, /loadSynthesisLearningStudioRouteDetail\(selection/u);
  assert.match(source, /state\.detail\.structureAssetsByInchiKey/u);
  assert.match(source, /state\.detail\.structureAssetAvailability/u);
  assert.match(source, /data-embedded-structure-asset-availability/u);
  assert.match(source, /requestSlug: stableSlug/u);
  assert.match(source, /state\.requestSlug !== stableSlug/u);
  assert.match(source, /data-scientific-conclusion="withheld"/u);
  assert.match(source, /does not mean that no source or route exists/u);
  assert.match(source, /not treated as evidence that no source or route exists/u);
  assert.match(source, /data-full-synthesis-atlas-link="true"/u);
  assert.doesNotMatch(source, /verifiedScientificClaim:\s*true/u);
});

test("Basic records and curated dossiers share the compact Studio and retain Full Atlas navigation", async () => {
  const [basic, route, dossier, app, studio, atlas, controller] = await Promise.all([
    readSource("../components/basic-record/BasicMolecularRecord.tsx"),
    readSource("../components/basic-record/MolecularRecordRoute.tsx"),
    readSource("../components/dossier/DrugDossier.tsx"),
    readSource("../components/platform/DevMoleculesApp.tsx"),
    readSource("../components/synthesis/SynthesisLearningStudio.tsx"),
    readSource("../components/platform/SynthesisAtlas.tsx"),
    readSource("../lib/application/synthesis-learning-studio-controller.ts"),
  ]);

  assert.match(basic, /<EmbeddedSynthesisLearningStudio/u);
  assert.match(basic, /fullAtlasHref=\{getSynthesisAcademyHash\(record\.stableSlug, "atlas"\)\}/u);
  assert.match(route, /synthesisNavigator=\{navigator\}/u);
  assert.match(route, /assetBasePath=\{assetBasePath\}/u);

  assert.match(dossier, /<EmbeddedSynthesisLearningStudio/u);
  assert.match(dossier, /fallbackIdentity=\{\{/u);
  assert.match(dossier, /pubChemCid: dossier\.sourceRecord\.identity\.pubChemCid/u);
  assert.match(dossier, /inchiKey: dossier\.sourceRecord\.identity\.inchiKey/u);
  assert.match(app, /synthesisNavigator=\{indexedCatalogNavigator\}/u);

  assert.match(studio, /variant\?: "full" \| "compact"/u);
  assert.match(studio, /data-synthesis-learning-studio-variant=\{variant\}/u);
  assert.match(studio, /data-structure-asset-availability=/u);
  assert.match(studio, /data-global-conformer-absence-claimed="false"/u);
  assert.doesNotMatch(studio, /No identity-matched 3D conformer exists/u);
  assert.match(studio, /data-coverage-surface-state=\{coverageUnavailable \? "coverage_unavailable"/u);
  assert.match(studio, /"route_detail_unavailable"/u);
  assert.match(studio, /labels\.candidateBody/u);
  assert.match(studio, /labels\.noneBody/u);
  assert.match(studio, /model\.routes\.length > 0/u);
  assert.match(studio, /getSynthesisStep3DGate\(step, material\.id\)/u);
  assert.match(studio, /data-step-output-3d-state/u);
  assert.match(studio, /type StudioExplorerFocus/u);
  assert.match(studio, /<StepOutputExplorer/u);
  assert.match(studio, /data-explorer-focus="step-output"/u);
  assert.match(studio, /data-target-fallback-used="false"/u);
  assert.match(studio, /labels\.conformerUnavailable/u);
  assert.match(studio, /data-learning-task-state=\{learningTaskState\}/u);
  assert.match(studio, /data-llm-chemistry-fact-generation="false"/u);
  assert.match(studio, /data-advanced-mechanism-state/u);
  assert.match(studio, /labels\.learningTaskUnavailable/u);
  assert.match(atlas, /loadSynthesisLearningStudioRouteDetail\(catalogSelection/u);
  assert.match(atlas, /draftDetail\.structureAssetsByInchiKey/u);
  assert.match(atlas, /draftDetail\.structureAssetAvailability/u);
  assert.match(controller, /material\.displayRole === "route_intermediate"/u);
  assert.match(controller, /manifest\.catalogSnapshotId !== selection\.catalogSnapshotId/u);
  assert.match(controller, /"transport_unavailable"/u);
  assert.match(controller, /"provenance_unavailable"/u);
  assert.match(controller, /globalConformerAbsenceClaimed: false/u);
});

test("three flagship exact identities keep the shared Basic/Curated Studio model fail closed", async () => {
  const input = await loadPublicAlphaSynthesisQualityInput();
  const basic = await readSource("../components/basic-record/BasicMolecularRecord.tsx");
  assert.match(
    basic,
    /<EmbeddedSynthesisLearningStudio[\s\S]*?stableSlug=\{record\.stableSlug\}[\s\S]*?navigator=\{synthesisNavigator\}/u,
  );

  for (const expected of flagshipExpectations) {
    const coverage = input.coverageRecords.find(
      (record) => record.identityScope.catalogEntityId === expected.catalogEntityId,
    );
    assert.ok(coverage, `${expected.name}: exact canonical coverage exists`);
    assert.equal(coverage.identityScope.pubChemCid, expected.pubChemCid);
    assert.equal(coverage.identityScope.inchiKey, expected.inchiKey);
    assert.equal(coverage.sourceEvidenceState, expected.sourceStatus);

    const draftEntry = input.draftEntries.find(
      (entry) => entry.indexEntry.coverageId === coverage.id,
    );
    const graphs = draftEntry ? [draftEntry.graph] : [];
    const selection = {
      catalogEntityId: expected.catalogEntityId,
      catalogSnapshotId: input.catalogSnapshotId,
      stableSlug: expected.slug,
      preferredName: expected.name,
      aliases: [],
      molecularFormula: "Source record",
      pubChemCid: expected.pubChemCid,
      inchiKey: expected.inchiKey,
      canonicalSmiles: "C",
      isomericSmiles: null,
      structures: {
        twoD: {
          publicPath: `/catalog/structures/${expected.slug}-2d.sdf`,
          sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${expected.pubChemCid}`,
          sha256: "a".repeat(64),
          byteLength: 1,
          origin: "database-2d-record",
          provenance: "source_record",
        },
        threeD: {
          publicPath: `/catalog/structures/${expected.slug}-3d.sdf`,
          sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${expected.pubChemCid}`,
          sha256: "b".repeat(64),
          byteLength: 1,
          origin: "computed-3d-conformer",
          provenance: "computed",
        },
      },
      curatedMoleculeId: `molecule:${expected.slug}`,
      coverage,
      coverageLoadState: "ready",
    };
    const model = createSynthesisLearningStudioModel(selection, graphs);
    assert.equal(model.targetIdentity.pubChemCid, expected.pubChemCid);
    assert.equal(model.targetIdentity.inchiKey, expected.inchiKey);
    assert.equal(model.quality, expected.quality);
    assert.equal(model.sourceStatus, expected.sourceStatus);
    assert.equal(model.targetStructureAssets.threeD.status, "unavailable");
    assert.equal(
      model.targetStructureAssets.threeD.reason,
      "computed_conformer_unavailable",
    );
    assert.deepEqual(model.capabilityCounts, {
      materialsWithCatalogComputed3D: 0,
      sourceSupportedMechanisms: 0,
      reactionClassEducationalMechanisms: 0,
      mappedMoleculeSpecificMechanisms: 0,
      structuredLearningTasks: 0,
    });

    if (graphs.length === 0) {
      assert.equal(expected.slug, "omeprazole");
      assert.deepEqual(model.routes, []);
      continue;
    }
    assert.ok(model.routes.length > 0);
    for (const step of model.routes.flatMap((route) => route.steps)) {
      assert.equal(step.mechanism.assurance, "mechanism_not_resolved");
      assert.equal(step.mechanism.visualizationState, "unavailable");
      assert.equal(step.quizGate.state, "ineligible");
      assert.equal(step.quizGate.llmChemistryFactGenerationAllowed, false);
      for (const material of [...step.inputs, ...step.outputs]) {
        if (material.structureAssets.threeD.status === "available") {
          assert.equal(material.role, "exact_target");
          assert.equal(material.inchiKey, expected.inchiKey);
          assert.equal(material.structureAssets.threeD.provenance.experimentalStructure, false);
          assert.equal(material.structureAssets.threeD.provenance.crystalStructure, false);
          assert.equal(material.structureAssets.threeD.provenance.bioactiveConformation, false);
        } else {
          assert.equal(material.structureAssets.threeD.syntheticFallbackCreated, false);
        }
      }
    }
  }
});
