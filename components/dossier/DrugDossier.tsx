"use client";

import { useMemo, useRef, useState } from "react";

import { AdmePanel, DrugJourney, MetaboliteGraph } from "@/components/adme";
import { PharmacologyPanel } from "@/components/pharmacology";
import {
  createDrugDossierByIdOrSlug,
  getDossierLearningAvailability,
} from "@/lib/application/dossier";
import type {
  DossierCoverageDimension,
  DossierCoverageStatus,
  DossierMode,
  DrugDossierRecord,
} from "@/lib/domain/dossier";

import { ChemistryOverview } from "./ChemistryOverview";
import {
  FlagshipAdmeReference,
  FlagshipChemistryDetails,
  FlagshipComparisons,
  FlagshipExplicitMissing,
  FlagshipJourney,
  FlagshipNomenclature,
  FlagshipPharmacology,
  FlagshipProductAnchor,
  FlagshipSynthesis,
} from "./FlagshipDossierSections";
import { FlagshipLearningTasks } from "./FlagshipLearningTasks";
import { ReferenceDossierExport } from "./ReferenceDossierExport";
import { SourcesDrawer } from "./SourcesDrawer";
import styles from "./DrugDossier.module.css";

export interface DrugDossierProps {
  readonly moleculeIdOrSlug: string;
  readonly locale: "tr" | "en";
  readonly assetBasePath?: string;
  readonly initialMode?: DossierMode;
  readonly onBackToAtlas?: () => void;
  readonly onOpenSynthesis?: (moleculeId: string) => void;
  readonly onOpenSynthesisAcademy?: () => void;
  readonly onOpenNomenclature?: (moleculeId: string) => void;
}

type ReferenceTab =
  | "overview"
  | "chemistry"
  | "pharmacology"
  | "adme"
  | "synthesis"
  | "nomenclature"
  | "comparisons"
  | "learning"
  | "sources";

