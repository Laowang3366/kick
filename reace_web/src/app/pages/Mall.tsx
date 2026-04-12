import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ShoppingBag, Award, Gift, CreditCard, Clock, Sparkles, Zap, Ticket, Package } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { formatDateTime, formatNumber } from "../lib/format";
import { mallKeys, pointsKeys } from "../lib/query-keys";
import { normalizeImageUrl } from "../lib/mappers";

const iconMap: Record<string, any> = {
  award: Award,
  sparkles: Sparkles,
  gift: Gift,
  ticket: Ticket,
  clock: Clock,
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
  const typesQuery = useQuery({
    queryKey: mallKeys.types(),
    queryFn: () => api.get<any>("/api/mall/types", { silent: true }),
  });
  const itemsQuery = useQuery({
    queryKey: mallKeys.items(),
    queryFn: () => api.get<any>("/api/mall/items", { silent: true }),
  });
  const userPoints = overviewQuery.data?.user?.points || 0;
  const items = itemsQuery.data?.items || [];
  const typeOptions = typesQuery.data?.types || itemsQuery.data?.types || [];

  const redeemMutation = useMutation({
    mutationFn: (itemId: number) => api.post<any>("/api/mall/redeem", { itemId }),
    onSuccess: async (result, itemId) => {
      const item = items.find((entry) => entry.id === itemId);
      toast.success(`成功兑换：${item?.name || "商品"}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mallKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: mallKeys.items() }),
        queryClient.invalidateQueries({ queryKey: pointsKeys.overview() }),
      ]);
    },
  });

  const filteredItems = useMemo(() => items.filter((item) => filter === "all" || item.type === filter), [filter, items]);

  const handleRedeem = async (item: any) => {
    if (userPoints < item.price) {
      toast.error("积分不足，请多多活跃获取积分！");
      return;
    }
    await redeemMutation.mutateAsync(item.id);
  };

  const openPropsDialog = () => {
    window.dispatchEvent(new CustomEvent("excel-open-props-dialog"));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-6 z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
            <CreditCard size={40} className="text-white drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-teal-50 mb-1">当前可用积分</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight">{formatNumber(userPoints)}</span>
              <span className="text-lg font-medium text-teal-100">分</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 z-10 w-full md:w-auto">
          <button onClick={() => navigate("/points-history")} className="flex-1 md:flex-none px-6 py-3 bg-white text-teal-700 rounded-xl font-bold shadow-lg shadow-teal-700/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Clock size={18} />
            积分明细
          </button>
          <button onClick={openPropsDialog} className="flex-1 md:flex-none px-6 py-3 bg-white/15 backdrop-blur-sm text-white border border-white/25 rounded-xl font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2">
            <Package size={18} />
            我的道具
          </button>
          <button onClick={() => navigate("/task-center")} className="flex-1 md:flex-none px-6 py-3 bg-teal-800/40 backdrop-blur-sm text-white border border-teal-400/30 rounded-xl font-medium hover:bg-teal-800/60 transition-all flex items-center justify-center gap-2">
            <Gift size={18} />
            任务中心赚积分
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[{ value: "all", label: "全部商品" }, ...typeOptions.map((item: any) => ({ value: item.value, label: item.label }))].map((type) => (
          <button key={type.value} onClick={() => setFilter(type.value)} className={`px-6 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all shadow-sm ${filter === type.value ? "bg-slate-800 text-white shadow-slate-800/20" : "bg-white text-slate-600 border border-gray-200 hover:border-teal-300 hover:bg-teal-50"}`}>
            {type.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">可兑换商品</div>
          <div className="mt-2 text-2xl font-black text-slate-800">{overviewQuery.data?.availableItems ?? items.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">累计兑换</div>
          <div className="mt-2 text-2xl font-black text-slate-800">{overviewQuery.data?.totalRedemptions ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">待处理兑换</div>
          <div className="mt-2 text-2xl font-black text-amber-600">{overviewQuery.data?.pendingRedemptions ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">当前筛选结果</div>
          <div className="mt-2 text-2xl font-black text-slate-800">{filteredItems.length}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-slate-800">我的最近兑换</div>
            <div className="mt-1 text-sm text-slate-500">查看商品是否已到账、待处理或已取消。</div>
          </div>
          <button onClick={() => navigate("/points-history")} className="text-sm font-bold text-teal-600 hover:text-teal-700">
            查看积分明细
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(overviewQuery.data?.recentRedemptions || []).map((record: any) => (
            <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-bold text-slate-800">{record.itemName}</div>
                  <div className="mt-1 text-xs text-slate-400">{record.itemTypeLabel || record.itemType}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  record.status === "fulfilled"
                    ? "bg-emerald-50 text-emerald-600"
                    : record.status === "pending"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-rose-50 text-rose-600"
                }`}>
                  {record.statusLabel || record.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                <span>价格</span>
                <span className="font-bold text-amber-500">{record.price}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                <span>时间</span>
                <span className="font-medium text-slate-700">{formatDateTime(record.createTime)}</span>
              </div>
              {record.entitlementStatus && (
                <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                  <span>权益状态</span>
                  <span className="font-medium text-slate-700">{formatEntitlementStatus(record.entitlementStatus)}</span>
                </div>
              )}
            </div>
          ))}
          {!(overviewQuery.data?.recentRedemptions || []).length && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-400">
              你还没有兑换记录，去挑选一个喜欢的商品吧。
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, idx) => {
          const Icon = iconMap[item.iconKey] || Gift;
          const buttonLabel = item.canRedeem
            ? "兑换"
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} key={item.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group relative overflow-hidden">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform bg-teal-50 border-teal-200 overflow-hidden">
                  {item.coverImage
                    ? <img src={normalizeImageUrl(item.coverImage)} alt="" className="h-full w-full object-cover" />
                    : <Icon className="text-teal-500" size={32} />}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.canRedeem ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                }`}>
                  {item.typeLabel || item.type}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors line-clamp-1">{item.name}</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-2">{item.description}</p>
              <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500 mb-5">
                <div className="flex items-center justify-between"><span>状态</span><span className="font-bold text-slate-700">{item.exchangeMessage}</span></div>
                <div className="flex items-center justify-between"><span>库存</span><span className="font-bold text-slate-700">{item.stock === null || item.stock === undefined ? "不限" : item.stock}</span></div>
                <div className="flex items-center justify-between"><span>限兑</span><span className="font-bold text-slate-700">{item.perUserLimit ? `每人 ${item.perUserLimit}` : item.totalLimit ? `总计 ${item.totalLimit}` : "不限制"}</span></div>
                {(item.availableFrom || item.availableUntil) && (
                  <div className="flex items-center justify-between"><span>时间</span><span className="font-bold text-slate-700">{item.availableFrom ? formatDateTime(item.availableFrom) : "立即"} - {item.availableUntil ? formatDateTime(item.availableUntil) : "长期"}</span></div>
                )}
              </div>
              {item.exchangeNotice && <p className="mb-5 text-xs leading-relaxed text-slate-400 line-clamp-2">{item.exchangeNotice}</p>}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                <div className="flex items-center gap-1.5 font-bold text-lg text-amber-500"><Award size={18} />{item.price}</div>
                <button onClick={() => handleRedeem(item)} disabled={!item.canRedeem || redeemMutation.isPending} className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-1.5 ${item.canRedeem ? "bg-teal-500 hover:bg-teal-600 text-white hover:-translate-y-0.5 shadow-teal-500/30" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  {buttonLabel}
                  <ShoppingBag size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
