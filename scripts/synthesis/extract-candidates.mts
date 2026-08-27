import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import type {
  SynthesisCandidateIdentityResolution,
  SynthesisEvidenceAccessState,
  SynthesisEvidenceAssociationAssessment,
  SynthesisEvidenceAssociationId,
  SynthesisEvidenceExtractionManifest,
  SynthesisEvidenceLicenseState,
  SynthesisEvidenceProcessingSummary,
  SynthesisEvidenceRightsAssessment,
  SynthesisResolvedReactionParticipant,
  SynthesisResolvedReactionSegment,
  TerminalSynthesisExtractionOutcome,
} from "../../lib/domain/synthesis-extraction";
import type {
  SynthesisCoverageId,
  SynthesisSourceEvidence,
  SynthesisSourceEvidenceId,
} from "../../lib/domain/synthesis-route";
import { loadAcceptedSynthesisDiscoveryBaseline } from "./discover-catalog.mjs";
import type {
  SynthesisDiscoverySubjectResult,
  SynthesisReactionFragmentCandidate,
  SynthesisReactionFragmentParticipant,
} from "./discovery-types.mjs";
import type { SynthesisDiscoveryRunResult } from "./discover-catalog.mjs";

export const SYNTHESIS_EXTRACTION_PIPELINE_VERSION = "synthesis-extraction-2.0.0";
export const synthesisExtractionWorkUrl = new URL(
  "../../work/synthesis-extraction/v2/",
  import.meta.url,
);

export const SYNTHESIS_CANDIDATE_BASELINE = Object.freeze({
  schemaVersion: 1 as const,
  snapshotName: "accepted-pre-extraction-baseline",
  totalMolecules: 1_552,
  candidateBearingMolecules: 1_279,
  moleculeEvidenceMatches: 14_897,
  uniqueEvidenceDocumentReactionCandidates: 14_616,
  exactLocatorMissingCandidates: 10_915,
  journalFallbackIdentityAssociations: 1_654,
  decodedOrdFragments: 3_982,
  ordFragmentBearingMolecules: 763,
});

interface IndigoMapStringString {
  set(key: string, value: string): void;
}

interface IndigoNoRenderModule {
  readonly MapStringString: new () => IndigoMapStringString;
  convert(structure: string, outputFormat: string, options: IndigoMapStringString): string;
  version(): string;
}

type IndigoFactory = () => Promise<IndigoNoRenderModule>;

interface OrdResolutionAudit {
  readonly state:
    | "direct_segment"
    | "target_already_input"
    | "target_connectivity_input"
    | "insufficient_reactant_identity"
    | "parse_error";
  readonly exactTargetProduct: boolean;
  readonly allReactantsStructureResolved: boolean;
  readonly targetInputRelationship:
    | "none"
    | "exact_identity"
    | "same_connectivity_other_form_or_stereo";
  readonly indigoVersion: string;
  readonly parseErrors: readonly string[];
  readonly providedOnlyReactantIdentityCount: number;
  readonly structuredButUnresolvedReactantIdentityCount: number;
  readonly missingStructureReactantIdentityCount: number;
  readonly resolvedReactants: readonly SynthesisResolvedReactionParticipant[];
  readonly resolvedProducts: readonly SynthesisResolvedReactionParticipant[];
}

export interface SynthesisOpenAccessAuditRecord {
  readonly schemaVersion: 1;
  readonly globalDocumentKey: string;
  readonly attemptedAt: string;
  readonly sourceDocumentId: string;
  readonly status:
    | "full_text_accessible"
    | "metadata_only_no_pmcid"
    | "access_blocked"
    | "retryable_error"
    | "unavailable";
  readonly pmcid: string | null;
  readonly fullTextSha256: string | null;
  readonly sectionCount: number;
  readonly figureCount: number;
  readonly officialNetworkAttempted: boolean;
  readonly offlineProjection: boolean;
  readonly markupInspectionAttempted: boolean;
  readonly routeExtractionState: "not_implemented";
  readonly parserName: "europe-pmc-fulltext-metadata-projection";
  readonly parserVersion: "1.0.0";
  readonly reactionMarkupCount: number;
  readonly chemicalMarkupCount: number;
  readonly locatorCandidateCount: number;
  readonly locatorCandidateIds: readonly string[];
  readonly retryCount: number;
  readonly exactError: string | null;
  readonly retryPolicy: string;
  readonly fullTextStored: false;
}

export interface SynthesisCandidateExtractionRunResult {
  readonly manifest: SynthesisEvidenceExtractionManifest;
  readonly assessments: readonly SynthesisEvidenceAssociationAssessment[];
  readonly summariesByCoverageId: ReadonlyMap<
    SynthesisCoverageId,
    SynthesisEvidenceProcessingSummary
  >;
  readonly documentDedupe: {
    readonly associationCount: number;
    readonly uniqueGlobalDocumentCount: number;
    readonly repeatedGlobalDocumentCount: number;
    readonly crossMoleculeDocumentAssociationCount: number;
    readonly sameMoleculeDocumentDuplicateCount: number;
  };
  readonly journalIdentityAudit: {
    readonly associationCount: number;
    readonly stableDocumentIdentityCount: number;
    readonly legacyFallbackIdentityCount: number;
    readonly currentActiveFallbackIdentityCount: number;
    readonly fallbackTerminalOutcomes: Readonly<Record<string, number>>;
    readonly preferredNameMatchCount: number;
    readonly aliasMatchCount: number;
    readonly ambiguousAliasCount: number;
    readonly normalizedNameIdentityCollisionCount: number;
    readonly normalizedNameIdentityCollisionKeyCount: number;
    readonly representativeStereoCollisionGuardPassed: boolean;
    readonly titleMismatchCount: number;
    readonly openAccessLabelAssociationCount: number;
    readonly openAccessLabelUniqueDocumentCount: number;
    readonly officialNetworkAttemptCount: number;
    readonly offlineProjectionCount: number;
    readonly fullTextMarkupInspectionCount: number;
    readonly openAccessFullTextAccessibleCount: number;
    readonly openAccessMetadataOnlyCount: number;
    readonly oldFallbackRecordsPreservedInAudit: true;
  };
  readonly ordAudit: {
    readonly decodedFragmentCount: number;
    readonly exactTargetProductCount: number;
    readonly directSegmentCandidateCount: number;
    readonly insufficientReactantIdentityCount: number;
    readonly targetAlreadyInputCount: number;
    readonly targetConnectivityInputCount: number;
    readonly parseErrorCount: number;
    readonly promotedCanonicalRouteCount: 0;
    readonly reactionClassificationState: "unclassified";
    readonly atomMappingState: "not_mapped";
    readonly mapperAvailableButNotApplied: true;
    readonly mappingReason: string;
    readonly indigoVersion: string;
    readonly priorProvisionalDirectSegmentCount: 2_646;
    readonly identityHardenedDowngradeCount: number;
    readonly providedOnlyReactantIdentityDowngradeCount: number;
    readonly unparseableStructuredReactantIdentityDowngradeCount: number;
    readonly identityHardeningReason: string;
  };
  readonly accessAudits: readonly SynthesisOpenAccessAuditRecord[];
  readonly resolvedSegments: readonly SynthesisResolvedReactionSegment[];
}

export interface ExtractSynthesisCandidatesOptions {
  readonly refreshOpenAccess?: boolean;
  readonly accessConcurrency?: number;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly attemptedAt?: string;
  readonly onProgress?: (progress: {
    readonly completed: number;
    readonly total: number;
    readonly phase: "open_access" | "terminalize";
  }) => void;
}

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const writeJsonAtomic = async (url: URL, value: unknown): Promise<void> => {
  await mkdir(new URL("./", url), { recursive: true });
  const temporaryUrl = new URL(`${url.pathname}.tmp-${process.pid}`, "file://");
  await writeFile(temporaryUrl, stableJson(value), "utf8");
  await rename(temporaryUrl, url);
};

const countBy = <T,>(
  values: readonly T[],
  keyFor: (value: T) => string,
): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")),
  );
};

const normalizedText = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

/** Preserve explicit stereochemical name qualifiers for identity matching. */
const stereoAwareNormalizedText = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en")
    .replace(/\(\s*-\s*\)/gu, " stereonegative ")
    .replace(/\(\s*\+\s*\)/gu, " stereopositive ")
    .replace(/\(\s*r\s*\)/gu, " stereor ")
    .replace(/\(\s*s\s*\)/gu, " stereos ")
    .replace(/\br\b/gu, " stereor ")
    .replace(/\bs\b/gu, " stereos ")
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

const collisionBaseName = (value: string): string =>
  normalizedText(value).replace(/^(?:r|s)\s+/u, "").trim();

type NormalizedNameIdentityCollisionIndex = ReadonlyMap<
  string,
  ReadonlySet<string>
>;

