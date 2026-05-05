import { describe, expect, it } from "vitest";
import { answerRangeButtonClassName, formDialogContentClassName } from "./shared";

describe("admin shared controls", () => {
  it("uses a stronger visual style for answer range picking", () => {
    const className = answerRangeButtonClassName();

    expect(className).toContain("bg-[#1677ff]");
    expect(className).toContain("text-white");
    expect(className).toContain("h-9");
    expect(className).toContain("disabled:cursor-not-allowed");
  });

  it("forces admin form dialogs to use a scrollable flex layout", () => {
    const className = formDialogContentClassName("w-[min(1120px,calc(100vw-2rem))]");

    expect(className).toContain("!flex");
    expect(className).toContain("!flex-col");
    expect(className).toContain("!gap-0");
    expect(className).toContain("max-h-[92vh]");
    expect(className).toContain("w-[min(1120px,calc(100vw-2rem))]");
  });
});
