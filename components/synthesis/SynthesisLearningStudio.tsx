"use client";

import {
  useMemo,
  useId,
  useState,
  type KeyboardEvent,
} from "react";

import { MoleculeViewer } from "@/components/molecule-viewer/MoleculeViewer";
import { SmilesStructure } from "@/components/platform/SmilesStructure";
import {
  createSynthesisLearningStudioModel,
  type SynthesisLearningMaterial,
  type SynthesisLearningRoute,
  type SynthesisLearningStep,
} from "@/lib/application/synthesis-learning-studio";
import type { SynthesisCatalogSelection } from "@/lib/application/synthesis-catalog";
import type { PublicAlphaSynthesisDraftGraph } from "@/lib/domain/public-alpha-synthesis-draft";
import { useI18n, type Locale } from "@/lib/i18n";

import styles from "./SynthesisLearningStudio.module.css";

type StudioTab = "overview" | "explorer" | "steps" | "mechanism" | "references";
type StudioMode = "student" | "reference";

export interface SynthesisLearningStudioProps {
  readonly selection: SynthesisCatalogSelection;
  readonly graphs: readonly PublicAlphaSynthesisDraftGraph[];
  readonly presentationMode?: "student" | "reviewer";
  readonly onOpenMoleculeFocus?: (moleculeId: string) => void;
}

