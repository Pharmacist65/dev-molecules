export {
  createTranslator,
  formatNumber,
  interpolateMessage,
  pluralize,
  translate,
  type PluralForms,
  type TranslationPrimitive,
  type TranslationVariables,
  type Translator,
} from "./core";
export {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  getBrowserLanguagePreferences,
  parseLocale,
  persistLocale,
  readPersistedLocale,
  resolveLocale,
  type Locale,
  type LocaleResolutionInput,
  type LocaleStorage,
} from "./locale";
export { messages, type MessageDictionary, type TranslationKey } from "./messages";
export { I18nProvider, useI18n, type I18nContextValue, type I18nProviderProps } from "./react";
export {
  getSynthesisMaterialLabel,
  getSynthesisStepContent,
  getSynthesisStoryContent,
  isSynthesisStoryContentId,
  synthesisContent,
  type SynthesisAtomContent,
  type SynthesisStepContent,
  type SynthesisStoryContent,
  type SynthesisStoryContentId,
} from "./synthesis-content";
