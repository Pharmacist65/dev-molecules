import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type {
  SynthesisCoverageRecord,
  SynthesisCoverageSnapshotManifest,
} from "../../lib/domain/synthesis-coverage";
import type { SynthesisSourceEvidence } from "../../lib/domain/synthesis-route";
import {
  SYNTHESIS_APPLICABILITY_STATES,
  SYNTHESIS_LICENSE_STATES,
  SYNTHESIS_REVIEW_STATES,
  SYNTHESIS_ROUTE_COMPLETENESS_STATES,
  SYNTHESIS_ROUTE_TYPES,
} from "../../lib/domain/synthesis-route";
import type { SynthesisEvidenceExtractionManifest } from "../../lib/domain/synthesis-extraction";
import type {
  PublicAlphaSynthesisDraftGraph,
  PublicAlphaSynthesisDraftReference,
} from "../../lib/domain/public-alpha-synthesis-draft";
import { validatePublicAlphaSynthesisDraftGraph } from "../../lib/application/public-alpha-synthesis-draft";
import {
  SYNTHESIS_CANDIDATE_SOURCE_EVIDENCE_STATES,
  SYNTHESIS_EVIDENCE_ACCESS_STATES,
  SYNTHESIS_EVIDENCE_LICENSE_STATES,
  SYNTHESIS_EXTRACTION_OUTCOMES,
  SYNTHESIS_MOLECULE_BEST_OUTCOMES,
} from "../../lib/domain/synthesis-extraction";
import {
  validateSynthesisCoverageRouteLinks,
  validateSynthesisCoverageSnapshot,
  type SynthesisValidationIssue,
} from "../../lib/domain/synthesis-validation";
import { loadSynthesisDiscoverySubjects } from "./catalog-input.mjs";
import { createSynthesisIdentityScope } from "./discover-catalog.mjs";
import { SYNTHESIS_CANDIDATE_BASELINE } from "./extract-candidates.mjs";
import { PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE } from "./public-safe-route-aggregate.mjs";
import {
  synthesisPublicOutputUrl,
  type PublicSynthesisRouteDetailV1,
} from "./publish-snapshot.mjs";

interface ArtifactDescriptor {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

interface PublicSynthesisManifest extends SynthesisCoverageSnapshotManifest {
  readonly routeCount: number;
  readonly privateRouteAggregateCount: number;
  readonly sourceEvidenceCount: number;
  readonly shardCount: number;
  readonly shards: readonly (ArtifactDescriptor & {
    readonly key: string;
    readonly recordCount: number;
  })[];
  readonly routes: {
    readonly index: ArtifactDescriptor;
    readonly details: readonly ArtifactDescriptor[];
    readonly publishedDetailCount: number;
    readonly withheldDetailCount: number;
  };
  readonly drafts: {
    readonly channel: "public_alpha_source_supported_draft";
    readonly index: ArtifactDescriptor;
    readonly details: readonly ArtifactDescriptor[];
    readonly publishedDraftCount: number;
    readonly routeGraphCount: number;
    readonly reviewedRouteCount: 0;
  };
  readonly reports: Readonly<Record<string, ArtifactDescriptor>>;
  readonly extraction: SynthesisEvidenceExtractionManifest;
  readonly licenseNotice: {
    readonly ordData: string;
    readonly publisherTextRedistributed: false;
    readonly rawProviderPayloadsPublished: false;
    readonly extractionAssociationAuditsPublished: false;
    readonly resolvedSegmentRecordsPublished: false;
    readonly independentOrdStructureRedrawsPublished: true;
  };
}

interface PublicSynthesisShard {
  readonly schemaVersion: 1;
  readonly catalogSnapshotId: string;
  readonly pipelineVersion: string;
  readonly shardKey: string;
  readonly records: readonly SynthesisCoverageRecord[];
  readonly sourceEvidence: readonly SynthesisSourceEvidence[];
  readonly discovery: readonly unknown[];
}

interface PublicRouteIndexEntry extends Readonly<Record<string, unknown>> {
  readonly routeId: string;
  readonly publicationState: string;
  readonly detailPath: string | null;
}

interface CountReport extends Readonly<Record<string, unknown>> {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
}

const REQUIRED_REPORT_PATHS = {
  coverage: "/catalog/synthesis/reports/coverage.json",
  licensing: "/catalog/synthesis/reports/licensing.json",
  reviewQueue: "/catalog/synthesis/reports/review-queue.json",
  baselineCandidateSnapshot: "/catalog/synthesis/reports/baseline-candidate-snapshot.json",
  candidateTerminalization: "/catalog/synthesis/reports/candidate-terminalization.json",
  documentDedupe: "/catalog/synthesis/reports/document-dedupe.json",
  journalIdentityAudit: "/catalog/synthesis/reports/journal-identity-audit.json",
  moleculeBestOutcome: "/catalog/synthesis/reports/molecule-best-outcome.json",
  routeDistribution: "/catalog/synthesis/reports/route-distribution.json",
  licenseRights: "/catalog/synthesis/reports/license-rights.json",
  errorSummary: "/catalog/synthesis/reports/error-summary.json",
  ordResolution: "/catalog/synthesis/reports/ord-resolution.json",
  routeAssembly: "/catalog/synthesis/reports/route-assembly.json",
  migration: "/catalog/synthesis/reports/migration.json",
  validation: "/catalog/synthesis/reports/validation.json",
} as const;

const TERMINAL_EXTRACTION_OUTCOMES = SYNTHESIS_EXTRACTION_OUTCOMES.filter(
  (outcome) => outcome !== "unresolved",
);

const isObjectRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const numberRecord = (
  value: unknown,
  path: string,
): Readonly<Record<string, number>> => {
  if (!isObjectRecord(value)) throw new Error(`${path} must be a count object.`);
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (!Number.isSafeInteger(count) || (count as number) < 0) {
      throw new Error(`${path}.${key} must be a non-negative integer.`);
    }
    result[key] = count as number;
  }
  return result;
};

