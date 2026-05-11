type DestroyableWindow = {
  destroy(): void;
  isDestroyed(): boolean;
};

type ReusableWindow = {
  isDestroyed(): boolean;
};

export function destroyExistingFloatingWindow<T extends DestroyableWindow>(currentWindow: T | null): null {
  if (currentWindow && !currentWindow.isDestroyed()) {
    currentWindow.destroy();
  }

  return null;
}

export function reuseFloatingWindowForShortcut<T extends ReusableWindow>(currentWindow: T | null): T | null {
  return currentWindow && !currentWindow.isDestroyed() ? currentWindow : null;
}
