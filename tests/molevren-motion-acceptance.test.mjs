import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createMolevrenAtmosphereNodes,
  getMolevrenAtmosphereLinkDistance,
  getMolevrenAtmosphereNodeCount,
  getMolevrenAtmosphereVariant,
  MOLEVREN_ATMOSPHERE_DPR_CAP,
  MOLEVREN_ATMOSPHERE_FPS,
} from "../lib/brand/molecular-atmosphere.ts";
import {
  clearMolevrenMotionMode,
  MOLEVREN_MOTION_STORAGE_KEY,
  readMolevrenMotionMode,
  resolveMolevrenMotionMode,
  writeMolevrenMotionMode,
} from "../lib/brand/motion-preference.ts";

const [componentSource, atmosphereCss, shellSource, shellCss, tokenCss] = await Promise.all([
  readFile(new URL("../components/brand/MolecularAtmosphere.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/brand/MolecularAtmosphere.module.css", import.meta.url), "utf8"),
  readFile(new URL("../components/platform/DevMoleculesApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/platform/platform.module.css", import.meta.url), "utf8"),
  readFile(new URL("../styles/molevren-tokens.css", import.meta.url), "utf8"),
]);

test("the living background is deterministic, sparse, route-aware Canvas2D", () => {
  assert.equal(MOLEVREN_ATMOSPHERE_FPS, 24);
  assert.equal(MOLEVREN_ATMOSPHERE_DPR_CAP, 1.5);
  assert.equal(getMolevrenAtmosphereNodeCount(390, 844), 14);
  assert.equal(getMolevrenAtmosphereNodeCount(1440, 900), 33);
  assert.equal(getMolevrenAtmosphereNodeCount(1920, 1080), 45);
  assert.equal(getMolevrenAtmosphereLinkDistance(390), 112);
  assert.equal(getMolevrenAtmosphereLinkDistance(1440), 168);

  const routes = {
    "": "home",
    home: "home",
    atlas: "atlas",
    explore: "atlas",
    "drug/propranolol": "dossier",
    academy: "academy",
    learn: "academy",
    synthesis: "synthesis",
    lab: "lab",
    build: "lab",
    reviewer: "default",
  };
  for (const [route, variant] of Object.entries(routes)) {
    assert.equal(getMolevrenAtmosphereVariant(route), variant);
  }

  const first = createMolevrenAtmosphereNodes(1440, 900, "atlas");
  const repeated = createMolevrenAtmosphereNodes(1440, 900, "atlas");
  const otherRoute = createMolevrenAtmosphereNodes(1440, 900, "academy");
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, otherRoute);
  assert.equal(first.length, 33);
  assert.ok(first.every((node) => node.accent >= 0 && node.accent <= 2));

  assert.match(componentSource, /canvas\.getContext\("2d", \{ alpha: true \}\)/u);
  assert.doesNotMatch(componentSource, /getContext\(\s*["']webgl2?["']|WebGLRenderer|new THREE\./iu);
  assert.match(componentSource, /const MAX_LINKS_PER_NODE = 3/u);
  assert.match(componentSource, /degrees\[firstIndex\] >= MAX_LINKS_PER_NODE/u);
  assert.match(componentSource, /const FRAME_INTERVAL_MS = 1_000 \/ MOLEVREN_ATMOSPHERE_FPS/u);
  assert.doesNotMatch(componentSource, /setInterval\(/u);
});

test("pointer input passes through both atmosphere layers", () => {
  assert.match(atmosphereCss, /\.root\s*\{[\s\S]*pointer-events:\s*none/u);
  assert.match(atmosphereCss, /\.root\s*\{[\s\S]*user-select:\s*none/u);
  assert.match(atmosphereCss, /\.canvas\s*\{[\s\S]*pointer-events:\s*none/u);
  assert.match(componentSource, /data-route=\{variant\}[\s\S]*aria-hidden="true"/u);
  assert.match(componentSource, /<canvas ref=\{canvasRef\}[\s\S]*aria-hidden="true"/u);
});

test("hidden tabs and offscreen atmosphere roots cancel their scheduled loop", () => {
  assert.match(componentSource, /let pageVisible = !document\.hidden/u);
  assert.match(componentSource, /const canAnimate = \(\) =>[\s\S]*motionMode === "full" && pageVisible && inViewport && !disposed/u);
  assert.match(componentSource, /const handleVisibilityChange = \(\) => \{[\s\S]*pageVisible = !document\.hidden;[\s\S]*syncPlayback\(\)/u);
  assert.match(componentSource, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/u);
  assert.match(componentSource, /new IntersectionObserver\([\s\S]*inViewport = entry\?\.isIntersecting \?\? true;[\s\S]*syncPlayback\(\)/u);
  assert.match(componentSource, /if \(!canAnimate\(\)\) \{[\s\S]*cancelScheduledFrame\(\)/u);
});

test("reduced mode paints one frame, off mounts nothing, and tokens stop ambient motion", () => {
  assert.match(componentSource, /motionMode === "full"/u);
  assert.match(componentSource, /resizeScene\(\);[\s\S]*syncPlayback\(\)/u);
  assert.match(componentSource, /if \(motionMode === "off"\) return null/u);
  assert.match(componentSource, /data-motion=\{motionMode\}/u);
  assert.match(atmosphereCss, /\.root\[data-motion="reduced"\]\s*\{[\s\S]*opacity:/u);
  assert.match(tokenCss, /\[data-motion="reduced"\]\s*\{[\s\S]*--motion-atmosphere-play-state:\s*paused/u);
  assert.match(tokenCss, /\[data-motion="off"\]\s*\{[\s\S]*--motion-duration-ui:\s*0ms[\s\S]*--motion-atmosphere-play-state:\s*paused/u);
  assert.match(tokenCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*--motion-atmosphere-play-state:\s*paused/u);
});

test("effect teardown cancels timers, animation frames, observers, listeners, and pixels", () => {
  assert.match(componentSource, /return \(\) => \{[\s\S]*disposed = true;[\s\S]*cancelScheduledFrame\(\)/u);
  assert.match(componentSource, /resizeObserver\.disconnect\(\)/u);
  assert.match(componentSource, /intersectionObserver\.disconnect\(\)/u);
  assert.match(componentSource, /document\.removeEventListener\("visibilitychange", handleVisibilityChange\)/u);
  assert.match(componentSource, /context\.clearRect\(0, 0, size\.width, size\.height\)/u);
  assert.match(componentSource, /window\.clearTimeout\(timerId\)/u);
  assert.match(componentSource, /window\.cancelAnimationFrame\(frameId\)/u);
});

test("Full, Reduced, and Off preferences persist and fail closed safely", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  assert.equal(MOLEVREN_MOTION_STORAGE_KEY, "molevren:motion-mode");
  for (const mode of ["full", "reduced", "off"]) {
    assert.equal(writeMolevrenMotionMode(storage, mode), true);
    assert.equal(readMolevrenMotionMode(storage), mode);
  }
  values.set(MOLEVREN_MOTION_STORAGE_KEY, "fast");
  assert.equal(readMolevrenMotionMode(storage), null);
  assert.equal(clearMolevrenMotionMode(storage), true);
  assert.equal(readMolevrenMotionMode(storage), null);
  assert.equal(resolveMolevrenMotionMode(null, true), "reduced");
  assert.equal(resolveMolevrenMotionMode(null, false), "full");
  assert.equal(resolveMolevrenMotionMode("off", false), "off");

  const throwingStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.equal(readMolevrenMotionMode(throwingStorage), null);
  assert.equal(writeMolevrenMotionMode(throwingStorage, "off"), false);
  assert.equal(clearMolevrenMotionMode(throwingStorage), false);
});

test("route palettes and opacity contracts keep data-heavy surfaces quieter", () => {
  assert.match(shellSource, /const atmosphereRoute =[\s\S]*\? "synthesis"[\s\S]*: route\.section/u);
  assert.match(shellSource, /<MolecularAtmosphere route=\{atmosphereRoute\} motionMode=\{motionMode\} \/>/u);
  const base = Number(shellCss.match(/--molevren-atmosphere-opacity:\s*([0-9.]+);/u)?.[1]);
  const atlas = Number(shellCss.match(/data-route="atlas"\][\s\S]*?--molevren-atmosphere-opacity:\s*([0-9.]+);/u)?.[1]);
  const dataHeavy = Number(shellCss.match(/data-route="lab"\][\s\S]*?data-route="drug"\][\s\S]*?--molevren-atmosphere-opacity:\s*([0-9.]+);/u)?.[1]);
  assert.equal(base, 0.56);
  assert.equal(atlas, 0.38);
  assert.equal(dataHeavy, 0.28);
  assert.ok(dataHeavy < atlas && atlas < base);
  assert.match(shellCss, /--molevren-atmosphere-reduced-opacity:\s*0\.34/u);
  assert.match(atmosphereCss, /opacity:\s*var\(--molevren-atmosphere-opacity, 0\.72\)/u);
  assert.match(atmosphereCss, /opacity:\s*var\(--molevren-atmosphere-reduced-opacity, 0\.46\)/u);
});
