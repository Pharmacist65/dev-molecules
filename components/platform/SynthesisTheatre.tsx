"use client";

import { useMemo, useState } from "react";

import {
  getAtomMappingStatusLabel,
  getEvidenceLevelLabel,
} from "@/lib/application/synthesis-status-presentation";
import { moleculeById } from "@/lib/data/catalog";
import { synthesisStories } from "@/lib/data/synthesis-stories";
import {
  canPresentAsSourceReported,
  type MoleculeId,
  type SynthesisMaterial,
} from "@/lib/domain";
import {
  getSynthesisMaterialLabel,
  getSynthesisStepContent,
  getSynthesisStoryContent,
  useI18n,
  type TranslationKey,
} from "@/lib/i18n";

import { SmilesStructure } from "./SmilesStructure";
import { SynthesisChallengeLab } from "./SynthesisChallengeLab";
import styles from "./platform.module.css";
import theatre from "./SynthesisTheatre.module.css";

interface SynthesisTheatreProps {
  readonly selectedMoleculeId: string;
  readonly onSelectMolecule: (moleculeId: string) => void;
  readonly onOpenMoleculeFocus: (moleculeId: string) => void;
}

const routeLabelKeys: Readonly<Record<string, TranslationKey>> = {
  "literature-reported": "synthesis.route.literatureReported",
  "patent-reported": "synthesis.route.patentReported",
  "educational-simplification": "synthesis.route.teachingSimplified",
  "ai-proposed": "synthesis.route.aiProposed",
};

function getStoryMaterials(story: (typeof synthesisStories)[number]) {
  return [...story.startingMaterials, ...story.intermediates, story.finalProduct];
}

function MaterialStructure({
  material,
  storyId,
}: {
  readonly material: SynthesisMaterial;
  readonly storyId: string;
}) {
  const { locale, t } = useI18n();
  const label = getSynthesisMaterialLabel(locale, storyId, material.id) ?? material.id;

  if (material.structure.format !== "smiles") {
    return (
      <article className={theatre.structureUnavailable} role="status">
        <strong>{label}</strong>
        <span>{t("synthesis.structureUnavailable")}</span>
      </article>
    );
  }

  return (
    <SmilesStructure
      key={`${material.id}:${locale}`}
      className={theatre.structureCard}
      smiles={material.structure.value}
      label={label}
    />
  );
}

