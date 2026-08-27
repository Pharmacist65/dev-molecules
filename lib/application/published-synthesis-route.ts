import { resolveCatalogAssetPath } from "@/lib/catalog";
import type {
  BasicRecordSynthesisRouteReference,
} from "@/lib/application/basic-record-synthesis-coverage";

export const PUBLISHED_SYNTHESIS_ROUTE_TYPES = [
  "patent_reported",
  "literature_reported",
  "teaching_reconstruction",
  "computational_proposed",
] as const;

export type PublishedSynthesisRouteType =
  (typeof PUBLISHED_SYNTHESIS_ROUTE_TYPES)[number];

export type PublishedSynthesisRoutePresentation =
  | "reported_route"
  | "teaching_reconstruction"
  | "computationally_proposed_route";

export type PublishedSynthesisStepEvidenceMode =
  | "direct_reported"
  | "source_context"
  | "reconstructed"
  | "computational";

export interface PublishedSynthesisRouteIdentity {
  readonly catalogEntityId: string;
  readonly coverageId: `synthesis-coverage:${string}`;
  readonly pubChemCid: number;
  readonly inchiKey: string;
}

export interface PublishedSynthesisRouteMaterial {
  readonly id: `synthesis-material:${string}`;
  readonly label: string;
  readonly role:
    | "starting_material"
    | "intermediate"
    | "reagent_fragment"
    | "target_parent"
    | "target_form";
}

export interface PublishedSynthesisRouteStep {
  readonly id: `synthesis-route-step:${string}`;
  readonly order: number;
  readonly reactants: readonly PublishedSynthesisRouteMaterial[];
  readonly products: readonly PublishedSynthesisRouteMaterial[];
  readonly transformation: string;
  readonly evidenceMode: PublishedSynthesisStepEvidenceMode;
  readonly reviewState: "reviewed" | "verified";
}

export interface PublishedSynthesisRouteCitation {
  readonly label: string;
  readonly url: string;
  readonly locator: {
    readonly kind:
      | "patent_example"
      | "patent_scheme"
      | "journal_scheme"
      | "journal_figure"
      | "journal_section"
      | "dataset_record";
    readonly value: string;
    readonly page: string | null;
    readonly scheme: string | null;
    readonly example: string | null;
  };
  readonly supportScope: "single_step" | "route_segment" | "complete_route";
  readonly licenseState: "permitted" | "attribution_required";
  readonly reuseMode: "derived_facts_with_attribution" | "redistributable";
}

export interface PublishedSynthesisRouteDetail {
  readonly id: `synthesis-route:${string}`;
  readonly coverageId: `synthesis-coverage:${string}`;
  readonly routeType: PublishedSynthesisRouteType;
  readonly presentation: PublishedSynthesisRoutePresentation;
  readonly routeCompleteness:
    | "complete"
    | "partial"
    | "upstream_gap"
    | "convergent_partial"
    | "unknown";
  readonly reviewState: "reviewed" | "verified";
  readonly licenseState: "permitted" | "attribution_required";
  readonly title: string;
  readonly startBoundary: string;
  readonly stereochemicalStrategy: string;
  readonly target: PublishedSynthesisRouteMaterial;
  readonly steps: readonly PublishedSynthesisRouteStep[];
  readonly citations: readonly PublishedSynthesisRouteCitation[];
}

export interface PublishedSynthesisRouteLoadResult {
  readonly state: "available" | "coverage_only";
  readonly generatedAt: string | null;
  readonly routes: readonly PublishedSynthesisRouteDetail[];
}

export interface PublishedSynthesisRouteClientOptions {
  readonly assetBasePath?: string;
  readonly fetchImpl?: typeof fetch;
}

type JsonObject = Readonly<Record<string, unknown>>;

interface ValidatedRouteIndexEntry {
  readonly routeId: `synthesis-route:${string}`;
  readonly routeType: PublishedSynthesisRouteType;
  readonly routeCompleteness: PublishedSynthesisRouteDetail["routeCompleteness"];
  readonly reviewState: PublishedSynthesisRouteDetail["reviewState"];
  readonly publicationState: PublishedSynthesisRoutePresentation;
  readonly numberOfSteps: number;
  readonly startingMaterials: readonly string[];
  readonly startBoundary: string;
  readonly stereochemicalStrategy: string;
  readonly keyTransformations: readonly string[];
  readonly sourceYear: number | null;
  readonly detailPath: string;
}

