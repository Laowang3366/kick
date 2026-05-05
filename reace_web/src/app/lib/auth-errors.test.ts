import { describe, expect, it } from "vitest";
import {
  isLoginRequiredError,
  isLoginRequiredResponse,
} from "./auth-errors";

describe("auth error helpers", () => {
  it("treats 401 responses as login required", () => {
    expect(isLoginRequiredResponse(401, "请求失败(401)", null)).toBe(true);
  });

  it("treats 403 responses with 未登录 message as login required", () => {
    expect(isLoginRequiredResponse(403, "未登录", null)).toBe(true);
    expect(isLoginRequiredError({ status: 403, data: { message: "请先登录" } })).toBe(true);
  });

  it("keeps real permission denials separate from login prompts", () => {
    expect(isLoginRequiredResponse(403, "当前账号无权限执行该操作", null)).toBe(false);
  });
});
