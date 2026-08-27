import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import type { SynthesisCoverageRecord } from "../../lib/domain/synthesis-coverage";
import type {
  SynthesisIdentityScope,
  SynthesisSourceEvidence,
  SynthesisSourceEvidenceId,
} from "../../lib/domain/synthesis-route";
import {
  loadSynthesisDiscoverySubjects,
  type SynthesisDiscoverySubject,
} from "./catalog-input.mjs";
import type {
  SynthesisDiscoveryAdapterResult,
  SynthesisDiscoveryRunManifest,
  SynthesisReactionFragmentCandidate,
  SynthesisReactionFragmentParticipant,
  SynthesisDiscoverySubjectResult,
} from "./discovery-types.mjs";
import {
  aggregateLicenseState,
  runAllDiscoveryAdapters,
  SYNTHESIS_DISCOVERY_ADAPTERS,
} from "./source-adapters.mjs";

export const SYNTHESIS_DISCOVERY_PIPELINE_VERSION = "synthesis-discovery-1.0.1";
const COMPATIBLE_DISCOVERY_PIPELINE_VERSIONS = new Set([
  SYNTHESIS_DISCOVERY_PIPELINE_VERSION,
  "synthesis-discovery-1.0.0",
]);
export const synthesisDiscoveryWorkUrl = new URL(
  "../../work/synthesis-discovery/v1/",
  import.meta.url,
);

export interface DiscoverSynthesisCatalogOptions {
  readonly refresh?: boolean;
  readonly concurrency?: number;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
  readonly maxCandidatesPerAdapter?: number;
  readonly searchedAt?: string;
  readonly onProgress?: (progress: {
    readonly completed: number;
    readonly total: number;
    readonly cached: number;
    readonly subjectId: string;
  }) => void;
}

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const LEGACY_DISCOVERY_ADAPTERS = SYNTHESIS_DISCOVERY_ADAPTERS.map((adapter) =>
  adapter.id === "open-reaction-database"
    ? { ...adapter, version: "1.0.0" }
    : adapter
);

const configurationFor = (
  options: DiscoverSynthesisCatalogOptions,
  pipelineVersion = SYNTHESIS_DISCOVERY_PIPELINE_VERSION,
  adapters: readonly Readonly<Record<string, unknown>>[] = SYNTHESIS_DISCOVERY_ADAPTERS,
) => ({
  pipelineVersion,
  adapters,
  timeoutMs: options.timeoutMs ?? 20_000,
  maxRetries: options.maxRetries ?? 3,
  maxCandidatesPerAdapter: options.maxCandidatesPerAdapter ?? 10,
});

const configurationHashFor = (options: DiscoverSynthesisCatalogOptions): string =>
  sha256(JSON.stringify(configurationFor(options)));

const legacyConfigurationHashFor = (options: DiscoverSynthesisCatalogOptions): string =>
  sha256(JSON.stringify(configurationFor(
    options,
    "synthesis-discovery-1.0.0",
    LEGACY_DISCOVERY_ADAPTERS,
  )));

const subjectCacheUrl = (subject: SynthesisDiscoverySubject): URL =>
  new URL(`subjects/${subject.identity.inchiKey.toLowerCase()}.json`, synthesisDiscoveryWorkUrl);

