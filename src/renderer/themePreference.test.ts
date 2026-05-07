import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, applyStoredThemePreference, applyThemePreference, loadThemePreference, saveThemePreference } from './themePreference';

function createStorage(initialValue?: string): Storage {
  const values = new Map<string, string>();
  if (initialValue) {
    values.set(THEME_STORAGE_KEY, initialValue);
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

describe('theme preference', () => {
  it('loads and saves the selected theme', () => {
    const storage = createStorage();

    expect(loadThemePreference(storage)).toBe('light');
    expect(saveThemePreference('dark', storage)).toBe('dark');
    expect(loadThemePreference(storage)).toBe('dark');
  });

  it('falls back to light for unsupported values', () => {
    expect(loadThemePreference(createStorage('unknown'))).toBe('light');
  });

  it('applies the selected theme to the document root', () => {
    const root = document.createElement('div');

    expect(applyThemePreference('dark', root)).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
  });

  it('applies a stored theme before the app renders', () => {
    const root = document.createElement('div');

    expect(applyStoredThemePreference(createStorage('dark'), root)).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });
});
