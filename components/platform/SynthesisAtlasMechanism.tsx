"use client";

import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type {
  SynthesisAtlasElectronAnchor,
  SynthesisAtlasRoute,
  SynthesisAtlasTransformation,
} from "@/lib/domain/synthesis-atlas";

import { SmilesStructure, type SmilesAtomAnchor } from "./SmilesStructure";
import atlas from "./SynthesisAtlas.module.css";

interface SynthesisAtlasMechanismProps {
  readonly route: SynthesisAtlasRoute;
  readonly step: SynthesisAtlasTransformation;
  readonly locale: Locale;
}

const copy = {
  tr: {
    eyebrow: "Mekanizma katmanı",
    teachingModel: "Kürate edilmiş öğretim yorumu",
    nucleophile: "Nükleofil",
    electrophile: "Elektrofil",
    intermediate: "Ara tür",
    stereochemistry: "Stereokimyasal sonuç",
    electronFlow: "Elektron akışı",
    commonError: "Sık hata",
    unavailable: "Bu basamak için savunulabilir mekanizma katmanı yayımlanmadı.",
    inputs: "Girdi yapıları",
    output: "Çıktı yapısı",
    mappedFlow: "Gerçek 2B atomlarına bağlı elektron akışı",
    unmappedFlow: "Bu hareket için kürate edilmiş atom uçları yok; dekoratif ok çizilmedi.",
  },
  en: {
    eyebrow: "Mechanism layer",
    teachingModel: "Curated teaching interpretation",
    nucleophile: "Nucleophile",
    electrophile: "Electrophile",
    intermediate: "Intermediate",
    stereochemistry: "Stereochemical outcome",
    electronFlow: "Electron flow",
    commonError: "Common error",
    unavailable: "No defensible mechanism layer is published for this step.",
    inputs: "Input structures",
    output: "Output structure",
    mappedFlow: "Electron flow anchored to the actual 2D atoms",
    unmappedFlow: "This move has no curated atom endpoints, so no decorative arrow is drawn.",
  },
} as const;

interface ElectronPath {
  readonly id: string;
  readonly d: string;
}

interface ElectronDiagramState {
  readonly width: number;
  readonly height: number;
  readonly paths: readonly ElectronPath[];
}

const emptyDiagram: ElectronDiagramState = { width: 1, height: 1, paths: [] };

function atomAnchorId(materialId: string, atomIndex: number): string {
  return `${materialId}|${atomIndex}`;
}

function resolveElectronAnchor(
  anchor: SynthesisAtlasElectronAnchor,
  markers: ReadonlyMap<string, DOMRect>,
  containerRect: DOMRect,
): { readonly x: number; readonly y: number } | null {
  const points = anchor.atomIndexes.map((atomIndex) => {
    const rect = markers.get(atomAnchorId(anchor.materialId, atomIndex));
    return rect
      ? {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        }
      : null;
  });
  if (points.some((point) => point === null)) return null;
  const resolved = points.filter((point) => point !== null);
  return {
    x: resolved.reduce((sum, point) => sum + point.x, 0) / resolved.length,
    y: resolved.reduce((sum, point) => sum + point.y, 0) / resolved.length,
  };
}

