import type {
  EvidenceConditions,
  EvidenceField,
} from "@/lib/domain/dossier";

export type EvidencePresentationLocale = "tr" | "en";

const turkishConditionValues: Readonly<Record<string, string>> = {
  "healthy subjects": "Sağlıklı gönüllüler",
  "healthy adults, age 19–52": "Sağlıklı yetişkinler, 19–52 yaş",
  fasted: "Açlık",
  "high-fat meal comparison": "Yüksek yağlı öğün karşılaştırması",
  "food-effect comparison": "Besin etkisi karşılaştırması",
  "single-dose pharmacokinetic study": "Tek doz farmakokinetik çalışma",
  "single-dose radiolabel mass-balance study": "Tek doz radyoişaretli kütle-denge çalışması",
  "single-dose mass-balance study": "Tek doz kütle-denge çalışması",
  "oral versus intravenous absolute-bioavailability comparison": "Oral–intravenöz mutlak biyoyararlanım karşılaştırması",
};

export function presentEvidenceConditionValue(
  value: string | number,
  locale: EvidencePresentationLocale,
): string | number {
  if (locale === "en" || typeof value === "number") return value;
  return turkishConditionValues[value.trim().toLowerCase()] ?? value;
}

export function presentEvidenceValue(
  field: EvidenceField<string | number>,
  locale: EvidencePresentationLocale,
): string {
  const formatted = `${field.value}${field.unit ? ` ${field.unit}` : ""}`;
  if (field.valueQualifier === "approximately") {
    return locale === "tr" ? `yaklaşık ${formatted}` : `approximately ${formatted}`;
  }
  if (field.valueQualifier === "less-than") return `< ${formatted}`;
  return formatted;
}

export function presentEvidenceCoefficientOfVariation(
  conditions: EvidenceConditions,
): string | null {
  return conditions.coefficientOfVariationPercent === undefined
    ? null
    : `${conditions.coefficientOfVariationPercent}%`;
}
