"use client";

import { useEffect, useRef, useState } from "react";

import { MoleculeStructurePreview } from "@/components/molecule-viewer";
import { resolveCatalogAssetPath } from "@/lib/catalog";

import styles from "./DrugAtlas.module.css";
import type { AtlasCatalogNavigator } from "./types";

type ThumbnailState =
  | { readonly status: "waiting" | "loading" }
  | { readonly status: "ready"; readonly structureUrl: string }
  | { readonly status: "missing" | "error" };

export interface AtlasStructureThumbnailProps {
  readonly entityId: string;
  readonly moleculeName: string;
  readonly pubChemCid: number;
  readonly navigator: AtlasCatalogNavigator;
  readonly assetBasePath?: string;
  readonly copy: {
    readonly waiting: string;
    readonly loading: string;
    readonly missing: string;
    readonly unavailable: string;
  };
}

/**
 * Hydration starts near the viewport, not while the compact index is read.
 * This preserves per-record shard and 2D SDF loading for the 1,552-record list.
 */
export function AtlasStructureThumbnail({
  entityId,
  moleculeName,
  pubChemCid,
  navigator,
  assetBasePath = "/",
  copy,
}: AtlasStructureThumbnailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<ThumbnailState>({ status: "waiting" });

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [entityId]);

  useEffect(() => {
    if (!visible) return undefined;
    let current = true;
    void navigator
      .hydrate(entityId)
      .then((entity) => {
        if (!current) return;
        if (!entity || entity.identity.pubChemCid !== pubChemCid) {
          setState({ status: "missing" });
          return;
        }
        setState({
          status: "ready",
          structureUrl: resolveCatalogAssetPath(
            entity.structures.twoD.path,
            assetBasePath,
          ),
        });
      })
      .catch(() => {
        if (current) setState({ status: "error" });
      });
    return () => {
      current = false;
    };
  }, [assetBasePath, entityId, navigator, pubChemCid, visible]);

  const effectiveStatus = visible && state.status === "waiting"
    ? "loading"
    : state.status;
  const stateLabel = effectiveStatus === "waiting"
    ? copy.waiting
    : effectiveStatus === "loading"
      ? copy.loading
      : effectiveStatus === "missing"
        ? copy.missing
        : copy.unavailable;

  return (
    <div
      ref={rootRef}
      className={styles.thumbnail}
      data-thumbnail-status={effectiveStatus}
      aria-label={`${moleculeName} · ${effectiveStatus === "ready" ? "2D" : stateLabel}`}
    >
      {state.status === "ready" ? (
        <MoleculeStructurePreview
          structureUrl={state.structureUrl}
          moleculeName={moleculeName}
          expectedPubChemCid={pubChemCid}
          className={styles.thumbnailPreview}
        />
      ) : (
        <span className={styles.thumbnailState} aria-hidden="true">
          <span>C</span>
          <small>{stateLabel}</small>
        </span>
      )}
    </div>
  );
}

export default AtlasStructureThumbnail;
