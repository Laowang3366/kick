type DestroyableWindow = {
  destroy(): void;
  isDestroyed(): boolean;
};

export function destroyExistingFloatingWindow<T extends DestroyableWindow>(currentWindow: T | null): null {
  if (currentWindow && !currentWindow.isDestroyed()) {
    currentWindow.destroy();
  }

  return null;
}
