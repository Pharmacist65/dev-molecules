"use client";

import { useEffect, useRef, useState } from "react";

import type { MoleculeStructure } from "@/lib/structure/sdf";

import styles from "./MoleculeViewer.module.css";
import { DEFAULT_VIEWER_TRANSFORM, drawMolecule } from "./rendering";
import { useSdfResource } from "./use-sdf-resource";

export interface MoleculeStructurePreviewProps {
  readonly structureUrl: string;
  readonly moleculeName: string;
  readonly className?: string;
  readonly showHydrogens?: boolean;
  readonly onLoad?: (structure: MoleculeStructure) => void;
}

export function MoleculeStructurePreview({
  structureUrl,
  moleculeName,
  className,
  showHydrogens = false,
  onLoad,
}: MoleculeStructurePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resource = useSdfResource(structureUrl.trim() ? structureUrl : null);
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
    if (!canvas || !resource.structure) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.round(size.width * pixelRatio);
    const targetHeight = Math.round(size.height * pixelRatio);
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
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
        aria-label={`${moleculeName} gerçek 2B atom ve bağ yapısı`}
      >
        {moleculeName} için SDF koordinatlarından iki boyutlu yapı.
      </canvas>
      {resource.status === "loading" ? (
        <span className={styles.previewState} role="status">
          Yapı yükleniyor…
        </span>
      ) : null}
      {resource.status === "idle" ? (
        <span className={`${styles.previewState} ${styles.previewError}`} role="status">
          Yapı kaynağı yok
        </span>
      ) : null}
      {resource.status === "error" ? (
        <span className={`${styles.previewState} ${styles.previewError}`} role="status">
          Yapı verisi okunamadı
        </span>
      ) : null}
    </div>
  );
}
