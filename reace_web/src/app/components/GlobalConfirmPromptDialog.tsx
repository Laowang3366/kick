import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "./ui/alert-dialog";

const GLOBAL_DIALOG_EVENT = "excel-forum-global-confirm-prompt";

type GlobalConfirmPayload = {
  kind: "confirm";
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
};

type GlobalPromptPayload = {
  kind: "prompt";
  title?: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "password";
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  resolve: (value: string | null) => void;
};

type GlobalDialogPayload = GlobalConfirmPayload | GlobalPromptPayload;

export function openGlobalConfirm(options: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(
      new CustomEvent<GlobalConfirmPayload>(GLOBAL_DIALOG_EVENT, {
        detail: { kind: "confirm", ...options, resolve },
      })
    );
  });
}

export function openGlobalPrompt(options: {
  title?: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "password";
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
}): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    window.dispatchEvent(
      new CustomEvent<GlobalPromptPayload>(GLOBAL_DIALOG_EVENT, {
        detail: { kind: "prompt", ...options, resolve },
      })
    );
  });
}

export function GlobalConfirmPromptDialog() {
  const [payload, setPayload] = useState<GlobalDialogPayload | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const payloadRef = useRef<GlobalDialogPayload | null>(null);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<GlobalDialogPayload>).detail;
      if (payloadRef.current) {
        const prev = payloadRef.current;
        if (prev.kind === "confirm") prev.resolve(false);
        else prev.resolve(null);
      }
      if (detail.kind === "prompt") {
        setPromptValue(detail.defaultValue ?? "");
      }
      setPayload(detail);
    };
    window.addEventListener(GLOBAL_DIALOG_EVENT, handleEvent);
    return () => window.removeEventListener(GLOBAL_DIALOG_EVENT, handleEvent);
  }, []);

  const dismiss = (value: boolean | string | null) => {
    if (!payload) return;
    if (payload.kind === "confirm") payload.resolve(value as boolean);
    else payload.resolve(value as string | null);
    setPayload(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (payload?.kind === "confirm") dismiss(false);
      else dismiss(null);
    }
  };

  const handleConfirm = () => {
    if (!payload) return;
    if (payload.kind === "confirm") {
      dismiss(true);
    } else {
      if (payload.required && !promptValue.trim()) return;
      dismiss(promptValue);
    }
  };

  if (!payload) return null;

  const isPrompt = payload.kind === "prompt";
  const isDestructive = payload.kind === "confirm" && payload.destructive;
  const promptPayload = isPrompt ? (payload as GlobalPromptPayload) : null;

  return (
    <AlertDialog open={Boolean(payload)} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="w-[min(calc(100vw-1rem),420px)] rounded-3xl border-0 p-0 overflow-hidden shadow-2xl sm:max-w-[420px]">
        <AlertDialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <AlertDialogTitle className="text-lg font-bold text-slate-900">
            {payload.title || (payload.kind === "confirm" ? "确认操作" : "请输入")}
          </AlertDialogTitle>
          {payload.kind === "confirm" && payload.message && (
            <AlertDialogDescription className="text-sm text-slate-500 mt-1">
              {payload.message}
            </AlertDialogDescription>
          )}
          {isPrompt && promptPayload?.message && (
            <AlertDialogDescription className="text-sm text-slate-500 mt-1">
              {promptPayload.message}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {isPrompt && promptPayload && (
          <div className="px-4 pt-3 sm:px-6">
            <label className="block">
              <div className="mb-1.5 text-sm font-bold text-slate-700">
                {promptPayload.label || "请输入内容"}
              </div>
              <input
                autoFocus
                type={promptPayload.inputType || "text"}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                placeholder={promptPayload.placeholder}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400"
              />
            </label>
          </div>
        )}

        <AlertDialogFooter className="p-4 pt-4 flex gap-2 sm:p-6 sm:pt-4">
          <button
            onClick={() => dismiss(payload.kind === "confirm" ? false : null)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 sm:h-10 sm:w-auto sm:flex-1"
          >
            {(payload.kind === "confirm" ? payload.cancelLabel : (payload as GlobalPromptPayload).cancelLabel) || "取消"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPrompt && (payload as GlobalPromptPayload).required ? !promptValue.trim() : false}
            className={`h-11 w-full rounded-2xl px-5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:flex-1 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {(payload.kind === "confirm" ? payload.confirmLabel : (payload as GlobalPromptPayload).confirmLabel) || "确认"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