const exactIdentityKeyFor = (result: SynthesisDiscoverySubjectResult): string =>
  [
    result.subject.identity.inchiKey,
    result.subject.formIdentity.chemicalFormId,
    result.subject.stereochemistryIdentity.stereoisomerId,
  ].join("|");

const identityNamesFor = (
  result: SynthesisDiscoverySubjectResult,
): readonly string[] => [...new Set([
  result.subject.preferredName,
  ...result.subject.aliases,
  result.subject.sourceIdentity.approvalName,
  result.subject.sourceIdentity.inn,
  ...result.adapters.flatMap((adapter) =>
    Array.isArray(adapter.metadata.queryNames)
      ? adapter.metadata.queryNames.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : []
  ),
])];

const buildNormalizedNameIdentityCollisionIndex = (
  results: readonly SynthesisDiscoverySubjectResult[],
): NormalizedNameIdentityCollisionIndex => {
  const identitiesByName = new Map<string, Set<string>>();
  for (const result of results) {
    const identityKey = exactIdentityKeyFor(result);
    for (const name of identityNamesFor(result)) {
      const baseName = collisionBaseName(name);
      if (!baseName) continue;
      const identities = identitiesByName.get(baseName) ?? new Set<string>();
      identities.add(identityKey);
      identitiesByName.set(baseName, identities);
    }
  }
  return new Map(
    [...identitiesByName.entries()].filter(([, identities]) => identities.size > 1),
  );
};

const globalDocumentKeyFor = (evidence: SynthesisSourceEvidence): string =>
  `${evidence.sourceKind}:${evidence.documentId.trim().toLocaleLowerCase("en")}`;

const associationIdFor = (
  coverageId: SynthesisCoverageId,
  evidenceId: SynthesisSourceEvidenceId,
): SynthesisEvidenceAssociationId =>
  `synthesis-evidence-association:${sha256(`${coverageId}|${evidenceId}`).slice(0, 28)}`;

const ordSegmentIdFor = (
  coverageId: SynthesisCoverageId,
  evidenceId: SynthesisSourceEvidenceId,
): string => `ord-segment:${sha256(`${coverageId}|${evidenceId}`).slice(0, 32)}`;

const reactionCandidatesFor = (
  result: SynthesisDiscoverySubjectResult,
): ReadonlyMap<SynthesisSourceEvidenceId, SynthesisReactionFragmentCandidate> => {
  const adapter = result.adapters.find(
    (candidate) => candidate.adapterId === "open-reaction-database",
  );
  const candidates = Array.isArray(adapter?.metadata.reactionCandidates)
    ? adapter.metadata.reactionCandidates.filter(
        (candidate): candidate is SynthesisReactionFragmentCandidate =>
          Boolean(candidate) && typeof candidate === "object" &&
          "sourceEvidence" in candidate,
      )
    : [];
  return new Map(
    candidates.flatMap((candidate) =>
      candidate.sourceEvidence.evidenceId
        ? [[candidate.sourceEvidence.evidenceId, candidate] as const]
        : [],
    ),
  );
};

const loadIndigo = async (): Promise<IndigoNoRenderModule> => {
  const require = createRequire(import.meta.url);
  const factoryModule = require("indigo-ketcher/jsNoRender") as
    | IndigoFactory
    | { readonly default: IndigoFactory };
  const factory = typeof factoryModule === "function"
    ? factoryModule
    : factoryModule.default;
  return factory();
};

const inchiKeyFromParticipant = (
  participant: SynthesisReactionFragmentParticipant,
  indigo: IndigoNoRenderModule,
  smilesOptions: IndigoMapStringString,
  inchiOptions: IndigoMapStringString,
): {
  readonly key: string | null;
  readonly error: string | null;
  readonly method: "provided_unverified" | "computed" | "unresolved";
  readonly inputFormat: "smiles" | "inchi" | null;
} => {
  const providedKey = participant.inchiKey?.trim().toUpperCase() || null;
  const smiles = participant.smiles?.trim();
  const inchi = participant.inchi?.trim();
  const structure = smiles || inchi;
  const inputFormat = smiles ? "smiles" : inchi ? "inchi" : null;
  if (!structure || !inputFormat) {
    return providedKey
      ? {
          key: providedKey,
          error: null,
          method: "provided_unverified",
          inputFormat: null,
        }
      : { key: null, error: null, method: "unresolved", inputFormat: null };
  }
  try {
    const computedKey = indigo.convert(
      structure,
      "inchi-key",
      inputFormat === "smiles" ? smilesOptions : inchiOptions,
    ).trim();
    if (providedKey && providedKey !== computedKey) {
      return {
        key: null,
        error: `Cached InChIKey ${providedKey} disagrees with independently computed ${computedKey}.`,
        method: "unresolved",
        inputFormat,
      };
    }
    return {
      key: computedKey,
      error: null,
      method: "computed",
      inputFormat,
    };
  } catch (error) {
    return {
      key: null,
      error: error instanceof Error ? error.message : String(error),
      method: "unresolved",
      inputFormat,
    };
  }
};

const resolveOrdFragment = (
  result: SynthesisDiscoverySubjectResult,
  candidate: SynthesisReactionFragmentCandidate,
  indigo: IndigoNoRenderModule,
  smilesOptions: IndigoMapStringString,
  inchiOptions: IndigoMapStringString,
): OrdResolutionAudit => {
  const parseErrors: string[] = [];
  const productConversions = candidate.products.map((participant) => {
    const converted = inchiKeyFromParticipant(
      participant,
      indigo,
      smilesOptions,
      inchiOptions,
    );
    if (converted.error) parseErrors.push(converted.error);
    return converted;
  });
  const productKeys = productConversions.map((converted) => converted.key);
  const exactTargetProduct = productConversions.some((converted) =>
    converted.method === "computed" &&
    converted.key === result.subject.identity.inchiKey
  );
  if (!exactTargetProduct) {
    return {
      state: "parse_error",
      exactTargetProduct: false,
      allReactantsStructureResolved: false,
      targetInputRelationship: "none",
      indigoVersion: indigo.version(),
      parseErrors: [
        ...parseErrors,
        "The cached exact-output query could not be independently reproduced as an exact target InChIKey.",
      ],
      providedOnlyReactantIdentityCount: 0,
      structuredButUnresolvedReactantIdentityCount: 0,
      missingStructureReactantIdentityCount: 0,
      resolvedReactants: [],
      resolvedProducts: [],
    };
  }
  const reactants = candidate.inputs.filter((participant) => participant.role === "reactant");
  const reactantConversions = reactants.map((participant) => {
    const converted = inchiKeyFromParticipant(
      participant,
      indigo,
      smilesOptions,
      inchiOptions,
    );
    if (converted.error) parseErrors.push(converted.error);
    return converted;
  });
  const reactantKeys = reactantConversions.map((converted) => converted.key);
  const exactInput = reactantConversions.some((converted) =>
    converted.method === "computed" &&
    converted.key === result.subject.identity.inchiKey
  );
  const connectivityInput = reactantConversions.some(
    (converted) => converted.method === "computed" &&
      converted.key?.split("-")[0] === result.subject.identity.connectivityKey,
  );
  const allReactantsStructureResolved = reactants.length > 0 &&
    reactantConversions.every((converted) =>
      converted.method === "computed" && Boolean(converted.key)
    );
  const providedOnlyReactantIdentityCount = reactantConversions.filter(
    (converted) => converted.method === "provided_unverified",
  ).length;
  const structuredButUnresolvedReactantIdentityCount = reactants.filter(
    (participant, index) =>
      Boolean(participant.smiles?.trim() || participant.inchi?.trim()) &&
      reactantConversions[index].method === "unresolved",
  ).length;
  const missingStructureReactantIdentityCount = reactants.filter(
    (participant) => !participant.smiles?.trim() && !participant.inchi?.trim(),
  ).length;
  const resolvedParticipant = (
    participant: SynthesisReactionFragmentParticipant,
    key: string | null,
    method: "provided_unverified" | "computed" | "unresolved",
    inputFormat: "smiles" | "inchi" | null,
    role: "reactant" | "product",
  ): SynthesisResolvedReactionParticipant | null => {
    const smiles = participant.smiles?.trim();
    const inchi = participant.inchi?.trim();
    const structure = smiles || inchi;
    if (!key || !structure || !inputFormat || method !== "computed") return null;
    return {
      role,
      name: participant.name,
      structure,
      structureFormat: inputFormat,
      smiles: smiles || null,
      inchi: inchi || null,
      inchiKey: key,
      identityResolution: "exact_inchi_key_computed",
      cachedInchiKeyState: participant.inchiKey?.trim()
        ? "matched_computation"
        : "not_provided",
      resolverName: "Indigo",
      resolverVersion: indigo.version(),
      resolverInputFormat: inputFormat,
    };
  };
  return {
    state: exactInput
      ? "target_already_input"
      : connectivityInput
        ? "target_connectivity_input"
        : allReactantsStructureResolved
          ? "direct_segment"
          : "insufficient_reactant_identity",
    exactTargetProduct: true,
    allReactantsStructureResolved,
    targetInputRelationship: exactInput
      ? "exact_identity"
      : connectivityInput
        ? "same_connectivity_other_form_or_stereo"
        : "none",
    indigoVersion: indigo.version(),
    parseErrors,
    providedOnlyReactantIdentityCount,
    structuredButUnresolvedReactantIdentityCount,
    missingStructureReactantIdentityCount,
    resolvedReactants: reactants.flatMap((participant, index) => {
      const converted = reactantConversions[index];
      const resolved = resolvedParticipant(
        participant,
        reactantKeys[index],
        converted.method,
        converted.inputFormat,
        "reactant",
      );
      return resolved ? [resolved] : [];
    }),
    resolvedProducts: candidate.products.flatMap((participant, index) => {
      const converted = productConversions[index];
      if (
        converted.method !== "computed" ||
        productKeys[index] !== result.subject.identity.inchiKey
      ) return [];
      const resolved = resolvedParticipant(
        participant,
        productKeys[index],
        converted.method,
        converted.inputFormat,
        "product",
      );
      return resolved ? [resolved] : [];
    }),
  };
};

