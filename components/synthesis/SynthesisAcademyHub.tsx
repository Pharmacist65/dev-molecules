"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type { IndexedCatalogHit } from "@/lib/application/catalog-expansion";
import type { SynthesisCatalogSelection } from "@/lib/application/synthesis-catalog";
import { loadPublishedSynthesisRouteCount } from "@/lib/application/published-synthesis-route";
import { useI18n, type Locale } from "@/lib/i18n";

import styles from "./SynthesisAcademyHub.module.css";

const LazySynthesisAtlas = lazy(async () => {
  const atlasComponent = await import("@/components/platform/SynthesisAtlas");
  return { default: atlasComponent.SynthesisAtlas };
});

export type SynthesisAcademyHubView = "curriculum" | "atlas";

export interface SynthesisAcademyHubProps {
  readonly locale?: Locale;
  readonly selectedMoleculeId?: string;
  readonly initialMoleculeId?: string;
  readonly initialView?: SynthesisAcademyHubView;
  readonly presentationMode?: "student" | "reviewer";
  readonly catalogRecordCount?: number;
  readonly assetBasePath?: string;
  readonly catalogSelection?: SynthesisCatalogSelection | null;
  readonly searchCatalog?: (
    query: string,
    limit?: number,
  ) => Promise<readonly IndexedCatalogHit[]>;
  readonly onSelectCatalogRecord?: (record: IndexedCatalogHit) => void;
  readonly onSelectMolecule?: (moleculeId: string) => void;
  readonly onOpenMoleculeFocus: (moleculeId: string) => void;
  readonly onOpenDrugDossier?: (moleculeId: string) => void;
  readonly onBackToAcademy?: () => void;
  readonly className?: string;
}

