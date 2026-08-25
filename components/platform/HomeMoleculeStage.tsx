"use client";

import { useMemo, useState } from "react";

import { SharedMolecularScene } from "@/components/molecular-scene";
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

export default function HomeMoleculeStage({ molecule }: HomeMoleculeStageProps) {
  const { t } = useI18n();
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

  return (
    <div
      className={styles.stage}
      data-home-featured-stage="true"
      data-auto-rotate="off"
      data-selected-atom-overlay-collision="0"
    >
      <div className={styles.viewport} data-home-featured-viewport="true">
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
            copyMode="student"
            molecules={sceneMolecules}
            visibleMoleculeIds={[molecule.id]}
            levelOfDetail="focus"
            focusedMoleculeId={molecule.id}
            representation="ball-and-stick"
            showHydrogens={false}
            atomSelectionEnabled={false}
            focusAutoFit
            focusFitPadding={0.14}
            className={styles.scene}
            ariaLabel={t("home.featuredMoleculeAria", { name: molecule.name })}
            onStatusChange={(detail) => {
              if (detail.status === "error" && detail.loadedMoleculeCount === 0) {
                setSceneFailed(true);
              }
            }}
          />
        )}
        <div className={styles.orbit} aria-hidden="true" />
      </div>
      <div className={styles.identity} data-home-featured-identity="true" aria-hidden="true">
        <span>{sceneFailed ? "2D" : "3D"}</span>
        <strong>{molecule.name}</strong>
        {molecule.formula ? <code>{molecule.formula}</code> : null}
      </div>
    </div>
  );
}
