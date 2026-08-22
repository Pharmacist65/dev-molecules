"use client";

import { useEffect, useMemo, useState } from "react";

import {
  migrateLegacyNomenclatureProgress,
  persistAcademyProgress,
  readAcademyProgress,
  type PersistedAcademyProgress,
} from "@/lib/application/nomenclature-academy-progress";
import {
  evaluateAcademyAttempt,
  moveAcademyRankItem,
  resolveAcademyBuilderOutcome,
} from "@/lib/application/nomenclature-academy-engine";
import { readPersistedNomenclatureProgress } from "@/lib/application/nomenclature-progress";
import {
  academyExercises,
  academyExercisesBySectionId,
  academyReferenceById,
  academySections,
  academyStructureById,
} from "@/lib/data/nomenclature-academy-curriculum";
import {
  nomenclatureExercises,
  nomenclatureTopics,
} from "@/lib/data/nomenclature-curriculum";
import {
  academyText,
  type AcademyEvaluation,
  type AcademyExercise,
  type AcademyInteractionKind,
  type AcademyLocale,
} from "@/lib/domain/nomenclature-academy";
import type { NomenclatureProgressSnapshot } from "@/lib/domain/nomenclature";

import styles from "./NomenclatureAcademy.module.css";
import { NomenclatureAcademyStructure } from "./NomenclatureAcademyStructure";

interface NomenclatureAcademyProps {
  readonly locale: AcademyLocale;
  readonly onProgressChange?: (progress: NomenclatureProgressSnapshot) => void;
}

const labels = {
  tr: {
    eyebrow: "ETKİLEŞİMLİ ÖĞRENME ALANI",
    title: "İlaç Nomenklatürü Akademisi",
    intro: "Yapıya dokun, adlandırma kararını kur ve her kuralı atomlar üzerinde gör.",
    sections: "8 bölümlük öğrenme yolu",
    exercise: "Alıştırma",
    of: "/",
    concepts: "Bu bölümde",
    progress: "İlerleme",
    complete: "tamamlandı",
    structure: "2B yapı",
    structureInstruction: "Seçimler yapı üzerinde mavi görünür.",
    selected: "Seçilen yanıt",
    emptySelection: "Henüz seçim yok",
    undo: "Sonuncuyu geri al",
    clear: "Temizle",
    answer: "Yanıtın",
    answerPlaceholder: "Sistematik adı yaz",
    hint: "İpucu",
    hideHint: "İpucunu kapat",
    check: "Yanıtı kontrol et",
    retry: "Yeniden dene",
    next: "Sonraki alıştırma",
    correct: "Karar doğru",
    incorrect: "Henüz değil",
    why: "Neden?",
    rule: "İhlal edilen kural",
    steps: "Çözüm adımları",
    sources: "Kaynaklar",
    sourcesClosed: "Kaynak mevcut ↗",
    sourceNote: "Kaynak ayrıntıları öğrenme akışının dışında tutulur.",
    current: "Geçerli",
    optionalBoundary: "Kapsam notu",
    structureOptions: "2B yapı seçenekleri",
    orderInstruction: "Parçalara kullanılacak sırayla tıkla.",
    previous: "Önceki",
    decrease: "Azalt",
    increase: "Artır",
    implicitHydrogens: "Örtük hidrojen sayısı",
    bondOrder: "Bağ mertebesi",
    selectBondFirst: "Önce yapıdaki bağı seç",
    aromaticInstruction: "Aromatik atom olarak işaretlemek için atomlara dokun.",
    priorityOrder: "CIP öncelik sırası",
    moveUp: "Yukarı taşı",
    moveDown: "Aşağı taşı",
    placeLocants: "Sıradaki lokant",
    builderParent: "1 · Parent",
    builderFragment: "2 · Grup",
    builderAttachment: "3 · Bağlanma yeri",
    curatedPreview: "Kürate edilmiş sonuç önizlemesi",
    noCuratedPreview: "Bu birleşim için kürate edilmiş kayıt eşleşmesi yok; önizleme kapalı.",
    chooseStereoTarget: "Önce stereomerkezi seç, görünümü döndür ve tanımlayıcıyı ata.",
    chooseDoubleBond: "Önce C=C bağını seç, görünümü döndür ve E/Z tanımlayıcısını ata.",
    rotateView: "2B görünümü döndür",
    rotationNote: "Görünümü döndürmek yapılandırmayı değiştirmez.",
    chooseExercise: "Alıştırma seç",
  },
  en: {
    eyebrow: "INTERACTIVE LEARNING SPACE",
    title: "Pharmaceutical Nomenclature Academy",
    intro: "Touch the structure, build the naming decision, and see every rule on its atoms.",
    sections: "Eight-section learning path",
    exercise: "Exercise",
    of: "/",
    concepts: "In this section",
    progress: "Progress",
    complete: "complete",
    structure: "2D structure",
    structureInstruction: "Selections appear in blue on the structure.",
    selected: "Selected response",
    emptySelection: "Nothing selected yet",
    undo: "Undo last",
    clear: "Clear",
    answer: "Your answer",
    answerPlaceholder: "Enter the systematic name",
    hint: "Hint",
    hideHint: "Hide hint",
    check: "Check answer",
    retry: "Try again",
    next: "Next exercise",
    correct: "Decision is correct",
    incorrect: "Not yet",
    why: "Why?",
    rule: "Rule that was violated",
    steps: "Solution steps",
    sources: "Sources",
    sourcesClosed: "Source available ↗",
    sourceNote: "Source detail stays outside the learning flow.",
    current: "Current",
    optionalBoundary: "Scope note",
    structureOptions: "2D structure options",
    orderInstruction: "Click parts in the order they should be used.",
    previous: "Previous",
    decrease: "Decrease",
    increase: "Increase",
    implicitHydrogens: "Implicit hydrogen count",
    bondOrder: "Bond order",
    selectBondFirst: "Select the bond on the structure first",
    aromaticInstruction: "Touch atoms to mark them as aromatic participants.",
    priorityOrder: "CIP priority order",
    moveUp: "Move up",
    moveDown: "Move down",
    placeLocants: "Next locant",
    builderParent: "1 · Parent",
    builderFragment: "2 · Group",
    builderAttachment: "3 · Attachment site",
    curatedPreview: "Curated result preview",
    noCuratedPreview: "No curated registry match exists for this combination; preview is closed.",
    chooseStereoTarget: "Select the stereocenter, rotate the view, then assign a descriptor.",
    chooseDoubleBond: "Select the C=C bond, rotate the view, then assign E/Z.",
    rotateView: "Rotate 2D view",
    rotationNote: "Rotating the view does not change configuration.",
    chooseExercise: "Choose exercise",
  },
} as const;

