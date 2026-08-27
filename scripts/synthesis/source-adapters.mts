import { createHash } from "node:crypto";

import reactionPb from "ord-schema";

import type { SynthesisSearchProviderAttempt } from "../../lib/domain/synthesis-coverage";
import type {
  SynthesisLicenseState,
  SynthesisSourceEvidence,
  SynthesisSourceEvidenceId,
} from "../../lib/domain/synthesis-route";
import type { SynthesisDiscoverySubject } from "./catalog-input.mjs";
import type {
  SynthesisDiscoveryAdapterId,
  SynthesisDiscoveryAdapterResult,
  SynthesisReactionFragmentCandidate,
  SynthesisReactionFragmentParticipant,
} from "./discovery-types.mjs";

export const SYNTHESIS_DISCOVERY_ADAPTERS = [
  { id: "pubchem-manufacturing", version: "1.0.0", required: true },
  { id: "europe-pmc", version: "1.0.0", required: true },
  { id: "europe-pmc-patents", version: "1.0.0", required: true },
  { id: "open-reaction-database", version: "1.1.0", required: true },
] as const;

export interface AdapterRunContext {
  readonly searchedAt: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly maxCandidatesPerAdapter: number;
}

interface FetchJsonOptions {
  readonly allowNotFound?: boolean;
}

interface FetchJsonResult {
  readonly value: unknown | null;
  readonly attempts: number;
}

const wait = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const hostStartQueues = new Map<string, Promise<void>>();
const hostNextStart = new Map<string, number>();

const minimumHostInterval = (host: string): number => {
  if (host === "pubchem.ncbi.nlm.nih.gov") return 220;
  if (host === "www.ebi.ac.uk") return 550;
  if (host === "open-reaction-database.org") return 250;
  return 100;
};

/** Spaces request starts per official host; retries use the same limiter. */
const waitForHostTurn = async (url: URL): Promise<void> => {
  const previous = hostStartQueues.get(url.host) ?? Promise.resolve();
  const scheduled = previous.then(async () => {
    const delay = Math.max(0, (hostNextStart.get(url.host) ?? 0) - Date.now());
    if (delay > 0) await wait(delay);
    hostNextStart.set(url.host, Date.now() + minimumHostInterval(url.host));
  });
  hostStartQueues.set(url.host, scheduled.catch(() => undefined));
  await scheduled;
};

