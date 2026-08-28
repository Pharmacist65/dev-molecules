import type { PublicAlphaSynthesisDraftGraph } from "@/lib/domain/public-alpha-synthesis-draft";
import type {
  StructuredSynthesisFact,
  StructuredSynthesisQuizGate,
  SynthesisLearningCapabilityCounts,
  SynthesisLearningStructureBundle,
  SynthesisMechanismAssuranceRecord,
} from "@/lib/domain/synthesis-learning-evidence";

import {
  getBasicRecordSynthesisSurfaceState,
  type BasicRecordSynthesisCoverage,
  type BasicRecordSynthesisSurfaceState,
} from "./basic-record-synthesis-coverage";
import type { SynthesisCatalogSelection } from "./synthesis-catalog";
import {
  createExactCatalogSynthesis2DOnlyBundleFromRecord,
  createIndependentSynthesis2DStructureBundle,
  createUnresolvedSynthesisMechanism,
  deriveStructuredSynthesisQuizGate,
  hasExactComputedSynthesis3D,
  summarizeSynthesisLearningCapabilities,
} from "./synthesis-learning-evidence";

export type SynthesisLearningQuality =
  | "complete_learning_route"
  | "substantive_partial_route"
  | "fragmentary_route"
  | "candidate_only"
  | "no_supporting_source_resolved"
  | "coverage_unavailable";

export type SynthesisLearningMechanismAssurance =
  SynthesisMechanismAssuranceRecord["assurance"];

export interface SynthesisLearningMaterial {
  readonly id: string;
  readonly label: string;
  readonly smiles: string;
  readonly inchiKey: string;
  readonly role: "source_input" | "route_intermediate" | "exact_target";
  readonly exactIdentityResolved: true;
  readonly threeD: "catalog_computed_conformer" | "unavailable";
  readonly structureAssets: SynthesisLearningStructureBundle;
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
  readonly mechanism: SynthesisMechanismAssuranceRecord;
  readonly structuredFacts: readonly StructuredSynthesisFact[];
  readonly quizGate: StructuredSynthesisQuizGate;
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
  readonly targetStructureAssets: SynthesisLearningStructureBundle;
  readonly routes: readonly SynthesisLearningRoute[];
  readonly knownRouteCount: number;
  readonly resolvedStepCount: number;
  readonly unresolvedGapCount: number;
  readonly sourceStatus: BasicRecordSynthesisCoverage["sourceEvidenceState"] | "unavailable";
  readonly reviewStatus: BasicRecordSynthesisCoverage["reviewState"] | "unavailable";
  readonly sourceAvailable: boolean;
  readonly capabilityCounts: SynthesisLearningCapabilityCounts;
  readonly limitations: readonly string[];
}

