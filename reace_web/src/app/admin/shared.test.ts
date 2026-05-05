import { describe, expect, it } from "vitest";
import { answerRangeButtonClassName } from "./shared";

describe("admin shared controls", () => {
  it("uses a stronger visual style for answer range picking", () => {
    const className = answerRangeButtonClassName();

    expect(className).toContain("bg-[#1677ff]");
    expect(className).toContain("text-white");
    expect(className).toContain("h-9");
    expect(className).toContain("disabled:cursor-not-allowed");
  });
});
