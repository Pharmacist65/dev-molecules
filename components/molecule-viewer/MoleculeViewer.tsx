"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";

import type { MoleculeStructure, SdfAtom } from "@/lib/structure/sdf";

import styles from "./MoleculeViewer.module.css";
import {
  DEFAULT_VIEWER_TRANSFORM,
  drawMolecule,
  findAtomAtPoint,
  type MoleculeRepresentation,
  type ProjectedAtom,
  type ViewerDimension,
  type ViewerTransform,
} from "./rendering";
import { useSdfResource } from "./use-sdf-resource";

export interface MoleculeViewerProps {
  readonly structureUrl: string;
  readonly twoDStructureUrl?: string;
  readonly moleculeName: string;
  readonly sourceLabel: string;
  readonly originLabel: string;
  readonly sourceHref?: string;
  /** Canonical 2D record provenance; never falls back to the 3D conformer. */
  readonly twoDSourceLabel?: string;
  readonly twoDOriginLabel?: string;
  readonly twoDSourceHref?: string;
  readonly className?: string;
  readonly initialRepresentation?: MoleculeRepresentation;
  readonly initialDimension?: ViewerDimension;
  readonly showHydrogensInitially?: boolean;
  readonly showLabelsInitially?: boolean;
  readonly onAtomHover?: (atom: SdfAtom | null) => void;
  readonly onAtomSelect?: (atom: SdfAtom | null) => void;
  readonly onStructureLoad?: (structure: MoleculeStructure) => void;
}

type InteractionTool = "rotate" | "pan";

interface DragState {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly lastX: number;
  readonly lastY: number;
  readonly tool: InteractionTool;
  readonly moved: boolean;
}

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: { readonly clientX: number; readonly clientY: number },
) {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function useCanvasSize(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const bounds = canvas.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.round(bounds.width)),
        height: Math.max(1, Math.round(bounds.height)),
      });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    updateSize();

    return () => observer.disconnect();
  }, [canvasRef]);

  return size;
}

