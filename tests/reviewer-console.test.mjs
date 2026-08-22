import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  getReviewerConsoleBootState,
  resolveReviewerAuthorization,
  validateReviewerAction,
  validateScientificReviewRecord,
} = await tsImport(
  "../lib/application/reviewer-console.ts",
  import.meta.url,
);

const now = new Date("2026-08-23T10:00:00.000Z");
const hash = `sha256:${"a".repeat(64)}`;
const record = {
  recordId: "review-record:001",
  claimId: "claim:001",
  subjectId: "molecule:propranolol",
  subjectLabel: "Propranolol",
  statement: "A source-located claim awaiting scientific review.",
  verificationStatus: "pending-review",
  evidenceLevel: "literature-reported",
  source: {
    sourceId: "source:patent:001",
    provider: "USPTO",
    url: "https://patents.google.com/patent/US3337628A/en",
    locator: "Example 1, column 4",
    retrievedAt: "2026-08-20T08:00:00.000Z",
    version: "source-snapshot:2026-08-20",
    contentHash: hash,
  },
  rawRecord: { sourceRow: 18, value: "bounded" },
  conflictNote: null,
};

const ready = {
  status: "ready",
  actorId: "reviewer:001",
  scope: [
    "scientific-review:read",
    "scientific-review:decide",
    "scientific-review:correct",
  ],
  expiresAt: "2026-08-23T12:00:00.000Z",
};

test("Reviewer Console fails closed without an injected adapter or valid authorization", () => {
  assert.deepEqual(getReviewerConsoleBootState(null), {
    status: "locked",
    reason: "adapter-missing",
  });
  assert.equal(getReviewerConsoleBootState({}).status, "authorizing");
  assert.deepEqual(
    resolveReviewerAuthorization({ status: "unauthenticated", reason: "no session" }, now),
    { status: "locked", reason: "unauthenticated" },
  );
  assert.deepEqual(
    resolveReviewerAuthorization({ status: "forbidden", reason: "wrong role" }, now),
    { status: "locked", reason: "forbidden" },
  );
  assert.deepEqual(
    resolveReviewerAuthorization({
      status: "authorized",
      actorId: "reviewer:001",
      role: "scientific-reviewer",
      scope: ["scientific-review:decide"],
      expiresAt: "2026-08-23T12:00:00.000Z",
    }, now),
    { status: "locked", reason: "authorization-invalid" },
  );
  assert.deepEqual(
    resolveReviewerAuthorization({
      status: "authorized",
      actorId: "reviewer:001",
      role: "scientific-reviewer",
      scope: ["scientific-review:read"],
      expiresAt: "2026-08-23T09:59:59.000Z",
    }, now),
    { status: "locked", reason: "authorization-invalid" },
  );
});

test("valid reviewer authorization preserves only declared scopes and expiration", () => {
  assert.deepEqual(
    resolveReviewerAuthorization({
      status: "authorized",
      actorId: "reviewer:001",
      role: "scientific-reviewer",
      scope: [
        "scientific-review:read",
        "scientific-review:decide",
        "scientific-review:read",
      ],
      expiresAt: "2026-08-23T12:00:00.000Z",
    }, now),
    {
      status: "ready",
      actorId: "reviewer:001",
      scope: ["scientific-review:read", "scientific-review:decide"],
      expiresAt: "2026-08-23T12:00:00.000Z",
    },
  );
});

test("review records require resolvable provenance, locator, version, hash, and raw record", () => {
  assert.deepEqual(validateScientificReviewRecord(record), []);
  const invalid = {
    ...record,
    source: {
      ...record.source,
      url: "http://example.test/search?q=claim",
      locator: "",
      version: "",
      contentHash: "sha256:not-a-hash",
    },
    rawRecord: null,
  };
  assert.deepEqual(validateScientificReviewRecord(invalid), [
    "invalid-source-url",
    "missing-source-locator",
    "missing-version",
    "invalid-content-hash",
    "missing-raw-record",
  ]);
});

test("review actions are optimistic-concurrency checked and capability gated", () => {
  const promote = {
    kind: "promote",
    recordId: record.recordId,
    expectedVersion: record.source.version,
    expectedHash: record.source.contentHash,
    rationale: "The direct locator supports this decision.",
  };
  assert.deepEqual(validateReviewerAction(ready, record, promote, now), []);
  assert.deepEqual(
    validateReviewerAction(
      { ...ready, scope: ["scientific-review:read"] },
      record,
      promote,
      now,
    ),
    ["capability-missing"],
  );
  assert.deepEqual(
    validateReviewerAction(
      ready,
      record,
      { ...promote, expectedVersion: "stale", expectedHash: `sha256:${"b".repeat(64)}` },
      now,
    ),
    ["stale-version", "stale-hash"],
  );
  assert.deepEqual(
    validateReviewerAction(ready, record, {
      kind: "correction",
      recordId: record.recordId,
      expectedVersion: record.source.version,
      expectedHash: record.source.contentHash,
      rationale: "The locator supports a wording correction.",
      replacementStatement: record.statement,
    }, now),
    ["replacement-unchanged"],
  );
  assert.deepEqual(
    validateReviewerAction(
      { ...ready, expiresAt: "2026-08-23T09:00:00.000Z" },
      record,
      promote,
      now,
    ),
    ["console-not-ready"],
  );
});
