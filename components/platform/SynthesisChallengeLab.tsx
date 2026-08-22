"use client";

import { useMemo, useState } from "react";

import { synthesisChallenges } from "@/lib/data/synthesis-challenges";
import { synthesisStories } from "@/lib/data/synthesis-stories";
import {
  evaluateSynthesisChallenge,
  type SynthesisChallenge,
  type SynthesisChallengeEvaluation,
  type SynthesisChallengeId,
  type SynthesisChallengeKind,
  type SynthesisChallengeOptionId,
} from "@/lib/domain";
import { useI18n, type TranslationKey } from "@/lib/i18n";

import challengeStyles from "./SynthesisChallengeLab.module.css";

interface SynthesisChallengeLabProps {
  readonly onStoryChange: (storyId: string) => void;
}

const kindLabelKeys: Readonly<Record<SynthesisChallengeKind, TranslationKey>> = {
  "order-steps": "synthesis.game.orderSteps",
  "choose-reaction-class": "synthesis.game.chooseReactionClass",
  "identify-formed-bond": "synthesis.game.identifyBond",
  "choose-precursor": "synthesis.game.choosePrecursor",
  "find-wrong-intermediate": "synthesis.game.findWrongIntermediate",
  "distinguish-reported-vs-ai": "synthesis.game.distinguishReported",
};

function initialAnswers(challenge: SynthesisChallenge): SynthesisChallengeOptionId[] {
  return challenge.kind === "order-steps"
    ? challenge.options.map((option) => option.id)
    : [];
}

export function SynthesisChallengeLab({ onStoryChange }: SynthesisChallengeLabProps) {
  const { locale, t } = useI18n();
  const [challengeId, setChallengeId] = useState<SynthesisChallengeId>(
    synthesisChallenges[0]?.id ?? "synthesis-challenge:unavailable",
  );
  const challenge = useMemo(
    () => synthesisChallenges.find((candidate) => candidate.id === challengeId) ?? synthesisChallenges[0],
    [challengeId],
  );
  const [answerIds, setAnswerIds] = useState<SynthesisChallengeOptionId[]>(
    challenge ? initialAnswers(challenge) : [],
  );
  const [evaluation, setEvaluation] = useState<SynthesisChallengeEvaluation | null>(null);

  if (!challenge) return null;

  function chooseChallenge(nextChallenge: SynthesisChallenge) {
    setChallengeId(nextChallenge.id);
    setAnswerIds(initialAnswers(nextChallenge));
    setEvaluation(null);
    onStoryChange(nextChallenge.storyId);
  }

  function moveOption(index: number, direction: -1 | 1) {
    setAnswerIds((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setEvaluation(null);
  }

  function submit() {
    setEvaluation(
      evaluateSynthesisChallenge(
        challenge,
        { challengeId: challenge.id, kind: challenge.kind, answerIds },
        { stories: synthesisStories },
      ),
    );
  }

  const optionsById = new Map<
    SynthesisChallengeOptionId,
    SynthesisChallenge["options"][number]
  >(challenge.options.map((option) => [option.id, option]));

  return (
    <section className={challengeStyles.lab} aria-labelledby="synthesis-challenge-heading">
      <header>
        <div>
          <span>{t("synthesis.gameTitle")}</span>
          <h2 id="synthesis-challenge-heading">{t("synthesis.gameChoose")}</h2>
        </div>
        <strong>{synthesisChallenges.length}</strong>
      </header>

      <div className={challengeStyles.kindTabs} role="tablist" aria-label={t("synthesis.gameChoose")}>
        {synthesisChallenges.map((candidate, index) => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            aria-selected={candidate.id === challenge.id}
            onClick={() => chooseChallenge(candidate)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {t(kindLabelKeys[candidate.kind])}
          </button>
        ))}
      </div>

      <div className={challengeStyles.challengeBody} data-challenge-kind={challenge.kind}>
        <div>
          <span>{t(kindLabelKeys[challenge.kind])}</span>
          <h3>{challenge.prompt[locale]}</h3>
        </div>

        {challenge.kind === "order-steps" ? (
          <ol className={challengeStyles.orderList}>
            {answerIds.map((optionId, index) => {
              const option = optionsById.get(optionId);
              if (!option) return null;
              return (
                <li key={optionId}>
                  <span>{index + 1}</span>
                  <strong>{option.label[locale]}</strong>
                  <div>
                    <button type="button" aria-label={`${t("synthesis.gameMoveUp")}: ${option.label[locale]}`} disabled={index === 0} onClick={() => moveOption(index, -1)}>↑</button>
                    <button type="button" aria-label={`${t("synthesis.gameMoveDown")}: ${option.label[locale]}`} disabled={index === answerIds.length - 1} onClick={() => moveOption(index, 1)}>↓</button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className={challengeStyles.optionGrid} role="group" aria-label={challenge.prompt[locale]}>
            {challenge.options.map((option) => (
              <button
                key={option.id}
                type="button"
                data-selected={answerIds.includes(option.id)}
                aria-pressed={answerIds.includes(option.id)}
                onClick={() => {
                  setAnswerIds([option.id]);
                  setEvaluation(null);
                }}
              >
                {option.label[locale]}
              </button>
            ))}
          </div>
        )}

        <div className={challengeStyles.actions}>
          <button type="button" disabled={answerIds.length === 0} onClick={submit}>
            {challenge.kind === "order-steps" ? t("synthesis.game.checkOrder") : t("synthesis.game.checkAnswer")}
          </button>
          {challenge.kind === "order-steps" ? (
            <button type="button" onClick={() => { setAnswerIds(initialAnswers(challenge)); setEvaluation(null); }}>
              {t("synthesis.game.resetOrder")}
            </button>
          ) : null}
        </div>

        {evaluation ? (
          <output
            className={challengeStyles.result}
            data-result={evaluation.status}
            aria-live="polite"
          >
            <strong>{t("synthesis.gameAnswered")}: {evaluation.status === "correct" ? t("common.correct") : evaluation.status === "incorrect" ? t("common.incorrect") : t("common.notAssessed")}</strong>
            <span>{evaluation.feedback[locale]}</span>
          </output>
        ) : null}
      </div>
    </section>
  );
}
