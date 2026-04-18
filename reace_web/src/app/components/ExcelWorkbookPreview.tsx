import { ExcelRangeSelection, ExcelWorkbookSnapshot, columnIndexToLabel, getSheetSnapshot, isCellInSelection, resolveSheetBounds, toCellRef } from "../lib/excel";

type ExcelWorkbookPreviewProps = {
  workbook: ExcelWorkbookSnapshot;
  selectedSheetName: string;
  onSelectedSheetNameChange: (sheetName: string) => void;
  focusRange?: ExcelRangeSelection | null;
  className?: string;
};

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
              {Array.from({ length: bounds.columnCount }, (_, index) => index + 1).map((col) => (
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
            {Array.from({ length: bounds.rowCount }, (_, index) => index + 1).map((row) => (
              <tr key={`row-${row}`}>
                <th className="sticky left-0 z-10 h-12 min-w-14 border-b border-r border-slate-200 bg-slate-100 px-2 text-center text-xs font-black text-slate-500">
                  {row}
                </th>
                {Array.from({ length: bounds.columnCount }, (_, index) => index + 1).map((col) => {
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
