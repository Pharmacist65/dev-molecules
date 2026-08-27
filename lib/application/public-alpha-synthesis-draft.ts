import { resolveCatalogAssetPath } from "@/lib/catalog";
import type {
  PublicAlphaSynthesisDraftAlternative,
  PublicAlphaSynthesisDraftBridge,
  PublicAlphaSynthesisDraftCitation,
  PublicAlphaSynthesisDraftGraph,
  PublicAlphaSynthesisDraftMaterial,
  PublicAlphaSynthesisDraftReference,
  PublicAlphaSynthesisDraftStep,
} from "@/lib/domain/public-alpha-synthesis-draft";

export interface PublicAlphaSynthesisDraftIdentity {
  readonly catalogSnapshotId: string;
  readonly catalogEntityId: string;
  readonly coverageId: `synthesis-coverage:${string}`;
  readonly preferredName: string;
  readonly pubChemCid: number;
  readonly inchiKey: string;
  readonly chemicalForm: string;
  readonly stereochemistrySpecified: boolean;
}

export interface PublicAlphaSynthesisDraftClientOptions {
  readonly assetBasePath?: string;
  readonly fetchImpl?: typeof fetch;
}

type JsonObject = Readonly<Record<string, unknown>>;

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonblank = (value: unknown, maximum = 2048): value is string =>
  typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= maximum;
const INCHI_KEY = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/u;
const SAFE_DETAIL_PATH = /^\/catalog\/synthesis\/drafts\/[a-f\d]{32}\.json$/u;
const FORBIDDEN_OPERATIONAL_KEYS = new Set([
  "amount", "conditions", "concentration", "duration", "procedure", "purification",
  "scale", "temperature", "time", "workup", "yield",
]);
const FORBIDDEN_OPERATIONAL_KEY_TOKENS = [
  "amount", "condition", "concentration", "duration", "equivalent", "pressure",
  "procedure", "purification", "scale", "solvent", "temperature", "time", "workup", "yield",
] as const;

const assertNoOperationalKeys = (value: unknown, path = "draft"): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoOperationalKeys(item, `${path}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLocaleLowerCase("en").replaceAll(/[^a-z]/gu, "");
    if (
      FORBIDDEN_OPERATIONAL_KEYS.has(key.toLocaleLowerCase("en")) ||
      FORBIDDEN_OPERATIONAL_KEY_TOKENS.some((token) => normalizedKey.includes(token))
    ) {
      throw new Error(`Operational synthesis field crossed the public-alpha boundary: ${path}.${key}.`);
    }
    assertNoOperationalKeys(child, `${path}.${key}`);
  }
};

const readReference = (value: unknown): PublicAlphaSynthesisDraftReference => {
  if (
    !isObject(value) || value.schemaVersion !== 1 ||
    !nonblank(value.graphId, 256) || !value.graphId.startsWith("synthesis-draft-graph:") ||
    value.channel !== "public_alpha_source_supported_draft" ||
    value.publicationState !== "source_supported_draft" ||
    value.reviewState !== "pending" || value.verifiedScientificClaim !== false ||
    !nonblank(value.coverageId, 512) || !value.coverageId.startsWith("synthesis-coverage:") ||
    !["partial", "upstream_gap", "convergent_partial"].includes(String(value.routeCompleteness)) ||
    !Number.isSafeInteger(value.draftRouteCount) || Number(value.draftRouteCount) < 1 ||
    !Number.isSafeInteger(value.extractedStepCount) || Number(value.extractedStepCount) < 1 ||
    !Number.isSafeInteger(value.teachingReconstructionCount) || Number(value.teachingReconstructionCount) < 0 ||
    !Number.isSafeInteger(value.resolvedIntermediateCount) || Number(value.resolvedIntermediateCount) < 0 ||
    !Number.isSafeInteger(value.unresolvedGapCount) || Number(value.unresolvedGapCount) < 1 ||
    value.licenseState !== "attribution_required" ||
    !nonblank(value.detailPath, 256) || !SAFE_DETAIL_PATH.test(value.detailPath)
  ) throw new Error("Invalid public-alpha synthesis draft reference.");
  return {
    schemaVersion: 1,
    graphId: value.graphId as PublicAlphaSynthesisDraftReference["graphId"],
    channel: "public_alpha_source_supported_draft",
    publicationState: "source_supported_draft",
    reviewState: "pending",
    verifiedScientificClaim: false,
    coverageId: value.coverageId as PublicAlphaSynthesisDraftReference["coverageId"],
    routeCompleteness: value.routeCompleteness as PublicAlphaSynthesisDraftReference["routeCompleteness"],
    draftRouteCount: Number(value.draftRouteCount),
    extractedStepCount: Number(value.extractedStepCount),
    teachingReconstructionCount: Number(value.teachingReconstructionCount),
    resolvedIntermediateCount: Number(value.resolvedIntermediateCount),
    unresolvedGapCount: Number(value.unresolvedGapCount),
    licenseState: "attribution_required",
    detailPath: value.detailPath as PublicAlphaSynthesisDraftReference["detailPath"],
  };
};

const parseMaterial = (value: unknown): PublicAlphaSynthesisDraftMaterial => {
  if (
    !isObject(value) || !nonblank(value.id, 256) || !value.id.startsWith("synthesis-draft-material:") ||
    !nonblank(value.label, 512) ||
    !["source_input", "route_intermediate", "exact_target"].includes(String(value.displayRole)) ||
    !nonblank(value.sourceSmiles, 4096) || !nonblank(value.inchiKey, 64) || !INCHI_KEY.test(value.inchiKey) ||
    value.identityResolution !== "exact_inchi_key_computed" ||
    value.structureRepresentation !== "independent_smiles_redraw"
  ) throw new Error("Invalid public-alpha synthesis material.");
  return value as unknown as PublicAlphaSynthesisDraftMaterial;
};

const parseCitation = (value: unknown): PublicAlphaSynthesisDraftCitation => {
  if (!isObject(value) || !isObject(value.locator) || !isObject(value.license)) {
    throw new Error("Invalid public-alpha synthesis citation.");
  }
  let url: URL;
  try { url = new URL(String(value.url)); } catch { throw new Error("Invalid draft citation URL."); }
  if (
    !nonblank(value.id, 256) || !value.id.startsWith("synthesis-draft-citation:") ||
    value.sourceKind !== "open_reaction_dataset" ||
    !nonblank(value.sourceDocumentId, 256) || !value.sourceDocumentId.startsWith("ord-") ||
    !nonblank(value.label, 1024) || url.protocol !== "https:" ||
    value.url !== `https://open-reaction-database.org/id/${value.sourceDocumentId}` ||
    value.locator.kind !== "dataset_record" || !nonblank(value.locator.value, 512) ||
    !String(value.locator.value).endsWith(`/${value.sourceDocumentId}`) ||
    value.supportScope !== "single_step" ||
    value.license.state !== "attribution_required" || value.license.identifier !== "CC-BY-SA-4.0" ||
    !nonblank(value.license.attribution, 512) ||
    value.sourceTextReused !== false || value.sourceFigureOrSchemeReused !== false
  ) throw new Error("Public-alpha citation failed its locator or rights gate.");
  return value as unknown as PublicAlphaSynthesisDraftCitation;
};

