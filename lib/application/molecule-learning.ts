import {
  isReviewedVerification,
  type VerificationStatus,
} from "../domain/evidence";
import { getPrimaryClassification, type MoleculeRecord } from "../domain/molecule";
import type { Locale } from "../i18n/locale";
import { pubChemSystematicNameByCid } from "../data/pubchem-systematic-names";

export interface StudentMoleculeProfile {
  readonly systematicName?: string;
  readonly functionalGroups: readonly string[];
  readonly functionalGroupsStatus: "computed-unreviewed";
  readonly scaffoldFamily: string;
  readonly scaffoldDetail: string;
  readonly drugClass: string;
  readonly mechanismSummary: string;
  readonly synthesisScope: string;
  readonly nomenclatureLesson: string;
}

interface FunctionalGroupRule {
  readonly key: string;
  readonly detect: (smiles: string) => boolean;
  readonly label: Readonly<Record<Locale, string>>;
}

const FUNCTIONAL_GROUP_RULES: readonly FunctionalGroupRule[] = [
  { key: "carboxylic-acid", detect: (value) => /C\(=O\)O(?:$|[^C])/.test(value), label: { tr: "Karboksilik asit", en: "Carboxylic acid" } },
  { key: "sulfonamide", detect: (value) => /S\(=O\)\(=O\)N/.test(value), label: { tr: "Sülfonamid", en: "Sulfonamide" } },
  { key: "amide", detect: (value) => /C\(=O\)N/.test(value), label: { tr: "Amid", en: "Amide" } },
  { key: "ester", detect: (value) => /C\(=O\)O[C(]/.test(value) || /OC\(=O\)/.test(value), label: { tr: "Ester", en: "Ester" } },
  { key: "ketone", detect: (value) => /(?:^|[^ON])C\(=O\)C/.test(value), label: { tr: "Keton", en: "Ketone" } },
  { key: "nitrile", detect: (value) => /C#N/.test(value), label: { tr: "Nitril", en: "Nitrile" } },
  {
    key: "amine",
    // Conservative string hint only. Any amide/sulfonamide context suppresses
    // the amine hint rather than double-labelling its nitrogen as an amine.
    detect: (value) =>
      /N/.test(value) &&
      !/C\(=O\)N|NC\(=O\)|S\(=O\)\(=O\)N|NS\(=O\)\(=O\)/.test(value),
    label: { tr: "Amin", en: "Amine" },
  },
  { key: "alcohol", detect: (value) => /(?:^|[C)])O(?:$|[C(])/.test(value) && !/C\(=O\)O/.test(value), label: { tr: "Alkol", en: "Alcohol" } },
  { key: "ether", detect: (value) => /COC|OC[1-9]|[1-9]OC/.test(value), label: { tr: "Eter", en: "Ether" } },
  { key: "halogen", detect: (value) => /Cl|Br|F|I/.test(value), label: { tr: "Halojenli motif", en: "Halogenated motif" } },
  { key: "heteroaromatic", detect: (value) => /[cnops][1-9]/.test(value) || /[1-9].*[NSO].*[1-9]/.test(value), label: { tr: "Heteroaromatik halka", en: "Heteroaromatic ring" } },
  { key: "aromatic", detect: (value) => /c|C1=CC|C2=CC/.test(value), label: { tr: "Aromatik halka", en: "Aromatic ring" } },
];

export function identifyFunctionalGroups(canonicalSmiles: string, locale: Locale) {
  return FUNCTIONAL_GROUP_RULES
    .filter((rule) => rule.detect(canonicalSmiles))
    .map((rule) => rule.label[locale]);
}

export type CuratedScaffoldFamilyKey =
  | "aryloxypropanolamines"
  | "amino-alcohols"
  | "aromatic-carboxylic-acids"
  | "heteroaromatic-sulfonamides"
  | "other-structural-families";

const CURATED_SCAFFOLD_FAMILY_LABELS: Readonly<
  Record<CuratedScaffoldFamilyKey, Readonly<Record<Locale, string>>>
> = {
  "aryloxypropanolamines": {
    tr: "Ariloksipropanolaminler",
    en: "Aryloxypropanolamines",
  },
  "amino-alcohols": { tr: "Amino alkoller", en: "Amino alcohols" },
  "aromatic-carboxylic-acids": {
    tr: "Aromatik karboksilik asitler",
    en: "Aromatic carboxylic acids",
  },
  "heteroaromatic-sulfonamides": {
    tr: "Heteroaromatik sülfonamidler",
    en: "Heteroaromatic sulfonamides",
  },
  "other-structural-families": {
    tr: "Diğer yapısal aileler",
    en: "Other structural families",
  },
};

export function getCuratedScaffoldFamilyKey(
  scaffoldLabel: string,
): CuratedScaffoldFamilyKey {
  const normalized = scaffoldLabel.toLowerCase();
  if (normalized.includes("aryloxypropanolamine") || normalized.includes("oxypropanolamine")) {
    return "aryloxypropanolamines";
  }
  if (normalized.includes("amino alcohol") || normalized.includes("amino diol")) {
    return "amino-alcohols";
  }
  if (
    normalized.includes("acid") ||
    normalized.includes("salicylate") ||
    normalized.includes("acetate")
  ) {
    return "aromatic-carboxylic-acids";
  }
  if (normalized.includes("pyrazole") || normalized.includes("sulfonamide")) {
    return "heteroaromatic-sulfonamides";
  }
  return "other-structural-families";
}

export function getCuratedScaffoldFamily(scaffoldLabel: string, locale: Locale) {
  return CURATED_SCAFFOLD_FAMILY_LABELS[getCuratedScaffoldFamilyKey(scaffoldLabel)][locale];
}

/**
 * Student-facing classifications fail closed. Draft labels stay available to
 * Reviewer presentation through the catalog evidence view, but are never
 * repeated here until their verification state is reviewed.
 */
export function presentLearningClassification(
  label: string | undefined,
  status: VerificationStatus | undefined,
  locale: Locale,
) {
  if (label && status && isReviewedVerification(status)) return label;
  return locale === "tr"
    ? "Sınıflandırma incelemesi sürüyor"
    : "Classification review in progress";
}

export function createStudentMoleculeProfile(
  record: MoleculeRecord,
  locale: Locale,
): StudentMoleculeProfile {
  const structural = getPrimaryClassification(record, "structural-family");
  const pharmacologic = getPrimaryClassification(record, "pharmacologic-class");
  const target = getPrimaryClassification(record, "target-profile");
  const scaffoldDetail = presentLearningClassification(
    structural?.label,
    structural?.verification.status,
    locale,
  );
  const scaffoldFamily = presentLearningClassification(
    structural ? getCuratedScaffoldFamily(structural.label, locale) : undefined,
    structural?.verification.status,
    locale,
  );
  const functionalGroups = identifyFunctionalGroups(record.identity.canonicalSmiles, locale);
  const routeAvailable = [
    "molecule:propranolol",
    "molecule:atenolol",
    "molecule:carvedilol",
  ].includes(record.id);

  return {
    systematicName: pubChemSystematicNameByCid[record.identity.pubChemCid],
    functionalGroups,
    functionalGroupsStatus: "computed-unreviewed",
    scaffoldFamily,
    scaffoldDetail,
    drugClass: presentLearningClassification(
      pharmacologic?.label,
      pharmacologic?.verification.status,
      locale,
    ),
    mechanismSummary: target && isReviewedVerification(target.verification.status)
      ? locale === "tr"
        ? `${target.label} bağlamında gözden geçirilmiş öğrenme özeti.`
        : `Reviewed learning summary in the ${target.label} context.`
      : locale === "tr"
        ? "Etki mekanizması incelemesi sürüyor; öğrenci görünümünde taslak hedef özeti gösterilmez."
        : "Mechanism review is in progress; no draft target summary is shown in Student view.",
    synthesisScope: routeAvailable
      ? locale === "tr"
        ? "Sentez Atlası'nda kaynak bağlantılı eğitim rotası var."
        : "A source-linked educational route is available in Synthesis Atlas."
      : locale === "tr"
        ? "Bu molekül için kürate edilmiş rota henüz yok."
        : "No curated route is available for this molecule yet.",
    nomenclatureLesson:
      functionalGroups.length > 0
        ? locale === "tr"
          ? `Hesaplanmış, incelenmemiş motif ipucu: ${functionalGroups.slice(0, 3).join(", ")}.`
          : `Computed, unreviewed motif hint: ${functionalGroups.slice(0, 3).join(", ")}.`
        : locale === "tr"
          ? "Yapı dili dersi hazırlanıyor."
          : "The structure-language lesson is being prepared.",
  };
}
