import packageJson from '../../package.json';
import { defaultCloudBaseUrl } from './cloudClient';

export type UpdatePlatform = 'windows' | 'android' | 'macos' | 'ios';
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'current' | 'failed' | 'ignored';

export type DownloadRelease = {
  version: string;
  platform: UpdatePlatform;
  fileName: string;
  url: string;
  size?: number;
  sha512?: string;
  releaseDate?: string;
  releaseNotes?: string;
};

export type UpdateInstallProgress = {
  status: 'checking' | 'downloading' | 'downloaded' | 'error';
  percent: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
};

export type UpdateState = {
  ignoredVersion?: string;
  remindLaterUntil?: number;
};

export type UpdateCheckResult =
  | { status: 'available'; platform: UpdatePlatform; currentVersion: string; release: DownloadRelease; isSnoozed: boolean }
  | { status: 'current'; platform: UpdatePlatform; currentVersion: string; latestVersion?: string }
  | { status: 'ignored'; platform: UpdatePlatform; currentVersion: string; release: DownloadRelease }
  | { status: 'failed'; platform: UpdatePlatform; currentVersion: string; message: string };

const updateStateStorageKey = 'quick-translate-update-state';
const remindLaterMs = 24 * 60 * 60 * 1000;

type CapacitorGlobal = {
  getPlatform?: () => string;
  Plugins?: {
    UpdateInstaller?: {
      addListener?: (
        eventName: 'downloadProgress',
        callback: (progress: unknown) => void
      ) => Promise<{ remove: () => Promise<void> | void }>;
      installUpdateApk?: (input: { url: string; sha512?: string }) => Promise<unknown>;
    };
  };
};

export const currentAppVersion = packageJson.version;

export function loadUpdateState(): UpdateState {
  try {
    const value = localStorage.getItem(updateStateStorageKey);
    const parsedValue: unknown = value ? JSON.parse(value) : null;
    if (!parsedValue || typeof parsedValue !== 'object') {
      return {};
    }
    const record = parsedValue as Partial<UpdateState>;
    return {
      ignoredVersion: typeof record.ignoredVersion === 'string' ? record.ignoredVersion : undefined,
      remindLaterUntil: typeof record.remindLaterUntil === 'number' ? record.remindLaterUntil : undefined
    };
  } catch {
    return {};
  }
}

export function saveUpdateState(state: UpdateState) {
  localStorage.setItem(updateStateStorageKey, JSON.stringify(state));
}

export function ignoreUpdateVersion(version: string) {
  const state = loadUpdateState();
  const nextState = { ...state, ignoredVersion: version, remindLaterUntil: undefined };
  saveUpdateState(nextState);
  return nextState;
}

export function remindLater() {
  const state = loadUpdateState();
  const nextState = { ...state, remindLaterUntil: Date.now() + remindLaterMs };
  saveUpdateState(nextState);
  return nextState;
}

export function detectUpdatePlatform(): UpdatePlatform {
  const capacitorPlatform = getCapacitor()?.getPlatform?.();
  if (capacitorPlatform === 'android' || capacitorPlatform === 'ios') {
    return capacitorPlatform;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('android')) {
    return 'android';
  }
  if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    return 'ios';
  }
  if (userAgent.includes('mac os') || userAgent.includes('macintosh')) {
    return 'macos';
  }
  return 'windows';
}

export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const platform = detectUpdatePlatform();
  const currentVersion = currentAppVersion;

  try {
    const response = await fetch(`${defaultCloudBaseUrl}/api/downloads`);
    const payload = (await response.json().catch(() => ({}))) as { releases?: unknown[]; latestVersion?: unknown };
    if (!response.ok) {
      throw new Error(`检查更新失败，状态码 ${response.status}`);
    }

    const releases = normalizeReleases(payload.releases);
    const release = releases
      .filter((item) => item.platform === platform && compareVersions(item.version, currentVersion) > 0)
      .sort((left, right) => compareVersions(right.version, left.version))[0];

    if (!release) {
      return {
        status: 'current',
        platform,
        currentVersion,
        latestVersion: typeof payload.latestVersion === 'string' ? payload.latestVersion : undefined
      };
    }

    const storedState = loadUpdateState();
    if (storedState.ignoredVersion === release.version) {
      return { status: 'ignored', platform, currentVersion, release };
    }

    return {
      status: 'available',
      platform,
      currentVersion,
      release,
      isSnoozed: Boolean(storedState.remindLaterUntil && storedState.remindLaterUntil > Date.now())
    };
  } catch (error) {
    return {
      status: 'failed',
      platform,
      currentVersion,
      message: error instanceof Error ? error.message : '检查更新失败'
    };
  }
}

