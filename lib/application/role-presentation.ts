import type {
  EvidenceLevel,
  VerificationStatus,
} from "../domain/evidence";
import type {
  ExpertPresentationDepth,
  LearnerPresentationDepth,
  LearnerPresentationMode,
  PresentationScientificTerm,
  RoleExperienceLocale,
  StudentPresentationDepth,
} from "../domain/role-experience";
import type { SynthesisAtlasSourceGate } from "../domain/synthesis-atlas";

export interface LearnerPresentationView {
  readonly mode: LearnerPresentationMode;
  readonly label: string;
  readonly description: string;
  readonly sourceDetailLabel: string;
  readonly measurementLabel: string;
  readonly comparisonLabel: string;
  readonly exportLabel: string;
  readonly contract: LearnerPresentationDepth;
}

const studentContract: StudentPresentationDepth = {
  mode: "student",
  narrative: "guided",
  sourceDetail: "icon-and-drawer",
  measurements: "selected-and-explained",
  assayContext: "on-demand",
  comparison: "guided",
  export: "unavailable",
  rawScientificEnums: false,
};

const expertContract: ExpertPresentationDepth = {
  mode: "expert",
  narrative: "reference-dense",
  sourceDetail: "citation-and-drawer",
  measurements: "value-unit-conditions",
  assayContext: "visible",
  comparison: "multi-record",
  export: "available-when-source-complete",
  rawScientificEnums: false,
};

const modeCopy: Readonly<
  Record<RoleExperienceLocale, Record<LearnerPresentationMode, Omit<LearnerPresentationView, "mode" | "contract">>>
> = {
  tr: {
    student: {
      label: "Öğrenci görünümü",
      description: "Kısa açıklamalar, rehberli görevler ve gerektiğinde açılan kaynak ayrıntıları.",
      sourceDetailLabel: "Kaynak simgesi ve ikincil kaynak çekmecesi",
      measurementLabel: "Seçilmiş ve açıklanmış ölçümler",
      comparisonLabel: "Rehberli karşılaştırma",
      exportLabel: "Dışa aktarma bu görünümde sunulmaz",
    },
    expert: {
      label: "Uzman görünümü",
      description: "Yoğun tablolar, birim ve koşullarıyla ölçümler, deney bağlamı, karşılaştırma ve uygun kayıtlarda dışa aktarma.",
      sourceDetailLabel: "Atıf ve ayrıntılı kaynak çekmecesi",
      measurementLabel: "Değer, birim ve ölçüm koşulları",
      comparisonLabel: "Çoklu kayıt karşılaştırması",
      exportLabel: "Kaynak kaydı tam olduğunda dışa aktarma",
    },
  },
  en: {
    student: {
      label: "Student view",
      description: "Short explanations, guided tasks, and source detail that opens when needed.",
      sourceDetailLabel: "Source icon and secondary source drawer",
      measurementLabel: "Selected, explained measurements",
      comparisonLabel: "Guided comparison",
      exportLabel: "Export is not offered in this view",
    },
    expert: {
      label: "Expert view",
      description: "Dense tables, measurements with units and conditions, assay context, comparison, and export for complete records.",
      sourceDetailLabel: "Citation and detailed source drawer",
      measurementLabel: "Value, unit, and measurement conditions",
      comparisonLabel: "Multi-record comparison",
      exportLabel: "Export when the source record is complete",
    },
  },
};

export const learnerPresentationContracts: Readonly<
  Record<LearnerPresentationMode, LearnerPresentationDepth>
> = {
  student: studentContract,
  expert: expertContract,
};

export function getLearnerPresentationView(
  mode: LearnerPresentationMode,
  locale: RoleExperienceLocale,
): LearnerPresentationView {
  return {
    mode,
    ...modeCopy[locale][mode],
    contract: learnerPresentationContracts[mode],
  };
}

const verificationLabels: Readonly<
  Record<RoleExperienceLocale, Record<VerificationStatus, string>>
> = {
  tr: {
    verified: "Doğrulandı",
    "expert-reviewed": "Uzman incelemesinden geçti",
    "source-supported": "Kaynakla destekleniyor",
    "pending-review": "İnceleme bekliyor",
    predicted: "Tahmin",
    conflicting: "Çelişkili",
    unknown: "Bilinmiyor",
  },
  en: {
    verified: "Verified",
    "expert-reviewed": "Expert reviewed",
    "source-supported": "Source supported",
    "pending-review": "Pending review",
    predicted: "Predicted",
    conflicting: "Conflicting",
    unknown: "Unknown",
  },
};

const evidenceLabels: Readonly<
  Record<RoleExperienceLocale, Record<EvidenceLevel, string>>
> = {
  tr: {
    "direct-experimental": "Doğrudan deneysel",
    regulatory: "Düzenleyici kaynak",
    "curated-database": "Kürate edilmiş veri tabanı",
    "literature-reported": "Literatürde bildirilmiş",
    "analog-supported": "Benzer bileşiklerle desteklenmiş",
    computed: "Hesaplanmış",
    "model-predicted": "Model tahmini",
    "educational-simplification": "Eğitsel sadeleştirme",
    "no-evidence": "Kanıt bulunmuyor",
  },
  en: {
    "direct-experimental": "Direct experimental",
    regulatory: "Regulatory source",
    "curated-database": "Curated database",
    "literature-reported": "Literature reported",
    "analog-supported": "Analog supported",
    computed: "Computed",
    "model-predicted": "Model predicted",
    "educational-simplification": "Educational simplification",
    "no-evidence": "No evidence",
  },
};

const synthesisGateLabels: Readonly<
  Record<RoleExperienceLocale, Record<SynthesisAtlasSourceGate, string>>
> = {
  tr: {
    "source-supported": "Kaynakla destekleniyor",
    "context-supported": "Kaynak bağlamıyla destekleniyor",
    "partial-with-declared-gap": "Açıklanmış kanıt boşluklarıyla kısmi",
    blocked: "Kaynak kapısı kapalı",
  },
  en: {
    "source-supported": "Source supported",
    "context-supported": "Source-context supported",
    "partial-with-declared-gap": "Partial with declared evidence gaps",
    blocked: "Blocked by source gate",
  },
};

const assessmentLabels = {
  tr: {
    "not-assessed": "Değerlendirilmedi",
    "computed-unreviewed": "Hesaplandı, henüz incelenmedi",
  },
  en: {
    "not-assessed": "Not assessed",
    "computed-unreviewed": "Computed, not yet reviewed",
  },
} as const;

/** Returns presentation copy only; raw enum values never become UI labels. */
export function localizeScientificTerm(
  term: PresentationScientificTerm,
  locale: RoleExperienceLocale,
): string {
  switch (term.kind) {
    case "verification":
      return verificationLabels[locale][term.value];
    case "evidence":
      return evidenceLabels[locale][term.value];
    case "synthesis-source-gate":
      return synthesisGateLabels[locale][term.value];
    case "assessment":
      return assessmentLabels[locale][term.value];
  }
}
