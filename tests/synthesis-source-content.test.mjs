import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  SYNTHESIS_SOURCE_CONTENT_GENERATED_SUMMARY,
  SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
  assertSourceContentCandidateBoundary,
  buildSourceContentInventory,
  extractJournalSourceContent,
  extractPatentSourceContent,
  normalizeSourceContentAlias,
} = await tsImport("../scripts/synthesis/source-content-core.mts", import.meta.url);
const {
  HostRateLimiter,
  SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION,
  processSourceContentDocument,
  patentPageMatchesRequestedPublication,
  sourceContentRecordPassesStorageGate,
  synthesisSourceContentWorkUrl,
  parseSourceContentCliArgs,
  resolvePmcidFromEuropePmcSearch,
} = await tsImport("../scripts/synthesis/extract-source-content.mts", import.meta.url);

const fixtureUrl = (name) =>
  new URL(`./fixtures/synthesis-source-content/${name}`, import.meta.url);

const syntheticPatentPageUrl = (publicationId) => {
  const url = new URL("https://patents.google.com");
  url.pathname = `/patent/${publicationId}/en`;
  return url.toString();
};

const target = ({
  coverageId = "synthesis-coverage:molecule:synthetic-fixture-alpha",
  catalogEntityId = "molecule:synthetic-fixture-alpha",
  preferredName = "Synthetic Compound Alpha",
  aliases = ["Synthetic Compound Alpha"],
} = {}) => ({
  coverageId,
  catalogEntityId,
  preferredName,
  inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBB-N",
  connectivityKey: "AAAAAAAAAAAAAA",
  chemicalFormId: "chemical-form:synthetic-fixture-alpha",
  chemicalFormKind: "free_parent",
  stereoisomerId: "stereoisomer:synthetic-fixture-alpha",
  stereochemistrySpecified: false,
  aliasQueries: aliases.map((value, index) => ({
    value,
    normalizedValue: normalizeSourceContentAlias(value),
    origin: index === 0 ? "preferred_name" : "catalog_alias",
    globalExactIdentityCount: 1,
    identityAmbiguous: false,
  })),
});

const plan = (sourceKind, targetIdentities = [target()]) => ({
  schemaVersion: 1,
  globalDocumentKey: `${sourceKind}:${sourceKind === "journal" ? "doi:10.1000/test" : "wo0000000000"}`,
  sourceKind,
  documentId: sourceKind === "journal" ? "doi:10.1000/test" : "WO0000000000",
  associationCount: targetIdentities.length,
  sourceEvidenceIds: [
    `synthesis-source-evidence:synthetic-${sourceKind}-fixture:test`,
  ],
  discoveryUrls: [],
  discoveryTitles: [],
  targetIdentities,
});

const forbiddenOperationalSourceText =
  /1gm|0\.2 vol|5[–-]50 μM|3,200 × g|overnight|room temperature|2\.5 g|45 °C|3 h|80%|20 mL|60 °C|4 hours/iu;

const assertNonQuotingCandidates = (candidates) => {
  for (const candidate of candidates) {
    assert.equal(candidate.generatedContextSummary, SYNTHESIS_SOURCE_CONTENT_GENERATED_SUMMARY);
    assert.equal(candidate.contextSummaryCode, "catalog_alias_route_context_at_locator");
    assert.equal(candidate.contextSummaryMode, "generated_non_quoting");
    assert.equal(candidate.sourceTextRetained, false);
    assert.doesNotMatch(JSON.stringify(candidate), forbiddenOperationalSourceText);
    assert.ok(!Object.keys(candidate).some((key) => /snippet|excerpt|quote|raw/iu.test(key)));
    assert.doesNotThrow(() => assertSourceContentCandidateBoundary(candidate));
  }
};

test("journal JATS fixture stores generated locator context and no source-text window", async () => {
  const xml = await readFile(fixtureUrl("journal.xml"), "utf8");
  const parsed = extractJournalSourceContent(xml, plan("journal"));

  assert.equal(parsed.parseState, "parsed");
  assert.equal(parsed.admittedCandidateCount, 2);
  assert.ok(parsed.inspectedBlockCount >= 3);
  assert.ok(parsed.candidates.every((candidate) => candidate.promotionState === "candidate_only"));
  assert.ok(parsed.candidates.every((candidate) => candidate.reviewState === "pending"));
  assert.ok(parsed.candidates.every((candidate) => candidate.molecularIdentityResolution === "name_only"));
  assert.ok(parsed.candidates.every((candidate) => candidate.formIdentityResolution === "unresolved_from_text"));
  assert.ok(parsed.candidates.every((candidate) => candidate.stereochemistryResolution === "unresolved_from_text"));
  assert.ok(parsed.candidates.every((candidate) => candidate.operationalDetailsIncluded === false));
  assert.ok(parsed.candidates.some((candidate) => candidate.locatorKind === "journal_section"));
  assert.ok(parsed.candidates.some((candidate) => candidate.locatorKind === "journal_figure"));
  assertNonQuotingCandidates(parsed.candidates);
  assert.equal(parsed.rights.licenseState, "open_license_detected");
  assert.equal(parsed.rights.redistributionPermission, "permitted_with_attribution");
  assert.equal(parsed.rights.figureSchemeReusePermission, "unknown");
  assert.equal(parsed.rights.openAccessLabelAloneUsedAsPermission, false);
});