const rightsFor = (evidence: SynthesisSourceEvidence): {
  readonly licenseState: SynthesisEvidenceLicenseState;
  readonly rights: SynthesisEvidenceRightsAssessment;
} => {
  if (evidence.sourceKind === "open_reaction_dataset") {
    return {
      licenseState: "amber",
      rights: {
        copyrightState: "copyrighted",
        redistributionPermission: "permitted_with_attribution",
        paraphrasePermission: "permitted_with_attribution",
        figureSchemeReusePermission: "unknown",
        openAccessLabelOnly: false,
      },
    };
  }
  const openAccessLabelOnly = evidence.sourceKind === "journal" &&
    evidence.licenseState === "unknown";
  return {
    licenseState: evidence.licenseState === "restricted" ? "red" :
      openAccessLabelOnly || evidence.licenseState === "unknown" ||
        evidence.licenseState === "mixed"
        ? "hold"
        : "amber",
    rights: {
      copyrightState: evidence.sourceKind === "patent" ? "unclear" : "copyrighted",
      redistributionPermission: "metadata_only",
      paraphrasePermission: "metadata_only",
      figureSchemeReusePermission: "unknown",
      openAccessLabelOnly,
    },
  };
};

const queryNamesFor = (
  result: SynthesisDiscoverySubjectResult,
  evidence: SynthesisSourceEvidence,
): readonly string[] => {
  const adapter = result.adapters.find((candidate) =>
    candidate.evidence.some((item) => item.id === evidence.id)
  );
  const providerNames = Array.isArray(adapter?.metadata.queryNames)
    ? adapter.metadata.queryNames.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];
  return [...new Set([
    result.subject.preferredName,
    ...result.subject.aliases,
    ...providerNames,
  ])];
};

const AMBIGUOUS_ALIASES = new Set([
  "ace",
  "acid",
  "act",
  "ado",
  "ala",
  "all",
  "ana",
  "art",
  "atp",
  "b12",
  "cat",
  "dmf",
  "dms",
  "dna",
  "epa",
  "gaba",
  "iron",
  "lead",
  "met",
  "nad",
  "peg",
  "rna",
  "salt",
  "tin",
  "urea",
]);

const titleIdentityFor = (
  result: SynthesisDiscoverySubjectResult,
  evidence: SynthesisSourceEvidence,
  collisionIndex: NormalizedNameIdentityCollisionIndex,
): {
  readonly state: SynthesisCandidateIdentityResolution["titleIdentity"];
  readonly matchedName: string | null;
  readonly collisionKey: string | null;
} => {
  if (evidence.sourceKind === "open_reaction_dataset" || evidence.sourceKind === "aggregator") {
    return { state: "not_applicable", matchedName: null, collisionKey: null };
  }
  const title = stereoAwareNormalizedText(evidence.title);
  const preferredAware = stereoAwareNormalizedText(result.subject.preferredName);
  const names = queryNamesFor(result, evidence)
    .map((rawName) => ({
      rawName,
      awareName: stereoAwareNormalizedText(rawName),
      baseName: collisionBaseName(rawName),
    }))
    .filter(({ awareName, baseName }) => awareName.length > 1 && baseName.length > 1)
    .sort((left, right) => right.awareName.length - left.awareName.length);

  for (const name of names) {
    if (!title.includes(name.awareName)) continue;
    const collision = collisionIndex.has(name.baseName);
    const carriesIdentityQualifier = name.awareName !== name.baseName;
    if (collision && !carriesIdentityQualifier) {
      return {
        state: "ambiguous_alias",
        matchedName: name.baseName,
        collisionKey: name.baseName,
      };
    }
    if (name.baseName.length < 5 || AMBIGUOUS_ALIASES.has(name.baseName)) {
      return {
        state: "ambiguous_alias",
        matchedName: name.baseName,
        collisionKey: collision ? name.baseName : null,
      };
    }
    return {
      state: name.awareName === preferredAware ? "preferred_name" : "alias",
      matchedName: name.baseName,
      collisionKey: null,
    };
  }

  const collidedBaseMatch = names.find(({ baseName }) =>
    collisionIndex.has(baseName) && title.includes(baseName)
  );
  if (collidedBaseMatch) {
    return {
      state: "ambiguous_alias",
      matchedName: collidedBaseMatch.baseName,
      collisionKey: collidedBaseMatch.baseName,
    };
  }
  return { state: "mismatch", matchedName: null, collisionKey: null };
};

const DIRECT_SYNTHESIS_TERMS = /\b(?:synthesi[sz]|prepar(?:ation|e|ing)|manufactur(?:e|ing)|process)\b/iu;
const NON_ROUTE_CONTEXT = /\b(?:analog(?:ue)?s?|derivatives?|inhibitors?|biosynthesi[sz]|metaboli[sz]|formulations?|nanoparticles?|nanoemulsions?|loaded|coated|conjugates?|complexes?|probe|drug release|antibody synthesis|protein synthesis|rna synthesis|dna synthesis|fatty acid synthesis|cholesterol synthesis)\b/iu;

const titleRouteRelevance = (
  evidence: SynthesisSourceEvidence,
  matchedName: string | null,
): "plausible" | "irrelevant" => {
  const title = normalizedText(evidence.title);
  if (!matchedName || !DIRECT_SYNTHESIS_TERMS.test(title)) return "irrelevant";
  if (NON_ROUTE_CONTEXT.test(title)) return "irrelevant";
  const directPatterns = [
    `synthesis of ${matchedName}`,
    `preparation of ${matchedName}`,
    `prepare ${matchedName}`,
    `process for ${matchedName}`,
    `manufacture of ${matchedName}`,
    `${matchedName} synthesis`,
    `${matchedName} preparation`,
    `synthesis ${matchedName}`,
    `preparation ${matchedName}`,
  ];
  return directPatterns.some((pattern) => title.includes(pattern))
    ? "plausible"
    : "irrelevant";
};

const accessAuditCacheUrl = (globalDocumentKey: string): URL =>
  new URL(
    `open-access/${sha256(globalDocumentKey).slice(0, 32)}.json`,
    synthesisExtractionWorkUrl,
  );

