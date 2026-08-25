import type {
  DossierLocale,
  DrugDossierRecord,
  EvidenceConditions,
} from "@/lib/domain/dossier";

export const flagshipReferenceExportSchema =
  "molevren.flagship-reference.v1" as const;

export type ReferenceExportJsonPrimitive = string | number | boolean | null;
export type ReferenceExportJsonValue =
  | ReferenceExportJsonPrimitive
  | readonly ReferenceExportJsonValue[]
  | { readonly [key: string]: ReferenceExportJsonValue };

export interface FlagshipReferenceExport {
  readonly schema: typeof flagshipReferenceExportSchema;
  readonly format: "application/json";
  readonly locale: DossierLocale;
  readonly boundaries: {
    readonly presentation: "reference";
    readonly exportScope: "currently-materialized-record";
    readonly notForClinicalUse: true;
    readonly containsDerivedScience: false;
  };
  readonly identity: ReferenceExportJsonValue;
  readonly chemistry: ReferenceExportJsonValue;
  readonly productAnchor: ReferenceExportJsonValue;
  readonly classifications: ReferenceExportJsonValue;
  readonly pharmacology: ReferenceExportJsonValue;
  readonly adme: ReferenceExportJsonValue;
  readonly metabolites: ReferenceExportJsonValue;
  readonly coverage: ReferenceExportJsonValue;
  readonly flagship: ReferenceExportJsonValue;
  readonly sources: ReferenceExportJsonValue;
  readonly limitations: ReferenceExportJsonValue;
}

const conditionKeys = [
  "route",
  "formulation",
  "species",
  "population",
  "dose",
  "fedState",
  "studyDesign",
  "cohortSize",
  "coefficientOfVariationPercent",
  "assay",
  "matrix",
  "temperature",
  "pH",
] as const satisfies readonly (Exclude<keyof EvidenceConditions, "note">)[];

const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEvidenceField = (
  value: Readonly<Record<string, unknown>>,
): boolean =>
  Object.hasOwn(value, "value") &&
  Object.hasOwn(value, "unit") &&
  isPlainObject(value.conditions) &&
  typeof value.sourceId === "string" &&
  typeof value.evidenceType === "string" &&
  typeof value.reviewStatus === "string";

const isComparativeEvidence = (
  value: Readonly<Record<string, unknown>>,
): boolean =>
  Object.hasOwn(value, "value") &&
  Array.isArray(value.sourceIds) &&
  value.sourceIds.length >= 2 &&
  isPlainObject(value.conditions) &&
  typeof value.evidenceType === "string" &&
  typeof value.reviewStatus === "string";

const normalizeConditions = (
  value: Readonly<Record<string, unknown>>,
): ReferenceExportJsonValue => {
  const normalized: Record<string, ReferenceExportJsonValue> = {
    note: toReferenceJson(value.note),
  };
  for (const key of conditionKeys) {
    normalized[key] = Object.hasOwn(value, key)
      ? toReferenceJson(value[key])
      : null;
  }
  return normalized;
};

/**
 * Produces plain JSON data only. Scientific values are copied without
 * calculation, unit conversion, localization, or inference.
 */
const toReferenceJson = (value: unknown): ReferenceExportJsonValue => {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(toReferenceJson);
  if (!isPlainObject(value)) {
    throw new Error("Reference export encountered a non-JSON dossier value.");
  }

  const normalized: Record<string, ReferenceExportJsonValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "hierarchies") continue;
    normalized[key] = toReferenceJson(entry);
  }
  if (isEvidenceField(value)) {
    normalized.dimensionless = Object.hasOwn(value, "dimensionless")
      ? toReferenceJson(value.dimensionless)
      : null;
    normalized.valueQualifier = Object.hasOwn(value, "valueQualifier")
      ? toReferenceJson(value.valueQualifier)
      : null;
    normalized.conditions = normalizeConditions(value.conditions as Readonly<Record<string, unknown>>);
  } else if (isComparativeEvidence(value)) {
    normalized.conditions = normalizeConditions(value.conditions as Readonly<Record<string, unknown>>);
  }
  return normalized;
};

const collectSourceIds = (
  value: ReferenceExportJsonValue,
  target = new Set<string>(),
): ReadonlySet<string> => {
  if (typeof value === "string") {
    if (value.startsWith("source:")) target.add(value);
    return target;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectSourceIds(entry, target);
    return target;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectSourceIds(entry, target);
  }
  return target;
};