const interactionLabels: Readonly<
  Record<AcademyInteractionKind, { readonly tr: string; readonly en: string }>
> = {
  "bond-identification": { tr: "Bağı tanı", en: "Identify a bond" },
  "implicit-hydrogen-count": { tr: "Örtük H say", en: "Count implicit H" },
  "valence-correction": { tr: "Değerliği düzelt", en: "Correct valence" },
  "parent-chain-selection": { tr: "Ana zinciri seç", en: "Select parent chain" },
  "parent-ring-selection": { tr: "Ana halkayı seç", en: "Select parent ring" },
  "atom-numbering": { tr: "Atomları numaralandır", en: "Number atoms" },
  "functional-group-selection": { tr: "Fonksiyonel grubu işaretle", en: "Mark a functional group" },
  "principal-group-choice": { tr: "Esas grubu seç", en: "Choose principal group" },
  "affix-selection": { tr: "Önek ve son eki seç", en: "Choose prefix and suffix" },
  "name-part-ordering": { tr: "Ad parçalarını sırala", en: "Order name parts" },
  "structure-to-name": { tr: "Yapıdan ad", en: "Structure to name" },
  "name-to-structure": { tr: "Addan yapı", en: "Name to structure" },
  "heteroatom-selection": { tr: "Heteroatomları seç", en: "Select heteroatoms" },
  "aromatic-atom-marking": { tr: "Aromatik atomları işaretle", en: "Mark aromatic atoms" },
  "heterocycle-numbering": { tr: "Heterohalkayı numaralandır", en: "Number a heterocycle" },
  "ring-system-classification": { tr: "Halka sistemini sınıflandır", en: "Classify a ring system" },
  "cip-priority-ordering": { tr: "CIP önceliği ver", en: "Order CIP priorities" },
  "stereochemistry-assignment": { tr: "R/S belirle", en: "Assign R/S" },
  "double-bond-stereochemistry": { tr: "E/Z belirle", en: "Assign E/Z" },
  "pharmaceutical-form-classification": { tr: "Tuz ve formu ayır", en: "Distinguish salt and form" },
  "name-layer-classification": { tr: "Ad katmanını ayır", en: "Classify a name layer" },
  "name-correction": { tr: "Yanlış adı düzelt", en: "Correct a name" },
  "natural-product-classification": { tr: "Doğal sınıfı tanı", en: "Recognize a natural class" },
};

