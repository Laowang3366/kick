export type FloatingShortcutHandlerInput = {
  readSelectedText: () => Promise<string>;
  showFloatingTranslation: (text: string) => Promise<void> | void;
};

export async function runFloatingTranslateShortcut(input: FloatingShortcutHandlerInput) {
  const text = await input.readSelectedText();
  await input.showFloatingTranslation(text);
}
