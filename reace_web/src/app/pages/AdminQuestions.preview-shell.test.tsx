import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AdminQuestions } from "./AdminConsole";

const editorBehavior = {
  mode: "pending" as "pending" | "ready" | "error",
};

const invalidateQueries = vi.fn();

const { scheduleExcelEditorPreload, toastError, toastSuccess, navigate } = vi.hoisted(() => ({
  scheduleExcelEditorPreload: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  navigate: vi.fn(),
}));

const { apiGetMock, apiPostMock, apiPutMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

vi.mock("../components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open?: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../lib/api", () => ({
  ApiError: class extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    get: apiGetMock,
    post: apiPostMock,
    put: apiPutMock,
    delete: vi.fn(),
  },
}));

vi.mock("../lib/excel-editor-preload", () => ({
  scheduleExcelEditorPreload,
}));

vi.mock("../lib/session", () => ({
  useSession: () => ({
    user: { role: "admin", username: "admin", avatar: "" },
    isAuthenticated: true,
    loading: false,
  }),
}));

vi.mock("react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  Outlet: () => null,
  useLocation: () => ({ pathname: "/admin/questions" }),
  useNavigate: () => navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
    info: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries,
  }),
  useMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useQuery: vi.fn(({ queryKey }: any) => {
    const key = JSON.stringify(queryKey);
    if (key.includes("questions")) {
      return {
        data: {
          questions: [
            {
              id: 11,
              title: "后台题目",
              type: "excel_template",
              questionCategoryId: 1,
              difficulty: 2,
              points: 10,
              explanation: "说明",
              enabled: true,
              templateFileUrl: "https://example.com/template.xlsx",
              answerSheet: "Sheet1",
              answerRange: "B2:B2",
              answerSnapshotJson: "",
              checkFormula: false,
              gradingRuleJson: "",
              sheetCountLimit: 5,
              version: 1,
            },
          ],
          total: 1,
        },
      };
    }
    if (key.includes("questionCategories")) {
      return {
        data: [{ id: 1, name: "函数", enabled: true }],
      };
    }
    if (key.includes("practiceCampaignLevels")) {
      return { data: { records: [] } };
    }
    if (key.includes("practiceCampaignDaily")) {
      return { data: { record: null } };
    }
    return { data: undefined };
  }),
}));

vi.mock("../components/ExcelWorkbookEditor", () => ({
  ExcelWorkbookEditor: (props: any) => {
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

    return <div data-testid="mock-admin-editor">admin-editor</div>;
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
        B2: { value: "后台答案", display: "后台答案" },
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

function renderAdminQuestions() {
  return render(<AdminQuestions />);
}

async function openEditDialog() {
  apiGetMock.mockImplementation(async (url: string) => {
    if (String(url).startsWith("/api/admin/questions/template-snapshot")) {
      return templateSnapshot;
    }
    throw new Error(`Unexpected GET ${url}`);
  });
  apiPutMock.mockResolvedValue({ id: 11, title: "后台题目" });

  renderAdminQuestions();

  fireEvent.click(screen.getAllByRole("button", { name: "编辑" })[0]);

  await waitFor(() => {
    expect(screen.getByText("模板编辑器")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sheet1" })).toBeInTheDocument();
  });
}

describe("AdminQuestions preview shell", () => {
  beforeEach(() => {
    editorBehavior.mode = "pending";
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiPutMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    navigate.mockReset();
    invalidateQueries.mockReset();
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  });

  test("shows preview shell and waiting status before the editor becomes ready", async () => {
    await openEditDialog();

    expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
    expect(screen.getByTestId("admin-questions-preview-shell")).toBeInTheDocument();
  });

  test("hides the preview shell after the editor reports ready", async () => {
    editorBehavior.mode = "ready";

    await openEditDialog();

    await waitFor(() => {
      expect(screen.queryByText("编辑器准备中")).not.toBeInTheDocument();
      expect(screen.queryByTestId("admin-questions-preview-shell")).not.toBeInTheDocument();
      expect(screen.getByTestId("mock-admin-editor")).toBeInTheDocument();
    });
  });

  test("keeps the preview shell visible when editor initialization fails", async () => {
    editorBehavior.mode = "error";

    await openEditDialog();

    await waitFor(() => {
      expect(screen.getByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
      expect(screen.getByTestId("admin-questions-preview-shell")).toBeInTheDocument();
    });
  });

  test("uses the current workbook instead of a stale snapshot when saving after editor error", async () => {
    editorBehavior.mode = "error";

    await openEditDialog();

    await waitFor(() => {
      expect(screen.getByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "保存题目" }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith("/api/admin/questions/11", expect.any(Object));
    });

    const payload = apiPutMock.mock.calls[0][1];
    expect(JSON.parse(payload.answerSnapshotJson).values).toEqual([["后台答案"]]);
  });

  test("uses the current workbook instead of a stale snapshot when saving before ready", async () => {
    await openEditDialog();

    fireEvent.click(screen.getByRole("button", { name: "保存题目" }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith("/api/admin/questions/11", expect.any(Object));
    });

    const payload = apiPutMock.mock.calls[0][1];
    expect(JSON.parse(payload.answerSnapshotJson).values).toEqual([["后台答案"]]);
  });

  test("clears stale error state and exits fullscreen when closing then reopening", async () => {
    editorBehavior.mode = "error";
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: {},
    });

    await openEditDialog();

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

    await openEditDialog();

    expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
    expect(screen.queryByText("编辑器资源加载失败，请刷新后重试")).not.toBeInTheDocument();
  });

  test("ignores stale template snapshot responses after closing the dialog", async () => {
    const deferred = createDeferred<typeof templateSnapshot>();

    apiGetMock.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/api/admin/questions/template-snapshot")) {
        return deferred.promise;
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    apiPutMock.mockResolvedValue({ id: 11, title: "后台题目" });

    renderAdminQuestions();
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    deferred.resolve(templateSnapshot);

    await waitFor(() => {
      expect(screen.queryByText("编辑 Excel 模板题")).not.toBeInTheDocument();
      expect(screen.queryByTestId("admin-questions-preview-shell")).not.toBeInTheDocument();
    });
  });
});
