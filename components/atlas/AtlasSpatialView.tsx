"use client";

import { MoleculeUniverse } from "@/components/universe";

import styles from "./DrugAtlas.module.css";
import type { AtlasSpatialConfiguration } from "./types";

export interface AtlasSpatialViewProps {
  readonly configuration: AtlasSpatialConfiguration;
  readonly copy: {
    readonly scope: string;
    readonly bounded: string;
  };
}

/** This module is imported only after the user opens Spatial. */
export function AtlasSpatialView({
  configuration,
  copy,
}: AtlasSpatialViewProps) {
  return (
    <section className={styles.spatial} data-atlas-spatial="true">
      <p className={styles.spatialBoundary}>
        <strong>{copy.scope}</strong>
        <span>{copy.bounded}</span>
      </p>
      <MoleculeUniverse
        {...configuration.universe}
        catalogRecordCount={configuration.catalogCount}
      />
    </section>
  );
}

export default AtlasSpatialView;
