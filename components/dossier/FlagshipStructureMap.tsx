"use client";

import { useMemo, useState } from "react";

import { SmilesStructure } from "@/components/platform/SmilesStructure";

import styles from "./FlagshipDossier.module.css";

export interface FlagshipStructureMapItem {
  readonly id: string;
  readonly label: string;
  readonly atomIndexes: readonly number[];
}

export interface FlagshipStructureMapProps {
  readonly smiles: string;
  readonly items: readonly FlagshipStructureMapItem[];
  readonly locale: "tr" | "en";
  readonly title: string;
}

export function FlagshipStructureMap({
  smiles,
  items,
  locale,
  title,
}: FlagshipStructureMapProps) {
  const mappedItems = useMemo(
    () => items.filter((item) => item.atomIndexes.length > 0),
    [items],
  );
  const [activeId, setActiveId] = useState(mappedItems[0]?.id ?? "");

  if (mappedItems.length === 0) return null;

  const active = mappedItems.find((item) => item.id === activeId) ?? mappedItems[0];
  const labels = locale === "tr"
    ? {
        instruction: "Bir adı veya yapı motifini seçerek kaynak kimliğindeki atom karşılığını vurgula.",
        atomPrefix: "SMILES atomları",
      }
    : {
        instruction: "Select a name segment or structure motif to highlight its atom correspondence in the source identity.",
        atomPrefix: "SMILES atoms",
      };

  return (
    <div className={styles.structureMap} data-flagship-structure-map="interactive">
      <div className={styles.structureMapCopy}>
        <strong>{title}</strong>
        <p>{labels.instruction}</p>
        <div role="group" aria-label={title} className={styles.structureMapControls}>
          {mappedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === active.id}
              onClick={() => setActiveId(item.id)}
            >
              <span>{item.label}</span>
              <small>{labels.atomPrefix}: {item.atomIndexes.map((index) => `A${index + 1}`).join(" · ")}</small>
            </button>
          ))}
        </div>
      </div>
      <SmilesStructure
        className={styles.structureMapFigure}
        smiles={smiles}
        label={`${title}: ${active.label}`}
        highlightedAtomIndexes={active.atomIndexes}
      />
    </div>
  );
}
