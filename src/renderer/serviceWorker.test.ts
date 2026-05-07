import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareServiceWorkerForCurrentMode, unregisterServiceWorkersAndClearCaches } from './serviceWorker';

describe('serviceWorker', () => {
  const unregister = vi.fn().mockResolvedValue(true);
  const register = vi.fn().mockResolvedValue(undefined);
  const cacheDelete = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    unregister.mockClear();
    register.mockClear();
    cacheDelete.mockClear();

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
        register
      }
    });

    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: vi.fn().mockResolvedValue(['quick-translate-v1', 'other-cache']),
        delete: cacheDelete
      }
    });
  });

  it('unregisters old service workers and clears app caches in development', async () => {
    await prepareServiceWorkerForCurrentMode(true);

    expect(unregister).toHaveBeenCalledOnce();
    expect(cacheDelete).toHaveBeenCalledWith('quick-translate-v1');
    expect(cacheDelete).not.toHaveBeenCalledWith('other-cache');
    expect(register).not.toHaveBeenCalled();
  });

  it('registers the production service worker outside development', async () => {
    await prepareServiceWorkerForCurrentMode(false);

    expect(register).toHaveBeenCalledWith(new URL('sw.js', window.location.href));
  });

  it('can run explicit cleanup for a stale development page', async () => {
    await unregisterServiceWorkersAndClearCaches();

    expect(unregister).toHaveBeenCalledOnce();
    expect(cacheDelete).toHaveBeenCalledWith('quick-translate-v1');
  });
});
