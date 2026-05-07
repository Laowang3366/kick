import { defaultTargetLanguage, normalizeTargetLanguage } from '../shared/languages';

export const DEFAULT_TARGET_LANGUAGE_STORAGE_KEY = 'quick-translate-default-target-language';

export function loadDefaultTargetLanguage(storage: Storage = localStorage) {
  return normalizeTargetLanguage(storage.getItem(DEFAULT_TARGET_LANGUAGE_STORAGE_KEY) ?? defaultTargetLanguage);
}

export function saveDefaultTargetLanguage(language: string, storage: Storage = localStorage) {
  const normalizedLanguage = normalizeTargetLanguage(language);
  storage.setItem(DEFAULT_TARGET_LANGUAGE_STORAGE_KEY, normalizedLanguage);
  return normalizedLanguage;
}
