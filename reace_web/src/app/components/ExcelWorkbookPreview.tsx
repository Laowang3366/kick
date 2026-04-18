import { ExcelRangeSelection, ExcelWorkbookSnapshot, columnIndexToLabel, getSheetSnapshot, isCellInSelection, resolveSheetBounds, toCellRef } from "../lib/excel";

type ExcelWorkbookPreviewProps = {
  workbook: ExcelWorkbookSnapshot;
  selectedSheetName: string;
  onSelectedSheetNameChange: (sheetName: string) => void;
  focusRange?: ExcelRangeSelection | null;
  className?: string;
};

const MAX_PREVIEW_ROWS = 60;
const MAX_PREVIEW_COLUMNS = 52;
const MIN_PREVIEW_ROWS = 12;
const MIN_PREVIEW_COLUMNS = 8;

function getCellPreviewText(cell: { value?: unknown; formula?: string | null; display?: string | null } | undefined) {
  if (!cell) return "";
  if (cell.formula) {
    return `=${cell.formula}`;
  }
  if (cell.display !== null && cell.display !== undefined && String(cell.display).trim()) {
    return String(cell.display);
  }
  if (cell.value === null || cell.value === undefined) {
    return "";
  }
  return String(cell.value);
}

function parseCellPosition(cellRef: string) {
  const match = /^([A-Z]+)(\d+)$/i.exec(cellRef.trim());
  if (!match) return null;
  const [, columnLabel, rowText] = match;
  let col = 0;
  for (const char of columnLabel.toUpperCase()) {
    col = (col * 26) + (char.charCodeAt(0) - 64);
  }
  return { row: Number(rowText), col };
}

function resolveWindow(
  totalCount: number,
  relevantStart: number,
  relevantEnd: number,
  minCount: number,
  maxCount: number,
) {
  const count = Math.min(
    totalCount,
    Math.max(minCount, relevantEnd - relevantStart + 1),
    maxCount,
  );
  let start = Math.max(1, Math.min(relevantStart, totalCount - count + 1));
  if (relevantEnd > start + count - 1) {
    start = relevantEnd - count + 1;
  }
  const end = Math.min(totalCount, start + count - 1);
  return { start, end };
}

export function ExcelWorkbookPreview({
  workbook,
  selectedSheetName,
  onSelectedSheetNameChange,
  focusRange = null,
  className = "",
}: ExcelWorkbookPreviewProps) {
  const sheet = getSheetSnapshot(workbook, selectedSheetName) || workbook.sheets[0] || null;
  const currentSheetName = sheet?.name || selectedSheetName;
  const currentFocusRange = focusRange && focusRange.sheetName === currentSheetName ? focusRange : null;
  const bounds = resolveSheetBounds(sheet, currentFocusRange);
  const occupiedCells = Object.keys(sheet?.cells || {}).map(parseCellPosition).filter(Boolean) as Array<{ row: number; col: number }>;
  const relevantRowStart = currentFocusRange
    ? Math.min(currentFocusRange.startRow, ...occupiedCells.map((item) => item.row))
    : (occupiedCells.reduce((min, item) => Math.min(min, item.row), 1));
  const relevantRowEnd = currentFocusRange
    ? Math.max(currentFocusRange.endRow, ...occupiedCells.map((item) => item.row))
    : (occupiedCells.reduce((max, item) => Math.max(max, item.row), 1));
  const relevantColumnStart = currentFocusRange
    ? Math.min(currentFocusRange.startCol, ...occupiedCells.map((item) => item.col))
    : (occupiedCells.reduce((min, item) => Math.min(min, item.col), 1));
  const relevantColumnEnd = currentFocusRange
    ? Math.max(currentFocusRange.endCol, ...occupiedCells.map((item) => Math.max(item.col, 1)))
    : (occupiedCells.reduce((max, item) => Math.max(max, item.col), 1));
  const rowWindow = resolveWindow(bounds.rowCount, relevantRowStart, relevantRowEnd, MIN_PREVIEW_ROWS, MAX_PREVIEW_ROWS);
  const columnWindow = resolveWindow(bounds.columnCount, relevantColumnStart, relevantColumnEnd, MIN_PREVIEW_COLUMNS, MAX_PREVIEW_COLUMNS);
  const visibleRows = Array.from({ length: rowWindow.end - rowWindow.start + 1 }, (_, index) => rowWindow.start + index);
  const visibleColumns = Array.from({ length: columnWindow.end - columnWindow.start + 1 }, (_, index) => columnWindow.start + index);

  return (
    <div className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)] ${className}`}>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {workbook.sheets.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelectedSheetNameChange(item.name)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                item.name === currentSheetName ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto bg-white">
        <table className="min-w-max border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 h-11 min-w-14 border-b border-r border-slate-200 bg-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                #
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={`col-${col}`}
                  className="h-11 min-w-[120px] border-b border-r border-slate-200 bg-slate-100 px-3 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500"
                >
                  {columnIndexToLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={`row-${row}`}>
                <th className="sticky left-0 z-10 h-12 min-w-14 border-b border-r border-slate-200 bg-slate-100 px-2 text-center text-xs font-black text-slate-500">
                  {row}
                </th>
                {visibleColumns.map((col) => {
                  const cellRef = toCellRef(row, col);
                  const cell = sheet?.cells?.[cellRef];
                  const focused = !!currentFocusRange && isCellInSelection(row, col, currentFocusRange);
                  const isFormula = !!cell?.formula;
                  const cellText = getCellPreviewText(cell);

                  return (
                    <td
                      key={cellRef}
                      data-cell-ref={cellRef}
                      data-focused={focused ? "true" : undefined}
                      className={`relative h-12 min-w-[120px] border-b border-r border-slate-200 px-3 py-2 text-sm font-medium ${
                        focused ? "bg-cyan-50 text-slate-900" : "bg-white text-slate-700"
                      }`}
                    >
                      {isFormula ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-slate-900 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                            fx
                          </span>
                          <span className="truncate">{cellText}</span>
                        </div>
                      ) : (
                        <span className="block max-w-[160px] truncate">{cellText}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