function curvedElectronPath(
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const bend = Math.min(52, Math.max(22, distance * 0.22));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const controlX = (start.x + end.x) / 2 + normalX * bend;
  const controlY = (start.y + end.y) / 2 + normalY * bend;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function SynthesisAtlasMechanism({
  route,
  step,
  locale,
}: SynthesisAtlasMechanismProps) {
  const labels = copy[locale];
  const mechanism = step.mechanism;
  const reactId = useId();
  const arrowMarkerId = `${reactId.replace(/[^a-z0-9_-]/giu, "-")}-electron-arrow`;
  const materialById = useMemo(
    () => new Map(
      route.materials.map((material) => [material.id, material] as const),
    ),
    [route.materials],
  );
  const inputs = useMemo(
    () => step.inputMaterialIds
      .map((id) => materialById.get(id))
      .filter((material) => material !== undefined),
    [materialById, step.inputMaterialIds],
  );
  const output = useMemo(
    () => step.outputMaterialId
      ? materialById.get(step.outputMaterialId)
      : undefined,
    [materialById, step.outputMaterialId],
  );
  const displayedMaterials = useMemo(
    () => [...inputs, ...(output ? [output] : [])],
    [inputs, output],
  );
  const displayedMaterialIds = useMemo(
    () => new Set(displayedMaterials.map((material) => material.id)),
    [displayedMaterials],
  );
  const mappedMoves = useMemo(
    () => mechanism?.electronMoves.filter(
      (move) =>
        move.fromAnchor &&
        move.toAnchor &&
        displayedMaterialIds.has(move.fromAnchor.materialId) &&
        displayedMaterialIds.has(move.toAnchor.materialId),
    ) ?? [],
    [displayedMaterialIds, mechanism],
  );
  const anchorsByMaterialId = useMemo(() => {
    const collected = new Map<string, Map<number, SmilesAtomAnchor>>();
    for (const move of mappedMoves) {
      for (const anchor of [move.fromAnchor, move.toAnchor]) {
        if (!anchor) continue;
        const materialAnchors = collected.get(anchor.materialId) ?? new Map();
        for (const atomIndex of anchor.atomIndexes) {
          materialAnchors.set(atomIndex, {
            id: atomAnchorId(anchor.materialId, atomIndex),
            atomIndex,
          });
        }
        collected.set(anchor.materialId, materialAnchors);
      }
    }
    return new Map(
      [...collected].map(([materialId, anchors]) => [
        materialId,
        [...anchors.values()],
      ]),
    );
  }, [mappedMoves]);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [drawRevision, setDrawRevision] = useState(0);
  const [diagram, setDiagram] = useState<ElectronDiagramState>(emptyDiagram);
  const markDrawReady = useCallback(() => {
    setDrawRevision((current) => current + 1);
  }, []);

  useLayoutEffect(() => {
    const container = diagramRef.current;
    if (!container || !mappedMoves.length) {
      setDiagram(emptyDiagram);
      return undefined;
    }

    let frame = 0;
    const update = () => {
      frame = window.requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const markers = new Map<string, DOMRect>();
        container
          .querySelectorAll<SVGCircleElement>("[data-smiles-atom-anchor]")
          .forEach((marker) => {
            const id = marker.dataset.smilesAtomAnchor;
            if (id) markers.set(id, marker.getBoundingClientRect());
          });
        const paths = mappedMoves.flatMap((move) => {
          if (!move.fromAnchor || !move.toAnchor) return [];
          const start = resolveElectronAnchor(move.fromAnchor, markers, containerRect);
          const end = resolveElectronAnchor(move.toAnchor, markers, containerRect);
          return start && end
            ? [{ id: move.id, d: curvedElectronPath(start, end) }]
            : [];
        });
        setDiagram({
          width: Math.max(1, containerRect.width),
          height: Math.max(1, containerRect.height),
          paths,
        });
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [drawRevision, mappedMoves]);

  if (!mechanism) {
    return <p className={atlas.mechanismUnavailable}>{labels.unavailable}</p>;
  }

  return (
    <section
      className={atlas.mechanismLayer}
      aria-labelledby="synthesis-atlas-mechanism-heading"
      data-mechanism-layer={mechanism.id}
    >
      <header className={atlas.mechanismHeader}>
        <div>
          <span>{labels.eyebrow}</span>
          <h3 id="synthesis-atlas-mechanism-heading">{mechanism.title[locale]}</h3>
        </div>
        <strong>{labels.teachingModel}</strong>
      </header>

      <div
        ref={diagramRef}
        className={atlas.mechanismStructures}
        data-electron-mapping={
          mappedMoves.length === mechanism.electronMoves.length ? "complete" : "partial"
        }
      >
        <section>
          <span>{labels.inputs}</span>
          <div>
            {inputs.map((material) => (
              <SmilesStructure
                key={material.id}
                className={atlas.mechanismStructure}
                smiles={material.smiles}
                label={material.label[locale]}
                atomAnchors={anchorsByMaterialId.get(material.id)}
                onDrawReady={markDrawReady}
              />
            ))}
          </div>
        </section>
        {output ? (
          <section>
            <span>{labels.output}</span>
            <SmilesStructure
              className={atlas.mechanismStructure}
              smiles={output.smiles}
              label={output.label[locale]}
              atomAnchors={anchorsByMaterialId.get(output.id)}
              onDrawReady={markDrawReady}
            />
          </section>
        ) : null}
        {diagram.paths.length ? (
          <svg
            className={atlas.mechanismArrowOverlay}
            viewBox={`0 0 ${diagram.width} ${diagram.height}`}
            aria-label={labels.mappedFlow}
            role="img"
          >
            <defs>
              <marker
                id={arrowMarkerId}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            {diagram.paths.map((path) => (
              <path
                key={path.id}
                d={path.d}
                markerEnd={`url(#${arrowMarkerId})`}
              />
            ))}
          </svg>
        ) : null}
      </div>

      <div className={atlas.mechanismRoles}>
        <article><span>{labels.nucleophile}</span><strong>{mechanism.nucleophile[locale]}</strong></article>
        <article><span>{labels.electrophile}</span><strong>{mechanism.electrophile[locale]}</strong></article>
        <article><span>{labels.intermediate}</span><strong>{mechanism.intermediate[locale]}</strong></article>
        <article><span>{labels.stereochemistry}</span><strong>{mechanism.stereochemicalOutcome[locale]}</strong></article>
      </div>

      <div className={atlas.electronFlow}>
        <span>{labels.electronFlow}</span>
        <ol>
          {mechanism.electronMoves.map((move, index) => {
            return (
              <li key={move.id}>
                <b>{index + 1}</b>
                <div className={atlas.electronDiagram} aria-label={move.explanation[locale]}>
                  <strong>{move.from[locale]}</strong>
                  <span aria-hidden="true">→</span>
                  <strong>{move.to[locale]}</strong>
                </div>
                <p>{move.explanation[locale]}</p>
                {!mappedMoves.some((candidate) => candidate.id === move.id) ? (
                  <small>{labels.unmappedFlow}</small>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <aside className={atlas.mechanismError}>
        <span>{labels.commonError}</span>
        <p>{mechanism.commonError[locale]}</p>
      </aside>
    </section>
  );
}