const readAccessAudit = async (
  globalDocumentKey: string,
): Promise<SynthesisOpenAccessAuditRecord | null> => {
  try {
    const parsed = JSON.parse(
      await readFile(accessAuditCacheUrl(globalDocumentKey), "utf8"),
    ) as SynthesisOpenAccessAuditRecord;
    return parsed.schemaVersion === 1 &&
        parsed.globalDocumentKey === globalDocumentKey &&
        typeof parsed.officialNetworkAttempted === "boolean" &&
        typeof parsed.offlineProjection === "boolean" &&
        typeof parsed.markupInspectionAttempted === "boolean" &&
        parsed.routeExtractionState === "not_implemented"
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const wait = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchTextWithRetry = async (
  url: URL,
  timeoutMs: number,
  maxRetries: number,
): Promise<{ readonly text: string; readonly retryCount: number }> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json, application/xml, text/xml",
          "User-Agent": "Molevren-Synthesis-Extraction/2.0 (official OA metadata/fulltext audit)",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} from ${url.origin}`);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }
      return { text: await response.text(), retryCount: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) await wait(300 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Open-access request failed.");
};

const pmcidFromSearch = (payload: string): string | null => {
  try {
    const parsed = JSON.parse(payload) as {
      readonly resultList?: { readonly result?: readonly { readonly pmcid?: string }[] };
    };
    return parsed.resultList?.result?.find((item) => item.pmcid)?.pmcid ?? null;
  } catch {
    return null;
  }
};

const createAccessAudit = async (
  globalDocumentKey: string,
  evidence: SynthesisSourceEvidence,
  attemptedAt: string,
  timeoutMs: number,
  maxRetries: number,
): Promise<SynthesisOpenAccessAuditRecord> => {
  const retryPolicy = `official-europe-pmc-only; maxRetries=${maxRetries}; exponential-backoff`;
  let totalRetries = 0;
  try {
    let pmcid = evidence.documentId.toLocaleLowerCase("en").startsWith("pmcid:")
      ? evidence.documentId.slice("pmcid:".length).toUpperCase()
      : null;
    if (!pmcid) {
      const [kind, ...valueParts] = evidence.documentId.split(":");
      const value = valueParts.join(":");
      if (kind !== "doi" && kind !== "pmid") {
        return {
          schemaVersion: 1,
          globalDocumentKey,
          attemptedAt,
          sourceDocumentId: evidence.documentId,
          status: "unavailable",
          pmcid: null,
          fullTextSha256: null,
          sectionCount: 0,
          figureCount: 0,
          retryCount: 0,
          exactError: "No stable DOI, PMID or PMCID was available for official full-text resolution.",
          retryPolicy,
          officialNetworkAttempted: true,
          offlineProjection: false,
          markupInspectionAttempted: false,
          routeExtractionState: "not_implemented",
          parserName: "europe-pmc-fulltext-metadata-projection",
          parserVersion: "1.0.0",
          reactionMarkupCount: 0,
          chemicalMarkupCount: 0,
          locatorCandidateCount: 0,
          locatorCandidateIds: [],
          fullTextStored: false,
        };
      }
      const searchUrl = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
      searchUrl.searchParams.set(
        "query",
        kind === "doi" ? `DOI:"${value}"` : `EXT_ID:${value}`,
      );
      searchUrl.searchParams.set("format", "json");
      searchUrl.searchParams.set("pageSize", "1");
      searchUrl.searchParams.set("resultType", "core");
      const search = await fetchTextWithRetry(searchUrl, timeoutMs, maxRetries);
      totalRetries += search.retryCount;
      pmcid = pmcidFromSearch(search.text);
    }
    if (!pmcid) {
      return {
        schemaVersion: 1,
        globalDocumentKey,
        attemptedAt,
        sourceDocumentId: evidence.documentId,
        status: "metadata_only_no_pmcid",
        pmcid: null,
        fullTextSha256: null,
        sectionCount: 0,
        figureCount: 0,
        retryCount: totalRetries,
        exactError: null,
        retryPolicy,
        officialNetworkAttempted: true,
        offlineProjection: false,
        markupInspectionAttempted: false,
        routeExtractionState: "not_implemented",
        parserName: "europe-pmc-fulltext-metadata-projection",
        parserVersion: "1.0.0",
        reactionMarkupCount: 0,
        chemicalMarkupCount: 0,
        locatorCandidateCount: 0,
        locatorCandidateIds: [],
        fullTextStored: false,
      };
    }
    const fullTextUrl = new URL(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/${encodeURIComponent(pmcid)}/fullTextXML`,
    );
    const fullText = await fetchTextWithRetry(fullTextUrl, timeoutMs, maxRetries);
    totalRetries += fullText.retryCount;
    const locatorCandidateIds = [
      ...fullText.text.matchAll(/<(?:sec|fig)\b[^>]*\bid=["']([^"']+)["']/giu),
    ].map((match) => match[1]).filter(Boolean);
    return {
      schemaVersion: 1,
      globalDocumentKey,
      attemptedAt,
      sourceDocumentId: evidence.documentId,
      status: "full_text_accessible",
      pmcid,
      fullTextSha256: sha256(fullText.text),
      sectionCount: (fullText.text.match(/<sec(?:\s|>)/gu) ?? []).length,
      figureCount: (fullText.text.match(/<fig(?:\s|>)/gu) ?? []).length,
      retryCount: totalRetries,
      exactError: null,
      retryPolicy,
      officialNetworkAttempted: true,
      offlineProjection: false,
      markupInspectionAttempted: true,
      routeExtractionState: "not_implemented",
      parserName: "europe-pmc-fulltext-metadata-projection",
      parserVersion: "1.0.0",
      reactionMarkupCount: (fullText.text.match(/<reaction(?:\s|>)/giu) ?? []).length,
      chemicalMarkupCount:
        (fullText.text.match(/<(?:chem-struct|named-content\b[^>]*content-type=["']chemical)[^>]*>/giu) ?? []).length,
      locatorCandidateCount: locatorCandidateIds.length,
      locatorCandidateIds,
      fullTextStored: false,
    };
  } catch (error) {
    const exactError = error instanceof Error ? error.message : String(error);
    const status = (error as Error & { status?: number }).status;
    return {
      schemaVersion: 1,
      globalDocumentKey,
      attemptedAt,
      sourceDocumentId: evidence.documentId,
      status: status === 401 || status === 403
        ? "access_blocked"
        : /HTTP 404/u.test(exactError)
          ? "unavailable"
          : "retryable_error",
      pmcid: null,
      fullTextSha256: null,
      sectionCount: 0,
      figureCount: 0,
      retryCount: maxRetries,
      exactError,
      retryPolicy,
      officialNetworkAttempted: true,
      offlineProjection: false,
      markupInspectionAttempted: false,
      routeExtractionState: "not_implemented",
      parserName: "europe-pmc-fulltext-metadata-projection",
      parserVersion: "1.0.0",
      reactionMarkupCount: 0,
      chemicalMarkupCount: 0,
      locatorCandidateCount: 0,
      locatorCandidateIds: [],
      fullTextStored: false,
    };
  }
};

const loadOrAuditOpenAccess = async (
  discovery: SynthesisDiscoveryRunResult,
  options: ExtractSynthesisCandidatesOptions,
  generatedAt: string,
): Promise<readonly SynthesisOpenAccessAuditRecord[]> => {
  const documents = new Map<string, SynthesisSourceEvidence>();
  for (const result of discovery.subjects) {
    for (const evidence of result.evidence) {
      if (
        evidence.sourceKind === "journal" &&
        evidence.licenseState === "unknown" &&
        !evidence.documentId.startsWith("europe-pmc:")
      ) {
        documents.set(globalDocumentKeyFor(evidence), evidence);
      }
    }
  }
  const entries = [...documents.entries()].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  );
  const results = new Array<SynthesisOpenAccessAuditRecord>(entries.length);
  let cursor = 0;
  let completed = 0;
  const concurrency = options.accessConcurrency ?? 2;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= entries.length) return;
      const [globalDocumentKey, evidence] = entries[index];
      let audit = options.refreshOpenAccess
        ? null
        : await readAccessAudit(globalDocumentKey);
      if (!audit) {
        if (options.refreshOpenAccess) {
          audit = await createAccessAudit(
            globalDocumentKey,
            evidence,
            generatedAt,
            options.timeoutMs ?? 15_000,
            options.maxRetries ?? 2,
          );
          await writeJsonAtomic(accessAuditCacheUrl(globalDocumentKey), audit);
          await wait(550);
        } else {
          audit = {
            schemaVersion: 1,
            globalDocumentKey,
            attemptedAt: generatedAt,
            sourceDocumentId: evidence.documentId,
            status: "metadata_only_no_pmcid",
            pmcid: null,
            fullTextSha256: null,
            sectionCount: 0,
            figureCount: 0,
            retryCount: 0,
            exactError:
              "Official OA full-text resolution was not refreshed in this offline deterministic run.",
            retryPolicy: "Run extraction with refreshOpenAccess=true to query official Europe PMC endpoints.",
            officialNetworkAttempted: false,
            offlineProjection: true,
            markupInspectionAttempted: false,
            routeExtractionState: "not_implemented",
            parserName: "europe-pmc-fulltext-metadata-projection",
            parserVersion: "1.0.0",
            reactionMarkupCount: 0,
            chemicalMarkupCount: 0,
            locatorCandidateCount: 0,
            locatorCandidateIds: [],
            fullTextStored: false,
          };
        }
      }
      results[index] = audit;
      completed += 1;
      options.onProgress?.({
        completed,
        total: entries.length,
        phase: "open_access",
      });
    }
  });
  await Promise.all(workers);
  return results;
};

const fullTerminalOutcomeCounts = (
  assessments: readonly SynthesisEvidenceAssociationAssessment[],
): Record<TerminalSynthesisExtractionOutcome, number> => {
  const counts: Record<TerminalSynthesisExtractionOutcome, number> = {
    resolved: 0,
    irrelevant: 0,
    identity_mismatch: 0,
    access_blocked: 0,
    insufficient_detail: 0,
    parse_error: 0,
    retryable_error: 0,
    duplicate: 0,
    superseded: 0,
  };
  for (const assessment of assessments) counts[assessment.extractionOutcome] += 1;
  return counts;
};

