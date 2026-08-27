"use client";

import { MoleculeUniverse } from "@/components/universe";

import styles from "./DrugAtlas.module.css";
import type { AtlasSpatialConfiguration } from "./types";

export interface AtlasSpatialViewProps {
  readonly configuration: AtlasSpatialConfiguration;
  /** Main Atlas owns the edge-to-edge product stage; Family keeps the embedded surface. */
  readonly variant?: "embedded" | "immersive";
  readonly copy: {
    readonly scope: string;
    readonly description: string;
    readonly bounded: string;
  };
}

/** This module is imported only after the user opens Spatial. */
export function AtlasSpatialView({
  configuration,
  variant = "embedded",
  copy,
}: AtlasSpatialViewProps) {
  return (
    <section
      className={styles.spatial}
      data-atlas-spatial="true"
      data-spatial-variant={variant}
      data-spatial-viewport={variant === "immersive" ? "primary" : "embedded"}
    >
      {variant === "embedded" ? (
        <p className={styles.spatialBoundary}>
          <span className={styles.spatialBoundaryLead}>
            <strong>{copy.scope}</strong>
            <span>{copy.description}</span>
          </span>
          <span>{copy.bounded}</span>
        </p>
      ) : (
        <p className={styles.spatialAccessibleScope}>
          {copy.scope}. {copy.description} {copy.bounded}
        </p>
      )}
      <MoleculeUniverse
        {...configuration.universe}
        catalogRecordCount={configuration.catalogCount}
        surfaceVariant={variant}
      />
    </section>
  );
}

export default AtlasSpatialView;
