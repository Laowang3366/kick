import { describe, expect, it } from 'vitest';
import {
  defaultTranslationFormat,
  getTranslationFormatLabel,
  normalizeTranslationFormat,
  translationFormatOptions
} from './translationFormats';

describe('translation formats', () => {
  it('includes developer-friendly naming formats', () => {
    expect(translationFormatOptions.map((option) => option.value)).toEqual([
      'plain',
      'java-camel-case',
      'pascal-case',
      'snake-case',
      'upper-snake-case',
      'kebab-case'
    ]);
    expect(getTranslationFormatLabel('java-camel-case')).toBe('Java 驼峰命名');
  });

  it('normalizes unsupported formats to plain translation', () => {
    expect(normalizeTranslationFormat('snake-case')).toBe('snake-case');
    expect(normalizeTranslationFormat('unsupported')).toBe(defaultTranslationFormat);
  });
});
