import {
  getSynthesisAtlasRoutePresentation,
  type SynthesisAtlasRoutePresentation,
} from "./synthesis-atlas";
import { synthesisAtlasRoutes } from "../data/synthesis-atlas";
import {
  canOpenSynthesisAtlasMechanism,
  getSynthesisAtlasSourceGate,
  type SynthesisAtlasRoute,
  type SynthesisAtlasRouteKind,
  type SynthesisAtlasSourceGate,
} from "../domain/synthesis-atlas";

export interface SynthesisCurriculumLocalizedText {
  readonly tr: string;
  readonly en: string;
}

export type SynthesisFlagshipStatus =
  | "curated-route-available"
  | "blocked-source-gate"
  | "planned-unconfigured";

export interface SynthesisCurriculumRouteReadiness {
  readonly routeId: string;
  readonly kind: SynthesisAtlasRouteKind;
  readonly transformationCount: number;
  readonly mechanismRecordCount: number;
  readonly availableMechanismCount: number;
  readonly sourceGate: SynthesisAtlasSourceGate;
  readonly presentation: SynthesisAtlasRoutePresentation;
  readonly available: boolean;
}

export interface SynthesisFlagshipReadiness {
  readonly slot: number;
  readonly id: string;
  readonly moleculeId: string | null;
  readonly label: SynthesisCurriculumLocalizedText;
  readonly status: SynthesisFlagshipStatus;
  readonly routeCount: number;
  readonly availableRouteCount: number;
  readonly transformationCount: number;
  readonly mechanismRecordCount: number;
  readonly availableMechanismCount: number;
  readonly reportedRoutePresentation: SynthesisAtlasRoutePresentation | null;
  readonly routes: readonly SynthesisCurriculumRouteReadiness[];
}

export type SynthesisMilestoneCriterionState =
  | "complete"
  | "in-progress"
  | "unmeasured";

export interface SynthesisMilestoneCriterion {
  readonly id:
    | "flagship-drugs"
    | "pharmacological-families"
    | "reaction-families"
    | "convergent-examples"
    | "stereochemistry-examples";
  readonly label: SynthesisCurriculumLocalizedText;
  readonly target: number;
  readonly current: number | null;
  readonly state: SynthesisMilestoneCriterionState;
  readonly boundary: SynthesisCurriculumLocalizedText;
}

export interface SynthesisCurriculumReadiness {
  readonly targetDrugCount: 12;
  readonly configuredDrugCount: number;
  readonly availableDrugCount: number;
  readonly plannedDrugCount: number;
  readonly routeCount: number;
  readonly availableRouteCount: number;
  readonly teachingRouteCount: number;
  readonly reportedRouteCount: number;
  readonly sourceReportedRouteCount: number;
  readonly transformationCount: number;
  readonly mechanismRecordCount: number;
  readonly availableMechanismCount: number;
  readonly sourceGateCounts: Readonly<Record<SynthesisAtlasSourceGate, number>>;
  readonly flagships: readonly SynthesisFlagshipReadiness[];
  readonly criteria: readonly SynthesisMilestoneCriterion[];
  readonly sourcePolicy: {
    readonly reported: SynthesisCurriculumLocalizedText;
    readonly teaching: SynthesisCurriculumLocalizedText;
    readonly blocked: SynthesisCurriculumLocalizedText;
  };
}

export interface SynthesisCurriculumSelection {
  readonly moleculeId: string | null;
  readonly reason: "requested-ready" | "fallback-ready" | "none-ready";
}

export const SYNTHESIS_DEEP_LEARNING_TARGET = 12 as const;

const text = (tr: string, en: string): SynthesisCurriculumLocalizedText => ({ tr, en });

const knownMoleculeLabels: Readonly<Record<string, SynthesisCurriculumLocalizedText>> = {
  "molecule:propranolol": text("Propranolol", "Propranolol"),
  "molecule:atenolol": text("Atenolol", "Atenolol"),
  "molecule:carvedilol": text("Carvedilol", "Carvedilol"),
};

const curriculumOrder = [
  "molecule:propranolol",
  "molecule:atenolol",
  "molecule:carvedilol",
] as const;

const routeReadiness = (
  route: SynthesisAtlasRoute,
): SynthesisCurriculumRouteReadiness => {
  const sourceGate = getSynthesisAtlasSourceGate(route);
  const presentation = getSynthesisAtlasRoutePresentation(route);
  const mechanismSteps = route.transformations.filter((step) => step.mechanism !== null);
  const availableMechanismCount = route.transformations.filter((step) =>
    canOpenSynthesisAtlasMechanism(route, step.id)
  ).length;
  const available = sourceGate !== "blocked" && presentation !== "unavailable";

  return {
    routeId: route.id,
    kind: route.kind,
    transformationCount: route.transformations.length,
    mechanismRecordCount: mechanismSteps.length,
    availableMechanismCount,
    sourceGate,
    presentation,
    available,
  };
};

