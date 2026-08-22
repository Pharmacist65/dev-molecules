import type { SourceReference } from "@/lib/domain/evidence";
import type { SourceId } from "@/lib/domain/ids";
import type { MoleculeRecord, RegulatoryProductReference } from "@/lib/domain/molecule";
import {
  hasCompleteEvidenceField,
  isReviewedStatus,
  type EvidenceField,
} from "@/lib/domain/dossier";
import type { AdmeEvidenceField, AdmeProfile } from "@/lib/domain/adme";

export type AdmeSourceResolver = (
  sourceId: SourceId,
) => SourceReference | undefined;

const admeEvidenceScope = /adme|pharmacokinetic|absorption|distribution|metaboli|excretion|clearance|half[- ]?life|bioavailability/i;

const contextField = (
  value: string,
  product: RegulatoryProductReference,
  note: string,
): EvidenceField<string> => ({
  value,
  unit: null,
  conditions: {
    note,
    route: product.route,
    formulation: product.dosageForm,
  },
  sourceId: product.sourceId,
  evidenceType: "regulatory",
  reviewStatus: product.verification.status,
});

export function canPresentAdmeField(
  field: AdmeEvidenceField,
  resolveSource: AdmeSourceResolver,
): boolean {
  const source = resolveSource(field.sourceId);
  return (
    hasCompleteEvidenceField(field) &&
    isReviewedStatus(field.reviewStatus) &&
    Boolean(
      source?.url &&
      isReviewedStatus(source.verification.status) &&
      admeEvidenceScope.test(source.scope),
    )
  );
}

/**
 * Creates a route/form/product evidence boundary only. It deliberately leaves
 * every ADME phase empty until a label section or literature record is parsed.
 */
export function createRouteScopedAdmeProfile(
  record: MoleculeRecord,
  product: RegulatoryProductReference,
  resolveSource: AdmeSourceResolver,
  locale: "tr" | "en",
): AdmeProfile | null {
  const source = resolveSource(product.sourceId);
  if (!source?.url || !isReviewedStatus(product.verification.status)) return null;
  const routeNote = locale === "tr"
    ? "Bu yalnızca kesin Drugs@FDA ürün/form uygulama bağlamıdır; emilim, biyoyararlanım veya sistemik maruziyet çıkarımı değildir."
    : "This is the exact Drugs@FDA product/form administration context only; it is not an absorption, bioavailability, or systemic-exposure inference.";

  return {
    id: `adme-context:${product.id}`,
    molecularEntityId: record.id,
    chemicalFormId: product.chemicalFormId,
    regulatoryProductId: product.id,
    administration: {
      route: contextField(product.route, product, routeNote),
      formulation: contextField(product.dosageForm, product, routeNote),
    },
    absorption: [],
    distribution: [],
    metabolism: [],
    excretion: [],
    metabolites: [],
    sourceIds: [product.sourceId],
    reviewStatus: product.verification.status,
    evidenceAvailability: "context-only",
    limitations: locale === "tr"
      ? [
          "Oral, intravenöz ve topikal profiller birbirine kopyalanmaz.",
          "Bu ürün kaydı farmakokinetik bir değer sağlamaz; ADME alanları kaynak bulunana kadar boştur.",
        ]
      : [
          "Oral, intravenous, and topical profiles are never copied into one another.",
          "This product record does not provide a pharmacokinetic value; ADME fields remain empty until a source is available.",
        ],
  };
}

export function createRouteScopedAdmeProfiles(
  record: MoleculeRecord,
  resolveSource: AdmeSourceResolver,
  locale: "tr" | "en",
): readonly AdmeProfile[] {
  return record.regulatoryProducts
    .map((product) => createRouteScopedAdmeProfile(record, product, resolveSource, locale))
    .filter((profile): profile is AdmeProfile => profile !== null);
}

export function selectAdmeProfile(
  profiles: readonly AdmeProfile[],
  profileId: string | null | undefined,
): AdmeProfile | null {
  if (profiles.length === 0) return null;
  if (!profileId) return profiles[0] ?? null;
  return profiles.find((profile) => profile.id === profileId) ?? null;
}