const assertExactCountKeys = (
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
): Readonly<Record<string, number>> => {
  const counts = numberRecord(value, path);
  const actual = Object.keys(counts).sort((left, right) => left.localeCompare(right, "en"));
  const expected = [...expectedKeys].sort((left, right) => left.localeCompare(right, "en"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${path} must contain every enum key exactly once.`);
  }
  return counts;
};

const sumCounts = (counts: Readonly<Record<string, number>>): number =>
  Object.values(counts).reduce((sum, count) => sum + count, 0);

const assertCountRecordsEqual = (
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
  path: string,
): void => {
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${path} count records disagree.`);
  }
};

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

const localArtifactUrl = (path: string): URL => {
  if (
    !path.startsWith("/catalog/synthesis/") ||
    path.includes("..") ||
    path.includes("\\")
  ) {
    throw new Error(`Unsafe synthesis artifact path: ${path}.`);
  }
  return new URL(`../../public${path}`, import.meta.url);
};

const readArtifact = async <T,>(descriptor: ArtifactDescriptor): Promise<{
  readonly value: T;
  readonly text: string;
}> => {
  const text = await readFile(localArtifactUrl(descriptor.path), "utf8");
  if (Buffer.byteLength(text) !== descriptor.byteLength || sha256(text) !== descriptor.sha256) {
    throw new Error(`Synthesis artifact digest mismatch: ${descriptor.path}.`);
  }
  return { value: JSON.parse(text) as T, text };
};

const uniqueEvidence = (
  values: readonly SynthesisSourceEvidence[],
): readonly SynthesisSourceEvidence[] => {
  const byId = new Map<string, SynthesisSourceEvidence>();
  for (const value of values) {
    const existing = byId.get(value.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(value)) {
      throw new Error(`Conflicting public synthesis evidence: ${value.id}.`);
    }
    byId.set(value.id, value);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id, "en"));
};

const assertNoRawPayload = (path: string, text: string): void => {
  for (const forbidden of [
    '"proto"',
    '"StringWithMarkup"',
    '"abstractText"',
    '"reactionCandidates"',
    '"inputs"',
    '"products"',
    '"workupsList"',
    '"conditions"',
    '"amount"',
    '"yield"',
  ]) {
    if (text.includes(forbidden)) {
      throw new Error(`Raw or operational provider payload leaked into ${path}: ${forbidden}.`);
    }
  }
};

const assertNoPendingIdentifierLeak = (path: string, text: string): void => {
  for (const forbidden of [
    "synthesis-atlas-step:",
    "synthesis-atlas-route:",
    "synthesis-atlas-material:",
    "synthesis-atlas-mechanism:",
    "synthesis-atlas-challenge:",
    "synthesis-route-step:",
    "synthesis-source-evidence:",
    "synthesis-challenge:",
    '"legacyRouteId"',
    '"canonicalRouteId"',
    '"legacyStepId"',
    '"blockedOrUnknownEvidence":',
  ]) {
    if (text.includes(forbidden)) {
      throw new Error(`Pending synthesis identifier leaked into ${path}: ${forbidden}.`);
    }
  }
};

export interface GeneratedSynthesisValidationSummary {
  readonly catalogSnapshotId: string;
  readonly coverageRecords: number;
  readonly evidenceRecords: number;
  readonly privateRouteAggregateCount: number;
  readonly publicAlphaDraftRoutes: number;
  readonly publicAlphaDraftGraphs: number;
  readonly shardCount: number;
  readonly warningCount: number;
  readonly errorCount: 0;
}

