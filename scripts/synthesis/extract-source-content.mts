import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  SYNTHESIS_SOURCE_CONTENT_ACCESS_STATES,
  SYNTHESIS_SOURCE_CONTENT_ROUTE_EXTRACTION_STATES,
  type SynthesisSourceContentAttemptProvenance,
  type SynthesisSourceContentDocumentPlan,
  type SynthesisSourceContentDocumentRecord,
  type SynthesisSourceContentAccessState,
  type SynthesisSourceContentRightsAssessment,
  type SynthesisSourceContentRouteExtractionState,
  type SynthesisSourceContentRunManifest,
} from "../../lib/domain/synthesis-source-content";
import { loadAcceptedSynthesisDiscoveryBaseline } from "./discover-catalog.mjs";
import type { SynthesisDiscoveryRunResult } from "./discover-catalog.mjs";
import {
  SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
  assertSourceContentCandidateBoundary,
  buildSourceContentInventory,
  extractJournalSourceContent,
  extractPatentSourceContent,
  sourceContentDocumentPlanSha256,
  sourceContentMetadataOnlyRights,
} from "./source-content-core.mjs";

export const SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION =
  "synthesis-source-content-2.0.0";
export const synthesisSourceContentWorkUrl = new URL(
  "../../work/synthesis-source-content/v2/",
  import.meta.url,
);
export const SYNTHESIS_SOURCE_CONTENT_MIN_JOURNAL_SPACING_MS = 250;
export const SYNTHESIS_SOURCE_CONTENT_MIN_PATENT_SPACING_MS = 750;

const USER_AGENT_POLICY =
  "Molevren-Synthesis-Source-Content/2.0 (non-commercial evidence audit; contact via repository)";
const REJECTED_SOURCE_CONTENT_PREDECESSOR = Object.freeze({
  pipelineVersion: "synthesis-source-content-1.0.0" as const,
  workPath: "work/synthesis-source-content/v1/" as const,
  reusePermitted: false as const,
  reason:
    "V1 retained source-text windows and is rejected for storage-boundary non-compliance; no V1 checkpoint or attempt is reusable by V2.",
});

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "en"),
  );

const searchedAliasesFor = (plan: SynthesisSourceContentDocumentPlan): readonly string[] =>
  uniqueSorted(
    plan.targetIdentities.flatMap((identity) =>
      identity.aliasQueries.map((query) => query.value),
    ),
  );

const wait = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const writeJsonAtomic = async (url: URL, value: unknown): Promise<void> => {
  await mkdir(new URL("./", url), { recursive: true });
  const temporaryUrl = new URL(`${url.pathname}.tmp-${process.pid}-${randomUUID()}`, "file://");
  await writeFile(temporaryUrl, stableJson(value), "utf8");
  await rename(temporaryUrl, url);
};

const checkpointUrlFor = (globalDocumentKey: string): URL =>
  new URL(
    `documents/${sha256(globalDocumentKey).slice(0, 32)}.json`,
    synthesisSourceContentWorkUrl,
  );

type SourceContentRecordWithoutHash = Omit<
  SynthesisSourceContentDocumentRecord,
  "recordSha256"
>;

const recordSha256For = (
  record: SourceContentRecordWithoutHash | SynthesisSourceContentDocumentRecord,
): string => {
  const payload = Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "recordSha256"),
  );
  return sha256(stableJson(payload));
};

const finalizeRecord = (
  record: SourceContentRecordWithoutHash,
): SynthesisSourceContentDocumentRecord => ({
  ...record,
  recordSha256: recordSha256For(record),
});

export const sourceContentRecordPassesStorageGate = (
  record: SynthesisSourceContentDocumentRecord,
  plan: SynthesisSourceContentDocumentPlan,
): boolean => {
  try {
    const accessible = record.accessState === "full_text_accessible";
    const candidateState = record.routeExtractionState === "source_locator_candidate";
    const inspectedState = record.routeExtractionState === "inspected_no_segment";
    const retainedCount = record.locatorCandidates.length;
    const fullTextSuccessHashes = record.attempts
      .filter((attempt) =>
        attempt.outcome === "success" &&
        (attempt.requestPurpose === "journal_full_text" ||
          attempt.requestPurpose === "patent_full_text"),
      )
      .map((attempt) => attempt.contentSha256);
    const forbiddenStorageKeys: string[] = [];
    const visit = (value: unknown, path: string): void => {
      if (Array.isArray(value)) {
        value.forEach((child, index) => visit(child, `${path}[${index}]`));
        return;
      }
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (
          /snippet|excerpt|quotation|quote|raw(?:text|content)|sourceprose|(?:heading|caption|paragraph|procedure)(?:text|content|prose)/iu.test(
            key,
          )
        ) {
          forbiddenStorageKeys.push(`${path}.${key}`);
        }
        visit(child, `${path}.${key}`);
      }
    };
    visit(record, "$");
    if (
      record.schemaVersion !== 1 ||
      record.pipelineVersion !== SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION ||
      record.parserVersion !== SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION ||
      record.globalDocumentKey !== plan.globalDocumentKey ||
      record.documentPlanSha256 !== sourceContentDocumentPlanSha256(plan) ||
      record.sourceKind !== plan.sourceKind ||
      record.documentId !== plan.documentId ||
      record.associationCount !== plan.associationCount ||
      record.targetIdentityCount !== plan.targetIdentities.length ||
      stableJson(record.searchedAliases) !== stableJson(searchedAliasesFor(plan)) ||
      record.locatorCandidateCount !==
        record.admittedLocatorCandidateCount + record.ambiguousLocatorCandidateCount ||
      record.truncatedLocatorCandidateCount !== record.locatorCandidateCount - retainedCount ||
      record.truncatedLocatorCandidateCount < 0 ||
      candidateState !== (record.admittedLocatorCandidateCount > 0) ||
      inspectedState !== (accessible && record.admittedLocatorCandidateCount === 0) ||
      accessible !== (record.fullTextSha256 !== null) ||
      (accessible && !fullTextSuccessHashes.includes(record.fullTextSha256)) ||
      (accessible && record.inspectedBlockCount < 1) ||
      (!accessible && (retainedCount !== 0 || record.inspectedBlockCount !== 0)) ||
      record.canonicalRouteCreated !== false ||
      record.directReportedEvidenceClaimed !== false ||
      record.contentStored !== false ||
      record.operationalDetailsIncluded !== false ||
      record.recordSha256 !== recordSha256For(record) ||
      forbiddenStorageKeys.length > 0 ||
      record.attempts.some((attempt) =>
        attempt.pipelineVersion !== SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION ||
        attempt.userAgentPolicy !== USER_AGENT_POLICY ||
        attempt.contentStored !== false
      )
    ) {
      return false;
    }
    record.locatorCandidates.forEach((candidate) =>
      assertSourceContentCandidateBoundary(candidate),
    );
    return true;
  } catch {
    return false;
  }
};

