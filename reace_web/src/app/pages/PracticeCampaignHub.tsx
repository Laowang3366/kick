import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, Brain, Flame, Gift, Lock, Map, Play, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { practiceKeys } from "../lib/query-keys";

export function PracticeCampaignHub() {
  const navigate = useNavigate();
  const overviewQuery = useQuery({
    queryKey: practiceKeys.campaignOverview(),
    queryFn: () => api.get<any>("/api/practice/campaign/overview", { silent: true }),
  });
  const chaptersQuery = useQuery({
    queryKey: practiceKeys.campaignChapters(),
    queryFn: () => api.get<any>("/api/practice/campaign/chapters", { silent: true }),
  });

  const overview = overviewQuery.data || {};
  const chapters = chaptersQuery.data?.chapters || [];
  const currentChapter = overview.currentChapter;
  const currentLevel = overview.currentLevel;
  const summary = overview.summary || {};

  const chapterCards = useMemo(() => chapters.slice(0, 6), [chapters]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6">
      <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#082f49_0%,#0f766e_45%,#14b8a6_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(8,47,73,0.26)] sm:px-8 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-[12px] font-black tracking-[0.18em] text-white/85">
              <Sparkles size={14} />
              EXCEL 闯关模式
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">从基础到进阶，按章节一路闯过去</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/82 sm:text-[17px]">
              当前版本已接入闯关大厅、章节地图和关卡准备链路。你可以从当前章节继续推进，也可以手动进入章节地图查看关卡分布。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (currentLevel?.id) {
                    navigate(`/practice/level/${currentLevel.id}/prepare`);
                    return;
                  }
                  if (currentChapter?.id) {
                    navigate(`/practice/chapter/${currentChapter.id}`);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-900 transition hover:-translate-y-0.5"
              >
                <Play size={16} />
                继续闯关
              </button>
              <button
                type="button"
                onClick={() => currentChapter?.id && navigate(`/practice/chapter/${currentChapter.id}`)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white"
              >
                <Map size={16} />
                查看章节地图
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[440px]">
            {[
              { label: "当前星数", value: summary.totalStars ?? 0, icon: Award },
              { label: "已通关", value: summary.clearedLevels ?? 0, icon: Target },
              { label: "当前连胜", value: summary.currentStreak ?? 0, icon: Flame },
              { label: "今日挑战", value: overview.dailyChallenge ? "已开放" : "待配置", icon: Gift },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/72">
                    <Icon size={14} />
                    <span className="text-[11px] font-bold tracking-wide">{item.label}</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-white">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[30px] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.18em] text-teal-500">Current Run</div>
              <h2 className="mt-2 text-[24px] font-black tracking-tight text-slate-900">继续当前章节</h2>
            </div>
            <Brain size={26} className="text-teal-500" />
          </div>
          <div className="mt-5 rounded-[26px] bg-slate-50 p-5">
            <div className="text-sm font-bold text-slate-500">当前章节</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{currentChapter?.name || "暂无章节"}</div>
            <div className="mt-1 text-sm text-slate-500">{currentChapter?.description || "暂未生成章节描述"}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-[11px] font-bold text-slate-400">当前关卡</div>
                <div className="mt-2 text-sm font-black text-slate-800 line-clamp-2">{currentLevel?.title || "未找到可挑战关卡"}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-[11px] font-bold text-slate-400">章节进度</div>
                <div className="mt-2 text-xl font-black text-slate-800">{currentChapter?.progress ?? 0}%</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-[11px] font-bold text-slate-400">章节星数</div>
                <div className="mt-2 text-xl font-black text-slate-800">{currentChapter?.totalStars ?? 0}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => currentLevel?.id && navigate(`/practice/level/${currentLevel.id}/prepare`)}
                disabled={!currentLevel?.id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                进入关卡
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => currentChapter?.id && navigate(`/practice/chapter/${currentChapter.id}`)}
                disabled={!currentChapter?.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                查看地图
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <div className="text-[13px] font-black uppercase tracking-[0.18em] text-amber-500">Daily Challenge</div>
          <h2 className="mt-2 text-[24px] font-black tracking-tight text-slate-900">今日挑战</h2>
          {overview.dailyChallenge ? (
            <div className="mt-5 rounded-[26px] bg-[linear-gradient(135deg,#fff7ed_0%,#ffedd5_100%)] p-5">
              <div className="text-lg font-black text-slate-900">{overview.dailyChallenge.title}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-400">奖励经验</div>
                  <div className="mt-2 text-xl font-black text-amber-600">{overview.dailyChallenge.rewardExp}</div>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-400">奖励积分</div>
                  <div className="mt-2 text-xl font-black text-amber-600">{overview.dailyChallenge.rewardPoints}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <div className="text-sm font-bold text-slate-600">今日挑战暂未配置</div>
              <div className="mt-2 text-xs text-slate-400">后台每日挑战接入后，这里会展示当天限时关卡。</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-[30px] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-400">Chapter Map</div>
            <h2 className="mt-2 text-[24px] font-black tracking-tight text-slate-900">章节总览</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {chapterCards.map((chapter: any, index: number) => (
            <motion.button
              key={chapter.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => chapter.unlocked && navigate(`/practice/chapter/${chapter.id}`)}
              className={`rounded-[26px] border p-5 text-left transition-all ${
                chapter.unlocked
                  ? "border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-white"
                  : "border-slate-200 bg-slate-100/70 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-black tracking-[0.18em] text-slate-400">CHAPTER</div>
                  <div className="mt-2 text-xl font-black text-slate-900">{chapter.name}</div>
                </div>
                {chapter.unlocked ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-600">已解锁</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black text-slate-500">
                    <Lock size={12} />
                    未解锁
                  </span>
                )}
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-500 line-clamp-2">{chapter.description || "当前章节暂无描述"}</div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-[11px] font-bold text-slate-400">进度</div>
                  <div className="mt-2 text-lg font-black text-slate-800">{chapter.progress}%</div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-[11px] font-bold text-slate-400">关卡</div>
                  <div className="mt-2 text-lg font-black text-slate-800">{chapter.totalLevels}</div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3">
                  <div className="text-[11px] font-bold text-slate-400">星数</div>
                  <div className="mt-2 text-lg font-black text-slate-800">{chapter.totalStars}</div>
                </div>
              </div>
            </motion.button>
          ))}
          {chapterCards.length === 0 ? (
            <div className="col-span-full rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <div className="text-sm font-bold text-slate-600">暂未生成闯关章节</div>
              <div className="mt-2 text-xs text-slate-400">请先确认后端迁移已执行，并且题库中存在 Excel 模板题。</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
