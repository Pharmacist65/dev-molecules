"use client";

import { useMemo, useState } from "react";

import { moleculeById } from "@/lib/data/catalog";
import { learningMissions } from "@/lib/data/learning-missions";
import { synthesisStories } from "@/lib/data/synthesis-stories";
import type { MissionTask, MoleculeId } from "@/lib/domain";

import styles from "./platform.module.css";

interface MissionStudioProps {
  readonly completedMissionIds: ReadonlySet<string>;
  readonly onComplete: (missionId: string) => void;
}

function itemLabel(itemId: string) {
  const molecule = moleculeById.get(itemId as MoleculeId);
  if (molecule) return molecule.identity.preferredName;
  for (const story of synthesisStories) {
    const step = story.steps.find((candidate) => candidate.id === itemId);
    if (step) return step.title;
  }
  const trainingLabels: Record<string, string> = {
    "training-claim:computed-is-experimental": "A computed conformer proves an experimental pose.",
    "training-claim:not-found-is-novel": "No database match means the structure is novel.",
    "training-claim:computed-conformer-label": "The viewer labels a computed conformer as computed.",
  };
  return trainingLabels[itemId] ?? itemId.replaceAll("-", " ");
}

function MissionTaskPlayer({
  task,
  onSolved,
}: {
  readonly task: MissionTask;
  readonly onSolved: () => void;
}) {
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
        <p>{task.prompt}</p>
        <div className={styles.choiceGrid}>
          {task.options.map((option) => (
            <button
              key={option.id}
              type="button"
              data-selected={singleAnswer === option.id}
              onClick={() => { setSingleAnswer(option.id); setResult("idle"); }}
            >
              <span>{singleAnswer === option.id ? "●" : "○"}</span>{option.label}
            </button>
          ))}
        </div>
        <button className={styles.primaryButton} type="button" disabled={!singleAnswer} onClick={() => finish(singleAnswer === task.correctOptionId)}>Check reasoning</button>
        <TaskResult result={result} />
      </div>
    );
  }

  if (task.type === "ordering") {
    return (
      <div className={styles.taskPlayer}>
        <p>{task.prompt}</p>
        <div className={styles.orderingBoard}>
          {task.itemIds.map((itemId) => (
            <button key={itemId} type="button" disabled={ordered.includes(itemId)} onClick={() => { setOrdered([...ordered, itemId]); setResult("idle"); }}>
              <span>{ordered.includes(itemId) ? ordered.indexOf(itemId) + 1 : "+"}</span>{itemLabel(itemId)}
            </button>
          ))}
        </div>
        <div className={styles.taskActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => { setOrdered([]); setResult("idle"); }}>Reset order</button>
          <button className={styles.primaryButton} type="button" disabled={ordered.length !== task.correctOrder.length} onClick={() => finish(ordered.every((itemId, index) => itemId === task.correctOrder[index]))}>Check sequence</button>
        </div>
        <TaskResult result={result} />
      </div>
    );
  }

  if (task.type === "classification") {
    const complete = task.itemIds.every((itemId) => classifications[itemId]);
    return (
      <div className={styles.taskPlayer}>
        <p>{task.prompt}</p>
        <div className={styles.classificationBoard}>
          {task.itemIds.map((itemId) => (
            <label key={itemId}>
              <span>{itemLabel(itemId)}</span>
              <select value={classifications[itemId] ?? ""} onChange={(event) => { setClassifications({ ...classifications, [itemId]: event.target.value }); setResult("idle"); }}>
                <option value="" disabled>Choose a lens</option>
                {task.groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
              </select>
            </label>
          ))}
        </div>
        <button className={styles.primaryButton} type="button" disabled={!complete} onClick={() => finish(task.itemIds.every((itemId) => classifications[itemId] === task.correctGroupByItemId[itemId]))}>Check classification</button>
        <TaskResult result={result} />
      </div>
    );
  }

  const complete = task.claimIds.every((claimId) => verdicts[claimId]);
  return (
    <div className={styles.taskPlayer}>
      <p>{task.prompt}</p>
      <div className={styles.evidenceReviewBoard}>
        {task.claimIds.map((claimId) => (
          <fieldset key={claimId}>
            <legend>{itemLabel(claimId)}</legend>
            {(["accept", "qualify", "reject"] as const).map((verdict) => (
              <button key={verdict} type="button" data-selected={verdicts[claimId] === verdict} onClick={() => { setVerdicts({ ...verdicts, [claimId]: verdict }); setResult("idle"); }}>{verdict}</button>
            ))}
          </fieldset>
        ))}
      </div>
      <button className={styles.primaryButton} type="button" disabled={!complete} onClick={() => finish(task.claimIds.every((claimId) => verdicts[claimId] === task.acceptableVerdicts[claimId]))}>Check evidence judgment</button>
      <TaskResult result={result} />
    </div>
  );
}

function TaskResult({ result }: { readonly result: "idle" | "correct" | "retry" }) {
  if (result === "idle") return null;
  return (
    <div className={styles.taskResult} data-result={result} role="status">
      <span>{result === "correct" ? "✓" : "↺"}</span>
      {result === "correct"
        ? "Correct. The evidence boundary is preserved."
        : "Not yet. Re-read the identity or evidence qualifier and try again."}
    </div>
  );
}

export function MissionStudio({ completedMissionIds, onComplete }: MissionStudioProps) {
  const [missionId, setMissionId] = useState(learningMissions[0]?.id ?? "");
  const mission = useMemo(
    () => learningMissions.find((candidate) => candidate.id === missionId) ?? learningMissions[0],
    [missionId],
  );

  if (!mission) return null;

  return (
    <section className={styles.missionSection} aria-labelledby="missions-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>LEARN / MISSION ENGINE</p>
          <h2 id="missions-heading">Five missions. One evidence-aware learning loop.</h2>
          <p>Görevler aynı domain doğrulayıcılarını kullanır; skor hiçbir zaman bilimsel hükme dönüşmez.</p>
        </div>
        <div className={styles.missionProgress}><strong>{completedMissionIds.size}</strong><span>/ {learningMissions.length}<br />complete</span></div>
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
              <div><strong>{candidate.title}</strong><small>{candidate.kind} · {candidate.estimatedMinutes} min</small></div>
              <i>{completedMissionIds.has(candidate.id) ? "✓" : "→"}</i>
            </button>
          ))}
        </aside>

        <div className={styles.missionWorkspace} key={mission.id}>
          <div className={styles.missionTopline}>
            <span>{mission.level.toUpperCase()} LEVEL</span>
            <span>{mission.verification.status}</span>
          </div>
          <h3>{mission.title}</h3>
          <p className={styles.objective}>{mission.objective}</p>
          {mission.tasks[0] ? (
            <MissionTaskPlayer task={mission.tasks[0]} onSolved={() => onComplete(mission.id)} />
          ) : null}
        </div>

        <aside className={styles.missionEvidence}>
          <span className={styles.smallLabel}>MISSION CONTRACT</span>
          <dl>
            <div><dt>Source records</dt><dd>{mission.sourceIds.length}</dd></div>
            <div><dt>Molecules</dt><dd>{mission.moleculeIds.length}</dd></div>
            <div><dt>Review state</dt><dd>{mission.verification.status}</dd></div>
            <div><dt>Clinical score</dt><dd>Never generated</dd></div>
          </dl>
          <p>{mission.verification.note}</p>
        </aside>
      </div>
    </section>
  );
}
