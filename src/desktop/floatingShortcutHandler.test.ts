import { describe, expect, it, vi } from 'vitest';
import { runFloatingTranslateShortcut } from './floatingShortcutHandler';

describe('floating shortcut handler', () => {
  it('routes every floating translate shortcut to the floating window', async () => {
    const showFloatingTranslation = vi.fn();

    await runFloatingTranslateShortcut({
      readSelectedText: async () => 'selected text',
      showFloatingTranslation
    });

    expect(showFloatingTranslation).toHaveBeenCalledWith('selected text');
  });
});