const copy = {
  tr: {
    dossier: "İLAÇ DOSYASI",
    atlas: "İlaç Atlası'na dön",
    story: "Hikâye Modu",
    reference: "Referans Modu",
    identityBoundary: "Ana molekül kimliği",
    contentCoverage: "İçerik kapsamı",
    coverageDescription: "Katalogda bulunmak, her bilimsel katmanın tamamlandığı anlamına gelmez.",
    aliases: "Diğer adlar",
    clinicalBoundary: "Eğitim ve referans içeriği · klinik karar desteği değildir",
    unavailableTitle: "Bu bağlantı için kürate edilmiş dossier kaydı bulunamadı",
    unavailableBody: "Katalog kaydının bulunamaması molekülün yokluğu, yeniliği veya sentezlenebilirliği hakkında hüküm üretmez.",
    synthesis: "Sentez dersine git",
    generalSynthesis: "Genel Sentez Akademisi'ne git",
    nomenclature: "Nomenklatür dersine git",
    synthesisAvailable: "Kürate edilmiş sentez dersi mevcut",
    synthesisUnavailable: "İlaç-özel sentez dersi henüz yok",
    nomenclatureAvailable: "İlaç-özel nomenklatür dersi mevcut",
    nomenclatureUnavailable: "İlaç-özel nomenklatür dersi henüz yok",
    comparisonsUnavailable: "Kaynaklandırılmış SAR karşılaştırması henüz yok",
    formula: "FORMÜL",
    molarMass: "MOLAR KÜTLE",
    unavailableSection: "Bu bölümün ilaç-özel içeriği henüz kaynaklandırılmadı.",
    sourcesHint: "Kaynak çekmecesi bilimsel ayrıntıları varsayılan görünümden ayrı tutar.",
    storySteps: ["Kimlik", "Kimya", "Aile", "Hedef ve mekanizma", "Vücuttaki yolculuk", "ADME", "Metabolitler", "Sentez", "Nomenklatür", "Karşılaştırma"],
    tabs: {
      overview: "Genel Bakış",
      chemistry: "Kimya",
      pharmacology: "Farmakoloji",
      adme: "ADME",
      synthesis: "Sentez",
      nomenclature: "Nomenklatür",
      comparisons: "SAR ve Karşılaştırma",
      learning: "Öğrenme görevleri",
      sources: "Kaynaklar",
    },
  },
  en: {
    dossier: "DRUG DOSSIER",
    atlas: "Back to Drug Atlas",
    story: "Story Mode",
    reference: "Reference Mode",
    identityBoundary: "Parent-molecule identity",
    contentCoverage: "Content coverage",
    coverageDescription: "Presence in the catalog does not mean every scientific layer is complete.",
    aliases: "Other names",
    clinicalBoundary: "Education and reference · not clinical decision support",
    unavailableTitle: "No curated dossier record was found for this link",
    unavailableBody: "Absence from the catalog does not establish molecular absence, novelty, or synthesizability.",
    synthesis: "Open synthesis lesson",
    generalSynthesis: "Open general Synthesis Academy",
    nomenclature: "Open nomenclature lesson",
    synthesisAvailable: "A curated synthesis lesson is available",
    synthesisUnavailable: "No drug-specific synthesis lesson is available yet",
    nomenclatureAvailable: "A drug-specific nomenclature lesson is available",
    nomenclatureUnavailable: "No drug-specific nomenclature lesson is available yet",
    comparisonsUnavailable: "No sourced SAR comparison is available yet",
    formula: "FORMULA",
    molarMass: "MOLAR MASS",
    unavailableSection: "Drug-specific content for this section is not sourced yet.",
    sourcesHint: "The sources drawer keeps scientific detail secondary to the default reading view.",
    storySteps: ["Identity", "Chemistry", "Family", "Target and mechanism", "Drug journey", "ADME", "Metabolites", "Synthesis", "Nomenclature", "Comparison"],
    tabs: {
      overview: "Overview",
      chemistry: "Chemistry",
      pharmacology: "Pharmacology",
      adme: "ADME",
      synthesis: "Synthesis",
      nomenclature: "Nomenclature",
      comparisons: "SAR & Comparisons",
      learning: "Learning tasks",
      sources: "Sources",
    },
  },
} as const;

const dimensionLabels: Readonly<Record<DossierCoverageDimension, Readonly<Record<"tr" | "en", string>>>> = {
  identity: { tr: "Kimlik", en: "Identity" },
  structure: { tr: "Yapı", en: "Structure" },
  classification: { tr: "Sınıflandırma", en: "Classification" },
  pharmacology: { tr: "Farmakoloji", en: "Pharmacology" },
  adme: { tr: "ADME", en: "ADME" },
  synthesis: { tr: "Sentez", en: "Synthesis" },
  nomenclature: { tr: "Nomenklatür", en: "Nomenclature" },
  learning: { tr: "Öğrenme", en: "Learning" },
  review: { tr: "İnceleme", en: "Review" },
};

const coverageStatusLabels: Readonly<Record<DossierCoverageStatus, Readonly<Record<"tr" | "en", string>>>> = {
  reviewed: { tr: "İncelendi", en: "Reviewed" },
  "source-supported": { tr: "Kaynak destekli", en: "Source supported" },
  "pending-review": { tr: "İnceleme bekliyor", en: "Pending review" },
  unavailable: { tr: "Henüz yok", en: "Not available" },
};

const referenceTabs: readonly ReferenceTab[] = [
  "overview",
  "chemistry",
  "pharmacology",
  "adme",
  "synthesis",
  "nomenclature",
  "comparisons",
  "learning",
  "sources",
];

