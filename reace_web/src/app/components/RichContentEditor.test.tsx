import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { RichContentEditor } from "./RichContentEditor";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RichContentEditor", () => {
  test("keeps existing content after switching preview back to edit", () => {
    const onChange = vi.fn();

    const { container } = render(
      <RichContentEditor value="<p>保留内容</p>" onChange={onChange} />
    );

    const getEditor = () => container.querySelector("[contenteditable='true']") as HTMLDivElement | null;

    expect(getEditor()?.innerHTML).toContain("保留内容");

    fireEvent.click(screen.getByRole("button", { name: "预览" }));
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    expect(getEditor()?.innerHTML).toContain("保留内容");
  });
});
