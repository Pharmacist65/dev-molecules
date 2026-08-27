import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type {
  SynthesisCoverageRecord,
  SynthesisCoverageSnapshotManifest,
} from "../../lib/domain/synthesis-coverage";
import type {
  CanonicalSynthesisRoute,
  SynthesisSourceEvidence,
} from "../../lib/domain/synthesis-route";
import {
  getSynthesisRoutePublicationDecision,
  validateCanonicalSynthesisRoute,
  validateSynthesisCoverageRouteLinks,
  validateSynthesisCoverageSnapshot,
  type SynthesisValidationIssue,
} from "../../lib/domain/synthesis-validation";
import { loadSynthesisDiscoverySubjects } from "./catalog-input.mjs";
import { createSynthesisIdentityScope } from "./discover-catalog.mjs";
import { migrateLegacySynthesisRoutes } from "./migrate-legacy-routes.mjs";
import { synthesisPublicOutputUrl } from "./publish-snapshot.mjs";

interface ArtifactDescriptor {
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

interface PublicSynthesisManifest extends SynthesisCoverageSnapshotManifest {
  readonly routeCount: number;
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
  readonly reports: Readonly<Record<string, ArtifactDescriptor>>;
  readonly licenseNotice: {
    readonly ordData: string;
    readonly publisherTextRedistributed: false;
    readonly rawProviderPayloadsPublished: false;
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

export interface GeneratedSynthesisValidationSummary {
  readonly catalogSnapshotId: string;
  readonly coverageRecords: number;
  readonly evidenceRecords: number;
  readonly routeRecords: number;
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
  const records: SynthesisCoverageRecord[] = [];
  const evidenceValues: SynthesisSourceEvidence[] = [];
  for (const descriptor of manifest.shards) {
    const artifact = await readArtifact<PublicSynthesisShard>(descriptor);
    assertNoRawPayload(descriptor.path, artifact.text);
    if (
      artifact.value.schemaVersion !== 1 ||
      artifact.value.catalogSnapshotId !== manifest.catalogSnapshotId ||
      artifact.value.pipelineVersion !== manifest.pipelineVersion ||
      artifact.value.shardKey !== descriptor.key ||
      artifact.value.records.length !== descriptor.recordCount
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

  const routeIndexArtifact = await readArtifact<{
    readonly schemaVersion: 1;
    readonly routes: readonly PublicRouteIndexEntry[];
  }>(manifest.routes.index);
  assertNoRawPayload(manifest.routes.index.path, routeIndexArtifact.text);
  if (
    routeIndexArtifact.value.routes.length !== manifest.routeCount ||
    routeIndexArtifact.value.routes.filter((route) => route.detailPath !== null).length !==
      manifest.routes.publishedDetailCount ||
    manifest.routes.details.length !== manifest.routes.publishedDetailCount ||
    manifest.routes.publishedDetailCount + manifest.routes.withheldDetailCount !==
      manifest.routeCount
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
  const publicRouteDetails: CanonicalSynthesisRoute[] = [];
  for (const descriptor of manifest.routes.details) {
    if (!indexedDetailPaths.has(descriptor.path)) {
      throw new Error(`Published synthesis route detail is not indexed: ${descriptor.path}.`);
    }
    const artifact = await readArtifact<CanonicalSynthesisRoute>(descriptor);
    assertNoRawPayload(descriptor.path, artifact.text);
    if (artifact.value.id !== routeIdByDetailPath.get(descriptor.path)) {
      throw new Error(`Published synthesis route detail identity mismatch: ${descriptor.path}.`);
    }
    publicRouteDetails.push(artifact.value);
  }
  if (new Set(manifest.routes.details.map((detail) => detail.path)).size !==
      manifest.routes.details.length) {
    throw new Error("Generated synthesis route detail descriptors are duplicated.");
  }
  for (const descriptor of Object.values(manifest.reports)) {
    const artifact = await readArtifact<unknown>(descriptor);
    assertNoRawPayload(descriptor.path, artifact.text);
  }
  if (
    manifest.licenseNotice.publisherTextRedistributed !== false ||
    manifest.licenseNotice.rawProviderPayloadsPublished !== false ||
    !manifest.licenseNotice.ordData.includes("CC-BY-SA-4.0")
  ) {
    throw new Error("Generated synthesis license notice is incomplete.");
  }

  const subjects = await loadSynthesisDiscoverySubjects();
  const expectedIdentities = subjects.map(createSynthesisIdentityScope);
  const migration = await migrateLegacySynthesisRoutes({ subjects });
  const migrationRouteById = new Map(
    migration.routes.map((route) => [route.id, route] as const),
  );
  if (
    new Set(routeIndexArtifact.value.routes.map((route) => route.routeId)).size !==
      routeIndexArtifact.value.routes.length
  ) {
    throw new Error("Generated synthesis route index contains duplicate route IDs.");
  }
  for (const entry of routeIndexArtifact.value.routes) {
    const route = migrationRouteById.get(entry.routeId as CanonicalSynthesisRoute["id"]);
    if (!route) throw new Error(`Generated route index references unknown route ${entry.routeId}.`);
    const decision = getSynthesisRoutePublicationDecision(route, evidence);
    if (!decision.routeSummaryAllowed) {
      const safeKeys = new Set([
        "routeId",
        "reviewState",
        "licenseState",
        "publicationState",
        "blockerCodes",
        "detailPath",
      ]);
      const leakedKeys = Object.keys(entry).filter((key) => !safeKeys.has(key));
      if (
        leakedKeys.length > 0 ||
        entry.publicationState !== "withheld" ||
        entry.detailPath !== null ||
        entry.reviewState !== route.reviewState ||
        entry.licenseState !== route.licenseState
      ) {
        throw new Error(
          `Withheld synthesis route summary leaked gated fields: ${entry.routeId} (${leakedKeys.join(", ")}).`,
        );
      }
    } else if (
      entry.publicationState !== decision.presentation ||
      entry.routeType !== route.routeType ||
      entry.routeCompleteness !== route.routeCompleteness
    ) {
      throw new Error(`Published synthesis route summary drifted: ${entry.routeId}.`);
    }
  }
  const publiclyAllowedRoutes = migration.routes.filter(
    (route) => getSynthesisRoutePublicationDecision(route, evidence).routeSummaryAllowed,
  );
  const issues: SynthesisValidationIssue[] = [
    ...validateSynthesisCoverageSnapshot(records, expectedIdentities, manifest, evidence),
    ...validateSynthesisCoverageRouteLinks(records, publiclyAllowedRoutes),
    ...migration.routes.flatMap((route) => validateCanonicalSynthesisRoute(route, evidence)),
    ...publicRouteDetails.flatMap((route) => validateCanonicalSynthesisRoute(route, evidence)),
  ];
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(`Generated synthesis validation failed: ${JSON.stringify(errors.slice(0, 20))}`);
  }
  return {
    catalogSnapshotId: manifest.catalogSnapshotId,
    coverageRecords: records.length,
    evidenceRecords: evidence.length,
    routeRecords: migration.routes.length,
    shardCount: manifest.shardCount,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
    errorCount: 0,
  };
};
