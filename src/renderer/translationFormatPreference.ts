import { defaultTranslationFormat, normalizeTranslationFormat } from '../shared/translationFormats';

export const DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY = 'quick-translate-default-translation-format';

export function loadDefaultTranslationFormat(storage: Storage = localStorage) {
  return normalizeTranslationFormat(storage.getItem(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY) ?? defaultTranslationFormat);
}

export function saveDefaultTranslationFormat(format: string, storage: Storage = localStorage) {
  const normalizedFormat = normalizeTranslationFormat(format);
  storage.setItem(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY, normalizedFormat);
  return normalizedFormat;
}
