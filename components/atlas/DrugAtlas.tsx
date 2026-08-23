"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  DEFAULT_CATALOG_BROWSE_PAGE_SIZE,
  normalizeCatalogBrowseQuery,
} from "@/lib/application/catalog-browse";
import {
  getAvailableAtlasFilterFacets,
  loadDrugAtlasWindow,
  type AtlasCoverageResolver,
  type AtlasFilterAdapter,
  type AtlasFilterSelection,
  type DrugAtlasView,
  type DrugAtlasWindow,
} from "@/lib/application/drug-atlas";
import type { Locale } from "@/lib/i18n";

import { AtlasStructureThumbnail } from "./AtlasStructureThumbnail";
import styles from "./DrugAtlas.module.css";
import type { AtlasCatalogNavigator, AtlasSpatialConfiguration } from "./types";

const LazyAtlasSpatialView = lazy(() => import("./AtlasSpatialView"));

type LoadState =
  | { readonly status: "loading"; readonly page: DrugAtlasWindow | null }
  | { readonly status: "ready"; readonly page: DrugAtlasWindow }
  | { readonly status: "error"; readonly page: null };

const copyByLocale = {
  tr: {
    eyebrow: "Yaşayan Moleküler Atlas",
    title: "İlaç Atlası",
    description: "Seçilmiş DrugCentral FDA-listesi kaynak kesitindeki 2.331 satırın tamamından kesin kimlik ve eksiksiz 2B/3B yapı eşlemesiyle çözülen 1.552 moleküler kaydı ara. Bu indeks FDA ürün veya başvuru evreni değildir.",
    browse: "Göz at",
    spatial: "Mekânsal",
    browseDescription: "1.552 yapı-bütün indeks kaydı · alfabetik, sayfalı ve klavye erişilebilir",
    spatialDescription: "Sınırlı temsilî 3B örneklem",
    searchLabel: "1.552 yapı-bütün indeks kaydında ara",
    searchPlaceholder: "İlaç adı, etken madde, formül veya CID",
    clear: "Aramayı temizle",
    allRecords: "Yapı-bütün indeks",
    filters: "Kaynaklı filtreler",
    all: "Tümü",
    loading: "Katalog indeksi yükleniyor…",
    unavailable: "Katalog şu anda yüklenemedi.",
    retry: "Yeniden dene",
    queryHint: "Aramak için en az iki karakter yaz.",
    empty: "Yapı-bütün indekste eşleşme bulunamadı.",
    previous: "Önceki",
    next: "Sonraki",
    resultRange: "{start}–{end} / {total} kayıt",
    resultSearch: "{shown} sonuç · yapı-bütün indekste {total} kayıt",
    classification: "Sınıf",
    coverage: "İçerik kapsamı",
    identityCoverage: "Kimlik ve yapı indeksli",
    openDrug: "İlaç dosyasını aç",
    thumbnailWaiting: "2B sırada",
    thumbnailLoading: "2B yükleniyor",
    thumbnailMissing: "2B yok",
    thumbnailUnavailable: "2B açılamadı",
    spatialLoading: "Mekânsal atlas yükleniyor…",
    spatialUnavailable: "Bu yayında 3B örneklem yapılandırılmadı.",
    spatialScope: "3B örneklem",
    spatialBoundary: "FDA ürün veya başvuru evreni değildir; sahne 1.552 kayıtlık yapı-bütün indeksten yalnız temsilî yapıları yükler.",
  },
  en: {
    eyebrow: "Living Molecular Atlas",
    title: "Drug Atlas",
    description: "Search 1,552 molecular records resolved by exact identity and complete 2D/3D structure matching from all 2,331 rows in the selected DrugCentral FDA-list source slice. This index is not an FDA product or application universe.",
    browse: "Browse",
    spatial: "Spatial",
    browseDescription: "1,552 structure-complete index records · alphabetic, paginated, keyboard accessible",
    spatialDescription: "Bounded representative 3D sample",
    searchLabel: "Search 1,552 structure-complete index records",
    searchPlaceholder: "Drug, active ingredient, formula, or CID",
    clear: "Clear search",
    allRecords: "Structure-complete index",
    filters: "Source-backed filters",
    all: "All",
    loading: "Loading the catalog index…",
    unavailable: "The catalog could not be loaded.",
    retry: "Try again",
    queryHint: "Enter at least two characters to search.",
    empty: "No match was found in the structure-complete index.",
    previous: "Previous",
    next: "Next",
    resultRange: "Records {start}–{end} of {total}",
    resultSearch: "{shown} results · {total} records in the structure-complete index",
    classification: "Class",
    coverage: "Content coverage",
    identityCoverage: "Identity and structure indexed",
    openDrug: "Open drug dossier",
    thumbnailWaiting: "2D queued",
    thumbnailLoading: "Loading 2D",
    thumbnailMissing: "No 2D",
    thumbnailUnavailable: "2D unavailable",
    spatialLoading: "Loading the spatial atlas…",
    spatialUnavailable: "No 3D sample is configured in this publication.",
    spatialScope: "3D sample",
    spatialBoundary: "This is not an FDA product or application universe; the scene loads only representative structures from the 1,552-record structure-complete index.",
  },
} as const;