const copy = {
  tr: {
    eyebrow: "Sentez ve 3B Öğrenme",
    title: "Yapıdan kanıta, tek öğrenme stüdyosu.",
    boundary: "Operasyonel olmayan eğitim görünümü · uzman incelemesi bekliyor",
    overview: "Genel Bakış",
    explorer: "3B Keşif",
    steps: "Sentez Basamakları",
    mechanism: "Mekanizma",
    references: "Kaynaklar",
    student: "Öğrenci Modu",
    reference: "Referans Modu",
    quality: "Rota kalite sınıfı",
    complete: "Tam öğrenme rotası",
    substantive: "Bağlı, anlamlı kısmi rota",
    fragment: "Kaynak destekli fragment rota",
    candidate: "Yalnız aday kaynak",
    none: "Destekleyici kaynak çözümlenmedi",
    coverageUnavailable: "Sentez kapsamı kullanılamıyor",
    coverageUnavailableBody: "Sentez kapsam kaydı yüklenemedi. Kaynak bulunup bulunmadığına ilişkin bilimsel bir sonuç gösterilmiyor.",
    exactIdentity: "Kesin hedef kimliği",
    targetMolecule: "Hedef molekül",
    targetParent: "Hedef ana molekül",
    targetForm: "Hedef kimyasal form",
    routes: "Rota alternatifi",
    selectedRoute: "Seçili rota",
    startingMaterial: "Başlangıç materyali",
    targetIdentity: "Hedef kimliği",
    stepCount: "Gösterilen basamak",
    completeness: "Tamamlanma durumu",
    sourceType: "Kaynak türü",
    sourceYear: "Kaynak yılı",
    unresolvedYear: "Çözümlenmedi",
    resolvedSteps: "Gösterilebilir segment",
    gaps: "Açık boşluk",
    review: "Bilimsel inceleme",
    pending: "Uzman incelemesi bekliyor",
    candidateBody: "Kaynaklar belirlendi; rota çıkarımı henüz çözümlenmedi.",
    noneBody: "Kaydedilen araştırma kapsamında destekleyici kaynak çözümlenmedi.",
    publicDraft: "KAYNAK DESTEKLİ TASLAK — UZMAN İNCELEMESİ BEKLİYOR",
    notVerified: "Reviewed veya verified değildir. Uygulanabilirlik ve eksiksizlik doğrulanmamıştır.",
    assuranceBoundary: "Doğruluk, eksiksizlik, uygulanabilirlik ve yeniden üretilebilirlik uzman tarafından doğrulanmamıştır.",
    exactTarget3d: "Kesin hedefin katalog 3B konformeri",
    target3dBoundary: "Bu 3B görünüm exact hedef kimliğine aittir. Kaynak ara ürününe aitmiş gibi gösterilmez.",
    openSpatial: "Molekülü 3B odakta aç",
    routePicker: "Kaynak segmenti alternatifleri",
    route: "Taslak alternatif",
    stepPicker: "Rota basamakları",
    segment: "Kaynak segmenti",
    sourceOrder: "Kaynak reaksiyon sırası çözümlenmedi",
    teachingOrder: "Öğrenme görünümü sırası",
    inputs: "Kaynak girdileri",
    output: "Kaynak çıktısı",
    unresolvedTransformation: "Segment sırası, reaksiyon sınıfı ve bağ değişimleri henüz çözümlenmedi.",
    explicitGap: "Üst-akış boşluğu açık bırakıldı",
    reactionClass: "Reaksiyon sınıfı",
    routeType: "Rota türü",
    evidenceState: "Kanıt durumu",
    unresolvedStatus: "Çözümleme durumu",
    whatChanged: "Bu adımda ne değişti?",
    formedBond: "Oluşan bağ",
    brokenBond: "Kırılan bağ",
    changedGroup: "Değişen fonksiyonel grup",
    atomContinuity: "Atom sürekliliği",
    stereoConsequence: "Stereokimyasal sonuç",
    inspectProduct3d: "Bu ürünü 3B’de incele",
    conformerUnavailable: "3B konformer kullanılamıyor",
    targetContext: "Exact hedef 2B ↔ 3B bağlamı",
    intermediate3dMissing: "Bu kaynak girdisi veya ara ürün için kimliği eşleşen bir 3B konformer yok; yalnız bağımsız 2B çizim gösterilir.",
    mechanismNotResolved: "MEKANİZMA ÇÖZÜMLENMEDİ",
    mechanismBoundary: "Kaynak destekli bir dönüşüm segmenti tek başına elektron-itme mekanizmasını kanıtlamaz.",
    reactionFamily: "Reaksiyon ailesi",
    nucleophile: "Nükleofil",
    electrophile: "Elektrofil",
    leavingGroup: "Ayrılan grup",
    bondChange: "Bağ oluşumu / kırılması",
    functionalChange: "Fonksiyonel grup dönüşümü",
    stereoOutcome: "Rejiyo / stereokimyasal sonuç",
    unresolved: "Çözümlenmedi",
    misconception: "Yaygın yanılgı",
    misconceptionBody: "Bir reaktan ve ürün çiftinin bulunması, belirli bir mekanizmanın kaynakta raporlandığı anlamına gelmez.",
    exactLocator: "Kesin kaynak konumu",
    openSource: "ORD kaydını aç",
    license: "Lisans / yeniden kullanım",
    retrieved: "Kayıt tarihi",
    sourceScope: "Kaynak desteği",
    identityScope: "Kimlik kapsamı",
    formScope: "Form kapsamı",
    noReferences: "Bu kimlik için gösterilebilir exact kaynak konumu henüz çözümlenmedi.",
    technicalIds: "Teknik kayıt kimlikleri",
    rawIdentity: "Katalog kimliği",
    noRouteTitle: "Rota grafiği henüz kurulamadı",
  },
  en: {
    eyebrow: "3D & Synthesis Learning",
    title: "Structure and evidence in one learning studio.",
    boundary: "Non-operational teaching view · expert review pending",
    overview: "Overview",
    explorer: "3D Explorer",
    steps: "Synthesis Steps",
    mechanism: "Mechanism",
    references: "References",
    student: "Student Mode",
    reference: "Reference Mode",
    quality: "Route quality class",
    complete: "Complete learning route",
    substantive: "Connected substantive partial route",
    fragment: "Source-supported fragment route",
    candidate: "Candidate sources only",
    none: "No supporting source resolved",
    coverageUnavailable: "Synthesis coverage unavailable",
    coverageUnavailableBody: "The synthesis coverage record could not be loaded. No scientific conclusion about source availability is shown.",
    exactIdentity: "Exact target identity",
    targetMolecule: "Target molecule",
    targetParent: "Target parent molecule",
    targetForm: "Target chemical form",
    routes: "Route alternatives",
    selectedRoute: "Selected route",
    startingMaterial: "Starting material",
    targetIdentity: "Target identity",
    stepCount: "Displayed steps",
    completeness: "Completeness",
    sourceType: "Source type",
    sourceYear: "Source year",
    unresolvedYear: "Unresolved",
    resolvedSteps: "Displayable segments",
    gaps: "Explicit gaps",
    review: "Scientific review",
    pending: "Expert review pending",
    candidateBody: "Sources identified; route extraction not yet resolved.",
    noneBody: "No supporting source was resolved in the recorded search scope.",
    publicDraft: "SOURCE-SUPPORTED DRAFT — EXPERT REVIEW PENDING",
    notVerified: "This is not reviewed or verified. Applicability and completeness remain unverified.",
    assuranceBoundary: "Accuracy, completeness, applicability, and reproducibility have not been expert-verified.",
    exactTarget3d: "Catalog 3D conformer of the exact target",
    target3dBoundary: "This 3D view belongs to the exact target identity. It is never presented as a source intermediate.",
    openSpatial: "Open molecule in 3D focus",
    routePicker: "Source-segment alternatives",
    route: "Draft alternative",
    stepPicker: "Route steps",
    segment: "Source segment",
    sourceOrder: "Source reaction order unresolved",
    teachingOrder: "Learning-view position",
    inputs: "Source inputs",
    output: "Source output",
    unresolvedTransformation: "Segment order, reaction class, and bond changes remain unresolved.",
    explicitGap: "Upstream gap remains explicit",
    reactionClass: "Reaction class",
    routeType: "Route type",
    evidenceState: "Evidence state",
    unresolvedStatus: "Resolution state",
    whatChanged: "What changed in this step?",
    formedBond: "Formed bond",
    brokenBond: "Broken bond",
    changedGroup: "Changed functional group",
    atomContinuity: "Atom continuity",
    stereoConsequence: "Stereochemical consequence",
    inspectProduct3d: "Inspect this product in 3D",
    conformerUnavailable: "3D conformer unavailable",
    targetContext: "Exact-target 2D ↔ 3D context",
    intermediate3dMissing: "No identity-matched 3D conformer exists for this source input or intermediate; only an independent 2D redraw is shown.",
    mechanismNotResolved: "MECHANISM NOT RESOLVED",
    mechanismBoundary: "A source-backed transformation segment does not by itself establish an electron-pushing mechanism.",
    reactionFamily: "Reaction family",
    nucleophile: "Nucleophile",
    electrophile: "Electrophile",
    leavingGroup: "Leaving group",
    bondChange: "Bond formation / cleavage",
    functionalChange: "Functional-group transformation",
    stereoOutcome: "Regio / stereochemical outcome",
    unresolved: "Unresolved",
    misconception: "Common misconception",
    misconceptionBody: "Finding a reactant/product pair does not mean a particular mechanism was reported by the source.",
    exactLocator: "Exact source locator",
    openSource: "Open ORD record",
    license: "License / reuse",
    retrieved: "Recorded",
    sourceScope: "Source support",
    identityScope: "Identity scope",
    formScope: "Form scope",
    noReferences: "No displayable exact source locator has yet been resolved for this identity.",
    technicalIds: "Technical record identifiers",
    rawIdentity: "Catalog identity",
    noRouteTitle: "A route graph has not yet been assembled",
  },
} as const;