const academyProgressScope = {
  exerciseIds: academyExercises.map((exercise) => exercise.id),
} as const;

const legacyProgressScope = {
  topicIds: nomenclatureTopics.map((topic) => topic.id),
  exerciseIds: nomenclatureExercises.map((exercise) => exercise.id),
} as const;

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function responseFor(exercise: AcademyExercise, ids: readonly string[], textAnswer: string) {
  return exercise.responseType === "text" ? textAnswer : ids;
}

function selectionLabel(exercise: AcademyExercise, ids: readonly string[], locale: AcademyLocale): string {
  const structure = academyStructureById.get(exercise.structureId);
  return ids
    .map((id, index) => {
      const option = exercise.options?.find((candidate) => candidate.id === id);
      if (option) return academyText(option.label, locale);
      const [prefix, value] = id.split(":");
      if (prefix === "target" && value) {
        const atomIndex = structure?.atoms?.findIndex((atom) => atom.id === value) ?? -1;
        const bondIndex = structure?.bonds?.findIndex((bond) => bond.id === value) ?? -1;
        if (atomIndex >= 0) return locale === "tr" ? `Seçili atom ${atomIndex + 1}` : `Selected atom ${atomIndex + 1}`;
        if (bondIndex >= 0) return locale === "tr" ? `Seçili bağ ${bondIndex + 1}` : `Selected bond ${bondIndex + 1}`;
      }
      if (/^\d+$/u.test(prefix) && value) {
        const atomIndex = structure?.atoms?.findIndex((atom) => atom.id === value) ?? -1;
        return locale === "tr" ? `${prefix} → atom ${atomIndex + 1}` : `${prefix} → atom ${atomIndex + 1}`;
      }
      const bondIndex = structure?.bonds?.findIndex((bond) => bond.id === prefix) ?? -1;
      if (bondIndex >= 0 && /^\d+$/u.test(value ?? "")) {
        return locale === "tr" ? `Bağ ${bondIndex + 1} · mertebe ${value}` : `Bond ${bondIndex + 1} · order ${value}`;
      }
      const atomIndex = structure?.atoms?.findIndex((atom) => atom.id === id) ?? -1;
      if (atomIndex >= 0) return locale === "tr" ? `Atom ${atomIndex + 1}` : `Atom ${atomIndex + 1}`;
      const directBondIndex = structure?.bonds?.findIndex((bond) => bond.id === id) ?? -1;
      if (directBondIndex >= 0) return locale === "tr" ? `Bağ ${directBondIndex + 1}` : `Bond ${directBondIndex + 1}`;
      return `${index + 1}`;
    })
    .join(" → ");
}

