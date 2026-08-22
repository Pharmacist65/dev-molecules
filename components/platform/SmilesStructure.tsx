"use client";

import { useEffect, useId, useRef, useState } from "react";

interface SmilesStructureProps {
  readonly smiles: string;
  readonly label: string;
  readonly className?: string;
}

export function SmilesStructure({ smiles, label, className }: SmilesStructureProps) {
  const reactId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

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
            setStatus("ready");
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
  }, [smiles]);

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