const qualityLabel = (
  quality: ReturnType<typeof createSynthesisLearningStudioModel>["quality"],
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (quality === "complete_learning_route") return labels.complete;
  if (quality === "substantive_partial_route") return labels.substantive;
  if (quality === "fragmentary_route") return labels.fragment;
  if (quality === "candidate_only") return labels.candidate;
  if (quality === "coverage_unavailable") return labels.coverageUnavailable;
  return labels.none;
};

const targetLabel = (
  target: ReturnType<typeof createSynthesisLearningStudioModel>["targetTerminology"],
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (target === "target_parent_molecule") return labels.targetParent;
  if (target === "target_chemical_form") return labels.targetForm;
  return labels.targetMolecule;
};

const routeName = (route: SynthesisLearningRoute, index: number, locale: Locale) =>
  `${copy[locale].route} ${index + 1}`;

function moveTab(
  event: KeyboardEvent<HTMLButtonElement>,
  ids: readonly string[],
  currentId: string,
  select: (id: string) => void,
) {
  const currentIndex = Math.max(0, ids.indexOf(currentId));
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % ids.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + ids.length) % ids.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = ids.length - 1;
  else return;
  event.preventDefault();
  select(ids[nextIndex] ?? currentId);
  const parent = event.currentTarget.parentElement;
  window.requestAnimationFrame(() => {
    parent?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  });
}

