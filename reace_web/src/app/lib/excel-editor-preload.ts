import { preloadUniverRuntime } from "./univer-runtime";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

let componentModulePromise: Promise<unknown> | null = null;
let preloadPromise: Promise<void> | null = null;
let scheduleHandle: number | null = null;

function importExcelWorkbookEditor() {
  if (!componentModulePromise) {
    componentModulePromise = import("../components/ExcelWorkbookEditor");
  }
  return componentModulePromise;
}

export function preloadExcelEditorResources() {
  if (!preloadPromise) {
    preloadPromise = Promise.all([
      importExcelWorkbookEditor(),
      preloadUniverRuntime(),
    ]).then(() => undefined);
  }
  return preloadPromise;
}

export function scheduleExcelEditorPreload() {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  if (scheduleHandle !== null) {
    return () => undefined;
  }

  const idleWindow = window as IdleWindow;
  const run = () => {
    scheduleHandle = null;
    void preloadExcelEditorResources();
  };

  if (idleWindow.requestIdleCallback) {
    scheduleHandle = idleWindow.requestIdleCallback(run, { timeout: 1500 });
    return () => {
      if (scheduleHandle !== null) {
        idleWindow.cancelIdleCallback?.(scheduleHandle);
        scheduleHandle = null;
      }
    };
  }

  scheduleHandle = window.setTimeout(run, 250);
  return () => {
    if (scheduleHandle !== null) {
      window.clearTimeout(scheduleHandle);
      scheduleHandle = null;
    }
  };
}