const fetchJson = async (
  url: URL,
  context: AdapterRunContext,
  options: FetchJsonOptions = {},
): Promise<FetchJsonResult> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= context.maxRetries; attempt += 1) {
    await waitForHostTurn(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Molevren-Synthesis-Coverage/1.0 (evidence discovery; metadata only)",
        },
        signal: controller.signal,
      });
      if (options.allowNotFound && response.status === 404) {
        return { value: null, attempts: attempt + 1 };
      }
      if (response.ok) {
        return { value: await response.json(), attempts: attempt + 1 };
      }
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!retryable || attempt === context.maxRetries) {
        throw new Error(`HTTP ${response.status} from ${url.origin}`);
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 500 * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (attempt === context.maxRetries) break;
      await wait(500 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Request failed: ${url.origin}`);
};

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const evidenceId = (namespace: string, identity: string): SynthesisSourceEvidenceId =>
  `synthesis-source-evidence:${namespace}:${sha256(identity).slice(0, 24)}`;

const cleanText = (value: unknown): string =>
  typeof value === "string"
    ? value
        .replace(/<[^>]+>/gu, " ")
        .replace(/&[a-z]+;/giu, " ")
        .replace(/\s+/gu, " ")
        .trim()
    : "";

const normalizedSearchText = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();

const synthesisTerms = /\b(?:synthesi[sz]|prepar(?:ation|e|ing)|process|manufactur(?:e|ing))\b/iu;

const identityMatches = (candidate: string, queryName: string): boolean => {
  const normalizedCandidate = normalizedSearchText(candidate);
  const normalizedName = normalizedSearchText(queryName);
  return normalizedName.length > 1 && normalizedCandidate.includes(normalizedName);
};

const queryNames = (
  subject: SynthesisDiscoverySubject,
  additionalNames: readonly string[] = [],
): readonly string[] =>
  [...new Set(
    [subject.preferredName, ...subject.aliases, ...additionalNames]
      .map((name) => name.trim())
      .filter(Boolean),
  )]
    .sort((left, right) => left.localeCompare(right, "en"));

const europePmcPhrase = (value: string): string =>
  value.replace(/["\\]/gu, " ").replace(/\s+/gu, " ").trim();

const attempt = (
  provider: SynthesisSearchProviderAttempt["provider"],
  adapterId: SynthesisDiscoveryAdapterId,
  status: SynthesisSearchProviderAttempt["status"],
  queryCount: number,
  candidateCount: number,
  searchedAt: string,
  errors: readonly string[],
): SynthesisSearchProviderAttempt => ({
  provider,
  adapterId,
  adapterVersion:
    SYNTHESIS_DISCOVERY_ADAPTERS.find((candidate) => candidate.id === adapterId)?.version ??
    "unknown",
  status,
  queryCount,
  candidateCount,
  searchedAt,
  errors,
});

const errorResult = (
  adapterId: SynthesisDiscoveryAdapterId,
  provider: SynthesisSearchProviderAttempt["provider"],
  searchedAt: string,
  queryCount: number,
  errors: readonly string[],
): SynthesisDiscoveryAdapterResult => ({
  adapterId,
  attempt: attempt(
    provider,
    adapterId,
    "completed_with_errors",
    queryCount,
    0,
    searchedAt,
    errors,
  ),
  evidence: [],
  metadata: {},
});

interface PubChemInformation {
  readonly Reference?: readonly string[];
  readonly ExtendedReference?: readonly { readonly Citation?: string }[];
  readonly Value?: {
    readonly StringWithMarkup?: readonly {
      readonly Markup?: readonly {
        readonly Type?: string;
        readonly Extra?: string;
      }[];
    }[];
  };
}

const collectPubChemInformation = (value: unknown): readonly PubChemInformation[] => {
  const result: PubChemInformation[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    const object = node as Record<string, unknown>;
    if (Array.isArray(object.Information)) {
      result.push(...(object.Information as PubChemInformation[]));
    }
    Object.values(object).forEach(visit);
  };
  visit(value);
  return result;
};

export const discoverPubChemManufacturing = async (
  subject: SynthesisDiscoverySubject,
  context: AdapterRunContext,
): Promise<SynthesisDiscoveryAdapterResult> => {
  const adapterId = "pubchem-manufacturing" as const;
  const manufacturingUrl = new URL(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${subject.identity.pubChemCid}/JSON`,
  );
  manufacturingUrl.searchParams.set("heading", "Methods of Manufacturing");
  const synonymsUrl = new URL(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${subject.identity.pubChemCid}/synonyms/JSON`,
  );
  const parentUrl = new URL(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${subject.identity.pubChemCid}/cids/JSON`,
  );
  parentUrl.searchParams.set("cids_type", "parent");
  try {
    const manufacturingResponse = await fetchJson(manufacturingUrl, context, {
      allowNotFound: true,
    });
    const synonymsResponse = await fetchJson(synonymsUrl, context, {
      allowNotFound: true,
    });
    const parentResponse = await fetchJson(parentUrl, context, { allowNotFound: true });
    const information = manufacturingResponse.value
      ? collectPubChemInformation(manufacturingResponse.value)
      : [];
    const citations = [
      ...new Set(
        information.flatMap((item) => [
          ...(item.Reference ?? []),
          ...(item.ExtendedReference ?? []).map((reference) => reference.Citation ?? ""),
        ]).map(cleanText).filter(Boolean),
      ),
    ];
    const mentionedCompoundIds = [
      ...new Set(
        information.flatMap((item) =>
          (item.Value?.StringWithMarkup ?? []).flatMap((entry) =>
            (entry.Markup ?? [])
              .filter((markup) => markup.Type === "PubChem Internal Link")
              .map((markup) => markup.Extra ?? "")
              .filter(Boolean),
          ),
        ),
      ),
    ];
    const hasManufacturingEvidence = information.length > 0;
    const rawSynonyms =
      (synonymsResponse.value as {
        readonly InformationList?: {
          readonly Information?: readonly { readonly Synonym?: readonly string[] }[];
        };
      } | null)?.InformationList?.Information?.flatMap((entry) => entry.Synonym ?? []) ?? [];
    const identityAliases = [
      ...new Set(
        rawSynonyms
          .map(cleanText)
          .filter(
            (name) =>
              name.length >= 3 &&
              name.length <= 80 &&
              !/^\d{2,7}-\d\d-\d$/u.test(name) &&
              !/^(?:inchi|smiles|cid|cas)\b/iu.test(name) &&
              !/[{}=\\/]/u.test(name) &&
              !name.includes("[") &&
              !name.includes("]"),
          ),
      ),
    ].slice(0, 5);
    const parentCids =
      (parentResponse.value as {
        readonly IdentifierList?: { readonly CID?: readonly number[] };
      } | null)?.IdentifierList?.CID ?? [];
    const sourceUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${subject.identity.pubChemCid}#section=Methods-of-Manufacturing`;
    const evidence: readonly SynthesisSourceEvidence[] = hasManufacturingEvidence
      ? [
          {
            id: evidenceId(
              "pubchem",
              `${subject.identity.inchiKey}:${subject.identity.pubChemCid}:manufacturing`,
            ),
            resolutionState: "candidate",
            sourceId: null,
            sourceKind: "aggregator",
            documentId: `pubchem-cid-${subject.identity.pubChemCid}-manufacturing`,
            patentFamilyId: null,
            title: `PubChem Methods of Manufacturing — ${subject.preferredName}`,
            url: sourceUrl,
            publicationYear: null,
            retrievedAt: context.searchedAt,
            documentSha256: null,
            locator: null,
            supportScope: "route_segment",
            licenseState: "mixed",
            reuseMode: "metadata_and_link_only",
          },
        ]
      : [];
    return {
      adapterId,
      attempt: attempt(
        "aggregator",
        adapterId,
        "completed",
        3,
        evidence.length,
        context.searchedAt,
        [],
      ),
      evidence,
      metadata: {
        citationCount: citations.length,
        citationDigests: citations.map((citation) => sha256(citation)),
        mentionedCompoundIds,
        identityAliases,
        parentCids,
        parentRelationCandidate:
          parentCids.length === 1 && parentCids[0] !== subject.identity.pubChemCid
            ? "different_parent_candidate"
            : "no_distinct_parent_candidate",
        apiUrls: [manufacturingUrl.toString(), synonymsUrl.toString(), parentUrl.toString()],
        responseAttempts:
          manufacturingResponse.attempts + synonymsResponse.attempts + parentResponse.attempts,
      },
    };
  } catch (error) {
    return errorResult(adapterId, "aggregator", context.searchedAt, 3, [
      error instanceof Error ? error.message : String(error),
    ]);
  }
};

