"use client";

import {
  createLearningJourneyStageViews,
  getRecommendedLearningJourneyStage,
  type LearningJourneyDestination,
} from "@/lib/application/learning-journey-map";
import type { NomenclatureProgressSnapshot } from "@/lib/domain";
import type { Locale } from "@/lib/i18n";

import styles from "./LearningJourneyMap.module.css";

export interface LearningJourneyMapProps {
  readonly locale: Locale;
  readonly nomenclatureProgress: NomenclatureProgressSnapshot | null;
  readonly completedMissionIds: ReadonlySet<string>;
  readonly onOpenSynthesis: () => void;
  readonly onOpenNomenclature: () => void;
}

const copy = {
  tr: {
    eyebrow: "ÖĞRENME YOLCULUĞU",
    title: "Molekülü okumaktan savunmaya, altı adım.",
    description:
      "Yapı dilini kur, adlandırma kararlarını atomlar üzerinde dene, reaksiyon mantığına geç ve öğrendiklerini bir ilaç molekülü incelemesinde birleştir.",
    mapLabel: "Altı aşamalı öğrenci öğrenme haritası",
    recommendedPath: "Şimdi devam et",
    completion: "Tamamlanma",
    nextLesson: "Önerilen sonraki ders",
    relatedMolecules: "İlişkili moleküller",
    available: "Hazır",
    planned: "Planlandı",
    openNomenclature: "Akademiyi aç",
    openSynthesis: "Sentez Atlası'nı aç",
    openNearest: "Atlas'taki örneği aç",
    plannedNote:
      "Bu aşamanın bağımsız ilerleme takibi planlandı; şimdilik en yakın çalışan ders açılır.",
    units: "etkinlik",
  },
  en: {
    eyebrow: "LEARNING JOURNEY",
    title: "Six stages from reading a molecule to defending a review.",
    description:
      "Build structure language, practise naming decisions on atoms, move into reaction logic, and combine the learning in a drug-molecule review.",
    mapLabel: "Six-stage student learning map",
    recommendedPath: "Continue now",
    completion: "Completion",
    nextLesson: "Recommended next lesson",
    relatedMolecules: "Related molecules",
    available: "Available",
    planned: "Planned",
    openNomenclature: "Open Academy",
    openSynthesis: "Open Synthesis Atlas",
    openNearest: "Open the Atlas example",
    plannedNote:
      "Independent progress tracking for this stage is planned; the closest working lesson opens for now.",
    units: "activities",
  },
} as const;

export function LearningJourneyMap({
  locale,
  nomenclatureProgress,
  completedMissionIds,
  onOpenSynthesis,
  onOpenNomenclature,
}: LearningJourneyMapProps) {
  const labels = copy[locale];
  const stages = createLearningJourneyStageViews(locale, {
    nomenclatureProgress,
    completedMissionIds,
  });
  const recommendedStage = getRecommendedLearningJourneyStage(stages);

  function openDestination(destination: LearningJourneyDestination) {
    if (destination === "nomenclature") {
      onOpenNomenclature();
      return;
    }
    onOpenSynthesis();
  }

  return (
    <section
      className={styles.map}
      aria-labelledby="learning-journey-map-heading"
      data-learning-journey-map
    >
      <header className={styles.hero}>
        <div>
          <span>{labels.eyebrow}</span>
          <h1 id="learning-journey-map-heading">{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
        {recommendedStage ? (
          <aside className={styles.continueCard} aria-label={labels.recommendedPath}>
            <span>{labels.recommendedPath}</span>
            <strong>{recommendedStage.title}</strong>
            <button
              type="button"
              onClick={() => openDestination(recommendedStage.destination)}
            >
              {recommendedStage.destination === "nomenclature"
                ? labels.openNomenclature
                : labels.openSynthesis}
              <i aria-hidden="true">→</i>
            </button>
          </aside>
        ) : null}
      </header>

      <ol className={styles.path} aria-label={labels.mapLabel}>
        {stages.map((stage) => {
          const isRecommended = stage.id === recommendedStage?.id;
          const statusLabel = stage.availability === "available"
            ? labels.available
            : labels.planned;
          const actionLabel = stage.availability === "planned"
            ? labels.openNearest
            : stage.destination === "nomenclature"
              ? labels.openNomenclature
              : labels.openSynthesis;

          return (
            <li
              key={stage.id}
              className={styles.stage}
              data-availability={stage.availability}
              data-completion={stage.completionPercent}
              data-recommended={isRecommended}
              data-testid={`learning-stage-${stage.id}`}
            >
              <div className={styles.marker} aria-hidden="true">
                <span>{String(stage.order).padStart(2, "0")}</span>
                {stage.completionPercent === 100 ? <i>✓</i> : null}
              </div>

              <article className={styles.stageCard}>
                <header>
                  <div>
                    <span>{String(stage.order).padStart(2, "0")} / 06</span>
                    <h2>{stage.title}</h2>
                  </div>
                  <small data-status={stage.availability}>{statusLabel}</small>
                </header>

                <p className={styles.purpose}>{stage.purpose}</p>

                <div className={styles.progressBlock}>
                  <div>
                    <span>{labels.completion}</span>
                    <strong>{stage.completionPercent}%</strong>
                  </div>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label={`${stage.title}: ${labels.completion}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={stage.completionPercent}
                  >
                    <i style={{ width: `${stage.completionPercent}%` }} />
                  </div>
                  {stage.totalUnits > 0 ? (
                    <small>
                      {stage.completedUnits}/{stage.totalUnits} {labels.units}
                    </small>
                  ) : null}
                </div>

                <div className={styles.lessonRow}>
                  <div>
                    <span>{labels.nextLesson}</span>
                    <strong>{stage.recommendedLesson}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDestination(stage.destination)}
                  >
                    {actionLabel}
                    <i aria-hidden="true">↗</i>
                  </button>
                </div>

                <footer>
                  <span>{labels.relatedMolecules}</span>
                  <ul>
                    {stage.relatedMolecules.map((molecule) => (
                      <li key={molecule}>{molecule}</li>
                    ))}
                  </ul>
                  {stage.availability === "planned" ? (
                    <p>{labels.plannedNote}</p>
                  ) : null}
                </footer>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
