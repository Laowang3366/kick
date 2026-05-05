import type { IWorkbookData } from "@univerjs/preset-sheets-core";
import { columnIndexToLabel, columnLabelToIndex, toCellRef, type ExcelWorkbookSnapshot } from "./excel";

type UniverCellData = {
  v?: unknown;
  f?: unknown;
  si?: unknown;
};

type SharedFormulaAnchor = {
  row: number;
  col: number;
  formula: string;
};

export type UniverWorkbookSnapshotOptions = {
  moveFormulaRefOffset?: (formula: string, colOffset: number, rowOffset: number) => string;
};

function normalizeFormula(formula: unknown) {
  if (typeof formula !== "string") return null;
  const normalized = formula.trim().replace(/^=/, "");
  return normalized ? normalized : null;
}

function normalizeFormulaId(formulaId: unknown) {
  if (typeof formulaId !== "string") return null;
  const normalized = formulaId.trim();
  return normalized ? normalized : null;
}

function splitFormulaStringLiterals(formula: string) {
  const chunks: Array<{ text: string; isLiteral: boolean }> = [];
  let cursor = 0;
  let literalStart = -1;

  for (let index = 0; index < formula.length; index += 1) {
    if (formula[index] !== "\"") continue;
    if (literalStart >= 0 && formula[index + 1] === "\"") {
      index += 1;
      continue;
    }

    if (literalStart < 0) {
      if (cursor < index) chunks.push({ text: formula.slice(cursor, index), isLiteral: false });
      literalStart = index;
    } else {
      chunks.push({ text: formula.slice(literalStart, index + 1), isLiteral: true });
      cursor = index + 1;
      literalStart = -1;
    }
  }

  if (literalStart >= 0) {
    chunks.push({ text: formula.slice(literalStart), isLiteral: true });
  } else if (cursor < formula.length) {
    chunks.push({ text: formula.slice(cursor), isLiteral: false });
  }

  return chunks;
}

function offsetFormulaRefsFallback(formula: string, colOffset: number, rowOffset: number) {
  if (colOffset === 0 && rowOffset === 0) return formula;
  const cellReferencePattern = /(^|[^A-Za-z0-9_])((?:'[^']*(?:''[^']*)*'|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)([1-9][0-9]*)(?!\s*\()/g;

  return splitFormulaStringLiterals(formula)
    .map((chunk) => {
      if (chunk.isLiteral) return chunk.text;
      return chunk.text.replace(
        cellReferencePattern,
        (match, prefix: string, sheetPrefix: string = "", absoluteCol: string, colLabel: string, absoluteRow: string, rowText: string) => {
          const col = columnLabelToIndex(colLabel);
          const row = Number(rowText);
          const nextCol = absoluteCol ? col : col + colOffset;
          const nextRow = absoluteRow ? row : row + rowOffset;
          if (nextCol < 1 || nextRow < 1) return match;
          return `${prefix}${sheetPrefix}${absoluteCol}${columnIndexToLabel(nextCol)}${absoluteRow}${nextRow}`;
        },
      );
    })
    .join("");
}

function moveFormulaRefOffset(
  formula: string,
  colOffset: number,
  rowOffset: number,
  options: UniverWorkbookSnapshotOptions,
) {
  const formulaText = formula.startsWith("=") ? formula : `=${formula}`;
  try {
    return options.moveFormulaRefOffset?.(formulaText, colOffset, rowOffset) ?? offsetFormulaRefsFallback(formulaText, colOffset, rowOffset);
  } catch {
    return offsetFormulaRefsFallback(formulaText, colOffset, rowOffset);
  }
}

function collectSharedFormulaAnchors(matrix: Record<string, Record<string, UniverCellData | null | undefined>>) {
  const anchors = new Map<string, SharedFormulaAnchor>();

  Object.entries(matrix).forEach(([rowIndex, cols]) => {
    Object.entries(cols || {}).forEach(([colIndex, cellData]) => {
      const formulaId = normalizeFormulaId(cellData?.si);
      const formula = normalizeFormula(cellData?.f);
      if (!formulaId || !formula) return;

      const row = Number(rowIndex) + 1;
      const col = Number(colIndex) + 1;
      const current = anchors.get(formulaId);
      if (!current || row < current.row || (row === current.row && col < current.col)) {
        anchors.set(formulaId, { row, col, formula });
      }
    });
  });

  return anchors;
}

function getCellFormula(
  cellData: UniverCellData | null | undefined,
  row: number,
  col: number,
  anchors: Map<string, SharedFormulaAnchor>,
  options: UniverWorkbookSnapshotOptions,
) {
  const directFormula = normalizeFormula(cellData?.f);
  if (directFormula) return directFormula;

  const formulaId = normalizeFormulaId(cellData?.si);
  const anchor = formulaId ? anchors.get(formulaId) : null;
  if (!anchor) return null;

  const movedFormula = moveFormulaRefOffset(anchor.formula, col - anchor.col, row - anchor.row, options);
  return normalizeFormula(movedFormula) ?? anchor.formula;
}

export function univerDataToWorkbookSnapshot(
  data: IWorkbookData,
  options: UniverWorkbookSnapshotOptions = {},
): ExcelWorkbookSnapshot {
  return {
    sheets: (data.sheetOrder || []).map((sheetId) => {
      const sheet = data.sheets?.[sheetId];
      const cells: Record<string, { value?: unknown; formula?: string | null; display?: string | null }> = {};
      const matrix = (sheet?.cellData || {}) as Record<string, Record<string, UniverCellData | null | undefined>>;
      const sharedFormulaAnchors = collectSharedFormulaAnchors(matrix);

      Object.entries(matrix).forEach(([rowIndex, cols]) => {
        Object.entries(cols || {}).forEach(([colIndex, cellData]) => {
          const row = Number(rowIndex) + 1;
          const col = Number(colIndex) + 1;
          const cellRef = toCellRef(row, col);
          cells[cellRef] = {
            value: cellData?.v ?? "",
            formula: getCellFormula(cellData, row, col, sharedFormulaAnchors, options),
            display: cellData?.v !== undefined && cellData?.v !== null ? String(cellData.v) : "",
          };
        });
      });

      return {
        name: sheet?.name || sheetId,
        rowCount: sheet?.rowCount || 200,
        columnCount: sheet?.columnCount || 40,
        cells,
      };
    }),
  };
}
