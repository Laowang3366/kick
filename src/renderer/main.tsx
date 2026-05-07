import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { prepareServiceWorkerForCurrentMode } from './serviceWorker';
import { applyStoredThemePreference } from './themePreference';

applyStoredThemePreference();

if (import.meta.env.DEV) {
  await window.__quickTranslateDevCacheReset?.catch(() => undefined);
  await prepareServiceWorkerForCurrentMode(true);
} else {
  void prepareServiceWorkerForCurrentMode(false);
}

const isFloatingWindow = new URLSearchParams(window.location.search).has('floating');
const App = isFloatingWindow ? (await import('./FloatingTranslateApp')).FloatingTranslateApp : (await import('./App')).App;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