function MaterialCard({
  material,
  heading,
  locale,
}: {
  readonly material: SynthesisLearningMaterial;
  readonly heading: string;
  readonly locale: Locale;
}) {
  return (
    <article className={styles.materialCard} data-material-role={material.role}>
      <span>{heading}</span>
      <SmilesStructure
        className={styles.smiles}
        smiles={material.smiles}
        label={`${heading}: ${material.label}`}
      />
      <strong>{material.label}</strong>
      <small>{material.inchiKey}</small>
      {material.threeD === "unavailable" ? (
        <p>{copy[locale].intermediate3dMissing}</p>
      ) : null}
    </article>
  );
}

function TargetViewer({
  selection,
  locale,
  className,
}: {
  readonly selection: SynthesisCatalogSelection;
  readonly locale: Locale;
  readonly className?: string;
}) {
  const labels = copy[locale];
  return (
    <div className={[styles.targetViewer, className].filter(Boolean).join(" ")}>
      <div className={styles.targetViewerIntro}>
        <span>{labels.targetContext}</span>
        <strong>{labels.exactTarget3d}</strong>
        <p>{labels.target3dBoundary}</p>
      </div>
      <MoleculeViewer
        className={styles.viewer}
        structureUrl={selection.structures.threeD.publicPath}
        twoDStructureUrl={selection.structures.twoD.publicPath}
        moleculeName={selection.preferredName}
        expectedPubChemCid={selection.pubChemCid}
        sourceLabel="PubChem 3D SDF"
        originLabel="computed-3d-conformer"
        sourceHref={selection.structures.threeD.sourceUrl}
        twoDSourceLabel="PubChem 2D SDF"
        twoDOriginLabel="canonical-2d-record"
        twoDSourceHref={selection.structures.twoD.sourceUrl}
        initialDimension="2d"
        showHydrogensInitially={false}
      />
    </div>
  );
}

