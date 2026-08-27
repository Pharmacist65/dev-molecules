import { createHash } from "node:crypto";

import type {
  SynthesisSourceContentAliasQuery,
  SynthesisSourceContentDocumentPlan,
  SynthesisSourceContentLocatorCandidate,
  SynthesisSourceContentRightsAssessment,
  SynthesisSourceContentTargetIdentity,
} from "../../lib/domain/synthesis-source-content";
import type { SynthesisSourceEvidence } from "../../lib/domain/synthesis-route";
import type {
  SynthesisDiscoveryRunResult,
} from "./discover-catalog.mjs";
import type { SynthesisDiscoverySubject } from "./catalog-input.mjs";

export const SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION = "2.0.0";
export const SYNTHESIS_SOURCE_CONTENT_MAX_LOCATORS_PER_DOCUMENT = 12;
export const SYNTHESIS_SOURCE_CONTENT_GENERATED_SUMMARY =
  "Catalog alias and controlled route-context cue co-occur at the recorded locator. Inspect the cited source; this private lead is not route evidence.";

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const stableJson = (value: unknown): string => JSON.stringify(value, null, 2);

/**
 * Preserve explicit optical/configuration qualifiers while normalizing names.
 * Stripping `(-)`, `(+)` or `(R)` would collapse distinct catalog identities.
 */