const actualIdentifiersQueried = (
  subject: SynthesisDiscoverySubject,
  aliasesQueried: readonly string[],
): SynthesisCoverageRecord["sourceSearchScope"]["identifiersQueried"] => {
  const preferredName = subject.preferredName.trim();
  const preferredNormalized = preferredName.toLocaleLowerCase("en");
  const exactSmiles = subject.identity.isomericSmiles ?? subject.identity.canonicalSmiles;
  return [
    { kind: "preferred_name", value: preferredName },
    ...aliasesQueried
      .filter((alias) => alias.trim().toLocaleLowerCase("en") !== preferredNormalized)
      .map((alias) => ({ kind: "alias" as const, value: alias })),
    { kind: "pubchem_cid", value: String(subject.identity.pubChemCid) },
    {
      kind: subject.identity.isomericSmiles
        ? ("isomeric_smiles" as const)
        : ("canonical_smiles" as const),
      value: exactSmiles,
    },
  ];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const scopedEvidenceIdFor = (
  subject: SynthesisDiscoverySubject,
  evidence: SynthesisSourceEvidence,
): SynthesisSourceEvidenceId => {
  const pubChemAggregator = evidence.documentId.startsWith("pubchem-cid-");
  const namespace = pubChemAggregator
    ? "pubchem"
    : evidence.sourceKind === "open_reaction_dataset"
      ? "ord"
      : evidence.sourceKind === "patent"
        ? "patent"
        : "europe-pmc";
  const assertionIdentity = pubChemAggregator
    ? `${subject.identity.inchiKey}:${subject.identity.pubChemCid}:manufacturing`
    : `${subject.identity.inchiKey}:${evidence.documentId}`;
  return `synthesis-source-evidence:${namespace}:${sha256(assertionIdentity).slice(0, 24)}`;
};

const participantFromCached = (
  value: unknown,
): SynthesisReactionFragmentParticipant | null => {
  if (!isObject(value)) return null;
  const textOrNull = (candidate: unknown): string | null =>
    typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
  const role = typeof value.role === "string" && [
    "reactant",
    "reagent",
    "solvent",
    "catalyst",
    "workup",
    "product",
    "byproduct",
    "side_product",
    "unspecified",
  ].includes(value.role)
    ? value.role as SynthesisReactionFragmentParticipant["role"]
    : "unspecified";
  const name = textOrNull(value.name);
  const smiles = textOrNull(value.smiles);
  const inchi = textOrNull(value.inchi);
  const inchiKey = textOrNull(value.inchiKey);
  return {
    role,
    name,
    smiles,
    inchi,
    inchiKey,
    casNumber: textOrNull(value.casNumber),
    pubChemCid: textOrNull(value.pubChemCid),
    identityResolution: inchiKey
      ? "exact_inchi_key"
      : inchi
        ? "inchi"
        : smiles
          ? "structure_only"
          : name
            ? "name_only"
            : "unresolved",
  };
};

const ORD_CACHE_LIMITATIONS = [
  "An exact ORD product match is a discovery candidate, not a canonical synthesis route or a verified reported step.",
  "The original source and an exact human-resolvable source locator have not been resolved; scientific review is pending.",
  "Reaction class and bond changes were not inferred; atom mapping is unavailable.",
  "Operational quantities, conditions, workups, yields and procedures are intentionally omitted.",
  "This normalized fragment does not establish a complete upstream route to the catalog target.",
] as const;

const reactionCandidateFromCached = (
  value: unknown,
  evidenceIdByDocumentId: ReadonlyMap<string, SynthesisSourceEvidenceId>,
): SynthesisReactionFragmentCandidate | null => {
  if (!isObject(value)) return null;
  const provenanceValue = isObject(value.provenance) ? value.provenance : {};
  const reactionId = typeof value.reactionId === "string"
    ? value.reactionId
    : typeof provenanceValue.reactionId === "string"
      ? provenanceValue.reactionId
      : null;
  const datasetId = typeof value.datasetId === "string"
    ? value.datasetId
    : typeof provenanceValue.datasetId === "string"
      ? provenanceValue.datasetId
      : null;
  const inputs = Array.isArray(value.inputs)
    ? value.inputs.flatMap((item) => {
        const participant = participantFromCached(item);
        return participant ? [participant] : [];
      })
    : [];
  const products = Array.isArray(value.products)
    ? value.products.flatMap((item) => {
        const participant = participantFromCached(item);
        return participant ? [participant] : [];
      })
    : [];
  const decodeState = value.decodeState === "decoded" ||
      value.decodeState === "missing_proto" || value.decodeState === "decode_failed"
    ? value.decodeState
    : "decode_failed";
  const nullableText = (candidate: unknown): string | null =>
    typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
  return {
    schemaVersion: 1,
    candidateKind: "single_step_reaction_fragment",
    candidateState: "candidate",
    reviewState: "pending",
    decodeState,
    routeCompleteness:
      decodeState === "decoded" && inputs.length > 0 && products.length > 0
        ? "partial"
        : "upstream_gap",
    inputs,
    products,
    reactionClass: {
      taxonomyId: null,
      label: "Unclassified",
      normalizationState: "unclassified",
    },
    bondChanges: {
      mappingState: "not_mapped",
      formed: [],
      broken: [],
      orderChanged: [],
    },
    provenance: {
      datasetId,
      reactionId,
      doi: nullableText(provenanceValue.doi),
      patent: nullableText(provenanceValue.patent),
      publicationUrl: nullableText(provenanceValue.publicationUrl),
      isMined: typeof provenanceValue.isMined === "boolean"
        ? provenanceValue.isMined
        : null,
    },
    sourceEvidence: {
      evidenceId: reactionId ? evidenceIdByDocumentId.get(reactionId) ?? null : null,
      resolutionState: "candidate",
      sourceKind: "open_reaction_dataset",
    },
    licenseState: "attribution_required",
    reuseMode: "derived_facts_with_attribution",
    operationalDetailsIncluded: false,
    limitations: ORD_CACHE_LIMITATIONS,
  };
};

/** Upgrades the private v1.0.0 cache's audit projection without re-querying. */
const normalizeCachedSearchAudit = (
  cached: SynthesisDiscoverySubjectResult,
  configurationHash: string,
): SynthesisDiscoverySubjectResult => {
  const evidenceIdMap = new Map<SynthesisSourceEvidenceId, SynthesisSourceEvidenceId>();
  const normalizeEvidence = (evidence: SynthesisSourceEvidence): SynthesisSourceEvidence => {
    const id = scopedEvidenceIdFor(cached.subject, evidence);
    evidenceIdMap.set(evidence.id, id);
    return {
      ...evidence,
      id,
      sourceKind: evidence.documentId.startsWith("pubchem-cid-")
        ? "aggregator"
        : evidence.sourceKind,
    };
  };
  const evidence = cached.evidence.map(normalizeEvidence);
  const evidenceIdByDocumentId = new Map(
    evidence.map((item) => [item.documentId, item.id] as const),
  );
  const adapters: readonly SynthesisDiscoveryAdapterResult[] = cached.adapters.map((adapter) => {
    const definition = SYNTHESIS_DISCOVERY_ADAPTERS.find(
      (candidate) => candidate.id === adapter.adapterId,
    );
    const normalizedEvidence = adapter.evidence.map((item) => {
      const known = evidence.find((candidate) => candidate.documentId === item.documentId);
      return known ?? normalizeEvidence(item);
    });
    const metadata = adapter.adapterId === "open-reaction-database"
      ? {
          ...adapter.metadata,
          reactionCandidates: Array.isArray(adapter.metadata.reactionCandidates)
            ? adapter.metadata.reactionCandidates.flatMap((value) => {
                const candidate = reactionCandidateFromCached(value, evidenceIdByDocumentId);
                return candidate ? [candidate] : [];
              })
            : [],
        }
      : adapter.metadata;
    return {
      ...adapter,
      attempt: {
        ...adapter.attempt,
        provider: adapter.adapterId === "pubchem-manufacturing"
          ? "aggregator"
          : adapter.attempt.provider,
        adapterVersion: definition?.version ?? adapter.attempt.adapterVersion,
      },
      evidence: normalizedEvidence,
      metadata,
    };
  });
  return {
    ...cached,
    pipelineVersion: SYNTHESIS_DISCOVERY_PIPELINE_VERSION,
    configurationHash,
    evidence,
    adapters,
    coverage: {
      ...cached.coverage,
      identityScope: createSynthesisIdentityScope(cached.subject),
      // Cached discovery hits are still unresolved applicability assertions;
      // route/evidence promotion happens only in the canonical merge layer.
      applicability: "unclear",
      sourceEvidenceIds: cached.coverage.sourceEvidenceIds.map(
        (id) => evidenceIdMap.get(id) ?? id,
      ),
      sourceSearchScope: {
        ...cached.coverage.sourceSearchScope,
        pipelineVersion: SYNTHESIS_DISCOVERY_PIPELINE_VERSION,
        configurationHash,
        identifiersQueried: actualIdentifiersQueried(
          cached.subject,
          cached.coverage.sourceSearchScope.aliasesQueried,
        ),
        providers: adapters.map((adapter) => adapter.attempt),
      },
    },
  };
};

const writeJsonAtomic = async (url: URL, value: unknown): Promise<void> => {
  await mkdir(new URL("./", url), { recursive: true });
  const temporaryUrl = new URL(`${url.pathname}.tmp-${process.pid}`, "file://");
  await writeFile(temporaryUrl, stableJson(value), "utf8");
  await rename(temporaryUrl, url);
};

const readCachedSubject = async (
  subject: SynthesisDiscoverySubject,
  configurationHash: string,
  allowIncomplete = false,
  compatibleConfigurationHashes: readonly string[] = [],
): Promise<SynthesisDiscoverySubjectResult | null> => {
  try {
    const cached = JSON.parse(await readFile(subjectCacheUrl(subject), "utf8")) as
      SynthesisDiscoverySubjectResult;
    if (
      cached.schemaVersion !== 1 ||
      !COMPATIBLE_DISCOVERY_PIPELINE_VERSIONS.has(cached.pipelineVersion) ||
      ![configurationHash, ...compatibleConfigurationHashes].includes(
        cached.configurationHash,
      ) ||
      stableJson(cached.subject) !== stableJson(subject) ||
      cached.adapters.length !== SYNTHESIS_DISCOVERY_ADAPTERS.length
    ) {
      return null;
    }
    // A provider timeout must not become a permanently cached assessment. Normal
    // discovery reruns retry incomplete subjects while snapshot loading can still
    // inspect the recorded searching state after the run has finished.
    const normalized = normalizeCachedSearchAudit(cached, configurationHash);
    if (!allowIncomplete && normalized.coverage.assessmentState !== "assessed") {
      return null;
    }
    return normalized;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    return null;
  }
};

export function createSynthesisIdentityScope(
  subject: SynthesisDiscoverySubject,
): SynthesisIdentityScope {
  return {
  catalogEntityId: subject.catalogEntityId,
  preferredName: subject.preferredName,
  aliases: [...subject.aliases],
  casNumber: subject.sourceIdentity.casNumber,
  pubChemCid: subject.identity.pubChemCid,
  inchiKey: subject.identity.inchiKey,
  connectivityKey: subject.identity.connectivityKey,
  stereochemicalKey: subject.identity.stereochemicalAndProtonationKey,
  canonicalSmiles: subject.identity.canonicalSmiles,
  isomericSmiles: subject.identity.isomericSmiles,
  sourceFormSmiles: subject.formIdentity.sourceFormSmiles,
  parentEntity: {
    id: subject.parentResolution.catalogParentEntityId,
    relation: subject.parentResolution.catalogRelation,
    resolutionStatus: subject.parentResolution.catalogResolutionStatus,
    exactIdentity:
      subject.parentResolution.catalogRelation === "self"
        ? {
            catalogEntityId: subject.catalogEntityId,
            pubChemCid: subject.identity.pubChemCid,
            inchiKey: subject.identity.inchiKey,
          }
        : null,
    resolutionEvidenceIds: [],
  },
  chemicalForm: {
    id: subject.formIdentity.chemicalFormId,
    sourceKind: subject.formIdentity.kind,
    normalizedKind: "unresolved",
    componentCount: subject.formIdentity.componentCount,
    parentResolutionStatus:
      subject.parentResolution.chemicalFormParentResolutionStatus === "not-applicable"
        ? "not_applicable"
        : subject.parentResolution.chemicalFormParentResolutionStatus,
  },
  stereoisomer: {
    id: subject.stereochemistryIdentity.stereoisomerId,
    specified: subject.stereochemistryIdentity.specifiedInSourceInchi,
  },
  };
}

const uniqueEvidence = (
  evidence: readonly SynthesisSourceEvidence[],
): readonly SynthesisSourceEvidence[] =>
  [...new Map(evidence.map((item) => [item.id, item] as const)).values()].sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  );

