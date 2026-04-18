import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ExcelWorkbookPreview } from "./ExcelWorkbookPreview";
import type { ExcelWorkbookSnapshot } from "../lib/excel";

const workbook: ExcelWorkbookSnapshot = {
  sheets: [
    {
      name: "Sheet1",
      rowCount: 3,
      columnCount: 28,
      cells: {
        A1: { value: "标题", display: "标题" },
        B2: { value: 42, display: "42" },
        AA1: { value: "AA列", display: "AA列" },
        C3: { value: null, formula: "SUM(A1:A2)", display: "42" },
      },
    },
    {
      name: "Sheet2",
      rowCount: 20,
      columnCount: 30,
      cells: {
        A1: { value: "第二张", display: "第二张" },
      },
    },
  ],
};

describe("ExcelWorkbookPreview", () => {
  test("renders snapshot cell text, formula marker, focus state, and sheet tabs", () => {
    const onSelectedSheetNameChange = vi.fn();
    const { container, rerender } = render(
      <ExcelWorkbookPreview
        workbook={workbook}
        selectedSheetName="Sheet1"
        onSelectedSheetNameChange={onSelectedSheetNameChange}
        focusRange={{ sheetName: "Sheet1", startRow: 2, startCol: 2, endRow: 2, endCol: 2 }}
      />,
    );

    expect(screen.getByRole("button", { name: "Sheet1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sheet2" })).toBeInTheDocument();

    expect(screen.getByText("标题")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("AA列")).toBeInTheDocument();

    expect(screen.getByRole("columnheader", { name: "AA" })).toBeInTheDocument();

    const formulaCell = container.querySelector("[data-cell-ref='C3']");
    expect(formulaCell).toHaveTextContent("fx");
    expect(formulaCell).toHaveTextContent("=SUM(A1:A2)");

    const focusedCell = container.querySelector("[data-cell-ref='B2']");
    expect(focusedCell).toHaveAttribute("data-focused", "true");

    fireEvent.click(screen.getByRole("button", { name: "Sheet2" }));
    expect(onSelectedSheetNameChange).toHaveBeenCalledWith("Sheet2");

    rerender(
      <ExcelWorkbookPreview
        workbook={workbook}
        selectedSheetName="Sheet2"
        onSelectedSheetNameChange={onSelectedSheetNameChange}
      />,
    );

    expect(screen.getByText("第二张")).toBeInTheDocument();
    expect(screen.queryByText("标题")).not.toBeInTheDocument();
  });

  test("ignores focus ranges from other sheets when sizing the current sheet", () => {
    const limitedWorkbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Sheet1",
          rowCount: 12,
          columnCount: 8,
          cells: {
            A1: { value: "主表", display: "主表" },
          },
        },
        {
          name: "Sheet2",
          rowCount: 20,
          columnCount: 30,
          cells: {
            A1: { value: "第二张", display: "第二张" },
          },
        },
      ],
    };

    const { container } = render(
      <ExcelWorkbookPreview
        workbook={limitedWorkbook}
        selectedSheetName="Sheet1"
        onSelectedSheetNameChange={vi.fn()}
        focusRange={{ sheetName: "Sheet2", startRow: 10, startCol: 10, endRow: 20, endCol: 28 }}
      />,
    );

    expect(container.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(container.querySelectorAll("thead th")).toHaveLength(9);
    expect(container.querySelector("[data-cell-ref='I1']")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "I" })).not.toBeInTheDocument();
    expect(container.querySelector("[data-cell-ref='A1']")).not.toHaveAttribute("data-focused", "true");
  });
});