const compareMoleculeIds = (left: string, right: string): number => {
  const leftIndex = curriculumOrder.indexOf(left as (typeof curriculumOrder)[number]);
  const rightIndex = curriculumOrder.indexOf(right as (typeof curriculumOrder)[number]);
  if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
  if (leftIndex >= 0) return -1;
  if (rightIndex >= 0) return 1;
  return left.localeCompare(right, "en");
};

const getMoleculeLabel = (moleculeId: string): SynthesisCurriculumLocalizedText =>
  knownMoleculeLabels[moleculeId] ?? text(
    moleculeId.replace(/^molecule:/u, ""),
    moleculeId.replace(/^molecule:/u, ""),
  );

const preferredReportedPresentation = (
  routes: readonly SynthesisCurriculumRouteReadiness[],
): SynthesisAtlasRoutePresentation | null => {
  const reported = routes.filter((route) => route.kind === "reported");
  if (reported.some((route) => route.presentation === "source-reported")) {
    return "source-reported";
  }
  if (reported.some((route) => route.presentation === "source-context-reconstruction")) {
    return "source-context-reconstruction";
  }
  if (reported.some((route) => route.presentation === "declared-gap-reconstruction")) {
    return "declared-gap-reconstruction";
  }
  return reported[0]?.presentation ?? null;
};

const criterion = (
  id: SynthesisMilestoneCriterion["id"],
  label: SynthesisCurriculumLocalizedText,
  target: number,
  current: number | null,
  boundary: SynthesisCurriculumLocalizedText,
): SynthesisMilestoneCriterion => ({
  id,
  label,
  target,
  current,
  state: current === null
    ? "unmeasured"
    : current >= target
      ? "complete"
      : "in-progress",
  boundary,
});

/**
 * Builds the Phase 6 curriculum view from source-gated route data. The twelve
 * flagship milestone is a target, not a schema limit: future configured drugs
 * are never truncated and unassigned slots never receive invented content.
 */
