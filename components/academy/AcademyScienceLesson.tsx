"use client";

import { useMemo } from "react";

import { createAcademyScienceLesson } from "@/lib/application/academy-science-lessons";
import type {
  AcademyLocale,
  AcademyScienceLessonStatus,
  AcademyScienceModuleId,
} from "@/lib/domain/academy";

import styles from "./AcademyHub.module.css";

export interface AcademyScienceLessonProps {
  readonly moduleId: AcademyScienceModuleId;
  readonly moleculeIdOrSlug: string;
  readonly locale: AcademyLocale;
  readonly assetBasePath?: string;
  readonly onOpenDossier?: (moleculeId: string) => void;
}

const copy = {
  tr: {
    lessonShell: "KANIT KAPILI DERS",
    concept: "Kavram",
    evidence: "İlaç uygulaması",
    evidenceEmpty: "Bu kayıt için yayımlanabilir ölçüm veya etkileşim alanı açılmadı.",
    contexts: "Doğrulanmış uygulama bağlamları",
    contextBoundary: "Bağlam, ADME sonucu değildir",
    guided: "Yönlendirilmiş inceleme",
    pharmacologyPrompt: "Hedef adı, etki türü, ölçüm, birim ve deney bağlamından hangileri doğrudan kaynağa bağlı? Eksik olanı sonuç gibi yazma.",
    admePrompt: "Uygulama yolu/form bilgisini emilim veya sistemik maruziyet iddiasından ayır. Birim ve koşulu olmayan sayısal değeri kullanma.",
    sources: "Çözümlenmiş kaynaklar",
    sourceScope: "Destek kapsamı",
    limitations: "Ders sınırları",
    dossier: "İlaç dosyasını aç",
    clinicalBoundary: "Eğitim ve referans içeriği · klinik karar desteği değildir",
    reviewed: "İncelendi",
    sourceSupported: "Kaynak destekli",
    contextOnly: "Yalnız bağlam",
    unavailable: "Bilimsel alan henüz yok",
  },
  en: {
    lessonShell: "SOURCE-GATED LESSON",
    concept: "Concept",
    evidence: "Drug application",
    evidenceEmpty: "No publishable measurement or interaction field opened for this record.",
    contexts: "Verified administration contexts",
    contextBoundary: "Context is not an ADME outcome",
    guided: "Guided review",
    pharmacologyPrompt: "Which of target name, action type, measurement, unit, and assay context link to a direct source? Do not turn a missing field into a conclusion.",
    admePrompt: "Separate route/form information from an absorption or systemic-exposure claim. Do not use a quantitative value without units and conditions.",
    sources: "Resolved sources",
    sourceScope: "Support scope",
    limitations: "Lesson boundaries",
    dossier: "Open Drug Dossier",
    clinicalBoundary: "Education and reference · not clinical decision support",
    reviewed: "Reviewed",
    sourceSupported: "Source supported",
    contextOnly: "Context only",
    unavailable: "Scientific field not available yet",
  },
} as const;

const statusKey: Readonly<
  Record<AcademyScienceLessonStatus, keyof (typeof copy)["en"]>
> = {
  reviewed: "reviewed",
  "source-supported": "sourceSupported",
  "context-only": "contextOnly",
  unavailable: "unavailable",
};

export function AcademyScienceLesson({
  moduleId,
  moleculeIdOrSlug,
  locale,
  assetBasePath = "/",
  onOpenDossier,
}: AcademyScienceLessonProps) {
  const labels = copy[locale];
  const lesson = useMemo(
    () =>
      createAcademyScienceLesson(
        moduleId,
        moleculeIdOrSlug,
        locale,
        assetBasePath,
      ),
    [assetBasePath, locale, moduleId, moleculeIdOrSlug],
  );
  const statusLabel = labels[statusKey[lesson.status]];

  return (
    <article
      className={styles.scienceLesson}
      data-academy-science-module={moduleId}
      data-evidence-status={lesson.status}
    >
      <header className={styles.lessonHeader}>
        <div>
          <span>{labels.lessonShell}</span>
          <h2>{lesson.title}</h2>
          <p>{lesson.moleculeName}</p>
        </div>
        <small data-status={lesson.status}>{statusLabel}</small>
      </header>

      <div className={styles.lessonGrid}>
        <section className={styles.conceptCard}>
          <span>01 · {labels.concept}</span>
          <p>{lesson.objective}</p>
        </section>

        <section className={styles.applicationCard}>
          <header>
            <span>02 · {labels.evidence}</span>
            <p role="status">{lesson.statusReason}</p>
          </header>

          {lesson.evidenceItems.length > 0 ? (
            <dl className={styles.evidenceList}>
              {lesson.evidenceItems.map((item) => (
                <div key={item.id}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                  <small>{item.context}</small>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.explicitGap}>{labels.evidenceEmpty}</p>
          )}

          {lesson.administrationContexts.length > 0 ? (
            <section className={styles.contexts}>
              <h3>{labels.contexts}</h3>
              <ul>
                {lesson.administrationContexts.map((context) => (
                  <li key={context.id}>
                    <div>
                      <strong>{context.route}</strong>
                      <span>{context.formulation}</span>
                    </div>
                    <small>{labels.contextBoundary}</small>
                    <p>{context.boundary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>

        <section className={styles.guidedCard}>
          <span>03 · {labels.guided}</span>
          <p>
            {moduleId === "pharmacology"
              ? labels.pharmacologyPrompt
              : labels.admePrompt}
          </p>
        </section>
      </div>

      {lesson.sources.length > 0 ? (
        <details className={styles.lessonSources} data-source-drawer="closed-by-default">
          <summary>{labels.sources} · {lesson.sources.length}</summary>
          <ul>
            {lesson.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  <span>{source.provider}</span>
                  <strong>{source.title}</strong>
                </a>
                <p><b>{labels.sourceScope}:</b> {source.scope}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <footer className={styles.lessonFooter}>
        <div>
          <span>{labels.limitations}</span>
          <ul>
            {lesson.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
        {onOpenDossier && lesson.moleculeId ? (
          <button type="button" onClick={() => onOpenDossier(lesson.moleculeId!)}>
            {labels.dossier} <i aria-hidden="true">↗</i>
          </button>
        ) : null}
      </footer>
      <p className={styles.clinicalBoundary}>{labels.clinicalBoundary}</p>
    </article>
  );
}
