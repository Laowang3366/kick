# Excel 编辑器预览壳层实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为练习页、练习详情页和后台题目模板编辑页增加“只读预览壳层先秒开，真实编辑器稍后接管”的体验。

**Architecture:** 新增一个不依赖 Univer 的 `ExcelWorkbookPreview` 组件，直接基于 `ExcelWorkbookSnapshot` 渲染轻量工作表预览；扩展 `ExcelWorkbookEditor`，让父页面可以收到“编辑器已可交互”的回调；三个入口页并行挂载预览层和真实编辑器，在编辑器 ready 前展示预览层，ready 后切换为可编辑态，失败时保留预览层并给出错误提示。

**Tech Stack:** React 18、TypeScript、Vite、Vitest、Testing Library、现有 `ExcelWorkbookSnapshot` 前端数据结构

---

### Task 1: 预览组件与基础测试

**Files:**
- Create: `reace_web/src/app/components/ExcelWorkbookPreview.tsx`
- Create: `reace_web/src/app/components/ExcelWorkbookPreview.test.tsx`
- Test: `reace_web/src/app/components/ExcelWorkbookPreview.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定预览组件的基础行为**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ExcelWorkbookPreview } from "./ExcelWorkbookPreview";

describe("ExcelWorkbookPreview", () => {
  test("renders workbook cells, fx marker, and highlighted focus range", () => {
    render(
      <ExcelWorkbookPreview
        workbook={{
          sheets: [
            {
              name: "Sheet1",
              rowCount: 20,
              columnCount: 10,
              cells: {
                A1: { value: "标题" },
                B2: { formula: "SUM(A1:A3)", value: 6 },
              },
            },
          ],
        }}
        selectedSheetName="Sheet1"
        focusRange={{ sheetName: "Sheet1", startRow: 2, startCol: 2, endRow: 2, endCol: 2 }}
      />
    );

    expect(screen.getByText("标题")).toBeInTheDocument();
    expect(screen.getByText("=SUM(A1:A3)")).toBeInTheDocument();
    expect(screen.getByText("fx")).toBeInTheDocument();
    expect(screen.getByTestId("preview-cell-B2")).toHaveAttribute("data-focused", "true");
  });
});
```

- [ ] **Step 2: 运行测试并确认它先失败**

Run: `npm test -- ExcelWorkbookPreview.test.tsx`

Expected: FAIL，提示 `Cannot find module "./ExcelWorkbookPreview"` 或渲染断言失败。

- [ ] **Step 3: 复用现有 `excel.ts` 辅助方法，避免预览组件重复写解析逻辑**

实现中优先复用已有能力，例如：

- `columnIndexToLabel`
- `getSheetSnapshot`
- `resolveSheetBounds`
- `isCellInSelection`
- `toCellRef`

- [ ] **Step 4: 实现最小可用的 `ExcelWorkbookPreview`**

```tsx
type ExcelWorkbookPreviewProps = {
  workbook: ExcelWorkbookSnapshot;
  selectedSheetName: string;
  onSelectedSheetNameChange?: (sheetName: string) => void;
  focusRange?: ExcelRangeSelection | null;
  editableRange?: ExcelRangeSelection | null;
  statusText?: string;
  errorText?: string | null;
};

export function ExcelWorkbookPreview({
  workbook,
  selectedSheetName,
  onSelectedSheetNameChange,
  focusRange = null,
  editableRange = null,
  statusText,
  errorText,
}: ExcelWorkbookPreviewProps) {
  const sheets = workbook.sheets || [];
  const activeSheet = sheets.find((item) => item.name === selectedSheetName) || sheets[0] || null;
  const bounds = getPreviewBounds(activeSheet);
  const rows = buildPreviewRows(activeSheet, bounds);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Excel Preview</div>
        <div className="text-xs font-medium text-slate-400">{errorText || statusText || "只读预览"}</div>
      </div>
      <div className="flex gap-2 border-b border-slate-200 px-4 py-2">
        {sheets.map((sheet) => (
          <button
            key={sheet.name}
            type="button"
            onClick={() => onSelectedSheetNameChange?.(sheet.name)}
            className={sheet.name === activeSheet?.name ? "rounded-full bg-slate-900 px-3 py-1 text-xs text-white" : "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500"}
          >
            {sheet.name}
          </button>
        ))}
      </div>
      <div className="overflow-auto p-4">
        <table className="min-w-full border-collapse">
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                {row.cells.map((cell) => (
                  <td
                    key={cell.ref}
                    data-testid={`preview-cell-${cell.ref}`}
                    data-focused={cell.focused ? "true" : "false"}
                    className={cell.className}
                  >
                    {cell.formula ? <span className="mr-1 inline-flex rounded bg-slate-900 px-1.5 text-[10px] text-white">fx</span> : null}
                    <span>{cell.displayValue}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 再跑测试，确认预览基础行为通过**

Run: `npm test -- ExcelWorkbookPreview.test.tsx`

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add reace_web/src/app/components/ExcelWorkbookPreview.tsx reace_web/src/app/components/ExcelWorkbookPreview.test.tsx reace_web/src/app/lib/excel.ts
git commit -m "feat: add excel workbook preview shell"
```