const ROUTE_TYPES = new Set<string>(PUBLISHED_SYNTHESIS_ROUTE_TYPES);
const ROUTE_COMPLETENESS = new Set([
  "complete",
  "partial",
  "upstream_gap",
  "convergent_partial",
  "unknown",
]);
const REVIEW_STATES = new Set(["reviewed", "verified"]);
const LICENSE_STATES = new Set(["permitted", "attribution_required"]);
const MATERIAL_ROLES = new Set([
  "starting_material",
  "intermediate",
  "reagent_fragment",
  "target_parent",
  "target_form",
]);
const EVIDENCE_MODES = new Set([
  "direct_reported",
  "source_context",
  "reconstructed",
  "computational",
]);
const LOCATOR_KINDS = new Set([
  "patent_example",
  "patent_scheme",
  "journal_scheme",
  "journal_figure",
  "journal_section",
  "dataset_record",
]);
const SUPPORT_SCOPES = new Set(["single_step", "route_segment", "complete_route"]);
const REUSE_MODES = new Set(["derived_facts_with_attribution", "redistributable"]);
const INCHI_KEY_PATTERN = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u;
const DETAIL_PATH_PATTERN = /^\/catalog\/synthesis\/routes\/[a-z0-9](?:[a-z0-9-]{0,190})\.json$/u;

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const nonblankString = (value: unknown, maximum = 1024): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= maximum &&
  value.trim() === value;

const isIsoDate = (value: unknown): value is string =>
  nonblankString(value, 64) && Number.isFinite(new Date(value).getTime());

const asBoundedStringArray = (
  value: unknown,
  field: string,
  maximumItems = 256,
): readonly string[] => {
  if (
    !Array.isArray(value) ||
    value.length > maximumItems ||
    !value.every((item) => nonblankString(item, 512))
  ) {
    throw new Error(`Invalid published synthesis ${field}.`);
  }
  return value;
};

const assertExactKeys = (
  value: JsonObject,
  allowed: readonly string[],
  field: string,
): void => {
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !allowedKeys.has(key));
  const missing = allowed.filter((key) => !(key in value));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(`Published synthesis ${field} is not the minimal public schema.`);
  }
};

const expectedPresentation = (
  routeType: PublishedSynthesisRouteType,
): PublishedSynthesisRoutePresentation =>
  routeType === "patent_reported" || routeType === "literature_reported"
    ? "reported_route"
    : routeType === "teaching_reconstruction"
      ? "teaching_reconstruction"
      : "computationally_proposed_route";

const isSafeDetailPath = (value: unknown): value is string =>
  typeof value === "string" &&
  DETAIL_PATH_PATTERN.test(value) &&
  !value.includes("..") &&
  !value.includes("\\") &&
  !value.includes("?") &&
  !value.includes("#");

const readRouteType = (value: unknown): PublishedSynthesisRouteType => {
  if (typeof value !== "string" || !ROUTE_TYPES.has(value)) {
    throw new Error("Invalid published synthesis route type.");
  }
  return value as PublishedSynthesisRouteType;
};

const validateReviewState = (
  value: unknown,
  routeType: PublishedSynthesisRouteType,
): PublishedSynthesisRouteDetail["reviewState"] => {
  if (typeof value !== "string" || !REVIEW_STATES.has(value)) {
    throw new Error("Published synthesis route has not passed review.");
  }
  if (
    value === "verified" &&
    (routeType === "teaching_reconstruction" || routeType === "computational_proposed")
  ) {
    throw new Error("Educational or computational synthesis cannot be verified science.");
  }
  return value as PublishedSynthesisRouteDetail["reviewState"];
};