const validateResolvedSources = (
  content: ReferenceExportJsonValue,
  dossier: DrugDossierRecord,
): void => {
  const sourcesById = new Map(dossier.sources.map((source) => [source.id, source]));
  for (const sourceId of collectSourceIds(content)) {
    const source = sourcesById.get(sourceId as (typeof dossier.sources)[number]["id"]);
    if (!source) {
      throw new Error(`Reference export held: unresolved source ${sourceId}.`);
    }
    if (
      !source.url.startsWith("https://") ||
      !source.license.label.trim() ||
      !source.license.reuseStatus
    ) {
      throw new Error(`Reference export held: incomplete source metadata ${sourceId}.`);
    }
  }
};

const classificationData = (dossier: DrugDossierRecord) => ({
  therapeutic: dossier.classifications.therapeutic,
  pharmacological: dossier.classifications.pharmacological,
  chemical: dossier.classifications.chemical,
  withheldCandidateCount: dossier.classifications.withheldCandidateCount,
  availability: dossier.classifications.availability,
  unavailableReason: dossier.classifications.unavailableReason,
});

const admeData = (dossier: DrugDossierRecord) =>
  dossier.admeProfiles.map((profile) => ({
    ...profile,
    chemicalFormId: profile.chemicalFormId ?? null,
    regulatoryProductId: profile.regulatoryProductId ?? null,
    halfLife: profile.halfLife ?? null,
    bioavailability: profile.bioavailability ?? null,
    proteinBinding: profile.proteinBinding ?? null,
    volumeOfDistribution: profile.volumeOfDistribution ?? null,
    clearance: profile.clearance ?? null,
  }));

export function createFlagshipReferenceExport(
  dossier: DrugDossierRecord,
  locale: DossierLocale,
): FlagshipReferenceExport {
  if (locale !== "tr" && locale !== "en") {
    throw new Error("Reference export held: unsupported locale.");
  }
  if (!dossier.flagship) {
    throw new Error("Reference export held: this is not a materialized flagship dossier.");
  }

  const identity = toReferenceJson({
    dossierId: dossier.id,
    moleculeId: dossier.moleculeId,
    preferredName: dossier.preferredName,
    aliases: dossier.aliases,
    pubChemCid: dossier.sourceRecord.identity.pubChemCid,
    verification: dossier.sourceRecord.identity.verification,
    sourceIds: dossier.sourceRecord.identity.sourceIds,
  });
  const chemistry = toReferenceJson(dossier.chemistry);
  const productAnchor = toReferenceJson(dossier.flagship.productAnchor);
  const classifications = toReferenceJson(classificationData(dossier));
  const pharmacology = toReferenceJson(dossier.pharmacology);
  const adme = toReferenceJson(admeData(dossier));
  const metabolites = toReferenceJson(dossier.metabolites);
  const coverage = toReferenceJson(dossier.coverage);
  const flagship = toReferenceJson({
    chemistryAnnotations: dossier.flagship.chemistryAnnotations,
    descriptors: dossier.flagship.descriptors,
    journey: dossier.flagship.journey,
    synthesis: dossier.flagship.synthesis,
    nomenclature: dossier.flagship.nomenclature,
    comparisons: dossier.flagship.comparisons,
    learning: dossier.flagship.learning,
    explicitMissingFields: dossier.flagship.explicitMissingFields,
  });
  const limitations = toReferenceJson(dossier.limitations);

  const materializedContent = toReferenceJson({
    identity,
    chemistry,
    productAnchor,
    classifications,
    pharmacology,
    adme,
    metabolites,
    coverage,
    flagship,
    limitations,
  });
  validateResolvedSources(materializedContent, dossier);

  return {
    schema: flagshipReferenceExportSchema,
    format: "application/json",
    locale,
    boundaries: {
      presentation: "reference",
      exportScope: "currently-materialized-record",
      notForClinicalUse: true,
      containsDerivedScience: false,
    },
    identity,
    chemistry,
    productAnchor,
    classifications,
    pharmacology,
    adme,
    metabolites,
    coverage,
    flagship,
    sources: toReferenceJson(dossier.sources),
    limitations,
  };
}

export function serializeFlagshipReferenceExport(
  dossier: DrugDossierRecord,
  locale: DossierLocale,
): string {
  return `${JSON.stringify(createFlagshipReferenceExport(dossier, locale), null, 2)}\n`;
}

export function flagshipReferenceExportFilename(
  dossier: Pick<DrugDossierRecord, "preferredName">,
  locale: DossierLocale,
): string {
  const slug = dossier.preferredName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "dossier";
  return `molevren-${slug}-${locale}-reference.json`;
}