export const normalizeSourceContentAlias = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en")
    .replace(/\(\s*-\s*\)/gu, " stereo_minus ")
    .replace(/\(\s*\+\s*\)/gu, " stereo_plus ")
    .replace(/\(\s*([rsez])\s*\)/giu, (_, label: string) =>
      ` stereo_${label.toLocaleLowerCase("en")} `,
    )
    .replace(/[^a-z0-9_]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

const originPriority: Readonly<Record<SynthesisSourceContentAliasQuery["origin"], number>> = {
  preferred_name: 0,
  approval_name: 1,
  inn: 2,
  catalog_alias: 3,
};

const rejectedGenericAliases = new Set([
  "acid",
  "base",
  "compound",
  "drug",
  "hydrate",
  "salt",
  "solvate",
]);

const aliasIsSearchable = (value: string, normalized: string): boolean =>
  value.length >= 4 &&
  value.length <= 180 &&
  normalized.length >= 4 &&
  !rejectedGenericAliases.has(normalized) &&
  !/^\d{2,7}-\d{2}-\d$/u.test(value) &&
  !/^inchi=/iu.test(value) &&
  /[a-z]/iu.test(value);

interface RawAlias {
  readonly value: string;
  readonly normalizedValue: string;
  readonly origin: SynthesisSourceContentAliasQuery["origin"];
}

const rawAliasesFor = (subject: SynthesisDiscoverySubject): readonly RawAlias[] => {
  const values: readonly { readonly value: string; readonly origin: RawAlias["origin"] }[] = [
    { value: subject.preferredName, origin: "preferred_name" },
    { value: subject.sourceIdentity.approvalName, origin: "approval_name" },
    { value: subject.sourceIdentity.inn, origin: "inn" },
    ...subject.aliases.map((value) => ({ value, origin: "catalog_alias" as const })),
  ];
  const byNormalized = new Map<string, RawAlias>();
  for (const entry of values) {
    const value = entry.value.trim();
    const normalizedValue = normalizeSourceContentAlias(value);
    if (!aliasIsSearchable(value, normalizedValue)) continue;
    const current = byNormalized.get(normalizedValue);
    if (
      !current ||
      originPriority[entry.origin] < originPriority[current.origin] ||
      (originPriority[entry.origin] === originPriority[current.origin] &&
        value.length > current.value.length)
    ) {
      byNormalized.set(normalizedValue, { value, normalizedValue, origin: entry.origin });
    }
  }
  return [...byNormalized.values()]
    .sort((left, right) =>
      originPriority[left.origin] - originPriority[right.origin] ||
      right.value.length - left.value.length ||
      left.value.localeCompare(right.value, "en"),
    )
    .slice(0, 32);
};

const globalAliasOwnerIndex = (
  discovery: SynthesisDiscoveryRunResult,
): ReadonlyMap<string, ReadonlySet<string>> => {
  const owners = new Map<string, Set<string>>();
  for (const result of discovery.subjects) {
    for (const alias of rawAliasesFor(result.subject)) {
      const current = owners.get(alias.normalizedValue) ?? new Set<string>();
      current.add(result.subject.catalogEntityId);
      owners.set(alias.normalizedValue, current);
    }
  }
  return owners;
};

const targetIdentityFor = (
  result: SynthesisDiscoveryRunResult["subjects"][number],
  aliasOwners: ReadonlyMap<string, ReadonlySet<string>>,
): SynthesisSourceContentTargetIdentity => ({
  coverageId: result.coverage.id,
  catalogEntityId: result.subject.catalogEntityId,
  preferredName: result.subject.preferredName,
  inchiKey: result.subject.identity.inchiKey,
  connectivityKey: result.subject.identity.connectivityKey,
  chemicalFormId: result.subject.formIdentity.chemicalFormId,
  chemicalFormKind: result.subject.formIdentity.kind,
  stereoisomerId: result.subject.stereochemistryIdentity.stereoisomerId,
  stereochemistrySpecified: result.subject.stereochemistryIdentity.specifiedInSourceInchi,
  aliasQueries: rawAliasesFor(result.subject).map((alias) => {
    const count = aliasOwners.get(alias.normalizedValue)?.size ?? 0;
    return {
      ...alias,
      globalExactIdentityCount: count,
      identityAmbiguous: count !== 1,
    };
  }),
});

const globalDocumentKeyFor = (evidence: SynthesisSourceEvidence): string =>
  `${evidence.sourceKind}:${evidence.documentId.trim().toLocaleLowerCase("en")}`;

interface MutableDocumentPlan {
  readonly sourceKind: "journal" | "patent";
  readonly documentId: string;
  readonly associationKeys: Set<string>;
  readonly sourceEvidenceIds: Set<SynthesisSourceEvidence["id"]>;
  readonly discoveryUrls: Set<string>;
  readonly discoveryTitles: Set<string>;
  readonly targetIdentities: Map<string, SynthesisSourceContentTargetIdentity>;
}

/** Build the exact journal/patent document inventory from the accepted run. */
export const buildSourceContentInventory = (
  discovery: SynthesisDiscoveryRunResult,
): readonly SynthesisSourceContentDocumentPlan[] => {
  const aliasOwners = globalAliasOwnerIndex(discovery);
  const documents = new Map<string, MutableDocumentPlan>();
  for (const result of discovery.subjects) {
    const targetIdentity = targetIdentityFor(result, aliasOwners);
    for (const evidence of result.evidence) {
      if (evidence.sourceKind !== "journal" && evidence.sourceKind !== "patent") continue;
      const globalDocumentKey = globalDocumentKeyFor(evidence);
      const current = documents.get(globalDocumentKey) ?? {
        sourceKind: evidence.sourceKind,
        documentId: evidence.documentId,
        associationKeys: new Set<string>(),
        sourceEvidenceIds: new Set<SynthesisSourceEvidence["id"]>(),
        discoveryUrls: new Set<string>(),
        discoveryTitles: new Set<string>(),
        targetIdentities: new Map<string, SynthesisSourceContentTargetIdentity>(),
      };
      if (current.sourceKind !== evidence.sourceKind || current.documentId !== evidence.documentId) {
        throw new Error(`Conflicting source document identity for ${globalDocumentKey}.`);
      }
      current.associationKeys.add(`${result.coverage.id}|${evidence.id}`);
      current.sourceEvidenceIds.add(evidence.id);
      if (evidence.url.trim()) current.discoveryUrls.add(evidence.url.trim());
      if (evidence.title.trim()) current.discoveryTitles.add(evidence.title.trim());
      current.targetIdentities.set(result.coverage.id, targetIdentity);
      documents.set(globalDocumentKey, current);
    }
  }
  return [...documents.entries()]
    .map(([globalDocumentKey, value]): SynthesisSourceContentDocumentPlan => ({
      schemaVersion: 1,
      globalDocumentKey,
      sourceKind: value.sourceKind,
      documentId: value.documentId,
      associationCount: value.associationKeys.size,
      sourceEvidenceIds: [...value.sourceEvidenceIds].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
      discoveryUrls: [...value.discoveryUrls].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
      discoveryTitles: [...value.discoveryTitles].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
      targetIdentities: [...value.targetIdentities.values()].sort((left, right) =>
        left.coverageId.localeCompare(right.coverageId, "en"),
      ),
    }))
    .sort((left, right) => left.globalDocumentKey.localeCompare(right.globalDocumentKey, "en"));
};

export const sourceContentDocumentPlanSha256 = (
  plan: SynthesisSourceContentDocumentPlan,
): string => sha256(stableJson(plan));

const namedEntities: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  lt: "<",
  mdash: "—",
  minus: "−",
  nbsp: " ",
  ndash: "–",
  quot: '"',
};

