export type ExcelCellSnapshot = {
  value?: unknown;
  formula?: string | null;
  display?: string | null;
};

export type ExcelSheetSnapshot = {
  name: string;
  rowCount?: number | null;
  columnCount?: number | null;
  cells: Record<string, ExcelCellSnapshot>;
};

export type ExcelWorkbookSnapshot = {
  sheets: ExcelSheetSnapshot[];
};

export type ExcelRangeSelection = {
  sheetName: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

export type ExcelAnswerSnapshot = {
  values: unknown[][];
  formulas: string[][];
};

export function columnIndexToLabel(index: number) {
  let current = Math.max(1, index);
  let result = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

export function columnLabelToIndex(label: string) {
  let result = 0;
  for (const ch of label.toUpperCase()) {
    if (ch < "A" || ch > "Z") return 0;
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return result;
}

export function toCellRef(row: number, col: number) {
  return `${columnIndexToLabel(col)}${row}`;
}

export function parseCellRef(ref: string) {
  const normalizedRef = ref.trim().toUpperCase().replace(/\$/g, "");
  const match = normalizedRef.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    row: Number(match[2]),
    col: columnLabelToIndex(match[1]),
  };
}

export function parseRangeRef(range: string) {
  if (!range?.trim()) return null;
  const [startText, endText] = range.trim().toUpperCase().split(":");
  const start = parseCellRef(startText);
  const end = parseCellRef(endText || startText);
  if (!start || !end) return null;
  return {
    startRow: Math.min(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endRow: Math.max(start.row, end.row),
    endCol: Math.max(start.col, end.col),
  };
}

export function selectionToRangeRef(selection: ExcelRangeSelection | null | undefined) {
  if (!selection) return "";
  const start = toCellRef(selection.startRow, selection.startCol);
  const end = toCellRef(selection.endRow, selection.endCol);
  return start === end ? start : `${start}:${end}`;
}

export function cloneWorkbookSnapshot(workbook: ExcelWorkbookSnapshot | null | undefined): ExcelWorkbookSnapshot {
  if (!workbook?.sheets) {
    return { sheets: [] };
  }
  return {
    sheets: workbook.sheets.map((sheet) => ({
      name: sheet.name,
      rowCount: sheet.rowCount ?? 0,
      columnCount: sheet.columnCount ?? 0,
      cells: Object.fromEntries(
        Object.entries(sheet.cells || {}).map(([key, value]) => [
          key,
          {
            value: value?.value ?? "",
            formula: value?.formula ?? null,
            display: value?.display ?? null,
          },
        ]),
      ),
    })),
  };
}

export function getSheetSnapshot(workbook: ExcelWorkbookSnapshot | null | undefined, sheetName: string | null | undefined) {
  if (!workbook?.sheets || !sheetName) return null;
  return workbook.sheets.find((sheet) => sheet.name === sheetName) || null;
}

export function getCellSnapshot(sheet: ExcelSheetSnapshot | null | undefined, cellRef: string) {
  if (!sheet) return undefined;
  return sheet.cells?.[cellRef];
}

export function getCellInputValue(cell: ExcelCellSnapshot | undefined) {
  if (!cell) return "";
  if (cell.formula) return `=${cell.formula}`;
  if (cell.value === null || cell.value === undefined) return "";
  return String(cell.value);
}

export function getCellDisplayValue(cell: ExcelCellSnapshot | undefined) {
  if (!cell) return "";
  if (cell.display !== null && cell.display !== undefined && String(cell.display).trim()) {
    return String(cell.display);
  }
  if (cell.formula) return `=${cell.formula}`;
  if (cell.value === null || cell.value === undefined) return "";
  return String(cell.value);
}

export function updateWorkbookCell(workbook: ExcelWorkbookSnapshot, sheetName: string, cellRef: string, rawValue: string) {
  const next = cloneWorkbookSnapshot(workbook);
  const sheet = getSheetSnapshot(next, sheetName);
  if (!sheet) return next;
  const value = rawValue ?? "";
  if (!value.trim()) {
    delete sheet.cells[cellRef];
    return next;
  }
  if (value.startsWith("=")) {
    sheet.cells[cellRef] = {
      value,
      formula: value.slice(1),
      display: value,
    };
    return next;
  }
  sheet.cells[cellRef] = {
    value,
    formula: null,
    display: value,
  };
  return next;
}

export function buildWorkbookWithAnswerSnapshot(
  templateWorkbook: ExcelWorkbookSnapshot | null | undefined,
  sheetName: string | null | undefined,
  rangeRef: string | null | undefined,
  answerSnapshotJson: string | null | undefined,
) {
  const next = cloneWorkbookSnapshot(templateWorkbook);
  if (!sheetName || !rangeRef || !answerSnapshotJson) {
    return next;
  }
  const sheet = getSheetSnapshot(next, sheetName);
  const range = parseRangeRef(rangeRef);
  if (!sheet || !range) {
    return next;
  }
  let answerSnapshot: ExcelAnswerSnapshot | null = null;
  try {
    answerSnapshot = JSON.parse(answerSnapshotJson) as ExcelAnswerSnapshot;
  } catch {
    return next;
  }
  for (let rowOffset = 0; rowOffset <= range.endRow - range.startRow; rowOffset += 1) {
    for (let colOffset = 0; colOffset <= range.endCol - range.startCol; colOffset += 1) {
      const cellRef = toCellRef(range.startRow + rowOffset, range.startCol + colOffset);
      const formula = answerSnapshot?.formulas?.[rowOffset]?.[colOffset] || "";
      const value = answerSnapshot?.values?.[rowOffset]?.[colOffset] ?? "";
      if (!formula && (value === null || value === undefined || String(value).trim() === "")) {
        delete sheet.cells[cellRef];
        continue;
      }
      sheet.cells[cellRef] = formula
        ? { value, formula, display: `=${formula}` }
        : { value, formula: null, display: value === null || value === undefined ? "" : String(value) };
    }
  }
  return next;
}

export function extractRangeAnswerSnapshot(
  workbook: ExcelWorkbookSnapshot | null | undefined,
  sheetName: string | null | undefined,
  rangeRef: string | null | undefined,
): ExcelAnswerSnapshot {
  const sheet = getSheetSnapshot(workbook, sheetName);
  const range = rangeRef ? parseRangeRef(rangeRef) : null;
  if (!sheet || !range) {
    return { values: [], formulas: [] };
  }

  const values: unknown[][] = [];
  const formulas: string[][] = [];

  for (let row = range.startRow; row <= range.endRow; row += 1) {
    const valueRow: unknown[] = [];
    const formulaRow: string[] = [];
    for (let col = range.startCol; col <= range.endCol; col += 1) {
      const cell = getCellSnapshot(sheet, toCellRef(row, col));
      valueRow.push(cell?.value ?? "");
      formulaRow.push(cell?.formula ?? "");
    }
    values.push(valueRow);
    formulas.push(formulaRow);
  }

  return { values, formulas };
}

export function isCellInSelection(row: number, col: number, selection: ExcelRangeSelection | null | undefined) {
  return !!selection
    && row >= selection.startRow
    && row <= selection.endRow
    && col >= selection.startCol
    && col <= selection.endCol;
}

export function normalizeSelection(sheetName: string, startRow: number, startCol: number, endRow: number, endCol: number): ExcelRangeSelection {
  return {
    sheetName,
    startRow: Math.min(startRow, endRow),
    startCol: Math.min(startCol, endCol),
    endRow: Math.max(startRow, endRow),
    endCol: Math.max(startCol, endCol),
  };
}

export function resolveSheetBounds(sheet: ExcelSheetSnapshot | null | undefined, selection?: ExcelRangeSelection | null) {
  const cellRefs = Object.keys(sheet?.cells || {}).map((key) => parseCellRef(key)).filter(Boolean) as Array<{ row: number; col: number }>;
  const maxRowFromCells = cellRefs.reduce((max, item) => Math.max(max, item.row), 1);
  const maxColFromCells = cellRefs.reduce((max, item) => Math.max(max, item.col), 1);
  return {
    rowCount: Math.max(sheet?.rowCount || 0, selection?.endRow || 0, maxRowFromCells, 12),
    columnCount: Math.max(sheet?.columnCount || 0, selection?.endCol || 0, maxColFromCells, 8),
  };
}

export function parseSheetAndRange(a1Notation: string) {
  const text = a1Notation.trim();
  const bangIndex = text.lastIndexOf("!");
  if (bangIndex < 0) {
    return { sheetName: "", rangeRef: text };
  }
  const rawSheetName = text.slice(0, bangIndex).replace(/^'/, "").replace(/'$/, "").replace(/''/g, "'");
  return {
    sheetName: rawSheetName,
    rangeRef: text.slice(bangIndex + 1),
  };
}

function normalizeScalarValue(value: unknown) {
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "string") return value ?? "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return value;
}

function flattenFormulaArgs(args: unknown[]): unknown[] {
  return args.flatMap((item) => Array.isArray(item) ? flattenFormulaArgs(item) : [item]);
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return 0;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.trim().length > 0 && value.trim().toLowerCase() !== "false" && value !== "0";
  return Boolean(value);
}

function formatEvaluatedValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return String(value);
}

function buildFormulaFunctions() {
  return {
    SUM: (...args: unknown[]) => flattenFormulaArgs(args).reduce((sum, item) => sum + toNumber(item), 0),
    AVERAGE: (...args: unknown[]) => {
      const values = flattenFormulaArgs(args).map(toNumber);
      return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0;
    },
    MAX: (...args: unknown[]) => {
      const values = flattenFormulaArgs(args).map(toNumber);
      return values.length ? Math.max(...values) : 0;
    },
    MIN: (...args: unknown[]) => {
      const values = flattenFormulaArgs(args).map(toNumber);
      return values.length ? Math.min(...values) : 0;
    },
    COUNT: (...args: unknown[]) => flattenFormulaArgs(args).filter((item) => item !== "" && item !== null && item !== undefined).length,
    ROUND: (value: unknown, digits: unknown = 0) => {
      const factor = Math.pow(10, toNumber(digits));
      return Math.round(toNumber(value) * factor) / factor;
    },
    ABS: (value: unknown) => Math.abs(toNumber(value)),
    IF: (condition: unknown, truthy: unknown, falsy: unknown) => (toBoolean(condition) ? truthy : falsy),
    AND: (...args: unknown[]) => flattenFormulaArgs(args).every(toBoolean),
    OR: (...args: unknown[]) => flattenFormulaArgs(args).some(toBoolean),
    NOT: (value: unknown) => !toBoolean(value),
    CONCAT: (...args: unknown[]) => flattenFormulaArgs(args).map((item) => item ?? "").join(""),
  };
}

function transformFormulaExpression(formula: string) {
  let expression = formula.trim().replace(/^=/, "");
  const stringLiterals: string[] = [];
  expression = expression.replace(/"([^"]*)"/g, (_, content: string) => {
    const token = `__STR_${stringLiterals.length}__`;
    stringLiterals.push(content);
    return token;
  });

  const ranges: string[] = [];
  expression = expression.replace(/\b([A-Z]{1,3}\d+:[A-Z]{1,3}\d+)\b/g, (_, content: string) => {
    const token = `__RANGE_${ranges.length}__`;
    ranges.push(content);
    return token;
  });

  expression = expression.replace(/\b([A-Z]{1,3}\d+)\b/g, (_, ref: string) => `__C("${ref}")`);
  expression = expression.replace(/\b(SUM|AVERAGE|MAX|MIN|COUNT|ROUND|ABS|IF|AND|OR|NOT|CONCAT)\s*\(/gi, (_, fn: string) => `__F.${fn.toUpperCase()}(`);
  expression = expression.replace(/<>/g, "!=");
  expression = expression.replace(/(?<![<>=])=(?!=)/g, "==");

  ranges.forEach((range, index) => {
    expression = expression.replace(`__RANGE_${index}__`, `__R("${range}")`);
  });
  stringLiterals.forEach((literal, index) => {
    expression = expression.replace(`__STR_${index}__`, JSON.stringify(literal));
  });
  return expression;
}

