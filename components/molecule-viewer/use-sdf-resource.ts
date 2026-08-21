"use client";

import { useEffect, useState } from "react";

import { parseSdfV2000, type MoleculeStructure } from "@/lib/structure/sdf";

type SdfResourceState =
  | {
      readonly requestKey: string;
      readonly status: "loading";
      readonly structure: null;
      readonly error: null;
    }
  | {
      readonly requestKey: string;
      readonly status: "ready";
      readonly structure: MoleculeStructure;
      readonly error: null;
    }
  | {
      readonly requestKey: string;
      readonly status: "error";
      readonly structure: null;
      readonly error: string;
    };

const structureCache = new Map<string, MoleculeStructure>();

export function useSdfResource(url: string | null) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${url ?? "idle"}:${attempt}`;
  const [state, setState] = useState<SdfResourceState>({
    requestKey: "initial",
    status: "loading",
    structure: null,
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    const cached = structureCache.get(url);
    if (cached) return;

    const controller = new AbortController();

    void fetch(url, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const structure = parseSdfV2000(await response.text());
        structureCache.set(url, structure);
        return structure;
      })
      .then((structure) => {
        setState({ requestKey, status: "ready", structure, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const reason = error instanceof Error ? error.message : "Bilinmeyen hata";
        setState({
          requestKey,
          status: "error",
          structure: null,
          error: `Yapı dosyası okunamadı (${reason}).`,
        });
      });

    return () => controller.abort();
  }, [requestKey, url]);

  if (!url) {
    return {
      status: "idle" as const,
      structure: null,
      error: null,
      retry: () => setAttempt((current) => current + 1),
    };
  }

  const cached = structureCache.get(url);
  if (cached) {
    return {
      status: "ready" as const,
      structure: cached,
      error: null,
      retry: () => setAttempt((current) => current + 1),
    };
  }

  const currentState: SdfResourceState =
    state.requestKey === requestKey
      ? state
      : { requestKey, status: "loading", structure: null, error: null };

  return {
    ...currentState,
    retry: () => setAttempt((current) => current + 1),
  };
}
