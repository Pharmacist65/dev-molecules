import type {
  SynthesisCoverageRecord,
  SynthesisCoverageSnapshotManifest,
} from "./synthesis-coverage";
import type {
  CanonicalSynthesisRoute,
  SynthesisIdentityScope,
  SynthesisSourceEvidence,
  SynthesisSourceEvidenceId,
} from "./synthesis-route";

export interface SynthesisValidationIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

const error = (
  code: string,
  path: string,
  message: string,
): SynthesisValidationIssue => ({ severity: "error", code, path, message });

const isNonBlank = (value: string): boolean => value.trim().length > 0;

const isIsoDate = (value: string): boolean =>
  isNonBlank(value) && !Number.isNaN(Date.parse(value));

const unique = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

const duplicateValues = (values: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

const isSha256 = (value: string): boolean => /^[a-f\d]{64}$/iu.test(value);

const isDirectHttpsDocumentUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;
    const location = `${parsed.pathname}${parsed.search}`;
    return !/(?:\/search(?:\/|\.|$)|[?&](?:q|query)=)/iu.test(location);
  } catch {
    return false;
  }
};

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const compatibleLocatorKind = (source: SynthesisSourceEvidence): boolean => {
  if (!source.locator) return false;
  if (source.sourceKind === "patent") {
    return source.locator.kind === "patent_example" ||
      source.locator.kind === "patent_scheme";
  }
  if (source.sourceKind === "journal") {
    return source.locator.kind === "journal_scheme" ||
      source.locator.kind === "journal_figure" ||
      source.locator.kind === "journal_section";
  }
  if (source.sourceKind === "open_reaction_dataset") {
    return source.locator.kind === "dataset_record";
  }
  return false;
};

const identityFingerprint = (identity: SynthesisIdentityScope): string =>
  JSON.stringify({
    catalogEntityId: identity.catalogEntityId,
    preferredName: identity.preferredName,
    aliases: identity.aliases,
    casNumber: identity.casNumber,
    pubChemCid: identity.pubChemCid,
    inchiKey: identity.inchiKey,
    connectivityKey: identity.connectivityKey,
    stereochemicalKey: identity.stereochemicalKey,
    canonicalSmiles: identity.canonicalSmiles,
    isomericSmiles: identity.isomericSmiles,
    sourceFormSmiles: identity.sourceFormSmiles,
    parentEntity: identity.parentEntity,
    chemicalForm: identity.chemicalForm,
    stereoisomer: identity.stereoisomer,
  });

export const getSynthesisCoverageIdForIdentity = (
  identity: Pick<SynthesisIdentityScope, "catalogEntityId">,
): `synthesis-coverage:${string}` =>
  `synthesis-coverage:${identity.catalogEntityId}`;

export const validateSynthesisIdentityScope = (
  identity: SynthesisIdentityScope,
  path = "identityScope",
): readonly SynthesisValidationIssue[] => {
  const issues: SynthesisValidationIssue[] = [];
  const requiredStrings: readonly [string, string][] = [
    ["catalogEntityId", identity.catalogEntityId],
    ["preferredName", identity.preferredName],
    ["casNumber", identity.casNumber],
    ["inchiKey", identity.inchiKey],
    ["connectivityKey", identity.connectivityKey],
    ["stereochemicalKey", identity.stereochemicalKey],
    ["canonicalSmiles", identity.canonicalSmiles],
    ["sourceFormSmiles", identity.sourceFormSmiles],
    ["parentEntity.id", identity.parentEntity.id],
    ["chemicalForm.id", identity.chemicalForm.id],
    ["stereoisomer.id", identity.stereoisomer.id],
  ];
  for (const [field, value] of requiredStrings) {
    if (!isNonBlank(value)) {
      issues.push(error(
        "incomplete-synthesis-identity",
        `${path}.${field}`,
        "Synthesis identity fields must be non-empty.",
      ));
    }
  }
  if (!Number.isSafeInteger(identity.pubChemCid) || identity.pubChemCid < 1) {
    issues.push(error(
      "invalid-synthesis-pubchem-cid",
      `${path}.pubChemCid`,
      "The target PubChem CID must be a positive safe integer.",
    ));
  }
  if (!/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u.test(identity.inchiKey)) {
    issues.push(error(
      "invalid-synthesis-inchikey",
      `${path}.inchiKey`,
      "The exact target InChIKey is malformed.",
    ));
  } else {
    const [connectivityKey, stereochemicalKey] = identity.inchiKey.split("-");
    if (identity.connectivityKey !== connectivityKey) {
      issues.push(error(
        "synthesis-connectivity-key-mismatch",
        `${path}.connectivityKey`,
        "The connectivity key must match the first InChIKey block.",
      ));
    }
    if (identity.stereochemicalKey !== stereochemicalKey) {
      issues.push(error(
        "synthesis-stereo-key-mismatch",
        `${path}.stereochemicalKey`,
        "The stereochemical key must match the second InChIKey block.",
      ));
    }
  }
  const normalizedAliases = identity.aliases.map((alias) =>
    alias.trim().toLocaleLowerCase("en")
  );
  if (
    normalizedAliases.some((alias) => !alias) ||
    !unique(normalizedAliases)
  ) {
    issues.push(error(
      "invalid-synthesis-aliases",
      `${path}.aliases`,
      "Identity aliases must be non-empty and unique after normalization.",
    ));
  }
  if (
    !Number.isSafeInteger(identity.chemicalForm.componentCount) ||
    identity.chemicalForm.componentCount < 1
  ) {
    issues.push(error(
      "invalid-synthesis-form-components",
      `${path}.chemicalForm.componentCount`,
      "A chemical form must contain at least one component.",
    ));
  }
  if (
    identity.chemicalForm.sourceKind === "single-component-source-form" &&
    identity.chemicalForm.componentCount !== 1
  ) {
    issues.push(error(
      "synthesis-form-kind-mismatch",
      `${path}.chemicalForm`,
      "A single-component source form must contain exactly one component.",
    ));
  }
  if (
    identity.chemicalForm.sourceKind === "multicomponent-source-form" &&
    identity.chemicalForm.componentCount < 2
  ) {
    issues.push(error(
      "synthesis-form-kind-mismatch",
      `${path}.chemicalForm`,
      "A multicomponent source form must contain at least two components.",
    ));
  }
  if (
    identity.parentEntity.relation === "self" &&
    (
      identity.parentEntity.resolutionStatus !== "self" ||
      identity.parentEntity.exactIdentity?.catalogEntityId !== identity.catalogEntityId ||
      identity.parentEntity.exactIdentity?.pubChemCid !== identity.pubChemCid ||
      identity.parentEntity.exactIdentity?.inchiKey !== identity.inchiKey ||
      identity.parentEntity.resolutionEvidenceIds.length !== 0
    )
  ) {
    issues.push(error(
      "synthesis-parent-relation-mismatch",
      `${path}.parentEntity`,
      "A self parent relation must pin the exact target identity without separate resolution evidence.",
    ));
  }
  if (identity.parentEntity.relation === "form-of-parent") {
    const parent = identity.parentEntity.exactIdentity;
    if (
      identity.parentEntity.resolutionStatus !== "resolved" ||
      !parent ||
      !isNonBlank(parent.catalogEntityId ?? "") ||
      !Number.isSafeInteger(parent.pubChemCid) ||
      parent.pubChemCid < 1 ||
      !/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u.test(parent.inchiKey) ||
      identity.parentEntity.resolutionEvidenceIds.length === 0
    ) {
      issues.push(error(
        "incomplete-resolved-synthesis-parent",
        `${path}.parentEntity`,
        "A resolved form-to-parent relation requires an exact parent identity and resolution evidence.",
      ));
    }
  }
  if (
    identity.parentEntity.relation === "form-of-unresolved-parent" &&
    (
      identity.parentEntity.resolutionStatus !== "unresolved" ||
      identity.parentEntity.exactIdentity !== null ||
      identity.parentEntity.resolutionEvidenceIds.length !== 0
    )
  ) {
    issues.push(error(
      "synthesis-parent-relation-mismatch",
      `${path}.parentEntity`,
      "An unresolved parent relation must remain explicitly unresolved.",
    ));
  }
  return issues;
};

