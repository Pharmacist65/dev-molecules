"use client";

import { useMemo, useState } from "react";

import { moleculeById } from "@/lib/data/catalog";
import { learningMissions } from "@/lib/data/learning-missions";
import type { MissionTask, MoleculeId } from "@/lib/domain";
import {
  useI18n,
  type TranslationKey,
  type Translator,
} from "@/lib/i18n";

import styles from "./platform.module.css";

interface MissionStudioProps {
  readonly completedMissionIds: ReadonlySet<string>;
  readonly onComplete: (missionId: string) => void;
}

const missionCopy: Readonly<Record<string, {
  readonly title: TranslationKey;
  readonly objective: TranslationKey;
  readonly prompt: TranslationKey;
}>> = {
  "mission:find-propranolol": { title: "missions.find.title", objective: "missions.find.objective", prompt: "missions.find.prompt" },
  "mission:beta-profile-classification": { title: "missions.classify.title", objective: "missions.classify.objective", prompt: "missions.classify.prompt" },
  "mission:active-moiety-versus-form": { title: "missions.forms.title", objective: "missions.forms.objective", prompt: "missions.forms.prompt" },
  "mission:evidence-boundaries": { title: "missions.boundaries.title", objective: "missions.boundaries.objective", prompt: "missions.boundaries.prompt" },
};

const groupCopy: Readonly<Record<string, TranslationKey>> = {
  "nonselective-beta": "missions.group.nonselectiveBeta",
  "beta1-selective": "missions.group.beta1Selective",
  "mixed-alpha1-beta": "missions.group.mixedAlpha1Beta",
};

function itemLabel(itemId: string, t: Translator) {
  const molecule = moleculeById.get(itemId as MoleculeId);
  if (molecule) return molecule.identity.preferredName;
  const trainingLabels: Record<string, TranslationKey> = {
    "training-claim:computed-is-experimental": "missions.item.computedExperimental",
    "training-claim:not-found-is-novel": "missions.item.notFoundNovel",
    "training-claim:computed-conformer-label": "missions.item.computedLabel",
  };
  const trainingKey = trainingLabels[itemId];
  if (trainingKey) return t(trainingKey);
  return itemId.replaceAll("-", " ");
}

function MissionTaskPlayer({
  task,
  prompt,
  onSolved,
}: {
  readonly task: MissionTask;
  readonly prompt: string;
  readonly onSolved: () => void;
}) {
  const { t } = useI18n();
  const [singleAnswer, setSingleAnswer] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [classifications, setClassifications] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, "accept" | "qualify" | "reject">>({});
  const [result, setResult] = useState<"idle" | "correct" | "retry">("idle");

  function finish(correct: boolean) {
    setResult(correct ? "correct" : "retry");
    if (correct) onSolved();
  }

  if (task.type === "single-choice") {
    return (
      <div className={styles.taskPlayer}>
        <p>{prompt}</p>
        <div className={styles.choiceGrid}>
          {task.options.map((option) => (
            <button
              key={option.id}
              type="button"
              data-selected={singleAnswer === option.id}
              onClick={() => { setSingleAnswer(option.id); setResult("idle"); }}
            >
              <span>{singleAnswer === option.id ? "●" : "○"}</span>{
                task.id === "metoprolol-form-parent"
                  ? t(option.id === "separate-form" ? "missions.forms.separate" : option.id === "same-record" ? "missions.forms.overwrite" : "missions.forms.newTarget")
                  : option.label
              }
            </button>
          ))}
        </div>
        <button className={styles.primaryButton} type="button" disabled={!singleAnswer} onClick={() => finish(singleAnswer === task.correctOptionId)}>{t("missions.checkReasoning")}</button>
        <TaskResult result={result} />
      </div>
    );
  }

  if (task.type === "ordering") {
    return (
      <div className={styles.taskPlayer}>
        <p>{prompt}</p>
        <div className={styles.orderingBoard}>
          {task.itemIds.map((itemId) => (
            <button key={itemId} type="button" disabled={ordered.includes(itemId)} onClick={() => { setOrdered([...ordered, itemId]); setResult("idle"); }}>
              <span>{ordered.includes(itemId) ? ordered.indexOf(itemId) + 1 : "+"}</span>{itemLabel(itemId, t)}
            </button>
          ))}
        </div>
        <div className={styles.taskActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => { setOrdered([]); setResult("idle"); }}>{t("missions.resetOrder")}</button>
          <button className={styles.primaryButton} type="button" disabled={ordered.length !== task.correctOrder.length} onClick={() => finish(ordered.every((itemId, index) => itemId === task.correctOrder[index]))}>{t("missions.checkSequence")}</button>
        </div>
        <TaskResult result={result} />
      </div>
    );
  }

  if (task.type === "classification") {
    const complete = task.itemIds.every((itemId) => classifications[itemId]);
    return (
      <div className={styles.taskPlayer}>
        <p>{prompt}</p>
        <div className={styles.classificationBoard}>
          {task.itemIds.map((itemId) => (
            <label key={itemId}>
              <span>{itemLabel(itemId, t)}</span>
              <select value={classifications[itemId] ?? ""} onChange={(event) => { setClassifications({ ...classifications, [itemId]: event.target.value }); setResult("idle"); }}>
                <option value="" disabled>{t("missions.chooseLens")}</option>
                {task.groups.map((group) => <option key={group.id} value={group.id}>{groupCopy[group.id] ? t(groupCopy[group.id]) : group.label}</option>)}
              </select>
            </label>
          ))}
        </div>
        <button className={styles.primaryButton} type="button" disabled={!complete} onClick={() => finish(task.itemIds.every((itemId) => classifications[itemId] === task.correctGroupByItemId[itemId]))}>{t("missions.checkClassification")}</button>
        <TaskResult result={result} />
      </div>
    );
  }

  const complete = task.claimIds.every((claimId) => verdicts[claimId]);
  return (
    <div className={styles.taskPlayer}>
      <p>{prompt}</p>
      <div className={styles.evidenceReviewBoard}>
        {task.claimIds.map((claimId) => (
          <fieldset key={claimId}>
            <legend>{itemLabel(claimId, t)}</legend>
            {(["accept", "qualify", "reject"] as const).map((verdict) => (
              <button key={verdict} type="button" data-selected={verdicts[claimId] === verdict} onClick={() => { setVerdicts({ ...verdicts, [claimId]: verdict }); setResult("idle"); }}>{t(`missions.verdict.${verdict}` as TranslationKey)}</button>
            ))}
          </fieldset>
        ))}
      </div>
      <button className={styles.primaryButton} type="button" disabled={!complete} onClick={() => finish(task.claimIds.every((claimId) => verdicts[claimId] === task.acceptableVerdicts[claimId]))}>{t("missions.checkEvidenceJudgment")}</button>
      <TaskResult result={result} />
    </div>
  );
}

