import type {
  DrugFamilyPageModel,
  FamilyComparisonFieldId,
  FamilyEvidenceField,
  FamilyRepresentativeDrug,
  LocalizedFamilyText,
} from "@/lib/domain/drug-family";
import type { SourceId } from "@/lib/domain/ids";
import type { MoleculeRecord } from "@/lib/domain/molecule";

import { betaBlockers } from "./beta-blockers";
import { nsaids } from "./nsaids";

export const DRUG_FAMILY_PAGE_IDS = [
  "beta-adrenergic-blockers",
  "nsaids",
] as const;

export type DrugFamilyPageId = (typeof DRUG_FAMILY_PAGE_IDS)[number];

const missing = <Value>(
  tr: string,
  en: string,
): FamilyEvidenceField<Value> => ({
  availability: "missing",
  reason: { tr, en },
});

const comparisonMissing = (): Readonly<
  Record<FamilyComparisonFieldId, FamilyEvidenceField<LocalizedFamilyText>>
> => ({
  selectivity: missing(
    "Bu kayıt için kaynaklı seçicilik karşılaştırması henüz incelenmedi.",
    "No source-backed selectivity comparison has been reviewed for this record.",
  ),
  "action-type": missing(
    "Bu kayıt için kaynaklı etki türü karşılaştırması henüz incelenmedi.",
    "No source-backed action-type comparison has been reviewed for this record.",
  ),
  "primary-targets": missing(
    "Bu kayıt için kaynaklı birincil hedef karşılaştırması henüz incelenmedi.",
    "No source-backed primary-target comparison has been reviewed for this record.",
  ),
  lipophilicity: missing(
    "Bu kayıt için kaynaklı lipofilisite karşılaştırması henüz incelenmedi.",
    "No source-backed lipophilicity comparison has been reviewed for this record.",
  ),
  "main-metabolic-pathway": missing(
    "Bu kayıt için kaynaklı ana metabolik yol karşılaştırması henüz incelenmedi.",
    "No source-backed main-metabolic-pathway comparison has been reviewed for this record.",
  ),
  "active-metabolites": missing(
    "Bu kayıt için kaynaklı aktif metabolit karşılaştırması henüz incelenmedi.",
    "No source-backed active-metabolite comparison has been reviewed for this record.",
  ),
  "half-life-range": missing(
    "Bu kayıt için kaynaklı yarı ömür karşılaştırması henüz incelenmedi.",
    "No source-backed half-life comparison has been reviewed for this record.",
  ),
  "common-route": missing(
    "Bu kayıt için kaynaklı uygulama yolu karşılaştırması henüz incelenmedi.",
    "No source-backed administration-route comparison has been reviewed for this record.",
  ),
  "structural-motif": missing(
    "Bu kayıt için incelenmiş bir ortak motif karşılaştırması henüz bulunmuyor.",
    "No reviewed shared-motif comparison is available for this record.",
  ),
});