function StepPanel({
  id,
  labelledBy,
  step,
  route,
  selection,
  locale,
  onOpenExplorer,
}: {
  readonly id: string;
  readonly labelledBy: string;
  readonly step: SynthesisLearningStep;
  readonly route: SynthesisLearningRoute;
  readonly selection: SynthesisCatalogSelection;
  readonly locale: Locale;
  readonly onOpenExplorer: () => void;
}) {
  const labels = copy[locale];
  const exactTargetOutput = step.outputs.some(
    (material) => material.role === "exact_target" && material.inchiKey === selection.inchiKey,
  );
  return (
    <section
      id={id}
      className={styles.stepPanel}
      role="tabpanel"
      aria-labelledby={labelledBy}
      data-synthesis-step-panel={step.id}
      data-selected="true"
      data-source-reaction-order="unresolved"
    >
      <header className={styles.stepHeader}>
        <div>
          <span>{labels.teachingOrder} {step.displayOrder}</span>
          <h3>{labels.segment} {String(step.displayOrder).padStart(2, "0")}</h3>
        </div>
        <strong>{labels.sourceOrder}</strong>
      </header>
      <div className={styles.reactionCanvas}>
        <div className={styles.materials}>
          {step.inputs.map((material) => (
            <MaterialCard key={material.id} material={material} heading={labels.inputs} locale={locale} />
          ))}
        </div>
        <div className={styles.reactionArrow} aria-label={labels.unresolvedTransformation}>
          <span aria-hidden="true">→</span>
          <strong>{labels.unresolvedTransformation}</strong>
        </div>
        <div className={styles.materials}>
          {step.outputs.map((material) => (
            <MaterialCard key={material.id} material={material} heading={labels.output} locale={locale} />
          ))}
        </div>
      </div>
      <dl className={styles.stepFacts}>
        <div><dt>{labels.reactionClass}</dt><dd>{step.reactionClass}</dd></div>
        <div><dt>{labels.routeType}</dt><dd>{route.routeType.replaceAll("_", " ")}</dd></div>
        <div><dt>{labels.evidenceState}</dt><dd>{step.evidenceState.replaceAll("_", " ")}</dd></div>
        <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
        <div><dt>{labels.unresolvedStatus}</dt><dd>{labels.unresolved}</dd></div>
      </dl>
      <section className={styles.changeLedger}>
        <header>
          <h4>{labels.whatChanged}</h4>
          <button type="button" disabled={!exactTargetOutput} onClick={onOpenExplorer}>
            {exactTargetOutput ? labels.inspectProduct3d : labels.conformerUnavailable}
          </button>
        </header>
        <dl>
          {[
            labels.formedBond,
            labels.brokenBond,
            labels.changedGroup,
            labels.atomContinuity,
            labels.stereoConsequence,
          ].map((label) => <div key={label}><dt>{label}</dt><dd>{labels.unresolved}</dd></div>)}
        </dl>
      </section>
      <aside className={styles.unresolvedMechanism} data-mechanism-state="unresolved">
        <strong>{labels.mechanismNotResolved}</strong>
        <p>{labels.mechanismBoundary}</p>
      </aside>
      <TargetViewer selection={selection} locale={locale} className={styles.stepTargetViewer} />
      <footer className={styles.inlineReference}>
        <div>
          <span>{labels.exactLocator}</span>
          <code>{step.reference.locator}</code>
        </div>
        <a href={step.reference.url} target="_blank" rel="noreferrer">
          {labels.openSource} <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </section>
  );
}

