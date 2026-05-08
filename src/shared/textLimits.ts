export const maxTranslationTextLength = 30000;

export function limitTranslationText(text: string) {
  return text.length > maxTranslationTextLength ? text.slice(0, maxTranslationTextLength) : text;
}
