"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";
import type { MoleculeStructure } from "@/lib/structure/sdf";

import styles from "./MoleculeViewer.module.css";
import { DEFAULT_VIEWER_TRANSFORM, drawMolecule } from "./rendering";
import { useSdfResource } from "./use-sdf-resource";

export interface MoleculeStructurePreviewProps {
  readonly structureUrl: string;
  readonly moleculeName: string;
  readonly expectedPubChemCid?: number;
  readonly className?: string;
  readonly showHydrogens?: boolean;
  readonly onLoad?: (structure: MoleculeStructure) => void;
}

export function MoleculeStructurePreview({
  structureUrl,
  moleculeName,
  expectedPubChemCid,
  className,
  showHydrogens = false,
  onLoad,
}: MoleculeStructurePreviewProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resource = useSdfResource(structureUrl.trim() ? structureUrl : null, {
    expectedDimension: "2d",
    expectedPubChemCid,
  });
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      const bounds = entries[0]?.contentRect;
      if (!bounds) return;
      setSize({
        width: Math.max(1, Math.round(bounds.width)),
        height: Math.max(1, Math.round(bounds.height)),
      });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (resource.status === "ready") onLoad?.(resource.structure);
  }, [onLoad, resource.status, resource.structure]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.round(size.width * pixelRatio);
    const targetHeight = Math.round(size.height * pixelRatio);
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (!resource.structure) {
      context.clearRect(0, 0, size.width, size.height);
      return;
    }
    drawMolecule(context, resource.structure, {
      width: size.width,
      height: size.height,
      dimension: "2d",
      representation: "ball-and-stick",
      showHydrogens,
      showLabels: false,
      selectedAtomIndex: null,
      hoveredAtomIndex: null,
      transform: { ...DEFAULT_VIEWER_TRANSFORM, rotationX: 0, rotationY: 0 },
    });
  }, [resource.structure, showHydrogens, size.height, size.width]);

  return (
    <div className={[styles.preview, className].filter(Boolean).join(" ")}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t("viewer.previewAria", { name: moleculeName })}
      >
        {t("viewer.previewAria", { name: moleculeName })}
      </canvas>
      {resource.status === "loading" ? (
        <span className={styles.previewState} role="status">
          {t("viewer.previewLoading")}
        </span>
      ) : null}
      {resource.status === "idle" ? (
        <span className={`${styles.previewState} ${styles.previewError}`} role="status">
          {t("viewer.previewMissing")}
        </span>
      ) : null}
      {resource.status === "error" ? (
        <span className={`${styles.previewState} ${styles.previewError}`} role="status">
          {t("viewer.previewError")}
        </span>
      ) : null}
    </div>
  );
}