test("patent HTML fixture locates an example without retaining procedure prose", async () => {
  const html = await readFile(fixtureUrl("patent.html"), "utf8");
  const parsed = extractPatentSourceContent(html, plan("patent"));

  assert.equal(parsed.parseState, "parsed");
  assert.equal(parsed.admittedCandidateCount, 1);
  assert.equal(parsed.candidates[0].locatorKind, "patent_example");
  assert.match(parsed.candidates[0].locatorValue, /Example 12; paragraph 0031/u);
  assert.equal(parsed.candidates[0].promotionState, "candidate_only");
  assert.equal(parsed.candidates[0].molecularIdentityResolution, "name_only");
  assertNonQuotingCandidates(parsed.candidates);
  assert.equal(parsed.rights.licenseState, "public_access_no_reuse_inference");
  assert.equal(parsed.rights.redistributionPermission, "metadata_only");
  assert.equal(parsed.rights.figureSchemeReusePermission, "unknown");
});

test("qualified stereo aliases are not normalized into the unqualified identity", () => {
  assert.equal(normalizeSourceContentAlias("(-)-Fixtureol"), "stereo_minus fixtureol");
  assert.equal(normalizeSourceContentAlias("(R)-Fixtureol"), "stereo_r fixtureol");
  assert.notEqual(
    normalizeSourceContentAlias("(-)-Fixtureol"),
    normalizeSourceContentAlias("Fixtureol"),
  );
});

test("a more specific form or stereo name withholds the embedded shorter identity match", () => {
  const html = `<!doctype html><html><body><dd itemprop="publicationNumber">WO0000000000A1</dd><heading>Example 4</heading><div class="description-line-numbered" num="0042">(-)-Fixtureol was prepared by reduction.</div></body></html>`;
  const targets = [
    target({
      coverageId: "synthesis-coverage:molecule:synthetic-fixtureol-unspecified",
      catalogEntityId: "molecule:synthetic-fixtureol-unspecified",
      preferredName: "Fixtureol",
      aliases: ["Fixtureol"],
    }),
    target({
      coverageId: "synthesis-coverage:molecule:synthetic-minus-fixtureol",
      catalogEntityId: "molecule:synthetic-minus-fixtureol",
      preferredName: "(-)-Fixtureol",
      aliases: ["(-)-Fixtureol"],
    }),
  ];
  const parsed = extractPatentSourceContent(html, plan("patent", targets));
  const unspecified = parsed.candidates.find(
    (candidate) => candidate.catalogEntityId === "molecule:synthetic-fixtureol-unspecified",
  );
  const qualified = parsed.candidates.find(
    (candidate) => candidate.catalogEntityId === "molecule:synthetic-minus-fixtureol",
  );

  assert.equal(unspecified?.identityMatchState, "shadowed_by_more_specific_alias");
  assert.equal(unspecified?.admissionState, "withheld_identity_ambiguous");
  assert.equal(qualified?.identityMatchState, "unique_name_context");
  assert.equal(qualified?.admissionState, "review_candidate");
});

