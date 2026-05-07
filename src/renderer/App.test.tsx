import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { ACCOUNT_SESSION_STORAGE_KEY } from './accountSession';
import { defaultCloudBaseUrl } from './cloudClient';
import { DEFAULT_TARGET_LANGUAGE_STORAGE_KEY } from './languagePreference';
import { THEME_STORAGE_KEY } from './themePreference';
import { DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY } from './translationFormatPreference';

describe('App', () => {
  afterEach(() => {
    window.quickTranslate = undefined;
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function submitTranslation() {
    fireEvent.keyDown(screen.getByLabelText('原文'), {
      key: 'Enter',
      ctrlKey: true
    });
  }

  it('translates typed or pasted text through the mock provider', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();

    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });
  });

  it('shows the detected source language from the original text', () => {
    render(<App />);

    expect(screen.getByRole('option', { name: '自动检测' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: '我会把原生菜单栏去掉' }
    });

    expect(screen.getByRole('option', { name: '中文' })).toBeInTheDocument();
  });

  it('renders a styled world-language target picker', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '目标语言：简体中文' }));

    expect(screen.getByRole('listbox', { name: '目标语言列表' })).toHaveClass('language-menu');
    expect(screen.getByRole('option', { name: '阿拉伯语' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '印地语' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '斯瓦希里语' })).toBeInTheDocument();
  });

  it('closes the target language picker when clicking outside it', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '目标语言：简体中文' }));
    expect(screen.getByRole('listbox', { name: '目标语言列表' })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('listbox', { name: '目标语言列表' })).not.toBeInTheDocument();
  });

  it('uses the locally stored default target language for translation', async () => {
    localStorage.setItem(DEFAULT_TARGET_LANGUAGE_STORAGE_KEY, 'es-ES');
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: 'hola',
        targetLanguage: 'es-ES'
      })
    } as any;

    render(<App />);

    expect(screen.getByRole('button', { name: '目标语言：西班牙语' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: 'hello',
        targetLanguage: 'es-ES',
        translationFormat: 'plain'
      });
    });
  });

  it('keeps the default target language preference separate from the translate view selection', async () => {
    const setDesktopSettings = vi.fn().mockResolvedValue({
      mouseButton4Enabled: true,
      launchAtLogin: false,
      hideToTrayOnClose: true,
      defaultTargetLanguage: 'es-ES',
      defaultTranslationFormat: 'plain'
    });
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      getDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'es-ES',
        defaultTranslationFormat: 'plain'
      }),
      onDesktopSettingsChanged: vi.fn(),
      onSelectionCaptured: vi.fn(),
      setDesktopSettings
    } as any;

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '目标语言：西班牙语' }));
    fireEvent.click(screen.getByRole('option', { name: '日语' }));
    expect(screen.getByRole('button', { name: '目标语言：日语' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    expect(screen.getByLabelText('默认目标语言')).toHaveValue('es-ES');
    expect(setDesktopSettings).not.toHaveBeenCalled();
  });

  it('uses the locally stored translation format for translation', async () => {
    localStorage.setItem(DEFAULT_TARGET_LANGUAGE_STORAGE_KEY, 'en-US');
    localStorage.setItem(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY, 'java-camel-case');
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'user name',
        translatedText: 'userName',
        targetLanguage: 'en-US'
      })
    } as any;

    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'user name' }
    });
    submitTranslation();

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: 'user name',
        targetLanguage: 'en-US',
        translationFormat: 'java-camel-case'
      });
    });
  });

  it('forces plain format and disables format selection when the target language is not English', async () => {
    localStorage.setItem(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY, 'java-camel-case');
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '你好',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    expect(screen.getByRole('combobox', { name: '翻译格式' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: 'hello',
        targetLanguage: 'zh-CN',
        translationFormat: 'plain'
      });
    });
  });

  it('renders long translations inside a scrollable result body', async () => {
    const longTranslation = Array.from({ length: 30 }, () => 'long translated content').join(' ');
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: longTranslation,
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();

    const translatedText = await screen.findByText(longTranslation);
    expect(translatedText.closest('.result-body')).toBeInTheDocument();
  });

  it('clears the current translation when the source text is manually emptied', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '你好',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    const sourceInput = screen.getByLabelText('原文');
    fireEvent.change(sourceInput, {
      target: { value: 'hello' }
    });
    submitTranslation();

    expect(await screen.findByText('你好')).toBeInTheDocument();

    fireEvent.change(sourceInput, {
      target: { value: '' }
    });

    expect(screen.queryByText('你好')).not.toBeInTheDocument();
    expect(screen.getByText('翻译结果会显示在这里')).toBeInTheDocument();
  });

  it('renders history entries in a scrollable list region', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn(async ({ text }) => ({
        provider: 'openai-compatible',
        sourceText: text,
        translatedText: `译文 ${text}`,
        targetLanguage: 'zh-CN'
      }))
    } as any;

    render(<App />);

    const sourceInput = screen.getByLabelText('原文');
    for (const value of ['one', 'two', 'three', 'four']) {
      fireEvent.change(sourceInput, {
        target: { value }
      });
      submitTranslation();
      await screen.findByText(`译文 ${value}`);
    }

    fireEvent.click(screen.getByRole('button', { name: '历史记录' }));

    const historyList = screen.getByRole('list', { name: '历史记录列表' });
    expect(historyList).toHaveClass('entry-list');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('shows the lower mouse side button as the shortcut entry point', () => {
    render(<App />);

    expect(screen.getByText('鼠标下侧键')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '翻译剪贴板' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '翻译格式' })).toBeInTheDocument();
  });

  it('moves translation format to the result header and removes the bottom action bar', () => {
    render(<App />);

    const formatSelect = screen.getByRole('combobox', { name: '翻译格式' });

    expect(formatSelect.closest('.result-meta')).toBeInTheDocument();
    expect(screen.queryByLabelText('翻译操作')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '翻译' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '复制' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开历史记录' })).not.toBeInTheDocument();
  });

  it('does not render the decorative walking mascot at the bottom of the desktop app', () => {
    const { container } = render(<App />);

    expect(container.querySelector('.walking-mascot-track')).not.toBeInTheDocument();
    expect(container.querySelector('.walking-mascot-figure')).not.toBeInTheDocument();
  });

  it('automatically translates shortly after the user types in the source box', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '你好',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: 'hello',
        targetLanguage: 'zh-CN',
        translationFormat: 'plain'
      });
    });
    expect(await screen.findByText('你好')).toBeInTheDocument();
  });

  it('uses the selected translation format from the translate toolbar', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'user name',
        translatedText: 'userName',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '目标语言：简体中文' }));
    fireEvent.click(screen.getByRole('option', { name: '英语' }));
    fireEvent.change(screen.getByRole('combobox', { name: '翻译格式' }), {
      target: { value: 'java-camel-case' }
    });
    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'user name' }
    });
    submitTranslation();

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: 'user name',
        targetLanguage: 'en-US',
        translationFormat: 'java-camel-case'
      });
    });
    expect(localStorage.getItem(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY)).toBe('java-camel-case');
  });

  it('shows whether copying the current translation succeeded', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn().mockResolvedValue(undefined),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '你好',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();
    expect(await screen.findByText('你好')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '复制译文' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('已复制译文');
    });
  });

  it('shows a failure notice when copying the current translation fails', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn().mockRejectedValue(new Error('copy failed')),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '你好',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();
    expect(await screen.findByText('你好')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '复制译文' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('复制失败');
    });
  });

  it('renders user-facing controls in Chinese', () => {
    document.title = '';

    render(<App />);

    expect(document.title).toBe('快捷翻译');
    expect(screen.getByRole('heading', { name: '快捷翻译' })).toBeInTheDocument();
    expect(screen.getByText('源语言')).toBeInTheDocument();
    expect(screen.getByText('目标语言')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '自动检测' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '目标语言：简体中文' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '翻译视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '历史记录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收藏列表' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '账号' })).toBeInTheDocument();
    expect(screen.queryByText('Quick Translate')).not.toBeInTheDocument();
    expect(screen.queryByText('Source Language')).not.toBeInTheDocument();
    expect(screen.queryByText('Target Language')).not.toBeInTheDocument();
    expect(screen.queryByText('文件')).not.toBeInTheDocument();
    expect(screen.queryByText('编辑')).not.toBeInTheDocument();
    expect(screen.queryByText('视图')).not.toBeInTheDocument();
    expect(screen.queryByText('窗口')).not.toBeInTheDocument();
    expect(screen.queryByText('帮助')).not.toBeInTheDocument();
    expect(screen.queryByText('Speak')).not.toBeInTheDocument();
    expect(screen.queryByText('朗读')).not.toBeInTheDocument();
    expect(screen.queryByText('Mock')).not.toBeInTheDocument();
    expect(screen.queryByText('OpenAI Compatible')).not.toBeInTheDocument();
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('adds login and registration entry points for cloud backup', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '账号' }));

    expect(screen.getByRole('heading', { name: '账号登录' })).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('记住密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '忘记密码' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '注册' }));

    expect(screen.getByRole('heading', { name: '账号注册' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册并登录' })).toBeInTheDocument();
    expect(screen.getByText('登录后会同步翻译历史、收藏和本地设置。')).toBeInTheDocument();
  });

  it('logs in and stores the account session locally', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token: 'token-1',
          user: { id: 'u1', email: 'user@example.com', displayName: '用户' }
        })
    } as Response);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '账号' }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(screen.getByText('用户')).toBeInTheDocument();
    });
    expect(localStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY)).toContain('token-1');
  });

  it('remembers the local account password when requested', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            token: 'token-1',
            user: { id: 'u1', email: 'user@example.com', displayName: '用户' }
          })
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ state: { history: [], favoriteIds: [], settings: {} } })
      } as Response);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '账号' }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByLabelText('记住密码'));
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(localStorage.getItem('quick-translate-remembered-account')).toContain('secret123');
    });
  });

  it('syncs history and preferences to the cloud after login', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            token: 'token-1',
            user: { id: 'u1', email: 'user@example.com', displayName: '用户' }
          })
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ state: { history: [], favoriteIds: [], settings: {} } })
      } as Response);

    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '你好',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '账号' }));
    fireEvent.change(screen.getByLabelText('邮箱'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    await screen.findByText('用户');

    fireEvent.click(screen.getByRole('button', { name: '翻译视图' }));
    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`${defaultCloudBaseUrl}/api/sync/state`, expect.objectContaining({ method: 'PUT' }));
    });
  });

  it('switches the app theme from settings and stores the preference', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.click(screen.getByRole('button', { name: '深色主题' }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: '深色主题' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '浅色主题' }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('routes internal window controls through the desktop bridge', () => {
    const windowControl = vi.fn().mockResolvedValue(undefined);
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      windowControl
    } as any;

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '最小化窗口' }));
    fireEvent.click(screen.getByRole('button', { name: '最大化或还原窗口' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭窗口' }));

    expect(windowControl).toHaveBeenNthCalledWith(1, 'minimize');
    expect(windowControl).toHaveBeenNthCalledWith(2, 'toggle-maximize');
    expect(windowControl).toHaveBeenNthCalledWith(3, 'close');
  });

  it('toggles always-on-top from the title bar and defaults to not pinned', async () => {
    const windowControl = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      windowControl
    } as any;

    render(<App />);

    const pinButton = screen.getByRole('button', { name: '置顶窗口' });
    expect(pinButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(pinButton);

    await waitFor(() => {
      expect(windowControl).toHaveBeenCalledWith('toggle-always-on-top');
    });
    expect(screen.getByRole('button', { name: '取消置顶' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '取消置顶' }));

    await waitFor(() => {
      expect(windowControl).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole('button', { name: '置顶窗口' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides engine and API configuration from the user interface', () => {
    render(<App />);

    expect(screen.queryByLabelText('引擎')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('接口密钥')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('接口地址')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('模型名称')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '离线示例' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '兼容接口' })).not.toBeInTheDocument();
    expect(screen.queryByText('API Key')).not.toBeInTheDocument();
    expect(screen.queryByText('Base URL')).not.toBeInTheDocument();
    expect(screen.queryByText('Model')).not.toBeInTheDocument();
  });

  it('uses the hidden Electron translation channel when it is available', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '后台通道译文',
        targetLanguage: 'zh-CN'
      })
    } as any;

    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    submitTranslation();

    await waitFor(() => {
      expect(screen.getByText('后台通道译文')).toBeInTheDocument();
    });
    expect(window.quickTranslate.translateText).toHaveBeenCalledWith({
      text: 'hello',
      targetLanguage: 'zh-CN',
      translationFormat: 'plain'
    });
  });

  it('renders and updates desktop settings when running in Electron', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn(),
      getDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'es-ES',
        defaultTranslationFormat: 'plain'
      }),
      setDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: true,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'ja-JP',
        defaultTranslationFormat: 'java-camel-case'
      })
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    expect(await screen.findByRole('heading', { name: '窗口操作' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新加载界面' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开开发者工具' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出应用' })).toBeInTheDocument();

    const launchAtLogin = await screen.findByLabelText('开机自启');
    expect(launchAtLogin).not.toBeChecked();

    fireEvent.click(launchAtLogin);

    await waitFor(() => {
      expect(window.quickTranslate?.setDesktopSettings).toHaveBeenCalledWith({
        launchAtLogin: true
      });
    });
    expect(launchAtLogin).toBeChecked();
    expect(screen.getByLabelText('启用鼠标下侧键')).toBeChecked();
    expect(screen.getByLabelText('关闭时隐藏到托盘')).toBeChecked();

    fireEvent.change(screen.getByLabelText('默认目标语言'), {
      target: { value: 'ja-JP' }
    });

    await waitFor(() => {
      expect(window.quickTranslate?.setDesktopSettings).toHaveBeenCalledWith({
        defaultTargetLanguage: 'ja-JP'
      });
    });

    fireEvent.change(screen.getByLabelText('翻译格式'), {
      target: { value: 'java-camel-case' }
    });

    await waitFor(() => {
      expect(window.quickTranslate?.setDesktopSettings).toHaveBeenCalledWith({
        defaultTranslationFormat: 'java-camel-case'
      });
    });
  });

  it('translates clipboard text when the lower mouse side button is released in the app window', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn().mockResolvedValue('Hello world'),
      copyText: vi.fn(),
      onSelectionCaptured: vi.fn()
    };

    render(<App />);

    fireEvent.mouseUp(window, { button: 3 });

    await waitFor(() => {
      expect(screen.getByText('你好，世界')).toBeInTheDocument();
    });
    expect(window.quickTranslate.captureSelectedText).toHaveBeenCalledOnce();
  });
});
