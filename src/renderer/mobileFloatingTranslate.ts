import { normalizeTargetLanguage } from '../shared/languages';
import { defaultTranslationFormat, normalizeTranslationFormat, type TranslationFormat } from '../shared/translationFormats';

export type MobileFloatingTranslateState = {
  available: boolean;
  platform: 'android';
  canDrawOverlays: boolean;
  enabled: boolean;
  targetLanguage: string;
  translationFormat: TranslationFormat;
  shortcutKeyCode: number;
  shortcutLabel: string;
  hasPendingSharedText: boolean;
};

type MobileFloatingTranslatePluginState = Omit<MobileFloatingTranslateState, 'translationFormat'> & {
  translationFormat: string;
};

type MobileFloatingTranslatePlugin = {
  addListener?: (
    eventName: 'sharedText',
    callback: (payload: { text?: string }) => void
  ) => Promise<{ remove: () => Promise<void> | void }>;
  cancelShortcutCapture?(): Promise<MobileFloatingTranslatePluginState>;
  configure(input: {
    enabled?: boolean;
    targetLanguage?: string;
    translationFormat?: TranslationFormat;
  }): Promise<MobileFloatingTranslatePluginState>;
  consumePendingSharedText(): Promise<{ text?: string }>;
  getState(): Promise<MobileFloatingTranslatePluginState>;
  hideFloatingTranslate?(): Promise<MobileFloatingTranslatePluginState>;
  requestOverlayPermission(): Promise<MobileFloatingTranslatePluginState>;
  showFloatingTranslate(input: {
    text: string;
    targetLanguage: string;
    translationFormat?: TranslationFormat;
  }): Promise<MobileFloatingTranslatePluginState>;
  startShortcutCapture(): Promise<MobileFloatingTranslatePluginState & { captured?: boolean }>;
};

type CapacitorGlobal = {
  getPlatform?: () => string;
  Plugins?: {
    MobileFloatingTranslate?: MobileFloatingTranslatePlugin;
  };
};

export function getMobileFloatingTranslatePlugin() {
  const capacitor = (globalThis as typeof globalThis & { Capacitor?: CapacitorGlobal }).Capacitor;
  if (capacitor?.getPlatform?.() !== 'android') {
    return null;
  }

  return capacitor.Plugins?.MobileFloatingTranslate ?? null;
}

export async function getMobileFloatingTranslateState() {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin) {
    return null;
  }

  return normalizeMobileFloatingState(await plugin.getState());
}

export async function configureMobileFloatingTranslate(input: {
  enabled?: boolean;
  targetLanguage?: string;
  translationFormat?: TranslationFormat;
}) {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin) {
    return null;
  }

  return normalizeMobileFloatingState(
    await plugin.configure({
      ...input,
      targetLanguage: input.targetLanguage ? normalizeTargetLanguage(input.targetLanguage) : undefined,
      translationFormat: input.translationFormat ? normalizeTranslationFormat(input.translationFormat) : undefined
    })
  );
}

export async function requestMobileFloatingPermission() {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin) {
    return null;
  }

  return normalizeMobileFloatingState(await plugin.requestOverlayPermission());
}

export async function startMobileFloatingShortcutCapture() {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin) {
    return null;
  }

  return normalizeMobileFloatingState(await plugin.startShortcutCapture());
}

export async function showMobileFloatingTranslate(input: {
  text: string;
  targetLanguage: string;
  translationFormat?: TranslationFormat;
}) {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin) {
    return null;
  }

  return normalizeMobileFloatingState(
    await plugin.showFloatingTranslate({
      text: input.text,
      targetLanguage: normalizeTargetLanguage(input.targetLanguage),
      translationFormat: normalizeTranslationFormat(input.translationFormat ?? defaultTranslationFormat)
    })
  );
}

export async function consumePendingMobileSharedText() {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin) {
    return '';
  }

  const result = await plugin.consumePendingSharedText();
  return typeof result.text === 'string' ? result.text : '';
}

export function onMobileSharedText(callback: (text: string) => void) {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin?.addListener) {
    return undefined;
  }

  let active = true;
  const listenerPromise = plugin.addListener('sharedText', (payload) => {
    if (active && typeof payload.text === 'string' && payload.text.trim()) {
      void plugin.consumePendingSharedText().catch(() => undefined);
      callback(payload.text);
    }
  });
  void listenerPromise.then((listener) => {
    if (!active) {
      void listener.remove();
    }
  });

  return () => {
    active = false;
    void listenerPromise.then((listener) => listener.remove());
  };
}

function normalizeMobileFloatingState(state: MobileFloatingTranslatePluginState): MobileFloatingTranslateState {
  return {
    available: Boolean(state.available),
    platform: 'android',
    canDrawOverlays: Boolean(state.canDrawOverlays),
    enabled: Boolean(state.enabled),
    targetLanguage: normalizeTargetLanguage(state.targetLanguage),
    translationFormat: normalizeTranslationFormat(state.translationFormat),
    shortcutKeyCode: Number.isFinite(state.shortcutKeyCode) ? state.shortcutKeyCode : 0,
    shortcutLabel: typeof state.shortcutLabel === 'string' ? state.shortcutLabel : '',
    hasPendingSharedText: Boolean(state.hasPendingSharedText)
  };
}
