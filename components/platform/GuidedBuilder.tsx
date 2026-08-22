"use client";

import { useState } from "react";

import type { MoleculeRecord } from "@/lib/domain";
import { useI18n, type TranslationKey } from "@/lib/i18n";

import styles from "./platform.module.css";

const fragments = [
  { id: "aryl", labelKey: "build.fragment.aromatic", symbol: "Ar", hintKey: "build.fragment.aromaticHint" },
  { id: "ether", labelKey: "build.fragment.ether", symbol: "O", hintKey: "build.fragment.etherHint" },
  { id: "chain", labelKey: "build.fragment.chain", symbol: "C₃", hintKey: "build.fragment.chainHint" },
  { id: "alcohol", labelKey: "build.fragment.alcohol", symbol: "OH", hintKey: "build.fragment.alcoholHint" },
  { id: "amine", labelKey: "build.fragment.amine", symbol: "N", hintKey: "build.fragment.amineHint" },
] as const;

export function GuidedBuilder({ molecule }: { readonly molecule: MoleculeRecord }) {
  const { t } = useI18n();
  const [assembled, setAssembled] = useState<string[]>([]);
  const [feedbackKey, setFeedbackKey] = useState<TranslationKey>("build.feedback.start");
  const isComplete = assembled.length === fragments.length;

  function addFragment(fragmentId: string) {
    if (isComplete || assembled.includes(fragmentId)) return;
    const expected = fragments[assembled.length];
    if (fragmentId !== expected?.id) {
      setFeedbackKey(expected?.hintKey ?? "build.feedback.identityBoundary");
      return;
    }
    const next = [...assembled, fragmentId];
    setAssembled(next);
    setFeedbackKey(
      next.length === fragments.length
        ? "build.feedback.complete"
        : fragments[next.length]?.hintKey ?? "common.continue",
    );
  }

  function reset() {
    setAssembled([]);
    setFeedbackKey("build.feedback.start");
  }

  return (
    <section className={styles.featureSection} aria-labelledby="builder-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>{t("build.eyebrow")}</p>
          <h1 id="builder-heading">{t("build.title")}</h1>
          <p>{t("build.description")}</p>
        </div>
        <div className={styles.reviewPill} data-state={isComplete ? "complete" : "pending"}>
          <i /> {isComplete ? t("build.scaffoldComplete") : t("build.fragmentsProgress", { completed: assembled.length, total: fragments.length })}
        </div>
      </div>

      <div className={styles.builderGrid}>
        <aside className={styles.fragmentLibrary}>
          <span className={styles.smallLabel}>{t("build.fragmentLibrary")}</span>
          <h3>{t("build.guidedComponents")}</h3>
          <p>{t("build.currentReference", { name: molecule.identity.preferredName })}</p>
          <div className={styles.fragmentButtons}>
            {fragments.map((fragment) => (
              <button
                key={fragment.id}
                type="button"
                disabled={assembled.includes(fragment.id)}
                onClick={() => addFragment(fragment.id)}
              >
                <span>{fragment.symbol}</span>
                <div><strong>{t(fragment.labelKey)}</strong><small>{assembled.includes(fragment.id) ? t("build.placed") : t("build.addToCanvas")}</small></div>
              </button>
            ))}
          </div>
        </aside>

        <div className={styles.builderCanvas}>
          <div className={styles.canvasGrid} aria-hidden="true" />
          <div className={styles.buildTopline}>
            <span>{t("build.guidedMode")}</span><span>{t("build.educationalPreview")}</span>
          </div>
          <div className={styles.assembledStructure} aria-label={t("build.placedAria", { count: assembled.length })}>
            {fragments.map((fragment, index) => (
              <div
                key={fragment.id}
                className={styles.assemblyNode}
                data-placed={assembled.includes(fragment.id)}
              >
                {index > 0 ? <i aria-hidden="true" /> : null}
                <span>{fragment.symbol}</span>
                <small>{t(fragment.labelKey)}</small>
              </div>
            ))}
          </div>
          <div className={styles.builderFeedback} role="status" data-complete={isComplete}>
            <span>{isComplete ? "✓" : String(assembled.length + 1).padStart(2, "0")}</span>
            <div><strong>{isComplete ? t("build.learningScaffoldAssembled") : t("build.nextConstraint")}</strong><p>{t(feedbackKey)}</p></div>
          </div>
        </div>

        <aside className={styles.inspectorPanel}>
          <span className={styles.smallLabel}>{t("build.inspector")}</span>
          <dl>
            <div><dt>{t("build.representation")}</dt><dd>{t("build.userEditedDraft")}</dd></div>
            <div><dt>{t("build.identityMatch")}</dt><dd>{isComplete ? t("build.comparisonReady") : t("common.notAssessed")}</dd></div>
            <div><dt>{t("build.synthesisEvidence")}</dt><dd>{t("common.notAssessed")}</dd></div>
            <div><dt>{t("build.biologicalEvidence")}</dt><dd>{t("common.notAssessed")}</dd></div>
            <div><dt>{t("build.privacy")}</dt><dd>{t("build.deviceLocal")}</dd></div>
          </dl>
          <div className={styles.boundaryCallout}>
            <b>{t("build.drawnNotDiscovered")}</b>
            <p>{t("build.boundaryNotice")}</p>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={reset}>{t("build.resetWorkbench")}</button>
        </aside>
      </div>
    </section>
  );
}
