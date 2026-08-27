import { moleculeById } from "@/lib/data/catalog";
import { sourceById } from "@/lib/data/sources";
import type { MoleculeId } from "@/lib/domain";
import type { Locale } from "@/lib/i18n";

export interface EvidenceCardFinding {
  readonly label: string;
  readonly value: string;
  readonly status: "verified" | "source-supported" | "pending" | "unknown";
  readonly sourceIds: readonly string[];
}

export interface EvidenceCardSource {
  readonly id: string;
  readonly provider: string;
  readonly title: string;
  readonly url: string | null;
  readonly status: string;
}

export interface MentorEvidenceCard {
  readonly cardId: string;
  readonly generatedAt: string;
  readonly mode: "curated-fallback";
  readonly locale: Locale;
  readonly moleculeId: string;
  readonly moleculeName: string;
  readonly question: string;
  readonly structuralStatus: "valid-record" | "not-assessed";
  readonly identityStatus: "exact-curated-match" | "not-found";
  readonly synthesisStatus: "educational-story-only" | "not-assessed";
  readonly biologicalStatus: "not-assessed";
  readonly confidence: "source-supported" | "unknown";
  readonly summary: string;
  readonly findings: readonly EvidenceCardFinding[];
  readonly sources: readonly EvidenceCardSource[];
  readonly limitations: readonly string[];
  readonly notFoundIsNoveltyEvidence: false;
  readonly notClinicalOrPatentAdvice: true;
}

export function createLocalEvidenceCard(
  moleculeId: string,
  question: string,
  locale: Locale = "tr",
): MentorEvidenceCard | null {
  const molecule = moleculeById.get(moleculeId as MoleculeId);
  if (!molecule) return null;

  const sourceIds = Array.from(
    new Set([
      ...molecule.identity.sourceIds,
      ...(molecule.stereochemistry.verification.status.startsWith("source")
        ? molecule.identity.sourceIds
        : []),
    ]),
  );

  const sources = sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source) => source !== undefined)
    .map((source) => ({
      id: source.id,
      provider: source.provider,
      title: source.title,
      url: source.url,
      status: source.verification.status,
    }));

  return {
    cardId: `evidence-card:${molecule.id}:${Date.now()}`,
    generatedAt: new Date().toISOString(),
    mode: "curated-fallback",
    locale,
    moleculeId: molecule.id,
    moleculeName: molecule.identity.preferredName,
    question,
    structuralStatus: "valid-record",
    identityStatus: "exact-curated-match",
    synthesisStatus: "not-assessed",
    biologicalStatus: "not-assessed",
    confidence: "source-supported",
    summary: locale === "tr"
      ? `${molecule.identity.preferredName} için doğrulanmış kimlik kaydı mevcut; sentez ve biyolojik kanıt bu kartta değerlendirilmedi.`
      : `${molecule.identity.preferredName} has a verified identity record; synthesis and biological evidence were not assessed in this card.`,
    findings: [
      {
        label: locale === "tr" ? "Kimlik" : "Identity",
        value: `PubChem CID ${molecule.identity.pubChemCid} · ${molecule.identity.inchiKey}`,
        status: "verified",
        sourceIds: molecule.identity.sourceIds,
      },
      {
        label: locale === "tr" ? "Stereokimya" : "Stereochemistry",
        value: locale === "tr"
          ? "Katalogdaki stereokimya açıklaması kimlik kaydından ayrı bir inceleme durumuyla izlenir."
          : "The catalog stereochemistry annotation is tracked with a review status separate from the identity record.",
        status:
          molecule.stereochemistry.verification.status === "verified"
            ? "verified"
            : molecule.stereochemistry.verification.status === "source-supported"
              ? "source-supported"
              : "pending",
        sourceIds: molecule.identity.sourceIds,
      },
      {
        label: locale === "tr" ? "Sentez anlatısı" : "Synthesis narrative",
        value: locale === "tr"
          ? "Bu kartta yayımlanabilir bir sentez rotası değerlendirilmedi."
          : "No publishable synthesis route was assessed in this card.",
        status: "unknown",
        sourceIds: [],
      },
      {
        label: locale === "tr" ? "Biyolojik hüküm" : "Biological conclusion",
        value: locale === "tr"
          ? "Bu veri dilimi klinik etkililik veya güvenlik hükmü üretmez."
          : "This data slice does not produce a clinical efficacy or safety conclusion.",
        status: "unknown",
        sourceIds: [],
      },
    ],
    sources,
    limitations: locale === "tr"
      ? [
          "Kimlik kaydı; tuz, ürün, doz veya klinik kullanım kaydıyla aynı değildir.",
          "İnceleme ve yeniden kullanım kapısını geçmeyen sentez ayrıntıları bu karta alınmaz.",
          "Veritabanında bulunmaması yenilik, patentlenebilirlik veya sentezlenebilirlik kanıtı değildir.",
        ]
      : [
          "An identity record is not the same as a salt, product, dose, or clinical-use record.",
          "Synthesis detail that has not passed review and reuse gates is excluded from this card.",
          "Absence from a database is not evidence of novelty, patentability, or synthesizability.",
        ],
    notFoundIsNoveltyEvidence: false,
    notClinicalOrPatentAdvice: true,
  };
}
