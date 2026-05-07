import { describe, expect, it } from 'vitest';
import { getLanguageLabel, languageOptions, normalizeTargetLanguage, sourceLanguageOptions } from './languages';

describe('language options', () => {
  it('covers a broad set of world languages', () => {
    expect(languageOptions.length).toBeGreaterThanOrEqual(70);
    expect(languageOptions.map((option) => option.label)).toEqual(
      expect.arrayContaining(['英语', '阿拉伯语', '印地语', '西班牙语', '斯瓦希里语', '葡萄牙语（巴西）'])
    );
  });

  it('normalizes unsupported target languages to Simplified Chinese', () => {
    expect(normalizeTargetLanguage('es-ES')).toBe('es-ES');
    expect(normalizeTargetLanguage('unknown')).toBe('zh-CN');
    expect(getLanguageLabel('sw-KE')).toBe('斯瓦希里语');
  });

  it('detects source languages across major writing systems and regions', () => {
    const detect = (text: string) => sourceLanguageOptions.find((option) => option.pattern.test(text))?.value;

    expect(detect('שלום')).toBe('he-IL');
    expect(detect('नमस्ते')).toBe('hi-IN');
    expect(detect('বাংলা')).toBe('bn-BD');
    expect(detect('வணக்கம்')).toBe('ta-IN');
    expect(detect('สวัสดี')).toBe('th-TH');
    expect(detect('ភាសាខ្មែរ')).toBe('km-KH');
    expect(detect('Tiếng Việt')).toBe('vi-VN');
    expect(detect('¡Hola!')).toBe('es-ES');
    expect(detect('hello')).toBe('en-US');
  });
});
