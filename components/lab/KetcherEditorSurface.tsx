"use client";

import {
  forwardRef,
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

export const KetcherEditorSurface = forwardRef<
  KetcherEditorHandle,
  KetcherEditorSurfaceProps
>(function KetcherEditorSurface(
  { initialStructure, locale, onReadyChange, onError },
  ref,
) {
  const provider = useMemo(() => new StandaloneStructServiceProvider(), []);
  const [ketcher, setKetcher] = useState<Ketcher | null>(null);
  const loadedInitialRef = useRef(false);

  useEffect(() => {
    onReadyChange?.(Boolean(ketcher));
  }, [ketcher, onReadyChange]);

  useEffect(() => {
    if (!ketcher || loadedInitialRef.current) return;
    loadedInitialRef.current = true;
    void ketcher.setMolecule(initialStructure).catch((error: unknown) => {
      onError?.(
        error instanceof Error
          ? error.message
          : locale === "tr"
            ? "Başlangıç yapısı yüklenemedi."
            : "The initial structure could not be loaded.",
      );
    });
  }, [initialStructure, ketcher, locale, onError]);

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
      },
      async clear() {
        if (!ketcher) throw new Error("Ketcher is not ready.");
        await ketcher.setMolecule("");
      },
    }),
    [ketcher],
  );

  return (
    <div
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
        errorHandler={(message) => onError?.(message)}
        onInit={(instance) => setKetcher(instance)}
      />
    </div>
  );
});
