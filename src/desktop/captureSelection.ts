export type TextClipboard = {
  readText(): string;
  writeText(text: string): void;
};

export type CaptureSelectedTextInput = {
  clipboard: TextClipboard;
  sendCopyShortcut(): Promise<void> | void;
  wait(ms: number): Promise<void>;
  copyDelayMs?: number;
  pollIntervalMs?: number;
};

export async function captureSelectedText(input: CaptureSelectedTextInput): Promise<string> {
  const previousClipboardText = input.clipboard.readText();
  const sentinelText = `__quick_translate_capture_sentinel_${Date.now()}_${Math.random()}__`;

  try {
    input.clipboard.writeText(sentinelText);
  } catch {
    return '';
  }

  let capturedText = '';
  try {
    await input.sendCopyShortcut();
    capturedText = await readCapturedClipboardText(input, sentinelText);
  } finally {
    try {
      input.clipboard.writeText(previousClipboardText);
    } catch {
      // Restoring the clipboard is best-effort and should not hide a successful capture.
    }
  }

  return capturedText;
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
