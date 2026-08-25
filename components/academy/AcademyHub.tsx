"use client";

import {
  lazy,
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  createAcademyModuleViews,
  getRecommendedAcademyModule,
} from "@/lib/application/academy-learning-map";
import type {
  AcademyLocale,
  AcademyModuleId,
  AcademyModuleView,
} from "@/lib/domain/academy";
import type { NomenclatureProgressSnapshot } from "@/lib/domain/nomenclature";

import { AcademyScienceLesson } from "./AcademyScienceLesson";
import styles from "./AcademyHub.module.css";

const NomenclatureAcademy = lazy(() =>
  import("../platform/NomenclatureAcademy").then((module) => ({
    default: module.NomenclatureAcademy,
  })),
);

const LearningJourneyMap = lazy(() =>
  import("../platform/LearningJourneyMap").then((module) => ({
    default: module.LearningJourneyMap,
  })),
);

const emptyMissionIds: ReadonlySet<string> = new Set();

export interface AcademyHubProps {
  readonly locale: AcademyLocale;
  readonly selectedMoleculeIdOrSlug?: string;
  readonly assetBasePath?: string;
  readonly nomenclatureProgress?: NomenclatureProgressSnapshot | null;
  readonly completedMissionIds?: ReadonlySet<string>;
  /** Supply this for URL-controlled routing; omit it for the built-in state. */
  readonly activeModuleId?: AcademyModuleId | null;
  readonly initialModuleId?: AcademyModuleId | null;
  readonly onModuleChange?: (moduleId: AcademyModuleId | null) => void;
  readonly onNomenclatureProgressChange?: (
    progress: NomenclatureProgressSnapshot,
  ) => void;
  readonly onOpenDossier?: (moleculeId: string) => void;
  readonly onOpenSynthesis?: (moleculeIdOrSlug: string) => void;
}

const copy = {
  tr: {
    eyebrow: "MOLEVREN AKADEMİ · 8 MODÜL",
    title: "Yapıyı okumaktan kanıtı savunmaya.",
    description: "Sekiz modülde yapıyı oku, adlandırma kararlarını kur ve bir ilacın moleküler yolculuğunu adım adım incele. İlerleme yalnız tamamladığın etkinliklerden hesaplanır.",
    mapAria: "Sekiz modüllük Akademi öğrenme haritası",
    recommended: "Önerilen sonraki modül",
    openRecommended: "Devam et",
    available: "Başlamaya hazır",
    coverageDependent: "İlaç seçimine göre",
    planned: "Yakında",
    duration: "Tahmini süre",
    minutes: "dk",
    completion: "Tamamlanma",
    notTracked: "İlk etkinliği bekliyor",
    nextLesson: "Sonraki önerilen ders",
    relatedDrugs: "İlişkili ilaçlar",
    openModule: "Modülü aç",
    inspectCoverage: "Kapsamı incele",
    nearestLesson: "En yakın dersi aç",
    back: "Öğrenme haritasına dön",
    loading: "Ders alanı yükleniyor…",
    synthesisEyebrow: "AKADEMİDEN ATLASA",
    synthesisTitle: "Kaynak sınırı tanımlı dönüşümleri Sentez Atlası'nda aç.",
    synthesisBody: "Bu geçiş yalnız çalışan rota ve basamakları açar. Kaynaklandırılmamış upstream adımlar veya dekoratif mekanizmalar üretilmez.",
    openSynthesis: "Sentez Atlası'nı aç",
    synthesisUnavailable: "Bu host, Sentez Atlası geçişini henüz bağlamadı.",
    plannedBoundary: "Bağımsız mekanizma modülünün ilerleme takibi planlandı; mevcut kürate edilmiş basamaklar Sentez Atlası'nda çalışır.",
    reviewEyebrow: "BİTİRME PROJESİ",
  },
  en: {
    eyebrow: "MOLEVREN ACADEMY · 8 MODULES",
    title: "From reading structure to defending evidence.",
    description: "Across eight modules, read structures, build naming decisions, and inspect a medicine's molecular journey step by step. Progress reflects only activities you complete.",
    mapAria: "Eight-module Academy learning map",
    recommended: "Recommended next module",
    openRecommended: "Continue",
    available: "Ready to begin",
    coverageDependent: "Varies by medicine",
    planned: "Coming soon",
    duration: "Estimated time",
    minutes: "min",
    completion: "Completion",
    notTracked: "Waiting for a first activity",
    nextLesson: "Recommended next lesson",
    relatedDrugs: "Related drugs",
    openModule: "Open module",
    inspectCoverage: "Inspect coverage",
    nearestLesson: "Open nearest lesson",
    back: "Back to learning map",
    loading: "Loading lesson space…",
    synthesisEyebrow: "FROM ACADEMY TO ATLAS",
    synthesisTitle: "Open source-bounded transformations in Synthesis Atlas.",
    synthesisBody: "This transition opens only working routes and steps. It does not generate unsourced upstream steps or decorative mechanisms.",
    openSynthesis: "Open Synthesis Atlas",
    synthesisUnavailable: "This host has not connected the Synthesis Atlas transition yet.",
    plannedBoundary: "Independent mechanism-module progress is planned; existing curated steps work inside Synthesis Atlas.",
    reviewEyebrow: "CAPSTONE PROJECT",
  },
} as const;

