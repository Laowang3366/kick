import { defaultTargetLanguage, normalizeTargetLanguage } from '../shared/languages.js';
import { defaultTranslationFormat, normalizeTranslationFormat, type TranslationFormat } from '../shared/translationFormats.js';

export type DesktopSettings = {
  mouseButton4Enabled: boolean;
  launchAtLogin: boolean;
  hideToTrayOnClose: boolean;
  defaultTargetLanguage: string;
  defaultTranslationFormat: TranslationFormat;
};

export const defaultDesktopSettings: DesktopSettings = {
  mouseButton4Enabled: true,
  launchAtLogin: false,
  hideToTrayOnClose: true,
  defaultTargetLanguage,
  defaultTranslationFormat
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeDesktopSettings(value: unknown): DesktopSettings {
  const record = isRecord(value) ? value : {};

  return {
    mouseButton4Enabled: booleanOrDefault(record.mouseButton4Enabled, defaultDesktopSettings.mouseButton4Enabled),
    launchAtLogin: booleanOrDefault(record.launchAtLogin, defaultDesktopSettings.launchAtLogin),
    hideToTrayOnClose: booleanOrDefault(record.hideToTrayOnClose, defaultDesktopSettings.hideToTrayOnClose),
    defaultTargetLanguage: normalizeTargetLanguage(record.defaultTargetLanguage),
    defaultTranslationFormat: normalizeTranslationFormat(record.defaultTranslationFormat)
  };
}

export function parseDesktopSettings(text: string | undefined): DesktopSettings {
  if (!text) {
    return defaultDesktopSettings;
  }

  try {
    return normalizeDesktopSettings(JSON.parse(text));
  } catch {
    return defaultDesktopSettings;
  }
}

export function mergeDesktopSettings(currentSettings: DesktopSettings, patch: Partial<DesktopSettings>): DesktopSettings {
  return normalizeDesktopSettings({ ...currentSettings, ...patch });
}

export function serializeDesktopSettings(settings: DesktopSettings): string {
  return `${JSON.stringify(normalizeDesktopSettings(settings), null, 2)}\n`;
}
