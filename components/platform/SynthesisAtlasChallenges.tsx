"use client";

import { useState } from "react";

import { synthesisAtlasChallenges } from "@/lib/data/synthesis-atlas-challenges";
import {
  evaluateSynthesisAtlasChallenge,
  type SynthesisAtlasChallenge,
  type SynthesisAtlasChallengeEvaluation,
  type SynthesisAtlasRouteId,
} from "@/lib/domain/synthesis-atlas";
import type { Locale } from "@/lib/i18n";

import atlas from "./SynthesisAtlas.module.css";

interface SynthesisAtlasChallengesProps {
  readonly routeId: SynthesisAtlasRouteId;
  readonly locale: Locale;
}

const copy = {
  tr: {
    eyebrow: "Kendini sına",
    title: "Dönüşümü yalnızca izleme — yeniden kur",
    challenge: "Görev",
    moveUp: "Yukarı taşı",
    moveDown: "Aşağı taşı",
    check: "Yanıtı kontrol et",
    retry: "Yeniden dene",
  },
  en: {
    eyebrow: "Challenge yourself",
    title: "Do not just watch the transformation — reconstruct it",
    challenge: "Challenge",
    moveUp: "Move up",
    moveDown: "Move down",
    check: "Check answer",
    retry: "Try again",
  },
} as const;

const initialAnswer = (challenge: SynthesisAtlasChallenge): readonly string[] =>
  challenge.kind === "order-steps" ? [...challenge.optionIds] : [];

export function SynthesisAtlasChallenges({
  routeId,
  locale,
}: SynthesisAtlasChallengesProps) {
  const labels = copy[locale];
  const challenges: readonly SynthesisAtlasChallenge[] = synthesisAtlasChallenges.filter(
    (candidate) => candidate.routeId === routeId,
  );
  const [challengeIndex, setChallengeIndex] = useState(0);
  const challenge = challenges[challengeIndex] ?? challenges[0];
  const [answerIds, setAnswerIds] = useState<readonly string[]>(
    challenge ? initialAnswer(challenge) : [],
  );
  const [evaluation, setEvaluation] = useState<SynthesisAtlasChallengeEvaluation | null>(null);

  if (!challenge) return null;

  function chooseChallenge(index: number) {
    const next = challenges[index];
    if (!next) return;
    setChallengeIndex(index);
    setAnswerIds(initialAnswer(next));
    setEvaluation(null);
  }

  function moveOption(optionId: string, delta: -1 | 1) {
    const currentIndex = answerIds.indexOf(optionId);
    const nextIndex = currentIndex + delta;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= answerIds.length) return;
    const next = [...answerIds];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    setAnswerIds(next);
    setEvaluation(null);
  }

  function reset() {
    setAnswerIds(initialAnswer(challenge));
    setEvaluation(null);
  }

  const optionById = new Map(challenge.options.map((option) => [option.id, option] as const));

  return (
    <section className={atlas.challengeLab} data-synthesis-challenges={routeId}>
      <header className={atlas.challengeHeader}>
        <div>
          <span>{labels.eyebrow}</span>
          <h2>{labels.title}</h2>
        </div>
        {challenges.length > 1 ? (
          <div className={atlas.challengeTabs} role="tablist" aria-label={labels.challenge}>
            {challenges.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={candidate.id === challenge.id}
                onClick={() => chooseChallenge(index)}
              >
                {labels.challenge} {index + 1}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className={atlas.challengeBody} data-challenge-kind={challenge.kind}>
        <p>{challenge.prompt[locale]}</p>

        {challenge.kind === "order-steps" ? (
          <ol className={atlas.orderOptions}>
            {answerIds.map((optionId, index) => {
              const option = optionById.get(optionId);
              if (!option) return null;
              return (
                <li key={option.id}>
                  <b>{index + 1}</b>
                  <span>{option.label[locale]}</span>
                  <div>
                    <button
                      type="button"
                      aria-label={`${labels.moveUp}: ${option.label[locale]}`}
                      disabled={index === 0}
                      onClick={() => moveOption(option.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`${labels.moveDown}: ${option.label[locale]}`}
                      disabled={index === answerIds.length - 1}
                      onClick={() => moveOption(option.id, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className={atlas.choiceOptions} role="radiogroup" aria-label={challenge.prompt[locale]}>
            {challenge.options.map((option) => {
              const selected = answerIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-selected={selected}
                  onClick={() => {
                    setAnswerIds([option.id]);
                    setEvaluation(null);
                  }}
                >
                  <i aria-hidden="true" />
                  {option.label[locale]}
                </button>
              );
            })}
          </div>
        )}

        <div className={atlas.challengeActions}>
          <button
            type="button"
            disabled={answerIds.length === 0}
            onClick={() => setEvaluation(evaluateSynthesisAtlasChallenge(challenge, answerIds))}
          >
            {labels.check}
          </button>
          {evaluation ? <button type="button" onClick={reset}>{labels.retry}</button> : null}
        </div>

        {evaluation ? (
          <p
            className={atlas.challengeFeedback}
            data-result={evaluation.status}
            role="status"
          >
            {evaluation.feedback[locale]}
          </p>
        ) : null}
      </div>
    </section>
  );
}
