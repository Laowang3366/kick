import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { prepareServiceWorkerForCurrentMode } from './serviceWorker';

if (import.meta.env.DEV) {
  await window.__quickTranslateDevCacheReset?.catch(() => undefined);
  await prepareServiceWorkerForCurrentMode(true);
} else {
  void prepareServiceWorkerForCurrentMode(false);
}

const { App } = await import('./App');

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
