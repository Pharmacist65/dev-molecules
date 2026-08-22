"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getReviewerConsoleBootState,
  resolveReviewerAuthorization,
  validateReviewerAction,
  validateScientificReviewRecord,
} from "@/lib/application/reviewer-console";
import { localizeScientificTerm } from "@/lib/application/role-presentation";
import type {
  ReviewerAction,
  ReviewerConsoleReadiness,
  RoleExperienceLocale,
  ScientificReviewerAdapter,
  ScientificReviewRecord,
} from "@/lib/domain/role-experience";

import styles from "./ReviewerConsole.module.css";

export interface ReviewerConsoleProps {
  readonly locale: RoleExperienceLocale;
  /** Omit in public/static builds: the console then stays fail-closed. */
  readonly adapter?: ScientificReviewerAdapter | null;
  readonly onExit?: () => void;
}

const copy = {
  tr: {
    eyebrow: "BİLİMSEL REVIEWER CONSOLE · AYRI YETKİ ALANI",
    title: "Kanıt kaydını, kaynağı ve karar izini birlikte incele.",
    description: "Bu alan öğrenci ve eğitmen görünümlerinden ayrıdır. Kimliği doğrulanmış, yetkili bir reviewer adaptörü olmadan hiçbir kayıt okunmaz veya değiştirilmez.",
    exit: "Güvenli alandan çık",
    authorizing: "Reviewer yetkisi doğrulanıyor…",
    locked: "Reviewer Console kilitli",
    adapterMissing: "Bu public/statik host, kimlik doğrulama ve audit destekli bir reviewer adaptörü sağlamıyor.",
    unauthenticated: "Reviewer oturumu doğrulanamadı.",
    forbidden: "Oturum doğrulandı ancak bilimsel reviewer yetkisi bulunmuyor.",
    unavailable: "Yetkilendirme veya reviewer veri hizmeti şu anda güvenli biçimde kullanılamıyor.",
    invalidAuth: "Reviewer yetki kaydı eksik, süresi geçmiş veya gerekli okuma kapsamını taşımıyor.",
    noFallback: "Eğitmen rolü, yerel ayar veya public route bu kapıyı açamaz.",
    queue: "İnceleme kuyruğu",
    records: "kayıt",
    noRecords: "Yetkili adaptör incelenecek kayıt döndürmedi.",
    provenance: "Provenance ve kaynak konumu",
    claim: "Bilimsel iddia",
    subject: "Konu",
    reviewState: "İnceleme durumu",
    evidenceLevel: "Kanıt düzeyi",
    provider: "Sağlayıcı",
    locator: "Kaynak konumu",
    version: "Sürüm",
    hash: "İçerik özeti",
    retrieved: "Alınma zamanı",
    openSource: "Kaynak belgeyi aç",
    rawRecord: "Ham kayıt",
    rawBoundary: "Ham kayıt yalnız bu yetkili alanda gösterilir.",
    recordInvalid: "Bu kayıt provenance sözleşmesini geçmedi. Karar ve düzeltme araçları kapalı tutuldu.",
    conflict: "Çakışma notu",
    noConflict: "Kayıtlı çakışma notu yok.",
    decisions: "İnceleme kararı",
    rationale: "Karar gerekçesi",
    rationalePlaceholder: "Kaynak konumunu ve kararın bilimsel gerekçesini yaz…",
    promote: "Yükselt",
    demote: "Düşür",
    markConflict: "Çelişkili işaretle",
    correction: "Düzeltme önerisi",
    correctionPlaceholder: "Kaynakla desteklenen yeni iddia metni…",
    submitCorrection: "Düzeltmeyi gönder",
    submitting: "Audit kaydı bekleniyor…",
    actionInvalid: "Karar gönderilmedi: yetki, sürüm/hash eşleşmesi, gerekçe veya kayıt bütünlüğü kapısı geçilmedi.",
    accepted: "İşlem adaptör tarafından kabul edildi ve audit kimliği döndü.",
    rejected: "İşlem adaptör tarafından reddedildi; bilimsel durum değiştirilmedi.",
    auditId: "Audit kimliği",
    actor: "Yetkili reviewer",
    expires: "Yetki bitişi",
  },
  en: {
    eyebrow: "SCIENTIFIC REVIEWER CONSOLE · SEPARATE ACCESS DOMAIN",
    title: "Inspect the evidence record, source, and decision trail together.",
    description: "This space is separate from student and instructor views. No record is read or changed without an authenticated, authorized reviewer adapter.",
    exit: "Exit secure space",
    authorizing: "Verifying reviewer authorization…",
    locked: "Reviewer Console locked",
    adapterMissing: "This public/static host does not provide an authentication- and audit-backed reviewer adapter.",
    unauthenticated: "The reviewer session could not be authenticated.",
    forbidden: "The session is authenticated but lacks scientific reviewer authorization.",
    unavailable: "Authorization or reviewer data service is not safely available now.",
    invalidAuth: "The reviewer authorization is incomplete, expired, or lacks the required read scope.",
    noFallback: "An instructor role, local setting, or public route cannot open this gate.",
    queue: "Review queue",
    records: "records",
    noRecords: "The authorized adapter returned no records to review.",
    provenance: "Provenance and source locator",
    claim: "Scientific claim",
    subject: "Subject",
    reviewState: "Review state",
    evidenceLevel: "Evidence level",
    provider: "Provider",
    locator: "Source locator",
    version: "Version",
    hash: "Content hash",
    retrieved: "Retrieved at",
    openSource: "Open source document",
    rawRecord: "Raw record",
    rawBoundary: "The raw record is displayed only inside this authorized space.",
    recordInvalid: "This record failed the provenance contract. Decision and correction tools remain disabled.",
    conflict: "Conflict note",
    noConflict: "No conflict note is recorded.",
    decisions: "Review decision",
    rationale: "Decision rationale",
    rationalePlaceholder: "State the source locator and scientific rationale for the decision…",
    promote: "Promote",
    demote: "Demote",
    markConflict: "Mark conflicting",
    correction: "Correction proposal",
    correctionPlaceholder: "New source-supported claim text…",
    submitCorrection: "Submit correction",
    submitting: "Waiting for audit receipt…",
    actionInvalid: "Decision not submitted: authorization, version/hash match, rationale, or record-integrity gate did not pass.",
    accepted: "The adapter accepted the action and returned an audit identifier.",
    rejected: "The adapter rejected the action; scientific state was not changed.",
    auditId: "Audit ID",
    actor: "Authorized reviewer",
    expires: "Authorization expires",
  },
} as const;

