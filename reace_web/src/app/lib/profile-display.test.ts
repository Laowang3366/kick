import { describe, expect, it } from "vitest";
import {
  getProfileEntryCards,
  getProfileIdentityLayoutClassName,
  getProfileLevelPlacement,
  shouldRenderProfileAccountCard,
  shouldRenderProfileHeaderDescription,
} from "./profile-display";

describe("profile display rules", () => {
  it("removes the standalone account management card and header description", () => {
    expect(shouldRenderProfileAccountCard()).toBe(false);
    expect(shouldRenderProfileHeaderDescription()).toBe(false);
  });

  it("keeps the nickname beside the avatar and places level below nickname", () => {
    expect(getProfileIdentityLayoutClassName()).toContain("flex-row");
    expect(getProfileLevelPlacement()).toBe("below-name");
  });

  it("collapses details and growth into two standalone entry cards", () => {
    expect(getProfileEntryCards().map((item) => item.key)).toEqual(["details", "growth"]);
    expect(getProfileEntryCards().find((item) => item.key === "details")?.title).toBe("查看个人资料");
    expect(getProfileEntryCards().find((item) => item.key === "growth")?.title).toBe("成长进度");
  });
});
