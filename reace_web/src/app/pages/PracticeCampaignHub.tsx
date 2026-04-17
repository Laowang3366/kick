import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ClipboardList, History, Lock, Map, Target, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { LitePageFrame } from "../components/LiteSurface";
import { api } from "../lib/api";
import { practiceKeys } from "../lib/query-keys";

export function PracticeCampaignHub() {
  const navigate = useNavigate();
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [mapViewportWidth, setMapViewportWidth] = useState(0);
  const [availableMapHeight, setAvailableMapHeight] = useState(720);
  const overviewQuery = useQuery({
    queryKey: practiceKeys.campaignOverview(),
    queryFn: () => api.get<any>("/api/practice/campaign/overview", { silent: true }),
  });
  const chaptersQuery = useQuery({
    queryKey: practiceKeys.campaignChapters(),
    queryFn: () => api.get<any>("/api/practice/campaign/chapters", { silent: true }),
  });

  const chapters = chaptersQuery.data?.chapters || [];
  const currentChapter =
    overviewQuery.data?.currentChapter ||
    chapters.find((chapter: any) => chapter.unlocked) ||
    chapters[0] ||
    null;
  const mapChapters = useMemo(() => chapters.slice(0, 10), [chapters]);
  const mapNodeWidth = 232;
  const mapNodeHeight = 150;
  const mapColumns = 4;
  const mapStepX = 270;
  const mapRows = Math.max(1, Math.ceil(Math.max(mapChapters.length, 1) / mapColumns));
  const mapTopPadding = 38;
  const mapBottomPadding = 72;
  const mapViewportSafety = 40;
  const fittingMapHeight = Math.max(400, availableMapHeight - mapViewportSafety);
  const rawMapStepY =
    mapRows > 1
      ? (fittingMapHeight - mapTopPadding - mapBottomPadding - mapNodeHeight) / (mapRows - 1)
      : 0;
  const mapStepY =
    mapRows > 1
      ? Math.min(mapNodeHeight + 110, Math.max(mapNodeHeight + 48, rawMapStepY))
      : 0;
  const mapRowJitter = mapRows > 1 ? Math.min(52, mapStepY * 0.18) : 0;
  const mapLaneOffsets = [0, mapRowJitter * 0.75, mapRowJitter * 0.2, mapRowJitter];
  const mapBoardHeight =
    mapRows > 1
      ? Math.max(
          fittingMapHeight,
          mapTopPadding + (mapRows - 1) * mapStepY + mapNodeHeight + mapBottomPadding + mapRowJitter
        )
      : Math.max(fittingMapHeight, mapNodeHeight + mapTopPadding + mapBottomPadding);
  const mapNodes = useMemo(
    () =>
      mapChapters.map((chapter: any, index: number) => {
        const row = Math.floor(index / mapColumns);
        const rowIndex = index % mapColumns;
        const visualColumn = row % 2 === 0 ? rowIndex : mapColumns - rowIndex - 1;
        const left = 36 + visualColumn * mapStepX;
        const centeredTop = Math.max(mapTopPadding, (mapBoardHeight - mapNodeHeight) / 2);
        const top =
          mapRows > 1
            ? mapTopPadding + row * mapStepY + mapLaneOffsets[visualColumn]
            : centeredTop;
        return {
          chapter,
          index,
          left,
          top,
          centerX: left + mapNodeWidth / 2,
          centerY: top + mapNodeHeight / 2,
        };
      }),
    [mapBoardHeight, mapChapters, mapLaneOffsets, mapRows, mapStepY]
  );
  const mapBoardWidth = Math.max(
    920,
    36 + Math.max(0, mapColumns - 1) * mapStepX + mapNodeWidth + 36
  );
  const widthScale = mapViewportWidth ? Math.min(1, (mapViewportWidth - 8) / mapBoardWidth) : 1;
  const heightScale = Math.min(1, availableMapHeight / mapBoardHeight);
  const mapScale = Math.min(widthScale, heightScale);
  const scaledBoardHeight = Math.max(400, Math.round(mapBoardHeight * mapScale));

  useEffect(() => {
    const syncViewport = () => {
      const viewportEl = mapViewportRef.current;
      if (!viewportEl) {
        return;
      }
      const { top } = viewportEl.getBoundingClientRect();
      setMapViewportWidth(viewportEl.clientWidth || 0);
      setAvailableMapHeight(Math.max(420, window.innerHeight - top - 28));
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    const observer = new ResizeObserver(() => syncViewport());
    if (mapViewportRef.current) {
      observer.observe(mapViewportRef.current);
    }

    return () => {
      window.removeEventListener("resize", syncViewport);
      observer.disconnect();
    };
  }, []);

  return (
    <LitePageFrame className="max-w-[1500px]">
      <section className="overflow-hidden rounded-[38px] border border-[#d8ece7] bg-[linear-gradient(180deg,#f4fbf8_0%,#eef7fa_100%)] px-5 py-8 shadow-[0_22px_64px_rgba(15,23,42,0.08)] sm:px-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
              <Map size={20} />
            </div>
            <div>
              <h1 className="text-[30px] font-black tracking-tight text-slate-900">章节地图</h1>
              <p className="mt-1 text-sm text-slate-500">点击节点进入对应章节。</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <button
              type="button"
              onClick={() => navigate("/practice/chapters")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
            >
              查看所有章节列表
            </button>
            <button
              type="button"
              onClick={() => navigate("/practice/ranking")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
            >
              <Trophy size={15} />
              闯关排行
            </button>
            <button
              type="button"
              onClick={() => navigate("/practice/daily")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
            >
              <Target size={15} />
              每日挑战
            </button>
            <button
              type="button"
              onClick={() => navigate("/practice/wrongs")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
            >
              <ClipboardList size={15} />
              错题重练
            </button>
            <button
              type="button"
              onClick={() => navigate("/practice/history")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
            >
              <History size={15} />
              练习记录
            </button>
          </div>
        </div>

        <div>
          <section className="relative overflow-hidden rounded-[34px] border border-[#dcefe9] bg-[linear-gradient(180deg,#effaf7_0%,#f8fcff_100%)] px-5 py-8 sm:px-8">
            <div className="absolute inset-0 opacity-40">
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_28%)]" />
            </div>
            <div ref={mapViewportRef} className="relative overflow-hidden pb-1">
              <div className="flex justify-center" style={{ height: `${scaledBoardHeight}px` }}>
                <div
                  className="relative shrink-0 rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0.78)_100%)] px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  style={{
                    width: `${mapBoardWidth}px`,
                    height: `${mapBoardHeight}px`,
                    transform: `scale(${mapScale})`,
                    transformOrigin: "top center",
                  }}
                >
                <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  {mapNodes.slice(0, -1).map((node, index) => {
                    const next = mapNodes[index + 1];
                    if (!next) {
                      return null;
                    }
                    const controlX = (node.centerX + next.centerX) / 2;
                    const controlY = Math.min(node.centerY, next.centerY) - 32;
                    return (
                      <path
                        key={`${node.chapter.id}-${next.chapter.id}`}
                        d={`M ${node.centerX} ${node.centerY} Q ${controlX} ${controlY} ${next.centerX} ${next.centerY}`}
                        fill="none"
                        stroke="rgba(20,184,166,0.28)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="10 12"
                      />
                    );
                  })}
                </svg>

                {mapNodes.map(({ chapter, index, left, top, centerX, centerY }) => {
                  const isCurrent = currentChapter?.id === chapter.id;
                  const isCompleted = Boolean(chapter.completed);
                  const isUnlocked = Boolean(chapter.unlocked);

                  return (
                    <motion.div
                      key={chapter.id}
                      initial={{ opacity: 0, scale: 0.94, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="absolute"
                      style={{ left, top, width: `${mapNodeWidth}px` }}
                    >
                      <div
                        className="pointer-events-none absolute z-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                        style={{
                          left: `${centerX - left}px`,
                          top: `${centerY - top}px`,
                          background: isCompleted ? "#14b8a6" : isCurrent ? "#f59e0b" : isUnlocked ? "#38bdf8" : "#cbd5e1",
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => navigate(`/practice/chapters?chapter=${chapter.id}`)}
                        className={`group relative z-10 w-full overflow-hidden rounded-[28px] border px-4 py-4 text-left transition ${
                          isCompleted
                            ? "border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_72%)] shadow-[0_18px_44px_rgba(16,185,129,0.10)]"
                            : isCurrent
                              ? "border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_70%)] shadow-[0_18px_44px_rgba(251,146,60,0.14)]"
                              : isUnlocked
                                ? "border-slate-200 bg-white/96 hover:border-teal-200 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
                                : "border-slate-200 bg-slate-100/90 opacity-85"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10px] font-black tracking-[0.18em] text-slate-400">
                              章节 {(index + 1).toString().padStart(2, "0")}
                            </div>
                            <div className="mt-2 line-clamp-1 text-[26px] font-black tracking-tight text-slate-900">{chapter.name}</div>
                          </div>
                          <div
                            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-600"
                                : isCurrent
                                  ? "bg-amber-50 text-amber-700"
                                  : isUnlocked
                                    ? "bg-sky-50 text-sky-700"
                                    : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {isCompleted ? "已通关" : isCurrent ? "当前" : isUnlocked ? "可进入" : "未解锁"}
                          </div>
                        </div>

                        <div className="mt-4 h-2 rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCompleted
                                ? "bg-[linear-gradient(90deg,#10b981,#14b8a6)]"
                                : isUnlocked
                                  ? "bg-[linear-gradient(90deg,#f59e0b,#fb923c)]"
                                  : "bg-slate-300"
                            }`}
                            style={{ width: `${Math.max(6, Number(chapter.progress || 0))}%` }}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                            <div className="text-[10px] font-bold text-slate-400">进度</div>
                            <div className="mt-1.5 text-lg font-black text-slate-900">{chapter.progress}%</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                            <div className="text-[10px] font-bold text-slate-400">题目</div>
                            <div className="mt-1.5 text-lg font-black text-slate-900">{chapter.totalLevels}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                            <div className="text-[10px] font-bold text-slate-400">星数</div>
                            <div className="mt-1.5 flex items-center gap-1 text-amber-500">
                              <Award size={15} />
                              <span className="text-lg font-black text-slate-900">{chapter.totalStars}</span>
                            </div>
                          </div>
                        </div>

                        {!isUnlocked ? (
                          <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-black text-slate-400">
                            <Lock size={12} />
                            当前章节尚未解锁
                          </div>
                        ) : null}
                      </button>
                    </motion.div>
                  );
                })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </LitePageFrame>
  );
}
