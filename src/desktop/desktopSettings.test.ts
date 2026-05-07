import { describe, expect, it } from 'vitest';
import {
  defaultDesktopSettings,
  mergeDesktopSettings,
  normalizeDesktopSettings,
  parseDesktopSettings
} from './desktopSettings';

describe('desktop settings', () => {
  it('uses safe defaults when stored settings are missing or damaged', () => {
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

  it('ignores non-boolean setting values', () => {
    expect(
      normalizeDesktopSettings({
        mouseButton4Enabled: 'yes',
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
      mouseButton4Enabled: false
    });
  });
});
