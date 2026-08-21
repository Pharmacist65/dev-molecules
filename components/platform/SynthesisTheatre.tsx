"use client";

import { useMemo, useState } from "react";

import { betaBlockerById } from "@/lib/data/beta-blockers";
import { synthesisStories } from "@/lib/data/synthesis-stories";

import styles from "./platform.module.css";

interface SynthesisTheatreProps {
  readonly selectedMoleculeId: string;
  readonly onSelectMolecule: (moleculeId: string) => void;
}

export function SynthesisTheatre({
  selectedMoleculeId,
  onSelectMolecule,
}: SynthesisTheatreProps) {
  const matchingStory = synthesisStories.find(
    (story) => story.moleculeId === selectedMoleculeId,
  );
  const [storyId, setStoryId] = useState(
    matchingStory?.id ?? synthesisStories[0]?.id ?? "",
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const story = useMemo(
    () => synthesisStories.find((candidate) => candidate.id === storyId) ?? synthesisStories[0],
    [storyId],
  );
  const molecule = story ? betaBlockerById.get(story.moleculeId) : undefined;
  const activeStep = story?.steps[activeStepIndex];

  function chooseStory(nextStoryId: string) {
    const nextStory = synthesisStories.find((candidate) => candidate.id === nextStoryId);
    if (!nextStory) return;
    setStoryId(nextStory.id);
    setActiveStepIndex(0);
    onSelectMolecule(nextStory.moleculeId);
  }

  if (!story || !molecule || !activeStep) return null;

  return (
    <section className={styles.featureSection} aria-labelledby="synthesis-heading">
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>LEARN / SYNTHESIS THEATRE</p>
          <h1 id="synthesis-heading">Watch bonds change, not recipes unfold.</h1>
          <p>
            Atom sürekliliğini ve dönüşüm mantığını izle. Bu içerikler öğretim
            anlatısıdır; operasyonel laboratuvar protokolü değildir.
          </p>
        </div>
        <div className={styles.reviewPill} data-state="pending">
          <i /> {story.verification.status}
        </div>
      </div>

      <div className={styles.storyTabs} role="tablist" aria-label="Sentez hikâyeleri">
        {synthesisStories.map((candidate, index) => {
          const candidateMolecule = betaBlockerById.get(candidate.moleculeId);
          return (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={candidate.id === story.id}
              onClick={() => chooseStory(candidate.id)}
            >
              <span>0{index + 1}</span>
              <strong>{candidateMolecule?.identity.preferredName}</strong>
              <small>{candidate.routeType}</small>
            </button>
          );
        })}
      </div>

      <div className={styles.theatreGrid}>
        <aside className={styles.stepRail}>
          <span className={styles.smallLabel}>TRANSFORMATION SEQUENCE</span>
          {story.steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              data-active={index === activeStepIndex}
              aria-pressed={index === activeStepIndex}
              onClick={() => setActiveStepIndex(index)}
            >
              <span>{String(step.order).padStart(2, "0")}</span>
              <div><strong>{step.title}</strong><small>{step.transformationFamily}</small></div>
            </button>
          ))}
          <div className={styles.safetyNote}>
            <b>NON-OPERATIONAL</b>
            <p>{story.safety.note}</p>
          </div>
        </aside>

        <div className={styles.reactionStage}>
          <div className={styles.reactionTopline}>
            <span>STEP {activeStep.order} / {story.steps.length}</span>
            <span>ATOM MAPPING · {activeStep.atomMappingStatus}</span>
          </div>
          <div className={styles.reactionCanvas} aria-label={activeStep.changeSummary}>
            <div className={styles.fragmentCard}>
              <span className={styles.fragmentGlyph} aria-hidden="true"><i /><i /><i /></span>
              <small>INPUT REGION</small>
              <strong>{activeStep.inputLabels[0]}</strong>
            </div>
            <div className={styles.reactionArrow} aria-hidden="true">
              <span>structural change</span><i />
            </div>
            <div className={`${styles.fragmentCard} ${styles.fragmentOutput}`}>
              <span className={styles.fragmentGlyph} aria-hidden="true"><i /><i /><i /><i /></span>
              <small>OUTPUT REGION</small>
              <strong>{activeStep.outputLabel}</strong>
            </div>
          </div>
          <div className={styles.transformationCaption}>
            <span>WHAT CHANGED</span>
            <p>{activeStep.changeSummary}</p>
          </div>
        </div>

        <aside className={styles.learningPanel}>
          <span className={styles.smallLabel}>LEARNING LAYER</span>
          <h3>{activeStep.title}</h3>
          <p>{activeStep.learningRationale}</p>
          <div className={styles.misconceptionBox}>
            <span>COMMON MISCONCEPTION</span>
            <p>{activeStep.commonMisconception}</p>
          </div>
          <dl>
            <div><dt>Evidence</dt><dd>{activeStep.evidenceLevel}</dd></div>
            <div><dt>Review</dt><dd>{activeStep.verification.status}</dd></div>
            <div><dt>Sources</dt><dd>{activeStep.sourceIds.length}</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
