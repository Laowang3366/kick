import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ArrowLeft, CheckCircle2, ChevronRight, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { startCampaignLevel } from "../lib/practice-campaign";
import { practiceKeys } from "../lib/query-keys";

export function PracticeCampaignWrongs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const wrongsQuery = useQuery({
    queryKey: practiceKeys.campaignWrongs(),
    queryFn: () => api.get<any>("/api/practice/campaign/wrongs", { silent: true }),
  });
  const resolveMutation = useMutation({
    mutationFn: (id: number) => api.put(`/api/practice/campaign/wrongs/${id}/resolve`, {}),
    onSuccess: async () => {
      toast.success("已标记为已掌握");
      await queryClient.invalidateQueries({ queryKey: practiceKeys.campaignWrongs() });
    },
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, result }: { id: number; result: "pass" | "fail" }) =>
      api.put(`/api/practice/campaign/wrongs/${id}/review-result`, { result }),
    onSuccess: async (_, variables) => {
      toast.success(variables.result === "pass" ? "本轮复习已记为通过" : "已重新加入待复习");
      await queryClient.invalidateQueries({ queryKey: practiceKeys.campaignWrongs() });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: (id: number) => api.put(`/api/practice/campaign/wrongs/${id}/archive`, {}),
    onSuccess: async () => {
      toast.success("错题已归档");
      await queryClient.invalidateQueries({ queryKey: practiceKeys.campaignWrongs() });
    },
  });

  const todayReviews = wrongsQuery.data?.todayReviews || [];
  const reviewPool = wrongsQuery.data?.reviewPool || [];
  const summary = wrongsQuery.data?.summary || { dueCount: 0, totalCount: 0, masteredCount: 0 };
  const todayIds = new Set(todayReviews.map((item: any) => item.id));
  const remainingPool = reviewPool.filter((item: any) => !todayIds.has(item.id));

  const handleRetry = async (levelId?: number | null) => {
    if (!levelId) {
      return;
    }
    try {
      const levelDetail = await api.get<any>(`/api/practice/campaign/levels/${levelId}`, { silent: true });
      const level = levelDetail?.level;
      const chapter = levelDetail?.chapter;
      const result = await startCampaignLevel(levelId, level?.questionId || levelDetail?.question?.id);
      navigate(`/practice/question/${result.questionId}`, {
        state: {
          backTo: chapter?.id ? `/practice/chapters?chapter=${chapter.id}` : "/practice/chapters",
          campaignLevel: level,
          campaignChapter: chapter,
          campaignAttemptId: result.attemptId,
        },
      });
    } catch (error: any) {
      toast.error(error?.message || "开始答题失败");
    }
  };

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-6">
      <button type="button" onClick={() => navigate("/practice")} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900">
        <ArrowLeft size={16} />
        返回闯关大厅
      </button>

      <div className="rounded-[34px] border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-400">REVIEW POOL</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">错题复习池</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">TODAY</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{summary.dueCount || 0}</div>
            <div className="mt-1 text-sm text-slate-500">今天待复习</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">POOL</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{summary.totalCount || 0}</div>
            <div className="mt-1 text-sm text-slate-500">复习池总量</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">MASTERED</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{summary.masteredCount || 0}</div>
            <div className="mt-1 text-sm text-slate-500">已掌握待归档</div>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">TODAY REVIEWS</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">今日待复习</h2>
            </div>
            <div className="rounded-full bg-rose-50 px-3 py-1 text-sm font-black text-rose-600">{todayReviews.length}</div>
          </div>
          <div className="mt-4 space-y-4">
            {todayReviews.map((item: any, index: number) => (
              <WrongQuestionCard
                key={item.id}
                item={item}
                index={index}
                onRetry={handleRetry}
                onResolve={(id) => resolveMutation.mutateAsync(id)}
                onReview={(id, result) => reviewMutation.mutateAsync({ id, result })}
                onArchive={(id) => archiveMutation.mutateAsync(id)}
              />
            ))}
            {todayReviews.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <div className="text-sm font-bold text-slate-600">今天没有到期的复习题</div>
                <div className="mt-2 text-xs text-slate-400">继续闯关，新的错题会自动进入复习池。</div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-10">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">REVIEW POOL</div>
            <h2 className="mt-2 text-xl font-black text-slate-900">复习池全量</h2>
          </div>
          <div className="mt-4 space-y-4">
            {remainingPool.map((item: any, index: number) => (
              <WrongQuestionCard
                key={item.id}
                item={item}
                index={index}
                onRetry={handleRetry}
                onResolve={(id) => resolveMutation.mutateAsync(id)}
                onReview={(id, result) => reviewMutation.mutateAsync({ id, result })}
                onArchive={(id) => archiveMutation.mutateAsync(id)}
              />
            ))}
            {reviewPool.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                <div className="text-sm font-bold text-slate-600">当前没有待处理错题</div>
                <div className="mt-2 text-xs text-slate-400">闯关失败后，错题会自动进入这里。</div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function WrongQuestionCard({
  item,
  index,
  onRetry,
  onResolve,
  onReview,
  onArchive,
}: {
  item: any;
  index: number;
  onRetry: (levelId?: number | null) => Promise<void>;
  onResolve: (id: number) => Promise<unknown>;
  onReview: (id: number, result: "pass" | "fail") => Promise<unknown>;
  onArchive: (id: number) => Promise<unknown>;
}) {
  const status = item.status || "reviewing";
  const due = Boolean(item.due);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-5 text-left transition hover:border-rose-200 hover:bg-white"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-black text-slate-900">{item.title}</div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${statusTone[status] || "bg-slate-100 text-slate-600"}`}>
              {statusLabel[status] || "复习中"}
            </span>
            {due ? <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600">今日到期</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-bold text-slate-400">
            <span className="rounded-full bg-white px-3 py-1">错误次数 {item.wrongCount}</span>
            <span className="rounded-full bg-white px-3 py-1">复习轮次 {item.reviewRound ?? 0}</span>
            <span className="rounded-full bg-white px-3 py-1">难度 {item.difficulty ?? 1}</span>
            <span className="rounded-full bg-white px-3 py-1">最近答错 {item.lastWrongTime ? formatDateTime(item.lastWrongTime) : "-"}</span>
            <span className="rounded-full bg-white px-3 py-1">下次复习 {item.nextReviewAt ? formatDateTime(item.nextReviewAt) : "立即"}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
          <button
            type="button"
            onClick={() => void onRetry(item.recommendedLevelId)}
            className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-black text-rose-600"
          >
            <RotateCcw size={15} />
            开始答题
            <ChevronRight size={15} />
          </button>

          {status === "mastered" ? (
            <button
              type="button"
              onClick={() => void onArchive(item.id)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
            >
              <Archive size={15} />
              归档
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void onReview(item.id, "pass")}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700"
              >
                <CheckCircle2 size={15} />
                本轮通过
              </button>
              <button
                type="button"
                onClick={() => void onReview(item.id, "fail")}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700"
              >
                <AlertTriangle size={15} />
                仍未掌握
              </button>
              <button
                type="button"
                onClick={() => void onResolve(item.id)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
              >
                <CheckCircle2 size={15} />
                标记已掌握
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const statusLabel: Record<string, string> = {
  new: "新错题",
  reviewing: "复习中",
  mastered: "已掌握",
  archived: "已归档",
};

const statusTone: Record<string, string> = {
  new: "bg-rose-50 text-rose-600",
  reviewing: "bg-amber-50 text-amber-700",
  mastered: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};
