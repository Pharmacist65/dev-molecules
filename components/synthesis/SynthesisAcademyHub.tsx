"use client";

import {
  lazy,
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  resolveSynthesisCurriculumSelection,
  synthesisCurriculumReadiness,
  type SynthesisFlagshipReadiness,
} from "@/lib/application/synthesis-curriculum";
import { useI18n, type Locale } from "@/lib/i18n";

import styles from "./SynthesisAcademyHub.module.css";

const LazySynthesisAtlas = lazy(async () => {
  const atlasComponent = await import("@/components/platform/SynthesisAtlas");
  return { default: atlasComponent.SynthesisAtlas };
});

export type SynthesisAcademyHubView = "curriculum" | "atlas";

export interface SynthesisAcademyHubProps {
  readonly locale?: Locale;
  readonly selectedMoleculeId?: string;
  readonly initialMoleculeId?: string;
  readonly initialView?: SynthesisAcademyHubView;
  readonly presentationMode?: "student" | "reviewer";
  readonly onSelectMolecule?: (moleculeId: string) => void;
  readonly onOpenMoleculeFocus: (moleculeId: string) => void;
  readonly onOpenDrugDossier?: (moleculeId: string) => void;
  readonly onBackToAcademy?: () => void;
  readonly className?: string;
}

const copy = {
  tr: {
    eyebrow: "Academy · Sentez",
    title: "Bağların nasıl kurulduğunu, kanıt sınırlarıyla öğren.",
    description: "Kaynaklı rotaları, eğitsel rekonstrüksiyonları ve mekanizma katmanlarını birbirine karıştırmadan inceleyen derin öğrenme alanı.",
    boundary: "Eğitim görünümü · miktar, ölçek, ayrıntılı work-up veya üretim protokolü içermez",
    back: "Academy’ye dön",
    curriculum: "Müfredat",
    atlas: "Rota laboratuvarı",
    curriculumHint: "Gerçek kapsam ve 12 ilaçlık yayın hedefi",
    atlasHint: "Rota → basamak → mekanizma",
    coverage: "Deep Learning kapsamı",
    coverageTitle: "Kaynak kapısından geçen {available} ilaç var; {planned} hedef yuvası henüz seçilmedi.",
    coverageBody: "Bu tablo bir katalog tamlık iddiası değildir. Yalnız kaynak kapısından geçen mevcut rotalar açılır; planlanan yuvalara isim veya bilimsel içerik uydurulmaz.",
    curatedDrugs: "kaynak kapılı ilaç",
    routes: "rota",
    transformations: "dönüşüm",
    mechanisms: "mekanizma kaydı",
    sourceReported: "doğrudan bildirilen rota",
    flagshipSet: "12 amiral gemisi hedefi",
    flagshipIntro: "Mevcut kürasyon önce gelir; çeşitlilik hedefleri yalnız normalize veriyle ölçülür.",
    available: "Rota mevcut",
    blocked: "Kaynak kapısı kapalı",
    planned: "Planlandı · yapılandırılmadı",
    routeCount: "Açık rota",
    stepCount: "Dönüşüm",
    mechanismCount: "Mekanizma",
    openRoute: "Rota dersini aç",
    openDossier: "İlaç dosyasını aç",
    reportedSource: "Kaynakta bildirilen",
    reportedContext: "Kaynak bağlamlı rekonstrüksiyon",
    reportedGap: "Kanıt boşluğu açıklanmış",
    reportedUnavailable: "Bildirilen rota kapalı",
    noReported: "Bildirilen rota yok",
    readiness: "Yayın ölçütleri",
    target: "Hedef",
    notMeasured: "Ölçülmedi",
    inProgress: "Devam ediyor",
    complete: "Tamamlandı",
    sourceRules: "Kaynak kapısı",
    sourceRulesIntro: "Rota türü ile kanıt durumu aynı şey değildir.",
    reportedRule: "Reported Route",
    teachingRule: "Teaching Route",
    blockedRule: "Kapalı rota",
    reviewerLedger: "Reviewer kaynak özeti",
    supported: "doğrudan destekli",
    context: "bağlam destekli",
    partial: "açık boşluklu",
    sourceBlocked: "kapalı",
    labTitle: "Etkileşimli Synthesis Atlas",
    labDescription: "Bir ilacı seç, ileri veya retrosentetik yönde ilerle; yalnız kürate edilmiş mekanizma katmanlarını aç.",
    changeSelection: "Müfredat tablosuna dön",
    loading: "Synthesis Atlas yükleniyor…",
    unavailable: "Kaynak kapısından geçen bir rota yok.",
  },
  en: {
    eyebrow: "Academy · Synthesis",
    title: "Learn how bonds are made, with the evidence boundary intact.",
    description: "A deep-learning space that keeps source-reported routes, educational reconstructions, and mechanism layers distinct.",
    boundary: "Teaching view · no quantities, scale, detailed work-up, or manufacturing protocol",
    back: "Back to Academy",
    curriculum: "Curriculum",
    atlas: "Route lab",
    curriculumHint: "Actual coverage and the 12-drug publication target",
    atlasHint: "Route → step → mechanism",
    coverage: "Deep Learning coverage",
    coverageTitle: "{available} drugs pass the source gate; {planned} target slots remain unassigned.",
    coverageBody: "This table is not a catalog-completeness claim. Only existing routes that pass the source gate can open; planned slots receive no invented name or scientific content.",
    curatedDrugs: "source-gated drugs",
    routes: "routes",
    transformations: "transformations",
    mechanisms: "mechanism records",
    sourceReported: "directly reported routes",
    flagshipSet: "12-flagship target",
    flagshipIntro: "Existing curation comes first; diversity goals are measured only from normalized data.",
    available: "Route available",
    blocked: "Source gate closed",
    planned: "Planned · unconfigured",
    routeCount: "Open routes",
    stepCount: "Transformations",
    mechanismCount: "Mechanisms",
    openRoute: "Open route lesson",
    openDossier: "Open drug dossier",
    reportedSource: "Source-reported",
    reportedContext: "Source-context reconstruction",
    reportedGap: "Declared evidence gap",
    reportedUnavailable: "Reported route closed",
    noReported: "No reported route",
    readiness: "Publication criteria",
    target: "Target",
    notMeasured: "Not measured",
    inProgress: "In progress",
    complete: "Complete",
    sourceRules: "Source gate",
    sourceRulesIntro: "Route kind and evidence state are not the same thing.",
    reportedRule: "Reported Route",
    teachingRule: "Teaching Route",
    blockedRule: "Closed route",
    reviewerLedger: "Reviewer source summary",
    supported: "directly supported",
    context: "context supported",
    partial: "declared gap",
    sourceBlocked: "closed",
    labTitle: "Interactive Synthesis Atlas",
    labDescription: "Choose a drug, move forward or retrosynthetically, and open only curated mechanism layers.",
    changeSelection: "Back to curriculum table",
    loading: "Loading Synthesis Atlas…",
    unavailable: "No route currently passes the source gate.",
  },
} as const;

