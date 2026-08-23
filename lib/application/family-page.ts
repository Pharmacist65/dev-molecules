import {
  FAMILY_COMPARISON_FIELD_IDS,
  type DrugFamilyPageModel,
  type FamilyComparisonFieldId,
  type FamilyEvidenceField,
  type FamilyEvidenceSource,
  type FamilyRepresentativeDrug,
  type LocalizedFamilyText,
} from "@/lib/domain/drug-family";
import {
  STRUCTURAL_FINGERPRINT_VERSION,
  createCanonicalSmilesPathFingerprint,
  tanimotoSimilarity,
} from "@/lib/explore";

export interface DrugFamilyValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface FamilyComparisonRow {
  readonly field: FamilyComparisonFieldId;
  readonly values: readonly {
    readonly drugId: string;
    readonly field: FamilyEvidenceField<LocalizedFamilyText>;
  }[];
}

export interface FamilyCoverageGap {
  readonly drugId: string;
  readonly missingFields: readonly FamilyComparisonFieldId[];
}

export interface FamilyFingerprintComparison {
  readonly method: typeof STRUCTURAL_FINGERPRINT_VERSION;
  readonly reviewStatus: "computed-unreviewed";
  readonly moleculeIds: readonly string[];
  readonly similarities: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly limitation: string;
}

const isNonBlank = (value: string): boolean => value.trim().length > 0;

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

function validateSource(
  source: FamilyEvidenceSource,
  path: string,
): readonly DrugFamilyValidationIssue[] {
  const issues: DrugFamilyValidationIssue[] = [];
  if (!isNonBlank(source.id) || !isNonBlank(source.label)) {
    issues.push({ path, message: "Evidence sources need an ID and label." });
  }
  if (!isHttpUrl(source.href)) {
    issues.push({ path: `${path}.href`, message: "Evidence source URL must use HTTP(S)." });
  }
  return issues;
}

function validateLocalizedText(
  value: LocalizedFamilyText,
  path: string,
): readonly DrugFamilyValidationIssue[] {
  return isNonBlank(value.tr) && isNonBlank(value.en)
    ? []
    : [{ path, message: "Family content requires non-empty TR and EN text." }];
}

function validateEvidenceField<Value>(
  field: FamilyEvidenceField<Value>,
  path: string,
): readonly DrugFamilyValidationIssue[] {
  if (field.availability === "missing") {
    return validateLocalizedText(field.reason, `${path}.reason`);
  }
  if (field.sources.length === 0) {
    return [{ path: `${path}.sources`, message: "Available family claims require a source." }];
  }
  return field.sources.flatMap((source, index) =>
    validateSource(source, `${path}.sources[${index}]`),
  );
}

/**
 * Validates the fail-closed parts of a family page without assuming that one
 * molecule has exactly one ATC, mechanism, or scaffold membership.
 */
export function validateDrugFamilyPageModel(
  family: DrugFamilyPageModel,
): readonly DrugFamilyValidationIssue[] {
  const issues: DrugFamilyValidationIssue[] = [];
  if (!isNonBlank(family.id) || !isNonBlank(family.slug)) {
    issues.push({ path: "family", message: "A family needs a stable ID and slug." });
  }
  issues.push(...validateLocalizedText(family.name, "family.name"));
  const hasMembershipClaim =
    family.classifications.length > 0 ||
    family.representatives.some((drug) => drug.memberships.length > 0) ||
    family.overview.availability === "available" ||
    family.sharedMechanism.availability === "available" ||
    family.primaryTargetFamilies.availability === "available" ||
    family.sharedStructuralMotifs.availability === "available";
  if (family.kinds.length === 0 && hasMembershipClaim) {
    issues.push({
      path: "family.kinds",
      message: "A page with family claims needs at least one declared kind.",
    });
  }
  issues.push(...validateEvidenceField(family.overview, "family.overview"));
  issues.push(...validateEvidenceField(family.sharedMechanism, "family.sharedMechanism"));
  issues.push(...validateEvidenceField(family.primaryTargetFamilies, "family.primaryTargetFamilies"));
  issues.push(...validateEvidenceField(family.sharedStructuralMotifs, "family.sharedStructuralMotifs"));
  if (family.overview.availability === "available") {
    issues.push(...validateLocalizedText(family.overview.value, "family.overview.value"));
  }
  for (const [key, field] of [
    ["sharedMechanism", family.sharedMechanism],
    ["primaryTargetFamilies", family.primaryTargetFamilies],
    ["sharedStructuralMotifs", family.sharedStructuralMotifs],
  ] as const) {
    if (field.availability !== "available") continue;
    if (field.value.length === 0) {
      issues.push({
        path: `family.${key}.value`,
        message: "Available family facts cannot be empty.",
      });
    }
    field.value.forEach((value, index) => {
      issues.push(...validateLocalizedText(value, `family.${key}.value[${index}]`));
    });
  }

  if (family.representatives.length === 0) {
    issues.push({
      path: "family.representatives",
      message: "A family page needs at least one representative drug.",
    });
  }

  const representativeIds = new Set<string>();
  family.representatives.forEach((drug, drugIndex) => {
    const path = `family.representatives[${drugIndex}]`;
    if (representativeIds.has(drug.id)) {
      issues.push({ path: `${path}.id`, message: `Duplicate representative ID: ${drug.id}.` });
    }
    representativeIds.add(drug.id);
    if (!isNonBlank(drug.id) || !isNonBlank(drug.slug) || !isNonBlank(drug.name)) {
      issues.push({ path, message: "Representative drugs need ID, slug, and name." });
    }
    if (!Number.isSafeInteger(drug.pubChemCid) || drug.pubChemCid < 1) {
      issues.push({ path: `${path}.pubChemCid`, message: "PubChem CID must be a positive integer." });
    }
    for (const fieldId of FAMILY_COMPARISON_FIELD_IDS) {
      const field = drug.comparison[fieldId];
      if (field) {
        issues.push(...validateEvidenceField(field, `${path}.comparison.${fieldId}`));
        if (field.availability === "available") {
          issues.push(
            ...validateLocalizedText(
              field.value,
              `${path}.comparison.${fieldId}.value`,
            ),
          );
        }
      }
    }
  });

  family.classifications.forEach((track, trackIndex) => {
    const path = `family.classifications[${trackIndex}]`;
    if (track.paths.length === 0 || track.paths.some((classificationPath) => classificationPath.length === 0)) {
      issues.push({ path: `${path}.paths`, message: "Classification tracks need at least one non-empty path." });
    }
    track.paths.forEach((classificationPath, pathIndex) => {
      classificationPath.forEach((node, nodeIndex) => {
        issues.push(...validateLocalizedText(node.label, `${path}.paths[${pathIndex}][${nodeIndex}].label`));
      });
    });
    if (track.sources.length === 0) {
      issues.push({ path: `${path}.sources`, message: "Classification tracks require provenance." });
    }
    track.sources.forEach((source, sourceIndex) => {
      issues.push(...validateSource(source, `${path}.sources[${sourceIndex}]`));
    });
  });
  return issues;
}

