import type { Locale } from "./locale";
import { messages, type TranslationKey } from "./messages";

export type TranslationPrimitive = string | number | boolean;
export type TranslationVariables = Readonly<Record<string, TranslationPrimitive>>;
export type Translator = (
  key: TranslationKey,
  variables?: TranslationVariables,
) => string;

const TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/gu;

/**
 * Interpolates named tokens without evaluating markup. Unresolved tokens stay
 * visible, making an integration defect explicit instead of leaking another
 * locale or silently deleting scientific context.
 */
export function interpolateMessage(
  template: string,
  variables: TranslationVariables = {},
): string {
  return template.replace(TOKEN_PATTERN, (token, name: string) => {
    const value = variables[name];
    return value === undefined ? token : String(value);
  });
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  variables?: TranslationVariables,
): string {
  const template = messages[locale][key];
  if (typeof template !== "string") return `⟦${String(key)}⟧`;
  return interpolateMessage(template, variables);
}

export function createTranslator(locale: Locale): Translator {
  return (key, variables) => translate(locale, key, variables);
}

export interface PluralForms {
  readonly one: string;
  readonly other: string;
}

export function pluralize(
  locale: Locale,
  count: number,
  forms: PluralForms,
  variables: TranslationVariables = {},
): string {
  const category = new Intl.PluralRules(locale).select(count);
  const template = category === "one" ? forms.one : forms.other;
  return interpolateMessage(template, { count, ...variables });
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}