const readCheckpoint = async (
  plan: SynthesisSourceContentDocumentPlan,
): Promise<SynthesisSourceContentDocumentRecord | null> => {
  try {
    const parsed = JSON.parse(
      await readFile(checkpointUrlFor(plan.globalDocumentKey), "utf8"),
    ) as SynthesisSourceContentDocumentRecord;
    return sourceContentRecordPassesStorageGate(parsed, plan) ? parsed : null;
  } catch {
    return null;
  }
};

export class HostRateLimiter {
  readonly #nextAllowedAt = new Map<string, number>();
  readonly #tails = new Map<string, Promise<void>>();
  readonly #spacingByHost: ReadonlyMap<string, number>;

  constructor(spacingByHost: ReadonlyMap<string, number>) {
    this.#spacingByHost = spacingByHost;
  }

  async acquire(url: URL): Promise<void> {
    const host = url.host;
    const prior = this.#tails.get(host) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#tails.set(host, prior.then(() => current));
    await prior;
    const delay = Math.max(0, (this.#nextAllowedAt.get(host) ?? 0) - Date.now());
    if (delay > 0) await wait(delay);
    this.#nextAllowedAt.set(host, Date.now() + (this.#spacingByHost.get(host) ?? 500));
    release();
  }
}

type RequestPurpose = SynthesisSourceContentAttemptProvenance["requestPurpose"];
type RequestProvider = SynthesisSourceContentAttemptProvenance["provider"];

interface RequestTextOptions {
  readonly provider: RequestProvider;
  readonly purpose: RequestPurpose;
  readonly accept: string;
  readonly expectedContent: "json" | "xml" | "html";
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly maxResponseBytes: number;
  readonly limiter: HostRateLimiter;
  readonly fetchImpl: typeof fetch;
}

type RequestTextResult =
  | {
      readonly state: "success";
      readonly text: string;
      readonly contentSha256: string;
      readonly finalUrl: string;
      readonly attempts: readonly SynthesisSourceContentAttemptProvenance[];
    }
  | {
      readonly state:
        | "not_found"
        | "access_blocked"
        | "retryable_error"
        | "unsupported_content"
        | "response_too_large";
      readonly attempts: readonly SynthesisSourceContentAttemptProvenance[];
    };

const retryAfterMilliseconds = (value: string | null): number | null => {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60_000, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.min(60_000, date - Date.now()));
};

const ALLOWED_SOURCE_CONTENT_HOSTS = new Set([
  "www.ebi.ac.uk",
  "patents.google.com",
]);

const contentTypeSupported = (
  expected: RequestTextOptions["expectedContent"],
  contentType: string,
): boolean => {
  if (!contentType) return true;
  if (expected === "json") return /(?:application|text)\/[^;]*json|text\/plain/iu.test(contentType);
  if (expected === "xml") return /xml|text\/plain|application\/octet-stream/iu.test(contentType);
  return /html|text\/plain|application\/octet-stream/iu.test(contentType);
};

const cancelResponseBody = async (response: Response): Promise<void> => {
  try {
    await response.body?.cancel();
  } catch {
    // The connection may already be closed. No retry or bypass depends on this.
  }
};

const readResponseBytesWithCap = async (
  response: Response,
  maximumBytes: number,
): Promise<
  | { readonly state: "complete"; readonly bytes: Uint8Array }
  | { readonly state: "too_large"; readonly bytesRead: number }
> => {
  if (!response.body) return { state: "complete", bytes: new Uint8Array() };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytesRead += chunk.value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel().catch(() => undefined);
      return { state: "too_large", bytesRead };
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { state: "complete", bytes };
};

const sanitizedNetworkError = (error: unknown): string => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out or was aborted.";
  }
  if (error instanceof Error && error.name) {
    return `Network request failed (${error.name.replace(/[^a-z0-9_-]/giu, "_").slice(0, 40)}).`;
  }
  return "Network request failed (unknown error).";
};

