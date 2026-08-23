"use client";

import {
  type ChangeEvent,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  DEFAULT_CATALOG_BROWSE_PAGE_SIZE,
  type CatalogBrowseClassificationResolver,
  type CatalogBrowseLabels,
  type CatalogBrowseNavigator,
  type CatalogBrowseRecord,
  type CatalogBrowseWindow,
  getCatalogBrowseLabels,
  interpolateCatalogBrowseLabel,
  loadCatalogBrowseWindow,
  normalizeCatalogBrowseQuery,
} from "@/lib/application/catalog-browse";
import type { Locale } from "@/lib/i18n";

import styles from "./CatalogBrowseDrawer.module.css";

type LoadState =
  | { readonly status: "idle" | "loading"; readonly page: CatalogBrowseWindow | null }
  | { readonly status: "ready"; readonly page: CatalogBrowseWindow }
  | { readonly status: "error"; readonly page: CatalogBrowseWindow | null };

type SelectionState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly recordId: string }
  | { readonly status: "error" };

export type CatalogBrowseSelectionHandler = (
  record: CatalogBrowseRecord,
) => void | Promise<void>;

export interface CatalogBrowseDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly navigator: CatalogBrowseNavigator;
  /** Number of structures currently represented by the bounded 3D sample. */
  readonly sceneSampleCount: number;
  /** Exact full-index count when the host already has the catalog manifest. */
  readonly catalogRecordCount?: number;
  /** Selection is the only point where the host should hydrate an entity/SDF. */
  readonly onSelect: CatalogBrowseSelectionHandler;
  readonly locale?: Locale;
  readonly pageSize?: number;
  readonly classify?: CatalogBrowseClassificationResolver;
  readonly labels?: Partial<CatalogBrowseLabels>;
  readonly query?: string;
  readonly onQueryChange?: (query: string) => void;
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
  readonly className?: string;
}

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(value);
}

