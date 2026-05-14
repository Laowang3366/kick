export type FloatingShortcutHandlerInput = {
  readSelectedText: () => Promise<string>;
  showFloatingTranslation: (text: string, options?: FloatingShortcutResultOptions) => Promise<void> | void;
};

export type FloatingShortcutResultOptions = {
  captureState?: 'capturing' | 'failed';
  captureError?: string;
};

export async function runFloatingTranslateShortcut(input: FloatingShortcutHandlerInput) {
  try {
    const text = await input.readSelectedText();
    if (text.trim()) {
      await input.showFloatingTranslation(text);
      return;
    }

    await input.showFloatingTranslation(text, { captureState: 'failed' });
  } catch (error) {
    await input.showFloatingTranslation('', {
      captureState: 'failed',
      captureError: error instanceof Error ? error.message : '选中文本读取失败'
    });
  }
}

export function createFloatingShortcutRunner(input: FloatingShortcutHandlerInput) {
  let isRunning = false;
  let hasPendingRun = false;
  let waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

  async function drain() {
    try {
      do {
        hasPendingRun = false;
        await runFloatingTranslateShortcut(input);
      } while (hasPendingRun);

      for (const waiter of waiters) {
        waiter.resolve();
      }
    } catch (error) {
      for (const waiter of waiters) {
        waiter.reject(error);
      }
    } finally {
      waiters = [];
      isRunning = false;
    }
  }

  return function runShortcut() {
    return new Promise<void>((resolve, reject) => {
      waiters.push({ resolve, reject });
      if (isRunning) {
        hasPendingRun = true;
        return;
      }

      isRunning = true;
      void drain();
    });
  };
}
