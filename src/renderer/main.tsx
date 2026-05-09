import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { prepareServiceWorkerForCurrentMode } from './serviceWorker';
import { applyStoredThemePreference } from './themePreference';

applyStoredThemePreference();

void prepareRendererRuntime();

const isFloatingWindow = new URLSearchParams(window.location.search).has('floating');
const App = isFloatingWindow ? (await import('./FloatingTranslateApp')).FloatingTranslateApp : (await import('./App')).App;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

async function prepareRendererRuntime() {
  if (import.meta.env.DEV) {
    await window.__quickTranslateDevCacheReset?.catch(() => undefined);
    await prepareServiceWorkerForCurrentMode(true);
  } else {
    await prepareServiceWorkerForCurrentMode(false);
  }
}