export function NomenclatureAcademy({ locale, onProgressChange }: NomenclatureAcademyProps) {
  const l = labels[locale];
  const [exerciseId, setExerciseId] = useState(academyExercises[0]?.id ?? "");
  const [responseIds, setResponseIds] = useState<readonly string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<AcademyEvaluation | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<ReadonlySet<string>>(() => new Set());
  const [attempts, setAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [restored, setRestored] = useState(false);

  const exerciseIndex = Math.max(0, academyExercises.findIndex((candidate) => candidate.id === exerciseId));
  const exercise = academyExercises[exerciseIndex] ?? academyExercises[0];
  const section = academySections.find((candidate) => candidate.id === exercise?.sectionId) ?? academySections[0];
  const structure = exercise ? academyStructureById.get(exercise.structureId) : undefined;
  const sectionExercises = section ? academyExercisesBySectionId.get(section.id) ?? [] : [];
  const sectionExerciseIndex = Math.max(0, sectionExercises.findIndex((candidate) => candidate.id === exercise?.id));
  const references = (exercise?.referenceIds ?? [])
    .map((id) => academyReferenceById.get(id))
    .filter((reference) => reference !== undefined);
  const orderedCompletedIds = useMemo(
    () => academyExercises.map((candidate) => candidate.id).filter((id) => completedExerciseIds.has(id)),
    [completedExerciseIds],
  );
  const percentComplete = Math.round((orderedCompletedIds.length / academyExercises.length) * 100);
  const priorityOrder = exercise?.responseType === "priority-ranking"
    ? (responseIds.length ? responseIds : [...(exercise.options ?? [])].map((option) => option.id).reverse())
    : [];
  const builderPreviewId = exercise?.responseType === "structure-builder"
    ? resolveAcademyBuilderOutcome(exercise, responseIds)
    : null;
  const builderPreview = builderPreviewId ? academyStructureById.get(builderPreviewId) : undefined;
  const persistedProgress = useMemo<PersistedAcademyProgress>(() => ({
    currentExerciseId: exercise?.id ?? academyExercises[0]?.id ?? "",
    completedExerciseIds: orderedCompletedIds,
    attempts,
    correctAttempts,
  }), [attempts, correctAttempts, exercise?.id, orderedCompletedIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storage = getStorage();
      const saved = readAcademyProgress(storage, academyProgressScope);
      const legacy = saved ? null : readPersistedNomenclatureProgress(storage, legacyProgressScope);
      const next = saved ?? (legacy ? migrateLegacyNomenclatureProgress(legacy, academyProgressScope) : null);
      if (next) {
        setExerciseId(next.currentExerciseId);
        setCompletedExerciseIds(new Set(next.completedExerciseIds));
        setAttempts(next.attempts);
        setCorrectAttempts(next.correctAttempts);
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!restored) return;
    persistAcademyProgress(getStorage(), persistedProgress, academyProgressScope);
    onProgressChange?.({
      currentExerciseId: persistedProgress.currentExerciseId,
      completedExerciseIds: persistedProgress.completedExerciseIds,
      attempts: persistedProgress.attempts,
      correctAttempts: persistedProgress.correctAttempts,
      percentComplete,
    });
  }, [onProgressChange, percentComplete, persistedProgress, restored]);

  if (!exercise || !section || !structure) return null;

  const response = responseFor(exercise, responseIds, textAnswer);
  const hasAnyResponse = typeof response === "string"
    ? response.trim().length > 0
    : response.length > 0;
  const requiresCompleteSequence = [
    "priority-ranking",
    "number-placement",
    "structure-builder",
    "stereo-center-assignment",
    "double-bond-assignment",
  ].includes(exercise.responseType);
  const hasResponse = requiresCompleteSequence
    ? responseIds.length === (exercise.correctIds?.length ?? 0)
    : hasAnyResponse;
  const isAtomResponse = [
    "atom-selection",
    "atom-sequence",
    "aromatic-marking",
    "number-placement",
    "stereo-center-assignment",
  ].includes(exercise.responseType);
  const isBondResponse = [
    "bond-selection",
    "bond-order-editor",
    "double-bond-assignment",
  ].includes(exercise.responseType);
  const atomLabels = exercise.responseType === "number-placement"
    ? Object.fromEntries(responseIds.map((token) => {
      const [locant, atomId] = token.split(":");
      return [atomId, locant];
    }))
    : {};
  const selectedAtomIds = exercise.responseType === "stereo-center-assignment"
    ? (selectedTargetId ? [selectedTargetId] : [])
    : responseIds.map((token) => token.includes(":") ? token.slice(token.indexOf(":") + 1) : token);
  const selectedBondIds = exercise.responseType === "double-bond-assignment" || exercise.responseType === "bond-order-editor"
    ? (selectedTargetId ? [selectedTargetId] : [])
    : responseIds;
  const bondOrderToken = exercise.responseType === "bond-order-editor" ? responseIds[0] : undefined;
  const bondOrderParts = bondOrderToken?.split(":");
  const bondOrderOverrides = bondOrderParts?.length === 2
    ? { [bondOrderParts[0]]: Number(bondOrderParts[1]) as 1 | 2 | 3 }
    : {};

  function resetResponse() {
    setResponseIds([]);
    setTextAnswer("");
    setSelectedTargetId(null);
    setRotationDegrees(0);
    setEvaluation(null);
    setShowHint(false);
  }

  function openExercise(nextExerciseId: string) {
    setExerciseId(nextExerciseId);
    resetResponse();
  }

  function selectOption(optionId: string) {
    setEvaluation(null);
    if (exercise.responseType === "multiple-choice") {
      setResponseIds((current) => current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]);
      return;
    }
    if (exercise.responseType === "ordered-parts") {
      setResponseIds((current) => current.includes(optionId) ? current : [...current, optionId]);
      return;
    }
    if (exercise.responseType === "structure-builder") {
      const selectedOption = exercise.options?.find((option) => option.id === optionId);
      if (!selectedOption?.builderRole) return;
      const roleOrder = ["parent", "fragment", "attachment"] as const;
      setResponseIds((current) => {
        const withoutRole = current.filter((id) =>
          exercise.options?.find((option) => option.id === id)?.builderRole !== selectedOption.builderRole,
        );
        const next = [...withoutRole, optionId];
        return roleOrder
          .map((role) => next.find((id) => exercise.options?.find((option) => option.id === id)?.builderRole === role))
          .filter((id): id is string => Boolean(id));
      });
      return;
    }
    if (
      exercise.responseType === "stereo-center-assignment" ||
      exercise.responseType === "double-bond-assignment"
    ) {
      setResponseIds(selectedTargetId ? [`target:${selectedTargetId}`, optionId] : [optionId]);
      return;
    }
    setResponseIds([optionId]);
  }

  function selectAtom(atomId: string) {
    setEvaluation(null);
    if (exercise.responseType === "number-placement") {
      setResponseIds((current) => {
        if (current.some((token) => token.endsWith(`:${atomId}`))) return current;
        const nextLocant = current.length + 1;
        if (nextLocant > (exercise.correctIds?.length ?? 0)) return current;
        return [...current, `${nextLocant}:${atomId}`];
      });
      return;
    }
    if (exercise.responseType === "stereo-center-assignment") {
      setSelectedTargetId(atomId);
      setResponseIds((current) => {
        const descriptor = current.find((token) => token.startsWith("descriptor:"));
        return descriptor ? [`target:${atomId}`, descriptor] : [];
      });
      return;
    }
    if (exercise.responseType === "atom-sequence") {
      setResponseIds((current) => {
        const existingIndex = current.indexOf(atomId);
        return existingIndex >= 0 ? current.slice(0, existingIndex) : [...current, atomId];
      });
      return;
    }
    setResponseIds((current) => current.includes(atomId) ? current.filter((id) => id !== atomId) : [...current, atomId]);
  }

  function selectBond(bondId: string) {
    setEvaluation(null);
    if (exercise.responseType === "bond-order-editor") {
      setSelectedTargetId(bondId);
      setResponseIds([]);
      return;
    }
    if (exercise.responseType === "double-bond-assignment") {
      setSelectedTargetId(bondId);
      setResponseIds((current) => {
        const descriptor = current.find((token) => token.startsWith("descriptor:"));
        return descriptor ? [`target:${bondId}`, descriptor] : [];
      });
      return;
    }
    setResponseIds((current) => current.includes(bondId) ? current.filter((id) => id !== bondId) : [...current, bondId]);
  }

  function setBondOrder(order: string) {
    if (!selectedTargetId) return;
    setEvaluation(null);
    setResponseIds([`${selectedTargetId}:${order}`]);
  }

  function setNumericResponse(next: number) {
    setEvaluation(null);
    setResponseIds([String(Math.min(4, Math.max(0, next)))]);
  }

  function movePriority(itemId: string, targetIndex: number) {
    setEvaluation(null);
    setResponseIds(moveAcademyRankItem(priorityOrder, itemId, targetIndex));
  }

  function checkAnswer() {
    const result = evaluateAcademyAttempt(exercise, response, locale);
    setEvaluation(result);
    if (result.status === "incomplete") return;
    setAttempts((current) => current + 1);
    if (result.status === "correct") {
      setCorrectAttempts((current) => current + 1);
      setCompletedExerciseIds((current) => new Set([...current, exercise.id]));
    }
  }

  function nextExercise() {
    const nextIndex = (exerciseIndex + 1) % academyExercises.length;
    openExercise(academyExercises[nextIndex]?.id ?? academyExercises[0].id);
  }

  return (
    <section className={styles.academy} aria-labelledby="nomenclature-academy-heading" data-testid="nomenclature-academy">
      <header className={styles.hero}>
        <div>
          <p>{l.eyebrow}</p>
          <h2 id="nomenclature-academy-heading">{l.title}</h2>
          <span>{l.intro}</span>
        </div>
        <div className={styles.heroProgress}>
          <span>{l.progress}</span>
          <strong>{percentComplete}%</strong>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentComplete}>
            <i style={{ width: `${percentComplete}%` }} />
          </div>
          <small>{orderedCompletedIds.length}/{academyExercises.length} {l.complete}</small>
        </div>
      </header>

      <div className={styles.academyLayout}>
        <aside className={styles.sectionRail} aria-label={l.sections}>
          <strong>{l.sections}</strong>
          <nav>
            {academySections.map((candidate) => {
              const candidateExercises = academyExercisesBySectionId.get(candidate.id) ?? [];
              const done = candidateExercises.filter((item) => completedExerciseIds.has(item.id)).length;
              const active = candidate.id === section.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  aria-current={active ? "step" : undefined}
                  data-testid={`academy-section-${candidate.order}`}
                  onClick={() => openExercise(candidateExercises[0]?.id ?? academyExercises[0].id)}
                >
                  <span>{String(candidate.order).padStart(2, "0")}</span>
                  <div>
                    <b>{academyText(candidate.shortTitle, locale)}</b>
                    <small>{done}/{candidateExercises.length}</small>
                  </div>
                  <i aria-hidden="true">{active ? "→" : done === candidateExercises.length ? "✓" : ""}</i>
                </button>
              );
            })}
          </nav>
          <details className={styles.conceptPanel} open>
            <summary>{l.concepts}</summary>
            <div>
              <ul>
                {section.concepts.map((concept) => <li key={academyText(concept, "en")}>{academyText(concept, locale)}</li>)}
              </ul>
              {section.scopeNote ? <p><b>{l.optionalBoundary}:</b> {academyText(section.scopeNote, locale)}</p> : null}
            </div>
          </details>
        </aside>

        <main className={styles.workspace}>
          <div className={styles.exerciseTopline}>
            <label className={styles.exercisePicker}>
              <span>{l.exercise} {exerciseIndex + 1} {l.of} {academyExercises.length}</span>
              <select aria-label={l.chooseExercise} data-testid="academy-exercise-select" value={exercise.id} onChange={(event) => openExercise(event.target.value)}>
                {academyExercises.map((candidate, index) => (
                  <option key={candidate.id} value={candidate.id}>{index + 1}. {academyText(candidate.title, locale)}</option>
                ))}
              </select>
            </label>
            <b>{academyText(interactionLabels[exercise.kind], locale)}</b>
          </div>
          <article className={styles.lesson} key={exercise.id} data-testid="academy-exercise" data-exercise-id={exercise.id} data-response-type={exercise.responseType}>
            <header className={styles.lessonHeader}>
              <div>
                <small>{String(section.order).padStart(2, "0")} · {academyText(section.title, locale)}</small>
                <h3>{academyText(exercise.title, locale)}</h3>
                <p>{academyText(section.objective, locale)}</p>
              </div>
              <span>{sectionExerciseIndex + 1}/{sectionExercises.length}</span>
            </header>

            {exercise.responseType !== "structure-choice" ? (
              <div className={styles.structureStage}>
                <div className={styles.stageLabel}><span>{l.structure}</span><small>{l.structureInstruction}</small></div>
                <NomenclatureAcademyStructure
                  structure={structure}
                  locale={locale}
                  selectedAtomIds={isAtomResponse ? selectedAtomIds : []}
                  selectedBondIds={isBondResponse ? selectedBondIds : []}
                  atomSequence={exercise.responseType === "atom-sequence" ? responseIds : []}
                  atomLabels={atomLabels}
                  bondOrderOverrides={bondOrderOverrides}
                  rotationDegrees={rotationDegrees}
                  correctRegion={evaluation ? evaluation.correctRegion : undefined}
                  onAtomSelect={isAtomResponse ? selectAtom : undefined}
                  onBondSelect={isBondResponse ? selectBond : undefined}
                />
              </div>
            ) : null}

            <div className={styles.challenge}>
              <h4>{academyText(exercise.prompt, locale)}</h4>
              <p>{academyText(exercise.instruction, locale)}</p>

              {exercise.responseType === "numeric-stepper" ? (
                <div className={styles.numericStepper} data-testid="academy-widget-numeric-stepper">
                  <span>{l.implicitHydrogens}</span>
                  <div>
                    <button type="button" aria-label={l.decrease} onClick={() => setNumericResponse(Number(responseIds[0] ?? 0) - 1)}>−</button>
                    <output aria-live="polite">{responseIds[0] ?? "—"}</output>
                    <button type="button" aria-label={l.increase} onClick={() => setNumericResponse(Number(responseIds[0] ?? 0) + 1)}>+</button>
                  </div>
                </div>
              ) : exercise.responseType === "bond-order-editor" ? (
                <fieldset className={styles.bondOrderEditor} data-testid="academy-widget-bond-order-editor">
                  <legend>{l.bondOrder}</legend>
                  {!selectedTargetId ? <p>{l.selectBondFirst}</p> : <p>{locale === "tr" ? `Seçili bağ: ${selectedTargetId}` : `Selected bond: ${selectedTargetId}`}</p>}
                  <div>
                    {exercise.options?.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={!selectedTargetId}
                        aria-pressed={responseIds.includes(`${selectedTargetId}:${option.id}`)}
                        data-selected={responseIds.includes(`${selectedTargetId}:${option.id}`)}
                        onClick={() => setBondOrder(option.id)}
                      >
                        <i aria-hidden="true" data-order={option.id} />
                        {academyText(option.label, locale)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : exercise.responseType === "aromatic-marking" ? (
                <div className={styles.directManipulationNote} data-testid="academy-widget-aromatic-marking">
                  <span aria-hidden="true">⌾</span><p>{l.aromaticInstruction}</p>
                </div>
              ) : exercise.responseType === "number-placement" ? (
                <div className={styles.locantPlacement} data-testid="academy-widget-number-placement">
                  <span>{l.placeLocants}</span>
                  <strong>{Math.min(responseIds.length + 1, exercise.correctIds?.length ?? 1)}</strong>
                  <p>{locale === "tr" ? "Bu numarayı vermek istediğin atoma dokun." : "Touch the atom that should receive this number."}</p>
                </div>
              ) : exercise.responseType === "priority-ranking" ? (
                <fieldset className={styles.priorityRanking} data-testid="academy-widget-priority-ranking">
                  <legend>{l.priorityOrder}</legend>
                  <ol>
                    {priorityOrder.map((id, index) => {
                      const option = exercise.options?.find((candidate) => candidate.id === id);
                      if (!option) return null;
                      return (
                        <li
                          key={id}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/plain", id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => { event.preventDefault(); movePriority(event.dataTransfer.getData("text/plain"), index); }}
                        >
                          <span>{index + 1}</span>
                          <b>{academyText(option.label, locale)}</b>
                          <div>
                            <button type="button" aria-label={`${l.moveUp}: ${academyText(option.label, locale)}`} disabled={index === 0} onClick={() => movePriority(id, index - 1)}>↑</button>
                            <button type="button" aria-label={`${l.moveDown}: ${academyText(option.label, locale)}`} disabled={index === priorityOrder.length - 1} onClick={() => movePriority(id, index + 1)}>↓</button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </fieldset>
              ) : exercise.responseType === "structure-builder" ? (
                <div className={styles.structureBuilder} data-testid="academy-widget-structure-builder">
                  {(["parent", "fragment", "attachment"] as const).map((role) => (
                    <fieldset key={role}>
                      <legend>{role === "parent" ? l.builderParent : role === "fragment" ? l.builderFragment : l.builderAttachment}</legend>
                      <div>
                        {exercise.options?.filter((option) => option.builderRole === role).map((option) => (
                          <button key={option.id} type="button" aria-pressed={responseIds.includes(option.id)} data-selected={responseIds.includes(option.id)} onClick={() => selectOption(option.id)}>
                            {academyText(option.label, locale)}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                  <section className={styles.builderPreview} data-status={builderPreview ? "curated-match" : "closed"}>
                    <b>{l.curatedPreview}</b>
                    {builderPreview ? <NomenclatureAcademyStructure structure={builderPreview} locale={locale} /> : <p>{l.noCuratedPreview}</p>}
                  </section>
                </div>
              ) : exercise.responseType === "stereo-center-assignment" || exercise.responseType === "double-bond-assignment" ? (
                <div className={styles.stereoWidget} data-testid={`academy-widget-${exercise.responseType}`}>
                  <p>{exercise.responseType === "stereo-center-assignment" ? l.chooseStereoTarget : l.chooseDoubleBond}</p>
                  <label>
                    <span>{l.rotateView}</span>
                    <input type="range" min={-180} max={180} step={15} value={rotationDegrees} onChange={(event) => setRotationDegrees(Number(event.target.value))} />
                    <output>{rotationDegrees}°</output>
                  </label>
                  <small>{l.rotationNote}</small>
                  <div>
                    {exercise.options?.map((option) => (
                      <button key={option.id} type="button" aria-pressed={responseIds.includes(option.id)} data-selected={responseIds.includes(option.id)} onClick={() => selectOption(option.id)}>
                        {academyText(option.label, locale)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : exercise.responseType === "text" ? (
                <label className={styles.textAnswer}>
                  <span>{l.answer}</span>
                  <input
                    value={textAnswer}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={l.answerPlaceholder}
                    data-testid="academy-text-answer"
                    onChange={(event) => { setTextAnswer(event.target.value); setEvaluation(null); }}
                    onKeyDown={(event) => { if (event.key === "Enter" && hasResponse) checkAnswer(); }}
                  />
                </label>
              ) : exercise.responseType === "structure-choice" ? (
                <fieldset className={styles.structureChoices}>
                  <legend>{l.structureOptions}</legend>
                  {exercise.options?.map((option) => {
                    const optionStructure = option.structureId ? academyStructureById.get(option.structureId) : undefined;
                    if (!optionStructure) return null;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={responseIds.includes(option.id)}
                        data-selected={responseIds.includes(option.id)}
                        data-correct={evaluation ? exercise.correctIds?.includes(option.id) : false}
                        onClick={() => selectOption(option.id)}
                      >
                        <NomenclatureAcademyStructure structure={optionStructure} locale={locale} />
                        <b>{academyText(option.label, locale)}</b>
                      </button>
                    );
                  })}
                </fieldset>
              ) : exercise.options ? (
                <fieldset className={styles.optionGrid} data-ordered={exercise.responseType === "ordered-parts"}>
                  <legend>{exercise.responseType === "ordered-parts" ? l.orderInstruction : academyText(exercise.prompt, locale)}</legend>
                  {exercise.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={responseIds.includes(option.id)}
                      data-selected={responseIds.includes(option.id)}
                      disabled={exercise.responseType === "ordered-parts" && responseIds.includes(option.id)}
                      onClick={() => selectOption(option.id)}
                    >
                      {exercise.responseType === "ordered-parts" && responseIds.includes(option.id) ? <span>{responseIds.indexOf(option.id) + 1}</span> : null}
                      {academyText(option.label, locale)}
                    </button>
                  ))}
                </fieldset>
              ) : null}

              {(isAtomResponse || isBondResponse || exercise.responseType === "ordered-parts") ? (
                <div className={styles.selectionSummary} aria-live="polite">
                  <span>{l.selected}</span>
                  <b>{responseIds.length ? selectionLabel(exercise, responseIds, locale) : l.emptySelection}</b>
                  <div>
                    {exercise.responseType === "atom-sequence" || exercise.responseType === "ordered-parts" ? (
                      <button type="button" disabled={!responseIds.length} onClick={() => { setResponseIds((current) => current.slice(0, -1)); setEvaluation(null); }}>{l.undo}</button>
                    ) : null}
                    <button type="button" disabled={!responseIds.length} onClick={() => { setResponseIds([]); setEvaluation(null); }}>{l.clear}</button>
                  </div>
                </div>
              ) : null}

              <div className={styles.challengeActions}>
                <button type="button" className={styles.hintButton} aria-expanded={showHint} onClick={() => setShowHint((current) => !current)}>{showHint ? l.hideHint : l.hint}</button>
                <button type="button" className={styles.checkButton} disabled={!hasResponse} data-testid="academy-check-answer" onClick={checkAnswer}>{l.check}<span aria-hidden="true">→</span></button>
              </div>
              {showHint ? <aside className={styles.hint}><b>{l.hint}</b><p>{academyText(exercise.hint, locale)}</p></aside> : null}
            </div>

            {evaluation && evaluation.status !== "incomplete" ? (
              <section className={styles.feedback} data-state={evaluation.status} data-testid="academy-feedback" aria-live="polite">
                <header><span aria-hidden="true">{evaluation.status === "correct" ? "✓" : "!"}</span><div><b>{evaluation.status === "correct" ? l.correct : l.incorrect}</b><p>{evaluation.feedback}</p></div></header>
                <div className={styles.feedbackBody}>
                  <article><small>{l.why}</small><p>{evaluation.explanation}</p></article>
                  <article><small>{l.rule}</small><p>{evaluation.violatedRule}</p></article>
                  <article className={styles.solutionSteps}><small>{l.steps}</small><ol>{evaluation.solutionSteps.map((step) => <li key={step}>{step}</li>)}</ol></article>
                </div>
                <footer>
                  {evaluation.status === "incorrect" ? <button type="button" onClick={resetResponse}>{l.retry}</button> : null}
                  {evaluation.status === "correct" ? <button type="button" data-testid="academy-next" onClick={nextExercise}>{l.next}<span aria-hidden="true">→</span></button> : null}
                </footer>
              </section>
            ) : null}

            <details className={styles.sources} open={showSources} onToggle={(event) => setShowSources(event.currentTarget.open)}>
              <summary>{showSources ? l.sources : l.sourcesClosed}</summary>
              <p>{l.sourceNote}</p>
              <ul>{references.map((reference) => <li key={reference.id}><a href={reference.url} target="_blank" rel="noreferrer"><b>{academyText(reference.title, locale)}</b><span>{academyText(reference.locator, locale)} ↗</span></a></li>)}</ul>
            </details>
          </article>
        </main>
      </div>
    </section>
  );
}

export type { NomenclatureAcademyProps };