function lockedReason(
  readiness: Extract<ReviewerConsoleReadiness, { readonly status: "locked" }>,
  locale: RoleExperienceLocale,
): string {
  const labels = copy[locale];
  switch (readiness.reason) {
    case "adapter-missing": return labels.adapterMissing;
    case "unauthenticated": return labels.unauthenticated;
    case "forbidden": return labels.forbidden;
    case "adapter-unavailable": return labels.unavailable;
    case "authorization-invalid": return labels.invalidAuth;
  }
}

const getRecordStatusLabel = (
  record: ScientificReviewRecord,
  locale: RoleExperienceLocale,
): string => localizeScientificTerm(
  { kind: "verification", value: record.verificationStatus },
  locale,
);

const emptyReviewRecords: readonly ScientificReviewRecord[] = [];

export function ReviewerConsole({
  locale,
  adapter = null,
  onExit,
}: ReviewerConsoleProps) {
  const labels = copy[locale];
  const adapterRequest = useMemo(
    () => ({ adapter, token: Symbol("reviewer-adapter-request") }),
    [adapter],
  );
  const [session, setSession] = useState<{
    readonly token: symbol;
    readonly readiness: ReviewerConsoleReadiness;
    readonly records: readonly ScientificReviewRecord[];
    readonly selectedRecordId: string | null;
  }>(() => ({
    token: adapterRequest.token,
    readiness: getReviewerConsoleBootState(adapter),
    records: [],
    selectedRecordId: null,
  }));
  type SubmissionState =
    | { readonly status: "idle" }
    | { readonly status: "submitting" }
    | { readonly status: "invalid" }
    | { readonly status: "accepted" | "rejected"; readonly auditId: string | null };
  const [form, setForm] = useState<{
    readonly token: symbol;
    readonly recordId: string | null;
    readonly rationale: string;
    readonly replacementStatement: string;
    readonly submissionState: SubmissionState;
  }>(() => ({
    token: adapterRequest.token,
    recordId: null,
    rationale: "",
    replacementStatement: "",
    submissionState: { status: "idle" },
  }));
  const sessionIsCurrent = session.token === adapterRequest.token;
  const readiness = sessionIsCurrent
    ? session.readiness
    : getReviewerConsoleBootState(adapter);
  const records = sessionIsCurrent ? session.records : emptyReviewRecords;
  const selectedRecordId = sessionIsCurrent ? session.selectedRecordId : null;

  useEffect(() => {
    const controller = new AbortController();
    if (!adapter) {
      return () => controller.abort();
    }

    void (async () => {
      try {
        const authorization = await adapter.authorize(controller.signal);
        const resolved = resolveReviewerAuthorization(authorization);
        if (controller.signal.aborted) return;
        if (resolved.status !== "ready") {
          setSession({
            token: adapterRequest.token,
            readiness: resolved,
            records: [],
            selectedRecordId: null,
          });
          return;
        }
        const nextRecords = await adapter.listReviewRecords(controller.signal);
        if (controller.signal.aborted) return;
        setSession({
          token: adapterRequest.token,
          readiness: resolved,
          records: nextRecords,
          selectedRecordId: nextRecords[0]?.recordId ?? null,
        });
      } catch {
        if (controller.signal.aborted) return;
        setSession({
          token: adapterRequest.token,
          readiness: { status: "locked", reason: "adapter-unavailable" },
          records: [],
          selectedRecordId: null,
        });
      }
    })();

    return () => controller.abort();
  }, [adapter, adapterRequest.token]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.recordId === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );
  const selectedRecordIssues = selectedRecord
    ? validateScientificReviewRecord(selectedRecord)
    : [];
  const formIsCurrent = form.token === adapterRequest.token &&
    form.recordId === selectedRecordId;
  const rationale = formIsCurrent ? form.rationale : "";
  const replacementStatement = formIsCurrent
    ? form.replacementStatement
    : (selectedRecord?.statement ?? "");
  const submissionState: SubmissionState = formIsCurrent
    ? form.submissionState
    : { status: "idle" };

  function updateForm(
    update: Partial<{
      readonly rationale: string;
      readonly replacementStatement: string;
      readonly submissionState: SubmissionState;
    }>,
  ) {
    setForm({
      token: adapterRequest.token,
      recordId: selectedRecordId,
      rationale,
      replacementStatement,
      submissionState,
      ...update,
    });
  }

  function selectRecord(record: ScientificReviewRecord) {
    setSession({
      token: adapterRequest.token,
      readiness,
      records,
      selectedRecordId: record.recordId,
    });
    setForm({
      token: adapterRequest.token,
      recordId: record.recordId,
      rationale: "",
      replacementStatement: record.statement,
      submissionState: { status: "idle" },
    });
  }

  async function submit(kind: ReviewerAction["kind"]) {
    if (!adapter || !selectedRecord || readiness.status !== "ready") return;
    const common = {
      recordId: selectedRecord.recordId,
      expectedVersion: selectedRecord.source.version,
      expectedHash: selectedRecord.source.contentHash,
      rationale,
    } as const;
    const action: ReviewerAction = kind === "correction"
      ? { kind, ...common, replacementStatement }
      : { kind, ...common };
    if (validateReviewerAction(readiness, selectedRecord, action).length > 0) {
      updateForm({ submissionState: { status: "invalid" } });
      return;
    }

    updateForm({ submissionState: { status: "submitting" } });
    try {
      const receipt = await adapter.submitAction(action);
      updateForm({
        submissionState: {
          status: receipt.accepted ? "accepted" : "rejected",
          auditId: receipt.auditId,
        },
      });
    } catch {
      updateForm({ submissionState: { status: "rejected", auditId: null } });
    }
  }

  if (readiness.status !== "ready") {
    return (
      <section
        className={styles.gate}
        data-reviewer-boundary="fail-closed"
        aria-labelledby="reviewer-gate-title"
      >
        <span>{labels.eyebrow}</span>
        <h1 id="reviewer-gate-title">
          {readiness.status === "authorizing" ? labels.authorizing : labels.locked}
        </h1>
        <p>{readiness.status === "locked" ? lockedReason(readiness, locale) : labels.description}</p>
        <aside>{labels.noFallback}</aside>
        {onExit ? <button type="button" onClick={onExit}>{labels.exit}</button> : null}
      </section>
    );
  }

  return (
    <section
      className={styles.console}
      data-reviewer-boundary="authorized-adapter"
      aria-labelledby="reviewer-console-title"
    >
      <header className={styles.hero}>
        <div>
          <span>{labels.eyebrow}</span>
          <h1 id="reviewer-console-title">{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
        <dl>
          <div><dt>{labels.actor}</dt><dd>{readiness.actorId}</dd></div>
          <div><dt>{labels.expires}</dt><dd>{readiness.expiresAt}</dd></div>
        </dl>
        {onExit ? <button type="button" onClick={onExit}>{labels.exit}</button> : null}
      </header>

      <div className={styles.workspace}>
        <aside className={styles.queue}>
          <header><span>{labels.queue}</span><strong>{records.length} {labels.records}</strong></header>
          {records.length === 0 ? <p>{labels.noRecords}</p> : (
            <ol>
              {records.map((record, index) => (
                <li key={record.recordId}>
                  <button
                    type="button"
                    data-active={record.recordId === selectedRecordId}
                    onClick={() => selectRecord(record)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{record.subjectLabel}</strong>
                    <small>{getRecordStatusLabel(record, locale)}</small>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>

        {selectedRecord ? (
          <main className={styles.record}>
            <section className={styles.claim}>
              <span>{labels.claim}</span>
              <h2>{selectedRecord.statement}</h2>
              <dl className={styles.claimMeta}>
                <div><dt>{labels.subject}</dt><dd>{selectedRecord.subjectLabel}</dd></div>
                <div>
                  <dt>{labels.reviewState}</dt>
                  <dd>{getRecordStatusLabel(selectedRecord, locale)} <code>{selectedRecord.verificationStatus}</code></dd>
                </div>
                <div>
                  <dt>{labels.evidenceLevel}</dt>
                  <dd>{localizeScientificTerm({ kind: "evidence", value: selectedRecord.evidenceLevel }, locale)} <code>{selectedRecord.evidenceLevel}</code></dd>
                </div>
              </dl>
              {selectedRecord.conflictNote ? (
                <aside><strong>{labels.conflict}</strong><p>{selectedRecord.conflictNote}</p></aside>
              ) : <aside><strong>{labels.conflict}</strong><p>{labels.noConflict}</p></aside>}
            </section>

            <section className={styles.provenance}>
              <header><span>01</span><h3>{labels.provenance}</h3></header>
              <dl>
                <div><dt>{labels.provider}</dt><dd>{selectedRecord.source.provider}</dd></div>
                <div><dt>{labels.locator}</dt><dd>{selectedRecord.source.locator}</dd></div>
                <div><dt>{labels.version}</dt><dd><code>{selectedRecord.source.version}</code></dd></div>
                <div><dt>{labels.hash}</dt><dd><code>{selectedRecord.source.contentHash}</code></dd></div>
                <div><dt>{labels.retrieved}</dt><dd>{selectedRecord.source.retrievedAt}</dd></div>
              </dl>
              <a href={selectedRecord.source.url} target="_blank" rel="noreferrer">
                {labels.openSource} <span aria-hidden="true">↗</span>
              </a>
            </section>

            <details className={styles.rawRecord}>
              <summary><span>02</span> {labels.rawRecord}</summary>
              <p>{labels.rawBoundary}</p>
              <pre>{JSON.stringify(selectedRecord.rawRecord, null, 2)}</pre>
            </details>

            <section className={styles.tools} data-record-valid={selectedRecordIssues.length === 0}>
              <header><span>03</span><h3>{labels.decisions}</h3></header>
              {selectedRecordIssues.length > 0 ? <p role="alert">{labels.recordInvalid}</p> : null}
              <label>
                <span>{labels.rationale}</span>
                <textarea
                  value={rationale}
                  onChange={(event) => updateForm({ rationale: event.target.value })}
                  placeholder={labels.rationalePlaceholder}
                  rows={4}
                />
              </label>
              <div className={styles.decisions}>
                <button type="button" onClick={() => void submit("promote")} disabled={selectedRecordIssues.length > 0 || submissionState.status === "submitting"}>{labels.promote}</button>
                <button type="button" onClick={() => void submit("demote")} disabled={selectedRecordIssues.length > 0 || submissionState.status === "submitting"}>{labels.demote}</button>
                <button type="button" onClick={() => void submit("mark-conflict")} disabled={selectedRecordIssues.length > 0 || submissionState.status === "submitting"}>{labels.markConflict}</button>
              </div>
              <label>
                <span>{labels.correction}</span>
                <textarea
                  value={replacementStatement}
                  onChange={(event) => updateForm({
                    replacementStatement: event.target.value,
                  })}
                  placeholder={labels.correctionPlaceholder}
                  rows={4}
                />
              </label>
              <button className={styles.correctionAction} type="button" onClick={() => void submit("correction")} disabled={selectedRecordIssues.length > 0 || submissionState.status === "submitting"}>{labels.submitCorrection}</button>
              {submissionState.status !== "idle" ? (
                <div className={styles.receipt} role="status" data-status={submissionState.status}>
                  {submissionState.status === "submitting" ? labels.submitting : null}
                  {submissionState.status === "invalid" ? labels.actionInvalid : null}
                  {submissionState.status === "accepted" ? labels.accepted : null}
                  {submissionState.status === "rejected" ? labels.rejected : null}
                  {"auditId" in submissionState && submissionState.auditId ? (
                    <small>{labels.auditId}: <code>{submissionState.auditId}</code></small>
                  ) : null}
                </div>
              ) : null}
            </section>
          </main>
        ) : <main className={styles.record}><p className={styles.noRecords}>{labels.noRecords}</p></main>}
      </div>
    </section>
  );
}