function moduleActionLabel(
  module: AcademyModuleView,
  locale: AcademyLocale,
): string {
  const labels = copy[locale];
  if (module.availability === "planned") return labels.nearestLesson;
  if (module.availability === "coverage-dependent") {
    return labels.inspectCoverage;
  }
  return labels.openModule;
}

export function AcademyHub({
  locale,
  selectedMoleculeIdOrSlug = "molecule:propranolol",
  assetBasePath = "/",
  nomenclatureProgress = null,
  completedMissionIds = emptyMissionIds,
  activeModuleId,
  initialModuleId = null,
  onModuleChange,
  onNomenclatureProgressChange,
  onOpenDossier,
  onOpenSynthesis,
}: AcademyHubProps) {
  const [internalModuleId, setInternalModuleId] = useState<AcademyModuleId | null>(
    initialModuleId,
  );
  const currentModuleId = activeModuleId === undefined
    ? internalModuleId
    : activeModuleId;
  const modules = useMemo(
    () =>
      createAcademyModuleViews(locale, {
        nomenclatureProgress,
        completedMissionIds,
      }),
    [completedMissionIds, locale, nomenclatureProgress],
  );
  const recommendedModule = getRecommendedAcademyModule(modules);
  const currentModule = modules.find((module) => module.id === currentModuleId) ?? null;
  const labels = copy[locale];

  function selectModule(moduleId: AcademyModuleId | null) {
    if (activeModuleId === undefined) setInternalModuleId(moduleId);
    onModuleChange?.(moduleId);
  }

  function openSynthesis() {
    if (onOpenSynthesis) {
      onOpenSynthesis(selectedMoleculeIdOrSlug);
      return;
    }
    selectModule("synthesis-atlas");
  }

  if (currentModule) {
    const isNomenclature = currentModule.destination === "nomenclature";
    const isScience = currentModule.destination === "pharmacology" ||
      currentModule.destination === "adme";
    const isSynthesis = currentModule.destination === "synthesis";

    return (
      <section
        className={styles.lessonRoute}
        data-academy-active-module={currentModule.id}
      >
        <header className={styles.routeHeader}>
          <button type="button" onClick={() => selectModule(null)}>
            <i aria-hidden="true">←</i> {labels.back}
          </button>
          <div>
            <span>{String(currentModule.order).padStart(2, "0")} / 08</span>
            <h1>{currentModule.title}</h1>
            <p>{currentModule.purpose}</p>
          </div>
          <small data-status={currentModule.availability}>
            {currentModule.availability === "available"
              ? labels.available
              : currentModule.availability === "planned"
                ? labels.planned
                : labels.coverageDependent}
          </small>
        </header>

        <Suspense fallback={<p className={styles.loading}>{labels.loading}</p>}>
          {isNomenclature ? (
            <NomenclatureAcademy
              locale={locale}
              onProgressChange={onNomenclatureProgressChange}
            />
          ) : null}

          {isScience ? (
            <AcademyScienceLesson
              moduleId={currentModule.destination}
              moleculeIdOrSlug={selectedMoleculeIdOrSlug}
              locale={locale}
              assetBasePath={assetBasePath}
              onOpenDossier={onOpenDossier}
            />
          ) : null}

          {isSynthesis ? (
            <section className={styles.synthesisPortal}>
              <span>{labels.synthesisEyebrow}</span>
              <h2>{labels.synthesisTitle}</h2>
              <p>{labels.synthesisBody}</p>
              {currentModule.availability === "planned" ? (
                <aside>{labels.plannedBoundary}</aside>
              ) : null}
              {onOpenSynthesis ? (
                <button type="button" onClick={openSynthesis}>
                  {labels.openSynthesis} <i aria-hidden="true">↗</i>
                </button>
              ) : (
                <p role="status" className={styles.integrationGap}>
                  {labels.synthesisUnavailable}
                </p>
              )}
            </section>
          ) : null}

          {currentModule.destination === "review" ? (
            <section className={styles.reviewProject}>
              <span>{labels.reviewEyebrow}</span>
              <LearningJourneyMap
                locale={locale}
                nomenclatureProgress={nomenclatureProgress}
                completedMissionIds={completedMissionIds}
                onOpenSynthesis={openSynthesis}
                onOpenNomenclature={() => selectModule("organic-nomenclature")}
              />
            </section>
          ) : null}
        </Suspense>
      </section>
    );
  }

  return (
    <section className={styles.hub} data-academy-learning-map="eight-modules">
      <header className={styles.hero}>
        <div>
          <span>{labels.eyebrow}</span>
          <h1>{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
        {recommendedModule ? (
          <aside className={styles.recommended}>
            <span>{labels.recommended}</span>
            <strong>{recommendedModule.title}</strong>
            <small>{recommendedModule.recommendedLesson}</small>
            <button
              type="button"
              onClick={() => selectModule(recommendedModule.id)}
            >
              {labels.openRecommended} <i aria-hidden="true">→</i>
            </button>
          </aside>
        ) : null}
      </header>

      <ol className={styles.path} aria-label={labels.mapAria}>
        {modules.map((module) => {
          const statusLabel = module.availability === "available"
            ? labels.available
            : module.availability === "planned"
              ? labels.planned
              : labels.coverageDependent;
          const isRecommended = module.id === recommendedModule?.id;

          return (
            <li
              key={module.id}
              className={styles.module}
              data-academy-module={module.id}
              data-status={module.availability}
              data-recommended={isRecommended}
            >
              <div className={styles.node} aria-hidden="true">
                {String(module.order).padStart(2, "0")}
              </div>
              <article className={styles.moduleCard}>
                <header>
                  <div>
                    <span>{String(module.order).padStart(2, "0")} / 08</span>
                    <h2>{module.title}</h2>
                  </div>
                  <small data-status={module.availability}>{statusLabel}</small>
                </header>

                <p className={styles.purpose}>{module.purpose}</p>
                <dl className={styles.moduleMeta}>
                  <div>
                    <dt>{labels.duration}</dt>
                    <dd>{module.estimatedMinutes} {labels.minutes}</dd>
                  </div>
                  <div>
                    <dt>{labels.completion}</dt>
                    <dd>
                      {module.completionPercent === null
                        ? labels.notTracked
                        : `${module.completionPercent}%`}
                    </dd>
                  </div>
                </dl>

                {module.completionPercent !== null ? (
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label={`${module.title}: ${labels.completion}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={module.completionPercent}
                  >
                    <i style={{ width: `${module.completionPercent}%` }} />
                  </div>
                ) : null}

                <div className={styles.lessonRecommendation}>
                  <span>{labels.nextLesson}</span>
                  <strong>{module.recommendedLesson}</strong>
                </div>
                <p className={styles.coverageNote}>{module.coverageNote}</p>

                <footer>
                  <div>
                    <span>{labels.relatedDrugs}</span>
                    <ul>
                      {module.relatedDrugs.map((drug) => (
                        <li key={drug.moleculeId}>
                          {onOpenDossier ? (
                            <button
                              type="button"
                              onClick={() => onOpenDossier(drug.moleculeId)}
                            >
                              {drug.label}
                            </button>
                          ) : (
                            drug.label
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button type="button" onClick={() => selectModule(module.id)}>
                    {moduleActionLabel(module, locale)} <i aria-hidden="true">↗</i>
                  </button>
                </footer>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
