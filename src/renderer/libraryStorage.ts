import { getLanguageLabel, normalizeTargetLanguage } from '../shared/languages';
import { getTranslationFormatLabel, normalizeTranslationFormat, type TranslationFormat } from '../shared/translationFormats';
import type { TranslateTextResult } from '../shared/translator';

export const TRANSLATION_HISTORY_STORAGE_KEY = 'quick-translate-history';
export const FAVORITE_IDS_STORAGE_KEY = 'quick-translate-favorites';
export const maxStoredHistoryEntries = 50;

export type StoredTranslationEntry = TranslateTextResult & {
  id: string;
  createdAt: string;
  targetLabel: string;
  translationFormat: TranslationFormat;
  formatLabel: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeStoredEntry(value: unknown): StoredTranslationEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = stringOrEmpty(value.id);
  const sourceText = stringOrEmpty(value.sourceText);
  const translatedText = stringOrEmpty(value.translatedText);
  if (!id || !sourceText || !translatedText) {
    return null;
  }

  const targetLanguage = normalizeTargetLanguage(value.targetLanguage);
  const translationFormat = normalizeTranslationFormat(value.translationFormat);

  return {
    provider: value.provider === 'openai-compatible' ? 'openai-compatible' : 'mock',
    sourceText,
    translatedText,
    targetLanguage,
    id,
    createdAt: stringOrEmpty(value.createdAt) || '--:--',
    targetLabel: getLanguageLabel(targetLanguage),
    translationFormat,
    formatLabel: getTranslationFormatLabel(translationFormat)
  };
}

export function loadHistoryEntries(storage: Storage = localStorage): StoredTranslationEntry[] {
  const storedValue = storage.getItem(TRANSLATION_HISTORY_STORAGE_KEY);
  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(normalizeStoredEntry).filter((entry): entry is StoredTranslationEntry => Boolean(entry)).slice(0, maxStoredHistoryEntries);
  } catch {
    return [];
  }
}

export function saveHistoryEntries(entries: StoredTranslationEntry[], storage: Storage = localStorage) {
  storage.setItem(TRANSLATION_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, maxStoredHistoryEntries)));
}

export function loadFavoriteIds(storage: Storage = localStorage) {
  const storedValue = storage.getItem(FAVORITE_IDS_STORAGE_KEY);
  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavoriteIds(ids: string[], storage: Storage = localStorage) {
  storage.setItem(FAVORITE_IDS_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
}
