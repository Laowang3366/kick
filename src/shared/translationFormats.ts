export type TranslationFormat =
  | 'plain'
  | 'java-camel-case'
  | 'pascal-case'
  | 'snake-case'
  | 'upper-snake-case'
  | 'kebab-case';

export type TranslationFormatOption = {
  value: TranslationFormat;
  label: string;
  description: string;
  instruction: string;
};

export const defaultTranslationFormat: TranslationFormat = 'plain';

export const translationFormatOptions: TranslationFormatOption[] = [
  {
    value: 'plain',
    label: '普通翻译',
    description: '保留自然语言表达',
    instruction: 'Return only the translated text.'
  },
  {
    value: 'java-camel-case',
    label: 'Java 驼峰命名',
    description: 'lowerCamelCase，适合变量和方法',
    instruction:
      'Return a Java-style lowerCamelCase identifier that expresses the translated meaning. Use ASCII letters and digits only. Do not include spaces, punctuation, quotes, code fences, or explanations.'
  },
  {
    value: 'pascal-case',
    label: 'PascalCase 命名',
    description: '适合类名、类型名和组件名',
    instruction:
      'Return a PascalCase identifier that expresses the translated meaning. Use ASCII letters and digits only. Do not include spaces, punctuation, quotes, code fences, or explanations.'
  },
  {
    value: 'snake-case',
    label: 'snake_case 命名',
    description: '适合字段、脚本和部分配置键',
    instruction:
      'Return a snake_case identifier that expresses the translated meaning. Use lowercase ASCII letters, digits, and underscores only. Do not include spaces, punctuation, quotes, code fences, or explanations.'
  },
  {
    value: 'upper-snake-case',
    label: 'UPPER_SNAKE_CASE',
    description: '适合常量、枚举值和环境变量',
    instruction:
      'Return an UPPER_SNAKE_CASE identifier that expresses the translated meaning. Use uppercase ASCII letters, digits, and underscores only. Do not include spaces, punctuation, quotes, code fences, or explanations.'
  },
  {
    value: 'kebab-case',
    label: 'kebab-case 命名',
    description: '适合文件名、URL 片段和 CSS 类名',
    instruction:
      'Return a kebab-case identifier that expresses the translated meaning. Use lowercase ASCII letters, digits, and hyphens only. Do not include spaces, underscores, punctuation, quotes, code fences, or explanations.'
  }
];

export function getTranslationFormatOption(format: string) {
  return translationFormatOptions.find((option) => option.value === format);
}

export function getTranslationFormatLabel(format: string) {
  return getTranslationFormatOption(format)?.label ?? getTranslationFormatOption(defaultTranslationFormat)?.label ?? '普通翻译';
}

export function normalizeTranslationFormat(format: unknown): TranslationFormat {
  return typeof format === 'string' && translationFormatOptions.some((option) => option.value === format)
    ? (format as TranslationFormat)
    : defaultTranslationFormat;
}
