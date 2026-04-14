import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Clock3, FileSpreadsheet, Play, Sparkles, Target } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { practiceKeys } from "../lib/query-keys";
import { toast } from "sonner";

export function PracticeCampaignLevelPrepare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const levelQuery = useQuery({
    queryKey: practiceKeys.campaignLevel(id || "unknown"),
    enabled: Boolean(id),
    queryFn: () => api.get<any>(`/api/practice/campaign/levels/${id}`, { silent: true }),
  });

  const chapter = levelQuery.data?.chapter;
  const level = levelQuery.data?.level;
  const question = levelQuery.data?.question;
  const startMutation = useMutation({
    mutationFn: () => api.post<any>(`/api/practice/campaign/levels/${id}/start`, { attemptType: "campaign" }),
  });

  return (
    <div className="mx-auto max-w-[980px] px-4 py-5 sm:px-6 sm:py-6">
      <button
        type="button"
        onClick={() => navigate(chapter?.id ? `/practice/chapter/${chapter.id}` : "/practice")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        返回章节
      </button>

      <div className="rounded-[34px] border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[12px] font-black tracking-[0.18em] text-slate-500">
          <Sparkles size={14} />
          LEVEL PREPARE
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{level?.title || "关卡准备"}</h1>
        <p className="mt-3 text-sm font-bold text-teal-600">{chapter?.name || "所属章节"}</p>
        <p className="mt-4 text-[15px] leading-7 text-slate-500">
          先确认本关目标时间、奖励和题目类型，再进入答题页。当前阶段闯关模式会复用现有答题页面进行提交和判题。
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><Clock3 size={14} /> 目标时间</div>
            <div className="mt-3 text-2xl font-black text-slate-900">{level?.targetTimeSeconds ?? 0}s</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><Award size={14} /> 奖励经验</div>
            <div className="mt-3 text-2xl font-black text-slate-900">{level?.rewardExp ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><Target size={14} /> 奖励积分</div>
            <div className="mt-3 text-2xl font-black text-slate-900">{level?.rewardPoints ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><FileSpreadsheet size={14} /> 题目类型</div>
            <div className="mt-3 text-2xl font-black text-slate-900">{level?.difficulty || "-"}</div>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] p-5">
          <div className="text-[12px] font-black tracking-[0.18em] text-slate-400">QUESTION</div>
          <div className="mt-3 text-xl font-black text-slate-900">{question?.title || "未找到题目"}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
              分类：{question?.questionCategoryName || "未分类挑战"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
              题目积分：{question?.points ?? 0}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
              当前状态：{level?.status || "-"}
            </span>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              if (!question?.id) return;
              try {
                const result = await startMutation.mutateAsync();
                navigate(`/practice/question/${question.id}`, {
                  state: {
                    backTo: chapter?.id ? `/practice/chapter/${chapter.id}` : "/practice",
                    campaignLevel: level,
                    campaignChapter: chapter,
                    campaignAttemptId: result.attemptId,
                  },
                });
              } catch (error: any) {
                toast.error(error?.message || "开始挑战失败");
              }
            }}
            disabled={!question?.id || startMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Play size={16} />
            {startMutation.isPending ? "准备中..." : "开始挑战"}
          </button>
          <button
            type="button"
            onClick={() => navigate(chapter?.id ? `/practice/chapter/${chapter.id}` : "/practice")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700"
          >
            返回地图
          </button>
        </div>
      </div>
    </div>
  );
}
