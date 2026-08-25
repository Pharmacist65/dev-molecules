import type {
  EvidenceConditions,
  FlagshipComparativeEvidence,
} from "@/lib/domain/dossier";
import type { EvidenceLevel, VerificationStatus } from "@/lib/domain/evidence";
import type { SourceId } from "@/lib/domain/ids";

export function comparativeEvidence<T>(
  value: T,
  sourceIds: readonly [SourceId, SourceId, ...SourceId[]],
  conditions: EvidenceConditions,
  options: {
    readonly evidenceType?: EvidenceLevel;
    readonly reviewStatus?: VerificationStatus;
  } = {},
): FlagshipComparativeEvidence<T> {
  return {
    value,
    sourceIds,
    conditions,
    evidenceType: options.evidenceType ?? "curated-database",
    reviewStatus: options.reviewStatus ?? "source-supported",
  };
}
