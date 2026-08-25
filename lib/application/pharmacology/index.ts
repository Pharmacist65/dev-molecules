import type { SourceReference } from "@/lib/domain/evidence";
import type { EvidenceClaim } from "@/lib/domain/evidence";
import type { SourceId } from "@/lib/domain/ids";
import type { MoleculeRecord } from "@/lib/domain/molecule";
import {
  hasCompleteEvidenceField,
  isReviewedStatus,
  type EvidenceField,
} from "@/lib/domain/dossier";
import type { ClassificationProfile } from "@/lib/domain/classifications";
import type {
  PharmacologyTargetClaim,
  PharmacologyProfile,
  TargetInteraction,
} from "@/lib/domain/pharmacology";

export type PharmacologySourceResolver = (
  sourceId: SourceId,
) => SourceReference | undefined;

const targetEvidenceScope = /target|bioactivity|binding|affinity|assay|pharmacolog|mechanism/i;

const isSourcePresentableStatus = (
  status: EvidenceField<unknown>["reviewStatus"],
): boolean => isReviewedStatus(status) || status === "source-supported";

export function canPresentPrimaryTargetClaim(
  claim: PharmacologyTargetClaim,
  resolveSource: PharmacologySourceResolver,
): boolean {
  const fields = [
    claim.targetName,
    claim.action,
    ...(claim.targetFamily ? [claim.targetFamily] : []),
    ...(claim.mechanism ? [claim.mechanism] : []),
  ];
  if (!isSourcePresentableStatus(claim.reviewStatus)) return false;
  if (!fields.every((field) =>
    hasCompleteEvidenceField(field as EvidenceField<unknown>) &&
    isSourcePresentableStatus(field.reviewStatus))) {
    return false;
  }
  const fieldSourceIds = new Set(fields.map((field) => field.sourceId));
  const declaredSourceIds = new Set(claim.sourceIds);
  if (
    declaredSourceIds.size === 0 ||
    [...fieldSourceIds].some((sourceId) => !declaredSourceIds.has(sourceId))
  ) {
    return false;
  }
  return claim.sourceIds.every((sourceId) => {
    const source = resolveSource(sourceId);
    return Boolean(
      source?.url &&
      isSourcePresentableStatus(source.verification.status) &&
      targetEvidenceScope.test(source.scope),
    );
  });
}

export function canPresentTargetInteraction(
  interaction: TargetInteraction,
  resolveSource: PharmacologySourceResolver,
): boolean {
  const fields = [
    interaction.targetName,
    interaction.action,
    interaction.measurementType,
    interaction.measurement,
    interaction.species,
    interaction.assayContext,
    ...(interaction.targetFamily ? [interaction.targetFamily] : []),
  ];
  if (!isReviewedStatus(interaction.reviewStatus)) return false;
  if (!fields.every((field) =>
    hasCompleteEvidenceField(field as EvidenceField<unknown>) &&
    isReviewedStatus(field.reviewStatus))) {
    return false;
  }
  const fieldSourceIds = new Set(fields.map((field) => field.sourceId));
  const declaredSourceIds = new Set(interaction.sourceIds);
  if (
    declaredSourceIds.size === 0 ||
    interaction.sourceIds.some((sourceId) => !fieldSourceIds.has(sourceId)) ||
    [...fieldSourceIds].some((sourceId) => !declaredSourceIds.has(sourceId))
  ) {
    return false;
  }
  return [...fieldSourceIds].every((sourceId) => {
    const source = resolveSource(sourceId);
    return Boolean(
      source?.url &&
      isReviewedStatus(source.verification.status) &&
      targetEvidenceScope.test(source.scope),
    );
  });
}

/**
 * The current checked-in catalog has reviewed identity/product anchors but no
 * reviewed target-interaction dataset. Passing no interactions is intentional.
 */
export function createPharmacologyProfile(
  record: MoleculeRecord,
  classifications: ClassificationProfile,
  resolveSource: PharmacologySourceResolver,
  locale: "tr" | "en",
  interactions: readonly TargetInteraction[] = [],
  primaryTargetClaims: readonly PharmacologyTargetClaim[] = [],
  additionalMechanismClaims: readonly EvidenceClaim[] = [],
): PharmacologyProfile {
  const primaryTargets = primaryTargetClaims.filter((claim) =>
    canPresentPrimaryTargetClaim(claim, resolveSource));
  const targets = interactions.filter((interaction) =>
    canPresentTargetInteraction(interaction, resolveSource));
  const mechanismClaims = [...record.claims, ...additionalMechanismClaims].filter(
    (claim) =>
      (claim.category === "target" || claim.category === "mechanism") &&
      isSourcePresentableStatus(claim.verification.status) &&
      claim.sourceIds.length > 0 &&
      claim.sourceIds.every((sourceId) => {
        const source = resolveSource(sourceId);
        return Boolean(source?.url && targetEvidenceScope.test(source.scope));
      }),
  );
  const sourceIds = [...new Set([
    ...primaryTargets.flatMap((target) => target.sourceIds),
    ...targets.flatMap((target) => target.sourceIds),
    ...mechanismClaims.flatMap((claim) => claim.sourceIds),
  ])];
  const hasContent = primaryTargets.length > 0 || targets.length > 0 || mechanismClaims.length > 0;
  const allReviewed = [
    ...primaryTargets.map((target) => target.reviewStatus),
    ...targets.map((target) => target.reviewStatus),
    ...mechanismClaims.map((claim) => claim.verification.status),
  ].every(isReviewedStatus);

  return {
    moleculeId: record.id,
    classifications: [
      ...classifications.therapeutic,
      ...classifications.pharmacological,
      ...classifications.chemical,
    ],
    primaryTargets,
    targets,
    actionTypes: [...new Set([
      ...primaryTargets.map((target) => target.action.value),
      ...targets.map((target) => target.action.value),
    ])],
    mechanismClaims,
    pathwayEffects: [],
    pharmacodynamicEffects: [],
    sourceIds,
    reviewStatus: hasContent
      ? allReviewed
        ? "verified"
        : "source-supported"
      : "unknown",
    availability: hasContent
      ? allReviewed
        ? "reviewed"
        : "source-supported"
      : "unavailable",
    unavailableReason: hasContent
      ? null
      : locale === "tr"
        ? "Bu kayıt için incelenmiş, ölçüm koşulları ve doğrudan kaynağı çözümlenmiş hedef etkileşimi henüz yok."
        : "No reviewed target interaction with resolved measurement conditions and a direct source is available for this record yet.",
  };
}