export interface CreateSynthesisLearningStudioModelOptions {
  /** Exact-identity catalog pairs for pending-review route-boundary materials. */
  readonly structureAssetsByInchiKey?: ReadonlyMap<
    string,
    SynthesisLearningStructureBundle
  >;
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
  options: CreateSynthesisLearningStudioModelOptions,
): readonly SynthesisLearningRoute[] => graphs.flatMap((graph) => {
  const materialById = new Map(graph.materials.map((material) => [material.id, material] as const));
  const citationById = new Map(graph.citations.map((citation) => [citation.id, citation] as const));
  const stepById = new Map(graph.steps.map((step) => [step.id, step] as const));
  const toMaterial = (
    material: PublicAlphaSynthesisDraftGraph["materials"][number],
  ): SynthesisLearningMaterial => {
    const materialIdentity = {
      id: material.id,
      inchiKey: material.inchiKey,
      sourceSmiles: material.sourceSmiles,
      exactIdentityResolved: true,
    } as const;
    const registered = options.structureAssetsByInchiKey?.get(material.inchiKey);
    const targetCatalog2DBundle =
      material.displayRole === "exact_target" &&
      material.inchiKey === selection.inchiKey
        ? createExactCatalogSynthesis2DOnlyBundleFromRecord(
            materialIdentity,
            {
              catalogEntityId: selection.catalogEntityId,
              catalogSnapshotId: selection.catalogSnapshotId,
              pubChemCid: selection.pubChemCid,
              inchiKey: selection.inchiKey,
              structures: {
                twoD: {
                  path: selection.structures.twoD.publicPath,
                  sourceUrl: selection.structures.twoD.sourceUrl,
                  sha256: selection.structures.twoD.sha256,
                  byteLength: selection.structures.twoD.byteLength,
                },
                threeD: {
                  path: selection.structures.threeD.publicPath,
                  sourceUrl: selection.structures.threeD.sourceUrl,
                  sha256: selection.structures.threeD.sha256,
                  byteLength: selection.structures.threeD.byteLength,
                },
              },
            },
          )
        : null;
    const exactRegistered =
      (material.displayRole === "route_intermediate" ||
        material.displayRole === "exact_target") &&
      registered && hasExactComputedSynthesis3D(
      materialIdentity,
      registered,
    )
      ? { ...registered, materialId: material.id }
      : null;
    const structureAssets = exactRegistered ?? targetCatalog2DBundle ??
      createIndependentSynthesis2DStructureBundle(materialIdentity);
    return {
      id: material.id,
      label: material.label,
      smiles: material.sourceSmiles,
      inchiKey: material.inchiKey,
      role: material.displayRole,
      exactIdentityResolved: true,
      threeD: structureAssets.threeD.status === "available"
        ? "catalog_computed_conformer"
        : "unavailable",
      structureAssets,
    };
  };

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
      const structuredFacts: readonly StructuredSynthesisFact[] = [];
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
        mechanism: createUnresolvedSynthesisMechanism(),
        structuredFacts,
        quizGate: deriveStructuredSynthesisQuizGate(structuredFacts),
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

const createTargetStructureAssets = (
  selection: SynthesisCatalogSelection,
  options: CreateSynthesisLearningStudioModelOptions,
): SynthesisLearningStructureBundle => {
  const material = {
    id: `synthesis-learning-target:${selection.catalogEntityId}`,
    inchiKey: selection.inchiKey,
    sourceSmiles: selection.isomericSmiles ?? selection.canonicalSmiles,
    exactIdentityResolved: true,
  } as const;
  const registered = options.structureAssetsByInchiKey?.get(selection.inchiKey);
  if (registered && hasExactComputedSynthesis3D(material, registered)) {
    return { ...registered, materialId: material.id };
  }
  return createExactCatalogSynthesis2DOnlyBundleFromRecord(
    material,
    {
      catalogEntityId: selection.catalogEntityId,
      catalogSnapshotId: selection.catalogSnapshotId,
      pubChemCid: selection.pubChemCid,
      inchiKey: selection.inchiKey,
      structures: {
        twoD: {
          path: selection.structures.twoD.publicPath,
          sourceUrl: selection.structures.twoD.sourceUrl,
          sha256: selection.structures.twoD.sha256,
          byteLength: selection.structures.twoD.byteLength,
        },
        threeD: {
          path: selection.structures.threeD.publicPath,
          sourceUrl: selection.structures.threeD.sourceUrl,
          sha256: selection.structures.threeD.sha256,
          byteLength: selection.structures.threeD.byteLength,
        },
      },
    },
  ) ?? createIndependentSynthesis2DStructureBundle(material,
    "catalog_asset_provenance_invalid");
};

export const createSynthesisLearningStudioModel = (
  selection: SynthesisCatalogSelection,
  graphs: readonly PublicAlphaSynthesisDraftGraph[],
  options: CreateSynthesisLearningStudioModelOptions = {},
): SynthesisLearningStudioModel => {
  const coverage = selection.coverage;
  const routes = createRoutes(selection, graphs, options);
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
    targetStructureAssets: createTargetStructureAssets(selection, options),
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
    capabilityCounts: summarizeSynthesisLearningCapabilities(routes),
    limitations: [...new Set(graphs.flatMap((graph) => graph.limitations))],
  };
};