export const validateSynthesisSourceEvidence = (
  source: SynthesisSourceEvidence,
  path = `sourceEvidence.${source.id}`,
): readonly SynthesisValidationIssue[] => {
  const issues: SynthesisValidationIssue[] = [];
  if (!source.id.startsWith("synthesis-source-evidence:") || !isNonBlank(source.id)) {
    issues.push(error(
      "invalid-synthesis-source-id",
      `${path}.id`,
      "Synthesis source evidence needs a stable prefixed ID.",
    ));
  }
  for (const [field, value] of [
    ["documentId", source.documentId],
    ["title", source.title],
    ["url", source.url],
  ] as const) {
    if (!isNonBlank(value)) {
      issues.push(error(
        "incomplete-synthesis-source",
        `${path}.${field}`,
        "Source identity and URL fields must be non-empty.",
      ));
    }
  }
  if (!isIsoDate(source.retrievedAt)) {
    issues.push(error(
      "invalid-synthesis-source-date",
      `${path}.retrievedAt`,
      "Source retrieval time must be ISO-compatible.",
    ));
  }
  if (!isHttpUrl(source.url)) {
    issues.push(error(
      "invalid-synthesis-source-url",
      `${path}.url`,
      "Discovery and resolved source URLs must use HTTP or HTTPS.",
    ));
  }
  const nextYear = new Date().getUTCFullYear() + 1;
  if (
    source.publicationYear !== null &&
    (!Number.isSafeInteger(source.publicationYear) ||
      source.publicationYear < 1000 ||
      source.publicationYear > nextYear)
  ) {
    issues.push(error(
      "invalid-synthesis-publication-year",
      `${path}.publicationYear`,
      "Publication year must be plausible when known.",
    ));
  }
  if (source.documentSha256 !== null && !isSha256(source.documentSha256)) {
    issues.push(error(
      "invalid-synthesis-source-digest",
      `${path}.documentSha256`,
      "A document digest must be a SHA-256 value.",
    ));
  }
  if (source.resolutionState === "resolved") {
    if (!source.sourceId?.startsWith("source:")) {
      issues.push(error(
        "resolved-synthesis-source-without-registry-id",
        `${path}.sourceId`,
        "Resolved direct evidence must have a source-registry ID.",
      ));
    }
    if (!isDirectHttpsDocumentUrl(source.url)) {
      issues.push(error(
        "resolved-synthesis-source-not-direct",
        `${path}.url`,
        "Resolved evidence must link directly to an HTTPS document, not search results.",
      ));
    }
    if (!source.locator || !isNonBlank(source.locator.value)) {
      issues.push(error(
        "resolved-synthesis-source-without-locator",
        `${path}.locator`,
        "Resolved route evidence requires a human-resolvable document locator.",
      ));
    } else if (!compatibleLocatorKind(source)) {
      issues.push(error(
        "synthesis-source-locator-kind-mismatch",
        `${path}.locator.kind`,
        "The locator kind does not match the source kind.",
      ));
    }
  }
  if (source.resolutionState !== "resolved" && source.supportScope === "complete_route") {
    issues.push(error(
      "unresolved-source-claims-complete-route",
      `${path}.supportScope`,
      "Candidate or rejected evidence cannot claim complete-route support.",
    ));
  }
  return issues;
};

const sourceMapFrom = (
  sources: readonly SynthesisSourceEvidence[],
): ReadonlyMap<SynthesisSourceEvidenceId, SynthesisSourceEvidence> =>
  new Map(sources.map((source) => [source.id, source] as const));

const validateKnownEvidenceIds = (
  ids: readonly SynthesisSourceEvidenceId[],
  sources: ReadonlyMap<SynthesisSourceEvidenceId, SynthesisSourceEvidence>,
  path: string,
): readonly SynthesisValidationIssue[] => {
  const issues: SynthesisValidationIssue[] = [];
  for (const duplicate of duplicateValues(ids)) {
    issues.push(error(
      "duplicate-synthesis-source-reference",
      path,
      `Source evidence ${duplicate} is referenced more than once.`,
    ));
  }
  ids.forEach((id, index) => {
    if (!sources.has(id)) {
      issues.push(error(
        "unknown-synthesis-source-evidence",
        `${path}[${index}]`,
        `Source evidence ${id} is not supplied to the validator.`,
      ));
    }
  });
  return issues;
};