interface ClassifiedAssociation {
  readonly accessState: SynthesisEvidenceAccessState;
  readonly extractionOutcome: TerminalSynthesisExtractionOutcome;
  readonly sourceEvidenceState: "candidate" | "direct_segment";
  readonly routeCompleteness: "unknown";
  readonly applicability: "applicable" | "unclear";
  readonly identityResolution: SynthesisCandidateIdentityResolution;
  readonly exactLocatorResolved: boolean;
  readonly extractedSegmentId: string | null;
  readonly reasonCodes: readonly string[];
  readonly retry: SynthesisEvidenceAssociationAssessment["retry"];
}

/**
 * Access is an independent observation about the source document. It must not
 * be inferred from (or overwritten by) the chemistry/identity extraction
 * outcome for the molecule-document association.
 */
export const deriveSynthesisEvidenceAccessState = (
  evidence: SynthesisSourceEvidence,
  accessAudit: SynthesisOpenAccessAuditRecord | null,
): SynthesisEvidenceAccessState => {
  if (evidence.sourceKind === "open_reaction_dataset") return "accessible";
  if (
    evidence.sourceKind === "journal" &&
    evidence.documentId.startsWith("europe-pmc:")
  ) return "unavailable";
  switch (accessAudit?.status) {
    case "full_text_accessible":
      return "accessible";
    case "access_blocked":
      return "access_blocked";
    case "retryable_error":
    case "unavailable":
      return "unavailable";
    case "metadata_only_no_pmcid":
    case undefined:
      return "metadata_only";
  }
};

const classifyAssociation = (
  result: SynthesisDiscoverySubjectResult,
  evidence: SynthesisSourceEvidence,
  ord: OrdResolutionAudit | null,
  accessAudit: SynthesisOpenAccessAuditRecord | null,
  collisionIndex: NormalizedNameIdentityCollisionIndex,
): ClassifiedAssociation => {
  const fallbackDocument = evidence.sourceKind === "journal" &&
    evidence.documentId.startsWith("europe-pmc:");
  const independentAccessState = deriveSynthesisEvidenceAccessState(evidence, accessAudit);
  const titleIdentity = titleIdentityFor(result, evidence, collisionIndex);
  const exactScopedAggregator = evidence.sourceKind === "aggregator" &&
    evidence.documentId ===
      `pubchem-cid-${result.subject.identity.pubChemCid}-manufacturing`;
  const baseIdentity: SynthesisCandidateIdentityResolution = {
    molecularIdentity: exactScopedAggregator
      ? "exact_inchi_key"
      : evidence.sourceKind === "open_reaction_dataset"
      ? "unresolved"
      : titleIdentity.state === "preferred_name" || titleIdentity.state === "alias"
        ? "name_only"
        : titleIdentity.state === "ambiguous_alias"
          ? "unresolved"
          : "mismatch",
    documentIdentity: fallbackDocument
      ? "fallback_identifier_missing"
      : evidence.documentId.trim()
        ? "stable_identifier"
        : "unresolved",
    titleIdentity: titleIdentity.state,
    formIdentity: exactScopedAggregator ? "exact" : "unclear",
    stereochemistry: exactScopedAggregator ? "exact" : "unclear",
    method: exactScopedAggregator
      ? "Exact catalog PubChem CID scoped manufacturing metadata retrieval"
      : "deterministic metadata identity and extraction gate",
    toolName: null,
    toolVersion: null,
    confidence: null,
  };
  if (evidence.sourceKind === "open_reaction_dataset") {
    if (!ord) {
      return {
        accessState: "unavailable",
        extractionOutcome: "parse_error",
        sourceEvidenceState: "candidate",
        routeCompleteness: "unknown",
        applicability: "unclear",
        identityResolution: baseIdentity,
        exactLocatorResolved: Boolean(evidence.locator?.value),
        extractedSegmentId: null,
        reasonCodes: ["ord_normalized_fragment_missing"],
        retry: null,
      };
    }
    const exactIdentity: SynthesisCandidateIdentityResolution = {
      molecularIdentity: "exact_structure_computed",
      documentIdentity: "stable_identifier",
      titleIdentity: "not_applicable",
      formIdentity: "exact",
      stereochemistry: "exact",
      method: "Exact product InChIKey computed locally from cached ORD product structure",
      toolName: "Indigo",
      toolVersion: ord.indigoVersion,
      confidence: 1,
    };
    if (ord.state === "direct_segment") {
      return {
        accessState: "accessible",
        extractionOutcome: "resolved",
        sourceEvidenceState: "direct_segment",
        routeCompleteness: "unknown",
        applicability: "applicable",
        identityResolution: exactIdentity,
        exactLocatorResolved: Boolean(evidence.locator?.value),
        extractedSegmentId: ordSegmentIdFor(result.coverage.id, evidence.id),
        reasonCodes: [
          "exact_target_product_identity_resolved",
          "all_reactant_structures_resolved",
          "ord_segment_pending_source_and_chemistry_review",
          "reaction_class_unclassified",
          "atom_mapping_not_applied",
        ],
        retry: null,
      };
    }
    if (ord.state === "target_already_input" || ord.state === "target_connectivity_input") {
      return {
        accessState: "accessible",
        extractionOutcome: "irrelevant",
        sourceEvidenceState: "candidate",
        routeCompleteness: "unknown",
        applicability: "unclear",
        identityResolution: exactIdentity,
        exactLocatorResolved: Boolean(evidence.locator?.value),
        extractedSegmentId: null,
        reasonCodes: [
          ord.state === "target_already_input"
            ? "target_already_present_as_reactant"
            : "target_connectivity_present_as_other_form_or_stereo_input",
          "non_covalent_or_form_transition_not_promoted",
        ],
        retry: null,
      };
    }
    if (ord.state === "insufficient_reactant_identity") {
      return {
        accessState: "accessible",
        extractionOutcome: "insufficient_detail",
        sourceEvidenceState: "candidate",
        routeCompleteness: "unknown",
        applicability: "unclear",
        identityResolution: exactIdentity,
        exactLocatorResolved: Boolean(evidence.locator?.value),
        extractedSegmentId: null,
        reasonCodes: [
          "exact_target_product_identity_resolved",
          "one_or_more_reactant_structures_unresolved",
          ...(ord.providedOnlyReactantIdentityCount > 0
            ? ["provided_only_reactant_identity_not_accepted"]
            : []),
          ...(ord.structuredButUnresolvedReactantIdentityCount > 0
            ? ["independent_reactant_structure_identity_computation_failed"]
            : []),
          ...(ord.missingStructureReactantIdentityCount > 0
            ? ["reactant_structure_missing"]
            : []),
          "not_promoted_to_direct_segment",
        ],
        retry: null,
      };
    }
    return {
      accessState: "accessible",
      extractionOutcome: "parse_error",
      sourceEvidenceState: "candidate",
      routeCompleteness: "unknown",
      applicability: "unclear",
      identityResolution: baseIdentity,
      exactLocatorResolved: Boolean(evidence.locator?.value),
      extractedSegmentId: null,
      reasonCodes: ["ord_identity_normalization_parse_error"],
      retry: null,
    };
  }
  if (fallbackDocument) {
    return {
      accessState: "unavailable",
      extractionOutcome: "superseded",
      sourceEvidenceState: "candidate",
      routeCompleteness: "unknown",
      applicability: "unclear",
      identityResolution: baseIdentity,
      exactLocatorResolved: false,
      extractedSegmentId: null,
      reasonCodes: [
        "legacy_europe_pmc_fallback_document_identity_missing",
        "legacy_source_kind_or_unstable_document_identity",
        "empty_article_url_eliminated_from_future_adapter",
        "corrected_adapter_excludes_candidate",
        "legacy_candidate_preserved_for_audit_only",
      ],
      retry: null,
    };
  }
  if (titleIdentity.state === "ambiguous_alias" || titleIdentity.state === "mismatch") {
    return {
      accessState: independentAccessState,
      extractionOutcome: "identity_mismatch",
      sourceEvidenceState: "candidate",
      routeCompleteness: "unknown",
      applicability: "unclear",
      identityResolution: baseIdentity,
      exactLocatorResolved: false,
      extractedSegmentId: null,
      reasonCodes: [
        titleIdentity.state === "ambiguous_alias"
          ? titleIdentity.collisionKey
            ? "normalized_name_exact_identity_collision"
            : "ambiguous_alias_collision"
          : "title_identity_mismatch",
      ],
      retry: null,
    };
  }
  if (
    (evidence.sourceKind === "journal" || evidence.sourceKind === "patent") &&
    titleRouteRelevance(evidence, titleIdentity.matchedName) === "irrelevant"
  ) {
    return {
      accessState: independentAccessState,
      extractionOutcome: "irrelevant",
      sourceEvidenceState: "candidate",
      routeCompleteness: "unknown",
      applicability: "unclear",
      identityResolution: baseIdentity,
      exactLocatorResolved: false,
      extractedSegmentId: null,
      reasonCodes: ["title_context_not_direct_target_synthesis"],
      retry: null,
    };
  }
  if (accessAudit?.status === "access_blocked") {
    return {
      accessState: "access_blocked",
      extractionOutcome: "access_blocked",
      sourceEvidenceState: "candidate",
      routeCompleteness: "unknown",
      applicability: "unclear",
      identityResolution: baseIdentity,
      exactLocatorResolved: false,
      extractedSegmentId: null,
      reasonCodes: ["official_source_access_blocked"],
      retry: null,
    };
  }
  if (accessAudit?.status === "retryable_error") {
    return {
      accessState: "unavailable",
      extractionOutcome: "retryable_error",
      sourceEvidenceState: "candidate",
      routeCompleteness: "unknown",
      applicability: "unclear",
      identityResolution: baseIdentity,
      exactLocatorResolved: false,
      extractedSegmentId: null,
      reasonCodes: ["official_source_access_retryable_error"],
      retry: {
        retryCount: accessAudit.retryCount,
        lastAttemptedAt: accessAudit.attemptedAt,
        exactError: accessAudit.exactError ?? "Unspecified official-source access error.",
        retryPolicy: accessAudit.retryPolicy,
        pipelineVersion: SYNTHESIS_EXTRACTION_PIPELINE_VERSION,
      },
    };
  }
  return {
    accessState: independentAccessState,
    extractionOutcome: "insufficient_detail",
    sourceEvidenceState: "candidate",
    routeCompleteness: "unknown",
    applicability: "unclear",
    identityResolution: baseIdentity,
    exactLocatorResolved: false,
    extractedSegmentId: null,
    reasonCodes: [
      accessAudit?.status === "full_text_accessible"
        ? "full_text_accessible_but_no_structure_resolved_route_segment"
        : "metadata_only_no_exact_step_or_route_locator",
    ],
    retry: null,
  };
};

