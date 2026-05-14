import { describe, expect, it, vi } from 'vitest';
import { captureSelectedText, restoreClipboardIfNeeded, type ClipboardRecoveryRecord } from './captureSelection';

describe('captureSelectedText', () => {
  it('returns selected text and restores the previous clipboard text', async () => {
    let clipboardText = 'previous';
    const recoveryStore = createRecoveryStore();
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
      captureSelectedText({ clipboard, sendCopyShortcut, wait, recoveryStore, copyDelayMs: 25 })
    ).resolves.toBe('selected text');

    expect(sendCopyShortcut).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
    expect(clipboard.writeText).toHaveBeenNthCalledWith(2, 'previous');
    expect(clipboardText).toBe('previous');
    expect(recoveryStore.current).toBeNull();
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

  it('polls briefly until the copied selection replaces the sentinel text', async () => {
    let clipboardText = 'previous';
    let readCount = 0;
    const clipboard = {
      readText: vi.fn(() => {
        readCount += 1;
        return readCount >= 4 ? 'late selected text' : clipboardText;
      }),
      writeText: vi.fn((text: string) => {
        clipboardText = text;
      })
    };
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      captureSelectedText({
        clipboard,
        sendCopyShortcut: vi.fn().mockResolvedValue(undefined),
        wait,
        copyDelayMs: 80,
        pollIntervalMs: 10
      })
    ).resolves.toBe('late selected text');

    expect(wait).toHaveBeenCalledWith(10);
  });

  it('retries the copy shortcut when the first attempt does not update the clipboard', async () => {
    let clipboardText = 'previous';
    let copyCount = 0;
    const clipboard = {
      readText: vi.fn(() => clipboardText),
      writeText: vi.fn((text: string) => {
        clipboardText = text;
      })
    };
    const wait = vi.fn().mockResolvedValue(undefined);
    const onCopyShortcutSent = vi.fn();

    await expect(
      captureSelectedText({
        clipboard,
        sendCopyShortcut: vi.fn(() => {
          copyCount += 1;
          if (copyCount === 2) {
            clipboardText = 'selected after retry';
          }
        }),
        wait,
        copyDelayMs: 20,
        pollIntervalMs: 10,
        copyAttempts: 2,
        retryDelayMs: 30,
        onCopyShortcutSent
      })
    ).resolves.toBe('selected after retry');

    expect(onCopyShortcutSent).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(30);
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

  it('restores the previous clipboard when a stale sentinel is found on startup', async () => {
    let clipboardText = 'sentinel';
    const recoveryStore = createRecoveryStore({
      sentinelText: 'sentinel',
      clipboardText: 'previous',
      createdAt: '2026-05-12T00:00:00.000Z'
    });
    const clipboard = {
      readText: vi.fn(() => clipboardText),
      writeText: vi.fn((text: string) => {
        clipboardText = text;
      })
    };

    await expect(
      restoreClipboardIfNeeded({
        clipboard,
        recoveryStore,
        now: new Date('2026-05-12T00:01:00.000Z')
      })
    ).resolves.toBe(true);

    expect(clipboardText).toBe('previous');
    expect(recoveryStore.current).toBeNull();
  });

  it('removes stale recovery data without changing a normal clipboard', async () => {
    let clipboardText = 'normal clipboard';
    const recoveryStore = createRecoveryStore({
      sentinelText: 'sentinel',
      clipboardText: 'previous',
      createdAt: '2026-05-12T00:00:00.000Z'
    });
    const clipboard = {
      readText: vi.fn(() => clipboardText),
      writeText: vi.fn((text: string) => {
        clipboardText = text;
      })
    };

    await expect(
      restoreClipboardIfNeeded({
        clipboard,
        recoveryStore,
        now: new Date('2026-05-12T00:01:00.000Z')
      })
    ).resolves.toBe(false);

    expect(clipboardText).toBe('normal clipboard');
    expect(recoveryStore.current).toBeNull();
  });
});

function createRecoveryStore(initial: ClipboardRecoveryRecord | null = null) {
  const store = {
    current: initial as ClipboardRecoveryRecord | null,
    read: vi.fn(() => Promise.resolve(store.current)),
    write: vi.fn((record: ClipboardRecoveryRecord) => {
      store.current = record;
    }),
    remove: vi.fn(() => {
      store.current = null;
    })
  };
  return store;
}
