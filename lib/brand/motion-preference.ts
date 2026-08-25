"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

export type MolevrenMotionMode = "full" | "reduced" | "off";

export const MOLEVREN_MOTION_STORAGE_KEY = "molevren:motion-mode";

const MOTION_CHANGE_EVENT = "molevren:motion-mode-change";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function isMolevrenMotionMode(value: unknown): value is MolevrenMotionMode {
  return value === "full" || value === "reduced" || value === "off";
}
function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readMolevrenMotionMode(
  storage: Pick<Storage, "getItem"> | null,
): MolevrenMotionMode | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(MOLEVREN_MOTION_STORAGE_KEY);
    return isMolevrenMotionMode(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeMolevrenMotionMode(
  storage: Pick<Storage, "setItem"> | null,
  motionMode: MolevrenMotionMode,
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(MOLEVREN_MOTION_STORAGE_KEY, motionMode);
    return true;
  } catch {
    return false;
  }
}

export function clearMolevrenMotionMode(
  storage: Pick<Storage, "removeItem"> | null,
): boolean {
  if (!storage) return false;

  try {
    storage.removeItem(MOLEVREN_MOTION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function resolveMolevrenMotionMode(
  storedMode: MolevrenMotionMode | null,
  systemPrefersReducedMotion: boolean,
): MolevrenMotionMode {
  return storedMode ?? (systemPrefersReducedMotion ? "reduced" : "full");
}

function getStoredMotionSnapshot(): MolevrenMotionMode | null {
  return readMolevrenMotionMode(getLocalStorage());
}

function getServerStoredMotionSnapshot(): null {
  return null;
}

function subscribeToStoredMotionMode(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === MOLEVREN_MOTION_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(MOTION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MOTION_CHANGE_EVENT, onStoreChange);
  };
}

function getSystemReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotionSnapshot() {
  // A static first frame is the hydration-safe and accessibility-safe default.
  return true;
}

function subscribeToSystemReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function announceMotionPreferenceChange() {
  window.dispatchEvent(new Event(MOTION_CHANGE_EVENT));
}

export interface MolevrenMotionPreference {
  readonly motionMode: MolevrenMotionMode;
  readonly storedMotionMode: MolevrenMotionMode | null;
  readonly systemPrefersReducedMotion: boolean;
  readonly setMotionMode: (motionMode: MolevrenMotionMode) => void;
  readonly resetMotionMode: () => void;
}

/**
 * Resolves a persisted Full/Reduced/Off choice. Without an explicit choice the
 * operating-system reduced-motion preference is respected.
 */
export function useMolevrenMotionPreference(): MolevrenMotionPreference {
  const storedMotionMode = useSyncExternalStore(
    subscribeToStoredMotionMode,
    getStoredMotionSnapshot,
    getServerStoredMotionSnapshot,
  );
  const systemPrefersReducedMotion = useSyncExternalStore(
    subscribeToSystemReducedMotion,
    getSystemReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );

  const setMotionMode = useCallback((motionMode: MolevrenMotionMode) => {
    writeMolevrenMotionMode(getLocalStorage(), motionMode);
    announceMotionPreferenceChange();
  }, []);

  const resetMotionMode = useCallback(() => {
    clearMolevrenMotionMode(getLocalStorage());
    announceMotionPreferenceChange();
  }, []);

  return useMemo(
    () => ({
      motionMode: resolveMolevrenMotionMode(
        storedMotionMode,
        systemPrefersReducedMotion,
      ),
      storedMotionMode,
      systemPrefersReducedMotion,
      setMotionMode,
      resetMotionMode,
    }),
    [
      resetMotionMode,
      setMotionMode,
      storedMotionMode,
      systemPrefersReducedMotion,
    ],
  );
}