function TaskResult({ result }: { readonly result: "idle" | "correct" | "retry" }) {
  const { t } = useI18n();
  if (result === "idle") return null;
  return (
    <div className={styles.taskResult} data-result={result} role="status">
      <span>{result === "correct" ? "✓" : "↺"}</span>
      {result === "correct"
        ? t("missions.resultCorrect")
        : t("missions.resultRetry")}
    </div>
  );
}

export function MissionStudio({ completedMissionIds, onComplete }: MissionStudioProps) {
  const { t } = useI18n();
  const [missionId, setMissionId] = useState(learningMissions[0]?.id ?? "");
  const mission = useMemo(
    () => learningMissions.find((candidate) => candidate.id === missionId) ?? learningMissions[0],
    [missionId],
  );

  if (!mission) return null;
  const localizedCopy = missionCopy[mission.id];

  return (
    <section className={styles.missionSection} aria-labelledby="missions-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>{t("missions.eyebrow")}</p>
          <h2 id="missions-heading">{t("missions.title")}</h2>
          <p>{t("missions.description")}</p>
        </div>
        <div className={styles.missionProgress}><strong>{completedMissionIds.size}</strong><span>/ {learningMissions.length}<br />{t("missions.progressComplete")}</span></div>
      </div>

      <div className={styles.missionGrid}>
        <aside className={styles.missionList}>
          {learningMissions.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              data-active={candidate.id === mission.id}
              onClick={() => setMissionId(candidate.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{missionCopy[candidate.id] ? t(missionCopy[candidate.id].title) : candidate.title}</strong><small>{t(`missions.level.${candidate.level}` as TranslationKey)} · {t("common.minutes", { count: candidate.estimatedMinutes })}</small></div>
              <i>{completedMissionIds.has(candidate.id) ? "✓" : "→"}</i>
            </button>
          ))}
        </aside>

        <div className={styles.missionWorkspace} key={mission.id}>
          <div className={styles.missionTopline}>
            <span>{t("missions.level", { level: t(`missions.level.${mission.level}` as TranslationKey) })}</span>
            <span>{t("status.pendingReview")}</span>
          </div>
          <h3>{localizedCopy ? t(localizedCopy.title) : mission.title}</h3>
          <p className={styles.objective}>{localizedCopy ? t(localizedCopy.objective) : mission.objective}</p>
          {mission.tasks[0] ? (
            <MissionTaskPlayer task={mission.tasks[0]} prompt={localizedCopy ? t(localizedCopy.prompt) : mission.tasks[0].prompt} onSolved={() => onComplete(mission.id)} />
          ) : null}
        </div>

        <aside className={styles.missionEvidence}>
          <span className={styles.smallLabel}>{t("missions.contract")}</span>
          <dl>
            <div><dt>{t("missions.sourceRecords")}</dt><dd>{mission.sourceIds.length}</dd></div>
            <div><dt>{t("missions.molecules")}</dt><dd>{mission.moleculeIds.length}</dd></div>
            <div><dt>{t("missions.reviewState")}</dt><dd>{t("status.pendingReview")}</dd></div>
            <div><dt>{t("missions.clinicalScore")}</dt><dd>{t("missions.neverGenerated")}</dd></div>
          </dl>
          <p>{t("missions.description")}</p>
        </aside>
      </div>
    </section>
  );
}