const parseIndexEntry = (value: unknown): ValidatedRouteIndexEntry => {
  if (!isObject(value)) throw new Error("Invalid published synthesis route index entry.");
  assertExactKeys(value, [
    "routeId",
    "routeType",
    "routeCompleteness",
    "reviewState",
    "publicationState",
    "numberOfSteps",
    "startingMaterials",
    "startBoundary",
    "stereochemicalStrategy",
    "keyTransformations",
    "sourceYear",
    "blockerCodes",
    "detailPath",
  ], "route index entry");
  const routeType = readRouteType(value.routeType);
  const reviewState = validateReviewState(value.reviewState, routeType);
  const publicationState = expectedPresentation(routeType);
  if (
    !nonblankString(value.routeId, 512) ||
    !value.routeId.startsWith("synthesis-route:") ||
    !ROUTE_COMPLETENESS.has(String(value.routeCompleteness)) ||
    value.publicationState !== publicationState ||
    !Array.isArray(value.blockerCodes) ||
    value.blockerCodes.length !== 0 ||
    !isSafeDetailPath(value.detailPath) ||
    !Number.isSafeInteger(value.numberOfSteps) ||
    Number(value.numberOfSteps) < 1 ||
    Number(value.numberOfSteps) > 256 ||
    !nonblankString(value.startBoundary, 1024) ||
    !nonblankString(value.stereochemicalStrategy, 1024) ||
    (value.sourceYear !== null &&
      (!Number.isSafeInteger(value.sourceYear) ||
        Number(value.sourceYear) < 1800 ||
        Number(value.sourceYear) > new Date().getUTCFullYear() + 1))
  ) {
    throw new Error("Published synthesis route index entry failed its publication gate.");
  }
  const startingMaterials = asBoundedStringArray(
    value.startingMaterials,
    "starting-material summary",
    64,
  );
  const keyTransformations = asBoundedStringArray(
    value.keyTransformations,
    "transformation summary",
  );
  if (
    startingMaterials.length < 1 ||
    keyTransformations.length !== Number(value.numberOfSteps)
  ) {
    throw new Error("Published synthesis route index summary is internally inconsistent.");
  }
  return {
    routeId: value.routeId as `synthesis-route:${string}`,
    routeType,
    routeCompleteness: value.routeCompleteness as ValidatedRouteIndexEntry["routeCompleteness"],
    reviewState,
    publicationState,
    numberOfSteps: Number(value.numberOfSteps),
    startingMaterials,
    startBoundary: value.startBoundary,
    stereochemicalStrategy: value.stereochemicalStrategy,
    keyTransformations,
    sourceYear: value.sourceYear === null ? null : Number(value.sourceYear),
    detailPath: value.detailPath,
  };
};

const parseMaterial = (value: unknown): PublishedSynthesisRouteMaterial => {
  if (isObject(value)) {
    assertExactKeys(value, ["id", "label", "role"], "material");
  }
  if (
    !isObject(value) ||
    !nonblankString(value.id, 512) ||
    !value.id.startsWith("synthesis-material:") ||
    !nonblankString(value.label, 512) ||
    typeof value.role !== "string" ||
    !MATERIAL_ROLES.has(value.role)
  ) {
    throw new Error("Invalid published synthesis material.");
  }
  return {
    id: value.id as `synthesis-material:${string}`,
    label: value.label,
    role: value.role as PublishedSynthesisRouteMaterial["role"],
  };
};

const parseCitation = (value: unknown): PublishedSynthesisRouteCitation => {
  if (!isObject(value)) throw new Error("Invalid published synthesis citation.");
  assertExactKeys(
    value,
    ["label", "url", "locator", "supportScope", "licenseState", "reuseMode"],
    "citation",
  );
  if (!isObject(value.locator)) throw new Error("Invalid published synthesis locator.");
  assertExactKeys(
    value.locator,
    ["kind", "value", "page", "scheme", "example"],
    "citation locator",
  );
  let url: URL;
  try {
    url = new URL(String(value.url));
  } catch {
    throw new Error("Published synthesis citation URL is invalid.");
  }
  const nullableLocatorValue = (candidate: unknown): candidate is string | null =>
    candidate === null || nonblankString(candidate, 256);
  if (
    !nonblankString(value.label, 1024) ||
    !nonblankString(value.url, 2048) ||
    url.protocol !== "https:" ||
    !LOCATOR_KINDS.has(String(value.locator.kind)) ||
    !nonblankString(value.locator.value, 512) ||
    !nullableLocatorValue(value.locator.page) ||
    !nullableLocatorValue(value.locator.scheme) ||
    !nullableLocatorValue(value.locator.example) ||
    !SUPPORT_SCOPES.has(String(value.supportScope)) ||
    !LICENSE_STATES.has(String(value.licenseState)) ||
    !REUSE_MODES.has(String(value.reuseMode))
  ) {
    throw new Error("Invalid published synthesis citation fields.");
  }
  return {
    label: value.label,
    url: value.url,
    locator: {
      kind: value.locator.kind as PublishedSynthesisRouteCitation["locator"]["kind"],
      value: value.locator.value,
      page: value.locator.page,
      scheme: value.locator.scheme,
      example: value.locator.example,
    },
    supportScope: value.supportScope as PublishedSynthesisRouteCitation["supportScope"],
    licenseState: value.licenseState as PublishedSynthesisRouteCitation["licenseState"],
    reuseMode: value.reuseMode as PublishedSynthesisRouteCitation["reuseMode"],
  };
};