export const validateSynthesisCoverageRecord = (
  record: SynthesisCoverageRecord,
  sourceEvidence: readonly SynthesisSourceEvidence[] = [],
): readonly SynthesisValidationIssue[] => {
  const path = `synthesisCoverage.${record.id}`;
  const issues: SynthesisValidationIssue[] = [
    ...validateSynthesisIdentityScope(record.identityScope, `${path}.identityScope`),
  ];
  const sources = sourceMapFrom(sourceEvidence);
  const expectedCoverageId = getSynthesisCoverageIdForIdentity(record.identityScope);
  if (record.id !== expectedCoverageId) {
    issues.push(error(
      "synthesis-coverage-identity-mismatch",
      `${path}.id`,
      `Coverage ID must be ${expectedCoverageId}.`,
    ));
  }
  if (!isNonBlank(record.catalogSnapshotId)) {
    issues.push(error(
      "missing-synthesis-catalog-snapshot",
      `${path}.catalogSnapshotId`,
      "Coverage must pin its catalog snapshot.",
    ));
  }
  if (record.sourceSearchScope.catalogSnapshotId !== record.catalogSnapshotId) {
    issues.push(error(
      "synthesis-search-snapshot-mismatch",
      `${path}.sourceSearchScope.catalogSnapshotId`,
      "Search scope and coverage must use the same catalog snapshot.",
    ));
  }
  if (!record.sourceSearchScope.searchId.startsWith("synthesis-search:")) {
    issues.push(error(
      "invalid-synthesis-search-id",
      `${path}.sourceSearchScope.searchId`,
      "Search scope needs a stable prefixed ID.",
    ));
  }
  for (const [field, value] of [
    ["pipelineVersion", record.sourceSearchScope.pipelineVersion],
    ["configurationHash", record.sourceSearchScope.configurationHash],
  ] as const) {
    if (!isNonBlank(value)) {
      issues.push(error(
        "incomplete-synthesis-search-scope",
        `${path}.sourceSearchScope.${field}`,
        "Search pipeline version and configuration hash are mandatory.",
      ));
    }
  }
  if (!isIsoDate(record.sourceSearchScope.startedAt)) {
    issues.push(error(
      "invalid-synthesis-search-date",
      `${path}.sourceSearchScope.startedAt`,
      "Search start time must be ISO-compatible.",
    ));
  }
  if (
    record.sourceSearchScope.completedAt !== null &&
    !isIsoDate(record.sourceSearchScope.completedAt)
  ) {
    issues.push(error(
      "invalid-synthesis-search-date",
      `${path}.sourceSearchScope.completedAt`,
      "Search completion time must be ISO-compatible when present.",
    ));
  }
  if (
    record.sourceSearchScope.completedAt !== null &&
    isIsoDate(record.sourceSearchScope.startedAt) &&
    Date.parse(record.sourceSearchScope.completedAt) <
      Date.parse(record.sourceSearchScope.startedAt)
  ) {
    issues.push(error(
      "synthesis-search-time-order",
      `${path}.sourceSearchScope.completedAt`,
      "Search completion cannot precede its start.",
    ));
  }
  if (record.sourceSearchScope.exhaustiveInternetSearch !== false) {
    issues.push(error(
      "synthesis-search-exhaustiveness-claim",
      `${path}.sourceSearchScope.exhaustiveInternetSearch`,
      "The discovery pipeline must not claim an exhaustive Internet search.",
    ));
  }
  const normalizedQueries = record.sourceSearchScope.aliasesQueried.map((value) =>
    value.trim().toLocaleLowerCase("en")
  );
  if (
    normalizedQueries.some((value) => !value) ||
    !unique(normalizedQueries)
  ) {
    issues.push(error(
      "invalid-synthesis-search-aliases",
      `${path}.sourceSearchScope.aliasesQueried`,
      "Queried aliases must be non-empty and unique after normalization.",
    ));
  }
  const providerKeys = record.sourceSearchScope.providers.map(
    (provider) => `${provider.provider}:${provider.adapterId}`,
  );
  if (!unique(providerKeys)) {
    issues.push(error(
      "duplicate-synthesis-search-provider",
      `${path}.sourceSearchScope.providers`,
      "A provider adapter may appear only once in a search scope.",
    ));
  }
  record.sourceSearchScope.providers.forEach((provider, index) => {
    const providerPath = `${path}.sourceSearchScope.providers[${index}]`;
    if (!isNonBlank(provider.adapterId) || !isNonBlank(provider.adapterVersion)) {
      issues.push(error(
        "incomplete-synthesis-search-provider",
        providerPath,
        "Search provider adapter identity and version are required.",
      ));
    }
    if (
      !Number.isSafeInteger(provider.queryCount) || provider.queryCount < 0 ||
      !Number.isSafeInteger(provider.candidateCount) || provider.candidateCount < 0
    ) {
      issues.push(error(
        "invalid-synthesis-search-count",
        providerPath,
        "Provider query and candidate counts must be non-negative safe integers.",
      ));
    }
    if (!isIsoDate(provider.searchedAt)) {
      issues.push(error(
        "invalid-synthesis-search-date",
        `${providerPath}.searchedAt`,
        "Provider search time must be ISO-compatible.",
      ));
    }
    if (provider.status === "completed" && provider.errors.length > 0) {
      issues.push(error(
        "completed-synthesis-provider-has-errors",
        `${providerPath}.errors`,
        "A completed provider attempt cannot retain errors.",
      ));
    }
  });
  if (record.assessmentState === "not_assessed") {
    if (
      record.sourceSearchScope.completedAt !== null ||
      record.sourceSearchScope.providers.length > 0 ||
      record.sourceEvidenceIds.length > 0 ||
      record.routes.length > 0 ||
      record.sourceEvidenceState !== "none_found"
    ) {
      issues.push(error(
        "not-assessed-synthesis-has-results",
        path,
        "A not-assessed record cannot carry search results or routes.",
      ));
    }
  }
  if (
    record.assessmentState === "searching" &&
    record.sourceSearchScope.completedAt !== null
  ) {
    issues.push(error(
      "searching-synthesis-marked-complete",
      `${path}.sourceSearchScope.completedAt`,
      "A searching assessment cannot have a completion time.",
    ));
  }
  if (record.assessmentState === "assessed") {
    if (record.sourceSearchScope.completedAt === null) {
      issues.push(error(
        "assessed-synthesis-without-completion",
        `${path}.sourceSearchScope.completedAt`,
        "An assessed record requires a completed search run.",
      ));
    }
    const providerKinds = new Set(
      record.sourceSearchScope.providers.map((provider) => provider.provider),
    );
    for (const required of [
      "patent",
      "journal",
      "open_reaction_dataset",
    ] as const) {
      if (!providerKinds.has(required)) {
        issues.push(error(
          "missing-synthesis-search-provider",
          `${path}.sourceSearchScope.providers`,
          `Assessed coverage must record an attempt for ${required}.`,
        ));
      }
    }
    const identifiers = record.sourceSearchScope.identifiersQueried;
    if (!identifiers.some(
      (query) => query.kind === "pubchem_cid" &&
        query.value === String(record.identityScope.pubChemCid),
    )) {
      issues.push(error(
        "missing-synthesis-cid-query",
        `${path}.sourceSearchScope.identifiersQueried`,
        "Assessed coverage must record the exact PubChem CID query.",
      ));
    }
    const expectedSmilesKind = record.identityScope.isomericSmiles
      ? "isomeric_smiles"
      : "canonical_smiles";
    const expectedSmiles =
      record.identityScope.isomericSmiles ?? record.identityScope.canonicalSmiles;
    if (!identifiers.some(
      (query) => query.kind === expectedSmilesKind && query.value === expectedSmiles,
    )) {
      issues.push(error(
        "missing-synthesis-smiles-query",
        `${path}.sourceSearchScope.identifiersQueried`,
        "Assessed coverage must record the exact SMILES identity submitted to the reaction dataset.",
      ));
    }
    if (!normalizedQueries.includes(
      record.identityScope.preferredName.trim().toLocaleLowerCase("en"),
    )) {
      issues.push(error(
        "missing-synthesis-preferred-name-query",
        `${path}.sourceSearchScope.aliasesQueried`,
        "Assessed coverage must include the preferred name in its alias search.",
      ));
    }
  }
  issues.push(...validateKnownEvidenceIds(
    record.sourceEvidenceIds,
    sources,
    `${path}.sourceEvidenceIds`,
  ));
  const resolvedSources = record.sourceEvidenceIds
    .map((id) => sources.get(id))
    .filter((source): source is SynthesisSourceEvidence => Boolean(source));
  if (
    record.sourceEvidenceState === "none_found" &&
    (record.sourceEvidenceIds.length > 0 ||
      record.routes.some((route) => route.routeType !== "computational_proposed") ||
      record.sourceSearchScope.providers.some(
        (provider) => provider.candidateCount > 0,
      ))
  ) {
    issues.push(error(
      "none-found-synthesis-has-source-route",
      `${path}.sourceEvidenceState`,
      "None-found coverage may only carry a clearly computational proposal.",
    ));
  }
  if (
    record.sourceEvidenceState === "none_found" &&
    record.assessmentState === "assessed" &&
    record.sourceSearchScope.providers.some(
      (provider) => provider.status !== "completed",
    )
  ) {
    issues.push(error(
      "none-found-synthesis-search-incomplete",
      `${path}.sourceSearchScope.providers`,
      "None-found requires every configured provider attempt to complete without errors.",
    ));
  }
  if (
    record.sourceEvidenceState === "candidate_sources" &&
    (record.sourceEvidenceIds.length === 0 ||
      !resolvedSources.some((source) => source.resolutionState === "candidate") ||
      resolvedSources.some((source) => source.resolutionState === "resolved") ||
      !record.sourceSearchScope.providers.some(
        (provider) => provider.candidateCount > 0,
      ))
  ) {
    issues.push(error(
      "candidate-synthesis-state-without-candidate",
      `${path}.sourceEvidenceState`,
      "Candidate-source state requires at least one candidate evidence record.",
    ));
  }
  if (
    record.sourceEvidenceState === "candidate_sources" &&
    record.routes.some((route) => route.routeType !== "computational_proposed")
  ) {
    issues.push(error(
      "candidate-synthesis-has-source-route",
      `${path}.routes`,
      "Candidate sources cannot support a reported or teaching route until they resolve directly.",
    ));
  }
  if (
    record.sourceEvidenceState === "direct_source_resolved" &&
    !resolvedSources.some((source) => source.resolutionState === "resolved")
  ) {
    issues.push(error(
      "resolved-synthesis-state-without-direct-source",
      `${path}.sourceEvidenceState`,
      "Direct-source state requires at least one resolved direct source.",
    ));
  }
  const routeIds = record.routes.map((route) => route.routeId);
  if (!unique(routeIds)) {
    issues.push(error(
      "duplicate-synthesis-coverage-route",
      `${path}.routes`,
      "A coverage record cannot reference the same route more than once.",
    ));
  }
  for (const [index, route] of record.routes.entries()) {
    if (
      route.reviewState === "verified" &&
      (route.routeType === "teaching_reconstruction" ||
        route.routeType === "computational_proposed")
    ) {
      issues.push(error(
        "non-reported-synthesis-marked-verified",
        `${path}.routes[${index}].reviewState`,
        "Teaching and computational routes must not be displayed as verified science.",
      ));
    }
  }
  const hasSourceBackedRoute = record.routes.some(
    (route) => route.routeType !== "computational_proposed",
  );
  if (
    record.applicability === "applicable" &&
    (
      record.sourceEvidenceState !== "direct_source_resolved" ||
      !hasSourceBackedRoute
    )
  ) {
    issues.push(error(
      "applicable-synthesis-without-direct-route-evidence",
      `${path}.applicability`,
      "Applicable coverage requires a source-backed route and resolved direct evidence for the exact identity.",
    ));
  }
  if (record.applicability === "not_applicable" && record.routes.length > 0) {
    issues.push(error(
      "non-applicable-synthesis-has-routes",
      `${path}.routes`,
      "A not-applicable coverage record cannot contain routes.",
    ));
  }
  if (record.unresolvedReasons.some((reason) => !isNonBlank(reason))) {
    issues.push(error(
      "empty-synthesis-unresolved-reason",
      `${path}.unresolvedReasons`,
      "Unresolved reasons must be non-empty.",
    ));
  }
  if (
    record.assessmentState === "assessed" &&
    record.routes.length === 0 &&
    record.unresolvedReasons.length === 0
  ) {
    issues.push(error(
      "silent-empty-synthesis-coverage",
      `${path}.unresolvedReasons`,
      "Assessed coverage without a route must state why no route is open.",
    ));
  }
  if (!isIsoDate(record.updatedAt)) {
    issues.push(error(
      "invalid-synthesis-coverage-date",
      `${path}.updatedAt`,
      "Coverage update time must be ISO-compatible.",
    ));
  }
  return issues;
};

