"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  getSynthesisAtlasGraphGeometry,
  getSynthesisAtlasRoutePresentation,
  getSynthesisAtlasStepForMaterial,
  requestSynthesisAtlasLevel,
  resolveSynthesisAtlasRoute,
} from "@/lib/application/synthesis-atlas";
import {
  getSynthesisAtlasMaterial,
  synthesisAtlasRoutes,
} from "@/lib/data/synthesis-atlas";
import {
  canOpenSynthesisAtlasMechanism,
  getSynthesisAtlasSourceGate,
  getSynthesisAtlasStepSequence,
  navigateSynthesisAtlasRoute,
  type SynthesisAtlasDirection,
  type SynthesisAtlasLevel,
  type SynthesisAtlasMaterial,
  type SynthesisAtlasRoute,
  type SynthesisAtlasRouteKind,
  type SynthesisAtlasStepId,
  type SynthesisAtlasTransformation,
} from "@/lib/domain/synthesis-atlas";
import { useI18n, type Locale } from "@/lib/i18n";

import { SmilesStructure } from "./SmilesStructure";
import { SynthesisAtlasChallenges } from "./SynthesisAtlasChallenges";
import { SynthesisAtlasMechanism } from "./SynthesisAtlasMechanism";
import atlas from "./SynthesisAtlas.module.css";

export interface SynthesisAtlasProps {
  readonly selectedMoleculeId: string;
  readonly onSelectMolecule: (moleculeId: string) => void;
  readonly onOpenMoleculeFocus: (moleculeId: string) => void;
  readonly presentationMode?: "student" | "reviewer";
}

