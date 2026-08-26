import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import SmilesDrawer from "smiles-drawer";
import { tsImport } from "tsx/esm/api";

const {
  getSynthesisAtlasGraphGeometry,
  getSynthesisAtlasRoutePresentation,
  getSynthesisAtlasStepForMaterial,
  getSynthesisAtlasTargetProduct,
  requestSynthesisAtlasLevel,
  resolveSynthesisAtlasRoute,
} = await tsImport("../lib/application/synthesis-atlas.ts", import.meta.url);
const {
  synthesisAtlasRoutes,
} = await tsImport("../lib/data/synthesis-atlas.ts", import.meta.url);
const { synthesisAtlasChallenges } = await tsImport(
  "../lib/data/synthesis-atlas-challenges.ts",
  import.meta.url,
);
const {
  canOpenSynthesisAtlasMechanism,
  canPresentSynthesisAtlasRouteAsReported,
  evaluateSynthesisAtlasChallenge,
  getSynthesisAtlasSourceGate,
  getSynthesisAtlasStepSequence,
  navigateSynthesisAtlasRoute,
} = await tsImport("../lib/domain/synthesis-atlas.ts", import.meta.url);

const routeById = new Map(synthesisAtlasRoutes.map((route) => [route.id, route]));

const parseSmiles = (smiles) => new Promise((resolve, reject) => {
  SmilesDrawer.parse(smiles, resolve, reject);
});

const parseSmilesAtoms = (smiles) => new Promise((resolve, reject) => {
  SmilesDrawer.parse(
    smiles,
    (tree) => {
      const atoms = [];
      const visit = (node) => {
        if (!node) return;
        atoms.push(node.atom?.element ?? node.atom);
        for (const branch of node.branches ?? []) visit(branch);
        if (node.hasNext) visit(node.next);
      };
      visit(tree);
      resolve(atoms);
    },
    reject,
  );
});

test("three molecules expose separate foundational and reported routes with real structures", async () => {
  assert.equal(synthesisAtlasRoutes.length, 6);
  const moleculeIds = new Set(synthesisAtlasRoutes.map((route) => route.moleculeId));
  assert.equal(moleculeIds.size, 3);

  for (const moleculeId of moleculeIds) {
    const routes = synthesisAtlasRoutes.filter((route) => route.moleculeId === moleculeId);
    assert.deepEqual(
      new Set(routes.map((route) => route.kind)),
      new Set(["foundational-education", "reported"]),
      moleculeId,
    );
  }

  for (const route of synthesisAtlasRoutes) {
    const materialIds = new Set(route.materials.map((material) => material.id));
    assert.equal(materialIds.size, route.materials.length, route.id);
    assert.ok(route.materials.length >= route.transformations.length + 1, route.id);
    for (const material of route.materials) {
      assert.ok(material.smiles.trim().length > 0, material.id);
      await assert.doesNotReject(parseSmiles(material.smiles), material.id);
    }
    for (const step of route.transformations) {
      assert.ok(step.inputMaterialIds.length >= 1, step.id);
      assert.ok(step.outputMaterialId, step.id);
      assert.ok(step.inputMaterialIds.every((id) => materialIds.has(id)), step.id);
      assert.ok(materialIds.has(step.outputMaterialId), step.id);
      assert.ok(step.bondChanges.length >= 1, `${step.id} needs a chemical bond change`);
      assert.ok(step.functionalGroupChanges.length >= 1, `${step.id} needs a functional-group change`);
      assert.ok(step.reagentSummary.tr && step.reagentSummary.en, step.id);
      assert.ok(step.conditionSummary.tr && step.conditionSummary.en, step.id);
    }
  }
});

