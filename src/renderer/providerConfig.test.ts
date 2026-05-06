import { describe, expect, it } from 'vitest';
import { createProviderFromSettings } from './providerConfig';

describe('createProviderFromSettings', () => {
  it('uses the mock provider until an API key is configured', () => {
    expect(
      createProviderFromSettings({
        providerType: 'openai-compatible',
        apiKey: '',
        baseUrl: 'https://api.example.com/v1',
        model: 'gpt-4.1-mini'
      })
    ).toEqual({ type: 'mock' });
  });

  it('creates an OpenAI-compatible provider from configured settings', () => {
    expect(
      createProviderFromSettings({
        providerType: 'openai-compatible',
        apiKey: 'secret',
        baseUrl: 'https://api.example.com/v1/',
        model: 'gpt-4.1-mini'
      })
    ).toEqual({
      type: 'openai-compatible',
      apiKey: 'secret',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-4.1-mini'
    });
  });
});
