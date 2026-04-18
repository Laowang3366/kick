import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { AdminFormField } from "./shared";

describe("AdminFormField", () => {
  test("uses a non-label wrapper for rich editors when asLabel is false", () => {
    const fileInputClick = vi.fn();

    render(
      <AdminFormField label="正文内容" asLabel={false}>
        <div data-testid="editor" contentEditable>
          正文
        </div>
        <input
          type="file"
          aria-label="上传图片"
          onClick={fileInputClick}
          className="hidden"
        />
      </AdminFormField>
    );

    const editor = screen.getByTestId("editor");
    const wrapper = editor.parentElement;

    expect(wrapper?.tagName).toBe("DIV");

    fireEvent.click(editor);

    expect(fileInputClick).not.toHaveBeenCalled();
  });
});