function CoverageGrid({ dossier, locale }: { readonly dossier: DrugDossierRecord; readonly locale: "tr" | "en" }) {
  const labels = copy[locale];
  return (
    <section className={styles.coverage} aria-labelledby="dossier-coverage-heading">
      <header>
        <h2 id="dossier-coverage-heading">{labels.contentCoverage}</h2>
        <p>{labels.coverageDescription}</p>
      </header>
      <ul>
        {dossier.coverage.map((item) => (
          <li
            key={item.dimension}
            data-coverage-dimension={item.dimension}
            data-status={item.status}
            title={item.reason}
          >
            <i aria-hidden="true" />
            <div>
              <strong>{dimensionLabels[item.dimension][locale]}</strong>
              <small>{coverageStatusLabels[item.status][locale]}</small>
              <small className={styles.coverageReason}>{item.reason}</small>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClassificationSummary({ dossier, locale }: { readonly dossier: DrugDossierRecord; readonly locale: "tr" | "en" }) {
  const refs = [
    ...dossier.classifications.therapeutic,
    ...dossier.classifications.pharmacological,
    ...dossier.classifications.chemical,
  ];
  return (
    <section className={styles.classificationSummary}>
      <span>{locale === "tr" ? "AİLE VE SINIFLANDIRMA" : "FAMILY & CLASSIFICATION"}</span>
      {refs.length > 0 ? (
        <ul>{refs.map((ref) => <li key={ref.id}>{ref.label.value}</li>)}</ul>
      ) : (
        <p>{dossier.classifications.unavailableReason}</p>
      )}
    </section>
  );
}

function SectionCoverageMessage({
  section,
  eyebrow,
  title,
  message,
  available,
  action,
}: {
  readonly section: "synthesis" | "nomenclature" | "comparisons";
  readonly eyebrow: string;
  readonly title: string;
  readonly message: string;
  readonly available: boolean;
  readonly action?: Readonly<{ label: string; onClick: () => void }>;
}) {
  return (
    <section
      className={styles.sectionCoverageMessage}
      data-coverage-state={available ? "available" : "unavailable"}
      data-empty-coverage={available ? undefined : section}
    >
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {action ? <button type="button" onClick={action.onClick}>{action.label} <i aria-hidden="true">↗</i></button> : null}
    </section>
  );
}

export function DrugDossier({
  moleculeIdOrSlug,
  locale,
  assetBasePath = "/",
  initialMode = "story",
  onBackToAtlas,
  onOpenSynthesis,
  onOpenSynthesisAcademy,
  onOpenNomenclature,
}: DrugDossierProps) {
  const [mode, setMode] = useState<DossierMode>(initialMode);
  const [activeTab, setActiveTab] = useState<ReferenceTab>("overview");
  const tabRefs = useRef(new Map<ReferenceTab, HTMLButtonElement>());
  const dossier = useMemo(
    () => createDrugDossierByIdOrSlug(moleculeIdOrSlug, locale, assetBasePath),
    [assetBasePath, locale, moleculeIdOrSlug],
  );
  const labels = copy[locale];

  if (!dossier) {
    return (
      <section className={styles.unavailableDossier} data-dossier-unavailable="true">
        {onBackToAtlas ? <button type="button" onClick={onBackToAtlas}>← {labels.atlas}</button> : null}
        <span>{labels.dossier}</span>
        <h1>{labels.unavailableTitle}</h1>
        <p>{labels.unavailableBody}</p>
      </section>
    );
  }

  const activeProfile = dossier.admeProfiles[0] ?? null;
  const learningAvailability = getDossierLearningAvailability(dossier);
  const coverageByDimension = new Map(
    dossier.coverage.map((item) => [item.dimension, item]),
  );
  const hasAdmeMeasurements = dossier.admeProfiles.some((profile) =>
    profile.absorption.length > 0 ||
    profile.distribution.length > 0 ||
    profile.metabolism.length > 0 ||
    profile.excretion.length > 0,
  );
  const hasJourneyEvidence = hasAdmeMeasurements ||
    dossier.pharmacology.targets.length > 0 ||
    dossier.pharmacology.pathwayEffects.length > 0;
  const synthesisCoverage = coverageByDimension.get("synthesis");
  const nomenclatureCoverage = coverageByDimension.get("nomenclature");
  const synthesisAction = learningAvailability.synthesis
    ? onOpenSynthesis
      ? { label: labels.synthesis, onClick: () => onOpenSynthesis(dossier.moleculeId) }
      : undefined
    : onOpenSynthesisAcademy
      ? { label: labels.generalSynthesis, onClick: onOpenSynthesisAcademy }
      : undefined;
  const nomenclatureAction = learningAvailability.nomenclature && onOpenNomenclature
    ? { label: labels.nomenclature, onClick: () => onOpenNomenclature(dossier.moleculeId) }
    : undefined;
  const tabAvailability = (tab: ReferenceTab): string => {
    if (dossier.flagship) {
      if (tab === "chemistry") return dossier.flagship.chemistryAnnotations.status;
      if (tab === "synthesis") return dossier.flagship.synthesis.status;
      if (tab === "nomenclature") return dossier.flagship.nomenclature.status;
      if (tab === "comparisons") return dossier.flagship.comparisons.status;
      if (tab === "learning") return dossier.flagship.learning.status;
      if (tab === "sources") return dossier.sources.length > 0 ? "available" : "unavailable";
    }
    if (tab === "pharmacology") return coverageByDimension.get("pharmacology")?.status ?? "unavailable";
    if (tab === "adme") return coverageByDimension.get("adme")?.status ?? "unavailable";
    if (tab === "synthesis") return synthesisCoverage?.status ?? "unavailable";
    if (tab === "nomenclature") return nomenclatureCoverage?.status ?? "unavailable";
    if (tab === "comparisons") return "unavailable";
    if (tab === "learning") return coverageByDimension.get("learning")?.status ?? "unavailable";
    return "available";
  };
  const moveReferenceTab = (
    currentTab: ReferenceTab,
    direction: "previous" | "next" | "first" | "last",
  ) => {
    const currentIndex = referenceTabs.indexOf(currentTab);
    const nextIndex = direction === "first"
      ? 0
      : direction === "last"
        ? referenceTabs.length - 1
        : direction === "previous"
          ? (currentIndex - 1 + referenceTabs.length) % referenceTabs.length
          : (currentIndex + 1) % referenceTabs.length;
    const nextTab = referenceTabs[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current.get(nextTab)?.focus();
  };

  return (
    <article className={styles.dossier} data-dossier-mode={mode} data-molecule-id={dossier.moleculeId}>
      <header className={styles.dossierHeader}>
        <div className={styles.headerActions}>
          {onBackToAtlas ? <button type="button" onClick={onBackToAtlas}>← {labels.atlas}</button> : <span />}
          <div role="group" aria-label={locale === "tr" ? "Dossier görünümü" : "Dossier view"}>
            <button type="button" aria-pressed={mode === "story"} onClick={() => setMode("story")}>{labels.story}</button>
            <button type="button" aria-pressed={mode === "reference"} onClick={() => setMode("reference")}>{labels.reference}</button>
          </div>
        </div>
        <div className={styles.identityHero}>
          <div>
            <span>{labels.dossier} · {labels.identityBoundary}</span>
            <h1>{dossier.preferredName}</h1>
            <p>{dossier.chemistry.systematicName?.value}</p>
            {dossier.aliases.length > 0 ? <small>{labels.aliases}: {dossier.aliases.join(" · ")}</small> : null}
          </div>
          <dl>
            <div><dt>{labels.formula}</dt><dd>{dossier.chemistry.molecularFormula.value}</dd></div>
            <div><dt>{labels.molarMass}</dt><dd>{dossier.chemistry.molecularWeight.value} {dossier.chemistry.molecularWeight.unit}</dd></div>
            <div><dt>PubChem CID</dt><dd>{dossier.sourceRecord.identity.pubChemCid}</dd></div>
          </dl>
        </div>
        <p className={styles.clinicalBoundary}>{labels.clinicalBoundary}</p>
      </header>

      <div className={styles.availabilityOverview} data-dossier-availability="upfront">
        <CoverageGrid dossier={dossier} locale={locale} />
      </div>

      {mode === "story" ? (
        <div className={styles.storyMode}>
          <ol className={styles.storyRail} aria-label={labels.story}>
            {labels.storySteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
          </ol>
          {dossier.flagship ? (
            <FlagshipProductAnchor
              flagship={dossier.flagship}
              sources={dossier.sources}
              locale={locale}
              presentation="story"
            />
          ) : null}
          <ChemistryOverview dossier={dossier} locale={locale} smilesMode="student" />
          {dossier.flagship ? (
            <FlagshipChemistryDetails
              flagship={dossier.flagship}
              sources={dossier.sources}
              locale={locale}
              presentation="story"
              parentSmiles={dossier.chemistry.canonicalSmiles.value}
            />
          ) : null}
          <ClassificationSummary dossier={dossier} locale={locale} />
          {dossier.flagship ? (
            <FlagshipPharmacology dossier={dossier} sources={dossier.sources} locale={locale} presentation="story" />
          ) : <PharmacologyPanel profile={dossier.pharmacology} locale={locale} />}
          {dossier.flagship ? (
            <FlagshipJourney flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="story" />
          ) : hasJourneyEvidence ? <DrugJourney profile={activeProfile} pharmacology={dossier.pharmacology} locale={locale} /> : null}
          <AdmePanel profiles={dossier.admeProfiles} locale={locale} />
          {dossier.metabolites.edges.length > 0 ? <MetaboliteGraph graph={dossier.metabolites} locale={locale} /> : null}
          {dossier.flagship ? (
            <>
              <FlagshipSynthesis flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="story" />
              <FlagshipNomenclature flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="story" parentSmiles={dossier.chemistry.canonicalSmiles.value} />
              <FlagshipComparisons flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="story" />
              <FlagshipLearningTasks flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="story" />
            </>
          ) : (
            <SectionCoverageMessage
              section="synthesis"
              eyebrow={labels.tabs.synthesis}
              title={learningAvailability.synthesis ? labels.synthesisAvailable : labels.synthesisUnavailable}
              message={synthesisCoverage?.reason ?? labels.unavailableSection}
              available={learningAvailability.synthesis}
              action={synthesisAction}
            />
          )}
        </div>
      ) : (
        <div className={styles.referenceMode}>
          {dossier.flagship ? (
            <ReferenceDossierExport
              className={styles.referenceExport}
              dossier={dossier}
              locale={locale}
            />
          ) : null}
          <div className={styles.referenceTabs} aria-label={labels.reference} role="tablist">
            {referenceTabs.map((tab) => (
              <button
                key={tab}
                ref={(element) => {
                  if (element) tabRefs.current.set(tab, element);
                  else tabRefs.current.delete(tab);
                }}
                type="button"
                id={`dossier-reference-tab-${tab}`}
                role="tab"
                aria-controls="dossier-reference-panel"
                aria-selected={activeTab === tab}
                data-tab-availability={tabAvailability(tab)}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") moveReferenceTab(tab, "previous");
                  else if (event.key === "ArrowRight") moveReferenceTab(tab, "next");
                  else if (event.key === "Home") moveReferenceTab(tab, "first");
                  else if (event.key === "End") moveReferenceTab(tab, "last");
                  else return;
                  event.preventDefault();
                }}
              >
                {labels.tabs[tab]}
              </button>
            ))}
          </div>
          <div
            className={styles.referencePanel}
            data-reference-tab={activeTab}
            id="dossier-reference-panel"
            role="tabpanel"
            aria-labelledby={`dossier-reference-tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === "overview" ? (
              <>
                {dossier.flagship ? <FlagshipProductAnchor flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" /> : null}
                <ChemistryOverview dossier={dossier} locale={locale} compact smilesMode="story" />
                {dossier.flagship ? <FlagshipChemistryDetails flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" parentSmiles={dossier.chemistry.canonicalSmiles.value} /> : null}
                <ClassificationSummary dossier={dossier} locale={locale} />
                {dossier.flagship ? <FlagshipExplicitMissing flagship={dossier.flagship} locale={locale} /> : null}
              </>
            ) : null}
            {activeTab === "chemistry" ? (
              <>
                <ChemistryOverview dossier={dossier} locale={locale} smilesMode="reference" />
                {dossier.flagship ? <FlagshipChemistryDetails flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" parentSmiles={dossier.chemistry.canonicalSmiles.value} /> : null}
              </>
            ) : null}
            {activeTab === "pharmacology" ? (
              dossier.flagship
                ? <FlagshipPharmacology dossier={dossier} sources={dossier.sources} locale={locale} presentation="reference" />
                : <PharmacologyPanel profile={dossier.pharmacology} locale={locale} />
            ) : null}
            {activeTab === "adme" ? (
              dossier.flagship ? (
                <>
                  <FlagshipJourney flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" />
                  <FlagshipAdmeReference dossier={dossier} sources={dossier.sources} locale={locale} />
                  {dossier.metabolites.edges.length > 0 ? <MetaboliteGraph graph={dossier.metabolites} locale={locale} /> : null}
                </>
              ) : <><AdmePanel profiles={dossier.admeProfiles} locale={locale} expert />{hasJourneyEvidence ? <DrugJourney profile={activeProfile} pharmacology={dossier.pharmacology} locale={locale} /> : null}{dossier.metabolites.edges.length > 0 ? <MetaboliteGraph graph={dossier.metabolites} locale={locale} /> : null}</>
            ) : null}
            {activeTab === "synthesis" ? (
              dossier.flagship
                ? <FlagshipSynthesis flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" />
                : <SectionCoverageMessage section="synthesis" eyebrow={labels.tabs.synthesis} title={learningAvailability.synthesis ? labels.synthesisAvailable : labels.synthesisUnavailable} message={synthesisCoverage?.reason ?? labels.unavailableSection} available={learningAvailability.synthesis} action={synthesisAction} />
            ) : null}
            {activeTab === "nomenclature" ? (
              dossier.flagship
                ? <FlagshipNomenclature flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" parentSmiles={dossier.chemistry.canonicalSmiles.value} />
                : <SectionCoverageMessage section="nomenclature" eyebrow={labels.tabs.nomenclature} title={learningAvailability.nomenclature ? labels.nomenclatureAvailable : labels.nomenclatureUnavailable} message={nomenclatureCoverage?.reason ?? labels.unavailableSection} available={learningAvailability.nomenclature} action={nomenclatureAction} />
            ) : null}
            {activeTab === "comparisons" ? (
              dossier.flagship
                ? <FlagshipComparisons flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" />
                : <SectionCoverageMessage section="comparisons" eyebrow={labels.tabs.comparisons} title={labels.comparisonsUnavailable} message={labels.unavailableSection} available={false} />
            ) : null}
            {activeTab === "learning" && dossier.flagship ? <FlagshipLearningTasks flagship={dossier.flagship} sources={dossier.sources} locale={locale} presentation="reference" /> : null}
            {activeTab === "sources" ? <section className={styles.sourcesTab}><p>{labels.sourcesHint}</p><SourcesDrawer sources={dossier.sources} locale={locale} technical /></section> : null}
          </div>
        </div>
      )}

      <footer className={styles.dossierFooter}>
        {mode === "reference" && activeTab === "sources"
          ? null
          : <SourcesDrawer sources={dossier.sources} locale={locale} technical={mode === "reference"} />}
        <ul>{dossier.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </footer>
    </article>
  );
}

export default DrugDossier;
