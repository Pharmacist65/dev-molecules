import type {
  ReviewerAction,
  ReviewerAuthorizationResult,
  ReviewerConsoleReadiness,
  ReviewerScope,
  ScientificReviewerAdapter,
  ScientificReviewRecord,
} from "../domain/role-experience";

const verificationStatuses = new Set([
  "verified",
  "expert-reviewed",
  "source-supported",
  "pending-review",
  "predicted",
  "conflicting",
  "unknown",
]);

const evidenceLevels = new Set([
  "direct-experimental",
  "regulatory",
  "curated-database",
  "literature-reported",
  "analog-supported",
  "computed",
  "model-predicted",
  "educational-simplification",
  "no-evidence",
]);

const reviewerScopes = new Set<ReviewerScope>([
  "scientific-review:read",
  "scientific-review:decide",
  "scientific-review:correct",
]);

export const getReviewerConsoleBootState = (
  adapter: ScientificReviewerAdapter | null | undefined,
): ReviewerConsoleReadiness => adapter
  ? { status: "authorizing" }
  : { status: "locked", reason: "adapter-missing" };

export function resolveReviewerAuthorization(
  result: ReviewerAuthorizationResult,
  now = new Date(),
): ReviewerConsoleReadiness {
  if (result.status === "unauthenticated") {
    return { status: "locked", reason: "unauthenticated" };
  }
  if (result.status === "forbidden") {
    return { status: "locked", reason: "forbidden" };
  }
  if (result.status === "unavailable") {
    return { status: "locked", reason: "adapter-unavailable" };
  }

  const expiresAt = Date.parse(result.expiresAt);
  const scopeIsValid = result.scope.length > 0 && result.scope.every(
    (scope) => reviewerScopes.has(scope),
  );
  if (
    result.role !== "scientific-reviewer" ||
    result.actorId.trim().length === 0 ||
    !scopeIsValid ||
    !result.scope.includes("scientific-review:read") ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now.getTime()
  ) {
    return { status: "locked", reason: "authorization-invalid" };
  }

  return {
    status: "ready",
    actorId: result.actorId,
    scope: [...new Set(result.scope)],
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

const isDirectHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !/(?:\/search(?:\/|$)|[?&](?:q|query)=)/iu.test(
      `${url.pathname}${url.search}`,
    );
  } catch {
    return false;
  }
};

export type ReviewRecordIssue =
  | "missing-identity"
  | "missing-statement"
  | "invalid-status"
  | "invalid-evidence-level"
  | "missing-source"
  | "invalid-source-url"
  | "missing-source-locator"
  | "invalid-retrieval-date"
  | "missing-version"
  | "invalid-content-hash"
  | "missing-raw-record"
  | "raw-record-not-serializable";

export const serializeRawReviewRecord = (value: unknown): string | null => {
  try {
    const serialized = JSON.stringify(value, null, 2);
    return typeof serialized === "string" ? serialized : null;
  } catch {
    return null;
  }
};

export function validateScientificReviewRecord(
  record: ScientificReviewRecord,
): readonly ReviewRecordIssue[] {
  const issues: ReviewRecordIssue[] = [];
  if (
    !record.recordId.trim() ||
    !record.claimId.trim() ||
    !record.subjectId.trim() ||
    !record.subjectLabel.trim()
  ) {
    issues.push("missing-identity");
  }
  if (!record.statement.trim()) issues.push("missing-statement");
  if (!verificationStatuses.has(record.verificationStatus)) {
    issues.push("invalid-status");
  }
  if (!evidenceLevels.has(record.evidenceLevel)) {
    issues.push("invalid-evidence-level");
  }
  if (!record.source.sourceId.trim() || !record.source.provider.trim()) {
    issues.push("missing-source");
  }
  if (!isDirectHttpsUrl(record.source.url)) issues.push("invalid-source-url");
  if (!record.source.locator.trim()) issues.push("missing-source-locator");
  if (!Number.isFinite(Date.parse(record.source.retrievedAt))) {
    issues.push("invalid-retrieval-date");
  }
  if (!record.source.version.trim()) issues.push("missing-version");
  if (!/^sha256:[a-f0-9]{64}$/u.test(record.source.contentHash)) {
    issues.push("invalid-content-hash");
  }
  if (record.rawRecord === null || record.rawRecord === undefined) {
    issues.push("missing-raw-record");
  } else if (serializeRawReviewRecord(record.rawRecord) === null) {
    issues.push("raw-record-not-serializable");
  }
  return issues;
}

export type ReviewerActionIssue =
  | "console-not-ready"
  | "capability-missing"
  | "record-invalid"
  | "record-mismatch"
  | "stale-version"
  | "stale-hash"
  | "rationale-required"
  | "replacement-required"
  | "replacement-unchanged";

export function validateReviewerAction(
  readiness: ReviewerConsoleReadiness,
  record: ScientificReviewRecord,
  action: ReviewerAction,
  now = new Date(),
): readonly ReviewerActionIssue[] {
  const issues: ReviewerActionIssue[] = [];
  if (
    readiness.status !== "ready" ||
    Date.parse(readiness.expiresAt) <= now.getTime()
  ) {
    return ["console-not-ready"];
  }
  const requiredScope: ReviewerScope = action.kind === "correction"
    ? "scientific-review:correct"
    : "scientific-review:decide";
  if (!readiness.scope.includes(requiredScope)) issues.push("capability-missing");
  if (validateScientificReviewRecord(record).length > 0) issues.push("record-invalid");
  if (action.recordId !== record.recordId) issues.push("record-mismatch");
  if (action.expectedVersion !== record.source.version) issues.push("stale-version");
  if (action.expectedHash !== record.source.contentHash) issues.push("stale-hash");
  if (action.rationale.trim().length < 8) issues.push("rationale-required");
  if (action.kind === "correction") {
    if (action.replacementStatement.trim().length < 3) {
      issues.push("replacement-required");
    } else if (action.replacementStatement.trim() === record.statement.trim()) {
      issues.push("replacement-unchanged");
    }
  }
  return issues;
}
