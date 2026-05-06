/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    __quickTranslateDevCacheReset?: Promise<void>;
    quickTranslate?: {
      captureSelectedText(): Promise<string>;
      copyText(text: string): Promise<void>;
      onSelectionCaptured(callback: (text: string) => void): () => void;
    };
  }
}
