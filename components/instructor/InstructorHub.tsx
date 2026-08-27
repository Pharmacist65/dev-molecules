"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  buildInstructorAssignmentSummary,
  buildInstructorTaskCatalog,
  createDeviceLocalLessonPackage,
  createInstructorProgressExport,
  serializeDeviceLocalArtifact,
  type LessonPackageBuildResult,
} from "@/lib/application/instructor-hub";
import type {
  DeviceLocalLessonPackage,
  InstructorErrorPatternSnapshot,
  InstructorProgressSnapshot,
  InstructorTaskReference,
  RoleExperienceLocale,
} from "@/lib/domain/role-experience";

import styles from "./InstructorHub.module.css";

export interface InstructorHubProps {
  readonly locale: RoleExperienceLocale;
  readonly progressSnapshot?: InstructorProgressSnapshot | null;
  readonly errorPatternSnapshot?: InstructorErrorPatternSnapshot | null;
  readonly initialTitle?: string;
  readonly initialTaskReferences?: readonly InstructorTaskReference[];
  readonly onLessonPackagePrepared?: (
    lessonPackage: DeviceLocalLessonPackage,
  ) => void;
}

const copy = {
  tr: {
    eyebrow: "EĞİTMEN ALANI · CİHAZDA ÇALIŞIR",
    title: "Kaynak sınırı belli görevlerden ders paketi hazırla.",
    description: "Nomenklatür ve sentez görevlerini seç, bu cihazdaki ilerlemeyi özetle ve taşınabilir JSON dosyaları üret. Bu yüzey bir sınıf yönetim sistemi değildir.",
    boundaryTitle: "Yerel çalışma sınırı",
    boundaryBody: "Paket bu tarayıcı oturumunda hazırlanır. Sunucuya kaydedilmez, öğrenci hesabı oluşturmaz ve öğrencilere otomatik gönderilmez.",
    packageTitle: "Ders paketi adı",
    packagePlaceholder: "Örn. Beta blokerlerde yapı ve sentez",
    taskLibrary: "Görev kütüphanesi",
    nomenclature: "Nomenklatür görevleri",
    synthesis: "Sentez görevleri",
    synthesisUnavailable: "İnceleme ve yeniden kullanım kapısını geçen yayımlanmış sentez görevi henüz yok.",
    selected: "Seçili",
    available: "Eklenebilir",
    blocked: "Kaynak kapısı kapalı",
    prepare: "Yerel ders paketini hazırla",
    prepared: "Paket hazır",
    preparedBody: "Dosya bu cihazdan indirilebilir; herhangi bir sunucu kaydı oluşturulmadı.",
    exportPackage: "Ders paketini dışa aktar",
    exportProgress: "İlerleme özetini dışa aktar",
    selectedTasks: "Seçili görev",
    completedTasks: "Tamamlanan",
    completion: "İlerleme",
    noProgress: "Bu cihazdan bir ilerleme anlık görüntüsü bağlanmadı.",
    progressBoundary: "Yalnız seçili görevler ve cihazdaki anlık görüntü hesaplanır.",
    packageCoverage: "Paket dengesi",
    nomenclatureAdded: "Nomenklatür görevi eklendi",
    nomenclatureMissing: "En az bir nomenklatür görevi ekle",
    synthesisAdded: "Sentez görevi eklendi",
    synthesisMissing: "En az bir sentez görevi ekle",
    patterns: "Hata örüntüleri",
    noPatterns: "Yanlış deneme olaylarını sağlayan yerel bir veri akışı bağlı değil; örüntü üretilmedi.",
    incorrectAttempts: "yanlış deneme",
    invalidTitle: "Paket adı en az üç karakter olmalı.",
    invalidToken: "Yerel paket kimliği oluşturulamadı.",
    invalidDate: "Cihaz tarihi doğrulanamadı.",
    emptyPackage: "Önce en az bir gerçek görev seç.",
    unknownTask: "Seçimde mevcut katalogda bulunmayan bir görev var.",
    blockedTask: "Kaynak kapısı kapalı bir görev pakete eklenemez.",
    exportUnavailable: "İlerleme dışa aktarımı için hazırlanmış paket ve cihaz içi ilerleme anlık görüntüsü gerekir.",
  },
  en: {
    eyebrow: "INSTRUCTOR SPACE · DEVICE LOCAL",
    title: "Compose a lesson package from source-bounded tasks.",
    description: "Select nomenclature and synthesis tasks, summarize progress on this device, and create portable JSON files. This surface is not a learning management system.",
    boundaryTitle: "Local workspace boundary",
    boundaryBody: "The package is composed in this browser session. It is not stored on a server, does not create learner accounts, and is not delivered to learners automatically.",
    packageTitle: "Lesson package title",
    packagePlaceholder: "For example, structure and synthesis in beta blockers",
    taskLibrary: "Task library",
    nomenclature: "Nomenclature tasks",
    synthesis: "Synthesis tasks",
    synthesisUnavailable: "No published synthesis task has passed both scientific review and the reuse-rights gate yet.",
    selected: "Selected",
    available: "Available",
    blocked: "Blocked by source gate",
    prepare: "Prepare local lesson package",
    prepared: "Package prepared",
    preparedBody: "The file can be downloaded from this device; no server record was created.",
    exportPackage: "Export lesson package",
    exportProgress: "Export progress summary",
    selectedTasks: "Selected tasks",
    completedTasks: "Completed",
    completion: "Progress",
    noProgress: "No progress snapshot from this device is connected.",
    progressBoundary: "Only selected tasks and the on-device snapshot are calculated.",
    packageCoverage: "Package balance",
    nomenclatureAdded: "Nomenclature task included",
    nomenclatureMissing: "Add at least one nomenclature task",
    synthesisAdded: "Synthesis task included",
    synthesisMissing: "Add at least one synthesis task",
    patterns: "Error patterns",
    noPatterns: "No local incorrect-attempt event feed is connected; no pattern was generated.",
    incorrectAttempts: "incorrect attempts",
    invalidTitle: "The package title must contain at least three characters.",
    invalidToken: "A local package identifier could not be created.",
    invalidDate: "The device date could not be validated.",
    emptyPackage: "Select at least one real task first.",
    unknownTask: "The selection contains a task that is not in the current catalog.",
    blockedTask: "A task blocked by its source gate cannot be added.",
    exportUnavailable: "Progress export requires a prepared package and an on-device progress snapshot.",
  },
} as const;

