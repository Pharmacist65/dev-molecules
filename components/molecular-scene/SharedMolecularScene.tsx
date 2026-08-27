"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useI18n } from "@/lib/i18n";

import styles from "./SharedMolecularScene.module.css";
import {
  DEFAULT_MOLECULAR_SCENE_CAMERA,
  orbitSceneCamera,
  panSceneCamera,
  zoomSceneCamera,
} from "./camera";
import {
  getActiveMolecularSceneContextCount,
  MolecularSceneLoadError,
  ThreeJsMolecularSceneAdapter,
} from "./ThreeJsMolecularSceneAdapter";
import { getTraversedSceneAtom } from "./keyboard";
import type {
  MolecularSceneAtom,
  MolecularSceneCamera,
  MolecularSceneMoleculeHit,
  MolecularSceneScreenBounds,
  MolecularSceneStatus,
  MolecularSceneStatusDetail,
  SharedMolecularSceneProps,
} from "./types";

interface PointerDrag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly lastX: number;
  readonly lastY: number;
  readonly moved: boolean;
  readonly pan: boolean;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly lastTime: number;
}

interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

function atomKey(atom: MolecularSceneAtom | null) {
  return atom ? `${atom.moleculeId}:${atom.atomIndex}` : "";
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  event: { readonly clientX: number; readonly clientY: number },
) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
    width: bounds.width,
    height: bounds.height,
  };
}

