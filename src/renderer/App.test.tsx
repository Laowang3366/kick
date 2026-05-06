import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  afterEach(() => {
    window.quickTranslate = undefined;
  });

  it('translates typed or pasted text through the mock provider', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('原文'), {
      target: { value: 'hello' }
    });
    fireEvent.change(screen.getByLabelText('目标语言'), {
      target: { value: 'zh-CN' }
    });
    fireEvent.click(screen.getByRole('button', { name: '翻译' }));

    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });
  });

  it('shows mouse button 4 as the shortcut entry point', () => {
    render(<App />);

    expect(screen.getByText('鼠标键 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '翻译剪贴板' })).toBeInTheDocument();
  });

  it('renders user-facing controls in Chinese', () => {
    document.title = '';

    render(<App />);

    expect(document.title).toBe('快捷翻译');
    expect(screen.getByRole('heading', { name: '快捷翻译' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '离线示例' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '兼容接口' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '英语' })).toBeInTheDocument();
    expect(screen.queryByText('Quick Translate')).not.toBeInTheDocument();
    expect(screen.queryByText('Mock')).not.toBeInTheDocument();
    expect(screen.queryByText('OpenAI Compatible')).not.toBeInTheDocument();
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('renders provider settings labels in Chinese', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('引擎'), {
      target: { value: 'openai-compatible' }
    });

    expect(screen.getByLabelText('接口密钥')).toBeInTheDocument();
    expect(screen.getByLabelText('接口地址')).toBeInTheDocument();
    expect(screen.getByLabelText('模型名称')).toBeInTheDocument();
    expect(screen.queryByText('API Key')).not.toBeInTheDocument();
    expect(screen.queryByText('Base URL')).not.toBeInTheDocument();
    expect(screen.queryByText('Model')).not.toBeInTheDocument();
  });

  it('translates clipboard text when mouse button 4 is released in the app window', async () => {
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
