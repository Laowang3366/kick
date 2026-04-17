import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  Award,
  Clock3,
  CreditCard,
  Gift,
  Package,
  ShoppingBag,
  Sparkles,
  Ticket,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { LiteHero, LitePageFrame, LitePanel, LiteSectionTitle } from "../components/LiteSurface";
import { api } from "../lib/api";
import { formatDateTime, formatNumber } from "../lib/format";
import { normalizeImageUrl } from "../lib/mappers";
import { mallKeys, pointsKeys, practiceKeys } from "../lib/query-keys";

const iconMap: Record<string, any> = {
  award: Award,
  sparkles: Sparkles,
  gift: Gift,
  ticket: Ticket,
  clock: Clock3,
  zap: Zap,
};

function formatEntitlementStatus(value?: string | null) {
  if (value === "active") return "已生效";
  if (value === "pending") return "待发放";
  if (value === "revoked") return "已撤销";
  if (value === "expired") return "已过期";
  return value || "-";
}

export function Mall() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const overviewQuery = useQuery({
    queryKey: mallKeys.overview(),
    queryFn: () => api.get<any>("/api/mall/overview", { silent: true }),
  });
  const pointsOverviewQuery = useQuery({
    queryKey: pointsKeys.overview(),
    queryFn: () => api.get<any>("/api/points/overview", { silent: true }),
  });
  const campaignOverviewQuery = useQuery({
    queryKey: practiceKeys.campaignOverview(),
    queryFn: () => api.get<any>("/api/practice/campaign/overview", { silent: true }),
  });
  const campaignChaptersQuery = useQuery({
    queryKey: practiceKeys.campaignChapters(),
    queryFn: () => api.get<any>("/api/practice/campaign/chapters", { silent: true }),
  });
  const typesQuery = useQuery({
    queryKey: mallKeys.types(),
    queryFn: () => api.get<any>("/api/mall/types", { silent: true }),
  });
  const itemsQuery = useQuery({
    queryKey: mallKeys.items(),
    queryFn: () => api.get<any>("/api/mall/items", { silent: true }),
  });

  const items = itemsQuery.data?.items || [];
  const typeOptions = typesQuery.data?.types || itemsQuery.data?.types || [];
  const userPoints = pointsOverviewQuery.data?.user?.points ?? overviewQuery.data?.user?.points ?? 0;
  const userExp = pointsOverviewQuery.data?.user?.exp ?? 0;
  const expProgress = pointsOverviewQuery.data?.expProgress || {};
  const campaignSummary = campaignOverviewQuery.data?.summary || {};
  const totalLevels = (campaignChaptersQuery.data?.chapters || []).reduce(
    (sum: number, chapter: any) => sum + Number(chapter?.totalLevels || 0),
    0
  );
  const clearedLevels = Number(campaignSummary.clearedLevels || 0);
  const levelProgressPercent =
    Number(expProgress.totalInLevel || 0) > 0
      ? Math.max(0, Math.min(100, Math.round((Number(expProgress.currentInLevel || 0) / Number(expProgress.totalInLevel || 0)) * 100)))
      : 100;

  const redeemMutation = useMutation({
    mutationFn: (itemId: number) => api.post<any>("/api/mall/redeem", { itemId }),
    onSuccess: async (_, itemId) => {
      const item = items.find((entry) => entry.id === itemId);
      toast.success(`成功兑换：${item?.name || "商品"}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mallKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: mallKeys.items() }),
        queryClient.invalidateQueries({ queryKey: pointsKeys.overview() }),
      ]);
    },
  });

  const filteredItems = useMemo(
    () => items.filter((item) => filter === "all" || item.type === filter),
    [filter, items]
  );

  const handleRedeem = async (item: any) => {
    if (userPoints < item.price) {
      toast.error("积分不足，请先去闯关或任务中心获取积分");
      return;
    }
    await redeemMutation.mutateAsync(item.id);
  };

  return (
    <LitePageFrame>
      <LiteHero
        eyebrow="积分经验中心"
        title="积分、经验与权益兑换"
        description="统一查看积分与经验成长，同时兑换头衔、权益和功能道具。闯关通过后，积分和经验会同步累计。"
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate("/points-history")}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-900 transition hover:-translate-y-0.5"
            >
              <Clock3 size={16} />
              积分明细
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-6 py-3 text-sm font-bold text-white"
            >
              <CreditCard size={16} />
              个人中心
            </button>
            <button
              type="button"
              onClick={() => navigate("/mall/props")}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-6 py-3 text-sm font-bold text-white"
            >
              <Package size={16} />
              我的道具
            </button>
            <button
              type="button"
              onClick={() => navigate("/task-center")}
              className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-slate-950/16 px-6 py-3 text-sm font-bold text-white"
            >
              <Gift size={16} />
              任务中心
            </button>
          </>
        }
        aside={
          <div className="rounded-[30px] border border-white/12 bg-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <CreditCard size={24} />
              </div>
              <div>
                <div className="text-[12px] font-black tracking-[0.18em] text-white/68">成长总览</div>
                <div className="mt-2 text-xl font-black text-white">
                  Lv.{expProgress.level || 1} {expProgress.levelName || "新手"}
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: "当前积分", value: formatNumber(userPoints) },
                { label: "当前经验", value: formatNumber(userExp) },
                { label: "已通关卡", value: `${clearedLevels}/${totalLevels || 0}` },
                { label: "待处理兑换", value: overviewQuery.data?.pendingRedemptions ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                  <div className="text-[11px] font-bold text-white/68">{item.label}</div>
                  <div className="mt-2 text-xl font-black text-white">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-white/70">
                <span>等级进度</span>
                <span>{levelProgressPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white" style={{ width: `${levelProgressPercent}%` }} />
              </div>
            </div>
          </div>
        }
        className="bg-[linear-gradient(135deg,#5b2c00_0%,#d97706_36%,#fb7185_100%)]"
      />

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <LitePanel>
          <LiteSectionTitle
            eyebrow="兑换记录"
            title="最近兑换"
            description="查看最近兑换权益的处理状态。"
            action={
              <button
                type="button"
                onClick={() => navigate("/points-history")}
                className="text-sm font-black text-teal-600 transition hover:text-teal-700"
              >
                查看更多
              </button>
            }
          />
          <div className="mt-5 space-y-3">
            {(overviewQuery.data?.recentRedemptions || []).map((record: any) => (
              <div key={record.id} className="rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-slate-900">{record.itemName}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-400">{record.itemTypeLabel || record.itemType}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      record.status === "fulfilled"
                        ? "bg-emerald-50 text-emerald-600"
                        : record.status === "pending"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {record.statusLabel || record.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <div className="text-[11px] font-bold text-slate-400">价格</div>
                    <div className="mt-2 text-sm font-black text-amber-600">{record.price}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <div className="text-[11px] font-bold text-slate-400">时间</div>
                    <div className="mt-2 text-sm font-black text-slate-800">{formatDateTime(record.createTime)}</div>
                  </div>
                </div>
                {record.entitlementStatus ? (
                  <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">
                    <span className="font-semibold">权益状态：</span>
                    <span className="font-black text-slate-800">{formatEntitlementStatus(record.entitlementStatus)}</span>
                  </div>
                ) : null}
              </div>
            ))}
          {!(overviewQuery.data?.recentRedemptions || []).length ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
              还没有兑换记录，先挑一个权益试试。
            </div>
          ) : null}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate("/mall/redemptions")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              查看全部兑换记录
            </button>
          </div>
        </div>
      </LitePanel>

        <LitePanel className="overflow-hidden">
          <LiteSectionTitle
            eyebrow="权益列表"
            title="可兑换内容"
            description="按类型筛选并兑换可用权益与道具。"
          />
          <div className="mt-5 flex items-center gap-3 overflow-x-auto pb-1">
            {[{ value: "all", label: "全部内容" }, ...typeOptions.map((item: any) => ({ value: item.value, label: item.label }))].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFilter(type.value)}
                className={`rounded-full px-5 py-2.5 text-sm font-black whitespace-nowrap transition ${
                  filter === type.value
                    ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
                    : "bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredItems.map((item, idx) => {
              const Icon = iconMap[item.iconKey] || Gift;
              const buttonLabel = item.canRedeem
                ? "立即兑换"
                : item.exchangeState === "points_insufficient"
                  ? "积分不足"
                  : item.exchangeState === "sold_out"
                    ? "已售罄"
                    : item.exchangeState === "user_limit"
                      ? "已达限额"
                      : item.exchangeState === "total_limit"
                        ? "总量已满"
                        : item.exchangeState === "not_started"
                          ? "未开始"
                          : item.exchangeState === "ended"
                            ? "已结束"
                            : "已下架";

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafb_100%)] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] border border-teal-100 bg-teal-50 shadow-sm">
                        {item.coverImage ? (
                          <img src={normalizeImageUrl(item.coverImage)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon className="text-teal-600" size={30} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xl font-black tracking-tight text-slate-900">{item.name}</div>
                        <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                          {item.typeLabel || item.type}
                        </div>
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[11px] font-black ${item.canRedeem ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                      {item.exchangeMessage}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-500">{item.description}</p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-[11px] font-bold text-slate-400">库存</div>
                      <div className="mt-2 text-sm font-black text-slate-800">
                        {item.stock === null || item.stock === undefined ? "不限" : item.stock}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-[11px] font-bold text-slate-400">限兑</div>
                      <div className="mt-2 text-sm font-black text-slate-800">
                        {item.perUserLimit ? `每人 ${item.perUserLimit}` : item.totalLimit ? `总计 ${item.totalLimit}` : "不限制"}
                      </div>
                    </div>
                  </div>

                  {(item.availableFrom || item.availableUntil) ? (
                    <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-xs leading-6 text-slate-500">
                      <span className="font-semibold">时间窗口：</span>
                      {item.availableFrom ? formatDateTime(item.availableFrom) : "立即"} - {item.availableUntil ? formatDateTime(item.availableUntil) : "长期"}
                    </div>
                  ) : null}

                  {item.exchangeNotice ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-slate-200 px-3 py-3 text-xs leading-6 text-slate-500">
                      {item.exchangeNotice}
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Award size={18} />
                      <span className="text-2xl font-black">{item.price}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRedeem(item)}
                      disabled={!item.canRedeem || redeemMutation.isPending}
                      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition ${
                        item.canRedeem
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {buttonLabel}
                      <ShoppingBag size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </LitePanel>
      </section>
    </LitePageFrame>
  );
}