const decodeEntities = (value: string): string =>
  value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, encoded: string) => {
    if (encoded.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(encoded.slice(2), 16));
    }
    if (encoded.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(encoded.slice(1), 10));
    }
    return namedEntities[encoded.toLocaleLowerCase("en")] ?? entity;
  });

const textFromMarkup = (markup: string): string =>
  decodeEntities(
    markup
      .replace(/<!--[\s\S]*?-->/gu, " ")
      .replace(/<(?:script|style)\b[\s\S]*?<\/(?:script|style)>/giu, " ")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/\s+/gu, " ")
    .trim();

const attributeValue = (attributes: string, name: string): string | null => {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "iu"),
  );
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim() || null;
};

interface ContentHeading {
  readonly position: number;
  readonly text: string;
  readonly id: string | null;
}

interface ContentBlock {
  readonly position: number;
  readonly kind: "journal_section" | "journal_figure" | "patent_paragraph";
  readonly id: string | null;
  readonly number: string | null;
  readonly heading: ContentHeading | null;
  readonly text: string;
}

const headingsFrom = (markup: string, expression: RegExp): readonly ContentHeading[] => {
  const headings: ContentHeading[] = [];
  for (const match of markup.matchAll(expression)) {
    const text = textFromMarkup(match[2] ?? "");
    if (!text) continue;
    headings.push({
      position: match.index ?? 0,
      text: text.slice(0, 180),
      id: attributeValue(match[1] ?? "", "id"),
    });
  }
  return headings;
};

const nearestHeading = (
  headings: readonly ContentHeading[],
  position: number,
): ContentHeading | null => {
  let nearest: ContentHeading | null = null;
  for (const heading of headings) {
    if (heading.position > position) break;
    nearest = heading;
  }
  return nearest;
};

const journalBlocks = (xml: string): readonly ContentBlock[] => {
  const headings = headingsFrom(xml, /<title\b([^>]*)>([\s\S]*?)<\/title>/giu);
  const figureRanges: { readonly start: number; readonly end: number }[] = [];
  const blocks: ContentBlock[] = [];
  for (const match of xml.matchAll(/<fig\b([^>]*)>([\s\S]*?)<\/fig>/giu)) {
    const position = match.index ?? 0;
    figureRanges.push({ start: position, end: position + match[0].length });
    const text = textFromMarkup(match[2] ?? "");
    if (!text) continue;
    const label = textFromMarkup((match[2] ?? "").match(/<label\b[^>]*>([\s\S]*?)<\/label>/iu)?.[1] ?? "");
    blocks.push({
      position,
      kind: "journal_figure",
      id: attributeValue(match[1] ?? "", "id"),
      number: label || null,
      heading: nearestHeading(headings, position),
      text,
    });
  }
  let paragraphOrdinal = 0;
  for (const match of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/giu)) {
    const position = match.index ?? 0;
    if (figureRanges.some((range) => position >= range.start && position < range.end)) continue;
    const text = textFromMarkup(match[2] ?? "");
    if (!text) continue;
    paragraphOrdinal += 1;
    blocks.push({
      position,
      kind: "journal_section",
      id: attributeValue(match[1] ?? "", "id"),
      number: String(paragraphOrdinal),
      heading: nearestHeading(headings, position),
      text,
    });
  }
  return blocks.sort((left, right) => left.position - right.position);
};

