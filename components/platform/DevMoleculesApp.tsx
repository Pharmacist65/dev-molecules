"use client";

import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import {
  MoleculeUniverse,
  type ExplorePresentationMode,
  type UniverseIndexedCatalog,
  type UniverseLearningActions,
} from "@/components/universe";
import {
  canonicalizeIndexedCatalogBrowsePage,
  canonicalizeIndexedCatalogHit,
  createExpandedExploreMolecule,
  createReviewedCatalogIdentityIndex,
  IndexedCatalogNavigator,
  loadCatalogExpansion,
  MAX_RUNTIME_HYDRATED_RECORDS,
  mergeCatalogExpansionIntoExplore,
  retainHydratedCatalogEntity,
  type CatalogExpansion,
} from "@/lib/application/catalog-expansion";
import { createExploreCatalogView } from "@/lib/application/explore-catalog";
import type { CatalogNormalizedEntity } from "@/lib/catalog";
import { moleculeById, moleculeCatalog } from "@/lib/data/catalog";
import { learningMissions } from "@/lib/data/learning-missions";
import { synthesisStories } from "@/lib/data/synthesis-stories";
import type { MoleculeId, NomenclatureProgressSnapshot } from "@/lib/domain";
import { I18nProvider, useI18n, type TranslationKey } from "@/lib/i18n";

import { EvidenceMentor } from "./EvidenceMentor";
import { GuidedBuilder } from "./GuidedBuilder";
import { InstructorStudio } from "./InstructorStudio";
import { LearningJourneyMap } from "./LearningJourneyMap";
import { MissionStudio } from "./MissionStudio";
import styles from "./platform.module.css";

const SynthesisAtlas = lazy(() =>
  import("./SynthesisAtlas").then((module) => ({ default: module.SynthesisAtlas })),
);
const NomenclatureAcademy = lazy(() =>
  import("./NomenclatureAcademy").then((module) => ({ default: module.NomenclatureAcademy })),
);

type PlatformMode = "explore" | "learn" | "build" | "teach" | "discover";
type LearnArea = "home" | "synthesis" | "nomenclature";

const PRESENTATION_MODE_STORAGE_KEY = "dev-molecules:presentation-mode";
const SYNTHESIS_MOLECULE_IDS = [
  ...new Set(synthesisStories.map((story) => story.moleculeId)),
];
const LEARNING_TASK_MOLECULE_IDS = [
  ...new Set(learningMissions.flatMap((mission) => mission.moleculeIds)),
];

const modes: readonly {
  id: PlatformMode;
  labelKey: TranslationKey;
  eyebrow: string;
  descriptionKey: TranslationKey;
}[] = [
  { id: "explore", labelKey: "nav.explore", eyebrow: "01", descriptionKey: "nav.exploreDescription" },
  { id: "learn", labelKey: "nav.learn", eyebrow: "02", descriptionKey: "nav.learnDescription" },
  { id: "build", labelKey: "nav.build", eyebrow: "03", descriptionKey: "nav.buildDescription" },
  { id: "teach", labelKey: "nav.teach", eyebrow: "04", descriptionKey: "nav.teachDescription" },
  { id: "discover", labelKey: "nav.discover", eyebrow: "05", descriptionKey: "nav.discoverDescription" },
] as const;

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>;
}

function CuratedWorkflowUnavailable({
  eyebrow,
  title,
  description,
  actionLabel,
  onReturnToExplore,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly onReturnToExplore: () => void;
}) {
  return (
    <section className={styles.workflowUnavailable} data-curated-workflow="unavailable">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <button type="button" onClick={onReturnToExplore}>{actionLabel}</button>
    </section>
  );
}

