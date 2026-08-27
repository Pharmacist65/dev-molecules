"use client";

import { moleculeCatalog } from "@/lib/data/catalog";
import { learningMissions } from "@/lib/data/learning-missions";
import { sourceRegistry } from "@/lib/data/sources";
import type { NomenclatureProgressSnapshot } from "@/lib/domain";
import { useI18n, type TranslationKey } from "@/lib/i18n";

import styles from "./platform.module.css";

const missionTitleKeys: Readonly<Record<string, TranslationKey>> = {
  "mission:find-propranolol": "missions.find.title",
  "mission:beta-profile-classification": "missions.classify.title",
  "mission:active-moiety-versus-form": "missions.forms.title",
  "mission:evidence-boundaries": "missions.boundaries.title",
};

export function InstructorStudio({
  completedMissionIds,
  nomenclatureProgress,
}: {
  readonly completedMissionIds: ReadonlySet<string>;
  readonly nomenclatureProgress: NomenclatureProgressSnapshot | null;
}) {
  const { t } = useI18n();
  const completion = Math.round(
    (completedMissionIds.size / Math.max(learningMissions.length, 1)) * 100,
  );
  const reviewedSources = sourceRegistry.filter(
    (source) => source.verification.status === "verified",
  ).length;

  function exportProgress() {
    const report = {
      product: "Dev Molecules",
      exportedAt: new Date().toISOString(),
      scope: "device-local foundation learner progress",
      completedMissionIds: [...completedMissionIds],
      totalMissions: learningMissions.length,
      scientificNotice: t("shell.footerNotAdvice"),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dev-molecules-progress.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.featureSection} aria-labelledby="teach-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>{t("teach.eyebrow")}</p>
          <h1 id="teach-heading">{t("teach.title")}</h1>
          <p>{t("teach.description")}</p>
        </div>
        <button className={styles.exportButton} type="button" onClick={exportProgress}>{t("teach.exportSummary")} <span>↓</span></button>
      </div>

      <div className={styles.metricGrid}>
        <article><span>{t("teach.learnerCompletion")}</span><strong>{completion}%</strong><div><i style={{ width: `${completion}%` }} /></div><small>{t("teach.missionsCompleted", { completed: completedMissionIds.size, total: learningMissions.length })}</small></article>
        <article><span>{t("teach.catalogSeed")}</span><strong>{moleculeCatalog.length}</strong><p>{t("teach.sourceLinkedIdentities")}</p><small>{t("teach.seedNotCeiling")}</small></article>
        <article><span>{t("teach.synthesisStories")}</span><strong>0</strong><p>{t("teach.reviewerReadyDrafts")}</p><small>{t("teach.expertVerifiedCount", { count: 0 })}</small></article>
        <article><span>{t("teach.sourceRegistry")}</span><strong>{reviewedSources}/{sourceRegistry.length}</strong><p>{t("teach.verifiedSourceRecords")}</p><small>{t("teach.reviewGatesVisible")}</small></article>
      </div>

      <div className={styles.instructorGrid}>
        <div className={styles.assignmentPanel}>
          <div className={styles.panelHeading}><div><span className={styles.smallLabel}>{t("teach.coursePack")}</span><h2>{t("teach.courseTitle")}</h2></div><span>{t("teach.deviceLocal")}</span></div>
          <div className={styles.assignmentTable} role="table" aria-label={t("teach.assignmentProgressAria")}>
            <div className={styles.tableHead} role="row"><span>{t("teach.mission")}</span><span>{t("teach.level")}</span><span>{t("teach.review")}</span><span>{t("teach.progress")}</span></div>
            {learningMissions.map((mission) => (
              <div key={mission.id} className={styles.tableRow} role="row">
                <span><strong>{missionTitleKeys[mission.id] ? t(missionTitleKeys[mission.id]) : mission.title}</strong><small>{t(`missions.level.${mission.level}` as TranslationKey)}</small></span>
                <span>{t(`missions.level.${mission.level}` as TranslationKey)}</span>
                <span>{t("status.pendingReview")}</span>
                <span data-complete={completedMissionIds.has(mission.id)}>{completedMissionIds.has(mission.id) ? t("common.completed") : t("common.notStarted")}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.reviewQueue}>
          <span className={styles.smallLabel}>{t("teach.reviewQueue")}</span>
          <h2>{t("teach.publishFailClosed")}</h2>
          <div className={styles.queueItem}><span>01</span><div><strong>{t("teach.synthesisNarratives")}</strong><small>{t("teach.chemistryReviewerRequired")}</small></div><i>{t("teach.pendingCount", { count: 0 })}</i></div>
          <div className={styles.queueItem}><span>02</span><div><strong>{t("teach.catalogClassifications")}</strong><small>{t("teach.pharmacologyReviewRequired")}</small></div><i>{t("teach.pendingCount", { count: moleculeCatalog.length })}</i></div>
          <div className={styles.queueItem}><span>03</span><div><strong>{t("teach.missionWording")}</strong><small>{t("teach.educatorReviewRequired")}</small></div><i>{t("teach.pendingCount", { count: learningMissions.length })}</i></div>
          {nomenclatureProgress ? <div className={styles.queueItem}><span>04</span><div><strong>{t("teach.nomenclatureSummary")}</strong><small>{t("teach.topicsCompleted", { count: nomenclatureProgress.completedExerciseIds.length })}</small></div><i>{nomenclatureProgress.percentComplete}%</i></div> : null}
          <div className={styles.queuePolicy}><b>{t("teach.publishingRule")}</b><p>{t("teach.publishingRuleBody")}</p></div>
        </aside>
      </div>
    </section>
  );
}