const copy = {
  tr: {
    eyebrow: "Academy · Sentez",
    title: "Sentez kanıtını, yayın sınırlarıyla incele.",
    description: "Her kesin molekül kimliği için kaynak araştırmasının kapsamını ve sonucunu gösteren; incelemesi tamamlanmamış rota ayrıntılarını yayımlamayan öğrenme alanı.",
    boundary: "Eğitim görünümü · miktar, ölçek, ayrıntılı work-up veya üretim protokolü içermez",
    back: "Academy’ye dön",
    curriculum: "Sentez kapsamı",
    atlas: "Kanıt atlası",
    curriculumHint: "Katalog genelinde araştırma ve yayın sınırı",
    atlasHint: "Kesin kimlik → kapsam kaydı",
    coverage: "Sentez kanıtı kapsamı",
    labTitle: "Sentez kanıtı atlası",
    labDescription: "Kesin katalog kimliğinin kanıt kapsamını aç. Rota ayrıntısı yalnız doğrulanmış, yayımlanabilir bir artifact üzerinden sunulabilir.",
    changeSelection: "Sentez kapsamına dön",
    loading: "Sentez kanıtı yükleniyor…",
    unavailable: "Doğrulanmış sentez kapsam kaydı yüklenemedi.",
    catalogSearchLabel: "Katalog genelinde sentez kapsamını ara",
    catalogSearchPlaceholder: "İsim, eş ad, formül veya PubChem CID",
    catalogSearchAction: "Kapsamda ara",
    catalogSearchHint: "Her katalog kimliği bir sentez kanıtı kapsam kaydı açar; rota ayrıntısı yalnız bilimsel inceleme ve yeniden kullanım izni tamamlanmış artifact’tan yüklenebilir.",
    catalogSearching: "Sentez kapsamı aranıyor…",
    catalogNoResults: "Bu sorguyla eşleşen katalog kimliği bulunamadı.",
    catalogSearchError: "Katalog araması şu anda kullanılamıyor.",
    selectedCoverage: "Seçili sentez kapsamı",
    publicCoverageTitle: "{count} kesin katalog kimliğinin her biri açık bir sentez değerlendirmesine bağlı.",
    publicCoverageBody: "Aday kaynak değerlendirmeleri, erişim engelleri ve araştırma kapsamında destekleyici kaynak bulunamadığı durumlar sessiz boşluk bırakmadan gösterilir. Bilimsel incelemesi tamamlanmamış rotaların reaksiyon dizisi ve tamlık bilgisi istemci paketine alınmaz.",
    catalogIdentities: "Katalog kimliği",
    identityMatch: "Kimlik eşleşmesi",
    exact: "Kesin",
    reviewGate: "Bilimsel inceleme",
    reuseGate: "Yeniden kullanım",
    required: "Zorunlu",
    selectedIdentityTitle: "Bu kimliğin kanıt kaydını aç",
    selectedIdentityBody: "Arama kapsamını ve sonuçlandırılmış kaynak değerlendirmelerini incele; yayımlanabilir rota yoksa sistem bunu açıkça söyler ve molekül yapısına dönüş yolunu korur.",
    openCoverage: "Sentez kanıtını aç",
    publishedRouteDetails: "yayımlanmış rota ayrıntısı",
    publishedRouteCountUnavailable: "Yayın indeksi doğrulanamadı",
  },
  en: {
    eyebrow: "Academy · Synthesis",
    title: "Inspect synthesis evidence with publication boundaries intact.",
    description: "A learning space that reports source-search coverage for every exact molecular identity without publishing route detail that has not passed review.",
    boundary: "Teaching view · no quantities, scale, detailed work-up, or manufacturing protocol",
    back: "Back to Academy",
    curriculum: "Synthesis coverage",
    atlas: "Evidence atlas",
    curriculumHint: "Catalog-wide research and publication boundaries",
    atlasHint: "Exact identity → coverage record",
    coverage: "Synthesis evidence coverage",
    labTitle: "Synthesis evidence atlas",
    labDescription: "Open evidence coverage for an exact catalog identity. Route detail may appear only from a validated, publishable generated artifact.",
    changeSelection: "Back to synthesis coverage",
    loading: "Loading synthesis evidence…",
    unavailable: "A validated synthesis coverage record could not be loaded.",
    catalogSearchLabel: "Search synthesis coverage across the catalog",
    catalogSearchPlaceholder: "Name, alias, formula, or PubChem CID",
    catalogSearchAction: "Search coverage",
    catalogSearchHint: "Every catalog identity opens a synthesis coverage record; route detail can load only from an artifact that has passed scientific review and reuse permission.",
    catalogSearching: "Searching synthesis coverage…",
    catalogNoResults: "No catalog identity matched this query.",
    catalogSearchError: "Catalog search is currently unavailable.",
    selectedCoverage: "Selected synthesis coverage",
    publicCoverageTitle: "All {count} exact catalog identities are connected to an explicit synthesis assessment.",
    publicCoverageBody: "Candidate-source assessments, access barriers, and scoped no-support results remain visible without silent blanks. Unreviewed reaction sequences and completeness are excluded from the client bundle.",
    catalogIdentities: "Catalog identities",
    identityMatch: "Identity match",
    exact: "Exact",
    reviewGate: "Scientific review",
    reuseGate: "Reuse permission",
    required: "Required",
    selectedIdentityTitle: "Open this identity's evidence record",
    selectedIdentityBody: "Inspect search scope and completed source assessments. If no route is publishable, the system says so explicitly and preserves a path back to the molecular structure.",
    openCoverage: "Open synthesis evidence",
    publishedRouteDetails: "published route details",
    publishedRouteCountUnavailable: "Publication index unavailable",
  },
} as const;

const joinClassNames = (...values: readonly (string | undefined)[]) =>
  values.filter(Boolean).join(" ");