function DevMoleculesWorkspace() {
  const { locale, setLocale, t } = useI18n();
  const [activeMode, setActiveMode] = useState<PlatformMode>("explore");
  const [learnArea, setLearnArea] = useState<LearnArea>("home");
  const [presentationMode, setPresentationMode] =
    useState<ExplorePresentationMode>("student");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [catalogExpansion, setCatalogExpansion] = useState<CatalogExpansion | null>(null);
  const [hydratedCatalogEntities, setHydratedCatalogEntities] =
    useState<readonly CatalogNormalizedEntity[]>([]);
  const [catalogLoadStatus, setCatalogLoadStatus] =
    useState<"loading" | "ready" | "fallback">("loading");
  const [catalogLoadError, setCatalogLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string>(moleculeCatalog[0]?.id ?? "");
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());
  const [nomenclatureProgress, setNomenclatureProgress] = useState<NomenclatureProgressSnapshot | null>(null);

  const assetBasePath = import.meta.env.BASE_URL;
  const seedExploreCatalogView = useMemo(
    () => createExploreCatalogView(moleculeCatalog, locale, assetBasePath),
    [assetBasePath, locale],
  );
  const indexedCatalogNavigator = useMemo(
    () =>
      new IndexedCatalogNavigator({
        basePath: assetBasePath,
        maxShardEntries: 8,
        maxStructureEntries: 24,
        maxHydratedEntries: MAX_RUNTIME_HYDRATED_RECORDS,
      }),
    [assetBasePath],
  );
  const reviewedCatalogIdentities = useMemo(
    () => createReviewedCatalogIdentityIndex(seedExploreCatalogView.molecules),
    [seedExploreCatalogView.molecules],
  );
  const residentCatalogExpansion = useMemo<CatalogExpansion | null>(() => {
    if (!catalogExpansion) return null;
    const initialIds = new Set(catalogExpansion.entities.map((entity) => entity.id));
    return {
      manifest: catalogExpansion.manifest,
      entities: [
        ...catalogExpansion.entities,
        ...hydratedCatalogEntities.filter((entity) => !initialIds.has(entity.id)),
      ],
    };
  }, [catalogExpansion, hydratedCatalogEntities]);
  const exploreCatalogView = useMemo(
    () =>
      residentCatalogExpansion
        ? mergeCatalogExpansionIntoExplore(
            seedExploreCatalogView,
            residentCatalogExpansion,
            locale,
            assetBasePath,
          )
        : seedExploreCatalogView,
    [assetBasePath, locale, residentCatalogExpansion, seedExploreCatalogView],
  );
  const indexedCatalog = useMemo<UniverseIndexedCatalog>(
    () => ({
      search: async (query, limit) =>
        (await indexedCatalogNavigator.search(query, limit)).map((record) =>
          canonicalizeIndexedCatalogHit(record, reviewedCatalogIdentities),
        ),
      browse: async (offset, limit) =>
        canonicalizeIndexedCatalogBrowsePage(
          await indexedCatalogNavigator.browse(offset, limit),
          reviewedCatalogIdentities,
        ),
      resolveStableSlug: async (stableSlug) => {
        const record = await indexedCatalogNavigator.resolveStableSlug(stableSlug);
        return record
          ? canonicalizeIndexedCatalogHit(record, reviewedCatalogIdentities)
          : null;
      },
      hydrate: async (entityId) => {
        const reviewed = reviewedCatalogIdentities.byCanonicalId.get(entityId);
        if (reviewed) return reviewed;
        const resident = residentCatalogExpansion?.entities.find(
          (entity) => entity.id === entityId,
        );
        const entity = resident ?? (await indexedCatalogNavigator.hydrate(entityId));
        if (!entity) return null;
        if (!resident) {
          setHydratedCatalogEntities((current) =>
            retainHydratedCatalogEntity(current, entity),
          );
        }
        return createExpandedExploreMolecule(entity, locale, assetBasePath);
      },
    }),
    [
      assetBasePath,
      indexedCatalogNavigator,
      locale,
      residentCatalogExpansion,
      reviewedCatalogIdentities,
    ],
  );
  const learningActions = useMemo<UniverseLearningActions>(
    () => ({
      synthesisMoleculeIds: SYNTHESIS_MOLECULE_IDS,
      taskMoleculeIds: LEARNING_TASK_MOLECULE_IDS,
      onOpenSynthesis: (molecule) => {
        setSelectedId(molecule.id);
        setActiveMode("learn");
        setLearnArea("synthesis");
      },
      onOpenNomenclature: (molecule) => {
        setSelectedId(molecule.id);
        setActiveMode("learn");
        setLearnArea("nomenclature");
      },
      onOpenTasks: (molecule) => {
        setSelectedId(molecule.id);
        setActiveMode("learn");
        setLearnArea("synthesis");
        window.requestAnimationFrame(() => {
          document.getElementById("missions-heading")?.scrollIntoView({ block: "start" });
        });
      },
    }),
    [],
  );
  const activeModeDefinition = modes.find((mode) => mode.id === activeMode) ?? modes[0];
  const selectedMolecule = moleculeById.get(selectedId as MoleculeId);
  const selectedExploreMolecule = exploreCatalogView.molecules.find(
    (molecule) => molecule.id === selectedId,
  );
  const unavailableWorkflow = (
    <CuratedWorkflowUnavailable
      eyebrow={t("workflow.unavailableEyebrow")}
      title={t("workflow.unavailableTitle", {
        name: selectedExploreMolecule?.name ?? t("workflow.unknownMolecule"),
      })}
      description={t("workflow.unavailableDescription", {
        cid: selectedExploreMolecule?.structure.pubChemCid ?? t("common.notSpecified"),
      })}
      actionLabel={t("workflow.returnToExplore")}
      onReturnToExplore={() => setActiveMode("explore")}
    />
  );

  useEffect(() => {
    let restoreTimer: number | undefined;
    try {
      const saved = window.localStorage.getItem("dev-molecules:completed-missions");
      if (saved) {
        const restored = JSON.parse(saved) as string[];
        restoreTimer = window.setTimeout(() => setCompletedMissionIds(new Set(restored)), 0);
      }
    } catch {
      // Device-local progress is optional; scientific state never depends on it.
    }
    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadCatalogExpansion(assetBasePath)
      .then((expansion) => {
        if (cancelled) return;
        setCatalogExpansion(expansion);
        setCatalogLoadError("");
        setCatalogLoadStatus("ready");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        // The reviewed regression catalog remains usable; no remote record is invented.
        setCatalogLoadError(
          reason instanceof Error ? reason.message : t("explore.catalogFallbackUnknownError"),
        );
        setCatalogLoadStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [assetBasePath, t]);

  useEffect(() => {
    let restoreFrame: number | undefined;
    try {
      const saved = window.localStorage.getItem(PRESENTATION_MODE_STORAGE_KEY);
      if (saved === "student" || saved === "reviewer") {
        restoreFrame = window.requestAnimationFrame(() => setPresentationMode(saved));
      }
    } catch {
      // A blocked storage layer must never block the student experience.
    }
    return () => {
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRESENTATION_MODE_STORAGE_KEY, presentationMode);
    } catch {
      // Presentation preference remains session-local when storage is unavailable.
    }
  }, [presentationMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "dev-molecules:completed-missions",
        JSON.stringify([...completedMissionIds]),
      );
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [completedMissionIds]);

  function completeMission(missionId: string) {
    setCompletedMissionIds((current) => new Set([...current, missionId]));
  }

  function openMoleculeFocus(moleculeId: string) {
    setSelectedId(moleculeId);
    setActiveMode("explore");
    const separatorIndex = Math.max(moleculeId.lastIndexOf(":"), moleculeId.lastIndexOf("/"));
    const slug = separatorIndex >= 0 ? moleculeId.slice(separatorIndex + 1) : moleculeId;
    window.requestAnimationFrame(() => {
      window.history.pushState(null, "", `#molecule/${encodeURIComponent(slug)}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
  }

  return (
    <div
      className={styles.app}
      data-locale={locale}
      data-catalog-status={catalogLoadStatus}
      data-catalog-records={catalogExpansion?.manifest.recordCount ?? exploreCatalogView.molecules.length}
      data-catalog-resident-records={exploreCatalogView.molecules.length}
    >
      <header className={styles.topbar}>
        <button
          className={styles.brand}
          type="button"
          aria-label={t("shell.brandHomeLabel")}
          onClick={() => setActiveMode("explore")}
        >
          <BrandMark /><span>DEV MOLECULES</span><em>{t("shell.brandTagline")}</em>
        </button>
        <nav className={styles.modeNav} aria-label={t("nav.platformModules")}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              data-active={activeMode === mode.id}
              aria-pressed={activeMode === mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setSettingsOpen(false);
                if (mode.id === "learn") setLearnArea("home");
              }}
            >
              <span>{mode.eyebrow}</span>{t(mode.labelKey)}
            </button>
          ))}
        </nav>
        <div className={styles.topStatus}>
          <div className={styles.languageSwitcher} role="group" aria-label={t("locale.selectorLabel")}>
            <button type="button" aria-pressed={locale === "tr"} aria-label={t("locale.switchToTurkish")} onClick={() => setLocale("tr")}>TR</button>
            <button type="button" aria-pressed={locale === "en"} aria-label={t("locale.switchToEnglish")} onClick={() => setLocale("en")}>EN</button>
          </div>
          <div className={styles.settingsControl}>
            <button
              className={styles.settingsButton}
              type="button"
              aria-expanded={settingsOpen}
              aria-controls="platform-settings"
              onClick={() => setSettingsOpen((current) => !current)}
            >
              {t("shell.settings")}
            </button>
            {settingsOpen ? (
              <div id="platform-settings" className={styles.settingsMenu}>
                <strong>{t("shell.experienceMode")}</strong>
                <button
                  type="button"
                  aria-pressed={presentationMode === "student"}
                  onClick={() => {
                    setPresentationMode("student");
                    setSettingsOpen(false);
                  }}
                >
                  <span>{t("shell.studentMode")}</span>
                  <small>{t("shell.studentModeDescription")}</small>
                </button>
                <button
                  type="button"
                  aria-pressed={presentationMode === "reviewer"}
                  onClick={() => {
                    setPresentationMode("reviewer");
                    setSettingsOpen(false);
                  }}
                >
                  <span>{t("shell.reviewerMode")}</span>
                  <small>{t("shell.reviewerModeDescription")}</small>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main>
        <div className={styles.modeBanner}>
          <div>
            <span>{activeModeDefinition.eyebrow}</span>
            <strong>{t(activeModeDefinition.descriptionKey)}</strong>
          </div>
          <p>{t("shell.platformPromise")}</p>
        </div>

        {activeMode === "explore" ? (
          <div className={styles.workspacePage}>
            {catalogLoadStatus === "fallback" ? (
              <div className={styles.catalogFallback} role="alert" data-catalog-fallback="true">
                <div>
                  <strong>{t("explore.catalogFallbackTitle")}</strong>
                  <p>{t("explore.catalogFallbackBody", {
                    count: exploreCatalogView.molecules.length,
                  })}</p>
                </div>
                {presentationMode === "reviewer" ? (
                  <code>{t("explore.catalogFallbackReviewer", { error: catalogLoadError })}</code>
                ) : null}
              </div>
            ) : null}
            <MoleculeUniverse
              molecules={exploreCatalogView.molecules}
              lenses={exploreCatalogView.lenses}
              initialLensId="therapeutic"
              initialSelectedId={selectedId}
              eyebrow={t("explore.eyebrow")}
              title={t("explore.title")}
              description={t("explore.description")}
              presentationMode={presentationMode}
              catalogRecordCount={catalogExpansion?.manifest.recordCount}
              indexedCatalog={catalogExpansion ? indexedCatalog : undefined}
              learningActions={learningActions}
              onMoleculeSelect={(molecule) => setSelectedId(molecule.id)}
            />
          </div>
        ) : null}

        {activeMode === "learn" ? (
          <div className={styles.workspacePage}>
            {learnArea === "home" ? (
              <LearningJourneyMap
                locale={locale}
                nomenclatureProgress={nomenclatureProgress}
                completedMissionIds={completedMissionIds}
                onOpenSynthesis={() => setLearnArea("synthesis")}
                onOpenNomenclature={() => setLearnArea("nomenclature")}
              />
            ) : (
              <div className={styles.learnNav} role="tablist" aria-label={t("learn.subnavAria")}>
                <button type="button" onClick={() => setLearnArea("home")}>{t("learn.backToMap")}</button>
                <button type="button" role="tab" aria-selected={learnArea === "synthesis"} onClick={() => setLearnArea("synthesis")}>{t("learn.synthesisTab")}</button>
                <button type="button" role="tab" aria-selected={learnArea === "nomenclature"} onClick={() => setLearnArea("nomenclature")}>{t("learn.nomenclatureTab")}</button>
              </div>
            )}
            {learnArea === "synthesis" ? (
              selectedMolecule ? (
                <>
                  <Suspense fallback={<p className={styles.learnLoading} role="status">{t("learn.loadingJourney")}</p>}>
                    <SynthesisAtlas
                      selectedMoleculeId={selectedMolecule.id}
                      onSelectMolecule={setSelectedId}
                      onOpenMoleculeFocus={openMoleculeFocus}
                      presentationMode={presentationMode}
                    />
                  </Suspense>
                  <MissionStudio completedMissionIds={completedMissionIds} onComplete={completeMission} />
                </>
              ) : unavailableWorkflow
            ) : learnArea === "nomenclature" ? (
              <Suspense fallback={<p className={styles.learnLoading} role="status">{t("learn.loadingJourney")}</p>}>
                <NomenclatureAcademy locale={locale} onProgressChange={setNomenclatureProgress} />
              </Suspense>
            ) : null}
          </div>
        ) : null}

        {activeMode === "build" ? (
          <div className={styles.workspacePage}>
            {selectedMolecule ? <GuidedBuilder molecule={selectedMolecule} /> : unavailableWorkflow}
          </div>
        ) : null}

        {activeMode === "teach" ? (
          <div className={styles.workspacePage}>
            <InstructorStudio
              completedMissionIds={completedMissionIds}
              nomenclatureProgress={nomenclatureProgress}
            />
          </div>
        ) : null}

        {activeMode === "discover" ? (
          <div className={styles.workspacePage}>
            {selectedMolecule
              ? <EvidenceMentor molecule={selectedMolecule} onSelectMolecule={setSelectedId} />
              : unavailableWorkflow}
          </div>
        ) : null}
      </main>

      <footer className={styles.globalFooter}>
        <span>{t("shell.footerSentence")}</span>
      </footer>
    </div>
  );
}

export function DevMoleculesApp() {
  return <I18nProvider><DevMoleculesWorkspace /></I18nProvider>;
}

export default DevMoleculesApp;
