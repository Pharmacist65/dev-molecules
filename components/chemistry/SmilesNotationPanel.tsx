"use client";

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Unwrapped source notation must receive focus for keyboard-only horizontal scrolling. */

import { useEffect, useId, useRef, useState } from "react";

import {
  createSmilesNotationPresentation,
  DAYLIGHT_SMILES_ISOMERISM_URL,
  OPENSMILES_SPECIFICATION_URL,
} from "@/lib/application/smiles-notation-presentation";

import styles from "./SmilesNotationPanel.module.css";

export type SmilesNotationMode = "student" | "story" | "reference";

export interface SmilesNotationPanelProps {
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string | null;
  readonly locale: "tr" | "en";
  readonly mode: SmilesNotationMode;
}

type SmilesField = "canonical" | "isomeric";
type CopyState =
  | { readonly kind: "idle" }
  | { readonly kind: "copied"; readonly field: SmilesField }
  | { readonly kind: "failed"; readonly field: SmilesField };

/**
 * Presents raw SMILES as source notation, not as a human-readable name.
 * Values are deliberately copied and rendered without trimming or normalizing.
 */
export function SmilesNotationPanel({
  canonicalSmiles,
  isomericSmiles,
  locale,
  mode,
}: SmilesNotationPanelProps) {
  const presentation = createSmilesNotationPresentation({
    canonicalSmiles,
    isomericSmiles,
    locale,
  });
  const labels = presentation.copy;
  const statusId = useId();
  const guideTitleId = useId();
  const canonicalLabelId = useId();
  const isomericLabelId = useId();
  const clearStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyState, setCopyState] = useState<CopyState>({ kind: "idle" });
  const { hasIsomericSmiles } = presentation;
  const hasNotationMarkers = presentation.hasAtomStereo || presentation.hasDirectionalBondMarkers;

  useEffect(() => () => {
    if (clearStatusTimer.current !== null) clearTimeout(clearStatusTimer.current);
  }, []);

  const copyExactValue = async (field: SmilesField, value: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
      setCopyState({ kind: "copied", field });
    } catch {
      setCopyState({ kind: "failed", field });
    }

    if (clearStatusTimer.current !== null) clearTimeout(clearStatusTimer.current);
    clearStatusTimer.current = setTimeout(() => {
      setCopyState({ kind: "idle" });
      clearStatusTimer.current = null;
    }, 3200);
  };

  const statusMessage = copyState.kind === "idle"
    ? ""
    : copyState.kind === "failed"
      ? labels.copyFailed
      : copyState.field === "canonical"
        ? labels.copiedCanonical
        : labels.copiedIsomeric;

  const renderField = (field: SmilesField, value: string, label: string) => {
    const labelId = field === "canonical" ? canonicalLabelId : isomericLabelId;

    return (
      <div className={styles.field} data-smiles-field={field} key={field}>
        <div className={styles.fieldHeader}>
          <span id={labelId}>{label}</span>
          <button
            type="button"
            aria-describedby={statusId}
            aria-label={field === "canonical" ? labels.copyCanonical : labels.copyIsomeric}
            onClick={() => void copyExactValue(field, value)}
          >
            {labels.copyButton}
          </button>
        </div>
        <code
          className={styles.rawCode}
          role="region"
          dir="ltr"
          translate="no"
          spellCheck={false}
          tabIndex={0}
          aria-labelledby={labelId}
          data-raw-smiles={field}
        >{value}</code>
      </div>
    );
  };

  const copyStatus = (
    <p
      className={styles.copyStatus}
      id={statusId}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-copy-state={copyState.kind}
    >
      {statusMessage}
    </p>
  );

  const rawFields = (
    <div className={styles.fields} role="group" aria-label={labels.notationGroup}>
      {renderField("canonical", canonicalSmiles, labels.canonical)}
      {isomericSmiles !== null && isomericSmiles.length > 0
        ? renderField("isomeric", isomericSmiles, labels.isomeric)
        : (
            <div className={styles.missing} data-smiles-field="isomeric" data-field-status="missing">
              <strong>{labels.isomeric}</strong>
              <p>{labels.missing}</p>
            </div>
          )}
    </div>
  );

  return (
    <div
      className={styles.panel}
      data-smiles-notation={mode}
      data-isomeric-smiles={hasIsomericSmiles ? "present" : "missing"}
    >
      <section className={styles.guide} aria-labelledby={guideTitleId}>
        <header className={styles.guideHeader}>
          <span>{labels.guideEyebrow}</span>
          <h3 id={guideTitleId}>{labels.guideTitle}</h3>
          <p>{labels.definition}</p>
        </header>

        <div className={styles.notationTypes}>
          <article>
            <h4>{labels.canonical}</h4>
            <p>{labels.canonicalMeaning}</p>
          </article>
          <article>
            <h4>{labels.isomeric}</h4>
            <p>{labels.isomericMeaning}</p>
          </article>
        </div>

        <span
          className={styles.badge}
          data-status={hasIsomericSmiles || hasNotationMarkers ? "present" : "missing"}
        >
          <i aria-hidden="true" />
          {presentation.hasAtomStereo
            ? presentation.hasDirectionalBondMarkers
              ? labels.statusAtomAndBond
              : labels.statusAtom
            : presentation.hasDirectionalBondMarkers
              ? labels.statusBond
              : hasIsomericSmiles
                ? labels.statusPresent
                : labels.statusMissing}
        </span>

        {presentation.hasAtomStereo ? (
          <section className={styles.stereoLesson} aria-label={labels.stereoQuestion}>
            <h4>{labels.stereoQuestion}</h4>
            <p>{labels.stereoAnswer}</p>
            <dl className={styles.markerLegend}>
              <div>
                <dt><code className={styles.marker}>@</code></dt>
                <dd>{labels.atMeaning}</dd>
              </div>
              <div>
                <dt><code className={styles.marker}>@@</code></dt>
                <dd>{labels.atAtMeaning}</dd>
              </div>
            </dl>
            <p className={styles.tetrahedralContext}>{labels.tetrahedralContext}</p>
            <p className={styles.absoluteRule}>{labels.absoluteConfiguration}</p>
            {mode === "story" ? null : (
              <details className={styles.exampleDetails}>
                <summary>{labels.exampleSummary}</summary>
                <div>
                  <p>{labels.exampleIntro}</p>
                  <div className={styles.exampleStrings} aria-label={labels.exampleSummary}>
                    {presentation.equivalentTetrahedralExamples.map((example) => (
                      <code key={example}>{example}</code>
                    ))}
                  </div>
                  <p>{labels.exampleConclusion}</p>
                </div>
              </details>
            )}
          </section>
        ) : null}

        {presentation.hasDirectionalBondMarkers ? (
          <p className={styles.bondStereo}>
            <code className={styles.marker}>/</code>{" "}
            <code className={styles.marker}>{"\\"}</code>{" "}
            {labels.bondStereo}
          </p>
        ) : null}

        {!hasIsomericSmiles ? <p className={styles.missingExplanation}>{labels.missing}</p> : null}

        <p className={styles.sourcesLine}>
          <span>{labels.notationSources}:</span>{" "}
          <a href={OPENSMILES_SPECIFICATION_URL} target="_blank" rel="noreferrer">
            {labels.openSmilesSource}
          </a>{" · "}
          <a href={DAYLIGHT_SMILES_ISOMERISM_URL} target="_blank" rel="noreferrer">
            {labels.daylightSource}
          </a>
        </p>
      </section>

      {mode === "student" ? (
        <details className={styles.rawDetails}>
          <summary>{labels.openNotation}</summary>
          {rawFields}
          {copyStatus}
        </details>
      ) : mode === "reference" ? (
        <>
          {rawFields}
          {copyStatus}
        </>
      ) : null}
    </div>
  );
}
