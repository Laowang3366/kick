import {
  ArrowLeftRight,
  ChevronDown,
  CloudUpload,
  Copy,
  History,
  KeyRound,
  Languages,
  LogIn,
  LogOut,
  Mail,
  Maximize2,
  Minus,
  Moon,
  Pin,
  RefreshCw,
  Settings,
  Star,
  StarOff,
  Sun,
  Trash2,
  UserPlus,
  UserRound,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react';
import {
  createCustomFloatingTranslateShortcut,
  floatingTranslateShortcutOptions,
  formatShortcutAcceleratorLabel,
  getFloatingTranslateShortcutLabel,
  isCustomFloatingTranslateShortcut,
  normalizeCustomShortcutAccelerator,
  normalizeFloatingTranslateShortcut,
  type DesktopSettings
} from '../desktop/desktopSettings';
import { clearAccountSession, loadAccountSession, saveAccountSession, type AccountSession } from './accountSession';
import { createCloudClient } from './cloudClient';
import {
  getLanguageLabel,
  languageOptions,
  normalizeTargetLanguage,
  sourceLanguageOptions
} from '../shared/languages';
import {
  getTranslationFormatLabel,
  normalizeTranslationFormat,
  translationFormatOptions,
  type TranslationFormat
} from '../shared/translationFormats';
import { canUseTranslationFormat, resolveTranslationFormat } from '../shared/translationFormatRules';
import { limitTranslationText, maxTranslationTextLength } from '../shared/textLimits';
import { translateText, type TranslateTextResult } from '../shared/translator';
import { LanguagePicker } from './LanguagePicker';
import { loadDefaultTargetLanguage, saveDefaultTargetLanguage } from './languagePreference';
import { loadFavoriteIds, loadHistoryEntries, saveFavoriteIds, saveHistoryEntries, type StoredTranslationEntry } from './libraryStorage';
import { createProviderFromSettings } from './providerConfig';
import { loadProviderSettings } from './providerSettingsStorage';
import { readSharedTextFromUrl } from './sharedText';
import { applyThemePreference, loadThemePreference, saveThemePreference, type ThemePreference } from './themePreference';
import { loadDefaultTranslationFormat, saveDefaultTranslationFormat } from './translationFormatPreference';
import {
  checkForAppUpdates,
  currentAppVersion,
  ignoreUpdateVersion,
  installOrOpenUpdate,
  remindLater,
  type UpdateInstallProgress,
  type UpdateCheckResult
} from './updateCenter';
import './styles.css';

type TranslationStatus = 'idle' | 'loading' | 'success' | 'error';
type ActiveView = 'translate' | 'history' | 'favorites' | 'settings' | 'account';
type AccountMode = 'login' | 'register';
type CopyNotice = {
  message: string;
  tone: 'success' | 'error';
};
type DesktopUpdateProgress = UpdateInstallProgress;
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type WindowControlCommand =
  | 'minimize'
  | 'toggle-maximize'
  | 'hide-main-window'
  | 'toggle-always-on-top';

type TranslationEntry = StoredTranslationEntry;
type RememberedAccount = {
  email: string;
  password: string;
};

const activeViewOrder: ActiveView[] = ['translate', 'history', 'favorites', 'settings', 'account'];
const swipeThresholdPx = 72;
const swipeDominanceRatio = 1.2;
const desktopUpdatePlatforms = new Set(['windows', 'macos']);

type NavItemProps = {
  active: boolean;
  icon: ReactNode;
  label: string;
  screenReaderLabel: string;
  onClick: () => void;
};

function detectSourceLanguage(text: string) {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return null;
  }

  return sourceLanguageOptions.find((option) => option.pattern.test(normalizedText)) ?? null;
}

function createEntryId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatEntryTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}

function normalizeDesktopUpdateProgress(progress: DesktopUpdateProgress): DesktopUpdateProgress {
  return {
    ...progress,
    percent: Math.min(100, Math.max(0, Number.isFinite(progress.percent) ? progress.percent : 0))
  };
}

function formatBytes(value?: number) {
  if (!value || value <= 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatUpdateProgressDetail(progress: DesktopUpdateProgress) {
  if (progress.status === 'checking') {
    return progress.message ?? '正在准备更新';
  }

  if (progress.status === 'downloaded') {
    return progress.message ?? '更新已下载';
  }

  if (progress.status === 'error') {
    return progress.message ?? '更新失败';
  }

  const percent = Math.round(progress.percent);
  const total = formatBytes(progress.total);
  const transferred = formatBytes(progress.transferred);
  const speed = formatBytes(progress.bytesPerSecond);
  const sizeText = total && transferred ? `${transferred} / ${total}` : '';
  const speedText = speed ? `${speed}/s` : '';
  return [sizeText, speedText].filter(Boolean).join(' · ') || `下载进度 ${percent}%`;
}

const rememberedAccountStorageKey = 'quick-translate-remembered-account';

function loadRememberedAccount(): RememberedAccount | null {
  try {
    const value = localStorage.getItem(rememberedAccountStorageKey);
    const parsedValue: unknown = value ? JSON.parse(value) : null;
    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }
    const record = parsedValue as Partial<RememberedAccount>;
    return typeof record.email === 'string' && typeof record.password === 'string'
      ? { email: record.email, password: record.password }
      : null;
  } catch {
    return null;
  }
}

function saveRememberedAccount(account: RememberedAccount) {
  localStorage.setItem(rememberedAccountStorageKey, JSON.stringify(account));
}

function clearRememberedAccount() {
  localStorage.removeItem(rememberedAccountStorageKey);
}

function createShortcutAcceleratorFromKeyboardEvent(event: KeyboardEvent<HTMLElement>) {
  const key = normalizeKeyboardShortcutKey(event.key, event.code);
  const parts = [
    event.ctrlKey ? 'CommandOrControl' : '',
    event.metaKey ? 'Super' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    key
  ].filter(Boolean);

  return normalizeCustomShortcutAccelerator(parts.join('+'));
}

function normalizeKeyboardShortcutKey(key: string, code: string) {
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
    return '';
  }

  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }
  if (/^Digit\d$/.test(code)) {
    return code.slice(5);
  }
  if (/^F([1-9]|1\d|2[0-4])$/.test(key)) {
    return key;
  }

  const keyMap: Record<string, string> = {
    '+': 'Plus',
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Enter: 'Return',
    Escape: 'Escape',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown'
  };

  if (keyMap[key]) {
    return keyMap[key];
  }
  if (key.length === 1 && /^[a-z0-9]$/i.test(key)) {
    return key.toUpperCase();
  }

  return '';
}

