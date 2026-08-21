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
  const status = record.identity.verification.status;
  if (status === "verified") return "verified";
  if (status === "source-supported" || status === "expert-reviewed") return "supported";
  if (status === "predicted") return "predicted";
  return "unknown";
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
    evidenceLabel:
      record.identity.verification.status === "verified"
        ? "Kimlik doğrulandı"
        : "İnceleme bekliyor",
    evidenceTone: evidenceTone(record),
    accent: accents[index % accents.length],
  };
}

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>;
}

function MoleculePassport({ molecule }: { molecule: MoleculeRecord }) {
  const pubChemUrl = molecule.conformers[0]?.url?.split("#")[0] ?? null;

  return (
    <section className={styles.passportSection} aria-labelledby="passport-heading">
      <div className={styles.sectionIntro}>
        <p className={styles.kicker}>MOLECULE PASSPORT / SOURCE-BACKED IDENTITY</p>
        <h2 id="passport-heading">{molecule.identity.preferredName}</h2>
        <p>
          Moleküler varlık, stereokimya ve farmasötik formlar birbirine
          karıştırılmadan aynı pasaportta izlenir.
        </p>
      </div>

      <div className={styles.passportGrid}>
        <div className={styles.structureCard}>
          <div className={styles.structureCloud} aria-hidden="true">
            <span className={styles.atomA}>O</span><i className={styles.bondA} />
            <span className={styles.atomB}>N</span><i className={styles.bondB} />
            <span className={styles.atomC}>OH</span><i className={styles.bondC} />
            <span className={styles.ring}>AR</span>
          </div>
          <div className={styles.structureMeta}>
            <span>COMPUTED 2D REPRESENTATION</span>
            <strong>{molecule.identity.molecularFormula}</strong>
          </div>
        </div>

        <dl className={styles.identityGrid}>
          <div><dt>PubChem CID</dt><dd>{molecule.identity.pubChemCid}</dd></div>
          <div><dt>Molecular weight</dt><dd>{molecule.identity.molecularWeight.toFixed(2)} g/mol</dd></div>
          <div><dt>InChIKey</dt><dd className={styles.mono}>{molecule.identity.inchiKey}</dd></div>
          <div><dt>Stereochemistry</dt><dd>{molecule.stereochemistry.presentation}</dd></div>
          <div><dt>Teaching profile</dt><dd>{receptorLabels[molecule.betaBlockerProfile.receptorProfile]}</dd></div>
          <div><dt>Scientific state</dt><dd><span className={styles.stateDot} /> {molecule.identity.verification.status}</dd></div>
        </dl>

        <div className={styles.formsCard}>
          <span className={styles.smallLabel}>IDENTITY BOUNDARIES</span>
          <h3>Parent and pharmaceutical forms</h3>
          <ul>
            {molecule.forms.map((form) => (
              <li key={form.id}>
                <span>{form.displayName}</span>
                <small>{form.kind} · {form.verification.status}</small>
              </li>
            ))}
          </ul>
          {pubChemUrl ? <a href={pubChemUrl} target="_blank" rel="noreferrer">Open source record <span>↗</span></a> : null}
        </div>
      </div>
    </section>
  );
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
          <span><i /> Evidence guard active</span>
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
          <p>Full platform foundation · Seed data is not the final catalog</p>
        </div>

        {activeMode === "explore" ? (
          <div className={styles.workspacePage}>
            <MoleculeUniverse
              molecules={universeMolecules}
              initialLensId="scaffold"
              initialSelectedId={selectedId}
              eyebrow="EXPLORE / MOLECULAR UNIVERSE"
              title="İlaç kimyasını gezilebilir bir sisteme dönüştür."
              description="On doğrulanmış kimlik kaydıyla başlayan bu atlas; yapı, hedef ve farmasötik form sınırlarını aynı öğrenme yolculuğunda görünür kılar."
              onMoleculeSelect={(molecule) => setSelectedId(molecule.id)}
            />
            {selectedMolecule ? <MoleculePassport molecule={selectedMolecule} /> : null}
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