function CatalogCountCard({
  label,
  value,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly testId: string;
}) {
  return (
    <div className={styles.countCard} data-testid={testId}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CatalogBrowseDrawer({
  open,
  onOpenChange,
  navigator,
  sceneSampleCount,
  catalogRecordCount,
  onSelect,
  locale = "en",
  pageSize = DEFAULT_CATALOG_BROWSE_PAGE_SIZE,
  classify,
  labels: labelOverrides,
  query: controlledQuery,
  onQueryChange,
  returnFocusRef,
  className,
}: CatalogBrowseDrawerProps) {
  const headingId = useId();
  const descriptionId = useId();
  const searchId = useId();
  const resultSummaryId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const requestSequenceRef = useRef(0);
  const selectionSequenceRef = useRef(0);
  const onOpenChangeRef = useRef(onOpenChange);

  const [internalQuery, setInternalQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [retryRevision, setRetryRevision] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", page: null });
  const [selectionState, setSelectionState] = useState<SelectionState>({ status: "idle" });
  const effectiveQuery = controlledQuery ?? internalQuery;
  const copy = useMemo(
    () => getCatalogBrowseLabels(locale, labelOverrides),
    [labelOverrides, locale],
  );

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    const normalizedQuery = normalizeCatalogBrowseQuery(effectiveQuery);
    const delay = normalizedQuery.length >= 2 ? 180 : 0;

    const timer = window.setTimeout(() => {
      setLoadState((current) => ({ status: "loading", page: current.page }));
      void loadCatalogBrowseWindow(navigator, {
        query: effectiveQuery,
        offset,
        pageSize,
        classify,
        unclassifiedLabel: copy.unclassified,
        catalogRecordCount,
      })
        .then((page) => {
          if (requestSequence !== requestSequenceRef.current) return;
          setLoadState({ status: "ready", page });
        })
        .catch(() => {
          if (requestSequence !== requestSequenceRef.current) return;
          setLoadState({
            status: "error",
            page: null,
          });
        });
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (requestSequenceRef.current === requestSequence) {
        requestSequenceRef.current += 1;
      }
    };
  }, [catalogRecordCount, classify, copy.unavailable, copy.unclassified, effectiveQuery, navigator, offset, open, pageSize, retryRevision]);

  useEffect(() => {
    if (!open) return undefined;
    const ownerDocument = drawerRef.current?.ownerDocument ?? document;
    const focusBeforeOpen =
      returnFocusRef?.current ??
      (ownerDocument.activeElement instanceof HTMLElement
        ? ownerDocument.activeElement
        : null);
    const focusFrame = window.requestAnimationFrame(() => searchRef.current?.focus());

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        selectionSequenceRef.current += 1;
        setSelectionState({ status: "idle" });
        onOpenChangeRef.current(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        drawerRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && ownerDocument.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && ownerDocument.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    ownerDocument.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      ownerDocument.removeEventListener("keydown", handleKeyDown);
      if (focusBeforeOpen?.isConnected) {
        window.requestAnimationFrame(() => focusBeforeOpen.focus());
      }
    };
  }, [open, returnFocusRef]);

  if (!open || typeof document === "undefined") return null;

  const page = loadState.page;
  const catalogTotal = page?.catalogTotal;
  const isLoading = loadState.status === "loading";
  const isSelectionBusy = selectionState.status === "loading";
  const normalizedQuery = normalizeCatalogBrowseQuery(effectiveQuery);
  const heading = page?.mode === "search" || normalizedQuery.length >= 2
    ? copy.searchHeading
    : copy.browseHeading;
  const formattedCatalogTotal = catalogTotal === undefined
    ? "—"
    : formatCount(catalogTotal, locale);
  const formattedSceneCount = formatCount(sceneSampleCount, locale);
  const browseStart = page && page.records.length > 0 ? page.offset + 1 : 0;
  const browseEnd = page ? page.offset + page.records.length : 0;
  const resultSummary = page?.mode === "search"
    ? interpolateCatalogBrowseLabel(copy.searchSummary, {
        shown: page.records.length,
        total: formattedCatalogTotal,
      })
    : page
      ? interpolateCatalogBrowseLabel(copy.browseRange, {
          start: formatCount(browseStart, locale),
          end: formatCount(browseEnd, locale),
          total: formattedCatalogTotal,
        })
      : copy.loading;

  const closeDrawer = () => {
    selectionSequenceRef.current += 1;
    setSelectionState({ status: "idle" });
    onOpenChange(false);
  };

  const updateQuery = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.currentTarget.value;
    if (controlledQuery === undefined) setInternalQuery(nextQuery);
    onQueryChange?.(nextQuery);
    setOffset(0);
  };

  const clearQuery = () => {
    if (controlledQuery === undefined) setInternalQuery("");
    onQueryChange?.("");
    setOffset(0);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const selectRecord = async (record: CatalogBrowseRecord) => {
    const selectionSequence = selectionSequenceRef.current + 1;
    selectionSequenceRef.current = selectionSequence;
    setSelectionState({ status: "loading", recordId: record.id });
    try {
      await onSelect(record);
      if (selectionSequence !== selectionSequenceRef.current) return;
      setSelectionState({ status: "idle" });
      onOpenChange(false);
    } catch {
      if (selectionSequence !== selectionSequenceRef.current) return;
      setSelectionState({
        status: "error",
      });
    }
  };

  return createPortal(
    <div
      className={styles.backdrop}
      data-catalog-browse-backdrop="true"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeDrawer();
      }}
    >
      <section
        ref={drawerRef}
        className={[styles.drawer, className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-catalog-browse-drawer="true"
        data-catalog-result-count={page?.records.length ?? 0}
        data-catalog-total-count={catalogTotal ?? ""}
        data-scene-sample-count={sceneSampleCount}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{copy.eyebrow}</span>
            <h2 id={headingId}>{copy.title}</h2>
            <p id={descriptionId}>{copy.description}</p>
          </div>
          <button className={styles.closeButton} type="button" onClick={closeDrawer}>
            <span aria-hidden="true">×</span>
            <span className={styles.visuallyHidden}>{copy.close}</span>
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.scope} aria-label={copy.scope}>
            <CatalogCountCard
              label={copy.catalogCount}
              value={formattedCatalogTotal}
              testId="full-catalog-count"
            />
            <span className={styles.notEqual} aria-hidden="true">≠</span>
            <CatalogCountCard
              label={copy.sceneCount}
              value={formattedSceneCount}
              testId="scene-sample-count"
            />
          </section>

          <div className={styles.searchField}>
            <label htmlFor={searchId}>{copy.searchLabel}</label>
            <div>
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                value={effectiveQuery}
                onChange={updateQuery}
                placeholder={copy.searchPlaceholder}
                autoComplete="off"
                spellCheck="false"
                aria-controls={resultSummaryId}
              />
              {effectiveQuery ? (
                <button type="button" onClick={clearQuery} aria-label={copy.clearSearch}>
                  ×
                </button>
              ) : null}
            </div>
          </div>

          <section className={styles.results} aria-labelledby={resultSummaryId}>
            <header className={styles.resultsHeader}>
              <div>
                <span>{heading}</span>
                <strong id={resultSummaryId}>{resultSummary}</strong>
              </div>
              <span className={styles.status} aria-live="polite">
                {isLoading ? copy.loading : ""}
              </span>
            </header>

            {loadState.status === "error" ? (
              <div className={styles.message} role="alert" data-tone="error">
                <strong>{copy.unavailable}</strong>
                <button type="button" onClick={() => setRetryRevision((value) => value + 1)}>
                  {copy.retry}
                </button>
              </div>
            ) : page?.mode === "query-hint" ? (
              <p className={styles.message}>{copy.queryHint}</p>
            ) : !isLoading && page?.records.length === 0 ? (
              <p className={styles.message}>
                {page.mode === "search" ? copy.emptySearch : copy.emptyBrowse}
              </p>
            ) : (
              <ul
                className={styles.recordList}
                aria-label={copy.resultList}
                aria-busy={isLoading}
              >
                {page?.records.map((record) => {
                  const opening =
                    selectionState.status === "loading" &&
                    selectionState.recordId === record.id;
                  return (
                    <li key={record.id}>
                      <button
                        type="button"
                        data-catalog-record={record.id}
                        onClick={() => void selectRecord(record)}
                        disabled={isSelectionBusy}
                      >
                        <span className={styles.recordIdentity}>
                          <strong>{record.preferredName}</strong>
                          <span>{record.formula}</span>
                        </span>
                        <span
                          className={styles.classification}
                          data-classification-status={record.classification.status}
                        >
                          <small>{copy.classification}</small>
                          <span>{record.classification.label}</span>
                        </span>
                        <span className={styles.openAction}>
                          {opening ? copy.openingStructure : copy.openStructure}
                          <span aria-hidden="true">→</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectionState.status === "error" ? (
              <p className={styles.selectionError} role="alert">
                {copy.unavailable}
              </p>
            ) : null}

            {page?.mode === "browse" ? (
              <footer className={styles.pagination}>
                <button
                  type="button"
                  disabled={page.previousOffset === null || isLoading || isSelectionBusy}
                  onClick={() => setOffset(page.previousOffset ?? 0)}
                >
                  <span aria-hidden="true">←</span>
                  {copy.previous}
                </button>
                <span>{resultSummary}</span>
                <button
                  type="button"
                  disabled={page.nextOffset === null || isLoading || isSelectionBusy}
                  onClick={() => setOffset(page.nextOffset ?? page.offset)}
                >
                  {copy.next}
                  <span aria-hidden="true">→</span>
                </button>
              </footer>
            ) : null}
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default CatalogBrowseDrawer;
