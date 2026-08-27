import {
  presentAdministrationRoute,
  presentDosageForm,
} from "@/lib/application/adme";
import {
  presentEvidenceCoefficientOfVariation,
  presentEvidenceConditionValue,
  presentEvidenceValue,
} from "@/lib/application/dossier";
import { SmilesStructure } from "@/components/platform/SmilesStructure";
import type { AdmeEvidenceField, AdmeProfile } from "@/lib/domain/adme";
import type {
  DrugDossierRecord,
  EvidenceConditions,
  EvidenceField,
  FlagshipDossierContent,
  FlagshipJourneyNode,
  ResolvedDossierSource,
} from "@/lib/domain/dossier";
import type { VerificationStatus } from "@/lib/domain/evidence";
import type { TargetActionType } from "@/lib/domain/pharmacology";

import { FlagshipStructureMap } from "./FlagshipStructureMap";
import styles from "./FlagshipDossier.module.css";

type Locale = "tr" | "en";
type Presentation = "story" | "reference";

interface FlagshipSectionProps {
  readonly flagship: FlagshipDossierContent;
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: Locale;
  readonly presentation: Presentation;
}

interface FlagshipStructureSectionProps extends FlagshipSectionProps {
  readonly parentSmiles: string;
}

const copy = {
  tr: {
    evidenceBoundary: "KANIT SINIRI",
    productAnchor: "Bu anlatının ürün ve uygulama çapası",
    productAnchorBody: "Aşağıdaki farmakokinetik ve ürün bilgileri yalnız bu forma ve uygulama yoluna aittir.",
    route: "Uygulama yolu",
    formulation: "Farmasötik form",
    effectiveDate: "Kaynak tarihi",
    source: "Kaynağı aç",
    secondarySource: "İkincil kaynak sınırı",
    staleSecondary: "Eski ikincil kayıt",
    corroborating: "Doğrulayıcı ikincil kayıt",
    chemistryEyebrow: "YAPI OKUMASI",
    chemistryTitle: "Gruplar, iskelet ve kaynaklı tanımlayıcılar",
    functionalGroups: "Fonksiyonel gruplar",
    scaffold: "Kimyasal iskelet",
    descriptors: "Tanımlayıcılar",
    unavailable: "Kaynaklı alan yok; değer üretilmedi.",
    sourceReported: "Kaynakta bildirilen",
    computed: "Hesaplanmış",
    atomMap: "Yapı atom eşlemesi",
    noAtomMap: "Yapı vurgusu uzman incelemesine kadar kapalıdır.",
    structureMapTitle: "Yapı üzerinde kaynaklı eşleme",
    pharmacologyEyebrow: "HEDEF VE MEKANİZMA",
    pharmacologyTitle: "Birincil hedef bağlamı",
    target: "Hedef",
    targetFamily: "Hedef ailesi",
    action: "Eylem",
    mechanism: "Mekanizma sınırı",
    mechanismClaims: "Kaynaklı mekanizma iddiaları",
    interactions: "Ölçümlü etkileşimler",
    noInteractions: "Bu anchor için koşulları çözümlenmiş sayısal etkileşim ölçümü yoktur.",
    measurement: "Ölçüm",
    speciesAssay: "Tür ve deney bağlamı",
    journeyEyebrow: "GÖRSEL YOLCULUK",
    journeyTitle: "Kanıtın izin verdiği yere kadar izle",
    journeyBody: "Her düğüm ayrı bir kaynak sınırıdır; boş düğümden sonuç çıkarılmaz.",
    synthesisEyebrow: "SENTEZ HARİTASI",
    synthesisTitle: "Raporlanmış rota ve eğitim adımları",
    synthesisUnavailableTitle: "Yayımlanabilir sentez rotası gösterilmiyor",
    routeSummary: "Rota özeti",
    materials: "Yapı taşları",
    steps: "Rota adımları",
    step: "Adım",
    reactionClass: "Dönüşüm sınıfı",
    bondChange: "Bağ değişimi özeti",
    structureHeld: "Yapı gösterimi inceleme bekliyor",
    materialIdentity: "Malzeme kimliği",
    bondMapHeld: "Atom-kusursuz bağ değişimi haritası yayımlanmıyor; kaynakla sınırlı metinsel özet gösteriliyor.",
    startingMaterial: "Başlangıç maddesi",
    intermediate: "Ara ürün",
    finalProduct: "Son ürün",
    operationsBoundary: "Operasyonel laboratuvar koşulları yayımlanmaz; bu bir üretim protokolü veya FTO görüşü değildir.",
    nomenclatureEyebrow: "NOMENKLATÜR",
    nomenclatureTitle: "Adı parçalara ayır, kaynak biçimlerini koru",
    variants: "Kaynak adları",
    segments: "Ad segmentleri",
    conflict: "Kaynak adlandırma notu",
    preferred: "Tercih edilen",
    sourceSpecific: "Kaynağa özgü",
    conflicting: "Çelişkili kaynak biçimi",
    parent: "Ana yapı",
    locant: "Konum belirteci",
    substituent: "Sübstitüent",
    stereodescriptor: "Stereo belirteç",
    functionalSuffix: "Fonksiyonel sonek",
    comparisonsEyebrow: "KARŞILAŞTIRMA",
    comparisonsTitle: "Aynı ailede ne korunuyor, ne değişiyor?",
    sharedScaffold: "Paylaşılan yapı bağlamı",
    changedGroups: "Değişen gruplar",
    propertyDifferences: "Kaynaklı kimlik özellikleri",
    targetDifference: "Hedef / eylem farkı",
    regulatoryContext: "Düzenleyici bağlam",
    notCompared: "Kaynaklandırılmış karşılaştırma alanı yok; sıralama yapılmadı.",
    admeEyebrow: "REFERANS ADME",
    admeTitle: "Ölçüm, koşul ve kaynak birlikte",
    profile: "Ürün / uygulama profili",
    keyMeasures: "Temel ölçümler",
    absorption: "Emilim",
    distribution: "Dağılım",
    metabolism: "Metabolizma",
    excretion: "Atılım",
    halfLife: "Yarı ömür",
    bioavailability: "Biyoyararlanım",
    proteinBinding: "Protein bağlanması",
    volumeOfDistribution: "Dağılım hacmi",
    clearance: "Klirens",
    missingMeasurement: "Bu ürün/form çapası için kaynaklı değer yok; tahmin edilmedi.",
    conditions: "Koşullar",
    missingEyebrow: "AÇIK EKSİK ALANLAR",
    missingTitle: "Bilinmeyenler null kalır",
    missingBody: "Bu alanlar başka formdan, analogdan veya hesaplamadan doldurulmadı.",
    reviewed: "İncelendi",
    expertReviewed: "Uzman incelemeli",
    sourceSupported: "Kaynak destekli",
    pendingReview: "İnceleme bekliyor",
    predicted: "Tahmin",
    conflictingStatus: "Çelişkili",
    unknown: "Belirtilmedi",
    conditionRoute: "Yol",
    conditionFormulation: "Form",
    conditionSpecies: "Tür",
    conditionPopulation: "Popülasyon",
    conditionDose: "Doz",
    conditionFedState: "Beslenme durumu",
    conditionStudy: "Çalışma tasarımı",
    conditionCohort: "Katılımcı sayısı",
    conditionAssay: "Deney",
    conditionMatrix: "Matris",
    conditionTemperature: "Sıcaklık",
    conditionPh: "pH",
    conditionCv: "Varyasyon katsayısı (%CV)",
  },
  en: {
    evidenceBoundary: "EVIDENCE BOUNDARY",
    productAnchor: "Product and administration anchor for this story",
    productAnchorBody: "The pharmacokinetic and product facts below apply only to this form and administration route.",
    route: "Administration route",
    formulation: "Pharmaceutical form",
    effectiveDate: "Source effective date",
    source: "Open source",
    secondarySource: "Secondary-source boundary",
    staleSecondary: "Stale secondary record",
    corroborating: "Corroborating secondary record",
    chemistryEyebrow: "STRUCTURE READING",
    chemistryTitle: "Groups, scaffold, and sourced descriptors",
    functionalGroups: "Functional groups",
    scaffold: "Chemical scaffold",
    descriptors: "Descriptors",
    unavailable: "No sourced field is available; no value was generated.",
    sourceReported: "Source reported",
    computed: "Computed",
    atomMap: "Structure atom mapping",
    noAtomMap: "Structure highlighting is held until expert review.",
    structureMapTitle: "Sourced mapping on the structure",
    pharmacologyEyebrow: "TARGET & MECHANISM",
    pharmacologyTitle: "Primary target context",
    target: "Target",
    targetFamily: "Target family",
    action: "Action",
    mechanism: "Mechanism boundary",
    mechanismClaims: "Sourced mechanism claims",
    interactions: "Measured interactions",
    noInteractions: "No numeric interaction measurement with resolved conditions is available for this anchor.",
    measurement: "Measurement",
    speciesAssay: "Species and assay context",
    journeyEyebrow: "VISUAL JOURNEY",
    journeyTitle: "Follow only as far as the evidence allows",
    journeyBody: "Each node is an independent source boundary; an empty node supports no inference.",
    synthesisEyebrow: "SYNTHESIS MAP",
    synthesisTitle: "Reported route and educational steps",
    synthesisUnavailableTitle: "No publishable synthesis route is shown",
    routeSummary: "Route summary",
    materials: "Route materials",
    steps: "Route steps",
    step: "Step",
    reactionClass: "Transformation class",
    bondChange: "Bond-change summary",
    structureHeld: "Structure display awaits review",
    materialIdentity: "Material identity",
    bondMapHeld: "An atom-perfect bond-change map is not published; a source-bounded textual summary is shown.",
    startingMaterial: "Starting material",
    intermediate: "Intermediate",
    finalProduct: "Final product",
    operationsBoundary: "Operational laboratory conditions are not published; this is not a manufacturing protocol or FTO opinion.",
    nomenclatureEyebrow: "NOMENCLATURE",
    nomenclatureTitle: "Segment the name and preserve source forms",
    variants: "Source names",
    segments: "Name segments",
    conflict: "Source nomenclature note",
    preferred: "Preferred",
    sourceSpecific: "Source specific",
    conflicting: "Conflicting source form",
    parent: "Parent",
    locant: "Locant",
    substituent: "Substituent",
    stereodescriptor: "Stereodescriptor",
    functionalSuffix: "Functional suffix",
    comparisonsEyebrow: "COMPARISON",
    comparisonsTitle: "What is retained and what changes within the family?",
    sharedScaffold: "Shared structure context",
    changedGroups: "Changed groups",
    propertyDifferences: "Sourced identity properties",
    targetDifference: "Target / action difference",
    regulatoryContext: "Regulatory context",
    notCompared: "No sourced comparison field is available; no ranking was made.",
    admeEyebrow: "REFERENCE ADME",
    admeTitle: "Measurement, conditions, and source together",
    profile: "Product / administration profile",
    keyMeasures: "Key measures",
    absorption: "Absorption",
    distribution: "Distribution",
    metabolism: "Metabolism",
    excretion: "Excretion",
    halfLife: "Half-life",
    bioavailability: "Bioavailability",
    proteinBinding: "Protein binding",
    volumeOfDistribution: "Volume of distribution",
    clearance: "Clearance",
    missingMeasurement: "No sourced value is available for this product/form anchor; it was not estimated.",
    conditions: "Conditions",
    missingEyebrow: "EXPLICIT MISSING FIELDS",
    missingTitle: "Unknowns remain null",
    missingBody: "These fields were not filled from another form, an analogue, or a calculation.",
    reviewed: "Reviewed",
    expertReviewed: "Expert reviewed",
    sourceSupported: "Source supported",
    pendingReview: "Pending review",
    predicted: "Predicted",
    conflictingStatus: "Conflicting",
    unknown: "Unspecified",
    conditionRoute: "Route",
    conditionFormulation: "Formulation",
    conditionSpecies: "Species",
    conditionPopulation: "Population",
    conditionDose: "Dose",
    conditionFedState: "Fed state",
    conditionStudy: "Study design",
    conditionCohort: "Cohort size",
    conditionAssay: "Assay",
    conditionMatrix: "Matrix",
    conditionTemperature: "Temperature",
    conditionPh: "pH",
    conditionCv: "Coefficient of variation (%CV)",
  },
} as const;

