"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Ketcher } from "ketcher-core";
import { Editor } from "ketcher-react";
import "ketcher-react/dist/index.css";
import { StandaloneStructServiceProvider } from "ketcher-standalone/dist/binaryWasm";

import type { LabStructureSnapshot } from "@/lib/application/lab";

import { scheduleKetcherFitAfterLayout } from "./ketcher-fit";
import styles from "./LabHub.module.css";

export interface KetcherEditorHandle {
  readonly exportStructure: () => Promise<LabStructureSnapshot>;
  readonly importStructure: (structure: string) => Promise<void>;
  readonly clear: () => Promise<void>;
}

interface KetcherEditorSurfaceProps {
  readonly initialStructure: string;
  readonly locale: "tr" | "en";
  readonly onReadyChange?: (ready: boolean) => void;
  readonly onError?: (message: string) => void;
}

const localizedEditorError = (locale: "tr" | "en"): string =>
  locale === "tr"
    ? "Yerel yapı işlemi tamamlanamadı."
    : "The local structure operation could not be completed.";

export const KetcherEditorSurface = forwardRef<
  KetcherEditorHandle,
  KetcherEditorSurfaceProps
>(function KetcherEditorSurface(
  { initialStructure, locale, onReadyChange, onError },
  ref,
) {
  const provider = useMemo(() => new StandaloneStructServiceProvider(), []);
  const [ketcher, setKetcher] = useState<Ketcher | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cancelFitRef = useRef<() => void>(() => undefined);
  const loadedInitialRef = useRef(false);

  const fitAfterLayout = useCallback((instance: Ketcher) => {
    const frame = frameRef.current;
    if (!frame) return;
    cancelFitRef.current();
    cancelFitRef.current = scheduleKetcherFitAfterLayout(instance, frame);
  }, []);

  useEffect(() => {
    onReadyChange?.(Boolean(ketcher));
  }, [ketcher, onReadyChange]);

  useEffect(
    () => () => {
      cancelFitRef.current();
    },
    [],
  );

  useEffect(() => {
    if (!ketcher || loadedInitialRef.current) return;
    let active = true;
    loadedInitialRef.current = true;
    void ketcher
      .setMolecule(initialStructure, { needZoom: true })
      .then(() => {
        if (active) fitAfterLayout(ketcher);
      })
      .catch(() => {
        onError?.(localizedEditorError(locale));
      });
    return () => {
      active = false;
      cancelFitRef.current();
    };
  }, [fitAfterLayout, initialStructure, ketcher, locale, onError]);

  useImperativeHandle(
    ref,
    () => ({
      async exportStructure() {
        if (!ketcher) throw new Error("Ketcher is not ready.");
        // Standalone Ketcher routes conversions through one local Indigo
        // worker. Keep requests serial so concurrent commands cannot compete
        // for the worker's single response channel.
        const smiles = await ketcher.getSmiles();
        const molfile = await ketcher.getMolfile("v3000");
        const inchiKey = await ketcher.getInChIKey();
        return { smiles, molfile, inchiKey };
      },
      async importStructure(structure: string) {
        if (!ketcher) throw new Error("Ketcher is not ready.");
        await ketcher.setMolecule(structure, { needZoom: true });
        fitAfterLayout(ketcher);
      },
      async clear() {
        if (!ketcher) throw new Error("Ketcher is not ready.");
        cancelFitRef.current();
        await ketcher.setMolecule("");
      },
    }),
    [fitAfterLayout, ketcher],
  );

  return (
    <div
      ref={frameRef}
      className={styles.ketcherFrame}
      data-ketcher-editor="standalone"
      data-ketcher-ready={ketcher ? "true" : "false"}
    >
      <Editor
        staticResourcesUrl={import.meta.env.BASE_URL}
        structServiceProvider={provider}
        disableMacromoleculesEditor
        buttons={{
          miew: { hidden: true },
          recognize: { hidden: true },
          help: { hidden: true },
          about: { hidden: true },
        }}
        errorHandler={() => onError?.(localizedEditorError(locale))}
        onInit={(instance) => setKetcher(instance)}
      />
    </div>
  );
});