export function evaluateWorkbookCell(
  workbook: ExcelWorkbookSnapshot | null | undefined,
  sheetName: string,
  cellRef: string,
  trail: Set<string> = new Set(),
): unknown {
  const key = `${sheetName}!${cellRef}`;
  if (trail.has(key)) return "#CYCLE!";
  const sheet = getSheetSnapshot(workbook, sheetName);
  const cell = getCellSnapshot(sheet, cellRef);
  if (!cell) return "";
  if (!cell.formula) {
    return normalizeScalarValue(cell.value);
  }

  const nextTrail = new Set(trail);
  nextTrail.add(key);
  try {
    const __C = (ref: string) => evaluateWorkbookCell(workbook, sheetName, ref, nextTrail);
    const __R = (rangeRef: string) => {
      const range = parseRangeRef(rangeRef);
      if (!range) return [];
      const values: unknown[] = [];
      for (let row = range.startRow; row <= range.endRow; row += 1) {
        for (let col = range.startCol; col <= range.endCol; col += 1) {
          values.push(evaluateWorkbookCell(workbook, sheetName, toCellRef(row, col), nextTrail));
        }
      }
      return values;
    };
    const __F = buildFormulaFunctions();
    const expression = transformFormulaExpression(cell.formula);
    return Function("__C", "__R", "__F", `return (${expression});`)(__C, __R, __F);
  } catch {
    return "#ERROR!";
  }
}

export function getComputedCellDisplayValue(
  workbook: ExcelWorkbookSnapshot | null | undefined,
  sheetName: string,
  cellRef: string,
) {
  const sheet = getSheetSnapshot(workbook, sheetName);
  const cell = getCellSnapshot(sheet, cellRef);
  if (!cell) return "";
  if (!cell.formula) {
    return getCellDisplayValue(cell);
  }
  return formatEvaluatedValue(evaluateWorkbookCell(workbook, sheetName, cellRef));
}