interface EuropePmcResult {
  readonly title?: string;
  readonly doi?: string;
  readonly pmid?: string;
  readonly pmcid?: string;
  readonly pubYear?: string;
  readonly isOpenAccess?: "Y" | "N";
  readonly journalTitle?: string;
}

export const discoverEuropePmc = async (
  subject: SynthesisDiscoverySubject,
  context: AdapterRunContext,
  additionalNames: readonly string[] = [],
): Promise<SynthesisDiscoveryAdapterResult> => {
  const adapterId = "europe-pmc" as const;
  const evidence = new Map<string, SynthesisSourceEvidence>();
  const errors: string[] = [];
  const names = queryNames(subject, additionalNames);
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set(
    "query",
    names
      .flatMap((name) => [
        `TITLE:"synthesis of ${europePmcPhrase(name)}"`,
        `TITLE:"preparation of ${europePmcPhrase(name)}"`,
        `TITLE:"process for ${europePmcPhrase(name)}"`,
      ])
      .join(" OR "),
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", String(context.maxCandidatesPerAdapter));
  try {
    const response = await fetchJson(url, context);
    const resultList = (response.value as {
      readonly resultList?: { readonly result?: readonly EuropePmcResult[] };
    } | null)?.resultList?.result ?? [];
    for (const candidate of resultList) {
      const title = cleanText(candidate.title);
      if (!names.some((name) => identityMatches(title, name)) || !synthesisTerms.test(title)) {
        continue;
      }
        const documentId = candidate.doi
          ? `doi:${candidate.doi.toLowerCase()}`
          : candidate.pmcid
            ? `pmcid:${candidate.pmcid}`
            : candidate.pmid
              ? `pmid:${candidate.pmid}`
              : `europe-pmc:${sha256(title).slice(0, 16)}`;
        const directUrl = candidate.doi
          ? `https://doi.org/${candidate.doi}`
          : candidate.pmcid
            ? `https://europepmc.org/articles/${candidate.pmcid}`
            : `https://europepmc.org/article/MED/${candidate.pmid ?? ""}`;
        evidence.set(documentId, {
          id: evidenceId("europe-pmc", `${subject.identity.inchiKey}:${documentId}`),
          resolutionState: "candidate",
          sourceId: null,
          sourceKind: "journal",
          documentId,
          patentFamilyId: null,
          title,
          url: directUrl,
          publicationYear: Number(candidate.pubYear) || null,
          retrievedAt: context.searchedAt,
          documentSha256: null,
          locator: null,
          supportScope: "route_segment",
          licenseState: candidate.isOpenAccess === "Y" ? "unknown" : "link_only",
          reuseMode: "metadata_and_link_only",
        });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return {
    adapterId,
    attempt: attempt(
      "journal",
      adapterId,
      errors.length === 0 ? "completed" : "completed_with_errors",
      1,
      evidence.size,
      context.searchedAt,
      errors,
    ),
    evidence: [...evidence.values()].slice(0, context.maxCandidatesPerAdapter),
    metadata: { queryNames: names, apiUrl: url.toString() },
  };
};

interface EuropePmcPatentResult {
  readonly source?: string;
  readonly id?: string;
  readonly title?: string;
  readonly pubYear?: string;
}

export const discoverEuropePmcPatents = async (
  subject: SynthesisDiscoverySubject,
  context: AdapterRunContext,
  additionalNames: readonly string[] = [],
): Promise<SynthesisDiscoveryAdapterResult> => {
  const adapterId = "europe-pmc-patents" as const;
  const evidence = new Map<string, SynthesisSourceEvidence>();
  const errors: string[] = [];
  const names = queryNames(subject, additionalNames);
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set(
    "query",
    `SRC:PAT AND (${names
      .map(
        (name) =>
          `(TITLE:"${europePmcPhrase(name)}" AND (TITLE:synthes* OR TITLE:prepar* OR TITLE:process*))`,
      )
      .join(" OR ")})`,
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", String(context.maxCandidatesPerAdapter));
  try {
    const response = await fetchJson(url, context);
    const resultList = (response.value as {
      readonly resultList?: { readonly result?: readonly EuropePmcPatentResult[] };
    } | null)?.resultList?.result ?? [];
    for (const result of resultList) {
        const title = cleanText(result.title);
        const publicationNumber = cleanText(result.id);
        if (
          !publicationNumber ||
          !names.some((name) => identityMatches(title, name)) ||
          !synthesisTerms.test(title)
        ) {
          continue;
        }
        const documentId = publicationNumber.toUpperCase().replace(/[^A-Z0-9]/gu, "");
        evidence.set(documentId, {
          id: evidenceId("patent", `${subject.identity.inchiKey}:${documentId}`),
          resolutionState: "candidate",
          sourceId: null,
          sourceKind: "patent",
          documentId,
          patentFamilyId: null,
          title: title || `Patent ${documentId}`,
          url: `https://europepmc.org/article/PAT/${encodeURIComponent(publicationNumber)}`,
          publicationYear: Number(result.pubYear) || null,
          retrievedAt: context.searchedAt,
          documentSha256: null,
          locator: null,
          supportScope: "route_segment",
          licenseState: "link_only",
          reuseMode: "metadata_and_link_only",
        });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return {
    adapterId,
    attempt: attempt(
      "patent",
      adapterId,
      errors.length === 0 ? "completed" : "completed_with_errors",
      1,
      evidence.size,
      context.searchedAt,
      errors,
    ),
    evidence: [...evidence.values()].slice(0, context.maxCandidatesPerAdapter),
    metadata: {
      queryNames: names,
      apiUrl: url.toString(),
      coverageLimitation:
        "Europe PMC patent metadata is an EPO-derived biological subset, not the complete patent universe.",
    },
  };
};

interface OrdQueryResult {
  readonly dataset_id?: string;
  readonly reaction_id?: string;
  readonly proto?: string;
}

interface OrdIdentifierObject {
  readonly type?: number;
  readonly value?: string;
}

interface OrdComponentObject {
  readonly reactionRole?: number;
  readonly identifiersList?: readonly OrdIdentifierObject[];
}

interface OrdReactionObject {
  readonly inputsMap?: readonly [string, {
    readonly componentsList?: readonly OrdComponentObject[];
  }][];
  readonly outcomesList?: readonly {
    readonly productsList?: readonly OrdComponentObject[];
  }[];
  readonly provenance?: {
    readonly doi?: string;
    readonly patent?: string;
    readonly publicationUrl?: string;
    readonly isMined?: boolean;
  };
}

const ORD_PARTICIPANT_ROLES: Readonly<
  Partial<Record<number, SynthesisReactionFragmentParticipant["role"]>>
> = {
    1: "reactant",
    2: "reagent",
    3: "solvent",
    4: "catalyst",
    5: "workup",
    8: "product",
    9: "byproduct",
    10: "side_product",
  };

const ordRole = (
  value: number | undefined,
): SynthesisReactionFragmentParticipant["role"] =>
  ORD_PARTICIPANT_ROLES[value ?? 0] ?? "unspecified";

const normalizedOrdComponent = (
  component: OrdComponentObject,
): SynthesisReactionFragmentParticipant => {
  const identifiers = new Map(
    (component.identifiersList ?? [])
      .map((identifier) => [identifier.type, cleanText(identifier.value)] as const)
      .filter(([, value]) => Boolean(value)),
  );
  const inchiKey = identifiers.get(11) ?? null;
  const inchi = identifiers.get(3) ?? null;
  const smiles = identifiers.get(2) ?? identifiers.get(10) ?? null;
  const name = identifiers.get(6) ?? identifiers.get(5) ?? null;
  return {
    role: ordRole(component.reactionRole),
    name,
    smiles,
    inchi,
    inchiKey,
    casNumber: identifiers.get(7) ?? null,
    pubChemCid: identifiers.get(8) ?? null,
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

const ORD_CANDIDATE_LIMITATIONS = [
  "An exact ORD product match is a discovery candidate, not a canonical synthesis route or a verified reported step.",
  "The original source and an exact human-resolvable source locator have not been resolved; scientific review is pending.",
  "Reaction class and bond changes were not inferred; atom mapping is unavailable.",
  "Operational quantities, conditions, workups, yields and procedures are intentionally omitted.",
] as const;

const ordCandidateBase = (
  match: OrdQueryResult,
  assertionInchiKey: string,
  decodeState: SynthesisReactionFragmentCandidate["decodeState"],
  inputs: readonly SynthesisReactionFragmentParticipant[],
  products: readonly SynthesisReactionFragmentParticipant[],
  provenance: SynthesisReactionFragmentCandidate["provenance"],
  limitations: readonly string[],
): SynthesisReactionFragmentCandidate => ({
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
  provenance,
  sourceEvidence: {
    evidenceId: match.reaction_id
      ? evidenceId("ord", `${assertionInchiKey}:${match.reaction_id}`)
      : null,
    resolutionState: "candidate",
    sourceKind: "open_reaction_dataset",
  },
  licenseState: "attribution_required",
  reuseMode: "derived_facts_with_attribution",
  operationalDetailsIncluded: false,
  limitations: [...ORD_CANDIDATE_LIMITATIONS, ...limitations],
});

export const decodeOrdCandidate = (
  match: OrdQueryResult,
  assertionInchiKey: string,
): SynthesisReactionFragmentCandidate => {
  const emptyProvenance = {
    datasetId: match.dataset_id ?? null,
    reactionId: match.reaction_id ?? null,
    doi: null,
    patent: null,
    publicationUrl: null,
    isMined: null,
  } as const;
  if (!match.proto) {
    return ordCandidateBase(match, assertionInchiKey, "missing_proto", [], [], emptyProvenance, [
      "The ORD response did not include a decodable reaction payload, so participant identity and upstream coverage remain unresolved.",
    ]);
  }
  try {
    const reaction = reactionPb.Reaction.deserializeBinary(
      Buffer.from(match.proto, "base64"),
    ).toObject() as OrdReactionObject;
    const inputs = (reaction.inputsMap ?? []).flatMap(([, input]) =>
      (input.componentsList ?? []).map(normalizedOrdComponent),
    );
    const products = (reaction.outcomesList ?? []).flatMap((outcome) =>
      (outcome.productsList ?? []).map(normalizedOrdComponent),
    );
    return ordCandidateBase(
      match,
      assertionInchiKey,
      "decoded",
      inputs,
      products,
      {
        datasetId: match.dataset_id ?? null,
        reactionId: match.reaction_id ?? null,
        doi: cleanText(reaction.provenance?.doi) || null,
        patent: cleanText(reaction.provenance?.patent) || null,
        publicationUrl: cleanText(reaction.provenance?.publicationUrl) || null,
        isMined: reaction.provenance?.isMined ?? null,
      },
      [
        "This normalized fragment does not establish a complete upstream route to the catalog target.",
      ],
    );
  } catch {
    return ordCandidateBase(match, assertionInchiKey, "decode_failed", [], [], emptyProvenance, [
      "The ORD reaction payload could not be decoded, so participant identity and upstream coverage remain unresolved.",
    ]);
  }
};

export const discoverOpenReactionDatabase = async (
  subject: SynthesisDiscoverySubject,
  context: AdapterRunContext,
): Promise<SynthesisDiscoveryAdapterResult> => {
  const adapterId = "open-reaction-database" as const;
  const url = new URL("https://open-reaction-database.org/api/query");
  const pattern = subject.identity.isomericSmiles ?? subject.identity.canonicalSmiles;
  url.searchParams.set(
    "component",
    JSON.stringify({ pattern, target: "OUTPUT", mode: "EXACT" }),
  );
  url.searchParams.set("use_stereochemistry", "true");
  url.searchParams.set("limit", String(context.maxCandidatesPerAdapter));
  try {
    const response = await fetchJson(url, context);
    const matches = Array.isArray(response.value)
      ? (response.value as readonly OrdQueryResult[])
      : [];
    const evidence = matches
      .filter((match) => match.reaction_id && match.dataset_id)
      .map((match): SynthesisSourceEvidence => {
        const reactionId = match.reaction_id as string;
        const datasetId = match.dataset_id as string;
        return {
          id: evidenceId("ord", `${subject.identity.inchiKey}:${reactionId}`),
          resolutionState: "candidate",
          sourceId: null,
          sourceKind: "open_reaction_dataset",
          documentId: reactionId,
          patentFamilyId: null,
          title: `Open Reaction Database reaction ${reactionId}`,
          url: `https://open-reaction-database.org/id/${reactionId}`,
          publicationYear: null,
          retrievedAt: context.searchedAt,
          documentSha256: null,
          locator: {
            kind: "dataset_record",
            value: `${datasetId}/${reactionId}`,
            page: null,
            scheme: null,
            example: null,
          },
          supportScope: "single_step",
          licenseState: "attribution_required",
          reuseMode: "derived_facts_with_attribution",
        };
      });
    return {
      adapterId,
      attempt: attempt(
        "open_reaction_dataset",
        adapterId,
        "completed",
        1,
        evidence.length,
        context.searchedAt,
        [],
      ),
      evidence,
      metadata: {
        apiUrl: url.toString(),
        datasetIds: [...new Set(matches.map((match) => match.dataset_id).filter(Boolean))],
        reactionCandidates: matches.map((match) =>
          decodeOrdCandidate(match, subject.identity.inchiKey)
        ),
        responseAttempts: response.attempts,
        queryIdentity: subject.identity.isomericSmiles ? "isomeric_smiles" : "canonical_smiles",
      },
    };
  } catch (error) {
    return errorResult(adapterId, "open_reaction_dataset", context.searchedAt, 1, [
      error instanceof Error ? error.message : String(error),
    ]);
  }
};

export const runAllDiscoveryAdapters = async (
  subject: SynthesisDiscoverySubject,
  context: AdapterRunContext,
): Promise<readonly SynthesisDiscoveryAdapterResult[]> => {
  const pubChem = await discoverPubChemManufacturing(subject, context);
  const identityAliases = Array.isArray(pubChem.metadata.identityAliases)
    ? pubChem.metadata.identityAliases.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const [europePmc, europePmcPatents, ord] = await Promise.all([
    discoverEuropePmc(subject, context, identityAliases),
    discoverEuropePmcPatents(subject, context, identityAliases),
    discoverOpenReactionDatabase(subject, context),
  ]);
  return [pubChem, europePmc, europePmcPatents, ord];
};

export const aggregateLicenseState = (
  evidence: readonly SynthesisSourceEvidence[],
): SynthesisLicenseState => {
  if (evidence.length === 0) return "unknown";
  const states = new Set(evidence.map((item) => item.licenseState));
  return states.size === 1 ? evidence[0].licenseState : "mixed";
};