export const validatePublicAlphaSynthesisDraftGraph = (
  value: unknown,
  expected: PublicAlphaSynthesisDraftIdentity,
  reference: PublicAlphaSynthesisDraftReference,
): PublicAlphaSynthesisDraftGraph => {
  assertNoOperationalKeys(value);
  if (!isObject(value) || !isObject(value.identity) || !isObject(value.assurance)) {
    throw new Error("Unsupported public-alpha synthesis graph.");
  }
  if (
    value.schemaVersion !== 1 || value.graphId !== reference.graphId ||
    value.channel !== "public_alpha_source_supported_draft" ||
    value.publicationState !== "source_supported_draft" ||
    value.catalogSnapshotId !== expected.catalogSnapshotId ||
    value.identity.coverageId !== expected.coverageId ||
    value.identity.catalogEntityId !== expected.catalogEntityId ||
    value.identity.preferredName !== expected.preferredName ||
    value.identity.pubChemCid !== expected.pubChemCid ||
    value.identity.inchiKey !== expected.inchiKey || !INCHI_KEY.test(String(value.identity.inchiKey)) ||
    value.identity.chemicalForm !== expected.chemicalForm ||
    value.identity.stereochemistrySpecified !== expected.stereochemistrySpecified ||
    value.assurance.reviewState !== "pending" || value.assurance.expertReviewRequired !== true ||
    value.assurance.verifiedScientificClaim !== false || value.assurance.exactTargetIdentity !== true ||
    value.assurance.formConflict !== false || value.assurance.stereochemistryConflict !== false ||
    value.assurance.operationalDetailsIncluded !== false ||
    value.assurance.contentOrigin !== "independent_smiles_redraw" ||
    value.assurance.rightsDecisionState !== "approved_for_independent_redraw_with_attribution" ||
    value.assurance.rightsPolicyVersion !== "ord-independent-redraw-1.0.0" ||
    value.assurance.sourceTextReused !== false || value.assurance.sourceFigureOrSchemeReused !== false ||
    value.routeCompleteness !== reference.routeCompleteness ||
    !Array.isArray(value.materials) || !Array.isArray(value.steps) || !Array.isArray(value.bridges) ||
    !Array.isArray(value.alternatives) || !Array.isArray(value.citations) ||
    !Array.isArray(value.limitations) || value.limitations.length < 1 ||
    !value.limitations.every((limitation) => nonblank(limitation, 2048))
  ) throw new Error("Public-alpha synthesis graph failed its identity or assurance gate.");

  const materials = value.materials.map(parseMaterial);
  const citations = value.citations.map(parseCitation);
  const materialById = new Map(materials.map((item) => [item.id, item] as const));
  const citationById = new Map(citations.map((item) => [item.id, item] as const));
  if (materialById.size !== materials.length || citationById.size !== citations.length) {
    throw new Error("Public-alpha synthesis graph contains duplicate material or citation IDs.");
  }
  const steps = value.steps.map((raw): PublicAlphaSynthesisDraftStep => {
    if (
      !isObject(raw) || !isObject(raw.transformationClass) ||
      !nonblank(raw.id, 256) || !raw.id.startsWith("synthesis-draft-step:") ||
      !["target_forming_segment", "upstream_source_segment"].includes(String(raw.relationship)) ||
      !Array.isArray(raw.inputMaterialIds) || raw.inputMaterialIds.length < 1 ||
      !Array.isArray(raw.outputMaterialIds) || raw.outputMaterialIds.length < 1 ||
      ![...raw.inputMaterialIds, ...raw.outputMaterialIds].every((id) =>
        typeof id === "string" && materialById.has(id as PublicAlphaSynthesisDraftMaterial["id"])
      ) ||
      raw.transformationClass.label !== "Unclassified" ||
      raw.transformationClass.resolutionState !== "not_computed" ||
      raw.reactionOrderState !== "not_resolved" ||
      raw.formedBondState !== "not_resolved" || raw.brokenBondState !== "not_resolved" ||
      raw.atomMappingState !== "not_mapped" ||
      raw.evidenceMode !== "direct_structured_dataset_segment" ||
      !nonblank(raw.citationId, 256) || !citationById.has(raw.citationId as PublicAlphaSynthesisDraftCitation["id"]) ||
      raw.reviewState !== "pending" || raw.operationalDetailsIncluded !== false
    ) throw new Error("Invalid public-alpha synthesis step.");
    return raw as unknown as PublicAlphaSynthesisDraftStep;
  });
  const stepById = new Map(steps.map((item) => [item.id, item] as const));
  if (stepById.size !== steps.length) throw new Error("Duplicate public-alpha synthesis step IDs.");

  const bridges = value.bridges.map((raw): PublicAlphaSynthesisDraftBridge => {
    if (
      !isObject(raw) || !nonblank(raw.id, 256) || !raw.id.startsWith("synthesis-draft-bridge:") ||
      !nonblank(raw.fromStepId, 256) || !nonblank(raw.toStepId, 256) ||
      !nonblank(raw.boundaryMaterialId, 256) || raw.identityMatch !== "exact_inchi_key" ||
      raw.editorialBridge !== "teaching_reconstruction" || raw.reportedAsOneCompleteRoute !== false
    ) throw new Error("Invalid public-alpha synthesis bridge.");
    const from = stepById.get(raw.fromStepId as PublicAlphaSynthesisDraftStep["id"]);
    const to = stepById.get(raw.toStepId as PublicAlphaSynthesisDraftStep["id"]);
    const boundary = raw.boundaryMaterialId as PublicAlphaSynthesisDraftMaterial["id"];
    if (!from?.outputMaterialIds.includes(boundary) || !to?.inputMaterialIds.includes(boundary)) {
      throw new Error("Public-alpha teaching bridge lacks an exact shared material boundary.");
    }
    return raw as unknown as PublicAlphaSynthesisDraftBridge;
  });
  if (new Set(bridges.map((bridge) => bridge.id)).size !== bridges.length) {
    throw new Error("Duplicate public-alpha synthesis bridge IDs.");
  }
  const alternatives = value.alternatives.map((raw): PublicAlphaSynthesisDraftAlternative => {
    if (
      !isObject(raw) || !nonblank(raw.id, 256) || !raw.id.startsWith("synthesis-draft-alternative:") ||
      !nonblank(raw.finalStepId, 256) || !Array.isArray(raw.upstreamStepIds) ||
      !["source_supported_fragment", "teaching_reconstruction"].includes(String(raw.routeType)) ||
      !["partial", "upstream_gap", "convergent_partial"].includes(String(raw.routeCompleteness)) ||
      raw.unresolvedGapCount !== 1
    ) throw new Error("Invalid public-alpha synthesis alternative.");
    const finalStep = stepById.get(raw.finalStepId as PublicAlphaSynthesisDraftStep["id"]);
    const upstreamIds = raw.upstreamStepIds as readonly PublicAlphaSynthesisDraftStep["id"][];
    const bridgeBoundaries = new Set(bridges.flatMap((bridge) =>
      bridge.toStepId === raw.finalStepId && upstreamIds.includes(bridge.fromStepId)
        ? [bridge.boundaryMaterialId]
        : []
    ));
    if (
      finalStep?.relationship !== "target_forming_segment" ||
      !upstreamIds.every((id) =>
        typeof id === "string" && stepById.get(id as PublicAlphaSynthesisDraftStep["id"])?.relationship === "upstream_source_segment"
      ) ||
      new Set(upstreamIds).size !== upstreamIds.length ||
      upstreamIds.some((id) => !bridges.some((bridge) =>
        bridge.fromStepId === id && bridge.toStepId === raw.finalStepId
      )) ||
      (raw.routeType === "teaching_reconstruction") !== (upstreamIds.length > 0) ||
      (raw.routeCompleteness === "convergent_partial" && bridgeBoundaries.size < 2) ||
      (raw.routeCompleteness === "upstream_gap" && bridgeBoundaries.size >= 2)
    ) throw new Error("Public-alpha route alternative topology is inconsistent.");
    return raw as unknown as PublicAlphaSynthesisDraftAlternative;
  });
  if (new Set(alternatives.map((alternative) => alternative.id)).size !== alternatives.length) {
    throw new Error("Duplicate public-alpha synthesis alternative IDs.");
  }
  if (
    alternatives.length !== reference.draftRouteCount ||
    steps.length !== reference.extractedStepCount ||
    alternatives.filter((item) => item.routeType === "teaching_reconstruction").length !==
      reference.teachingReconstructionCount ||
    alternatives.reduce((sum, item) => sum + item.unresolvedGapCount, 0) !== reference.unresolvedGapCount ||
    new Set(bridges.map((item) => item.boundaryMaterialId)).size !== reference.resolvedIntermediateCount ||
    !materials.some((item) => item.displayRole === "exact_target" && item.inchiKey === expected.inchiKey)
  ) throw new Error("Public-alpha synthesis graph counts do not match its coverage reference.");

  return value as unknown as PublicAlphaSynthesisDraftGraph;
};

