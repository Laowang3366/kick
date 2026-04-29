import { describe, expect, it } from "vitest";
import { detectFormulaAnswerRegion, type ExcelWorkbookSnapshot } from "./excel";

describe("detectFormulaAnswerRegion", () => {
  it("selects the largest contiguous formula range for simple answer detection", () => {
    const workbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Sheet1",
          cells: {
            B2: { formula: "SUM(A2:A4)", value: 6 },
            C2: { formula: "AVERAGE(A2:A4)", value: 2 },
            B3: { formula: "MAX(A2:A4)", value: 3 },
            C3: { formula: "MIN(A2:A4)", value: 1 },
            H1: { formula: "TODAY()", value: "2026/4/29" },
          },
        },
      ],
    };

    expect(detectFormulaAnswerRegion(workbook)).toMatchObject({
      sheetName: "Sheet1",
      rangeRef: "B2:C3",
      anchorCell: "B2",
      dynamicSpillRange: "B2:C3",
      formulaCount: 4,
    });
  });

  it("uses the largest formula candidate across worksheets", () => {
    const workbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Inputs",
          cells: {
            A1: { formula: "SUM(B1:B3)", value: 9 },
          },
        },
        {
          name: "Answer",
          cells: {
            D5: { formula: "FILTER(A1:B10,A1:A10>0)", value: "A" },
            E5: { formula: "FILTER(A1:B10,A1:A10>0)", value: "B" },
            D6: { formula: "FILTER(A1:B10,A1:A10>0)", value: "C" },
            E6: { formula: "FILTER(A1:B10,A1:A10>0)", value: "D" },
          },
        },
      ],
    };

    expect(detectFormulaAnswerRegion(workbook)).toMatchObject({
      sheetName: "Answer",
      rangeRef: "D5:E6",
      anchorCell: "D5",
    });
  });

  it("expands a single formula anchor to adjacent spill values for dynamic arrays", () => {
    const workbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Dynamic",
          cells: {
            F2: { formula: "UNIQUE(A2:B20)", value: "East" },
            G2: { value: 12 },
            F3: { value: "West" },
            G3: { value: 8 },
            F4: { value: "North" },
            G4: { value: 5 },
            A1: { value: "Source" },
          },
        },
      ],
    };

    expect(detectFormulaAnswerRegion(workbook)).toMatchObject({
      sheetName: "Dynamic",
      rangeRef: "F2",
      anchorCell: "F2",
      dynamicSpillRange: "F2:G4",
      formulaCount: 1,
    });
  });

  it("can prioritize the largest spill area for dynamic array setup", () => {
    const workbook: ExcelWorkbookSnapshot = {
      sheets: [
        {
          name: "Mixed",
          cells: {
            B2: { formula: "SUM(A2:A4)", value: 6 },
            B3: { formula: "AVERAGE(A2:A4)", value: 2 },
            F2: { formula: "SORT(A2:B20)", value: "A" },
            G2: { value: 1 },
            F3: { value: "B" },
            G3: { value: 2 },
            F4: { value: "C" },
            G4: { value: 3 },
          },
        },
      ],
    };

    expect(detectFormulaAnswerRegion(workbook, { mode: "dynamic_array" })).toMatchObject({
      sheetName: "Mixed",
      rangeRef: "F2",
      anchorCell: "F2",
      dynamicSpillRange: "F2:G4",
      formulaCount: 1,
    });
  });
});