test("source-supported reported routes include defensible five-plus transformation paths", () => {
  const longReportedRoutes = synthesisAtlasRoutes.filter(
    (route) =>
      route.kind === "reported" &&
      route.transformations.length >= 5 &&
      getSynthesisAtlasSourceGate(route) === "source-supported",
  );
  assert.ok(longReportedRoutes.length >= 1);
  assert.equal(routeById.get("synthesis-atlas-route:atenolol-reported").transformations.length, 5);
  assert.equal(routeById.get("synthesis-atlas-route:carvedilol-reported").transformations.length, 6);

  for (const route of longReportedRoutes) {
    const orders = route.transformations.map((step) => step.order);
    assert.deepEqual(orders, Array.from({ length: orders.length }, (_, index) => index + 1));
    assert.equal(canPresentSynthesisAtlasRouteAsReported(route), true);
  }
});

test("target-product presentation accepts only an unconsumed terminal drug role", () => {
  for (const route of synthesisAtlasRoutes) {
    const target = getSynthesisAtlasTargetProduct(route);
    assert.ok(target, route.id);
    assert.ok(
      target.material.role === "active-parent" || target.material.role === "chemical-form",
      `${route.id}:${target.material.role}`,
    );
    assert.equal(target.step.outputMaterialId, target.material.id, route.id);
    assert.equal(
      route.transformations.some(
        (step) => step.id !== target.step.id && step.inputMaterialIds.includes(target.material.id),
      ),
      false,
      route.id,
    );
  }

  const route = routeById.get("synthesis-atlas-route:propranolol-reported");
  assert.ok(route);
  const validTarget = getSynthesisAtlasTargetProduct(route);
  assert.ok(validTarget);
  const demotedMaterials = route.materials.map((material) => (
    material.id === validTarget.material.id
      ? { ...material, role: "intermediate" }
      : material
  ));
  assert.equal(
    getSynthesisAtlasTargetProduct({ ...route, materials: demotedMaterials }),
    null,
  );
});

test("forward and retro graph navigation is mirrored, deterministic and clamped", () => {
  const route = routeById.get("synthesis-atlas-route:carvedilol-reported");
  assert.ok(route);
  const forward = getSynthesisAtlasStepSequence(route, "forward");
  const retro = getSynthesisAtlasStepSequence(route, "retro");
  assert.deepEqual(retro.map((step) => step.id), [...forward].reverse().map((step) => step.id));

  assert.deepEqual(
    navigateSynthesisAtlasRoute(route, null, "forward", "next"),
    { stepId: forward[0].id, changed: true },
  );
  assert.deepEqual(
    navigateSynthesisAtlasRoute(route, forward[0].id, "forward", "previous"),
    { stepId: forward[0].id, changed: false },
  );
  assert.deepEqual(
    navigateSynthesisAtlasRoute(route, forward.at(-1).id, "forward", "next"),
    { stepId: forward.at(-1).id, changed: false },
  );

  const forwardGeometry = getSynthesisAtlasGraphGeometry(route, "forward");
  const retroGeometry = getSynthesisAtlasGraphGeometry(route, "retro");
  assert.equal(forwardGeometry.edges.length, retroGeometry.edges.length);
  for (const node of forwardGeometry.nodes) {
    const mirrored = retroGeometry.nodes.find((candidate) => candidate.materialId === node.materialId);
    assert.ok(mirrored);
    assert.equal(node.x + mirrored.x, forwardGeometry.width);
    assert.equal(node.y, mirrored.y);
    assert.ok(getSynthesisAtlasStepForMaterial(route, node.materialId, "forward"));
  }

  assert.equal(resolveSynthesisAtlasRoute(synthesisAtlasRoutes, route.moleculeId, "reported").id, route.id);
});