const patentBlocks = (html: string): readonly ContentBlock[] => {
  const headings = headingsFrom(
    html,
    /<(?:heading|h[1-6])\b([^>]*)>([\s\S]*?)<\/(?:heading|h[1-6])>/giu,
  );
  const blocks: ContentBlock[] = [];
  const occupiedRanges: { readonly start: number; readonly end: number }[] = [];
  const lineExpression = /<div\b([^>]*(?:description-line-numbered|\bid=["']p-[^"']+)[^>]*)>([\s\S]*?)<\/div>/giu;
  for (const match of html.matchAll(lineExpression)) {
    const text = textFromMarkup(match[2] ?? "");
    if (!text) continue;
    const position = match.index ?? 0;
    occupiedRanges.push({ start: position, end: position + match[0].length });
    blocks.push({
      position,
      kind: "patent_paragraph",
      id: attributeValue(match[1] ?? "", "id"),
      number:
        attributeValue(match[1] ?? "", "num") ??
        attributeValue(match[1] ?? "", "data-num"),
      heading: nearestHeading(headings, position),
      text,
    });
  }
  if (blocks.length === 0) {
    let ordinal = 0;
    for (const match of html.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/giu)) {
      const position = match.index ?? 0;
      if (occupiedRanges.some((range) => position >= range.start && position < range.end)) continue;
      const text = textFromMarkup(match[2] ?? "");
      if (!text) continue;
      ordinal += 1;
      blocks.push({
        position,
        kind: "patent_paragraph",
        id: attributeValue(match[1] ?? "", "id"),
        number: String(ordinal),
        heading: nearestHeading(headings, position),
        text,
      });
    }
  }
  return blocks.sort((left, right) => left.position - right.position);
};

const routeContextPatterns: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: "synthesis", pattern: /\bsynthesi[sz](?:e|ed|es|ing|s)?\b/iu },
  { label: "preparation", pattern: /\bprepar(?:ation|ative|e|ed|ing)\b/iu },
  { label: "reaction", pattern: /\breact(?:ion|ed|ing|s)\b/iu },
  { label: "intermediate", pattern: /\bintermediate\b/iu },
  { label: "example", pattern: /\bexample\s*[a-z0-9.-]*/iu },
  { label: "scheme", pattern: /\bscheme\s*[a-z0-9.-]*/iu },
  { label: "step", pattern: /\bstep\s*[a-z0-9.-]*/iu },
  { label: "conversion", pattern: /\bconvert(?:ed|ing|s)?\b/iu },
  { label: "obtained", pattern: /\bobtain(?:ed|ing|s)?\b/iu },
  { label: "transformation", pattern: /\b(?:condensation|cycli[sz]ation|reduction|oxidation|hydrolysis)\b/iu },
];

const routeContextCuesFor = (text: string): readonly string[] =>
  routeContextPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.label);

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const aliasMatch = (
  text: string,
  alias: string,
): { readonly start: number; readonly end: number } | null => {
  const expression = new RegExp(
    `(^|[^\\p{L}\\p{N}])(${escapeRegex(alias).replace(/\\\s+/gu, "\\\\s+")})(?![\\p{L}\\p{N}])`,
    "iu",
  );
  const match = expression.exec(text);
  if (!match) return null;
  const start = match.index + (match[1]?.length ?? 0);
  return { start, end: start + (match[2]?.length ?? alias.length) };
};

const safeLocatorToken = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return /^[a-z0-9_.:-]{1,80}$/iu.test(normalized) ? normalized : null;
};

const safeStructuralLabel = (
  value: string | null,
): { readonly kind: "example" | "scheme" | "step" | "figure"; readonly value: string } | null => {
  const match = value?.trim().match(/^(example|scheme|step|fig(?:ure)?)\s*([a-z0-9_.:-]{1,24})$/iu);
  if (!match) return null;
  const rawKind = match[1].toLocaleLowerCase("en");
  const kind = rawKind === "fig" || rawKind === "figure" ? "figure" : rawKind;
  return {
    kind: kind as "example" | "scheme" | "step" | "figure",
    value: `${kind[0].toLocaleUpperCase("en")}${kind.slice(1)} ${match[2]}`,
  };
};

