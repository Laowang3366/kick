import type { ComponentProps } from "react";
import { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ExcelWorkbookEditor } from "./ExcelWorkbookEditor";
import type { ExcelWorkbookSnapshot } from "../lib/excel";
import type { IWorkbookData, UniverRuntime } from "../lib/univer-runtime";

const { loadUniverRuntimeMock } = vi.hoisted(() => ({
  loadUniverRuntimeMock: vi.fn(),
}));

const { getStoredUserMock } = vi.hoisted(() => ({
  getStoredUserMock: vi.fn(),
}));

vi.mock("../lib/univer-runtime", async () => {
  const actual = await vi.importActual<typeof import("../lib/univer-runtime")>("../lib/univer-runtime");
  return {
    ...actual,
    loadUniverRuntime: loadUniverRuntimeMock,
  };
});

vi.mock("../lib/session-store", () => ({
  getStoredUser: getStoredUserMock,
}));

type Disposable = { dispose: () => void };

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function createMockWorkbook() {
  const permission = {
    setReadOnly: vi.fn().mockResolvedValue(undefined),
    protectRanges: vi.fn().mockResolvedValue(undefined),
  };
  const activeSheet = {
    getSheetName: () => "Sheet1",
    setName: vi.fn(),
    getRange: vi.fn(() => ({ setValue: vi.fn(), activate: vi.fn() })),
    getWorksheetPermission: vi.fn(() => permission),
  };

  const workbook = {
    getSheets: vi.fn(() => [activeSheet]),
    getActiveSheet: vi.fn(() => activeSheet),
    setActiveSheet: vi.fn(),
    insertSheet: vi.fn(),
    deleteSheet: vi.fn(),
    getSheetByName: vi.fn(() => activeSheet),
    getActiveRange: vi.fn(() => null),
    save: vi.fn(
      (): IWorkbookData => ({
        id: "wb",
        locale: "zhCN",
        name: "ExcelPractice",
        appVersion: "0.20.0",
        sheetOrder: ["sheet-1"],
        sheets: {
          "sheet-1": {
            id: "sheet-1",
            name: "Sheet1",
            rowCount: 20,
            columnCount: 10,
            cellData: {},
          },
        },
        styles: {},
      }),
    ),
    onCommandExecuted: vi.fn((): Disposable => ({ dispose: vi.fn() })),
    onSelectionChange: vi.fn((): Disposable => ({ dispose: vi.fn() })),
  };

  return { workbook, activeSheet, permission };
}

function createMockRuntime(mockWorkbook = createMockWorkbook()) {
  const univerAPI = {
    createWorkbook: vi.fn(() => mockWorkbook.workbook),
    dispose: vi.fn(),
  };

  const runtime: UniverRuntime = {
    createUniver: vi.fn(() => ({ univerAPI })),
    LocaleType: { ZH_CN: "zhCN" } as UniverRuntime["LocaleType"],
    mergeLocales: vi.fn(() => ({ zhCN: {} })) as UniverRuntime["mergeLocales"],
    UniverSheetsCorePreset: vi.fn(() => ({})) as UniverRuntime["UniverSheetsCorePreset"],
    UniverPresetSheetsCoreZhCN: {},
  };

  return { runtime, workbook: mockWorkbook.workbook, activeSheet: mockWorkbook.activeSheet, permission: mockWorkbook.permission, univerAPI };
}

const workbookSnapshot: ExcelWorkbookSnapshot = {
  sheets: [
    {
      name: "Sheet1",
      rowCount: 20,
      columnCount: 10,
      cells: {
        A1: { value: "hello", display: "hello" },
      },
    },
  ],
};

function renderEditor(props?: Partial<ComponentProps<typeof ExcelWorkbookEditor>>) {
  return render(
    <ExcelWorkbookEditor
      workbook={workbookSnapshot}
      selectedSheetName="Sheet1"
      onSelectedSheetNameChange={vi.fn()}
      {...props}
    />,
  );
}

