"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  SharedMolecularScene,
  type MolecularSceneCamera,
  type MolecularScenePort,
} from "@/components/molecular-scene";
import { MoleculeStructurePreview } from "@/components/molecule-viewer";
import { useI18n } from "@/lib/i18n";

import styles from "./HomeMoleculeStage.module.css";

export interface HomeFeaturedMolecule {
  readonly id: string;
  readonly name: string;
  readonly formula?: string;
  readonly pubChemCid: number;
  readonly threeDUrl: string;
  readonly twoDUrl?: string;
}

export interface HomeMoleculeStageProps {
  readonly molecule: HomeFeaturedMolecule;
}

const STAGE_CAMERA: MolecularSceneCamera = {
  position: { x: 0, y: 3.2, z: 19.5 },
  target: { x: 0, y: 0, z: 0 },
  fov: 38,
  near: 0.05,
  far: 500,
};

export default function HomeMoleculeStage({ molecule }: HomeMoleculeStageProps) {
  const { t } = useI18n();
  const scenePort = useRef<MolecularScenePort | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const sceneMolecules = useMemo(
    () => [{
      id: molecule.id,
      name: molecule.name,
      structureUrl: molecule.threeDUrl,
      expectedPubChemCid: molecule.pubChemCid,
      position: { x: 0, y: 0, z: 0 },
      scale: 1,
      structureOrigin: "computed-3d-conformer",
    }],
    [molecule],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let frame = 0;
    let previousFrame = 0;
    const startedAt = window.performance.now();

    const rotate = (now: number) => {
      frame = window.requestAnimationFrame(rotate);
      if (!scenePort.current || document.hidden || now - previousFrame < 42) return;
      previousFrame = now;
      const angle = (now - startedAt) * 0.00012;
      const port = scenePort.current;
      try {
        port.setCamera({
          ...STAGE_CAMERA,
          position: {
            x: Math.sin(angle) * 5.4,
            y: 3.2 + Math.sin(angle * 0.48) * 0.35,
            z: Math.cos(angle) * 5.4 + 18.7,
          },
        });
      } catch {
        // React Strict Mode disposes its first probe adapter before mounting the
        // real scene. Drop that stale port and wait for the next onSceneReady.
        if (scenePort.current === port) scenePort.current = null;
      }
    };
    frame = window.requestAnimationFrame(rotate);
    return () => {
      window.cancelAnimationFrame(frame);
      scenePort.current = null;
    };
  }, []);

  return (
    <div className={styles.stage}>
      {sceneFailed && molecule.twoDUrl ? (
        <div className={styles.fallback}>
          <MoleculeStructurePreview
            structureUrl={molecule.twoDUrl}
            moleculeName={molecule.name}
            expectedPubChemCid={molecule.pubChemCid}
            className={styles.preview}
          />
          <p>{t("home.twoDFallback")}</p>
        </div>
      ) : (
        <SharedMolecularScene
          molecules={sceneMolecules}
          visibleMoleculeIds={[molecule.id]}
          levelOfDetail="focus"
          focusedMoleculeId={molecule.id}
          representation="ball-and-stick"
          showHydrogens={false}
          camera={STAGE_CAMERA}
          className={styles.scene}
          ariaLabel={t("home.featuredMoleculeAria", { name: molecule.name })}
          onSceneReady={(port) => {
            scenePort.current = port;
          }}
          onStatusChange={(detail) => {
            if (detail.status === "error" && detail.loadedMoleculeCount === 0) {
              scenePort.current = null;
              setSceneFailed(true);
            }
          }}
        />
      )}
      <div className={styles.identity} aria-hidden="true">
        <span>{sceneFailed ? "2D" : "3D"}</span>
        <strong>{molecule.name}</strong>
        {molecule.formula ? <code>{molecule.formula}</code> : null}
      </div>
      <div className={styles.orbit} aria-hidden="true" />
    </div>
  );
}
