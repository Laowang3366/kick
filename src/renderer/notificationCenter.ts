import { defaultCloudBaseUrl } from './cloudClient';
import { currentAppVersion, detectUpdatePlatform, type UpdatePlatform } from './updateCenter';

export type ClientNotificationSeverity = 'info' | 'update' | 'warning';

export type ClientNotification = {
  id: string;
  title: string;
  body: string;
  severity: ClientNotificationSeverity;
  platforms: UpdatePlatform[];
  dismissible: boolean;
  actionLabel?: string;
  actionUrl?: string;
  startsAt?: string;
  endsAt?: string;
  updatedAt?: string;
};

type FetchNotificationsOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  platform?: UpdatePlatform;
  version?: string;
};

const dismissedNotificationStorageKey = 'quick-translate-dismissed-notifications';
const notificationSeverityLabels: Record<ClientNotificationSeverity, string> = {
  info: '通知',
  update: '更新公告',
  warning: '重要提醒'
};

export async function fetchClientNotifications(options: FetchNotificationsOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultCloudBaseUrl);
  const fetcher = options.fetcher ?? fetch;
  const platform = options.platform ?? detectUpdatePlatform();
  const version = options.version ?? currentAppVersion;
  const params = new URLSearchParams({ platform, version });
  const response = await fetcher(`${baseUrl}/api/notifications?${params.toString()}`);
  const payload = (await response.json().catch(() => ({}))) as { notifications?: unknown[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `通知读取失败，状态码 ${response.status}`);
  }

  return normalizeNotifications(payload.notifications);
}

export function loadDismissedNotificationIds() {
  try {
    const parsedValue: unknown = JSON.parse(localStorage.getItem(dismissedNotificationStorageKey) || '[]');
    return Array.isArray(parsedValue) ? parsedValue.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function saveDismissedNotificationIds(ids: string[]) {
  localStorage.setItem(dismissedNotificationStorageKey, JSON.stringify([...new Set(ids.filter(Boolean))]));
}

export function markNotificationDismissed(notificationId: string) {
  const ids = loadDismissedNotificationIds();
  const nextIds = [...new Set([...ids, notificationId].filter(Boolean))];
  saveDismissedNotificationIds(nextIds);
  return nextIds;
}

export function getNotificationSeverityLabel(severity: ClientNotificationSeverity) {
  return notificationSeverityLabels[severity] || notificationSeverityLabels.info;
}

function normalizeNotifications(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map(normalizeNotification)
        .filter((notification): notification is ClientNotification => Boolean(notification))
    : [];
}

function normalizeNotification(value: Record<string, unknown>): ClientNotification | null {
  const id = stringOrEmpty(value.id);
  const title = stringOrEmpty(value.title) || '系统通知';
  const body = stringOrEmpty(value.body);
  if (!id || !body) {
    return null;
  }

  return {
    id,
    title,
    body,
    severity: normalizeSeverity(value.severity),
    platforms: normalizePlatforms(value.platforms),
    dismissible: typeof value.dismissible === 'boolean' ? value.dismissible : true,
    actionLabel: stringOrEmpty(value.actionLabel) || undefined,
    actionUrl: stringOrEmpty(value.actionUrl) || undefined,
    startsAt: stringOrEmpty(value.startsAt) || undefined,
    endsAt: stringOrEmpty(value.endsAt) || undefined,
    updatedAt: stringOrEmpty(value.updatedAt) || undefined
  };
}

function normalizeSeverity(value: unknown): ClientNotificationSeverity {
  const normalized = stringOrEmpty(value).toLowerCase();
  return normalized === 'update' || normalized === 'warning' ? normalized : 'info';
}

function normalizePlatforms(value: unknown): UpdatePlatform[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizePlatform).filter((platform): platform is UpdatePlatform => Boolean(platform));
}

function normalizePlatform(value: unknown): UpdatePlatform | '' {
  const normalized = stringOrEmpty(value).toLowerCase();
  if (normalized === 'windows' || normalized === 'android' || normalized === 'macos' || normalized === 'ios') {
    return normalized;
  }
  return '';
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function stringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