function explicitMissingField(): FamilyEvidenceField<LocalizedFamilyText> {
  return {
    availability: "missing",
    reason: {
      tr: "Bu alan henüz kaynakla kürate edilmedi.",
      en: "This field has not yet been source-curated.",
    },
  };
}

/**
 * Comparison rows require at least two source-backed values. Missing cells stay
 * explicit, while fields that cannot support a comparison remain in coverage
 * gaps instead of becoming a misleading table row.
 */
export function buildFamilyComparisonRows(
  representatives: readonly FamilyRepresentativeDrug[],
): readonly FamilyComparisonRow[] {
  return FAMILY_COMPARISON_FIELD_IDS.flatMap((field): FamilyComparisonRow[] => {
    const availableCount = representatives.filter(
      (drug) => drug.comparison[field]?.availability === "available",
    ).length;
    if (availableCount < 2) return [];
    return [{
      field,
      values: representatives.map((drug) => ({
        drugId: drug.id,
        field: drug.comparison[field] ?? explicitMissingField(),
      })),
    }];
  });
}

export function getFamilyCoverageGaps(
  representatives: readonly FamilyRepresentativeDrug[],
): readonly FamilyCoverageGap[] {
  return representatives.map((drug) => ({
    drugId: drug.id,
    missingFields: FAMILY_COMPARISON_FIELD_IDS.filter(
      (field) => drug.comparison[field]?.availability !== "available",
    ),
  }));
}

/**
 * Deterministic educational structure comparison. It is intentionally labelled
 * computed/unreviewed and never implies shared targets, activity, or efficacy.
 */
export function buildFamilyFingerprintComparison(
  representatives: readonly FamilyRepresentativeDrug[],
): FamilyFingerprintComparison | null {
  const inputs = representatives.filter(
    (drug): drug is FamilyRepresentativeDrug & { readonly canonicalSmiles: string } =>
      Boolean(drug.canonicalSmiles?.trim()),
  );
  if (inputs.length < 2) return null;
  const fingerprints = new Map(
    inputs.map((drug) => [
      drug.id,
      createCanonicalSmilesPathFingerprint(drug.canonicalSmiles),
    ]),
  );
  return {
    method: STRUCTURAL_FINGERPRINT_VERSION,
    reviewStatus: "computed-unreviewed",
    moleculeIds: inputs.map((drug) => drug.id),
    similarities: Object.fromEntries(
      inputs.map((left) => [
        left.id,
        Object.fromEntries(
          inputs.map((right) => [
            right.id,
            Number(tanimotoSimilarity(
              fingerprints.get(left.id)!,
              fingerprints.get(right.id)!,
            ).toFixed(4)),
          ]),
        ),
      ]),
    ),
    limitation:
      "Canonical-SMILES path fingerprint comparison; computed and unreviewed. It does not establish pharmacological, biological, or clinical similarity.",
  };
}