const locatorFor = (
  block: ContentBlock,
): Pick<SynthesisSourceContentLocatorCandidate, "locatorKind" | "locatorValue"> => {
  const structuralHeading = safeStructuralLabel(block.heading?.text ?? null);
  const safeHeadingId = safeLocatorToken(block.heading?.id ?? null);
  const safeBlockId = safeLocatorToken(block.id);
  const safeNumber = safeLocatorToken(block.number);
  if (block.kind === "journal_figure") {
    const structuralLabel = safeStructuralLabel(block.number);
    const label = structuralLabel?.value ??
      (safeBlockId ? `figure-id ${safeBlockId}` : `figure ${safeNumber ?? "unlabelled"}`);
    return {
      locatorKind: "journal_figure",
      locatorValue: label,
    };
  }
  if (block.kind === "journal_section") {
    const paragraph = safeBlockId ?? safeNumber ?? "unlabelled";
    return {
      locatorKind: "journal_section",
      locatorValue: `paragraph ${paragraph}`,
    };
  }
  const paragraph = safeNumber ?? safeBlockId ?? "unlabelled";
  if (structuralHeading?.kind === "example") {
    return {
      locatorKind: "patent_example",
      locatorValue: `${structuralHeading.value}; paragraph ${paragraph}`,
    };
  }
  if (structuralHeading?.kind === "scheme") {
    return {
      locatorKind: "patent_scheme",
      locatorValue: `${structuralHeading.value}; paragraph ${paragraph}`,
    };
  }
  return {
    locatorKind: "patent_paragraph",
    locatorValue: `${safeHeadingId ? `heading-id ${safeHeadingId}; ` : ""}paragraph ${paragraph}`,
  };
};

interface PendingAliasMatch {
  readonly target: SynthesisSourceContentTargetIdentity;
  readonly query: SynthesisSourceContentAliasQuery;
  readonly start: number;
  readonly end: number;
}

const candidatesFromBlocks = (
  plan: SynthesisSourceContentDocumentPlan,
  blocks: readonly ContentBlock[],
): {
  readonly candidates: readonly SynthesisSourceContentLocatorCandidate[];
  readonly totalCandidateCount: number;
  readonly admittedCandidateCount: number;
  readonly ambiguousCandidateCount: number;
  readonly truncatedCandidateCount: number;
} => {
  const candidates: SynthesisSourceContentLocatorCandidate[] = [];
  for (const block of blocks) {
    // A heading such as "Synthesis" or "Example" must not turn an otherwise
    // clinical/formulation paragraph into a chemistry locator candidate.
    const cues = routeContextCuesFor(block.text);
    if (cues.length === 0) continue;
    const matches: PendingAliasMatch[] = [];
    for (const target of plan.targetIdentities) {
      for (const query of target.aliasQueries) {
        const match = aliasMatch(block.text, query.value);
        if (match) matches.push({ target, query, ...match });
      }
    }
    for (const match of matches) {
      const shadowing = matches.find(
        (candidate) =>
          candidate.target.catalogEntityId !== match.target.catalogEntityId &&
          candidate.start <= match.start &&
          candidate.end >= match.end &&
          candidate.query.value.length > match.query.value.length,
      );
      const ambiguous = match.query.identityAmbiguous || Boolean(shadowing);
      const identityMatchState = shadowing
        ? "shadowed_by_more_specific_alias" as const
        : match.query.identityAmbiguous
          ? "ambiguous_alias_context" as const
          : "unique_name_context" as const;
      const locator = locatorFor(block);
      const candidateId = `source-content-locator:${sha256(
        [
          plan.globalDocumentKey,
          match.target.coverageId,
          locator.locatorKind,
          locator.locatorValue,
          match.query.normalizedValue,
        ].join("|"),
      ).slice(0, 32)}`;
      const candidate: SynthesisSourceContentLocatorCandidate = {
        candidateId,
        coverageId: match.target.coverageId,
        catalogEntityId: match.target.catalogEntityId,
        ...locator,
        matchedAlias: match.query.value,
        aliasOrigin: match.query.origin,
        identityMatchState,
        admissionState: ambiguous ? "withheld_identity_ambiguous" : "review_candidate",
        molecularIdentityResolution: "name_only",
        formIdentityResolution: "unresolved_from_text",
        stereochemistryResolution: "unresolved_from_text",
        routeContextCues: cues,
        generatedContextSummary: SYNTHESIS_SOURCE_CONTENT_GENERATED_SUMMARY,
        contextSummaryCode: "catalog_alias_route_context_at_locator",
        contextSummaryMode: "generated_non_quoting",
        sourceTextRetained: false,
        reviewState: "pending",
        promotionState: "candidate_only",
        operationalDetailsIncluded: false,
      };
      assertSourceContentCandidateBoundary(candidate, block.text);
      candidates.push(candidate);
    }
  }
  const deduped = [...new Map(candidates.map((candidate) => [candidate.candidateId, candidate])).values()]
    .sort((left, right) =>
      Number(right.admissionState === "review_candidate") -
        Number(left.admissionState === "review_candidate") ||
      left.locatorValue.localeCompare(right.locatorValue, "en") ||
      left.catalogEntityId.localeCompare(right.catalogEntityId, "en"),
    );
  const retained = deduped.slice(0, SYNTHESIS_SOURCE_CONTENT_MAX_LOCATORS_PER_DOCUMENT);
  return {
    candidates: retained,
    totalCandidateCount: deduped.length,
    admittedCandidateCount: deduped.filter(
      (candidate) => candidate.admissionState === "review_candidate",
    ).length,
    ambiguousCandidateCount: deduped.filter(
      (candidate) => candidate.admissionState === "withheld_identity_ambiguous",
    ).length,
    truncatedCandidateCount: Math.max(0, deduped.length - retained.length),
  };
};