test("route-step-mechanism policy opens only curated, source-gated mechanism layers", () => {
  const mechanismCount = synthesisAtlasRoutes
    .flatMap((atlasRoute) => atlasRoute.transformations)
    .filter((step) => step.mechanism !== null).length;
  assert.equal(mechanismCount, 12, "documented mechanism count must track fail-closed route data");

  const route = routeById.get("synthesis-atlas-route:atenolol-reported");
  assert.ok(route);
  const mechanismStep = route.transformations.find((step) => step.mechanism);
  const plainStep = route.transformations.find((step) => !step.mechanism);
  assert.ok(mechanismStep);
  assert.ok(plainStep);
  assert.equal(canOpenSynthesisAtlasMechanism(route, mechanismStep.id), true);
  assert.equal(canOpenSynthesisAtlasMechanism(route, plainStep.id), false);
  assert.deepEqual(requestSynthesisAtlasLevel(route, "step", null), {
    level: "route",
    allowed: false,
    reason: "step-required",
  });
  assert.deepEqual(requestSynthesisAtlasLevel(route, "mechanism", plainStep.id), {
    level: "step",
    allowed: false,
    reason: "mechanism-unavailable",
  });
  assert.deepEqual(requestSynthesisAtlasLevel(route, "mechanism", mechanismStep.id), {
    level: "mechanism",
    allowed: true,
    reason: "allowed",
  });

  for (const atlasRoute of synthesisAtlasRoutes) {
    for (const step of atlasRoute.transformations.filter((item) => item.mechanism)) {
      assert.notEqual(step.evidenceState, "evidence-gap");
      assert.ok(step.mechanism.electronMoves.length >= 2, step.id);
      assert.ok(step.mechanism.nucleophile.tr && step.mechanism.nucleophile.en, step.id);
      assert.ok(step.mechanism.electrophile.tr && step.mechanism.electrophile.en, step.id);
      assert.ok(step.mechanism.intermediate.tr && step.mechanism.intermediate.en, step.id);
      assert.ok(step.mechanism.stereochemicalOutcome.tr && step.mechanism.stereochemicalOutcome.en, step.id);
      assert.ok(step.mechanism.commonError.tr && step.mechanism.commonError.en, step.id);
    }
  }
});

test("mechanism anchors are route-local and incompatible reported steps fail closed", () => {
  for (const route of synthesisAtlasRoutes) {
    const routeMaterialIds = new Set(route.materials.map((material) => material.id));
    for (const step of route.transformations) {
      for (const move of step.mechanism?.electronMoves ?? []) {
        for (const anchor of [move.fromAnchor, move.toAnchor]) {
          if (!anchor) continue;
          assert.ok(
            routeMaterialIds.has(anchor.materialId),
            `${route.id}:${step.id}:${anchor.materialId} must belong to the containing route`,
          );
        }
      }
    }
  }

  const propranololReported = routeById.get("synthesis-atlas-route:propranolol-reported");
  const atenololReported = routeById.get("synthesis-atlas-route:atenolol-reported");
  assert.ok(propranololReported);
  assert.ok(atenololReported);

  const chlorohydrinStep = propranololReported.transformations.find(
    (step) => step.id === "synthesis-atlas-step:propranolol-rep-01",
  );
  const protectedAmineStep = atenololReported.transformations.find(
    (step) => step.id === "synthesis-atlas-step:atenolol-rep-02",
  );
  assert.ok(chlorohydrinStep);
  assert.ok(protectedAmineStep);
  assert.equal(chlorohydrinStep.mechanism, null);
  assert.equal(protectedAmineStep.mechanism, null);
  assert.equal(canOpenSynthesisAtlasMechanism(propranololReported, chlorohydrinStep.id), false);
  assert.equal(canOpenSynthesisAtlasMechanism(atenololReported, protectedAmineStep.id), false);
});