const uniqueNames = (values: readonly string[]): readonly string[] => {
  const byNormalizedName = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.trim();
    const normalized = trimmed.toLocaleLowerCase("en");
    if (trimmed && !byNormalizedName.has(normalized)) {
      byNormalizedName.set(normalized, trimmed);
    }
  }
  return [...byNormalizedName.values()].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
};

export const discoverSynthesisSubject = async (
  subject: SynthesisDiscoverySubject,
  searchedAt: string,
  configurationHash: string,
  options: DiscoverSynthesisCatalogOptions,
): Promise<SynthesisDiscoverySubjectResult> => {
  const adapters = await runAllDiscoveryAdapters(subject, {
    searchedAt,
    timeoutMs: options.timeoutMs ?? 20_000,
    maxRetries: options.maxRetries ?? 3,
    maxCandidatesPerAdapter: options.maxCandidatesPerAdapter ?? 10,
  });
  const evidence = uniqueEvidence(adapters.flatMap((adapter) => adapter.evidence));
  const aliasesQueried = uniqueNames(
    adapters.flatMap((adapter) =>
      Array.isArray(adapter.metadata.queryNames)
        ? adapter.metadata.queryNames.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    ),
  );
  const everyProviderCompleted = adapters.every(
    (adapter) => adapter.attempt.status === "completed",
  );
  const directEvidence = evidence.filter((item) => item.resolutionState === "resolved");
  const candidateEvidence = evidence.filter((item) => item.resolutionState === "candidate");
  const assessmentState = everyProviderCompleted ? "assessed" : "searching";
  const sourceEvidenceState =
    directEvidence.length > 0
      ? "direct_source_resolved"
      : candidateEvidence.length > 0
        ? "candidate_sources"
        : "none_found";
  const completedAt = new Date().toISOString();
  const coverage: SynthesisCoverageRecord = {
    schemaVersion: 1,
    id: `synthesis-coverage:${subject.catalogEntityId}`,
    catalogSnapshotId: subject.sourceIdentity.snapshotId,
    identityScope: createSynthesisIdentityScope(subject),
    assessmentState,
    sourceEvidenceState,
    // Discovery alone does not establish that a name-, CID- or structure-hit
    // applies to the exact catalog form/stereoisomer. A later canonical route
    // merge may upgrade this only after resolved direct evidence is linked.
    applicability: "unclear",
    reviewState: "pending",
    licenseState: aggregateLicenseState(evidence),
    sourceSearchScope: {
      searchId: `synthesis-search:${subject.identity.inchiKey.toLowerCase()}`,
      pipelineVersion: SYNTHESIS_DISCOVERY_PIPELINE_VERSION,
      configurationHash,
      catalogSnapshotId: subject.sourceIdentity.snapshotId,
      startedAt: searchedAt,
      completedAt: everyProviderCompleted ? completedAt : null,
      aliasesQueried,
      identifiersQueried: actualIdentifiersQueried(subject, aliasesQueried),
      providers: adapters.map((adapter) => adapter.attempt),
      exhaustiveInternetSearch: false,
    },
    sourceEvidenceIds: evidence.map((item) => item.id),
    routes: [],
    unresolvedReasons: [
      sourceEvidenceState === "none_found"
        ? "Reported synthesis: Not resolved within the recorded automated search scope."
        : "Reported synthesis remains unresolved until an exact direct source and locator support a route.",
      "Free parent, salt, hydrate and solvate relationships remain unresolved unless separately source-backed.",
      "No validated retrosynthesis engine is configured; no computational route was fabricated.",
      ...(everyProviderCompleted
        ? []
        : ["One or more required discovery providers did not complete; this record remains searching."]),
    ],
    updatedAt: completedAt,
  };
  return {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_DISCOVERY_PIPELINE_VERSION,
    configurationHash,
    subject,
    coverage,
    evidence,
    adapters,
    completedAt,
  };
};

