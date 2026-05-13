import { normalizeTargetLanguage } from '../shared/languages';
import { defaultTranslationFormat, normalizeTranslationFormat, type TranslationFormat } from '../shared/translationFormats';

export type MobileFloatingTranslateState = {
  available: boolean;
  platform: 'android';
  canDrawOverlays: boolean;
  canListenKeyEvents: boolean;
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

type MobileFloatingTranslateListenerHandle = {
  remove: () => Promise<void> | void;
};

type MobileFloatingTranslatePlugin = {
  addListener?: (
    eventName: 'sharedText',
    callback: (payload: { text?: string }) => void
  ) => MobileFloatingTranslateListenerHandle | Promise<MobileFloatingTranslateListenerHandle>;
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
  showFloatingTranslateFromClipboard?(): Promise<MobileFloatingTranslatePluginState>;
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

export async function showMobileFloatingTranslateFromClipboard() {
  const plugin = getMobileFloatingTranslatePlugin();
  if (!plugin?.showFloatingTranslateFromClipboard) {
    return null;
  }

  return normalizeMobileFloatingState(await plugin.showFloatingTranslateFromClipboard());
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
  let listenerHandle: MobileFloatingTranslateListenerHandle | null = null;
  let listenerPromise: Promise<void>;

  try {
    listenerPromise = Promise.resolve(
      plugin.addListener('sharedText', (payload) => {
        if (active && typeof payload.text === 'string' && payload.text.trim()) {
          void plugin.consumePendingSharedText().catch(() => undefined);
          callback(payload.text);
        }
      })
    )
      .then((listener) => {
        listenerHandle = listener;
        if (!active) {
          void removeMobileFloatingListener(listener);
        }
      })
      .catch(() => undefined);
  } catch {
    return undefined;
  }

  return () => {
    active = false;
    if (listenerHandle) {
      void removeMobileFloatingListener(listenerHandle);
      return;
    }

    void listenerPromise;
  };
}

function removeMobileFloatingListener(listener: MobileFloatingTranslateListenerHandle) {
  try {
    return Promise.resolve(listener.remove()).catch(() => undefined);
  } catch {
    return Promise.resolve(undefined);
  }
}

function normalizeMobileFloatingState(state: MobileFloatingTranslatePluginState): MobileFloatingTranslateState {
  return {
    available: Boolean(state.available),
    platform: 'android',
    canDrawOverlays: Boolean(state.canDrawOverlays),
    canListenKeyEvents: Boolean(state.canListenKeyEvents),
    enabled: Boolean(state.enabled),
    targetLanguage: normalizeTargetLanguage(state.targetLanguage),
    translationFormat: normalizeTranslationFormat(state.translationFormat),
    shortcutKeyCode: Number.isFinite(state.shortcutKeyCode) ? state.shortcutKeyCode : 0,
    shortcutLabel: typeof state.shortcutLabel === 'string' ? state.shortcutLabel : '',
    hasPendingSharedText: Boolean(state.hasPendingSharedText)
  };
}