test("selected foundational mechanisms anchor electron arrows to curated atoms and bonds", async () => {
  const route = routeById.get("synthesis-atlas-route:propranolol-foundational");
  assert.ok(route);
  const anchoredSteps = route.transformations.filter(
    (step) =>
      step.mechanism &&
      step.mechanism.electronMoves.every(
        (move) => move.fromAnchor && move.toAnchor,
      ),
  );
  assert.ok(anchoredSteps.length >= 2);
  const materialById = new Map(route.materials.map((material) => [material.id, material]));

  for (const step of anchoredSteps) {
    for (const move of step.mechanism.electronMoves) {
      for (const anchor of [move.fromAnchor, move.toAnchor]) {
        const material = materialById.get(anchor.materialId);
        assert.ok(material, `${step.id}:${anchor.materialId}`);
        const atoms = await parseSmilesAtoms(material.smiles);
        assert.ok(anchor.atomIndexes.length === 1 || anchor.atomIndexes.length === 2);
        for (const atomIndex of anchor.atomIndexes) {
          assert.ok(Number.isInteger(atomIndex) && atomIndex >= 0);
          assert.ok(atomIndex < atoms.length, `${material.id}:atom-${atomIndex}`);
        }
      }
    }
  }

  const etherStep = anchoredSteps[0];
  const etherMove = etherStep.mechanism.electronMoves[0];
  const naphtholAtoms = await parseSmilesAtoms(
    materialById.get(etherMove.fromAnchor.materialId).smiles,
  );
  const epihalohydrinAtoms = await parseSmilesAtoms(
    materialById.get(etherMove.toAnchor.materialId).smiles,
  );
  assert.equal(naphtholAtoms[etherMove.fromAnchor.atomIndexes[0]], "O");
  assert.equal(epihalohydrinAtoms[etherMove.toAnchor.atomIndexes[0]], "C");

  const ringOpening = anchoredSteps[1].mechanism.electronMoves[0];
  const amineAtoms = await parseSmilesAtoms(
    materialById.get(ringOpening.fromAnchor.materialId).smiles,
  );
  assert.equal(amineAtoms[ringOpening.fromAnchor.atomIndexes[0]], "N");
});

test("source presentation gates fail closed for bad links, missing anchors and declared gaps", () => {
  for (const route of synthesisAtlasRoutes) {
    assert.ok(route.sourceAnchors.length >= 1, route.id);
    const expectedGate = route.transformations.some(
      (step) => step.evidenceState === "source-context",
    )
      ? "context-supported"
      : "source-supported";
    assert.equal(getSynthesisAtlasSourceGate(route), expectedGate, route.id);
    assert.equal(
      canPresentSynthesisAtlasRouteAsReported(route),
      route.kind === "reported" && expectedGate === "source-supported",
      route.id,
    );
    const sourceIds = new Set(route.sourceAnchors.map((source) => source.sourceId));
    for (const source of route.sourceAnchors) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.doesNotMatch(
        `${url.pathname}${url.search}`,
        /(?:\/search(?:\/|$)|[?&](?:q|query)=)/i,
      );
      assert.ok(source.locator.tr.trim() && source.locator.en.trim(), source.sourceId);
    }
    for (const step of route.transformations) {
      assert.ok(step.sourceIds.every((sourceId) => sourceIds.has(sourceId)), step.id);
    }
  }

  const reported = routeById.get("synthesis-atlas-route:atenolol-reported");
  assert.ok(reported);
  const badUrl = {
    ...reported,
    sourceAnchors: [{ ...reported.sourceAnchors[0], url: "https://example.test/search?q=atenolol" }],
  };
  assert.equal(getSynthesisAtlasSourceGate(badUrl), "blocked");
  assert.equal(canPresentSynthesisAtlasRouteAsReported(badUrl), false);

  const missingAnchor = { ...reported, sourceAnchors: [] };
  assert.equal(getSynthesisAtlasSourceGate(missingAnchor), "blocked");

  const declaredGap = {
    ...reported,
    transformations: [
      { ...reported.transformations[0], evidenceState: "evidence-gap" },
      ...reported.transformations.slice(1),
    ],
  };
  assert.equal(getSynthesisAtlasSourceGate(declaredGap), "partial-with-declared-gap");
  assert.equal(canPresentSynthesisAtlasRouteAsReported(declaredGap), false);
});