const copy = {
  tr: {
    eyebrow: "Sentez Atlası",
    title: "Bir molekülü, dönüşümler boyunca düşün",
    description: "Gerçek 2B yapıları ileri veya retrosentetik yönde incele; bağ değişimini seç, sonra savunulabilir mekanizma katmanına yaklaş.",
    nonOperational: "Öğretim görünümü · operasyonel protokol içermez",
    foundational: "Temel öğrenme rotası",
    reported: "Kaynakta bildirilen rota",
    sourceContextReconstruction: "Kaynak bağlamlı eğitsel rekonstrüksiyon",
    declaredGapReconstruction: "Kanıt boşluğu açıklanmış eğitsel rota",
    unavailableRoute: "Kaynak kapsamı doğrulanamayan rota",
    sourceSupportedGate: "Doğrudan kaynak destekli rota",
    sourceContextGate: "Kaynak bağlamlı eğitsel rekonstrüksiyon",
    declaredGapGate: "Açık kanıt boşluğu içeren eğitsel rota",
    blockedGate: "Kaynak kapsamı doğrulanamadı",
    route: "Rota",
    step: "Basamak",
    mechanism: "Mekanizma",
    forward: "İleri",
    retro: "Retrosentez",
    zoomIn: "Yakınlaştır",
    zoomOut: "Uzaklaştır",
    resetView: "Görünümü sıfırla",
    graphAria: "Yakınlaştırılabilir ve sürüklenebilir sentez rota grafiği",
    routeHint: "Bir yapı veya dönüşüm seçerek basamak düzeyine in.",
    buildingBlock: "Yapı taşı",
    reagentFragment: "Birleşen parça",
    intermediate: "Ara ürün",
    activeParent: "Etkin parent",
    chemicalForm: "Kimyasal form",
    selectedStep: "Seçilen dönüşüm",
    reactionClass: "Dönüşüm sınıfı",
    generalReagents: "Genel reaktif / katalizör özeti",
    generalConditions: "Genel koşul ailesi",
    changes: "Yapısal değişiklikler",
    bondChanges: "Bağ değişimleri",
    functionalChanges: "Fonksiyonel grup değişimleri",
    formed: "oluşan",
    broken: "kırılan",
    orderChanged: "bağ düzeni",
    inputs: "Girdi yapıları",
    output: "Çıktı yapısı",
    previous: "Önceki",
    next: "Sonraki",
    openMechanism: "Mekanizmayı incele",
    mechanismUnavailable: "Bu basamak için kürate edilmiş mekanizma yok",
    sourceSupported: "Doğrudan kaynak destekli",
    sourceContext: "Kaynak bağlamıyla destekli",
    evidenceGap: "Açık kanıt boşluğu",
    sources: "Kaynaklar ve sınırlar",
    sourcesIntro: "Kaynak çekmecesi kapalı başlar; her bağlantı doğrudan belgeye gider.",
    locator: "Belge konumu",
    supportScope: "Desteklediği kapsam",
    limitations: "Bilinen sınırlar",
    safety: "Güvenli öğrenme sınırı",
    open3d: "Molekülü 3B odakta aç",
    transformations: "dönüşüm",
    technicalDetails: "Reviewer ayrıntıları",
    routeId: "Rota kimliği",
    version: "Veri sürümü",
    sourceGate: "Kaynak kapsamı",
  },
  en: {
    eyebrow: "Synthesis Atlas",
    title: "Think through a molecule, one transformation at a time",
    description: "Explore real 2D structures forward or retrosynthetically; select the bond change, then descend into a defensible mechanism layer.",
    nonOperational: "Teaching view · no operational protocol",
    foundational: "Foundational learning route",
    reported: "Source-reported route",
    sourceContextReconstruction: "Source-context educational reconstruction",
    declaredGapReconstruction: "Educational route with a declared evidence gap",
    unavailableRoute: "Route with unverified source scope",
    sourceSupportedGate: "Directly source-supported route",
    sourceContextGate: "Source-context educational reconstruction",
    declaredGapGate: "Educational route with a declared evidence gap",
    blockedGate: "Source scope could not be verified",
    route: "Route",
    step: "Step",
    mechanism: "Mechanism",
    forward: "Forward",
    retro: "Retrosynthesis",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetView: "Reset view",
    graphAria: "Zoomable and draggable synthesis route graph",
    routeHint: "Select a structure or transformation to enter the step level.",
    buildingBlock: "Building block",
    reagentFragment: "Converging fragment",
    intermediate: "Intermediate",
    activeParent: "Active parent",
    chemicalForm: "Chemical form",
    selectedStep: "Selected transformation",
    reactionClass: "Transformation class",
    generalReagents: "General reagent / catalyst summary",
    generalConditions: "General condition family",
    changes: "Structural changes",
    bondChanges: "Bond changes",
    functionalChanges: "Functional-group changes",
    formed: "formed",
    broken: "broken",
    orderChanged: "bond order",
    inputs: "Input structures",
    output: "Output structure",
    previous: "Previous",
    next: "Next",
    openMechanism: "Inspect mechanism",
    mechanismUnavailable: "No curated mechanism for this step",
    sourceSupported: "Directly source-supported",
    sourceContext: "Supported by source context",
    evidenceGap: "Declared evidence gap",
    sources: "Sources and boundaries",
    sourcesIntro: "The source drawer starts closed; every link opens a direct document.",
    locator: "Document location",
    supportScope: "Supported scope",
    limitations: "Known limitations",
    safety: "Safe learning boundary",
    open3d: "Open molecule in 3D focus",
    transformations: "transformations",
    technicalDetails: "Reviewer details",
    routeId: "Route identifier",
    version: "Data version",
    sourceGate: "Source scope",
  },
} as const;

const moleculeLabels: Readonly<Record<string, string>> = {
  "molecule:propranolol": "Propranolol",
  "molecule:atenolol": "Atenolol",
  "molecule:carvedilol": "Carvedilol",
};

const moleculeIds = [...new Set(synthesisAtlasRoutes.map((route) => route.moleculeId))];

const clampZoom = (value: number) => Math.min(1.45, Math.max(0.52, value));

function MaterialCard({
  material,
  locale,
  className,
}: {
  readonly material: SynthesisAtlasMaterial;
  readonly locale: Locale;
  readonly className?: string;
}) {
  return (
    <SmilesStructure
      className={className}
      smiles={material.smiles}
      label={material.label[locale]}
    />
  );
}

