import { describe, expect, it, vi } from 'vitest';
import { createFloatingShortcutRunner, runFloatingTranslateShortcut } from './floatingShortcutHandler';

describe('floating shortcut handler', () => {
  it('routes every floating translate shortcut to the floating window', async () => {
    const showFloatingTranslation = vi.fn();

    await runFloatingTranslateShortcut({
      readSelectedText: async () => 'selected text',
      showFloatingTranslation
    });

    expect(showFloatingTranslation).toHaveBeenCalledWith('selected text');
  });

  it('serializes overlapping shortcut requests and keeps the latest pending trigger', async () => {
    let releaseRead: (() => void) | undefined;
    const readSelectedText = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            releaseRead = () => resolve('first selection');
          })
      )
      .mockResolvedValueOnce('latest selection');
    const showFloatingTranslation = vi.fn();
    const runShortcut = createFloatingShortcutRunner({
      readSelectedText,
      showFloatingTranslation
    });

    const firstRun = runShortcut();
    const secondRun = runShortcut();
    const thirdRun = runShortcut();
    releaseRead?.();

    await Promise.all([firstRun, secondRun, thirdRun]);

    expect(readSelectedText).toHaveBeenCalledTimes(2);
    expect(showFloatingTranslation).toHaveBeenNthCalledWith(1, 'first selection');
    expect(showFloatingTranslation).toHaveBeenNthCalledWith(2, 'latest selection');
  });
});
