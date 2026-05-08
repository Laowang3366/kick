/// <reference types="vite/client" />

import type { DesktopSettings } from '../desktop/desktopSettings';
import type { TranslateTextResult } from '../shared/translator';
import type { TranslationFormat } from '../shared/translationFormats';

export {};

type DesktopUpdateCheckResult = {
  status: 'checking' | 'no-update' | 'update-available' | 'downloaded' | 'error';
  currentVersion: string;
  availableVersion?: string;
  message: string;
};

declare global {
  interface Window {
    __quickTranslateDevCacheReset?: Promise<void>;
    quickTranslate?: {
      captureSelectedText(): Promise<string>;
      checkForUpdates?(): Promise<DesktopUpdateCheckResult>;
      copyText(text: string): Promise<void>;
      getDesktopSettings?(): Promise<DesktopSettings>;
      onDesktopSettingsChanged?(callback: (settings: DesktopSettings) => void): () => void;
      onFloatingSourceCaptured?(
        callback: (payload: { text: string; targetLanguage?: string; translationFormat?: TranslationFormat }) => void
      ): () => void;
      onSelectionCaptured(callback: (text: string) => void): () => void;
      setDesktopSettings?(settings: Partial<DesktopSettings>): Promise<DesktopSettings>;
      setFloatingSessionPreferences?(preferences: { targetLanguage?: string; translationFormat?: TranslationFormat }): Promise<{
        targetLanguage: string;
        translationFormat: TranslationFormat;
      }>;
      translateText?(input: { text: string; targetLanguage: string; translationFormat?: TranslationFormat }): Promise<TranslateTextResult>;
      windowControl?(
        command:
          | 'minimize'
          | 'toggle-maximize'
          | 'close'
          | 'reload'
          | 'toggle-devtools'
          | 'toggle-always-on-top'
          | 'toggle-floating-always-on-top'
          | 'minimize-floating-window'
          | 'resize-floating-window-compact'
          | 'resize-floating-window-standard'
          | 'resize-floating-window-large'
          | 'show-main-window'
          | 'hide-floating-window'
          | 'quit'
      ): Promise<boolean | void>;
    };
  }
}
