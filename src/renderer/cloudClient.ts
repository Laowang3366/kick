import type { StoredTranslationEntry } from './libraryStorage';
import type { ThemePreference } from './themePreference';
import type { TranslateTextResult } from '../shared/translator';
import type { TranslationFormat } from '../shared/translationFormats';

export const defaultCloudBaseUrl =
  import.meta.env.VITE_QUICK_TRANSLATE_API_URL || 'http://sg.lwvpscc.top/quick-translate/backend';

export type CloudUser = {
  id: string;
  email: string;
  displayName: string;
};

export type CloudAuthResult = {
  user: CloudUser;
  token: string;
};

export type CloudSyncedSettings = {
  defaultTargetLanguage?: string;
  defaultTranslationFormat?: TranslationFormat;
  theme?: ThemePreference;
};

export type CloudSyncedState = {
  history: StoredTranslationEntry[];
  favoriteIds: string[];
  settings: CloudSyncedSettings;
};

type CloudClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export function createCloudClient(options: CloudClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? defaultCloudBaseUrl).replace(/\/$/, '');
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(pathname: string, init: RequestInit = {}): Promise<T> {
    const response = await fetcher(`${baseUrl}${pathname}`, init);
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `云端请求失败，状态码 ${response.status}`);
    }

    return payload as T;
  }

  return {
    register(input: { email: string; password: string; displayName: string }) {
      return request<CloudAuthResult>('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      });
    },
    login(input: { email: string; password: string }) {
      return request<CloudAuthResult>('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      });
    },
    async loadState(token: string) {
      const payload = await request<{ state: CloudSyncedState }>('/api/sync/state', {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` }
      });
      return payload.state;
    },
    async saveState(token: string, state: CloudSyncedState) {
      const payload = await request<{ state: CloudSyncedState }>('/api/sync/state', {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(state)
      });
      return payload.state;
    },
    translate(input: {
      text: string;
      targetLanguage: string;
      translationFormat?: TranslationFormat;
    }): Promise<TranslateTextResult> {
      return request<TranslateTextResult>('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      });
    }
  };
}

export type CloudClient = ReturnType<typeof createCloudClient>;
