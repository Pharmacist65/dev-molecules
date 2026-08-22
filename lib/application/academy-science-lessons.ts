import { canPresentAdmeField } from "@/lib/application/adme";
import { createDrugDossierByIdOrSlug } from "@/lib/application/dossier";
import { sourceById } from "@/lib/data/sources";
import type {
  AcademyLocale,
  AcademyScienceEvidenceItem,
  AcademyScienceLesson,
  AcademyScienceModuleId,
  AcademyScienceSource,
} from "@/lib/domain/academy";
import { isReviewedStatus } from "@/lib/domain/dossier";
import type { DrugDossierRecord } from "@/lib/domain/dossier";
import type { SourceId } from "@/lib/domain/ids";

const localized = <T>(locale: AcademyLocale, tr: T, en: T): T =>
  locale === "tr" ? tr : en;

const sourceLinksFor = (
  dossier: DrugDossierRecord,
  sourceIds: readonly SourceId[],
): readonly AcademyScienceSource[] => {
  const allowedIds = new Set(sourceIds);
  return dossier.sources
    .filter(
      (source) =>
        allowedIds.has(source.id) &&
        source.url.startsWith("https://") &&
        (isReviewedStatus(source.reviewStatus) ||
          source.reviewStatus === "source-supported"),
    )
    .map((source) => ({
      id: source.id,
      provider: source.provider,
      title: source.title,
      url: source.url,
      scope: source.scope,
      reviewStatus: source.reviewStatus,
    }));
};

const unavailableLesson = (
  moduleId: AcademyScienceModuleId,
  locale: AcademyLocale,
  moleculeName: string,
  reason: string,
): AcademyScienceLesson => ({
  moduleId,
  moleculeId: null,
  moleculeName,
  title: localized(
    locale,
    moduleId === "pharmacology"
      ? "Farmakoloji Kanıt Dersi"
      : "ADME Kanıt Dersi",
    moduleId === "pharmacology"
      ? "Pharmacology Evidence Lesson"
      : "ADME Evidence Lesson",
  ),
  objective: localized(
    locale,
    moduleId === "pharmacology"
      ? "Hedef, etki türü, ölçüm ve deney bağlamını tek tek denetle."
      : "Uygulama yolu/form bağlamını gerçek ADME ölçümünden ayır."
    ,
    moduleId === "pharmacology"
      ? "Audit target, action type, measurement, and assay context separately."
      : "Separate route/form context from an actual ADME measurement.",
  ),
  status: "unavailable",
  statusReason: reason,
  evidenceItems: [],
  administrationContexts: [],
  sources: [],
  limitations: [
    localized(
      locale,
      "Eksik içerik yokluk, etkisizlik, yenilik veya sentezlenebilirlik kanıtı değildir.",
      "Missing content is not evidence of absence, inactivity, novelty, or synthesizability.",
    ),
  ],
  notForClinicalUse: true,
});

const actionLabel = (
  action: string,
  locale: AcademyLocale,
): string => {
  const labels: Readonly<Record<string, Readonly<Record<AcademyLocale, string>>>> = {
    agonist: { tr: "Agonist", en: "Agonist" },
    antagonist: { tr: "Antagonist", en: "Antagonist" },
    inhibitor: { tr: "İnhibitör", en: "Inhibitor" },
    modulator: { tr: "Modülatör", en: "Modulator" },
    binder: { tr: "Bağlayıcı", en: "Binder" },
    other: { tr: "Diğer", en: "Other" },
  };
  return labels[action]?.[locale] ?? action;
};

