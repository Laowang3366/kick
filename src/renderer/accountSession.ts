import type { CloudUser } from './cloudClient';

export const ACCOUNT_SESSION_STORAGE_KEY = 'quick-translate-account-session';

export type AccountSession = {
  token: string;
  user: CloudUser;
};

export function loadAccountSession(storage: Storage = localStorage): AccountSession | null {
  const storedValue = storage.getItem(ACCOUNT_SESSION_STORAGE_KEY);
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    if (!isRecord(parsedValue) || typeof parsedValue.token !== 'string' || !isRecord(parsedValue.user)) {
      return null;
    }

    const user = parsedValue.user;
    if (typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.displayName !== 'string') {
      return null;
    }

    return {
      token: parsedValue.token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch {
    return null;
  }
}

export function saveAccountSession(session: AccountSession, storage: Storage = localStorage) {
  storage.setItem(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAccountSession(storage: Storage = localStorage) {
  storage.removeItem(ACCOUNT_SESSION_STORAGE_KEY);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
