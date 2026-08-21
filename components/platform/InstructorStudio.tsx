"use client";

import { moleculeCatalog } from "@/lib/data/catalog";
import { learningMissions } from "@/lib/data/learning-missions";
import { sourceRegistry } from "@/lib/data/sources";
import { synthesisStories } from "@/lib/data/synthesis-stories";

import styles from "./platform.module.css";

export function InstructorStudio({
  completedMissionIds,
}: {
  readonly completedMissionIds: ReadonlySet<string>;
}) {
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
      scientificNotice:
        "Mission completion is an educational signal, not a clinical or scientific judgment.",
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
          <p className={styles.kicker}>TEACH / INSTRUCTOR STUDIO</p>
          <h1 id="teach-heading">See learning progress without manufacturing scientific scores.</h1>
          <p>
            Bu temel sürüm cihaz-yerel görev ilerlemesini, içerik inceleme
            durumundan ayrı gösterir. Kurum ve öğrenci verisi henüz sunucuya yazılmaz.
          </p>
        </div>
        <button className={styles.exportButton} type="button" onClick={exportProgress}>Export learner summary <span>↓</span></button>
      </div>

      <div className={styles.metricGrid}>
        <article><span>LEARNER COMPLETION</span><strong>{completion}%</strong><div><i style={{ width: `${completion}%` }} /></div><small>{completedMissionIds.size} of {learningMissions.length} missions</small></article>
        <article><span>CATALOG SEED</span><strong>{moleculeCatalog.length}</strong><p>source-linked identities</p><small>Two families; seed is not the catalog ceiling</small></article>
        <article><span>SYNTHESIS STORIES</span><strong>{synthesisStories.length}</strong><p>reviewer-ready drafts</p><small>0 currently expert-verified</small></article>
        <article><span>SOURCE REGISTRY</span><strong>{reviewedSources}/{sourceRegistry.length}</strong><p>verified source records</p><small>License and review gates remain visible</small></article>
      </div>

      <div className={styles.instructorGrid}>
        <div className={styles.assignmentPanel}>
          <div className={styles.panelHeading}><div><span className={styles.smallLabel}>COURSE PACK</span><h2>Beta-blocker structure & evidence</h2></div><span>DEVICE LOCAL</span></div>
          <div className={styles.assignmentTable} role="table" aria-label="Görev ilerlemesi">
            <div className={styles.tableHead} role="row"><span>Mission</span><span>Level</span><span>Review</span><span>Progress</span></div>
            {learningMissions.map((mission) => (
              <div key={mission.id} className={styles.tableRow} role="row">
                <span><strong>{mission.title}</strong><small>{mission.kind}</small></span>
                <span>{mission.level}</span>
                <span>{mission.verification.status}</span>
                <span data-complete={completedMissionIds.has(mission.id)}>{completedMissionIds.has(mission.id) ? "Completed" : "Not started"}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.reviewQueue}>
          <span className={styles.smallLabel}>SCIENTIFIC REVIEW QUEUE</span>
          <h2>Publication remains fail-closed</h2>
          <div className={styles.queueItem}><span>01</span><div><strong>Synthesis narratives</strong><small>Named synthetic chemistry reviewer required</small></div><i>3 pending</i></div>
          <div className={styles.queueItem}><span>02</span><div><strong>Catalog classifications</strong><small>Pharmacology sign-off required</small></div><i>{moleculeCatalog.length} pending</i></div>
          <div className={styles.queueItem}><span>03</span><div><strong>Mission wording</strong><small>Pharmacy educator review required</small></div><i>5 pending</i></div>
          <div className={styles.queuePolicy}><b>PUBLISHING RULE</b><p>Pending içerik, doğrulanmış bilimsel gerçek görünümüyle yayımlanamaz.</p></div>
        </aside>
      </div>
    </section>
  );
}
