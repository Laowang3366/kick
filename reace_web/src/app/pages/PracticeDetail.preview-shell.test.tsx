import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PracticeDetail } from "./PracticeDetail";

const editorBehavior = {
  mode: "pending" as "pending" | "ready" | "error",
};

const editorLifecycle = {
  mounts: 0,
  unmounts: 0,
};

const practiceQuestion = {
  id: "detail-1",
  title: "练习详情题目",
  answerSheet: "Sheet1",
  answerRange: "B2:C3",
  difficulty: 2,
  score: 10,
  checkFormula: false,
  explanation: "说明文本",
  templateWorkbook: {
    sheets: [
      {
        name: "Sheet1",
        rowCount: 6,
        columnCount: 6,
        cells: {
          A1: { value: "标题", display: "标题" },
          B2: { value: "答案区", display: "答案区" },
        },
      },
      {
        name: "Sheet2",
        rowCount: 4,
        columnCount: 4,
        cells: {
          A1: { value: "第二张", display: "第二张" },
        },
      },
    ],
  },
};

const { scheduleExcelEditorPreload, navigate } = vi.hoisted(() => ({
  scheduleExcelEditorPreload: vi.fn(),
  navigate: vi.fn(),
}));

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}));

vi.mock("../lib/excel-editor-preload", () => ({
  scheduleExcelEditorPreload,
}));

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: apiPostMock,
  },
}));

vi.mock("react-router", () => ({
  useParams: () => ({ id: "detail-1" }),
  useLocation: () => ({ pathname: "/practice/1", state: {} }),
  useNavigate: () => navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useQuery: () => ({
    data: practiceQuestion,
    isError: false,
  }),
}));

vi.mock("../components/ExcelWorkbookEditor", () => ({
  ExcelWorkbookEditor: (props: any) => {
    useEffect(() => {
      editorLifecycle.mounts += 1;
      return () => {
        editorLifecycle.unmounts += 1;
      };
    }, []);

    useEffect(() => {
      const capture = () => ({
        sheets: [
          {
            name: "Sheet1",
            rowCount: 6,
            columnCount: 6,
            cells: {
              A1: { value: "旧快照", display: "旧快照" },
            },
          },
        ],
      });

      props.onSnapshotCaptureReady?.(capture);

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
    }, [props.onEditorError, props.onEditorReady]);

    return <div data-testid="mock-editor">真实编辑器 selected={props.selectedSheetName}</div>;
  },
}));

function renderPracticeDetail() {
  return render(<PracticeDetail />);
}

describe("PracticeDetail preview shell", () => {
  beforeEach(() => {
    editorBehavior.mode = "pending";
    editorLifecycle.mounts = 0;
    editorLifecycle.unmounts = 0;
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue({ firstPass: false, score: 0, recordId: "record-1" });
    navigate.mockReset();
  });

  test("shows preview shell and waiting status before the editor becomes ready", () => {
    renderPracticeDetail();

    expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sheet1" })).toBeInTheDocument();
    expect(screen.getByText("标题")).toBeInTheDocument();
  });

  test("hides the preview shell after the editor reports ready and keeps the active sheet", async () => {
    editorBehavior.mode = "ready";

    renderPracticeDetail();

    expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sheet1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sheet2" }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-editor")).toHaveTextContent("selected=Sheet2");
      expect(screen.queryByText("编辑器准备中")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sheet1" })).not.toBeInTheDocument();
      expect(screen.queryByText("标题")).not.toBeInTheDocument();
      expect(editorLifecycle.mounts).toBe(1);
    });
  });

  test("keeps the preview shell visible when the editor initialization fails", async () => {
    editorBehavior.mode = "error";

    renderPracticeDetail();

    await waitFor(() => {
      expect(screen.getByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sheet1" })).toBeInTheDocument();
      expect(screen.getByText("标题")).toBeInTheDocument();
    });
  });

  test("submits the current workbook instead of a stale editor snapshot before ready", async () => {
    renderPracticeDetail();

    fireEvent.click(screen.getByRole("button", { name: "提交答卷" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledTimes(1);
    });

    const [, payload] = apiPostMock.mock.calls[0];
    expect(payload.answers[0].userAnswer.sheets[0].cells.A1.value).toBe("标题");
    expect(payload.answers[0].userAnswer.sheets[0].cells.A1.value).not.toBe("旧快照");
  });

  test("submits the current workbook instead of a stale editor snapshot after an editor error", async () => {
    editorBehavior.mode = "error";

    renderPracticeDetail();

    await waitFor(() => {
      expect(screen.getByText("编辑器资源加载失败，请刷新后重试")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "提交答卷" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledTimes(1);
    });

    const [, payload] = apiPostMock.mock.calls[0];
    expect(payload.answers[0].userAnswer.sheets[0].cells.A1.value).toBe("标题");
    expect(payload.answers[0].userAnswer.sheets[0].cells.A1.value).not.toBe("旧快照");
  });
});