export function SharedMolecularScene({
  molecules,
  visibleMoleculeIds,
  levelOfDetail,
  focusedMoleculeId = null,
  emphasizedMoleculeId = null,
  representation = "ball-and-stick",
  showHydrogens = false,
  camera,
  interactionMode = "rotate",
  atomSelectionEnabled = true,
  copyMode = "default",
  focusFitPadding = 0.14,
  focusAutoFit = false,
  className,
  ariaLabel,
  onAtomSelect,
  onAtomHover,
  onMoleculeHover,
  onMoleculeSelect,
  onMoleculeBoundsChange,
  onViewportCommit,
  onCameraChange,
  onComparisonAnalysis,
  onSceneReady,
  onStatusChange,
}: SharedMolecularSceneProps) {
  const { locale, t } = useI18n();
  const studentCopy = copyMode === "student";
  const resolvedAriaLabel = ariaLabel ?? t("viewer.sceneAria");
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const adapterRef = useRef<ThreeJsMolecularSceneAdapter | null>(null);
  const dragRef = useRef<PointerDrag | null>(null);
  const pointerPointsRef = useRef(new Map<number, PointerPoint>());
  const pinchDistanceRef = useRef<number | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const hoverRef = useRef<MolecularSceneAtom | null>(null);
  const moleculeHoverRef = useRef<MolecularSceneMoleculeHit | null>(null);
  const moleculeBoundsKeyRef = useRef("");
  const cameraRef = useRef<MolecularSceneCamera>(camera ?? DEFAULT_MOLECULAR_SCENE_CAMERA);
  const controlledCameraRef = useRef<MolecularSceneCamera | undefined>(camera);
  const selectCallbackRef = useRef(onAtomSelect);
  const hoverCallbackRef = useRef(onAtomHover);
  const moleculeHoverCallbackRef = useRef(onMoleculeHover);
  const moleculeSelectCallbackRef = useRef(onMoleculeSelect);
  const moleculeBoundsCallbackRef = useRef(onMoleculeBoundsChange);
  const viewportCallbackRef = useRef(onViewportCommit);
  const cameraCallbackRef = useRef(onCameraChange);
  const comparisonCallbackRef = useRef(onComparisonAnalysis);
  const readyCallbackRef = useRef(onSceneReady);
  const statusCallbackRef = useRef(onStatusChange);
  const [sceneStatus, setSceneStatus] = useState<MolecularSceneStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [renderedMoleculeCount, setRenderedMoleculeCount] = useState(0);
  const [selectedAtom, setSelectedAtom] = useState<MolecularSceneAtom | null>(null);
  const [hoveredMolecule, setHoveredMolecule] = useState<MolecularSceneMoleculeHit | null>(null);
  const [keyboardMoleculeId, setKeyboardMoleculeId] = useState<string | null>(null);
  const [keyboardAtom, setKeyboardAtom] = useState<MolecularSceneAtom | null>(null);
  const [cameraRevision, setCameraRevision] = useState(0);
  const [inertiaRevision, setInertiaRevision] = useState(0);
  const [activeContexts, setActiveContexts] = useState(0);
  const instructionsId = useId();

  useEffect(() => {
    selectCallbackRef.current = onAtomSelect;
  }, [onAtomSelect]);
  useEffect(() => {
    hoverCallbackRef.current = onAtomHover;
  }, [onAtomHover]);
  useEffect(() => {
    moleculeHoverCallbackRef.current = onMoleculeHover;
  }, [onMoleculeHover]);
  useEffect(() => {
    moleculeSelectCallbackRef.current = onMoleculeSelect;
  }, [onMoleculeSelect]);
  useEffect(() => {
    moleculeBoundsCallbackRef.current = onMoleculeBoundsChange;
  }, [onMoleculeBoundsChange]);
  useEffect(() => {
    viewportCallbackRef.current = onViewportCommit;
  }, [onViewportCommit]);
  useEffect(() => {
    cameraCallbackRef.current = onCameraChange;
  }, [onCameraChange]);
  useEffect(() => {
    comparisonCallbackRef.current = onComparisonAnalysis;
  }, [onComparisonAnalysis]);
  useEffect(() => {
    readyCallbackRef.current = onSceneReady;
  }, [onSceneReady]);
  useEffect(() => {
    statusCallbackRef.current = onStatusChange;
  }, [onStatusChange]);

  const dispatchSceneEvent = useCallback(
    (
      name: "atom-select" | "atom-hover" | "molecule-hover" | "molecule-select" | "molecule-bounds" | "status",
      detail: unknown,
    ) => {
      rootRef.current?.dispatchEvent(
        new CustomEvent(`molecular-scene:${name}`, { detail, bubbles: true }),
      );
    },
    [],
  );

  const publishStatus = useCallback(
    (detail: MolecularSceneStatusDetail) => {
      setSceneStatus(detail.status);
      setError(detail.error);
      setRenderedMoleculeCount(detail.loadedMoleculeCount);
      statusCallbackRef.current?.(detail);
      dispatchSceneEvent("status", detail);
    },
    [dispatchSceneEvent],
  );

  const publishAtomSelection = useCallback(
    (atom: MolecularSceneAtom | null) => {
      setSelectedAtom(atom);
      selectCallbackRef.current?.(atom);
      dispatchSceneEvent("atom-select", atom);
    },
    [dispatchSceneEvent],
  );

  const publishAtomHover = useCallback(
    (atom: MolecularSceneAtom | null) => {
      if (atomKey(hoverRef.current) === atomKey(atom)) return;
      hoverRef.current = atom;
      hoverCallbackRef.current?.(atom);
      dispatchSceneEvent("atom-hover", atom);
    },
    [dispatchSceneEvent],
  );

  const publishMoleculeHover = useCallback(
    (molecule: MolecularSceneMoleculeHit | null) => {
      if (moleculeHoverRef.current?.moleculeId === molecule?.moleculeId) return;
      moleculeHoverRef.current = molecule;
      setHoveredMolecule(molecule);
      moleculeHoverCallbackRef.current?.(molecule);
      dispatchSceneEvent("molecule-hover", molecule);
    },
    [dispatchSceneEvent],
  );

  const publishMoleculeSelection = useCallback(
    (molecule: MolecularSceneMoleculeHit) => {
      moleculeSelectCallbackRef.current?.(molecule);
      dispatchSceneEvent("molecule-select", molecule);
    },
    [dispatchSceneEvent],
  );

  const publishMoleculeBounds = useCallback(() => {
    const bounds: readonly MolecularSceneScreenBounds[] =
      adapterRef.current?.getVisibleMoleculeScreenBounds() ?? [];
    const key = JSON.stringify(bounds);
    if (moleculeBoundsKeyRef.current === key) return;
    moleculeBoundsKeyRef.current = key;
    moleculeBoundsCallbackRef.current?.(bounds);
    dispatchSceneEvent("molecule-bounds", bounds);
  }, [dispatchSceneEvent]);

  const publishCameraState = useCallback((nextCamera: MolecularSceneCamera) => {
    const value = JSON.stringify(nextCamera);
    const distance = Math.hypot(
      nextCamera.position.x - nextCamera.target.x,
      nextCamera.position.y - nextCamera.target.y,
      nextCamera.position.z - nextCamera.target.z,
    );
    rootRef.current?.setAttribute("data-camera-state", value);
    rootRef.current?.setAttribute("data-camera-distance", distance.toFixed(6));
    canvasRef.current?.setAttribute("data-camera-state", value);
  }, []);

  const applyCamera = useCallback((nextCamera: MolecularSceneCamera) => {
    cameraRef.current = nextCamera;
    controlledCameraRef.current = nextCamera;
    publishCameraState(nextCamera);
    adapterRef.current?.setCamera(nextCamera, true);
    publishMoleculeBounds();
  }, [publishCameraState, publishMoleculeBounds]);

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current === null) return;
    window.cancelAnimationFrame(inertiaFrameRef.current);
    inertiaFrameRef.current = null;
  }, []);

  const startInertia = useCallback(
    (drag: PointerDrag) => {
      stopInertia();
      if (
        !drag.moved ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) return;

      let velocityX = drag.velocityX;
      let velocityY = drag.velocityY;
      let lastTime = performance.now();
      let appliedFrame = false;
      const advance = (now: number) => {
        // Keep inertia duration tied to wall-clock time on slow/software
        // renderers. A low cap makes every delayed frame decay as if only
        // ~50 ms elapsed, prolonging expensive redraws and input latency.
        const elapsedFrames = Math.min(8, Math.max(0.5, (now - lastTime) / 16.67));
        lastTime = now;
        const decay = 0.89 ** elapsedFrames;
        velocityX *= decay;
        velocityY *= decay;
        if (appliedFrame && Math.hypot(velocityX, velocityY) < 0.08) {
          inertiaFrameRef.current = null;
          return;
        }
        applyCamera(
          drag.pan
            ? panSceneCamera(cameraRef.current, velocityX, velocityY)
            : orbitSceneCamera(cameraRef.current, velocityX, velocityY),
        );
        setInertiaRevision((revision) => revision + 1);
        appliedFrame = true;
        inertiaFrameRef.current = window.requestAnimationFrame(advance);
      };
      inertiaFrameRef.current = window.requestAnimationFrame(advance);
    },
    [applyCamera, stopInertia],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      stopInertia();
      const boundedDelta = Math.max(-180, Math.min(180, event.deltaY));
      applyCamera(zoomSceneCamera(cameraRef.current, boundedDelta));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [applyCamera, stopInertia]);

  useEffect(() => stopInertia, [stopInertia]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let adapter: ThreeJsMolecularSceneAdapter;
    let alive = true;

    try {
      adapter = new ThreeJsMolecularSceneAdapter(canvas, {
        onCameraChange: (nextCamera, nextCameraRevision) => {
          if (!alive) return;
          cameraRef.current = nextCamera;
          publishCameraState(nextCamera);
          cameraCallbackRef.current?.(nextCamera, nextCameraRevision);
          setCameraRevision(nextCameraRevision);
        },
      });
      adapterRef.current = adapter;
      publishCameraState(cameraRef.current);
      readyCallbackRef.current?.(adapter);
      queueMicrotask(() => {
        if (alive) setActiveContexts(getActiveMolecularSceneContextCount());
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : t("viewer.webglError");
      queueMicrotask(() => {
        if (!alive) return;
        publishStatus({
          status: "error",
          loadedMoleculeCount: 0,
          visibleMoleculeCount: visibleMoleculeIds.length,
          error: message,
        });
      });
      return () => {
        alive = false;
      };
    }

    let resizeFrame: number | null = null;
    let pendingResize: { readonly width: number; readonly height: number } | null = null;
    let lastResize = {
      width: Math.max(1, canvas.getBoundingClientRect().width),
      height: Math.max(1, canvas.getBoundingClientRect().height),
      pixelRatio: window.devicePixelRatio || 1,
    };
    viewportCallbackRef.current?.({
      width: lastResize.width,
      height: lastResize.height,
      aspect: lastResize.width / lastResize.height,
    });
    const observer = new ResizeObserver((entries) => {
      const bounds = entries[0]?.contentRect;
      if (!bounds) return;
      pendingResize = { width: bounds.width, height: bounds.height };
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        const next = pendingResize;
        pendingResize = null;
        const activeAdapter = adapterRef.current;
        if (!next || !activeAdapter) return;
        const pixelRatio = window.devicePixelRatio || 1;
        // Responsive/zoom layouts can settle by only one or two CSS pixels after
        // the first ResizeObserver delivery. Those pixels materially change the
        // camera aspect on a short canvas, so they must not be discarded as noise.
        const meaningfulCssResize =
          Math.abs(next.width - lastResize.width) >= 0.5 ||
          Math.abs(next.height - lastResize.height) >= 0.5;
        const pixelRatioChanged = Math.abs(pixelRatio - lastResize.pixelRatio) >= 0.001;
        if (!meaningfulCssResize && !pixelRatioChanged) return;
        activeAdapter.resize(next.width, next.height, pixelRatio);
        lastResize = { width: next.width, height: next.height, pixelRatio };
        if (meaningfulCssResize) {
          viewportCallbackRef.current?.({
            width: next.width,
            height: next.height,
            aspect: next.width / next.height,
          });
        }
        publishMoleculeBounds();
      });
    });
    observer.observe(canvas);

    return () => {
      alive = false;
      observer.disconnect();
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      adapter.dispose();
      if (adapterRef.current === adapter) adapterRef.current = null;
    };
    // The adapter must be constructed exactly once for this mounted canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        publishStatus({
          status: "loading",
          loadedMoleculeCount: 0,
          visibleMoleculeCount: visibleMoleculeIds.length,
          error: null,
        });
        publishMoleculeBounds();
      }
    });

    void adapter
      .loadMolecules(molecules)
      .then(() => adapter.updateVisibleMolecules(visibleMoleculeIds))
      .then(() => {
        if (cancelled) return;
        const comparisonGroupId = molecules.find((molecule) => molecule.comparison)
          ?.comparison?.groupId;
        comparisonCallbackRef.current?.(
          comparisonGroupId
            ? adapter.getComparisonAnalysis(comparisonGroupId)
            : null,
        );
        const controlledCamera = controlledCameraRef.current;
        if (controlledCamera) {
          cameraRef.current = controlledCamera;
          publishCameraState(controlledCamera);
          adapter.setCamera(controlledCamera);
        } else if (focusedMoleculeId) {
          cameraRef.current = adapter.getCameraState();
          publishCameraState(cameraRef.current);
        }
        publishStatus({
          status: "ready",
          loadedMoleculeCount: visibleMoleculeIds.length,
          visibleMoleculeCount: visibleMoleculeIds.length,
          error: null,
        });
        publishMoleculeBounds();
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        comparisonCallbackRef.current?.(null);
        const requestedCount = new Set(visibleMoleculeIds).size;
        const failedCount =
          reason instanceof MolecularSceneLoadError ? reason.failures.length : requestedCount;
        const loadedMoleculeCount = Math.max(0, requestedCount - failedCount);
        publishStatus({
          status: loadedMoleculeCount > 0 ? "partial" : "error",
          loadedMoleculeCount,
          visibleMoleculeCount: requestedCount,
          error: reason instanceof Error ? reason.message : t("viewer.structuresLoadError"),
        });
        publishMoleculeBounds();
      });

    return () => {
      cancelled = true;
    };
  }, [
    focusedMoleculeId,
    molecules,
    publishCameraState,
    publishMoleculeBounds,
    publishStatus,
    t,
    visibleMoleculeIds,
  ]);

  useEffect(() => {
    adapterRef.current?.setLevelOfDetail(levelOfDetail);
    publishMoleculeBounds();
  }, [levelOfDetail, publishMoleculeBounds]);

  useEffect(() => {
    adapterRef.current?.setRepresentation(representation);
    publishMoleculeBounds();
  }, [publishMoleculeBounds, representation]);

  useEffect(() => {
    adapterRef.current?.setHydrogenVisibility(showHydrogens);
    publishMoleculeBounds();
    if (!showHydrogens && selectedAtom?.element === "H") {
      const frame = window.requestAnimationFrame(() => {
        adapterRef.current?.highlightAtom(null);
        publishAtomSelection(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [publishAtomSelection, publishMoleculeBounds, selectedAtom?.element, showHydrogens]);

  useEffect(() => {
    if (!selectedAtom) return;
    const selectionStillEligible =
      levelOfDetail === "focus" &&
      focusedMoleculeId === selectedAtom.moleculeId &&
      visibleMoleculeIds.includes(selectedAtom.moleculeId);
    if (selectionStillEligible) return;

    const frame = window.requestAnimationFrame(() => {
      adapterRef.current?.highlightAtom(null);
      publishAtomSelection(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusedMoleculeId, levelOfDetail, publishAtomSelection, selectedAtom, visibleMoleculeIds]);

  useEffect(() => {
    if (atomSelectionEnabled || (!selectedAtom && !keyboardAtom && !hoverRef.current)) return;
    const frame = window.requestAnimationFrame(() => {
      hoverRef.current = null;
      setKeyboardAtom(null);
      adapterRef.current?.highlightAtom(null);
      publishAtomSelection(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [atomSelectionEnabled, keyboardAtom, publishAtomSelection, selectedAtom]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setKeyboardAtom(null));
    return () => window.cancelAnimationFrame(frame);
  }, [focusedMoleculeId, levelOfDetail, showHydrogens, visibleMoleculeIds]);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    adapter.focusMolecule(focusedMoleculeId, {
      autoFit: focusAutoFit,
      paddingFraction: focusFitPadding,
    });
    publishMoleculeBounds();
  }, [focusAutoFit, focusFitPadding, focusedMoleculeId, publishMoleculeBounds]);

  useEffect(() => {
    adapterRef.current?.setEmphasizedMolecule(emphasizedMoleculeId);
    publishMoleculeBounds();
  }, [emphasizedMoleculeId, publishMoleculeBounds]);

  useEffect(() => {
    controlledCameraRef.current = camera;
    if (!camera) return;
    cameraRef.current = camera;
    publishCameraState(camera);
    adapterRef.current?.setCamera(camera);
    publishMoleculeBounds();
  }, [camera, publishCameraState, publishMoleculeBounds]);

  useEffect(() => {
    publishMoleculeHover(null);
  }, [levelOfDetail, molecules, publishMoleculeHover, visibleMoleculeIds]);

  const pickAtEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const adapter = adapterRef.current;
    if (!adapter) return null;
    const point = canvasPoint(event.currentTarget, event);
    if (levelOfDetail === "universe") {
      publishAtomHover(null);
      adapter.highlightAtom(null);
      publishMoleculeHover(
        adapter.pickMolecule(point.x, point.y, point.width, point.height),
      );
      return null;
    }
    if (!atomSelectionEnabled) {
      publishAtomHover(null);
      adapter.highlightAtom(null);
      return null;
    }
    publishMoleculeHover(null);
    return adapter.pickAtom(point.x, point.y, point.width, point.height);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!adapterRef.current || event.button !== 0) return;
    stopInertia();
    adapterRef.current.setCamera(cameraRef.current, true);
    const point = canvasPoint(event.currentTarget, event);
    pointerPointsRef.current.set(event.pointerId, { x: point.x, y: point.y });
    if (pointerPointsRef.current.size >= 2) {
      const [first, second] = [...pointerPointsRef.current.values()];
      pinchDistanceRef.current =
        first && second ? Math.hypot(second.x - first.x, second.y - first.y) : null;
      dragRef.current = null;
    } else {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        lastX: point.x,
        lastY: point.y,
        moved: false,
        pan: interactionMode === "pan" || event.shiftKey,
        velocityX: 0,
        velocityY: 0,
        lastTime: event.timeStamp,
      };
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events used by acceptance tests do not own browser capture.
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event.currentTarget, event);
    if (pointerPointsRef.current.has(event.pointerId)) {
      pointerPointsRef.current.set(event.pointerId, { x: point.x, y: point.y });
    }
    if (pointerPointsRef.current.size >= 2) {
      const [first, second] = [...pointerPointsRef.current.values()];
      if (first && second) {
        const nextDistance = Math.hypot(second.x - first.x, second.y - first.y);
        const previousDistance = pinchDistanceRef.current;
        if (previousDistance !== null && Math.abs(nextDistance - previousDistance) > 0.5) {
          applyCamera(
            zoomSceneCamera(
              cameraRef.current,
              Math.max(-180, Math.min(180, (previousDistance - nextDistance) * 4)),
            ),
          );
        }
        pinchDistanceRef.current = nextDistance;
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      const atom = pickAtEvent(event);
      publishAtomHover(atom);
      adapterRef.current?.highlightAtom(atom ?? keyboardAtom ?? selectedAtom);
      return;
    }

    const deltaX = point.x - drag.lastX;
    const deltaY = point.y - drag.lastY;
    const moved =
      drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > 3;
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
    const frameFactor = Math.min(2.5, 16.67 / elapsed);
    dragRef.current = {
      ...drag,
      lastX: point.x,
      lastY: point.y,
      moved,
      velocityX: drag.velocityX * 0.58 + deltaX * frameFactor * 0.42,
      velocityY: drag.velocityY * 0.58 + deltaY * frameFactor * 0.42,
      lastTime: event.timeStamp,
    };
    applyCamera(
      drag.pan
        ? panSceneCamera(cameraRef.current, deltaX, deltaY)
        : orbitSceneCamera(cameraRef.current, deltaX, deltaY),
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const wasSinglePointerClick =
      pointerPointsRef.current.size === 1 && drag?.pointerId === event.pointerId;
    if (
      levelOfDetail === "universe"
      && moleculeSelectCallbackRef.current
      && wasSinglePointerClick
      && drag
      && !drag.moved
    ) {
      const point = canvasPoint(event.currentTarget, event);
      const molecule = adapterRef.current?.pickMolecule(
        point.x,
        point.y,
        point.width,
        point.height,
      );
      if (molecule) {
        setKeyboardMoleculeId(molecule.moleculeId);
        publishMoleculeHover(molecule);
        publishMoleculeSelection(molecule);
      }
    } else if (atomSelectionEnabled && wasSinglePointerClick && drag && !drag.moved) {
      const atom = pickAtEvent(event);
      setKeyboardAtom(atom);
      publishAtomSelection(atom);
      adapterRef.current?.highlightAtom(atom);
    } else if (drag?.moved) {
      startInertia(drag);
    }
    pointerPointsRef.current.delete(event.pointerId);
    pinchDistanceRef.current = null;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointerPointsRef.current.delete(event.pointerId);
    pinchDistanceRef.current = null;
    dragRef.current = null;
    stopInertia();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const adapter = adapterRef.current;
    const isPreviousAtomKey = event.key === "[" || event.code === "BracketLeft";
    const isNextAtomKey = event.key === "]" || event.code === "BracketRight";
    if (
      levelOfDetail === "universe"
      && moleculeSelectCallbackRef.current
      && (isPreviousAtomKey || isNextAtomKey)
    ) {
      const candidates = visibleMoleculeIds.flatMap((id) => {
        const molecule = molecules.find((candidate) => candidate.id === id);
        return molecule ? [{ moleculeId: molecule.id, moleculeName: molecule.name }] : [];
      });
      if (candidates.length > 0) {
        const currentIndex = candidates.findIndex(
          (candidate) => candidate.moleculeId === keyboardMoleculeId,
        );
        const offset = isNextAtomKey ? 1 : -1;
        const nextIndex = currentIndex < 0
          ? isNextAtomKey ? 0 : candidates.length - 1
          : (currentIndex + offset + candidates.length) % candidates.length;
        const molecule = candidates[nextIndex];
        if (molecule) {
          setKeyboardMoleculeId(molecule.moleculeId);
          publishMoleculeHover(molecule);
        }
      }
      event.preventDefault();
      return;
    }
    if (atomSelectionEnabled && (isPreviousAtomKey || isNextAtomKey)) {
      const atom = getTraversedSceneAtom(
        adapter?.getVisibleAtoms() ?? [],
        keyboardAtom ?? selectedAtom,
        isNextAtomKey ? "next" : "previous",
      );
      if (atom) {
        setKeyboardAtom(atom);
        adapter?.highlightAtom(atom);
      }
      event.preventDefault();
      return;
    }

    if (
      levelOfDetail === "universe"
      && moleculeSelectCallbackRef.current
      && (event.key === "Enter" || event.key === " " || event.code === "Space")
    ) {
      const selectedId = keyboardMoleculeId
        ?? hoveredMolecule?.moleculeId
        ?? visibleMoleculeIds[0];
      const molecule = molecules.find((candidate) => candidate.id === selectedId);
      if (molecule) {
        const hit = { moleculeId: molecule.id, moleculeName: molecule.name };
        setKeyboardMoleculeId(molecule.id);
        publishMoleculeHover(hit);
        publishMoleculeSelection(hit);
      }
      event.preventDefault();
      return;
    }

    if (
      atomSelectionEnabled &&
      (event.key === "Enter" || event.key === " " || event.code === "Space")
    ) {
      const atoms = adapter?.getVisibleAtoms() ?? [];
      const preferredAtom = keyboardAtom ?? selectedAtom;
      const atom = preferredAtom
        ? atoms.find((candidate) => atomKey(candidate) === atomKey(preferredAtom)) ??
          getTraversedSceneAtom(atoms, null, "next")
        : getTraversedSceneAtom(atoms, null, "next");
      if (atom) {
        setKeyboardAtom(atom);
        publishAtomSelection(atom);
        adapter?.highlightAtom(atom);
      }
      event.preventDefault();
      return;
    }

    let nextCamera: MolecularSceneCamera | null = null;
    const shouldPan = interactionMode === "pan" || event.shiftKey;
    if (event.key === "ArrowLeft") {
      nextCamera = shouldPan
        ? panSceneCamera(cameraRef.current, -14, 0)
        : orbitSceneCamera(cameraRef.current, -14, 0);
    } else if (event.key === "ArrowRight") {
      nextCamera = shouldPan
        ? panSceneCamera(cameraRef.current, 14, 0)
        : orbitSceneCamera(cameraRef.current, 14, 0);
    } else if (event.key === "ArrowUp") {
      nextCamera = shouldPan
        ? panSceneCamera(cameraRef.current, 0, -14)
        : orbitSceneCamera(cameraRef.current, 0, -14);
    } else if (event.key === "ArrowDown") {
      nextCamera = shouldPan
        ? panSceneCamera(cameraRef.current, 0, 14)
        : orbitSceneCamera(cameraRef.current, 0, 14);
    } else if (event.key === "+" || event.key === "=") {
      nextCamera = zoomSceneCamera(cameraRef.current, -110);
    } else if (event.key === "-" || event.key === "_") {
      nextCamera = zoomSceneCamera(cameraRef.current, 110);
    } else if (event.key === "Escape") {
      setKeyboardAtom(null);
      publishAtomSelection(null);
      adapterRef.current?.highlightAtom(null);
      event.preventDefault();
      return;
    }

    if (nextCamera) {
      applyCamera(nextCamera);
      event.preventDefault();
    }
  };

  const focusedDescriptor = focusedMoleculeId
    ? molecules.find((molecule) => molecule.id === focusedMoleculeId)
    : visibleMoleculeIds.length === 1
      ? molecules.find((molecule) => molecule.id === visibleMoleculeIds[0])
      : undefined;
  const structureOrigin =
    focusedDescriptor?.structureOrigin ??
    (visibleMoleculeIds.length > 1 ? "multiple-sourced-structures" : "not-specified");
  const selectedAtomId = atomKey(selectedAtom);
  const keyboardAtomId = atomKey(keyboardAtom);
  const visibleMoleculeValue = visibleMoleculeIds.join(",");
  const announcedAtom = atomSelectionEnabled ? keyboardAtom ?? selectedAtom : null;
  const announcedAtomIsCandidate =
    Boolean(keyboardAtom) && keyboardAtomId !== selectedAtomId;

  return (
    <div
      ref={rootRef}
      className={[styles.scene, className].filter(Boolean).join(" ")}
      data-scene-status={sceneStatus}
      data-level-of-detail={levelOfDetail}
      data-lod-level={levelOfDetail}
      data-representation={representation}
      data-hydrogens={showHydrogens ? "visible" : "hidden"}
      data-focused-molecule={focusedMoleculeId ?? ""}
      data-emphasized-molecule={emphasizedMoleculeId ?? ""}
      data-selected-molecule={focusedMoleculeId ?? ""}
      data-structure-origin={structureOrigin}
      data-active-webgl-contexts={activeContexts}
      data-visible-molecules={visibleMoleculeValue}
      data-visible-count={renderedMoleculeCount}
      data-requested-visible-count={visibleMoleculeIds.length}
      data-camera-revision={cameraRevision}
      data-focus-auto-fit={focusAutoFit ? "true" : "false"}
      data-inertia-revision={inertiaRevision}
      data-atom-selection-enabled={atomSelectionEnabled ? "true" : "false"}
      data-scene-copy-mode={copyMode}
      data-selected-atom={atomSelectionEnabled ? selectedAtomId : ""}
      data-keyboard-atom={atomSelectionEnabled ? keyboardAtomId : ""}
      data-selected-atom-overlay-collision="0"
      data-hovered-molecule={hoveredMolecule?.moleculeId ?? ""}
      data-keyboard-molecule={keyboardMoleculeId ?? ""}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label={resolvedAriaLabel}
        aria-describedby={instructionsId}
        aria-keyshortcuts={
          atomSelectionEnabled || onMoleculeSelect ? "[ ] Enter Space" : undefined
        }
        data-molecular-scene-canvas="true"
        data-dimension="3d"
        data-lod-level={levelOfDetail}
        data-representation={representation}
        data-inertia-revision={inertiaRevision}
        data-atom-selection-enabled={atomSelectionEnabled ? "true" : "false"}
        data-selected-atom-overlay-collision="0"
        data-selected-molecule={focusedMoleculeId ?? ""}
        data-structure-origin={structureOrigin}
        data-keyboard-atom={keyboardAtomId}
        data-hovered-molecule={hoveredMolecule?.moleculeId ?? ""}
        data-keyboard-molecule={keyboardMoleculeId ?? ""}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => {
          if (dragRef.current) return;
          publishAtomHover(null);
          publishMoleculeHover(null);
          adapterRef.current?.highlightAtom(keyboardAtom ?? selectedAtom);
        }}
        onKeyDown={handleKeyDown}
      >
        {t(studentCopy ? "viewer.studentCanvasFallback" : "viewer.canvasFallback")}
      </canvas>

      <p id={instructionsId} className={styles.srOnly}>
        {interactionMode === "pan"
          ? t("viewer.dragToPan")
          : t("viewer.dragToRotate")}
        {levelOfDetail === "universe" && onMoleculeSelect ? (
          <> {locale === "tr"
            ? "Temsilî moleküller arasında köşeli parantez tuşlarıyla gezin; seçili molekülü açmak için Enter tuşuna bas."
            : "Use bracket keys to browse representative molecules; press Enter to open the selected molecule."}</>
        ) : atomSelectionEnabled ? <> {t("viewer.keyboardInstructions")}</> : null}
      </p>

      {sceneStatus === "loading" ? (
        <div className={styles.state} role="status">
          <span className={styles.loader} aria-hidden="true" />
          <strong>{t(studentCopy ? "viewer.studentLoadingTitle" : "viewer.loadingTitle")}</strong>
          <small>{t(studentCopy ? "viewer.studentLoadingBody" : "viewer.loadingBody")}</small>
        </div>
      ) : null}

      {sceneStatus === "error" ? (
        <div className={`${styles.state} ${styles.error}`} role="alert">
          <strong>{t(studentCopy ? "viewer.studentErrorTitle" : "viewer.errorTitle")}</strong>
          <small>{t(studentCopy ? "viewer.studentStructuresLoadError" : "viewer.structuresLoadError")}</small>
          <small>{t(studentCopy ? "viewer.studentErrorNoFabrication" : "viewer.errorNoFabrication")}</small>
        </div>
      ) : null}

      {sceneStatus === "partial" ? (
        <div className={styles.partialStatus} role="status" aria-live="polite">
          <strong>{t(studentCopy ? "viewer.studentPartialTitle" : "viewer.partialTitle")}</strong>
          <small>{error ? t(studentCopy ? "viewer.studentStructuresLoadError" : "viewer.structuresLoadError") : null}</small>
          <small>{t(studentCopy ? "viewer.studentPartialBody" : "viewer.partialBody")}</small>
        </div>
      ) : null}

      {levelOfDetail === "universe" && hoveredMolecule ? (
        <output
          className={styles.moleculeReadout}
          data-molecule-hover-label="true"
          aria-live="polite"
        >
          {hoveredMolecule.moleculeName}
        </output>
      ) : null}

      {announcedAtom ? (
        <output className={styles.atomReadout} aria-live="polite">
          <span>
            {announcedAtomIsCandidate
              ? t("viewer.keyboardAtomCandidate")
              : t("viewer.selectedAtom")}
          </span>
          <strong>
            {announcedAtom.element}
            {announcedAtom.atomIndex + 1}
          </strong>
          <small>{announcedAtom.moleculeName}</small>
        </output>
      ) : null}
    </div>
  );
}