function StepDetail({
  route,
  step,
  direction,
  locale,
  presentationMode,
  onStepChange,
  onMechanism,
}: {
  readonly route: SynthesisAtlasRoute;
  readonly step: SynthesisAtlasTransformation;
  readonly direction: SynthesisAtlasDirection;
  readonly locale: Locale;
  readonly presentationMode: "student" | "reviewer";
  readonly onStepChange: (stepId: SynthesisAtlasStepId) => void;
  readonly onMechanism: () => void;
}) {
  const labels = copy[locale];
  const sequence = getSynthesisAtlasStepSequence(route, direction);
  const visibleIndex = sequence.findIndex((candidate) => candidate.id === step.id);
  const inputs = step.inputMaterialIds.flatMap((materialId) => {
    const material = getSynthesisAtlasMaterial(route, materialId);
    return material ? [material] : [];
  });
  const output = step.outputMaterialId
    ? getSynthesisAtlasMaterial(route, step.outputMaterialId)
    : null;
  const evidenceLabel = step.evidenceState === "direct-source"
    ? labels.sourceSupported
    : step.evidenceState === "source-context"
      ? labels.sourceContext
      : labels.evidenceGap;
  const mechanismAvailable = canOpenSynthesisAtlasMechanism(route, step.id);

  function navigate(action: "previous" | "next") {
    const result = navigateSynthesisAtlasRoute(route, step.id, direction, action);
    if (result.stepId) onStepChange(result.stepId);
  }

  return (
    <section className={atlas.stepDetail} data-active-step={step.id}>
      <header className={atlas.stepDetailHeader}>
        <div>
          <span>{labels.selectedStep} · {visibleIndex + 1}/{sequence.length}</span>
          <h2>{step.title[locale]}</h2>
          <p>{step.changeSummary[locale]}</p>
        </div>
        {presentationMode === "reviewer" || step.evidenceState === "evidence-gap" ? (
          <span className={atlas.evidenceBadge} data-evidence={step.evidenceState}>
            {evidenceLabel}
          </span>
        ) : null}
      </header>

      <div className={atlas.stepStructures}>
        <section>
          <span>{labels.inputs}</span>
          <div>
            {inputs.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                locale={locale}
                className={atlas.detailStructure}
              />
            ))}
          </div>
        </section>
        <i aria-hidden="true">→</i>
        {output ? (
          <section>
            <span>{labels.output}</span>
            <MaterialCard material={output} locale={locale} className={atlas.detailStructure} />
          </section>
        ) : null}
      </div>

      <div className={atlas.stepFacts}>
        <article><span>{labels.reactionClass}</span><strong>{step.reactionClass[locale]}</strong></article>
        <article><span>{labels.generalReagents}</span><strong>{step.reagentSummary[locale]}</strong></article>
        <article><span>{labels.generalConditions}</span><strong>{step.conditionSummary[locale]}</strong></article>
      </div>

      <section className={atlas.changeLedger}>
        <header><span>{labels.changes}</span></header>
        <div>
          <article>
            <h3>{labels.bondChanges}</h3>
            <ul className={atlas.bondChanges}>
              {step.bondChanges.map((change, index) => (
                <li key={`${change.kind}:${index}`} data-change={change.kind}>
                  <span>{change.kind === "formed" ? labels.formed : change.kind === "broken" ? labels.broken : labels.orderChanged}</span>
                  {change.label[locale]}
                </li>
              ))}
            </ul>
          </article>
          <article>
            <h3>{labels.functionalChanges}</h3>
            <ul>
              {step.functionalGroupChanges.map((change, index) => (
                <li key={`${change.en}:${index}`}>{change[locale]}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <footer className={atlas.stepActions}>
        <button type="button" disabled={visibleIndex <= 0} onClick={() => navigate("previous")}>
          ← {labels.previous}
        </button>
        <button
          type="button"
          disabled={!mechanismAvailable}
          title={mechanismAvailable ? labels.openMechanism : labels.mechanismUnavailable}
          onClick={onMechanism}
        >
          {labels.openMechanism}
        </button>
        <button type="button" disabled={visibleIndex >= sequence.length - 1} onClick={() => navigate("next")}>
          {labels.next} →
        </button>
      </footer>
    </section>
  );
}

function AtlasWorkspace({
  route,
  locale,
  presentationMode,
  onOpenMoleculeFocus,
}: {
  readonly route: SynthesisAtlasRoute;
  readonly locale: Locale;
  readonly presentationMode: "student" | "reviewer";
  readonly onOpenMoleculeFocus: (moleculeId: string) => void;
}) {
  const labels = copy[locale];
  const [direction, setDirection] = useState<SynthesisAtlasDirection>("forward");
  const [requestedLevel, setRequestedLevel] = useState<SynthesisAtlasLevel>("route");
  const [activeStepId, setActiveStepId] = useState<SynthesisAtlasStepId | null>(
    getSynthesisAtlasStepSequence(route, "forward")[0]?.id ?? null,
  );
  const [zoom, setZoom] = useState(0.54);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const rawMarkerId = useId();
  const markerId = `atlas-${rawMarkerId.replace(/[^a-z0-9_-]/giu, "-")}`;

  const geometry = useMemo(
    () => getSynthesisAtlasGraphGeometry(route, direction),
    [route, direction],
  );
  const effectiveStepId = route.transformations.some((step) => step.id === activeStepId)
    ? activeStepId
    : getSynthesisAtlasStepSequence(route, direction)[0]?.id ?? null;
  const activeStep = route.transformations.find((step) => step.id === effectiveStepId) ?? null;
  const levelTransition = requestSynthesisAtlasLevel(route, requestedLevel, effectiveStepId);
  const level = levelTransition.level;
  const activeMaterialIds = new Set(
    activeStep
      ? [...activeStep.inputMaterialIds, ...(activeStep.outputMaterialId ? [activeStep.outputMaterialId] : [])]
      : [],
  );
  const labelEdges = geometry.edges.filter(
    (edge, index, edges) => edges.findIndex((candidate) => candidate.stepId === edge.stepId) === index,
  );

  function selectStep(stepId: SynthesisAtlasStepId) {
    setActiveStepId(stepId);
    setRequestedLevel("step");
  }

  function requestLevel(nextLevel: SynthesisAtlasLevel) {
    const transition = requestSynthesisAtlasLevel(route, nextLevel, effectiveStepId);
    setRequestedLevel(transition.level);
  }

  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a, summary")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setDragging(true);
  }

  function updatePan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setPan({
      x: drag.current.panX + event.clientX - drag.current.x,
      y: drag.current.panY + event.clientY - drag.current.y,
    });
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((value) => clampZoom(value + (event.deltaY < 0 ? 0.08 : -0.08)));
  }

  const surfaceStyle = {
    width: geometry.width,
    height: geometry.height,
    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  } satisfies CSSProperties;

  return (
    <>
      <div className={atlas.atlasToolbar}>
        <div className={atlas.levelSwitch} role="tablist" aria-label={labels.route}>
          {(["route", "step", "mechanism"] as const).map((candidate) => {
            const unavailable = candidate === "mechanism" &&
              (!effectiveStepId || !canOpenSynthesisAtlasMechanism(route, effectiveStepId));
            return (
              <button
                key={candidate}
                type="button"
                role="tab"
                aria-selected={candidate === level}
                disabled={unavailable}
                onClick={() => requestLevel(candidate)}
              >
                {labels[candidate]}
              </button>
            );
          })}
        </div>

        <div className={atlas.directionSwitch}>
          <button type="button" data-active={direction === "forward"} onClick={() => setDirection("forward")}>{labels.forward}</button>
          <button type="button" data-active={direction === "retro"} onClick={() => setDirection("retro")}>{labels.retro}</button>
        </div>

        <div className={atlas.zoomControls}>
          <button type="button" aria-label={labels.zoomOut} onClick={() => setZoom((value) => clampZoom(value - 0.1))}>−</button>
          <output>{Math.round(zoom * 100)}%</output>
          <button type="button" aria-label={labels.zoomIn} onClick={() => setZoom((value) => clampZoom(value + 0.1))}>+</button>
          <button type="button" onClick={() => { setZoom(0.54); setPan({ x: 0, y: 0 }); }}>{labels.resetView}</button>
        </div>
      </div>

      <div
        className={atlas.graphViewport}
        aria-label={labels.graphAria}
        data-dragging={dragging}
        data-route-direction={direction}
        data-atlas-level={level}
        onPointerDown={beginPan}
        onPointerMove={updatePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={handleWheel}
      >
        <div className={atlas.graphSurface} style={surfaceStyle}>
          <svg
            className={atlas.graphEdges}
            width={geometry.width}
            height={geometry.height}
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            aria-hidden="true"
          >
            <defs>
              <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            {geometry.edges.map((edge) => {
              const bend = edge.from.y === edge.to.y ? 0 : 54;
              const midX = (edge.from.x + edge.to.x) / 2;
              const path = `M ${edge.from.x} ${edge.from.y} C ${midX - bend} ${edge.from.y}, ${midX + bend} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`;
              return (
                <path
                  key={`${edge.stepId}:${edge.inputMaterialId}`}
                  d={path}
                  data-active={edge.stepId === effectiveStepId}
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}
          </svg>

          {geometry.nodes.map((node) => {
            const material = getSynthesisAtlasMaterial(route, node.materialId);
            if (!material) return null;
            const stepId = getSynthesisAtlasStepForMaterial(route, material.id, direction);
            const roleLabel = material.role === "building-block"
              ? labels.buildingBlock
              : material.role === "reagent-fragment"
                ? labels.reagentFragment
                : material.role === "intermediate"
                  ? labels.intermediate
                  : material.role === "active-parent"
                    ? labels.activeParent
                    : labels.chemicalForm;
            return (
              <button
                key={material.id}
                type="button"
                className={atlas.materialNode}
                data-active={activeMaterialIds.has(material.id)}
                data-material-role={material.role}
                style={{ left: node.x, top: node.y }}
                onClick={() => { if (stepId) selectStep(stepId); }}
              >
                <span>{roleLabel}</span>
                <MaterialCard material={material} locale={locale} className={atlas.nodeStructure} />
              </button>
            );
          })}

          {labelEdges.map((edge) => {
            const step = route.transformations.find((candidate) => candidate.id === edge.stepId);
            if (!step) return null;
            return (
              <button
                key={edge.stepId}
                type="button"
                className={atlas.stepNode}
                data-active={step.id === effectiveStepId}
                style={{ left: edge.label.x, top: edge.label.y }}
                title={`${step.reactionClass[locale]} · ${step.reagentSummary[locale]} · ${step.conditionSummary[locale]}`}
                onClick={() => selectStep(step.id)}
              >
                <b>{String(step.order).padStart(2, "0")}</b>
                <span>{step.reactionClass[locale]}</span>
                <small>{step.reagentSummary[locale]}</small>
                <em>{step.bondChanges.map((change) => change.label[locale]).join(" · ")}</em>
              </button>
            );
          })}
        </div>
        {level === "route" ? <p className={atlas.routeHint}>{labels.routeHint}</p> : null}
      </div>

      {level === "step" && activeStep ? (
        <StepDetail
          route={route}
          step={activeStep}
          direction={direction}
          locale={locale}
          presentationMode={presentationMode}
          onStepChange={setActiveStepId}
          onMechanism={() => requestLevel("mechanism")}
        />
      ) : null}

      {level === "mechanism" && activeStep ? (
        <SynthesisAtlasMechanism route={route} step={activeStep} locale={locale} />
      ) : null}

      <details className={atlas.sourceDrawer} data-source-drawer>
        <summary>
          <span>{labels.sources}</span>
          <small>{route.sourceAnchors.length}</small>
        </summary>
        <div className={atlas.sourceDrawerBody}>
          <p>{labels.sourcesIntro}</p>
          {presentationMode === "reviewer" ? (
            <section data-reviewer-only="true">
              <h3>{labels.technicalDetails}</h3>
              <dl>
                <div><dt>{labels.routeId}</dt><dd><code>{route.id}</code></dd></div>
                <div><dt>{labels.version}</dt><dd><code>{route.version}</code></dd></div>
                <div><dt>{labels.sourceGate}</dt><dd><code>{getSynthesisAtlasSourceGate(route)}</code></dd></div>
              </dl>
            </section>
          ) : null}
          <ol>
            {route.sourceAnchors.map((source) => (
              <li key={source.sourceId}>
                <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                <dl>
                  <div><dt>{labels.locator}</dt><dd>{source.locator[locale]}</dd></div>
                  <div><dt>{labels.supportScope}</dt><dd>{source.supportScope[locale]}</dd></div>
                </dl>
              </li>
            ))}
          </ol>
          <section>
            <h3>{labels.limitations}</h3>
            <ul>{route.limitations.map((item, index) => <li key={`${item.en}:${index}`}>{item[locale]}</li>)}</ul>
          </section>
          <section>
            <h3>{labels.safety}</h3>
            <p>{route.safety.note[locale]}</p>
          </section>
        </div>
      </details>

      <SynthesisAtlasChallenges key={route.id} routeId={route.id} locale={locale} />

      <div className={atlas.focusAction}>
        <button type="button" onClick={() => onOpenMoleculeFocus(route.moleculeId)}>
          {labels.open3d} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </>
  );
}

export function SynthesisAtlas({
  selectedMoleculeId,
  onSelectMolecule,
  onOpenMoleculeFocus,
  presentationMode = "student",
}: SynthesisAtlasProps) {
  const { locale } = useI18n();
  const labels = copy[locale];
  const [routeKind, setRouteKind] = useState<SynthesisAtlasRouteKind>("reported");
  const route = resolveSynthesisAtlasRoute(synthesisAtlasRoutes, selectedMoleculeId, routeKind);

  if (!route) return null;

  const sourceGate = getSynthesisAtlasSourceGate(route);
  const routePresentation = getSynthesisAtlasRoutePresentation(route);
  const reportedRoute = resolveSynthesisAtlasRoute(
    synthesisAtlasRoutes,
    selectedMoleculeId,
    "reported",
  );
  const reportedPresentation = reportedRoute
    ? getSynthesisAtlasRoutePresentation(reportedRoute)
    : "unavailable";
  const reportedLabel = reportedPresentation === "source-reported"
    ? labels.reported
    : reportedPresentation === "source-context-reconstruction"
      ? labels.sourceContextReconstruction
      : reportedPresentation === "declared-gap-reconstruction"
        ? labels.declaredGapReconstruction
        : labels.unavailableRoute;
  const sourceGateLabel = routePresentation === "source-reported"
    ? labels.sourceSupportedGate
    : routePresentation === "source-context-reconstruction"
      ? labels.sourceContextGate
      : routePresentation === "declared-gap-reconstruction"
        ? labels.declaredGapGate
        : routePresentation === "foundational-education"
          ? labels.foundational
          : labels.blockedGate;
  const routeTitle = routePresentation === "source-context-reconstruction"
    ? `${moleculeLabels[route.moleculeId] ?? route.moleculeId}: ${labels.sourceContextReconstruction}`
    : routePresentation === "declared-gap-reconstruction"
      ? `${moleculeLabels[route.moleculeId] ?? route.moleculeId}: ${labels.declaredGapReconstruction}`
      : routePresentation === "unavailable"
        ? `${moleculeLabels[route.moleculeId] ?? route.moleculeId}: ${labels.unavailableRoute}`
        : route.title[locale];

  return (
    <section
      className={atlas.atlas}
      aria-labelledby="synthesis-atlas-heading"
      data-synthesis-atlas={route.id}
      data-route-kind={route.kind}
      data-route-presentation={routePresentation}
      data-route-direction="interactive"
      data-atlas-level="route-step-mechanism"
      data-route-step-count={route.transformations.length}
    >
      <header className={atlas.hero}>
        <div>
          <span>{labels.eyebrow}</span>
          <h1 id="synthesis-atlas-heading">{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
        {presentationMode === "reviewer" ? <strong>{labels.nonOperational}</strong> : null}
      </header>

      <nav className={atlas.moleculeTabs} aria-label={labels.eyebrow}>
        {moleculeIds.map((moleculeId, index) => (
          <button
            key={moleculeId}
            type="button"
            data-active={moleculeId === route.moleculeId}
            onClick={() => {
              setRouteKind("reported");
              onSelectMolecule(moleculeId);
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{moleculeLabels[moleculeId] ?? moleculeId}</strong>
          </button>
        ))}
      </nav>

      <section className={atlas.routeIntro}>
        <div className={atlas.routeKindSwitch}>
          <button
            type="button"
            data-active={route.kind === "foundational-education"}
            onClick={() => setRouteKind("foundational-education")}
          >
            {labels.foundational}
          </button>
          <button
            type="button"
            data-active={route.kind === "reported"}
            disabled={reportedPresentation === "unavailable"}
            onClick={() => setRouteKind("reported")}
          >
            {reportedLabel}
          </button>
        </div>
        <div>
          <span data-source-gate={sourceGate}>{sourceGateLabel} · {route.transformations.length} {labels.transformations}</span>
          <h2>{routeTitle}</h2>
          <p>{route.summary[locale]}</p>
          <small>{route.startBoundary[locale]}</small>
        </div>
      </section>

      <AtlasWorkspace
        key={route.id}
        route={route}
        locale={locale}
        presentationMode={presentationMode}
        onOpenMoleculeFocus={onOpenMoleculeFocus}
      />
    </section>
  );
}
