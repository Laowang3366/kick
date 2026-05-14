import { describe, expect, it, vi } from 'vitest';
import { createFloatingShortcutRunner, runFloatingTranslateShortcut } from './floatingShortcutHandler';

describe('floating shortcut handler', () => {
  it('routes every floating translate shortcut to the floating window', async () => {
    const showFloatingTranslation = vi.fn();

    await runFloatingTranslateShortcut({
      readSelectedText: async () => 'selected text',
      showFloatingTranslation
    }, { cursorPoint: { x: 120, y: 220 } });

    expect(showFloatingTranslation).toHaveBeenCalledWith('selected text', undefined, { cursorPoint: { x: 120, y: 220 } });
  });

  it('opens the floating window with a failure state when selected text cannot be read', async () => {
    const showFloatingTranslation = vi.fn();

    await runFloatingTranslateShortcut({
      readSelectedText: async () => {
        throw new Error('copy helper failed');
      },
      showFloatingTranslation
    });

    expect(showFloatingTranslation).toHaveBeenCalledWith(
      '',
      {
        captureState: 'failed',
        captureError: 'copy helper failed'
      },
      {}
    );
  });

  it('opens the floating window with a failure state when the captured text is empty', async () => {
    const showFloatingTranslation = vi.fn();

    await runFloatingTranslateShortcut({
      readSelectedText: async () => '   ',
      showFloatingTranslation
    });

    expect(showFloatingTranslation).toHaveBeenCalledWith('   ', { captureState: 'failed' }, {});
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

    const firstRun = runShortcut({ cursorPoint: { x: 10, y: 20 } });
    const secondRun = runShortcut({ cursorPoint: { x: 30, y: 40 } });
    const thirdRun = runShortcut({ cursorPoint: { x: 50, y: 60 } });
    releaseRead?.();

    await Promise.all([firstRun, secondRun, thirdRun]);

    expect(readSelectedText).toHaveBeenCalledTimes(2);
    expect(showFloatingTranslation).toHaveBeenNthCalledWith(1, 'first selection', undefined, { cursorPoint: { x: 10, y: 20 } });
    expect(showFloatingTranslation).toHaveBeenNthCalledWith(2, 'latest selection', undefined, { cursorPoint: { x: 50, y: 60 } });
  });
});
