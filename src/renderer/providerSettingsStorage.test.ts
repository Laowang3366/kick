import { beforeEach, describe, expect, it } from 'vitest';
import { defaultProviderSettings } from './providerConfig';
import {
  loadProviderSettings,
  PROVIDER_SETTINGS_STORAGE_KEY,
  saveProviderSettings
} from './providerSettingsStorage';

describe('provider settings storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads default settings when storage is empty', () => {
    expect(loadProviderSettings()).toEqual(defaultProviderSettings);
  });

  it('saves settings and reads them back from localStorage', () => {
    const settings = {
      providerType: 'openai-compatible' as const,
      apiKey: 'secret',
      baseUrl: 'https://api.example.com/v1',
      model: 'custom-model'
    };

    saveProviderSettings(settings);

    expect(localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(settings));
    expect(loadProviderSettings()).toEqual(settings);
  });

  it('falls back to default settings when stored JSON is damaged', () => {
    localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, '{bad json');

    expect(loadProviderSettings()).toEqual(defaultProviderSettings);
  });

  it('merges partial stored settings with default settings', () => {
    localStorage.setItem(
      PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        providerType: 'openai-compatible',
        model: 'partial-model'
      })
    );

    expect(loadProviderSettings()).toEqual({
      ...defaultProviderSettings,
      providerType: 'openai-compatible',
      model: 'partial-model'
    });
  });

  it('falls back to default settings when providerType is unknown', () => {
    localStorage.setItem(
      PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        providerType: 'unknown-provider',
        apiKey: 'secret',
        baseUrl: 'https://api.example.com/v1',
        model: 'custom-model'
      })
    );

    expect(loadProviderSettings()).toEqual(defaultProviderSettings);
  });
});
