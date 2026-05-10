import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackendApp } from './backend.mjs';

let tempDir;
let app;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'quick-translate-backend-'));
  app = createBackendApp({
    dataDir: tempDir,
    jwtSecret: 'test-secret',
    adminUsername: 'admin',
    adminPassword: 'admin-pass',
    defaultProvider: {
      providerType: 'openai-compatible',
      baseUrl: 'https://example.test/v1',
      apiKey: 'sk-test',
      model: 'gpt-test'
    },
    translateText: async ({ text, targetLanguage, provider }) => ({
      sourceText: text,
      targetLanguage,
      translatedText: `translated:${text}`,
      provider: provider.providerType
    })
  });
});

afterEach(async () => {
  await app.store.waitForMetrics();
  await rm(tempDir, { recursive: true, force: true });
});

async function request(method, pathname, body, token) {
  return app.handleRequest({
    method,
    url: pathname,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : ''
  });
}

describe('backend app', () => {
  it('registers a user, logs in, and syncs user state', async () => {
    const registerResponse = await request('POST', '/api/auth/register', {
      email: 'user@example.com',
      password: 'secret123',
      displayName: '测试用户'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.email).toBe('user@example.com');
    expect(registerResponse.body.token).toEqual(expect.any(String));

    const loginResponse = await request('POST', '/api/auth/login', {
      email: 'user@example.com',
      password: 'secret123'
    });
    expect(loginResponse.status).toBe(200);

    const saveResponse = await request(
      'PUT',
      '/api/sync/state',
      {
        history: [{ id: '1', sourceText: 'hello', translatedText: '你好' }],
        favoriteIds: ['1'],
        settings: { defaultTargetLanguage: 'zh-CN' }
      },
      loginResponse.body.token
    );
    expect(saveResponse.status).toBe(200);

    const stateResponse = await request('GET', '/api/sync/state', undefined, loginResponse.body.token);
    expect(stateResponse.status).toBe(200);
    expect(stateResponse.body.state.history).toHaveLength(1);
    expect(stateResponse.body.state.favoriteIds).toEqual(['1']);
    expect(stateResponse.body.state.settings.defaultTargetLanguage).toBe('zh-CN');
  });

  it('preserves user records during concurrent registrations', async () => {
    const responses = await Promise.all(
      Array.from({ length: 40 }, (_value, index) =>
        request('POST', '/api/auth/register', {
          email: `concurrent-${index}@example.com`,
          password: 'secret123',
          displayName: `并发用户 ${index}`
        })
      )
    );
    const adminLoginResponse = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin-pass'
    });
    const usersResponse = await request('GET', '/api/admin/users', undefined, adminLoginResponse.body.token);

    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(usersResponse.body.total).toBe(40);
  });

  it('rejects protected sync requests without a token', async () => {
    const response = await request('GET', '/api/sync/state');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('请先登录');
  });

  it('allows the admin account to read and update provider settings', async () => {
    const loginResponse = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin-pass'
    });
    expect(loginResponse.status).toBe(200);

    const updateResponse = await request(
      'PUT',
      '/api/admin/provider',
      {
        providerType: 'openai-compatible',
        baseUrl: 'https://provider.test/v1',
        apiKey: 'sk-provider',
        model: 'gpt-provider'
      },
      loginResponse.body.token
    );
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.provider.apiKey).toBe('');
    expect(updateResponse.body.provider.maskedApiKey).toBe('sk-••••••••ider');
    expect(updateResponse.body.provider.hasApiKey).toBe(true);

    const readResponse = await request('GET', '/api/admin/provider', undefined, loginResponse.body.token);
    expect(readResponse.status).toBe(200);
    expect(readResponse.body.provider.baseUrl).toBe('https://provider.test/v1');
    expect(readResponse.body.provider.apiKey).toBe('');
    expect(readResponse.body.provider.hasApiKey).toBe(true);

    const providerListResponse = await request('GET', '/api/admin/providers', undefined, loginResponse.body.token);
    expect(providerListResponse.status).toBe(200);
    expect(providerListResponse.body.providers).toHaveLength(1);
    expect(providerListResponse.body.providers[0]).toMatchObject({
      active: true,
      baseUrl: 'https://provider.test/v1',
      apiKey: '',
      maskedApiKey: 'sk-••••••••ider'
    });
  });

  it('allows the admin account to add engines and switch the active provider', async () => {
    const loginResponse = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin-pass'
    });
    const createResponse = await request(
      'POST',
      '/api/admin/providers',
      {
        name: '备用引擎',
        providerType: 'openai-compatible',
        baseUrl: 'https://backup.test/v1',
        apiKey: 'sk-backup',
        model: 'gpt-backup',
        active: true
      },
      loginResponse.body.token
    );

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.provider).toMatchObject({
      name: '备用引擎',
      baseUrl: 'https://backup.test/v1',
      hasApiKey: true,
      apiKey: ''
    });

    const providerListResponse = await request('GET', '/api/admin/providers', undefined, loginResponse.body.token);
    expect(providerListResponse.body.providers).toHaveLength(2);
    const backupProvider = providerListResponse.body.providers.find((provider) => provider.name === '备用引擎');
    expect(backupProvider.active).toBe(true);

    const deleteResponse = await request('DELETE', `/api/admin/providers/${backupProvider.id}`, undefined, loginResponse.body.token);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.providers).toHaveLength(1);
    expect(deleteResponse.body.providers[0].active).toBe(true);
  });

  it('loads provider models through the admin backend', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      expect(url).toBe('https://models.test/v1/models');
      expect(options.headers.authorization).toBe('Bearer sk-models');
      return new Response(JSON.stringify({ data: [{ id: 'gpt-model-a' }, { id: 'gpt-model-b' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    };

    try {
      const loginResponse = await request('POST', '/api/admin/login', {
        username: 'admin',
        password: 'admin-pass'
      });
      const response = await request(
        'POST',
        '/api/admin/provider-models',
        {
          providerType: 'openai-compatible',
          baseUrl: 'https://models.test/v1',
          apiKey: 'sk-models'
        },
        loginResponse.body.token
      );

      expect(response.status).toBe(200);
      expect(response.body.models).toEqual(['gpt-model-a', 'gpt-model-b']);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('allows the admin account to view registered users and usage summary', async () => {
    const firstRegisterResponse = await request('POST', '/api/auth/register', {
      email: 'first@example.com',
      password: 'secret123',
      displayName: '第一位用户'
    });
    const secondRegisterResponse = await request('POST', '/api/auth/register', {
      email: 'second@example.com',
      password: 'secret123',
      displayName: '第二位用户'
    });
    await request(
      'PUT',
      '/api/sync/state',
      {
        history: [
          { id: '1', sourceText: 'hello', translatedText: '你好' },
          { id: '2', sourceText: 'world', translatedText: '世界' }
        ],
        favoriteIds: ['1'],
        settings: { defaultTargetLanguage: 'en-US' }
      },
      firstRegisterResponse.body.token
    );

    const adminLoginResponse = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin-pass'
    });
    const usersResponse = await request('GET', '/api/admin/users', undefined, adminLoginResponse.body.token);

    expect(secondRegisterResponse.status).toBe(201);
    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body.total).toBe(2);
    expect(usersResponse.body.users[0]).toMatchObject({
      email: 'second@example.com',
      displayName: '第二位用户',
      historyCount: 0,
      favoriteCount: 0
    });
    expect(usersResponse.body.users[1]).toMatchObject({
      email: 'first@example.com',
      displayName: '第一位用户',
      historyCount: 2,
      favoriteCount: 1,
      defaultTargetLanguage: 'en-US'
    });
    expect(usersResponse.body.users[0].passwordHash).toBeUndefined();
  });

  it('allows the admin account to update user email, display name, and password', async () => {
    const registerResponse = await request('POST', '/api/auth/register', {
      email: 'editable@example.com',
      password: 'secret123',
      displayName: '待编辑用户'
    });
    const adminLoginResponse = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin-pass'
    });

    const updateResponse = await request(
      'PUT',
      `/api/admin/users/${registerResponse.body.user.id}`,
      {
        email: 'updated@example.com',
        displayName: '已编辑用户',
        password: 'new-secret'
      },
      adminLoginResponse.body.token
    );
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user).toMatchObject({
      email: 'updated@example.com',
      displayName: '已编辑用户'
    });

    const oldLoginResponse = await request('POST', '/api/auth/login', {
      email: 'editable@example.com',
      password: 'secret123'
    });
    expect(oldLoginResponse.status).toBe(401);

    const newLoginResponse = await request('POST', '/api/auth/login', {
      email: 'updated@example.com',
      password: 'new-secret'
    });
    expect(newLoginResponse.status).toBe(200);

    const deleteResponse = await request('DELETE', `/api/admin/users/${registerResponse.body.user.id}`, undefined, adminLoginResponse.body.token);
    expect(deleteResponse.status).toBe(200);
    const usersResponse = await request('GET', '/api/admin/users', undefined, adminLoginResponse.body.token);
    expect(usersResponse.body.users).toEqual([]);
  });

  it('returns the download release list', async () => {
    await app.store.saveDownloadManifest({
      latestVersion: '0.1.14',
      releases: [
        {
          version: '0.1.14',
          fileName: '快捷翻译 Setup 0.1.14.exe',
          url: '/quick-translate/updates/latest/%E5%BF%AB%E6%8D%B7.exe',
          size: 99,
          sha512: 'hash',
          releaseDate: '2026-05-07T12:48:37.123Z'
        }
      ]
    });

    const response = await request('GET', '/api/downloads');

    expect(response.status).toBe(200);
    expect(response.body.latestVersion).toBe('0.1.14');
    expect(response.body.releases[0].fileName).toContain('快捷翻译');
    expect(response.body.releases[0].platform).toBe('windows');
  });

  it('tracks download clicks and API call counts for the admin dashboard', async () => {
    const adminLoginResponse = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin-pass'
    });

    const downloadsResponse = await request('GET', '/api/downloads');
    expect(downloadsResponse.status).toBe(200);

    const trackResponse = await request('POST', '/api/downloads/track', {
      version: '0.1.46',
      platform: 'windows',
      fileName: 'Quick-Translate-0.1.46.exe'
    });
    expect(trackResponse.status).toBe(200);

    const statsResponse = await request('GET', '/api/admin/stats', undefined, adminLoginResponse.body.token);

    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.metrics.downloads.total).toBe(1);
    expect(statsResponse.body.metrics.downloads.byPlatform.windows).toBe(1);
    expect(statsResponse.body.metrics.downloads.byVersion['0.1.46']).toBe(1);
    expect(statsResponse.body.metrics.apiCalls.total).toBeGreaterThanOrEqual(4);
    expect(statsResponse.body.metrics.apiCalls.byEndpoint['GET /api/downloads']).toBe(1);
    expect(statsResponse.body.metrics.apiCalls.byEndpoint['POST /api/downloads/track']).toBe(1);
  });

  it('tracks daily translation usage for the admin dashboard', async () => {
    const adminLoginResponse = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin-pass'
    });
    const today = new Date().toISOString().slice(0, 10);

    const firstTranslateResponse = await request('POST', '/api/translate', {
      text: 'hello',
      targetLanguage: 'zh-CN',
      translationFormat: 'plain'
    });
    const secondTranslateResponse = await request('POST', '/api/translate', {
      text: 'world',
      targetLanguage: 'zh-CN',
      translationFormat: 'plain'
    });
    const statsResponse = await request('GET', '/api/admin/stats', undefined, adminLoginResponse.body.token);

    expect(firstTranslateResponse.status).toBe(200);
    expect(secondTranslateResponse.status).toBe(200);
    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.metrics.translations.total).toBe(2);
    expect(statsResponse.body.metrics.translations.byDay[today]).toBe(2);
  });

  it('accepts the nginx backend prefix in API paths', async () => {
    const response = await request('GET', '/quick-translate/backend/api/downloads');

    expect(response.status).toBe(200);
    expect(response.body.releases).toEqual([]);
  });
});
