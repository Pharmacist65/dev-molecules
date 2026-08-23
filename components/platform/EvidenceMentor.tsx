"use client";

import { useEffect, useRef, useState } from "react";

import {
  createLocalEvidenceCard,
  type MentorEvidenceCard,
} from "@/lib/application/evidence-card";
import { presentEvidenceStatus } from "@/lib/application/evidence-status-presentation";
import { moleculeCatalog } from "@/lib/data/catalog";
import type { MoleculeRecord } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

import styles from "./platform.module.css";

interface EvidenceMentorProps {
  readonly molecule: MoleculeRecord;
  readonly onSelectMolecule: (moleculeId: string) => void;
}

const usesStaticEvidence = import.meta.env.VITE_STATIC_EVIDENCE === "true";

export function EvidenceMentor({ molecule, onSelectMolecule }: EvidenceMentorProps) {
  const { locale, t } = useI18n();
  const defaultQuestion = t("discover.defaultQuestion");
  const previousDefaultRef = useRef(defaultQuestion);
  const [question, setQuestion] = useState(defaultQuestion);
  const [card, setCard] = useState<MentorEvidenceCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuestion((current) => current === previousDefaultRef.current ? defaultQuestion : current);
    previousDefaultRef.current = defaultQuestion;
  }, [defaultQuestion]);

  async function analyze() {
    setLoading(true);
    setError("");
    setCard(null);
    try {
      if (usesStaticEvidence) {
        const localCard = createLocalEvidenceCard(molecule.id, question, locale);
        if (!localCard) throw new Error(t("discover.cardError"));
        setCard(localCard);
        return;
      }

      try {
        const response = await fetch("/api/evidence", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ moleculeId: molecule.id, question, locale }),
        });
        const payload = (await response.json()) as MentorEvidenceCard | { error?: string };
        if (!response.ok || !("cardId" in payload)) {
          throw new Error(t("discover.cardError"));
        }
        setCard(payload);
      } catch {
        const localCard = createLocalEvidenceCard(molecule.id, question, locale);
        if (!localCard) throw new Error(t("discover.cardError"));
        setCard(localCard);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("discover.cardError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.featureSection} aria-labelledby="discover-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>{t("discover.eyebrow")}</p>
          <h1 id="discover-heading">{t("discover.title")}</h1>
          <p>{t("discover.description")}</p>
        </div>
        <div className={styles.privatePill}><i /> {t("discover.privateByDefault")}</div>
      </div>

      <div className={styles.evidenceWorkspace}>
        <div className={styles.evidenceComposer}>
          <div className={styles.composerTopline}>
            <span>{t("discover.researchQuestion")}</span><span>{t("discover.failClosed")}</span>
          </div>
          <label>
            {t("discover.catalogIdentity")}
            <select
              value={molecule.id}
              onChange={(event) => {
                onSelectMolecule(event.target.value);
                setCard(null);
              }}
            >
              {moleculeCatalog.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.identity.preferredName} · {candidate.identity.molecularFormula}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.structureInput}>
            <span>CANONICAL SMILES / {t("discover.curatedRecord")}</span>
            <code>{molecule.identity.canonicalSmiles}</code>
            <small>{t("discover.curatedRecordNotice")}</small>
          </div>

          <label>
            {t("discover.evidenceQuestion")}
            <textarea
              value={question}
              maxLength={800}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>

          <div className={styles.suggestionRow} aria-label={t("discover.suggestedQuestions")}>
            {[t("discover.suggestion.identity"), t("discover.suggestion.synthesis"), t("discover.suggestion.missing")].map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)}>{suggestion}</button>
            ))}
          </div>

          <button className={styles.analyzeButton} type="button" disabled={loading || !question.trim()} onClick={analyze}>
            <span>{loading ? "···" : "✦"}</span>
            {loading ? t("discover.generatingCard") : t("discover.generateCard")}
          </button>
          {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
        </div>

        <div className={styles.evidenceResult} aria-live="polite">
          {!card ? (
            <div className={styles.emptyEvidence}>
              <span aria-hidden="true">⌁</span>
              <h2>{t("discover.cardWaiting")}</h2>
              <p>{t("discover.cardWaitingBody")}</p>
              <div><i /> {t("discover.noUnsupportedProse")}</div>
            </div>
          ) : (
            <EvidenceCardView card={card} />
          )}
        </div>
      </div>
    </section>
  );
}

function EvidenceCardView({ card }: { readonly card: MentorEvidenceCard }) {
  const { t } = useI18n();
  return (
    <article className={styles.evidenceCard}>
      <header>
        <div>
          <span>{t("discover.evidenceCard")}</span>
          <h2>{card.moleculeName}</h2>
        </div>
        <div className={styles.modeBadge} data-mode={card.mode}>{presentEvidenceStatus(card.mode, t)}</div>
      </header>

      <div className={styles.statusMatrix}>
        <div><span>{t("discover.structure")}</span><strong>{presentEvidenceStatus(card.structuralStatus, t)}</strong></div>
        <div><span>{t("discover.identity")}</span><strong>{presentEvidenceStatus(card.identityStatus, t)}</strong></div>
        <div><span>{t("discover.synthesis")}</span><strong>{presentEvidenceStatus(card.synthesisStatus, t)}</strong></div>
        <div><span>{t("discover.biology")}</span><strong>{presentEvidenceStatus(card.biologicalStatus, t)}</strong></div>
      </div>

      <p className={styles.cardSummary}>{card.summary}</p>

      <div className={styles.findingList}>
        {card.findings.map((finding) => (
          <div key={finding.label}>
            <span className={styles.findingStatus} data-status={finding.status}><i /> {presentEvidenceStatus(finding.status, t)}</span>
            <strong>{finding.label}</strong>
            <p>{finding.value}</p>
            <small>{finding.sourceIds.length ? finding.sourceIds.join(" · ") : t("discover.noEligibleClaimSource")}</small>
          </div>
        ))}
      </div>

      <div className={styles.sourceList}>
        <span className={styles.smallLabel}>{t("discover.resolvedSources")}</span>
        {card.sources.map((source, index) => (
          <a key={source.id} href={source.url ?? undefined} target={source.url ? "_blank" : undefined} rel="noreferrer">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{source.provider}</strong><small>{source.title}</small></div>
            <i>{source.url ? "↗" : "—"}</i>
          </a>
        ))}
      </div>

      <footer>
        <strong>{t("common.limitations")}</strong>
        <ul>{card.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </footer>
    </article>
  );
}
