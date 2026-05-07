import { normalizeTargetLanguage } from '../shared/languages.js';
import { defaultTranslationFormat, normalizeTranslationFormat, type TranslationFormat } from '../shared/translationFormats.js';

export type FloatingSessionPreferenceState = {
  targetLanguage?: string;
  translationFormat?: TranslationFormat;
};

export type FloatingSessionPreferenceDefaults = {
  targetLanguage: string;
  translationFormat: TranslationFormat;
};

export function readFloatingSessionPreferences(
  state: FloatingSessionPreferenceState,
  defaults: FloatingSessionPreferenceDefaults
): FloatingSessionPreferenceDefaults {
  return {
    targetLanguage: normalizeTargetLanguage(state.targetLanguage ?? defaults.targetLanguage),
    translationFormat: normalizeTranslationFormat(state.translationFormat ?? defaults.translationFormat ?? defaultTranslationFormat)
  };
}

export function updateFloatingSessionPreferences(
  state: FloatingSessionPreferenceState,
  patch: Partial<FloatingSessionPreferenceDefaults>
): FloatingSessionPreferenceState {
  return {
    ...state,
    ...(typeof patch.targetLanguage === 'string' ? { targetLanguage: normalizeTargetLanguage(patch.targetLanguage) } : {}),
    ...(typeof patch.translationFormat === 'string'
      ? { translationFormat: normalizeTranslationFormat(patch.translationFormat) }
      : {})
  };
}
