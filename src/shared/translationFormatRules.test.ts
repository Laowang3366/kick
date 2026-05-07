import { describe, expect, it } from 'vitest';
import { canUseTranslationFormat, resolveTranslationFormat } from './translationFormatRules';

describe('translation format rules', () => {
  it('allows code naming formats only when translating to English', () => {
    expect(canUseTranslationFormat('en-US')).toBe(true);
    expect(canUseTranslationFormat('zh-CN')).toBe(false);
    expect(resolveTranslationFormat('en-US', 'java-camel-case')).toBe('java-camel-case');
    expect(resolveTranslationFormat('ja-JP', 'java-camel-case')).toBe('plain');
  });
});