const interpolate = (
  template: string,
  values: Readonly<Record<string, string | number>>,
) => Object.entries(values).reduce(
  (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
  template,
);

export function SynthesisAcademyHub({
  locale: localeOverride,
  initialView = "curriculum",
  presentationMode = "student",
  catalogRecordCount = 1552,
  assetBasePath,
  catalogSelection,
  searchCatalog,
  onSelectCatalogRecord,
  onOpenMoleculeFocus,
  onBackToAcademy,
  className,
}: SynthesisAcademyHubProps) {
  const { locale: contextLocale } = useI18n();
  const locale = localeOverride ?? contextLocale;
  const labels = copy[locale];
  const [view, setView] = useState<SynthesisAcademyHubView>(initialView);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<readonly IndexedCatalogHit[]>([]);
  const [catalogSearchState, setCatalogSearchState] = useState<
    "idle" | "searching" | "ready" | "empty" | "error"
  >("idle");
  const [publishedRouteCount, setPublishedRouteCount] = useState<number | null>(null);
  const [publishedRouteCountState, setPublishedRouteCountState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");

  useEffect(() => {
    let active = true;
    void loadPublishedSynthesisRouteCount({ assetBasePath })
      .then((count) => {
        if (!active) return;
        setPublishedRouteCount(count);
        setPublishedRouteCountState("ready");
      })
      .catch(() => {
        if (!active) return;
        setPublishedRouteCount(null);
        setPublishedRouteCountState("unavailable");
      });
    return () => {
      active = false;
    };
  }, [assetBasePath]);

  async function submitCatalogSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = catalogQuery.trim();
    if (!query || !searchCatalog) return;
    setCatalogSearchState("searching");
    try {
      const results = await searchCatalog(query, 10);
      setCatalogResults(results);
      setCatalogSearchState(results.length > 0 ? "ready" : "empty");
    } catch {
      setCatalogResults([]);
      setCatalogSearchState("error");
    }
  }

  return (
    <section
      className={joinClassNames(styles.hub, className)}
      data-synthesis-academy="phase-6"
      data-published-route-details={publishedRouteCount ?? publishedRouteCountState}
      data-catalog-records={catalogRecordCount}
    >
      <header className={styles.hero}>
        <div className={styles.heroTopline}>
          {onBackToAcademy ? (
            <button type="button" className={styles.backButton} onClick={onBackToAcademy}>
              <span aria-hidden="true">←</span> {labels.back}
            </button>
          ) : <span />}
          <span className={styles.boundary}>{labels.boundary}</span>
        </div>
        <div className={styles.heroBody}>
          <div>
            <span className={styles.eyebrow}>{labels.eyebrow}</span>
            <h1>{labels.title}</h1>
            <p>{labels.description}</p>
          </div>
          <div
            className={styles.targetDial}
            aria-live="polite"
            aria-label={publishedRouteCount === null
              ? labels.publishedRouteCountUnavailable
              : `${publishedRouteCount} ${labels.publishedRouteDetails}`}
          >
            <strong>{publishedRouteCount === null ? "—" : String(publishedRouteCount).padStart(2, "0")}</strong>
            <span>/ {catalogRecordCount.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</span>
            <small>{labels.publishedRouteDetails}</small>
          </div>
        </div>
      </header>

      <nav className={styles.viewTabs} aria-label={labels.eyebrow}>
        <button
          type="button"
          role="tab"
          aria-selected={view === "curriculum"}
          aria-controls="synthesis-curriculum-panel"
          onClick={() => setView("curriculum")}
        >
          <strong>{labels.curriculum}</strong>
          <span>{labels.curriculumHint}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "atlas"}
          aria-controls="synthesis-atlas-panel"
          disabled={!catalogSelection}
          onClick={() => setView("atlas")}
        >
          <strong>{labels.atlas}</strong>
          <span>{labels.atlasHint}</span>
        </button>
      </nav>

      {searchCatalog && onSelectCatalogRecord ? (
        <section
          className={styles.catalogNavigator}
          aria-labelledby="synthesis-catalog-search-heading"
          data-synthesis-catalog-navigator="complete-index"
          data-catalog-record-count={catalogRecordCount}
        >
          <div className={styles.catalogSearchIntro}>
            <div>
              <span className={styles.sectionLabel}>{labels.selectedCoverage}</span>
              <h2 id="synthesis-catalog-search-heading">{labels.catalogSearchLabel}</h2>
              <p>{labels.catalogSearchHint}</p>
            </div>
            {catalogSelection ? (
              <aside data-selected-synthesis-catalog-identity={catalogSelection.catalogEntityId}>
                <span>{labels.selectedCoverage}</span>
                <strong>{catalogSelection.preferredName}</strong>
                <small>{catalogSelection.molecularFormula} · CID {catalogSelection.pubChemCid}</small>
              </aside>
            ) : null}
          </div>
          <form onSubmit={submitCatalogSearch} role="search">
            <label htmlFor="synthesis-catalog-query">{labels.catalogSearchPlaceholder}</label>
            <div>
              <input
                id="synthesis-catalog-query"
                type="search"
                value={catalogQuery}
                placeholder={labels.catalogSearchPlaceholder}
                autoComplete="off"
                onChange={(event) => setCatalogQuery(event.currentTarget.value)}
              />
              <button type="submit" disabled={catalogSearchState === "searching" || !catalogQuery.trim()}>
                {labels.catalogSearchAction}
              </button>
            </div>
          </form>
          {catalogSearchState === "searching" ? <p role="status">{labels.catalogSearching}</p> : null}
          {catalogSearchState === "empty" ? <p role="status">{labels.catalogNoResults}</p> : null}
          {catalogSearchState === "error" ? <p role="alert">{labels.catalogSearchError}</p> : null}
          {catalogResults.length > 0 ? (
            <ul className={styles.catalogResults}>
              {catalogResults.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCatalogRecord(result);
                      setCatalogResults([]);
                      setCatalogSearchState("idle");
                    }}
                  >
                    <strong>{result.preferredName}</strong>
                    <span>{result.formula} · CID {result.pubChemCid}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {view === "curriculum" ? (
        <div
          id="synthesis-curriculum-panel"
          role="tabpanel"
          className={styles.curriculumPanel}
          data-synthesis-public-coverage-only="true"
          data-presentation-mode={presentationMode}
        >
          <section className={styles.coverageIntro} aria-labelledby="synthesis-coverage-heading">
            <div>
              <span className={styles.sectionLabel}>{labels.coverage}</span>
              <h2 id="synthesis-coverage-heading">
                {interpolate(labels.publicCoverageTitle, {
                  count: catalogRecordCount.toLocaleString(locale === "tr" ? "tr-TR" : "en-US"),
                })}
              </h2>
              <p>{labels.publicCoverageBody}</p>
            </div>
            <dl className={styles.metrics}>
              <div><dt>{labels.catalogIdentities}</dt><dd>{catalogRecordCount.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</dd></div>
              <div><dt>{labels.identityMatch}</dt><dd>{labels.exact}</dd></div>
              <div><dt>{labels.reviewGate}</dt><dd>{labels.required}</dd></div>
              <div><dt>{labels.reuseGate}</dt><dd>{labels.required}</dd></div>
            </dl>
          </section>
          {catalogSelection ? (
            <section className={styles.publicCoverageSelection} data-public-synthesis-selection={catalogSelection.catalogEntityId}>
              <div>
                <span className={styles.sectionLabel}>{labels.selectedCoverage}</span>
                <h2>{labels.selectedIdentityTitle}</h2>
                <p>{labels.selectedIdentityBody}</p>
              </div>
              <aside>
                <strong>{catalogSelection.preferredName}</strong>
                <span>{catalogSelection.molecularFormula} · CID {catalogSelection.pubChemCid}</span>
                <button type="button" onClick={() => setView("atlas")}>
                  {labels.openCoverage} <span aria-hidden="true">→</span>
                </button>
              </aside>
            </section>
          ) : null}
        </div>
      ) : (
        <section id="synthesis-atlas-panel" role="tabpanel" className={styles.atlasPanel}>
          <header className={styles.labHeader}>
            <div>
              <span className={styles.sectionLabel}>{labels.atlas}</span>
              <h2>{labels.labTitle}</h2>
              <p>{labels.labDescription}</p>
            </div>
            <button type="button" onClick={() => setView("curriculum")}>{labels.changeSelection}</button>
          </header>
          {catalogSelection ? (
            <Suspense fallback={<div className={styles.loading} role="status">{labels.loading}</div>}>
              <LazySynthesisAtlas
                catalogSelection={catalogSelection}
                onSelectMolecule={() => undefined}
                onOpenMoleculeFocus={onOpenMoleculeFocus}
                presentationMode={presentationMode}
              />
            </Suspense>
          ) : (
            <p className={styles.loading}>{labels.unavailable}</p>
          )}
        </section>
      )}
    </section>
  );
}

export default SynthesisAcademyHub;
