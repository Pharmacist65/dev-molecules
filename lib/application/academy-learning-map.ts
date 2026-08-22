import {
  createLearningJourneyStageViews,
  type LearningJourneyProgressInput,
  type LearningJourneyStageId,
} from "@/lib/application/learning-journey-map";
import type {
  AcademyLocale,
  AcademyLocalizedText,
  AcademyModuleDefinition,
  AcademyModuleId,
  AcademyModuleView,
} from "@/lib/domain/academy";

const text = (tr: string, en: string): AcademyLocalizedText => ({ tr, en });

export const academyModuleDefinitions = [
  {
    id: "structure-language",
    order: 1,
    title: text("Yapının Dili", "Structure Language"),
    purpose: text(
      "Atomları, bağları, değerliği ve örtük hidrojenleri gerçek 2B yapılar üzerinde okumayı öğren.",
      "Learn to read atoms, bonds, valence, and implicit hydrogens on real 2D structures.",
    ),
    estimatedMinutes: 35,
    recommendedLesson: text(
      "Propen üzerinde tek ve çift bağları ayırt et.",
      "Distinguish single and double bonds on propene.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:propranolol", label: "Propranolol" },
      { moleculeId: "molecule:aspirin", label: "Aspirin" },
    ],
    destination: "nomenclature",
    availability: "available",
    coverageNote: text(
      "Çalışan yapı seçimi, bağ tanıma ve değerlik etkileşimleri.",
      "Working structure selection, bond-recognition, and valence interactions.",
    ),
  },
  {
    id: "organic-nomenclature",
    order: 2,
    title: text("Organik Nomenklatür", "Organic Nomenclature"),
    purpose: text(
      "Ana yapı, numaralandırma, fonksiyonel grup önceliği ve stereokimyayı adım adım kur.",
      "Build parent selection, numbering, functional-group priority, and stereochemistry step by step.",
    ),
    estimatedMinutes: 150,
    recommendedLesson: text(
      "2-metilpentanda ana zinciri ve en düşük lokant yönünü seç.",
      "Choose the parent chain and lowest-locant direction in 2-methylpentane.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:ibuprofen", label: "Ibuprofen" },
      { moleculeId: "molecule:naproxen", label: "Naproxen" },
    ],
    destination: "nomenclature",
    availability: "available",
    coverageNote: text(
      "Mevcut Akademi alıştırmaları gerçek 2B yapı seçimleri ve kural geri bildirimi kullanır.",
      "Current Academy exercises use real 2D structure selections and rule feedback.",
    ),
  },
  {
    id: "pharmaceutical-nomenclature",
    order: 3,
    title: text("Farmasötik Nomenklatür", "Pharmaceutical Nomenclature"),
    purpose: text(
      "Ana etkin molekülü tuz, form, sistematik ad, jenerik ad ve ürün adı katmanlarından ayır.",
      "Separate the active parent from salt, form, systematic, generic, and product-name layers.",
    ),
    estimatedMinutes: 70,
    recommendedLesson: text(
      "Propranolol ana molekülü ile hidroklorür formunu karşılaştır.",
      "Compare the propranolol parent molecule with its hydrochloride form.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:propranolol", label: "Propranolol" },
      { moleculeId: "molecule:metoprolol", label: "Metoprolol" },
    ],
    destination: "nomenclature",
    availability: "available",
    coverageNote: text(
      "Form ve ad katmanları çalışır; ilaç-özel çözümleme yalnız kürate edilmiş örneklerde gösterilir.",
      "Form and name layers work; drug-specific decomposition appears only for curated examples.",
    ),
  },
  {
    id: "pharmacology",
    order: 4,
    title: text("Farmakoloji", "Pharmacology"),
    purpose: text(
      "Hedef, etki türü, ölçüm ve deney bağlamını birbirinden ayırarak bir farmakoloji kaydını oku.",
      "Read a pharmacology record by separating target, action type, measurement, and assay context.",
    ),
    estimatedMinutes: 45,
    recommendedLesson: text(
      "Seçili ilacın kaynak kapısından geçen hedef kayıtlarını ve açık boşluklarını incele.",
      "Inspect the selected drug's source-gated target records and declared gaps.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:propranolol", label: "Propranolol" },
      { moleculeId: "molecule:carvedilol", label: "Carvedilol" },
    ],
    destination: "pharmacology",
    availability: "coverage-dependent",
    coverageNote: text(
      "Ders kabuğu çalışır; yalnız kaynağı, ölçüm koşulu ve inceleme durumu çözümlenmiş kayıtları açar.",
      "The lesson shell works; it opens only records with resolved sources, measurement conditions, and review status.",
    ),
  },
  {
    id: "adme",
    order: 5,
    title: text("ADME", "ADME"),
    purpose: text(
      "Emilim, dağılım, metabolizma ve atılım kanıtını uygulama yolu ve farmasötik forma göre oku.",
      "Read absorption, distribution, metabolism, and excretion evidence by route and pharmaceutical form.",
    ),
    estimatedMinutes: 45,
    recommendedLesson: text(
      "Doğrulanmış uygulama bağlamını gerçek ADME ölçümünden ayır.",
      "Separate verified administration context from an actual ADME measurement.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:propranolol", label: "Propranolol" },
      { moleculeId: "molecule:labetalol", label: "Labetalol" },
      { moleculeId: "molecule:timolol", label: "Timolol" },
    ],
    destination: "adme",
    availability: "coverage-dependent",
    coverageNote: text(
      "Yol/form bağlamı gösterilebilir; sayısal ADME alanları doğrudan kaynak ve koşul olmadan kapalı kalır.",
      "Route/form context may be shown; quantitative ADME fields stay closed without direct sources and conditions.",
    ),
  },
  {
    id: "reaction-mechanisms",
    order: 6,
    title: text("Reaksiyon Mekanizmaları", "Reaction Mechanisms"),
    purpose: text(
      "Nükleofil, elektrofil, bağ değişimi ve elektron akışını kaynak sınırı tanımlı dönüşümlerde izle.",
      "Follow nucleophiles, electrophiles, bond changes, and electron flow in source-bounded transformations.",
    ),
    estimatedMinutes: 55,
    recommendedLesson: text(
      "Sentez Atlası'ndaki kürate edilmiş bir dönüşümü basamak düzeyinde incele.",
      "Inspect a curated transformation at step level in Synthesis Atlas.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:propranolol", label: "Propranolol" },
      { moleculeId: "molecule:carvedilol", label: "Carvedilol" },
    ],
    destination: "synthesis",
    availability: "planned",
    coverageNote: text(
      "Bağımsız mekanizma müfredatı planlandı; en yakın çalışan içerik Sentez Atlası'ndaki kürate edilmiş basamaklardır.",
      "The standalone mechanism curriculum is planned; the nearest working content is the curated step layer in Synthesis Atlas.",
    ),
  },
  {
    id: "synthesis-atlas",
    order: 7,
    title: text("Sentez Atlası", "Synthesis Atlas"),
    purpose: text(
      "Kaynak destekli rotaları ileri ve retrosentetik yönde dönüşüm dönüşüm okuyup kanıt sınırını koru.",
      "Read source-supported routes transformation by transformation, forward and retrosynthetically, while preserving evidence boundaries.",
    ),
    estimatedMinutes: 70,
    recommendedLesson: text(
      "Propranolol rotasını başlangıç maddesinden son etkin moleküle kadar izle.",
      "Follow the propranolol route from starting material to the final active molecule.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:propranolol", label: "Propranolol" },
      { moleculeId: "molecule:atenolol", label: "Atenolol" },
      { moleculeId: "molecule:carvedilol", label: "Carvedilol" },
    ],
    destination: "synthesis",
    availability: "available",
    coverageNote: text(
      "Yalnız kürate edilmiş rotalar açıktır; kaynak boşluğu olan upstream adımlar uydurulmaz.",
      "Only curated routes are open; upstream steps with evidence gaps are not invented.",
    ),
  },
  {
    id: "drug-review-project",
    order: 8,
    title: text("İlaç İnceleme Projesi", "Drug Review Project"),
    purpose: text(
      "Kimlik, yapı, form, sınıflandırma ve kanıt sınırlarını tek bir savunulabilir öğrenci incelemesinde birleştir.",
      "Combine identity, structure, form, classification, and evidence boundaries in one defensible student review.",
    ),
    estimatedMinutes: 60,
    recommendedLesson: text(
      "Bir ilacın kaynaklı alanlarını ve bilinmeyenlerini ayrı başlıklarla savun.",
      "Defend a drug's sourced fields and unknowns under separate headings.",
    ),
    relatedDrugs: [
      { moleculeId: "molecule:propranolol", label: "Propranolol" },
      { moleculeId: "molecule:celecoxib", label: "Celecoxib" },
      { moleculeId: "molecule:timolol", label: "Timolol" },
    ],
    destination: "review",
    availability: "available",
    coverageNote: text(
      "Çalışan görevler kaynak ve aşırı kesinlik hatalarını ayırır; bilimsel boşluklar tamamlanmış sayılmaz.",
      "Working missions distinguish sources from overconfidence; scientific gaps are never counted as complete.",
    ),
  },
] as const satisfies readonly AcademyModuleDefinition[];

