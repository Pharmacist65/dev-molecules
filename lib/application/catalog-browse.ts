import type { CatalogManifest } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n";

import type {
  IndexedCatalogBrowsePage,
  IndexedCatalogHit,
} from "./catalog-expansion";

export const DEFAULT_CATALOG_BROWSE_PAGE_SIZE = 24;
export const MAX_CATALOG_BROWSE_PAGE_SIZE = 40;
export const MIN_CATALOG_SEARCH_QUERY_LENGTH = 2;

export type CatalogBrowseMode = "browse" | "search" | "query-hint";

export interface CatalogBrowseNavigator {
  /** Optional because Universe-facing adapters may expose only search/browse. */
  manifest?(): Promise<CatalogManifest>;
  search(
    query: string,
    limit?: number,
  ): Promise<readonly IndexedCatalogHit[]>;
  browse(
    offset?: number,
    limit?: number,
  ): Promise<IndexedCatalogBrowsePage>;
}

export interface CatalogBrowseClassification {
  readonly status: "known" | "unclassified";
  readonly label: string;
}

export type CatalogBrowseClassificationResolver = (
  hit: IndexedCatalogHit,
) => CatalogBrowseClassification | null | undefined;

export interface CatalogBrowseRecord extends IndexedCatalogHit {
  readonly classification: CatalogBrowseClassification;
}

export interface CatalogBrowseWindow {
  readonly mode: CatalogBrowseMode;
  readonly query: string;
  readonly records: readonly CatalogBrowseRecord[];
  /** Exact complete-index count, not the number of structures mounted in 3D. */
  readonly catalogTotal: number;
  readonly offset: number;
  readonly nextOffset: number | null;
  readonly previousOffset: number | null;
}

export interface LoadCatalogBrowseWindowOptions {
  readonly query?: string;
  readonly offset?: number;
  readonly pageSize?: number;
  readonly classify?: CatalogBrowseClassificationResolver;
  readonly unclassifiedLabel: string;
  /** Exact manifest count already known by the host; avoids a second adapter call. */
  readonly catalogRecordCount?: number;
}

export interface CatalogBrowseLabels {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly close: string;
  readonly scope: string;
  readonly catalogCount: string;
  readonly sceneCount: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly clearSearch: string;
  readonly browseHeading: string;
  readonly searchHeading: string;
  readonly loading: string;
  readonly retry: string;
  readonly unavailable: string;
  readonly queryHint: string;
  readonly emptyBrowse: string;
  readonly emptySearch: string;
  readonly classification: string;
  readonly unclassified: string;
  readonly openStructure: string;
  readonly openingStructure: string;
  readonly previous: string;
  readonly next: string;
  readonly browseRange: string;
  readonly searchSummary: string;
  readonly resultList: string;
}

const labelsByLocale: Readonly<Record<Locale, CatalogBrowseLabels>> = {
  tr: {
    eyebrow: "Explore · Katalog",
    title: "Molekül kataloğuna göz at",
    description:
      "Tam katalog aranabilir bir indekstir. 3B sahne, performans ve okunabilirlik için bunun yalnızca sınırlı bir örneklemini gösterir.",
    close: "Kataloğu kapat",
    scope: "Katalog ve 3B sahne kapsamı",
    catalogCount: "Tam katalog",
    sceneCount: "3B sahne örneklemi",
    searchLabel: "Katalogda ara",
    searchPlaceholder: "İsim, formül veya CID yaz",
    clearSearch: "Aramayı temizle",
    browseHeading: "A–Z katalog",
    searchHeading: "Arama sonuçları",
    loading: "Katalog indeksi yükleniyor…",
    retry: "Yeniden dene",
    unavailable: "Katalog şu anda yüklenemedi.",
    queryHint: "Aramak için en az iki karakter yaz.",
    emptyBrowse: "Bu katalog sayfasında kayıt yok.",
    emptySearch: "Tam katalogda eşleşme bulunamadı.",
    classification: "Sınıflandırma",
    unclassified: "Sınıflandırılmamış",
    openStructure: "3B yapıyı aç",
    openingStructure: "Yapı yükleniyor…",
    previous: "Önceki",
    next: "Sonraki",
    browseRange: "{start}–{end} / {total} kayıt",
    searchSummary: "{shown} sonuç gösteriliyor · katalogda {total} kayıt",
    resultList: "Katalog kayıtları",
  },
  en: {
    eyebrow: "Explore · Catalog",
    title: "Browse the molecule catalog",
    description:
      "The full catalog is a searchable index. For performance and legibility, the 3D scene shows only a bounded sample of it.",
    close: "Close catalog",
    scope: "Catalog and 3D scene scope",
    catalogCount: "Full catalog",
    sceneCount: "3D scene sample",
    searchLabel: "Search the catalog",
    searchPlaceholder: "Enter a name, formula, or CID",
    clearSearch: "Clear search",
    browseHeading: "A–Z catalog",
    searchHeading: "Search results",
    loading: "Loading the catalog index…",
    retry: "Try again",
    unavailable: "The catalog could not be loaded.",
    queryHint: "Enter at least two characters to search.",
    emptyBrowse: "There are no records on this catalog page.",
    emptySearch: "No match was found in the full catalog.",
    classification: "Classification",
    unclassified: "Unclassified",
    openStructure: "Open 3D structure",
    openingStructure: "Loading structure…",
    previous: "Previous",
    next: "Next",
    browseRange: "Records {start}–{end} of {total}",
    searchSummary: "{shown} results shown · {total} catalog records",
    resultList: "Catalog records",
  },
};

