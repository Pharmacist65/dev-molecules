import type { SourceReference } from "@/lib/domain/evidence";
import type { MoleculeClassification, MoleculeRecord } from "@/lib/domain/molecule";
import type { SourceId } from "@/lib/domain/ids";
import {
  isReviewedStatus,
  type EvidenceField,
} from "@/lib/domain/dossier";
import type {
  ClassificationAxis,
  ClassificationHierarchy,
  ClassificationProfile,
  ClassificationRef,
} from "@/lib/domain/classifications";

export type ClassificationSourceResolver = (
  sourceId: SourceId,
) => SourceReference | undefined;

const domainAxis = (
  classification: MoleculeClassification,
): ClassificationAxis => {
  if (classification.axis === "structural-family") return "chemical-scaffold";
  if (classification.axis === "pharmacologic-class" || classification.axis === "target-profile") {
    return "pharmacological-mechanism";
  }
  return "therapeutic-atc";
};

const firstReviewedSource = (
  classification: MoleculeClassification,
  resolveSource: ClassificationSourceResolver,
): SourceReference | null => {
  if (!isReviewedStatus(classification.verification.status)) return null;
  for (const sourceId of classification.sourceIds) {
    const source = resolveSource(sourceId);
    if (source?.url && isReviewedStatus(source.verification.status)) return source;
  }
  return null;
};

const toField = (
  value: string,
  classification: MoleculeClassification,
  source: SourceReference,
): EvidenceField<string> => ({
  value,
  unit: null,
  conditions: {
    note: classification.summary,
  },
  sourceId: source.id,
  evidenceType: "curated-database",
  reviewStatus: classification.verification.status,
});

const toReviewedRef = (
  classification: MoleculeClassification,
  resolveSource: ClassificationSourceResolver,
): ClassificationRef | null => {
  const source = firstReviewedSource(classification, resolveSource);
  if (!source) return null;
  return {
    id: classification.id,
    axis: domainAxis(classification),
    code: toField(classification.value, classification, source),
    label: toField(classification.label, classification, source),
    level: null,
    parentId: null,
    sourceIds: [source.id],
    reviewStatus: classification.verification.status,
  };
};

export function createClassificationHierarchy(
  axis: ClassificationAxis,
  refs: readonly ClassificationRef[],
): ClassificationHierarchy {
  const axisRefs = refs.filter((ref) => ref.axis === axis);
  const mutable = new Map<string | null, ClassificationRef[]>();
  for (const ref of axisRefs) {
    const siblings = mutable.get(ref.parentId) ?? [];
    siblings.push(ref);
    mutable.set(ref.parentId, siblings);
  }
  return {
    axis,
    roots: mutable.get(null) ?? [],
    byParentId: new Map(
      [...mutable.entries()].map(([key, value]) => [key, [...value]]),
    ),
  };
}

/** Pending navigation labels are deliberately withheld from the dossier. */
export function createClassificationProfile(
  record: Pick<MoleculeRecord, "classifications">,
  resolveSource: ClassificationSourceResolver,
  locale: "tr" | "en",
): ClassificationProfile {
  const refs = record.classifications
    .map((classification) => toReviewedRef(classification, resolveSource))
    .filter((ref): ref is ClassificationRef => ref !== null);
  const therapeutic = refs.filter((ref) => ref.axis === "therapeutic-atc");
  const pharmacological = refs.filter((ref) => ref.axis === "pharmacological-mechanism");
  const chemical = refs.filter((ref) => ref.axis === "chemical-scaffold");
  const withheldCandidateCount = record.classifications.length - refs.length;
  const unavailableReason = refs.length > 0
    ? null
    : locale === "tr"
      ? "İncelenmiş ve doğrudan çözümlenebilir bir sınıflandırma kaynağı henüz yok. Taslak katalog etiketleri bilimsel hüküm olarak gösterilmez."
      : "No reviewed, directly resolvable classification source is available yet. Draft catalog labels are not shown as scientific conclusions.";

  return {
    therapeutic,
    pharmacological,
    chemical,
    hierarchies: [
      createClassificationHierarchy("therapeutic-atc", refs),
      createClassificationHierarchy("pharmacological-mechanism", refs),
      createClassificationHierarchy("chemical-scaffold", refs),
    ],
    withheldCandidateCount,
    availability: refs.length > 0 ? "reviewed" : "unavailable",
    unavailableReason,
  };
}
