import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, ChevronRight, Crown, Lock, Play, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { practiceKeys } from "../lib/query-keys";

export function PracticeCampaignChapter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chapterQuery = useQuery({
    queryKey: practiceKeys.campaignChapter(id || "unknown"),
    enabled: Boolean(id),
    queryFn: () => api.get<any>(`/api/practice/campaign/chapters/${id}`, { silent: true }),
  });

  const chapter = chapterQuery.data?.chapter;
  const levels = chapterQuery.data?.levels || [];

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-6">
      <button
        type="button"
        onClick={() => navigate("/practice")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        返回闯关大厅
      </button>

      <div className="rounded-[34px] border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[12px] font-black tracking-[0.18em] text-slate-500">
              <Sparkles size={14} />
              CHAPTER MAP
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{chapter?.name || "章节地图"}</h1>
            <p className="mt-4 text-[15px] leading-7 text-slate-500">{chapter?.description || "通过关卡节点逐步推进当前章节。"}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:w-[360px]">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-bold text-slate-400">章节进度</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{chapter?.progress ?? 0}%</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-bold text-slate-400">已通关</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{chapter?.clearedLevels ?? 0}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-bold text-slate-400">总星数</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{chapter?.totalStars ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {levels.map((level: any, index: number) => {
          const isLocked = level.status === "locked";
          const isBoss = level.levelType === "boss";
          const isAvailable = level.status === "available";
          const isPerfect = level.status === "perfect";

          return (
            <motion.button
              key={level.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => !isLocked && navigate(`/practice/level/${level.id}/prepare`)}
              className={`rounded-[28px] border p-5 text-left transition-all ${
                isLocked
                  ? "border-slate-200 bg-slate-100/70 opacity-70"
                  : isAvailable
                    ? "border-teal-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#ffffff_100%)] hover:shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-black tracking-[0.18em] text-slate-400">
                    {isBoss ? "BOSS LEVEL" : `LEVEL ${index + 1}`}
                  </div>
                  <div className="mt-2 text-[22px] font-black tracking-tight text-slate-900 line-clamp-2">{level.title}</div>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  isBoss ? "bg-amber-100 text-amber-600" : isLocked ? "bg-slate-200 text-slate-400" : "bg-teal-100 text-teal-600"
                }`}>
                  {isBoss ? <Crown size={22} /> : isLocked ? <Lock size={20} /> : <Target size={20} />}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{level.difficulty}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{level.levelType}</span>
                {isPerfect ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-600">满星通关</span>
                ) : null}
                {level.status === "cleared" ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-600">已通关</span>
                ) : null}
                {isAvailable ? (
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-600">可挑战</span>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-[11px] font-bold text-slate-400">目标时间</div>
                  <div className="mt-2 text-lg font-black text-slate-800">{level.targetTimeSeconds}s</div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-[11px] font-bold text-slate-400">经验</div>
                  <div className="mt-2 text-lg font-black text-slate-800">{level.rewardExp}</div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-[11px] font-bold text-slate-400">积分</div>
                  <div className="mt-2 text-lg font-black text-slate-800">{level.rewardPoints}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {[0, 1, 2].map((star) => (
                    <Award key={star} size={16} className={star < (level.stars || 0) ? "fill-current" : "text-slate-200"} />
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-black text-slate-600">
                  {isLocked ? "等待解锁" : "进入准备页"}
                  {isLocked ? <Lock size={14} /> : isAvailable ? <Play size={14} /> : <ChevronRight size={14} />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
