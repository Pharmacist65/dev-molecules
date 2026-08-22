"use client";

import { useMemo, useState } from "react";

import { AdmePanel, DrugJourney, MetaboliteGraph } from "@/components/adme";
import { PharmacologyPanel } from "@/components/pharmacology";
import { createDrugDossierByIdOrSlug } from "@/lib/application/dossier";
import type {
  DossierCoverageDimension,
  DossierCoverageStatus,
  DossierMode,
  DrugDossierRecord,
} from "@/lib/domain/dossier";

import { ChemistryOverview } from "./ChemistryOverview";
import { SourcesDrawer } from "./SourcesDrawer";
import styles from "./DrugDossier.module.css";

export interface DrugDossierProps {
  readonly moleculeIdOrSlug: string;
  readonly locale: "tr" | "en";
  readonly assetBasePath?: string;
  readonly initialMode?: DossierMode;
  readonly onBackToAtlas?: () => void;
  readonly onOpenSynthesis?: (moleculeId: string) => void;
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
    learningTitle: "Molekülden derse geç",
    learningBody: "Yalnız çalışan ve kaynak sınırı tanımlı öğrenme alanları açılır.",
    synthesis: "Sentez dersine git",
    nomenclature: "Nomenklatür dersine git",
    unavailableSection: "Bu bölümün ilaç-özel içeriği henüz kaynaklandırılmadı.",
    sourcesHint: "Kaynak drawer'ı bilimsel ayrıntıları varsayılan görünümden ayrı tutar.",
    storySteps: ["Kimlik", "Kimya", "Aile", "Hedef ve mekanizma", "Vücuttaki yolculuk", "ADME", "Metabolitler", "Sentez", "Nomenklatür", "Karşılaştırma"],
    tabs: {
      overview: "Genel Bakış",
      chemistry: "Kimya",
      pharmacology: "Farmakoloji",
      adme: "ADME",
      synthesis: "Sentez",
      nomenclature: "Nomenklatür",
      comparisons: "SAR ve Karşılaştırma",
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
    learningTitle: "Move from molecule to lesson",
    learningBody: "Only working learning areas with explicit source boundaries are opened.",
    synthesis: "Open synthesis lesson",
    nomenclature: "Open nomenclature lesson",
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
          <li key={item.dimension} data-status={item.status} title={item.reason}>
            <i aria-hidden="true" />
            <div>
              <strong>{dimensionLabels[item.dimension][locale]}</strong>
              <small>{coverageStatusLabels[item.status][locale]}</small>
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

function LearningLinks({
  dossier,
  locale,
  onOpenSynthesis,
  onOpenNomenclature,
}: {
  readonly dossier: DrugDossierRecord;
  readonly locale: "tr" | "en";
  readonly onOpenSynthesis?: (moleculeId: string) => void;
  readonly onOpenNomenclature?: (moleculeId: string) => void;
}) {
  const labels = copy[locale];
  return (
    <section className={styles.learningLinks}>
      <div>
        <span>{locale === "tr" ? "İLGİLİ DERSLER" : "RELATED LESSONS"}</span>
        <h2>{labels.learningTitle}</h2>
        <p>{labels.learningBody}</p>
      </div>
      <div>
        {onOpenSynthesis ? <button type="button" onClick={() => onOpenSynthesis(dossier.moleculeId)}>{labels.synthesis} <i>↗</i></button> : null}
        {onOpenNomenclature ? <button type="button" onClick={() => onOpenNomenclature(dossier.moleculeId)}>{labels.nomenclature} <i>↗</i></button> : null}
      </div>
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
  onOpenNomenclature,
}: DrugDossierProps) {
  const [mode, setMode] = useState<DossierMode>(initialMode);
  const [activeTab, setActiveTab] = useState<ReferenceTab>("overview");
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
            <div><dt>FORMULA</dt><dd>{dossier.chemistry.molecularFormula.value}</dd></div>
            <div><dt>MOLAR MASS</dt><dd>{dossier.chemistry.molecularWeight.value} {dossier.chemistry.molecularWeight.unit}</dd></div>
            <div><dt>PubChem CID</dt><dd>{dossier.sourceRecord.identity.pubChemCid}</dd></div>
          </dl>
        </div>
        <p className={styles.clinicalBoundary}>{labels.clinicalBoundary}</p>
      </header>

      {mode === "story" ? (
        <div className={styles.storyMode}>
          <ol className={styles.storyRail} aria-label={labels.story}>
            {labels.storySteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
          </ol>
          <ChemistryOverview dossier={dossier} locale={locale} />
          <ClassificationSummary dossier={dossier} locale={locale} />
          <PharmacologyPanel profile={dossier.pharmacology} locale={locale} />
          <DrugJourney profile={activeProfile} pharmacology={dossier.pharmacology} locale={locale} />
          <AdmePanel profiles={dossier.admeProfiles} locale={locale} />
          <MetaboliteGraph graph={dossier.metabolites} locale={locale} />
          <LearningLinks dossier={dossier} locale={locale} onOpenSynthesis={onOpenSynthesis} onOpenNomenclature={onOpenNomenclature} />
          <CoverageGrid dossier={dossier} locale={locale} />
        </div>
      ) : (
        <div className={styles.referenceMode}>
          <nav className={styles.referenceTabs} aria-label={labels.reference}>
            {referenceTabs.map((tab) => (
              <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)}>{labels.tabs[tab]}</button>
            ))}
          </nav>
          <div className={styles.referencePanel} data-reference-tab={activeTab}>
            {activeTab === "overview" ? <><ChemistryOverview dossier={dossier} locale={locale} compact /><ClassificationSummary dossier={dossier} locale={locale} /><CoverageGrid dossier={dossier} locale={locale} /></> : null}
            {activeTab === "chemistry" ? <ChemistryOverview dossier={dossier} locale={locale} /> : null}
            {activeTab === "pharmacology" ? <PharmacologyPanel profile={dossier.pharmacology} locale={locale} /> : null}
            {activeTab === "adme" ? <><AdmePanel profiles={dossier.admeProfiles} locale={locale} expert /><DrugJourney profile={activeProfile} pharmacology={dossier.pharmacology} locale={locale} /><MetaboliteGraph graph={dossier.metabolites} locale={locale} /></> : null}
            {activeTab === "synthesis" || activeTab === "nomenclature" || activeTab === "comparisons" ? (
              <section className={styles.referenceUnavailable}><span>{labels.tabs[activeTab]}</span><p>{labels.unavailableSection}</p><LearningLinks dossier={dossier} locale={locale} onOpenSynthesis={onOpenSynthesis} onOpenNomenclature={onOpenNomenclature} /></section>
            ) : null}
            {activeTab === "sources" ? <section className={styles.sourcesTab}><p>{labels.sourcesHint}</p><SourcesDrawer sources={dossier.sources} locale={locale} /></section> : null}
          </div>
        </div>
      )}

      <footer className={styles.dossierFooter}>
        <SourcesDrawer sources={dossier.sources} locale={locale} />
        <ul>{dossier.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </footer>
    </article>
  );
}

export default DrugDossier;
