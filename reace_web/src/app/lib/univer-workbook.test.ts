import { describe, expect, it } from "vitest";
import { extractRangeAnswerSnapshot } from "./excel";
import { univerDataToWorkbookSnapshot } from "./univer-workbook";

describe("univerDataToWorkbookSnapshot", () => {
  it("reconstructs fill-down formulas stored as shared formula ids", () => {
    const snapshot = univerDataToWorkbookSnapshot({
      sheetOrder: ["sheet-1"],
      sheets: {
        "sheet-1": {
          name: "Sheet1",
          rowCount: 20,
          columnCount: 10,
          cellData: {
            1: {
              1: { v: 4, f: "=A2*2", si: "formula-fill-1" },
            },
            2: {
              1: { v: 6, si: "formula-fill-1" },
            },
            3: {
              1: { v: 8, si: "formula-fill-1" },
            },
          },
        },
      },
    } as any, {
      moveFormulaRefOffset: (formula, colOffset, rowOffset) => {
        expect(colOffset).toBe(0);
        if (rowOffset === 0) return formula;
        return `=A${2 + rowOffset}*2`;
      },
    });

    const sheet = snapshot.sheets[0];
    expect(sheet.cells.B2.formula).toBe("A2*2");
    expect(sheet.cells.B3.formula).toBe("A3*2");
    expect(sheet.cells.B4.formula).toBe("A4*2");
    expect(extractRangeAnswerSnapshot(snapshot, "Sheet1", "B2:B4").formulas).toEqual([
      ["A2*2"],
      ["A3*2"],
      ["A4*2"],
    ]);
  });
});