const actionLabels: Readonly<Record<TargetActionType, Readonly<Record<Locale, string>>>> = {
  agonist: { tr: "Agonist", en: "Agonist" },
  antagonist: { tr: "Antagonist", en: "Antagonist" },
  inhibitor: { tr: "İnhibitör", en: "Inhibitor" },
  modulator: { tr: "Modülatör", en: "Modulator" },
  binder: { tr: "Bağlayıcı", en: "Binder" },
  other: { tr: "Diğer", en: "Other" },
};

const reviewLabels: Readonly<Record<VerificationStatus, Readonly<Record<Locale, string>>>> = {
  verified: { tr: copy.tr.reviewed, en: copy.en.reviewed },
  "expert-reviewed": { tr: copy.tr.expertReviewed, en: copy.en.expertReviewed },
  "source-supported": { tr: copy.tr.sourceSupported, en: copy.en.sourceSupported },
  "pending-review": { tr: copy.tr.pendingReview, en: copy.en.pendingReview },
  predicted: { tr: copy.tr.predicted, en: copy.en.predicted },
  conflicting: { tr: copy.tr.conflictingStatus, en: copy.en.conflictingStatus },
  unknown: { tr: copy.tr.unknown, en: copy.en.unknown },
};

function SourceLink({
  sourceId,
  sources,
  locale,
}: {
  readonly sourceId: string;
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: Locale;
}) {
  const source = sources.find((candidate) => candidate.id === sourceId);
  if (!source) return null;
  return (
    <a
      className={styles.sourceLink}
      href={source.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${copy[locale].source}: ${source.provider} — ${source.title}`}
      title={`${source.provider} — ${source.title}`}
    >
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function SourceLinks({
  sourceIds,
  sources,
  locale,
}: {
  readonly sourceIds: readonly string[];
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: Locale;
}) {
  return (
    <span className={styles.sourceLinks}>
      {sourceIds.map((sourceId) => (
        <SourceLink key={sourceId} sourceId={sourceId} sources={sources} locale={locale} />
      ))}
    </span>
  );
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date)
    : value;
}

function conditionEntries(conditions: EvidenceConditions, locale: Locale) {
  const labels = copy[locale];
  const coefficientOfVariation = presentEvidenceCoefficientOfVariation(conditions);
  const values: readonly (readonly [string, string | number | undefined])[] = [
    [labels.conditionRoute, conditions.route ? presentAdministrationRoute(conditions.route, locale) : undefined],
    [labels.conditionFormulation, conditions.formulation ? presentDosageForm(conditions.formulation, locale) : undefined],
    [labels.conditionSpecies, conditions.species],
    [labels.conditionPopulation, conditions.population],
    [labels.conditionDose, conditions.dose],
    [labels.conditionFedState, conditions.fedState],
    [labels.conditionStudy, conditions.studyDesign],
    [labels.conditionCohort, conditions.cohortSize],
    [labels.conditionAssay, conditions.assay],
    [labels.conditionMatrix, conditions.matrix],
    [labels.conditionTemperature, conditions.temperature],
    [labels.conditionPh, conditions.pH],
    [labels.conditionCv, coefficientOfVariation ?? undefined],
  ];
  return values
    .filter((entry): entry is readonly [string, string | number] => entry[1] !== undefined)
    .map(([label, value]) => [label, presentEvidenceConditionValue(value, locale)] as const);
}

function EvidenceReference({
  field,
  sources,
  locale,
}: {
  readonly field: EvidenceField<string | number>;
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: Locale;
}) {
  const conditions = conditionEntries(field.conditions, locale);
  return (
    <div className={styles.evidenceReference}>
      <div className={styles.evidenceMeta}>
        <span>{reviewLabels[field.reviewStatus][locale]}</span>
        <SourceLink sourceId={field.sourceId} sources={sources} locale={locale} />
      </div>
      <p>{field.conditions.note}</p>
      {conditions.length > 0 ? (
        <dl className={styles.conditions} aria-label={copy[locale].conditions}>
          {conditions.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function FlagshipProductAnchor({ flagship, sources, locale, presentation }: FlagshipSectionProps) {
  const labels = copy[locale];
  const anchor = flagship.productAnchor;
  return (
    <section className={styles.anchor} data-flagship-product-anchor={presentation}>
      <header>
        <span>{labels.evidenceBoundary}</span>
        <div className={styles.titleWithSource}>
          <h2>{labels.productAnchor}</h2>
          <SourceLink sourceId={anchor.sourceId} sources={sources} locale={locale} />
        </div>
        <p>{labels.productAnchorBody}</p>
      </header>
      <strong className={styles.anchorLabel}>{anchor.label}</strong>
      <dl className={styles.anchorFacts}>
        <div><dt>{labels.route}</dt><dd>{presentAdministrationRoute(anchor.route, locale)}</dd></div>
        <div><dt>{labels.formulation}</dt><dd>{presentDosageForm(anchor.formulation, locale)}</dd></div>
        <div><dt>{labels.effectiveDate}</dt><dd>{formatDate(anchor.sourceEffectiveDate, locale)}</dd></div>
      </dl>
      <p className={styles.boundary}>{anchor.boundary}</p>
      {anchor.secondarySources.length > 0 ? (
        <div className={styles.secondarySources} data-secondary-source-boundary="true">
          <strong>{labels.secondarySource}</strong>
          <ul>
            {anchor.secondarySources.map((secondary) => (
              <li key={`${secondary.sourceId}:${secondary.role}`}>
                <span>{secondary.role === "stale-secondary" ? labels.staleSecondary : labels.corroborating}</span>
                <p>{secondary.note}</p>
                <SourceLink sourceId={secondary.sourceId} sources={sources} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function FlagshipChemistryDetails({ flagship, sources, locale, presentation, parentSmiles }: FlagshipStructureSectionProps) {
  const labels = copy[locale];
  const annotations = flagship.chemistryAnnotations.content;
  const groups = annotations.filter((annotation) => annotation.kind === "functional-group");
  const scaffolds = annotations.filter((annotation) => annotation.kind === "scaffold");
  return (
    <section className={styles.section} data-flagship-chemistry={presentation}>
      <header className={styles.sectionHeader}>
        <span>{labels.chemistryEyebrow}</span>
        <h2>{labels.chemistryTitle}</h2>
      </header>
      <FlagshipStructureMap
        smiles={parentSmiles}
        items={annotations.map((annotation) => ({
          id: annotation.id,
          label: annotation.label.value,
          atomIndexes: annotation.atomIndexes,
        }))}
        locale={locale}
        title={labels.structureMapTitle}
      />
      <div className={styles.annotationGrid}>
        <article>
          <h3>{labels.functionalGroups}</h3>
          {groups.length > 0 ? (
            <ul className={styles.chipList}>
              {groups.map((annotation) => (
                <li key={annotation.id}>
                  <span>{annotation.label.value}</span>
                  <SourceLink sourceId={annotation.label.sourceId} sources={sources} locale={locale} />
                  {presentation === "reference" ? (
                    <small>{annotation.atomLabels.length > 0 ? `${labels.atomMap}: ${annotation.atomLabels.join(" · ")}` : labels.noAtomMap}</small>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className={styles.compactEmpty}>{labels.unavailable}</p>}
        </article>
        <article>
          <h3>{labels.scaffold}</h3>
          {scaffolds.length > 0 ? (
            <ul className={styles.chipList}>
              {scaffolds.map((annotation) => (
                <li key={annotation.id}>
                  <span>{annotation.label.value}</span>
                  <SourceLink sourceId={annotation.label.sourceId} sources={sources} locale={locale} />
                  {presentation === "reference" ? <small>{annotation.label.conditions.note}</small> : null}
                </li>
              ))}
            </ul>
          ) : <p className={styles.compactEmpty}>{labels.unavailable}</p>}
        </article>
      </div>
      <div className={styles.descriptorBlock}>
        <h3>{labels.descriptors}</h3>
        <dl className={styles.descriptorGrid}>
          {flagship.descriptors.content.map((descriptor) => (
            <div key={descriptor.id} data-field-availability={descriptor.field ? "available" : "missing"}>
              <dt>{descriptor.label}</dt>
              <dd>{descriptor.field ? presentEvidenceValue(descriptor.field, locale) : descriptor.unavailableReason ?? labels.unavailable}</dd>
              {descriptor.field ? (
                <>
                  <small>{descriptor.provenance === "computed" ? labels.computed : labels.sourceReported}</small>
                  <SourceLink sourceId={descriptor.field.sourceId} sources={sources} locale={locale} />
                  {presentation === "reference" ? <EvidenceReference field={descriptor.field} sources={sources} locale={locale} /> : null}
                </>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function FlagshipPharmacology({
  dossier,
  sources,
  locale,
  presentation,
}: {
  readonly dossier: DrugDossierRecord;
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: Locale;
  readonly presentation: Presentation;
}) {
  const labels = copy[locale];
  const profile = dossier.pharmacology;
  return (
    <section className={styles.section} data-flagship-pharmacology={presentation}>
      <header className={styles.sectionHeader}>
        <span>{labels.pharmacologyEyebrow}</span>
        <h2>{labels.pharmacologyTitle}</h2>
      </header>
      {profile.primaryTargets.length > 0 ? (
        <div className={styles.targetGrid}>
          {profile.primaryTargets.map((target) => (
            <article key={target.id}>
              <div className={styles.targetHeading}>
                <span>{labels.target}</span>
                <SourceLinks sourceIds={target.sourceIds} sources={sources} locale={locale} />
              </div>
              <h3>{target.targetName.value}</h3>
              <dl>
                <div><dt>{labels.targetFamily}</dt><dd>{target.targetFamily?.value ?? labels.unavailable}</dd></div>
                <div><dt>{labels.action}</dt><dd>{actionLabels[target.action.value][locale]}</dd></div>
                <div><dt>{labels.mechanism}</dt><dd>{target.mechanism?.value ?? labels.unavailable}</dd></div>
              </dl>
              {presentation === "reference" ? (
                <EvidenceReference field={target.targetName} sources={sources} locale={locale} />
              ) : null}
            </article>
          ))}
        </div>
      ) : <p className={styles.compactEmpty}>{profile.unavailableReason ?? labels.unavailable}</p>}

      {profile.mechanismClaims.length > 0 ? (
        <div className={styles.claims}>
          <h3>{labels.mechanismClaims}</h3>
          <ul>
            {profile.mechanismClaims.map((claim) => (
              <li key={claim.id}>
                <p>{claim.statement}</p>
                <SourceLinks sourceIds={claim.sourceIds} sources={sources} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {presentation === "reference" ? (
        <div className={styles.interactions}>
          <h3>{labels.interactions}</h3>
          {profile.targets.length > 0 ? (
            <div className={styles.interactionGrid}>
              {profile.targets.map((interaction) => (
                <article key={interaction.id}>
                  <div className={styles.titleWithSource}>
                    <strong>{interaction.targetName.value}</strong>
                    <SourceLinks sourceIds={interaction.sourceIds} sources={sources} locale={locale} />
                  </div>
                  <dl>
                    <div><dt>{labels.action}</dt><dd>{actionLabels[interaction.action.value][locale]}</dd></div>
                    <div><dt>{labels.measurement}</dt><dd>{interaction.measurementType.value}: {presentEvidenceValue(interaction.measurement, locale)}</dd></div>
                    <div><dt>{labels.speciesAssay}</dt><dd>{interaction.species.value} · {interaction.assayContext.value}</dd></div>
                  </dl>
                  <EvidenceReference field={interaction.measurement} sources={sources} locale={locale} />
                </article>
              ))}
            </div>
          ) : <p className={styles.compactEmpty}>{labels.noInteractions}</p>}
        </div>
      ) : null}
    </section>
  );
}

function journeyNodeSymbol(node: FlagshipJourneyNode) {
  const symbols: Readonly<Record<FlagshipJourneyNode["kind"], string>> = {
    route: "01",
    absorption: "02",
    "systemic-circulation": "03",
    "target-tissue": "04",
    "molecular-target": "05",
    "downstream-effect": "06",
    metabolism: "07",
    excretion: "08",
  };
  return symbols[node.kind];
}

export function FlagshipJourney({ flagship, sources, locale, presentation }: FlagshipSectionProps) {
  const labels = copy[locale];
  const nodes = flagship.journey.content;
  return (
    <section className={styles.section} data-flagship-journey={presentation}>
      <header className={styles.sectionHeader}>
        <span>{labels.journeyEyebrow}</span>
        <h2>{labels.journeyTitle}</h2>
        <p>{labels.journeyBody}</p>
      </header>
      <ol className={styles.journey}>
        {nodes.map((node) => (
          <li key={node.id} data-node-availability={node.evidence ? "available" : "missing"}>
            <span className={styles.journeyIndex}>{journeyNodeSymbol(node)}</span>
            <div>
              <strong>{node.label}</strong>
              <p>{node.evidence?.value ?? node.unavailableReason ?? labels.unavailable}</p>
              {node.evidence ? <SourceLink sourceId={node.evidence.sourceId} sources={sources} locale={locale} /> : null}
              {presentation === "reference" && node.evidence ? (
                <EvidenceReference field={node.evidence} sources={sources} locale={locale} />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const phaseFields = (profile: AdmeProfile) => [
  ["absorption", profile.absorption],
  ["distribution", profile.distribution],
  ["metabolism", profile.metabolism],
  ["excretion", profile.excretion],
] as const;

export function FlagshipAdmeReference({
  dossier,
  sources,
  locale,
}: {
  readonly dossier: DrugDossierRecord;
  readonly sources: readonly ResolvedDossierSource[];
  readonly locale: Locale;
}) {
  const labels = copy[locale];
  const phaseLabels = {
    absorption: labels.absorption,
    distribution: labels.distribution,
    metabolism: labels.metabolism,
    excretion: labels.excretion,
  } as const;
  const measureLabels = {
    halfLife: labels.halfLife,
    bioavailability: labels.bioavailability,
    proteinBinding: labels.proteinBinding,
    volumeOfDistribution: labels.volumeOfDistribution,
    clearance: labels.clearance,
  } as const;

  return (
    <section className={styles.section} data-flagship-adme-reference="true">
      <header className={styles.sectionHeader}>
        <span>{labels.admeEyebrow}</span>
        <h2>{labels.admeTitle}</h2>
      </header>
      {dossier.admeProfiles.length > 0 ? dossier.admeProfiles.map((profile) => {
        const keyMeasures = (Object.keys(measureLabels) as readonly (keyof typeof measureLabels)[])
          .map((key) => [key, profile[key]] as const);
        return (
          <article className={styles.admeProfile} key={profile.id}>
            <header>
              <span>{labels.profile}</span>
              <h3>{presentAdministrationRoute(profile.administration.route.value, locale)} · {presentDosageForm(profile.administration.formulation?.value, locale)}</h3>
              <SourceLinks sourceIds={profile.sourceIds} sources={sources} locale={locale} />
            </header>
            <div className={styles.keyMeasures}>
              <h4>{labels.keyMeasures}</h4>
              <dl>
                {keyMeasures.map(([key, field]) => (
                  <div key={key} data-field-availability={field ? "available" : "missing"}>
                    <dt>{measureLabels[key]}</dt>
                    <dd>{field ? presentEvidenceValue(field, locale) : labels.missingMeasurement}</dd>
                    {field ? <EvidenceReference field={field} sources={sources} locale={locale} /> : null}
                  </div>
                ))}
              </dl>
            </div>
            <div className={styles.phaseGrid}>
              {phaseFields(profile).map(([phase, fields]) => (
                <section key={phase} data-phase={phase}>
                  <h4>{phaseLabels[phase]}</h4>
                  {fields.length > 0 ? (
                    <dl>
                      {fields.map((field: AdmeEvidenceField) => (
                        <div key={field.id}>
                          <dt>{field.label}</dt>
                          <dd>{presentEvidenceValue(field, locale)}</dd>
                          <EvidenceReference field={field} sources={sources} locale={locale} />
                        </div>
                      ))}
                    </dl>
                  ) : <p className={styles.compactEmpty}>{labels.missingMeasurement}</p>}
                </section>
              ))}
            </div>
            {profile.limitations.length > 0 ? <ul className={styles.limitations}>{profile.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </article>
        );
      }) : <p className={styles.compactEmpty}>{labels.missingMeasurement}</p>}
    </section>
  );
}

export function FlagshipSynthesis({ flagship, sources, locale, presentation }: FlagshipSectionProps) {
  const labels = copy[locale];
  const route = flagship.synthesis.content;
  const roleLabels = {
    "starting-material": labels.startingMaterial,
    intermediate: labels.intermediate,
    "final-product": labels.finalProduct,
  } as const;

  return (
    <section
      className={styles.section}
      data-flagship-synthesis={presentation}
      data-synthesis-publication-state={route ? "published" : "unavailable"}
    >
      <header className={styles.sectionHeader}>
        <span>{labels.synthesisEyebrow}</span>
        <h2>{route ? labels.synthesisTitle : labels.synthesisUnavailableTitle}</h2>
      </header>
      {route ? (
        <>
          <article className={styles.routeCard}>
            <div className={styles.titleWithSource}>
              <span>{labels.routeSummary}</span>
              <SourceLinks sourceIds={route.sourceIds} sources={sources} locale={locale} />
            </div>
            <h3>{route.title}</h3>
            <p>{route.summary}</p>
          </article>
          <div className={styles.materials}>
            <h3>{labels.materials}</h3>
            <ul>
              {route.materials.map((material) => (
                <li key={material.id}>
                  <div className={styles.titleWithSource}>
                    <span>{roleLabels[material.role]}</span>
                    <SourceLinks sourceIds={material.sourceIds} sources={sources} locale={locale} />
                  </div>
                  <strong>{material.label}</strong>
                  {material.smiles ? (
                    <SmilesStructure
                      className={styles.materialStructure}
                      smiles={material.smiles}
                      label={`${labels.materialIdentity}: ${material.label}`}
                    />
                  ) : <small>{labels.structureHeld}</small>}
                  {presentation === "reference" && material.smiles ? <code dir="ltr">{material.smiles}</code> : null}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.routeSteps}>
            <h3>{labels.steps}</h3>
            <ol>
              {route.steps.map((step) => (
                <li key={step.id}>
                  <span>{labels.step} {String(step.order).padStart(2, "0")}</span>
                  <div className={styles.titleWithSource}>
                    <h4>{step.title}</h4>
                    <SourceLinks sourceIds={step.sourceIds} sources={sources} locale={locale} />
                  </div>
                  <dl>
                    <div><dt>{labels.reactionClass}</dt><dd>{step.reactionClass}</dd></div>
                    <div><dt>{labels.bondChange}</dt><dd>{step.bondChangeSummary}</dd></div>
                  </dl>
                  <small className={styles.bondMapBoundary}>{labels.bondMapHeld}</small>
                </li>
              ))}
            </ol>
          </div>
          <p className={styles.boundary}>{labels.operationsBoundary}</p>
          {presentation === "reference" && route.limitations.length > 0 ? <ul className={styles.limitations}>{route.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </>
      ) : (
        <p
          className={styles.compactEmpty}
          data-synthesis-detail-available="false"
        >
          {flagship.synthesis.limitations[0] ?? labels.unavailable}
        </p>
      )}
    </section>
  );
}

export function FlagshipNomenclature({ flagship, sources, locale, presentation, parentSmiles }: FlagshipStructureSectionProps) {
  const labels = copy[locale];
  const content = flagship.nomenclature.content;
  const roleLabels = {
    preferred: labels.preferred,
    "source-specific": labels.sourceSpecific,
    conflicting: labels.conflicting,
  } as const;
  const segmentLabels = {
    parent: labels.parent,
    locant: labels.locant,
    substituent: labels.substituent,
    stereodescriptor: labels.stereodescriptor,
    "functional-suffix": labels.functionalSuffix,
  } as const;

  return (
    <section className={styles.section} data-flagship-nomenclature={presentation}>
      <header className={styles.sectionHeader}>
        <span>{labels.nomenclatureEyebrow}</span>
        <h2>{labels.nomenclatureTitle}</h2>
      </header>
      {content ? (
        <>
          <FlagshipStructureMap
            smiles={parentSmiles}
            items={content.segments.map((segment) => ({
              id: segment.id,
              label: segment.text,
              atomIndexes: segment.atomIndexes,
            }))}
            locale={locale}
            title={labels.nomenclatureTitle}
          />
          <div className={styles.nameVariants}>
            <h3>{labels.variants}</h3>
            <ul>
              {content.variants.map((variant) => (
                <li className={variant.role === "conflicting" ? styles.nameConflict : undefined} key={variant.id}>
                  <span>{roleLabels[variant.role]}</span>
                  <strong>{variant.name.value}</strong>
                  <SourceLink sourceId={variant.name.sourceId} sources={sources} locale={locale} />
                  {presentation === "reference" ? <small>{variant.name.conditions.note}</small> : null}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.nameSegments}>
            <h3>{labels.segments}</h3>
            <ol>
              {content.segments.map((segment) => (
                <li key={segment.id}>
                  <span>{segmentLabels[segment.kind]}</span>
                  <strong>{segment.text}</strong>
                  <SourceLinks sourceIds={segment.sourceIds} sources={sources} locale={locale} />
                  {presentation === "reference" && segment.atomLabels.length > 0 ? <small>{labels.atomMap}: {segment.atomLabels.join(" · ")}</small> : null}
                </li>
              ))}
            </ol>
          </div>
          {content.conflictNote ? (
            <aside className={styles.conflict}>
              <strong>{labels.conflict}</strong>
              <p>{content.conflictNote}</p>
            </aside>
          ) : null}
        </>
      ) : <p className={styles.compactEmpty}>{flagship.nomenclature.limitations[0] ?? labels.unavailable}</p>}
    </section>
  );
}

export function FlagshipComparisons({ flagship, sources, locale, presentation }: FlagshipSectionProps) {
  const labels = copy[locale];
  const comparisons = flagship.comparisons.content.slice(0, 4);
  return (
    <section className={styles.section} data-flagship-comparisons={presentation}>
      <header className={styles.sectionHeader}>
        <span>{labels.comparisonsEyebrow}</span>
        <h2>{labels.comparisonsTitle}</h2>
      </header>
      {comparisons.length > 0 ? (
        <div className={styles.comparisonGrid}>
          {comparisons.map((comparison) => (
            <article key={comparison.id}>
              <div className={styles.titleWithSource}>
                <h3>{comparison.name}</h3>
                <SourceLinks sourceIds={comparison.sourceIds} sources={sources} locale={locale} />
              </div>
              <dl>
                <div><dt>{labels.sharedScaffold}</dt><dd>{comparison.sharedScaffold.value}</dd></div>
                <div><dt>{labels.changedGroups}</dt><dd>{comparison.changedGroups.length > 0 ? comparison.changedGroups.map((field) => field.value).join(" · ") : labels.notCompared}</dd></div>
                <div>
                  <dt>{labels.propertyDifferences}</dt>
                  <dd>
                    {comparison.propertyDifferences.length > 0 ? comparison.propertyDifferences.map((field) => (
                      <span className={styles.comparativeEvidence} key={`${comparison.id}:${field.value}`}>
                        <span>{field.value}</span>
                        <SourceLinks sourceIds={field.sourceIds} sources={sources} locale={locale} />
                      </span>
                    )) : labels.notCompared}
                  </dd>
                </div>
                {(presentation === "reference" || comparison.targetActionDifference) ? (
                  <div>
                    <dt>{labels.targetDifference}</dt>
                    <dd>
                      {comparison.targetActionDifference ? (
                        <span className={styles.comparativeEvidence}>
                          <span>{comparison.targetActionDifference.value}</span>
                          <SourceLinks sourceIds={comparison.targetActionDifference.sourceIds} sources={sources} locale={locale} />
                        </span>
                      ) : labels.notCompared}
                    </dd>
                  </div>
                ) : null}
                {(presentation === "reference" || comparison.regulatoryContext) ? <div><dt>{labels.regulatoryContext}</dt><dd>{comparison.regulatoryContext?.value ?? labels.notCompared}</dd></div> : null}
              </dl>
            </article>
          ))}
        </div>
      ) : <p className={styles.compactEmpty}>{flagship.comparisons.limitations[0] ?? labels.notCompared}</p>}
    </section>
  );
}

export function FlagshipExplicitMissing({ flagship, locale }: Pick<FlagshipSectionProps, "flagship" | "locale">) {
  const labels = copy[locale];
  return (
    <section className={styles.missingPanel} data-flagship-explicit-missing="true">
      <header>
        <span>{labels.missingEyebrow}</span>
        <h2>{labels.missingTitle}</h2>
        <p>{labels.missingBody}</p>
      </header>
      {flagship.explicitMissingFields.length > 0 ? (
        <ul>{flagship.explicitMissingFields.map((field) => <li key={field}>{field}</li>)}</ul>
      ) : <p className={styles.compactEmpty}>{labels.unavailable}</p>}
    </section>
  );
}
