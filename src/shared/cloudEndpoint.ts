export const defaultQuickTranslateBackendBaseUrl = 'http://sg.lwvpscc.top/quick-translate/backend';

export function normalizeBackendBaseUrl(value: string, fallback = defaultQuickTranslateBackendBaseUrl) {
  const normalized = value.trim() || fallback;
  return normalized.replace(/\/+$/, '');
}
