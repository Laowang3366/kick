import { describe, expect, it } from 'vitest';
import {
  readFloatingSessionPreferenceOverrides,
  readFloatingSessionPreferences,
  updateFloatingSessionPreferences,
  type FloatingSessionPreferenceState
} from './floatingSessionPreferences';

describe('floating session preferences', () => {
  const defaults = {
    targetLanguage: 'zh-CN',
    translationFormat: 'plain' as const
  };

  it('uses desktop defaults before the floating window changes anything', () => {
    expect(readFloatingSessionPreferences({}, defaults)).toEqual(defaults);
  });

  it('keeps the first changed target language for later floating windows during this app run', () => {
    const state = updateFloatingSessionPreferences({}, { targetLanguage: 'en-US' });

    expect(
      readFloatingSessionPreferences(state, {
        targetLanguage: 'zh-CN',
        translationFormat: 'plain'
      })
    ).toEqual({
      targetLanguage: 'en-US',
      translationFormat: 'plain'
    });
  });

  it('keeps the floating format choice in memory without requiring default settings to change', () => {
    const state: FloatingSessionPreferenceState = updateFloatingSessionPreferences(
      { targetLanguage: 'en-US' },
      { translationFormat: 'java-camel-case' }
    );

    expect(readFloatingSessionPreferences(state, defaults)).toEqual({
      targetLanguage: 'en-US',
      translationFormat: 'java-camel-case'
    });
  });

  it('does not expose desktop defaults as floating shortcut overrides', () => {
    expect(readFloatingSessionPreferenceOverrides({})).toEqual({});
  });

  it('exposes only explicit floating choices for shortcut payloads', () => {
    expect(readFloatingSessionPreferenceOverrides({ targetLanguage: 'ja-JP', translationFormat: 'java-camel-case' })).toEqual({
      targetLanguage: 'ja-JP',
      translationFormat: 'java-camel-case'
    });
  });
});
