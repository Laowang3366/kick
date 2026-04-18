import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Practice } from "./Practice";

const editorBehavior = {
  mode: "pending" as "pending" | "ready" | "error",
};

const latestEditorProps: { current: any | null } = {
  current: null,
};

const invalidateQueries = vi.fn();

const { scheduleExcelEditorPreload, navigate, toastError, toastSuccess } = vi.hoisted(() => ({
  scheduleExcelEditorPreload: vi.fn(),
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

const { apiGetMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("../components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open?: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../lib/api", () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}));

vi.mock("../lib/excel-editor-preload", () => ({
  scheduleExcelEditorPreload,
}));

vi.mock("../lib/session", () => ({
  useSession: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries,
  }),
  useQuery: vi.fn(({ queryKey }: any) => {
    const key = JSON.stringify(queryKey);
    if (key.includes("practice") && key.includes("categories")) {
      return { data: { categories: [{ id: 1, name: "函数" }] } };
    }
    if (key.includes("practice") && key.includes("questionList")) {
      return { data: { questions: [] } };
    }
    if (key.includes("practice") && key.includes("leaderboard")) {
      return { data: { records: [] } };
    }
    if (key.includes("practice") && key.includes("submissions")) {
      return { data: { records: [], total: 0, pages: 1 }, isLoading: false };
    }
    return { data: undefined, isLoading: false };
  }),
  useMutation: ({ mutationFn, onSuccess }: any) => ({
    isPending: false,
    mutateAsync: async () => {
      const result = await mutationFn();
      await onSuccess?.(result);
      return result;
    },
  }),
}));

