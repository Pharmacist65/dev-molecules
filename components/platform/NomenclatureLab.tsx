"use client";

import { useEffect, useMemo, useState } from "react";

import {
  persistNomenclatureProgress,
  readPersistedNomenclatureProgress,
  type PersistedNomenclatureProgress,
} from "@/lib/application/nomenclature-progress";
import {
  nomenclatureExerciseByTopicId,
  nomenclatureExercises,
  nomenclatureReferenceById,
  nomenclatureTopics,
} from "@/lib/data/nomenclature-curriculum";
import {
  evaluateNomenclatureAttempt,
  nomenclatureText,
  type NomenclatureEvaluation,
  type NomenclatureExercise,
  type NomenclatureInteractionKind,
  type NomenclatureLocale,
  type NomenclatureProgressSnapshot,
} from "@/lib/domain/nomenclature";
import { createTranslator, type TranslationKey } from "@/lib/i18n";

import styles from "./NomenclatureLab.module.css";

interface NomenclatureLabProps {
  readonly locale: NomenclatureLocale;
  readonly onProgressChange?: (progress: NomenclatureProgressSnapshot) => void;
}

const interactionTranslationKeys: Readonly<
  Record<NomenclatureInteractionKind, TranslationKey>
> = {
  "parent-chain-selection": "nomenclature.interaction.parentChainSelection",
  "locant-assignment": "nomenclature.interaction.locantAssignment",
  "substituent-identification": "nomenclature.interaction.substituentIdentification",
  "suffix-functional-group-priority":
    "nomenclature.interaction.suffixFunctionalGroupPriority",
  "stereochemical-prefix": "nomenclature.interaction.stereochemicalPrefix",
  "full-name-construction": "nomenclature.interaction.fullNameConstruction",
};

const nomenclatureProgressScope = {
  topicIds: nomenclatureTopics.map((topic) => topic.id),
  exerciseIds: nomenclatureExercises.map((exercise) => exercise.id),
} as const;

function getWindowStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function responseForExercise(
  exercise: NomenclatureExercise,
  selectedOptionIds: readonly string[],
  textAnswer: string,
): string | readonly string[] {
  return exercise.responseType === "text" ? textAnswer : selectedOptionIds;
}