实际实现中未修改 `reace_web/src/app/lib/excel.ts`，提交范围应以预览组件与测试文件为准。

### Task 2: 编辑器 ready 回调与失败保留预览

**Files:**
- Modify: `reace_web/src/app/components/ExcelWorkbookEditor.tsx`
- Create: `reace_web/src/app/components/ExcelWorkbookEditor.ready.test.tsx`
- Test: `reace_web/src/app/components/ExcelWorkbookEditor.ready.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定编辑器 ready 回调与失败状态**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ExcelWorkbookEditor } from "./ExcelWorkbookEditor";

const onReady = vi.fn();

vi.mock("../lib/univer-runtime", () => ({
  loadUniverRuntime: vi.fn(async () => ({
    createUniver: () => ({
      univerAPI: {
        createWorkbook: () => ({
          getSheets: () => [],
          getActiveSheet: () => ({ setName: vi.fn(), getSheetName: () => "Sheet1" }),
          setActiveSheet: vi.fn(),
          save: () => ({ sheetOrder: [], sheets: {} }),
          onCommandExecuted: () => ({ dispose: vi.fn() }),
          onSelectionChange: () => ({ dispose: vi.fn() }),
          getActiveRange: () => null,
        }),
        dispose: vi.fn(),
      },
    }),
    LocaleType: { ZH_CN: "zh-CN" },
    mergeLocales: vi.fn(() => ({})),
    UniverSheetsCorePreset: vi.fn(() => ({})),
    UniverPresetSheetsCoreZhCN: {},
  })),
}));

describe("ExcelWorkbookEditor ready", () => {
  test("calls onEditorReady after runtime and workbook init finish", async () => {
    render(
      <ExcelWorkbookEditor
        workbook={{ sheets: [] }}
        selectedSheetName=""
        onSelectedSheetNameChange={() => undefined}
        onEditorReady={onReady}
      />
    );

    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认它先失败**

Run: `npm test -- ExcelWorkbookEditor.ready.test.tsx`

Expected: FAIL，提示缺少 `onEditorReady` 属性或 ready 回调未触发。

- [ ] **Step 3: 给 `ExcelWorkbookEditor` 增加最小 ready / error 通知能力**

```tsx
type ExcelWorkbookEditorProps = {
  // existing props...
  onEditorReady?: () => void;
  onEditorError?: (message: string) => void;
};

useEffect(() => {
  let disposed = false;
  loadUniverRuntime()
    .then((resolvedRuntime) => {
      if (disposed) return;
      setRuntime(resolvedRuntime);
      setRuntimeError(null);
    })
    .catch(() => {
      if (disposed) return;
      const message = "编辑器资源加载失败，请刷新后重试";
      setRuntimeError(message);
      onEditorError?.(message);
    });
  return () => {
    disposed = true;
  };
}, [onEditorError]);

// 在 workbook 初始化和权限/焦点应用完成后：
onEditorReady?.();
```

- [ ] **Step 4: 如果 `onEditorReady` 触发时机过早，补一条失败回归测试**

```tsx
test("does not call onEditorReady before workbook binding exists", async () => {
  // mock runtime promise unresolved
  // assert callback not called while loading state visible
});
```

- [ ] **Step 5: 再跑测试，确认 ready 行为通过**

Run: `npm test -- ExcelWorkbookEditor.ready.test.tsx`

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add reace_web/src/app/components/ExcelWorkbookEditor.tsx reace_web/src/app/components/ExcelWorkbookEditor.ready.test.tsx reace_web/src/app/lib/univer-runtime.ts
git commit -m "feat: expose excel editor ready state"
```

