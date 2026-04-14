import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, CheckCircle2, ChevronRight, Clock3, RotateCcw, Sparkles, Target, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useLocation, useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { formatDateTime, formatDuration } from "../lib/format";
import { practiceKeys } from "../lib/query-keys";

export function PracticeCampaignResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const campaignLevel = (location.state as any)?.campaignLevel;
  const campaignChapter = (location.state as any)?.campaignChapter;
  const nextLevelId = (location.state as any)?.nextLevelId;
  const passedFromState = Boolean((location.state as any)?.passed);
  const starsFromState = Number((location.state as any)?.stars || 0);

  const recordQuery = useQuery({
    queryKey: practiceKeys.recordDetail(id || "unknown"),
    enabled: Boolean(id),
    queryFn: () => api.get<any>(`/api/practice/history/${id}`, { silent: true }),
  });

  const record = recordQuery.data;
  const passed = record ? (record.correctCount || 0) > 0 : passedFromState;
  const stars = record ? Math.max(((record.correctCount || 0) > 0 ? 1 : 0), starsFromState) : starsFromState;

  return (
    <div className="mx-auto max-w-[960px] px-4 py-5 sm:px-6 sm:py-6">
      <button
        type="button"
        onClick={() => navigate(campaignChapter?.id ? `/practice/chapter/${campaignChapter.id}` : "/practice")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        返回地图
      </button>

      <div className={`overflow-hidden rounded-[36px] border shadow-sm ${passed ? "border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_28%)]" : "border-rose-200 bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_28%)]"}`}>
        <div className="px-6 py-8 text-center sm:px-10 sm:py-10">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${passed ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
            {passed ? <CheckCircle2 size={38} /> : <XCircle size={38} />}
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-black tracking-[0.18em] text-slate-500 shadow-sm">
            <Sparkles size={14} />
            CAMPAIGN RESULT
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {passed ? "通关成功" : "挑战失败"}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-500">
            {campaignLevel?.title || record?.questionTitle || "当前关卡"} 已完成结算。你可以继续前往下一关，或返回地图调整挑战路线。
          </p>

          <div className="mt-7 flex items-center justify-center gap-2 text-amber-500">
            {[0, 1, 2].map((index) => (
              <Award key={index} size={24} className={index < stars ? "fill-current" : "text-slate-200"} />
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><Target size={14} /> 得分</div>
              <div className="mt-3 text-2xl font-black text-slate-900">{record?.score || 0}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><Clock3 size={14} /> 用时</div>
              <div className="mt-3 text-2xl font-black text-slate-900">{formatDuration(record?.durationSeconds || 0)}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><Award size={14} /> 奖励积分</div>
              <div className="mt-3 text-2xl font-black text-slate-900">{record?.rewardPoints || 0}</div>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white px-5 py-5 text-left shadow-sm">
            <div className="text-[12px] font-black tracking-[0.18em] text-slate-400">SUMMARY</div>
            <div className="mt-3 text-lg font-black text-slate-900">{campaignChapter?.name || record?.questionCategoryName || "当前章节"}</div>
            <div className="mt-2 text-sm leading-7 text-slate-500">
              提交时间：{record?.submitTime ? formatDateTime(record.submitTime) : "-"}。
              当前版本已接入闯关记录、基础三星结算和章节解锁。后续会继续补首通奖励、每日挑战和错题本。
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {nextLevelId ? (
              <button
                type="button"
                onClick={() => navigate(`/practice/level/${nextLevelId}/prepare`)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-black text-white"
              >
                下一关
                <ChevronRight size={15} />
              </button>
            ) : null}
            {campaignLevel?.questionId ? (
              <button
                type="button"
                onClick={() => navigate(`/practice/question/${campaignLevel.questionId}`, {
                  state: {
                    backTo: campaignChapter?.id ? `/practice/chapter/${campaignChapter.id}` : "/practice",
                    campaignLevel,
                    campaignChapter,
                  },
                })}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700"
              >
                <RotateCcw size={15} />
                再试一次
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate(campaignChapter?.id ? `/practice/chapter/${campaignChapter.id}` : "/practice")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700"
            >
              返回地图
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
