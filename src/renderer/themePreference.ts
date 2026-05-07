export type ThemePreference = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'quick-translate-theme';
export const defaultTheme: ThemePreference = 'light';

export function normalizeTheme(value: unknown): ThemePreference {
  return value === 'dark' ? 'dark' : 'light';
}

export function loadThemePreference(storage: Storage = localStorage): ThemePreference {
  return normalizeTheme(storage.getItem(THEME_STORAGE_KEY) ?? defaultTheme);
}

export function saveThemePreference(theme: ThemePreference, storage: Storage = localStorage) {
  const normalizedTheme = normalizeTheme(theme);
  storage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  return normalizedTheme;
}

export function applyThemePreference(theme: ThemePreference, root: HTMLElement = document.documentElement) {
  const normalizedTheme = normalizeTheme(theme);
  root.dataset.theme = normalizedTheme;
  root.style.colorScheme = normalizedTheme;
  return normalizedTheme;
}

export function applyStoredThemePreference(storage: Storage = localStorage, root: HTMLElement = document.documentElement) {
  return applyThemePreference(loadThemePreference(storage), root);
}
