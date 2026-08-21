import { moleculeById } from "@/lib/data/catalog";
import { sourceById } from "@/lib/data/sources";
import { synthesisStories } from "@/lib/data/synthesis-stories";
import type { MoleculeId } from "@/lib/domain";

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
  readonly mode: "curated-fallback" | "openai-orchestrated";
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
): MentorEvidenceCard | null {
  const molecule = moleculeById.get(moleculeId as MoleculeId);
  if (!molecule) return null;

  const story = synthesisStories.find((item) => item.moleculeId === molecule.id);
  const sourceIds = Array.from(
    new Set([
      ...molecule.identity.sourceIds,
      ...(molecule.stereochemistry.verification.status.startsWith("source")
        ? molecule.identity.sourceIds
        : []),
      ...(story?.sourceIds ?? []),
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
    moleculeId: molecule.id,
    moleculeName: molecule.identity.preferredName,
    question,
    structuralStatus: "valid-record",
    identityStatus: "exact-curated-match",
    synthesisStatus: story ? "educational-story-only" : "not-assessed",
    biologicalStatus: "not-assessed",
    confidence: "source-supported",
    summary: story
      ? `${molecule.identity.preferredName} için doğrulanmış kimlik kaydı ve uzman incelemesi bekleyen, operasyonel ayrıntı içermeyen bir eğitim sentez hikâyesi mevcut.`
      : `${molecule.identity.preferredName} için doğrulanmış kimlik kaydı mevcut; sentez ve biyolojik kanıt bu kartta değerlendirilmedi.`,
    findings: [
      {
        label: "Kimlik",
        value: `PubChem CID ${molecule.identity.pubChemCid} · ${molecule.identity.inchiKey}`,
        status: "verified",
        sourceIds: molecule.identity.sourceIds,
      },
      {
        label: "Stereokimya",
        value: molecule.stereochemistry.summary,
        status:
          molecule.stereochemistry.verification.status === "verified"
            ? "verified"
            : molecule.stereochemistry.verification.status === "source-supported"
              ? "source-supported"
              : "pending",
        sourceIds: molecule.identity.sourceIds,
      },
      {
        label: "Sentez anlatısı",
        value: story?.summary ?? "Bu molekül için henüz kürate edilmiş anlatı yok.",
        status: story ? "pending" : "unknown",
        sourceIds: story?.sourceIds ?? [],
      },
      {
        label: "Biyolojik hüküm",
        value: "Bu veri dilimi klinik etkililik veya güvenlik hükmü üretmez.",
        status: "unknown",
        sourceIds: [],
      },
    ],
    sources,
    limitations: [
      "Kimlik kaydı; tuz, ürün, doz veya klinik kullanım kaydıyla aynı değildir.",
      "Eğitim sentez hikâyesi laboratuvar protokolü değildir ve uzman incelemesi bekler.",
      "Veritabanında bulunmaması yenilik, patentlenebilirlik veya sentezlenebilirlik kanıtı değildir.",
    ],
    notFoundIsNoveltyEvidence: false,
    notClinicalOrPatentAdvice: true,
  };
}
