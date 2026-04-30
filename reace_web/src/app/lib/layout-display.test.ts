import { describe, expect, it } from "vitest";
import {
  getCompactHeaderAccountButtonClassName,
  getCompactHeaderNotificationButtonClassName,
  shouldRenderCompactHeaderAccountAction,
  shouldRenderCompactHeaderNotificationAction,
} from "./layout-display";

describe("layout display helpers", () => {
  it("keeps the account entry visible on mobile lite headers", () => {
    expect(shouldRenderCompactHeaderAccountAction({ onlineLiteMode: true, isMobile: true })).toBe(true);
  });

  it("keeps compact account buttons from shrinking out of the mobile header", () => {
    expect(getCompactHeaderAccountButtonClassName()).toContain("shrink-0");
  });

  it("keeps the notification entry visible on mobile lite headers", () => {
    expect(shouldRenderCompactHeaderNotificationAction({ onlineLiteMode: true, isMobile: true })).toBe(true);
    expect(shouldRenderCompactHeaderNotificationAction({ onlineLiteMode: true, isMobile: false })).toBe(false);
    expect(shouldRenderCompactHeaderNotificationAction({ onlineLiteMode: false, isMobile: true })).toBe(false);
  });

  it("keeps compact notification buttons visible on dark mobile headers", () => {
    const className = getCompactHeaderNotificationButtonClassName();
    expect(className).toContain("shrink-0");
    expect(className).toContain("text-white");
    expect(className).toContain("border-white");
  });
});
