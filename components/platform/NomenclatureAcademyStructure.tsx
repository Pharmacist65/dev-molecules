"use client";

import type { KeyboardEvent, ReactNode } from "react";

import { SmilesStructure } from "@/components/platform/SmilesStructure";
import {
  academyText,
  type AcademyBond,
  type AcademyCorrectRegion,
  type AcademyLocale,
  type AcademyStructure,
} from "@/lib/domain/nomenclature-academy";

import styles from "./NomenclatureAcademy.module.css";

interface NomenclatureAcademyStructureProps {
  readonly structure: AcademyStructure;
  readonly locale: AcademyLocale;
  readonly selectedAtomIds?: readonly string[];
  readonly selectedBondIds?: readonly string[];
  readonly atomSequence?: readonly string[];
  readonly atomLabels?: Readonly<Record<string, string>>;
  readonly bondOrderOverrides?: Readonly<Record<string, AcademyBond["order"]>>;
  readonly rotationDegrees?: number;
  readonly correctRegion?: AcademyCorrectRegion;
  readonly onAtomSelect?: (atomId: string) => void;
  readonly onBondSelect?: (bondId: string) => void;
}

function activateWithKeyboard(
  event: KeyboardEvent<SVGGElement | SVGLineElement>,
  action: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function bondGeometry(
  bond: AcademyBond,
  structure: AcademyStructure,
): { x1: number; y1: number; x2: number; y2: number; offsetX: number; offsetY: number } | null {
  const from = structure.atoms?.find((atom) => atom.id === bond.from);
  const to = structure.atoms?.find((atom) => atom.id === bond.to);
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    offsetX: (-dy / length) * 4,
    offsetY: (dx / length) * 4,
  };
}

function visibleBondLines(
  bond: AcademyBond,
  geometry: NonNullable<ReturnType<typeof bondGeometry>>,
): ReactNode {
  if (bond.stereo === "wedge") {
    const points = `${geometry.x1},${geometry.y1} ${geometry.x2 + geometry.offsetX * 2},${geometry.y2 + geometry.offsetY * 2} ${geometry.x2 - geometry.offsetX * 2},${geometry.y2 - geometry.offsetY * 2}`;
    return <polygon points={points} className={styles.wedgeBond} />;
  }

  const offsets =
    bond.order === 1 || bond.order === "aromatic"
      ? [0]
      : bond.order === 2
        ? [-1, 1]
        : [-1.6, 0, 1.6];
  return offsets.map((offset, index) => (
    <line
      key={`${bond.id}:line:${index}`}
      x1={geometry.x1 + geometry.offsetX * offset}
      y1={geometry.y1 + geometry.offsetY * offset}
      x2={geometry.x2 + geometry.offsetX * offset}
      y2={geometry.y2 + geometry.offsetY * offset}
      className={styles.visibleBond}
      strokeDasharray={
        bond.stereo === "dash"
          ? "3 5"
          : bond.order === "aromatic"
            ? "7 4"
            : undefined
      }
    />
  ));
}

export function NomenclatureAcademyStructure({
  structure,
  locale,
  selectedAtomIds = [],
  selectedBondIds = [],
  atomSequence = [],
  atomLabels = {},
  bondOrderOverrides = {},
  rotationDegrees = 0,
  correctRegion,
  onAtomSelect,
  onBondSelect,
}: NomenclatureAcademyStructureProps) {
  const label = `${academyText(structure.title, locale)} — ${academyText(structure.description, locale)}`;
  if (!structure.atoms || !structure.bonds) {
    return <SmilesStructure smiles={structure.smiles} label={label} className={styles.smilesStructure} />;
  }

  const correctAtomIds = new Set(correctRegion?.atomIds ?? []);
  const correctBondIds = new Set(correctRegion?.bondIds ?? []);

  return (
    <figure className={styles.graphFigure}>
      <svg
        viewBox="0 0 340 210"
        role={onAtomSelect || onBondSelect ? "group" : "img"}
        aria-label={label}
      >
        <g transform={`rotate(${rotationDegrees} 170 105)`} className={styles.structureRotator}>
        <g className={styles.bondLayer}>
          {structure.bonds.map((bond) => {
            const displayBond = bondOrderOverrides[bond.id]
              ? { ...bond, order: bondOrderOverrides[bond.id] }
              : bond;
            const geometry = bondGeometry(displayBond, structure);
            if (!geometry) return null;
            const selected = selectedBondIds.includes(bond.id);
            const correct = correctBondIds.has(bond.id);
            return (
              <g key={bond.id} data-selected={selected} data-correct={correct}>
                {visibleBondLines(displayBond, geometry)}
                <line
                  x1={geometry.x1}
                  y1={geometry.y1}
                  x2={geometry.x2}
                  y2={geometry.y2}
                  className={styles.bondTarget}
                  role={onBondSelect ? "button" : undefined}
                  tabIndex={onBondSelect ? 0 : undefined}
                  aria-label={onBondSelect ? `${locale === "tr" ? "Bağ" : "Bond"} ${bond.id}` : undefined}
                  onClick={onBondSelect ? () => onBondSelect(bond.id) : undefined}
                  onKeyDown={onBondSelect ? (event) => activateWithKeyboard(event, () => onBondSelect(bond.id)) : undefined}
                />
              </g>
            );
          })}
        </g>
        <g className={styles.atomLayer}>
          {structure.atoms.map((atom) => {
            const selected = selectedAtomIds.includes(atom.id) || atomSequence.includes(atom.id);
            const correct = correctAtomIds.has(atom.id);
            const sequenceNumber = atomSequence.indexOf(atom.id) + 1;
            return (
              <g
                key={atom.id}
                transform={`translate(${atom.x} ${atom.y})`}
                className={styles.atomNode}
                data-element={atom.element}
                data-aromatic={atom.aromatic === true}
                data-placement-label={atomLabels[atom.id] || undefined}
                data-selected={selected}
                data-correct={correct}
                role={onAtomSelect ? "button" : undefined}
                tabIndex={onAtomSelect ? 0 : undefined}
                aria-label={onAtomSelect ? `${atom.element} ${atom.id}${sequenceNumber ? `, ${locale === "tr" ? "sıra" : "order"} ${sequenceNumber}` : ""}` : undefined}
                onClick={onAtomSelect ? () => onAtomSelect(atom.id) : undefined}
                onKeyDown={onAtomSelect ? (event) => activateWithKeyboard(event, () => onAtomSelect(atom.id)) : undefined}
              >
                <circle r="17" />
                <text textAnchor="middle" dominantBaseline="central">{atom.element}</text>
                {atom.charge ? <text className={styles.atomCharge} x="13" y="-12">{atom.charge > 0 ? "+" : "−"}</text> : null}
                {sequenceNumber ? (
                  <g className={styles.sequenceBadge} transform="translate(18 -18)">
                    <circle r="10" />
                    <text textAnchor="middle" dominantBaseline="central">{sequenceNumber}</text>
                  </g>
                ) : null}
                {atomLabels[atom.id] ? (
                  <g className={styles.placementBadge} transform="translate(18 -18)">
                    <circle r="11" />
                    <text textAnchor="middle" dominantBaseline="central">{atomLabels[atom.id]}</text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
        </g>
      </svg>
      <figcaption>{academyText(structure.description, locale)}</figcaption>
    </figure>
  );
}

export type { NomenclatureAcademyStructureProps };