export function SynthesisLearningStudio({
  selection,
  graphs,
  presentationMode = "student",
  onOpenMoleculeFocus,
}: SynthesisLearningStudioProps) {
  const { locale } = useI18n();
  const accessibilityId = useId().replaceAll(":", "");
  const labels = copy[locale];
  const model = useMemo(
    () => createSynthesisLearningStudioModel(selection, graphs),
    [graphs, selection],
  );
  const [activeTab, setActiveTab] = useState<StudioTab>(
    model.routes.length > 0 ? "steps" : "overview",
  );
  const [mode, setMode] = useState<StudioMode>(
    presentationMode === "reviewer" ? "reference" : "student",
  );
  const [routeId, setRouteId] = useState(model.routes[0]?.id ?? "");
  const selectedRoute = model.routes.find((route) => route.id === routeId) ?? model.routes[0] ?? null;
  const [stepId, setStepId] = useState(selectedRoute?.steps[0]?.id ?? "");
  const selectedStep = selectedRoute?.steps.find((step) => step.id === stepId)
    ?? selectedRoute?.steps[0]
    ?? null;
  const selectedRouteIndex = selectedRoute ? model.routes.indexOf(selectedRoute) : -1;
  const selectedStepIndex = selectedRoute && selectedStep
    ? selectedRoute.steps.indexOf(selectedStep)
    : -1;
  const routePanelId = `${accessibilityId}-route-panel`;
  const routeTabId = (index: number) => `${accessibilityId}-route-tab-${index}`;
  const stepPanelId = `${accessibilityId}-step-panel`;
  const stepTabId = (index: number) => `${accessibilityId}-step-tab-${index}`;

  const references = useMemo(() => {
    const byLocator = new Map<string, SynthesisLearningStep["reference"]>();
    for (const route of model.routes) {
      for (const step of route.steps) byLocator.set(step.reference.locator, step.reference);
    }
    return [...byLocator.values()];
  }, [model.routes]);
  const tabs: readonly { readonly id: StudioTab; readonly label: string }[] = [
    { id: "overview", label: labels.overview },
    { id: "explorer", label: labels.explorer },
    { id: "steps", label: labels.steps },
    { id: "mechanism", label: labels.mechanism },
    { id: "references", label: labels.references },
  ];
  const statusBody = model.quality === "coverage_unavailable"
    ? labels.coverageUnavailableBody
    : model.quality === "candidate_only"
      ? labels.candidateBody
      : labels.noneBody;

  return (
    <section
      className={styles.studio}
      data-synthesis-learning-studio="true"
      data-synthesis-catalog-coverage={selection.catalogEntityId}
      data-coverage-load-state={selection.coverageLoadState}
      data-coverage-surface-state={model.surfaceState}
      data-route-quality={model.quality}
      data-total-unresolved-gap-count={model.unresolvedGapCount}
      data-review-state={model.reviewStatus}
      data-verified-scientific-claim="false"
      data-operational-details="excluded"
    >
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{labels.eyebrow}</span>
          <h2>{labels.title}</h2>
          <p>{labels.boundary}</p>
          <div className={styles.heroIdentity}>
            <span>{labels.exactIdentity}</span>
            <strong>{selection.preferredName}</strong>
            <code>{selection.inchiKey}</code>
          </div>
        </div>
        <div className={styles.modeSwitch} role="group" aria-label={labels.reference}>
          <button type="button" aria-pressed={mode === "student"} onClick={() => setMode("student")}>{labels.student}</button>
          <button type="button" aria-pressed={mode === "reference"} onClick={() => setMode("reference")}>{labels.reference}</button>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={labels.eyebrow}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`synthesis-studio-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`synthesis-studio-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => moveTab(event, tabs.map((item) => item.id), activeTab, (id) => setActiveTab(id as StudioTab))}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        id="synthesis-studio-panel-overview"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-overview"
        hidden={activeTab !== "overview"}
      >
        <div className={styles.overviewGrid}>
          <article className={styles.identityCard}>
            <span>{targetLabel(model.targetTerminology, locale)}</span>
            <h3>{selection.preferredName}</h3>
            <p>{selection.molecularFormula} · CID {selection.pubChemCid}</p>
            <dl>
              <div><dt>{labels.exactIdentity}</dt><dd><code>{selection.inchiKey}</code></dd></div>
              <div><dt>{labels.formScope}</dt><dd>{model.targetIdentity.chemicalFormKind}</dd></div>
            </dl>
            {mode === "reference" ? (
              <details className={styles.technical} open>
                <summary>{labels.technicalIds}</summary>
                <code>{labels.rawIdentity}: {selection.catalogEntityId}</code>
              </details>
            ) : null}
          </article>
          <article className={styles.qualityCard}>
            <span>{labels.quality}</span>
            <h3>{qualityLabel(model.quality, locale)}</h3>
            {model.routes.length > 0 ? (
              <p><strong>{labels.publicDraft}</strong><br />{labels.notVerified}</p>
            ) : (
              <p><strong>{labels.noRouteTitle}</strong><br />{statusBody}</p>
            )}
            <p>{labels.assuranceBoundary}</p>
            <dl>
              <div><dt>{labels.routes}</dt><dd>{model.knownRouteCount}</dd></div>
              <div><dt>{labels.selectedRoute}</dt><dd>{selectedRoute ? routeName(selectedRoute, model.routes.indexOf(selectedRoute), locale) : labels.unresolved}</dd></div>
              <div><dt>{labels.resolvedSteps}</dt><dd>{model.resolvedStepCount}</dd></div>
              <div><dt>{labels.gaps}</dt><dd>{model.unresolvedGapCount}</dd></div>
              <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
            </dl>
            {references[0] ? (
              <a href={references[0].url} target="_blank" rel="noreferrer">
                {labels.openSource} <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </article>
        </div>
      </section>

      <section
        id="synthesis-studio-panel-explorer"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-explorer"
        hidden={activeTab !== "explorer"}
      >
        <TargetViewer selection={selection} locale={locale} />
      </section>

      <section
        id="synthesis-studio-panel-steps"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-steps"
        hidden={activeTab !== "steps"}
      >
        {selectedRoute ? (
          <>
            <div className={styles.routePicker} role="tablist" aria-label={labels.routePicker}>
              {model.routes.map((route, index) => (
                <button
                  key={route.id}
                  id={routeTabId(index)}
                  type="button"
                  role="tab"
                  aria-controls={routePanelId}
                  data-route-id={route.id}
                  aria-selected={route.id === selectedRoute.id}
                  tabIndex={route.id === selectedRoute.id ? 0 : -1}
                  onClick={() => {
                    setRouteId(route.id);
                    setStepId(route.steps[0]?.id ?? "");
                  }}
                  onKeyDown={(event) => moveTab(event, model.routes.map((item) => item.id), selectedRoute.id, (id) => {
                    const nextRoute = model.routes.find((item) => item.id === id);
                    setRouteId(id);
                    setStepId(nextRoute?.steps[0]?.id ?? "");
                  })}
                >
                  <strong>{routeName(route, index, locale)}</strong>
                  <span>{route.routeType.replaceAll("_", " ")} · {route.steps.length}</span>
                </button>
              ))}
            </div>
            <section
              id={routePanelId}
              role="tabpanel"
              aria-labelledby={routeTabId(selectedRouteIndex)}
            >
              <dl className={styles.routeFacts}>
                <div><dt>{labels.routeType}</dt><dd>{selectedRoute.routeType.replaceAll("_", " ")}</dd></div>
                <div><dt>{labels.startingMaterial}</dt><dd>{selectedRoute.startingMaterialLabel}</dd></div>
                <div><dt>{labels.targetIdentity}</dt><dd><code>{selection.inchiKey}</code></dd></div>
                <div><dt>{labels.stepCount}</dt><dd>{selectedRoute.steps.length}</dd></div>
                <div><dt>{labels.completeness}</dt><dd>{selectedRoute.completeness.replaceAll("_", " ")}</dd></div>
                <div><dt>{labels.sourceType}</dt><dd>ORD</dd></div>
                <div><dt>{labels.sourceYear}</dt><dd>{selectedRoute.sourceYear ?? labels.unresolvedYear}</dd></div>
                <div><dt>{labels.explicitGap}</dt><dd>{selectedRoute.unresolvedGapCount}</dd></div>
                <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
                <div><dt>{labels.sourceOrder}</dt><dd>{labels.unresolved}</dd></div>
              </dl>
              <div className={styles.stepPicker} role="tablist" aria-label={labels.stepPicker}>
                {selectedRoute.steps.map((step, index) => (
                  <button
                    key={step.id}
                    id={stepTabId(index)}
                    type="button"
                    role="tab"
                    aria-controls={stepPanelId}
                    aria-selected={step.id === selectedStep?.id}
                    tabIndex={step.id === selectedStep?.id ? 0 : -1}
                    onClick={() => setStepId(step.id)}
                    onKeyDown={(event) => moveTab(event, selectedRoute.steps.map((item) => item.id), selectedStep?.id ?? "", setStepId)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.relationship === "target_forming_segment" ? targetLabel(model.targetTerminology, locale) : labels.segment}</strong>
                  </button>
                ))}
              </div>
              {selectedStep ? (
                <StepPanel
                  id={stepPanelId}
                  labelledBy={stepTabId(selectedStepIndex)}
                  step={selectedStep}
                  route={selectedRoute}
                  selection={selection}
                  locale={locale}
                  onOpenExplorer={() => setActiveTab("explorer")}
                />
              ) : null}
            </section>
          </>
        ) : (
          <article className={styles.emptyState}>
            <span>{labels.quality}</span>
            <h3>{labels.noRouteTitle}</h3>
            <p>{statusBody}</p>
          </article>
        )}
      </section>

      <section
        id="synthesis-studio-panel-mechanism"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-mechanism"
        hidden={activeTab !== "mechanism"}
      >
        {model.routes.length > 0 ? (
          <article className={styles.mechanismPanel} data-mechanism-state="unresolved">
            <header>
              <span>{labels.mechanism}</span>
              <h3>{labels.mechanismNotResolved}</h3>
              <p>{labels.mechanismBoundary}</p>
            </header>
            <dl>
              {[labels.reactionFamily, labels.nucleophile, labels.electrophile, labels.leavingGroup, labels.bondChange, labels.functionalChange, labels.stereoOutcome].map((label) => (
                <div key={label}><dt>{label}</dt><dd>{labels.unresolved}</dd></div>
              ))}
            </dl>
            <aside><strong>{labels.misconception}</strong><p>{labels.misconceptionBody}</p></aside>
          </article>
        ) : (
          <article className={styles.emptyState}>
            <span>{labels.mechanism}</span>
            <h3>{labels.noRouteTitle}</h3>
            <p>{statusBody}</p>
          </article>
        )}
      </section>

      <section
        id="synthesis-studio-panel-references"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="synthesis-studio-tab-references"
        hidden={activeTab !== "references"}
      >
        {references.length > 0 ? (
          <ol className={styles.referenceList}>
            {references.map((reference) => (
              <li key={reference.id}>
                <div>
                  <span>ORD</span>
                  <strong>{reference.label}</strong>
                  <code>{labels.exactLocator}: {reference.locator}</code>
                </div>
                <dl>
                  <div><dt>{labels.license}</dt><dd>{reference.licenseState}</dd></div>
                  <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
                  <div><dt>{labels.retrieved}</dt><dd>{reference.retrievedAt.slice(0, 10)}</dd></div>
                </dl>
                <a href={reference.url} target="_blank" rel="noreferrer">{labels.openSource} <span aria-hidden="true">↗</span></a>
                {mode === "reference" ? <code>{reference.id}</code> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.noReferences}>
            {model.quality === "coverage_unavailable"
              ? labels.coverageUnavailableBody
              : labels.noReferences}
          </p>
        )}
      </section>

      <footer className={styles.footer}>
        <dl>
          <div><dt>{labels.sourceScope}</dt><dd>{model.sourceStatus}</dd></div>
          <div><dt>{labels.identityScope}</dt><dd>{labels.exactIdentity}</dd></div>
          <div><dt>{labels.review}</dt><dd>{labels.pending}</dd></div>
        </dl>
        {onOpenMoleculeFocus ? (
          <button type="button" onClick={() => onOpenMoleculeFocus(selection.catalogEntityId)}>
            {labels.openSpatial} <span aria-hidden="true">↗</span>
          </button>
        ) : null}
      </footer>
    </section>
  );
}

export default SynthesisLearningStudio;