const referenceKey = (reference: InstructorTaskReference): string =>
  `${reference.kind}:${reference.taskId}`;

function downloadJson(filename: string, value: string) {
  const url = URL.createObjectURL(
    new Blob([value], { type: "application/json;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildErrorMessage(
  result: Exclude<LessonPackageBuildResult, { readonly ok: true }>,
  locale: RoleExperienceLocale,
): string {
  const labels = copy[locale];
  switch (result.reason) {
    case "invalid-title": return labels.invalidTitle;
    case "invalid-token": return labels.invalidToken;
    case "invalid-date": return labels.invalidDate;
    case "empty-package": return labels.emptyPackage;
    case "unknown-task": return labels.unknownTask;
    case "blocked-task": return labels.blockedTask;
  }
}

export function InstructorHub({
  locale,
  progressSnapshot = null,
  errorPatternSnapshot = null,
  initialTitle = "",
  initialTaskReferences = [],
  onLessonPackagePrepared,
}: InstructorHubProps) {
  const labels = copy[locale];
  const catalog = useMemo(() => buildInstructorTaskCatalog(locale), [locale]);
  const catalogByKey = useMemo(
    () => new Map(catalog.map((entry) => [referenceKey(entry.reference), entry])),
    [catalog],
  );
  const [activeKind, setActiveKind] = useState<InstructorTaskReference["kind"]>(
    "nomenclature",
  );
  const [title, setTitle] = useState(initialTitle);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(initialTaskReferences.map(referenceKey)),
  );
  const [preparedPackage, setPreparedPackage] = useState<DeviceLocalLessonPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedReferences = useMemo(
    () => [...selectedKeys]
      .map((key) => catalogByKey.get(key)?.reference)
      .filter((reference): reference is InstructorTaskReference => Boolean(reference)),
    [catalogByKey, selectedKeys],
  );
  const summary = buildInstructorAssignmentSummary(
    selectedReferences,
    progressSnapshot,
  );
  const visibleTasks = catalog.filter((task) => task.reference.kind === activeKind);

  function updateDraft() {
    setPreparedPackage(null);
    setError(null);
  }

  function toggleTask(reference: InstructorTaskReference) {
    const key = referenceKey(reference);
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
    updateDraft();
  }

  function preparePackage() {
    const now = new Date();
    const result = createDeviceLocalLessonPackage({
      draftToken: `${now.getTime().toString(36)}-${selectedReferences.length}`,
      title,
      locale,
      taskReferences: selectedReferences,
      createdAt: now.toISOString(),
    });
    if (!result.ok) {
      setError(buildErrorMessage(result, locale));
      return;
    }
    setError(null);
    setPreparedPackage(result.package);
    onLessonPackagePrepared?.(result.package);
  }

  function exportPackage() {
    if (!preparedPackage) return;
    downloadJson(
      "dev-molecules-local-lesson-package.json",
      serializeDeviceLocalArtifact(preparedPackage),
    );
  }

  function exportProgress() {
    if (!preparedPackage || !progressSnapshot) {
      setError(labels.exportUnavailable);
      return;
    }
    const report = createInstructorProgressExport(
      preparedPackage,
      progressSnapshot,
      locale,
      new Date().toISOString(),
    );
    if (!report) {
      setError(labels.exportUnavailable);
      return;
    }
    downloadJson(
      "dev-molecules-device-local-progress.json",
      serializeDeviceLocalArtifact(report),
    );
  }

  return (
    <section
      className={styles.hub}
      data-instructor-boundary="device-local"
      aria-labelledby="instructor-hub-title"
    >
      <header className={styles.hero}>
        <div>
          <span>{labels.eyebrow}</span>
          <h1 id="instructor-hub-title">{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
        <aside className={styles.boundary}>
          <strong>{labels.boundaryTitle}</strong>
          <p>{labels.boundaryBody}</p>
        </aside>
      </header>

      <div className={styles.workspace}>
        <section className={styles.composer} aria-labelledby="package-composer-title">
          <div className={styles.sectionHeading}>
            <div>
              <span>01</span>
              <h2 id="package-composer-title">{labels.taskLibrary}</h2>
            </div>
            <strong>{summary.selectedTaskCount} {labels.selected.toLocaleLowerCase(locale)}</strong>
          </div>

          <label className={styles.titleField}>
            <span>{labels.packageTitle}</span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                updateDraft();
              }}
              placeholder={labels.packagePlaceholder}
              maxLength={120}
            />
          </label>

          <div className={styles.tabs} role="tablist" aria-label={labels.taskLibrary}>
            <button
              type="button"
              role="tab"
              aria-selected={activeKind === "nomenclature"}
              onClick={() => setActiveKind("nomenclature")}
            >
              {labels.nomenclature}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeKind === "synthesis"}
              onClick={() => setActiveKind("synthesis")}
            >
              {labels.synthesis}
            </button>
          </div>

          <div className={styles.taskList} role="tabpanel">
            {activeKind === "synthesis" && visibleTasks.length === 0 ? (
              <p role="status" data-instructor-synthesis-tasks="withheld">
                {labels.synthesisUnavailable}
              </p>
            ) : null}
            {visibleTasks.map((task) => {
              const key = referenceKey(task.reference);
              const disabled = task.availability !== "available";
              return (
                <label
                  className={styles.task}
                  data-selected={selectedKeys.has(key)}
                  data-disabled={disabled}
                  key={key}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(key)}
                    disabled={disabled}
                    onChange={() => toggleTask(task.reference)}
                  />
                  <span className={styles.checkmark} aria-hidden="true" />
                  <span>
                    <small>{task.moduleLabel}</small>
                    <strong>{task.title}</strong>
                    <p>{task.description}</p>
                    <i>{task.contentBoundary}</i>
                  </span>
                  <b>{disabled ? labels.blocked : labels.available}</b>
                </label>
              );
            })}
          </div>

          <div className={styles.coverage} aria-label={labels.packageCoverage}>
            <span data-ready={summary.hasNomenclatureTask}>
              {summary.hasNomenclatureTask ? "✓" : "+"} {summary.hasNomenclatureTask ? labels.nomenclatureAdded : labels.nomenclatureMissing}
            </span>
            <span data-ready={summary.hasSynthesisTask}>
              {summary.hasSynthesisTask ? "✓" : "+"} {summary.hasSynthesisTask ? labels.synthesisAdded : labels.synthesisMissing}
            </span>
          </div>

          <button className={styles.primaryAction} type="button" onClick={preparePackage}>
            {labels.prepare} <span aria-hidden="true">→</span>
          </button>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </section>

        <aside className={styles.summary} aria-label={labels.completion}>
          <div className={styles.sectionHeading}>
            <div><span>02</span><h2>{labels.completion}</h2></div>
          </div>
          <dl className={styles.metrics}>
            <div><dt>{labels.selectedTasks}</dt><dd>{summary.selectedTaskCount}</dd></div>
            <div><dt>{labels.completedTasks}</dt><dd>{summary.completedTaskCount ?? "—"}</dd></div>
            <div><dt>{labels.completion}</dt><dd>{summary.completionPercent === null ? "—" : `${summary.completionPercent}%`}</dd></div>
          </dl>
          {summary.completionPercent === null ? (
            <p className={styles.emptyState}>{labels.noProgress}</p>
          ) : (
            <div className={styles.progress}>
              <span style={{ width: `${summary.completionPercent}%` }} />
            </div>
          )}
          <small className={styles.boundaryNote}>{labels.progressBoundary}</small>

          <div className={styles.patterns}>
            <h3>{labels.patterns}</h3>
            {errorPatternSnapshot && errorPatternSnapshot.patterns.length > 0 ? (
              <ul>
                {errorPatternSnapshot.patterns.map((pattern) => (
                  <li key={referenceKey(pattern.taskReference)}>
                    <span>{pattern.localizedLabel[locale]}</span>
                    <strong>{pattern.incorrectAttemptCount} {labels.incorrectAttempts}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{labels.noPatterns}</p>
            )}
          </div>

          {preparedPackage ? (
            <div className={styles.prepared} role="status">
              <strong>{labels.prepared}</strong>
              <p>{labels.preparedBody}</p>
            </div>
          ) : null}
          <div className={styles.exports}>
            <button type="button" onClick={exportPackage} disabled={!preparedPackage}>
              {labels.exportPackage} <span aria-hidden="true">↓</span>
            </button>
            <button
              type="button"
              onClick={exportProgress}
              disabled={!preparedPackage || !progressSnapshot}
              title={!progressSnapshot ? labels.exportUnavailable : undefined}
            >
              {labels.exportProgress} <span aria-hidden="true">↓</span>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