const parsePublishedRouteDetail = (
  value: unknown,
  index: ValidatedRouteIndexEntry,
  expected: PublishedSynthesisRouteIdentity,
  reference: BasicRecordSynthesisRouteReference,
): PublishedSynthesisRouteDetail => {
  if (!isObject(value) || value.schemaVersion !== 1 || !isObject(value.identity)) {
    throw new Error("Unsupported published synthesis route detail.");
  }
  assertExactKeys(value, [
    "schemaVersion",
    "routeId",
    "coverageId",
    "identity",
    "routeType",
    "publicationState",
    "routeCompleteness",
    "reviewState",
    "licenseState",
    "applicability",
    "title",
    "startBoundary",
    "stereochemicalStrategy",
    "targetMaterialId",
    "materials",
    "steps",
    "citations",
    "safety",
  ], "route detail");
  assertExactKeys(value.identity, ["catalogEntityId", "pubChemCid", "inchiKey"], "identity");
  const identity = value.identity;
  const routeType = readRouteType(value.routeType);
  const reviewState = validateReviewState(value.reviewState, routeType);
  if (
    value.routeId !== index.routeId ||
    value.routeId !== reference.routeId ||
    value.coverageId !== expected.coverageId ||
    routeType !== index.routeType ||
    routeType !== reference.routeType ||
    value.publicationState !== index.publicationState ||
    value.routeCompleteness !== index.routeCompleteness ||
    value.routeCompleteness !== reference.routeCompleteness ||
    reviewState !== index.reviewState ||
    reviewState !== reference.reviewState ||
    !LICENSE_STATES.has(String(value.licenseState)) ||
    value.licenseState !== reference.licenseState ||
    value.applicability !== "applicable" ||
    identity.catalogEntityId !== expected.catalogEntityId ||
    identity.pubChemCid !== expected.pubChemCid ||
    identity.inchiKey !== expected.inchiKey ||
    !INCHI_KEY_PATTERN.test(String(identity.inchiKey)) ||
    !isObject(value.safety) ||
    value.safety.operationalDetailsIncluded !== false ||
    !nonblankString(value.title, 1024) ||
    !nonblankString(value.startBoundary, 1024) ||
    value.startBoundary !== index.startBoundary ||
    !nonblankString(value.stereochemicalStrategy, 1024) ||
    value.stereochemicalStrategy !== index.stereochemicalStrategy ||
    !Array.isArray(value.materials) ||
    value.materials.length < 2 ||
    value.materials.length > 512 ||
    !Array.isArray(value.steps) ||
    value.steps.length !== index.numberOfSteps ||
    value.steps.length < 1 ||
    value.steps.length > 256 ||
    !Array.isArray(value.citations) ||
    value.citations.length > 512 ||
    !nonblankString(value.targetMaterialId, 512)
  ) {
    throw new Error("Published synthesis route detail does not match its gated index entry.");
  }

  const rawSteps = value.steps as readonly unknown[];
  const materials = value.materials.map(parseMaterial);
  const citations = value.citations.map(parseCitation);
  if (
    value.licenseState === "permitted" &&
    citations.some((citation) => citation.licenseState !== "permitted")
  ) {
    throw new Error("Published synthesis route overstates citation reuse permission.");
  }
  const materialById = new Map(materials.map((material) => [material.id, material] as const));
  if (materialById.size !== materials.length) {
    throw new Error("Published synthesis route contains duplicate materials.");
  }
  const target = materialById.get(value.targetMaterialId as PublishedSynthesisRouteMaterial["id"]);
  if (!target || (target.role !== "target_parent" && target.role !== "target_form")) {
    throw new Error("Published synthesis route target is missing or mismatched.");
  }
  const startingMaterials = materials
    .filter((material) => material.role === "starting_material")
    .map((material) => material.label);
  if (JSON.stringify(startingMaterials) !== JSON.stringify(index.startingMaterials)) {
    throw new Error("Published synthesis starting-material summary does not match its detail.");
  }

  const seenStepIds = new Set<string>();
  const seenOrders = new Set<number>();
  const steps = rawSteps.map((rawStep): PublishedSynthesisRouteStep => {
    if (isObject(rawStep)) {
      assertExactKeys(rawStep, [
        "id",
        "order",
        "reactantMaterialIds",
        "productMaterialIds",
        "transformation",
        "evidenceStatus",
        "reviewState",
        "citationIndexes",
      ], "route step");
    }
    if (
      !isObject(rawStep) ||
      !nonblankString(rawStep.id, 512) ||
      !rawStep.id.startsWith("synthesis-route-step:") ||
      !Number.isSafeInteger(rawStep.order) ||
      Number(rawStep.order) < 1 ||
      Number(rawStep.order) > rawSteps.length ||
      seenStepIds.has(rawStep.id) ||
      seenOrders.has(Number(rawStep.order)) ||
      !Array.isArray(rawStep.reactantMaterialIds) ||
      rawStep.reactantMaterialIds.length < 1 ||
      rawStep.reactantMaterialIds.length > 64 ||
      !Array.isArray(rawStep.productMaterialIds) ||
      rawStep.productMaterialIds.length < 1 ||
      rawStep.productMaterialIds.length > 64 ||
      !nonblankString(rawStep.transformation, 512) ||
      typeof rawStep.evidenceStatus !== "string" ||
      !EVIDENCE_MODES.has(rawStep.evidenceStatus) ||
      !Array.isArray(rawStep.citationIndexes) ||
      rawStep.citationIndexes.length > 64 ||
      !rawStep.citationIndexes.every((citationIndex) =>
        Number.isSafeInteger(citationIndex) &&
        Number(citationIndex) >= 0 &&
        Number(citationIndex) < citations.length
      ) ||
      new Set(rawStep.citationIndexes).size !== rawStep.citationIndexes.length
    ) {
      throw new Error("Invalid published synthesis route step.");
    }
    const stepReviewState = validateReviewState(rawStep.reviewState, routeType);
    if (
      routeType === "computational_proposed"
        ? rawStep.evidenceStatus !== "computational"
        : routeType === "patent_reported" || routeType === "literature_reported"
          ? rawStep.evidenceStatus !== "direct_reported"
          : rawStep.evidenceStatus === "computational"
    ) {
      throw new Error("Published synthesis step evidence mode conflicts with its route layer.");
    }
    if (routeType !== "computational_proposed" && rawStep.citationIndexes.length === 0) {
      throw new Error("Published source-backed synthesis step has no public citation.");
    }
    const reactants = rawStep.reactantMaterialIds.map((materialId) => {
      const material = materialById.get(materialId as PublishedSynthesisRouteMaterial["id"]);
      if (!material) throw new Error("Published synthesis step references an unknown reactant.");
      return material;
    });
    const products = rawStep.productMaterialIds.map((materialId) => {
      const material = materialById.get(materialId as PublishedSynthesisRouteMaterial["id"]);
      if (!material) throw new Error("Published synthesis step references an unknown product.");
      return material;
    });
    seenStepIds.add(rawStep.id);
    seenOrders.add(Number(rawStep.order));
    return {
      id: rawStep.id as `synthesis-route-step:${string}`,
      order: Number(rawStep.order),
      reactants,
      products,
      transformation: rawStep.transformation,
      evidenceMode: rawStep.evidenceStatus as PublishedSynthesisStepEvidenceMode,
      reviewState: stepReviewState,
    };
  }).sort((left, right) => left.order - right.order);

  if (
    steps.some((step, position) => step.order !== position + 1) ||
    JSON.stringify(steps.map((step) => step.transformation)) !==
      JSON.stringify(index.keyTransformations) ||
    !steps.at(-1)?.products.some((product) => product.id === target.id)
  ) {
    throw new Error("Published synthesis route sequence does not match its index summary.");
  }

  return {
    id: value.routeId as `synthesis-route:${string}`,
    coverageId: value.coverageId as `synthesis-coverage:${string}`,
    routeType,
    presentation: index.publicationState,
    routeCompleteness: value.routeCompleteness as PublishedSynthesisRouteDetail["routeCompleteness"],
    reviewState,
    licenseState: value.licenseState as PublishedSynthesisRouteDetail["licenseState"],
    title: value.title,
    startBoundary: value.startBoundary,
    stereochemicalStrategy: value.stereochemicalStrategy,
    target,
    steps,
    citations,
  };
};

