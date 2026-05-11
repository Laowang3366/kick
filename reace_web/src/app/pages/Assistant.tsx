import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, LoaderCircle, MessageSquareText, Send, User, X } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { LitePageFrame } from "../components/LiteSurface";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

type AssistantResponse = {
  conversationId: string;
  answer: string;
  relatedTutorials: Array<{ id: number; title: string; summary?: string; path: string }>;
  relatedQuestions: Array<{ id: number; title: string; explanation?: string; path: string }>;
  model?: string;
  fallbackUsed?: boolean;
};

type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  relatedTutorials: AssistantResponse["relatedTutorials"];
  relatedQuestions: AssistantResponse["relatedQuestions"];
  model?: string;
  fallbackUsed?: boolean;
};

const quickPrompts = [
  "VLOOKUP 为什么会返回 #N/A？",
  "帮我写一个按部门汇总销售额的 SUMIFS 公式",
  "FILTER 和 SORTBY 怎么组合做排名？",
  "这个 IFERROR 公式为什么还是报错？",
];

export function Assistant() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const chatMutation = useMutation({
    mutationFn: () =>
      api.post<AssistantResponse>("/api/assistant/chat", {
        message,
        conversationId,
      }),
    onSuccess: (result) => {
      const question = message.trim();
      setChatHistory((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          question,
          answer: result.answer,
          relatedTutorials: result.relatedTutorials || [],
          relatedQuestions: result.relatedQuestions || [],
          model: result.model,
          fallbackUsed: result.fallbackUsed,
        },
      ]);
      setConversationId(result.conversationId || null);
      setMessage("");
    },
    onError: (error: any) => {
      toast.error(error?.message || "AI 助手暂时不可用");
    },
  });

  const closeAssistant = () => {
    const returnPath = window.sessionStorage.getItem("excelAssistantReturnPath");
    window.sessionStorage.removeItem("excelAssistantReturnPath");
    if (returnPath && !returnPath.startsWith("/assistant")) {
      navigate(returnPath, { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) {
        return;
      }
      closeAssistant();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAssistant();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const canSubmit = useMemo(() => message.trim().length > 0 && !chatMutation.isPending, [message, chatMutation.isPending]);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.info("请先登录后再使用 AI 助手");
      navigate("/auth");
      return;
    }
    if (!message.trim()) {
      toast.info("请先输入你的 Excel 问题");
      return;
    }
    await chatMutation.mutateAsync();
  };

  return (
    <LitePageFrame>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div ref={panelRef} className="rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <MessageSquareText size={16} />
              对话区
            </div>
          </div>

          <div className="min-h-[420px] space-y-5 px-4 py-5 sm:px-5">
            {chatHistory.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-600">
                  <Bot size={26} />
                </div>
                <div className="mt-4 text-xl font-black text-slate-900">还没开始聊天</div>
                <div className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  你可以直接问函数写法、报错排查、公式解释，或者把实际业务场景扔过来。
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {quickPrompts.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMessage(item)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((item) => (
                <div key={item.id} className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-[22px] rounded-br-md bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] px-4 py-3 text-sm leading-6 text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
                      <div className="mb-2 flex items-center gap-2 text-xs font-black text-white/75">
                        <User size={14} />
                        你
                      </div>
                      <div className="whitespace-pre-wrap">{item.question}</div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[92%] rounded-[22px] rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="mb-2 flex items-center gap-2 text-xs font-black text-emerald-700">
                        <Bot size={14} />
                        AI 助手
                      </div>
                      <div className="whitespace-pre-wrap">{item.answer}</div>
                      <div className="mt-3 text-xs text-slate-400">
                        模型：{item.model || "-"}{item.fallbackUsed ? "（已走兜底）" : ""}
                      </div>

                      {(item.relatedTutorials.length > 0 || item.relatedQuestions.length > 0) && (
                        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                          {item.relatedTutorials.length > 0 && (
                            <div>
                              <div className="mb-2 text-xs font-black tracking-wide text-slate-500">相关教程</div>
                              <div className="flex flex-wrap gap-2">
                                {item.relatedTutorials.map((tutorial) => (
                                  <button
                                    key={tutorial.id}
                                    type="button"
                                    onClick={() => navigate(tutorial.path)}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                  >
                                    {tutorial.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.relatedQuestions.length > 0 && (
                            <div>
                              <div className="mb-2 text-xs font-black tracking-wide text-slate-500">相关练习</div>
                              <div className="flex flex-wrap gap-2">
                                {item.relatedQuestions.map((question) => (
                                  <button
                                    key={question.id}
                                    type="button"
                                    onClick={() => navigate(question.path)}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                  >
                                    {question.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-4 sm:px-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="例如：为什么我的 VLOOKUP 一直返回 #N/A？"
                className="min-h-[110px] w-full resize-none bg-transparent px-1 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <div className="text-xs text-slate-400">描述得越具体，回答通常越准。</div>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chatMutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                  {chatMutation.isPending ? "正在思考..." : "发送"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={closeAssistant}
        className="fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] ring-1 ring-white/10 backdrop-blur transition hover:opacity-95 md:bottom-8 md:right-6"
        aria-label="关闭 AI 助手"
      >
        <X size={18} strokeWidth={2.2} />
        <span>关闭助手</span>
      </button>
    </LitePageFrame>
  );
}
