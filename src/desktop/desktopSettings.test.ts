import { describe, expect, it } from 'vitest';
import {
  defaultDesktopSettings,
  createCustomFloatingTranslateShortcut,
  formatShortcutAcceleratorLabel,
  getFloatingTranslateShortcutAccelerator,
  getFloatingTranslateShortcutLabel,
  mergeDesktopSettings,
  normalizeCustomShortcutAccelerator,
  normalizeDesktopSettings,
  parseDesktopSettings
} from './desktopSettings';

describe('desktop settings', () => {
  it('uses safe defaults when stored settings are missing or damaged', () => {
    expect(defaultDesktopSettings.hideToTrayOnClose).toBe(false);
    expect(parseDesktopSettings(undefined)).toEqual(defaultDesktopSettings);
    expect(parseDesktopSettings('{bad json')).toEqual(defaultDesktopSettings);
  });

  it('merges partial stored settings with defaults', () => {
    expect(
      parseDesktopSettings(
        JSON.stringify({ launchAtLogin: true, defaultTargetLanguage: 'es-ES', defaultTranslationFormat: 'java-camel-case' })
      )
    ).toEqual({
      ...defaultDesktopSettings,
      defaultTargetLanguage: 'es-ES',
      defaultTranslationFormat: 'java-camel-case',
      launchAtLogin: true
    });
  });

  it('migrates the legacy mouse button toggle into the floating shortcut setting', () => {
    expect(parseDesktopSettings(JSON.stringify({ mouseButton4Enabled: false }))).toEqual({
      ...defaultDesktopSettings,
      mouseButton4Enabled: false,
      floatingTranslateShortcut: 'disabled'
    });
  });

  it('ignores non-boolean setting values', () => {
    expect(
      normalizeDesktopSettings({
        mouseButton4Enabled: 'yes',
        floatingTranslateShortcut: 'bad-shortcut',
        launchAtLogin: true,
        hideToTrayOnClose: 1,
        defaultTargetLanguage: 'bad-language',
        defaultTranslationFormat: 'bad-format'
      })
    ).toEqual({
      ...defaultDesktopSettings,
      launchAtLogin: true
    });
  });

  it('merges setting patches onto the current settings', () => {
    expect(mergeDesktopSettings(defaultDesktopSettings, { mouseButton4Enabled: false })).toEqual({
      ...defaultDesktopSettings,
      mouseButton4Enabled: false,
      floatingTranslateShortcut: 'disabled'
    });
    expect(mergeDesktopSettings(defaultDesktopSettings, { floatingTranslateShortcut: 'ctrl-alt-t' })).toEqual({
      ...defaultDesktopSettings,
      mouseButton4Enabled: false,
      floatingTranslateShortcut: 'ctrl-alt-t'
    });
  });

  it('provides display labels and accelerators for floating shortcuts', () => {
    expect(getFloatingTranslateShortcutLabel('mouse-button-4')).toBe('鼠标下侧键');
    expect(getFloatingTranslateShortcutAccelerator('ctrl-alt-t')).toBe('CommandOrControl+Alt+T');
    expect(getFloatingTranslateShortcutAccelerator('mouse-button-4')).toBeUndefined();
  });

  it('normalizes custom keyboard shortcuts for the floating translator', () => {
    expect(normalizeCustomShortcutAccelerator('ctrl + alt + k')).toBe('CommandOrControl+Alt+K');
    expect(createCustomFloatingTranslateShortcut('Ctrl+Shift+ArrowUp')).toBe('custom:CommandOrControl+Shift+Up');
    expect(getFloatingTranslateShortcutAccelerator('custom:CommandOrControl+Alt+K')).toBe('CommandOrControl+Alt+K');
    expect(getFloatingTranslateShortcutLabel('custom:CommandOrControl+Alt+K')).toBe('自定义：Ctrl + Alt + K');
    expect(formatShortcutAcceleratorLabel('CommandOrControl+Super+Return')).toBe('Ctrl + Win + Enter');
  });

  it('rejects unsafe custom keyboard shortcuts', () => {
    expect(normalizeCustomShortcutAccelerator('k')).toBeUndefined();
    expect(normalizeCustomShortcutAccelerator('shift+k')).toBeUndefined();
    expect(normalizeCustomShortcutAccelerator('ctrl+alt')).toBeUndefined();
    expect(parseDesktopSettings(JSON.stringify({ floatingTranslateShortcut: 'custom:K' }))).toEqual(defaultDesktopSettings);
  });
});
