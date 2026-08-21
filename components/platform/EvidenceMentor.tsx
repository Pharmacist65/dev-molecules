"use client";

import { useState } from "react";

import type { MentorEvidenceCard } from "@/lib/application/evidence-card";
import { moleculeCatalog } from "@/lib/data/catalog";
import type { MoleculeRecord } from "@/lib/domain";

import styles from "./platform.module.css";

interface EvidenceMentorProps {
  readonly molecule: MoleculeRecord;
  readonly onSelectMolecule: (moleculeId: string) => void;
}

export function EvidenceMentor({ molecule, onSelectMolecule }: EvidenceMentorProps) {
  const [question, setQuestion] = useState(
    "Bu kayıt için elimizde hangi kimlik ve sentez kanıtı var?",
  );
  const [card, setCard] = useState<MentorEvidenceCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true);
    setError("");
    setCard(null);
    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moleculeId: molecule.id, question }),
      });
      const payload = (await response.json()) as MentorEvidenceCard | { error?: string };
      if (!response.ok || !("cardId" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Kanıt kartı üretilemedi.",
        );
      }
      setCard(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kanıt kartı üretilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.featureSection} aria-labelledby="discover-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>DISCOVER / PRIVATE EVIDENCE SANDBOX</p>
          <h1 id="discover-heading">Ask the evidence. Never ask for certainty it cannot hold.</h1>
          <p>
            Kimlik, sentez ve biyolojik kanıt ayrı değerlendirilir. “Bulunamadı”
            hiçbir zaman “yeni” veya “patentlenebilir” olarak yorumlanmaz.
          </p>
        </div>
        <div className={styles.privatePill}><i /> PRIVATE BY DEFAULT</div>
      </div>

      <div className={styles.evidenceWorkspace}>
        <div className={styles.evidenceComposer}>
          <div className={styles.composerTopline}>
            <span>RESEARCH QUESTION</span><span>FAIL-CLOSED</span>
          </div>
          <label>
            Catalog identity
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
            <span>CANONICAL SMILES / CURATED RECORD</span>
            <code>{molecule.identity.canonicalSmiles}</code>
            <small>This field is sourced from the selected identity record; it is not user-edited in this foundation flow.</small>
          </div>

          <label>
            Evidence question
            <textarea
              value={question}
              maxLength={800}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>

          <div className={styles.suggestionRow} aria-label="Önerilen sorular">
            {["Kimlik doğrulaması nedir?", "Sentez anlatısı doğrulanmış mı?", "Hangi kanıt eksik?"].map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)}>{suggestion}</button>
            ))}
          </div>

          <button className={styles.analyzeButton} type="button" disabled={loading || !question.trim()} onClick={analyze}>
            <span>{loading ? "···" : "✦"}</span>
            {loading ? "Building evidence card" : "Generate evidence card"}
          </button>
          {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
        </div>

        <div className={styles.evidenceResult} aria-live="polite">
          {!card ? (
            <div className={styles.emptyEvidence}>
              <span aria-hidden="true">⌁</span>
              <h2>Evidence card waiting</h2>
              <p>Önce yapı kaydı ve kaynaklar kontrol edilir; AI varsa yalnız bu bağlamı açıklar.</p>
              <div><i /> No unsupported prose is shown before validation.</div>
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
  return (
    <article className={styles.evidenceCard}>
      <header>
        <div>
          <span>EVIDENCE CARD</span>
          <h2>{card.moleculeName}</h2>
        </div>
        <div className={styles.modeBadge} data-mode={card.mode}>{card.mode}</div>
      </header>

      <div className={styles.statusMatrix}>
        <div><span>Structure</span><strong>{card.structuralStatus}</strong></div>
        <div><span>Identity</span><strong>{card.identityStatus}</strong></div>
        <div><span>Synthesis</span><strong>{card.synthesisStatus}</strong></div>
        <div><span>Biology</span><strong>{card.biologicalStatus}</strong></div>
      </div>

      <p className={styles.cardSummary}>{card.summary}</p>

      <div className={styles.findingList}>
        {card.findings.map((finding) => (
          <div key={finding.label}>
            <span className={styles.findingStatus} data-status={finding.status}><i /> {finding.status}</span>
            <strong>{finding.label}</strong>
            <p>{finding.value}</p>
            <small>{finding.sourceIds.length ? finding.sourceIds.join(" · ") : "No eligible source for a claim"}</small>
          </div>
        ))}
      </div>

      <div className={styles.sourceList}>
        <span className={styles.smallLabel}>RESOLVED SOURCES</span>
        {card.sources.map((source, index) => (
          <a key={source.id} href={source.url ?? undefined} target={source.url ? "_blank" : undefined} rel="noreferrer">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{source.provider}</strong><small>{source.title}</small></div>
            <i>{source.url ? "↗" : "—"}</i>
          </a>
        ))}
      </div>

      <footer>
        <strong>LIMITATIONS</strong>
        <ul>{card.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </footer>
    </article>
  );
}
