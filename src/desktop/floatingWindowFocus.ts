type FocusableFloatingWindow = {
  focus(): void;
  isAlwaysOnTop(): boolean;
  moveTop?: () => void;
  setAlwaysOnTop(flag: boolean, level?: string): void;
  show(): void;
};

export function bringFloatingWindowToFront(window: FocusableFloatingWindow) {
  const wasAlwaysOnTop = window.isAlwaysOnTop();

  if (!wasAlwaysOnTop) {
    window.setAlwaysOnTop(true, 'pop-up-menu');
  }

  window.show();
  window.moveTop?.();
  window.focus();

  if (wasAlwaysOnTop) {
    return;
  }

  window.setAlwaysOnTop(false);
  window.moveTop?.();
}
