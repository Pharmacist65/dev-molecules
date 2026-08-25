"use client";

import { useState } from "react";

import type {
  FlagshipDossierContent,
  ResolvedDossierSource,
} from "@/lib/domain/dossier";

import styles from "./FlagshipDossier.module.css";

type Locale = "tr" | "en";

export interface FlagshipLearningTasksProps {
  readonly flagship: FlagshipDossierContent;
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: Locale;
  readonly presentation: "story" | "reference";
}

const copy = {
  tr: {
    eyebrow: "ÇALIŞAN ÖĞRENME GÖREVLERİ",
    title: "Kanıt sınırını uygulayarak kontrol et",
    body: "Bir seçenek belirle, yanıtını kontrol et ve kaynaklı açıklamayı oku.",
    check: "Yanıtı kontrol et",
    choose: "Önce bir seçenek belirle",
    correct: "Doğru — kanıt sınırı korundu.",
    retry: "Henüz değil — seçenekleri yeniden değerlendir.",
    explanation: "Açıklama",
    source: "Görev kaynağını aç",
    unavailable: "Kaynak denetiminden geçmiş öğrenme görevi henüz yok.",
    task: "Görev",
  },
  en: {
    eyebrow: "WORKING LEARNING TASKS",
    title: "Check your reading against the evidence boundary",
    body: "Choose an option, check your answer, and read the source-backed explanation.",
    check: "Check answer",
    choose: "Choose an option first",
    correct: "Correct — the evidence boundary is preserved.",
    retry: "Not yet — reconsider the options.",
    explanation: "Explanation",
    source: "Open task source",
    unavailable: "No source-audited learning task is available yet.",
    task: "Task",
  },
} as const;

export function FlagshipLearningTasks({
  flagship,
  sources,
  locale,
  presentation,
}: FlagshipLearningTasksProps) {
  const labels = copy[locale];
  const tasks = flagship.learning.content;
  const [selections, setSelections] = useState<Readonly<Record<number, number>>>({});
  const [checked, setChecked] = useState<Readonly<Record<number, boolean>>>({});

  return (
    <section className={styles.learning} data-flagship-learning={presentation}>
      <header className={styles.sectionHeader}>
        <span>{labels.eyebrow}</span>
        <h2>{labels.title}</h2>
        <p>{labels.body}</p>
      </header>

      {tasks.length > 0 ? (
        <div className={styles.taskGrid}>
          {tasks.map((task, taskIndex) => {
            const selectedIndex = selections[taskIndex];
            const isChecked = checked[taskIndex] === true;
            const correctIndex = task.options.findIndex(
              (option) => option.id === task.correctOptionId,
            );
            const isCorrect = selectedIndex === correctIndex;
            const primarySource = sources.find((source) => task.sourceIds.includes(source.id));

            return (
              <form
                key={`${taskIndex}:${task.prompt}`}
                className={styles.task}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (selectedIndex === undefined) return;
                  setChecked((current) => ({ ...current, [taskIndex]: true }));
                }}
              >
                <div className={styles.taskHeading}>
                  <span>{labels.task} {String(taskIndex + 1).padStart(2, "0")}</span>
                  {primarySource ? (
                    <a
                      className={styles.sourceLink}
                      href={primarySource.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${labels.source}: ${primarySource.provider} — ${primarySource.title}`}
                      title={`${primarySource.provider} — ${primarySource.title}`}
                    ><span aria-hidden="true">↗</span></a>
                  ) : null}
                </div>
                <fieldset>
                  <legend>{task.prompt}</legend>
                  {task.options.map((option, optionIndex) => (
                    <label key={`${taskIndex}:${optionIndex}`}>
                      <input
                        type="radio"
                        name={`flagship-learning-${taskIndex}`}
                        value={optionIndex}
                        checked={selectedIndex === optionIndex}
                        onChange={() => {
                          setSelections((current) => ({ ...current, [taskIndex]: optionIndex }));
                          setChecked((current) => ({ ...current, [taskIndex]: false }));
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </fieldset>
                <button type="submit" disabled={selectedIndex === undefined}>
                  {selectedIndex === undefined ? labels.choose : labels.check}
                </button>
                <div
                  className={styles.taskFeedback}
                  role="status"
                  aria-live="polite"
                  data-answer-state={!isChecked ? "idle" : isCorrect ? "correct" : "retry"}
                >
                  {isChecked ? (
                    <>
                      <strong>{isCorrect ? labels.correct : labels.retry}</strong>
                      <p><b>{labels.explanation}:</b> {task.explanation}</p>
                    </>
                  ) : null}
                </div>
              </form>
            );
          })}
        </div>
      ) : <p className={styles.compactEmpty}>{labels.unavailable}</p>}
    </section>
  );
}
