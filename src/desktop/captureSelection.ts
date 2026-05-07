export type TextClipboard = {
  readText(): string;
  writeText(text: string): void;
};

export type CaptureSelectedTextInput = {
  clipboard: TextClipboard;
  sendCopyShortcut(): Promise<void> | void;
  wait(ms: number): Promise<void>;
  copyDelayMs?: number;
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
    await input.wait(input.copyDelayMs ?? 120);

    const copiedText = input.clipboard.readText();
    if (copiedText !== sentinelText) {
      capturedText = copiedText.trim();
    }
  } finally {
    try {
      input.clipboard.writeText(previousClipboardText);
    } catch {
      // Restoring the clipboard is best-effort and should not hide a successful capture.
    }
  }

  return capturedText;
}