describe("ExcelWorkbookEditor ready callbacks", () => {
  beforeEach(() => {
    loadUniverRuntimeMock.mockReset();
    getStoredUserMock.mockReset();
    getStoredUserMock.mockReturnValue({ id: 7 });
  });

  test("calls onEditorReady after runtime and workbook initialization complete", async () => {
    const deferred = createDeferred<UniverRuntime>();
    const onEditorReady = vi.fn();
    const { runtime, univerAPI } = createMockRuntime();
    loadUniverRuntimeMock.mockReturnValue(deferred.promise);

    renderEditor({ onEditorReady });

    expect(onEditorReady).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve(runtime);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(univerAPI.createWorkbook).toHaveBeenCalledTimes(1);
      expect(onEditorReady).toHaveBeenCalledTimes(1);
    });
  });

  test("calls onEditorError with the existing message when runtime loading fails", async () => {
    const onEditorError = vi.fn();
    loadUniverRuntimeMock.mockRejectedValue(new Error("boom"));

    renderEditor({ onEditorError });

    expect(await screen.findByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
    await waitFor(() => {
      expect(onEditorError).toHaveBeenCalledWith("编辑器资源加载失败，请刷新后重试");
    });
  });

  test("does not call onEditorReady before the editor is ready", async () => {
    vi.useFakeTimers();
    const deferred = createDeferred<UniverRuntime>();
    const permissionDeferred = createDeferred<void>();
    const onEditorReady = vi.fn();
    const mockWorkbook = createMockWorkbook();
    mockWorkbook.permission.setReadOnly.mockReturnValue(permissionDeferred.promise);
    loadUniverRuntimeMock.mockReturnValue(deferred.promise);

    renderEditor({
      onEditorReady,
      restrictEditingToRange: true,
      editableRange: { sheetName: "Sheet1", startRow: 1, startCol: 1, endRow: 2, endCol: 2 },
    });

    expect(onEditorReady).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve(createMockRuntime(mockWorkbook).runtime);
      await Promise.resolve();
    });

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(onEditorReady).not.toHaveBeenCalled();
    expect(mockWorkbook.permission.protectRanges).not.toHaveBeenCalled();

    await act(async () => {
      permissionDeferred.resolve();
      await permissionDeferred.promise;
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockWorkbook.permission.protectRanges).toHaveBeenCalledTimes(1);
    expect(onEditorReady).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  test("does not reload runtime or recreate workbook when only callback identities change", async () => {
    const onEditorReady = vi.fn();
    const onEditorError = vi.fn();
    const { runtime, univerAPI } = createMockRuntime();
    loadUniverRuntimeMock.mockResolvedValue(runtime);

    const view = renderEditor({ onEditorReady, onEditorError });

    await waitFor(() => {
      expect(univerAPI.createWorkbook).toHaveBeenCalledTimes(1);
      expect(onEditorReady).toHaveBeenCalledTimes(1);
    });

    const nextOnEditorReady = vi.fn();
    const nextOnEditorError = vi.fn();
    view.rerender(
      <ExcelWorkbookEditor
        workbook={workbookSnapshot}
        selectedSheetName="Sheet1"
        onSelectedSheetNameChange={vi.fn()}
        onEditorReady={nextOnEditorReady}
        onEditorError={nextOnEditorError}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadUniverRuntimeMock).toHaveBeenCalledTimes(1);
    expect(univerAPI.createWorkbook).toHaveBeenCalledTimes(1);
    expect(onEditorReady).toHaveBeenCalledTimes(1);
    expect(nextOnEditorReady).not.toHaveBeenCalled();
    expect(onEditorError).not.toHaveBeenCalled();
    expect(nextOnEditorError).not.toHaveBeenCalled();
  });

  test("does not recreate workbook when only onSnapshotCaptureReady identity changes", async () => {
    const initialCaptureReady = vi.fn();
    const nextCaptureReady = vi.fn();
    const { runtime, univerAPI } = createMockRuntime();
    loadUniverRuntimeMock.mockResolvedValue(runtime);

    const view = renderEditor({ onSnapshotCaptureReady: initialCaptureReady });

    await waitFor(() => {
      expect(loadUniverRuntimeMock).toHaveBeenCalledTimes(1);
      expect(univerAPI.createWorkbook).toHaveBeenCalledTimes(1);
      expect(initialCaptureReady).toHaveBeenCalledTimes(1);
    });

    view.rerender(
      <ExcelWorkbookEditor
        workbook={workbookSnapshot}
        selectedSheetName="Sheet1"
        onSelectedSheetNameChange={vi.fn()}
        onSnapshotCaptureReady={nextCaptureReady}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadUniverRuntimeMock).toHaveBeenCalledTimes(1);
    expect(univerAPI.createWorkbook).toHaveBeenCalledTimes(1);
    expect(initialCaptureReady).toHaveBeenCalledTimes(1);
    expect(nextCaptureReady).toHaveBeenCalledTimes(1);
    expect(initialCaptureReady).not.toHaveBeenCalledWith(null);
  });

  test("does not reload runtime or repeat editor error when only callback identities change after failure", async () => {
    const onEditorError = vi.fn();
    loadUniverRuntimeMock.mockRejectedValue(new Error("boom"));

    const view = renderEditor({ onEditorError });

    expect(await screen.findByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
    await waitFor(() => {
      expect(onEditorError).toHaveBeenCalledTimes(1);
    });

    const nextOnEditorReady = vi.fn();
    const nextOnEditorError = vi.fn();
    view.rerender(
      <ExcelWorkbookEditor
        workbook={workbookSnapshot}
        selectedSheetName="Sheet1"
        onSelectedSheetNameChange={vi.fn()}
        onEditorReady={nextOnEditorReady}
        onEditorError={nextOnEditorError}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadUniverRuntimeMock).toHaveBeenCalledTimes(1);
    expect(onEditorError).toHaveBeenCalledTimes(1);
    expect(nextOnEditorError).not.toHaveBeenCalled();
    expect(nextOnEditorReady).not.toHaveBeenCalled();
  });
});
