import { canPresentAdmeField } from "@/lib/application/adme";
import {
  canPresentPrimaryTargetClaim,
  canPresentTargetInteraction,
} from "@/lib/application/pharmacology";
import type { AdmeEvidenceField, AdmeProfile } from "@/lib/domain/adme";
import type { SourceReference } from "@/lib/domain/evidence";
import type {
  DossierLocale,
  FlagshipDossierSeed,
  FlagshipDossierContent,
} from "@/lib/domain/dossier";
import type { SourceId } from "@/lib/domain/ids";

export type FlagshipSourceResolver = (
  sourceId: SourceId,
) => SourceReference | undefined;

function collectSourceIdsFromValue(
  value: unknown,
  target: Set<SourceId>,
  seen: Set<object>,
): void {
  if (typeof value === "string") {
    if (value.startsWith("source:")) target.add(value as SourceId);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (value instanceof Map) {
    for (const [key, entry] of value.entries()) {
      collectSourceIdsFromValue(key, target, seen);
      collectSourceIdsFromValue(entry, target, seen);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectSourceIdsFromValue(entry, target, seen));
    return;
  }
  Object.values(value as Record<string, unknown>).forEach((entry) =>
    collectSourceIdsFromValue(entry, target, seen));
}

export function collectFlagshipSourceIds(
  seedOrContent: FlagshipDossierSeed | FlagshipDossierContent,
): readonly SourceId[] {
  const ids = new Set<SourceId>();
  collectSourceIdsFromValue(seedOrContent, ids, new Set());
  return [...ids];
}

/**
 * Legacy flagship seeds predate the canonical synthesis publication contract:
 * they do not carry an independently verified reviewState plus an explicit
 * reuse-rights decision. They therefore cannot publish route summaries,
 * materials, steps, citations, or locators. Preserve the rest of the dossier
 * and expose only an unavailable publication state until a canonical generated
 * route passes the strict public loader. Legacy content alone cannot assert
 * that direct synthesis evidence exists.
 */
export function gateLegacyFlagshipSynthesisForPublic(
  content: FlagshipDossierContent,
  locale: DossierLocale,
): FlagshipDossierContent {
  return {
    ...content,
    synthesis: {
      status: "unavailable",
      content: null,
      sourceIds: [],
      limitations: [
        locale === "tr"
          ? "Bu statik dossier kaydı sentez kanıtı veya rota yayımlamaz; güncel durum doğrulanmış Sentez Atlası kapsam kaydından okunmalıdır."
          : "This static dossier publishes no synthesis-evidence or route claim; consult the validated Synthesis Atlas coverage record for current status.",
      ],
    },
  };
}

export interface FlagshipValidationIssue {
  readonly code:
    | "molecule-mismatch"
    | "source-unresolved"
    | "source-not-direct"
    | "adme-route-missing"
    | "adme-form-missing"
    | "synthesis-operational-content"
    | "comparison-property-missing"
    | "comparison-target-action-missing"
    | "comparison-source-pair"
    | "comparison-status-not-presentable";
  readonly path: string;
  readonly message: string;
}

export function validateFlagshipDossierSeed(
  seed: FlagshipDossierSeed,
  resolveSource: FlagshipSourceResolver,
): readonly FlagshipValidationIssue[] {
  const issues: FlagshipValidationIssue[] = [];
  for (const sourceId of collectFlagshipSourceIds(seed)) {
    const source = resolveSource(sourceId);
    if (!source) {
      issues.push({
        code: "source-unresolved",
        path: sourceId,
        message: `Flagship source ${sourceId} is not in the source registry.`,
      });
      continue;
    }
    if (!source.url?.startsWith("https://")) {
      issues.push({
        code: "source-not-direct",
        path: sourceId,
        message: `Flagship source ${sourceId} does not resolve to a direct HTTPS URL.`,
      });
    }
  }
  seed.admeProfiles.forEach((profile, index) => {
    if (!profile.administration.route.value.trim()) {
      issues.push({ code: "adme-route-missing", path: `admeProfiles.${index}`, message: "ADME route is required." });
    }
    if (!profile.administration.formulation?.value.trim()) {
      issues.push({ code: "adme-form-missing", path: `admeProfiles.${index}`, message: "ADME formulation is required." });
    }
  });
  if (
    seed.content.synthesis.content &&
    seed.content.synthesis.content.operationalDetailsIncluded !== false
  ) {
    issues.push({
      code: "synthesis-operational-content",
      path: "content.synthesis",
      message: "A flagship synthesis route must explicitly exclude operational details.",
    });
  }
  seed.content.comparisons.content.forEach((comparison, index) => {
    if (comparison.propertyDifferences.length === 0) {
      issues.push({
        code: "comparison-property-missing",
        path: `content.comparisons.${index}.propertyDifferences`,
        message: "A flagship comparison requires at least one source-supported property difference.",
      });
    }
    if (!comparison.targetActionDifference) {
      issues.push({
        code: "comparison-target-action-missing",
        path: `content.comparisons.${index}.targetActionDifference`,
        message: "A flagship comparison requires a direct-source target/action difference or an explicit direct-source no-difference boundary.",
      });
    }
    const comparativeFields = [
      ...comparison.propertyDifferences,
      ...(comparison.targetActionDifference ? [comparison.targetActionDifference] : []),
    ];
    comparativeFields.forEach((field, fieldIndex) => {
      if (new Set(field.sourceIds).size < 2) {
        issues.push({
          code: "comparison-source-pair",
          path: `content.comparisons.${index}.comparativeFields.${fieldIndex}`,
          message: "A comparative field must resolve both sides through at least two distinct direct sources.",
        });
      }
      if (!["verified", "expert-reviewed", "source-supported"].includes(field.reviewStatus)) {
        issues.push({
          code: "comparison-status-not-presentable",
          path: `content.comparisons.${index}.comparativeFields.${fieldIndex}`,
          message: "Pending, predicted, conflicting, or unknown comparison evidence must fail closed.",
        });
      }
    });
  });
  return issues;
}

const filterFields = (
  fields: readonly AdmeEvidenceField[],
  resolveSource: FlagshipSourceResolver,
): readonly AdmeEvidenceField[] =>
  fields.filter((field) => canPresentAdmeField(field, resolveSource));

const optionalField = <T extends AdmeEvidenceField | null | undefined>(
  field: T,
  resolveSource: FlagshipSourceResolver,
): T | null =>
  field && canPresentAdmeField(field, resolveSource) ? field : null;

export function filterFlagshipAdmeProfiles(
  profiles: readonly AdmeProfile[],
  resolveSource: FlagshipSourceResolver,
): readonly AdmeProfile[] {
  return profiles
    .filter((profile) => {
      const routeSource = resolveSource(profile.administration.route.sourceId);
      const formSource = profile.administration.formulation
        ? resolveSource(profile.administration.formulation.sourceId)
        : null;
      return Boolean(
        routeSource?.url?.startsWith("https://") &&
        formSource?.url?.startsWith("https://") &&
        profile.administration.route.conditions.route &&
        profile.administration.formulation?.conditions.formulation,
      );
    })
    .map((profile) => ({
      ...profile,
      absorption: filterFields(profile.absorption, resolveSource),
      distribution: filterFields(profile.distribution, resolveSource),
      metabolism: filterFields(profile.metabolism, resolveSource),
      excretion: filterFields(profile.excretion, resolveSource),
      halfLife: optionalField(profile.halfLife, resolveSource),
      bioavailability: optionalField(profile.bioavailability, resolveSource),
      proteinBinding: optionalField(profile.proteinBinding, resolveSource),
      volumeOfDistribution: optionalField(profile.volumeOfDistribution, resolveSource),
      clearance: optionalField(profile.clearance, resolveSource),
    }));
}

export function filterFlagshipTargetClaims(
  seed: FlagshipDossierSeed,
  resolveSource: FlagshipSourceResolver,
) {
  return {
    primaryTargets: seed.primaryTargets.filter((claim) =>
      canPresentPrimaryTargetClaim(claim, resolveSource)),
    interactions: seed.interactions.filter((interaction) =>
      canPresentTargetInteraction(interaction, resolveSource)),
  };
}
