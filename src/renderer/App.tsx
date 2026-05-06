import { Clipboard, Copy, Languages, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { translateText, type TranslateTextResult } from '../shared/translator';
import { createProviderFromSettings, defaultProviderSettings, type ProviderType } from './providerConfig';
import { readSharedTextFromUrl } from './sharedText';
import './styles.css';

const languageOptions = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: '英语' },
  { value: 'ja-JP', label: '日语' },
  { value: 'ko-KR', label: '韩语' },
  { value: 'fr-FR', label: '法语' }
];

type TranslationStatus = 'idle' | 'loading' | 'success' | 'error';

export function App() {
  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('zh-CN');
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<TranslateTextResult | null>(null);
  const [providerType, setProviderType] = useState<ProviderType>(defaultProviderSettings.providerType);
  const [apiKey, setApiKey] = useState(defaultProviderSettings.apiKey);
  const [baseUrl, setBaseUrl] = useState(defaultProviderSettings.baseUrl);
  const [model, setModel] = useState(defaultProviderSettings.model);
  const lastMouseShortcutAt = useRef(0);

  useEffect(() => {
    document.title = '快捷翻译';
  }, []);

  const sourceLength = sourceText.trim().length;
  const canTranslate = sourceLength > 0 && status !== 'loading';
  const selectedLanguage = useMemo(
    () => languageOptions.find((option) => option.value === targetLanguage)?.label ?? targetLanguage,
    [targetLanguage]
  );

  useEffect(() => {
    return window.quickTranslate?.onSelectionCaptured?.((text) => {
      setSourceText(text);
      void runTranslation(text, targetLanguage);
    });
  }, [targetLanguage]);

  useEffect(() => {
    const sharedText = readSharedTextFromUrl(window.location.href);
    if (sharedText) {
      setSourceText(sharedText);
      void runTranslation(sharedText, targetLanguage);
    }
  }, []);

  useEffect(() => {
    const handleMouseButtonShortcut = (event: MouseEvent) => {
      if (event.button !== 3) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const now = Date.now();
      if (now - lastMouseShortcutAt.current < 250) {
        return;
      }
      lastMouseShortcutAt.current = now;

      void translateClipboard();
    };

    window.addEventListener('mouseup', handleMouseButtonShortcut, { capture: true });
    window.addEventListener('auxclick', handleMouseButtonShortcut, { capture: true });

    return () => {
      window.removeEventListener('mouseup', handleMouseButtonShortcut, { capture: true });
      window.removeEventListener('auxclick', handleMouseButtonShortcut, { capture: true });
    };
  }, [targetLanguage, providerType, apiKey, baseUrl, model]);

  async function runTranslation(text = sourceText, language = targetLanguage) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      setStatus('error');
      setError('没有可翻译的文本');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const translation = await translateText({
        text: normalizedText,
        targetLanguage: language,
        provider: createProviderFromSettings({
          providerType,
          apiKey,
          baseUrl,
          model
        })
      });
      setResult(translation);
      setStatus('success');
    } catch (translationError) {
      setStatus('error');
      setError(translationError instanceof Error ? translationError.message : '翻译失败');
    }
  }

  async function translateClipboard() {
    const capturedText =
      (await window.quickTranslate?.captureSelectedText?.()) ??
      (await navigator.clipboard?.readText?.().catch(() => '')) ??
      '';

    setSourceText(capturedText);
    await runTranslation(capturedText, targetLanguage);
  }

  async function copyResult() {
    if (!result?.translatedText) {
      return;
    }

    if (window.quickTranslate?.copyText) {
      await window.quickTranslate.copyText(result.translatedText);
      return;
    }

    await navigator.clipboard?.writeText?.(result.translatedText);
  }

  function clearText() {
    setSourceText('');
    setResult(null);
    setError('');
    setStatus('idle');
  }

  return (
    <main className="app-shell">
      <section className="translator-surface" aria-label="快捷翻译">
        <header className="app-header">
          <div>
            <h1>快捷翻译</h1>
            <div className="shortcut-row" aria-label="翻译快捷键">
              <span className="keycap wide-keycap">鼠标键</span>
              <span className="keycap">4</span>
              <span className="shortcut-inline">鼠标键 4</span>
            </div>
          </div>
          <div className="brand-mark" aria-hidden="true">
            <Languages size={26} />
          </div>
        </header>

        <div className="controls-row">
          <label className="field compact-field">
            <span>目标语言</span>
            <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field compact-field">
            <span>引擎</span>
            <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderType)}>
              <option value="mock">离线示例</option>
              <option value="openai-compatible">兼容接口</option>
            </select>
          </label>

          <button className="secondary-button" type="button" onClick={translateClipboard}>
            <Clipboard size={17} />
            <span>翻译剪贴板</span>
          </button>
        </div>

        {providerType === 'openai-compatible' ? (
          <div className="provider-grid">
            <label className="field">
              <span>接口密钥</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                placeholder="输入接口密钥"
              />
            </label>
            <label className="field">
              <span>接口地址</span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            </label>
            <label className="field">
              <span>模型名称</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} />
            </label>
          </div>
        ) : null}

        <label className="field source-field">
          <span>原文</span>
          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="粘贴或输入需要翻译的文本"
            rows={7}
          />
        </label>

        <div className="action-row">
          <span className="counter">{sourceLength} 字符</span>
          <div className="button-cluster">
            <button className="ghost-button" type="button" onClick={clearText} aria-label="清空">
              <RotateCcw size={17} />
            </button>
            <button className="primary-button" type="button" disabled={!canTranslate} onClick={() => runTranslation()}>
              <Languages size={17} />
              <span>{status === 'loading' ? '翻译中' : '翻译'}</span>
            </button>
          </div>
        </div>

        <section className="result-panel" aria-live="polite">
          <div className="result-header">
            <div>
              <span className="panel-label">译文</span>
              <strong>{selectedLanguage}</strong>
            </div>
            <button className="icon-text-button" type="button" onClick={copyResult} disabled={!result?.translatedText}>
              <Copy size={16} />
              <span>复制</span>
            </button>
          </div>

          {status === 'error' ? <p className="error-message">{error}</p> : null}
          {result ? <p className="translated-text">{result.translatedText}</p> : null}
          {!result && status !== 'error' ? <p className="empty-state">翻译结果会显示在这里</p> : null}
        </section>
      </section>
    </main>
  );
}
