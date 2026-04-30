import { describe, expect, it } from "vitest";
import {
  normalizeNotificationTab,
  notificationFilterTabs,
  shouldRenderNotificationCategoryOverview,
} from "./notification-display";

describe("notification display helpers", () => {
  it("does not render the large category overview before the notification list", () => {
    expect(shouldRenderNotificationCategoryOverview()).toBe(false);
  });

  it("removes the post interaction category from notification filters", () => {
    expect(notificationFilterTabs.map((tab) => tab.id)).toEqual([
      "all",
      "points",
      "announcements",
      "follows",
    ]);
    expect(notificationFilterTabs.map((tab) => tab.label)).not.toContain("帖子互动");
  });

  it("falls back to all notifications for removed or unknown tabs", () => {
    expect(normalizeNotificationTab("posts")).toBe("all");
    expect(normalizeNotificationTab("unknown")).toBe("all");
    expect(normalizeNotificationTab("points")).toBe("points");
  });
});
