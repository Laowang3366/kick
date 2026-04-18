# Excel Editor Preview Shell Design

## Goal

Improve the first entry experience for Excel-based practice and admin template editing pages.

Accepted interaction:

- The page should open immediately with a lightweight read-only workbook preview
- Full editing can take another 0.5 to 2 seconds to become available
- Once the editor runtime is ready, the real editor should take over without forcing the user to leave the page

## Current State

- `ExcelWorkbookEditor` is route-level lazy loaded
- Univer runtime is dynamically loaded and cached
- Editor resources are preheated from likely entry pages
- First real editor entry still shows a loading state while Univer runtime and editor setup complete

## Problem

Current first-entry behavior is technically improved but visually still blocks on editor initialization:

- users see a loading placeholder instead of workbook content
- they cannot inspect the sheet while the editor boots
- the wait feels longer than it is

## Chosen Approach

Introduce a lightweight read-only preview shell that renders immediately from the existing workbook snapshot, then hands off to the full editor when ready.

## Architecture

### 1. Add `ExcelWorkbookPreview`

Create a lightweight preview component that:

- does not depend on Univer
- renders directly from `ExcelWorkbookSnapshot`
- supports switching between workbook sheets
- renders a bounded visible grid from sheet cell data
- shows formulas as text with an `fx` marker
- highlights focus range and editable/answer range when provided
- is read-only by design

This component is meant to communicate workbook structure and answer area quickly, not replicate full Excel formatting.

### 2. Add editor-ready handoff state

Extend `ExcelWorkbookEditor` so the parent can know when the real editor is interactive.

The editor should expose a readiness callback once:

- Univer runtime is loaded
- workbook is created
- initial workbook snapshot is applied
- focus / permission setup needed for the current mode is completed

Until that callback fires, the parent keeps the preview shell visible.

### 3. Add preview shell wrapper at page entry points

Apply the preview-first behavior to:

- `Practice.tsx`
- `PracticeDetail.tsx`
- `AdminQuestions` inside `AdminConsole.tsx`

Each page will:

- render `ExcelWorkbookPreview` immediately from available workbook snapshot data
- mount `ExcelWorkbookEditor` in parallel
- show a compact “编辑器准备中” status while the editor boots
- fade or swap from preview shell to editor when the editor reports ready

### 4. Failure behavior

If editor runtime fails:

- keep the preview visible
- show a retry-oriented error message
- do not leave the user on a blank surface

## UX Behavior

### Practice detail

- User enters a question page
- Workbook preview appears immediately with current sheet and answer range context
- Editor boot status is visible but non-blocking
- Editor takes over once ready

### Practice submission page

- User opens the submission dialog or template workflow
- Preview appears immediately after workbook snapshot loads
- Editor takes over when ready

### Admin question template editor

- Admin opens create/edit question dialog with template workbook
- Preview appears immediately after template snapshot loads
- Editor takes over when ready

## Scope Boundaries

### In scope

- workbook snapshot based preview shell
- sheet switching inside preview
- focus range highlight
- answer/editable range highlight
- editor-ready handoff callback
- fallback on runtime failure

### Out of scope

- pixel-perfect Excel formatting
- merged-cell rendering fidelity
- formula recalculation in preview
- editing in preview mode
- backend preprocessing or image generation

## Implementation Notes

### Preview rendering strategy

Use workbook snapshot data already present in frontend state:

- derive active sheet from current selection logic
- compute visible occupied rows and columns
- clamp rendered area to a practical window to avoid huge DOM output
- fill empty cells as blank grid cells

### Handoff strategy

Avoid unmount/remount loops:

- mount editor once data is available
- keep preview overlay/sibling visible until editor readiness callback fires
- once editor is ready, hide preview and expose the editor surface

### State ownership

Pages remain the source of truth for:

- selected sheet
- workbook snapshot
- answer range / focus range
- submission/admin form state

The preview consumes those states but does not own them.

## Risks

- If preview grid bounds are too wide, DOM cost can offset the win
- If editor-ready is emitted too early, users may see a broken handoff
- If preview and editor sheet state diverge, handoff can feel jarring

## Verification

- add component tests for preview shell rendering from workbook snapshot
- add page-level tests proving preview is visible before editor ready
- add tests proving preview remains when runtime loading fails
- run `npm test`
- run `npm run build`
- deploy and verify production flows
