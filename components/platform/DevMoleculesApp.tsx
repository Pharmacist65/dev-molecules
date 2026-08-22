"use client";

import { useEffect, useMemo, useState } from "react";

import { MoleculeUniverse } from "@/components/universe";
import { createExploreCatalogView } from "@/lib/application/explore-catalog";
import { moleculeById, moleculeCatalog } from "@/lib/data/catalog";
import { learningMissions } from "@/lib/data/learning-missions";
import type { MoleculeId, NomenclatureProgressSnapshot } from "@/lib/domain";
import { I18nProvider, useI18n, type TranslationKey } from "@/lib/i18n";

import { EvidenceMentor } from "./EvidenceMentor";
import { GuidedBuilder } from "./GuidedBuilder";
import { InstructorStudio } from "./InstructorStudio";
import { MissionStudio } from "./MissionStudio";
import { NomenclatureLab } from "./NomenclatureLab";
import { SynthesisTheatre } from "./SynthesisTheatre";
import styles from "./platform.module.css";

type PlatformMode = "explore" | "learn" | "build" | "teach" | "discover";
type LearnArea = "synthesis" | "nomenclature";

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

function DevMoleculesWorkspace() {
  const { locale, setLocale, t } = useI18n();
  const [activeMode, setActiveMode] = useState<PlatformMode>("explore");
  const [learnArea, setLearnArea] = useState<LearnArea>("synthesis");
  const [selectedId, setSelectedId] = useState<string>(moleculeCatalog[0]?.id ?? "");
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());
  const [nomenclatureProgress, setNomenclatureProgress] = useState<NomenclatureProgressSnapshot | null>(null);

  const exploreCatalogView = useMemo(
    () => createExploreCatalogView(moleculeCatalog, locale, import.meta.env.BASE_URL),
    [locale],
  );
  const activeModeDefinition = modes.find((mode) => mode.id === activeMode) ?? modes[0];
  const selectedMolecule = moleculeById.get(selectedId as MoleculeId) ?? moleculeCatalog[0];

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
    <div className={styles.app} data-locale={locale}>
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
              onClick={() => setActiveMode(mode.id)}
            >
              <span>{mode.eyebrow}</span>{t(mode.labelKey)}
            </button>
          ))}
        </nav>
        <div className={styles.topStatus}>
          <span><i /> {t("shell.structureSourcesConnected")}</span>
          <div className={styles.languageSwitcher} role="group" aria-label={t("locale.selectorLabel")}>
            <button type="button" aria-pressed={locale === "tr"} aria-label={t("locale.switchToTurkish")} onClick={() => setLocale("tr")}>TR</button>
            <button type="button" aria-pressed={locale === "en"} aria-label={t("locale.switchToEnglish")} onClick={() => setLocale("en")}>EN</button>
          </div>
          <button
            className={styles.progressButton}
            type="button"
            onClick={() => setActiveMode("teach")}
            aria-label={t("learn.progressLabel", { completed: completedMissionIds.size, total: learningMissions.length })}
          >
            <span>{t("shell.learningProgress")}</span>
            <strong>{completedMissionIds.size}/{learningMissions.length}</strong>
          </button>
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
            <MoleculeUniverse
              molecules={exploreCatalogView.molecules}
              lenses={exploreCatalogView.lenses}
              initialLensId="therapeutic"
              initialSelectedId={selectedId}
              eyebrow={t("explore.eyebrow")}
              title={t("explore.title")}
              description={t("explore.description")}
              onMoleculeSelect={(molecule) => setSelectedId(molecule.id)}
            />
          </div>
        ) : null}

        {activeMode === "learn" && selectedMolecule ? (
          <div className={styles.workspacePage}>
            <div className={styles.learnNav} role="tablist" aria-label={t("learn.subnavAria")}>
              <button type="button" role="tab" aria-selected={learnArea === "synthesis"} onClick={() => setLearnArea("synthesis")}>{t("learn.synthesisTab")}</button>
              <button type="button" role="tab" aria-selected={learnArea === "nomenclature"} onClick={() => setLearnArea("nomenclature")}>{t("learn.nomenclatureTab")}</button>
            </div>
            {learnArea === "synthesis" ? (
              <>
                <SynthesisTheatre
                  selectedMoleculeId={selectedMolecule.id}
                  onSelectMolecule={setSelectedId}
                  onOpenMoleculeFocus={openMoleculeFocus}
                />
                <MissionStudio completedMissionIds={completedMissionIds} onComplete={completeMission} />
              </>
            ) : (
              <NomenclatureLab locale={locale} onProgressChange={setNomenclatureProgress} />
            )}
          </div>
        ) : null}

        {activeMode === "build" && selectedMolecule ? (
          <div className={styles.workspacePage}><GuidedBuilder molecule={selectedMolecule} /></div>
        ) : null}

        {activeMode === "teach" ? (
          <div className={styles.workspacePage}>
            <InstructorStudio
              completedMissionIds={completedMissionIds}
              nomenclatureProgress={nomenclatureProgress}
            />
          </div>
        ) : null}

        {activeMode === "discover" && selectedMolecule ? (
          <div className={styles.workspacePage}><EvidenceMentor molecule={selectedMolecule} onSelectMolecule={setSelectedId} /></div>
        ) : null}
      </main>

      <footer className={styles.globalFooter}>
        <span>{t("shell.footerProduct")}</span>
        <span>{t("shell.footerNotAdvice")}</span>
        <span>{t("shell.footerEvidenceBoundary")}</span>
      </footer>
    </div>
  );
}

export function DevMoleculesApp() {
  return <I18nProvider><DevMoleculesWorkspace /></I18nProvider>;
}

export default DevMoleculesApp;
