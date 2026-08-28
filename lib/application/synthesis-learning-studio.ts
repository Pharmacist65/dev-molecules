import type { PublicAlphaSynthesisDraftGraph } from "@/lib/domain/public-alpha-synthesis-draft";

import {
  getBasicRecordSynthesisSurfaceState,
  type BasicRecordSynthesisCoverage,
  type BasicRecordSynthesisSurfaceState,
} from "./basic-record-synthesis-coverage";
import type { SynthesisCatalogSelection } from "./synthesis-catalog";

export type SynthesisLearningQuality =
  | "complete_learning_route"
  | "substantive_partial_route"
  | "fragmentary_route"
  | "candidate_only"
  | "no_supporting_source_resolved"
  | "coverage_unavailable";

export type SynthesisLearningMechanismAssurance =
  | "source_supported_mechanism"
  | "educational_interpretation"
  | "mechanism_not_resolved";

export interface SynthesisLearningMaterial {
  readonly id: string;
  readonly label: string;
  readonly smiles: string;
  readonly inchiKey: string;
  readonly role: "source_input" | "route_intermediate" | "exact_target";
  readonly exactIdentityResolved: true;
  readonly threeD: "catalog_computed_conformer" | "unavailable";
}

export interface SynthesisLearningReference {
  readonly id: string;
  readonly sourceType: "ORD";
  readonly label: string;
  readonly locator: string;
  readonly url: string;
  readonly licenseState: "CC-BY-SA-4.0";
  readonly reviewState: "pending";
  readonly retrievedAt: string;
}

export interface SynthesisLearningStep {
  readonly id: string;
  readonly displayOrder: number;
  readonly sourceReactionOrderResolved: false;
  readonly relationship: "target_forming_segment" | "upstream_source_segment";
  readonly inputs: readonly SynthesisLearningMaterial[];
  readonly outputs: readonly SynthesisLearningMaterial[];
  readonly reactionClass: "Unclassified";
  readonly evidenceState: "direct_structured_dataset_segment";
  readonly reviewState: "pending";
  readonly unresolved: true;
  readonly formedBond: null;
  readonly brokenBond: null;
  readonly changedFunctionalGroup: null;
  readonly atomContinuity: null;
  readonly stereochemicalConsequence: null;
  readonly mechanism: {
    readonly assurance: "mechanism_not_resolved";
    readonly reactionFamily: null;
    readonly nucleophile: null;
    readonly electrophile: null;
    readonly leavingGroup: null;
    readonly bondFormationOrBreakage: null;
    readonly functionalGroupTransformation: null;
    readonly regioOrStereochemicalOutcome: null;
    readonly commonMisconception:
      "A source-backed transformation does not by itself establish an electron-pushing mechanism.";
    readonly curvedArrowEligible: false;
  };
  readonly reference: SynthesisLearningReference;
}

export interface SynthesisLearningRoute {
  readonly id: string;
  readonly labelIndex: number;
  readonly routeType: "source_supported_fragment" | "teaching_reconstruction";
  readonly completeness: "partial" | "upstream_gap" | "convergent_partial";
  readonly reviewState: "pending";
  readonly sourceReportedAsOneCompleteRoute: false;
  readonly steps: readonly SynthesisLearningStep[];
  readonly resolvedStepCount: number;
  readonly unresolvedGapCount: number;
  readonly startingMaterialLabel: string;
  readonly sourceYear: null;
}

export interface SynthesisLearningStudioModel {
  readonly quality: SynthesisLearningQuality;
  readonly surfaceState: BasicRecordSynthesisSurfaceState | "coverage_unavailable";
  readonly targetTerminology:
    | "target_molecule"
    | "target_parent_molecule"
    | "target_chemical_form";
  readonly targetIdentity: {
    readonly preferredName: string;
    readonly pubChemCid: number;
    readonly inchiKey: string;
    readonly chemicalFormKind: BasicRecordSynthesisCoverage["chemicalFormKind"] | "unresolved";
    readonly stereochemistrySpecified: boolean;
  };
  readonly routes: readonly SynthesisLearningRoute[];
  readonly knownRouteCount: number;
  readonly resolvedStepCount: number;
  readonly unresolvedGapCount: number;
  readonly sourceStatus: BasicRecordSynthesisCoverage["sourceEvidenceState"] | "unavailable";
  readonly reviewStatus: BasicRecordSynthesisCoverage["reviewState"] | "unavailable";
  readonly sourceAvailable: boolean;
  readonly limitations: readonly string[];
}

