import { describe, expect, it } from 'vitest';
import { clearAccountSession, loadAccountSession, saveAccountSession } from './accountSession';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

describe('accountSession', () => {
  it('saves and loads the signed-in user session', () => {
    const storage = createMemoryStorage();

    saveAccountSession(
      {
        token: 'token-1',
        user: { id: 'u1', email: 'user@example.com', displayName: '用户' }
      },
      storage
    );

    expect(loadAccountSession(storage)?.user.email).toBe('user@example.com');
  });

  it('returns null for malformed stored sessions', () => {
    const storage = createMemoryStorage();
    storage.setItem('quick-translate-account-session', '{bad');

    expect(loadAccountSession(storage)).toBeNull();
  });

  it('clears the stored account session', () => {
    const storage = createMemoryStorage();
    saveAccountSession(
      {
        token: 'token-1',
        user: { id: 'u1', email: 'user@example.com', displayName: '用户' }
      },
      storage
    );

    clearAccountSession(storage);

    expect(loadAccountSession(storage)).toBeNull();
  });
});
