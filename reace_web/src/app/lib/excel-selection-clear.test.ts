import { describe, expect, it } from "vitest";
import { clearWorkbookRange, type ExcelWorkbookSnapshot } from "./excel";

describe("clearWorkbookRange", () => {
  it("removes every cell inside the selected range and leaves outside cells intact", () => {
    const workbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Sheet1",
          cells: {
            A1: { value: "keep" },
            B2: { value: "remove" },
            C2: { formula: "SUM(A1:A3)", value: 6 },
            B3: { value: "remove too" },
            D4: { value: "keep too" },
          },
        },
      ],
    };

    const next = clearWorkbookRange(workbook, {
      sheetName: "Sheet1",
      startRow: 2,
      startCol: 2,
      endRow: 3,
      endCol: 3,
    });

    expect(next.sheets[0].cells).toEqual({
      A1: { value: "keep", formula: null, display: null },
      D4: { value: "keep too", formula: null, display: null },
    });
    expect(workbook.sheets[0].cells.B2).toEqual({ value: "remove" });
  });
});
