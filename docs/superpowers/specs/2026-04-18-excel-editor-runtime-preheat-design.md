# Excel Editor Runtime Preheat Design

## Goal

Improve the perceived speed of entering Excel-based practice and admin template editing flows. The accepted tradeoff is:

- First editor entry may still be slow
- Subsequent in-app transitions should be faster

## Current State

- `ExcelWorkbookEditor` is already route-level lazy loaded in:
  - `Practice.tsx`
  - `PracticeDetail.tsx`
  - `AdminConsole.tsx`
- The editor component still statically imports `@univerjs/presets`, `@univerjs/preset-sheets-core`, locale data, and CSS.
- Because of those static imports, the editor chunk is heavy and all Univer runtime setup still happens on the critical path of the first editor mount.

## Chosen Approach

Use runtime-level caching plus page-level preheat.

### 1. Extract a Univer runtime loader

Create a dedicated loader module that:

- Dynamically imports `@univerjs/presets`
- Dynamically imports `@univerjs/preset-sheets-core`
- Dynamically imports `@univerjs/preset-sheets-core/locales/zh-CN`
- Dynamically imports `@univerjs/preset-sheets-core/lib/index.css`
- Caches the resolved runtime in module scope
- Exposes both `loadUniverRuntime()` and `preloadUniverRuntime()`

This moves heavy editor runtime dependencies out of the component top level and makes them reusable across page transitions.

### 2. Keep the editor component lazy loaded

`ExcelWorkbookEditor` remains route-level lazy loaded, but it will no longer statically pull Univer runtime packages at module evaluation time.

Instead, on mount it will:

- wait for `loadUniverRuntime()`
- initialize the workbook only after runtime is ready
- render a loading shell while runtime is resolving

### 3. Add page-level resource preheat

Create a small preheat utility for Excel editor resources that:

- preloads the `ExcelWorkbookEditor` component chunk
- preloads the cached Univer runtime
- runs only once per browser session

Call it from:

- `Practice.tsx`
- `PracticeDetail.tsx`
- `AdminQuestions` inside `AdminConsole.tsx`

The preheat should run after the page becomes idle, so it does not compete with the initial route render.

## Behavior Expectations

- First visit to an editor-capable page can begin warming editor resources in the background
- First actual editor mount still pays initialization cost if warmup did not complete yet
- Later transitions between practice detail, practice submission, and admin question editing reuse browser/module cache and the Univer runtime loader cache

## Risks

- Dynamic CSS loading must still apply before editor initialization; otherwise editor layout may flash incorrectly
- Idle preheat must be guarded to avoid repeated imports on every rerender
- Admin preheat scope must stay limited to `AdminQuestions`, not the entire admin shell

## Verification

- Add a frontend test covering page-level preheat trigger
- Add a frontend test covering Univer runtime loader caching
- Run `npm test`
- Run `npm run build`
- Deploy and verify production build logs no longer show avoidable editor-loading warnings