const normalizeBasePath = (assetBasePath: string): string => {
  const trimmed = assetBasePath.trim() || "/";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

const resolveAssetPath = (assetBasePath: string, publicPath: string): string =>
  `${normalizeBasePath(assetBasePath)}${publicPath.replace(/^\/+/, "")}`;

function verifiedCandidateRecord(
  record: MoleculeRecord,
  assetBasePath: string,
): FamilyRepresentativeDrug {
  const { identity, structures } = record;
  const expectedSourceId: SourceId = `source:pubchem-${identity.pubChemCid}`;
  const identityIsEligible =
    identity.verification.status === "verified" &&
    identity.sourceIds.includes(expectedSourceId);
  const twoDIsEligible =
    structures.twoDimensional.pubChemCid === identity.pubChemCid &&
    structures.twoDimensional.sourceId === expectedSourceId &&
    structures.twoDimensional.verification.status === "verified";

  if (!identityIsEligible || !twoDIsEligible) {
    throw new Error(
      `Candidate record ${record.id} lacks an exact verified PubChem identity/2D pair.`,
    );
  }

  return {
    id: record.id,
    slug: record.id.replace(/^molecule:/, ""),
    name: identity.preferredName,
    formula: identity.molecularFormula,
    pubChemCid: identity.pubChemCid,
    canonicalSmiles: identity.canonicalSmiles,
    twoDStructureUrl: resolveAssetPath(
      assetBasePath,
      structures.twoDimensional.publicPath,
    ),
    // Current seed classifications are pending educational drafts. Keeping
    // memberships empty prevents them from appearing as reviewed membership facts.
    memberships: [],
    comparison: comparisonMissing(),
  };
}

function selectCandidateRecords(
  records: readonly MoleculeRecord[],
  moleculeIds: readonly string[],
  assetBasePath: string,
): readonly FamilyRepresentativeDrug[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return moleculeIds.map((moleculeId) => {
    const record = byId.get(moleculeId as MoleculeRecord["id"]);
    if (!record) {
      throw new Error(`Missing candidate record identity: ${moleculeId}.`);
    }
    return verifiedCandidateRecord(record, assetBasePath);
  });
}

interface FamilyDefinition {
  readonly id: DrugFamilyPageId;
  readonly name: LocalizedFamilyText;
  readonly records: readonly MoleculeRecord[];
  readonly candidateRecordIds: readonly string[];
}

const FAMILY_DEFINITIONS: readonly FamilyDefinition[] = [
  {
    id: "beta-adrenergic-blockers",
    name: {
      tr: "Beta-adrenerjik bloker sorgusu · aday kayıt inceleme seti",
      en: "Beta-adrenergic blocker query · candidate-record review set",
    },
    records: betaBlockers,
    candidateRecordIds: [
      "molecule:propranolol",
      "molecule:metoprolol",
      "molecule:atenolol",
      "molecule:carvedilol",
    ],
  },
  {
    id: "nsaids",
    name: {
      tr: "NSAİİ sorgusu · aday kayıt inceleme seti",
      en: "NSAID query · candidate-record review set",
    },
    records: nsaids,
    candidateRecordIds: [
      "molecule:aspirin",
      "molecule:ibuprofen",
      "molecule:naproxen",
      "molecule:celecoxib",
    ],
  },
] as const;

/**
 * Builds the two deliberately bounded candidate-record review sets linked
 * from Home. Only exact verified PubChem identity/structure records are
 * available. Query selection never crosses this boundary as membership.
 */
export function createDrugFamilyPage(
  familyId: string,
  assetBasePath = "/",
): DrugFamilyPageModel | null {
  const definition = FAMILY_DEFINITIONS.find(({ id }) => id === familyId);
  if (!definition) return null;

  return {
    id: `family:${definition.id}`,
    slug: definition.id,
    name: definition.name,
    // An empty kind list is deliberate: the route is a query-backed candidate
    // review set, not a verified therapeutic or pharmacological membership.
    kinds: [],
    overview: missing(
      "Bu aday kayıt inceleme seti yalnız doğrulanmış PubChem kimliklerini ve 2B yapıları gösterir. Sorgu etiketi üyelik kurmaz; sınıflandırma üyeliği henüz doğrulanmamıştır.",
      "This candidate-record review set shows only verified PubChem identities and 2D structures. The query label does not establish membership; classification membership has not been verified.",
    ),
    classifications: [],
    sharedMechanism: missing(
      "Ortak mekanizma iddiası için uygun farmakoloji kaynağı henüz incelenmedi.",
      "No eligible pharmacology source has yet been reviewed for a shared-mechanism claim.",
    ),
    primaryTargetFamilies: missing(
      "Ortak hedef iddiası için uygun hedef kaynağı henüz incelenmedi.",
      "No eligible target source has yet been reviewed for a shared-target claim.",
    ),
    sharedStructuralMotifs: missing(
      "Ortak motif iddiası için tıbbi kimya incelemesi henüz tamamlanmadı. Aşağıdaki fingerprint yalnız hesaplanmış ve incelenmemiştir.",
      "Medicinal-chemistry review for a shared-motif claim is not yet complete. The fingerprint below is computed and unreviewed only.",
    ),
    representatives: selectCandidateRecords(
      definition.records,
      definition.candidateRecordIds,
      assetBasePath,
    ),
    learningPath: [
      {
        id: `learning:${definition.id}:structure-language`,
        label: {
          tr: "Yapı dilinin temellerini aç",
          en: "Open structure-language foundations",
        },
        href: "#academy/nomenclature/structure-language",
      },
    ],
  };
}