const pharmacologyLesson = (
  dossier: DrugDossierRecord,
  locale: AcademyLocale,
): AcademyScienceLesson => {
  const profile = dossier.pharmacology;
  const candidates: readonly AcademyScienceEvidenceItem[] = [
    ...profile.targets.map((target) => ({
      id: target.id,
      label: target.targetName.value,
      value: `${actionLabel(target.action.value, locale)} · ${target.measurementType.value} ${target.measurement.value} ${target.measurement.unit ?? ""}`.trim(),
      context: `${target.species.value} · ${target.assayContext.value}`,
      sourceIds: target.sourceIds,
    })),
    ...profile.mechanismClaims.map((claim) => ({
      id: claim.id,
      label: localized(locale, "Kaynaklandırılmış mekanizma iddiası", "Sourced mechanism claim"),
      value: claim.statement,
      context: claim.limitations.join(" ") || localized(
        locale,
        "Kapsam sınırı doğrudan kaynak kaydında tutulur.",
        "The scope boundary is retained in the direct source record.",
      ),
      sourceIds: claim.sourceIds,
    })),
  ];
  const candidateSourceIds = [...new Set(candidates.flatMap((item) => item.sourceIds))];
  const sources = sourceLinksFor(dossier, candidateSourceIds);
  const resolvedIds = new Set(sources.map((source) => source.id));
  const evidenceItems = candidates.filter(
    (item) =>
      item.sourceIds.length > 0 &&
      item.sourceIds.every((sourceId) => resolvedIds.has(sourceId)),
  );

  if (evidenceItems.length === 0) {
    return {
      ...unavailableLesson(
        "pharmacology",
        locale,
        dossier.preferredName,
        profile.unavailableReason ?? localized(
          locale,
          "Bu ilaç için ders içinde yayımlanabilir, doğrudan kaynaklı farmakoloji kaydı henüz yok.",
          "No publishable, directly sourced pharmacology record is available for this drug lesson yet.",
        ),
      ),
      moleculeId: dossier.moleculeId,
      limitations: dossier.limitations,
    };
  }

  return {
    moduleId: "pharmacology",
    moleculeId: dossier.moleculeId,
    moleculeName: dossier.preferredName,
    title: localized(locale, "Farmakoloji Kanıt Dersi", "Pharmacology Evidence Lesson"),
    objective: localized(
      locale,
      "Hedef, etki türü, ölçüm ve deney bağlamını tek tek denetle.",
      "Audit target, action type, measurement, and assay context separately.",
    ),
    status: isReviewedStatus(profile.reviewStatus)
      ? "reviewed"
      : "source-supported",
    statusReason: localized(
      locale,
      `${evidenceItems.length} kaynak kapılı farmakoloji kaydı ders için açıldı.`,
      `${evidenceItems.length} source-gated pharmacology record${evidenceItems.length === 1 ? "" : "s"} opened for the lesson.`,
    ),
    evidenceItems,
    administrationContexts: [],
    sources,
    limitations: dossier.limitations,
    notForClinicalUse: true,
  };
};

