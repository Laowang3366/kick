import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguagePicker } from './LanguagePicker';

describe('LanguagePicker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the mobile language menu inside the viewport', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(max-width: 640px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(780);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 220,
      y: 122,
      width: 150,
      height: 44,
      top: 122,
      right: 370,
      bottom: 166,
      left: 220,
      toJSON: () => ({})
    });

    render(<LanguagePicker ariaLabel="目标语言" value="zh-CN" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '目标语言：简体中文' }));

    const menu = screen.getByRole('listbox', { name: '目标语言列表' });
    expect(menu).toHaveStyle({
      '--language-menu-mobile-top': '174px',
      '--language-menu-mobile-max-height': '502px'
    });
  });
});
