export const defaultQuickTranslateBackendBaseUrl = 'https://sg.lwvpscc.top/quick-translate/backend';

export function normalizeBackendBaseUrl(value: string, fallback = defaultQuickTranslateBackendBaseUrl) {
  const normalized = value.trim() || fallback;
  return normalized.replace(/\/+$/, '');
}