function NavItem({ active, icon, label, screenReaderLabel, onClick }: NavItemProps) {
  return (
    <button
      className={`nav-item${active ? ' active' : ''}`}
      type="button"
      aria-label={screenReaderLabel}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function App() {
  const rememberedAccount = loadRememberedAccount();
  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState(loadDefaultTargetLanguage);
  const [defaultTargetLanguage, setDefaultTargetLanguage] = useState(loadDefaultTargetLanguage);
  const [translationFormat, setTranslationFormat] = useState<TranslationFormat>(loadDefaultTranslationFormat);
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<TranslateTextResult | null>(null);
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('translate');
  const [historyEntries, setHistoryEntries] = useState<TranslationEntry[]>(loadHistoryEntries);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadFavoriteIds);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const [providerSettings] = useState(loadProviderSettings);
  const [desktopSettings, setDesktopSettingsState] = useState<DesktopSettings | null>(null);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>(loadThemePreference);
  const [accountSession, setAccountSession] = useState<AccountSession | null>(loadAccountSession);
  const [accountMode, setAccountMode] = useState<AccountMode>('login');
  const [accountEmail, setAccountEmail] = useState(rememberedAccount?.email ?? '');
  const [accountPassword, setAccountPassword] = useState(rememberedAccount?.password ?? '');
  const [accountDisplayName, setAccountDisplayName] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [rememberPassword, setRememberPassword] = useState(Boolean(rememberedAccount));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<DesktopUpdateProgress | null>(null);
  const [showCustomFloatingShortcutEditor, setShowCustomFloatingShortcutEditor] = useState(false);
  const [isRecordingFloatingShortcut, setIsRecordingFloatingShortcut] = useState(false);
  const [floatingShortcutError, setFloatingShortcutError] = useState('');
  const cloudClient = useMemo(() => createCloudClient(), []);
  const hasSelectedTargetLanguage = useRef(false);
  const lastMouseShortcutAt = useRef(0);
  const lastAutoTranslationKey = useRef('');
  const translationRequestId = useRef(0);
  const hasLoadedCloudState = useRef(false);
  const contentSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const floatingShortcutCaptureButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    document.title = '快捷翻译';
  }, []);

  useEffect(() => {
    void runUpdateCheck();
  }, []);

  useEffect(() => {
    return window.quickTranslate?.onUpdateProgress?.((progress) => {
      setUpdateProgress(normalizeDesktopUpdateProgress(progress));
    });
  }, []);

  useEffect(() => {
    const appliedTheme = applyThemePreference(theme);
    saveThemePreference(appliedTheme);
  }, [theme]);

  useEffect(() => {
    if (isRecordingFloatingShortcut) {
      floatingShortcutCaptureButton.current?.focus();
    }
  }, [isRecordingFloatingShortcut]);

  useEffect(() => {
    let isMounted = true;

    void window.quickTranslate?.getDesktopSettings?.().then((settings) => {
      if (isMounted) {
        const normalizedTargetLanguage = normalizeTargetLanguage(settings.defaultTargetLanguage);
        setDesktopSettingsState(settings);
        setDefaultTargetLanguage(normalizedTargetLanguage);
        if (!hasSelectedTargetLanguage.current) {
          setTargetLanguage(normalizedTargetLanguage);
        }
        setTranslationFormat(normalizeTranslationFormat(settings.defaultTranslationFormat));
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return window.quickTranslate?.onDesktopSettingsChanged?.((settings) => {
      const normalizedTargetLanguage = normalizeTargetLanguage(settings.defaultTargetLanguage);
      setDesktopSettingsState(settings);
      setDefaultTargetLanguage(normalizedTargetLanguage);
      setTargetLanguage(normalizedTargetLanguage);
      hasSelectedTargetLanguage.current = false;
      setTranslationFormat(normalizeTranslationFormat(settings.defaultTranslationFormat));
    });
  }, []);

  const sourceLength = sourceText.length;
  const canTranslate = sourceText.trim().length > 0 && status !== 'loading';
  const canSelectTranslationFormat = canUseTranslationFormat(targetLanguage);
  const activeTranslationFormat = useMemo(
    () => resolveTranslationFormat(targetLanguage, translationFormat),
    [targetLanguage, translationFormat]
  );
  const selectedTranslationFormat = useMemo(() => getTranslationFormatLabel(activeTranslationFormat), [activeTranslationFormat]);
  const detectedSourceLanguage = useMemo(() => detectSourceLanguage(sourceText), [sourceText]);
  const sourceLanguageLabel = detectedSourceLanguage?.label ?? '自动检测';
  const sourceLanguageBadge = detectedSourceLanguage?.badge ?? '自';
  const favoriteEntries = useMemo(
    () => historyEntries.filter((entry) => favoriteIds.includes(entry.id)),
    [favoriteIds, historyEntries]
  );
  const latestIsFavorite = lastEntryId ? favoriteIds.includes(lastEntryId) : false;

  useEffect(() => {
    saveHistoryEntries(historyEntries);
  }, [historyEntries]);

  useEffect(() => {
    const historyIdSet = new Set(historyEntries.map((entry) => entry.id));
    setSelectedHistoryIds((ids) => ids.filter((id) => historyIdSet.has(id)));
  }, [historyEntries]);

  useEffect(() => {
    saveFavoriteIds(favoriteIds);
  }, [favoriteIds]);

  useEffect(() => {
    if (!accountSession || hasLoadedCloudState.current) {
      return;
    }

    setSyncStatus('syncing');
    void loadCloudState(accountSession)
      .then(() => {
        setSyncStatus('success');
        setAccountMessage('云端备份已恢复');
      })
      .catch((error) => {
        setSyncStatus('error');
        setAccountMessage(error instanceof Error ? error.message : '云端数据读取失败，本地数据已保留');
      });
  }, [accountSession]);

  useEffect(() => {
    if (!accountSession || !hasLoadedCloudState.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSyncStatus('syncing');
      void cloudClient
        .saveState(accountSession.token, createCloudBackupState())
        .then(() => {
          setSyncStatus('success');
          setAccountMessage('云端备份已更新');
        })
        .catch((error) => {
          setSyncStatus('error');
          setAccountMessage(error instanceof Error ? error.message : '云端同步失败，本地数据已保留');
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [accountSession, historyEntries, favoriteIds, defaultTargetLanguage, translationFormat, theme, cloudClient]);

  useEffect(() => {
    if (!copyNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopyNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [copyNotice]);

  useEffect(() => {
    const normalizedText = sourceText.trim();
    if (!normalizedText) {
      return undefined;
    }

    const effectiveFormat = resolveTranslationFormat(targetLanguage, translationFormat);
    const translationKey = `${normalizedText}\n${targetLanguage}\n${effectiveFormat}`;

    if (lastAutoTranslationKey.current === translationKey) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (lastAutoTranslationKey.current === translationKey) {
        return;
      }

      lastAutoTranslationKey.current = translationKey;
      void runTranslation(normalizedText, targetLanguage, translationFormat);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [sourceText, targetLanguage, translationFormat, providerSettings]);

  useEffect(() => {
    return window.quickTranslate?.onSelectionCaptured?.((text) => {
      const limitedText = limitTranslationText(text);
      setSourceText(limitedText);
      setActiveView('translate');
      void runTranslation(limitedText, targetLanguage, translationFormat);
    });
  }, [targetLanguage, translationFormat, providerSettings]);

  useEffect(() => {
    const sharedText = readSharedTextFromUrl(window.location.href);
    if (sharedText) {
      const limitedText = limitTranslationText(sharedText);
      setSourceText(limitedText);
      setActiveView('translate');
      void runTranslation(limitedText, targetLanguage, translationFormat);
    }
  }, []);

  useEffect(() => {
    const handleMouseButtonShortcut = (event: MouseEvent) => {
      if (event.button !== 3) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const now = Date.now();
      if (now - lastMouseShortcutAt.current < 250) {
        return;
      }
      lastMouseShortcutAt.current = now;

      void translateClipboard();
    };

    window.addEventListener('mouseup', handleMouseButtonShortcut, { capture: true });
    window.addEventListener('auxclick', handleMouseButtonShortcut, { capture: true });

    return () => {
      window.removeEventListener('mouseup', handleMouseButtonShortcut, { capture: true });
      window.removeEventListener('auxclick', handleMouseButtonShortcut, { capture: true });
    };
  }, [targetLanguage, translationFormat, providerSettings]);

  async function runTranslation(text = sourceText, language = targetLanguage, format = translationFormat) {
    const limitedText = limitTranslationText(text);
    const normalizedText = limitedText.trim();
    if (!normalizedText) {
      translationRequestId.current += 1;
      lastAutoTranslationKey.current = '';
      setCopyNotice(null);
      setStatus('error');
      setError('没有可翻译的文本');
      setActiveView('translate');
      return;
    }

    const effectiveFormat = resolveTranslationFormat(language, format);
    lastAutoTranslationKey.current = `${normalizedText}\n${language}\n${effectiveFormat}`;
    const requestId = translationRequestId.current + 1;
    translationRequestId.current = requestId;
    setStatus('loading');
    setError('');
    setCopyNotice(null);
    setActiveView('translate');

    try {
      const translation = window.quickTranslate?.translateText
        ? await window.quickTranslate.translateText({ text: normalizedText, targetLanguage: language, translationFormat: effectiveFormat })
        : await translateWithCloudFallback(normalizedText, language, effectiveFormat);

      if (requestId !== translationRequestId.current) {
        return;
      }

      const entry: TranslationEntry = {
        ...translation,
        id: createEntryId(),
        createdAt: formatEntryTime(),
        targetLabel: getLanguageLabel(language),
        translationFormat: effectiveFormat,
        formatLabel: getTranslationFormatLabel(effectiveFormat)
      };

      setResult(translation);
      setLastEntryId(entry.id);
      setHistoryEntries((entries) => [entry, ...entries].slice(0, 50));
      setStatus('success');
    } catch (translationError) {
      if (requestId !== translationRequestId.current) {
        return;
      }

      setStatus('error');
      setError(translationError instanceof Error ? translationError.message : '翻译失败');
    }
  }

  async function translateClipboard() {
    const capturedText =
      (await window.quickTranslate?.captureSelectedText?.()) ??
      (await navigator.clipboard?.readText?.().catch(() => '')) ??
      '';

    const limitedText = limitTranslationText(capturedText);
    setSourceText(limitedText);
    await runTranslation(limitedText, targetLanguage, translationFormat);
  }

  async function copyResult() {
    if (!result?.translatedText) {
      return;
    }

    try {
      if (window.quickTranslate?.copyText) {
        await window.quickTranslate.copyText(result.translatedText);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.translatedText);
      } else {
        throw new Error('Clipboard API is unavailable');
      }

      setCopyNotice({ tone: 'success', message: '已复制译文' });
      return;
    } catch {
      setCopyNotice({ tone: 'error', message: '复制失败' });
    }
  }

  function clearText() {
    clearCurrentTranslation();
    setSourceText('');
  }

  function clearCurrentTranslation() {
    translationRequestId.current += 1;
    lastAutoTranslationKey.current = '';
    setResult(null);
    setError('');
    setCopyNotice(null);
    setLastEntryId(null);
    setStatus('idle');
  }

  function handleSourceTextChange(text: string) {
    const limitedText = limitTranslationText(text);
    setSourceText(limitedText);

    if (!limitedText.trim()) {
      clearCurrentTranslation();
    }
  }

  function handleSourceTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey) || !canTranslate) {
      return;
    }

    event.preventDefault();
    void runTranslation();
  }

  function toggleLatestFavorite() {
    if (!lastEntryId) {
      return;
    }

    const willRemove = favoriteIds.includes(lastEntryId);
    setFavoriteIds((ids) => (ids.includes(lastEntryId) ? ids.filter((id) => id !== lastEntryId) : [lastEntryId, ...ids]));
    setCopyNotice({ tone: 'success', message: willRemove ? '已取消收藏' : '已收藏译文' });
  }

  function toggleEntryFavorite(entryId: string) {
    const willRemove = favoriteIds.includes(entryId);
    setFavoriteIds((ids) => (ids.includes(entryId) ? ids.filter((id) => id !== entryId) : [entryId, ...ids]));
    setCopyNotice({ tone: 'success', message: willRemove ? '已取消收藏' : '已收藏译文' });
  }

  function deleteEntry(entryId: string) {
    setHistoryEntries((entries) => entries.filter((entry) => entry.id !== entryId));
    setFavoriteIds((ids) => ids.filter((id) => id !== entryId));
    setSelectedHistoryIds((ids) => ids.filter((id) => id !== entryId));
    if (lastEntryId === entryId) {
      setLastEntryId(null);
    }
    setCopyNotice({ tone: 'success', message: '已删除记录' });
  }

  function selectAllHistoryEntries() {
    setSelectedHistoryIds(historyEntries.map((entry) => entry.id));
  }

  function clearHistorySelection() {
    setSelectedHistoryIds([]);
  }

  function toggleHistorySelection(entryId: string) {
    setSelectedHistoryIds((ids) => (ids.includes(entryId) ? ids.filter((id) => id !== entryId) : [...ids, entryId]));
  }

  function deleteSelectedHistoryEntries() {
    if (selectedHistoryIds.length === 0) {
      return;
    }

    const selectedIdSet = new Set(selectedHistoryIds);
    setHistoryEntries((entries) => entries.filter((entry) => !selectedIdSet.has(entry.id)));
    setFavoriteIds((ids) => ids.filter((id) => !selectedIdSet.has(id)));
    if (lastEntryId && selectedIdSet.has(lastEntryId)) {
      setLastEntryId(null);
    }
    setSelectedHistoryIds([]);
    setCopyNotice({ tone: 'success', message: '已删除选中记录' });
  }

  function deleteAllHistoryEntries() {
    if (historyEntries.length === 0) {
      return;
    }

    setHistoryEntries([]);
    setFavoriteIds([]);
    setSelectedHistoryIds([]);
    setLastEntryId(null);
    setCopyNotice({ tone: 'success', message: '已清空历史记录' });
  }

  function restoreEntry(entry: TranslationEntry) {
    setSourceText(limitTranslationText(entry.sourceText));
    changeTargetLanguage(entry.targetLanguage);
    changeTranslationFormat(entry.translationFormat);
    setResult({
      provider: entry.provider,
      sourceText: entry.sourceText,
      translatedText: entry.translatedText,
      targetLanguage: entry.targetLanguage
    });
    setLastEntryId(entry.id);
    setStatus('success');
    setError('');
    setActiveView('translate');
  }

  function changeTargetLanguage(language: string) {
    hasSelectedTargetLanguage.current = true;
    setTargetLanguage(normalizeTargetLanguage(language));
  }

  function changeTranslationFormat(format: string) {
    setTranslationFormat(normalizeTranslationFormat(format));
  }

  function selectTranslationFormat(format: string) {
    if (!canSelectTranslationFormat) {
      return;
    }

    setTranslationFormat(saveDefaultTranslationFormat(format));
  }

  function swapWithLatestResult() {
    if (!result?.translatedText) {
      return;
    }

    setSourceText(result.translatedText);
    setResult(null);
    setLastEntryId(null);
    setStatus('idle');
    setError('');
    changeTargetLanguage(result.targetLanguage === 'zh-CN' ? 'en-US' : 'zh-CN');
  }

  async function updateDesktopSettings(settings: Partial<DesktopSettings>) {
    if (settings.defaultTargetLanguage) {
      const defaultTargetLanguage = saveDefaultTargetLanguage(settings.defaultTargetLanguage);
      setDefaultTargetLanguage(defaultTargetLanguage);
      setTargetLanguage(defaultTargetLanguage);
      hasSelectedTargetLanguage.current = false;
      settings = { ...settings, defaultTargetLanguage };
    }

    if (settings.defaultTranslationFormat) {
      const defaultTranslationFormat = saveDefaultTranslationFormat(settings.defaultTranslationFormat);
      setTranslationFormat(defaultTranslationFormat);
      settings = { ...settings, defaultTranslationFormat };
    }

    if (!desktopSettings || !window.quickTranslate?.setDesktopSettings) {
      return;
    }

    setDesktopSettingsState({ ...desktopSettings, ...settings });

    try {
      setDesktopSettingsState(await window.quickTranslate.setDesktopSettings(settings));
    } catch {
      setDesktopSettingsState(desktopSettings);
      setStatus('error');
      setError('桌面设置保存失败');
      setActiveView('translate');
    }
  }

  function selectFloatingShortcut(value: string) {
    setFloatingShortcutError('');

    if (value === 'custom') {
      setShowCustomFloatingShortcutEditor(true);
      setIsRecordingFloatingShortcut(true);
      return;
    }

    setShowCustomFloatingShortcutEditor(false);
    setIsRecordingFloatingShortcut(false);
    void updateDesktopSettings({ floatingTranslateShortcut: normalizeFloatingTranslateShortcut(value) });
  }

  function captureFloatingShortcut(event: KeyboardEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      setIsRecordingFloatingShortcut(false);
      setFloatingShortcutError('');
      if (!isCustomFloatingTranslateShortcut(desktopSettings?.floatingTranslateShortcut)) {
        setShowCustomFloatingShortcutEditor(false);
      }
      return;
    }

    const accelerator = createShortcutAcceleratorFromKeyboardEvent(event);
    if (!accelerator) {
      setFloatingShortcutError('请按 Ctrl、Alt 或 Win 加字母、数字、方向键，也可直接使用 F1-F24');
      return;
    }

    setFloatingShortcutError('');
    setIsRecordingFloatingShortcut(false);
    setShowCustomFloatingShortcutEditor(true);
    void updateDesktopSettings({ floatingTranslateShortcut: createCustomFloatingTranslateShortcut(accelerator) });
  }

  async function runWindowCommand(command: WindowControlCommand) {
    if (window.quickTranslate?.windowControl) {
      return window.quickTranslate.windowControl(command);
    }

    return undefined;
  }

  async function toggleAlwaysOnTop() {
    try {
      const nextState = await runWindowCommand('toggle-always-on-top');

      if (typeof nextState === 'boolean') {
        setIsAlwaysOnTop(nextState);
        return;
      }

      setIsAlwaysOnTop((currentState) => !currentState);
    } catch {
      setStatus('error');
      setError('窗口置顶切换失败');
      setActiveView('translate');
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  }

  function changeTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
  }

  async function runUpdateCheck() {
    setIsCheckingUpdate(true);
    setUpdateProgress(null);
    try {
      setUpdateCheck(await checkForAppUpdates());
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  async function updateNow() {
    if (updateCheck?.status !== 'available') {
      return;
    }

    setIsInstallingUpdate(true);
    setUpdateProgress({
      status: 'checking',
      percent: 0,
      message: '正在准备更新'
    });

    try {
      const message = await installOrOpenUpdate(updateCheck.release, (progress) => {
        setUpdateProgress(normalizeDesktopUpdateProgress(progress));
      });
      if (desktopUpdatePlatforms.has(updateCheck.release.platform) || updateCheck.release.platform === 'android') {
        setUpdateProgress(
          message.includes('已下载') || message.includes('更新包') || message.includes('安装') || message.includes('确认页')
            ? { status: 'downloaded', percent: 100, message }
            : null
        );
      } else {
        setUpdateProgress(null);
      }
      setCopyNotice({ tone: 'success', message });
    } catch (error) {
      setUpdateProgress({
        status: 'error',
        percent: 0,
        message: error instanceof Error ? error.message : '更新启动失败'
      });
      setCopyNotice({ tone: 'error', message: error instanceof Error ? error.message : '更新启动失败' });
    } finally {
      setIsInstallingUpdate(false);
    }
  }

  function ignoreCurrentUpdate() {
    if (updateCheck?.status !== 'available') {
      return;
    }

    ignoreUpdateVersion(updateCheck.release.version);
    setUpdateCheck({
      status: 'ignored',
      platform: updateCheck.platform,
      currentVersion: updateCheck.currentVersion,
      release: updateCheck.release
    });
  }

  function remindCurrentUpdateLater() {
    if (updateCheck?.status !== 'available') {
      return;
    }

    remindLater();
    setUpdateCheck({ ...updateCheck, isSnoozed: true });
  }

  async function translateWithCloudFallback(text: string, language: string, format: TranslationFormat) {
    try {
      return await cloudClient.translate({ text, targetLanguage: language, translationFormat: format });
    } catch {
      return translateText({
        text,
        targetLanguage: language,
        translationFormat: format,
        provider: createProviderFromSettings(providerSettings)
      });
    }
  }

  async function submitAccount(mode: 'login' | 'register') {
    setAccountMessage('');
    setSyncStatus('syncing');

    try {
      const authResult =
        mode === 'register'
          ? await cloudClient.register({
              email: accountEmail,
              password: accountPassword,
              displayName: accountDisplayName || accountEmail
            })
          : await cloudClient.login({
              email: accountEmail,
              password: accountPassword
            });

      const session = {
        token: authResult.token,
        user: authResult.user
      };
      saveAccountSession(session);
      setAccountSession(session);
      await loadCloudState(session);
      if (mode === 'login' && rememberPassword) {
        saveRememberedAccount({ email: accountEmail, password: accountPassword });
      } else if (mode === 'login') {
        clearRememberedAccount();
        setAccountPassword('');
      } else {
        setAccountPassword('');
      }
      setSyncStatus('success');
      setAccountMessage('已登录，云端备份已启用');
    } catch (error) {
      setSyncStatus('error');
      setAccountMessage(error instanceof Error ? error.message : '登录失败');
    }
  }

  function showForgotPasswordMessage() {
    setSyncStatus('idle');
    setAccountMessage('请联系管理员在后台用户管理中重置密码。');
  }

  async function loadCloudState(session: AccountSession) {
    try {
      const state = await cloudClient.loadState(session.token);
      if (state.history.length > 0) {
        setHistoryEntries(state.history);
      }
      if (state.favoriteIds.length > 0) {
        setFavoriteIds(state.favoriteIds);
      }
      if (state.settings.defaultTargetLanguage) {
        setDefaultTargetLanguage(saveDefaultTargetLanguage(state.settings.defaultTargetLanguage));
      }
      if (state.settings.defaultTranslationFormat) {
        setTranslationFormat(saveDefaultTranslationFormat(state.settings.defaultTranslationFormat));
      }
      if (state.settings.theme) {
        setTheme(state.settings.theme);
      }
    } finally {
      hasLoadedCloudState.current = true;
    }
  }

  function createCloudBackupState() {
    return {
      history: historyEntries,
      favoriteIds,
      settings: {
        defaultTargetLanguage,
        defaultTranslationFormat: translationFormat,
        theme
      }
    };
  }

  async function backupAccountState() {
    if (!accountSession) {
      return;
    }

    setSyncStatus('syncing');
    setAccountMessage('正在备份本地数据');

    try {
      await cloudClient.saveState(accountSession.token, createCloudBackupState());
      setSyncStatus('success');
      setAccountMessage('手动备份已完成');
    } catch (error) {
      setSyncStatus('error');
      setAccountMessage(error instanceof Error ? error.message : '手动备份失败，本地数据已保留');
    }
  }

  function logoutAccount() {
    clearAccountSession();
    setAccountSession(null);
    hasLoadedCloudState.current = false;
    setSyncStatus('idle');
    setAccountMessage('已退出账号，本地数据仍会保留');
  }

  function switchActiveView(direction: -1 | 1) {
    setActiveView((currentView) => {
      const currentIndex = activeViewOrder.indexOf(currentView);
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), activeViewOrder.length - 1);
      return activeViewOrder[nextIndex];
    });
  }

  function handleContentTouchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) {
      contentSwipeStart.current = null;
      return;
    }

    const touch = event.touches[0];
    contentSwipeStart.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }

  function handleContentTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = contentSwipeStart.current;
    const touch = event.changedTouches[0];
    contentSwipeStart.current = null;

    if (!start || !touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < swipeThresholdPx || Math.abs(deltaX) < Math.abs(deltaY) * swipeDominanceRatio) {
      return;
    }

    switchActiveView(deltaX < 0 ? 1 : -1);
  }

  const isUpdateBusy = isCheckingUpdate || isInstallingUpdate;
  const isDesktopReleaseUpdate =
    (updateCheck?.status === 'available' || updateCheck?.status === 'ignored') &&
    desktopUpdatePlatforms.has(updateCheck.release.platform);
  const updateProgressPercent = Math.round(updateProgress?.percent ?? 0);
  const updateProgressLabel =
    updateProgress?.status === 'checking'
      ? '正在准备更新'
      : updateProgress?.status === 'downloading'
        ? `正在下载更新 ${updateProgressPercent}%`
        : updateProgress?.status === 'downloaded'
          ? '更新下载完成'
          : updateProgress?.status === 'error'
          ? '更新失败'
          : '';
  const normalizedFloatingShortcut = normalizeFloatingTranslateShortcut(desktopSettings?.floatingTranslateShortcut);
  const isCustomFloatingShortcut = isCustomFloatingTranslateShortcut(normalizedFloatingShortcut);
  const shouldShowCustomFloatingShortcutEditor =
    isCustomFloatingShortcut || showCustomFloatingShortcutEditor || isRecordingFloatingShortcut;
  const floatingShortcutSelectValue = shouldShowCustomFloatingShortcutEditor ? 'custom' : normalizedFloatingShortcut;
  const customFloatingShortcutAccelerator = isCustomFloatingShortcut ? normalizedFloatingShortcut.slice('custom:'.length) : '';
  const customFloatingShortcutLabel = customFloatingShortcutAccelerator
    ? formatShortcutAcceleratorLabel(customFloatingShortcutAccelerator)
    : '点击后按下新的组合键';
  const latestVersionLabel =
    updateCheck?.status === 'available' || updateCheck?.status === 'ignored'
      ? updateCheck.release.version
      : updateCheck?.status === 'current'
        ? updateCheck.latestVersion ?? updateCheck.currentVersion
        : updateCheck?.status === 'failed'
          ? '检查失败'
          : '检查中';
  const floatingShortcutLabel = getFloatingTranslateShortcutLabel(normalizedFloatingShortcut);
  const isFloatingShortcutEnabled = normalizedFloatingShortcut !== 'disabled';
  const defaultTargetLanguageLabel = getLanguageLabel(defaultTargetLanguage);
  const defaultTranslationFormatLabel = getTranslationFormatLabel(translationFormat);

  return (
    <main className="app-shell">
      <section className="window-frame" aria-label="快捷翻译">
        <header className="window-titlebar">
          <div className="title-brand">
            <span className="app-icon" aria-hidden="true">
              <Languages size={18} />
            </span>
            <h1>快捷翻译</h1>
          </div>
          <div className="window-controls" aria-label="窗口控制">
            <button
              className={`window-control pin${isAlwaysOnTop ? ' active' : ''}`}
              type="button"
              aria-label={isAlwaysOnTop ? '取消置顶' : '置顶窗口'}
              aria-pressed={isAlwaysOnTop}
              onClick={toggleAlwaysOnTop}
            >
              <Pin size={16} />
            </button>
            <button
              className="window-control minimize"
              type="button"
              aria-label="最小化窗口"
              onClick={() => runWindowCommand('minimize')}
            >
              <Minus size={17} />
            </button>
            <button
              className="window-control maximize"
              type="button"
              aria-label="最大化或还原窗口"
              onClick={() => runWindowCommand('toggle-maximize')}
            >
              <Maximize2 size={15} />
            </button>
            <button
              className="window-control close"
              type="button"
              aria-label="关闭窗口"
              onClick={() => runWindowCommand('hide-main-window')}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="workspace">
          <aside className="sidebar" aria-label="主导航">
            <nav className="nav-list">
              <NavItem
                active={activeView === 'translate'}
                icon={<Languages size={22} />}
                label="翻译"
                screenReaderLabel="翻译视图"
                onClick={() => setActiveView('translate')}
              />
              <NavItem
                active={activeView === 'history'}
                icon={<History size={22} />}
                label="历史"
                screenReaderLabel="历史记录"
                onClick={() => setActiveView('history')}
              />
              <NavItem
                active={activeView === 'favorites'}
                icon={<Star size={22} />}
                label="收藏"
                screenReaderLabel="收藏列表"
                onClick={() => setActiveView('favorites')}
              />
              <NavItem
                active={activeView === 'settings'}
                icon={<Settings size={22} />}
                label="设置"
                screenReaderLabel="设置"
                onClick={() => setActiveView('settings')}
              />
              <NavItem
                active={activeView === 'account'}
                icon={<UserRound size={22} />}
                label="账号"
                screenReaderLabel="账号"
                onClick={() => setActiveView('account')}
              />
            </nav>

            <div className="shortcut-card" aria-label="翻译快捷键">
              <span className="shortcut-label">快捷键</span>
              <strong>{getFloatingTranslateShortcutLabel(desktopSettings?.floatingTranslateShortcut)}</strong>
              <span>选中文字后快速翻译</span>
            </div>

            <button
              className="theme-switch"
              type="button"
              aria-label={theme === 'light' ? '启用深色主题' : '启用浅色主题'}
              aria-pressed={theme === 'dark'}
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
            </button>
          </aside>

          <section
            className="content-area"
            aria-label="功能内容"
            onTouchStart={handleContentTouchStart}
            onTouchEnd={handleContentTouchEnd}
            onTouchCancel={() => {
              contentSwipeStart.current = null;
            }}
          >
            {activeView === 'translate' ? (
              <section className="translate-view" aria-label="翻译">
                <div className="translate-grid">
                  <section className="text-panel source-panel" aria-label="原文面板">
                    <div className="panel-meta">
                      <label className="panel-title" htmlFor="source-text">
                        原文
                      </label>
                      <span className="source-language-chip" aria-label={`检测到的源语言：${sourceLanguageLabel}`}>
                        <span aria-hidden="true">{sourceLanguageBadge}</span>
                        <strong>{sourceLanguageLabel}</strong>
                      </span>
                    </div>
                    <textarea
                      id="source-text"
                      value={sourceText}
                      onChange={(event) => handleSourceTextChange(event.target.value)}
                      onKeyDown={handleSourceTextKeyDown}
                      placeholder="输入或粘贴需要翻译的文本"
                      maxLength={maxTranslationTextLength}
                      rows={10}
                    />
                    <div className="panel-footer">
                      <span>{sourceLength} / {maxTranslationTextLength}</span>
                      <button className="panel-action" type="button" onClick={clearText} aria-label="清空原文">
                        <X size={18} />
                        <span>清空</span>
                      </button>
                    </div>
                  </section>

                  <button
                    className="swap-button"
                    type="button"
                    onClick={swapWithLatestResult}
                    disabled={!result?.translatedText}
                    aria-label="交换语言"
                  >
                    <ArrowLeftRight size={24} />
                  </button>

                  <section className="text-panel result-panel" aria-live="polite" aria-label="译文面板">
                    <div className="result-meta">
                      <span className="panel-title">译文</span>
                      <div className="result-header-actions">
                        <LanguagePicker
                          ariaLabel="目标语言"
                          value={targetLanguage}
                          onChange={changeTargetLanguage}
                          className="panel-language-picker"
                        />
                        <label
                          className={`result-format-control${canSelectTranslationFormat ? '' : ' disabled'}`}
                          aria-disabled={!canSelectTranslationFormat}
                        >
                          <strong>翻译格式 {selectedTranslationFormat}</strong>
                          {canSelectTranslationFormat ? <ChevronDown size={15} aria-hidden="true" /> : null}
                          <select
                            className="format-control-select"
                            value={activeTranslationFormat}
                            aria-label="翻译格式"
                            disabled={!canSelectTranslationFormat}
                            onChange={(event) => selectTranslationFormat(event.target.value)}
                          >
                            {translationFormatOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="result-body">
                      {status === 'error' ? <p className="error-message">{error}</p> : null}
                      {result ? <p className="translated-text">{result.translatedText}</p> : null}
                      {!result && status !== 'error' ? <p className="empty-state">翻译结果会显示在这里</p> : null}
                    </div>

                    <div className="result-tools">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={copyResult}
                        disabled={!result?.translatedText}
                        aria-label="复制译文"
                      >
                        <Copy size={21} />
                      </button>
                      <button
                        className={`icon-button${latestIsFavorite ? ' active' : ''}`}
                        type="button"
                        onClick={toggleLatestFavorite}
                        disabled={!lastEntryId}
                        aria-label="收藏译文"
                      >
                        <Star size={21} />
                      </button>
                    </div>
                  </section>
                </div>
                <section className="translate-settings-summary" aria-label="当前设置信息">
                  <article>
                    <span>悬浮翻译</span>
                    <strong>{isFloatingShortcutEnabled ? '已开启' : '已关闭'}</strong>
                    <small>{floatingShortcutLabel}</small>
                  </article>
                  <article>
                    <span>版本</span>
                    <strong>当前 {currentAppVersion}</strong>
                    <small>最新 {latestVersionLabel}</small>
                  </article>
                  <article>
                    <span>默认目标语言</span>
                    <strong>{defaultTargetLanguageLabel}</strong>
                    <small>设置页保存后同步到翻译页</small>
                  </article>
                  <article>
                    <span>开机自启</span>
                    <strong>{desktopSettings?.launchAtLogin ? '已开启' : '未开启'}</strong>
                    <small>{desktopSettings ? '桌面端设置' : '安装版可用'}</small>
                  </article>
                  <article>
                    <span>关闭隐藏到托盘</span>
                    <strong>{desktopSettings?.hideToTrayOnClose ? '已开启' : '未开启'}</strong>
                    <small>后台保留快捷翻译</small>
                  </article>
                  <article>
                    <span>默认翻译格式</span>
                    <strong>{defaultTranslationFormatLabel}</strong>
                    <small>仅英文目标语言可用</small>
                  </article>
                </section>
              </section>
            ) : null}

            {activeView === 'history' ? (
              <LibraryView
                title="历史记录"
                emptyText="还没有翻译历史"
                entries={historyEntries}
                favoriteIds={favoriteIds}
                selectedIds={selectedHistoryIds}
                onRestore={restoreEntry}
                onDelete={deleteEntry}
                onToggleFavorite={toggleEntryFavorite}
                onToggleSelected={toggleHistorySelection}
                onSelectAll={selectAllHistoryEntries}
                onClearSelection={clearHistorySelection}
                onDeleteSelected={deleteSelectedHistoryEntries}
                onDeleteAll={deleteAllHistoryEntries}
              />
            ) : null}

            {activeView === 'favorites' ? (
              <LibraryView
                title="收藏列表"
                emptyText="收藏译文后会显示在这里"
                entries={favoriteEntries}
                favoriteIds={favoriteIds}
                onRestore={restoreEntry}
                onDelete={deleteEntry}
                onToggleFavorite={toggleEntryFavorite}
              />
            ) : null}

            {activeView === 'settings' ? (
              <section className="settings-view" aria-label="设置">
                <div className="view-heading">
                  <h2>设置</h2>
                  <p>窗口、应用和桌面快捷操作</p>
                </div>

                <section className="settings-section" aria-labelledby="app-update-heading">
                  <h3 id="app-update-heading">应用更新</h3>
                  <div className="update-card">
                    <div className="update-card-main">
                      <span className={`update-status ${updateCheck?.status ?? 'idle'}`}>
                        {updateProgress
                          ? updateProgressLabel
                          : isCheckingUpdate
                          ? '正在检查更新'
                          : updateCheck?.status === 'available'
                            ? '发现新版本'
                            : updateCheck?.status === 'current'
                              ? '已是最新'
                              : updateCheck?.status === 'failed'
                                ? '检查失败'
                                : updateCheck?.status === 'ignored'
                                  ? '已忽略本版本'
                                  : '等待检查'}
                      </span>
                      <strong>
                        {updateCheck?.status === 'available' || updateCheck?.status === 'ignored'
                          ? `版本 ${updateCheck.release.version}`
                          : `当前版本 ${updateCheck?.currentVersion ?? currentAppVersion}`}
                      </strong>
                      <small>
                        {updateProgress
                          ? formatUpdateProgressDetail(updateProgress)
                          : updateCheck?.status === 'available'
                          ? `${updateCheck.platform} · ${updateCheck.release.fileName}${updateCheck.isSnoozed ? ' · 已设置稍后提醒' : ''}`
                          : updateCheck?.status === 'current'
                            ? `${updateCheck.platform} · 当前版本 ${updateCheck.currentVersion}`
                            : updateCheck?.status === 'failed'
                              ? updateCheck.message
                              : updateCheck?.status === 'ignored'
                                ? `${updateCheck.platform} · ${updateCheck.release.version} 已保留为忽略版本`
                                 : '启动时会自动检查，也可手动检查'}
                      </small>
                      {updateProgress ? (
                        <div
                          className={`update-progress ${updateProgress.status}`}
                          role="progressbar"
                          aria-label="更新进度"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={updateProgressPercent}
                        >
                          <span style={{ width: `${updateProgressPercent}%` }} />
                        </div>
                      ) : null}
                    </div>
                    <div className="update-actions">
                      <button className="settings-action" type="button" onClick={runUpdateCheck} disabled={isUpdateBusy}>
                        <RefreshCw size={20} />
                        <span>检查更新</span>
                      </button>
                      <button
                        className="settings-action primary-account-action"
                        type="button"
                        onClick={updateNow}
                        disabled={isUpdateBusy || updateCheck?.status !== 'available'}
                      >
                        <RefreshCw size={20} />
                        <span>{isDesktopReleaseUpdate ? '下载并安装' : '立即更新'}</span>
                      </button>
                      <button
                        className="settings-action"
                        type="button"
                        onClick={ignoreCurrentUpdate}
                        disabled={isUpdateBusy || updateCheck?.status !== 'available'}
                      >
                        <X size={20} />
                        <span>忽略本版本</span>
                      </button>
                      <button
                        className="settings-action"
                        type="button"
                        onClick={remindCurrentUpdateLater}
                        disabled={isUpdateBusy || updateCheck?.status !== 'available'}
                      >
                        <History size={20} />
                        <span>稍后提醒</span>
                      </button>
                    </div>
                  </div>
                </section>

                <section className="settings-section" aria-labelledby="appearance-preferences-heading">
                  <h3 id="appearance-preferences-heading">界面外观</h3>
                  <div className="settings-list">
                    <div className="settings-field appearance-field">
                      <span>界面主题</span>
                      <div className="theme-option-group" role="group" aria-label="主题切换">
                        <button
                          className={`theme-option${theme === 'light' ? ' active' : ''}`}
                          type="button"
                          aria-label="浅色主题"
                          aria-pressed={theme === 'light'}
                          onClick={() => changeTheme('light')}
                        >
                          <Sun size={19} />
                          <span>浅色主题</span>
                        </button>
                        <button
                          className={`theme-option${theme === 'dark' ? ' active' : ''}`}
                          type="button"
                          aria-label="深色主题"
                          aria-pressed={theme === 'dark'}
                          onClick={() => changeTheme('dark')}
                        >
                          <Moon size={19} />
                          <span>深色主题</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="settings-section" aria-labelledby="translation-preferences-heading">
                  <h3 id="translation-preferences-heading">翻译偏好</h3>
                  <div className="settings-list">
                    <label className="settings-field">
                      <span>默认目标语言</span>
                      <select
                        value={defaultTargetLanguage}
                        aria-label="默认目标语言"
                        onChange={(event) => updateDesktopSettings({ defaultTargetLanguage: event.target.value })}
                      >
                        {languageOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="settings-field">
                      <span>翻译格式</span>
                      <select
                        value={translationFormat}
                        aria-label="翻译格式"
                        onChange={(event) =>
                          updateDesktopSettings({ defaultTranslationFormat: normalizeTranslationFormat(event.target.value) })
                        }
                      >
                        {translationFormatOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - {option.description}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                {desktopSettings ? (
                  <section className="settings-section" aria-labelledby="desktop-actions-heading">
                    <h3 id="desktop-actions-heading">桌面快捷</h3>
                    <div className="settings-list">
                      <label className="settings-field">
                        <span>悬浮翻译快捷键</span>
                        <div className="shortcut-setting-control">
                          <select
                            value={floatingShortcutSelectValue}
                            aria-label="悬浮翻译快捷键"
                            onChange={(event) => selectFloatingShortcut(event.target.value)}
                          >
                            {floatingTranslateShortcutOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            <option value="custom">自定义快捷键</option>
                          </select>
                          {shouldShowCustomFloatingShortcutEditor ? (
                            <div className="shortcut-recorder">
                              <button
                                ref={floatingShortcutCaptureButton}
                                className={`shortcut-capture-button${isRecordingFloatingShortcut ? ' recording' : ''}`}
                                type="button"
                                aria-label="录入悬浮翻译快捷键"
                                onClick={() => {
                                  setShowCustomFloatingShortcutEditor(true);
                                  setIsRecordingFloatingShortcut(true);
                                  setFloatingShortcutError('');
                                }}
                                onKeyDown={captureFloatingShortcut}
                              >
                                <KeyRound size={18} />
                                <span>{isRecordingFloatingShortcut ? '请按新的组合键' : customFloatingShortcutLabel}</span>
                              </button>
                              <small className={floatingShortcutError ? 'shortcut-error' : undefined}>
                                {floatingShortcutError || '推荐使用 Ctrl / Alt / Win 与字母、数字或方向键组合'}
                              </small>
                            </div>
                          ) : null}
                        </div>
                      </label>
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={desktopSettings.launchAtLogin}
                          aria-label="开机自启"
                          onChange={(event) => updateDesktopSettings({ launchAtLogin: event.target.checked })}
                        />
                        <span>
                          <strong>开机自启</strong>
                          <small>登录 Windows 后自动启动快捷翻译</small>
                        </span>
                      </label>
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={desktopSettings.hideToTrayOnClose}
                          aria-label="关闭时隐藏到托盘"
                          onChange={(event) => updateDesktopSettings({ hideToTrayOnClose: event.target.checked })}
                        />
                        <span>
                          <strong>关闭时隐藏到托盘</strong>
                          <small>关闭窗口后保持后台快捷翻译可用</small>
                        </span>
                      </label>
                    </div>
                  </section>
                ) : (
                  <p className="empty-state">桌面设置仅在安装版中可用</p>
                )}
              </section>
            ) : null}

            {activeView === 'account' ? (
              <section className="account-view" aria-label="账号">
                <div className="view-heading">
                  <h2>{accountSession ? '账号中心' : accountMode === 'login' ? '账号登录' : '账号注册'}</h2>
                  <p>登录后会同步翻译历史、收藏和本地设置。</p>
                </div>

                {accountSession ? (
                  <section className="account-panel">
                    <div className="account-profile">
                      <span className="account-avatar" aria-hidden="true">
                        <UserRound size={24} />
                      </span>
                      <div>
                        <strong>{accountSession.user.displayName}</strong>
                        <small>{accountSession.user.email}</small>
                      </div>
                    </div>
                    <p className={`sync-status ${syncStatus}`}>{accountMessage || '云端备份已启用，本地数据继续保留。'}</p>
                    <div className="account-actions">
                      <button
                        className="settings-action primary-account-action"
                        type="button"
                        onClick={backupAccountState}
                        disabled={syncStatus === 'syncing'}
                      >
                        <CloudUpload size={20} />
                        <span>手动备份</span>
                      </button>
                      <button className="settings-action danger" type="button" onClick={logoutAccount}>
                        <LogOut size={20} />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </section>
                ) : (
                  <div className="account-auth-layout">
                    <aside className="account-auth-visual" aria-hidden="true">
                      <UserRound size={34} />
                      <strong>云端备份</strong>
                      <span>登录后保留历史、收藏和本地设置，重装后可以恢复。</span>
                    </aside>

                    <section className="account-panel account-auth-panel">
                      <div className="account-tabs" role="tablist" aria-label="账号入口">
                        <button
                          className={accountMode === 'login' ? 'active' : ''}
                          type="button"
                          role="tab"
                          aria-selected={accountMode === 'login'}
                          onClick={() => {
                            setAccountMode('login');
                            setAccountMessage('');
                          }}
                        >
                          <LogIn size={18} />
                          <span>登录</span>
                        </button>
                        <button
                          className={accountMode === 'register' ? 'active' : ''}
                          type="button"
                          role="tab"
                          aria-selected={accountMode === 'register'}
                          onClick={() => {
                            setAccountMode('register');
                            setAccountMessage('');
                          }}
                        >
                          <UserPlus size={18} />
                          <span>注册</span>
                        </button>
                      </div>

                      <label className="account-input">
                        <span>
                          <Mail size={17} />
                          邮箱
                        </span>
                        <input
                          value={accountEmail}
                          type="email"
                          autoComplete="email"
                          aria-label="邮箱"
                          placeholder="name@example.com"
                          onChange={(event) => setAccountEmail(event.target.value)}
                        />
                      </label>
                      <label className="account-input">
                        <span>
                          <KeyRound size={17} />
                          密码
                        </span>
                        <input
                          value={accountPassword}
                          type="password"
                          autoComplete={accountMode === 'login' ? 'current-password' : 'new-password'}
                          aria-label="密码"
                          placeholder="至少 6 位"
                          onChange={(event) => setAccountPassword(event.target.value)}
                        />
                      </label>

                      {accountMode === 'register' ? (
                        <label className="account-input">
                          <span>
                            <UserRound size={17} />
                            昵称
                          </span>
                          <input
                            value={accountDisplayName}
                            autoComplete="name"
                            aria-label="昵称"
                            placeholder="注册时使用"
                            onChange={(event) => setAccountDisplayName(event.target.value)}
                          />
                        </label>
                      ) : null}

                      {accountMode === 'login' ? (
                        <div className="account-option-row">
                          <label className="remember-row">
                            <input
                              type="checkbox"
                              checked={rememberPassword}
                              aria-label="记住密码"
                              onChange={(event) => {
                                setRememberPassword(event.target.checked);
                                if (!event.target.checked) {
                                  clearRememberedAccount();
                                }
                              }}
                            />
                            <span>记住密码</span>
                          </label>
                          <button className="link-button" type="button" onClick={showForgotPasswordMessage}>
                            忘记密码
                          </button>
                        </div>
                      ) : null}

                      <button
                        className="primary-account-action account-submit"
                        type="button"
                        onClick={() => submitAccount(accountMode)}
                      >
                        {accountMode === 'login' ? '登录' : '注册并登录'}
                      </button>

                      {accountMessage ? <p className={`sync-status ${syncStatus}`}>{accountMessage}</p> : null}
                    </section>
                  </div>
                )}
              </section>
            ) : null}
          </section>
        </div>
        {copyNotice ? (
          <div
            className={`copy-toast ${copyNotice.tone}`}
            role={copyNotice.tone === 'success' ? 'status' : 'alert'}
            aria-live={copyNotice.tone === 'success' ? 'polite' : 'assertive'}
          >
            {copyNotice.message}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function LibraryView({
  title,
  emptyText,
  entries,
  favoriteIds,
  selectedIds = [],
  onRestore,
  onDelete,
  onToggleFavorite,
  onToggleSelected,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onDeleteAll
}: {
  title: string;
  emptyText: string;
  entries: TranslationEntry[];
  favoriteIds: string[];
  selectedIds?: string[];
  onRestore: (entry: TranslationEntry) => void;
  onDelete: (entryId: string) => void;
  onToggleFavorite: (entryId: string) => void;
  onToggleSelected?: (entryId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onDeleteSelected?: () => void;
  onDeleteAll?: () => void;
}) {
  const listLabel = title.endsWith('列表') ? title : `${title}列表`;
  const selectionEnabled = Boolean(onToggleSelected);
  const selectedCount = selectedIds.length;
  const allSelected = entries.length > 0 && selectedCount === entries.length;

  return (
    <section className="library-view" aria-label={title}>
      <div className="view-heading">
        <h2>{title}</h2>
        <p>点击条目可回到翻译视图</p>
      </div>

      {entries.length > 0 ? (
        <div className="library-content">
          {selectionEnabled ? (
            <div className="library-toolbar" aria-label="历史记录批量操作">
              <span>已选 {selectedCount} / {entries.length}</span>
              <div>
                <button type="button" onClick={onSelectAll} disabled={allSelected}>
                  全选
                </button>
                <button type="button" onClick={onClearSelection} disabled={selectedCount === 0}>
                  取消选择
                </button>
                <button className="danger" type="button" onClick={onDeleteSelected} disabled={selectedCount === 0}>
                  删除选中
                </button>
                <button className="danger" type="button" onClick={onDeleteAll}>
                  全部删除
                </button>
              </div>
            </div>
          ) : null}
          <div className="entry-list" role="list" aria-label={listLabel}>
            {entries.map((entry) => {
              const isFavorite = favoriteIds.includes(entry.id);
              const isSelected = selectedIds.includes(entry.id);

              return (
                <div className={`entry-row${selectionEnabled ? ' selectable' : ''}`} role="listitem" key={entry.id}>
                  {selectionEnabled ? (
                    <label className="entry-select">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-label={`选择历史记录 ${entry.sourceText}`}
                        onChange={() => onToggleSelected?.(entry.id)}
                      />
                    </label>
                  ) : null}
                  <button className="entry-card" type="button" onClick={() => onRestore(entry)}>
                    <span className="entry-time">{entry.createdAt}</span>
                    <strong>{entry.sourceText}</strong>
                    <span>{entry.translatedText}</span>
                    <small>
                      {entry.targetLabel}
                      {entry.translationFormat !== 'plain' ? ` · ${entry.formatLabel}` : ''}
                      {isFavorite ? ' · 已收藏' : ''}
                    </small>
                  </button>
                  <div className="entry-actions" aria-label="记录操作">
                    <button
                      className={`entry-action-button${isFavorite ? ' active' : ''}`}
                      type="button"
                      onClick={() => onToggleFavorite(entry.id)}
                      aria-label={isFavorite ? '取消收藏' : '收藏译文'}
                    >
                      {isFavorite ? <StarOff size={17} /> : <Star size={17} />}
                      <span>{isFavorite ? '取消收藏' : '收藏'}</span>
                    </button>
                    <button className="entry-action-button danger" type="button" onClick={() => onDelete(entry.id)} aria-label="删除记录">
                      <Trash2 size={17} />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="empty-state">{emptyText}</p>
      )}
    </section>
  );
}
