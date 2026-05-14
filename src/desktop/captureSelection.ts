export type TextClipboard = {
  readText(): string;
  writeText(text: string): void;
};

export type CaptureSelectedTextInput = {
  clipboard: TextClipboard;
  sendCopyShortcut(): Promise<void> | void;
  wait(ms: number): Promise<void>;
  recoveryStore?: ClipboardRecoveryStore;
  copyDelayMs?: number;
  pollIntervalMs?: number;
  copyAttempts?: number;
  retryDelayMs?: number;
  onCopyShortcutSent?: () => Promise<void> | void;
};

export type ClipboardRecoveryRecord = {
  sentinelText: string;
  clipboardText: string;
  createdAt: string;
};

export type ClipboardRecoveryStore = {
  read(): ClipboardRecoveryRecord | null | Promise<ClipboardRecoveryRecord | null>;
  write(record: ClipboardRecoveryRecord): void | Promise<void>;
  remove(): void | Promise<void>;
};

export async function captureSelectedText(input: CaptureSelectedTextInput): Promise<string> {
  const previousClipboardText = input.clipboard.readText();
  const sentinelText = `__quick_translate_capture_sentinel_${Date.now()}_${Math.random()}__`;

  try {
    await input.recoveryStore?.write({
      sentinelText,
      clipboardText: previousClipboardText,
      createdAt: new Date().toISOString()
    });
  } catch {
    // Recovery is best-effort; capture should still work if the recovery file is unavailable.
  }

  try {
    input.clipboard.writeText(sentinelText);
  } catch {
    return '';
  }

  let capturedText = '';
  try {
    capturedText = await copyAndReadCapturedClipboardText(input, sentinelText);
  } finally {
    try {
      input.clipboard.writeText(previousClipboardText);
      await input.recoveryStore?.remove();
    } catch {
      // Restoring the clipboard is best-effort and should not hide a successful capture.
    }
  }

  return capturedText;
}

async function copyAndReadCapturedClipboardText(input: CaptureSelectedTextInput, sentinelText: string) {
  const copyAttempts = Math.max(1, input.copyAttempts ?? 1);
  const retryDelayMs = input.retryDelayMs ?? 60;
  let lastError: unknown;

  for (let attempt = 0; attempt < copyAttempts; attempt += 1) {
    try {
      await input.sendCopyShortcut();
      await input.onCopyShortcutSent?.();
    } catch (error) {
      lastError = error;
      if (attempt < copyAttempts - 1) {
        await input.wait(retryDelayMs);
        continue;
      }
      throw error;
    }

    const capturedText = await readCapturedClipboardText(input, sentinelText);
    if (capturedText) {
      return capturedText;
    }

    if (attempt < copyAttempts - 1) {
      await input.wait(retryDelayMs);
    }
  }

  if (lastError) {
    throw lastError;
  }

  return '';
}

export async function restoreClipboardIfNeeded(input: {
  clipboard: TextClipboard;
  recoveryStore: ClipboardRecoveryStore;
  now?: Date;
  maxAgeMs?: number;
}) {
  const record = await input.recoveryStore.read();
  if (!record) {
    return false;
  }

  const createdAtMs = Date.parse(record.createdAt);
  const maxAgeMs = input.maxAgeMs ?? 10 * 60 * 1000;
  const isFresh = Number.isFinite(createdAtMs) && (input.now ?? new Date()).getTime() - createdAtMs <= maxAgeMs;
  if (isFresh && input.clipboard.readText() === record.sentinelText) {
    input.clipboard.writeText(record.clipboardText);
    await input.recoveryStore.remove();
    return true;
  }

  await input.recoveryStore.remove();
  return false;
}

async function readCapturedClipboardText(input: CaptureSelectedTextInput, sentinelText: string) {
  const timeoutMs = input.copyDelayMs ?? 120;
  const pollIntervalMs = input.pollIntervalMs ?? 10;
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs));

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    const copiedText = input.clipboard.readText();
    if (copiedText !== sentinelText) {
      return copiedText.trim();
    }

    if (attempt < maxAttempts) {
      await input.wait(pollIntervalMs);
    }
  }

  return '';
}
