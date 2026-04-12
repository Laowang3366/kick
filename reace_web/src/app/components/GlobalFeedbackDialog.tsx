import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

export const GLOBAL_FEEDBACK_EVENT = "excel-forum-global-feedback";

export type GlobalFeedback = {
  type?: "success" | "error";
  title?: string;
  message: string;
  durationMs?: number;
};

export function emitGlobalFeedback(feedback: GlobalFeedback) {
  window.dispatchEvent(new CustomEvent<GlobalFeedback>(GLOBAL_FEEDBACK_EVENT, { detail: feedback }));
}

export function GlobalFeedbackDialog() {
  const [feedback, setFeedback] = useState<GlobalFeedback | null>(null);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const detail = (event as CustomEvent<GlobalFeedback>).detail;
      if (detail?.message) {
        setFeedback(detail);
      }
    };
    window.addEventListener(GLOBAL_FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(GLOBAL_FEEDBACK_EVENT, handleFeedback);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    if (feedback.type === "error" && feedback.durationMs === undefined) return;

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, feedback.durationMs ?? 2000);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const type = feedback?.type || "success";
  const isError = type === "error";

  return (
    <Dialog open={Boolean(feedback)} onOpenChange={(open) => !open && setFeedback(null)}>
      <DialogContent
        className="sm:max-w-[420px] rounded-2xl border-0 p-0 overflow-hidden shadow-2xl"
        showCloseButton={isError}
      >
        <div className={`h-1.5 ${isError ? "bg-rose-500" : "bg-emerald-500"}`} />
        <div className="p-6">
          <DialogHeader className="text-left">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${isError ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                {isError ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {feedback?.title || (isError ? "操作失败，请检查后重试" : "操作成功")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              {feedback?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className={`inline-flex h-10 min-w-24 items-center justify-center rounded-xl px-5 text-sm font-bold text-white transition ${isError ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}
            >
              {isError ? "知道了" : "完成"}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
