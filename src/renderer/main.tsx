import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { prepareServiceWorkerForCurrentMode } from './serviceWorker';
import { applyStoredThemePreference } from './themePreference';

void bootstrapRenderer();

async function bootstrapRenderer() {
  try {
    applyStoredThemePreference();
    const runtimePreparation = prepareRendererRuntime();
    if (shouldAwaitRendererRuntimePreparation()) {
      await runtimePreparation;
    } else {
      void runtimePreparation.catch(() => undefined);
    }

    const isFloatingWindow = new URLSearchParams(window.location.search).has('floating');
    const App = isFloatingWindow ? (await import('./FloatingTranslateApp')).FloatingTranslateApp : (await import('./App')).App;
    const rootElement = document.getElementById('root');

    if (!rootElement) {
      throw new Error('Root element is missing');
    }

    createRoot(rootElement).render(
      <StrictMode>
        <StartupErrorBoundary>
          <App />
        </StartupErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    renderStartupFailure(error);
  }
}

function shouldAwaitRendererRuntimePreparation() {
  return isNativeWebViewEnvironment();
}

async function prepareRendererRuntime() {
  if (!import.meta.env.DEV && !isNativeWebViewEnvironment()) {
    return;
  }

  await window.__quickTranslateStartupCacheReset?.catch(() => undefined);
  await prepareServiceWorkerForCurrentMode(import.meta.env.DEV);
}

function renderStartupFailure(error: unknown) {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'min-height:100vh;display:grid;place-items:center;padding:24px;color:#334155;font:15px Microsoft YaHei UI,sans-serif;text-align:center;background:#f8fafc;';

  const content = document.createElement('div');
  content.style.cssText = 'max-width:320px;line-height:1.7;';

  const title = document.createElement('strong');
  title.textContent = '快捷翻译启动失败';

  const hint = document.createElement('div');
  hint.textContent = '请关闭后重新打开，或安装最新版本。';

  const details = document.createElement('small');
  details.style.cssText = 'display:block;margin-top:8px;color:#64748b;word-break:break-word;';
  details.textContent = error instanceof Error && error.message ? error.message : '未知错误';

  content.append(title, hint, details);
  wrapper.append(content);
  rootElement.replaceChildren(wrapper);
}

function isNativeWebViewEnvironment() {
  return Boolean(
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost') ||
      window.location.protocol === 'capacitor:'
  );
}

type StartupErrorBoundaryProps = {
  children: ReactNode;
};

type StartupErrorBoundaryState = {
  error: Error | null;
};

class StartupErrorBoundary extends Component<StartupErrorBoundaryProps, StartupErrorBoundaryState> {
  state: StartupErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): StartupErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <StartupErrorView error={this.state.error} />;
    }

    return this.props.children;
  }
}

function StartupErrorView({ error }: { error: Error }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        color: '#334155',
        font: '15px Microsoft YaHei UI, sans-serif',
        textAlign: 'center',
        background: '#f8fafc'
      }}
    >
      <div style={{ maxWidth: '320px', lineHeight: 1.7 }}>
        <strong>快捷翻译启动失败</strong>
        <div>请关闭后重新打开，或安装最新版本。</div>
        <small style={{ display: 'block', marginTop: '8px', color: '#64748b', wordBreak: 'break-word' }}>
          {error.message || '未知错误'}
        </small>
      </div>
    </div>
  );
}