const targetTerminologyFor = (
  coverage: BasicRecordSynthesisCoverage | null,
): SynthesisLearningStudioModel["targetTerminology"] => {
  if (!coverage) return "target_molecule";
  if (["salt", "hydrate", "solvate"].includes(coverage.chemicalFormKind)) {
    return "target_chemical_form";
  }
  if (coverage.chemicalFormKind === "free_parent") return "target_parent_molecule";
  return "target_molecule";
};

const materialIsResolved = (
  material: PublicAlphaSynthesisDraftGraph["materials"][number] | undefined,
): boolean => Boolean(
  material &&
  material.identityResolution === "exact_inchi_key_computed" &&
  material.sourceSmiles.trim() &&
  /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u.test(material.inchiKey),
);

const getLongestResolvedPath = (graph: PublicAlphaSynthesisDraftGraph): number => {
  type DraftStepId = PublicAlphaSynthesisDraftGraph["steps"][number]["id"];
  const materialById = new Map(graph.materials.map((material) => [material.id, material] as const));
  const resolvedStepIds = new Set<DraftStepId>(
    graph.steps
      .filter((step) => [...step.inputMaterialIds, ...step.outputMaterialIds]
        .every((id) => materialIsResolved(materialById.get(id))))
      .map((step) => step.id),
  );
  const incoming = new Map<DraftStepId, readonly DraftStepId[]>();
  for (const bridge of graph.bridges) {
    if (!resolvedStepIds.has(bridge.fromStepId) || !resolvedStepIds.has(bridge.toStepId)) continue;
    incoming.set(bridge.toStepId, [
      ...(incoming.get(bridge.toStepId) ?? []),
      bridge.fromStepId,
    ]);
  }
  const memo = new Map<DraftStepId, number>();
  const visiting = new Set<DraftStepId>();
  const depth = (stepId: DraftStepId): number => {
    if (!resolvedStepIds.has(stepId)) return 0;
    const cached = memo.get(stepId);
    if (cached !== undefined) return cached;
    if (visiting.has(stepId)) return 0;
    visiting.add(stepId);
    const result = 1 + Math.max(0, ...(incoming.get(stepId) ?? []).map(depth));
    visiting.delete(stepId);
    memo.set(stepId, result);
    return result;
  };
  return Math.max(0, ...graph.steps.map((step) => depth(step.id)));
};

export const classifySynthesisLearningQuality = (
  coverage: BasicRecordSynthesisCoverage | null,
  graphs: readonly PublicAlphaSynthesisDraftGraph[],
  coverageLoadState: SynthesisCatalogSelection["coverageLoadState"] = coverage
    ? "ready"
    : "not_published",
): SynthesisLearningQuality => {
  if (graphs.length === 0) {
    if (coverageLoadState === "unavailable") return "coverage_unavailable";
    if (!coverage || getBasicRecordSynthesisSurfaceState(coverage) === "no_supporting_source_resolved") {
      return "no_supporting_source_resolved";
    }
    return "candidate_only";
  }
  const longestPath = Math.max(...graphs.map(getLongestResolvedPath));
  const hasComplete = graphs.some((graph) =>
    graph.routeCompleteness === ("complete" as PublicAlphaSynthesisDraftGraph["routeCompleteness"]),
  );
  if (hasComplete && longestPath > 0) return "complete_learning_route";
  if (longestPath >= 3) return "substantive_partial_route";
  if (longestPath >= 1) return "fragmentary_route";
  return "candidate_only";
};

