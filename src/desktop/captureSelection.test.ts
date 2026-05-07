import { describe, expect, it, vi } from 'vitest';
import { captureSelectedText } from './captureSelection';

describe('captureSelectedText', () => {
  it('returns selected text and restores the previous clipboard text', async () => {
    let clipboardText = 'previous';
    const clipboard = {
      readText: vi.fn(() => clipboardText),
      writeText: vi.fn((text: string) => {
        clipboardText = text;
      })
    };
    const sendCopyShortcut = vi.fn(() => {
      clipboardText = 'selected text';
    });
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      captureSelectedText({ clipboard, sendCopyShortcut, wait, copyDelayMs: 25 })
    ).resolves.toBe('selected text');

    expect(sendCopyShortcut).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledWith(25);
    expect(clipboard.writeText).toHaveBeenNthCalledWith(2, 'previous');
    expect(clipboardText).toBe('previous');
  });

  it('captures selected text when it matches the previous clipboard text', async () => {
    let clipboardText = 'same text';
    const clipboard = {
      readText: vi.fn(() => clipboardText),
      writeText: vi.fn((text: string) => {
        clipboardText = text;
      })
    };

    await expect(
      captureSelectedText({
        clipboard,
        sendCopyShortcut: vi.fn(() => {
          clipboardText = 'same text';
        }),
        wait: vi.fn().mockResolvedValue(undefined)
      })
    ).resolves.toBe('same text');

    expect(clipboard.writeText).toHaveBeenCalledTimes(2);
    expect(clipboard.writeText.mock.calls[0][0]).not.toBe('same text');
    expect(clipboardText).toBe('same text');
  });

  it('returns an empty string when copying does not replace the sentinel text', async () => {
    let clipboardText = 'previous';
    const clipboard = {
      readText: vi.fn(() => clipboardText),
      writeText: vi.fn((text: string) => {
        clipboardText = text;
      })
    };

    await expect(
      captureSelectedText({
        clipboard,
        sendCopyShortcut: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue(undefined)
      })
    ).resolves.toBe('');

    expect(clipboardText).toBe('previous');
  });

  it('returns captured text even when restoring the previous clipboard text fails', async () => {
    let clipboardText = 'previous';
    const clipboard = {
      readText: vi.fn(() => clipboardText),
      writeText: vi.fn((text: string) => {
        if (clipboard.writeText.mock.calls.length > 1) {
          throw new Error('restore failed');
        }
        clipboardText = text;
      })
    };

    await expect(
      captureSelectedText({
        clipboard,
        sendCopyShortcut: vi.fn(() => {
          clipboardText = 'selected text';
        }),
        wait: vi.fn().mockResolvedValue(undefined)
      })
    ).resolves.toBe('selected text');
  });
});
