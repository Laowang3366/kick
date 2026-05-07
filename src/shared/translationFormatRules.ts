import { normalizeTranslationFormat, type TranslationFormat } from './translationFormats.js';

const englishTargetLanguage = 'en-US';

export function canUseTranslationFormat(targetLanguage: string) {
  return targetLanguage === englishTargetLanguage;
}

export function resolveTranslationFormat(targetLanguage: string, translationFormat: string): TranslationFormat {
  if (!canUseTranslationFormat(targetLanguage)) {
    return 'plain';
  }

  return normalizeTranslationFormat(translationFormat);
}