export async function installOrOpenUpdate(release: DownloadRelease, onProgress?: (progress: UpdateInstallProgress) => void) {
  if (release.platform === 'android') {
    const updateInstaller = getCapacitor()?.Plugins?.UpdateInstaller;
    const installUpdateApk = updateInstaller?.installUpdateApk;
    if (installUpdateApk) {
      const listener = await updateInstaller?.addListener?.('downloadProgress', (progress) => {
        onProgress?.(normalizeInstallProgress(progress));
      });

      try {
        onProgress?.({
          status: 'downloading',
          percent: 0,
          transferred: 0,
          total: release.size,
          message: '正在下载更新'
        });
        await installUpdateApk({ url: release.url, sha512: release.sha512 });
        onProgress?.({
          status: 'downloaded',
          percent: 100,
          transferred: release.size,
          total: release.size,
          message: '更新包下载完成，正在打开安装界面'
        });
        return '已打开系统安装确认页';
      } finally {
        await listener?.remove();
      }
    }
  }

  const checkForUpdates = window.quickTranslate?.checkForUpdates;
  if ((release.platform === 'windows' || release.platform === 'macos') && checkForUpdates) {
    const result = await checkForUpdates();
    if (result.status === 'error') {
      throw new Error(result.message || '应用内更新启动失败');
    }
    return result.message || '已开始检查并下载更新';
  }

  window.open(release.url, '_blank', 'noopener,noreferrer');
  return '已打开更新下载页';
}

export function compareVersions(left: string, right: string) {
  const leftParts = toVersionParts(left);
  const rightParts = toVersionParts(right);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function normalizeReleases(value: unknown): DownloadRelease[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      version: stringOrEmpty(item.version),
      platform: normalizePlatform(item.platform || item.os || item.fileName),
      fileName: stringOrEmpty(item.fileName),
      url: stringOrEmpty(item.url),
      size: typeof item.size === 'number' ? item.size : undefined,
      sha512: stringOrEmpty(item.sha512) || undefined,
      releaseDate: stringOrEmpty(item.releaseDate) || undefined,
      releaseNotes:
        stringOrEmpty(item.releaseNotes) || stringOrEmpty(item.changelog) || stringOrEmpty(item.notes) || undefined
    }))
    .filter((item) => item.version && item.url && item.fileName);
}

function normalizePlatform(value: unknown): UpdatePlatform {
  const normalized = stringOrEmpty(value).toLowerCase();
  if (normalized.includes('android') || normalized.endsWith('.apk') || normalized.endsWith('.aab')) {
    return 'android';
  }
  if (normalized.includes('ios') || normalized.endsWith('.ipa')) {
    return 'ios';
  }
  if (normalized.includes('mac') || normalized.includes('darwin') || normalized.endsWith('.dmg') || normalized.endsWith('.pkg')) {
    return 'macos';
  }
  return 'windows';
}

function toVersionParts(value: string) {
  return value
    .replace(/^[^\d]*/, '')
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function stringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeInstallProgress(value: unknown): UpdateInstallProgress {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const status = isUpdateProgressStatus(record.status) ? record.status : 'downloading';
  const percent = typeof record.percent === 'number' && Number.isFinite(record.percent) ? record.percent : 0;
  return {
    status,
    percent: Math.min(100, Math.max(0, percent)),
    transferred: numberOrUndefined(record.transferred),
    total: numberOrUndefined(record.total),
    bytesPerSecond: numberOrUndefined(record.bytesPerSecond),
    message: stringOrEmpty(record.message) || undefined
  };
}

function isUpdateProgressStatus(value: unknown): value is UpdateInstallProgress['status'] {
  return value === 'checking' || value === 'downloading' || value === 'downloaded' || value === 'error';
}

function numberOrUndefined(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getCapacitor() {
  return (globalThis as typeof globalThis & { Capacitor?: CapacitorGlobal }).Capacitor;
}