const candidateKeys = new Set([
  "candidateId",
  "coverageId",
  "catalogEntityId",
  "locatorKind",
  "locatorValue",
  "matchedAlias",
  "aliasOrigin",
  "identityMatchState",
  "admissionState",
  "molecularIdentityResolution",
  "formIdentityResolution",
  "stereochemistryResolution",
  "routeContextCues",
  "generatedContextSummary",
  "contextSummaryCode",
  "contextSummaryMode",
  "sourceTextRetained",
  "reviewState",
  "promotionState",
  "operationalDetailsIncluded",
]);

const allowedCueLabels = new Set(routeContextPatterns.map((entry) => entry.label));

const locatorIsStrictlyStructured = (
  candidate: SynthesisSourceContentLocatorCandidate,
): boolean => {
  const token = "[a-z0-9_.:-]{1,80}|unlabelled";
  if (candidate.locatorKind === "journal_section") {
    return new RegExp(`^paragraph (?:${token})$`, "iu").test(candidate.locatorValue);
  }
  if (candidate.locatorKind === "journal_figure") {
    return /^(?:(?:Figure|Scheme) [a-z0-9_.:-]{1,24}|figure-id [a-z0-9_.:-]{1,80}|figure (?:[a-z0-9_.:-]{1,80}|unlabelled))$/iu.test(
      candidate.locatorValue,
    );
  }
  if (candidate.locatorKind === "patent_example") {
    return new RegExp(`^Example [a-z0-9_.:-]{1,24}; paragraph (?:${token})$`, "iu").test(
      candidate.locatorValue,
    );
  }
  if (candidate.locatorKind === "patent_scheme") {
    return new RegExp(`^Scheme [a-z0-9_.:-]{1,24}; paragraph (?:${token})$`, "iu").test(
      candidate.locatorValue,
    );
  }
  return new RegExp(
    `^(?:heading-id [a-z0-9_.:-]{1,80}; )?paragraph (?:${token})$`,
    "iu",
  ).test(candidate.locatorValue);
};

const normalizedWords = (value: string): readonly string[] =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en")
    .match(/[a-z0-9]+/gu) ?? [];

/** Runtime storage gate: candidates are a strict projection, never excerpts. */
export const assertSourceContentCandidateBoundary = (
  candidate: SynthesisSourceContentLocatorCandidate,
  sourceText?: string,
): void => {
  const keys = Object.keys(candidate);
  const unexpected = keys.filter((key) => !candidateKeys.has(key));
  if (unexpected.length > 0) {
    throw new Error(`Source-content candidate contains non-whitelisted keys: ${unexpected.join(", ")}.`);
  }
  if (
    keys.some((key) =>
      /snippet|excerpt|quotation|quote|raw(?:text|content)|sourceprose|(?:heading|caption|paragraph|procedure)(?:text|content|prose)/iu.test(
        key,
      )
    )
  ) {
    throw new Error("Source-content candidate contains a forbidden source-text field.");
  }
  if (
    candidate.generatedContextSummary !== SYNTHESIS_SOURCE_CONTENT_GENERATED_SUMMARY ||
    candidate.contextSummaryCode !== "catalog_alias_route_context_at_locator" ||
    candidate.contextSummaryMode !== "generated_non_quoting" ||
    candidate.sourceTextRetained !== false ||
    candidate.operationalDetailsIncluded !== false ||
    !locatorIsStrictlyStructured(candidate) ||
    candidate.routeContextCues.some((cue) => !allowedCueLabels.has(cue))
  ) {
    throw new Error("Source-content candidate failed the generated-summary/structured-locator gate.");
  }
  if (sourceText) {
    const sourceWords = normalizedWords(sourceText);
    const sourceNgrams = new Set<string>();
    for (let index = 0; index + 4 < sourceWords.length; index += 1) {
      sourceNgrams.add(sourceWords.slice(index, index + 5).join(" "));
    }
    const summaryWords = normalizedWords(candidate.generatedContextSummary);
    for (let index = 0; index + 4 < summaryWords.length; index += 1) {
      if (sourceNgrams.has(summaryWords.slice(index, index + 5).join(" "))) {
        throw new Error("Generated context summary retained a five-word source-text sequence.");
      }
    }
  }
};