const presentationLabel = (
  entry: SynthesisFlagshipReadiness,
  locale: Locale,
): string => {
  const labels = copy[locale];
  switch (entry.reportedRoutePresentation) {
    case "source-reported":
      return labels.reportedSource;
    case "source-context-reconstruction":
      return labels.reportedContext;
    case "declared-gap-reconstruction":
      return labels.reportedGap;
    case "unavailable":
      return labels.reportedUnavailable;
    default:
      return labels.noReported;
  }
};

const statusLabel = (
  entry: SynthesisFlagshipReadiness,
  locale: Locale,
): string => {
  const labels = copy[locale];
  if (entry.status === "curated-route-available") return labels.available;
  if (entry.status === "blocked-source-gate") return labels.blocked;
  return labels.planned;
};

const joinClassNames = (...values: readonly (string | undefined)[]) =>
  values.filter(Boolean).join(" ");

const interpolate = (
  template: string,
  values: Readonly<Record<string, string | number>>,
) => Object.entries(values).reduce(
  (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
  template,
);

export function SynthesisAcademyHub({
  locale: localeOverride,
  selectedMoleculeId: controlledMoleculeId,
  initialMoleculeId,
  initialView = "curriculum",
  presentationMode = "student",
  onSelectMolecule,
  onOpenMoleculeFocus,
  onOpenDrugDossier,
  onBackToAcademy,
  className,
}: SynthesisAcademyHubProps) {
  const { locale: contextLocale } = useI18n();
  const locale = localeOverride ?? contextLocale;
  const labels = copy[locale];
  const initialSelection = useMemo(
    () => resolveSynthesisCurriculumSelection(initialMoleculeId),
    [initialMoleculeId],
  );
  const [uncontrolledMoleculeId, setUncontrolledMoleculeId] = useState(
    initialSelection.moleculeId,
  );
  const [view, setView] = useState<SynthesisAcademyHubView>(initialView);
  const selection = resolveSynthesisCurriculumSelection(
    controlledMoleculeId ?? uncontrolledMoleculeId,
  );
  const selectedMoleculeId = selection.moleculeId;

  function selectMolecule(moleculeId: string) {
    setUncontrolledMoleculeId(moleculeId);
    onSelectMolecule?.(moleculeId);
  }

  function openRoute(moleculeId: string) {
    selectMolecule(moleculeId);
    setView("atlas");
  }

  return (
    <section
      className={joinClassNames(styles.hub, className)}
      data-synthesis-academy="phase-6"
      data-curated-drugs={synthesisCurriculumReadiness.availableDrugCount}
      data-target-drugs={synthesisCurriculumReadiness.targetDrugCount}
    >
      <header className={styles.hero}>
        <div className={styles.heroTopline}>
          {onBackToAcademy ? (
            <button type="button" className={styles.backButton} onClick={onBackToAcademy}>
              <span aria-hidden="true">←</span> {labels.back}
            </button>
          ) : <span />}
          <span className={styles.boundary}>{labels.boundary}</span>
        </div>
        <div className={styles.heroBody}>
          <div>
            <span className={styles.eyebrow}>{labels.eyebrow}</span>
            <h1>{labels.title}</h1>
            <p>{labels.description}</p>
          </div>
          <div className={styles.targetDial} aria-label={`${synthesisCurriculumReadiness.availableDrugCount} / ${synthesisCurriculumReadiness.targetDrugCount} ${labels.curatedDrugs}`}>
            <strong>{String(synthesisCurriculumReadiness.availableDrugCount).padStart(2, "0")}</strong>
            <span>/ {synthesisCurriculumReadiness.targetDrugCount}</span>
            <small>{labels.curatedDrugs}</small>
          </div>
        </div>
      </header>

      <nav className={styles.viewTabs} aria-label={labels.eyebrow}>
        <button
          type="button"
          role="tab"
          aria-selected={view === "curriculum"}
          aria-controls="synthesis-curriculum-panel"
          onClick={() => setView("curriculum")}
        >
          <strong>{labels.curriculum}</strong>
          <span>{labels.curriculumHint}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "atlas"}
          aria-controls="synthesis-atlas-panel"
          disabled={!selectedMoleculeId}
          onClick={() => setView("atlas")}
        >
          <strong>{labels.atlas}</strong>
          <span>{labels.atlasHint}</span>
        </button>
      </nav>

      {view === "curriculum" ? (
        <div id="synthesis-curriculum-panel" role="tabpanel" className={styles.curriculumPanel}>
          <section className={styles.coverageIntro} aria-labelledby="synthesis-coverage-heading">
            <div>
              <span className={styles.sectionLabel}>{labels.coverage}</span>
              <h2 id="synthesis-coverage-heading">
                {interpolate(labels.coverageTitle, {
                  available: synthesisCurriculumReadiness.availableDrugCount,
                  planned: synthesisCurriculumReadiness.plannedDrugCount,
                })}
              </h2>
              <p>{labels.coverageBody}</p>
            </div>
            <dl className={styles.metrics}>
              <div><dt>{labels.routes}</dt><dd>{synthesisCurriculumReadiness.routeCount}</dd></div>
              <div><dt>{labels.transformations}</dt><dd>{synthesisCurriculumReadiness.transformationCount}</dd></div>
              <div><dt>{labels.mechanisms}</dt><dd>{synthesisCurriculumReadiness.availableMechanismCount}</dd></div>
              <div><dt>{labels.sourceReported}</dt><dd>{synthesisCurriculumReadiness.sourceReportedRouteCount}</dd></div>
            </dl>
          </section>

          <div className={styles.curriculumGrid}>
            <section className={styles.flagshipSection} aria-labelledby="synthesis-flagships-heading">
              <header className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionLabel}>{labels.flagshipSet}</span>
                  <h2 id="synthesis-flagships-heading">
                    {String(synthesisCurriculumReadiness.availableDrugCount).padStart(2, "0")} / {synthesisCurriculumReadiness.targetDrugCount}
                  </h2>
                </div>
                <p>{labels.flagshipIntro}</p>
              </header>

              <ol className={styles.flagshipList}>
                {synthesisCurriculumReadiness.flagships.map((entry) => (
                  <li key={entry.id} data-status={entry.status}>
                    <span className={styles.slot}>{String(entry.slot).padStart(2, "0")}</span>
                    <div className={styles.flagshipIdentity}>
                      <strong>{entry.label[locale]}</strong>
                      <span data-evidence-presentation={entry.reportedRoutePresentation ?? "none"}>
                        {entry.status === "curated-route-available"
                          ? presentationLabel(entry, locale)
                          : statusLabel(entry, locale)}
                      </span>
                    </div>
                    {entry.status === "curated-route-available" && entry.moleculeId ? (
                      <>
                        <dl className={styles.entryMetrics}>
                          <div><dt>{labels.routeCount}</dt><dd>{entry.availableRouteCount}/{entry.routeCount}</dd></div>
                          <div><dt>{labels.stepCount}</dt><dd>{entry.transformationCount}</dd></div>
                          <div><dt>{labels.mechanismCount}</dt><dd>{entry.availableMechanismCount}</dd></div>
                        </dl>
                        <div className={styles.entryActions}>
                          {onOpenDrugDossier ? (
                            <button type="button" onClick={() => onOpenDrugDossier(entry.moleculeId!)}>
                              {labels.openDossier}
                            </button>
                          ) : null}
                          <button type="button" className={styles.primaryAction} onClick={() => openRoute(entry.moleculeId!)}>
                            {labels.openRoute} <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className={styles.pendingStatus}>{statusLabel(entry, locale)}</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <aside className={styles.readinessRail}>
              <section aria-labelledby="synthesis-readiness-heading">
                <span className={styles.sectionLabel}>{labels.readiness}</span>
                <h2 id="synthesis-readiness-heading">Phase 6</h2>
                <ul className={styles.criteriaList}>
                  {synthesisCurriculumReadiness.criteria.map((criterion) => (
                    <li key={criterion.id} data-state={criterion.state}>
                      <div>
                        <strong>{criterion.label[locale]}</strong>
                        <span>{labels.target} ≥ {criterion.target}</span>
                      </div>
                      <output>
                        {criterion.current ?? "—"}
                        <small>{criterion.state === "unmeasured" ? labels.notMeasured : criterion.state === "complete" ? labels.complete : labels.inProgress}</small>
                      </output>
                      <p>{criterion.boundary[locale]}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.sourcePolicy} aria-labelledby="synthesis-source-policy-heading">
                <span className={styles.sectionLabel}>{labels.sourceRules}</span>
                <h2 id="synthesis-source-policy-heading">{labels.sourceRulesIntro}</h2>
                <dl>
                  <div><dt>{labels.reportedRule}</dt><dd>{synthesisCurriculumReadiness.sourcePolicy.reported[locale]}</dd></div>
                  <div><dt>{labels.teachingRule}</dt><dd>{synthesisCurriculumReadiness.sourcePolicy.teaching[locale]}</dd></div>
                  <div><dt>{labels.blockedRule}</dt><dd>{synthesisCurriculumReadiness.sourcePolicy.blocked[locale]}</dd></div>
                </dl>
              </section>

              {presentationMode === "reviewer" ? (
                <section className={styles.reviewerLedger} data-reviewer-only="true">
                  <span className={styles.sectionLabel}>{labels.reviewerLedger}</span>
                  <dl>
                    <div><dt>{labels.supported}</dt><dd>{synthesisCurriculumReadiness.sourceGateCounts["source-supported"]}</dd></div>
                    <div><dt>{labels.context}</dt><dd>{synthesisCurriculumReadiness.sourceGateCounts["context-supported"]}</dd></div>
                    <div><dt>{labels.partial}</dt><dd>{synthesisCurriculumReadiness.sourceGateCounts["partial-with-declared-gap"]}</dd></div>
                    <div><dt>{labels.sourceBlocked}</dt><dd>{synthesisCurriculumReadiness.sourceGateCounts.blocked}</dd></div>
                  </dl>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      ) : (
        <section id="synthesis-atlas-panel" role="tabpanel" className={styles.atlasPanel}>
          <header className={styles.labHeader}>
            <div>
              <span className={styles.sectionLabel}>{labels.atlas}</span>
              <h2>{labels.labTitle}</h2>
              <p>{labels.labDescription}</p>
            </div>
            <button type="button" onClick={() => setView("curriculum")}>
              {labels.changeSelection}
            </button>
          </header>
          {selectedMoleculeId ? (
            <Suspense fallback={<div className={styles.loading} role="status">{labels.loading}</div>}>
              <LazySynthesisAtlas
                selectedMoleculeId={selectedMoleculeId}
                onSelectMolecule={selectMolecule}
                onOpenMoleculeFocus={onOpenMoleculeFocus}
                presentationMode={presentationMode}
              />
            </Suspense>
          ) : (
            <p className={styles.loading}>{labels.unavailable}</p>
          )}
        </section>
      )}
    </section>
  );
}

export default SynthesisAcademyHub;
