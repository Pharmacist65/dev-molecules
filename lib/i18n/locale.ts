export const SUPPORTED_LOCALES = ["tr", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_STORAGE_KEY = "dev-molecules:locale";

export interface LocaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocaleResolutionInput {
  readonly persistedLocale?: unknown;
  readonly browserLanguages?: readonly string[] | null;
  readonly fallbackLocale?: Locale;
}

/**
 * Reduces a BCP 47 language tag to a locale supported by the product.
 * Region/script subtags are deliberately ignored because the UI currently
 * ships one Turkish and one English editorial variant.
 */
export function parseLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const primarySubtag = value.trim().toLowerCase().split(/[-_]/u)[0];
  return SUPPORTED_LOCALES.find((locale) => locale === primarySubtag) ?? null;
}

/** Persisted preference wins, then browser preference, then the safe TR fallback. */
export function resolveLocale({
  persistedLocale,
  browserLanguages,
  fallbackLocale = DEFAULT_LOCALE,
}: LocaleResolutionInput = {}): Locale {
  const persisted = parseLocale(persistedLocale);
  if (persisted) return persisted;

  for (const language of browserLanguages ?? []) {
    const browserLocale = parseLocale(language);
    if (browserLocale) return browserLocale;
  }

  return fallbackLocale;
}

export function readPersistedLocale(storage: LocaleStorage | null | undefined): Locale | null {
  if (!storage) return null;
  try {
    return parseLocale(storage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function persistLocale(
  storage: LocaleStorage | null | undefined,
  locale: Locale,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
    return true;
  } catch {
    return false;
  }
}

export function getBrowserLanguagePreferences(
  navigatorLike: Pick<Navigator, "language" | "languages"> | null | undefined,
): readonly string[] {
  if (!navigatorLike) return [];
  const languages = Array.from(navigatorLike.languages ?? []).filter(Boolean);
  if (languages.length > 0) return languages;
  return navigatorLike.language ? [navigatorLike.language] : [];
}