const requestTextWithRetry = async (
  url: URL,
  options: RequestTextOptions,
): Promise<RequestTextResult> => {
  const attempts: SynthesisSourceContentAttemptProvenance[] = [];
  for (let retryOrdinal = 0; retryOrdinal <= options.maxRetries; retryOrdinal += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    let attempt: SynthesisSourceContentAttemptProvenance;
    let shouldRetry = false;
    let retryDelay = Math.min(30_000, 500 * 2 ** retryOrdinal);
    let currentUrl = new URL(url);
    let attemptedAt = new Date().toISOString();
    let startedAt = Date.now();
    try {
      let response: Response | null = null;
      for (let redirectOrdinal = 0; redirectOrdinal <= 5; redirectOrdinal += 1) {
        if (!ALLOWED_SOURCE_CONTENT_HOSTS.has(currentUrl.host)) {
          return { state: "unsupported_content", attempts };
        }
        await options.limiter.acquire(currentUrl);
        attemptedAt = new Date().toISOString();
        startedAt = Date.now();
        response = await options.fetchImpl(currentUrl, {
          headers: { Accept: options.accept, "User-Agent": USER_AGENT_POLICY },
          redirect: "manual",
          signal: controller.signal,
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const completedAt = new Date().toISOString();
        const location = response.headers.get("location");
        const nextUrl = location ? new URL(location, currentUrl) : null;
        await cancelResponseBody(response);
        if (
          !nextUrl ||
          !ALLOWED_SOURCE_CONTENT_HOSTS.has(nextUrl.host) ||
          redirectOrdinal === 5
        ) {
          attempts.push({
            attemptId: `source-content-attempt:${randomUUID()}`,
            attemptedAt,
            completedAt,
            provider: options.provider,
            requestPurpose: options.purpose,
            requestUrl: currentUrl.toString(),
            finalUrl: nextUrl?.toString() ?? null,
            httpStatus: response.status,
            contentType: response.headers.get("content-type")?.trim() || null,
            bytesReceived: 0,
            contentSha256: null,
            retryOrdinal,
            durationMs: Math.max(0, Date.now() - startedAt),
            outcome: "unsupported_content",
            exactError: nextUrl
              ? "Redirect target host is not allowlisted or redirect limit was exceeded."
              : "Redirect response omitted a Location header.",
            pipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
            userAgentPolicy: USER_AGENT_POLICY,
            contentStored: false,
          });
          return { state: "unsupported_content", attempts };
        }
        attempts.push({
          attemptId: `source-content-attempt:${randomUUID()}`,
          attemptedAt,
          completedAt,
          provider: options.provider,
          requestPurpose: options.purpose,
          requestUrl: currentUrl.toString(),
          finalUrl: nextUrl.toString(),
          httpStatus: response.status,
          contentType: response.headers.get("content-type")?.trim() || null,
          bytesReceived: 0,
          contentSha256: null,
          retryOrdinal,
          durationMs: Math.max(0, Date.now() - startedAt),
          outcome: "redirect_followed",
          exactError: null,
          pipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
          userAgentPolicy: USER_AGENT_POLICY,
          contentStored: false,
        });
        currentUrl = nextUrl;
        response = null;
      }
      if (!response) return { state: "unsupported_content", attempts };
      const completedAt = new Date().toISOString();
      const contentType = response.headers.get("content-type")?.trim() || null;
      const declaredLengthValue = response.headers.get("content-length");
      const declaredLength = declaredLengthValue === null
        ? Number.NaN
        : Number(declaredLengthValue);
      const base = {
        attemptId: `source-content-attempt:${randomUUID()}`,
        attemptedAt,
        completedAt,
        provider: options.provider,
        requestPurpose: options.purpose,
        requestUrl: currentUrl.toString(),
        finalUrl: response.url || currentUrl.toString(),
        httpStatus: response.status,
        contentType,
        retryOrdinal,
        durationMs: Math.max(0, Date.now() - startedAt),
        pipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
        userAgentPolicy: USER_AGENT_POLICY,
        contentStored: false as const,
      };
      if ([401, 403, 407, 451].includes(response.status)) {
        await cancelResponseBody(response);
        attempt = {
          ...base,
          bytesReceived: 0,
          contentSha256: null,
          outcome: "access_blocked",
          exactError: `HTTP ${response.status} from ${currentUrl.origin}; no access-control bypass attempted.`,
        };
        attempts.push(attempt);
        return { state: "access_blocked", attempts };
      }
      if (response.status === 404 || response.status === 410) {
        await cancelResponseBody(response);
        attempt = {
          ...base,
          bytesReceived: 0,
          contentSha256: null,
          outcome: "not_found",
          exactError: `HTTP ${response.status} from ${currentUrl.origin}.`,
        };
        attempts.push(attempt);
        return { state: "not_found", attempts };
      }
      if ([408, 425, 429].includes(response.status) || response.status >= 500) {
        await cancelResponseBody(response);
        shouldRetry = retryOrdinal < options.maxRetries;
        retryDelay = retryAfterMilliseconds(response.headers.get("retry-after")) ?? retryDelay;
        attempt = {
          ...base,
          bytesReceived: 0,
          contentSha256: null,
          outcome: "retryable_error",
          exactError: `HTTP ${response.status} from ${currentUrl.origin}.`,
        };
        attempts.push(attempt);
        if (!shouldRetry) return { state: "retryable_error", attempts };
      } else if (!response.ok) {
        await cancelResponseBody(response);
        attempt = {
          ...base,
          bytesReceived: 0,
          contentSha256: null,
          outcome: "not_found",
          exactError: `HTTP ${response.status} from ${currentUrl.origin}; response was not eligible for retry.`,
        };
        attempts.push(attempt);
        return { state: "not_found", attempts };
      } else if (
        Number.isFinite(declaredLength) &&
        declaredLength > options.maxResponseBytes
      ) {
        await cancelResponseBody(response);
        attempt = {
          ...base,
          bytesReceived: 0,
          contentSha256: null,
          outcome: "response_too_large",
          exactError: `Declared response size ${declaredLength} exceeds ${options.maxResponseBytes} bytes.`,
        };
        attempts.push(attempt);
        return { state: "response_too_large", attempts };
      } else if (!contentTypeSupported(options.expectedContent, contentType ?? "")) {
        await cancelResponseBody(response);
        attempt = {
          ...base,
          bytesReceived: 0,
          contentSha256: null,
          outcome: "unsupported_content",
          exactError: `Unexpected content type ${contentType ?? "unknown"}.`,
        };
        attempts.push(attempt);
        return { state: "unsupported_content", attempts };
      } else {
        const body = await readResponseBytesWithCap(response, options.maxResponseBytes);
        if (body.state === "too_large") {
          attempt = {
            ...base,
            bytesReceived: body.bytesRead,
            contentSha256: null,
            outcome: "response_too_large",
            exactError: `Response exceeded the ${options.maxResponseBytes}-byte streaming limit.`,
          };
          attempts.push(attempt);
          return { state: "response_too_large", attempts };
        }
        const bytes = body.bytes;
        const contentSha256 = sha256(bytes);
        attempt = {
          ...base,
          bytesReceived: bytes.byteLength,
          contentSha256,
          outcome: "success",
          exactError: null,
        };
        attempts.push(attempt);
        return {
          state: "success",
          text: new TextDecoder().decode(bytes),
          contentSha256,
          finalUrl: response.url || currentUrl.toString(),
          attempts,
        };
      }
    } catch (error) {
      const completedAt = new Date().toISOString();
      const exactError = sanitizedNetworkError(error);
      shouldRetry = retryOrdinal < options.maxRetries;
      attempt = {
        attemptId: `source-content-attempt:${randomUUID()}`,
        attemptedAt,
        completedAt,
        provider: options.provider,
        requestPurpose: options.purpose,
        requestUrl: currentUrl.toString(),
        finalUrl: null,
        httpStatus: null,
        contentType: null,
        bytesReceived: 0,
        contentSha256: null,
        retryOrdinal,
        durationMs: Math.max(0, Date.now() - startedAt),
        outcome: "retryable_error",
        exactError,
        pipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
        userAgentPolicy: USER_AGENT_POLICY,
        contentStored: false,
      };
      attempts.push(attempt);
      if (!shouldRetry) return { state: "retryable_error", attempts };
    } finally {
      clearTimeout(timeout);
    }
    if (shouldRetry) await wait(retryDelay);
  }
  return { state: "retryable_error", attempts };
};

const terminalRecord = (
  plan: SynthesisSourceContentDocumentPlan,
  previous: SynthesisSourceContentDocumentRecord | null,
  state:
    | "metadata_only"
    | "access_blocked"
    | "retryable_error"
    | "parse_error"
    | "unsupported",
  newAttempts: readonly SynthesisSourceContentAttemptProvenance[],
  reasonCodes: readonly string[],
  resolvedSourceUrl: string | null = null,
  resolvedPmcid: string | null = null,
): SynthesisSourceContentDocumentRecord => finalizeRecord({
  schemaVersion: 1,
  pipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
  parserName: "molevren-source-content-locator",
  parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
  globalDocumentKey: plan.globalDocumentKey,
  documentPlanSha256: sourceContentDocumentPlanSha256(plan),
  sourceKind: plan.sourceKind,
  documentId: plan.documentId,
  associationCount: plan.associationCount,
  targetIdentityCount: plan.targetIdentities.length,
  searchedAliases: searchedAliasesFor(plan),
  accessState: state,
  routeExtractionState: state,
  inspectedBlockCount: 0,
  locatorCandidateCount: 0,
  admittedLocatorCandidateCount: 0,
  ambiguousLocatorCandidateCount: 0,
  truncatedLocatorCandidateCount: 0,
  locatorCandidates: [],
  resolvedSourceUrl,
  resolvedPmcid,
  fullTextSha256: null,
  rights: sourceContentMetadataOnlyRights(plan.sourceKind),
  attempts: [...(previous?.attempts ?? []), ...newAttempts],
  reasonCodes: uniqueSorted(reasonCodes),
  reviewState: "pending",
  canonicalRouteCreated: false,
  directReportedEvidenceClaimed: false,
  contentStored: false,
  operationalDetailsIncluded: false,
  completedAt: new Date().toISOString(),
});

const recordFromParsedContent = (
  plan: SynthesisSourceContentDocumentPlan,
  previous: SynthesisSourceContentDocumentRecord | null,
  parsed: ReturnType<typeof extractJournalSourceContent>,
  attempts: readonly SynthesisSourceContentAttemptProvenance[],
  resolvedSourceUrl: string,
  fullTextSha256: string,
  resolvedPmcid: string | null,
): SynthesisSourceContentDocumentRecord => {
  if (parsed.parseState === "access_blocked_markup") {
    return terminalRecord(
      plan,
      previous,
      "access_blocked",
      attempts,
      ["human_verification_markup_detected", "access_control_not_bypassed"],
      resolvedSourceUrl,
      resolvedPmcid,
    );
  }
  if (parsed.parseState === "parse_error") {
    return terminalRecord(
      plan,
      previous,
      "parse_error",
      attempts,
      ["retrieved_content_could_not_be_safely_parsed", parsed.exactError ?? "unknown_parse_error"],
      resolvedSourceUrl,
      resolvedPmcid,
    );
  }
  const hasAdmittedCandidate = parsed.admittedCandidateCount > 0;
  return finalizeRecord({
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
    parserName: parsed.parserName,
    parserVersion: parsed.parserVersion,
    globalDocumentKey: plan.globalDocumentKey,
    documentPlanSha256: sourceContentDocumentPlanSha256(plan),
    sourceKind: plan.sourceKind,
    documentId: plan.documentId,
    associationCount: plan.associationCount,
    targetIdentityCount: plan.targetIdentities.length,
    searchedAliases: searchedAliasesFor(plan),
    accessState: "full_text_accessible",
    routeExtractionState: hasAdmittedCandidate
      ? "source_locator_candidate"
      : "inspected_no_segment",
    inspectedBlockCount: parsed.inspectedBlockCount,
    locatorCandidateCount: parsed.totalCandidateCount,
    admittedLocatorCandidateCount: parsed.admittedCandidateCount,
    ambiguousLocatorCandidateCount: parsed.ambiguousCandidateCount,
    truncatedLocatorCandidateCount: parsed.truncatedCandidateCount,
    locatorCandidates: parsed.candidates,
    resolvedSourceUrl,
    resolvedPmcid,
    fullTextSha256,
    rights: parsed.rights,
    attempts: [...(previous?.attempts ?? []), ...attempts],
    reasonCodes: hasAdmittedCandidate
      ? [
          "name_and_route_context_locator_found",
          "candidate_requires_exact_identity_form_stereo_source_and_chemistry_review",
          "no_route_or_step_promoted",
        ]
      : [
          parsed.ambiguousCandidateCount > 0
            ? "only_identity_ambiguous_locator_contexts_found"
            : "no_name_and_route_context_locator_found",
          "absence_of_locator_is_not_novelty_patentability_or_synthesizability",
        ],
    reviewState: "pending",
    canonicalRouteCreated: false,
    directReportedEvidenceClaimed: false,
    contentStored: false,
    operationalDetailsIncluded: false,
    completedAt: new Date().toISOString(),
  });
};

const failureStateForRequest = (
  result: Exclude<RequestTextResult, { readonly state: "success" }>,
): "metadata_only" | "access_blocked" | "retryable_error" | "parse_error" => {
  if (result.state === "access_blocked") return "access_blocked";
  if (result.state === "retryable_error") return "retryable_error";
  if (result.state === "unsupported_content" || result.state === "response_too_large") {
    return "parse_error";
  }
  return "metadata_only";
};

const pmcidFromEuropePmcSearch = (
  payload: string,
  documentId: string,
): { readonly state: "resolved" | "not_found" | "parse_error"; readonly pmcid: string | null } => {
  try {
    const parsed = JSON.parse(payload) as {
      readonly resultList?: {
        readonly result?: readonly {
          readonly pmcid?: string;
          readonly pmid?: string;
          readonly doi?: string;
        }[];
      };
    };
    const [kind, ...valueParts] = documentId.split(":");
    const value = valueParts.join(":").trim().toLocaleLowerCase("en");
    const exact = (parsed.resultList?.result ?? []).find((candidate) => {
      if (kind === "doi") return candidate.doi?.trim().toLocaleLowerCase("en") === value;
      if (kind === "pmid") return candidate.pmid?.trim().toLocaleLowerCase("en") === value;
      return false;
    });
    const pmcid = exact?.pmcid?.trim().toUpperCase() ?? null;
    return pmcid
      ? { state: "resolved", pmcid }
      : { state: "not_found", pmcid: null };
  } catch {
    return { state: "parse_error", pmcid: null };
  }
};

export const resolvePmcidFromEuropePmcSearch = pmcidFromEuropePmcSearch;

const normalizedPatentPublication = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/gu, "");

const patentPublicationIdentitiesMatch = (expected: string, candidate: string): boolean => {
  const left = normalizedPatentPublication(expected);
  const right = normalizedPatentPublication(candidate);
  if (!left || !right) return false;
  if (left === right) return true;
  if (right.startsWith(left) && /^[A-Z]\d?$/u.test(right.slice(left.length))) return true;
  return left.startsWith(right) && /^[A-Z]\d?$/u.test(left.slice(right.length));
};

export const patentPageMatchesRequestedPublication = (
  requestedPublication: string,
  finalUrl: string,
  html: string,
): boolean => {
  let pathPublication: string | null = null;
  try {
    const parsed = new URL(finalUrl);
    if (parsed.host !== "patents.google.com") return false;
    pathPublication = decodeURIComponent(parsed.pathname.match(/^\/patent\/([^/]+)/u)?.[1] ?? "");
  } catch {
    return false;
  }
  if (!pathPublication || !patentPublicationIdentitiesMatch(requestedPublication, pathPublication)) {
    return false;
  }
  const structuredPublications = [
    ...html.matchAll(/\bitemprop=["']publicationNumber["'][^>]*>([^<]{1,120})</giu),
    ...html.matchAll(/\b(?:name|property)=["'][^"']*publication(?:_|-)?number[^"']*["'][^>]*\bcontent=["']([^"']{1,120})["']/giu),
    ...html.matchAll(/\bcontent=["']([^"']{1,120})["'][^>]*\b(?:name|property)=["'][^"']*publication(?:_|-)?number[^"']*["']/giu),
    ...html.matchAll(/["']publicationNumber["']\s*:\s*["']([^"']{1,120})["']/gu),
  ].map((match) => match[1].replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim());
  return structuredPublications.some((candidate) =>
    patentPublicationIdentitiesMatch(requestedPublication, candidate),
  );
};

export interface ProcessSourceContentOptions {
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly maxResponseBytes: number;
  readonly limiter: HostRateLimiter;
  readonly fetchImpl?: typeof fetch;
}

const processJournal = async (
  plan: SynthesisSourceContentDocumentPlan,
  previous: SynthesisSourceContentDocumentRecord | null,
  options: ProcessSourceContentOptions,
): Promise<SynthesisSourceContentDocumentRecord> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const [kind, ...valueParts] = plan.documentId.split(":");
  const value = valueParts.join(":").trim();
  if (!value || !["doi", "pmid", "pmcid"].includes(kind.toLocaleLowerCase("en"))) {
    return terminalRecord(
      plan,
      previous,
      "unsupported",
      [],
      [
        "journal_document_lacks_supported_stable_doi_pmid_or_pmcid",
      ],
    );
  }
  let pmcid = kind.toLocaleLowerCase("en") === "pmcid" ? value.toUpperCase() : null;
  const attempts: SynthesisSourceContentAttemptProvenance[] = [];
  if (!pmcid) {
    const searchUrl = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
    searchUrl.searchParams.set(
      "query",
      kind.toLocaleLowerCase("en") === "doi" ? `DOI:"${value}"` : `EXT_ID:${value}`,
    );
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("pageSize", "3");
    searchUrl.searchParams.set("resultType", "core");
    const search = await requestTextWithRetry(searchUrl, {
      provider: "europe_pmc",
      purpose: "pmcid_resolution",
      accept: "application/json",
      expectedContent: "json",
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      maxResponseBytes: Math.min(options.maxResponseBytes, 2_000_000),
      limiter: options.limiter,
      fetchImpl,
    });
    attempts.push(...search.attempts);
    if (search.state !== "success") {
      const state = failureStateForRequest(search);
      return terminalRecord(
        plan,
        previous,
        state,
        attempts,
        [
          state === "metadata_only"
            ? "stable_journal_metadata_resolved_but_no_open_full_text_resolution"
            : `journal_pmcid_resolution_${state}`,
        ],
        search.attempts.at(-1)?.finalUrl ?? searchUrl.toString(),
      );
    }
    const resolution = pmcidFromEuropePmcSearch(search.text, plan.documentId);
    if (resolution.state === "parse_error") {
      return terminalRecord(
        plan,
        previous,
        "parse_error",
        attempts,
        ["europe_pmc_search_response_parse_error"],
        search.finalUrl,
      );
    }
    pmcid = resolution.pmcid;
    if (!pmcid) {
      return terminalRecord(
        plan,
        previous,
        "metadata_only",
        attempts,
        [
          "no_exact_stable_identity_pmcid_match",
          "metadata_presence_does_not_resolve_source_content",
        ],
        search.finalUrl,
      );
    }
  }
  const fullTextUrl = new URL(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/${encodeURIComponent(pmcid)}/fullTextXML`,
  );
  const fullText = await requestTextWithRetry(fullTextUrl, {
    provider: "europe_pmc",
    purpose: "journal_full_text",
    accept: "application/xml, text/xml",
    expectedContent: "xml",
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    maxResponseBytes: options.maxResponseBytes,
    limiter: options.limiter,
    fetchImpl,
  });
  attempts.push(...fullText.attempts);
  if (fullText.state !== "success") {
    const state = failureStateForRequest(fullText);
    return terminalRecord(
      plan,
      previous,
      state,
      attempts,
      [
        state === "metadata_only"
          ? "pmcid_resolved_but_full_text_not_available"
          : `journal_full_text_${state}`,
      ],
      fullText.attempts.at(-1)?.finalUrl ?? fullTextUrl.toString(),
      pmcid,
    );
  }
  return recordFromParsedContent(
    plan,
    previous,
    extractJournalSourceContent(fullText.text, plan),
    attempts,
    fullText.finalUrl,
    fullText.contentSha256,
    pmcid,
  );
};

const processPatent = async (
  plan: SynthesisSourceContentDocumentPlan,
  previous: SynthesisSourceContentDocumentRecord | null,
  options: ProcessSourceContentOptions,
): Promise<SynthesisSourceContentDocumentRecord> => {
  const publicationNumber = plan.documentId.trim().toUpperCase();
  if (!/^[A-Z]{2}[A-Z0-9]+$/u.test(publicationNumber)) {
    return terminalRecord(
      plan,
      previous,
      "unsupported",
      [],
      ["patent_publication_number_is_not_supported"],
    );
  }
  const url = new URL(
    `https://patents.google.com/patent/${encodeURIComponent(publicationNumber)}/en`,
  );
  const response = await requestTextWithRetry(url, {
    provider: "google_patents",
    purpose: "patent_full_text",
    accept: "text/html,application/xhtml+xml",
    expectedContent: "html",
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    maxResponseBytes: options.maxResponseBytes,
    limiter: options.limiter,
    fetchImpl: options.fetchImpl ?? fetch,
  });
  if (response.state !== "success") {
    const state = failureStateForRequest(response);
    return terminalRecord(
      plan,
      previous,
      state,
      response.attempts,
      [
        state === "metadata_only"
          ? "public_patent_content_not_found_at_lawful_source"
          : `patent_full_text_${state}`,
        state === "access_blocked" ? "access_control_not_bypassed" : "no_bypass_attempted",
      ],
      response.attempts.at(-1)?.finalUrl ?? url.toString(),
    );
  }
  if (
    !patentPageMatchesRequestedPublication(
      publicationNumber,
      response.finalUrl,
      response.text,
    )
  ) {
    return terminalRecord(
      plan,
      previous,
      "parse_error",
      response.attempts,
      [
        "patent_page_publication_identity_mismatch",
        "no_locator_attributed_without_exact_publication_identity",
      ],
      response.finalUrl,
    );
  }
  return recordFromParsedContent(
    plan,
    previous,
    extractPatentSourceContent(response.text, plan),
    response.attempts,
    response.finalUrl,
    response.contentSha256,
    null,
  );
};

export const processSourceContentDocument = async (
  plan: SynthesisSourceContentDocumentPlan,
  previous: SynthesisSourceContentDocumentRecord | null,
  options: ProcessSourceContentOptions,
): Promise<SynthesisSourceContentDocumentRecord> =>
  plan.sourceKind === "journal"
    ? processJournal(plan, previous, options)
    : processPatent(plan, previous, options);

export interface SourceContentSelection {
  readonly sourceKind: "all" | "journal" | "patent";
  readonly offset: number;
  readonly limit: number | null;
  readonly documentKey: string | null;
}

const selectPlans = (
  plans: readonly SynthesisSourceContentDocumentPlan[],
  selection: SourceContentSelection,
): readonly SynthesisSourceContentDocumentPlan[] => {
  const filtered = plans.filter((plan) =>
    (selection.sourceKind === "all" || plan.sourceKind === selection.sourceKind) &&
    (selection.documentKey === null || plan.globalDocumentKey === selection.documentKey),
  );
  return filtered.slice(
    selection.offset,
    selection.limit === null ? undefined : selection.offset + selection.limit,
  );
};

const stateCountsFor = (
  records: readonly SynthesisSourceContentDocumentRecord[],
): Readonly<Record<SynthesisSourceContentRouteExtractionState, number>> => {
  const counts = Object.fromEntries(
    SYNTHESIS_SOURCE_CONTENT_ROUTE_EXTRACTION_STATES.map((state) => [state, 0]),
  ) as Record<SynthesisSourceContentRouteExtractionState, number>;
  for (const record of records) counts[record.routeExtractionState] += 1;
  return counts;
};

const ACCESS_RIGHTS_STATES = [
  "open_license_detected",
  "public_access_no_reuse_inference",
  "metadata_only",
  "unknown",
] as const satisfies readonly SynthesisSourceContentRightsAssessment["licenseState"][];

const zeroRouteCounts = (): Record<SynthesisSourceContentRouteExtractionState, number> =>
  Object.fromEntries(
    SYNTHESIS_SOURCE_CONTENT_ROUTE_EXTRACTION_STATES.map((state) => [state, 0]),
  ) as Record<SynthesisSourceContentRouteExtractionState, number>;

const zeroRightsCounts = (): Record<
  SynthesisSourceContentRightsAssessment["licenseState"],
  number
> => Object.fromEntries(ACCESS_RIGHTS_STATES.map((state) => [state, 0])) as Record<
  SynthesisSourceContentRightsAssessment["licenseState"],
  number
>;

const aggregateRecordDimensions = (
  records: readonly SynthesisSourceContentDocumentRecord[],
): Pick<
  SynthesisSourceContentRunManifest,
  | "accessStateCounts"
  | "rightsStateCounts"
  | "routeExtractionByAccessState"
  | "rightsByAccessState"
  | "locatorTotals"
> => {
  const accessStateCounts = Object.fromEntries(
    SYNTHESIS_SOURCE_CONTENT_ACCESS_STATES.map((state) => [state, 0]),
  ) as Record<SynthesisSourceContentAccessState, number>;
  const rightsStateCounts = zeroRightsCounts();
  const routeExtractionByAccessState = Object.fromEntries(
    SYNTHESIS_SOURCE_CONTENT_ACCESS_STATES.map((state) => [state, zeroRouteCounts()]),
  ) as Record<
    SynthesisSourceContentAccessState,
    Record<SynthesisSourceContentRouteExtractionState, number>
  >;
  const rightsByAccessState = Object.fromEntries(
    SYNTHESIS_SOURCE_CONTENT_ACCESS_STATES.map((state) => [state, zeroRightsCounts()]),
  ) as Record<
    SynthesisSourceContentAccessState,
    Record<SynthesisSourceContentRightsAssessment["licenseState"], number>
  >;
  const locatorTotals = {
    located: 0,
    admitted: 0,
    ambiguous: 0,
    truncated: 0,
    retained: 0,
  };
  for (const record of records) {
    accessStateCounts[record.accessState] += 1;
    rightsStateCounts[record.rights.licenseState] += 1;
    routeExtractionByAccessState[record.accessState][record.routeExtractionState] += 1;
    rightsByAccessState[record.accessState][record.rights.licenseState] += 1;
    locatorTotals.located += record.locatorCandidateCount;
    locatorTotals.admitted += record.admittedLocatorCandidateCount;
    locatorTotals.ambiguous += record.ambiguousLocatorCandidateCount;
    locatorTotals.truncated += record.truncatedLocatorCandidateCount;
    locatorTotals.retained += record.locatorCandidates.length;
  }
  return {
    accessStateCounts,
    rightsStateCounts,
    routeExtractionByAccessState,
    rightsByAccessState,
    locatorTotals,
  };
};

const acceptedAssociationCountFor = (discovery: SynthesisDiscoveryRunResult): number =>
  discovery.subjects.reduce((sum, result) => sum + result.evidence.length, 0);

const createManifest = (
  discovery: SynthesisDiscoveryRunResult,
  plans: readonly SynthesisSourceContentDocumentPlan[],
  selectedCount: number,
  recordsByKey: ReadonlyMap<string, SynthesisSourceContentDocumentRecord>,
  startedAt: string,
  processedCount: number,
  cachedCount: number,
): SynthesisSourceContentRunManifest => {
  const completedAt = new Date().toISOString();
  const records = [...recordsByKey.values()].sort((left, right) =>
    left.globalDocumentKey.localeCompare(right.globalDocumentKey, "en"),
  );
  const sourceContentAssociationCount = plans.reduce(
    (sum, plan) => sum + plan.associationCount,
    0,
  );
  const journalCount = plans.filter((plan) => plan.sourceKind === "journal").length;
  const patentCount = plans.length - journalCount;
  const completedJournalCount = records.filter((record) => record.sourceKind === "journal").length;
  const completedPatentCount = records.length - completedJournalCount;
  const completedSourceContentAssociationCount = records.reduce(
    (sum, record) => sum + record.associationCount,
    0,
  );
  const planByKey = new Map(plans.map((plan) => [plan.globalDocumentKey, plan] as const));
  if (
    planByKey.size !== plans.length ||
    records.length > plans.length ||
    records.some((record) => {
      const plan = planByKey.get(record.globalDocumentKey);
      return !plan || !sourceContentRecordPassesStorageGate(record, plan);
    })
  ) {
    throw new Error("Source-content manifest refused an invalid or out-of-inventory record set.");
  }
  const routeExtractionStateCounts = stateCountsFor(records);
  const aggregates = aggregateRecordDimensions(records);
  if (
    Object.values(routeExtractionStateCounts).reduce((sum, count) => sum + count, 0) !==
      records.length ||
    Object.values(aggregates.accessStateCounts).reduce((sum, count) => sum + count, 0) !==
      records.length ||
    Object.values(aggregates.rightsStateCounts).reduce((sum, count) => sum + count, 0) !==
      records.length ||
    completedJournalCount + completedPatentCount !== records.length ||
    completedSourceContentAssociationCount > sourceContentAssociationCount ||
    (records.length === plans.length &&
      completedSourceContentAssociationCount !== sourceContentAssociationCount)
  ) {
    throw new Error("Source-content aggregate counts do not sum to completed documents.");
  }
  return {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
    parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
    runId: `synthesis-source-content-run:${startedAt.replace(/[^0-9]/gu, "").slice(0, 14)}`,
    catalogSnapshotId: discovery.manifest.catalogSnapshotId,
    startedAt,
    completedAt,
    runState: records.length === plans.length ? "complete" : "partial",
    acceptedCandidateAssociationCount: acceptedAssociationCountFor(discovery),
    sourceContentAssociationCount,
    completedSourceContentAssociationCount,
    expectedDocumentCount: plans.length,
    completedDocumentCount: records.length,
    remainingDocumentCount: plans.length - records.length,
    selectedDocumentCount: selectedCount,
    processedDocumentCount: processedCount,
    cachedDocumentCount: cachedCount,
    documentCountsBySourceKind: { journal: journalCount, patent: patentCount },
    completedDocumentCountsBySourceKind: {
      journal: completedJournalCount,
      patent: completedPatentCount,
    },
    routeExtractionStateCounts,
    ...aggregates,
    canonicalRouteCreatedCount: 0,
    directReportedEvidenceClaimedCount: 0,
    fullTextStored: false,
    publicArtifactsWritten: false,
    rejectedPredecessor: REJECTED_SOURCE_CONTENT_PREDECESSOR,
    recordSetSha256: sha256(
      stableJson(
        records.map((record) => ({
          globalDocumentKey: record.globalDocumentKey,
          recordSha256: record.recordSha256,
        })),
      ),
    ),
  };
};

export interface RunSourceContentExtractionOptions {
  readonly discovery?: SynthesisDiscoveryRunResult;
  readonly selection?: Partial<SourceContentSelection>;
  readonly refresh?: boolean;
  readonly retryTransient?: boolean;
  readonly concurrency?: number;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly maxResponseBytes?: number;
  readonly journalSpacingMs?: number;
  readonly patentSpacingMs?: number;
  readonly checkpointEvery?: number;
  readonly fetchImpl?: typeof fetch;
  readonly onProgress?: (progress: {
    readonly completed: number;
    readonly total: number;
    readonly processed: number;
    readonly cached: number;
    readonly globalDocumentKey: string;
  }) => void;
}

export const runSourceContentExtraction = async (
  options: RunSourceContentExtractionOptions = {},
): Promise<SynthesisSourceContentRunManifest> => {
  const discovery = options.discovery ?? await loadAcceptedSynthesisDiscoveryBaseline();
  const plans = buildSourceContentInventory(discovery);
  const selection: SourceContentSelection = {
    sourceKind: options.selection?.sourceKind ?? "all",
    offset: options.selection?.offset ?? 0,
    limit: options.selection?.limit ?? null,
    documentKey: options.selection?.documentKey ?? null,
  };
  const selected = selectPlans(plans, selection);
  const concurrency = options.concurrency ?? 4;
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error("Source-content concurrency must be an integer from 1 to 16.");
  }
  const timeoutMs = options.timeoutMs ?? 20_000;
  const maxRetries = options.maxRetries ?? 2;
  const maxResponseBytes = options.maxResponseBytes ?? 25_000_000;
  const checkpointEvery = options.checkpointEvery ?? 50;
  const journalSpacingMs = Math.max(
    SYNTHESIS_SOURCE_CONTENT_MIN_JOURNAL_SPACING_MS,
    options.journalSpacingMs ?? SYNTHESIS_SOURCE_CONTENT_MIN_JOURNAL_SPACING_MS,
  );
  const patentSpacingMs = Math.max(
    SYNTHESIS_SOURCE_CONTENT_MIN_PATENT_SPACING_MS,
    options.patentSpacingMs ?? SYNTHESIS_SOURCE_CONTENT_MIN_PATENT_SPACING_MS,
  );
  const limiter = new HostRateLimiter(
    new Map([
      ["www.ebi.ac.uk", journalSpacingMs],
      ["patents.google.com", patentSpacingMs],
    ]),
  );
  await mkdir(new URL("documents/", synthesisSourceContentWorkUrl), { recursive: true });
  await writeJsonAtomic(
    new URL("rejected-predecessor.json", synthesisSourceContentWorkUrl),
    {
      schemaVersion: 1,
      rejectedAt: new Date().toISOString(),
      ...REJECTED_SOURCE_CONTENT_PREDECESSOR,
      successorPipelineVersion: SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
    },
  );
  const previousByKey = new Map<string, SynthesisSourceContentDocumentRecord>();
  const recordsByKey = new Map<string, SynthesisSourceContentDocumentRecord>();
  for (const plan of plans) {
    const previous = await readCheckpoint(plan);
    if (!previous) continue;
    previousByKey.set(plan.globalDocumentKey, previous);
    if (
      previous.pipelineVersion === SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION &&
      previous.documentPlanSha256 === sourceContentDocumentPlanSha256(plan)
    ) {
      recordsByKey.set(plan.globalDocumentKey, previous);
    }
  }
  const transientStates = new Set<SynthesisSourceContentRouteExtractionState>([
    "access_blocked",
    "retryable_error",
  ]);
  const pending = selected.filter((plan) => {
    if (options.refresh) return true;
    const current = recordsByKey.get(plan.globalDocumentKey);
    if (!current) return true;
    return Boolean(options.retryTransient && transientStates.has(current.routeExtractionState));
  });
  let cursor = 0;
  let processed = 0;
  const cached = selected.length - pending.length;
  const startedAt = new Date().toISOString();
  let manifestTail: Promise<void> = Promise.resolve();
  const persistManifest = (): Promise<void> => {
    const manifest = createManifest(
      discovery,
      plans,
      selected.length,
      recordsByKey,
      startedAt,
      processed,
      cached,
    );
    manifestTail = manifestTail.then(() =>
      writeJsonAtomic(new URL("run-manifest.json", synthesisSourceContentWorkUrl), manifest),
    );
    return manifestTail;
  };
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const plan = pending[index];
      const record = await processSourceContentDocument(
        plan,
        previousByKey.get(plan.globalDocumentKey) ?? null,
        {
          timeoutMs,
          maxRetries,
          maxResponseBytes,
          limiter,
          fetchImpl: options.fetchImpl,
        },
      );
      if (!sourceContentRecordPassesStorageGate(record, plan)) {
        throw new Error(`Source-content record failed the V2 storage gate: ${plan.globalDocumentKey}.`);
      }
      await writeJsonAtomic(checkpointUrlFor(plan.globalDocumentKey), record);
      recordsByKey.set(plan.globalDocumentKey, record);
      previousByKey.set(plan.globalDocumentKey, record);
      processed += 1;
      options.onProgress?.({
        completed: cached + processed,
        total: selected.length,
        processed,
        cached,
        globalDocumentKey: plan.globalDocumentKey,
      });
      if (processed % checkpointEvery === 0) void persistManifest();
    }
  });
  await Promise.all(workers);
  await manifestTail;
  const manifest = createManifest(
    discovery,
    plans,
    selected.length,
    recordsByKey,
    startedAt,
    processed,
    cached,
  );
  await writeJsonAtomic(new URL("run-manifest.json", synthesisSourceContentWorkUrl), manifest);
  await writeJsonAtomic(new URL("coverage-report.json", synthesisSourceContentWorkUrl), {
    ...manifest,
    evidenceBoundary: {
      locatedContextsAreCanonicalRoutes: false,
      locatedContextsAreDirectReportedEvidence: false,
      exactMolecularIdentityResolvedFromText: false,
      formAndStereoRequireReview: true,
      absenceMeansNoveltyPatentabilityOrSynthesizability: false,
      sourceDocumentBodyStored: false,
      outputScope: "private_work_only",
    },
  });
  return manifest;
};

type CliMode = "list" | "dry-run" | "run";

export interface SourceContentCliOptions {
  readonly mode: CliMode;
  readonly selection: SourceContentSelection;
  readonly refresh: boolean;
  readonly retryTransient: boolean;
  readonly concurrency: number;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly maxResponseBytes: number;
  readonly journalSpacingMs: number;
  readonly patentSpacingMs: number;
}

const parseIntegerFlag = (
  argv: readonly string[],
  index: number,
  flag: string,
  minimum: number,
): { readonly value: number; readonly nextIndex: number } => {
  const raw = argv[index + 1];
  const value = Number(raw);
  if (!raw || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${flag} requires an integer >= ${minimum}.`);
  }
  return { value, nextIndex: index + 1 };
};

export const parseSourceContentCliArgs = (
  argv: readonly string[],
): SourceContentCliOptions => {
  let mode: CliMode | null = null;
  let sourceKind: SourceContentSelection["sourceKind"] = "all";
  let offset = 0;
  let limit: number | null = null;
  let documentKey: string | null = null;
  let refresh = false;
  let retryTransient = false;
  let concurrency = 4;
  let timeoutMs = 20_000;
  let maxRetries = 2;
  let maxResponseBytes = 25_000_000;
  let journalSpacingMs = 250;
  let patentSpacingMs = 750;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--list", "--dry-run", "--run"].includes(argument)) {
      const nextMode = argument.slice(2) as CliMode;
      if (mode && mode !== nextMode) throw new Error("Choose exactly one mode: --list, --dry-run or --run.");
      mode = nextMode;
      continue;
    }
    if (argument === "--source") {
      const value = argv[index + 1];
      if (value !== "all" && value !== "journal" && value !== "patent") {
        throw new Error("--source requires all, journal or patent.");
      }
      sourceKind = value;
      index += 1;
      continue;
    }
    if (argument === "--document-key") {
      documentKey = argv[index + 1]?.trim() || null;
      if (!documentKey) throw new Error("--document-key requires an exact global document key.");
      index += 1;
      continue;
    }
    if (argument === "--refresh") {
      refresh = true;
      continue;
    }
    if (argument === "--retry-transient") {
      retryTransient = true;
      continue;
    }
    const integerFlags: Readonly<Record<string, { readonly minimum: number; readonly set: (value: number) => void }>> = {
      "--offset": { minimum: 0, set: (value) => { offset = value; } },
      "--limit": { minimum: 1, set: (value) => { limit = value; } },
      "--concurrency": { minimum: 1, set: (value) => { concurrency = value; } },
      "--timeout-ms": { minimum: 250, set: (value) => { timeoutMs = value; } },
      "--max-retries": { minimum: 0, set: (value) => { maxRetries = value; } },
      "--max-response-bytes": { minimum: 1_000, set: (value) => { maxResponseBytes = value; } },
      "--journal-spacing-ms": {
        minimum: SYNTHESIS_SOURCE_CONTENT_MIN_JOURNAL_SPACING_MS,
        set: (value) => { journalSpacingMs = value; },
      },
      "--patent-spacing-ms": {
        minimum: SYNTHESIS_SOURCE_CONTENT_MIN_PATENT_SPACING_MS,
        set: (value) => { patentSpacingMs = value; },
      },
    };
    const definition = integerFlags[argument];
    if (definition) {
      const parsed = parseIntegerFlag(argv, index, argument, definition.minimum);
      definition.set(parsed.value);
      index = parsed.nextIndex;
      continue;
    }
    throw new Error(`Unknown source-content option: ${argument}`);
  }
  if (!mode) throw new Error("Choose one mode: --list, --dry-run or --run.");
  if (concurrency > 16) throw new Error("--concurrency may not exceed 16.");
  return {
    mode,
    selection: { sourceKind, offset, limit, documentKey },
    refresh,
    retryTransient,
    concurrency,
    timeoutMs,
    maxRetries,
    maxResponseBytes,
    journalSpacingMs,
    patentSpacingMs,
  };
};

const cliMain = async (): Promise<void> => {
  const options = parseSourceContentCliArgs(process.argv.slice(2));
  const discovery = await loadAcceptedSynthesisDiscoveryBaseline();
  const plans = buildSourceContentInventory(discovery);
  const selected = selectPlans(plans, options.selection);
  const inventory = {
    acceptedCandidateAssociationCount: acceptedAssociationCountFor(discovery),
    sourceContentAssociationCount: plans.reduce((sum, plan) => sum + plan.associationCount, 0),
    documentCount: plans.length,
    bySourceKind: {
      journal: plans.filter((plan) => plan.sourceKind === "journal").length,
      patent: plans.filter((plan) => plan.sourceKind === "patent").length,
    },
    unsupportedJournalFallbackDocumentCount: plans.filter((plan) =>
      plan.sourceKind === "journal" && plan.documentId.startsWith("europe-pmc:"),
    ).length,
    selectedDocumentCount: selected.length,
  };
  if (options.mode === "list") {
    console.log(stableJson({
      ...inventory,
      selection: options.selection,
      sampleDocumentKeys: selected.slice(0, 25).map((plan) => plan.globalDocumentKey),
    }));
    return;
  }
  if (options.mode === "dry-run") {
    const journalSelected = selected.filter((plan) => plan.sourceKind === "journal").length;
    const patentSelected = selected.length - journalSelected;
    console.log(stableJson({
      ...inventory,
      mode: "dry-run",
      writesPerformed: false,
      networkRequestsPerformed: false,
      selection: options.selection,
      conservativeMinimumSpacingEstimateMinutes:
        Math.round(
          ((journalSelected * options.journalSpacingMs +
            patentSelected * options.patentSpacingMs) /
            60_000) *
            10,
        ) / 10,
      samplePlans: selected.slice(0, 10).map((plan) => ({
        globalDocumentKey: plan.globalDocumentKey,
        sourceKind: plan.sourceKind,
        associationCount: plan.associationCount,
        targetIdentityCount: plan.targetIdentities.length,
      })),
    }));
    return;
  }
  const manifest = await runSourceContentExtraction({
    discovery,
    selection: options.selection,
    refresh: options.refresh,
    retryTransient: options.retryTransient,
    concurrency: options.concurrency,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    maxResponseBytes: options.maxResponseBytes,
    journalSpacingMs: options.journalSpacingMs,
    patentSpacingMs: options.patentSpacingMs,
    onProgress: ({ completed, total, processed, cached, globalDocumentKey }) => {
      if (processed === 1 || completed === total || processed % 25 === 0) {
        console.log(
          `[source-content] ${completed}/${total} selected (${processed} processed, ${cached} cached): ${globalDocumentKey}`,
        );
      }
    },
  });
  console.log(stableJson(manifest));
};

const invokedAsScript = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;
if (invokedAsScript) {
  cliMain().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
