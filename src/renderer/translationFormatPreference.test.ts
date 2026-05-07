import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY,
  loadDefaultTranslationFormat,
  saveDefaultTranslationFormat
} from './translationFormatPreference';

function createStorage(initialValue?: string): Storage {
  const values = new Map<string, string>();
  if (initialValue) {
    values.set(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY, initialValue);
  }

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

describe('translation format preference', () => {
  it('loads the stored translation format preference', () => {
    expect(loadDefaultTranslationFormat(createStorage('java-camel-case'))).toBe('java-camel-case');
  });

  it('falls back to plain translation for unsupported values', () => {
    expect(loadDefaultTranslationFormat(createStorage('bad-format'))).toBe('plain');
  });

  it('saves a normalized translation format preference', () => {
    const storage = createStorage();

    expect(saveDefaultTranslationFormat('upper-snake-case', storage)).toBe('upper-snake-case');
    expect(storage.getItem(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY)).toBe('upper-snake-case');
  });
});