const metadataOnlyRights = (
  sourceKind: "journal" | "patent",
): SynthesisSourceContentRightsAssessment => ({
  licenseState: "metadata_only",
  copyrightState: sourceKind === "journal" ? "copyrighted" : "unclear",
  redistributionPermission: "metadata_only",
  paraphrasePermission: "metadata_only",
  figureSchemeReusePermission: "unknown",
  licenseEvidenceUrl: null,
  licenseTextSha256: null,
  openAccessLabelAloneUsedAsPermission: false,
  privateLocatorReviewOnly: true,
});

export const sourceContentMetadataOnlyRights = metadataOnlyRights;

const journalRights = (xml: string): SynthesisSourceContentRightsAssessment => {
  const licenseMatch = xml.match(/<license\b([^>]*)>([\s\S]*?)<\/license>/iu);
  if (!licenseMatch) {
    return {
      ...metadataOnlyRights("journal"),
      licenseState: "public_access_no_reuse_inference",
      paraphrasePermission: "unknown",
    };
  }
  const text = textFromMarkup(licenseMatch[2] ?? "");
  const href =
    attributeValue(licenseMatch[1] ?? "", "xlink:href") ??
    attributeValue(licenseMatch[1] ?? "", "href");
  const normalizedHref = href?.trim().toLocaleLowerCase("en") ?? "";
  const exactPublicDomainLicense = /^(?:https?:\/\/creativecommons\.org\/(?:publicdomain\/zero\/\d+(?:\.\d+)?|publicdomain\/mark\/\d+(?:\.\d+)?)\/?)$/iu.test(
    normalizedHref,
  );
  if (exactPublicDomainLicense) {
    return {
      licenseState: "open_license_detected",
      copyrightState: "public_domain",
      redistributionPermission: "permitted",
      paraphrasePermission: "permitted",
      figureSchemeReusePermission: "unknown",
      licenseEvidenceUrl: href,
      licenseTextSha256: text ? sha256(text) : null,
      openAccessLabelAloneUsedAsPermission: false,
      privateLocatorReviewOnly: true,
    };
  }
  const exactCcBy = /^https?:\/\/creativecommons\.org\/licenses\/by\/\d+(?:\.\d+)?\/?$/iu.test(
    normalizedHref,
  );
  if (exactCcBy) {
    return {
      licenseState: "open_license_detected",
      copyrightState: "copyrighted",
      redistributionPermission: "permitted_with_attribution",
      paraphrasePermission: "permitted_with_attribution",
      figureSchemeReusePermission: "unknown",
      licenseEvidenceUrl: href,
      licenseTextSha256: text ? sha256(text) : null,
      openAccessLabelAloneUsedAsPermission: false,
      privateLocatorReviewOnly: true,
    };
  }
  return {
    ...metadataOnlyRights("journal"),
    licenseState: "public_access_no_reuse_inference",
    paraphrasePermission: "unknown",
    licenseEvidenceUrl: href,
    licenseTextSha256: text ? sha256(text) : null,
  };
};

const patentRights = (): SynthesisSourceContentRightsAssessment => ({
  licenseState: "public_access_no_reuse_inference",
  copyrightState: "unclear",
  redistributionPermission: "metadata_only",
  paraphrasePermission: "unknown",
  figureSchemeReusePermission: "unknown",
  licenseEvidenceUrl: null,
  licenseTextSha256: null,
  openAccessLabelAloneUsedAsPermission: false,
  privateLocatorReviewOnly: true,
});

