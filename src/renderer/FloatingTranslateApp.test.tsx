import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatingTranslateApp } from './FloatingTranslateApp';
import { DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY } from './translationFormatPreference';

describe('FloatingTranslateApp', () => {
  afterEach(() => {
    window.quickTranslate = undefined;
    localStorage.clear();
  });

  it('uses the stored desktop target language when translating captured text', async () => {
    let capturedCallback: ((payload: { text: string; targetLanguage?: string; translationFormat?: 'java-camel-case' }) => void) | undefined;
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      getDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'en-US',
        defaultTranslationFormat: 'java-camel-case'
      }),
      onFloatingSourceCaptured: vi.fn((callback) => {
        capturedCallback = callback as (payload: { text: string; targetLanguage?: string; translationFormat?: 'java-camel-case' }) => void;
        return vi.fn();
      }),
      onSelectionCaptured: vi.fn(),
      setDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'ja-JP',
        defaultTranslationFormat: 'java-camel-case'
      }),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: '你好',
        translatedText: 'Hello',
        targetLanguage: 'en-US'
      }),
      windowControl: vi.fn().mockResolvedValue(false)
    } as any;

    render(<FloatingTranslateApp />);

    expect(await screen.findByDisplayValue('英语')).toBeInTheDocument();

    act(() => {
      capturedCallback?.({ text: '你好', targetLanguage: 'en-US' });
    });

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: '你好',
        targetLanguage: 'en-US',
        translationFormat: 'java-camel-case'
      });
    });
    expect(await screen.findByText('Hello')).toBeInTheDocument();
  });

  it('lets the floating window choose target language without changing the default preference and toggle pin state', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      getDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'en-US',
        defaultTranslationFormat: 'plain'
      }),
      onFloatingSourceCaptured: vi.fn(() => vi.fn()),
      onSelectionCaptured: vi.fn(),
      setDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'ja-JP',
        defaultTranslationFormat: 'plain'
      }),
      setFloatingSessionPreferences: vi.fn(),
      translateText: vi.fn(),
      windowControl: vi.fn().mockResolvedValue(false)
    } as any;

    render(<FloatingTranslateApp />);

    fireEvent.change(await screen.findByLabelText('悬浮目标语言'), {
      target: { value: 'ja-JP' }
    });

    expect(await screen.findByDisplayValue('日语')).toBeInTheDocument();
    expect(window.quickTranslate?.setDesktopSettings).not.toHaveBeenCalled();
    expect(window.quickTranslate?.setFloatingSessionPreferences).toHaveBeenCalledWith({
      targetLanguage: 'ja-JP',
      translationFormat: 'plain'
    });

    const pinButton = screen.getByRole('button', { name: '取消悬浮窗置顶' });
    expect(pinButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(pinButton);

    await waitFor(() => {
      expect(window.quickTranslate?.windowControl).toHaveBeenCalledWith('toggle-floating-always-on-top');
    });
    expect(screen.getByRole('button', { name: '置顶悬浮窗' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('minimizes the floating window from the title bar', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      getDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'zh-CN',
        defaultTranslationFormat: 'plain'
      }),
      onFloatingSourceCaptured: vi.fn(() => vi.fn()),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn(),
      windowControl: vi.fn()
    } as any;

    render(<FloatingTranslateApp />);

    fireEvent.click(await screen.findByRole('button', { name: '最小化悬浮窗' }));

    expect(window.quickTranslate?.windowControl).toHaveBeenCalledWith('minimize-floating-window');
  });

  it('lets the floating window choose a translation format for English translations', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      getDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'en-US',
        defaultTranslationFormat: 'plain'
      }),
      onFloatingSourceCaptured: vi.fn(() => vi.fn()),
      onSelectionCaptured: vi.fn(),
      setFloatingSessionPreferences: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'user name',
        translatedText: 'userName',
        targetLanguage: 'en-US'
      }),
      windowControl: vi.fn()
    } as any;

    render(<FloatingTranslateApp />);

    expect(await screen.findByDisplayValue('英语')).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('悬浮翻译格式'), {
      target: { value: 'java-camel-case' }
    });
    fireEvent.change(screen.getByLabelText('悬浮原文'), {
      target: { value: 'user name' }
    });
    fireEvent.click(screen.getByRole('button', { name: '翻译' }));

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: 'user name',
        targetLanguage: 'en-US',
        translationFormat: 'java-camel-case'
      });
    });
    expect(window.quickTranslate?.setFloatingSessionPreferences).toHaveBeenCalledWith({
      targetLanguage: 'en-US',
      translationFormat: 'java-camel-case'
    });
    expect(localStorage.getItem(DEFAULT_TRANSLATION_FORMAT_STORAGE_KEY)).toBe('java-camel-case');
  });

  it('disables floating translation format selection outside English targets', async () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      getDesktopSettings: vi.fn().mockResolvedValue({
        mouseButton4Enabled: true,
        launchAtLogin: false,
        hideToTrayOnClose: true,
        defaultTargetLanguage: 'zh-CN',
        defaultTranslationFormat: 'java-camel-case'
      }),
      onFloatingSourceCaptured: vi.fn(() => vi.fn()),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn().mockResolvedValue({
        provider: 'openai-compatible',
        sourceText: 'hello',
        translatedText: '你好',
        targetLanguage: 'zh-CN'
      }),
      windowControl: vi.fn()
    } as any;

    render(<FloatingTranslateApp />);

    const formatSelect = await screen.findByLabelText('悬浮翻译格式');
    expect(formatSelect).toBeDisabled();

    fireEvent.change(screen.getByLabelText('悬浮原文'), {
      target: { value: 'hello' }
    });
    fireEvent.click(screen.getByRole('button', { name: '翻译' }));

    await waitFor(() => {
      expect(window.quickTranslate?.translateText).toHaveBeenCalledWith({
        text: 'hello',
        targetLanguage: 'zh-CN',
        translationFormat: 'plain'
      });
    });
  });

  it('limits floating translation input to 30000 characters', () => {
    window.quickTranslate = {
      captureSelectedText: vi.fn(),
      copyText: vi.fn(),
      onFloatingSourceCaptured: vi.fn(() => vi.fn()),
      onSelectionCaptured: vi.fn(),
      translateText: vi.fn(),
      windowControl: vi.fn()
    } as any;

    render(<FloatingTranslateApp />);

    const sourceInput = screen.getByLabelText('悬浮原文') as HTMLTextAreaElement;
    fireEvent.change(sourceInput, {
      target: { value: 'a'.repeat(30005) }
    });

    expect(sourceInput.value).toHaveLength(30000);
    expect(screen.getByText('30000/30000')).toBeInTheDocument();
  });
});
