import type { AtomMappingStatus, EvidenceLevel } from "../domain";
import { translate } from "../i18n/core";
import type { Locale } from "../i18n/locale";
import type { TranslationKey } from "../i18n/messages";

const atomMappingStatusKeys = {
  reviewed: "status.atomMapping.reviewed",
  draft: "status.atomMapping.draft",
  "not-mapped": "status.atomMapping.notMapped",
  "not-applicable": "status.atomMapping.notApplicable",
} as const satisfies Readonly<Record<AtomMappingStatus, TranslationKey>>;

const evidenceLevelKeys = {
  "direct-experimental": "status.evidence.directExperimental",
  regulatory: "status.evidence.regulatory",
  "curated-database": "status.evidence.curatedDatabase",
  "literature-reported": "status.evidence.literatureReported",
  "analog-supported": "status.evidence.analogSupported",
  computed: "status.evidence.computed",
  "model-predicted": "status.evidence.modelPredicted",
  "educational-simplification": "status.evidence.educationalSimplification",
  "no-evidence": "status.evidence.noEvidence",
} as const satisfies Readonly<Record<EvidenceLevel, TranslationKey>>;

/**
 * Presents domain statuses without leaking serialized enum values into the UI.
 * Unexpected runtime input fails closed to a localized unspecified label.
 */
function presentStatus(
  key: TranslationKey | undefined,
  locale: Locale,
): string {
  return translate(locale, key ?? "common.notSpecified");
}

export function getAtomMappingStatusLabel(
  status: AtomMappingStatus,
  locale: Locale,
): string {
  return presentStatus(atomMappingStatusKeys[status], locale);
}

export function getEvidenceLevelLabel(
  level: EvidenceLevel,
  locale: Locale,
): string {
  return presentStatus(evidenceLevelKeys[level], locale);
}