export function getCatalogBrowseLabels(
  locale: Locale,
  overrides: Partial<CatalogBrowseLabels> = {},
): CatalogBrowseLabels {
  return { ...labelsByLocale[locale], ...overrides };
}

export function interpolateCatalogBrowseLabel(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function normalizeCatalogBrowseQuery(query = ""): string {
  return query.trim().replace(/\s+/gu, " ");
}

function validateWindowRequest(offset: number, pageSize: number): void {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Catalog browse offset must be a non-negative safe integer.");
  }
  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_CATALOG_BROWSE_PAGE_SIZE
  ) {
    throw new Error(
      `Catalog browse page size must be an integer from 1 to ${MAX_CATALOG_BROWSE_PAGE_SIZE}.`,
    );
  }
}

function validateCatalogTotal(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Catalog manifest has an invalid record count.");
  }
  return value;
}

async function resolveCatalogTotal(
  navigator: CatalogBrowseNavigator,
  knownTotal: number | undefined,
): Promise<number> {
  if (knownTotal !== undefined) return validateCatalogTotal(knownTotal);
  if (navigator.manifest) {
    return validateCatalogTotal((await navigator.manifest()).recordCount);
  }
  return validateCatalogTotal((await navigator.browse(0, 1)).total);
}

function failClosedClassification(
  hit: IndexedCatalogHit,
  classify: CatalogBrowseClassificationResolver | undefined,
  unclassifiedLabel: string,
): CatalogBrowseClassification {
  if (classify) {
    try {
      const resolved = classify(hit);
      if (resolved?.status === "known" && resolved.label.trim()) {
        return { status: "known", label: resolved.label.trim() };
      }
      if (resolved?.status === "unclassified" && resolved.label.trim()) {
        return { status: "unclassified", label: resolved.label.trim() };
      }
    } catch {
      // Optional presentation metadata must never hide a valid catalog hit.
    }
  }
  return { status: "unclassified", label: unclassifiedLabel };
}

function toBrowseRecord(
  hit: IndexedCatalogHit,
  classify: CatalogBrowseClassificationResolver | undefined,
  unclassifiedLabel: string,
): CatalogBrowseRecord {
  return {
    ...hit,
    classification: failClosedClassification(hit, classify, unclassifiedLabel),
  };
}

/**
 * Reads only the compact index. Entity shards and SDF bytes stay lazy until
 * the consumer's explicit selection callback hydrates the chosen record.
 */
export async function loadCatalogBrowseWindow(
  navigator: CatalogBrowseNavigator,
  options: LoadCatalogBrowseWindowOptions,
): Promise<CatalogBrowseWindow> {
  const query = normalizeCatalogBrowseQuery(options.query);
  const offset = options.offset ?? 0;
  const pageSize = options.pageSize ?? DEFAULT_CATALOG_BROWSE_PAGE_SIZE;
  validateWindowRequest(offset, pageSize);

  if (query.length > 0 && query.length < MIN_CATALOG_SEARCH_QUERY_LENGTH) {
    const catalogTotal = await resolveCatalogTotal(
      navigator,
      options.catalogRecordCount,
    );
    return {
      mode: "query-hint",
      query,
      records: [],
      catalogTotal,
      offset: 0,
      nextOffset: null,
      previousOffset: null,
    };
  }

  if (query.length >= MIN_CATALOG_SEARCH_QUERY_LENGTH) {
    const [hits, catalogTotal] = await Promise.all([
      navigator.search(query, pageSize),
      resolveCatalogTotal(navigator, options.catalogRecordCount),
    ]);
    return {
      mode: "search",
      query,
      records: hits
        .slice(0, pageSize)
        .map((hit) => toBrowseRecord(hit, options.classify, options.unclassifiedLabel)),
      catalogTotal,
      offset: 0,
      nextOffset: null,
      previousOffset: null,
    };
  }

  const page = await navigator.browse(offset, pageSize);
  const catalogTotal = validateCatalogTotal(page.total);
  if (
    options.catalogRecordCount !== undefined &&
    validateCatalogTotal(options.catalogRecordCount) !== catalogTotal
  ) {
    throw new Error("Catalog browse count does not match the manifest.");
  }
  return {
    mode: "browse",
    query: "",
    records: page.records
      .slice(0, pageSize)
      .map((hit) => toBrowseRecord(hit, options.classify, options.unclassifiedLabel)),
    catalogTotal,
    offset: page.offset,
    nextOffset: page.nextOffset,
    previousOffset: page.previousOffset,
  };
}
