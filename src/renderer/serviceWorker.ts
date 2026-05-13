const APP_CACHE_PREFIX = 'quick-translate-';

export async function prepareServiceWorkerForCurrentMode(isDevelopment: boolean): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (isDevelopment || isNativeCapacitorApp()) {
    await unregisterServiceWorkersAndClearCaches();
    return;
  }

  await navigator.serviceWorker.register(new URL('sw.js', window.location.href));
}

export async function unregisterServiceWorkersAndClearCaches(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((cacheKey) => cacheKey.startsWith(APP_CACHE_PREFIX))
        .map((cacheKey) => caches.delete(cacheKey))
    );
  }
}

function isNativeCapacitorApp() {
  const capacitor = (globalThis as typeof globalThis & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
    .Capacitor;

  return Boolean(
    capacitor?.isNativePlatform?.() ||
      ['android', 'ios'].includes(capacitor?.getPlatform?.() ?? '') ||
      (window.location.protocol === 'https:' && window.location.hostname === 'localhost') ||
      window.location.protocol === 'capacitor:'
  );
}