const assertBaseline = (computed: {
  readonly moleculeCount: number;
  readonly candidateBearingMoleculeCount: number;
  readonly associationCount: number;
  readonly uniqueDocumentCount: number;
  readonly locatorMissingCount: number;
  readonly fallbackJournalCount: number;
  readonly ordCount: number;
  readonly ordMoleculeCount: number;
}): void => {
  const expected = SYNTHESIS_CANDIDATE_BASELINE;
  const checks: readonly [string, number, number][] = [
    ["total molecules", computed.moleculeCount, expected.totalMolecules],
    ["candidate-bearing molecules", computed.candidateBearingMoleculeCount, expected.candidateBearingMolecules],
    ["candidate associations", computed.associationCount, expected.moleculeEvidenceMatches],
    ["unique documents/reactions", computed.uniqueDocumentCount, expected.uniqueEvidenceDocumentReactionCandidates],
    ["missing locators", computed.locatorMissingCount, expected.exactLocatorMissingCandidates],
    ["journal fallback identities", computed.fallbackJournalCount, expected.journalFallbackIdentityAssociations],
    ["decoded ORD fragments", computed.ordCount, expected.decodedOrdFragments],
    ["ORD-bearing molecules", computed.ordMoleculeCount, expected.ordFragmentBearingMolecules],
  ];
  for (const [label, actual, wanted] of checks) {
    if (actual !== wanted) {
      throw new Error(`Accepted synthesis baseline drift for ${label}: ${actual} != ${wanted}.`);
    }
  }
};

