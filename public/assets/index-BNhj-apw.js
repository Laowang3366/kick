const cachePrefix = 'quick-translate-';

async function clearStaleShellCache() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys.filter((cacheKey) => cacheKey.startsWith(cachePrefix)).map((cacheKey) => caches.delete(cacheKey))
    );
  }
}

await clearStaleShellCache().catch(() => undefined);
window.location.replace(new URL('./', window.location.href));
