import type { TranslationProvider } from '../shared/translator';

export type ProviderType = 'mock' | 'openai-compatible';

export type ProviderSettings = {
  providerType: ProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export const defaultProviderSettings: ProviderSettings = {
  providerType: 'mock',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4.1-mini'
};

export function createProviderFromSettings(settings: ProviderSettings): TranslationProvider {
  const apiKey = settings.apiKey.trim();

  if (settings.providerType !== 'openai-compatible' || !apiKey) {
    return { type: 'mock' };
  }

  return {
    type: 'openai-compatible',
    apiKey,
    baseUrl: settings.baseUrl.trim().replace(/\/$/, ''),
    model: settings.model.trim()
  };
}