export const validateSynthesisCoverageSnapshot = (
  records: readonly SynthesisCoverageRecord[],
  expectedIdentities: readonly SynthesisIdentityScope[],
  manifest: SynthesisCoverageSnapshotManifest,
  sourceEvidence: readonly SynthesisSourceEvidence[] = [],
): readonly SynthesisValidationIssue[] => {
  const issues: SynthesisValidationIssue[] = [];
  if (!isNonBlank(manifest.catalogSnapshotId) || !isNonBlank(manifest.pipelineVersion)) {
    issues.push(error(
      "incomplete-synthesis-coverage-manifest",
      "synthesisCoverageManifest",
      "Coverage manifest must pin catalog and pipeline versions.",
    ));
  }
  if (!isIsoDate(manifest.generatedAt)) {
    issues.push(error(
      "invalid-synthesis-coverage-manifest-date",
      "synthesisCoverageManifest.generatedAt",
      "Manifest generation time must be ISO-compatible.",
    ));
  }
  if (!isSha256(manifest.coverageSha256)) {
    issues.push(error(
      "invalid-synthesis-coverage-digest",
      "synthesisCoverageManifest.coverageSha256",
      "Coverage manifest must contain a SHA-256 digest.",
    ));
  }
  if (
    !Number.isSafeInteger(manifest.recordCount) ||
    manifest.recordCount < 1 ||
    manifest.recordCount !== records.length ||
    manifest.recordCount !== expectedIdentities.length
  ) {
    issues.push(error(
      "synthesis-coverage-count-mismatch",
      "synthesisCoverageManifest.recordCount",
      "Manifest, catalog identity and coverage counts must match exactly.",
    ));
  }
  for (const duplicate of duplicateValues(records.map((record) => record.id))) {
    issues.push(error(
      "duplicate-synthesis-coverage-id",
      "synthesisCoverage",
      `Coverage ID ${duplicate} is duplicated.`,
    ));
  }
  for (const duplicate of duplicateValues(
    records.map((record) => record.identityScope.catalogEntityId),
  )) {
    issues.push(error(
      "duplicate-synthesis-coverage-identity",
      "synthesisCoverage",
      `Catalog identity ${duplicate} has more than one coverage record.`,
    ));
  }
  for (const duplicate of duplicateValues(
    expectedIdentities.map((identity) => identity.catalogEntityId),
  )) {
    issues.push(error(
      "duplicate-expected-synthesis-identity",
      "expectedSynthesisIdentities",
      `Expected catalog identity ${duplicate} is duplicated.`,
    ));
  }
  const expectedById = new Map(
    expectedIdentities.map((identity) => [identity.catalogEntityId, identity] as const),
  );
  const actualIds = new Set(records.map(
    (record) => record.identityScope.catalogEntityId,
  ));
  for (const record of records) {
    issues.push(...validateSynthesisCoverageRecord(record, sourceEvidence));
    if (record.catalogSnapshotId !== manifest.catalogSnapshotId) {
      issues.push(error(
        "synthesis-coverage-manifest-snapshot-mismatch",
        `synthesisCoverage.${record.id}.catalogSnapshotId`,
        "Coverage and manifest catalog snapshots differ.",
      ));
    }
    const expected = expectedById.get(record.identityScope.catalogEntityId);
    if (!expected) {
      issues.push(error(
        "unexpected-synthesis-coverage-identity",
        `synthesisCoverage.${record.id}.identityScope.catalogEntityId`,
        "Coverage identity is not present in the catalog snapshot.",
      ));
    } else if (identityFingerprint(expected) !== identityFingerprint(record.identityScope)) {
      issues.push(error(
        "synthesis-coverage-identity-drift",
        `synthesisCoverage.${record.id}.identityScope`,
        "Coverage identity differs from the exact catalog form/stereo identity.",
      ));
    }
  }
  for (const expected of expectedIdentities) {
    if (!actualIds.has(expected.catalogEntityId)) {
      issues.push(error(
        "missing-synthesis-coverage-identity",
        "synthesisCoverage",
        `Catalog identity ${expected.catalogEntityId} has no coverage record.`,
      ));
    }
  }
  return issues;
};

/** Ensures coverage references and separately sharded route records cannot drift. */
export const validateSynthesisCoverageRouteLinks = (
  records: readonly SynthesisCoverageRecord[],
  routes: readonly CanonicalSynthesisRoute[],
): readonly SynthesisValidationIssue[] => {
  const issues: SynthesisValidationIssue[] = [];
  const coverageById = new Map(records.map((record) => [record.id, record] as const));
  const routeById = new Map(routes.map((route) => [route.id, route] as const));
  for (const duplicate of duplicateValues(routes.map((route) => route.id))) {
    issues.push(error(
      "duplicate-linked-synthesis-route",
      "synthesisRoutes",
      `Canonical route ${duplicate} is duplicated.`,
    ));
  }
  const referenceCounts = new Map<string, number>();
  for (const record of records) {
    record.routes.forEach((reference, index) => {
      const path = `synthesisCoverage.${record.id}.routes[${index}]`;
      referenceCounts.set(
        reference.routeId,
        (referenceCounts.get(reference.routeId) ?? 0) + 1,
      );
      const route = routeById.get(reference.routeId);
      if (!route) {
        issues.push(error(
          "unknown-linked-synthesis-route",
          `${path}.routeId`,
          `Coverage references missing route ${reference.routeId}.`,
        ));
        return;
      }
      if (
        route.coverageId !== record.id ||
        identityFingerprint(route.identityScope) !==
          identityFingerprint(record.identityScope)
      ) {
        issues.push(error(
          "linked-synthesis-route-identity-mismatch",
          path,
          "A linked route must belong to the exact same coverage form/stereo identity.",
        ));
      }
      if (
        reference.routeType !== route.routeType ||
        reference.routeCompleteness !== route.routeCompleteness ||
        reference.reviewState !== route.reviewState ||
        reference.licenseState !== route.licenseState
      ) {
        issues.push(error(
          "linked-synthesis-route-summary-drift",
          path,
          "Coverage route summaries must match their canonical route record.",
        ));
      }
    });
  }
  for (const route of routes) {
    if (!coverageById.has(route.coverageId)) {
      issues.push(error(
        "orphan-canonical-synthesis-route",
        `synthesisRoutes.${route.id}.coverageId`,
        "Every canonical route must belong to a coverage record.",
      ));
    }
    if ((referenceCounts.get(route.id) ?? 0) !== 1) {
      issues.push(error(
        "canonical-synthesis-route-reference-count",
        `synthesisRoutes.${route.id}`,
        "Every canonical route must be referenced exactly once by its coverage record.",
      ));
    }
  }
  return issues;
};

