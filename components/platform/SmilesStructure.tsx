"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SmilesAtomAnchor {
  readonly id: string;
  readonly atomIndex: number;
}

const EMPTY_ATOM_ANCHORS: readonly SmilesAtomAnchor[] = [];

interface SmilesStructureProps {
  readonly smiles: string;
  readonly label: string;
  readonly className?: string;
  readonly atomAnchors?: readonly SmilesAtomAnchor[];
  readonly onDrawReady?: () => void;
}

export function SmilesStructure({
  smiles,
  label,
  className,
  atomAnchors = EMPTY_ATOM_ANCHORS,
  onDrawReady,
}: SmilesStructureProps) {
  const reactId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const onDrawReadyRef = useRef(onDrawReady);
  const atomAnchorsRef = useRef(atomAnchors);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const anchorSignature = useMemo(
    () => atomAnchors.map((anchor) => `${anchor.id}:${anchor.atomIndex}`).join("|"),
    [atomAnchors],
  );

  useEffect(() => {
    onDrawReadyRef.current = onDrawReady;
  }, [onDrawReady]);

  useEffect(() => {
    atomAnchorsRef.current = atomAnchors;
  }, [atomAnchors]);

  useEffect(() => {
    let cancelled = false;
    const svg = svgRef.current;
    if (!svg) return undefined;
    svg.replaceChildren();
    setStatus("loading");

    void import("smiles-drawer")
      .then(({ default: SmilesDrawer }) => {
        if (cancelled) return;
        SmilesDrawer.parse(
          smiles,
          (tree) => {
            if (cancelled || !svgRef.current) return;
            const drawer = new SmilesDrawer.SvgDrawer({
              width: 320,
              height: 200,
              padding: 18,
              bondThickness: 1.35,
              bondLength: 28,
              shortBondLength: 0.82,
              fontSizeLarge: 10,
              fontSizeSmall: 6,
              terminalCarbons: false,
              explicitHydrogens: false,
            });
            drawer.draw(tree, svgRef.current, "light");

            const graph = (
              drawer as unknown as {
                preprocessor?: {
                  graph?: {
                    vertices?: readonly {
                      position?: { readonly x?: number; readonly y?: number };
                    }[];
                  };
                };
              }
            ).preprocessor?.graph;
            const anchorLayer = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "g",
            );
            anchorLayer.setAttribute("aria-hidden", "true");
            anchorLayer.setAttribute("data-smiles-anchor-layer", "true");
            for (const anchor of atomAnchorsRef.current) {
              const position = graph?.vertices?.[anchor.atomIndex]?.position;
              if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) {
                continue;
              }
              const marker = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle",
              );
              marker.setAttribute("cx", String(position?.x));
              marker.setAttribute("cy", String(position?.y));
              marker.setAttribute("r", "0.01");
              marker.setAttribute("fill", "transparent");
              marker.setAttribute("pointer-events", "none");
              marker.setAttribute("data-smiles-atom-anchor", anchor.id);
              anchorLayer.appendChild(marker);
            }
            svgRef.current.appendChild(anchorLayer);
            setStatus("ready");
            window.requestAnimationFrame(() => onDrawReadyRef.current?.());
          },
          () => {
            if (!cancelled) setStatus("error");
          },
        );
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      svg.replaceChildren();
    };
  }, [anchorSignature, smiles]);

  return (
    <figure
      className={className}
      data-smiles-structure={status}
      aria-labelledby={`${reactId}-caption`}
    >
      <svg ref={svgRef} viewBox="0 0 320 200" role="img" aria-label={label} />
      {status === "error" ? <code>{smiles}</code> : null}
      <figcaption id={`${reactId}-caption`}>{label}</figcaption>
    </figure>
  );
}