export const buildSynthesisCurriculumReadiness = (
  routes: readonly SynthesisAtlasRoute[] = synthesisAtlasRoutes,
): SynthesisCurriculumReadiness => {
  const routesByMolecule = new Map<string, SynthesisAtlasRoute[]>();
  for (const route of routes) {
    const group = routesByMolecule.get(route.moleculeId) ?? [];
    group.push(route);
    routesByMolecule.set(route.moleculeId, group);
  }

  const configured = [...routesByMolecule.entries()]
    .sort(([left], [right]) => compareMoleculeIds(left, right))
    .map(([moleculeId, moleculeRoutes], index): SynthesisFlagshipReadiness => {
      const routeStates = moleculeRoutes.map(routeReadiness);
      const availableRouteCount = routeStates.filter((route) => route.available).length;
      return {
        slot: index + 1,
        id: `flagship:${moleculeId.replace(/^molecule:/u, "")}`,
        moleculeId,
        label: getMoleculeLabel(moleculeId),
        status: availableRouteCount > 0
          ? "curated-route-available"
          : "blocked-source-gate",
        routeCount: routeStates.length,
        availableRouteCount,
        transformationCount: routeStates.reduce(
          (sum, route) => sum + route.transformationCount,
          0,
        ),
        mechanismRecordCount: routeStates.reduce(
          (sum, route) => sum + route.mechanismRecordCount,
          0,
        ),
        availableMechanismCount: routeStates.reduce(
          (sum, route) => sum + route.availableMechanismCount,
          0,
        ),
        reportedRoutePresentation: preferredReportedPresentation(routeStates),
        routes: routeStates,
      };
    });

  const tableSize = Math.max(SYNTHESIS_DEEP_LEARNING_TARGET, configured.length);
  const planned = Array.from(
    { length: tableSize - configured.length },
    (_, index): SynthesisFlagshipReadiness => {
      const slot = configured.length + index + 1;
      const slotLabel = String(slot).padStart(2, "0");
      return {
        slot,
        id: `flagship-slot:${slotLabel}`,
        moleculeId: null,
        label: text(
          `Hedef ${slotLabel} — seçim yapılmadı`,
          `Target ${slotLabel} — unassigned`,
        ),
        status: "planned-unconfigured",
        routeCount: 0,
        availableRouteCount: 0,
        transformationCount: 0,
        mechanismRecordCount: 0,
        availableMechanismCount: 0,
        reportedRoutePresentation: null,
        routes: [],
      };
    },
  );

  const routeStates = configured.flatMap((entry) => entry.routes);
  const availableDrugCount = configured.filter(
    (entry) => entry.status === "curated-route-available",
  ).length;
  const sourceGateCounts: Record<SynthesisAtlasSourceGate, number> = {
    "source-supported": 0,
    "context-supported": 0,
    "partial-with-declared-gap": 0,
    blocked: 0,
  };
  for (const route of routeStates) sourceGateCounts[route.sourceGate] += 1;

  return {
    targetDrugCount: SYNTHESIS_DEEP_LEARNING_TARGET,
    configuredDrugCount: configured.length,
    availableDrugCount,
    plannedDrugCount: Math.max(0, SYNTHESIS_DEEP_LEARNING_TARGET - configured.length),
    routeCount: routeStates.length,
    availableRouteCount: routeStates.filter((route) => route.available).length,
    teachingRouteCount: routeStates.filter(
      (route) => route.kind === "foundational-education",
    ).length,
    reportedRouteCount: routeStates.filter((route) => route.kind === "reported").length,
    sourceReportedRouteCount: routeStates.filter(
      (route) => route.presentation === "source-reported",
    ).length,
    transformationCount: routeStates.reduce(
      (sum, route) => sum + route.transformationCount,
      0,
    ),
    mechanismRecordCount: routeStates.reduce(
      (sum, route) => sum + route.mechanismRecordCount,
      0,
    ),
    availableMechanismCount: routeStates.reduce(
      (sum, route) => sum + route.availableMechanismCount,
      0,
    ),
    sourceGateCounts,
    flagships: [...configured, ...planned],
    criteria: [
      criterion(
        "flagship-drugs",
        text("Kürate amiral gemisi ilaç", "Curated flagship drugs"),
        SYNTHESIS_DEEP_LEARNING_TARGET,
        availableDrugCount,
        text(
          "Yalnız en az bir kaynak kapısından geçen rotası bulunan ilaç sayılır.",
          "Only drugs with at least one route that passes the source gate are counted.",
        ),
      ),
      criterion(
        "pharmacological-families",
        text("Farklı farmakolojik aile", "Distinct pharmacological families"),
        6,
        null,
        text(
          "Sentez müfredatı henüz normalize farmakoloji sınıflarıyla bağlanmadı; sayı yayınlanmaz.",
          "The synthesis curriculum is not yet linked to normalized pharmacology classes; no count is published.",
        ),
      ),
      criterion(
        "reaction-families",
        text("Farklı reaksiyon ailesi", "Distinct reaction families"),
        6,
        null,
        text(
          "Serbest metin dönüşüm etiketleri normalize reaksiyon taksonomisi sayılmaz.",
          "Free-text transformation labels are not counted as a normalized reaction taxonomy.",
        ),
      ),
      criterion(
        "convergent-examples",
        text("Konverjan sentez örneği", "Convergent synthesis examples"),
        3,
        null,
        text(
          "Konverjans için açık rota düzeyi işaretleme henüz yapılandırılmadı.",
          "Explicit route-level convergence annotations are not configured yet.",
        ),
      ),
      criterion(
        "stereochemistry-examples",
        text("Stereokimya örneği", "Stereochemistry examples"),
        3,
        null,
        text(
          "Rasemik kapsam sınırları, bağımsız stereokimya dersi olarak sayılmaz.",
          "Racemic scope boundaries are not counted as standalone stereochemistry lessons.",
        ),
      ),
    ],
    sourcePolicy: {
      reported: text(
        "Bir rota yalnız her dönüşümü doğrudan kaynakla destekleniyorsa ‘bildirilmiş rota’ olarak sunulur.",
        "A route is presented as source-reported only when every transformation has direct source support.",
      ),
      teaching: text(
        "Eğitim rotası kaynak sınırını, pedagojik yorumları ve upstream boşluklarını ayrı tutar.",
        "A teaching route keeps source boundaries, pedagogical interpretation, and upstream gaps distinct.",
      ),
      blocked: text(
        "Kaynak URL’si, belge konumu veya adım bağlantısı çözümlenemezse rota kapalı kalır.",
        "A route stays closed when its source URL, document locator, or step linkage cannot be resolved.",
      ),
    },
  };
};

export const synthesisCurriculumReadiness = buildSynthesisCurriculumReadiness();

export const resolveSynthesisCurriculumSelection = (
  requestedMoleculeId: string | null | undefined,
  readiness: SynthesisCurriculumReadiness = synthesisCurriculumReadiness,
): SynthesisCurriculumSelection => {
  const available = readiness.flagships.filter(
    (entry): entry is SynthesisFlagshipReadiness & { readonly moleculeId: string } =>
      entry.status === "curated-route-available" && entry.moleculeId !== null,
  );
  if (
    requestedMoleculeId &&
    available.some((entry) => entry.moleculeId === requestedMoleculeId)
  ) {
    return { moleculeId: requestedMoleculeId, reason: "requested-ready" };
  }
  return available[0]
    ? { moleculeId: available[0].moleculeId, reason: "fallback-ready" }
    : { moleculeId: null, reason: "none-ready" };
};