test("inventory deduplicates documents while preserving association and exact identity scope", () => {
  const subject = (catalogEntityId, preferredName, inchiKey) => ({
    catalogEntityId,
    preferredName,
    aliases: [],
    identity: { inchiKey, connectivityKey: inchiKey.slice(0, 14) },
    formIdentity: { chemicalFormId: `form:${catalogEntityId}`, kind: "free_parent" },
    stereochemistryIdentity: {
      stereoisomerId: `stereo:${catalogEntityId}`,
      specifiedInSourceInchi: false,
    },
    sourceIdentity: { approvalName: preferredName, inn: preferredName },
  });
  const evidence = (id) => ({
    id,
    sourceKind: "patent",
    documentId: "synthetic-patent-document-alpha",
    url: "https://evidence.example.invalid/document/synthetic-patent-alpha",
    title: "A synthetic fixture process",
  });
  const discovery = {
    manifest: { catalogSnapshotId: "fixture" },
    subjects: [
      {
        subject: subject("molecule:synthetic-a", "Synthetic Compound Alpha", "AAAAAAAAAAAAAA-BBBBBBBBBB-N"),
        coverage: { id: "synthesis-coverage:molecule:synthetic-a" },
        evidence: [evidence("synthesis-source-evidence:synthetic-patent:a")],
      },
      {
        subject: subject("molecule:synthetic-b", "Synthetic Compound Beta", "CCCCCCCCCCCCCC-DDDDDDDDDD-N"),
        coverage: { id: "synthesis-coverage:molecule:synthetic-b" },
        evidence: [evidence("synthesis-source-evidence:synthetic-patent:b")],
      },
    ],
  };
  const inventory = buildSourceContentInventory(discovery);

  assert.equal(inventory.length, 1);
  assert.equal(inventory[0].associationCount, 2);
  assert.equal(inventory[0].targetIdentities.length, 2);
  assert.deepEqual(
    inventory[0].targetIdentities.map((identity) => identity.catalogEntityId),
    ["molecule:synthetic-a", "molecule:synthetic-b"],
  );
});

test("Europe PMC resolution accepts only an exact stable document identity", () => {
  const payload = JSON.stringify({
    resultList: {
      result: [
        { doi: "10.1000/other", pmcid: "PMC1" },
        { doi: "10.1000/target", pmcid: "PMC2" },
      ],
    },
  });
  assert.deepEqual(resolvePmcidFromEuropePmcSearch(payload, "doi:10.1000/target"), {
    state: "resolved",
    pmcid: "PMC2",
  });
  assert.deepEqual(resolvePmcidFromEuropePmcSearch(payload, "doi:10.1000/missing"), {
    state: "not_found",
    pmcid: null,
  });
});

test("CLI exposes explicit non-writing dry-run/list modes and bounded network controls", () => {
  assert.deepEqual(
    parseSourceContentCliArgs([
      "--dry-run",
      "--source",
      "patent",
      "--limit",
      "10",
      "--concurrency",
      "2",
      "--max-retries",
      "0",
    ]),
    {
      mode: "dry-run",
      selection: { sourceKind: "patent", offset: 0, limit: 10, documentKey: null },
      refresh: false,
      retryTransient: false,
      concurrency: 2,
      timeoutMs: 20_000,
      maxRetries: 0,
      maxResponseBytes: 25_000_000,
      journalSpacingMs: 250,
      patentSpacingMs: 750,
    },
  );
  assert.throws(() => parseSourceContentCliArgs(["--run", "--dry-run"]), /exactly one mode/u);
  assert.throws(() => parseSourceContentCliArgs(["--run", "--concurrency", "17"]), /may not exceed/u);
  assert.throws(
    () => parseSourceContentCliArgs(["--run", "--journal-spacing-ms", "249"]),
    /integer >= 250/u,
  );
  assert.throws(
    () => parseSourceContentCliArgs(["--run", "--patent-spacing-ms", "749"]),
    /integer >= 750/u,
  );
});

test("V2 uses a fresh work root and refuses stale parser, plan or record hashes", async () => {
  assert.match(synthesisSourceContentWorkUrl.pathname, /synthesis-source-content\/v2\/$/u);
  assert.equal(SYNTHESIS_SOURCE_CONTENT_PIPELINE_VERSION, "synthesis-source-content-2.0.0");
  assert.equal(SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION, "2.0.0");

  const patentPlan = plan("patent");
  const record = await processSourceContentDocument(patentPlan, null, {
    timeoutMs: 1_000,
    maxRetries: 0,
    maxResponseBytes: 10_000,
    limiter: new HostRateLimiter(new Map([["patents.google.com", 0]])),
    fetchImpl: async () => new Response(null, { status: 407 }),
  });
  assert.equal(record.accessState, "access_blocked");
  assert.equal(record.routeExtractionState, "access_blocked");
  assert.ok(sourceContentRecordPassesStorageGate(record, patentPlan));
  assert.equal(
    sourceContentRecordPassesStorageGate({ ...record, parserVersion: "1.0.0" }, patentPlan),
    false,
  );
  assert.equal(
    sourceContentRecordPassesStorageGate({ ...record, documentPlanSha256: "0".repeat(64) }, patentPlan),
    false,
  );
  assert.equal(
    sourceContentRecordPassesStorageGate({ ...record, associationCount: 99 }, patentPlan),
    false,
  );
  assert.equal(
    sourceContentRecordPassesStorageGate({ ...record, recordSha256: "0".repeat(64) }, patentPlan),
    false,
  );
});