实际实现中未修改 `reace_web/src/app/lib/univer-runtime.ts`，提交范围应以编辑器组件与 ready 测试文件为准。

### Task 3: 练习详情页接入预览壳层并验证切换

**Files:**
- Modify: `reace_web/src/app/pages/PracticeDetail.tsx`
- Modify: `reace_web/src/app/pages/PracticeDetail.preheat.test.tsx`
- Create: `reace_web/src/app/pages/PracticeDetail.preview-shell.test.tsx`
- Test: `reace_web/src/app/pages/PracticeDetail.preview-shell.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定“先预览后接管”的行为**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PracticeDetail } from "./PracticeDetail";

vi.mock("../components/ExcelWorkbookEditor", () => ({
  ExcelWorkbookEditor: ({ onEditorReady }: any) => {
    setTimeout(() => onEditorReady?.(), 0);
    return <div>真实编辑器</div>;
  },
}));

test("shows preview shell before editor becomes ready", async () => {
  render(<PracticeDetail />);
  expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
  expect(screen.getByText("只读预览")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText("只读预览")).not.toBeInTheDocument();
    expect(screen.getByText("真实编辑器")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试并确认它先失败**

Run: `npm test -- PracticeDetail.preview-shell.test.tsx`

Expected: FAIL，当前页面还没有预览层和接管逻辑。

- [ ] **Step 3: 在 `PracticeDetail.tsx` 增加最小壳层状态管理**

```tsx
const [editorReady, setEditorReady] = useState(false);
const [editorError, setEditorError] = useState<string | null>(null);

useEffect(() => {
  setEditorReady(false);
  setEditorError(null);
}, [question?.id]);

const previewWorkbook = currentWorkbook;

// render:
{!editorReady ? (
  <ExcelWorkbookPreview
    workbook={previewWorkbook}
    selectedSheetName={currentSheetName}
    onSelectedSheetNameChange={setSelectedSheetName}
    focusRange={editableRange}
    editableRange={editableRange}
    statusText={editorError ? undefined : "编辑器准备中"}
    errorText={editorError}
  />
) : null}

<ExcelWorkbookEditor
  // existing props...
  onEditorReady={() => setEditorReady(true)}
  onEditorError={setEditorError}
/>
```

- [ ] **Step 4: 再跑详情页测试，确认壳层切换通过**

Run: `npm test -- PracticeDetail.preview-shell.test.tsx`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add reace_web/src/app/pages/PracticeDetail.tsx reace_web/src/app/pages/PracticeDetail.preview-shell.test.tsx reace_web/src/app/pages/PracticeDetail.preheat.test.tsx
git commit -m "feat: add preview shell to practice detail"
```

### Task 4: 练习提交页与后台题目编辑接入预览壳层

**Files:**
- Modify: `reace_web/src/app/pages/Practice.tsx`
- Modify: `reace_web/src/app/pages/AdminConsole.tsx`
- Create: `reace_web/src/app/pages/Practice.preview-shell.test.tsx`
- Create: `reace_web/src/app/pages/AdminQuestions.preview-shell.test.tsx`
- Test: `reace_web/src/app/pages/Practice.preview-shell.test.tsx`
- Test: `reace_web/src/app/pages/AdminQuestions.preview-shell.test.tsx`

- [ ] **Step 1: 为练习提交页写失败测试**

```tsx
test("shows workbook preview while submission editor is still booting", async () => {
  render(<Practice />);
  // mock template loaded state
  expect(screen.getByText("编辑器准备中")).toBeInTheDocument();
  expect(screen.getByText("只读预览")).toBeInTheDocument();
});
```

- [ ] **Step 2: 为后台题目模板配置写失败测试**

```tsx
test("keeps preview visible in admin question dialog until editor is ready", async () => {
  render(<AdminQuestions />);
  // mock open dialog + template snapshot
  expect(screen.getByText("只读预览")).toBeInTheDocument();
});
```

- [ ] **Step 3: 运行测试并确认它们先失败**

