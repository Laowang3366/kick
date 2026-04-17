import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, ChevronDown, ChevronRight, Clock3, FileSpreadsheet, Lock, Map, Play } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { LitePageFrame } from "../components/LiteSurface";
import { api } from "../lib/api";
import { startCampaignLevel } from "../lib/practice-campaign";
import { practiceKeys } from "../lib/query-keys";

export function PracticeCampaignChapters() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialChapterId = Number(searchParams.get("chapter") || 0) || null;
  const [activeChapterId, setActiveChapterId] = useState<number | null>(initialChapterId);
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(initialChapterId);
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null);

  const chaptersQuery = useQuery({
    queryKey: practiceKeys.campaignChapters(),
    queryFn: () => api.get<any>("/api/practice/campaign/chapters", { silent: true }),
  });

  const chapterDetailQuery = useQuery({
    queryKey: practiceKeys.campaignChapter(activeChapterId || "none"),
    enabled: Boolean(activeChapterId),
    queryFn: () => api.get<any>(`/api/practice/campaign/chapters/${activeChapterId}`, { silent: true }),
  });

  const chapters = chaptersQuery.data?.chapters || [];

  useEffect(() => {
    if (!chapters.length) {
      setActiveChapterId(null);
      setExpandedChapterId(null);
      setActiveLevelId(null);
      return;
    }

    const nextChapterId = activeChapterId && chapters.some((item: any) => item.id === activeChapterId)
      ? activeChapterId
      : initialChapterId && chapters.some((item: any) => item.id === initialChapterId)
        ? initialChapterId
        : chapters.find((item: any) => item.unlocked)?.id || chapters[0].id;

    setActiveChapterId(nextChapterId);
    setExpandedChapterId((current) =>
      current && chapters.some((item: any) => item.id === current) ? current : nextChapterId
    );
  }, [chapters, activeChapterId, initialChapterId]);

  const activeChapter = useMemo(
    () => chapters.find((item: any) => item.id === activeChapterId) || null,
    [chapters, activeChapterId]
  );
  const visibleChapters = useMemo(
    () => (initialChapterId ? (activeChapter ? [activeChapter] : []) : chapters),
    [activeChapter, chapters, initialChapterId]
  );

  const activeLevels = chapterDetailQuery.data?.levels || [];

  useEffect(() => {
    if (!activeLevels.length) {
      setActiveLevelId(null);
      return;
    }
    const nextLevelId = activeLevelId && activeLevels.some((item: any) => item.id === activeLevelId)
      ? activeLevelId
      : activeLevels.find((item: any) => item.status !== "locked")?.id || activeLevels[0].id;
    setActiveLevelId(nextLevelId);
  }, [activeLevels, activeLevelId]);

  const activeLevel = useMemo(
    () => activeLevels.find((item: any) => item.id === activeLevelId) || activeLevels[0] || null,
    [activeLevels, activeLevelId]
  );

  const handleStartLevel = async (level: any, chapter: any) => {
    if (!level || level.status === "locked") {
      return;
    }
    try {
      const result = await startCampaignLevel(level.id, level.questionId);
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
    <LitePageFrame className="max-w-[1460px]">
      <div className="mb-2">
        <button
          type="button"
          onClick={() => navigate("/practice")}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          返回练习大厅
        </button>
      </div>

      <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/88 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 bg-[linear-gradient(180deg,#f7fbfb_0%,#f1f7fa_100%)] p-4 xl:border-b-0 xl:border-r xl:p-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/78 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="space-y-2">
                {visibleChapters.map((chapter: any, index: number) => {
                  const isActive = chapter.id === activeChapter?.id;
                  const isExpanded = chapter.id === expandedChapterId;
                  return (
                    <motion.div
                      key={chapter.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChapterId(chapter.id);
                          setExpandedChapterId((current) => (current === chapter.id ? null : chapter.id));
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                          isActive
                            ? "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span className={isActive ? "text-white" : chapter.unlocked ? "text-slate-400" : "text-slate-300"}>
                          {chapter.unlocked ? <Map size={16} strokeWidth={1.6} /> : <Lock size={16} strokeWidth={1.6} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{chapter.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${
                          isActive ? "bg-white/14 text-white/88" : "bg-slate-100 text-slate-400"
                        }`}>
                          {chapter.totalLevels || 0}
                        </span>
                        <span className={isActive ? "text-white/82" : "text-slate-400"}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      </button>

                      {isExpanded && isActive && activeLevels.length ? (
                        <div className="mt-2 space-y-1 pl-4">
                          {activeLevels.map((level: any, levelIndex: number) => {
                            const isLevelActive = level.id === activeLevel?.id;
                            const isLocked = level.status === "locked";
                            return (
                              <button
                                key={level.id}
                                type="button"
                                onClick={() => setActiveLevelId(level.id)}
                                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm transition ${
                                  isLevelActive
                                    ? "bg-teal-50 text-teal-700"
                                    : isLocked
                                      ? "text-slate-400 hover:bg-slate-50"
                                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span className={isLevelActive ? "text-teal-600" : isLocked ? "text-slate-300" : "text-slate-300"}>
                                  {isLocked ? <Lock size={14} strokeWidth={1.8} /> : <Play size={14} strokeWidth={1.8} />}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-semibold">{level.title}</span>
                                <span className="text-[10px] font-black tracking-[0.18em] text-slate-300">
                                  {(levelIndex + 1).toString().padStart(2, "0")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>

              {!visibleChapters.length ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                  暂无可展示章节
                </div>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0 p-6">
            {!activeChapter ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-sm text-slate-400">
                暂无章节内容
              </div>
            ) : !activeLevel ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-sm text-slate-400">
                当前章节下暂无可展示题目
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-700">
                    {activeChapter.name}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    activeLevel.status === "locked"
                      ? "bg-slate-100 text-slate-500"
                      : activeLevel.status === "perfect"
                        ? "bg-amber-50 text-amber-700"
                        : activeLevel.status === "cleared"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sky-50 text-sky-700"
                  }`}>
                    {activeLevel.status === "locked"
                      ? "未解锁"
                      : activeLevel.status === "perfect"
                        ? "满星"
                        : activeLevel.status === "cleared"
                          ? "已通关"
                          : "可挑战"}
                  </span>
                </div>

                <h2 className="mt-4 text-[34px] font-black tracking-tight text-slate-900">{activeLevel.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {activeLevel.summary || activeChapter.description || "确认题目要求后即可直接进入答题界面。"}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <Clock3 size={14} />
                      目标时间
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900">{activeLevel.targetTimeSeconds || 0}s</div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <Award size={14} />
                      奖励经验
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900">{activeLevel.rewardExp || 0}</div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <Award size={14} />
                      奖励积分
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900">{activeLevel.rewardPoints || 0}</div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <FileSpreadsheet size={14} />
                      当前星数
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900">{activeLevel.stars || 0}</div>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">进度</div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            activeChapter.unlocked
                              ? "bg-[linear-gradient(90deg,#14b8a6,#0f766e)]"
                              : "bg-slate-300"
                          }`}
                          style={{ width: `${Math.max(6, Number(activeChapter.progress || 0))}%` }}
                        />
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-500">{activeChapter.progress || 0}% 已完成</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-[11px] font-bold text-slate-400">题目数</div>
                        <div className="mt-2 text-xl font-black text-slate-900">{activeChapter.totalLevels || 0}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-[11px] font-bold text-slate-400">星数</div>
                        <div className="mt-2 text-xl font-black text-slate-900">{activeChapter.totalStars || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleStartLevel(activeLevel, activeChapter)}
                    disabled={activeLevel.status === "locked"}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {activeLevel.status === "locked" ? <Lock size={15} /> : <Play size={15} />}
                    {activeLevel.status === "locked" ? "等待解锁" : "开始答题"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/practice/chapter/${activeChapter.id}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700"
                  >
                    查看章节详情
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </LitePageFrame>
  );
}
