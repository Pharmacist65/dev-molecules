"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type { IndexedCatalogHit } from "@/lib/application/catalog-expansion";
import { useI18n } from "@/lib/i18n";

import styles from "./CatalogSearch.module.css";

export type CatalogSearchFunction = (
  query: string,
  limit?: number,
) => Promise<readonly IndexedCatalogHit[]>;

export interface CatalogSearchProps {
  readonly search: CatalogSearchFunction;
  readonly onSelect: (record: IndexedCatalogHit) => void;
  readonly variant?: "hero" | "dialog";
  readonly focusOnMount?: boolean;
  readonly onDismiss?: () => void;
}

export function CatalogSearch({
  search,
  onSelect,
  variant = "hero",
  focusOnMount = false,
  onDismiss,
}: CatalogSearchProps) {
  const { t } = useI18n();
  const inputId = useId();
  const listboxId = useId();
  const requestRevision = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly IndexedCatalogHit[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "ready" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!focusOnMount) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [focusOnMount]);

  useEffect(() => {
    const normalized = query.trim();
    requestRevision.current += 1;
    const revision = requestRevision.current;

    if (normalized.length < 2) {
      const resetTimer = window.setTimeout(() => {
        if (requestRevision.current !== revision) return;
        setResults([]);
        setActiveIndex(-1);
        setStatus("idle");
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    const timer = window.setTimeout(() => {
      setStatus("searching");
      void search(normalized, 7)
        .then((matches) => {
          if (requestRevision.current !== revision) return;
          setResults(matches);
          setActiveIndex(matches.length > 0 ? 0 : -1);
          setStatus("ready");
        })
        .catch(() => {
          if (requestRevision.current !== revision) return;
          setResults([]);
          setActiveIndex(-1);
          setStatus("error");
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query, search]);

  function choose(record: IndexedCatalogHit) {
    onSelect(record);
    setQuery("");
    setResults([]);
    setStatus("idle");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = results[activeIndex] ?? results[0];
    if (result) choose(result);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onDismiss?.();
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1 + results.length) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
    }
  }

  const listOpen = query.trim().length >= 2 && status !== "idle";
  const statusMessage =
    status === "searching"
      ? t("search.searching")
      : status === "error"
        ? t("search.unavailable")
        : status === "ready" && results.length === 0
          ? t("search.noResults")
          : "";

  return (
    <div className={styles.root} data-variant={variant}>
      <form className={styles.form} role="search" onSubmit={submit}>
        <label className={styles.label} htmlFor={inputId}>{t("search.label")}</label>
        <div className={styles.field}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.6" />
            <path d="m16 16 4.2 4.2" />
          </svg>
          <input
            ref={inputRef}
            id={inputId}
            value={query}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={listOpen}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            autoComplete="off"
            placeholder={t("search.placeholder")}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" disabled={results.length === 0}>
            {t("search.open")}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>

      {listOpen ? (
        <div className={styles.results} id={listboxId} role="listbox" aria-label={t("search.resultsLabel")}>
          {results.map((record, index) => (
            <button
              key={record.id}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => choose(record)}
            >
              <span>
                <strong>{record.preferredName}</strong>
                {record.aliases[0] ? <small>{record.aliases[0]}</small> : null}
              </span>
              <code>{record.formula}</code>
              <i aria-hidden="true">→</i>
            </button>
          ))}
          {statusMessage ? <p role="status">{statusMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
