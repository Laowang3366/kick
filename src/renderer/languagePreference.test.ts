import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_TARGET_LANGUAGE_STORAGE_KEY,
  loadDefaultTargetLanguage,
  saveDefaultTargetLanguage
} from './languagePreference';

describe('language preference storage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('stores and restores a valid default target language locally', () => {
    saveDefaultTargetLanguage('es-ES');

    expect(localStorage.getItem(DEFAULT_TARGET_LANGUAGE_STORAGE_KEY)).toBe('es-ES');
    expect(loadDefaultTargetLanguage()).toBe('es-ES');
  });

  it('falls back to Simplified Chinese when stored language is invalid', () => {
    localStorage.setItem(DEFAULT_TARGET_LANGUAGE_STORAGE_KEY, 'bad-language');

    expect(loadDefaultTargetLanguage()).toBe('zh-CN');
  });
});