const legacyStageByModule: Readonly<
  Partial<Record<AcademyModuleId, LearningJourneyStageId>>
> = {
  "structure-language": "structure-language",
  "organic-nomenclature": "organic-nomenclature",
  "pharmaceutical-nomenclature": "pharmaceutical-nomenclature",
  "reaction-mechanisms": "reaction-mechanisms",
  "synthesis-atlas": "synthesis-atlas",
  "drug-review-project": "drug-molecule-review",
};

export function createAcademyModuleViews(
  locale: AcademyLocale,
  progress: LearningJourneyProgressInput,
): readonly AcademyModuleView[] {
  const legacyStages = new Map(
    createLearningJourneyStageViews(locale, progress).map((stage) => [
      stage.id,
      stage,
    ]),
  );

  return academyModuleDefinitions.map((definition) => {
    const legacyStageId = legacyStageByModule[definition.id];
    const legacyStage = legacyStageId
      ? legacyStages.get(legacyStageId)
      : undefined;
    const tracksProgress = Boolean(legacyStage && legacyStage.totalUnits > 0);

    return {
      ...definition,
      title: definition.title[locale],
      purpose: definition.purpose[locale],
      recommendedLesson: definition.recommendedLesson[locale],
      coverageNote: definition.coverageNote[locale],
      completionPercent: tracksProgress
        ? legacyStage?.completionPercent ?? null
        : null,
      completedUnits: tracksProgress
        ? legacyStage?.completedUnits ?? null
        : null,
      totalUnits: tracksProgress ? legacyStage?.totalUnits ?? null : null,
    };
  });
}

export function getRecommendedAcademyModule(
  modules: readonly AcademyModuleView[],
): AcademyModuleView | null {
  return (
    modules.find(
      (module) =>
        module.availability === "available" &&
        module.completionPercent !== null &&
        module.completionPercent < 100,
    ) ??
    modules.find(
      (module) =>
        module.availability === "available" &&
        module.completionPercent === null,
    ) ??
    modules.find((module) => module.availability === "coverage-dependent") ??
    modules.at(-1) ??
    null
  );
}
