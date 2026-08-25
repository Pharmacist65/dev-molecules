"use client";

import { useEffect, useId, useRef, useState } from "react";

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

const copyByLocale = {
  tr: {
    canonical: "Bağlantı / kanonik SMILES",
    isomeric: "Stereokimyasal (izomerik) SMILES",
    stereoPresent: "Stereokimyasal gösterim var",
    stereoMissing: "Kaynaklı stereokimyasal SMILES yok",
    explanationLead: "SMILES içindeki",
    explanationBody:
      "işaretleri, dizimdeki yerel komşu sırasına göre stereokimyasal yönelimi kodlar; doğrudan R veya S anlamına gelmez.",
    interpretation:
      "Mutlak konfigürasyonu yapı görünümü ve kaynaklı stereokimya alanıyla birlikte okuyun.",
    openRaw: "Ham kaynak SMILES dizilerini aç",
    rawGroup: "Ham kaynak SMILES dizileri",
    missing:
      "Bu kayıtta kaynaklı stereokimyasal SMILES alanı yoktur. Bağlantı / kanonik SMILES onun yerine kullanılmaz.",
    copyCanonical: "Bağlantı / kanonik SMILES dizisini aynen kopyala",
    copyIsomeric: "Stereokimyasal SMILES dizisini aynen kopyala",
    copy: "Aynen kopyala",
    copyHint: "Kopyalama, kaynak dizisini değiştirmeden panoya aktarır.",
    copiedCanonical: "Bağlantı / kanonik SMILES aynen kopyalandı.",
    copiedIsomeric: "Stereokimyasal SMILES aynen kopyalandı.",
    copyFailed: "Kopyalama başarısız oldu; kaynak metin değiştirilmedi.",
  },
  en: {
    canonical: "Connectivity / canonical SMILES",
    isomeric: "Stereochemical (isomeric) SMILES",
    stereoPresent: "Stereochemical notation present",
    stereoMissing: "No sourced stereochemical SMILES",
    explanationLead: "In SMILES,",
    explanationBody:
      "markers encode stereochemical orientation relative to the local neighbour order in that traversal; they do not directly mean R or S.",
    interpretation:
      "Read absolute configuration together with the structure view and the sourced stereochemistry field.",
    openRaw: "Open the raw source SMILES strings",
    rawGroup: "Raw source SMILES strings",
    missing:
      "This record has no source-backed stereochemical SMILES field. The connectivity / canonical SMILES is not substituted for it.",
    copyCanonical: "Copy the connectivity / canonical SMILES exactly",
    copyIsomeric: "Copy the stereochemical SMILES exactly",
    copy: "Copy exactly",
    copyHint: "Copy transfers the source string without changing it.",
    copiedCanonical: "Connectivity / canonical SMILES copied exactly.",
    copiedIsomeric: "Stereochemical SMILES copied exactly.",
    copyFailed: "Copy failed; the source text was not changed.",
  },
} as const;

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
  const labels = copyByLocale[locale];
  const statusId = useId();
  const clearStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyState, setCopyState] = useState<CopyState>({ kind: "idle" });
  const hasIsomericSmiles = isomericSmiles !== null && isomericSmiles.length > 0;

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
    ? labels.copyHint
    : copyState.kind === "failed"
      ? labels.copyFailed
      : copyState.field === "canonical"
        ? labels.copiedCanonical
        : labels.copiedIsomeric;

  const renderField = (field: SmilesField, value: string, label: string) => (
    <div className={styles.field} data-smiles-field={field} key={field}>
      <div className={styles.fieldHeader}>
        <span>{label}</span>
        <button
          type="button"
          aria-describedby={statusId}
          aria-label={field === "canonical" ? labels.copyCanonical : labels.copyIsomeric}
          onClick={() => void copyExactValue(field, value)}
        >
          {labels.copy}
        </button>
      </div>
      <code
        className={styles.rawCode}
        dir="ltr"
        translate="no"
        spellCheck={false}
        data-raw-smiles={field}
      >{value}</code>
    </div>
  );

  const rawFields = (
    <div className={styles.fields} role="group" aria-label={labels.rawGroup}>
      {renderField("canonical", canonicalSmiles, labels.canonical)}
      {hasIsomericSmiles
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
      <div className={styles.orientation}>
        <span className={styles.badge} data-status={hasIsomericSmiles ? "present" : "missing"}>
          <i aria-hidden="true" />
          {hasIsomericSmiles ? labels.stereoPresent : labels.stereoMissing}
        </span>
        <p>
          {labels.explanationLead}{" "}
          <code className={styles.marker}>@</code>{" / "}
          <code className={styles.marker}>@@</code>{" "}
          {labels.explanationBody}
        </p>
        <small>{labels.interpretation}</small>
      </div>

      {mode === "student" ? (
        <details className={styles.rawDetails}>
          <summary>{labels.openRaw}</summary>
          {rawFields}
        </details>
      ) : mode === "reference" ? rawFields : null}

      {mode !== "story" ? (
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
      ) : null}
    </div>
  );
}
