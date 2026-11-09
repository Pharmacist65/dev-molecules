import { academyExercises } from "@/lib/data/nomenclature-academy-curriculum";
import type { NomenclatureProgressSnapshot } from "@/lib/domain";
import type { Locale } from "@/lib/i18n";

export type LearningJourneyStageId =
  | "structure-language"
  | "organic-nomenclature"
  | "pharmaceutical-nomenclature"
  | "reaction-mechanisms"
  | "synthesis-atlas"
  | "drug-molecule-review";

export type LearningJourneyDestination = "nomenclature" | "synthesis";
export type LearningJourneyAvailability = "available" | "planned";

export interface LearningJourneyText {
  readonly tr: string;
  readonly en: string;
}

interface AcademyProgressSource {
  readonly kind: "academy";
  readonly sectionIds: readonly string[];
}

interface MissionProgressSource {
  readonly kind: "missions";
  readonly missionIds: readonly string[];
}

interface PlannedProgressSource {
  readonly kind: "planned";
}

type LearningJourneyProgressSource =
  | AcademyProgressSource
  | MissionProgressSource
  | PlannedProgressSource;

export interface LearningJourneyStageDefinition {
  readonly id: LearningJourneyStageId;
  readonly order: number;
  readonly title: LearningJourneyText;
  readonly purpose: LearningJourneyText;
  readonly recommendedLesson: LearningJourneyText;
  readonly relatedMolecules: readonly string[];
  readonly destination: LearningJourneyDestination;
  readonly availability: LearningJourneyAvailability;
  readonly progressSource: LearningJourneyProgressSource;
}

export interface LearningJourneyStageView
  extends Omit<LearningJourneyStageDefinition, "title" | "purpose" | "recommendedLesson" | "progressSource"> {
  readonly title: string;
  readonly purpose: string;
  readonly recommendedLesson: string;
  readonly completionPercent: number;
  readonly completedUnits: number;
  readonly totalUnits: number;
}

export interface LearningJourneyProgressInput {
  readonly nomenclatureProgress: NomenclatureProgressSnapshot | null;
  readonly completedMissionIds: ReadonlySet<string>;
}

const text = (tr: string, en: string): LearningJourneyText => ({ tr, en });