const interpolate = (
  template: string,
  values: Readonly<Record<string, string | number>>,
) => Object.entries(values).reduce(
  (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
  template,
);

const formatCount = (value: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(value);

export interface DrugAtlasProps {
  readonly navigator: AtlasCatalogNavigator;
  readonly locale?: Locale;
  readonly view?: DrugAtlasView;
  readonly defaultView?: DrugAtlasView;
  readonly onViewChange?: (view: DrugAtlasView) => void;
  readonly catalogRecordCount?: number;
  readonly pageSize?: number;
  readonly assetBasePath?: string;
  readonly resolveCoverage?: AtlasCoverageResolver;
  readonly filterAdapter?: AtlasFilterAdapter;
  readonly spatial?: AtlasSpatialConfiguration;
  readonly getDrugHref?: (record: DrugAtlasWindow["records"][number]) => string;
  readonly onDrugSelect?: (
    record: DrugAtlasWindow["records"][number],
  ) => void | Promise<void>;
  readonly className?: string;
}

export function DrugAtlas({
  navigator,
  locale = "en",
  view: controlledView,
  defaultView = "browse",
  onViewChange,
  catalogRecordCount,
  pageSize = DEFAULT_CATALOG_BROWSE_PAGE_SIZE,
  assetBasePath = "/",
  resolveCoverage,
  filterAdapter,
  spatial,
  getDrugHref = (record) => `#drug/${encodeURIComponent(record.stableSlug)}`,
  onDrugSelect,
  className,
}: DrugAtlasProps) {
  const copy = copyByLocale[locale];
  const searchId = useId();
  const resultsId = useId();
  const [internalView, setInternalView] = useState<DrugAtlasView>(defaultView);
  const activeView = controlledView ?? internalView;
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [retryRevision, setRetryRevision] = useState(0);
  const [filters, setFilters] = useState<AtlasFilterSelection>({});
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading", page: null });
  const requestSequenceRef = useRef(0);
  const recordRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const facets = useMemo(
    () => getAvailableAtlasFilterFacets(filterAdapter?.facets),
    [filterAdapter?.facets],
  );

  useEffect(() => {
    if (activeView !== "browse") return undefined;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    const normalized = normalizeCatalogBrowseQuery(query);
    const timer = window.setTimeout(() => {
      setLoadState((current) => ({
        status: "loading",
        page: current.status === "error" ? null : current.page,
      }));
      const request = filterAdapter && Object.keys(filters).length > 0
        ? filterAdapter.loadWindow({ query, offset, pageSize, filters })
        : loadDrugAtlasWindow(navigator, {
            query,
            offset,
            pageSize,
            catalogRecordCount,
            unclassifiedLabel: locale === "tr" ? "Sınıflandırılmamış" : "Unclassified",
            identityCoverageLabel: copy.identityCoverage,
            resolveCoverage,
          });
      void request
        .then((page) => {
          if (requestSequence === requestSequenceRef.current) {
            setLoadState({ status: "ready", page });
          }
        })
        .catch(() => {
          if (requestSequence === requestSequenceRef.current) {
            setLoadState({
              status: "error",
              page: null,
            });
          }
        });
    }, normalized.length >= 2 ? 180 : 0);
    return () => {
      window.clearTimeout(timer);
      if (requestSequenceRef.current === requestSequence) {
        requestSequenceRef.current += 1;
      }
    };
  }, [activeView, catalogRecordCount, copy.identityCoverage, copy.unavailable, filterAdapter, filters, locale, navigator, offset, pageSize, query, resolveCoverage, retryRevision]);

  const changeView = (next: DrugAtlasView) => {
    if (controlledView === undefined) setInternalView(next);
    onViewChange?.(next);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    changeView(activeView === "browse" ? "spatial" : "browse");
  };

  const updateQuery = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.currentTarget.value);
    setOffset(0);
  };

  const updateFilter = (facetId: string, value: string) => {
    setOffset(0);
    setFilters((current) => {
      if (!value) {
        const remaining = { ...current };
        delete remaining[facetId];
        return remaining;
      }
      return { ...current, [facetId]: value };
    });
  };

  const page = loadState.status === "error" ? null : loadState.page;
  const start = page && page.records.length > 0 ? page.offset + 1 : 0;
  const end = page ? page.offset + page.records.length : 0;
  const summary = page
    ? page.mode === "search"
      ? interpolate(copy.resultSearch, {
          shown: formatCount(page.records.length, locale),
          total: formatCount(page.catalogTotal, locale),
        })
      : interpolate(copy.resultRange, {
          start: formatCount(start, locale),
          end: formatCount(end, locale),
          total: formatCount(page.catalogTotal, locale),
        })
    : copy.loading;

  const handleRecordKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const lastIndex = Math.max(0, (page?.records.length ?? 1) - 1);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? lastIndex
        : event.key === "ArrowDown"
          ? Math.min(lastIndex, index + 1)
          : Math.max(0, index - 1);
    recordRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      className={[styles.atlas, className].filter(Boolean).join(" ")}
      data-drug-atlas="true"
      data-atlas-view={activeView}
    >
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        {page ? (
          <strong className={styles.catalogTotal}>
            <span>{copy.allRecords}</span>
            {formatCount(page.catalogTotal, locale)}
          </strong>
        ) : null}
      </header>

      <div className={styles.viewTabs} role="tablist" aria-label={copy.title}>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "browse"}
          tabIndex={activeView === "browse" ? 0 : -1}
          onClick={() => changeView("browse")}
          onKeyDown={handleTabKeyDown}
        >
          <strong>{copy.browse}</strong>
          <span>{copy.browseDescription}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "spatial"}
          tabIndex={activeView === "spatial" ? 0 : -1}
          onClick={() => changeView("spatial")}
          onKeyDown={handleTabKeyDown}
        >
          <strong>{copy.spatial}</strong>
          <span>{copy.spatialDescription}</span>
        </button>
      </div>

      {activeView === "spatial" ? (
        spatial ? (
          <Suspense fallback={<p className={styles.routeState} role="status">{copy.spatialLoading}</p>}>
            <LazyAtlasSpatialView
              configuration={spatial}
              copy={{ scope: copy.spatialScope, bounded: copy.spatialBoundary }}
            />
          </Suspense>
        ) : (
          <p className={styles.routeState}>{copy.spatialUnavailable}</p>
        )
      ) : (
        <div className={styles.browsePanel} role="tabpanel">
          <div className={styles.searchArea}>
            <label htmlFor={searchId}>{copy.searchLabel}</label>
            <div className={styles.searchControl}>
              <span aria-hidden="true">⌕</span>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={updateQuery}
                placeholder={copy.searchPlaceholder}
                autoComplete="off"
                spellCheck="false"
                aria-controls={resultsId}
              />
              {query ? (
                <button type="button" onClick={() => { setQuery(""); setOffset(0); }}>
                  {copy.clear}
                </button>
              ) : null}
            </div>
          </div>

          {facets.length > 0 ? (
            <fieldset className={styles.filters}>
              <legend>{copy.filters}</legend>
              {facets.map((facet) => (
                <label key={facet.id}>
                  <span>{facet.label}</span>
                  <select
                    value={filters[facet.id] ?? ""}
                    onChange={(event) => updateFilter(facet.id, event.currentTarget.value)}
                  >
                    <option value="">{copy.all}</option>
                    {facet.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} · {formatCount(option.count, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </fieldset>
          ) : null}

          <section className={styles.results} aria-labelledby={resultsId}>
            <header className={styles.resultsHeader}>
              <h2 id={resultsId}>{summary}</h2>
              <span aria-live="polite">
                {loadState.status === "loading" ? copy.loading : ""}
              </span>
            </header>

            {loadState.status === "error" ? (
              <div className={styles.message} role="alert">
                <strong>{copy.unavailable}</strong>
                <button type="button" onClick={() => setRetryRevision((value) => value + 1)}>
                  {copy.retry}
                </button>
              </div>
            ) : page?.mode === "query-hint" ? (
              <p className={styles.message}>{copy.queryHint}</p>
            ) : page && page.records.length === 0 ? (
              <p className={styles.message}>{copy.empty}</p>
            ) : (
              <ol className={styles.recordList} aria-busy={loadState.status === "loading"}>
                {page?.records.map((record, index) => (
                  <li key={record.id}>
                    <a
                      ref={(element) => { recordRefs.current[index] = element; }}
                      href={getDrugHref(record)}
                      onClick={() => { void onDrugSelect?.(record); }}
                      onKeyDown={(event) => handleRecordKeyDown(event, index)}
                      data-atlas-record={record.id}
                    >
                      <AtlasStructureThumbnail
                        entityId={record.id}
                        moleculeName={record.preferredName}
                        pubChemCid={record.pubChemCid}
                        navigator={navigator}
                        assetBasePath={assetBasePath}
                        copy={{
                          waiting: copy.thumbnailWaiting,
                          loading: copy.thumbnailLoading,
                          missing: copy.thumbnailMissing,
                          unavailable: copy.thumbnailUnavailable,
                        }}
                      />
                      <span className={styles.recordIdentity}>
                        <strong>{record.preferredName}</strong>
                        <span>{record.formula} · CID {record.pubChemCid}</span>
                      </span>
                      <span className={styles.recordClassification} data-status={record.classification.status}>
                        <small>{copy.classification}</small>
                        <span>{record.classification.label}</span>
                      </span>
                      <span className={styles.coverage} aria-label={copy.coverage}>
                        {record.coverage.map((chip) => (
                          <small key={chip.id} data-coverage-status={chip.status}>{chip.label}</small>
                        ))}
                      </span>
                      <span className={styles.openAction}>
                        {copy.openDrug}<span aria-hidden="true">↗</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            )}

            {page?.mode === "browse" ? (
              <nav className={styles.pagination} aria-label={summary}>
                <button
                  type="button"
                  disabled={page.previousOffset === null || loadState.status === "loading"}
                  onClick={() => setOffset(page.previousOffset ?? 0)}
                >
                  <span aria-hidden="true">←</span>{copy.previous}
                </button>
                <span>{summary}</span>
                <button
                  type="button"
                  disabled={page.nextOffset === null || loadState.status === "loading"}
                  onClick={() => setOffset(page.nextOffset ?? page.offset)}
                >
                  {copy.next}<span aria-hidden="true">→</span>
                </button>
              </nav>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
}

export default DrugAtlas;
