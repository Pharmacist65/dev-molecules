"use client";

import { useEffect, useState } from "react";

import {
  SdfResourceCache,
  type SdfResourceContract,
} from "@/lib/structure/sdf-resource";
import type { MoleculeStructure } from "@/lib/structure/sdf";

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

const structureCache = new SdfResourceCache();

export function useSdfResource(
  url: string | null,
  contract: SdfResourceContract = {},
) {
  const [attempt, setAttempt] = useState(0);
  const expectedDimension = contract.expectedDimension;
  const expectedPubChemCid = contract.expectedPubChemCid;
  const identityPropertyName = contract.expectedIdentity?.propertyName;
  const identityExpectedValue = contract.expectedIdentity?.expectedValue;
  const identityLabel = contract.expectedIdentity?.label;
  const identityExpectationSupplied = contract.expectedIdentity !== undefined;
  const requestKey = JSON.stringify([
    url ?? "idle",
    expectedDimension ?? null,
    expectedPubChemCid ?? null,
    identityPropertyName ?? null,
    identityExpectedValue ?? null,
    identityExpectationSupplied,
    attempt,
  ]);
  const [state, setState] = useState<SdfResourceState>({
    requestKey: "initial",
    status: "loading",
    structure: null,
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    let active = true;
    const resourceContract: SdfResourceContract = {
      expectedDimension,
      expectedPubChemCid,
      expectedIdentity: identityExpectationSupplied
        ? {
            propertyName: identityPropertyName ?? "",
            expectedValue: identityExpectedValue ?? "",
            label: identityLabel,
          }
        : undefined,
    };

    void structureCache
      .get(url, resourceContract)
      .then((structure) => {
        if (!active) return;
        setState({ requestKey, status: "ready", structure, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const reason = error instanceof Error ? error.message : "Bilinmeyen hata";
        setState({
          requestKey,
          status: "error",
          structure: null,
          error: `Yapı dosyası okunamadı (${reason}).`,
        });
      });

    return () => {
      active = false;
    };
  }, [
    expectedDimension,
    expectedPubChemCid,
    identityExpectedValue,
    identityExpectationSupplied,
    identityLabel,
    identityPropertyName,
    requestKey,
    url,
  ]);

  if (!url) {
    return {
      status: "idle" as const,
      structure: null,
      error: null,
      retry: () => setAttempt((current) => current + 1),
    };
  }

  const cached = structureCache.peek(url, {
    expectedDimension,
    expectedPubChemCid,
    expectedIdentity: identityExpectationSupplied
      ? {
          propertyName: identityPropertyName ?? "",
          expectedValue: identityExpectedValue ?? "",
          label: identityLabel,
        }
      : undefined,
  });
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