Run: `npm test -- Practice.preview-shell.test.tsx AdminQuestions.preview-shell.test.tsx`

Expected: FAIL

- [ ] **Step 4: 在 `Practice.tsx` 接入预览壳层**

```tsx
const [editorReady, setEditorReady] = useState(false);
const [editorError, setEditorError] = useState<string | null>(null);

useEffect(() => {
  setEditorReady(false);
  setEditorError(null);
}, [editorWorkbook, selectedSheetName]);

// keep preview visible until editor ready
```

实现时还需要补充：

- 提交时仅在 `editorReady && !editorError` 时优先使用 snapshot getter
- 关闭弹窗、重置状态时清空 getter / ready / error
- 模板快照加载使用 request id 防 stale 回写
- 关闭弹窗或取消选区时退出 fullscreen

- [ ] **Step 5: 在 `AdminConsole.tsx` 的 `AdminQuestions` 区块接入同样逻辑**

```tsx
const [editorReady, setEditorReady] = useState(false);
const [editorError, setEditorError] = useState<string | null>(null);

const resetEditorState = () => {
  setEditorReady(false);
  setEditorError(null);
  // existing resets...
};
```

实现时还需要补充：

- 保存时仅在 `editorReady && !editorError` 时优先使用 snapshot getter
- 关闭弹窗、重置状态时清空 getter / ready / error
- 模板快照加载使用 request id 防 stale 回写
- 关闭弹窗或取消选区时退出 fullscreen

- [ ] **Step 6: 再跑页面测试，确认两个入口都通过**

Run: `npm test -- Practice.preview-shell.test.tsx AdminQuestions.preview-shell.test.tsx`

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add reace_web/src/app/pages/Practice.tsx reace_web/src/app/pages/AdminConsole.tsx reace_web/src/app/pages/Practice.preview-shell.test.tsx reace_web/src/app/pages/AdminQuestions.preview-shell.test.tsx
git commit -m "feat: add preview shell to excel editor entry points"
```

### Task 5: 全量前端验证与发布

**Files:**
- Modify: `docs/superpowers/specs/2026-04-18-excel-editor-preview-shell-design.md`
- Modify: `docs/superpowers/plans/2026-04-18-excel-editor-preview-shell.md`
- Test: `reace_web/src/app/components/ExcelWorkbookPreview.test.tsx`
- Test: `reace_web/src/app/components/ExcelWorkbookEditor.ready.test.tsx`
- Test: `reace_web/src/app/pages/PracticeDetail.preview-shell.test.tsx`
- Test: `reace_web/src/app/pages/Practice.preview-shell.test.tsx`
- Test: `reace_web/src/app/pages/AdminQuestions.preview-shell.test.tsx`

- [ ] **Step 1: 跑新增与现有前端测试**

Run: `npm test`

Expected: 所有 Vitest 用例通过，包含新增预览壳层与 ready 回归测试。

- [ ] **Step 2: 跑生产构建**

Run: `npm run build`

Expected: 构建成功，生成新的 `dist/assets/ExcelWorkbookEditor-*.js` 与预览相关产物。

- [ ] **Step 3: 自检 spec 与计划文档是否与最终实现一致**

```md
- 检查 spec 中的 “编辑器准备中 / 失败保留预览 / 三个入口页接入”
- 检查 spec 中是否补充了 stale load 防串写与 fullscreen 清理
- 检查 plan 中的文件路径、组件名、回调名是否与最终代码一致
- 如有不一致，同步修正文档
```

- [ ] **Step 4: 提交收尾**

```bash
git add reace_web docs/superpowers/specs/2026-04-18-excel-editor-preview-shell-design.md docs/superpowers/plans/2026-04-18-excel-editor-preview-shell.md
git commit -m "test: cover excel editor preview shell"
```

- [ ] **Step 5: 推送分支并部署**

Run:

```bash
git push origin feature/review-onboarding-search
```

Then deploy with the existing production flow:

```bash
cd /www/wwwroot/kick-deploy/repo
git fetch origin
git checkout feature/review-onboarding-search
git reset --hard <latest-commit>
bash scripts/deploy/production-deploy.sh
systemctl is-active kick-backend.service
curl -I -k --max-time 20 https://www.excelcc.cn
```

Expected:

- backend service is `active`
- site responds `HTTP/2 200`