test("redirect allowlist, streaming cap and sanitized errors fail closed", async () => {
  const patentPlan = plan("patent");
  let redirectFetchCount = 0;
  const redirectRecord = await processSourceContentDocument(patentPlan, null, {
    timeoutMs: 1_000,
    maxRetries: 0,
    maxResponseBytes: 10_000,
    limiter: new HostRateLimiter(new Map([["patents.google.com", 0]])),
    fetchImpl: async () => {
      redirectFetchCount += 1;
      return new Response(null, {
        status: 302,
        headers: { location: "https://not-allowlisted.invalid/source" },
      });
    },
  });
  assert.equal(redirectFetchCount, 1);
  assert.equal(redirectRecord.routeExtractionState, "parse_error");
  assert.equal(redirectRecord.attempts[0].outcome, "unsupported_content");
  assert.doesNotMatch(JSON.stringify(redirectRecord), /source prose secret/u);

  const oversizedRecord = await processSourceContentDocument(patentPlan, null, {
    timeoutMs: 1_000,
    maxRetries: 0,
    maxResponseBytes: 1_000,
    limiter: new HostRateLimiter(new Map([["patents.google.com", 0]])),
    fetchImpl: async () => new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(700));
          controller.enqueue(new Uint8Array(700));
          controller.close();
        },
      }),
      { status: 200, headers: { "content-type": "text/html" } },
    ),
  });
  assert.equal(oversizedRecord.routeExtractionState, "parse_error");
  assert.equal(oversizedRecord.attempts[0].outcome, "response_too_large");
  assert.equal(oversizedRecord.attempts[0].contentSha256, null);

  const errorRecord = await processSourceContentDocument(patentPlan, null, {
    timeoutMs: 1_000,
    maxRetries: 0,
    maxResponseBytes: 10_000,
    limiter: new HostRateLimiter(new Map([["patents.google.com", 0]])),
    fetchImpl: async () => {
      throw new Error("source prose secret /Users/private token=abc");
    },
  });
  assert.equal(errorRecord.routeExtractionState, "retryable_error");
  assert.equal(errorRecord.attempts[0].exactError, "Network request failed (Error).");
  assert.doesNotMatch(JSON.stringify(errorRecord), /Users\/private|token=abc|source prose secret/u);
});

test("license inference requires an exact normalized href", () => {
  const article = (href) => `<?xml version="1.0"?><article xmlns:xlink="http://www.w3.org/1999/xlink"><front><license xlink:href="${href}">This prose mentions CC0 and CC BY.</license></front><body><sec><title>Synthesis</title><p id="p1">Synthetic Compound Alpha was prepared by reaction.</p></sec></body></article>`;
  const restrictive = extractJournalSourceContent(
    article("https://creativecommons.org/licenses/by-nc/4.0/"),
    plan("journal"),
  );
  assert.equal(restrictive.rights.licenseState, "public_access_no_reuse_inference");
  assert.equal(restrictive.rights.redistributionPermission, "metadata_only");

  const publicDomain = extractJournalSourceContent(
    article("https://creativecommons.org/publicdomain/zero/1.0/"),
    plan("journal"),
  );
  assert.equal(publicDomain.rights.copyrightState, "public_domain");
  assert.equal(publicDomain.rights.redistributionPermission, "permitted");
});

test("source heading prose cannot enter a structured locator or generated summary", () => {
  const source = `<!doctype html><html><body><dd itemprop="publicationNumber">WO0000000000A1</dd><heading id="safe-h">Example 12 using 1gm overnight at room temperature</heading><div class="description-line-numbered" num="0042">Synthetic Compound Alpha was prepared by reaction at 5–50 μM.</div></body></html>`;
  const parsed = extractPatentSourceContent(source, plan("patent"));
  assert.equal(parsed.candidates.length, 1);
  assert.equal(parsed.candidates[0].locatorKind, "patent_paragraph");
  assert.equal(parsed.candidates[0].locatorValue, "heading-id safe-h; paragraph 0042");
  assertNonQuotingCandidates(parsed.candidates);
});

