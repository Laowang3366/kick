import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Minimize2 } from "lucide-react";
import {
  ExcelRangeSelection,
  ExcelWorkbookSnapshot,
  normalizeSelection,
  parseRangeRef,
  parseSheetAndRange,
  selectionToRangeRef,
} from "../lib/excel";
import { getStoredUser } from "../lib/session-store";
import { loadUniverRuntime, type FWorkbook, type IWorkbookData, type UniverRuntime } from "../lib/univer-runtime";

type ExcelWorkbookEditorProps = {
  workbook: ExcelWorkbookSnapshot;
  onWorkbookChange?: (next: ExcelWorkbookSnapshot) => void;
  onEditorReady?: () => void;
  onEditorError?: (message: string) => void;
  selectedSheetName: string;
  onSelectedSheetNameChange: (sheetName: string) => void;
  selection?: ExcelRangeSelection | null;
  onSelectionChange?: (selection: ExcelRangeSelection | null) => void;
  editableRange?: ExcelRangeSelection | null;
  restrictEditingToRange?: boolean;
  selectionEnabled?: boolean;
  focusRange?: ExcelRangeSelection | null;
  focusRequestVersion?: number;
  requestFullscreenVersion?: number;
  showConfirmSelectionButton?: boolean;
  confirmSelectionLabel?: string;
  onConfirmSelection?: () => void;
  onSnapshotCaptureReady?: (capture: (() => ExcelWorkbookSnapshot | null) | null) => void;
  className?: string;
  viewportClassName?: string;
};

type UniverBinding = {
  univerAPI: {
    createWorkbook: (data: Partial<IWorkbookData>) => FWorkbook;
    dispose: () => void;
  };
  workbook: FWorkbook;
  disposables: Array<{ dispose: () => void }>;
};

function isSameSelection(
  left: ExcelRangeSelection | null | undefined,
  right: ExcelRangeSelection | null | undefined,
) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.sheetName === right.sheetName
    && left.startRow === right.startRow
    && left.startCol === right.startCol
    && left.endRow === right.endRow
    && left.endCol === right.endCol;
}

function createWorkbookId() {
  return "excel-practice-workbook";
}

function workbookSnapshotToUniverData(workbook: ExcelWorkbookSnapshot, locale: string): Partial<IWorkbookData> {
  return {
    id: createWorkbookId(),
    name: "ExcelPractice",
    appVersion: "0.20.0",
    locale,
    styles: {},
  };
}

function applyWorkbookSnapshotToUniver(workbookFacade: FWorkbook, snapshot: ExcelWorkbookSnapshot) {
  const targetSheets = snapshot.sheets || [];
  if (targetSheets.length === 0) {
    return;
  }

  const existingSheets = workbookFacade.getSheets();
  const primarySheet = existingSheets[0] || workbookFacade.getActiveSheet();
  primarySheet.setName(targetSheets[0].name);

  for (let index = existingSheets.length; index < targetSheets.length; index += 1) {
    const target = targetSheets[index];
    workbookFacade.insertSheet(target.name, {
      sheet: {
        rowCount: Math.max(target.rowCount || 0, 200),
        columnCount: Math.max(target.columnCount || 0, 40),
      },
    });
  }

  const refreshedSheets = workbookFacade.getSheets();
  for (let index = targetSheets.length; index < refreshedSheets.length; index += 1) {
    workbookFacade.deleteSheet(refreshedSheets[index]);
  }

  targetSheets.forEach((sheetSnapshot, index) => {
    const worksheet = workbookFacade.getSheets()[index];
    if (!worksheet) return;
    if (worksheet.getSheetName() !== sheetSnapshot.name) {
      worksheet.setName(sheetSnapshot.name);
    }
    Object.entries(sheetSnapshot.cells || {}).forEach(([cellRef, cell]) => {
      const value = cell?.formula ? `=${cell.formula}` : cell?.value;
      if (value === null || value === undefined || String(value).trim() === "") {
        return;
      }
      worksheet.getRange(cellRef).setValue(value as string | number | boolean);
    });
  });

  workbookFacade.setActiveSheet(workbookFacade.getSheets()[0]);
}

