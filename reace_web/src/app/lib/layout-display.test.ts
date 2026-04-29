import { describe, expect, it } from "vitest";
import {
  getCompactHeaderAccountButtonClassName,
  shouldRenderCompactHeaderAccountAction,
} from "./layout-display";

describe("layout display helpers", () => {
  it("keeps the account entry visible on mobile lite headers", () => {
    expect(shouldRenderCompactHeaderAccountAction({ onlineLiteMode: true, isMobile: true })).toBe(true);
  });

  it("keeps compact account buttons from shrinking out of the mobile header", () => {
    expect(getCompactHeaderAccountButtonClassName()).toContain("shrink-0");
  });
});