export const learningJourneyStageDefinitions = [
  {
    id: "structure-language",
    order: 1,
    title: text("Yapı Dili", "Structure Language"),
    purpose: text(
      "Atomları, bağları, değerliği ve örtük hidrojenleri gerçek 2B yapılar üzerinde okumayı öğren.",
      "Learn to read atoms, bonds, valence, and implicit hydrogens on real 2D structures.",
    ),
    recommendedLesson: text(
      "Propen yapısında tek ve çift bağı ayırt et.",
      "Distinguish the single and double bonds in propene.",
    ),
    relatedMolecules: ["Propranolol", "Aspirin"],
    destination: "nomenclature",
    availability: "available",
    progressSource: {
      kind: "academy",
      sectionIds: ["academy-section:structure-language"],
    },
  },
  {
    id: "organic-nomenclature",
    order: 2,
    title: text("Organik Adlandırma", "Organic Nomenclature"),
    purpose: text(
      "Ana yapıyı, numaralandırmayı, fonksiyonel grup önceliğini ve stereokimyayı adım adım kur.",
      "Build parent selection, numbering, functional-group priority, and stereochemistry step by step.",
    ),
    recommendedLesson: text(
      "2-metilpentanda ana zinciri ve en düşük lokant yönünü seç.",
      "Choose the parent chain and lowest-locant direction in 2-methylpentane.",
    ),
    relatedMolecules: ["Ibuprofen", "Naproxen"],
    destination: "nomenclature",
    availability: "available",
    progressSource: {
      kind: "academy",
      sectionIds: [
        "academy-section:parents-numbering",
        "academy-section:functional-groups",
        "academy-section:complete-names",
        "academy-section:aromatic-heterocycles",
        "academy-section:stereochemistry",
      ],
    },
  },
  {
    id: "pharmaceutical-nomenclature",
    order: 3,
    title: text("Farmasötik Adlandırma", "Pharmaceutical Nomenclature"),
    purpose: text(
      "Etkin kısmı tuz, form, sistematik ad, jenerik ad ve ürün adı katmanlarından ayır.",
      "Separate the active moiety from salt, form, systematic, generic, and product-name layers.",
    ),
    recommendedLesson: text(
      "Propranolol ana molekülü ile hidroklorür formunu karşılaştır.",
      "Compare the propranolol parent molecule with its hydrochloride form.",
    ),
    relatedMolecules: ["Propranolol", "Metoprolol"],
    destination: "nomenclature",
    availability: "available",
    progressSource: {
      kind: "academy",
      sectionIds: [
        "academy-section:pharmaceutical-forms",
        "academy-section:biological-natural",
      ],
    },
  },
  {
    id: "reaction-mechanisms",
    order: 4,
    title: text("Reaksiyon Mekanizmaları", "Reaction Mechanisms"),
    purpose: text(
      "Nükleofil, elektrofil, bağ değişimi ve elektron akışını kaynak sınırları içinde izle.",
      "Follow nucleophiles, electrophiles, bond changes, and electron flow within source boundaries.",
    ),
    recommendedLesson: text(
      "Sentez Atlası'nda kaynak destekli epoksit açılmasını incele.",
      "Inspect a source-supported epoxide opening in Synthesis Atlas.",
    ),
    relatedMolecules: ["Propranolol", "Carvedilol"],
    destination: "synthesis",
    availability: "planned",
    progressSource: { kind: "planned" },
  },
  {
    id: "synthesis-atlas",
    order: 5,
    title: text("Sentez Atlası", "Synthesis Atlas"),
    purpose: text(
      "Kaynak destekli rotaları ileri ve retrosentetik yönde dönüşüm dönüşüm oku.",
      "Read source-supported routes transformation by transformation in forward and retrosynthetic directions.",
    ),
    recommendedLesson: text(
      "Carvedilolün bildirilen altı dönüşümlü rotasını aç.",
      "Open Carvedilol's reported six-transformation route.",
    ),
    relatedMolecules: ["Propranolol", "Atenolol", "Carvedilol"],
    destination: "synthesis",
    availability: "available",
    progressSource: {
      kind: "missions",
      missionIds: ["mission:propranolol-route-order"],
    },
  },
  {
    id: "drug-molecule-review",
    order: 6,
    title: text("İlaç Molekülü İnceleme Projesi", "Drug Molecule Review Project"),
    purpose: text(
      "Yapı, form, öğretim sınıfı ve kanıt sınırlarını tek bir öğrenci incelemesinde birleştir.",
      "Combine structure, form, teaching classification, and evidence boundaries in one student review.",
    ),
    recommendedLesson: text(
      "Bir molekülü bul, formunu ayır ve aşırı kesin kanıt iddialarını düzelt.",
      "Find a molecule, separate its form, and correct overconfident evidence claims.",
    ),
    relatedMolecules: ["Propranolol", "Carvedilol", "Timolol"],
    destination: "synthesis",
    availability: "available",
    progressSource: {
      kind: "missions",
      missionIds: [
        "mission:find-propranolol",
        "mission:beta-profile-classification",
        "mission:active-moiety-versus-form",
        "mission:evidence-boundaries",
      ],
    },
  },
] as const satisfies readonly LearningJourneyStageDefinition[];

function percentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(completed, total) / total) * 100);
}

function resolveProgress(
  definition: LearningJourneyStageDefinition,
  input: LearningJourneyProgressInput,
): Pick<LearningJourneyStageView, "completionPercent" | "completedUnits" | "totalUnits"> {
  const source = definition.progressSource;

  if (source.kind === "planned") {
    return { completionPercent: 0, completedUnits: 0, totalUnits: 0 };
  }

  if (source.kind === "missions") {
    const completedUnits = source.missionIds.filter((id) =>
      input.completedMissionIds.has(id),
    ).length;
    return {
      completionPercent: percentage(completedUnits, source.missionIds.length),
      completedUnits,
      totalUnits: source.missionIds.length,
    };
  }

  const relevantExerciseIds = academyExercises
    .filter((exercise) => source.sectionIds.includes(exercise.sectionId))
    .map((exercise) => exercise.id);
  const completedIds = new Set(input.nomenclatureProgress?.completedExerciseIds ?? []);
  const completedUnits = relevantExerciseIds.filter((id) => completedIds.has(id)).length;
  return {
    completionPercent: percentage(completedUnits, relevantExerciseIds.length),
    completedUnits,
    totalUnits: relevantExerciseIds.length,
  };
}

export function createLearningJourneyStageViews(
  locale: Locale,
  input: LearningJourneyProgressInput,
): readonly LearningJourneyStageView[] {
  return learningJourneyStageDefinitions.map((definition) => {
    return {
      id: definition.id,
      order: definition.order,
      title: definition.title[locale],
      purpose: definition.purpose[locale],
      recommendedLesson: definition.recommendedLesson[locale],
      relatedMolecules: definition.relatedMolecules,
      destination: definition.destination,
      availability: definition.availability,
      ...resolveProgress(definition, input),
    };
  });
}

export function getRecommendedLearningJourneyStage(
  stages: readonly LearningJourneyStageView[],
): LearningJourneyStageView | null {
  return (
    stages.find(
      (stage) => stage.availability === "available" && stage.completionPercent < 100,
    ) ??
    stages.find((stage) => stage.availability === "planned") ??
    stages.at(-1) ??
    null
  );
}