export const extractSynthesisEvidenceCandidates = async (
  options: ExtractSynthesisCandidatesOptions = {},
): Promise<SynthesisCandidateExtractionRunResult> => {
  const discovery = await loadAcceptedSynthesisDiscoveryBaseline();
  const generatedAt = options.attemptedAt ?? new Date().toISOString();
  const candidateEntries = discovery.subjects.flatMap((result) =>
    result.evidence
      .filter((evidence) => evidence.resolutionState === "candidate")
      .map((evidence) => ({ result, evidence })),
  );
  const documentGroups = Map.groupBy(candidateEntries, ({ evidence }) =>
    globalDocumentKeyFor(evidence)
  );
  const sameMoleculeDocumentKeys = candidateEntries.map(({ result, evidence }) =>
    `${result.coverage.id}|${globalDocumentKeyFor(evidence)}`
  );
  const sameMoleculeDocumentDuplicateCount = sameMoleculeDocumentKeys.length -
    new Set(sameMoleculeDocumentKeys).size;
  const ordEntries = candidateEntries.filter(
    ({ evidence }) => evidence.sourceKind === "open_reaction_dataset",
  );
  const recomputedBaseline = {
    moleculeCount: discovery.subjects.length,
    candidateBearingMoleculeCount: discovery.subjects.filter((result) =>
      result.evidence.some((evidence) => evidence.resolutionState === "candidate")
    ).length,
    associationCount: candidateEntries.length,
    uniqueDocumentCount: documentGroups.size,
    locatorMissingCount: candidateEntries.filter(({ evidence }) => !evidence.locator).length,
    fallbackJournalCount: candidateEntries.filter(({ evidence }) =>
      evidence.sourceKind === "journal" && evidence.documentId.startsWith("europe-pmc:")
    ).length,
    ordCount: ordEntries.length,
    ordMoleculeCount: new Set(ordEntries.map(({ result }) => result.coverage.id)).size,
  };
  const baselineComparisonState = discovery.manifest.pipelineVersion ===
      "synthesis-discovery-1.0.1"
    ? "matched" as const
    : "new_pipeline_counts_recorded" as const;
  if (baselineComparisonState === "matched") assertBaseline(recomputedBaseline);

  const accessAudits = await loadOrAuditOpenAccess(discovery, options, generatedAt);
  const accessByDocument = new Map(
    accessAudits.map((audit) => [audit.globalDocumentKey, audit] as const),
  );
  const indigo = await loadIndigo();
  const indigoOptions = new indigo.MapStringString();
  indigoOptions.set("input-format", "chemical/x-daylight-smiles");
  const indigoInchiOptions = new indigo.MapStringString();
  indigoInchiOptions.set("input-format", "chemical/x-inchi");
  const ordResolutionByEvidenceId = new Map<SynthesisSourceEvidenceId, OrdResolutionAudit>();
  const normalizedNameIdentityCollisionIndex =
    buildNormalizedNameIdentityCollisionIndex(discovery.subjects);
  for (const result of discovery.subjects) {
    const candidates = reactionCandidatesFor(result);
    for (const [evidenceId, candidate] of candidates) {
      ordResolutionByEvidenceId.set(
        evidenceId,
        resolveOrdFragment(
          result,
          candidate,
          indigo,
          indigoOptions,
          indigoInchiOptions,
        ),
      );
    }
  }

  const assessments: SynthesisEvidenceAssociationAssessment[] = [];
  for (const [index, { result, evidence }] of candidateEntries.entries()) {
    const globalDocumentKey = globalDocumentKeyFor(evidence);
    const group = documentGroups.get(globalDocumentKey) ?? [];
    const canonicalEvidenceId = group
      .map((item) => item.evidence.id)
      .sort((left, right) => left.localeCompare(right, "en"))[0];
    const classified = classifyAssociation(
      result,
      evidence,
      ordResolutionByEvidenceId.get(evidence.id) ?? null,
      accessByDocument.get(globalDocumentKey) ?? null,
      normalizedNameIdentityCollisionIndex,
    );
    const rights = rightsFor(evidence);
    assessments.push({
      schemaVersion: 1,
      associationId: associationIdFor(result.coverage.id, evidence.id),
      coverageId: result.coverage.id,
      sourceEvidenceId: evidence.id,
      globalDocumentKey,
      canonicalDocumentEvidenceId: canonicalEvidenceId,
      documentAssociationCount: group.length,
      accessState: classified.accessState,
      extractionOutcome: classified.extractionOutcome,
      sourceEvidenceState: classified.sourceEvidenceState,
      routeType: null,
      routeCompleteness: classified.routeCompleteness,
      reviewState: "pending",
      applicability: classified.applicability,
      licenseState: rights.licenseState,
      rights: rights.rights,
      identityResolution: classified.identityResolution,
      exactLocatorResolved: classified.exactLocatorResolved,
      sourceLocatorValue: evidence.locator?.value ?? null,
      extractedSegmentId: classified.extractedSegmentId,
      retry: classified.retry,
      attemptedAt: generatedAt,
      pipelineVersion: SYNTHESIS_EXTRACTION_PIPELINE_VERSION,
      reasonCodes: classified.reasonCodes,
      supersedesAssociationId: null,
      duplicateOfAssociationId: null,
      operationalDetailsIncluded: false,
    });
    options.onProgress?.({
      completed: index + 1,
      total: candidateEntries.length,
      phase: "terminalize",
    });
  }
  const assessmentsByCoverageId = Map.groupBy(
    assessments,
    (assessment) => assessment.coverageId,
  );
  const summariesByCoverageId = new Map<SynthesisCoverageId, SynthesisEvidenceProcessingSummary>();
  for (const result of discovery.subjects) {
    const values = assessmentsByCoverageId.get(result.coverage.id) ?? [];
    summariesByCoverageId.set(result.coverage.id, {
      pipelineVersion: SYNTHESIS_EXTRACTION_PIPELINE_VERSION,
      completedAt: generatedAt,
      candidateAssociationCount: values.length,
      terminalAssociationCount: values.length,
      accessibleCount: values.filter((item) => item.accessState === "accessible").length,
      accessBlockedCount: values.filter((item) => item.accessState === "access_blocked").length,
      metadataOnlyCount: values.filter((item) => item.accessState === "metadata_only").length,
      unavailableCount: values.filter((item) => item.accessState === "unavailable").length,
      extractionOutcomeCounts: fullTerminalOutcomeCounts(values),
    });
  }

  const journalAssessments = assessments.filter((assessment) => {
    const entry = candidateEntries.find(
      ({ evidence }) => evidence.id === assessment.sourceEvidenceId,
    );
    return entry?.evidence.sourceKind === "journal";
  });
  const fallbackAssessments = journalAssessments.filter((assessment) =>
    assessment.identityResolution.documentIdentity === "fallback_identifier_missing"
  );
  const salbutamolCoverageIds = discovery.subjects
    .filter((result) =>
      result.subject.preferredName === "Salbutamol" ||
      result.subject.preferredName === "(-)-Salbutamol"
    )
    .map((result) => result.coverage.id);
  const salbutamolCollisionDocumentSets = salbutamolCoverageIds.map((coverageId) =>
    new Set(assessments
      .filter((assessment) =>
        assessment.coverageId === coverageId &&
        assessment.reasonCodes.includes("normalized_name_exact_identity_collision")
      )
      .map((assessment) => assessment.globalDocumentKey))
  );
  const representativeStereoCollisionGuardPassed =
    salbutamolCoverageIds.length === 2 &&
    salbutamolCollisionDocumentSets.length === 2 &&
    [...salbutamolCollisionDocumentSets[0]].some((documentKey) =>
      salbutamolCollisionDocumentSets[1].has(documentKey)
    ) &&
    assessments.some((assessment) =>
      assessment.coverageId === salbutamolCoverageIds.find((coverageId) => {
        const result = discovery.subjects.find((item) => item.coverage.id === coverageId);
        return result?.subject.preferredName === "(-)-Salbutamol";
      }) &&
      (assessment.identityResolution.titleIdentity === "preferred_name" ||
        assessment.identityResolution.titleIdentity === "alias") &&
      !assessment.reasonCodes.includes("normalized_name_exact_identity_collision")
    );
  if (baselineComparisonState === "matched" && !representativeStereoCollisionGuardPassed) {
    throw new Error(
      "Stereo-aware normalized-name collision regression failed for the checked Salbutamol identities.",
    );
  }
  const ordAudits = [...ordResolutionByEvidenceId.values()];
  const resolvedSegments: SynthesisResolvedReactionSegment[] = candidateEntries.flatMap(
    ({ result, evidence }) => {
      if (evidence.sourceKind !== "open_reaction_dataset" || !evidence.locator) return [];
      const audit = ordResolutionByEvidenceId.get(evidence.id);
      if (
        audit?.state !== "direct_segment" ||
        audit.resolvedReactants.length === 0 ||
        audit.resolvedProducts.length === 0
      ) return [];
      const segment: SynthesisResolvedReactionSegment = {
        schemaVersion: 1,
        segmentId: ordSegmentIdFor(result.coverage.id, evidence.id),
        coverageId: result.coverage.id,
        sourceEvidenceId: evidence.id,
        sourceLocator: evidence.locator,
        reactants: audit.resolvedReactants as [
          SynthesisResolvedReactionParticipant,
          ...SynthesisResolvedReactionParticipant[],
        ],
        products: audit.resolvedProducts as [
          SynthesisResolvedReactionParticipant,
          ...SynthesisResolvedReactionParticipant[],
        ],
        intermediates: [],
        reactionClass: {
          taxonomyId: null,
          label: "Unclassified",
          normalizationState: "unclassified",
          provenance: {
            taxonomyName: null,
            taxonomyVersion: null,
            confidence: null,
            state: "not_computed",
          },
        },
        formedBonds: [],
        brokenBonds: [],
        atomMapping: {
          state: "not_mapped",
          mapperName: null,
          mapperVersion: null,
          confidence: null,
          availableTool: "Indigo",
          availableToolVersion: audit.indigoVersion,
          reason:
            "No confidence-bearing mapper result is available, and ORD participant roles may mix reaction agents with substrates; atom numbers and bond changes were not asserted.",
        },
        stereochemicalResult: {
          state: "exact_target_product_identity",
          targetInchiKey: result.subject.identity.inchiKey,
          formCompatibility: "exact",
          stereochemistryCompatibility: "exact",
        },
        sourceEvidenceState: "direct_segment",
        routeType: null,
        routeCompleteness: "unknown",
        reviewState: "pending",
        applicability: "applicable",
        licenseState: "amber",
        operationalDetailsIncluded: false,
        limitations: [
          "This is one exact-target ORD reaction segment, not a complete synthesis route.",
          "Reaction class, atom mapping and bond changes remain unclassified/not-mapped.",
          "Original-source resolution and scientific review remain pending.",
          "No quantities, conditions, workup, purification, yield or scale are retained.",
        ],
      };
      return [segment];
    },
  );
  if (
    baselineComparisonState === "matched" &&
    resolvedSegments.length !== 2_645
  ) {
    const unresolvedDirectEntries = candidateEntries
      .filter(({ evidence }) => {
        const audit = ordResolutionByEvidenceId.get(evidence.id);
        return audit?.state === "direct_segment" && (
          !evidence.locator ||
          audit.resolvedReactants.length === 0 ||
          audit.resolvedProducts.length === 0
        );
      })
      .slice(0, 10)
      .map(({ evidence }) => {
        const audit = ordResolutionByEvidenceId.get(evidence.id);
        return {
          evidenceId: evidence.id,
          locator: Boolean(evidence.locator),
          reactants: audit?.resolvedReactants.length ?? 0,
          products: audit?.resolvedProducts.length ?? 0,
        };
      });
    throw new Error(
      `Resolved ORD segment invariant failed: ${resolvedSegments.length} != 2645 (${JSON.stringify({
        unresolvedDirectEntries,
        stateCounts: countBy(
          [...ordResolutionByEvidenceId.values()],
          (item) => item.state,
        ),
        insufficientWithParseErrors: [...ordResolutionByEvidenceId.entries()]
          .filter(([, item]) =>
            item.state === "insufficient_reactant_identity" && item.parseErrors.length > 0
          )
          .slice(0, 10)
          .map(([evidenceId, item]) => ({ evidenceId, parseErrors: item.parseErrors })),
      })}).`,
    );
  }
  const documentDedupe = {
    associationCount: assessments.length,
    uniqueGlobalDocumentCount: documentGroups.size,
    repeatedGlobalDocumentCount: [...documentGroups.values()].filter((group) => group.length > 1).length,
    crossMoleculeDocumentAssociationCount: assessments.length - documentGroups.size,
    sameMoleculeDocumentDuplicateCount,
  };
  const journalIdentityAudit = {
    associationCount: journalAssessments.length,
    stableDocumentIdentityCount: journalAssessments.length - fallbackAssessments.length,
    legacyFallbackIdentityCount: fallbackAssessments.length,
    currentActiveFallbackIdentityCount: fallbackAssessments.filter(
      (item) => item.extractionOutcome !== "superseded",
    ).length,
    fallbackTerminalOutcomes: countBy(fallbackAssessments, (item) => item.extractionOutcome),
    preferredNameMatchCount: journalAssessments.filter((item) =>
      item.identityResolution.titleIdentity === "preferred_name"
    ).length,
    aliasMatchCount: journalAssessments.filter((item) =>
      item.identityResolution.titleIdentity === "alias"
    ).length,
    ambiguousAliasCount: journalAssessments.filter((item) =>
      item.identityResolution.titleIdentity === "ambiguous_alias"
    ).length,
    normalizedNameIdentityCollisionCount: journalAssessments.filter((item) =>
      item.reasonCodes.includes("normalized_name_exact_identity_collision")
    ).length,
    normalizedNameIdentityCollisionKeyCount: normalizedNameIdentityCollisionIndex.size,
    representativeStereoCollisionGuardPassed,
    titleMismatchCount: journalAssessments.filter((item) =>
      item.identityResolution.titleIdentity === "mismatch"
    ).length,
    openAccessLabelAssociationCount: candidateEntries.filter(({ evidence }) =>
      evidence.sourceKind === "journal" && evidence.licenseState === "unknown"
    ).length,
    openAccessLabelUniqueDocumentCount: new Set(
      candidateEntries
        .filter(({ evidence }) =>
          evidence.sourceKind === "journal" && evidence.licenseState === "unknown"
        )
        .map(({ evidence }) => globalDocumentKeyFor(evidence)),
    ).size,
    officialNetworkAttemptCount: accessAudits.filter((item) =>
      item.officialNetworkAttempted
    ).length,
    offlineProjectionCount: accessAudits.filter((item) => item.offlineProjection).length,
    fullTextMarkupInspectionCount: accessAudits.filter((item) =>
      item.markupInspectionAttempted
    ).length,
    openAccessFullTextAccessibleCount: accessAudits.filter((item) =>
      item.status === "full_text_accessible"
    ).length,
    openAccessMetadataOnlyCount: accessAudits.filter((item) =>
      item.status === "metadata_only_no_pmcid"
    ).length,
    oldFallbackRecordsPreservedInAudit: true as const,
  };
  const ordAudit = {
    decodedFragmentCount: ordAudits.length,
    exactTargetProductCount: ordAudits.filter((item) => item.exactTargetProduct).length,
    directSegmentCandidateCount: ordAudits.filter((item) => item.state === "direct_segment").length,
    insufficientReactantIdentityCount: ordAudits.filter(
      (item) => item.state === "insufficient_reactant_identity",
    ).length,
    targetAlreadyInputCount: ordAudits.filter((item) => item.state === "target_already_input").length,
    targetConnectivityInputCount: ordAudits.filter(
      (item) => item.state === "target_connectivity_input",
    ).length,
    parseErrorCount: ordAudits.filter((item) => item.state === "parse_error").length,
    promotedCanonicalRouteCount: 0 as const,
    reactionClassificationState: "unclassified" as const,
    atomMappingState: "not_mapped" as const,
    mapperAvailableButNotApplied: true as const,
    mappingReason:
      "Indigo can compute atom maps but exposes no confidence score, and cached ORD participant roles mix reaction agents with substrates; mapping was therefore not asserted.",
    indigoVersion: indigo.version(),
    priorProvisionalDirectSegmentCount: 2_646 as const,
    identityHardenedDowngradeCount: 2_646 - resolvedSegments.length,
    providedOnlyReactantIdentityDowngradeCount: ordAudits.filter((item) =>
      item.state === "insufficient_reactant_identity" &&
      item.missingStructureReactantIdentityCount === 0 &&
      item.structuredButUnresolvedReactantIdentityCount === 0 &&
      item.providedOnlyReactantIdentityCount > 0
    ).length,
    unparseableStructuredReactantIdentityDowngradeCount: ordAudits.filter((item) =>
      item.state === "insufficient_reactant_identity" &&
      item.missingStructureReactantIdentityCount === 0 &&
      item.providedOnlyReactantIdentityCount === 0 &&
      item.structuredButUnresolvedReactantIdentityCount > 0
    ).length,
    identityHardeningReason:
      "The hardened resolver independently computes structure-to-InChIKey with Indigo, verifies any cached key, rejects unparseable structures, and does not accept a provided-only InChIKey as a resolved participant identity.",
  };
  const assessmentSha256 = sha256(stableJson(assessments));
  const manifest: SynthesisEvidenceExtractionManifest = {
    schemaVersion: 1,
    pipelineVersion: SYNTHESIS_EXTRACTION_PIPELINE_VERSION,
    generatedAt,
    catalogSnapshotId: discovery.manifest.catalogSnapshotId,
    moleculeCount: discovery.subjects.length,
    candidateBearingMoleculeCount: recomputedBaseline.candidateBearingMoleculeCount,
    candidateAssociationCount: assessments.length,
    terminalAssociationCount: assessments.length,
    unresolvedFinalCount: 0,
    uniqueGlobalDocumentCount: documentGroups.size,
    exactLocatorMissingBaselineCount: SYNTHESIS_CANDIDATE_BASELINE.exactLocatorMissingCandidates,
    journalFallbackIdentityBaselineCount:
      SYNTHESIS_CANDIDATE_BASELINE.journalFallbackIdentityAssociations,
    currentExactLocatorMissingCount: recomputedBaseline.locatorMissingCount,
    currentJournalFallbackIdentityCount: fallbackAssessments.filter(
      (assessment) => assessment.extractionOutcome !== "superseded",
    ).length,
    ordDecodedFragmentCount: ordAudit.decodedFragmentCount,
    directSegmentCandidateCount: ordAudit.directSegmentCandidateCount,
    insufficientOrdReactantIdentityCount:
      ordAudit.insufficientReactantIdentityCount,
    nonCovalentOrdTerminalCount:
      ordAudit.targetAlreadyInputCount + ordAudit.targetConnectivityInputCount,
    ordParseErrorCount: ordAudit.parseErrorCount,
    resolvedSegmentRecordCount: resolvedSegments.length,
    baselineComparisonState,
    assessmentSha256,
  };

  await mkdir(new URL("assessments/", synthesisExtractionWorkUrl), { recursive: true });
  const assessmentShards = Map.groupBy(assessments, (assessment) => {
    const result = discovery.subjects.find((subject) => subject.coverage.id === assessment.coverageId);
    return result?.subject.identity.inchiKey[0].toLocaleLowerCase("en") ?? "other";
  });
  for (const [key, values] of assessmentShards) {
    await writeJsonAtomic(new URL(`assessments/${key}.json`, synthesisExtractionWorkUrl), {
      schemaVersion: 1,
      pipelineVersion: SYNTHESIS_EXTRACTION_PIPELINE_VERSION,
      shardKey: key,
      assessments: values,
    });
  }
  const segmentShards = Map.groupBy(resolvedSegments, (segment) => {
    const result = discovery.subjects.find((subject) => subject.coverage.id === segment.coverageId);
    return result?.subject.identity.inchiKey[0].toLocaleLowerCase("en") ?? "other";
  });
  for (const [key, values] of segmentShards) {
    await writeJsonAtomic(new URL(`segments/${key}.json`, synthesisExtractionWorkUrl), {
      schemaVersion: 1,
      pipelineVersion: SYNTHESIS_EXTRACTION_PIPELINE_VERSION,
      shardKey: key,
      segments: values,
    });
  }
  await writeJsonAtomic(new URL("baseline.json", synthesisExtractionWorkUrl), {
    baseline: SYNTHESIS_CANDIDATE_BASELINE,
    recomputed: {
      totalMolecules: discovery.subjects.length,
      candidateBearingMolecules: manifest.candidateBearingMoleculeCount,
      moleculeEvidenceMatches: assessments.length,
      uniqueEvidenceDocumentReactionCandidates: documentGroups.size,
      exactLocatorMissingCandidates: candidateEntries.filter(({ evidence }) => !evidence.locator).length,
      journalFallbackIdentityAssociations: fallbackAssessments.length,
      decodedOrdFragments: ordAudits.length,
      ordFragmentBearingMolecules: new Set(ordEntries.map(({ result }) => result.coverage.id)).size,
    },
  });
  await writeJsonAtomic(new URL("document-dedupe.json", synthesisExtractionWorkUrl), documentDedupe);
  await writeJsonAtomic(new URL("journal-identity-audit.json", synthesisExtractionWorkUrl), {
    ...journalIdentityAudit,
    fallbackAssociations: fallbackAssessments.map((assessment) => ({
      associationId: assessment.associationId,
      coverageId: assessment.coverageId,
      sourceEvidenceId: assessment.sourceEvidenceId,
      extractionOutcome: assessment.extractionOutcome,
      reasonCodes: assessment.reasonCodes,
    })),
  });
  await writeJsonAtomic(new URL("ord-resolution-audit.json", synthesisExtractionWorkUrl), ordAudit);
  await writeJsonAtomic(new URL("run-manifest.json", synthesisExtractionWorkUrl), manifest);

  return {
    manifest,
    assessments,
    summariesByCoverageId,
    documentDedupe,
    journalIdentityAudit,
    ordAudit,
    accessAudits,
    resolvedSegments,
  };
};

export const loadCompletedSynthesisExtraction = async (): Promise<
  SynthesisCandidateExtractionRunResult
> => {
  try {
    const manifest = JSON.parse(
      await readFile(new URL("run-manifest.json", synthesisExtractionWorkUrl), "utf8"),
    ) as SynthesisEvidenceExtractionManifest;
    return extractSynthesisEvidenceCandidates({ attemptedAt: manifest.generatedAt });
  } catch {
    return extractSynthesisEvidenceCandidates();
  }
};