vi.mock("../components/ExcelWorkbookEditor", () => ({
  ExcelWorkbookEditor: (props: any) => {
    latestEditorProps.current = props;

    useEffect(() => {
      const staleSnapshot = () => ({
        sheets: [
          {
            name: "Sheet1",
            rowCount: 4,
            columnCount: 4,
            cells: {
              B2: { value: "旧快照", display: "旧快照" },
            },
          },
        ],
      });
      props.onSnapshotCaptureReady?.(staleSnapshot);

      if (editorBehavior.mode === "ready") {
        const timer = window.setTimeout(() => {
          props.onEditorReady?.();
        }, 0);
        return () => window.clearTimeout(timer);
      }
      if (editorBehavior.mode === "error") {
        const timer = window.setTimeout(() => {
          props.onEditorError?.("编辑器资源加载失败，请刷新后重试");
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return undefined;
    }, [props.onEditorError, props.onEditorReady, props.onSnapshotCaptureReady]);

    return (
      <div data-testid="mock-editor">
        <div>editor-sheet={props.selectedSheetName}</div>
        {props.showConfirmSelectionButton ? (
          <button
            type="button"
            onClick={() => {
              props.onSelectionChange?.({
                sheetName: props.selectedSheetName || "Sheet1",
                startRow: 2,
                startCol: 2,
                endRow: 2,
                endCol: 2,
              });
              props.onConfirmSelection?.();
            }}
          >
            确认区域
          </button>
        ) : null}
      </div>
    );
  },
}));

const templateSnapshot = {
  sheets: [
    {
      name: "Sheet1",
      rowCount: 4,
      columnCount: 4,
      cells: {
        A1: { value: "标题", display: "标题" },
        B2: { value: "模板答案", display: "模板答案" },
      },
    },
    {
      name: "Sheet2",
      rowCount: 2,
      columnCount: 2,
      cells: {
        A1: { value: "第二张", display: "第二张" },
      },
    },
  ],
};

function renderPractice() {
  return render(<Practice />);
}

async function openSubmissionWithTemplate() {
  const view = renderPractice();

  fireEvent.click(screen.getAllByRole("button", { name: "上传试题" })[0]);

  const fileInput = view.container.querySelector('input[type="file"]');
  expect(fileInput).not.toBeNull();

  apiPostMock.mockImplementation(async (url: string, payload: any) => {
    if (url === "/api/upload") {
      return { url: "https://example.com/template.xlsx" };
    }
    if (url === "/api/practice/submissions") {
      return { id: 1, payload };
    }
    throw new Error(`Unexpected POST ${url}`);
  });
  apiGetMock.mockImplementation(async (url: string) => {
    if (String(url).startsWith("/api/practice/template-snapshot")) {
      return templateSnapshot;
    }
    throw new Error(`Unexpected GET ${url}`);
  });

  fireEvent.change(fileInput as HTMLInputElement, {
    target: {
      files: [new File(["excel"], "template.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
    },
  });

  await waitFor(() => {
    expect(screen.getByText("模板编辑器")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sheet1" })).toBeInTheDocument();
  });

  fireEvent.change(screen.getByRole("textbox", { name: "题目标题" }), {
    target: { value: "投稿题目" },
  });

  fireEvent.click(screen.getByRole("button", { name: "选择区域" }));
  fireEvent.click(await screen.findByRole("button", { name: "确认区域" }));

  await waitFor(() => {
    expect(screen.getByDisplayValue("B2")).toBeInTheDocument();
  });

  return view;
}

describe("Practice preview shell", () => {
  beforeEach(() => {
    editorBehavior.mode = "pending";
    latestEditorProps.current = null;
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    navigate.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    invalidateQueries.mockReset();
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  });

  test("shows preview shell and waiting status before the editor becomes ready", async () => {
    await openSubmissionWithTemplate();

    expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
    expect(screen.getByTestId("practice-preview-shell")).toBeInTheDocument();
  });

  test("hides the preview shell after the editor reports ready", async () => {
    editorBehavior.mode = "ready";

    await openSubmissionWithTemplate();

    await waitFor(() => {
      expect(screen.queryByText("编辑器准备中")).not.toBeInTheDocument();
      expect(screen.queryByTestId("practice-preview-shell")).not.toBeInTheDocument();
      expect(screen.getByTestId("mock-editor")).toBeInTheDocument();
    });
  });

  test("uses the current workbook instead of a stale snapshot while pending", async () => {
    await openSubmissionWithTemplate();

    fireEvent.click(screen.getByRole("button", { name: "提交试题" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("/api/practice/submissions", expect.any(Object));
    });

    const submissionCall = apiPostMock.mock.calls.find(([url]) => url === "/api/practice/submissions");
    expect(submissionCall).toBeTruthy();
    const payload = submissionCall?.[1];
    expect(JSON.parse(payload.answerSnapshotJson).values).toEqual([["模板答案"]]);
  });

  test("uses the current workbook instead of a stale snapshot after editor error", async () => {
    editorBehavior.mode = "error";

    await openSubmissionWithTemplate();

    await waitFor(() => {
      expect(screen.getByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
      expect(screen.getByTestId("practice-preview-shell")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "提交试题" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("/api/practice/submissions", expect.any(Object));
    });

    const submissionCall = apiPostMock.mock.calls.find(([url]) => url === "/api/practice/submissions");
    expect(submissionCall).toBeTruthy();
    const payload = submissionCall?.[1];
    expect(JSON.parse(payload.answerSnapshotJson).values).toEqual([["模板答案"]]);
  });

  test("clears stale error state and exits fullscreen when closing then reopening", async () => {
    editorBehavior.mode = "error";
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: {},
    });

    const view = await openSubmissionWithTemplate();

    await waitFor(() => {
      expect(screen.getByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
    });

    vi.mocked(document.exitFullscreen).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("题目标题")).not.toBeInTheDocument();
    });

    editorBehavior.mode = "pending";
    fireEvent.click(screen.getAllByRole("button", { name: "上传试题" })[0]);

    const fileInput = view.container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [new File(["excel"], "template.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("模板编辑器")).toBeInTheDocument();
    });

    expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
    expect(screen.queryByText("编辑器资源加载失败，请刷新后重试")).not.toBeInTheDocument();
  });

  test("ignores stale template snapshot responses after closing the dialog", async () => {
    const deferred = createDeferred<typeof templateSnapshot>();

    apiPostMock.mockImplementation(async (url: string) => {
      if (url === "/api/upload") {
        return { url: "https://example.com/template.xlsx" };
      }
      throw new Error(`Unexpected POST ${url}`);
    });
    apiGetMock.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/api/practice/template-snapshot")) {
        return deferred.promise;
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const view = renderPractice();
    fireEvent.click(screen.getByRole("button", { name: "上传试题" }));

    const fileInput = view.container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [new File(["excel"], "template.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    deferred.resolve(templateSnapshot);

    await waitFor(() => {
      expect(screen.queryByText("模板编辑器")).not.toBeInTheDocument();
      expect(screen.queryByTestId("practice-preview-shell")).not.toBeInTheDocument();
    });
  });
});