export function MoleculeViewer({
  structureUrl,
  twoDStructureUrl,
  moleculeName,
  sourceLabel,
  originLabel,
  sourceHref,
  twoDSourceLabel,
  twoDOriginLabel,
  twoDSourceHref,
  className,
  initialRepresentation = "ball-and-stick",
  initialDimension = "3d",
  showHydrogensInitially = true,
  showLabelsInitially = false,
  onAtomHover,
  onAtomSelect,
  onStructureLoad,
}: MoleculeViewerProps) {
  const hasThreeDStructure = structureUrl.trim().length > 0;
  const hasTwoDStructure = Boolean(twoDStructureUrl?.trim());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectedAtomsRef = useRef<readonly ProjectedAtom[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  const threeDResource = useSdfResource(hasThreeDStructure ? structureUrl : null);
  const [dimension, setDimension] = useState<ViewerDimension>(
    initialDimension === "2d" && !hasTwoDStructure ? "3d" : initialDimension,
  );
  const twoDResource = useSdfResource(
    dimension === "2d" && hasTwoDStructure ? (twoDStructureUrl ?? null) : null,
  );
  const [representation, setRepresentation] =
    useState<MoleculeRepresentation>(initialRepresentation);
  const [showHydrogens, setShowHydrogens] = useState(showHydrogensInitially);
  const [showLabels, setShowLabels] = useState(showLabelsInitially);
  const [interactionTool, setInteractionTool] = useState<InteractionTool>("rotate");
  const [transform, setTransform] = useState<ViewerTransform>(
    DEFAULT_VIEWER_TRANSFORM,
  );
  const [hoveredAtomIndex, setHoveredAtomIndex] = useState<number | null>(null);
  const [selectedAtomIndex, setSelectedAtomIndex] = useState<number | null>(null);
  const canvasSize = useCanvasSize(canvasRef);
  const descriptionId = useId();
  const statusId = useId();
  const activeResource = dimension === "2d" ? twoDResource : threeDResource;
  const activeStructure = activeResource.structure;

  const resetView = useCallback(() => {
    setTransform(DEFAULT_VIEWER_TRANSFORM);
  }, []);

  const updateZoom = useCallback((factor: number) => {
    setTransform((current) => ({
      ...current,
      zoom: clamp(current.zoom * factor, 0.35, 5),
    }));
  }, []);

  useEffect(() => {
    if (threeDResource.status === "ready") {
      onStructureLoad?.(threeDResource.structure);
    }
  }, [onStructureLoad, threeDResource.status, threeDResource.structure]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      resetView();
      setSelectedAtomIndex(null);
      hoveredIndexRef.current = null;
      setHoveredAtomIndex(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dimension, resetView, structureUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeStructure) {
      projectedAtomsRef.current = [];
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.round(canvasSize.width * pixelRatio);
    const targetHeight = Math.round(canvasSize.height * pixelRatio);
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    projectedAtomsRef.current = drawMolecule(context, activeStructure, {
      width: canvasSize.width,
      height: canvasSize.height,
      dimension,
      representation,
      showHydrogens,
      showLabels,
      selectedAtomIndex,
      hoveredAtomIndex,
      transform,
    });
  }, [
    activeStructure,
    canvasSize.height,
    canvasSize.width,
    dimension,
    hoveredAtomIndex,
    representation,
    selectedAtomIndex,
    showHydrogens,
    showLabels,
    transform,
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOTION_QUERY);
    const canvas = canvasRef.current;
    if (mediaQuery.matches) canvas?.classList.add(styles.reducedMotion);

    const handleChange = (event: MediaQueryListEvent) => {
      canvas?.classList.toggle(styles.reducedMotion, event.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setHoverFromPoint = useCallback(
    (x: number, y: number) => {
      const atom = findAtomAtPoint(projectedAtomsRef.current, x, y) ?? null;
      if (hoveredIndexRef.current !== (atom?.index ?? null)) {
        hoveredIndexRef.current = atom?.index ?? null;
        setHoveredAtomIndex(atom?.index ?? null);
        onAtomHover?.(atom);
      }
      return atom;
    },
    [onAtomHover],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!activeStructure) return;
    const point = getCanvasPoint(event.currentTarget, event);
    const tool = event.shiftKey || event.button === 1 ? "pan" : interactionTool;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      lastX: point.x,
      lastY: point.y,
      tool,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event.currentTarget, event);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      setHoverFromPoint(point.x, point.y);
      return;
    }

    const deltaX = point.x - drag.lastX;
    const deltaY = point.y - drag.lastY;
    const moved =
      drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > 3;
    dragRef.current = { ...drag, lastX: point.x, lastY: point.y, moved };

    if (drag.tool === "pan" || dimension === "2d") {
      setTransform((current) => ({
        ...current,
        panX: current.panX + deltaX,
        panY: current.panY + deltaY,
      }));
    } else {
      setTransform((current) => ({
        ...current,
        rotationX: current.rotationX + deltaY * 0.009,
        rotationY: current.rotationY + deltaX * 0.009,
      }));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = getCanvasPoint(event.currentTarget, event);
    if (!drag.moved) {
      const atom = setHoverFromPoint(point.x, point.y);
      setSelectedAtomIndex(atom?.index ?? null);
      onAtomSelect?.(atom);
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    updateZoom(Math.exp(-event.deltaY * 0.0012));
  };

  const selectRelativeAtom = (offset: number) => {
    if (!activeStructure) return;
    const visibleAtoms = activeStructure.atoms.filter(
      (atom) => showHydrogens || atom.element !== "H",
    );
    if (visibleAtoms.length === 0) return;
    const currentPosition = visibleAtoms.findIndex(
      (atom) => atom.index === selectedAtomIndex,
    );
    const nextPosition =
      (currentPosition + offset + visibleAtoms.length) % visibleAtoms.length;
    const atom = visibleAtoms[nextPosition];
    setSelectedAtomIndex(atom.index);
    onAtomSelect?.(atom);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const panStep = 14;
    const rotationStep = 0.1;
    let handled = true;

    if (event.key === "+" || event.key === "=") updateZoom(1.13);
    else if (event.key === "-" || event.key === "_") updateZoom(1 / 1.13);
    else if (event.key === "0" || event.key === "Home") resetView();
    else if (event.key === "]") selectRelativeAtom(1);
    else if (event.key === "[") selectRelativeAtom(-1);
    else if (event.key === "Escape") {
      setSelectedAtomIndex(null);
      onAtomSelect?.(null);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      const horizontal =
        event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      const vertical =
        event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      setTransform((current) =>
        interactionTool === "pan" || dimension === "2d"
          ? {
              ...current,
              panX: current.panX + horizontal * panStep,
              panY: current.panY + vertical * panStep,
            }
          : {
              ...current,
              rotationX: current.rotationX + vertical * rotationStep,
              rotationY: current.rotationY + horizontal * rotationStep,
            },
      );
    } else handled = false;

    if (handled) event.preventDefault();
  };

  const toggleHydrogens = () => {
    if (showHydrogens && activeStructure) {
      const selectedIsHydrogen = activeStructure.atoms.some(
        (atom) => atom.index === selectedAtomIndex && atom.element === "H",
      );
      const hoveredIsHydrogen = activeStructure.atoms.some(
        (atom) => atom.index === hoveredAtomIndex && atom.element === "H",
      );

      if (selectedIsHydrogen) {
        setSelectedAtomIndex(null);
        onAtomSelect?.(null);
      }
      if (hoveredIsHydrogen) {
        hoveredIndexRef.current = null;
        setHoveredAtomIndex(null);
        onAtomHover?.(null);
      }
    }
    setShowHydrogens((current) => !current);
  };

  const selectedAtom =
    activeStructure?.atoms.find((atom) => atom.index === selectedAtomIndex) ?? null;
  const hoveredAtom =
    activeStructure?.atoms.find((atom) => atom.index === hoveredAtomIndex) ?? null;
  const statusAtom = selectedAtom ?? hoveredAtom;
  const activeSourceLabel =
    dimension === "2d"
      ? (twoDSourceLabel ?? "2B kaynak etiketi belirtilmedi")
      : sourceLabel;
  const activeOriginLabel =
    dimension === "2d" ? (twoDOriginLabel ?? "2B köken belirtilmedi") : originLabel;
  const activeSourceHref = dimension === "2d" ? twoDSourceHref : sourceHref;
  const canvasInstruction =
    dimension === "3d"
      ? "Sürükleyerek döndürün; kaydırma aracı veya Shift ile sürükleyerek taşıyın. Tekerlek ile yakınlaştırın."
      : "Sürükleyerek taşıyın; tekerlek ile yakınlaştırın.";

  return (
    <section
      className={[styles.viewer, className].filter(Boolean).join(" ")}
      aria-label={`${moleculeName} molekül görüntüleyicisi`}
    >
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.liveDot} aria-hidden="true" />
          <div>
            <p>{dimension === "3d" ? "GERÇEK 3B YAPI" : "GERÇEK 2B YAPI"}</p>
            <strong>{moleculeName}</strong>
          </div>
        </div>
        <div className={styles.provenance} aria-label="Yapı kaynağı">
          <span>{activeOriginLabel}</span>
          {activeSourceHref ? (
            <a href={activeSourceHref} target="_blank" rel="noreferrer">
              {activeSourceLabel}
            </a>
          ) : (
            <strong>{activeSourceLabel}</strong>
          )}
        </div>
      </header>

      <div className={styles.toolbar} aria-label="Molekül görünüm kontrolleri">
        <div className={styles.segment} role="group" aria-label="Boyut">
          <button
            type="button"
            aria-pressed={dimension === "3d"}
            onClick={() => setDimension("3d")}
          >
            3B
          </button>
          <button
            type="button"
            aria-pressed={dimension === "2d"}
            disabled={!hasTwoDStructure}
            title={hasTwoDStructure ? "2B yapıyı göster" : "2B yapı kaynağı yok"}
            onClick={() => setDimension("2d")}
          >
            2B
          </button>
        </div>

        <div className={styles.segment} role="group" aria-label="Gösterim biçimi">
          <button
            type="button"
            aria-pressed={representation === "ball-and-stick"}
            disabled={dimension === "2d"}
            onClick={() => setRepresentation("ball-and-stick")}
          >
            Top + çubuk
          </button>
          <button
            type="button"
            aria-pressed={representation === "space-filling"}
            disabled={dimension === "2d"}
            onClick={() => setRepresentation("space-filling")}
          >
            Uzay dolgu
          </button>
        </div>

        <div className={styles.segment} role="group" aria-label="Etkileşim aracı">
          <button
            type="button"
            aria-pressed={interactionTool === "rotate"}
            disabled={dimension === "2d"}
            onClick={() => setInteractionTool("rotate")}
          >
            Döndür
          </button>
          <button
            type="button"
            aria-pressed={interactionTool === "pan" || dimension === "2d"}
            onClick={() => setInteractionTool("pan")}
          >
            Kaydır
          </button>
        </div>

        <button
          type="button"
          className={styles.toggle}
          aria-pressed={showHydrogens}
          onClick={toggleHydrogens}
        >
          H {showHydrogens ? "açık" : "kapalı"}
        </button>
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={showLabels}
          onClick={() => setShowLabels((current) => !current)}
        >
          Etiket {showLabels ? "açık" : "kapalı"}
        </button>

        <div className={styles.zoomControls} role="group" aria-label="Yakınlaştırma">
          <button type="button" aria-label="Uzaklaştır" onClick={() => updateZoom(1 / 1.15)}>
            −
          </button>
          <button type="button" aria-label="Yakınlaştır" onClick={() => updateZoom(1.15)}>
            +
          </button>
          <button type="button" onClick={resetView}>
            Ortala
          </button>
        </div>
      </div>

      <div className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          aria-describedby={`${descriptionId} ${statusId}`}
          aria-label={`${moleculeName}, ${dimension === "3d" ? "üç boyutlu" : "iki boyutlu"} atom ve bağ modeli`}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={() => {
            if (dragRef.current) return;
            hoveredIndexRef.current = null;
            setHoveredAtomIndex(null);
            onAtomHover?.(null);
          }}
          onWheel={handleWheel}
        >
          {moleculeName} için gerçek SDF koordinatlarından atom ve bağ görünümü.
        </canvas>

        <p id={descriptionId} className={styles.srOnly}>
          {canvasInstruction} Artı ve eksi tuşları yakınlaştırır, sıfır görünümü ortalar,
          köşeli parantez tuşları atomlar arasında ilerler.
        </p>

        {activeResource.status === "loading" ? (
          <div className={styles.stateOverlay} role="status">
            <span className={styles.loader} aria-hidden="true" />
            <strong>Yapı yükleniyor</strong>
            <small>SDF atom ve bağ kayıtları okunuyor…</small>
          </div>
        ) : null}

        {activeResource.status === "idle" ? (
          <div className={styles.stateOverlay} role="alert">
            <span className={styles.errorMark} aria-hidden="true">!</span>
            <strong>Yapı kaynağı belirtilmedi</strong>
            <small>Sahte veya tahmini geometri üretilmedi.</small>
          </div>
        ) : null}

        {activeResource.status === "error" ? (
          <div className={styles.stateOverlay} role="alert">
            <span className={styles.errorMark} aria-hidden="true">!</span>
            <strong>Yapı gösterilemiyor</strong>
            <small>{activeResource.error}</small>
            <small>Sahte veya tahmini geometri üretilmedi.</small>
            <button type="button" onClick={activeResource.retry}>
              Yeniden dene
            </button>
          </div>
        ) : null}

        <div className={styles.orientation} aria-hidden="true">
          <i className={styles.axisX}>X</i>
          <i className={styles.axisY}>Y</i>
          {dimension === "3d" ? <i className={styles.axisZ}>Z</i> : null}
        </div>

        <div id={statusId} className={styles.atomStatus} aria-live="polite">
          {statusAtom ? (
            <>
              <span>{selectedAtom ? "SEÇİLİ ATOM" : "ATOM"}</span>
              <strong>
                {statusAtom.element}
                {statusAtom.index + 1}
              </strong>
              <small>
                {dimension === "3d"
                  ? `x ${statusAtom.x.toFixed(3)} · y ${statusAtom.y.toFixed(3)} · z ${statusAtom.z.toFixed(3)} Å`
                  : `x ${statusAtom.x.toFixed(3)} · y ${statusAtom.y.toFixed(3)} Å`}
              </small>
            </>
          ) : (
            <small>Bir atomun üzerine gelin veya seçmek için tıklayın.</small>
          )}
        </div>
      </div>
    </section>
  );
}
