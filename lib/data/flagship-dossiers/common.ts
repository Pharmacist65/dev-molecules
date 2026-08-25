import type { AdmeEvidenceField } from "@/lib/domain/adme";
import type {
  ClassificationAxis,
  ClassificationProfile,
  ClassificationRef,
} from "@/lib/domain/classifications";
import type {
  EvidenceLevel,
  EvidenceClaim,
  VerificationStatus,
} from "@/lib/domain/evidence";
import type { MoleculeId, SourceId } from "@/lib/domain/ids";
import type {
  MetaboliteActivity,
  MetaboliteEdge,
  MetaboliteNode,
} from "@/lib/domain/metabolites";
import type {
  PharmacologyTargetClaim,
  TargetActionType,
} from "@/lib/domain/pharmacology";
import type {
  DossierLocale,
  EvidenceConditions,
  EvidenceField,
  EvidenceValueQualifier,
  FlagshipDossierSection,
  FlagshipSectionStatus,
} from "@/lib/domain/dossier";

export const localized = <T>(locale: DossierLocale, tr: T, en: T): T =>
  locale === "tr" ? tr : en;

/**
 * Binds a presentation map to the exact atom encounter order of the stored
 * connectivity SMILES. Changing that serialization requires re-auditing this map.
 */
export const atomMap = (...atomIndexes: readonly number[]) => ({
  atomIndexes,
  atomLabels: atomIndexes.map((index) => `A${index + 1}`),
});

export function evidenceField<T>(
  value: T,
  sourceId: SourceId,
  conditions: EvidenceConditions,
  options: {
    readonly unit?: string | null;
    readonly dimensionless?: boolean;
    readonly valueQualifier?: EvidenceValueQualifier;
    readonly evidenceType?: EvidenceLevel;
    readonly reviewStatus?: VerificationStatus;
  } = {},
): EvidenceField<T> {
  return {
    value,
    unit: options.unit ?? null,
    dimensionless: options.dimensionless,
    valueQualifier: options.valueQualifier,
    conditions,
    sourceId,
    evidenceType: options.evidenceType ?? "literature-reported",
    reviewStatus: options.reviewStatus ?? "source-supported",
  };
}

export function admeField<T extends string | number>(
  id: string,
  phase: AdmeEvidenceField["phase"],
  label: string,
  value: T,
  sourceId: SourceId,
  conditions: EvidenceConditions,
  unit: string | null = null,
  valueQualifier?: EvidenceValueQualifier,
): AdmeEvidenceField<T> {
  return {
    id,
    phase,
    label,
    ...evidenceField(value, sourceId, conditions, {
      unit,
      valueQualifier,
      evidenceType: "regulatory",
      reviewStatus: "source-supported",
    }),
  };
}

const classification = (
  moleculeSlug: string,
  axis: ClassificationAxis,
  slug: string,
  label: string,
  sourceId: SourceId,
  note: string,
): ClassificationRef => ({
  id: `classification:flagship:${moleculeSlug}:${axis}:${slug}`,
  axis,
  code: null,
  label: evidenceField(label, sourceId, { note }, {
    evidenceType: axis === "chemical-scaffold"
      ? "curated-database"
      : "regulatory",
    reviewStatus: "source-supported",
  }),
  level: null,
  parentId: null,
  sourceIds: [sourceId],
  reviewStatus: "source-supported",
});

export function classificationProfile(
  moleculeSlug: string,
  values: {
    readonly therapeutic: readonly [string, string, SourceId, string][];
    readonly pharmacological: readonly [string, string, SourceId, string][];
    readonly chemical: readonly [string, string, SourceId, string][];
  },
): ClassificationProfile {
  const therapeutic = values.therapeutic.map(([slug, label, sourceId, note]) =>
    classification(moleculeSlug, "therapeutic-atc", slug, label, sourceId, note));
  const pharmacological = values.pharmacological.map(([slug, label, sourceId, note]) =>
    classification(moleculeSlug, "pharmacological-mechanism", slug, label, sourceId, note));
  const chemical = values.chemical.map(([slug, label, sourceId, note]) =>
    classification(moleculeSlug, "chemical-scaffold", slug, label, sourceId, note));
  const refs = [...therapeutic, ...pharmacological, ...chemical];
  const hierarchy = (axis: ClassificationAxis) => {
    const roots = refs.filter((ref) => ref.axis === axis);
    return { axis, roots, byParentId: new Map([[null, roots]]) };
  };
  return {
    therapeutic,
    pharmacological,
    chemical,
    hierarchies: [
      hierarchy("therapeutic-atc"),
      hierarchy("pharmacological-mechanism"),
      hierarchy("chemical-scaffold"),
    ],
    withheldCandidateCount: 0,
    availability: "source-supported",
    unavailableReason: null,
  };
}

