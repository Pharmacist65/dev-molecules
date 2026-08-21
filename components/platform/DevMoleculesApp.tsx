"use client";

import { useEffect, useMemo, useState } from "react";

import { betaBlockerById, betaBlockers } from "@/lib/data/beta-blockers";
import type { MoleculeRecord } from "@/lib/domain";
import {
  MoleculeUniverse,
  type MoleculeEvidenceTone,
  type UniverseMolecule,
} from "@/components/universe";

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

const accents = [
  "#c8ff62", "#69e7da", "#ffb86b", "#85a8ff", "#db91ff",
  "#ff8f83", "#73dfb7", "#f2d36f", "#a8dcff", "#b9f38b",
] as const;

const receptorLabels: Record<string, string> = {
  "nonselective-beta": "Nonselective β",
  "beta1-selective": "β1-selective",
  "mixed-alpha1-beta": "Mixed α1 / β",
  "beta1-selective-vasodilatory": "β1 + vasodilatory",
  other: "Other profile",
  unknown: "Unknown",
};

function evidenceTone(record: MoleculeRecord): MoleculeEvidenceTone {
  const statuses = [
    record.identity.verification.status,
    record.betaBlockerProfile.verification.status,
  ];
  if (statuses.includes("predicted")) return "predicted";
  if (statuses.includes("pending-review")) return "pending";
  if (statuses.includes("unknown") || statuses.includes("conflicting")) return "unknown";
  if (statuses.every((status) => status === "verified" || status === "expert-reviewed")) {
    return "verified";
  }
  if (statuses.some((status) => status === "source-supported")) return "supported";
  return "unknown";
}

function evidenceLabel(record: MoleculeRecord) {
  const identityStatus = record.identity.verification.status;
  const classificationStatus = record.betaBlockerProfile.verification.status;
  const identityLabel =
    identityStatus === "verified" || identityStatus === "expert-reviewed"
      ? "Kimlik doğrulandı"
      : "Kimlik incelemede";
  const classificationLabel =
    classificationStatus === "verified" || classificationStatus === "expert-reviewed"
      ? "sınıflama doğrulandı"
      : classificationStatus === "source-supported"
        ? "sınıflama kaynak destekli"
        : classificationStatus === "predicted"
          ? "sınıflama öngörü"
          : "eğitim sınıflaması incelemede";

  return `${identityLabel} · ${classificationLabel}`;
}

function toUniverseMolecule(record: MoleculeRecord, index: number): UniverseMolecule {
  return {
    id: record.id,
    name: record.identity.preferredName,
    formula: record.identity.molecularFormula,
    category: receptorLabels[record.betaBlockerProfile.receptorProfile],
    summary: record.betaBlockerProfile.educationalSummary,
    lensValues: {
      therapeutic: "Kardiyovasküler",
      target: receptorLabels[record.betaBlockerProfile.receptorProfile],
      scaffold: record.betaBlockerProfile.scaffoldFamily,
    },
    evidenceLabel: evidenceLabel(record),
    evidenceTone: evidenceTone(record),
    accent: accents[index % accents.length],
    structure: {
      threeDUrl: record.structures.threeDimensional.publicPath,
      twoDUrl: record.structures.twoDimensional.publicPath,
      sourceLabel: `${record.structures.threeDimensional.sourceProvider} · ${record.structures.threeDimensional.sourceExternalId}`,
      sourceHref: record.structures.threeDimensional.sourceUrl,
      sourceId: record.structures.threeDimensional.sourceId,
      originLabel: record.structures.threeDimensional.origin,
      reviewStatus: record.structures.threeDimensional.verification.status,
      twoDSourceLabel: `${record.structures.twoDimensional.sourceProvider} · ${record.structures.twoDimensional.sourceExternalId}`,
      twoDSourceHref: record.structures.twoDimensional.sourceUrl,
      twoDSourceId: record.structures.twoDimensional.sourceId,
      twoDOriginLabel: record.structures.twoDimensional.origin,
      twoDReviewStatus: record.structures.twoDimensional.verification.status,
    },
  };
}

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>;
}

export function DevMoleculesApp() {
  const [activeMode, setActiveMode] = useState<PlatformMode>("explore");
  const [selectedId, setSelectedId] = useState<string>(betaBlockers[0]?.id ?? "");
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(new Set());

  const universeMolecules = useMemo(
    () => betaBlockers.map(toUniverseMolecule),
    [],
  );
  const selectedMolecule =
    betaBlockerById.get(selectedId as `molecule:${string}`) ?? betaBlockers[0];

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
              molecules={universeMolecules}
              initialLensId="scaffold"
              initialSelectedId={selectedId}
              eyebrow="EXPLORE / MOLECULAR UNIVERSE"
              title="İlaç moleküllerinin 3B evrenini keşfet."
              description="Gerçek atom ve bağ yapılarını; tedavi alanı, hedef ailesi ve yapısal iskelet lensleriyle incele."
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