const createRoutes = (
  selection: SynthesisCatalogSelection,
  graphs: readonly PublicAlphaSynthesisDraftGraph[],
): readonly SynthesisLearningRoute[] => graphs.flatMap((graph) => {
  const materialById = new Map(graph.materials.map((material) => [material.id, material] as const));
  const citationById = new Map(graph.citations.map((citation) => [citation.id, citation] as const));
  const stepById = new Map(graph.steps.map((step) => [step.id, step] as const));
  const toMaterial = (
    material: PublicAlphaSynthesisDraftGraph["materials"][number],
  ): SynthesisLearningMaterial => ({
    id: material.id,
    label: material.label,
    smiles: material.sourceSmiles,
    inchiKey: material.inchiKey,
    role: material.displayRole,
    exactIdentityResolved: true,
    threeD: material.displayRole === "exact_target" && material.inchiKey === selection.inchiKey
      ? "catalog_computed_conformer"
      : "unavailable",
  });

  return graph.alternatives.map((alternative, alternativeIndex): SynthesisLearningRoute => {
    const orderedStepIds = [...alternative.upstreamStepIds, alternative.finalStepId];
    const steps = orderedStepIds.flatMap((stepId, displayIndex): readonly SynthesisLearningStep[] => {
      const step = stepById.get(stepId);
      if (!step) return [];
      const citation = citationById.get(step.citationId);
      if (!citation) return [];
      const inputs = step.inputMaterialIds.flatMap((id) => {
        const material = materialById.get(id);
        return material ? [toMaterial(material)] : [];
      });
      const outputs = step.outputMaterialIds.flatMap((id) => {
        const material = materialById.get(id);
        return material ? [toMaterial(material)] : [];
      });
      return [{
        id: step.id,
        displayOrder: displayIndex + 1,
        sourceReactionOrderResolved: false,
        relationship: step.relationship,
        inputs,
        outputs,
        reactionClass: "Unclassified",
        evidenceState: "direct_structured_dataset_segment",
        reviewState: "pending",
        unresolved: true,
        formedBond: null,
        brokenBond: null,
        changedFunctionalGroup: null,
        atomContinuity: null,
        stereochemicalConsequence: null,
        mechanism: {
          assurance: "mechanism_not_resolved",
          reactionFamily: null,
          nucleophile: null,
          electrophile: null,
          leavingGroup: null,
          bondFormationOrBreakage: null,
          functionalGroupTransformation: null,
          regioOrStereochemicalOutcome: null,
          commonMisconception: "A source-backed transformation does not by itself establish an electron-pushing mechanism.",
          curvedArrowEligible: false,
        },
        reference: {
          id: citation.id,
          sourceType: "ORD",
          label: citation.label,
          locator: citation.locator.value,
          url: citation.url,
          licenseState: "CC-BY-SA-4.0",
          reviewState: "pending",
          retrievedAt: graph.generatedAt,
        },
      }];
    });
    return {
      id: alternative.id,
      labelIndex: alternativeIndex + 1,
      routeType: alternative.routeType,
      completeness: alternative.routeCompleteness,
      reviewState: "pending",
      sourceReportedAsOneCompleteRoute: false,
      steps,
      resolvedStepCount: steps.length,
      unresolvedGapCount: alternative.unresolvedGapCount,
      startingMaterialLabel: steps[0]?.inputs.map((material) => material.label).join(" + ") || "Unresolved",
      sourceYear: null,
    };
  });
});

export const createSynthesisLearningStudioModel = (
  selection: SynthesisCatalogSelection,
  graphs: readonly PublicAlphaSynthesisDraftGraph[],
): SynthesisLearningStudioModel => {
  const coverage = selection.coverage;
  const routes = createRoutes(selection, graphs);
  return {
    quality: classifySynthesisLearningQuality(
      coverage,
      graphs,
      selection.coverageLoadState,
    ),
    surfaceState: coverage
      ? getBasicRecordSynthesisSurfaceState(coverage)
      : "coverage_unavailable",
    targetTerminology: targetTerminologyFor(coverage),
    targetIdentity: {
      preferredName: selection.preferredName,
      pubChemCid: selection.pubChemCid,
      inchiKey: selection.inchiKey,
      chemicalFormKind: coverage?.chemicalFormKind ?? "unresolved",
      stereochemistrySpecified: coverage?.stereochemistrySpecified ?? false,
    },
    routes,
    knownRouteCount: routes.length,
    resolvedStepCount: routes.length > 0
      ? Math.max(...routes.map((route) => route.resolvedStepCount))
      : 0,
    unresolvedGapCount: routes.reduce((sum, route) => sum + route.unresolvedGapCount, 0),
    sourceStatus: coverage?.sourceEvidenceState ?? "unavailable",
    reviewStatus: coverage?.reviewState ?? "unavailable",
    sourceAvailable: Boolean(
      coverage &&
      (coverage.sourceEvidenceState === "candidate_sources" ||
        coverage.sourceEvidenceState === "direct_source_resolved"),
    ),
    limitations: [...new Set(graphs.flatMap((graph) => graph.limitations))],
  };
};
