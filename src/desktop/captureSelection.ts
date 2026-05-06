export type TextClipboard = {
  readText(): string;
};

export type CaptureSelectedTextInput = {
  clipboard: TextClipboard;
  sendCopyShortcut(): Promise<void> | void;
  wait(ms: number): Promise<void>;
  copyDelayMs?: number;
};

export async function captureSelectedText(input: CaptureSelectedTextInput): Promise<string> {
  const previousClipboardText = input.clipboard.readText().trim();

  await input.sendCopyShortcut();
  await input.wait(input.copyDelayMs ?? 120);

  const capturedText = input.clipboard.readText().trim();
  if (capturedText && capturedText !== previousClipboardText) {
    return capturedText;
  }

  return previousClipboardText;
}