export interface SynthesisDiscoveryRunResult {
  readonly manifest: SynthesisDiscoveryRunManifest;
  readonly subjects: readonly SynthesisDiscoverySubjectResult[];
  readonly cachedSubjectCount: number;
}

export const discoverSynthesisCatalog = async (
  options: DiscoverSynthesisCatalogOptions = {},
): Promise<SynthesisDiscoveryRunResult> => {
  const subjects = await loadSynthesisDiscoverySubjects();
  const configurationHash = configurationHashFor(options);
  const legacyConfigurationHash = legacyConfigurationHashFor(options);
  const searchedAt = options.searchedAt ?? new Date().toISOString();
  const concurrency = options.concurrency ?? 4;
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error("Synthesis discovery concurrency must be an integer from 1 to 16.");
  }
  await mkdir(new URL("subjects/", synthesisDiscoveryWorkUrl), { recursive: true });

  const results = new Array<SynthesisDiscoverySubjectResult>(subjects.length);
  let cursor = 0;
  let completed = 0;
  let cached = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= subjects.length) return;
      const subject = subjects[index];
      let result = options.refresh
        ? null
        : await readCachedSubject(
            subject,
            configurationHash,
            false,
            [legacyConfigurationHash],
          );
      if (result) {
        cached += 1;
        // Persist any compatible private-cache upgrade so future runs and
        // forensic inspection share the same truthful query audit.
        await writeJsonAtomic(subjectCacheUrl(subject), result);
      } else {
        result = await discoverSynthesisSubject(
          subject,
          searchedAt,
          configurationHash,
          options,
        );
        await writeJsonAtomic(subjectCacheUrl(subject), result);
      }
      results[index] = result;
      completed += 1;
      options.onProgress?.({
        completed,
        total: subjects.length,
        cached,
        subjectId: subject.subjectId,
      });
    }
  });
  await Promise.all(workers);

  const runCompletedAt = new Date().toISOString();
  const manifest: SynthesisDiscoveryRunManifest = {
    schemaVersion: 1,
    runId: `synthesis-discovery-run:${searchedAt.replace(/[^0-9]/gu, "").slice(0, 14)}`,
    pipelineVersion: SYNTHESIS_DISCOVERY_PIPELINE_VERSION,
    configurationHash,
    catalogSnapshotId: subjects[0].sourceIdentity.snapshotId,
    subjectCount: subjects.length,
    completedSubjectCount: results.length,
    assessedSubjectCount: results.filter(
      (result) => result.coverage.assessmentState === "assessed",
    ).length,
    searchingSubjectCount: results.filter(
      (result) => result.coverage.assessmentState === "searching",
    ).length,
    startedAt: searchedAt,
    completedAt: runCompletedAt,
    adapters: SYNTHESIS_DISCOVERY_ADAPTERS,
  };
  await writeJsonAtomic(new URL("run-manifest.json", synthesisDiscoveryWorkUrl), manifest);
  return { manifest, subjects: results, cachedSubjectCount: cached };
};

