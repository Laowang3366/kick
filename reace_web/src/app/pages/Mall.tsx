import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  ClipboardList,
  Clock3,
  FileText,
  Flame,
  MessageCircle,
  Sparkles,
  Star,
  ThumbsUp,
} from "lucide-react";
import { useNavigate } from "react-router";
import { LiteHero, LitePageFrame, LitePanel, LiteSectionTitle } from "../components/LiteSurface";
import { api } from "../lib/api";
import { formatDateTime, formatNumber } from "../lib/format";
import { pointsKeys } from "../lib/query-keys";

const taskIconMap: Record<string, any> = {
  daily_checkin: CalendarCheck,
  daily_post: FileText,
  daily_reply: MessageCircle,
  first_post: FileText,
  first_reply: MessageCircle,
  daily_practice: ThumbsUp,
  first_practice: Star,
};

function resolveRecordTone(change: number) {
  if (change > 0) {
    return {
      badge: "bg-emerald-50 text-emerald-600",
      icon: "bg-emerald-50 text-emerald-600",
    };
  }
  return {
    badge: "bg-slate-100 text-slate-500",
    icon: "bg-slate-100 text-slate-500",
  };
}

export function Mall() {
  const navigate = useNavigate();
  const overviewQuery = useQuery({
    queryKey: pointsKeys.overview(),
    queryFn: () => api.get<any>("/api/points/overview", { silent: true }),
  });

  const overview = overviewQuery.data;
  const user = overview?.user || {};
  const taskSummary = overview?.taskSummary || {};
  const todayCheckin = overview?.todayCheckin || {};
  const recentRecords = overview?.recentRecords || [];
  const tasks = (overview?.tasks || []).slice(0, 4);

  return (
    <LitePageFrame>
      <LiteHero
        eyebrow="POINTS CENTER"
        title="积分中心"
        description="积分商城已下线。这里现在只保留积分记录和积分任务，方便查看成长进度与每日完成情况。"
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate("/points-history")}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-900 transition hover:-translate-y-0.5"
            >
              <Clock3 size={16} />
              积分记录
            </button>
            <button
              type="button"
              onClick={() => navigate("/task-center")}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-6 py-3 text-sm font-bold text-white"
            >
              <ClipboardList size={16} />
              积分任务
            </button>
          </>
        }
        aside={
          <div className="rounded-[30px] border border-white/12 bg-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Award size={24} />
              </div>
              <div>
                <div className="text-[12px] font-black tracking-[0.18em] text-white/68">成长概览</div>
                <div className="mt-2 text-xl font-black text-white">Lv.{user.level || 1} 学习进度持续累计中</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: "当前积分", value: formatNumber(user.points || 0) },
                { label: "当前经验", value: formatNumber(user.exp || 0) },
                { label: "今日积分", value: formatNumber(overview?.todayPointsGain || 0) },
                { label: "任务完成", value: `${taskSummary.completed || 0}/${taskSummary.total || 0}` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                  <div className="text-[11px] font-bold text-white/68">{item.label}</div>
                  <div className="mt-2 text-xl font-black text-white">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-white/68">今日签到</div>
                  <div className="mt-1 text-sm font-black text-white">
                    {todayCheckin.checkedIn ? "已完成" : "未完成"}
                  </div>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">
                  连续 {todayCheckin.continuousDays || 0} 天
                </div>
              </div>
            </div>
          </div>
        }
        className="bg-[linear-gradient(135deg,#0f766e_0%,#0ea5a4_42%,#0f172a_100%)]"
      />

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <LitePanel>
          <LiteSectionTitle
            eyebrow="POINTS HISTORY"
            title="最近积分记录"
            description="最近的积分增减会集中留痕，包含签到、练习和互动奖励。"
            action={
              <button
                type="button"
                onClick={() => navigate("/points-history")}
                className="text-sm font-black text-teal-600 transition hover:text-teal-700"
              >
                查看全部
              </button>
            }
          />
          <div className="mt-5 space-y-3">
            {recentRecords.length > 0 ? (
              recentRecords.map((record: any) => {
                const change = Number(record.change || 0);
                const tone = resolveRecordTone(change);
                return (
                  <div key={record.id} className="rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}>
                          <Flame size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-base font-black text-slate-900">{record.ruleName || record.description || "积分变动"}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-400">{formatDateTime(record.createTime)}</div>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${tone.badge}`}>
                        {change > 0 ? `+${change}` : change}
                      </span>
                    </div>
                    {record.description ? (
                      <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">{record.description}</div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
                暂无积分记录。
              </div>
            )}
          </div>
        </LitePanel>

        <LitePanel>
          <LiteSectionTitle
            eyebrow="TASK PREVIEW"
            title="积分任务"
            description="系统会按每日任务和一次性任务自动累计积分，完成后记录会同步写入积分流水。"
            action={
              <button
                type="button"
                onClick={() => navigate("/task-center")}
                className="inline-flex items-center gap-2 text-sm font-black text-teal-600 transition hover:text-teal-700"
              >
                进入任务中心
                <ArrowRight size={14} />
              </button>
            }
          />
          <div className="mt-5 space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task: any) => {
                const Icon = taskIconMap[task.taskKey] || Sparkles;
                const completed = Boolean(task.completed);
                return (
                  <div key={task.id || task.taskKey} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${completed ? "bg-emerald-50 text-emerald-600" : "bg-teal-50 text-teal-600"}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-black text-slate-900">{task.name}</div>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-600">
                            +{task.points || 0}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${completed ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            {task.statusText || (completed ? "已完成" : "待完成")}
                          </span>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-500">{task.description}</div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${completed ? "bg-emerald-500" : "bg-teal-500"}`} style={{ width: completed ? "100%" : "24%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
                暂无积分任务。
              </div>
            )}
          </div>
          <div className="mt-5 rounded-[24px] border border-dashed border-teal-200 bg-teal-50/70 px-4 py-4 text-sm leading-7 text-teal-800">
            商城兑换能力已关闭，积分仅用于记录成长、练习激励和任务完成情况。
          </div>
        </LitePanel>
      </section>
    </LitePageFrame>
  );
}
