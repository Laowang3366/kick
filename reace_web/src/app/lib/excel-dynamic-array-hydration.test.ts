import { describe, expect, it } from "vitest";
import { buildWorkbookWithAnswerSnapshot, type ExcelWorkbookSnapshot } from "./excel";

describe("buildWorkbookWithAnswerSnapshot dynamic arrays", () => {
  it("keeps only the anchor formula when hydrating a dynamic array spill range", () => {
    const templateWorkbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Sheet1",
          rowCount: 20,
          columnCount: 8,
          cells: {
            A1: { value: "No." },
            A3: { value: "stale spill value" },
          },
        },
      ],
    };

    const next = buildWorkbookWithAnswerSnapshot(
      templateWorkbook,
      "Sheet1",
      "A2:A5",
      JSON.stringify({
        values: [[1], [2], [3], [4]],
        formulas: [["SEQUENCE(4)"], [""], [""], [""]],
      }),
      {
        dynamicArrayRules: [
          {
            sheet: "Sheet1",
            anchorCell: "A2",
            spillRange: "A2:A5",
          },
        ],
      },
    );

    expect(next.sheets[0].cells.A2).toMatchObject({
      formula: "SEQUENCE(4)",
      display: "=SEQUENCE(4)",
    });
    expect(next.sheets[0].cells.A3).toBeUndefined();
    expect(next.sheets[0].cells.A4).toBeUndefined();
    expect(next.sheets[0].cells.A5).toBeUndefined();
    expect(next.sheets[0].cells.A1).toMatchObject({ value: "No." });
  });

  it("clears stale spill child values even before an answer snapshot exists", () => {
    const templateWorkbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Sheet1",
          cells: {
            A2: { formula: "SEQUENCE(4)", value: 1, display: "1" },
            A3: { value: 2, display: "2" },
            A4: { value: 3, display: "3" },
            A5: { value: 4, display: "4" },
          },
        },
      ],
    };

    const next = buildWorkbookWithAnswerSnapshot(templateWorkbook, "Sheet1", "A2:A5", "", {
      dynamicArrayRules: [
        {
          sheet: "Sheet1",
          anchorCell: "A2",
          spillRange: "A2:A5",
        },
      ],
    });

    expect(next.sheets[0].cells.A2).toMatchObject({ formula: "SEQUENCE(4)" });
    expect(next.sheets[0].cells.A3).toBeUndefined();
    expect(next.sheets[0].cells.A4).toBeUndefined();
    expect(next.sheets[0].cells.A5).toBeUndefined();
  });
});
