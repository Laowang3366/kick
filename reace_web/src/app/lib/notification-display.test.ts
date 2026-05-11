import { describe, expect, it } from "vitest";
import {
  getNotificationTabCount,
  getVisibleNotificationCount,
  getVisibleNotificationTypeFilter,
  normalizeNotificationTab,
  notificationFilterTabs,
  shouldRenderNotificationItem,
  shouldRenderNotificationCategoryOverview,
} from "./notification-display";

describe("notification display helpers", () => {
  it("does not render the large category overview before the notification list", () => {
    expect(shouldRenderNotificationCategoryOverview()).toBe(false);
  });

  it("removes hidden categories from notification filters", () => {
    expect(notificationFilterTabs.map((tab) => tab.id)).toEqual([
      "all",
      "points",
      "announcements",
    ]);
    expect(notificationFilterTabs.map((tab) => tab.label)).not.toContain("帖子互动");
    expect(notificationFilterTabs.map((tab) => tab.label)).not.toContain("关注/等级");
  });

  it("falls back to all notifications for removed or unknown tabs", () => {
    expect(normalizeNotificationTab("posts")).toBe("all");
    expect(normalizeNotificationTab("follows")).toBe("all");
    expect(normalizeNotificationTab("unknown")).toBe("all");
    expect(normalizeNotificationTab("points")).toBe("points");
  });

  it("hides follow and level notifications from visible notification surfaces", () => {
    expect(shouldRenderNotificationItem("follow")).toBe(false);
    expect(shouldRenderNotificationItem("level_up")).toBe(false);
    expect(shouldRenderNotificationItem("site_notification")).toBe(true);
    expect(getVisibleNotificationTypeFilter()).not.toContain("follow");
    expect(getVisibleNotificationTypeFilter()).not.toContain("level_up");
  });

  it("subtracts hidden follow and level counts from the all tab count", () => {
    expect(getVisibleNotificationCount({ all: 5, follows: 2 })).toBe(3);
    expect(getNotificationTabCount({ countKey: "all" }, { all: 2, follows: 2 })).toBe(0);
    expect(getNotificationTabCount({ countKey: "points" }, { points: 4 })).toBe(4);
  });
});