export function targetClaim(
  id: string,
  targetName: string,
  targetFamily: string,
  action: TargetActionType,
  mechanism: string,
  targetSourceId: SourceId,
  mechanismSourceId: SourceId,
  localeNote: string,
  additionalSourceIds: readonly SourceId[] = [],
): PharmacologyTargetClaim {
  const targetConditions = { note: localeNote };
  const mechanismConditions = { note: localeNote };
  return {
    id,
    targetName: evidenceField(targetName, targetSourceId, targetConditions, {
      evidenceType: "curated-database",
      reviewStatus: "source-supported",
    }),
    targetFamily: evidenceField(targetFamily, targetSourceId, targetConditions, {
      evidenceType: "curated-database",
      reviewStatus: "source-supported",
    }),
    action: evidenceField(action, mechanismSourceId, mechanismConditions, {
      evidenceType: "regulatory",
      reviewStatus: "source-supported",
    }),
    mechanism: evidenceField(mechanism, mechanismSourceId, mechanismConditions, {
      evidenceType: "regulatory",
      reviewStatus: "source-supported",
    }),
    sourceIds: [targetSourceId, mechanismSourceId, ...additionalSourceIds],
    reviewStatus: "source-supported",
  };
}

export function mechanismClaim(
  id: `claim:${string}`,
  moleculeId: MoleculeId,
  statement: string,
  sourceIds: readonly SourceId[],
  limitations: readonly string[],
): EvidenceClaim {
  return {
    id,
    subjectId: moleculeId,
    category: "mechanism",
    statement,
    intent: "reference",
    evidenceLevel: "regulatory",
    verification: { status: "source-supported" },
    sourceIds,
    limitations,
  };
}

export function metaboliteNode(
  id: string,
  label: string,
  sourceId: SourceId,
  note: string,
  structure2dSmiles: string | null = null,
): MetaboliteNode {
  return {
    id,
    moleculeId: null,
    label: evidenceField(label, sourceId, { note }, {
      evidenceType: "curated-database",
      reviewStatus: "source-supported",
    }),
    role: "metabolite",
    structure2dSmiles: structure2dSmiles
      ? evidenceField(structure2dSmiles, sourceId, { note }, {
          evidenceType: "curated-database",
          reviewStatus: "source-supported",
        })
      : null,
    provenance: null,
    structure2dPath: null,
    structure3dPath: null,
  };
}

export function metaboliteEdge(
  id: string,
  parentNodeId: string,
  metaboliteNodeId: string,
  transformation: string,
  activity: MetaboliteActivity,
  sourceId: SourceId,
  note: string,
  enzyme: string | null = null,
  activityEvidence: {
    readonly sourceId: SourceId;
    readonly note: string;
    readonly evidenceType: EvidenceLevel;
  } | null = null,
): MetaboliteEdge {
  const activitySourceId = activityEvidence?.sourceId ?? sourceId;
  return {
    id,
    parentNodeId,
    metaboliteNodeId,
    enzyme: enzyme
      ? evidenceField(enzyme, sourceId, { note }, {
          evidenceType: "regulatory",
          reviewStatus: "source-supported",
        })
      : null,
    transformationClass: evidenceField(transformation, sourceId, { note }, {
      evidenceType: "regulatory",
      reviewStatus: "source-supported",
    }),
    activity: evidenceField(activity, activitySourceId, {
      note: activityEvidence?.note ?? note,
    }, {
      evidenceType: activityEvidence?.evidenceType ?? "regulatory",
      reviewStatus: "source-supported",
    }),
    sourceIds: activitySourceId === sourceId
      ? [sourceId]
      : [sourceId, activitySourceId],
    reviewStatus: "source-supported",
  };
}

export function section<T>(
  status: FlagshipSectionStatus,
  content: T,
  sourceIds: readonly SourceId[],
  limitations: readonly string[] = [],
): FlagshipDossierSection<T> {
  return { status, content, sourceIds, limitations };
}