const FORBIDDEN_OPERATIONAL_KEYS = new Set([
  "amount",
  "amounts",
  "apparatus",
  "concentration",
  "duration",
  "pressure",
  "procedure",
  "quantity",
  "reagentequivalents",
  "solvent",
  "temperature",
  "workup",
  "yield",
]);

const findOperationalContent = (
  value: unknown,
  path: string,
  issues: SynthesisValidationIssue[],
): void => {
  if (typeof value === "string") {
    if (
      /\b\d+(?:\.\d+)?\s*(?:mg|g|kg|mL|mmol|mol)\b/iu.test(value) ||
      /°\s*[CF]|\bpH\s*\d/iu.test(value)
    ) {
      issues.push(error(
        "operational-synthesis-content",
        path,
        "Public synthesis routes cannot contain operational quantities or conditions.",
      ));
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      findOperationalContent(entry, `${path}[${index}]`, issues)
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_OPERATIONAL_KEYS.has(key.toLocaleLowerCase("en"))) {
      issues.push(error(
        "operational-synthesis-key",
        childPath,
        `Operational field ${key} is forbidden in public route data.`,
      ));
    }
    findOperationalContent(entry, childPath, issues);
  }
};

export const validateCanonicalSynthesisRoute = (
  route: CanonicalSynthesisRoute,
  sourceEvidence: readonly SynthesisSourceEvidence[],
): readonly SynthesisValidationIssue[] => {
  const path = `synthesisRoutes.${route.id}`;
  const issues: SynthesisValidationIssue[] = [
    ...validateSynthesisIdentityScope(route.identityScope, `${path}.identityScope`),
  ];
  const sources = sourceMapFrom(sourceEvidence);
  for (const duplicate of duplicateValues(sourceEvidence.map((source) => source.id))) {
    issues.push(error(
      "duplicate-synthesis-source-evidence-id",
      "sourceEvidence",
      `Source evidence ID ${duplicate} is duplicated.`,
    ));
  }
  sourceEvidence.forEach((source) =>
    issues.push(...validateSynthesisSourceEvidence(source))
  );
  if (!route.id.startsWith("synthesis-route:")) {
    issues.push(error(
      "invalid-canonical-synthesis-route-id",
      `${path}.id`,
      "A canonical route requires a stable prefixed ID.",
    ));
  }
  const expectedCoverageId = getSynthesisCoverageIdForIdentity(route.identityScope);
  if (route.coverageId !== expectedCoverageId) {
    issues.push(error(
      "synthesis-route-coverage-mismatch",
      `${path}.coverageId`,
      `Route coverage ID must be ${expectedCoverageId}.`,
    ));
  }
  if (!/^\d+\.\d+\.\d+$/u.test(route.version)) {
    issues.push(error(
      "invalid-synthesis-route-version",
      `${path}.version`,
      "Route versions must use semantic x.y.z form.",
    ));
  }
  for (const [field, value] of [
    ["routeFamilyId", route.routeFamilyId],
    ["title", route.title],
    ["startBoundary", route.startBoundary],
    ["stereochemicalStrategy", route.stereochemicalStrategy],
  ] as const) {
    if (!isNonBlank(value)) {
      issues.push(error(
        "incomplete-canonical-synthesis-route",
        `${path}.${field}`,
        "Canonical route identity, title, start boundary and stereochemical strategy are mandatory.",
      ));
    }
  }
  const nextYear = new Date().getUTCFullYear() + 1;
  if (
    route.publicationYear !== null &&
    (!Number.isSafeInteger(route.publicationYear) ||
      route.publicationYear < 1000 ||
      route.publicationYear > nextYear)
  ) {
    issues.push(error(
      "invalid-synthesis-route-year",
      `${path}.publicationYear`,
      "Route publication year must be plausible when known.",
    ));
  }
  if (route.applicability === "not_applicable") {
    issues.push(error(
      "non-applicable-canonical-synthesis-route",
      `${path}.applicability`,
      "Not-applicable belongs on coverage; it cannot contain a canonical route.",
    ));
  }
  if (route.safety.operationalDetailsIncluded !== false) {
    issues.push(error(
      "operational-synthesis-route",
      `${path}.safety.operationalDetailsIncluded`,
      "Canonical public routes must explicitly exclude operational details.",
    ));
  }
  findOperationalContent(route, path, issues);

  const materialIds = route.materials.map((material) => material.id);
  for (const duplicate of duplicateValues(materialIds)) {
    issues.push(error(
      "duplicate-canonical-synthesis-material",
      `${path}.materials`,
      `Material ${duplicate} is duplicated.`,
    ));
  }
  const materialById = new Map(
    route.materials.map((material) => [material.id, material] as const),
  );
  route.materials.forEach((material, index) => {
    const materialPath = `${path}.materials[${index}]`;
    if (!material.id.startsWith("synthesis-material:") || !isNonBlank(material.label)) {
      issues.push(error(
        "invalid-canonical-synthesis-material",
        materialPath,
        "Materials need stable IDs and non-empty labels.",
      ));
    }
    if (
      material.identityResolution === "exact_inchi_key" &&
      (!material.inchiKey ||
        !/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u.test(material.inchiKey))
    ) {
      issues.push(error(
        "exact-synthesis-material-without-inchikey",
        `${materialPath}.inchiKey`,
        "An exact material identity requires a valid InChIKey.",
      ));
    }
    if (
      (material.identityResolution === "exact_inchi_key" ||
        material.identityResolution === "connectivity_only") &&
      !material.canonicalSmiles?.trim()
    ) {
      issues.push(error(
        "resolved-synthesis-material-without-structure",
        `${materialPath}.canonicalSmiles`,
        "Resolved material identity requires source-linked connectivity.",
      ));
    }
    issues.push(...validateKnownEvidenceIds(
      material.sourceEvidenceIds,
      sources,
      `${materialPath}.sourceEvidenceIds`,
    ));
    for (const sourceId of material.sourceEvidenceIds) {
      if (!route.sourceEvidenceIds.includes(sourceId)) {
        issues.push(error(
          "material-source-outside-synthesis-route",
          `${materialPath}.sourceEvidenceIds`,
          "Material evidence must be declared by its containing route.",
        ));
      }
    }
  });
  const target = materialById.get(route.targetMaterialId);
  if (!target || (target.role !== "target_parent" && target.role !== "target_form")) {
    issues.push(error(
      "invalid-canonical-synthesis-target",
      `${path}.targetMaterialId`,
      "Route target must resolve to a declared target parent or target form.",
    ));
  } else if (
    target.identityResolution !== "exact_inchi_key" ||
    target.inchiKey !== route.identityScope.inchiKey ||
    target.canonicalSmiles !== route.identityScope.canonicalSmiles ||
    target.isomericSmiles !== route.identityScope.isomericSmiles
  ) {
    issues.push(error(
      "synthesis-target-identity-mismatch",
      `${path}.targetMaterialId`,
      "The terminal target must exactly match the coverage form/stereo InChIKey.",
    ));
  }
  if (
    target &&
    route.identityScope.chemicalForm.normalizedKind === "free_parent" &&
    target.role !== "target_parent"
  ) {
    issues.push(error(
      "synthesis-target-form-role-mismatch",
      `${path}.targetMaterialId`,
      "A free-parent coverage identity must terminate in a target-parent material.",
    ));
  }
  if (
    target &&
    ["salt", "hydrate", "solvate"].includes(
      route.identityScope.chemicalForm.normalizedKind,
    ) &&
    target.role !== "target_form"
  ) {
    issues.push(error(
      "synthesis-target-form-role-mismatch",
      `${path}.targetMaterialId`,
      "Salt, hydrate and solvate coverage identities must terminate in a target-form material.",
    ));
  }

  if (route.steps.length === 0) {
    issues.push(error(
      "empty-canonical-synthesis-route",
      `${path}.steps`,
      "A canonical route requires at least one chemical or form transformation.",
    ));
  }
  const stepIds = route.steps.map((step) => step.id);
  for (const duplicate of duplicateValues(stepIds)) {
    issues.push(error(
      "duplicate-canonical-synthesis-step",
      `${path}.steps`,
      `Step ${duplicate} is duplicated.`,
    ));
  }
  const stepById = new Map(route.steps.map((step) => [step.id, step] as const));
  const producerOrder = new Map<string, number>();
  route.steps.forEach((step, index) => {
    const stepPath = `${path}.steps[${index}]`;
    if (!step.id.startsWith("synthesis-route-step:")) {
      issues.push(error(
        "invalid-canonical-synthesis-step-id",
        `${stepPath}.id`,
        "Canonical steps need stable prefixed IDs.",
      ));
    }
    if (step.order !== index + 1) {
      issues.push(error(
        "invalid-canonical-synthesis-step-order",
        `${stepPath}.order`,
        "Canonical steps must be consecutively ordered from one.",
      ));
    }
    if (!isNonBlank(step.title) || !isNonBlank(step.reactionClass.label)) {
      issues.push(error(
        "incomplete-canonical-synthesis-step",
        stepPath,
        "Each step needs a title and reaction-class label.",
      ));
    }
    if (
      step.reactionClass.normalizationState === "normalized" &&
      !step.reactionClass.taxonomyId?.trim()
    ) {
      issues.push(error(
        "normalized-reaction-class-without-id",
        `${stepPath}.reactionClass.taxonomyId`,
        "A normalized reaction class requires a taxonomy ID.",
      ));
    }
    if (step.inputMaterialIds.length === 0 || step.outputMaterialIds.length === 0) {
      issues.push(error(
        "synthesis-step-missing-material-boundary",
        stepPath,
        "A real step requires at least one input and one output material.",
      ));
    }
    if (!unique(step.inputMaterialIds) || !unique(step.outputMaterialIds)) {
      issues.push(error(
        "duplicate-synthesis-step-material",
        stepPath,
        "Step input and output material IDs must be unique.",
      ));
    }
    for (const [kind, ids] of [
      ["input", step.inputMaterialIds],
      ["output", step.outputMaterialIds],
    ] as const) {
      ids.forEach((id, materialIndex) => {
        if (!materialById.has(id)) {
          issues.push(error(
            "unknown-synthesis-step-material",
            `${stepPath}.${kind}MaterialIds[${materialIndex}]`,
            `Step references unknown material ${id}.`,
          ));
        }
      });
    }
    for (const outputId of step.outputMaterialIds) {
      if (producerOrder.has(outputId)) {
        issues.push(error(
          "multiply-produced-synthesis-material",
          `${stepPath}.outputMaterialIds`,
          `Material ${outputId} is produced by more than one step.`,
        ));
      } else {
        producerOrder.set(outputId, step.order);
      }
    }
    if (step.bondChanges.length === 0 && step.stateChanges.length === 0) {
      issues.push(error(
        "synthesis-step-without-change",
        stepPath,
        "Evidence-orientation frames are not reactions; a canonical step needs a bond or state change.",
      ));
    }
    issues.push(...validateKnownEvidenceIds(
      step.sourceEvidenceIds,
      sources,
      `${stepPath}.sourceEvidenceIds`,
    ));
    for (const sourceId of step.sourceEvidenceIds) {
      if (!route.sourceEvidenceIds.includes(sourceId)) {
        issues.push(error(
          "step-source-outside-synthesis-route",
          `${stepPath}.sourceEvidenceIds`,
          "Step evidence must be declared by its containing route.",
        ));
      }
    }
    step.bondChanges.forEach((change, changeIndex) => {
      const changePath = `${stepPath}.bondChanges[${changeIndex}]`;
      if (!isNonBlank(change.description)) {
        issues.push(error(
          "empty-synthesis-bond-change-description",
          `${changePath}.description`,
          "Bond changes require a source-bounded description.",
        ));
      }
      if (change.mappingState === "not_mapped") {
        if (
          change.atoms !== null ||
          change.beforeOrder !== null ||
          change.afterOrder !== null
        ) {
          issues.push(error(
            "unmapped-synthesis-bond-has-atom-claims",
            changePath,
            "An unmapped bond change cannot carry fabricated atom references or bond orders.",
          ));
        }
        return;
      }
      for (const [atomIndex, atom] of change.atoms.entries()) {
        if (!materialById.has(atom.materialId)) {
          issues.push(error(
            "unknown-synthesis-bond-material",
            `${changePath}.atoms[${atomIndex}].materialId`,
            "Bond-change atoms must reference route-local materials.",
          ));
        }
        if (
          !Number.isSafeInteger(atom.atomMap) || atom.atomMap < 1 ||
          !isNonBlank(atom.element) || !isSha256(atom.structureHash)
        ) {
          issues.push(error(
            "invalid-synthesis-atom-reference",
            `${changePath}.atoms[${atomIndex}]`,
            "Atom references require a positive map, element and pinned structure hash.",
          ));
        }
      }
      const validOrders = change.kind === "formed"
        ? change.beforeOrder === 0 && change.afterOrder > 0
        : change.kind === "broken"
          ? change.beforeOrder > 0 && change.afterOrder === 0
          : change.beforeOrder > 0 &&
            change.afterOrder > 0 &&
            change.beforeOrder !== change.afterOrder;
      if (!validOrders) {
        issues.push(error(
          "synthesis-bond-change-order-mismatch",
          changePath,
          "Bond orders must agree with formed, broken or order-changed semantics.",
        ));
      }
    });
    step.stateChanges.forEach((change, changeIndex) => {
      if (!isNonBlank(change.summary)) {
        issues.push(error(
          "empty-synthesis-state-change",
          `${stepPath}.stateChanges[${changeIndex}].summary`,
          "State changes require a bounded explanatory summary.",
        ));
      }
    });
    if (
      step.reviewState === "verified" &&
      (route.routeType === "teaching_reconstruction" ||
        route.routeType === "computational_proposed")
    ) {
      issues.push(error(
        "non-reported-synthesis-step-marked-verified",
        `${stepPath}.reviewState`,
        "Educational and predicted steps cannot be marked verified science.",
      ));
    }
  });
  route.steps.forEach((step, index) => {
    for (const inputId of step.inputMaterialIds) {
      const material = materialById.get(inputId);
      const producedAt = producerOrder.get(inputId);
      const isBoundaryMaterial = material?.role === "starting_material" ||
        material?.role === "reagent_fragment";
      if (!isBoundaryMaterial && (producedAt === undefined || producedAt >= step.order)) {
        issues.push(error(
          "non-topological-synthesis-route",
          `${path}.steps[${index}].inputMaterialIds`,
          `Input ${inputId} is not produced by an earlier step or declared as a boundary material.`,
        ));
      }
    }
  });
  if (!producerOrder.has(route.targetMaterialId)) {
    issues.push(error(
      "unproduced-canonical-synthesis-target",
      `${path}.targetMaterialId`,
      "The exact target must be produced by the route graph.",
    ));
  }
  if (route.steps.some((step) => step.inputMaterialIds.includes(route.targetMaterialId))) {
    issues.push(error(
      "consumed-canonical-synthesis-target",
      `${path}.targetMaterialId`,
      "The route target must be terminal and unconsumed.",
    ));
  }

  route.gaps.forEach((gap, index) => {
    if (!isNonBlank(gap.description)) {
      issues.push(error(
        "empty-synthesis-route-gap",
        `${path}.gaps[${index}].description`,
        "Declared route gaps need a clear description.",
      ));
    }
    if (gap.positionAfterStepId !== null && !stepById.has(gap.positionAfterStepId)) {
      issues.push(error(
        "unknown-synthesis-gap-step",
        `${path}.gaps[${index}].positionAfterStepId`,
        "A route gap must reference a route-local step.",
      ));
    }
  });
  if (route.routeCompleteness === "complete" && route.gaps.length > 0) {
    issues.push(error(
      "complete-synthesis-route-has-gaps",
      `${path}.routeCompleteness`,
      "A complete route cannot contain declared gaps.",
    ));
  }
  if (route.routeCompleteness !== "complete" && route.gaps.length === 0) {
    issues.push(error(
      "incomplete-synthesis-route-without-gap",
      `${path}.gaps`,
      "Partial route states require at least one explicit gap.",
    ));
  }
  if (
    route.routeCompleteness === "upstream_gap" &&
    !route.gaps.some((gap) => gap.kind === "upstream_precursor")
  ) {
    issues.push(error(
      "upstream-gap-route-without-upstream-gap",
      `${path}.gaps`,
      "Upstream-gap completeness requires an upstream-precursor gap.",
    ));
  }
  if (
    route.routeCompleteness === "convergent_partial" &&
    !route.steps.some((step) => step.inputMaterialIds.length > 1)
  ) {
    issues.push(error(
      "convergent-route-without-convergence",
      `${path}.steps`,
      "Convergent-partial routes need at least one multi-input transformation.",
    ));
  }
  issues.push(...validateKnownEvidenceIds(
    route.sourceEvidenceIds,
    sources,
    `${path}.sourceEvidenceIds`,
  ));
  const routeSources = route.sourceEvidenceIds
    .map((sourceId) => sources.get(sourceId))
    .filter((source): source is SynthesisSourceEvidence => Boolean(source));
  const licenseOverstated = routeSources.some((source) => {
    if (source.licenseState === "restricted") {
      return route.licenseState !== "restricted" && route.licenseState !== "mixed";
    }
    if (source.licenseState === "unknown") {
      return route.licenseState !== "unknown" && route.licenseState !== "mixed";
    }
    if (source.licenseState === "attribution_required") {
      return route.licenseState === "permitted";
    }
    if (source.reuseMode === "metadata_and_link_only") {
      return route.licenseState === "permitted" ||
        route.licenseState === "attribution_required";
    }
    return false;
  });
  if (licenseOverstated) {
    issues.push(error(
      "synthesis-route-license-overstates-source-rights",
      `${path}.licenseState`,
      "Route reuse status cannot be more permissive than its source evidence.",
    ));
  }

  route.reviewEvents.forEach((review, index) => {
    const reviewPath = `${path}.reviewEvents[${index}]`;
    if (
      !isNonBlank(review.reviewerId) ||
      !isNonBlank(review.reviewerName) ||
      review.scopes.length === 0
    ) {
      issues.push(error(
        "incomplete-synthesis-review-event",
        reviewPath,
        "Review events require a named reviewer, identity and explicit scope.",
      ));
    }
    if (review.routeVersion !== route.version) {
      issues.push(error(
        "stale-synthesis-review-event",
        `${reviewPath}.routeVersion`,
        "Review events must target the current immutable route version.",
      ));
    }
    if (!isIsoDate(review.reviewedAt)) {
      issues.push(error(
        "invalid-synthesis-review-date",
        `${reviewPath}.reviewedAt`,
        "Review time must be ISO-compatible.",
      ));
    }
  });
  const hasCurrentApproval = route.reviewEvents.some(
    (review) =>
      review.routeVersion === route.version &&
      review.decision === "approve" &&
      review.scopes.includes("identity") &&
      review.scopes.includes("route"),
  );
  if (
    (route.reviewState === "reviewed" || route.reviewState === "verified") &&
    !hasCurrentApproval
  ) {
    issues.push(error(
      "synthesis-review-state-without-approval",
      `${path}.reviewState`,
      "Reviewed or verified routes require a current-version approval event.",
    ));
  }
  if (
    route.reviewState === "withdrawn" &&
    !route.reviewEvents.some(
      (review) => review.routeVersion === route.version && review.decision === "withdraw",
    )
  ) {
    issues.push(error(
      "withdrawn-synthesis-without-event",
      `${path}.reviewState`,
      "Withdrawn routes require a current-version withdrawal event.",
    ));
  }
  if (
    route.reviewState === "pending" &&
    hasCurrentApproval
  ) {
    issues.push(error(
      "pending-synthesis-has-approval",
      `${path}.reviewState`,
      "A currently approved route cannot remain pending.",
    ));
  }

  if (route.routeType === "patent_reported" || route.routeType === "literature_reported") {
    const expectedSourceKind = route.routeType === "patent_reported"
      ? "patent"
      : "journal";
    const completeSources = route.reportedCompleteRouteSourceIds
      .map((sourceId) => sources.get(sourceId));
    if (
      completeSources.length === 0 ||
      completeSources.some((source) =>
        !source ||
        source.resolutionState !== "resolved" ||
        source.sourceKind !== expectedSourceKind ||
        source.supportScope !== "complete_route"
      )
    ) {
      issues.push(error(
        "reported-synthesis-without-complete-direct-source",
        `${path}.reportedCompleteRouteSourceIds`,
        "A reported route requires a matching resolved source that explicitly supports the declared complete route.",
      ));
    }
    issues.push(...validateKnownEvidenceIds(
      route.reportedCompleteRouteSourceIds,
      sources,
      `${path}.reportedCompleteRouteSourceIds`,
    ));
    for (const [index, step] of route.steps.entries()) {
      if (step.evidenceMode !== "direct_reported") {
        issues.push(error(
          "reported-synthesis-has-nondirect-step",
          `${path}.steps[${index}].evidenceMode`,
          "Every step in a reported route must be directly reported.",
        ));
      }
      if (
        step.sourceEvidenceIds.length === 0 ||
        !step.sourceEvidenceIds.some((sourceId) =>
          route.reportedCompleteRouteSourceIds.includes(sourceId)
        )
      ) {
        issues.push(error(
          "reported-synthesis-step-without-route-source",
          `${path}.steps[${index}].sourceEvidenceIds`,
          "Every reported step must resolve to the source reporting the complete route.",
        ));
      }
    }
  } else if (route.routeType === "teaching_reconstruction") {
    if (route.reviewState === "verified") {
      issues.push(error(
        "teaching-reconstruction-marked-verified",
        `${path}.reviewState`,
        "A teaching reconstruction may be reviewed but never presented as verified reported science.",
      ));
    }
    const coveredStepIds = new Set<string>();
    const reconstructionDocuments = new Set<string>();
    if (route.segments.length < 2) {
      issues.push(error(
        "teaching-reconstruction-without-segments",
        `${path}.segments`,
        "A teaching reconstruction needs at least two source-bounded segments.",
      ));
    }
    const stepSegmentCounts = new Map<string, number>();
    route.segments.forEach((segment, index) => {
      const segmentPath = `${path}.segments[${index}]`;
      for (const stepId of segment.stepIds) {
        coveredStepIds.add(stepId);
        stepSegmentCounts.set(stepId, (stepSegmentCounts.get(stepId) ?? 0) + 1);
        const step = stepById.get(stepId);
        if (!step) {
          issues.push(error(
            "unknown-reconstruction-segment-step",
            `${segmentPath}.stepIds`,
            `Reconstruction segment references unknown step ${stepId}.`,
          ));
        } else if (
          step.sourceEvidenceIds.length === 0 ||
          step.sourceEvidenceIds.some(
            (sourceId) => !segment.sourceEvidenceIds.includes(sourceId),
          )
        ) {
          issues.push(error(
            "reconstruction-segment-step-source-mismatch",
            `${segmentPath}.sourceEvidenceIds`,
            `Segment evidence must contain every source cited by step ${stepId}.`,
          ));
        }
      }
      issues.push(...validateKnownEvidenceIds(
        segment.sourceEvidenceIds,
        sources,
        `${segmentPath}.sourceEvidenceIds`,
      ));
      for (const sourceId of segment.sourceEvidenceIds) {
        if (!segment.stepIds.some((stepId) =>
          stepById.get(stepId)?.sourceEvidenceIds.includes(sourceId)
        )) {
          issues.push(error(
            "reconstruction-segment-unused-source",
            `${segmentPath}.sourceEvidenceIds`,
            `Segment source ${sourceId} is not cited by any step in that segment.`,
          ));
        }
        const source = sources.get(sourceId);
        if (
          !source ||
          source.resolutionState !== "resolved" ||
          source.supportScope === "identity_only"
        ) {
          issues.push(error(
            "reconstruction-segment-without-direct-source",
            `${segmentPath}.sourceEvidenceIds`,
            "Every teaching segment must resolve to direct step or route evidence.",
          ));
        } else {
          reconstructionDocuments.add(
            source.patentFamilyId ?? `${source.sourceKind}:${source.documentId}`,
          );
        }
      }
    });
    if (route.steps.some((step) => !coveredStepIds.has(step.id))) {
      issues.push(error(
        "unsegmented-teaching-reconstruction-step",
        `${path}.segments`,
        "Every teaching-reconstruction step must belong to a source-bounded segment.",
      ));
    }
    if ([...stepSegmentCounts.values()].some((count) => count !== 1)) {
      issues.push(error(
        "multiply-segmented-teaching-step",
        `${path}.segments`,
        "Each teaching-reconstruction step must belong to exactly one source-bounded segment.",
      ));
    }
    if (reconstructionDocuments.size < 2) {
      issues.push(error(
        "teaching-reconstruction-needs-multiple-sources",
        `${path}.segments`,
        "A teaching reconstruction must connect at least two distinct direct documents or patent families.",
      ));
    }
    if (route.steps.some((step) => step.evidenceMode === "computational")) {
      issues.push(error(
        "teaching-reconstruction-has-computational-step",
        `${path}.steps`,
        "Computational proposals must remain a separate route layer.",
      ));
    }
  } else if (route.routeType === "computational_proposed") {
    if (route.reviewState === "verified") {
      issues.push(error(
        "computational-synthesis-marked-verified",
        `${path}.reviewState`,
        "A computationally proposed route cannot be marked verified.",
      ));
    }
    if (
      !isNonBlank(route.proposal.engine) ||
      !isNonBlank(route.proposal.engineVersion) ||
      !isNonBlank(route.proposal.runId) ||
      !isNonBlank(route.proposal.inputHash) ||
      !isIsoDate(route.proposal.generatedAt)
    ) {
      issues.push(error(
        "incomplete-computational-synthesis-provenance",
        `${path}.proposal`,
        "Computational proposals require engine, version, run, time and input-hash provenance.",
      ));
    }
    if (
      route.proposal.confidence !== null &&
      (!Number.isFinite(route.proposal.confidence) ||
        route.proposal.confidence < 0 ||
        route.proposal.confidence > 1)
    ) {
      issues.push(error(
        "invalid-computational-synthesis-confidence",
        `${path}.proposal.confidence`,
        "Computational confidence must be null or between zero and one.",
      ));
    }
    if (route.steps.some((step) => step.evidenceMode !== "computational")) {
      issues.push(error(
        "computational-synthesis-has-reported-step",
        `${path}.steps`,
        "A computational route cannot absorb reported or reconstructed steps.",
      ));
    }
  }
  return issues;
};