const fetchJson = async (
  path: string,
  fetchImpl: typeof fetch,
): Promise<unknown> => {
  const response = await fetchImpl(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Published synthesis artifact request failed (${response.status}).`);
  }
  return response.json();
};

interface ValidatedRouteIndex {
  readonly generatedAt: string;
  readonly entries: readonly ValidatedRouteIndexEntry[];
}

const loadValidatedRouteIndex = async (
  options: PublishedSynthesisRouteClientOptions,
): Promise<ValidatedRouteIndex> => {
  const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const indexPath = resolveCatalogAssetPath(
    "/catalog/synthesis/routes/index.json",
    options.assetBasePath,
  );
  const rawIndex = await fetchJson(indexPath, fetchImpl);
  if (
    !isObject(rawIndex) ||
    rawIndex.schemaVersion !== 1 ||
    !isIsoDate(rawIndex.generatedAt) ||
    !Array.isArray(rawIndex.routes) ||
    rawIndex.routes.length > 10_000
  ) {
    throw new Error("Unsupported published synthesis route index.");
  }
  const entries = rawIndex.routes.map(parseIndexEntry);
  const entryIds = new Set(entries.map((entry) => entry.routeId));
  if (entryIds.size !== entries.length) {
    throw new Error("Published synthesis route index contains duplicate routes.");
  }
  return { generatedAt: rawIndex.generatedAt, entries };
};

/**
 * Reads the public, publication-gated index for display-only aggregate counts.
 * A transport or validation failure is deliberately surfaced to the caller;
 * it must not be converted into a scientifically meaningful zero.
 */
export async function loadPublishedSynthesisRouteCount(
  options: PublishedSynthesisRouteClientOptions = {},
): Promise<number> {
  const index = await loadValidatedRouteIndex(options);
  return index.entries.length;
}

/**
 * Loads route detail only through the generated public index. A coverage route
 * reference alone can never construct a detail URL or unlock route content.
 */
export async function loadPublishedSynthesisRoutes(
  expected: PublishedSynthesisRouteIdentity,
  references: readonly BasicRecordSynthesisRouteReference[],
  options: PublishedSynthesisRouteClientOptions = {},
): Promise<PublishedSynthesisRouteLoadResult> {
  if (
    !nonblankString(expected.catalogEntityId, 512) ||
    !nonblankString(expected.coverageId, 512) ||
    !expected.coverageId.startsWith("synthesis-coverage:") ||
    !Number.isSafeInteger(expected.pubChemCid) ||
    expected.pubChemCid < 1 ||
    !INCHI_KEY_PATTERN.test(expected.inchiKey)
  ) {
    throw new Error("Cannot load a published synthesis route for an invalid identity.");
  }
  if (references.length === 0) {
    return { state: "coverage_only", generatedAt: null, routes: [] };
  }
  const referenceById = new Map(references.map((reference) => [reference.routeId, reference]));
  if (referenceById.size !== references.length) {
    throw new Error("Published synthesis coverage contains duplicate route references.");
  }

  const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const routeIndex = await loadValidatedRouteIndex(options);
  const entries = routeIndex.entries;
  const eligibleEntries = entries.filter((entry) => referenceById.has(entry.routeId));
  if (eligibleEntries.length === 0) {
    return { state: "coverage_only", generatedAt: routeIndex.generatedAt, routes: [] };
  }
  if (eligibleEntries.length !== references.length) {
    throw new Error("Published synthesis route index does not match exact coverage references.");
  }

  const routes = await Promise.all(eligibleEntries.map(async (entry) => {
    const detailPath = resolveCatalogAssetPath(entry.detailPath, options.assetBasePath);
    const rawDetail = await fetchJson(detailPath, fetchImpl);
    const reference = referenceById.get(entry.routeId);
    if (!reference) throw new Error("Published synthesis route reference disappeared.");
    return parsePublishedRouteDetail(rawDetail, entry, expected, reference);
  }));
  return {
    state: routes.length > 0 ? "available" : "coverage_only",
    generatedAt: routeIndex.generatedAt,
    routes,
  };
}