const admeLesson = (
  dossier: DrugDossierRecord,
  locale: AcademyLocale,
): AcademyScienceLesson => {
  const presentableFields = dossier.admeProfiles.flatMap((profile) => [
    ...profile.absorption,
    ...profile.distribution,
    ...profile.metabolism,
    ...profile.excretion,
    ...(profile.halfLife ? [profile.halfLife] : []),
    ...(profile.bioavailability ? [profile.bioavailability] : []),
    ...(profile.proteinBinding ? [profile.proteinBinding] : []),
    ...(profile.volumeOfDistribution ? [profile.volumeOfDistribution] : []),
    ...(profile.clearance ? [profile.clearance] : []),
  ]).filter((field) => canPresentAdmeField(field, (sourceId) => sourceById.get(sourceId)));
  const fieldSourceIds = [...new Set(presentableFields.map((field) => field.sourceId))];
  const fieldSources = sourceLinksFor(dossier, fieldSourceIds);
  const fieldSourceSet = new Set(fieldSources.map((source) => source.id));
  const evidenceItems: readonly AcademyScienceEvidenceItem[] = presentableFields
    .filter((field) => fieldSourceSet.has(field.sourceId))
    .map((field) => ({
      id: field.id,
      label: field.label,
      value: `${field.value} ${field.unit ?? ""}`.trim(),
      context: field.conditions.note,
      sourceIds: [field.sourceId],
    }));

  const administrationContexts = dossier.admeProfiles
    .filter((profile) => sourceLinksFor(dossier, profile.sourceIds).length > 0)
    .map((profile) => ({
      id: profile.id,
      route: profile.administration.route.value,
      formulation: profile.administration.formulation?.value ?? null,
      sourceIds: profile.sourceIds,
      boundary: profile.administration.route.conditions.note,
    }));
  const contextSourceIds = [
    ...new Set(administrationContexts.flatMap((context) => context.sourceIds)),
  ];
  const contextSources = sourceLinksFor(dossier, contextSourceIds);
  const sources = evidenceItems.length > 0 ? fieldSources : contextSources;
  const limitations = [
    ...new Set([
      ...dossier.admeProfiles.flatMap((profile) => profile.limitations),
      ...dossier.limitations,
    ]),
  ];

  if (evidenceItems.length > 0) {
    const reviewed = presentableFields.every((field) =>
      isReviewedStatus(field.reviewStatus));
    return {
      moduleId: "adme",
      moleculeId: dossier.moleculeId,
      moleculeName: dossier.preferredName,
      title: localized(locale, "ADME Kanıt Dersi", "ADME Evidence Lesson"),
      objective: localized(
        locale,
        "Uygulama yolu ve farmasötik forma bağlı ADME kanıtını koşullarıyla birlikte oku.",
        "Read route- and form-specific ADME evidence together with its conditions.",
      ),
      status: reviewed ? "reviewed" : "source-supported",
      statusReason: localized(
        locale,
        `${evidenceItems.length} koşullu ADME alanı kaynak kapısından geçti.`,
        `${evidenceItems.length} conditioned ADME field${evidenceItems.length === 1 ? "" : "s"} passed the source gate.`,
      ),
      evidenceItems,
      administrationContexts,
      sources,
      limitations,
      notForClinicalUse: true,
    };
  }

  if (administrationContexts.length > 0) {
    return {
      moduleId: "adme",
      moleculeId: dossier.moleculeId,
      moleculeName: dossier.preferredName,
      title: localized(locale, "ADME Kanıt Dersi", "ADME Evidence Lesson"),
      objective: localized(
        locale,
        "Doğrulanmış uygulama yolu/form bağlamını gerçek ADME ölçümünden ayır.",
        "Separate verified route/form context from an actual ADME measurement.",
      ),
      status: "context-only",
      statusReason: localized(
        locale,
        "Ürün ve uygulama bağlamı kaynaklıdır; emilim, dağılım, metabolizma veya atılım ölçümü henüz kaynaklandırılmadı.",
        "Product and administration context is sourced; no absorption, distribution, metabolism, or excretion measurement is sourced yet.",
      ),
      evidenceItems: [],
      administrationContexts,
      sources,
      limitations,
      notForClinicalUse: true,
    };
  }

  return {
    ...unavailableLesson(
      "adme",
      locale,
      dossier.preferredName,
      localized(
        locale,
        "Bu ilaç için kaynaklandırılmış ürün/form bağlamı veya ADME ölçümü henüz yok.",
        "No sourced product/form context or ADME measurement is available for this drug yet.",
      ),
    ),
    moleculeId: dossier.moleculeId,
    limitations,
  };
};

export function createAcademyScienceLesson(
  moduleId: AcademyScienceModuleId,
  moleculeIdOrSlug: string,
  locale: AcademyLocale,
  assetBasePath = "/",
): AcademyScienceLesson {
  const dossier = createDrugDossierByIdOrSlug(
    moleculeIdOrSlug,
    locale,
    assetBasePath,
  );
  if (!dossier) {
    return unavailableLesson(
      moduleId,
      locale,
      moleculeIdOrSlug.trim() || localized(locale, "Bilinmeyen kayıt", "Unknown record"),
      localized(
        locale,
        "Bu bağlantı kürate edilmiş katalog kaydına çözümlenemedi; bilimsel sonuç üretilmedi.",
        "This link did not resolve to a curated catalog record; no scientific conclusion was generated.",
      ),
    );
  }

  return moduleId === "pharmacology"
    ? pharmacologyLesson(dossier, locale)
    : admeLesson(dossier, locale);
}