export const loadCompletedSynthesisDiscovery = async (): Promise<SynthesisDiscoveryRunResult> => {
  const subjects = await loadSynthesisDiscoverySubjects();
  const manifest = JSON.parse(
    await readFile(new URL("run-manifest.json", synthesisDiscoveryWorkUrl), "utf8"),
  ) as SynthesisDiscoveryRunManifest;
  const catalogSnapshotId = subjects[0]?.sourceIdentity.snapshotId;
  if (
    manifest.schemaVersion !== 1 ||
    manifest.pipelineVersion !== SYNTHESIS_DISCOVERY_PIPELINE_VERSION ||
    manifest.catalogSnapshotId !== catalogSnapshotId ||
    manifest.subjectCount !== subjects.length ||
    manifest.completedSubjectCount !== subjects.length ||
    manifest.assessedSubjectCount !== subjects.length ||
    manifest.searchingSubjectCount !== 0 ||
    manifest.completedAt === null ||
    stableJson(manifest.adapters) !== stableJson(SYNTHESIS_DISCOVERY_ADAPTERS)
  ) {
    throw new Error(
      "Synthesis discovery release gate requires the current catalog, pipeline and 1,552 assessed records.",
    );
  }
  const results = await Promise.all(
    subjects.map(async (subject) => {
      const cached = await readCachedSubject(subject, manifest.configurationHash, true);
      if (!cached) throw new Error(`Missing synthesis discovery cache for ${subject.subjectId}.`);
      return cached;
    }),
  );
  if (
    results.length !== subjects.length ||
    results.some((result) =>
      result.configurationHash !== manifest.configurationHash ||
      result.coverage.assessmentState !== "assessed" ||
      result.coverage.sourceSearchScope.completedAt === null
    )
  ) {
    throw new Error("Synthesis discovery run is incomplete.");
  }
  return { manifest, subjects: results, cachedSubjectCount: results.length };
};