function univerDataToWorkbookSnapshot(data: IWorkbookData): ExcelWorkbookSnapshot {
  return {
    sheets: (data.sheetOrder || []).map((sheetId) => {
      const sheet = data.sheets?.[sheetId];
      const cells: Record<string, { value?: unknown; formula?: string | null; display?: string | null }> = {};
      const matrix = sheet?.cellData || {};
      Object.entries(matrix).forEach(([rowIndex, cols]) => {
        Object.entries(cols || {}).forEach(([colIndex, cellData]) => {
          const row = Number(rowIndex) + 1;
          const col = Number(colIndex) + 1;
          const cellRef = toCellRef(row, col);
          cells[cellRef] = {
            value: (cellData as any)?.v ?? "",
            formula: (cellData as any)?.f ? String((cellData as any).f).replace(/^=/, "") : null,
            display: (cellData as any)?.v !== undefined && (cellData as any)?.v !== null ? String((cellData as any).v) : "",
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

function toCellRef(row: number, col: number) {
  let current = col;
  let label = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return `${label}${row}`;
}

export function ExcelWorkbookEditor({
  workbook,
  onWorkbookChange,
  onEditorReady,
  onEditorError,
  selectedSheetName,
  onSelectedSheetNameChange,
  selection = null,
  onSelectionChange,
  editableRange = null,
  restrictEditingToRange = false,
  selectionEnabled = false,
  focusRange = null,
  focusRequestVersion = 0,
  requestFullscreenVersion = 0,
  showConfirmSelectionButton = false,
  confirmSelectionLabel = "确认区域",
  onConfirmSelection,
  onSnapshotCaptureReady,
  className = "",
  viewportClassName,
}: ExcelWorkbookEditorProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bindingRef = useRef<UniverBinding | null>(null);
  const hydratingRef = useRef(false);
  const lastAppliedExternalRef = useRef("");
  const lastInternalSnapshotRef = useRef("");
  const latestSelectionRef = useRef<ExcelRangeSelection | null>(selection);
  const latestSelectedSheetNameRef = useRef(selectedSheetName);
  const latestSelectionEnabledRef = useRef(selectionEnabled);
  const latestOnSelectionChangeRef = useRef(onSelectionChange);
  const latestOnSelectedSheetNameChangeRef = useRef(onSelectedSheetNameChange);
  const latestOnWorkbookChangeRef = useRef(onWorkbookChange);
  const latestOnEditorReadyRef = useRef(onEditorReady);
  const latestOnEditorErrorRef = useRef(onEditorError);
  const lastFocusedRangeKeyRef = useRef("");
  const [instanceVersion, setInstanceVersion] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runtime, setRuntime] = useState<UniverRuntime | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const workbookKey = useMemo(() => JSON.stringify(workbook), [workbook]);

  useEffect(() => {
    latestSelectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    latestSelectedSheetNameRef.current = selectedSheetName;
  }, [selectedSheetName]);

  useEffect(() => {
    latestSelectionEnabledRef.current = selectionEnabled;
  }, [selectionEnabled]);

  useEffect(() => {
    latestOnSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    latestOnSelectedSheetNameChangeRef.current = onSelectedSheetNameChange;
  }, [onSelectedSheetNameChange]);

  useEffect(() => {
    latestOnWorkbookChangeRef.current = onWorkbookChange;
  }, [onWorkbookChange]);

  useEffect(() => {
    latestOnEditorReadyRef.current = onEditorReady;
  }, [onEditorReady]);

  useEffect(() => {
    latestOnEditorErrorRef.current = onEditorError;
  }, [onEditorError]);

  useEffect(() => {
    let active = true;
    loadUniverRuntime()
      .then((resolvedRuntime) => {
        if (!active) return;
        setRuntime(resolvedRuntime);
        setRuntimeError(null);
      })
      .catch(() => {
        if (!active) return;
        const message = "编辑器资源加载失败，请刷新后重试";
        setRuntimeError(message);
        latestOnEditorErrorRef.current?.(message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!runtime || !containerRef.current) return;
    let disposed = false;

    const { createUniver, LocaleType, mergeLocales, UniverPresetSheetsCoreZhCN, UniverSheetsCorePreset } = runtime;

    const { univerAPI } = createUniver({
      locale: LocaleType.ZH_CN,
      locales: {
        [LocaleType.ZH_CN]: mergeLocales(UniverPresetSheetsCoreZhCN),
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
        }),
      ],
    });

    const univerWorkbook = univerAPI.createWorkbook(workbookSnapshotToUniverData(workbook, LocaleType.ZH_CN));
    hydratingRef.current = true;
    applyWorkbookSnapshotToUniver(univerWorkbook, workbook);
    hydratingRef.current = false;
    lastAppliedExternalRef.current = workbookKey;
    lastInternalSnapshotRef.current = workbookKey;
    const captureSnapshot = () => univerDataToWorkbookSnapshot(univerWorkbook.save());
    onSnapshotCaptureReady?.(captureSnapshot);

    const syncWorkbookSnapshot = () => {
      if (hydratingRef.current) return;
      const saved = univerWorkbook.save();
      const nextSnapshot = univerDataToWorkbookSnapshot(saved);
      const nextKey = JSON.stringify(nextSnapshot);
      lastInternalSnapshotRef.current = nextKey;
      latestOnWorkbookChangeRef.current?.(nextSnapshot);
    };

    const syncSelectionState = () => {
      if (hydratingRef.current) return;
      const activeSheet = univerWorkbook.getActiveSheet();
      if (activeSheet && activeSheet.getSheetName() !== latestSelectedSheetNameRef.current) {
        latestOnSelectedSheetNameChangeRef.current?.(activeSheet.getSheetName());
      }
      const activeRange = univerWorkbook.getActiveRange();
      if (activeRange && latestOnSelectionChangeRef.current && latestSelectionEnabledRef.current) {
        const parsed = parseSheetAndRange(activeRange.getA1Notation(true));
        const range = parseRangeRef(parsed.rangeRef);
        if (range) {
          const nextSelection = normalizeSelection(
            parsed.sheetName || activeSheet?.getSheetName() || "",
            range.startRow,
            range.startCol,
            range.endRow,
            range.endCol,
          );
          if (!isSameSelection(latestSelectionRef.current, nextSelection)) {
            latestOnSelectionChangeRef.current(nextSelection);
          }
        }
      }
    };

    const disposables: Array<{ dispose: () => void }> = [
      univerWorkbook.onCommandExecuted(() => {
        syncWorkbookSnapshot();
        syncSelectionState();
      }),
      univerWorkbook.onSelectionChange(() => {
        syncSelectionState();
      }),
    ];

    bindingRef.current = { univerAPI, workbook: univerWorkbook, disposables };

    const applyPermissions = async () => {
      if (!restrictEditingToRange || !editableRange) return;
      const currentUser = getStoredUser();
      if (!currentUser?.id) {
        return;
      }
      const sheets = univerWorkbook.getSheets();
      for (const item of sheets) {
        await item.getWorksheetPermission().setReadOnly();
      }
      const targetSheet = univerWorkbook.getSheetByName(editableRange.sheetName);
      if (!targetSheet) return;
      const rangeRef = selectionToRangeRef(editableRange);
      await targetSheet.getWorksheetPermission().protectRanges([
        {
          ranges: [targetSheet.getRange(rangeRef)],
          options: {
            name: "editable-answer-range",
            allowEdit: true,
            allowedUsers: [String(currentUser.id)],
            allowViewByOthers: true,
          },
        },
      ]);
      targetSheet.getRange(rangeRef).activate();
    };

    void (async () => {
      await applyPermissions();
      await Promise.resolve();
      if (!disposed && bindingRef.current?.workbook === univerWorkbook) {
        latestOnEditorReadyRef.current?.();
      }
    })();

    return () => {
      disposed = true;
      onSnapshotCaptureReady?.(null);
      disposables.forEach((item) => item.dispose());
      univerAPI.dispose();
      bindingRef.current = null;
    };
  }, [instanceVersion, runtime, workbook, workbookKey, editableRange, restrictEditingToRange, onSnapshotCaptureReady]);

  useEffect(() => {
    const binding = bindingRef.current;
    if (!binding) return;
    if (lastInternalSnapshotRef.current === workbookKey || lastAppliedExternalRef.current === workbookKey) {
      lastAppliedExternalRef.current = workbookKey;
      return;
    }
    setInstanceVersion((current) => current + 1);
  }, [workbookKey]);

  useEffect(() => {
    const binding = bindingRef.current;
    if (!binding || !selectedSheetName) return;
    const sheet = binding.workbook.getSheetByName(selectedSheetName);
    if (sheet) {
      binding.workbook.setActiveSheet(sheet);
    }
  }, [selectedSheetName]);

  useEffect(() => {
    const binding = bindingRef.current;
    if (!binding || !focusRange) return;
    const nextRangeRef = selectionToRangeRef(focusRange);
    const nextFocusKey = `${focusRequestVersion}:${focusRange.sheetName}:${nextRangeRef}`;
    if (lastFocusedRangeKeyRef.current === nextFocusKey) {
      return;
    }

    const activeSheet = binding.workbook.getActiveSheet();
    const activeRange = binding.workbook.getActiveRange();
    const currentSheetName = activeSheet?.getSheetName() || "";
    const currentRangeRef = activeRange?.getA1Notation(false) || "";

    if (currentSheetName === focusRange.sheetName && currentRangeRef === nextRangeRef && focusRequestVersion === 0) {
      lastFocusedRangeKeyRef.current = nextFocusKey;
      return;
    }

    const sheet = binding.workbook.getSheetByName(focusRange.sheetName);
    if (!sheet) return;
    lastFocusedRangeKeyRef.current = nextFocusKey;
    binding.workbook.setActiveSheet(sheet);
    sheet.getRange(nextRangeRef).activate();
  }, [focusRange, focusRequestVersion]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextIsFullscreen = document.fullscreenElement === shellRef.current;
      setIsFullscreen(nextIsFullscreen);
      window.setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        setInstanceVersion((current) => current + 1);
      }, 80);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!shellRef.current) return;
    if (document.fullscreenElement === shellRef.current) {
      await document.exitFullscreen();
      return;
    }
    await shellRef.current.requestFullscreen();
  };

  useEffect(() => {
    if (!requestFullscreenVersion || !shellRef.current) return;
    if (document.fullscreenElement !== shellRef.current) {
      void shellRef.current.requestFullscreen();
    }
  }, [requestFullscreenVersion]);

  const resolvedViewportClassName = viewportClassName || (isFullscreen
    ? "h-[calc(100vh-3.5rem)] w-full"
    : "h-[640px] max-h-[70vh] w-full");

  const editorShell = (
    <div
      ref={shellRef}
      className={`relative isolate flex min-h-0 flex-col overflow-hidden bg-white ${isFullscreen ? "h-screen w-screen rounded-none border-0 shadow-none" : `rounded-[28px] border border-slate-200 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)] ${className}`}`}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Excel Editor
        </div>
        <div className="flex items-center gap-2">
          {isFullscreen && showConfirmSelectionButton && (
            <button
              type="button"
              onClick={onConfirmSelection}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#1677ff] px-4 text-sm font-bold text-white transition hover:bg-[#4096ff]"
            >
              {confirmSelectionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Expand size={14} />}
            {isFullscreen ? "退出全屏" : "全屏进入"}
          </button>
        </div>
      </div>
      <div className={resolvedViewportClassName}>
        {runtimeError ? (
          <div className="flex h-full items-center justify-center px-6 text-sm text-rose-500">
            {runtimeError}
          </div>
        ) : runtime ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-sm text-slate-400">
            首次加载编辑器组件中...
          </div>
        )}
      </div>
    </div>
  );

  return editorShell;
}
