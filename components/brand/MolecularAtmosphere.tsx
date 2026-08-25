"use client";

import { useEffect, useRef } from "react";

import {
  createMolevrenAtmosphereNodes,
  getMolevrenAtmosphereLinkDistance,
  getMolevrenAtmosphereVariant,
  MOLEVREN_ATMOSPHERE_DPR_CAP,
  MOLEVREN_ATMOSPHERE_FPS,
  type MolevrenAtmosphereNode,
  type MolevrenAtmosphereVariant,
} from "@/lib/brand/molecular-atmosphere";
import type { MolevrenMotionMode } from "@/lib/brand/motion-preference";

import styles from "./MolecularAtmosphere.module.css";

export interface MolecularAtmosphereProps {
  readonly route: string;
  readonly motionMode: MolevrenMotionMode;
  readonly className?: string;
}
interface SceneSize {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

interface AtmospherePalette {
  readonly nodes: readonly [string, string, string];
  readonly link: string;
}

const FRAME_INTERVAL_MS = 1_000 / MOLEVREN_ATMOSPHERE_FPS;
const MAX_LINKS_PER_NODE = 3;

const PALETTES: Record<MolevrenAtmosphereVariant, AtmospherePalette> = {
  home: {
    nodes: ["255, 138, 0", "34, 103, 188", "0, 183, 198"],
    link: "111, 166, 215",
  },
  atlas: {
    nodes: ["0, 183, 198", "55, 125, 203", "255, 138, 0"],
    link: "76, 178, 205",
  },
  dossier: {
    nodes: ["255, 138, 0", "112, 159, 216", "247, 248, 250"],
    link: "110, 151, 203",
  },
  academy: {
    nodes: ["255, 162, 45", "0, 183, 198", "247, 248, 250"],
    link: "94, 174, 198",
  },
  synthesis: {
    nodes: ["255, 138, 0", "0, 183, 198", "55, 125, 203"],
    link: "76, 169, 196",
  },
  lab: {
    nodes: ["0, 183, 198", "112, 159, 216", "247, 248, 250"],
    link: "92, 168, 205",
  },
  default: {
    nodes: ["255, 138, 0", "55, 125, 203", "0, 183, 198"],
    link: "100, 158, 205",
  },
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function advanceNodes(
  nodes: readonly MolevrenAtmosphereNode[],
  size: SceneSize,
  elapsedSeconds: number,
) {
  const margin = 12;

  for (const node of nodes) {
    node.x += node.velocityX * elapsedSeconds;
    node.y += node.velocityY * elapsedSeconds;

    if (node.x < -margin) node.x = size.width + margin;
    if (node.x > size.width + margin) node.x = -margin;
    if (node.y < -margin) node.y = size.height + margin;
    if (node.y > size.height + margin) node.y = -margin;
  }
}

function drawAtmosphere(
  context: CanvasRenderingContext2D,
  nodes: readonly MolevrenAtmosphereNode[],
  size: SceneSize,
  palette: AtmospherePalette,
  timeSeconds: number,
) {
  context.clearRect(0, 0, size.width, size.height);
  const linkDistance = getMolevrenAtmosphereLinkDistance(size.width);
  const degrees = new Uint8Array(nodes.length);

  context.lineWidth = 0.7;
  for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
    const first = nodes[firstIndex];

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < nodes.length;
      secondIndex += 1
    ) {
      if (
        degrees[firstIndex] >= MAX_LINKS_PER_NODE ||
        degrees[secondIndex] >= MAX_LINKS_PER_NODE
      ) {
        continue;
      }

      const second = nodes[secondIndex];
      const deltaX = second.x - first.x;
      const deltaY = second.y - first.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > linkDistance) continue;

      const opacity = (1 - distance / linkDistance) * 0.17;
      context.strokeStyle = `rgba(${palette.link}, ${opacity.toFixed(3)})`;
      context.beginPath();
      context.moveTo(first.x, first.y);
      context.lineTo(second.x, second.y);
      context.stroke();
      degrees[firstIndex] += 1;
      degrees[secondIndex] += 1;
    }
  }

  for (const node of nodes) {
    const pulse = 0.82 + Math.sin(timeSeconds * 0.7 + node.phase) * 0.18;
    const color = palette.nodes[node.accent];
    const haloRadius = node.radius * 4.5;
    const halo = context.createRadialGradient(
      node.x,
      node.y,
      0,
      node.x,
      node.y,
      haloRadius,
    );
    halo.addColorStop(0, `rgba(${color}, ${(0.22 * pulse).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = halo;
    context.beginPath();
    context.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `rgba(${color}, ${(0.66 * pulse).toFixed(3)})`;
    context.beginPath();
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fill();
  }
}

/**
 * A decorative, route-aware Canvas2D layer. It never accepts input and creates
 * no WebGL context. Reduced mode paints one deterministic frame; Off mounts
 * nothing.
 */
export function MolecularAtmosphere({
  route,
  motionMode,
  className,
}: MolecularAtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (motionMode === "off") return;

    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const palette = PALETTES[getMolevrenAtmosphereVariant(route)];
    let nodes: MolevrenAtmosphereNode[] = [];
    let size: SceneSize = { width: 1, height: 1, dpr: 1 };
    let pageVisible = !document.hidden;
    let inViewport = true;
    let disposed = false;
    let frameId: number | undefined;
    let timerId: number | undefined;
    let lastFrameTime = performance.now();

    const canAnimate = () =>
      motionMode === "full" && pageVisible && inViewport && !disposed;

    const cancelScheduledFrame = () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      timerId = undefined;
      frameId = undefined;
    };

    const renderFrame = (currentTime: number) => {
      frameId = undefined;
      if (!canAnimate()) return;

      const elapsedSeconds = Math.min(
        0.1,
        Math.max(0, (currentTime - lastFrameTime) / 1_000),
      );
      lastFrameTime = currentTime;
      advanceNodes(nodes, size, elapsedSeconds);
      drawAtmosphere(context, nodes, size, palette, currentTime / 1_000);
      scheduleFrame();
    };

    const scheduleFrame = () => {
      if (!canAnimate() || timerId !== undefined || frameId !== undefined) return;

      const elapsed = performance.now() - lastFrameTime;
      const delay = Math.max(0, FRAME_INTERVAL_MS - elapsed);
      timerId = window.setTimeout(() => {
        timerId = undefined;
        if (!canAnimate()) return;
        frameId = window.requestAnimationFrame(renderFrame);
      }, delay);
    };

    const syncPlayback = () => {
      if (!canAnimate()) {
        cancelScheduledFrame();
        return;
      }

      lastFrameTime = performance.now();
      scheduleFrame();
    };

    const resizeScene = () => {
      const bounds = root.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(
        MOLEVREN_ATMOSPHERE_DPR_CAP,
        Math.max(1, window.devicePixelRatio || 1),
      );

      if (size.width === width && size.height === height && size.dpr === dpr) {
        return;
      }

      size = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = createMolevrenAtmosphereNodes(width, height, route);
      drawAtmosphere(context, nodes, size, palette, 0);
    };

    const handleVisibilityChange = () => {
      pageVisible = !document.hidden;
      syncPlayback();
    };

    const resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(root);
    resizeScene();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry?.isIntersecting ?? true;
        syncPlayback();
      },
      { rootMargin: "120px" },
    );
    intersectionObserver.observe(root);
    syncPlayback();

    return () => {
      disposed = true;
      cancelScheduledFrame();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      context.clearRect(0, 0, size.width, size.height);
    };
  }, [motionMode, route]);

  if (motionMode === "off") return null;

  const variant = getMolevrenAtmosphereVariant(route);

  return (
    <div
      ref={rootRef}
      className={joinClassNames(styles.root, className)}
      data-motion={motionMode}
      data-route={variant}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
}
