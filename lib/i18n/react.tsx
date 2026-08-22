"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  createTranslator,
  formatNumber,
  pluralize,
  type PluralForms,
  type Translator,
  type TranslationVariables,
} from "./core";
import {
  DEFAULT_LOCALE,
  getBrowserLanguagePreferences,
  persistLocale,
  readPersistedLocale,
  resolveLocale,
  type Locale,
} from "./locale";

export interface I18nContextValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly t: Translator;
  readonly plural: (
    count: number,
    forms: PluralForms,
    variables?: TranslationVariables,
  ) => string;
  readonly number: (value: number) => string;
}

function createContextValue(
  locale: Locale,
  setLocale: (locale: Locale) => void,
): I18nContextValue {
  return {
    locale,
    setLocale,
    t: createTranslator(locale),
    plural: (count, forms, variables) => pluralize(locale, count, forms, variables),
    number: (value) => formatNumber(locale, value),
  };
}

const DEFAULT_CONTEXT = createContextValue(DEFAULT_LOCALE, () => undefined);
const I18nContext = createContext<I18nContextValue>(DEFAULT_CONTEXT);

function getWindowStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface I18nProviderProps {
  readonly children: ReactNode;
  readonly initialLocale?: Locale;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: I18nProviderProps) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);

  const applyLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLocale;
    }
    if (typeof window !== "undefined") {
      persistLocale(getWindowStorage(), nextLocale);
    }
  }, []);

  useEffect(() => {
    const browserLanguages = getBrowserLanguagePreferences(window.navigator);
    const resolvedLocale = resolveLocale({
      persistedLocale: readPersistedLocale(getWindowStorage()),
      browserLanguages,
      fallbackLocale: initialLocale,
    });
    const restoreTimer = window.setTimeout(() => applyLocale(resolvedLocale), 0);
    return () => window.clearTimeout(restoreTimer);
  }, [applyLocale, initialLocale]);

  const value = useMemo(
    () => createContextValue(locale, applyLocale),
    [applyLocale, locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