export function NomenclatureLab({
  locale,
  onProgressChange,
}: NomenclatureLabProps) {
  const t = createTranslator(locale);
  const [topicId, setTopicId] = useState(nomenclatureTopics[0]?.id ?? "");
  const [selectedOptionIds, setSelectedOptionIds] = useState<readonly string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<NomenclatureEvaluation | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [attempts, setAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);

  const topicIndex = Math.max(
    0,
    nomenclatureTopics.findIndex((topic) => topic.id === topicId),
  );
  const topic = nomenclatureTopics[topicIndex] ?? nomenclatureTopics[0];
  const exercise = topic ? nomenclatureExerciseByTopicId.get(topic.id) : undefined;

  const references = useMemo(
    () =>
      (exercise?.referenceIds ?? [])
        .map((referenceId) => nomenclatureReferenceById.get(referenceId))
        .filter((reference) => reference !== undefined),
    [exercise],
  );

  const orderedCompletedExerciseIds = useMemo(
    () =>
      nomenclatureExercises
        .map((candidate) => candidate.id)
        .filter((exerciseId) => completedExerciseIds.has(exerciseId)),
    [completedExerciseIds],
  );
  const percentComplete = Math.round(
    (orderedCompletedExerciseIds.length / nomenclatureExercises.length) * 100,
  );
  const persistedProgress = useMemo<PersistedNomenclatureProgress>(
    () => ({
      currentTopicId: topic?.id ?? nomenclatureTopics[0]?.id ?? "",
      completedExerciseIds: orderedCompletedExerciseIds,
      attempts,
      correctAttempts,
    }),
    [attempts, correctAttempts, orderedCompletedExerciseIds, topic?.id],
  );
  const progressSnapshot = useMemo<NomenclatureProgressSnapshot>(
    () => ({
      currentExerciseId:
        exercise?.id ?? nomenclatureExercises[0]?.id ?? "",
      completedExerciseIds: orderedCompletedExerciseIds,
      attempts,
      correctAttempts,
      percentComplete,
    }),
    [
      attempts,
      correctAttempts,
      exercise?.id,
      orderedCompletedExerciseIds,
      percentComplete,
    ],
  );

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const restored = readPersistedNomenclatureProgress(
        getWindowStorage(),
        nomenclatureProgressScope,
      );
      if (restored) {
        setTopicId(restored.currentTopicId);
        setCompletedExerciseIds(new Set(restored.completedExerciseIds));
        setAttempts(restored.attempts);
        setCorrectAttempts(restored.correctAttempts);
      }
      setHasRestoredProgress(true);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!hasRestoredProgress) return;
    persistNomenclatureProgress(
      getWindowStorage(),
      persistedProgress,
      nomenclatureProgressScope,
    );
    onProgressChange?.(progressSnapshot);
  }, [
    hasRestoredProgress,
    onProgressChange,
    persistedProgress,
    progressSnapshot,
  ]);

  if (!topic || !exercise) return null;

  const activeExercise = exercise;

  const response = responseForExercise(activeExercise, selectedOptionIds, textAnswer);
  const hasResponse = Array.isArray(response)
    ? response.length > 0
    : String(response).trim().length > 0;

  function resetAttempt() {
    setSelectedOptionIds([]);
    setTextAnswer("");
    setEvaluation(null);
    setShowHint(false);
  }

  function chooseTopic(nextTopicId: string) {
    setTopicId(nextTopicId);
    resetAttempt();
  }

  function toggleOption(optionId: string) {
    if (activeExercise.responseType === "text") return;
    setEvaluation(null);
    if (activeExercise.responseType === "single-choice") {
      setSelectedOptionIds([optionId]);
      return;
    }
    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((candidate) => candidate !== optionId)
        : [...current, optionId],
    );
  }

  function checkAnswer() {
    const result = evaluateNomenclatureAttempt(activeExercise, response, locale);
    setEvaluation(result);

    const nextAttempts = attempts + 1;
    const newlyCorrect = result.status === "correct";
    const nextCorrectAttempts = correctAttempts + (newlyCorrect ? 1 : 0);
    const nextCompleted = new Set(completedExerciseIds);
    if (newlyCorrect) nextCompleted.add(activeExercise.id);

    setAttempts(nextAttempts);
    setCorrectAttempts(nextCorrectAttempts);
    setCompletedExerciseIds(nextCompleted);
  }

  function goToNextTopic() {
    const nextIndex = (topicIndex + 1) % nomenclatureTopics.length;
    chooseTopic(nomenclatureTopics[nextIndex]?.id ?? nomenclatureTopics[0].id);
  }

  const decisionPhase = evaluation ? 3 : hasResponse ? 2 : 1;

  return (
    <section
      className={styles.lab}
      aria-labelledby="nomenclature-lab-heading"
      data-testid="nomenclature-lab"
    >
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>{t("nomenclature.eyebrow")}</p>
          <h2 id="nomenclature-lab-heading">{t("nomenclature.title")}</h2>
          <p className={styles.intro}>{t("nomenclature.description")}</p>
        </div>
        <div className={styles.scopeBadge}>
          <span aria-hidden="true">{locale === "tr" ? "EĞT" : "EDU"}</span>
          <div>
            <strong>{t("nomenclature.educationalBadge")}</strong>
            <p>{t("nomenclature.educationalBoundary")}</p>
          </div>
        </div>
      </header>

      <div className={styles.labGrid}>
        <aside className={styles.curriculum} aria-label={t("nomenclature.curriculum")}>
          <div className={styles.curriculumTopline}>
            <span>{t("nomenclature.curriculum")}</span>
            <strong>{completedExerciseIds.size}/{nomenclatureExercises.length}</strong>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={t("nomenclature.stepStatus")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentComplete}
          >
            <span style={{ width: `${percentComplete}%` }} />
          </div>
          <nav className={styles.topicList}>
            {nomenclatureTopics.map((candidate, index) => {
              const candidateExercise = nomenclatureExerciseByTopicId.get(candidate.id);
              const isComplete = candidateExercise
                ? completedExerciseIds.has(candidateExercise.id)
                : false;
              const isCurrent = candidate.id === topic.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${t("common.stepOf", { current: index + 1, total: nomenclatureTopics.length })}: ${nomenclatureText(candidate.title, locale)}${isComplete ? `, ${t("nomenclature.completedMark")}` : ""}`}
                  data-complete={isComplete}
                  data-testid={`nomenclature-topic-${index + 1}`}
                  onClick={() => chooseTopic(candidate.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{nomenclatureText(candidate.shortTitle, locale)}</strong>
                    <small>
                      {t("nomenclature.interaction")} · {candidateExercise
                        ? candidateExercise.interactionLabel
                          ? nomenclatureText(candidateExercise.interactionLabel, locale)
                          : t(interactionTranslationKeys[candidateExercise.kind])
                        : ""}
                    </small>
                  </div>
                  <i aria-hidden="true">{isComplete ? "✓" : isCurrent ? "→" : ""}</i>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className={styles.workspace}>
          <div className={styles.workspaceTopline}>
            <span>{t("common.stepOf", { current: topic.order, total: nomenclatureTopics.length })}</span>
            <span>
              {exercise.interactionLabel
                ? nomenclatureText(exercise.interactionLabel, locale)
                : t(interactionTranslationKeys[exercise.kind])}
            </span>
          </div>

          <div className={styles.phaseRail} aria-label={t("nomenclature.stepStatus")}>
            <span data-active={decisionPhase >= 1}>{t("nomenclature.phase.structure")}</span>
            <span data-active={decisionPhase >= 2}>{t("nomenclature.phase.decide")}</span>
            <span data-active={decisionPhase >= 3}>{t("nomenclature.phase.explain")}</span>
          </div>

          <article className={styles.lesson} key={exercise.id}>
            <div className={styles.lessonHeading}>
              <p>{t("nomenclature.objective")}</p>
              <h3>{nomenclatureText(topic.title, locale)}</h3>
              <span>{nomenclatureText(topic.objective, locale)}</span>
            </div>

            <div
              className={styles.formulaCard}
              role="img"
              aria-label={nomenclatureText(exercise.formulaDescription, locale)}
            >
              <small>{t("nomenclature.structureLabel")}</small>
              <pre aria-hidden="true">{exercise.formula}</pre>
            </div>

            <div className={styles.questionBlock}>
              <h4>{nomenclatureText(exercise.prompt, locale)}</h4>
              <p>{nomenclatureText(exercise.instruction, locale)}</p>

              {exercise.responseType === "text" ? (
                <label className={styles.textResponse}>
                  <span>{t("nomenclature.answerLabel")}</span>
                  <input
                    type="text"
                    value={textAnswer}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t("nomenclature.answerPlaceholder")}
                    data-testid="nomenclature-name-input"
                    onChange={(event) => {
                      setTextAnswer(event.target.value);
                      setEvaluation(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && hasResponse) checkAnswer();
                    }}
                  />
                </label>
              ) : (
                <fieldset className={styles.options}>
                  <legend className={styles.visuallyHidden}>{t("nomenclature.responseLegend")}</legend>
                  {exercise.options.map((option) => {
                    const selected = selectedOptionIds.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${nomenclatureText(option.label, locale)}${selected ? `, ${t("nomenclature.selectedMark")}` : ""}`}
                        data-selected={selected}
                        onClick={() => toggleOption(option.id)}
                      >
                        <span aria-hidden="true">{selected ? "●" : "○"}</span>
                        {nomenclatureText(option.label, locale)}
                      </button>
                    );
                  })}
                </fieldset>
              )}

              <div className={styles.answerActions}>
                <button
                  className={styles.hintButton}
                  type="button"
                  aria-expanded={showHint}
                  onClick={() => setShowHint((visible) => !visible)}
                >
                  {showHint ? t("nomenclature.hideHint") : t("nomenclature.showHint")}
                </button>
                <button
                  className={styles.checkButton}
                  type="button"
                  disabled={!hasResponse}
                  aria-label={!hasResponse ? t("nomenclature.checkingDisabled") : t("nomenclature.checkAnswer")}
                  data-testid="nomenclature-check"
                  onClick={checkAnswer}
                >
                  {t("nomenclature.checkAnswer")}
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {showHint ? (
                <div className={styles.hint} role="note">
                  <strong>{t("nomenclature.hint")}</strong>
                  <p>{nomenclatureText(exercise.hint, locale)}</p>
                </div>
              ) : null}
            </div>

            {evaluation && evaluation.status !== "incomplete" ? (
              <div
                className={styles.feedback}
                data-state={evaluation.status}
                data-testid="nomenclature-feedback"
                role="status"
                aria-live="polite"
              >
                <div className={styles.feedbackTitle}>
                  <span aria-hidden="true">{evaluation.status === "correct" ? "✓" : "!"}</span>
                  <div>
                    <strong>{evaluation.status === "correct" ? t("nomenclature.correctDecision") : t("nomenclature.notYet")}</strong>
                    <p>{evaluation.feedback}</p>
                  </div>
                </div>
                <div className={styles.reasoningGrid}>
                  <div>
                    <small>{t("nomenclature.explanation")}</small>
                    <p>{evaluation.explanation}</p>
                  </div>
                  <div>
                    <small>{t("nomenclature.misconception")}</small>
                    <p>{evaluation.misconception}</p>
                  </div>
                </div>
                <div className={styles.feedbackActions}>
                  {evaluation.status === "incorrect" ? (
                    <button type="button" onClick={resetAttempt}>{t("common.retry")}</button>
                  ) : null}
                  {evaluation.status === "correct" ? (
                    <button type="button" data-testid="nomenclature-next" onClick={goToNextTopic}>
                      {topicIndex === nomenclatureTopics.length - 1
                        ? t("nomenclature.restart")
                        : t("nomenclature.nextExercise")}
                      <span aria-hidden="true">→</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        </main>

        <aside className={styles.referencePanel}>
          <span className={styles.panelLabel}>{t("nomenclature.references")}</span>
          <p>{t("nomenclature.referencesNote")}</p>
          <div className={styles.referenceList}>
            {references.map((reference, index) => (
              <a
                key={reference.id}
                href={reference.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${nomenclatureText(reference.title, locale)} — ${t("nomenclature.opensSource")}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{nomenclatureText(reference.title, locale)}</strong>
                  <small>{nomenclatureText(reference.locator, locale)}</small>
                </div>
                <i aria-hidden="true">↗</i>
              </a>
            ))}
          </div>
          <div className={styles.progressSummary}>
            <span>{t("common.progress")}</span>
            <strong>{percentComplete}%</strong>
            <small>{t("nomenclature.completedTopics", {
              completed: completedExerciseIds.size,
              total: nomenclatureExercises.length,
            })}</small>
          </div>
        </aside>
      </div>
    </section>
  );
}

export type { NomenclatureLabProps };