test("route presentation never promotes source-context reconstruction to source-reported", () => {
  const contextRoute = routeById.get("synthesis-atlas-route:propranolol-reported");
  const directRoute = routeById.get("synthesis-atlas-route:atenolol-reported");
  assert.ok(contextRoute);
  assert.ok(directRoute);
  assert.equal(
    getSynthesisAtlasRoutePresentation(contextRoute),
    "source-context-reconstruction",
  );
  assert.doesNotMatch(contextRoute.title.en, /reported route/i);
  assert.doesNotMatch(contextRoute.title.tr, /bildirilen rota/i);
  assert.match(contextRoute.title.en, /source-context.*reconstruction/i);
  assert.match(contextRoute.title.tr, /kaynak bağlamlı.*rekonstrüksiyon/i);
  assert.equal(getSynthesisAtlasRoutePresentation(directRoute), "source-reported");

  const declaredGap = {
    ...directRoute,
    transformations: [
      { ...directRoute.transformations[0], evidenceState: "evidence-gap" },
      ...directRoute.transformations.slice(1),
    ],
  };
  assert.equal(
    getSynthesisAtlasRoutePresentation(declaredGap),
    "declared-gap-reconstruction",
  );
  assert.equal(
    getSynthesisAtlasRoutePresentation({ ...directRoute, sourceAnchors: [] }),
    "unavailable",
  );
});

test("challenges are route-bound, localized and reject malformed answers", () => {
  assert.deepEqual(
    new Set(synthesisAtlasChallenges.map((challenge) => challenge.kind)),
    new Set(["reaction-class", "order-steps", "missing-intermediate", "mechanism-choice"]),
  );

  for (const challenge of synthesisAtlasChallenges) {
    assert.ok(routeById.has(challenge.routeId), challenge.id);
    assert.equal(challenge.optionIds.length, challenge.options.length, challenge.id);
    const correct = evaluateSynthesisAtlasChallenge(challenge, challenge.correctOptionIds);
    assert.equal(correct.status, "correct", challenge.id);
    assert.ok(correct.feedback.tr.trim() && correct.feedback.en.trim(), challenge.id);

    const invalid = evaluateSynthesisAtlasChallenge(challenge, ["atlas-option:not-configured"]);
    assert.equal(invalid.status, "invalid", challenge.id);
  }
});

test("atlas content is bilingual, non-operational and the source drawer starts closed", async () => {
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, "tr") || Object.hasOwn(value, "en")) {
      assert.equal(typeof value.tr, "string");
      assert.equal(typeof value.en, "string");
      assert.ok(value.tr.trim().length > 0);
      assert.ok(value.en.trim().length > 0);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(synthesisAtlasRoutes);
  visit(synthesisAtlasChallenges);

  const forbiddenKeys = new Set([
    "amount",
    "amounts",
    "apparatus",
    "concentration",
    "duration",
    "pressure",
    "procedure",
    "quantity",
    "reagentEquivalents",
    "temperature",
    "workup",
    "yield",
  ]);
  const checkKeys = (value) => {
    if (Array.isArray(value)) return value.forEach(checkKeys);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `forbidden operational key: ${key}`);
      checkKeys(child);
    }
  };
  checkKeys(synthesisAtlasRoutes);
  const serialized = JSON.stringify(synthesisAtlasRoutes);
  assert.doesNotMatch(serialized, /\b\d+(?:\.\d+)?\s*(?:mg|g|kg|mL|mmol|mol)\b/i);
  assert.doesNotMatch(serialized, /°\s*[CF]|\bpH\s*\d/i);
  assert.ok(synthesisAtlasRoutes.every((route) => route.safety.operationalDetailsIncluded === false));

  const component = await readFile(
    new URL("../components/platform/SynthesisAtlas.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /<details[^>]*data-source-drawer[^>]*>/);
  assert.doesNotMatch(component, /<details[^>]*\bopen(?:=|\s|>)/);
  assert.match(component, /data-route-presentation=\{routePresentation\}/);
  assert.match(
    component,
    /routePresentation === "source-context-reconstruction"[\s\S]*labels\.sourceContextReconstruction/,
  );
  assert.match(
    component,
    /reportedPresentation === "source-reported"[\s\S]*labels\.reported/,
    "the Source-reported tab label must remain behind the direct-source presentation gate",
  );
  assert.doesNotMatch(component, /<h2>\{route\.title\[locale\]\}<\/h2>/);
});