export function SynthesisTheatre({
  selectedMoleculeId,
  onSelectMolecule,
  onOpenMoleculeFocus,
}: SynthesisTheatreProps) {
  const { locale, t } = useI18n();
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
  const molecule = story ? moleculeById.get(story.moleculeId as MoleculeId) : undefined;
  const activeStep = story?.steps[activeStepIndex];
  const storyContent = story ? getSynthesisStoryContent(locale, story.id) : null;
  const activeStepContent = story && activeStep
    ? getSynthesisStepContent(locale, story.id, activeStep.id)
    : null;

  const materialById = useMemo(
    () => new Map(story ? getStoryMaterials(story).map((material) => [material.id, material]) : []),
    [story],
  );
  const inputMaterials = activeStep?.inputMaterialIds
    .map((materialId) => materialById.get(materialId))
    .filter((material): material is SynthesisMaterial => Boolean(material)) ?? [];
  const outputMaterial = activeStep?.outputMaterialId
    ? materialById.get(activeStep.outputMaterialId)
    : undefined;

  function chooseStory(nextStoryId: string) {
    const nextStory = synthesisStories.find((candidate) => candidate.id === nextStoryId);
    if (!nextStory) return;
    setStoryId(nextStory.id);
    setActiveStepIndex(0);
    onSelectMolecule(nextStory.moleculeId);
  }

  if (!story || !molecule || !activeStep || !storyContent || !activeStepContent) {
    return (
      <section className={styles.featureSection} role="alert">
        <div className={styles.featureHeader}><p>{t("common.notAvailable")}</p></div>
      </section>
    );
  }

  const sourceReported = canPresentAsSourceReported(story);
  const routeLabelKey = routeLabelKeys[story.routeType];

  return (
    <section
      className={`${styles.featureSection} ${theatre.theatre}`}
      aria-labelledby="synthesis-heading"
      data-synthesis-story={story.id}
      data-source-reported={sourceReported}
    >
      <div className={styles.featureHeader}>
        <div>
          <p className={styles.kicker}>{t("synthesis.eyebrow")}</p>
          <h1 id="synthesis-heading">{t("synthesis.title")}</h1>
          <p>{t("synthesis.description")}</p>
        </div>
        <div className={styles.reviewPill} data-state={sourceReported ? "complete" : "pending"}>
          <i aria-hidden="true" />
          {sourceReported ? t("synthesis.sourceReportedBadge") : t("common.pendingReview")}
        </div>
      </div>

      <div className={styles.storyTabs} role="tablist" aria-label={t("synthesis.storyTabsAria")}>
        {synthesisStories.map((candidate, index) => {
          const content = getSynthesisStoryContent(locale, candidate.id);
          const candidateMolecule = moleculeById.get(candidate.moleculeId as MoleculeId);
          return (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={candidate.id === story.id}
              onClick={() => chooseStory(candidate.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{candidateMolecule?.identity.preferredName}</strong>
              <small>{content?.title ?? candidate.id}</small>
            </button>
          );
        })}
      </div>

      <div className={theatre.storyIntro}>
        <div>
          <span>{t("synthesis.routeOverview")}</span>
          <h2>{storyContent.title}</h2>
          <p>{storyContent.summary}</p>
          <p>{storyContent.routeExplanation}</p>
        </div>
        <dl>
          <div><dt>{t("synthesis.routeType")}</dt><dd>{routeLabelKey ? t(routeLabelKey) : t("common.notSpecified")}</dd></div>
          <div><dt>{t("synthesis.reviewStatus")}</dt><dd>{t("synthesis.expertReviewPending")}</dd></div>
        </dl>
      </div>

      <div className={theatre.workspace}>
        <aside className={theatre.stepRail}>
          <span className={styles.smallLabel}>{t("synthesis.transformationSequence")}</span>
          {story.steps.map((step, index) => {
            const content = getSynthesisStepContent(locale, story.id, step.id);
            return (
              <button
                key={step.id}
                type="button"
                data-active={index === activeStepIndex}
                aria-pressed={index === activeStepIndex}
                onClick={() => setActiveStepIndex(index)}
              >
                <span>{String(step.order).padStart(2, "0")}</span>
                <span><strong>{content?.title ?? step.id}</strong><small>{content?.transformationFamily}</small></span>
              </button>
            );
          })}
          <div className={theatre.safetyNote}>
            <b>{t("synthesis.nonOperational")}</b>
            <p>{storyContent.safetyNote}</p>
          </div>
        </aside>

        <div className={theatre.reactionStage}>
          <div className={theatre.reactionTopline}>
            <span>{t("common.stepOf", { current: activeStep.order, total: story.steps.length })}</span>
            <span>
              {t("synthesis.atomMapping")} · {getAtomMappingStatusLabel(activeStep.atomMappingStatus, locale)}
            </span>
          </div>

          <div className={theatre.reactionCanvas} aria-label={activeStepContent.changeSummary}>
            <section aria-labelledby="synthesis-input-heading">
              <span id="synthesis-input-heading">{t("synthesis.inputStructures")}</span>
              <div className={theatre.materialGrid}>
                {inputMaterials.map((material) => (
                  <MaterialStructure key={material.id} material={material} storyId={story.id} />
                ))}
              </div>
            </section>

            <div className={theatre.reactionArrow} aria-label={t("synthesis.structuralChange")}>
              <span>{activeStepContent.transformationFamily}</span>
              <i aria-hidden="true" />
            </div>

            <section aria-labelledby="synthesis-output-heading">
              <span id="synthesis-output-heading">{t("synthesis.outputStructure")}</span>
              {outputMaterial ? (
                <MaterialStructure material={outputMaterial} storyId={story.id} />
              ) : (
                <div className={theatre.orientationFrame} role="note">
                  <strong>{t("synthesis.orientationFrame")}</strong>
                  <p>{activeStepContent.outputLabel}</p>
                </div>
              )}
            </section>
          </div>

          <div className={theatre.transformationCaption}>
            <span>{t("synthesis.whatChanged")}</span>
            <p>{activeStepContent.changeSummary}</p>
            <div className={theatre.stepNavigation}>
              <button type="button" disabled={activeStepIndex === 0} onClick={() => setActiveStepIndex((index) => Math.max(0, index - 1))}>
                {t("synthesis.previousStep")}
              </button>
              <button type="button" disabled={activeStepIndex === story.steps.length - 1} onClick={() => setActiveStepIndex((index) => Math.min(story.steps.length - 1, index + 1))}>
                {t("synthesis.nextStep")}
              </button>
            </div>
          </div>
        </div>

        <aside className={theatre.learningPanel}>
          <span className={styles.smallLabel}>{t("synthesis.learningLayer")}</span>
          <h3>{activeStepContent.title}</h3>
          <p>{activeStepContent.learningRationale}</p>
          {activeStepContent.commonMisconception ? (
            <div className={theatre.misconceptionBox}>
              <span>{t("synthesis.commonMisconception")}</span>
              <p>{activeStepContent.commonMisconception}</p>
            </div>
          ) : null}
          <dl>
            <div>
              <dt>{t("common.evidence")}</dt>
              <dd>{getEvidenceLevelLabel(activeStep.evidenceLevel, locale)}</dd>
            </div>
            <div><dt>{t("common.review")}</dt><dd>{t("synthesis.mappingDraft")}</dd></div>
            <div><dt>{t("common.sources")}</dt><dd>{activeStep.sourceIds.length}</dd></div>
          </dl>
          {Object.entries(activeStepContent.bondChanges).length > 0 ? (
            <div className={theatre.bondChanges}>
              {Object.entries(activeStepContent.bondChanges).map(([kind, description]) => (
                <p key={kind}><span>{kind}</span>{description}</p>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      <div className={theatre.productStrip}>
        <div>
          <span>{t("synthesis.finalProduct")}</span>
          <strong>{getSynthesisMaterialLabel(locale, story.id, story.finalProduct.id)}</strong>
        </div>
        <button type="button" onClick={() => onOpenMoleculeFocus(story.moleculeId)}>{t("synthesis.openFinal3d")}</button>
      </div>

      <SynthesisChallengeLab onStoryChange={chooseStory} />

      <details className={theatre.routeDetails}>
        <summary>{t("synthesis.sourcesAndDetails")}</summary>
        <div className={theatre.detailsGrid}>
          <section>
            <h3>{t("synthesis.directSource")}</h3>
            {story.primarySourceAnchors.map((anchor) => {
              const localized = storyContent.sourceAnchors[anchor.sourceId];
              return (
                <article key={anchor.sourceId}>
                  <a href={anchor.url} target="_blank" rel="noreferrer">{anchor.sourceId}</a>
                  <strong>{t("synthesis.sourceLocator")}</strong>
                  <p>{localized?.locator ?? anchor.locator}</p>
                  <strong>{t("synthesis.supportScope")}</strong>
                  <p>{localized?.supportScope ?? anchor.supportScope}</p>
                </article>
              );
            })}
          </section>
          <section>
            <h3>{t("synthesis.routeLimitations")}</h3>
            <ul>{storyContent.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
            <h3>{t("synthesis.stereochemicalOutcome")}</h3>
            <p>{storyContent.stereochemistryTeachingScope}</p>
          </section>
        </div>
      </details>
    </section>
  );
}
