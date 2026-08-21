"use client";

import { useEffect, useState } from "react";

import { MoleculeUniverse } from "@/components/universe";
import { createExploreCatalogView } from "@/lib/application/explore-catalog";
import { moleculeById, moleculeCatalog } from "@/lib/data/catalog";
import type { MoleculeId } from "@/lib/domain";

import { EvidenceMentor } from "./EvidenceMentor";
import { GuidedBuilder } from "./GuidedBuilder";
import { InstructorStudio } from "./InstructorStudio";
import { MissionStudio } from "./MissionStudio";
import { SynthesisTheatre } from "./SynthesisTheatre";
import styles from "./platform.module.css";

type PlatformMode = "explore" | "learn" | "build" | "teach" | "discover";

const modes: readonly {
  id: PlatformMode;
  label: string;
  eyebrow: string;
  description: string;
}[] = [
  { id: "explore", label: "Explore", eyebrow: "01", description: "Molecular Universe" },
  { id: "learn", label: "Learn", eyebrow: "02", description: "Synthesis & Missions" },
  { id: "build", label: "Build", eyebrow: "03", description: "Guided Workbench" },
  { id: "teach", label: "Teach", eyebrow: "04", description: "Instructor Studio" },
  { id: "discover", label: "Discover", eyebrow: "05", description: "Private Sandbox" },
] as const;

const exploreCatalogView = createExploreCatalogView(moleculeCatalog);

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>;
}

export function DevMoleculesApp() {
  const [activeMode, setActiveMode] = useState<PlatformMode>("explore");
  const [selectedId, setSelectedId] = useState<string>(moleculeCatalog[0]?.id ?? "");
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());

  const selectedMolecule =
    moleculeById.get(selectedId as MoleculeId) ?? moleculeCatalog[0];

  useEffect(() => {
    let restoreTimer: number | undefined;
    try {
      const saved = window.localStorage.getItem("dev-molecules:completed-missions");
      if (saved) {
        const restored = JSON.parse(saved) as string[];
        restoreTimer = window.setTimeout(
          () => setCompletedMissionIds(new Set(restored)),
          0,
        );
      }
    } catch {
      // Device-local progress is optional; the product remains usable without it.
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
      // Storage can be unavailable in private browsing; no scientific state depends on it.
    }
  }, [completedMissionIds]);

  function completeMission(missionId: string) {
    setCompletedMissionIds((current) => new Set([...current, missionId]));
  }

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <button className={styles.brand} type="button" onClick={() => setActiveMode("explore")}>
          <BrandMark /><span>DEV MOLECULES</span><em>FOUNDATION</em>
        </button>
        <nav className={styles.modeNav} aria-label="Platform modülleri">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              data-active={activeMode === mode.id}
              aria-pressed={activeMode === mode.id}
              onClick={() => setActiveMode(mode.id)}
            >
              <span>{mode.eyebrow}</span>{mode.label}
            </button>
          ))}
        </nav>
        <div className={styles.topStatus}>
          <span><i /> Yapı kaynakları bağlı</span>
          <button type="button" onClick={() => setActiveMode("teach")} aria-label="İlerleme özetini aç">
            {completedMissionIds.size}/5
          </button>
        </div>
      </header>

      <main>
        <div className={styles.modeBanner}>
          <div>
            <span>{modes.find((mode) => mode.id === activeMode)?.eyebrow}</span>
            <strong>{modes.find((mode) => mode.id === activeMode)?.description}</strong>
          </div>
          <p>Ölçeklenebilir katalog · Kaynaklı yapı verisi · Eğitim amaçlı</p>
        </div>

        {activeMode === "explore" ? (
          <div className={styles.workspacePage}>
            <MoleculeUniverse
              molecules={exploreCatalogView.molecules}
              lenses={exploreCatalogView.lenses}
              initialLensId="scaffold"
              initialSelectedId={selectedId}
              eyebrow="EXPLORE / MOLECULAR UNIVERSE"
              title="İlaç moleküllerinin 3B evrenini keşfet."
              description="Kaynaklı SDF atom ve bağ kayıtlarını; tedavi alanı, hedef ailesi ve yapısal iskelet lensleriyle incele."
              onMoleculeSelect={(molecule) => setSelectedId(molecule.id)}
            />
          </div>
        ) : null}

        {activeMode === "learn" && selectedMolecule ? (
          <div className={styles.workspacePage}>
            <SynthesisTheatre selectedMoleculeId={selectedMolecule.id} onSelectMolecule={setSelectedId} />
            <MissionStudio completedMissionIds={completedMissionIds} onComplete={completeMission} />
          </div>
        ) : null}

        {activeMode === "build" && selectedMolecule ? (
          <div className={styles.workspacePage}>
            <GuidedBuilder molecule={selectedMolecule} />
          </div>
        ) : null}

        {activeMode === "teach" ? (
          <div className={styles.workspacePage}>
            <InstructorStudio completedMissionIds={completedMissionIds} />
          </div>
        ) : null}

        {activeMode === "discover" && selectedMolecule ? (
          <div className={styles.workspacePage}>
            <EvidenceMentor molecule={selectedMolecule} onSelectMolecule={setSelectedId} />
          </div>
        ) : null}
      </main>

      <footer className={styles.globalFooter}>
        <span>Dev Molecules · Pharmaceutical molecular learning environment</span>
        <span>Not clinical, laboratory or patent advice</span>
        <span>Identity data verified · Teaching interpretations pending expert review</span>
      </footer>
    </div>
  );
}

export default DevMoleculesApp;