test("candidate whitelist recursively rejects source-text storage keys", () => {
  const html = `<!doctype html><html><body><dd itemprop="publicationNumber">WO0000000000A1</dd><heading>Example 1</heading><div class="description-line-numbered" num="1">Synthetic Compound Alpha was prepared by reaction.</div></body></html>`;
  const candidate = extractPatentSourceContent(html, plan("patent")).candidates[0];
  assert.throws(
    () => assertSourceContentCandidateBoundary({ ...candidate, snippet: "forbidden" }),
    /non-whitelisted|forbidden source-text/u,
  );
  for (const forbiddenKey of ["headingText", "captionText", "paragraphText", "procedureText"]) {
    assert.throws(
      () => assertSourceContentCandidateBoundary({ ...candidate, [forbiddenKey]: "forbidden" }),
      /non-whitelisted|forbidden source-text/u,
    );
  }
});

test("patent page identity gate requires matching path and structured publication metadata", async () => {
  const matching = `<html><body><dd itemprop="publicationNumber">WO0000000000A1</dd></body></html>`;
  const wrong = `<html><body><dd itemprop="publicationNumber">WO0000000001A1</dd></body></html>`;
  assert.equal(
    patentPageMatchesRequestedPublication(
      "WO0000000000",
      syntheticPatentPageUrl("WO0000000000A1"),
      matching,
    ),
    true,
  );
  assert.equal(
    patentPageMatchesRequestedPublication(
      "WO0000000000",
      syntheticPatentPageUrl("WO0000000000A1"),
      wrong,
    ),
    false,
  );
  assert.equal(
    patentPageMatchesRequestedPublication(
      "WO0000000000",
      syntheticPatentPageUrl("WO0000000001A1"),
      matching,
    ),
    false,
  );
  const mismatchRecord = await processSourceContentDocument(plan("patent"), null, {
    timeoutMs: 1_000,
    maxRetries: 0,
    maxResponseBytes: 10_000,
    limiter: new HostRateLimiter(new Map([["patents.google.com", 0]])),
    fetchImpl: async () => new Response(
      `<html><body><dd itemprop="publicationNumber">WO0000000001A1</dd><heading>Example 1</heading><div class="description-line-numbered" num="1">Synthetic Compound Alpha was prepared by reaction.</div></body></html>`,
      { status: 200, headers: { "content-type": "text/html" } },
    ),
  });
  assert.equal(mismatchRecord.routeExtractionState, "parse_error");
  assert.equal(mismatchRecord.locatorCandidateCount, 0);
  assert.ok(mismatchRecord.reasonCodes.includes("patent_page_publication_identity_mismatch"));
});

test("committed V2 source-content summary is complete, aggregate-only and internally balanced", async () => {
  const summary = JSON.parse(
    await readFile(
      new URL("../docs/data/synthesis-source-content-v2-summary.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.pipelineVersion, "synthesis-source-content-2.0.0");
  assert.equal(summary.runState, "complete");
  assert.equal(summary.denominators.catalogCoverageIdentities, 1552);
  assert.equal(summary.denominators.acceptedCandidateAssociations, 14897);
  assert.equal(summary.denominators.sourceContentInventoryCoverageIdentities, 1064);
  assert.equal(summary.denominators.sourceContentAssociations, 10248);
  assert.equal(summary.denominators.sourceContentDocuments, 9992);
  assert.equal(summary.denominators.completedSourceContentDocuments, 9992);
  assert.equal(summary.denominators.remainingSourceContentDocuments, 0);
  assert.equal(
    Object.values(summary.documentCountsBySourceKind).reduce((sum, count) => sum + count, 0),
    9992,
  );
  assert.equal(
    Object.values(summary.routeExtractionStateCounts).reduce((sum, count) => sum + count, 0),
    9992,
  );
  assert.equal(
    Object.values(summary.accessStateCounts).reduce((sum, count) => sum + count, 0),
    9992,
  );
  assert.equal(
    Object.values(summary.rightsStateCounts).reduce((sum, count) => sum + count, 0),
    9992,
  );
  assert.equal(summary.locatorContextTotals.admitted + summary.locatorContextTotals.ambiguous, 23914);
  assert.equal(summary.locatorContextTotals.retained + summary.locatorContextTotals.truncated, 23914);
  assert.deepEqual(summary.evidenceBoundary, {
    canonicalRouteCreatedCount: 0,
    directReportedEvidenceClaimedCount: 0,
    sourceDocumentBodyStored: false,
    operationalDetailsIncluded: false,
    sourceContentPipelineWrotePublicArtifacts: false,
    openAccessLabelAloneUsedAsReusePermission: false,
    absenceMeansNoveltyPatentabilityOrSynthesizability: false,
  });
  assert.match(summary.recordSetSha256, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(
    JSON.stringify(summary),
    /https?:\/\/|\/Users\/|snippet|excerpt|sourceText|procedure|documentId|sourceId/iu,
  );
});
