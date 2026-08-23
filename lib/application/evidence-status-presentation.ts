import type { TranslationKey, Translator } from "@/lib/i18n";

const evidenceStatusKeys: Readonly<Record<string, TranslationKey>> = {
  "curated-fallback": "status.curatedFallback",
  "valid-record": "status.validRecord",
  "exact-curated-match": "status.exactCuratedMatch",
  "educational-story-only": "status.educationalStoryOnly",
  "not-assessed": "status.notAssessed",
  "not-found": "status.notFound",
  verified: "status.verified",
  "source-supported": "status.sourceSupported",
  pending: "status.pending",
  unknown: "status.unknown",
};

export function presentEvidenceStatus(value: string, t: Translator): string {
  const key = evidenceStatusKeys[value];
  return t(key ?? "status.unknown");
}
