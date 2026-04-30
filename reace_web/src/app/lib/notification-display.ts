export type NotificationTabId = "all" | "points" | "announcements" | "follows";

export type NotificationCountKey = NotificationTabId | "posts";

export type NotificationCounts = Partial<Record<NotificationCountKey, number>>;

export const notificationFilterTabs: Array<{
  id: NotificationTabId;
  label: string;
  countKey: NotificationCountKey;
}> = [
  { id: "all", label: "全部通知", countKey: "all" },
  { id: "points", label: "积分通知", countKey: "points" },
  { id: "announcements", label: "网站公告", countKey: "announcements" },
  { id: "follows", label: "关注/等级", countKey: "follows" },
];

const visibleNotificationTabIds = new Set(notificationFilterTabs.map((tab) => tab.id));

export function normalizeNotificationTab(tab: string | null | undefined): NotificationTabId {
  return visibleNotificationTabIds.has(tab as NotificationTabId) ? (tab as NotificationTabId) : "all";
}

export function getNotificationTabCount(
  tab: Pick<(typeof notificationFilterTabs)[number], "countKey">,
  counts?: NotificationCounts,
) {
  return counts?.[tab.countKey] ?? 0;
}

export function shouldRenderNotificationCategoryOverview() {
  return false;
}
