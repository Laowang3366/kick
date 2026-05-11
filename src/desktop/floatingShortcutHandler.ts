export type FloatingShortcutHandlerInput = {
  readSelectedText: () => Promise<string>;
  showFloatingTranslation: (text: string) => Promise<void> | void;
};

export async function runFloatingTranslateShortcut(input: FloatingShortcutHandlerInput) {
  const text = await input.readSelectedText();
  await input.showFloatingTranslation(text);
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