export interface ParsedSourceContent {
  readonly parserName: "molevren-source-content-locator";
  readonly parserVersion: string;
  readonly parseState: "parsed" | "parse_error" | "access_blocked_markup";
  readonly exactError: string | null;
  readonly inspectedBlockCount: number;
  readonly candidates: readonly SynthesisSourceContentLocatorCandidate[];
  readonly totalCandidateCount: number;
  readonly admittedCandidateCount: number;
  readonly ambiguousCandidateCount: number;
  readonly truncatedCandidateCount: number;
  readonly rights: SynthesisSourceContentRightsAssessment;
}

export const extractJournalSourceContent = (
  xml: string,
  plan: SynthesisSourceContentDocumentPlan,
): ParsedSourceContent => {
  if (!/<article(?:\s|>)/iu.test(xml)) {
    return {
      parserName: "molevren-source-content-locator",
      parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
      parseState: "parse_error",
      exactError: "Europe PMC full-text response did not contain a JATS article root.",
      inspectedBlockCount: 0,
      candidates: [],
      totalCandidateCount: 0,
      admittedCandidateCount: 0,
      ambiguousCandidateCount: 0,
      truncatedCandidateCount: 0,
      rights: metadataOnlyRights("journal"),
    };
  }
  const blocks = journalBlocks(xml);
  if (blocks.length === 0) {
    return {
      parserName: "molevren-source-content-locator",
      parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
      parseState: "parse_error",
      exactError: "JATS article contained no inspectable paragraph or figure blocks.",
      inspectedBlockCount: 0,
      candidates: [],
      totalCandidateCount: 0,
      admittedCandidateCount: 0,
      ambiguousCandidateCount: 0,
      truncatedCandidateCount: 0,
      rights: journalRights(xml),
    };
  }
  const extracted = candidatesFromBlocks(plan, blocks);
  return {
    parserName: "molevren-source-content-locator",
    parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
    parseState: "parsed",
    exactError: null,
    inspectedBlockCount: blocks.length,
    ...extracted,
    rights: journalRights(xml),
  };
};

export const extractPatentSourceContent = (
  html: string,
  plan: SynthesisSourceContentDocumentPlan,
): ParsedSourceContent => {
  if (/captcha|unusual traffic|verify (?:that )?you are (?:a )?human|automated queries/iu.test(html)) {
    return {
      parserName: "molevren-source-content-locator",
      parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
      parseState: "access_blocked_markup",
      exactError: "Patent source returned an anti-automation or human-verification page; no bypass attempted.",
      inspectedBlockCount: 0,
      candidates: [],
      totalCandidateCount: 0,
      admittedCandidateCount: 0,
      ambiguousCandidateCount: 0,
      truncatedCandidateCount: 0,
      rights: patentRights(),
    };
  }
  if (!/<html(?:\s|>)/iu.test(html)) {
    return {
      parserName: "molevren-source-content-locator",
      parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
      parseState: "parse_error",
      exactError: "Patent response did not contain an HTML document root.",
      inspectedBlockCount: 0,
      candidates: [],
      totalCandidateCount: 0,
      admittedCandidateCount: 0,
      ambiguousCandidateCount: 0,
      truncatedCandidateCount: 0,
      rights: patentRights(),
    };
  }
  const blocks = patentBlocks(html);
  if (blocks.length === 0) {
    return {
      parserName: "molevren-source-content-locator",
      parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
      parseState: "parse_error",
      exactError: "Patent HTML contained no inspectable description paragraphs.",
      inspectedBlockCount: 0,
      candidates: [],
      totalCandidateCount: 0,
      admittedCandidateCount: 0,
      ambiguousCandidateCount: 0,
      truncatedCandidateCount: 0,
      rights: patentRights(),
    };
  }
  const extracted = candidatesFromBlocks(plan, blocks);
  return {
    parserName: "molevren-source-content-locator",
    parserVersion: SYNTHESIS_SOURCE_CONTENT_PARSER_VERSION,
    parseState: "parsed",
    exactError: null,
    inspectedBlockCount: blocks.length,
    ...extracted,
    rights: patentRights(),
  };
};
