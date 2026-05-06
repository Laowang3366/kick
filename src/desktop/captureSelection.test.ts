import { describe, expect, it, vi } from 'vitest';
import { captureSelectedText } from './captureSelection';

describe('captureSelectedText', () => {
  it('returns newly copied selected text from the clipboard', async () => {
    const clipboard = {
      readText: vi.fn().mockReturnValueOnce('previous').mockReturnValueOnce('selected text')
    };
    const sendCopyShortcut = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      captureSelectedText({ clipboard, sendCopyShortcut, wait, copyDelayMs: 25 })
    ).resolves.toBe('selected text');

    expect(sendCopyShortcut).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledWith(25);
  });

  it('falls back to the existing clipboard text when selection capture is unchanged', async () => {
    const clipboard = {
      readText: vi.fn().mockReturnValue('clipboard text')
    };

    await expect(
      captureSelectedText({
        clipboard,
        sendCopyShortcut: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue(undefined)
      })
    ).resolves.toBe('clipboard text');
  });

  it('returns an empty string when neither selection nor clipboard text exists', async () => {
    const clipboard = {
      readText: vi.fn().mockReturnValue('')
    };

    await expect(
      captureSelectedText({
        clipboard,
        sendCopyShortcut: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue(undefined)
      })
    ).resolves.toBe('');
  });
});