export const validateGeneratedSynthesisSnapshot = async (): Promise<GeneratedSynthesisValidationSummary> => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", synthesisPublicOutputUrl), "utf8"),
  ) as PublicSynthesisManifest;
  if (manifest.schemaVersion !== 1 || manifest.shardCount !== manifest.shards.length) {
    throw new Error("Generated synthesis manifest is malformed.");
  }
  const reportKeys = Object.keys(manifest.reports).sort((left, right) =>
    left.localeCompare(right, "en")
  );
  const requiredReportKeys = Object.keys(REQUIRED_REPORT_PATHS).sort((left, right) =>
    left.localeCompare(right, "en")
  );
  if (JSON.stringify(reportKeys) !== JSON.stringify(requiredReportKeys)) {
    throw new Error("Generated synthesis manifest report set is incomplete or contains an unexpected artifact.");
  }
  for (const [key, expectedPath] of Object.entries(REQUIRED_REPORT_PATHS)) {
    if (manifest.reports[key]?.path !== expectedPath) {
      throw new Error(`Generated synthesis report path drifted: ${key}.`);
    }
  }
  const extraction = manifest.extraction;
  if (
    extraction.schemaVersion !== 1 ||
    extraction.catalogSnapshotId !== manifest.catalogSnapshotId ||
    extraction.moleculeCount !== manifest.recordCount ||
    extraction.terminalAssociationCount !== extraction.candidateAssociationCount ||
    extraction.unresolvedFinalCount !== 0 ||
    extraction.exactLocatorMissingBaselineCount !==
      SYNTHESIS_CANDIDATE_BASELINE.exactLocatorMissingCandidates ||
    extraction.journalFallbackIdentityBaselineCount !==
      SYNTHESIS_CANDIDATE_BASELINE.journalFallbackIdentityAssociations ||
    extraction.currentExactLocatorMissingCount < 0 ||
    extraction.currentJournalFallbackIdentityCount < 0 ||
    extraction.resolvedSegmentRecordCount !== extraction.directSegmentCandidateCount ||
    extraction.directSegmentCandidateCount +
        extraction.insufficientOrdReactantIdentityCount +
        extraction.nonCovalentOrdTerminalCount +
        extraction.ordParseErrorCount !== extraction.ordDecodedFragmentCount ||
    !/^[a-f\d]{64}$/iu.test(extraction.assessmentSha256)
  ) {
    throw new Error("Generated synthesis extraction manifest violates terminalization consistency invariants.");
  }
  if (extraction.baselineComparisonState === "matched" && (
    extraction.moleculeCount !== SYNTHESIS_CANDIDATE_BASELINE.totalMolecules ||
    extraction.candidateBearingMoleculeCount !==
      SYNTHESIS_CANDIDATE_BASELINE.candidateBearingMolecules ||
    extraction.candidateAssociationCount !==
      SYNTHESIS_CANDIDATE_BASELINE.moleculeEvidenceMatches ||
    extraction.uniqueGlobalDocumentCount !==
      SYNTHESIS_CANDIDATE_BASELINE.uniqueEvidenceDocumentReactionCandidates ||
    extraction.currentExactLocatorMissingCount !==
      SYNTHESIS_CANDIDATE_BASELINE.exactLocatorMissingCandidates ||
    extraction.currentJournalFallbackIdentityCount !== 0 ||
    extraction.ordDecodedFragmentCount !== SYNTHESIS_CANDIDATE_BASELINE.decodedOrdFragments ||
    extraction.directSegmentCandidateCount !== 2_645 ||
    extraction.insufficientOrdReactantIdentityCount !== 919 ||
    extraction.nonCovalentOrdTerminalCount !== 418 ||
    extraction.ordParseErrorCount !== 0
  )) {
    throw new Error("Generated synthesis extraction drifted from the accepted v1 baseline.");
  }
  const records: SynthesisCoverageRecord[] = [];
  const evidenceValues: SynthesisSourceEvidence[] = [];
  for (const descriptor of manifest.shards) {
    const artifact = await readArtifact<PublicSynthesisShard>(descriptor);
    assertNoRawPayload(descriptor.path, artifact.text);
    assertNoPendingIdentifierLeak(descriptor.path, artifact.text);
    if (
      artifact.value.schemaVersion !== 1 ||
      artifact.value.catalogSnapshotId !== manifest.catalogSnapshotId ||
      artifact.value.pipelineVersion !== manifest.pipelineVersion ||
      artifact.value.shardKey !== descriptor.key ||
      artifact.value.records.length !== descriptor.recordCount ||
      artifact.value.discovery.length !== 0 ||
      artifact.value.sourceEvidence.length !== 0
    ) {
      throw new Error(`Synthesis shard metadata mismatch: ${descriptor.path}.`);
    }
    if (artifact.value.records.some((record) =>
      record.identityScope.inchiKey[0].toLocaleLowerCase("en") !== descriptor.key
    )) {
      throw new Error(`Synthesis shard identity mismatch: ${descriptor.path}.`);
    }
    records.push(...artifact.value.records);
    evidenceValues.push(...artifact.value.sourceEvidence);
  }
  records.sort((left, right) => left.id.localeCompare(right.id, "en"));
  const evidence = uniqueEvidence(evidenceValues);
  if (
    records.length !== manifest.recordCount ||
    evidence.length !== manifest.sourceEvidenceCount ||
    sha256(stableJson(records)) !== manifest.coverageSha256
  ) {
    throw new Error("Generated synthesis coverage count or digest does not match its manifest.");
  }
  if (
    records.some((record) =>
      record.evidenceDetailsRedacted !== true ||
      record.sourceEvidenceIds.length > 0 ||
      typeof record.reportedRouteFoundPendingReview !== "boolean"
    ) ||
    evidence.some((item) => item.documentId.startsWith("europe-pmc:"))
  ) {
    throw new Error("Public synthesis coverage leaked pending source identifiers or omitted redaction state.");
  }
  const aggregateExtractionOutcomes = Object.fromEntries(
    TERMINAL_EXTRACTION_OUTCOMES.map((outcome) => [outcome, 0]),
  ) as Record<string, number>;
  let aggregateCandidateAssociations = 0;
  let aggregateTerminalAssociations = 0;
  let aggregateAccessible = 0;
  let aggregateAccessBlocked = 0;
  let aggregateMetadataOnly = 0;
  let aggregateUnavailable = 0;
  let candidateBearingRecords = 0;
  for (const record of records) {
    const processing = record.evidenceProcessing;
    if (
      !processing ||
      processing.pipelineVersion !== extraction.pipelineVersion ||
      processing.completedAt !== extraction.generatedAt ||
      !SYNTHESIS_MOLECULE_BEST_OUTCOMES.includes(record.bestOutcome as never)
    ) {
      throw new Error(`Public synthesis extraction summary is incomplete: ${record.id}.`);
    }
    const outcomeCounts = assertExactCountKeys(
      processing.extractionOutcomeCounts,
      TERMINAL_EXTRACTION_OUTCOMES,
      `${record.id}.evidenceProcessing.extractionOutcomeCounts`,
    );
    if (
      processing.candidateAssociationCount !== processing.terminalAssociationCount ||
      sumCounts(outcomeCounts) !== processing.candidateAssociationCount ||
      processing.accessibleCount + processing.accessBlockedCount +
          processing.metadataOnlyCount + processing.unavailableCount !==
        processing.candidateAssociationCount
    ) {
      throw new Error(`Public synthesis extraction summary is not terminal: ${record.id}.`);
    }
    if (processing.candidateAssociationCount > 0) candidateBearingRecords += 1;
    aggregateCandidateAssociations += processing.candidateAssociationCount;
    aggregateTerminalAssociations += processing.terminalAssociationCount;
    aggregateAccessible += processing.accessibleCount;
    aggregateAccessBlocked += processing.accessBlockedCount;
    aggregateMetadataOnly += processing.metadataOnlyCount;
    aggregateUnavailable += processing.unavailableCount;
    for (const outcome of TERMINAL_EXTRACTION_OUTCOMES) {
      aggregateExtractionOutcomes[outcome] += outcomeCounts[outcome];
    }
    if (
      record.bestOutcome === "direct_complete_reported" &&
      !record.routes.some((route) =>
        (route.routeType === "patent_reported" || route.routeType === "literature_reported") &&
        route.routeCompleteness === "complete"
      )
    ) {
      throw new Error(`Public complete-route best outcome leaked without a public route: ${record.id}.`);
    }
    if (
      record.bestOutcome === "direct_partial_reported" &&
      !record.routes.some((route) =>
        route.routeType === "patent_reported" || route.routeType === "literature_reported"
      )
    ) {
      throw new Error(`Public partial-route best outcome leaked without a public route: ${record.id}.`);
    }
    if (
      record.bestOutcome === "teaching_reconstruction_complete" &&
      !record.routes.some((route) =>
        route.routeType === "teaching_reconstruction" &&
        route.routeCompleteness === "complete"
      )
    ) {
      throw new Error(`Public teaching-route best outcome leaked without a public route: ${record.id}.`);
    }
    if (
      record.bestOutcome === "teaching_reconstruction_partial" &&
      !record.routes.some((route) => route.routeType === "teaching_reconstruction")
    ) {
      throw new Error(`Public teaching-route best outcome leaked without a public route: ${record.id}.`);
    }
    if (
      record.bestOutcome === "no_supporting_source_resolved" &&
      (record.routes.length > 0 || record.sourceEvidenceIds.length > 0)
    ) {
      throw new Error(`No-support synthesis outcome retained active route/evidence identifiers: ${record.id}.`);
    }
  }
  if (
    aggregateCandidateAssociations !== extraction.candidateAssociationCount ||
    aggregateTerminalAssociations !== extraction.terminalAssociationCount ||
    candidateBearingRecords !== extraction.candidateBearingMoleculeCount
  ) {
    throw new Error("Public synthesis coverage summaries do not reproduce extraction totals.");
  }

  const routeIndexArtifact = await readArtifact<{
    readonly schemaVersion: 1;
    readonly routes: readonly PublicRouteIndexEntry[];
  }>(manifest.routes.index);
  assertNoRawPayload(manifest.routes.index.path, routeIndexArtifact.text);
  assertNoPendingIdentifierLeak(manifest.routes.index.path, routeIndexArtifact.text);
  if (
    routeIndexArtifact.value.routes.length !== manifest.routeCount ||
    routeIndexArtifact.value.routes.filter((route) => route.detailPath !== null).length !==
      manifest.routes.publishedDetailCount ||
    manifest.routes.details.length !== manifest.routes.publishedDetailCount ||
    manifest.routes.publishedDetailCount + manifest.routes.withheldDetailCount !==
      manifest.privateRouteAggregateCount
  ) {
    throw new Error("Generated synthesis route index does not match its manifest.");
  }
  const indexedDetailPaths = new Set(
    routeIndexArtifact.value.routes.flatMap((route) =>
      route.detailPath === null ? [] : [route.detailPath]
    ),
  );
  if (indexedDetailPaths.size !== manifest.routes.publishedDetailCount) {
    throw new Error("Generated synthesis route index contains duplicate detail paths.");
  }
  const routeIdByDetailPath = new Map(
    routeIndexArtifact.value.routes.flatMap((route) =>
      route.detailPath === null ? [] : [[route.detailPath, route.routeId] as const]
    ),
  );
  const publicRouteDetails: PublicSynthesisRouteDetailV1[] = [];
  for (const descriptor of manifest.routes.details) {
    if (!indexedDetailPaths.has(descriptor.path)) {
      throw new Error(`Published synthesis route detail is not indexed: ${descriptor.path}.`);
    }
    const artifact = await readArtifact<PublicSynthesisRouteDetailV1>(descriptor);
    assertNoRawPayload(descriptor.path, artifact.text);
    if (artifact.value.routeId !== routeIdByDetailPath.get(descriptor.path)) {
      throw new Error(`Published synthesis route detail identity mismatch: ${descriptor.path}.`);
    }
    publicRouteDetails.push(artifact.value);
  }
  const draftIndexArtifact = await readArtifact<{
    readonly schemaVersion: 1;
    readonly channel: string;
    readonly catalogSnapshotId: string;
    readonly generatedAt: string;
    readonly graphs: readonly (PublicAlphaSynthesisDraftReference & {
      readonly catalogEntityId: string;
      readonly pubChemCid: number;
      readonly inchiKey: string;
    })[];
  }>(manifest.drafts.index);
  if (
    manifest.drafts.channel !== "public_alpha_source_supported_draft" ||
    draftIndexArtifact.value.schemaVersion !== 1 ||
    draftIndexArtifact.value.channel !== manifest.drafts.channel ||
    draftIndexArtifact.value.catalogSnapshotId !== manifest.catalogSnapshotId ||
    draftIndexArtifact.value.generatedAt !== manifest.generatedAt ||
    draftIndexArtifact.value.graphs.length !== manifest.drafts.routeGraphCount ||
    manifest.drafts.details.length !== manifest.drafts.routeGraphCount ||
    manifest.drafts.reviewedRouteCount !== 0 ||
    draftIndexArtifact.value.graphs.reduce((sum, entry) => sum + entry.draftRouteCount, 0) !==
      manifest.drafts.publishedDraftCount
  ) {
    throw new Error("Public-alpha synthesis draft index does not match its manifest.");
  }
  const draftEntryByPath = new Map<string, (typeof draftIndexArtifact.value.graphs)[number]>(
    draftIndexArtifact.value.graphs.map((entry) => [entry.detailPath, entry] as const),
  );
  if (
    draftEntryByPath.size !== draftIndexArtifact.value.graphs.length ||
    new Set(draftIndexArtifact.value.graphs.map((entry) => entry.graphId)).size !==
      draftIndexArtifact.value.graphs.length ||
    new Set(manifest.drafts.details.map((detail) => detail.path)).size !==
      manifest.drafts.details.length
  ) throw new Error("Public-alpha synthesis draft descriptors are duplicated.");
  const recordsByCoverageId = new Map(records.map((record) => [record.id, record] as const));
  const publicDraftDetails: PublicAlphaSynthesisDraftGraph[] = [];
  for (const descriptor of manifest.drafts.details) {
    const entry = draftEntryByPath.get(descriptor.path);
    if (!entry) throw new Error(`Public-alpha draft detail is not indexed: ${descriptor.path}.`);
    const record = recordsByCoverageId.get(entry.coverageId);
    const reference = record?.publicAlphaDrafts?.find((item) => item.graphId === entry.graphId);
    if (!record || !reference || JSON.stringify(reference) !== JSON.stringify({
      schemaVersion: entry.schemaVersion,
      graphId: entry.graphId,
      channel: entry.channel,
      publicationState: entry.publicationState,
      reviewState: entry.reviewState,
      verifiedScientificClaim: entry.verifiedScientificClaim,
      coverageId: entry.coverageId,
      routeCompleteness: entry.routeCompleteness,
      draftRouteCount: entry.draftRouteCount,
      extractedStepCount: entry.extractedStepCount,
      teachingReconstructionCount: entry.teachingReconstructionCount,
      resolvedIntermediateCount: entry.resolvedIntermediateCount,
      unresolvedGapCount: entry.unresolvedGapCount,
      licenseState: entry.licenseState,
      detailPath: entry.detailPath,
    })) throw new Error(`Public-alpha draft coverage reference mismatch: ${descriptor.path}.`);
    const artifact = await readArtifact<unknown>(descriptor);
    const graph = validatePublicAlphaSynthesisDraftGraph(artifact.value, {
      catalogSnapshotId: manifest.catalogSnapshotId,
      catalogEntityId: record.identityScope.catalogEntityId,
      coverageId: record.id,
      preferredName: record.identityScope.preferredName,
      pubChemCid: record.identityScope.pubChemCid,
      inchiKey: record.identityScope.inchiKey,
      chemicalForm: record.identityScope.chemicalForm.normalizedKind,
      stereochemistrySpecified: record.identityScope.stereoisomer.specified,
    }, reference);
    publicDraftDetails.push(graph);
  }
  const coverageDraftReferences = records.flatMap((record) => record.publicAlphaDrafts ?? []);
  if (
    coverageDraftReferences.length !== manifest.drafts.routeGraphCount ||
    publicDraftDetails.length !== manifest.drafts.routeGraphCount ||
    coverageDraftReferences.reduce((sum, entry) => sum + entry.draftRouteCount, 0) !==
      manifest.drafts.publishedDraftCount
  ) throw new Error("Public-alpha synthesis graph coverage is incomplete or orphaned.");
  if (new Set(manifest.routes.details.map((detail) => detail.path)).size !==
      manifest.routes.details.length) {
    throw new Error("Generated synthesis route detail descriptors are duplicated.");
  }
  for (const descriptor of Object.values(manifest.reports)) {
    const artifact = await readArtifact<unknown>(descriptor);
    assertNoRawPayload(descriptor.path, artifact.text);
    assertNoPendingIdentifierLeak(descriptor.path, artifact.text);
  }
  const readReport = async (
    key: keyof typeof REQUIRED_REPORT_PATHS,
  ): Promise<Readonly<Record<string, unknown>>> => {
    const artifact = await readArtifact<CountReport>(manifest.reports[key]);
    if (
      artifact.value.schemaVersion !== 1 ||
      artifact.value.generatedAt !== manifest.generatedAt
    ) {
      throw new Error(`Generated synthesis report metadata drifted: ${key}.`);
    }
    return artifact.value;
  };
  const terminalizationReport = await readReport("candidateTerminalization");
  const terminalOutcomeCounts = assertExactCountKeys(
    terminalizationReport.byExtractionOutcome,
    TERMINAL_EXTRACTION_OUTCOMES,
    "candidateTerminalization.byExtractionOutcome",
  );
  const accessStateCounts = assertExactCountKeys(
    terminalizationReport.byAccessState,
    SYNTHESIS_EVIDENCE_ACCESS_STATES,
    "candidateTerminalization.byAccessState",
  );
  const candidateEvidenceStateCounts = assertExactCountKeys(
    terminalizationReport.bySourceEvidenceState,
    SYNTHESIS_CANDIDATE_SOURCE_EVIDENCE_STATES,
    "candidateTerminalization.bySourceEvidenceState",
  );
  const candidateRouteTypeCounts = assertExactCountKeys(
    terminalizationReport.byRouteType,
    ["none", ...SYNTHESIS_ROUTE_TYPES],
    "candidateTerminalization.byRouteType",
  );
  const candidateCompletenessCounts = assertExactCountKeys(
    terminalizationReport.byRouteCompleteness,
    SYNTHESIS_ROUTE_COMPLETENESS_STATES,
    "candidateTerminalization.byRouteCompleteness",
  );
  const candidateReviewCounts = assertExactCountKeys(
    terminalizationReport.byReviewState,
    SYNTHESIS_REVIEW_STATES,
    "candidateTerminalization.byReviewState",
  );
  const candidateApplicabilityCounts = assertExactCountKeys(
    terminalizationReport.byApplicability,
    SYNTHESIS_APPLICABILITY_STATES,
    "candidateTerminalization.byApplicability",
  );
  const candidateLicenseCounts = assertExactCountKeys(
    terminalizationReport.byLicenseState,
    SYNTHESIS_EVIDENCE_LICENSE_STATES,
    "candidateTerminalization.byLicenseState",
  );
  const candidateDimensionCounts = [
    terminalOutcomeCounts,
    accessStateCounts,
    candidateEvidenceStateCounts,
    candidateRouteTypeCounts,
    candidateCompletenessCounts,
    candidateReviewCounts,
    candidateApplicabilityCounts,
    candidateLicenseCounts,
  ];
  if (
    terminalizationReport.candidateAssociationCount !== extraction.candidateAssociationCount ||
    terminalizationReport.terminalAssociationCount !== extraction.terminalAssociationCount ||
    terminalizationReport.unresolvedFinalCount !== 0 ||
    candidateDimensionCounts.some((counts) =>
      sumCounts(counts) !== extraction.candidateAssociationCount
    )
  ) {
    throw new Error("Candidate terminalization report does not preserve all associations across dimensions.");
  }
  assertCountRecordsEqual(
    terminalOutcomeCounts,
    aggregateExtractionOutcomes,
    "candidateTerminalization/publicCoverage",
  );
  assertCountRecordsEqual(accessStateCounts, {
    accessible: aggregateAccessible,
    access_blocked: aggregateAccessBlocked,
    metadata_only: aggregateMetadataOnly,
    unavailable: aggregateUnavailable,
  }, "candidateTerminalization/publicCoverageAccess");

  const baselineReport = await readReport("baselineCandidateSnapshot");
  if (
    JSON.stringify(baselineReport.acceptedBaseline) !==
      JSON.stringify(SYNTHESIS_CANDIDATE_BASELINE) ||
    baselineReport.baselinePreservedWithoutOverwrite !== true ||
    !isObjectRecord(baselineReport.recomputed) ||
    baselineReport.recomputed.totalMolecules !== extraction.moleculeCount ||
    baselineReport.recomputed.candidateBearingMolecules !==
      extraction.candidateBearingMoleculeCount ||
    baselineReport.recomputed.moleculeEvidenceMatches !==
      extraction.candidateAssociationCount ||
    baselineReport.recomputed.uniqueEvidenceDocumentReactionCandidates !==
      extraction.uniqueGlobalDocumentCount ||
    baselineReport.recomputed.exactLocatorMissingCandidates !==
      extraction.currentExactLocatorMissingCount ||
    baselineReport.recomputed.currentActiveJournalFallbackIdentityAssociations !==
      extraction.currentJournalFallbackIdentityCount ||
    baselineReport.recomputed.decodedOrdFragments !== extraction.ordDecodedFragmentCount ||
    typeof baselineReport.recomputed.journalFallbackIdentityAssociations !== "number" ||
    typeof baselineReport.recomputed.ordFragmentBearingMolecules !== "number" ||
    (extraction.baselineComparisonState === "matched" && (
      baselineReport.recomputed.journalFallbackIdentityAssociations !==
        SYNTHESIS_CANDIDATE_BASELINE.journalFallbackIdentityAssociations ||
      baselineReport.recomputed.ordFragmentBearingMolecules !==
        SYNTHESIS_CANDIDATE_BASELINE.ordFragmentBearingMolecules
    ))
  ) {
    throw new Error("Accepted synthesis candidate baseline was not preserved or current counts were not recorded.");
  }

  const documentDedupeReport = await readReport("documentDedupe");
  if (
    documentDedupeReport.associationCount !== extraction.candidateAssociationCount ||
    documentDedupeReport.uniqueGlobalDocumentCount !== extraction.uniqueGlobalDocumentCount ||
    documentDedupeReport.crossMoleculeDocumentAssociationCount !==
      extraction.candidateAssociationCount - extraction.uniqueGlobalDocumentCount ||
    typeof documentDedupeReport.sameMoleculeDocumentDuplicateCount !== "number" ||
    (extraction.baselineComparisonState === "matched" &&
      documentDedupeReport.sameMoleculeDocumentDuplicateCount !== 0)
  ) {
    throw new Error("Synthesis document/molecule deduplication report drifted.");
  }

  const journalAuditReport = await readReport("journalIdentityAudit");
  const fallbackOutcomes = numberRecord(
    journalAuditReport.fallbackTerminalOutcomes,
    "journalIdentityAudit.fallbackTerminalOutcomes",
  );
  if (
    journalAuditReport.currentActiveFallbackIdentityCount !==
      extraction.currentJournalFallbackIdentityCount ||
    sumCounts(fallbackOutcomes) !== journalAuditReport.legacyFallbackIdentityCount ||
    journalAuditReport.officialNetworkAttemptCount !==
      journalAuditReport.openAccessLabelUniqueDocumentCount ||
    journalAuditReport.offlineProjectionCount !== 0 ||
    journalAuditReport.fullTextMarkupInspectionCount !==
      journalAuditReport.openAccessFullTextAccessibleCount ||
    journalAuditReport.oldFallbackRecordsPreservedInAudit !== true ||
    typeof journalAuditReport.normalizedNameIdentityCollisionCount !== "number" ||
    typeof journalAuditReport.normalizedNameIdentityCollisionKeyCount !== "number" ||
    typeof journalAuditReport.representativeStereoCollisionGuardPassed !== "boolean" ||
    (extraction.baselineComparisonState === "matched" && (
      journalAuditReport.legacyFallbackIdentityCount !==
        SYNTHESIS_CANDIDATE_BASELINE.journalFallbackIdentityAssociations ||
      fallbackOutcomes.superseded !==
        SYNTHESIS_CANDIDATE_BASELINE.journalFallbackIdentityAssociations ||
      journalAuditReport.openAccessLabelUniqueDocumentCount !== 428 ||
      journalAuditReport.officialNetworkAttemptCount !== 428 ||
      journalAuditReport.representativeStereoCollisionGuardPassed !== true
    ))
  ) {
    throw new Error("Synthesis journal identity correction/audit report drifted.");
  }

  const moleculeOutcomeReport = await readReport("moleculeBestOutcome");
  const moleculeOutcomeCounts = assertExactCountKeys(
    moleculeOutcomeReport.byBestOutcome,
    SYNTHESIS_MOLECULE_BEST_OUTCOMES,
    "moleculeBestOutcome.byBestOutcome",
  );
  if (
    moleculeOutcomeReport.moleculeCount !== manifest.recordCount ||
    moleculeOutcomeReport.mutuallyExclusive !== true ||
    moleculeOutcomeReport.totalEqualsCatalog !== true ||
    sumCounts(moleculeOutcomeCounts) !== manifest.recordCount ||
    stableJson(moleculeOutcomeCounts) !==
      stableJson(PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.moleculeBestOutcome) ||
    moleculeOutcomeReport.reportedRouteFoundPendingReviewCount !==
      records.filter((record) => record.reportedRouteFoundPendingReview).length ||
    (extraction.baselineComparisonState === "matched" &&
      moleculeOutcomeReport.reportedRouteFoundPendingReviewCount !== 3)
  ) {
    throw new Error("Molecule best-outcome report is not a mutually exclusive 1,552-record partition.");
  }

  const coverageReport = await readReport("coverage");
  const requestedOutcomes = coverageReport.requestedOutcomes as Readonly<Record<string, unknown>>;
  const evidenceBoundaryMetrics = coverageReport.evidenceBoundaryMetrics as Readonly<Record<string, unknown>>;
  if (
    requestedOutcomes.moleculesWithDirectReportedRoute !== 3 ||
    requestedOutcomes.reportedSynthesisNotResolved !== 1_549 ||
    evidenceBoundaryMetrics.resolvedDirectEvidenceRecords !== 3
  ) {
    throw new Error("Coverage report contradicts the privacy-safe pending-route aggregate.");
  }

  const routeDistributionReport = await readReport("routeDistribution");
  const routeTypeCounts = assertExactCountKeys(
    routeDistributionReport.byType,
    SYNTHESIS_ROUTE_TYPES,
    "routeDistribution.byType",
  );
  const routeCompletenessCounts = assertExactCountKeys(
    routeDistributionReport.byCompleteness,
    SYNTHESIS_ROUTE_COMPLETENESS_STATES,
    "routeDistribution.byCompleteness",
  );
  const routeReviewCounts = assertExactCountKeys(
    routeDistributionReport.byReviewState,
    SYNTHESIS_REVIEW_STATES,
    "routeDistribution.byReviewState",
  );
  const routeLicenseCounts = assertExactCountKeys(
    routeDistributionReport.byLicenseState,
    SYNTHESIS_LICENSE_STATES,
    "routeDistribution.byLicenseState",
  );
  assertExactCountKeys(
    routeDistributionReport.bySourceFamily,
    ["patent", "journal", "aggregator", "open_reaction_dataset"],
    "routeDistribution.bySourceFamily",
  );
  if (
    routeDistributionReport.scope !== "private_pending_aggregate" ||
    routeDistributionReport.routeDetailRecordsPublished !== false ||
    routeDistributionReport.routeCount !== manifest.privateRouteAggregateCount ||
    [routeTypeCounts, routeCompletenessCounts, routeReviewCounts, routeLicenseCounts]
      .some((counts) => sumCounts(counts) !== manifest.privateRouteAggregateCount) ||
    routeDistributionReport.pendingDirectSegmentsExcludedFromRouteCount !==
      extraction.directSegmentCandidateCount
  ) {
    throw new Error("Private pending synthesis route aggregate distribution drifted.");
  }

  const licensingReport = await readReport("licensing");
  if (
    licensingReport.routeLicenseStateScope !== "private_pending_aggregate" ||
    stableJson(licensingReport.routeLicenseStates) !==
      stableJson(PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.byLicenseState)
  ) {
    throw new Error("Licensing report contradicts the private route aggregate.");
  }

  const reviewQueueReport = await readReport("reviewQueue");
  const reviewPriorities = numberRecord(
    reviewQueueReport.countsByPriority,
    "reviewQueue.countsByPriority",
  );
  const reviewReasons = numberRecord(
    reviewQueueReport.countsByReason,
    "reviewQueue.countsByReason",
  );
  if (
    reviewPriorities.medium !== 946 ||
    reviewPriorities.low !== 291 ||
    reviewQueueReport.reviewRecordCount !== 1_237 ||
    reviewReasons.deterministic_random_sample !== 32 ||
    reviewReasons.migrated_route_pending_expert_review !== 3 ||
    reviewReasons.multiple_route_comparison_review !== 3
  ) {
    throw new Error("Review-queue aggregate drifted from the privacy-safe review attestation.");
  }

  const licenseRightsReport = await readReport("licenseRights");
  const licenseStateCounts = assertExactCountKeys(
    licenseRightsReport.byLicenseState,
    SYNTHESIS_EVIDENCE_LICENSE_STATES,
    "licenseRights.byLicenseState",
  );
  const copyrightCounts = assertExactCountKeys(
    licenseRightsReport.byCopyrightState,
    ["public_domain", "copyrighted", "unclear"],
    "licenseRights.byCopyrightState",
  );
  const redistributionCounts = assertExactCountKeys(
    licenseRightsReport.byRedistributionPermission,
    ["permitted", "permitted_with_attribution", "metadata_only", "prohibited", "unknown"],
    "licenseRights.byRedistributionPermission",
  );
  const paraphraseCounts = assertExactCountKeys(
    licenseRightsReport.byParaphrasePermission,
    ["permitted", "permitted_with_attribution", "metadata_only", "unknown"],
    "licenseRights.byParaphrasePermission",
  );
  const figureReuseCounts = assertExactCountKeys(
    licenseRightsReport.byFigureSchemeReusePermission,
    ["permitted", "permitted_with_attribution", "prohibited", "unknown"],
    "licenseRights.byFigureSchemeReusePermission",
  );
  if (
    licenseRightsReport.associationCount !== extraction.candidateAssociationCount ||
    [licenseStateCounts, copyrightCounts, redistributionCounts, paraphraseCounts, figureReuseCounts]
      .some((counts) => sumCounts(counts) !== extraction.candidateAssociationCount)
  ) {
    throw new Error("Synthesis rights report does not partition all candidate associations.");
  }

  const errorSummaryReport = await readReport("errorSummary");
  const errorOutcomeCounts = assertExactCountKeys(
    errorSummaryReport.byOutcome,
    ["parse_error", "retryable_error", "access_blocked"],
    "errorSummary.byOutcome",
  );
  if (
    errorSummaryReport.errorAssociationCount !== sumCounts(errorOutcomeCounts) ||
    errorSummaryReport.retryMetadataComplete !== true ||
    errorSummaryReport.rawErrorsOrSourceTextPublished !== false
  ) {
    throw new Error("Synthesis error report is incomplete or exposes raw error/source text.");
  }

  const ordResolutionReport = await readReport("ordResolution");
  if (
    ordResolutionReport.decodedFragmentCount !== extraction.ordDecodedFragmentCount ||
    ordResolutionReport.directSegmentCandidateCount !== extraction.directSegmentCandidateCount ||
    ordResolutionReport.insufficientReactantIdentityCount !==
      extraction.insufficientOrdReactantIdentityCount ||
    (ordResolutionReport.targetAlreadyInputCount as number) +
        (ordResolutionReport.targetConnectivityInputCount as number) !==
      extraction.nonCovalentOrdTerminalCount ||
    ordResolutionReport.parseErrorCount !== extraction.ordParseErrorCount ||
    ordResolutionReport.promotedCanonicalRouteCount !== 0 ||
    ordResolutionReport.reactionClassificationState !== "unclassified" ||
    ordResolutionReport.atomMappingState !== "not_mapped" ||
    typeof ordResolutionReport.exactTargetProductCount !== "number" ||
    ordResolutionReport.exactTargetProductCount > ordResolutionReport.decodedFragmentCount ||
    (extraction.baselineComparisonState === "matched" && (
      ordResolutionReport.exactTargetProductCount !==
        SYNTHESIS_CANDIDATE_BASELINE.decodedOrdFragments ||
      ordResolutionReport.priorProvisionalDirectSegmentCount !== 2_646 ||
      ordResolutionReport.identityHardenedDowngradeCount !== 1 ||
      ordResolutionReport.unparseableStructuredReactantIdentityDowngradeCount !== 1
    ))
  ) {
    throw new Error("Identity-hardened ORD resolution report drifted.");
  }
  const routeAssemblyReport = await readReport("routeAssembly");
  const routeAssemblySurfaceCounts = numberRecord(
    routeAssemblyReport.coverageSurfaceCounts,
    "routeAssembly.coverageSurfaceCounts",
  );
  if (
    routeAssemblyReport.pipelineVersion !== "synthesis-route-assembly-1.0.0" ||
    routeAssemblyReport.catalogCoverageCount !== manifest.recordCount ||
    routeAssemblyReport.directSourceSegmentsExamined !== extraction.directSegmentCandidateCount ||
    routeAssemblyReport.directSourceSegmentsAdmitted !== extraction.directSegmentCandidateCount ||
    routeAssemblyReport.directSourceSegmentsRejected !== 0 ||
    routeAssemblyReport.publicDraftRoutes !== manifest.drafts.publishedDraftCount ||
    routeAssemblyReport.partialRoutes !== manifest.drafts.publishedDraftCount ||
    routeAssemblyReport.routeGraphs !== manifest.drafts.routeGraphCount ||
    routeAssemblyReport.extractedSteps !== extraction.directSegmentCandidateCount ||
    routeAssemblyReport.reviewedRoutes !== 0 ||
    routeAssemblySurfaceCounts.public_draft_partial !== manifest.drafts.routeGraphCount ||
    routeAssemblySurfaceCounts.candidate_only !== 529 ||
    routeAssemblySurfaceCounts.no_supporting_source_resolved !== 384 ||
    sumCounts(routeAssemblySurfaceCounts) !== manifest.recordCount ||
    routeAssemblyReport.sourceLocatorCandidateDocumentsPromotedToSteps !== 0 ||
    !isObjectRecord(routeAssemblyReport.invariants) ||
    routeAssemblyReport.invariants.noNewDiscoveryPerformed !== true ||
    routeAssemblyReport.invariants.operationalDetailsPublished !== false ||
    routeAssemblyReport.invariants.pendingDisplayedAsReviewedOrVerified !== false
  ) throw new Error("Public-alpha synthesis route-assembly report drifted from its artifacts.");
  if (
    manifest.licenseNotice.publisherTextRedistributed !== false ||
    manifest.licenseNotice.rawProviderPayloadsPublished !== false ||
    manifest.licenseNotice.extractionAssociationAuditsPublished !== false ||
    manifest.licenseNotice.resolvedSegmentRecordsPublished !== false ||
    manifest.licenseNotice.independentOrdStructureRedrawsPublished !== true ||
    !manifest.licenseNotice.ordData.includes("CC-BY-SA-4.0")
  ) {
    throw new Error("Generated synthesis license notice is incomplete.");
  }

  const subjects = await loadSynthesisDiscoverySubjects();
  const expectedIdentities = subjects.map(createSynthesisIdentityScope);
  if (manifest.privateRouteAggregateCount !== PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.routeCount) {
    throw new Error("Private synthesis route aggregate count drifted from the public manifest aggregate.");
  }
  if (
    new Set(routeIndexArtifact.value.routes.map((route) => route.routeId)).size !==
      routeIndexArtifact.value.routes.length
  ) {
    throw new Error("Generated synthesis route index contains duplicate route IDs.");
  }
  if (routeIndexArtifact.value.routes.length > 0 || publicRouteDetails.length > 0) {
    throw new Error("Public synthesis output contains route identities or detail records.");
  }
  const issues: SynthesisValidationIssue[] = [
    ...validateSynthesisCoverageSnapshot(records, expectedIdentities, manifest, evidence),
    ...validateSynthesisCoverageRouteLinks(records, []),
  ];
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(`Generated synthesis validation failed: ${JSON.stringify(errors.slice(0, 20))}`);
  }
  return {
    catalogSnapshotId: manifest.catalogSnapshotId,
    coverageRecords: records.length,
    evidenceRecords: evidence.length,
    privateRouteAggregateCount: PUBLIC_SAFE_PRIVATE_ROUTE_AGGREGATE.routeCount,
    publicAlphaDraftRoutes: manifest.drafts.publishedDraftCount,
    publicAlphaDraftGraphs: manifest.drafts.routeGraphCount,
    shardCount: manifest.shardCount,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
    errorCount: 0,
  };
};
