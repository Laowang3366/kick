export type FloatingShortcutHandlerInput = {
  readSelectedText: (context: FloatingShortcutContext) => Promise<string>;
  showFloatingTranslation: (
    text: string,
    options: FloatingShortcutResultOptions | undefined,
    context: FloatingShortcutContext
  ) => Promise<void> | void;
};

export type FloatingShortcutContext = {
  cursorPoint?: {
    x: number;
    y: number;
  };
};

export type FloatingShortcutResultOptions = {
  captureState?: 'capturing' | 'failed';
  captureError?: string;
};

export async function runFloatingTranslateShortcut(input: FloatingShortcutHandlerInput, context: FloatingShortcutContext = {}) {
  try {
    const text = await input.readSelectedText(context);
    if (text.trim()) {
      await input.showFloatingTranslation(text, undefined, context);
      return;
    }

    await input.showFloatingTranslation(text, { captureState: 'failed' }, context);
  } catch (error) {
    await input.showFloatingTranslation('', {
      captureState: 'failed',
      captureError: error instanceof Error ? error.message : '选中文本读取失败'
    }, context);
  }
}

export function createFloatingShortcutRunner(input: FloatingShortcutHandlerInput) {
  let isRunning = false;
  let hasPendingRun = false;
  let pendingContext: FloatingShortcutContext = {};
  let waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

  async function drain() {
    try {
      do {
        const context = pendingContext;
        pendingContext = {};
        hasPendingRun = false;
        await runFloatingTranslateShortcut(input, context);
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

  return function runShortcut(context: FloatingShortcutContext = {}) {
    return new Promise<void>((resolve, reject) => {
      waiters.push({ resolve, reject });
      if (isRunning) {
        hasPendingRun = true;
        pendingContext = context;
        return;
      }

      pendingContext = context;
      isRunning = true;
      void drain();
    });
  };
}
