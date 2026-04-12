import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Minimize2 } from "lucide-react";
import {
  ExcelRangeSelection,
  ExcelWorkbookSnapshot,
  columnIndexToLabel,
  getCellInputValue,
  getComputedCellDisplayValue,
  getSheetSnapshot,
  isCellInSelection,
  parseCellRef,
  resolveSheetBounds,
  toCellRef,
  updateWorkbookCell,
} from "../lib/excel";

type ExcelSnapshotEditorProps = {
  workbook: ExcelWorkbookSnapshot;
  onWorkbookChange?: (next: ExcelWorkbookSnapshot) => void;
  selectedSheetName: string;
  onSelectedSheetNameChange: (sheetName: string) => void;
  selection?: ExcelRangeSelection | null;
  onSelectionChange?: (selection: ExcelRangeSelection | null) => void;
  editableRange?: ExcelRangeSelection | null;
  selectionEnabled?: boolean;
  focusRange?: ExcelRangeSelection | null;
  requestFullscreenVersion?: number;
  showConfirmSelectionButton?: boolean;
  confirmSelectionLabel?: string;
  onConfirmSelection?: () => void;
  className?: string;
};

export function ExcelSnapshotEditor({
  workbook,
  onWorkbookChange,
  selectedSheetName,
  onSelectedSheetNameChange,
  selection = null,
  onSelectionChange,
  editableRange = null,
  selectionEnabled = false,
  focusRange = null,
  requestFullscreenVersion = 0,
  showConfirmSelectionButton = false,
  confirmSelectionLabel = "确认区域",
  onConfirmSelection,
  className = "",
}: ExcelSnapshotEditorProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const formulaInputRef = useRef<HTMLInputElement | null>(null);
  const cellInputRef = useRef<HTMLInputElement | null>(null);
  const selectingRef = useRef(false);
  const [activeCellRef, setActiveCellRef] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [editingMode, setEditingMode] = useState<"none" | "formula" | "cell">("none");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sheet = getSheetSnapshot(workbook, selectedSheetName) || workbook.sheets[0] || null;
  const currentSheetName = sheet?.name || selectedSheetName;
  const bounds = resolveSheetBounds(sheet, editableRange);
  const activeCellPos = activeCellRef ? parseCellRef(activeCellRef) : null;
  const effectiveSelection = selectionEnabled ? selection : editableRange;
  const activeCellEditable = !selectionEnabled
    && !!activeCellPos
    && !!editableRange
    && editableRange.sheetName === currentSheetName
    && isCellInSelection(activeCellPos.row, activeCellPos.col, editableRange);
  const activeCell = activeCellRef && sheet ? sheet.cells?.[activeCellRef] : undefined;

  useEffect(() => {
    if (sheet && currentSheetName !== selectedSheetName) {
      onSelectedSheetNameChange(sheet.name);
    }
  }, [currentSheetName, onSelectedSheetNameChange, selectedSheetName, sheet]);

  useEffect(() => {
    if (!activeCellRef && editableRange?.sheetName === currentSheetName) {
      setActiveCellRef(toCellRef(editableRange.startRow, editableRange.startCol));
    }
  }, [activeCellRef, currentSheetName, editableRange]);

  useEffect(() => {
    if (!focusRange || focusRange.sheetName !== currentSheetName) return;
    setActiveCellRef(toCellRef(focusRange.startRow, focusRange.startCol));
  }, [currentSheetName, focusRange]);

  useEffect(() => {
    if (editingMode === "none") {
      setDraftValue(getCellInputValue(activeCell));
    }
  }, [activeCell, editingMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!requestFullscreenVersion || !shellRef.current) return;
    if (document.fullscreenElement !== shellRef.current) {
      void shellRef.current.requestFullscreen();
    }
  }, [requestFullscreenVersion]);

  const commitDraft = (nextValue?: string) => {
    if (!sheet || !activeCellRef || !activeCellEditable || !onWorkbookChange) {
      setEditingMode("none");
      return;
    }
    const value = nextValue ?? draftValue;
    onWorkbookChange(updateWorkbookCell(workbook, sheet.name, activeCellRef, value));
    setDraftValue(value);
    setEditingMode("none");
  };

  const moveActiveCell = (rowDelta: number, colDelta: number) => {
    const baseRow = activeCellPos?.row || editableRange?.startRow || 1;
    const baseCol = activeCellPos?.col || editableRange?.startCol || 1;
    const minRow = editableRange?.sheetName === currentSheetName ? editableRange.startRow : 1;
    const maxRow = editableRange?.sheetName === currentSheetName ? editableRange.endRow : bounds.rowCount;
    const minCol = editableRange?.sheetName === currentSheetName ? editableRange.startCol : 1;
    const maxCol = editableRange?.sheetName === currentSheetName ? editableRange.endCol : bounds.columnCount;
    const nextRow = Math.min(maxRow, Math.max(minRow, baseRow + rowDelta));
    const nextCol = Math.min(maxCol, Math.max(minCol, baseCol + colDelta));
    setActiveCellRef(toCellRef(nextRow, nextCol));
  };

  const openFormulaEditor = (mode: "formula" | "cell", seedValue?: string) => {
    if (!activeCellEditable || selectionEnabled) return;
    setDraftValue(seedValue ?? getCellInputValue(activeCell));
    setEditingMode(mode);
    window.setTimeout(() => {
      if (mode === "formula") {
        formulaInputRef.current?.focus();
        formulaInputRef.current?.select();
      } else {
        cellInputRef.current?.focus();
        cellInputRef.current?.select();
      }
    }, 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingMode !== "none" || selectionEnabled) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveCell(-1, 0);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveCell(1, 0);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveActiveCell(0, -1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveActiveCell(0, 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openFormulaEditor("cell");
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      moveActiveCell(0, event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      openFormulaEditor("cell");
      return;
    }
    if ((event.key === "Backspace" || event.key === "Delete") && activeCellEditable && onWorkbookChange && sheet) {
      event.preventDefault();
      onWorkbookChange(updateWorkbookCell(workbook, sheet.name, activeCellRef, ""));
      setDraftValue("");
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && activeCellEditable) {
      event.preventDefault();
      openFormulaEditor("cell", event.key);
    }
  };

  const toggleFullscreen = async () => {
    if (!shellRef.current) return;
    if (document.fullscreenElement === shellRef.current) {
      await document.exitFullscreen();
      return;
    }
    await shellRef.current.requestFullscreen();
  };

  const beginSelection = (row: number, col: number) => {
    if (!selectionEnabled || !onSelectionChange) return;
    const nextSelection = normalizeSelection(currentSheetName, row, col, row, col);
    selectingRef.current = true;
    setActiveCellRef(toCellRef(row, col));
    onSelectionChange(nextSelection);
  };

  const extendSelection = (row: number, col: number) => {
    if (!selectionEnabled || !onSelectionChange || !selectingRef.current) return;
    const anchor = selection && selection.sheetName === currentSheetName
      ? selection
      : normalizeSelection(currentSheetName, row, col, row, col);
    const nextSelection = normalizeSelection(currentSheetName, anchor.startRow, anchor.startCol, row, col);
    setActiveCellRef(toCellRef(row, col));
    onSelectionChange(nextSelection);
  };

  const finishSelection = () => {
    selectingRef.current = false;
  };

  return (
    <div
      ref={shellRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)] outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/20 ${isFullscreen ? "h-screen w-screen rounded-none border-0 shadow-none" : ""} ${className}`}
    >
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex items-center gap-2">
            {isFullscreen && showConfirmSelectionButton && (
              <button
                type="button"
                onClick={onConfirmSelection}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#1677ff] px-4 text-sm font-bold text-white transition hover:bg-[#4096ff]"
              >
                {confirmSelectionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Expand size={14} />}
              {isFullscreen ? "退出全屏" : "全屏进入"}
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[120px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black tracking-[0.16em] text-slate-600">
            {activeCellRef || "-"}
          </div>
          <input
            ref={formulaInputRef}
            value={draftValue}
            onFocus={() => activeCellEditable && setEditingMode("formula")}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={() => commitDraft()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraft(event.currentTarget.value);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftValue(getCellInputValue(activeCell));
                setEditingMode("none");
              }
            }}
            disabled={!activeCellEditable}
            placeholder={activeCellEditable ? "输入值或 =公式" : "请选择答题区域内单元格"}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
      </div>

      <div className="max-h-[720px] overflow-auto bg-white" onMouseUp={finishSelection} onMouseLeave={finishSelection}>
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
                  const editable = !!editableRange && editableRange.sheetName === currentSheetName && isCellInSelection(row, col, editableRange);
                  const inSelection = !!effectiveSelection && effectiveSelection.sheetName === currentSheetName && isCellInSelection(row, col, effectiveSelection);
                  const active = activeCellRef === cellRef;
                  const editingThisCell = active && editingMode === "cell" && editable;
                  return (
                    <td
                      key={cellRef}
                      onMouseDown={() => {
                        if (selectionEnabled) {
                          beginSelection(row, col);
                          return;
                        }
                        setActiveCellRef(cellRef);
                      }}
                      onMouseEnter={() => {
                        if (selectionEnabled) {
                          extendSelection(row, col);
                        }
                      }}
                      onClick={() => {
                        if (!selectionEnabled) {
                          setActiveCellRef(cellRef);
                        }
                      }}
                      onDoubleClick={() => {
                        if (!selectionEnabled) {
                          openFormulaEditor("cell");
                        }
                      }}
                      className={`relative h-12 min-w-[120px] border-b border-r border-slate-200 px-3 py-2 text-sm font-medium ${
                        selectionEnabled
                          ? "cursor-cell bg-white text-slate-900"
                          : editable
                            ? "cursor-text bg-emerald-50/70 text-slate-900"
                            : "bg-white text-slate-700"
                      }`}
                    >
                      {editingThisCell ? (
                        <input
                          ref={cellInputRef}
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          onBlur={() => commitDraft()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              commitDraft(event.currentTarget.value);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setDraftValue(getCellInputValue(activeCell));
                              setEditingMode("none");
                            }
                          }}
                          className="h-full w-full bg-transparent outline-none"
                        />
                      ) : (
                        <span className="block max-w-[160px] truncate">
                          {sheet ? getComputedCellDisplayValue(workbook, sheet.name, cellRef) : ""}
                        </span>
                      )}
                      {editable && !selectionEnabled && <div className="pointer-events-none absolute inset-0 border border-emerald-300" />}
                      {inSelection && <div className="pointer-events-none absolute inset-0 bg-cyan-100/40" />}
                      {inSelection && <div className="pointer-events-none absolute inset-0 border-2 border-cyan-500" />}
                      {active && !inSelection && <div className="pointer-events-none absolute inset-0 border-2 border-cyan-500" />}
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