export interface SynthesisRoutePublicationDecision {
  readonly routeSummaryAllowed: boolean;
  readonly routeDetailAllowed: boolean;
  readonly presentation:
    | "reported_route"
    | "teaching_reconstruction"
    | "computationally_proposed_route"
    | "withheld";
  readonly blockerCodes: readonly string[];
}

/**
 * Review, evidence and reuse are independent publication gates. A route's type
 * never upgrades merely because an expert reviewed its presentation.
 */
export const getSynthesisRoutePublicationDecision = (
  route: CanonicalSynthesisRoute,
  sourceEvidence: readonly SynthesisSourceEvidence[],
): SynthesisRoutePublicationDecision => {
  const validationIssues = validateCanonicalSynthesisRoute(route, sourceEvidence)
    .filter((issue) => issue.severity === "error");
  const blockerCodes = new Set(validationIssues.map((issue) => issue.code));
  if (route.applicability !== "applicable") {
    blockerCodes.add("synthesis-route-applicability-not-resolved");
  }
  if (route.reviewState === "pending" || route.reviewState === "withdrawn") {
    blockerCodes.add("synthesis-route-review-gate");
  }
  if (["restricted", "mixed", "unknown"].includes(route.licenseState)) {
    blockerCodes.add("synthesis-route-license-gate");
  }
  if (route.licenseState === "link_only") {
    blockerCodes.add("synthesis-route-summary-license-gate");
  }
  const routeSourceMap = sourceMapFrom(sourceEvidence);
  if (route.sourceEvidenceIds.some(
    (sourceId) => routeSourceMap.get(sourceId)?.reuseMode === "metadata_and_link_only",
  )) {
    blockerCodes.add("synthesis-route-source-reuse-gate");
  }
  const routeSummaryAllowed = blockerCodes.size === 0;
  const routeDetailAllowed = routeSummaryAllowed;
  const presentation = !routeSummaryAllowed
    ? "withheld"
    : route.routeType === "patent_reported" ||
        route.routeType === "literature_reported"
      ? "reported_route"
      : route.routeType === "teaching_reconstruction"
        ? "teaching_reconstruction"
        : "computationally_proposed_route";
  return {
    routeSummaryAllowed,
    routeDetailAllowed,
    presentation,
    blockerCodes: [...blockerCodes],
  };
};

export interface SynthesisCoveragePublicationDecision {
  readonly coverageAllowed: boolean;
  readonly blockerCodes: readonly string[];
}

/** Coverage can publish an honest not-assessed/not-resolved state without a route. */
export const getSynthesisCoveragePublicationDecision = (
  record: SynthesisCoverageRecord,
  sourceEvidence: readonly SynthesisSourceEvidence[] = [],
): SynthesisCoveragePublicationDecision => {
  const blockerCodes = validateSynthesisCoverageRecord(record, sourceEvidence)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);
  return {
    coverageAllowed: blockerCodes.length === 0,
    blockerCodes: [...new Set(blockerCodes)],
  };
};
