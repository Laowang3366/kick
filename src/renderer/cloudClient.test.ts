import { describe, expect, it, vi } from 'vitest';
import { createCloudClient } from './cloudClient';

describe('cloudClient', () => {
  it('registers and logs in against the cloud API', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token: 'token-1',
          user: { id: 'u1', email: 'user@example.com', displayName: '用户' }
        })
    });
    const client = createCloudClient({ baseUrl: 'https://api.example.com', fetcher });

    const result = await client.register({
      email: 'user@example.com',
      password: 'secret123',
      displayName: '用户'
    });

    expect(fetcher).toHaveBeenCalledWith('https://api.example.com/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'secret123',
        displayName: '用户'
      })
    });
    expect(result.token).toBe('token-1');
  });

  it('saves and loads the synced user state with bearer auth', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ state: { history: [], favoriteIds: [], settings: {} } }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            state: {
              history: [{ id: '1' }],
              favoriteIds: ['1'],
              settings: { defaultTargetLanguage: 'en-US' }
            }
          })
      });
    const client = createCloudClient({ baseUrl: 'https://api.example.com/', fetcher });

    await client.saveState('token-1', {
      history: [],
      favoriteIds: [],
      settings: {}
    });
    const state = await client.loadState('token-1');

    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://api.example.com/api/sync/state', {
      method: 'PUT',
      headers: {
        authorization: 'Bearer token-1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ history: [], favoriteIds: [], settings: {} })
    });
    expect(state.favoriteIds).toEqual(['1']);
  });

  it('throws the server error message when the request fails', async () => {
    const client = createCloudClient({
      baseUrl: 'https://api.example.com',
      fetcher: vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: '邮箱或密码错误' })
      })
    });

    await expect(client.login({ email: 'user@example.com', password: 'bad' })).rejects.toThrow('邮箱或密码错误');
  });
});
