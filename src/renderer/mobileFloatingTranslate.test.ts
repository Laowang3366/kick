import { afterEach, describe, expect, it, vi } from 'vitest';
import { onMobileSharedText } from './mobileFloatingTranslate';

describe('mobile floating translate bridge', () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { Capacitor?: unknown }).Capacitor;
  });

  it('supports Capacitor listeners that return a handle synchronously', async () => {
    let sharedTextListener: ((payload: { text?: string }) => void) | null = null;
    const remove = vi.fn();
    const consumePendingSharedText = vi.fn().mockResolvedValue({ text: '' });
    (globalThis as typeof globalThis & { Capacitor?: unknown }).Capacitor = {
      getPlatform: () => 'android',
      Plugins: {
        MobileFloatingTranslate: {
          addListener: vi.fn((_eventName, callback) => {
            sharedTextListener = callback;
            return { remove };
          }),
          consumePendingSharedText
        }
      }
    };
    const callback = vi.fn();

    const unsubscribe = onMobileSharedText(callback);
    sharedTextListener?.({ text: 'shared hello' });
    unsubscribe?.();
    await Promise.resolve();

    expect(callback).toHaveBeenCalledWith('shared hello');
    expect(consumePendingSharedText).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });
});
