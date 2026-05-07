import { defaultProviderSettings, type ProviderSettings, type ProviderType } from './providerConfig';

export const PROVIDER_SETTINGS_STORAGE_KEY = 'quick-translate-provider-settings';

const providerTypes = new Set<ProviderType>(['mock', 'openai-compatible']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProviderType(value: unknown): value is ProviderType {
  return typeof value === 'string' && providerTypes.has(value as ProviderType);
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function loadProviderSettings(): ProviderSettings {
  const storedValue = localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);

  if (!storedValue) {
    return defaultProviderSettings;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!isRecord(parsedValue) || !isProviderType(parsedValue.providerType)) {
      return defaultProviderSettings;
    }

    return {
      providerType: parsedValue.providerType,
      apiKey: stringOrDefault(parsedValue.apiKey, defaultProviderSettings.apiKey),
      baseUrl: stringOrDefault(parsedValue.baseUrl, defaultProviderSettings.baseUrl),
      model: stringOrDefault(parsedValue.model, defaultProviderSettings.model)
    };
  } catch {
    return defaultProviderSettings;
  }
}

export function saveProviderSettings(settings: ProviderSettings): void {
  localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
