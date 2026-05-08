import { defaultTargetLanguage, normalizeTargetLanguage } from '../shared/languages.js';
import { defaultTranslationFormat, normalizeTranslationFormat, type TranslationFormat } from '../shared/translationFormats.js';

export type FloatingTranslateShortcut =
  | 'mouse-button-4'
  | 'mouse-button-5'
  | 'ctrl-alt-t'
  | 'ctrl-shift-y'
  | 'alt-q'
  | 'f8'
  | 'disabled';

export type FloatingTranslateShortcutOption = {
  value: FloatingTranslateShortcut;
  label: string;
  accelerator?: string;
};

export type DesktopSettings = {
  mouseButton4Enabled: boolean;
  floatingTranslateShortcut: FloatingTranslateShortcut;
  launchAtLogin: boolean;
  hideToTrayOnClose: boolean;
  defaultTargetLanguage: string;
  defaultTranslationFormat: TranslationFormat;
};

export const floatingTranslateShortcutOptions: FloatingTranslateShortcutOption[] = [
  { value: 'mouse-button-4', label: '鼠标下侧键' },
  { value: 'mouse-button-5', label: '鼠标上侧键' },
  { value: 'ctrl-alt-t', label: 'Ctrl + Alt + T', accelerator: 'CommandOrControl+Alt+T' },
  { value: 'ctrl-shift-y', label: 'Ctrl + Shift + Y', accelerator: 'CommandOrControl+Shift+Y' },
  { value: 'alt-q', label: 'Alt + Q', accelerator: 'Alt+Q' },
  { value: 'f8', label: 'F8', accelerator: 'F8' },
  { value: 'disabled', label: '关闭快捷键' }
];

export const defaultDesktopSettings: DesktopSettings = {
  mouseButton4Enabled: true,
  floatingTranslateShortcut: 'mouse-button-4',
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

export function normalizeFloatingTranslateShortcut(value: unknown): FloatingTranslateShortcut {
  return typeof value === 'string' && floatingTranslateShortcutOptions.some((option) => option.value === value)
    ? (value as FloatingTranslateShortcut)
    : defaultDesktopSettings.floatingTranslateShortcut;
}

export function getFloatingTranslateShortcutLabel(value: unknown) {
  const shortcut = normalizeFloatingTranslateShortcut(value);
  return floatingTranslateShortcutOptions.find((option) => option.value === shortcut)?.label ?? '鼠标下侧键';
}

export function getFloatingTranslateShortcutAccelerator(value: unknown) {
  const shortcut = normalizeFloatingTranslateShortcut(value);
  return floatingTranslateShortcutOptions.find((option) => option.value === shortcut)?.accelerator;
}

export function normalizeDesktopSettings(value: unknown): DesktopSettings {
  const record = isRecord(value) ? value : {};
  const hasFloatingShortcut = typeof record.floatingTranslateShortcut === 'string';
  const floatingTranslateShortcut = hasFloatingShortcut
    ? normalizeFloatingTranslateShortcut(record.floatingTranslateShortcut)
    : booleanOrDefault(record.mouseButton4Enabled, defaultDesktopSettings.mouseButton4Enabled)
      ? 'mouse-button-4'
      : 'disabled';

  return {
    mouseButton4Enabled: floatingTranslateShortcut === 'mouse-button-4',
    floatingTranslateShortcut,
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
  const nextPatch =
    typeof patch.mouseButton4Enabled === 'boolean' && typeof patch.floatingTranslateShortcut !== 'string'
      ? { ...patch, floatingTranslateShortcut: patch.mouseButton4Enabled ? 'mouse-button-4' : 'disabled' }
      : patch;
  return normalizeDesktopSettings({ ...currentSettings, ...nextPatch });
}

export function serializeDesktopSettings(settings: DesktopSettings): string {
  return `${JSON.stringify(normalizeDesktopSettings(settings), null, 2)}\n`;
}
