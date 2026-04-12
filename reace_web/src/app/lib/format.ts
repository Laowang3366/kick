export function formatRelativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("zh-CN").format(value || 0);
}

export function formatDuration(seconds?: number | null) {
  const safe = Math.max(0, seconds || 0);
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${remain.toString().padStart(2, "0")}`;
}

export function formatLevelName(level?: number | null, customName?: string | null) {
  const normalized = Number(level || 1);
  const resolvedName = customName?.trim();
  return resolvedName || `等级 ${normalized}`;
}

export function formatLevelBadge(level?: number | null, customName?: string | null) {
  const normalized = Number(level || 1);
  const resolvedName = customName?.trim();
  return resolvedName ? `Lv.${normalized} ${resolvedName}` : `Lv.${normalized}`;
}