export async function loadPublicAlphaSynthesisDrafts(
  expected: PublicAlphaSynthesisDraftIdentity,
  references: readonly PublicAlphaSynthesisDraftReference[],
  options: PublicAlphaSynthesisDraftClientOptions = {},
): Promise<readonly PublicAlphaSynthesisDraftGraph[]> {
  if (references.length === 0) return [];
  const fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const indexPath = resolveCatalogAssetPath(
    "/catalog/synthesis/drafts/index.json",
    options.assetBasePath,
  );
  const indexResponse = await fetchImpl(indexPath, { headers: { Accept: "application/json" } });
  if (!indexResponse.ok) throw new Error(`Public-alpha synthesis index failed (${indexResponse.status}).`);
  const index: unknown = await indexResponse.json();
  if (
    !isObject(index) || index.schemaVersion !== 1 ||
    index.channel !== "public_alpha_source_supported_draft" ||
    index.catalogSnapshotId !== expected.catalogSnapshotId ||
    !Array.isArray(index.graphs)
  ) throw new Error("Unsupported public-alpha synthesis index.");
  const entries = index.graphs.map((entry) => {
    const reference = readReference(entry);
    if (!isObject(entry)) throw new Error("Invalid draft index entry.");
    return { reference, entry };
  });
  const requested = references.map((reference) => {
    const match = entries.find(({ reference: indexed }) => indexed.graphId === reference.graphId);
    if (
      !match || JSON.stringify(match.reference) !== JSON.stringify(reference) ||
      match.entry.catalogEntityId !== expected.catalogEntityId ||
      match.entry.pubChemCid !== expected.pubChemCid || match.entry.inchiKey !== expected.inchiKey ||
      match.reference.coverageId !== expected.coverageId
    ) throw new Error("Public-alpha synthesis index does not match the exact coverage identity.");
    return match.reference;
  });
  return Promise.all(requested.map(async (reference) => {
    const detailPath = resolveCatalogAssetPath(reference.detailPath, options.assetBasePath);
    const response = await fetchImpl(detailPath, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Public-alpha synthesis detail failed (${response.status}).`);
    return validatePublicAlphaSynthesisDraftGraph(await response.json(), expected, reference);
  }));
}
