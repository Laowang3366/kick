import { describe, expect, it } from "vitest";
import { publicNavItems, resolveActiveNavItem } from "./site-navigation";

describe("resolveActiveNavItem", () => {
  it("keeps tutorial center directly after home in the public navigation", () => {
    expect(publicNavItems.map((item) => item.key)).toEqual([
      "home",
      "tutorials",
      "practice",
      "templates",
      "mall",
      "tools",
    ]);
  });

  it("resolves nested template pages to the template nav item", () => {
    expect(resolveActiveNavItem("/templates/records")?.name).toBe("模板中心");
  });

  it("resolves tutorial pages to the tutorial nav item", () => {
    expect(resolveActiveNavItem("/tutorials")?.name).toBe("教程中心");
  });

  it("resolves nested mall pages to the points mall nav item", () => {
    expect(resolveActiveNavItem("/mall/redemptions")?.name).toBe("积分经验中心");
  });

  it("resolves the root page to the home nav item", () => {
    expect(resolveActiveNavItem("/")?.name).toBe("首页");
  });
});
