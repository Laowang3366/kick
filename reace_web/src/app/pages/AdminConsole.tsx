import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  BellRing,
  BookMarked,
  CheckCircle2,
  Edit3,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  Lock,
  MessageSquare,
  RefreshCcw,
  Send,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  Unlock,
  UploadCloud,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { api, ApiError } from "../lib/api";
import {
  buildWorkbookWithAnswerSnapshot,
  columnIndexToLabel,
  extractRangeAnswerSnapshot,
  ExcelRangeSelection,
  ExcelWorkbookSnapshot,
  normalizeSelection,
  parseRangeRef,
  selectionToRangeRef,
} from "../lib/excel";
import { normalizeImageUrl } from "../lib/mappers";
import { adminKeys } from "../lib/query-keys";
import { useSession } from "../lib/session";
import {
  canAccessAdminPath,
  canManageCategoryMutations,
  getAdminModulesForRole,
  getDefaultAdminPath,
  hasAdminConsoleAccess,
  type AdminRole,
} from "../admin/config";
import {
  AddButton,
  AdminEmptyState,
  AdminPageShell,
  AdminPagination,
  AdminPermissionNotice,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  FilterBar,
  FilterField,
  formatMaybeDate,
  formatAdminRole,
  formatAdminStatus,
  formatExperienceBizType,
  formatFeedbackType,
  formatRoleList,
  formatNotificationTarget,
  formatNotificationType,
  EXPERIENCE_BIZ_TYPE_OPTIONS,
  FEEDBACK_TYPE_OPTIONS,
  NOTIFICATION_TARGET_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  formatPointsTaskKey,
  formatPointsRuleType,
  formatQuestionType,
  formatReportTargetType,
  POINTS_RULE_TYPE_OPTIONS,
  POINTS_TASK_KEY_OPTIONS,
  ROLE_OPTIONS,
  primaryButtonClassName,
  secondaryButtonClassName,
  statusBadgeClassName,
  inputClassName,
  textareaClassName,
} from "../admin/shared";

const ExcelWorkbookEditor = lazy(() =>
  import("../components/ExcelWorkbookEditor").then((module) => ({ default: module.ExcelWorkbookEditor }))
);

type FormDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  contentClassName?: string;
  bodyClassName?: string;
  onSubmit: () => Promise<void> | void;
  children: React.ReactNode;
};

type AdminConfirmRequest = {
  kind: "confirm";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
};

type AdminPromptRequest = {
  kind: "prompt";
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  resolve: (value: string | null) => void;
};

type AdminFeedbackRequest = {
  kind: "feedback";
  type: "success" | "error";
  title?: string;
  message: string;
  confirmLabel?: string;
  durationMs?: number;
};

type AdminDialogRequest = AdminConfirmRequest | AdminPromptRequest | AdminFeedbackRequest;
type AdminDialogController = {
  showFeedback: (request: AdminFeedbackRequest) => void;
  openConfirm: (options: Omit<AdminConfirmRequest, "kind" | "resolve">) => Promise<boolean>;
  openPrompt: (options: Omit<AdminPromptRequest, "kind" | "resolve">) => Promise<string | null>;
};

let adminDialogController: AdminDialogController | null = null;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading } = useSession();
  const role = hasAdminConsoleAccess(user?.role) ? (user?.role as AdminRole) : null;
  const modules = useMemo(() => getAdminModulesForRole(role), [role]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!hasAdminConsoleAccess(user?.role)) {
      navigate("/", { replace: true });
      return;
    }
    if (!canAccessAdminPath(user?.role, location.pathname)) {
      navigate(getDefaultAdminPath(user?.role), { replace: true });
    }
  }, [isAuthenticated, loading, location.pathname, navigate, user?.role]);

  if (loading || !isAuthenticated || !role) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] lg:grid lg:grid-cols-[208px_1fr]">
      <aside className="hidden bg-[#001529] text-white shadow-[2px_0_8px_rgba(0,0,0,0.08)] lg:flex lg:min-h-screen lg:flex-col">
        <div className="h-16 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#1677ff] text-white">
              A
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-white">Excel社区</div>
              <div className="text-xs text-white/45">Admin Console</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <div className="mb-2 px-5 text-[11px] font-black uppercase tracking-[0.22em] text-white/35">模块导航</div>
          <div className="space-y-0.5">
              {modules.map((module) => {
                const isActive = location.pathname === module.path;
                const Icon = module.icon;
                return (
                  <button
                    key={module.key}
                    type="button"
                    onClick={() => navigate(module.path)}
                    className={`group relative flex h-10 w-full items-center gap-3 px-5 text-left transition ${
                      isActive
                        ? "bg-[#1677ff] font-medium text-white"
                        : "text-white/65 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-[#69c0ff]" />}
                    <Icon size={16} className={isActive ? "text-white" : "text-white/45 group-hover:text-white/80"} />
                    <div className="min-w-0 text-sm">{module.label}</div>
                  </button>
                );
              })}
              </div>
          </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#f0f0f0] bg-white shadow-[0_1px_4px_rgba(0,21,41,0.08)]">
          <div className="flex min-h-14 items-center justify-between gap-4 px-5 md:px-6">
            <div className="min-w-0 truncate text-[18px] font-medium text-[#262626]">站点管理后台</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img
                  src={normalizeImageUrl(user?.avatar) || "https://i.pravatar.cc/120?img=52"}
                  alt={user?.username || "admin"}
                  className="h-8 w-8 rounded-full border border-[#f0f0f0] object-cover"
                />
                <div className="hidden leading-tight sm:block">
                  <div className="text-sm font-medium text-[#262626]">{user?.username}</div>
                  <div className="text-xs text-[#8c8c8c]">{role === "admin" ? "管理员" : "版主"}</div>
                </div>
              </div>
              <Link to="/" className={secondaryButtonClassName()}>
                <ArrowLeft size={16} />
                返回站点
              </Link>
            </div>
          </div>
        </header>

        <div className="px-4 py-4 md:px-6 md:py-5">
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
      <AdminDialogHost />
    </div>
  );
}

export function AdminIndex() {
  const navigate = useNavigate();
  const { user } = useSession();

  useEffect(() => {
    navigate(getDefaultAdminPath(user?.role), { replace: true });
  }, [navigate, user?.role]);

  return null;
}

export function AdminOverview() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const statsQuery = useQuery({
    queryKey: adminKeys.stats(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest(api.get<{ stats: Record<string, any> }>("/api/admin/stats", { silent: true }), navigate, role);
      return result?.stats || null;
    },
  });
  const stats = statsQuery.data;
  const overviewStats = stats?.overview || {};
  const userStats = stats?.users || {};
  const contentStats = stats?.content || {};
  const interactionStats = stats?.interaction || {};
  const moderationStats = stats?.moderation || {};
  const practiceStats = stats?.practice || {};
  const pointsStats = stats?.pointsAndLevels || {};
  const mallStats = stats?.mall || {};

  const focusMetrics = [
    { label: "在线用户", value: overviewStats.onlineUsers ?? 0, hint: `管理员 ${userStats.admins ?? 0} / 版主 ${userStats.moderators ?? 0}`, icon: Users, tone: "teal" },
    { label: "今日新增用户", value: overviewStats.todayNewUsers ?? 0, hint: `锁定 ${userStats.locked ?? 0} · 禁言 ${userStats.muted ?? 0}`, icon: UserCog, tone: "blue" },
    { label: "今日发帖 / 回复", value: `${overviewStats.todayPosts ?? 0} / ${overviewStats.todayReplies ?? 0}`, hint: `签到 ${overviewStats.todayCheckins ?? 0}`, icon: MessageSquare, tone: "amber" },
    { label: "待处理事项", value: (moderationStats.pendingReports ?? 0) + (moderationStats.pendingFeedback ?? 0) + (moderationStats.pendingPostReviews ?? 0) + (moderationStats.pendingPracticeSubmissions ?? 0), hint: `举报 ${moderationStats.pendingReports ?? 0} · 反馈 ${moderationStats.pendingFeedback ?? 0}`, icon: ShieldAlert, tone: "rose" },
  ];

  return (
    <AdminPageShell title="后台总览" description="集中查看本站核心数据、业务状态和待处理事项。">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#eff6ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#f1f5f9_100%)] p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-700">
              <Sparkles size={14} />
              Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">社区运营总览</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              按用户、内容、互动、审核、练习、商城六个维度集中查看本站关键数据，优先暴露今日变化和待处理事项。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px]">
            {focusMetrics.map((item) => (
              <OverviewMetricCard key={item.label} {...item} />
            ))}
          </div>
        </div>
      </section>

      <AdminSection title="用户与内容概览">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewDataCard label="注册用户" value={userStats.total ?? stats?.userCount ?? 0} hint={`关注关系 ${userStats.followers ?? 0}`} />
          <OverviewDataCard label="板块 / 草稿" value={`${contentStats.categories ?? stats?.categoryCount ?? 0} / ${contentStats.drafts ?? 0}`} hint={`板块关注 ${contentStats.categoryFollowers ?? 0}`} />
          <OverviewDataCard label="正常帖子" value={contentStats.activePosts ?? stats?.postCount ?? 0} hint={`置顶 ${contentStats.topPosts ?? 0} · 精华 ${contentStats.essencePosts ?? 0}`} />
          <OverviewDataCard label="回复总量" value={contentStats.activeReplies ?? stats?.replyCount ?? 0} hint={`锁帖 ${contentStats.lockedPosts ?? 0} · 删除帖 ${contentStats.deletedPosts ?? stats?.deletedPostCount ?? 0}`} />
        </div>
      </AdminSection>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminSection title="互动与消息">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewDataCard label="点赞" value={interactionStats.likes ?? 0} />
            <OverviewDataCard label="收藏" value={interactionStats.favorites ?? 0} />
            <OverviewDataCard label="浏览" value={interactionStats.views ?? 0} />
            <OverviewDataCard label="分享" value={interactionStats.shares ?? 0} />
            <OverviewDataCard label="私信总量" value={interactionStats.privateMessages ?? 0} hint={`未读 ${interactionStats.unreadPrivateMessages ?? 0}`} />
            <OverviewDataCard label="站内通知" value={interactionStats.notifications ?? 0} hint={`未读 ${interactionStats.unreadNotifications ?? 0}`} />
            <OverviewDataCard label="站内公告" value={interactionStats.siteNotifications ?? 0} />
            <OverviewDataCard label="公共聊天室消息" value={interactionStats.chatMessages ?? 0} />
          </div>
        </AdminSection>

        <AdminSection title="审核与待办">
          <div className="space-y-3">
            <OverviewProgressRow label="帖子待审核" value={moderationStats.pendingPostReviews ?? 0} tone="amber" />
            <OverviewProgressRow label="试题投稿待审核" value={moderationStats.pendingPracticeSubmissions ?? 0} tone="sky" />
            <OverviewProgressRow label="举报待处理" value={moderationStats.pendingReports ?? stats?.pendingReports ?? 0} tone="rose" />
            <OverviewProgressRow label="反馈待处理" value={moderationStats.pendingFeedback ?? stats?.pendingFeedback ?? 0} tone="teal" />
            <OverviewProgressRow label="举报已处理 / 忽略" value={`${moderationStats.handledReports ?? 0} / ${moderationStats.ignoredReports ?? 0}`} tone="slate" textValue />
            <OverviewProgressRow label="反馈已处理 / 忽略" value={`${moderationStats.handledFeedback ?? 0} / ${moderationStats.ignoredFeedback ?? 0}`} tone="slate" textValue />
          </div>
        </AdminSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection title="练习与题库">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewDataCard label="题目总数" value={practiceStats.questions ?? 0} hint={`启用 ${practiceStats.enabledQuestions ?? 0}`} />
            <OverviewDataCard label="题目分类" value={practiceStats.questionCategories ?? 0} hint={`模板 ${practiceStats.questionTemplates ?? 0}`} />
            <OverviewDataCard label="练习记录" value={practiceStats.practiceRecords ?? 0} hint={`答案 ${practiceStats.practiceAnswers ?? 0}`} />
            <OverviewDataCard label="用户投稿" value={practiceStats.submissions ?? 0} hint={`完成 ${practiceStats.completedSubmissions ?? 0} · 驳回 ${practiceStats.rejectedSubmissions ?? 0}`} />
          </div>
        </AdminSection>

        <AdminSection title="积分、等级与商城">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewDataCard label="积分规则" value={pointsStats.pointsRules ?? 0} hint={`启用 ${pointsStats.enabledPointsRules ?? 0}`} />
            <OverviewDataCard label="积分记录" value={pointsStats.pointsRecords ?? 0} hint={`规则选项 ${pointsStats.pointsOptions ?? 0}`} />
            <OverviewDataCard label="经验规则 / 等级" value={`${pointsStats.expRules ?? 0} / ${pointsStats.levelRules ?? 0}`} hint={`经验日志 ${pointsStats.expLogs ?? 0}`} />
            <OverviewDataCard label="用户权益" value={pointsStats.entitlements ?? 0} hint={`商城待发放 ${mallStats.pendingRedemptions ?? 0}`} />
            <OverviewDataCard label="商城商品" value={mallStats.totalItems ?? 0} hint={`启用 ${mallStats.enabledItems ?? 0}`} />
            <OverviewDataCard label="商品类型" value={mallStats.typeCount ?? 0} />
            <OverviewDataCard label="兑换已发放" value={mallStats.fulfilledRedemptions ?? 0} />
            <OverviewDataCard label="兑换已取消" value={mallStats.cancelledRedemptions ?? 0} />
          </div>
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}

function OverviewMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: any;
  tone: "teal" | "blue" | "amber" | "rose";
}) {
  const toneMap = {
    teal: "from-teal-500/12 via-white to-teal-50 text-teal-700",
    blue: "from-sky-500/12 via-white to-sky-50 text-sky-700",
    amber: "from-amber-500/12 via-white to-amber-50 text-amber-700",
    rose: "from-rose-500/12 via-white to-rose-50 text-rose-700",
  }[tone];

  return (
    <div className={`rounded-3xl border border-white/70 bg-gradient-to-br px-5 py-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] ${toneMap}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</div>
          {hint ? <div className="mt-2 text-xs font-medium text-slate-500">{hint}</div> : null}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function OverviewDataCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function OverviewProgressRow({
  label,
  value,
  tone,
  textValue = false,
}: {
  label: string;
  value: React.ReactNode;
  tone: "amber" | "sky" | "rose" | "teal" | "slate";
  textValue?: boolean;
}) {
  const toneMap = {
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    rose: "bg-rose-500",
    teal: "bg-teal-500",
    slate: "bg-slate-500",
  }[tone];
  const numericValue = typeof value === "number" ? value : 0;
  const width = textValue ? 100 : Math.min(100, Math.max(8, numericValue * 8));
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${toneMap}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AdminReview() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [practiceStatus, setPracticeStatus] = useState("pending");
  const [practicePage, setPracticePage] = useState(1);
  const size = 10;
  const reviewQuery = useQuery({
    queryKey: adminKeys.review({ page, size, status }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(
        api.get(`/api/admin/posts/review?page=${page}&size=${size}&reviewStatus=${status}`, { silent: true }),
        navigate,
        role
      );
      return result || { records: [], total: 0 };
    },
  });
  const records = reviewQuery.data?.records || [];
  const total = reviewQuery.data?.total || 0;
  const practiceReviewQuery = useQuery({
    queryKey: adminKeys.practiceReview({ page: practicePage, size, status: practiceStatus }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(
        api.get(`/api/admin/practice-submissions?page=${practicePage}&size=${size}&status=${practiceStatus}`, { silent: true }),
        navigate,
        role
      );
      return result || { records: [], total: 0 };
    },
  });
  const practiceRecords = practiceReviewQuery.data?.records || [];
  const practiceTotal = practiceReviewQuery.data?.total || 0;

  const handleReview = async (id: number, nextStatus: "approved" | "rejected") => {
    const reason = nextStatus === "rejected"
      ? (await openAdminPrompt({
        title: "驳回帖子",
        message: "请填写驳回原因，提交后将通知发帖用户。",
        label: "驳回原因",
        placeholder: "请输入驳回原因",
        confirmLabel: "确认驳回",
        required: true,
      })) || ""
      : "";
    if (nextStatus === "rejected" && !reason.trim()) return;
    const result = await adminRequest(
      api.put(`/api/admin/posts/${id}/review`, { status: nextStatus, reason }),
      navigate,
      role,
      nextStatus === "approved" ? "审核帖子" : "驳回帖子",
    );
    if (!result) return;
    showAdminSuccess(nextStatus === "approved" ? "帖子已通过审核" : "帖子已驳回");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.review({ page, size, status }) }),
      queryClient.invalidateQueries({ queryKey: adminKeys.posts({ page: 1, size: 10, keyword: "", status: "active", categoryId: "" }) }),
    ]);
  };

  const handlePracticeReview = async (id: number, nextStatus: "approved" | "rejected") => {
    const reason = nextStatus === "rejected"
      ? (await openAdminPrompt({
        title: "驳回试题投稿",
        message: "请填写驳回原因，提交后将通知投稿用户。",
        label: "驳回原因",
        placeholder: "请输入驳回原因",
        confirmLabel: "确认驳回",
        required: true,
      })) || ""
      : "";
    if (nextStatus === "rejected" && !reason.trim()) return;
    const result = await adminRequest(
      api.put(`/api/admin/practice-submissions/${id}/review`, { status: nextStatus, reason }),
      navigate,
      role,
      nextStatus === "approved" ? "审核试题投稿" : "驳回试题投稿",
    );
    if (!result) return;
    showAdminSuccess(nextStatus === "approved" ? "试题投稿已通过审核并入库" : "试题投稿已驳回");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.practiceReview({ page: practicePage, size, status: practiceStatus }) }),
      queryClient.invalidateQueries({ queryKey: adminKeys.questions({ page: 1, size: 10, type: "excel_template", questionCategoryId: "" }) }),
    ]);
  };

  return (
    <AdminPageShell title="帖子审核" description="处理普通用户提交后的待审核帖子。">
      <AdminSection title="审核队列">
        <FilterBar>
          <FilterField label="审核状态">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClassName()}>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
            </select>
          </FilterField>
        </FilterBar>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>帖子</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>板块</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[320px]">
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-400">{item.content?.replace(/<[^>]+>/g, "")}</div>
                  </TableCell>
                  <TableCell>{item.author?.username || "-"}</TableCell>
                  <TableCell>{item.category?.name || "-"}</TableCell>
                  <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                  <TableCell>
                    <span className={statusBadgeClassName(item.reviewStatus)}>{formatAdminStatus(item.reviewStatus)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => navigate(`/post/${item.id}`)} className={secondaryButtonClassName()}>
                        <Eye size={14} />
                        查看
                      </button>
                      {item.reviewStatus === "pending" && (
                        <>
                          <button type="button" onClick={() => handleReview(item.id, "approved")} className={primaryButtonClassName()}>
                            <CheckCircle2 size={14} />
                            通过
                          </button>
                          <button type="button" onClick={() => handleReview(item.id, "rejected")} className={secondaryButtonClassName()}>
                            <ShieldAlert size={14} />
                            驳回
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {records.length === 0 && <AdminEmptyState message="当前条件下没有审核帖子。" />}
          <div className="mt-4">
            <AdminPagination current={page} size={size} total={total} onChange={setPage} />
          </div>
        </div>
      </AdminSection>

      <PracticeSubmissionReviewSection
        practiceStatus={practiceStatus}
        setPracticeStatus={setPracticeStatus}
        practicePage={practicePage}
        setPracticePage={setPracticePage}
        practiceRecords={practiceRecords}
        practiceTotal={practiceTotal}
        size={size}
        handlePracticeReview={handlePracticeReview}
      />

    </AdminPageShell>
  );
}

export function AdminReports() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [feedbackStatus, setFeedbackStatus] = useState("pending");
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackKeyword, setFeedbackKeyword] = useState("");
  const [feedbackPage, setFeedbackPage] = useState(1);
  const size = 10;
  const reportsQuery = useQuery({
    queryKey: adminKeys.reports({ page, size, status }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(
        api.get(`/api/admin/reports?page=${page}&size=${size}&status=${status}`, { silent: true }),
        navigate,
        role
      );
      return result || { reports: [], total: 0 };
    },
  });
  const reports = reportsQuery.data?.reports || [];
  const total = reportsQuery.data?.total || 0;
  const feedbackParams = new URLSearchParams({
    page: String(feedbackPage),
    size: String(size),
    status: feedbackStatus,
  });
  if (feedbackType) feedbackParams.set("type", feedbackType);
  if (feedbackKeyword.trim()) feedbackParams.set("keyword", feedbackKeyword.trim());
  const feedbackQuery = useQuery({
    queryKey: adminKeys.feedback({
      page: feedbackPage,
      size,
      status: feedbackStatus,
      type: feedbackType,
      keyword: feedbackKeyword.trim(),
    }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(
        api.get(`/api/admin/feedback?${feedbackParams.toString()}`, { silent: true }),
        navigate,
        role
      );
      return result || { records: [], total: 0 };
    },
  });
  const feedbackRecords = feedbackQuery.data?.records || [];
  const feedbackTotal = feedbackQuery.data?.total || 0;

  const handleReport = async (id: number, action: "delete" | "ignore") => {
    const result = await adminRequest(
      api.put(`/api/admin/reports/${id}/handle`, { action }),
      navigate,
      role,
      action === "delete" ? "处理举报并删除内容" : "忽略举报",
    );
    if (!result) return;
    showAdminSuccess(action === "delete" ? "举报对象已处理删除" : "举报已忽略");
    await queryClient.invalidateQueries({ queryKey: adminKeys.reports({ page, size, status }) });
  };

  const handleFeedback = async (item: any, action: "handle" | "ignore") => {
    const note = await openAdminPrompt({
      title: action === "handle" ? "处理反馈建议" : "忽略反馈建议",
      message: "可填写处理备注，便于后续追踪。",
      label: "处理备注",
      placeholder: "选填处理备注",
      confirmLabel: action === "handle" ? "标记已处理" : "确认忽略",
      required: false,
    });
    if (note === null) return;
    const result = await adminRequest(
      api.put(`/api/admin/feedback/${item.id}/handle`, { action, note }),
      navigate,
      role,
      action === "handle" ? "处理反馈建议" : "忽略反馈建议",
    );
    if (!result) return;
    showAdminSuccess(action === "handle" ? "反馈建议已标记处理" : "反馈建议已忽略");
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminKeys.feedback({
          page: feedbackPage,
          size,
          status: feedbackStatus,
          type: feedbackType,
          keyword: feedbackKeyword.trim(),
        }),
      }),
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() }),
    ]);
  };

  return (
    <AdminPageShell title="举报处理" description="查看用户举报与反馈建议，并执行处理操作。">
      <AdminSection title="举报列表">
        <FilterBar>
          <FilterField label="处理状态">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClassName()}>
              <option value="pending">待处理</option>
              <option value="handled">已处理</option>
              <option value="ignored">已忽略</option>
            </select>
          </FilterField>
        </FilterBar>
        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>举报内容</TableHead>
                <TableHead>举报人</TableHead>
                <TableHead>目标对象</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[260px]">
                    <div className="font-bold text-slate-800">{item.reason}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.description || "无补充说明"}</div>
                  </TableCell>
                  <TableCell>{item.reporter?.username || "-"}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="font-medium text-slate-700">{formatReportTargetType(item.targetType)}</div>
                    <div className="mt-1 text-xs text-slate-400 line-clamp-2">{item.target?.title || item.target?.content || "-"}</div>
                  </TableCell>
                  <TableCell>{formatMaybeDate(item.createdAt)}</TableCell>
                  <TableCell>
                    <span className={statusBadgeClassName(item.status)}>{formatAdminStatus(item.status)}</span>
                  </TableCell>
                  <TableCell>
                    {item.status === "pending" ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleReport(item.id, "delete")} className={primaryButtonClassName()}>
                          违规删除
                        </button>
                        <button type="button" onClick={() => handleReport(item.id, "ignore")} className={secondaryButtonClassName()}>
                          忽略
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">已处理</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {reports.length === 0 && <AdminEmptyState message="当前没有符合条件的举报记录。" />}
          <div className="mt-4">
            <AdminPagination current={page} size={size} total={total} onChange={setPage} />
          </div>
        </div>
      </AdminSection>

      <AdminSection title="反馈建议">
        <FilterBar>
          <FilterField label="反馈类型">
            <select value={feedbackType} onChange={(e) => { setFeedbackType(e.target.value); setFeedbackPage(1); }} className={inputClassName()}>
              <option value="">全部类型</option>
              {FEEDBACK_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="处理状态">
            <select value={feedbackStatus} onChange={(e) => { setFeedbackStatus(e.target.value); setFeedbackPage(1); }} className={inputClassName()}>
              <option value="pending">待处理</option>
              <option value="handled">已处理</option>
              <option value="ignored">已忽略</option>
            </select>
          </FilterField>
          <FilterField label="关键字">
            <input
              value={feedbackKeyword}
              onChange={(e) => { setFeedbackKeyword(e.target.value); setFeedbackPage(1); }}
              className={inputClassName()}
              placeholder="搜索反馈内容"
            />
          </FilterField>
        </FilterBar>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>反馈类型</TableHead>
                <TableHead>反馈内容</TableHead>
                <TableHead>提交用户</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>处理信息</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbackRecords.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium text-slate-700">{formatFeedbackType(item.type)}</span>
                  </TableCell>
                  <TableCell className="max-w-[360px]">
                    <div className="line-clamp-3 text-sm text-slate-700">{item.content}</div>
                  </TableCell>
                  <TableCell>{item.user?.username || "-"}</TableCell>
                  <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                  <TableCell>
                    <span className={statusBadgeClassName(item.status)}>{formatAdminStatus(item.status)}</span>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <div className="text-sm text-slate-600">{item.handler?.username || "-"}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-400">{item.handleNote || "暂无处理备注"}</div>
                  </TableCell>
                  <TableCell>
                    {item.status === "pending" ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleFeedback(item, "handle")} className={primaryButtonClassName()}>
                          处理
                        </button>
                        <button type="button" onClick={() => handleFeedback(item, "ignore")} className={secondaryButtonClassName()}>
                          忽略
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">已完成</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {feedbackRecords.length === 0 && <AdminEmptyState message="当前没有符合条件的反馈建议。" />}
          <div className="mt-4">
            <AdminPagination current={feedbackPage} size={size} total={feedbackTotal} onChange={setFeedbackPage} />
          </div>
        </div>
      </AdminSection>

    </AdminPageShell>
  );
}

function PracticeSubmissionReviewSection({
  practiceStatus,
  setPracticeStatus,
  practicePage,
  setPracticePage,
  practiceRecords,
  practiceTotal,
  size,
  handlePracticeReview,
}: {
  practiceStatus: string;
  setPracticeStatus: (value: string) => void;
  practicePage: number;
  setPracticePage: (value: number) => void;
  practiceRecords: any[];
  practiceTotal: number;
  size: number;
  handlePracticeReview: (id: number, nextStatus: "approved" | "rejected") => Promise<void>;
}) {
  return (
    <AdminSection title="试题投稿审核">
      <FilterBar>
        <FilterField label="审核状态">
          <select value={practiceStatus} onChange={(e) => { setPracticeStatus(e.target.value); setPracticePage(1); }} className={inputClassName()}>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="mt-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>试题</TableHead>
              <TableHead>投稿用户</TableHead>
              <TableHead>分类 / 难度</TableHead>
              <TableHead>答题区域</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {practiceRecords.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-[320px]">
                  <div className="font-bold text-slate-800">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-400">{item.description || "-"}</div>
                  {item.templateFileUrl ? (
                    <div className="mt-2">
                      <a
                        href={normalizeImageUrl(item.templateFileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        <ExternalLink size={12} />
                        查看模板
                      </a>
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{item.author?.username || "-"}</TableCell>
                <TableCell>
                  <div>{item.questionCategoryName || "未分类"}</div>
                  <div className="mt-1 text-xs text-slate-400">难度 {item.difficulty || 1} / {item.points || 0} 积分</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-700">{item.answerSheet || "-"}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.answerRange || "-"}</div>
                </TableCell>
                <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                <TableCell>
                  <span className={statusBadgeClassName(item.status)}>{formatAdminStatus(item.status)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {item.templateFileUrl ? (
                      <a
                        href={normalizeImageUrl(item.templateFileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className={secondaryButtonClassName()}
                      >
                        <Eye size={14} />
                        查看
                      </a>
                    ) : null}
                    {item.status === "pending" && (
                      <>
                        <button type="button" onClick={() => void handlePracticeReview(item.id, "approved")} className={primaryButtonClassName()}>
                          <CheckCircle2 size={14} />
                          通过
                        </button>
                        <button type="button" onClick={() => void handlePracticeReview(item.id, "rejected")} className={secondaryButtonClassName()}>
                          <ShieldAlert size={14} />
                          驳回
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {practiceRecords.length === 0 && <AdminEmptyState message="当前条件下没有试题投稿记录。" />}
        <div className="mt-4">
          <AdminPagination current={practicePage} size={size} total={practiceTotal} onChange={setPracticePage} />
        </div>
      </div>
    </AdminSection>
  );
}

export function AdminUsers() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pendingRemove, setPendingRemove] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultUserForm());
  const size = 10;
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword.trim()) query.set("keyword", keyword.trim());
  if (roleFilter) query.set("role", roleFilter);
  if (statusFilter) query.set("status", statusFilter);
  const queryString = query.toString();

  const usersQuery = useQuery({
    queryKey: adminKeys.users({ page, size, keyword: keyword.trim(), role: roleFilter, status: statusFilter }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(`/api/admin/users?${queryString}`, { silent: true }), navigate, role);
      return result || { records: [], total: 0 };
    },
  });

  const categoriesQuery = useQuery({
    queryKey: adminKeys.categories(),
    queryFn: () => api.get<any[]>("/api/categories", { auth: false, silent: true }),
  });

  const records = usersQuery.data?.records || [];
  const total = usersQuery.data?.total || 0;
  const categories = categoriesQuery.data || [];
  const refreshUsers = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.users({ page, size, keyword: keyword.trim(), role: roleFilter, status: statusFilter }) }).then(() => undefined);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultUserForm());
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      username: item.username || "",
      email: item.email || "",
      password: "",
      role: item.role || "user",
      status: Number(item.status ?? 0),
      managedCategories: parseNumberArray(item.managedCategories),
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload: any = {
      email: form.email,
      role: form.role,
      status: Number(form.status),
      managedCategories: form.role === "moderator" ? form.managedCategories : [],
    };
    if (editing) {
      const result = await adminRequest(api.put(`/api/admin/users/${editing.id}`, payload), navigate, role, "更新用户");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("用户", editing.username || result?.username || form.username, "已更新"));
    } else {
      payload.username = form.username;
      payload.password = form.password;
      const result = await adminRequest(api.post("/api/admin/users", payload), navigate, role, "创建用户");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("用户", result?.username || form.username, "已创建"));
    }
    await refreshUsers();
  };

  const resetPassword = async (item: any) => {
    const password = await openAdminPrompt({
      title: "重置用户密码",
      message: `为 ${item.username} 设置新的登录密码。`,
      label: "新密码",
      defaultValue: "123456",
      confirmLabel: "确认重置",
      required: true,
    });
    if (!password) return;
    const result = await adminRequest(api.put(`/api/admin/users/${item.id}/password`, { password }), navigate, role, "重置用户密码");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("用户", item.username, "密码已重置"));
  };

  const remove = (item: any) => {
    setPendingRemove(item);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const item = pendingRemove;
    await runAdminDelete({
      request: api.delete(`/api/admin/users/${item.id}`),
      successMessage: formatAdminEntityMessage("用户", item.username, "已删除"),
      staleMessage: `用户《${item.username}》不存在，列表已刷新`,
      errorLabel: "删除用户",
      onRefresh: refreshUsers,
      onFinally: () => setPendingRemove(null),
    });
  };

  const toggleLock = async (item: any) => {
    const result = await adminRequest<any>(api.put(`/api/admin/users/${item.id}/lock`, {}), navigate, role, item.status === 1 ? "解除用户锁定" : "锁定用户");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("用户", item.username, result.locked ? "已锁定" : "已解锁"));
    await refreshUsers();
  };

  const toggleMute = async (item: any) => {
    const result = await adminRequest<any>(api.put(`/api/admin/users/${item.id}/mute`, {}), navigate, role, item.isMuted ? "解除用户禁言" : "禁言用户");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("用户", item.username, result.muted ? "已禁言" : "已解除禁言"));
    await refreshUsers();
  };

  return (
    <AdminPageShell
      title="用户管理"
      description="管理用户账号、角色、状态与版主管理范围。"
    >
      <AdminSection title="用户列表" actions={<AddButton onClick={openCreate}>新建用户</AddButton>}>
        <FilterBar>
          <FilterField label="关键词">
            <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} className={inputClassName()} placeholder="用户名 / 邮箱" />
          </FilterField>
          <FilterField label="角色">
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className={inputClassName()}>
              <option value="">全部</option>
              <option value="user">用户</option>
              <option value="moderator">版主</option>
              <option value="admin">管理员</option>
            </select>
          </FilterField>
          <FilterField label="状态">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClassName()}>
              <option value="">全部</option>
              <option value="0">正常</option>
              <option value="1">已锁定</option>
            </select>
          </FilterField>
        </FilterBar>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>等级 / 积分</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={normalizeImageUrl(item.avatar) || "https://i.pravatar.cc/80?img=45"} alt={item.username} className="h-10 w-10 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold text-slate-800">{item.username}</div>
                        <div className="text-xs text-slate-400">{item.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatAdminRole(item.role)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <span className={statusBadgeClassName(item.status === 1 ? "locked" : "active")}>{item.status === 1 ? "已锁定" : "正常"}</span>
                      {item.isMuted ? <span className={statusBadgeClassName("pending")}>已禁言</span> : null}
                    </div>
                  </TableCell>
                  <TableCell>Lv.{item.level || 1} / {item.points || 0}</TableCell>
                  <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openEdit(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                      <button type="button" onClick={() => resetPassword(item)} className={secondaryButtonClassName()}><UserCog size={14} />密码</button>
                      <button type="button" onClick={() => void toggleLock(item)} className={item.status === 1 ? primaryButtonClassName() : secondaryButtonClassName()}><Lock size={14} />{item.status === 1 ? "解锁" : "锁定"}</button>
                      <button type="button" onClick={() => void toggleMute(item)} className={item.isMuted ? primaryButtonClassName() : secondaryButtonClassName()}><MessageSquare size={14} />{item.isMuted ? "解除禁言" : "禁言"}</button>
                      <button type="button" onClick={() => remove(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {records.length === 0 && <AdminEmptyState message="暂无用户数据。" />}
          <div className="mt-4">
            <AdminPagination current={page} size={size} total={total} onChange={setPage} />
          </div>
        </div>
      </AdminSection>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "编辑用户" : "新建用户"}
        description={editing ? "修改邮箱、角色和状态。" : "创建新的管理或普通账号。"}
        submitLabel={editing ? "保存修改" : "创建用户"}
        onSubmit={submit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {!editing && (
            <Field label="用户名">
              <input value={form.username} onChange={(e) => setForm((prev: any) => ({ ...prev, username: e.target.value }))} className={inputClassName()} />
            </Field>
          )}
          <Field label="邮箱">
            <input value={form.email} onChange={(e) => setForm((prev: any) => ({ ...prev, email: e.target.value }))} className={inputClassName()} />
          </Field>
          {!editing && (
            <Field label="初始密码">
              <input type="password" value={form.password} onChange={(e) => setForm((prev: any) => ({ ...prev, password: e.target.value }))} className={inputClassName()} />
            </Field>
          )}
          <Field label="角色">
            <select value={form.role} onChange={(e) => setForm((prev: any) => ({ ...prev, role: e.target.value }))} className={inputClassName()}>
              <option value="user">用户</option>
              <option value="moderator">版主</option>
              <option value="admin">管理员</option>
            </select>
          </Field>
          <Field label="状态">
            <select value={String(form.status)} onChange={(e) => setForm((prev: any) => ({ ...prev, status: Number(e.target.value) }))} className={inputClassName()}>
              <option value="0">正常</option>
              <option value="1">已锁定</option>
            </select>
          </Field>
        </div>

        {form.role === "moderator" && (
          <Field label="管理板块">
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              {categories.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.managedCategories.includes(Number(item.id))}
                    onChange={(e) =>
                      setForm((prev: any) => ({
                        ...prev,
                        managedCategories: e.target.checked
                          ? [...prev.managedCategories, Number(item.id)]
                          : prev.managedCategories.filter((value: number) => value !== Number(item.id)),
                      }))
                    }
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </Field>
        )}
      </FormDialog>
      <DeleteConfirmDialog
        open={Boolean(pendingRemove)}
        title="删除用户"
        message={pendingRemove ? `确认删除用户 ${pendingRemove.username}？删除后无法恢复。` : ""}
        confirmLabel="确认删除"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
      />
    </AdminPageShell>
  );
}

export function AdminPosts() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(defaultPostFilters());
  const [appliedFilters, setAppliedFilters] = useState(defaultPostFilters());
  const size = 10;
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (appliedFilters.keyword.trim()) query.set("keyword", appliedFilters.keyword.trim());
  if (appliedFilters.username.trim()) query.set("username", appliedFilters.username.trim());
  if (appliedFilters.status) query.set("status", appliedFilters.status);
  if (appliedFilters.categoryId) query.set("categoryId", appliedFilters.categoryId);
  if (appliedFilters.startDate) query.set("startDate", appliedFilters.startDate);
  if (appliedFilters.endDate) query.set("endDate", appliedFilters.endDate);
  const postsQuery = useQuery({
    queryKey: adminKeys.posts({
      page,
      size,
      keyword: appliedFilters.keyword.trim(),
      username: appliedFilters.username.trim(),
      status: appliedFilters.status,
      categoryId: appliedFilters.categoryId,
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate,
    }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(`/api/admin/posts?${query.toString()}`, { silent: true }), navigate, role);
      return result || { records: [], total: 0 };
    },
  });
  const categoriesQuery = useQuery({
    queryKey: adminKeys.categories(),
    queryFn: () => api.get<any[]>("/api/categories", { auth: false, silent: true }),
  });
  const records = postsQuery.data?.records || [];
  const total = postsQuery.data?.total || 0;
  const categories = categoriesQuery.data || [];

  const refreshPosts = () =>
    queryClient.invalidateQueries({
      queryKey: adminKeys.posts({
        page,
        size,
        keyword: appliedFilters.keyword.trim(),
        username: appliedFilters.username.trim(),
        status: appliedFilters.status,
        categoryId: appliedFilters.categoryId,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      }),
    }).then(() => undefined);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    const next = defaultPostFilters();
    setPage(1);
    setFilters(next);
    setAppliedFilters(next);
  };

  const toggle = async (id: number, action: "lock" | "top" | "essence") => {
    const result = await adminRequest<Record<string, boolean>>(
      api.put(`/api/admin/posts/${id}/${action}`, {}),
      navigate,
      role,
      action === "lock" ? "切换帖子锁定状态" : action === "top" ? "切换帖子置顶状态" : "切换帖子精华状态",
    );
    if (!result) return;
    const messageByAction = {
      lock: result.isLocked ? "帖子已锁定" : "帖子已解锁",
      top: result.isTop ? "帖子已置顶" : "已取消置顶",
      essence: result.isEssence ? "帖子已设为精华" : "已取消精华",
    };
    showAdminSuccess(formatAdminEntityMessage("帖子", findAdminRecordTitle(records, id), messageByAction[action].replace(/^帖子/, "")));
    await refreshPosts();
  };

  const remove = async (item: any) => {
    const reason = await openAdminPrompt({
      title: "删除帖子",
      message: "可选填写删除原因，系统会将原因通知给发帖用户。",
      label: "删除原因",
      placeholder: "可选，留空则不发送具体原因",
      defaultValue: "",
      confirmLabel: "确认删除",
    });
    if (reason === null) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/posts/${item.id}`, { reason }),
      successMessage: formatAdminEntityMessage("帖子", item.title, "已删除"),
      staleMessage: `帖子《${item.title}》不存在，列表已刷新`,
      errorLabel: "删除帖子",
      onRefresh: refreshPosts,
    });
  };

  const restore = async (item: any) => {
    const result = await adminRequest(api.put(`/api/admin/posts/${item.id}/restore`, {}), navigate, role, "恢复帖子");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("帖子", item.title, "已恢复"));
    await refreshPosts();
  };

  const permanentDelete = async (item: any) => {
    const confirmed = await openAdminConfirm({
      title: "永久删除帖子",
      message: `确认永久删除《${item.title}》？此操作不可恢复。`,
      confirmLabel: "永久删除",
      destructive: true,
    });
    if (!confirmed) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/posts/${item.id}/permanent`),
      successMessage: formatAdminEntityMessage("帖子", item.title, "已永久删除"),
      staleMessage: `帖子《${item.title}》不存在，列表已刷新`,
      errorLabel: "永久删除帖子",
      onRefresh: refreshPosts,
    });
  };

  return (
    <AdminPageShell title="帖子管理" description="分页管理帖子状态、锁定、置顶、精华与删除恢复。">
      <AdminSection title="帖子列表">
        <FilterBar>
          <FilterField label="关键词">
            <input value={filters.keyword} onChange={(e) => setFilters((prev: any) => ({ ...prev, keyword: e.target.value }))} className={inputClassName()} placeholder="标题或正文" />
          </FilterField>
          <FilterField label="发帖用户">
            <input value={filters.username} onChange={(e) => setFilters((prev: any) => ({ ...prev, username: e.target.value }))} className={inputClassName()} placeholder="按用户名搜索" />
          </FilterField>
          <FilterField label="分类">
            <select value={filters.categoryId} onChange={(e) => setFilters((prev: any) => ({ ...prev, categoryId: e.target.value }))} className={inputClassName()}>
              <option value="">全部</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </FilterField>
          <FilterField label="状态">
            <select value={filters.status} onChange={(e) => setFilters((prev: any) => ({ ...prev, status: e.target.value }))} className={inputClassName()}>
              <option value="active">正常</option>
              <option value="deleted">已删除</option>
              <option value="locked">已锁定</option>
              <option value="top">已置顶</option>
              <option value="essence">已精华</option>
            </select>
          </FilterField>
          <FilterField label="开始日期">
            <input type="date" value={filters.startDate} onChange={(e) => setFilters((prev: any) => ({ ...prev, startDate: e.target.value }))} className={inputClassName()} />
          </FilterField>
          <FilterField label="结束日期">
            <input type="date" value={filters.endDate} onChange={(e) => setFilters((prev: any) => ({ ...prev, endDate: e.target.value }))} className={inputClassName()} />
          </FilterField>
          <div className="flex items-end gap-2">
            <button type="button" onClick={applyFilters} className={primaryButtonClassName()}>筛选</button>
            <button type="button" onClick={resetFilters} className={secondaryButtonClassName()}>重置</button>
          </div>
        </FilterBar>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>统计</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((item) => {
                const deleted = Number(item.status) !== 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[320px]">
                      <div className="font-bold text-slate-800">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{formatMaybeDate(item.createTime)}</div>
                    </TableCell>
                    <TableCell>{item.author?.username || "-"}</TableCell>
                    <TableCell>{item.category?.name || "-"}</TableCell>
                    <TableCell>{item.viewCount || 0} 浏览 / {item.replyCount || 0} 回复</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <span className={statusBadgeClassName(item.status)}>{deleted ? "已删除" : "正常"}</span>
                        {item.isLocked && <span className={statusBadgeClassName("locked")}>已锁定</span>}
                        {item.isTop && <span className={statusBadgeClassName("approved")}>置顶</span>}
                        {item.isEssence && <span className={statusBadgeClassName("approved")}>精华</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => navigate(`/post/${item.id}`)} className={secondaryButtonClassName()}><Eye size={14} />查看</button>
                        <button type="button" onClick={() => toggle(item.id, "lock")} className={item.isLocked ? primaryButtonClassName() : secondaryButtonClassName()}>{item.isLocked ? <Unlock size={14} /> : <Lock size={14} />}{item.isLocked ? "解锁" : "锁定"}</button>
                        <button type="button" onClick={() => toggle(item.id, "top")} className={item.isTop ? primaryButtonClassName() : secondaryButtonClassName()}><Sparkles size={14} />{item.isTop ? "取消置顶" : "置顶"}</button>
                        <button type="button" onClick={() => toggle(item.id, "essence")} className={item.isEssence ? primaryButtonClassName() : secondaryButtonClassName()}><CheckCircle2 size={14} />{item.isEssence ? "取消精华" : "精华"}</button>
                        {role === "admin" && (
                          !deleted ? (
                            <button type="button" onClick={() => remove(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                          ) : (
                            <>
                              <button type="button" onClick={() => restore(item)} className={secondaryButtonClassName()}><RefreshCcw size={14} />恢复</button>
                              <button type="button" onClick={() => permanentDelete(item)} className={secondaryButtonClassName()}><Trash2 size={14} />彻底删除</button>
                            </>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {records.length === 0 && <AdminEmptyState message="当前没有符合条件的帖子。" />}
          <div className="mt-4">
            <AdminPagination current={page} size={size} total={total} onChange={setPage} />
          </div>
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

export function AdminCategories() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pendingRemove, setPendingRemove] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultCategoryForm());
  const categoriesQuery = useQuery({
    queryKey: adminKeys.categories(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any[]>(api.get("/api/admin/categories", { silent: true }), navigate, role);
      return result || [];
    },
  });
  const records = categoriesQuery.data || [];

  const openCreate = () => {
    setEditing(null);
    setForm(defaultCategoryForm());
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      groupName: item.groupName || "",
      sortOrder: Number(item.sortOrder || 0),
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      name: form.name,
      description: form.description,
      groupName: form.groupName,
      sortOrder: Number(form.sortOrder || 0),
    };
    if (editing) {
      const result = await adminRequest(api.put(`/api/admin/categories/${editing.id}`, payload), navigate, role, "更新分类");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("分类", editing.name || result?.name || form.name, "已更新"));
    } else {
      const result = await adminRequest(api.post("/api/admin/categories", payload), navigate, role, "创建分类");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("分类", result?.name || form.name, "已创建"));
    }
    await queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
  };

  const remove = (item: any) => {
    setPendingRemove(item);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const item = pendingRemove;
    await runAdminDelete({
      request: api.delete(`/api/admin/categories/${item.id}`),
      successMessage: formatAdminEntityMessage("分类", item.name, "已删除"),
      staleMessage: `分类《${item.name}》不存在，列表已刷新`,
      errorLabel: "删除分类",
      onRefresh: () => queryClient.invalidateQueries({ queryKey: adminKeys.categories() }).then(() => undefined),
      onFinally: () => setPendingRemove(null),
    });
  };

  return (
    <AdminPageShell
      title="分类管理"
      description="维护社区板块分类。版主仅可查看和新增。"
    >
      {role === "moderator" && <AdminPermissionNotice message="版主当前只开放分类列表与新增能力，编辑和删除仍由管理员执行。" />}
      <AdminSection title="分类列表" actions={role === "admin" || role === "moderator" ? <AddButton onClick={openCreate}>新增分类</AddButton> : null}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>分组</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>帖子数</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold text-slate-800">{item.name}</TableCell>
                <TableCell>{item.groupName || "-"}</TableCell>
                <TableCell className="max-w-[320px] truncate">{item.description || "-"}</TableCell>
                <TableCell>{item.sortOrder ?? 0}</TableCell>
                <TableCell>{item.postCount ?? 0}</TableCell>
                <TableCell>
                  {canManageCategoryMutations(role) ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                      <button type="button" onClick={() => remove(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">仅查看</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {records.length === 0 && <AdminEmptyState message="暂无分类数据。" />}
      </AdminSection>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "编辑分类" : "新增分类"}
        description="维护社区前台使用的板块分类。"
        submitLabel={editing ? "保存分类" : "创建分类"}
        onSubmit={submit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="名称"><input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="分组"><input value={form.groupName} onChange={(e) => setForm((prev: any) => ({ ...prev, groupName: e.target.value }))} className={inputClassName()} /></Field>
        </div>
        <Field label="描述"><textarea value={form.description} onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))} className={textareaClassName()} /></Field>
        <Field label="排序"><input type="number" value={form.sortOrder} onChange={(e) => setForm((prev: any) => ({ ...prev, sortOrder: e.target.value }))} className={inputClassName()} /></Field>
      </FormDialog>
      <DeleteConfirmDialog
        open={Boolean(pendingRemove)}
        title="删除分类"
        message={pendingRemove ? `确认删除分类 ${pendingRemove.name}？` : ""}
        confirmLabel="确认删除"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
      />
    </AdminPageShell>
  );
}

export function AdminDrafts() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [username, setUsername] = useState("");
  const [sort, setSort] = useState("latest");
  const size = 10;
  const query = new URLSearchParams({ page: String(page), size: String(size), sort });
  if (keyword.trim()) query.set("keyword", keyword.trim());
  if (status) query.set("status", status);
  if (username.trim()) query.set("username", username.trim());
  const draftsQuery = useQuery({
    queryKey: adminKeys.drafts({ page, size, sort, keyword: keyword.trim(), status, username: username.trim() }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(`/api/admin/drafts?${query.toString()}`, { silent: true }), navigate, role);
      return result || { records: [], total: 0 };
    },
  });
  const records = draftsQuery.data?.records || [];
  const total = draftsQuery.data?.total || 0;
  const refreshDrafts = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.drafts({ page, size, sort, keyword: keyword.trim(), status, username: username.trim() }) }).then(() => undefined);

  const remove = async (id: number) => {
    const confirmed = await openAdminConfirm({
      title: "删除草稿",
      message: "确认删除这篇草稿？",
      confirmLabel: "确认删除",
      destructive: true,
    });
    if (!confirmed) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/drafts/${id}`),
      successMessage: formatAdminEntityMessage("草稿", findAdminRecordTitle(records, id), "已删除"),
      staleMessage: "草稿不存在，列表已刷新",
      errorLabel: "删除草稿",
      onRefresh: refreshDrafts,
    });
  };

  const removeByUser = async (userId: number, usernameText: string) => {
    const confirmed = await openAdminConfirm({
      title: "批量清理草稿",
      message: `确认删除 ${usernameText} 的全部草稿？`,
      confirmLabel: "确认清理",
      destructive: true,
    });
    if (!confirmed) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/drafts/by-user/${userId}`),
      successMessage: formatAdminEntityMessage("用户", usernameText, "草稿已清理"),
      staleMessage: `用户《${usernameText}》的草稿不存在，列表已刷新`,
      errorLabel: "清理用户草稿",
      onRefresh: refreshDrafts,
    });
  };

  return (
    <AdminPageShell title="草稿管理" description="清理未发布草稿，并按用户维度批量处理。">
      <AdminSection title="草稿列表">
        <FilterBar>
          <FilterField label="关键词">
            <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} className={inputClassName()} />
          </FilterField>
          <FilterField label="状态">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClassName()}>
              <option value="">全部</option>
              <option value="editing">编辑中</option>
              <option value="draft">暂存</option>
            </select>
          </FilterField>
          <FilterField label="用户名">
            <input value={username} onChange={(e) => { setUsername(e.target.value); setPage(1); }} className={inputClassName()} />
          </FilterField>
          <FilterField label="排序">
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={inputClassName()}>
              <option value="latest">最近更新</option>
              <option value="oldest">最早更新</option>
              <option value="expiring">即将过期</option>
            </select>
          </FilterField>
        </FilterBar>

        <div className="mt-5 space-y-4">
          {records.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">{item.title || "未命名草稿"}</div>
                  <div className="mt-2 text-sm text-slate-500">
                    {item.author?.username || "-"} · {item.category?.name || "未分类"} · {formatAdminStatus(item.status)}
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm text-slate-400">{item.content?.replace(/<[^>]+>/g, "") || "暂无正文"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => remove(item.id)} className={secondaryButtonClassName()}><Trash2 size={14} />删除草稿</button>
                  {item.author?.id && (
                    <button type="button" onClick={() => removeByUser(item.author.id, item.author.username)} className={secondaryButtonClassName()}>
                      <UserCog size={14} />
                      清理该用户
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {records.length === 0 && <AdminEmptyState message="暂无草稿数据。" />}
          <AdminPagination current={page} size={size} total={total} onChange={setPage} />
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

export function AdminNotifications() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pendingRemove, setPendingRemove] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultNotificationForm());
  const size = 10;
  const statsQuery = useQuery({
    queryKey: adminKeys.notificationsStats(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get("/api/admin/notifications/stats", { silent: true }), navigate, role);
      return result || null;
    },
  });
  const notificationsQuery = useQuery({
    queryKey: adminKeys.notifications({ page, size }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(`/api/admin/notifications?page=${page}&size=${size}`, { silent: true }), navigate, role);
      return result || { records: [], total: 0 };
    },
  });
  const stats = statsQuery.data;
  const records = notificationsQuery.data?.records || [];
  const total = notificationsQuery.data?.total || 0;

  const openCreate = () => {
    setEditing(null);
    setForm(defaultNotificationForm());
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      content: item.content || "",
      type: item.type || "system",
      status: item.status || "draft",
      targetType: item.targetType || "all",
      targetRoles: item.targetRoles || "",
      attachments: item.attachments || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload = { ...form };
    if (editing) {
      const result = await adminRequest(api.put(`/api/admin/notifications/${editing.id}`, payload), navigate, role, "更新通知");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("通知", editing.title || result?.title || form.title, "已更新"));
    } else {
      const result = await adminRequest(api.post("/api/admin/notifications", payload), navigate, role, "创建通知");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("通知", result?.title || form.title, "已创建"));
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.notificationsStats() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications({ page, size }) }),
    ]);
  };

  const sendNow = async (item: any) => {
    const result = await adminRequest(api.put(`/api/admin/notifications/${item.id}/send`, {}), navigate, role, "发送通知");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("通知", item.title, "已发送"));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.notificationsStats() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications({ page, size }) }),
    ]);
  };

  const remove = (item: any) => {
    setPendingRemove(item);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const item = pendingRemove;
    await runAdminDelete({
      request: api.delete(`/api/admin/notifications/${item.id}`),
      successMessage: formatAdminEntityMessage("通知", item.title, "已删除"),
      staleMessage: `通知《${item.title}》不存在，列表已刷新`,
      errorLabel: "删除通知",
      onRefresh: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: adminKeys.notificationsStats() }),
          queryClient.invalidateQueries({ queryKey: adminKeys.notifications({ page, size }) }),
        ]);
      },
      onFinally: () => setPendingRemove(null),
    });
  };

  return (
    <AdminPageShell
      title="站内通知"
      description="创建、编辑并发送面向全站或指定角色的站内公告。"
    >
      <AdminStatGrid>
        <AdminStatCard label="通知总数" value={stats?.total ?? "-"} />
        <AdminStatCard label="已发送" value={stats?.sent ?? "-"} />
        <AdminStatCard label="草稿" value={stats?.draft ?? "-"} />
        <AdminStatCard label="站内用户" value={stats?.totalUsers ?? "-"} />
      </AdminStatGrid>

      <AdminSection title="通知列表" actions={<AddButton onClick={openCreate}>新建通知</AddButton>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>发送目标</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-[320px]">
                  <div className="font-bold text-slate-800">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-400 line-clamp-2">{item.content}</div>
                </TableCell>
                <TableCell>{formatNotificationType(item.type)}</TableCell>
                <TableCell>{formatNotificationTarget(item.targetType || "all")}{item.targetRoles ? ` / ${formatRoleList(item.targetRoles)}` : ""}</TableCell>
                <TableCell><span className={statusBadgeClassName(item.status)}>{formatAdminStatus(item.status)}</span></TableCell>
                <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                    {item.status !== "sent" && (
                      <button type="button" onClick={() => sendNow(item)} className={primaryButtonClassName()}><Send size={14} />发送</button>
                    )}
                    <button type="button" onClick={() => remove(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {records.length === 0 && <AdminEmptyState message="暂无通知。" />}
        <div className="mt-4">
          <AdminPagination current={page} size={size} total={total} onChange={setPage} />
        </div>
      </AdminSection>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "编辑通知" : "新建通知"}
        description="填写通知内容与发送对象。"
        submitLabel={editing ? "保存通知" : "创建通知"}
        onSubmit={submit}
      >
        <Field label="标题"><input value={form.title} onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value }))} className={inputClassName()} /></Field>
        <Field label="内容"><textarea value={form.content} onChange={(e) => setForm((prev: any) => ({ ...prev, content: e.target.value }))} className={textareaClassName()} /></Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="类型">
            <select value={form.type} onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value }))} className={inputClassName()}>
              {NOTIFICATION_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="状态">
            <select value={form.status} onChange={(e) => setForm((prev: any) => ({ ...prev, status: e.target.value }))} className={inputClassName()}>
              <option value="draft">草稿</option>
              <option value="sent">已发送</option>
            </select>
          </Field>
          <Field label="发送目标">
            <select value={form.targetType} onChange={(e) => setForm((prev: any) => ({ ...prev, targetType: e.target.value }))} className={inputClassName()}>
              {NOTIFICATION_TARGET_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
        </div>
        {form.targetType === "role" && (
          <Field label="目标角色">
            <div className="grid gap-3 md:grid-cols-3">
              {ROLE_OPTIONS.map((item) => {
                const selected = String(form.targetRoles || "").split(",").map((value) => value.trim()).filter(Boolean);
                const checked = selected.includes(item.value);
                return (
                  <label key={item.value} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) {
                          next.add(item.value);
                        } else {
                          next.delete(item.value);
                        }
                        setForm((prev: any) => ({ ...prev, targetRoles: Array.from(next).join(",") }));
                      }}
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          </Field>
        )}
        <Field label="附件 JSON / 链接">
          <textarea value={form.attachments} onChange={(e) => setForm((prev: any) => ({ ...prev, attachments: e.target.value }))} className={textareaClassName()} />
        </Field>
      </FormDialog>
      <DeleteConfirmDialog
        open={Boolean(pendingRemove)}
        title="删除通知"
        message={pendingRemove ? `确认删除通知《${pendingRemove.title}》？` : ""}
        confirmLabel="确认删除"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
      />
    </AdminPageShell>
  );
}

export function AdminQuestionCategories() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultQuestionCategoryForm());
  const questionCategoriesQuery = useQuery({
    queryKey: adminKeys.questionCategories(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any[]>(api.get("/api/admin/question-categories", { silent: true }), navigate, role);
      return result || [];
    },
  });
  const records = questionCategoriesQuery.data || [];

  const openCreate = () => {
    setEditing(null);
    setForm(defaultQuestionCategoryForm());
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      groupName: item.groupName || "",
      sortOrder: Number(item.sortOrder || 0),
      enabled: item.enabled ?? true,
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      name: form.name,
      description: form.description,
      groupName: form.groupName,
      sortOrder: Number(form.sortOrder || 0),
      enabled: Boolean(form.enabled),
    };
    if (editing) {
      const result = await adminRequest(api.put(`/api/admin/question-categories/${editing.id}`, payload), navigate, role, "更新题目分类");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("题目分类", editing.name || result?.name || form.name, "已更新"));
    } else {
      const result = await adminRequest(api.post("/api/admin/question-categories", payload), navigate, role, "创建题目分类");
      if (!result) return;
      setOpen(false);
      showAdminSuccess(formatAdminEntityMessage("题目分类", result?.name || form.name, "已创建"));
    }
    await queryClient.invalidateQueries({ queryKey: adminKeys.questionCategories() });
  };

  const toggleEnabled = async (item: any, nextEnabled: boolean) => {
    const result = await adminRequest(
      api.put(`/api/admin/question-categories/${item.id}`, {
        name: item.name,
        description: item.description,
        groupName: item.groupName,
        sortOrder: Number(item.sortOrder || 0),
        enabled: nextEnabled,
      }),
      navigate,
      role,
      nextEnabled ? "启用题目分类" : "停用题目分类",
    );
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("题目分类", item.name, nextEnabled ? "已启用" : "已停用"));
    await queryClient.invalidateQueries({ queryKey: adminKeys.questionCategories() });
  };

  const remove = async (item: any) => {
    const confirmed = await openAdminConfirm({
      title: "删除题目分类",
      message: `确认删除题目分类 ${item.name}？`,
      confirmLabel: "确认删除",
      destructive: true,
    });
    if (!confirmed) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/question-categories/${item.id}`),
      successMessage: formatAdminEntityMessage("题目分类", item.name, "已删除"),
      staleMessage: `题目分类《${item.name}》不存在，列表已刷新`,
      errorLabel: "删除题目分类",
      onRefresh: () => queryClient.invalidateQueries({ queryKey: adminKeys.questionCategories() }).then(() => undefined),
    });
  };

  return (
    <AdminPageShell
      title="题目分类"
      description="维护练习题目使用的分类体系。"
    >
      <AdminSection title="分类列表" actions={<AddButton onClick={openCreate}>新增题目分类</AddButton>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>分组</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>题目数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold text-slate-800">{item.name}</TableCell>
                <TableCell>{item.groupName || "-"}</TableCell>
                <TableCell className="max-w-[320px] truncate">{item.description || "-"}</TableCell>
                <TableCell>{item.questionCount ?? 0}</TableCell>
                <TableCell>
                  <AdminTableSwitch
                    checked={Boolean(item.enabled)}
                    onCheckedChange={(next) => void toggleEnabled(item, next)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                    <button type="button" onClick={() => remove(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {records.length === 0 && <AdminEmptyState message="暂无题目分类。" />}
      </AdminSection>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "编辑题目分类" : "新增题目分类"}
        submitLabel={editing ? "保存分类" : "创建分类"}
        onSubmit={submit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="名称"><input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="分组"><input value={form.groupName} onChange={(e) => setForm((prev: any) => ({ ...prev, groupName: e.target.value }))} className={inputClassName()} /></Field>
        </div>
        <Field label="描述"><textarea value={form.description} onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))} className={textareaClassName()} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="排序"><input type="number" value={form.sortOrder} onChange={(e) => setForm((prev: any) => ({ ...prev, sortOrder: e.target.value }))} className={inputClassName()} /></Field>
          <AdminFormSwitch
            label="启用该分类"
            checked={Boolean(form.enabled)}
            onCheckedChange={(next) => setForm((prev: any) => ({ ...prev, enabled: next }))}
          />
        </div>
      </FormDialog>
    </AdminPageShell>
  );
}

export function AdminQuestions() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [questionCategoryId, setQuestionCategoryId] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultQuestionForm());
  const [templateWorkbook, setTemplateWorkbook] = useState<ExcelWorkbookSnapshot>({ sheets: [] });
  const [editorWorkbook, setEditorWorkbook] = useState<ExcelWorkbookSnapshot>({ sheets: [] });
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [selection, setSelection] = useState<ExcelRangeSelection | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [isTemplateEditMode, setIsTemplateEditMode] = useState(true);
  const [isSelectingAnswerRange, setIsSelectingAnswerRange] = useState(false);
  const [editorFullscreenVersion, setEditorFullscreenVersion] = useState(0);
  const editorSnapshotGetterRef = useRef<(() => ExcelWorkbookSnapshot | null) | null>(null);
  const size = 10;
  const query = new URLSearchParams({ page: String(page), size: String(size), type: "excel_template" });
  if (questionCategoryId) query.set("questionCategoryId", questionCategoryId);
  const queryString = query.toString();

  const questionsQuery = useQuery({
    queryKey: adminKeys.questions({ page, size, type: "excel_template", questionCategoryId }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(`/api/admin/questions?${queryString}`, { silent: true }), navigate, role);
      return result || { questions: [], total: 0 };
    },
  });

  const questionCategoriesQuery = useQuery({
    queryKey: adminKeys.questionCategories(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any[]>(api.get("/api/admin/question-categories", { silent: true }), navigate, role);
      return result || [];
    },
  });

  const records = questionsQuery.data?.questions || [];
  const total = questionsQuery.data?.total || 0;
  const questionCategories = questionCategoriesQuery.data || [];

  const resetEditorState = () => {
    setTemplateWorkbook({ sheets: [] });
    setEditorWorkbook({ sheets: [] });
    setSelectedSheetName("");
    setSelection(null);
    setIsTemplateEditMode(true);
    setIsSelectingAnswerRange(false);
  };

  const loadTemplateWorkbook = async (
    fileUrl: string,
    answerSheet?: string | null,
    answerRange?: string | null,
    answerSnapshotJson?: string | null,
  ) => {
    setTemplateLoading(true);
    try {
      const snapshot = await adminRequest<any>(
        api.get(`/api/admin/questions/template-snapshot?fileUrl=${encodeURIComponent(fileUrl)}`, { silent: true }),
        navigate,
        role,
      );
      if (!snapshot) return;
      const sheetName = answerSheet || snapshot.sheets?.[0]?.name || "";
      const workbookWithAnswer = buildWorkbookWithAnswerSnapshot(snapshot, answerSheet, answerRange, answerSnapshotJson);
      setTemplateWorkbook(snapshot);
      setEditorWorkbook(workbookWithAnswer);
      setSelectedSheetName(sheetName);
      const parsedRange = answerRange ? parseRangeRef(answerRange) : null;
      setSelection(parsedRange && sheetName
        ? normalizeSelection(sheetName, parsedRange.startRow, parsedRange.startCol, parsedRange.endRow, parsedRange.endCol)
        : null);
    } finally {
      setTemplateLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultQuestionForm());
    resetEditorState();
    setIsTemplateEditMode(true);
    setOpen(true);
  };

  const openEdit = async (item: any) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      questionCategoryId: item.questionCategoryId || "",
      difficulty: item.difficulty ?? 1,
      points: item.points ?? 0,
      explanation: item.explanation || "",
      enabled: item.enabled ?? true,
      templateFileUrl: item.templateFileUrl || "",
      answerSheet: item.answerSheet || "",
      answerRange: item.answerRange || "",
      answerSnapshotJson: item.answerSnapshotJson || "",
      checkFormula: item.checkFormula ?? false,
      sheetCountLimit: item.sheetCountLimit ?? 5,
      version: item.version ?? 1,
    });
    setIsTemplateEditMode(false);
    setIsSelectingAnswerRange(false);
    setOpen(true);
    if (item.templateFileUrl) {
      await loadTemplateWorkbook(item.templateFileUrl, item.answerSheet, item.answerRange, item.answerSnapshotJson);
    } else {
      resetEditorState();
    }
  };

  const submit = async () => {
    const resolvedSheetName = form.answerSheet || selection?.sheetName || selectedSheetName;
    const resolvedRange = isTemplateEditMode ? (selectionToRangeRef(selection) || form.answerRange) : form.answerRange;
    if (!form.templateFileUrl) {
      toast.error("请先上传 Excel 模板");
      return;
    }
    if (!resolvedSheetName) {
      toast.error("请选择答题工作表");
      return;
    }
    if (!resolvedRange) {
      toast.error("请先在表格中框选答题区域");
      return;
    }
    const latestWorkbook = editorSnapshotGetterRef.current?.() || editorWorkbook;
    if (latestWorkbook !== editorWorkbook) {
      setEditorWorkbook(latestWorkbook);
    }
    const answerSnapshot = extractRangeAnswerSnapshot(latestWorkbook, resolvedSheetName, resolvedRange);
    const hasEmptyAnswerCell = answerSnapshot.values.some((row) =>
      row.some((value) => String(value ?? "").trim().length === 0),
    );
    if (hasEmptyAnswerCell) {
      toast.error("标准答案存在空白单元格，请补全答题区域内的值");
      return;
    }
    const payload = {
      title: form.title,
      type: "excel_template",
      questionCategoryId: toNullableNumber(form.questionCategoryId),
      difficulty: Number(form.difficulty || 1),
      points: Number(form.points || 0),
      explanation: form.explanation,
      enabled: form.enabled,
      templateFileUrl: form.templateFileUrl,
      answerSheet: resolvedSheetName,
      answerRange: resolvedRange,
      answerSnapshotJson: JSON.stringify(answerSnapshot),
      checkFormula: Boolean(form.checkFormula),
      sheetCountLimit: Number(form.sheetCountLimit || 5),
      version: Number(form.version || 1),
    };
    const request = editing
      ? api.put(`/api/admin/questions/${editing.id}`, payload)
      : api.post("/api/admin/questions", payload);
    const result = await adminRequest(request, navigate, role, editing ? "更新题目" : "创建题目");
    if (!result) return;
    setOpen(false);
    showAdminSuccess(formatAdminEntityMessage("题目", editing?.title || result?.title || form.title, editing ? "已更新" : "已创建"));
    await queryClient.invalidateQueries({ queryKey: adminKeys.questions({ page, size, type: "excel_template", questionCategoryId }) });
  };

  const toggleEnabled = async (item: any, nextEnabled: boolean) => {
    const result = await adminRequest(
      api.put(`/api/admin/questions/${item.id}`, {
        title: item.title,
        type: item.type || "excel_template",
        categoryId: item.categoryId,
        questionCategoryId: item.questionCategoryId,
        difficulty: item.difficulty,
        points: item.points,
        explanation: item.explanation,
        enabled: nextEnabled,
        templateFileUrl: item.templateFileUrl,
        answerSheet: item.answerSheet,
        answerRange: item.answerRange,
        answerSnapshotJson: item.answerSnapshotJson,
        checkFormula: item.checkFormula,
        gradingRuleJson: item.gradingRuleJson,
        expectedSnapshotJson: item.expectedSnapshotJson,
        sheetCountLimit: item.sheetCountLimit,
        version: item.version,
      }),
      navigate,
      role,
      nextEnabled ? "启用题目" : "停用题目",
    );
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("题目", item.title, nextEnabled ? "已启用" : "已停用"));
    await queryClient.invalidateQueries({ queryKey: adminKeys.questions({ page, size, type: "excel_template", questionCategoryId }) });
  };

  const remove = async (item: any) => {
    const confirmed = await openAdminConfirm({
      title: "删除题目",
      message: `确认删除题目《${item.title}》？`,
      confirmLabel: "确认删除",
      destructive: true,
    });
    if (!confirmed) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/questions/${item.id}`),
      successMessage: formatAdminEntityMessage("题目", item.title, "已删除"),
      staleMessage: `题目《${item.title}》不存在，列表已刷新`,
      errorLabel: "删除题目",
      onRefresh: () => queryClient.invalidateQueries({ queryKey: adminKeys.questions({ page, size, type: "excel_template", questionCategoryId }) }).then(() => undefined),
    });
  };

  const handleTemplateUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error("仅支持上传 .xlsx 或 .xls 模板");
      return;
    }
    setUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await api.post<{ url: string }>("/api/upload", formData);
      const nextForm = {
        ...form,
        templateFileUrl: uploadResult.url,
        answerSheet: "",
        answerRange: "",
        answerSnapshotJson: "",
      };
      setForm(nextForm);
      setIsTemplateEditMode(true);
      await loadTemplateWorkbook(uploadResult.url);
      toast.success("模板上传完成");
    } finally {
      setUploadingTemplate(false);
    }
  };

  const currentSelectionText = isTemplateEditMode
    ? (selectionToRangeRef(selection) || form.answerRange || "未选择")
    : (form.answerRange || "未选择");
  const sheetOptions = templateWorkbook.sheets || [];
  const currentPreviewWorkbook = editorSnapshotGetterRef.current?.() || editorWorkbook;
  const answerPreview = extractRangeAnswerSnapshot(
    currentPreviewWorkbook,
    form.answerSheet || selectedSheetName,
    isTemplateEditMode ? (selectionToRangeRef(selection) || form.answerRange) : form.answerRange,
  );
  const previewRangeRef = isTemplateEditMode ? (selectionToRangeRef(selection) || form.answerRange) : form.answerRange;
  const previewRange = previewRangeRef ? parseRangeRef(previewRangeRef) : null;
  const persistedRange = form.answerRange ? parseRangeRef(form.answerRange) : null;
  const persistedFocusRange = form.answerSheet && persistedRange
    ? normalizeSelection(form.answerSheet, persistedRange.startRow, persistedRange.startCol, persistedRange.endRow, persistedRange.endCol)
    : null;
  const prevSelectionForSheet = (sheetName: string, rangeText: string) => {
    const parsed = rangeText ? parseRangeRef(rangeText) : null;
    if (!parsed || !sheetName) return null;
    return normalizeSelection(sheetName, parsed.startRow, parsed.startCol, parsed.endRow, parsed.endCol);
  };
  const answerPreviewText = answerPreview.values.flatMap((valueRow, rowIndex) =>
    valueRow.map((value, colIndex) => {
      const formula = answerPreview.formulas?.[rowIndex]?.[colIndex];
      return formula ? `=${formula}` : String(value ?? "");
    }),
  ).filter((item) => item.trim().length > 0).join(" | ");
  const answerPreviewHasEmptyCell = answerPreview.values.some((row) =>
    row.some((value) => String(value ?? "").trim().length === 0),
  );
  const previewColumnLabels = previewRange
    ? Array.from({ length: previewRange.endCol - previewRange.startCol + 1 }, (_, index) => columnIndexToLabel(previewRange.startCol + index))
    : [];
  const previewRowLabels = previewRange
    ? Array.from({ length: previewRange.endRow - previewRange.startRow + 1 }, (_, index) => previewRange.startRow + index)
    : [];
  const openAnswerRangeEditor = () => {
    if (!isTemplateEditMode) return;
    const sheetName = form.answerSheet || selectedSheetName;
    if (!sheetName) {
      toast.error("请先选择答题工作表");
      return;
    }
    const parsedRange = form.answerRange ? parseRangeRef(form.answerRange) : null;
    const nextSelection = parsedRange
      ? normalizeSelection(sheetName, parsedRange.startRow, parsedRange.startCol, parsedRange.endRow, parsedRange.endCol)
      : normalizeSelection(sheetName, 1, 1, 1, 1);
    setSelectedSheetName(sheetName);
    setSelection(nextSelection);
    setIsSelectingAnswerRange(true);
    setEditorFullscreenVersion((current) => current + 1);
  };
  const confirmAnswerRange = () => {
    const nextRange = selectionToRangeRef(selection);
    if (!selection || !nextRange) {
      toast.error("请先在模板编辑器中选择答题区域");
      return;
    }
    setForm((prev: any) => ({
      ...prev,
      answerSheet: selection.sheetName,
      answerRange: nextRange,
    }));
    setSelectedSheetName(selection.sheetName);
    setIsSelectingAnswerRange(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
  };

  return (
    <AdminPageShell
      title="题库管理"
      description="管理 Excel 模板题，配置答题区域、标准答案与判题方式。"
    >
      <AdminSection title="题目列表" actions={<AddButton onClick={openCreate}>新增题目</AddButton>}>
        <FilterBar>
          <FilterField label="题目分类">
            <select value={questionCategoryId} onChange={(e) => { setQuestionCategoryId(e.target.value); setPage(1); }} className={inputClassName()}>
              <option value="">全部</option>
              {questionCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </FilterField>
        </FilterBar>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>题目</TableHead>
                <TableHead>工作表 / 区域</TableHead>
                <TableHead>难度 / 奖励</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[320px]">
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{item.questionCategoryName || "未分类"}</span>
                      <span>·</span>
                      <span>{formatQuestionType(item.type || "excel_template")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-700">{item.answerSheet || "-"}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.answerRange || "未配置区域"}</div>
                  </TableCell>
                  <TableCell>{item.difficulty || 1} / {item.points || 0}</TableCell>
                  <TableCell>
                    <AdminTableSwitch
                      checked={Boolean(item.enabled)}
                      onCheckedChange={(next) => void toggleEnabled(item, next)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void openEdit(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                      <button type="button" onClick={() => remove(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {records.length === 0 && <AdminEmptyState message="暂无题目数据。" />}
          <div className="mt-4">
            <AdminPagination current={page} size={size} total={total} onChange={setPage} />
          </div>
        </div>
      </AdminSection>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "编辑 Excel 模板题" : "新增 Excel 模板题"}
        description="上传模板后，直接在表格里选择答题工作表、框选区域，并填写标准答案。"
        submitLabel={editing ? "保存题目" : "创建题目"}
        contentClassName="w-[min(1120px,calc(100vw-2rem))]"
        bodyClassName="px-6 py-5"
        onSubmit={submit}
      >
        <Field label="题目标题"><textarea value={form.title} onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value }))} className={textareaClassName()} /></Field>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="题目分类">
            <select value={String(form.questionCategoryId)} onChange={(e) => setForm((prev: any) => ({ ...prev, questionCategoryId: e.target.value }))} className={inputClassName()}>
              <option value="">请选择</option>
              {questionCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="题型"><input value={formatQuestionType("excel_template")} readOnly className={inputClassName()} /></Field>
          <Field label="难度"><input type="number" value={form.difficulty} onChange={(e) => setForm((prev: any) => ({ ...prev, difficulty: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="奖励积分"><input type="number" value={form.points} onChange={(e) => setForm((prev: any) => ({ ...prev, points: e.target.value }))} className={inputClassName()} /></Field>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">Excel 模板</div>
              <div className="mt-1 text-xs text-slate-500">{form.templateFileUrl || "尚未上传模板文件"}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {editing && (
                <button
                  type="button"
                  onClick={() => setIsTemplateEditMode((current) => !current)}
                  className={secondaryButtonClassName()}
                >
                  <Edit3 size={14} />
                  {isTemplateEditMode ? "完成修改" : "修改规则"}
                </button>
              )}
              <label className={`${primaryButtonClassName()} cursor-pointer ${!isTemplateEditMode ? "opacity-50 pointer-events-none" : ""}`}>
                {uploadingTemplate ? <LoaderCircle size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                上传模板
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={!isTemplateEditMode} onChange={(e) => void handleTemplateUpload(e.target.files)} />
              </label>
            </div>
          </div>
          {sheetOptions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="答题工作表">
                <select
                  value={form.answerSheet || selectedSheetName}
                  disabled={!isTemplateEditMode}
                  onChange={(e) => {
                    const nextSheetName = e.target.value;
                    setSelectedSheetName(nextSheetName);
                    setForm((prev: any) => ({ ...prev, answerSheet: nextSheetName }));
                    const persistedForSheet = prevSelectionForSheet(nextSheetName, form.answerRange);
                    setSelection(persistedForSheet);
                  }}
                  className={inputClassName()}
                >
                  <option value="">请选择</option>
                  {sheetOptions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="答题区域">
                <div className="flex gap-2">
                  <input value={currentSelectionText} readOnly className={inputClassName()} />
                  <button
                    type="button"
                    onClick={openAnswerRangeEditor}
                    disabled={!isTemplateEditMode}
                    className={secondaryButtonClassName()}
                  >
                    选择区域
                  </button>
                </div>
              </Field>
              <Field label="标准答案">
                <div className="space-y-2">
                  <input
                    value={answerPreviewText || "未填写"}
                    readOnly
                    className={inputClassName()}
                  />
                  {answerPreviewHasEmptyCell && (
                    <div className="text-xs font-medium text-amber-600">答题区域中存在空白单元格，保存前请补全标准答案。</div>
                  )}
                </div>
              </Field>
              <label className="flex items-end">
                <span className={`inline-flex h-9 items-center gap-2 rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-sm font-medium text-slate-700 ${!isTemplateEditMode ? "opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.checkFormula)}
                    disabled={!isTemplateEditMode}
                    onChange={(e) => setForm((prev: any) => ({ ...prev, checkFormula: e.target.checked }))}
                  />
                  检测函数公式
                </span>
              </label>
            </div>
          )}
          <div className="mt-4 text-xs text-slate-500">
            {isTemplateEditMode
              ? "先选工作表，再在表格里拖拽框选答题区域；框选完成后，在表格中直接填写标准答案或公式。"
              : "当前为查看态。点击“修改规则”后才允许调整工作表、答题区域和标准答案。"}
          </div>
          {previewRange && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">标准答案预览</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {form.answerSheet || selectedSheetName || "-"} / {previewRangeRef || "-"}
                  </div>
                </div>
                {answerPreviewHasEmptyCell ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">存在空白单元格</span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">答案已完整</span>
                )}
              </div>
              <div className="overflow-auto rounded-2xl border border-slate-200">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-20 min-w-14 border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        #
                      </th>
                      {previewColumnLabels.map((label) => (
                        <th
                          key={`preview-col-${label}`}
                          className="min-w-[120px] border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {answerPreview.values.map((row, rowIndex) => (
                      <tr key={`preview-row-${previewRowLabels[rowIndex] || rowIndex}`}>
                        <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-500">
                          {previewRowLabels[rowIndex] || rowIndex + 1}
                        </th>
                        {row.map((value, colIndex) => {
                          const formula = answerPreview.formulas?.[rowIndex]?.[colIndex];
                          const displayValue = formula ? `=${formula}` : String(value ?? "");
                          return (
                            <td
                              key={`preview-cell-${rowIndex}-${colIndex}`}
                              className={`border-b border-r border-slate-200 px-3 py-2 align-top ${!displayValue.trim() ? "bg-amber-50/70" : "bg-white"}`}
                            >
                              <div className="flex flex-col gap-1">
                                {formula && (
                                  <span className="inline-flex w-fit rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                                    fx
                                  </span>
                                )}
                                <span className={`break-all font-medium ${formula ? "text-cyan-700" : "text-slate-700"} ${!displayValue.trim() ? "text-amber-700" : ""}`}>
                                  {displayValue || "空"}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
            <FileSpreadsheet size={16} />
            模板编辑器
          </div>
          {templateLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">正在加载模板...</div>
          ) : sheetOptions.length > 0 ? (
            <Suspense fallback={<div className="flex h-[460px] items-center justify-center text-sm text-slate-400">正在加载编辑器...</div>}>
              <ExcelWorkbookEditor
                workbook={editorWorkbook}
                onWorkbookChange={isTemplateEditMode ? setEditorWorkbook : undefined}
                selectedSheetName={selectedSheetName}
                onSelectedSheetNameChange={(sheetName) => {
                  setSelectedSheetName(sheetName);
                  if (isTemplateEditMode) {
                    setForm((prev: any) => ({ ...prev, answerSheet: sheetName }));
                  }
                }}
                selection={isTemplateEditMode && isSelectingAnswerRange ? selection : undefined}
                onSelectionChange={isTemplateEditMode && isSelectingAnswerRange ? ((nextSelection) => {
                  setSelection(nextSelection);
                }) : undefined}
                editableRange={isTemplateEditMode && isSelectingAnswerRange ? selection : undefined}
                selectionEnabled={isTemplateEditMode && isSelectingAnswerRange}
                focusRange={isSelectingAnswerRange ? selection : persistedFocusRange}
                focusRequestVersion={editorFullscreenVersion}
                requestFullscreenVersion={editorFullscreenVersion}
                showConfirmSelectionButton={isSelectingAnswerRange}
                confirmSelectionLabel="确认区域"
                onConfirmSelection={confirmAnswerRange}
                onSnapshotCaptureReady={(capture) => {
                  editorSnapshotGetterRef.current = capture;
                }}
              />
            </Suspense>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              上传 Excel 模板后即可开始配置
            </div>
          )}
        </div>
        <Field label="解析说明"><textarea value={form.explanation} onChange={(e) => setForm((prev: any) => ({ ...prev, explanation: e.target.value }))} className={textareaClassName()} /></Field>
        <AdminFormSwitch
          label="启用该题目"
          checked={Boolean(form.enabled)}
          onCheckedChange={(next) => setForm((prev: any) => ({ ...prev, enabled: next }))}
        />
      </FormDialog>
    </AdminPageShell>
  );
}

export function AdminPoints() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsKeyword, setRecordsKeyword] = useState("");
  const [grantForm, setGrantForm] = useState({ username: "", points: "", reason: "" });
  const [showGrantUserSuggestions, setShowGrantUserSuggestions] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultPointsRuleForm());
  const [optionOpen, setOptionOpen] = useState(false);
  const [optionEditing, setOptionEditing] = useState<any>(null);
  const [optionKind, setOptionKind] = useState<"type" | "task_key">("type");
  const [optionForm, setOptionForm] = useState<any>(defaultPointsOptionForm("type"));
  const grantUsernameRef = useRef<HTMLDivElement | null>(null);
  const size = 10;
  const recordsQueryPath = `/api/admin/points/records?page=${recordsPage}&size=${size}${recordsKeyword.trim() ? `&username=${encodeURIComponent(recordsKeyword.trim())}` : ""}`;
  const statsQuery = useQuery({
    queryKey: adminKeys.pointsStats(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get("/api/admin/points/stats", { silent: true }), navigate, role);
      return result || null;
    },
  });
  const grantUsersQuery = useQuery({
    queryKey: adminKeys.pointsGrantUsers({ keyword: grantForm.username.trim() }),
    enabled: Boolean(role && grantForm.username.trim()),
    queryFn: async () => {
      const result = await adminRequest<any>(
        api.get(`/api/admin/users?page=1&size=8&keyword=${encodeURIComponent(grantForm.username.trim())}`, { silent: true }),
        navigate,
        role
      );
      return result || { records: [] };
    },
  });
  const optionsQuery = useQuery({
    queryKey: adminKeys.pointsOptions(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get("/api/admin/points/options", { silent: true }), navigate, role);
      return result || { types: [], taskKeys: [] };
    },
  });
  const rulesQuery = useQuery({
    queryKey: adminKeys.pointsRules(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any[]>(api.get("/api/admin/points/rules", { silent: true }), navigate, role);
      return result || [];
    },
  });
  const recordsQuery = useQuery({
    queryKey: adminKeys.pointsRecords({ page: recordsPage, size, keyword: recordsKeyword.trim() }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(recordsQueryPath, { silent: true }), navigate, role);
      return result || { records: [], total: 0 };
    },
  });
  const stats = statsQuery.data;
  const pointsOptions = optionsQuery.data || { types: [], taskKeys: [] };
  const rules = rulesQuery.data || [];
  const records = recordsQuery.data?.records || [];
  const grantUserOptions = grantUsersQuery.data?.records || [];
  const existingTypeValues = useMemo(() => (pointsOptions.types || []).map((item: any) => String(item.value || item.optionValue || "").trim()).filter(Boolean), [pointsOptions.types]);
  const existingTaskKeyValues = useMemo(() => (pointsOptions.taskKeys || []).map((item: any) => String(item.value || item.optionValue || "").trim()).filter(Boolean), [pointsOptions.taskKeys]);
  const typeOptions = useMemo(
    () => buildAdminOptionChoices(pointsOptions.types, POINTS_RULE_TYPE_OPTIONS, form.type),
    [pointsOptions.types, form.type],
  );
  const taskKeyOptions = useMemo(
    () => buildAdminOptionChoices(pointsOptions.taskKeys, POINTS_TASK_KEY_OPTIONS, form.taskKey),
    [pointsOptions.taskKeys, form.taskKey],
  );
  const typeDictionary = useMemo(() => buildAdminOptionLabelMap(typeOptions), [typeOptions]);
  const taskKeyDictionary = useMemo(() => buildAdminOptionLabelMap(taskKeyOptions), [taskKeyOptions]);

  useEffect(() => {
    setRecordsTotal(recordsQuery.data?.total || 0);
  }, [recordsQuery.data?.total]);

  useEffect(() => {
    if (!showGrantUserSuggestions) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (grantUsernameRef.current && !grantUsernameRef.current.contains(event.target as Node)) {
        setShowGrantUserSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showGrantUserSuggestions]);

  const resolveRuleTypeLabel = (value: unknown) => {
    const normalized = String(value ?? "").trim();
    return typeDictionary.get(normalized) || formatPointsRuleType(value);
  };

  const resolveTaskKeyLabel = (value: unknown) => {
    const normalized = String(value ?? "").trim();
    return taskKeyDictionary.get(normalized) || formatPointsTaskKey(value);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultPointsRuleForm(typeOptions[0]?.value || "daily"));
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      taskKey: item.taskKey || "",
      points: item.points ?? 0,
      type: item.type || "daily",
      enabled: item.enabled ?? true,
      userVisible: item.userVisible ?? true,
      sortOrder: item.sortOrder ?? 0,
    });
    setOpen(true);
  };

  const openOptionCreate = (kind: "type" | "task_key") => {
    setOptionEditing(null);
    setOptionKind(kind);
    setOptionForm(defaultPointsOptionForm(kind));
    setOptionOpen(true);
  };

  const openOptionEdit = (kind: "type" | "task_key", item: any) => {
    setOptionEditing(item);
    setOptionKind(kind);
    setOptionForm({
      kind,
      value: item.value || "",
      label: item.label || "",
      sortOrder: item.sortOrder ?? 0,
    });
    setOptionOpen(true);
  };

  const submit = async () => {
    const payload = {
      ...form,
      points: Number(form.points || 0),
      sortOrder: Number(form.sortOrder || 0),
    };
    const request = editing ? api.put(`/api/admin/points/rules/${editing.id}`, payload) : api.post("/api/admin/points/rules", payload);
    const result = await adminRequest(request, navigate, role, editing ? "更新积分规则" : "创建积分规则");
    if (!result) return;
    setOpen(false);
    showAdminSuccess(formatAdminEntityMessage("积分规则", editing?.name || result?.name || form.name, editing ? "已更新" : "已创建"));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsRules() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsStats() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsRecords({ page: recordsPage, size, keyword: recordsKeyword.trim() }) }),
    ]);
  };

  const submitOption = async () => {
    const payload = {
      kind: optionKind,
      optionValue: String(optionForm.value || "").trim(),
      label: String(optionForm.label || "").trim(),
      sortOrder: Number(optionForm.sortOrder || 0),
    };
    const request = optionEditing
      ? api.put(`/api/admin/points/options/${optionEditing.id}`, payload)
      : api.post("/api/admin/points/options", payload);
    const result = await adminRequest(request, navigate, role, optionEditing ? "更新积分规则选项" : "创建积分规则选项");
    if (!result) return;
    setOptionOpen(false);
    showAdminSuccess(formatAdminEntityMessage(optionKind === "type" ? "规则类型" : "任务类型", optionForm.label || optionForm.value, optionEditing ? "已更新" : "已创建"));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsOptions() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsRules() }),
    ]);
  };

  const toggleRuleEnabled = async (item: any, nextEnabled: boolean) => {
    const result = await adminRequest(
      api.put(`/api/admin/points/rules/${item.id}`, {
        name: item.name,
        description: item.description,
        taskKey: item.taskKey,
        points: Number(item.points || 0),
        type: item.type,
        enabled: nextEnabled,
        userVisible: item.userVisible ?? true,
        sortOrder: Number(item.sortOrder || 0),
      }),
      navigate,
      role,
      nextEnabled ? "启用积分规则" : "停用积分规则",
    );
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("积分规则", item.name, nextEnabled ? "已启用" : "已停用"));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsRules() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsStats() }),
    ]);
  };

  const remove = async (item: any) => {
    const confirmed = await openAdminConfirm({
      title: "删除积分规则",
      message: `确认删除积分规则 ${item.name}？`,
      confirmLabel: "确认删除",
      destructive: true,
    });
    if (!confirmed) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/points/rules/${item.id}`),
      successMessage: formatAdminEntityMessage("积分规则", item.name, "已删除"),
      staleMessage: `积分规则《${item.name}》不存在，列表已刷新`,
      errorLabel: "删除积分规则",
      onRefresh: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: adminKeys.pointsRules() }),
          queryClient.invalidateQueries({ queryKey: adminKeys.pointsStats() }),
          queryClient.invalidateQueries({ queryKey: adminKeys.pointsRecords({ page: recordsPage, size, keyword: recordsKeyword.trim() }) }),
        ]);
      },
    });
  };

  const removeOption = async (kind: "type" | "task_key", item: any) => {
    const confirmed = await openAdminConfirm({
      title: kind === "type" ? "删除规则类型" : "删除任务类型",
      message: `确认删除${kind === "type" ? "规则类型" : "任务类型"} ${item.label}？`,
      confirmLabel: "确认删除",
      destructive: true,
    });
    if (!confirmed) return;
    await runAdminDelete({
      request: api.delete(`/api/admin/points/options/${item.id}`),
      successMessage: formatAdminEntityMessage(kind === "type" ? "规则类型" : "任务类型", item.label, "已删除"),
      staleMessage: `${kind === "type" ? "规则类型" : "任务类型"}《${item.label}》不存在，列表已刷新`,
      errorLabel: kind === "type" ? "删除规则类型" : "删除任务类型",
      onRefresh: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: adminKeys.pointsOptions() }),
          queryClient.invalidateQueries({ queryKey: adminKeys.pointsRules() }),
        ]);
      },
    });
  };

  const grantPoints = async () => {
    const payload = {
      username: grantForm.username.trim(),
      points: Number(grantForm.points || 0),
      reason: grantForm.reason.trim(),
    };
    const result = await adminRequest(
      api.post("/api/admin/points/grant", payload),
      navigate,
      role,
      "手动发放积分",
    );
    if (!result) return;
    setGrantForm({ username: "", points: "", reason: "" });
    showAdminSuccess(`已向用户 ${result.username || payload.username} 发放 ${result.points || payload.points} 积分`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsStats() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pointsRecords({ page: recordsPage, size, keyword: recordsKeyword.trim() }) }),
      queryClient.invalidateQueries({ queryKey: adminKeys.users({ page: 1, size: 10, keyword: payload.username, role: "", status: "" }) }),
    ]);
  };

  return (
    <AdminPageShell
      title="积分体系"
      description="查看积分统计、维护积分规则并浏览积分记录。"
    >
      <AdminStatGrid>
        <AdminStatCard label="活跃积分用户" value={stats?.activeUsers ?? "-"} />
        <AdminStatCard label="累计积分变化" value={stats?.totalPoints ?? "-"} />
        <AdminStatCard label="今日积分变化" value={stats?.todayPoints ?? "-"} />
      </AdminStatGrid>

      <AdminSection title="手动发放积分">
        <FilterBar>
          <FilterField label="用户名">
            <div className="relative" ref={grantUsernameRef}>
              <input
                value={grantForm.username}
                onFocus={() => {
                  if (grantForm.username.trim()) {
                    setShowGrantUserSuggestions(true);
                  }
                }}
                onChange={(e) => {
                  const username = e.target.value;
                  setGrantForm((prev) => ({ ...prev, username }));
                  setShowGrantUserSuggestions(Boolean(username.trim()));
                }}
                className={inputClassName()}
                placeholder="输入用户名，自动联想匹配用户"
              />
              {showGrantUserSuggestions && grantUserOptions.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-[8px] border border-[#d9d9d9] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                  {grantUserOptions.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setGrantForm((prev) => ({ ...prev, username: item.username || "" }));
                        setShowGrantUserSuggestions(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-[#262626] transition hover:bg-[#f5f5f5]"
                    >
                      <span className="truncate font-medium">{item.username}</span>
                      <span className="truncate text-xs text-[#8c8c8c]">{item.email || "-"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FilterField>
          <FilterField label="积分值">
            <input
              type="number"
              min="1"
              value={grantForm.points}
              onChange={(e) => setGrantForm((prev) => ({ ...prev, points: e.target.value }))}
              className={inputClassName()}
              placeholder="输入发放积分"
            />
          </FilterField>
          <FilterField label="发放原因">
            <input
              value={grantForm.reason}
              onChange={(e) => setGrantForm((prev) => ({ ...prev, reason: e.target.value }))}
              className={inputClassName()}
              placeholder="输入发放原因"
            />
          </FilterField>
          <div className="flex items-end">
            <button type="button" onClick={() => void grantPoints()} className={primaryButtonClassName()}>
              <Send size={14} />
              发放积分
            </button>
          </div>
        </FilterBar>
      </AdminSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection title="积分规则" actions={<AddButton onClick={openCreate}>新增积分规则</AddButton>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>任务标识</TableHead>
                <TableHead>分值</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.description || "-"}</div>
                  </TableCell>
                  <TableCell>{resolveTaskKeyLabel(item.taskKey)}</TableCell>
                  <TableCell>{item.points}</TableCell>
                  <TableCell>{resolveRuleTypeLabel(item.type)}</TableCell>
                  <TableCell>
                    <AdminTableSwitch
                      checked={Boolean(item.enabled)}
                      onCheckedChange={(next) => void toggleRuleEnabled(item, next)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                      <button type="button" onClick={() => remove(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rules.length === 0 && <AdminEmptyState message="暂无积分规则。" />}
        </AdminSection>

        <AdminSection title="规则类型管理" actions={<AddButton onClick={() => openOptionCreate("type")}>新增类型</AddButton>}>
          <div className="mb-4 text-xs text-slate-500">每日任务和一次性任务带有内置积分去重逻辑；新增类型会按通用规则处理。</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>显示名称</TableHead>
                <TableHead>中文显示</TableHead>
                <TableHead>使用规则</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pointsOptions.types || []).map((item: any) => (
                <TableRow key={`type-${item.id}`}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>{resolveRuleTypeLabel(item.value)}</TableCell>
                  <TableCell>{item.usageCount ?? 0}</TableCell>
                  <TableCell>{item.sortOrder ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openOptionEdit("type", item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                      <button type="button" onClick={() => removeOption("type", item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(pointsOptions.types || []).length === 0 && <AdminEmptyState message="暂无规则类型。" />}
        </AdminSection>

        <AdminSection title="任务类型管理" actions={<AddButton onClick={() => openOptionCreate("task_key")}>新增任务类型</AddButton>}>
          <div className="mb-4 text-xs text-slate-500">新增任务类型只会进入规则配置选项；如需自动发放积分，还需要业务代码调用对应任务标识。</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>显示名称</TableHead>
                <TableHead>中文显示</TableHead>
                <TableHead>使用规则</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pointsOptions.taskKeys || []).map((item: any) => (
                <TableRow key={`task-${item.id}`}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>{resolveTaskKeyLabel(item.value)}</TableCell>
                  <TableCell>{item.usageCount ?? 0}</TableCell>
                  <TableCell>{item.sortOrder ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openOptionEdit("task_key", item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                      <button type="button" onClick={() => removeOption("task_key", item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(pointsOptions.taskKeys || []).length === 0 && <AdminEmptyState message="暂无任务类型。" />}
        </AdminSection>

        <AdminSection title="积分记录" description="按用户名检索积分变化历史。">
          <FilterBar>
            <FilterField label="用户名">
              <input value={recordsKeyword} onChange={(e) => { setRecordsKeyword(e.target.value); setRecordsPage(1); }} className={inputClassName()} />
            </FilterField>
          </FilterBar>
          <div className="mt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>变动</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((item: any, index: number) => (
                  <TableRow key={item.id ?? `${item.userId}-${index}`}>
                    <TableCell>{item.username || item.user?.username || "-"}</TableCell>
                    <TableCell>{item.change ?? item.points ?? "-"}</TableCell>
                    <TableCell>{item.reason || item.bizLabel || item.taskName || "-"}</TableCell>
                    <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {records.length === 0 && <AdminEmptyState message="暂无积分记录。" />}
            <div className="mt-4">
              <AdminPagination current={recordsPage} size={size} total={recordsTotal} onChange={setRecordsPage} />
            </div>
          </div>
        </AdminSection>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "编辑积分规则" : "新增积分规则"}
        submitLabel={editing ? "保存规则" : "创建规则"}
        onSubmit={submit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="规则名称"><input value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="任务标识">
            <select value={form.taskKey} onChange={(e) => setForm((prev: any) => ({ ...prev, taskKey: e.target.value }))} className={inputClassName()}>
              <option value="">无任务标识</option>
              {taskKeyOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="描述"><textarea value={form.description} onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))} className={textareaClassName()} /></Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="分值"><input type="number" value={form.points} onChange={(e) => setForm((prev: any) => ({ ...prev, points: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="类型">
            <select value={form.type} onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value }))} className={inputClassName()}>
              {typeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="排序"><input type="number" value={form.sortOrder} onChange={(e) => setForm((prev: any) => ({ ...prev, sortOrder: e.target.value }))} className={inputClassName()} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <AdminFormSwitch
            label="启用规则"
            checked={Boolean(form.enabled)}
            onCheckedChange={(next) => setForm((prev: any) => ({ ...prev, enabled: next }))}
          />
          <AdminFormSwitch
            label="用户可见"
            checked={Boolean(form.userVisible)}
            onCheckedChange={(next) => setForm((prev: any) => ({ ...prev, userVisible: next }))}
          />
        </div>
      </FormDialog>

      <FormDialog
        open={optionOpen}
        onOpenChange={setOptionOpen}
        title={`${optionEditing ? "编辑" : "新增"}${optionKind === "type" ? "规则类型" : "任务类型"}`}
        submitLabel={optionEditing ? "保存选项" : "创建选项"}
        onSubmit={submitOption}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="显示名称">
            <input
              value={optionForm.label}
              onChange={(e) => {
                const nextLabel = e.target.value;
                setOptionForm((prev: any) => ({
                  ...prev,
                  label: nextLabel,
                  value: optionEditing
                    ? prev.value
                    : generateMachineIdentifier(
                      nextLabel,
                      optionKind === "type" ? "type" : "task",
                      optionKind === "type" ? existingTypeValues : existingTaskKeyValues,
                    ),
                }));
              }}
              className={inputClassName()}
              placeholder={optionKind === "type" ? "如：每日任务" : "如：每日签到"}
            />
          </Field>
          <Field label="标识值">
            <input value={optionForm.value} readOnly className={`${inputClassName()} bg-slate-50 text-slate-500`} placeholder={optionKind === "type" ? "将根据显示名称自动生成" : "将根据显示名称自动生成"} />
          </Field>
        </div>
        <Field label="排序">
          <input type="number" value={optionForm.sortOrder} onChange={(e) => setOptionForm((prev: any) => ({ ...prev, sortOrder: e.target.value }))} className={inputClassName()} />
        </Field>
        <div className="rounded-[2px] border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-xs text-slate-500">
          {optionKind === "type"
            ? "提示：标识值建议使用英文小写和下划线。只有 daily / once 内置了明确的发放频率语义。"
            : "提示：新增任务类型后，只有在后端业务代码调用同名任务标识时，用户才会真正触发积分奖励。"}
        </div>
      </FormDialog>
    </AdminPageShell>
  );
}

export function AdminMall() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [itemPage, setItemPage] = useState(1);
  const [redemptionPage, setRedemptionPage] = useState(1);
  const [itemKeyword, setItemKeyword] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [itemEnabledFilter, setItemEnabledFilter] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [redemptionUsername, setRedemptionUsername] = useState("");
  const [redemptionItemKeyword, setRedemptionItemKeyword] = useState("");
  const [redemptionStatus, setRedemptionStatus] = useState("");
  const [redemptionDateFrom, setRedemptionDateFrom] = useState("");
  const [redemptionDateTo, setRedemptionDateTo] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<any>(null);
  const [itemForm, setItemForm] = useState<any>(defaultMallItemForm());
  const [itemUploading, setItemUploading] = useState(false);
  const [pendingItemRemove, setPendingItemRemove] = useState<any>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeEditing, setTypeEditing] = useState<any>(null);
  const [typeForm, setTypeForm] = useState<any>(defaultMallTypeForm());
  const [pendingTypeRemove, setPendingTypeRemove] = useState<any>(null);
  const size = 10;

  const itemQuery = new URLSearchParams({ page: String(itemPage), size: String(size) });
  if (itemKeyword.trim()) itemQuery.set("keyword", itemKeyword.trim());
  if (itemTypeFilter) itemQuery.set("type", itemTypeFilter);
  if (itemEnabledFilter) itemQuery.set("enabled", itemEnabledFilter);
  if (stockStatus) itemQuery.set("stockStatus", stockStatus);

  const redemptionQuery = new URLSearchParams({ page: String(redemptionPage), size: String(size) });
  if (redemptionUsername.trim()) redemptionQuery.set("username", redemptionUsername.trim());
  if (redemptionItemKeyword.trim()) redemptionQuery.set("itemKeyword", redemptionItemKeyword.trim());
  if (redemptionStatus) redemptionQuery.set("status", redemptionStatus);
  if (redemptionDateFrom) redemptionQuery.set("dateFrom", redemptionDateFrom);
  if (redemptionDateTo) redemptionQuery.set("dateTo", redemptionDateTo);

  const overviewQuery = useQuery({
    queryKey: adminKeys.mallOverview(),
    enabled: Boolean(role),
    queryFn: async () => (await adminRequest<any>(api.get("/api/admin/mall/overview", { silent: true }), navigate, role)) || { stats: {} },
  });
  const itemsQuery = useQuery({
    queryKey: adminKeys.mallItems({ page: itemPage, size, keyword: itemKeyword.trim(), type: itemTypeFilter, enabled: itemEnabledFilter, stockStatus }),
    enabled: Boolean(role),
    queryFn: async () => (await adminRequest<any>(api.get(`/api/admin/mall/items?${itemQuery.toString()}`, { silent: true }), navigate, role)) || { records: [], total: 0 },
  });
  const typesQuery = useQuery({
    queryKey: adminKeys.mallTypes(),
    enabled: Boolean(role),
    queryFn: async () => (await adminRequest<any>(api.get("/api/admin/mall/types", { silent: true }), navigate, role)) || { records: [] },
  });
  const redemptionsQuery = useQuery({
    queryKey: adminKeys.mallRedemptions({ page: redemptionPage, size, username: redemptionUsername.trim(), itemKeyword: redemptionItemKeyword.trim(), status: redemptionStatus, dateFrom: redemptionDateFrom, dateTo: redemptionDateTo }),
    enabled: Boolean(role),
    queryFn: async () => (await adminRequest<any>(api.get(`/api/admin/mall/redemptions?${redemptionQuery.toString()}`, { silent: true }), navigate, role)) || { records: [], total: 0 },
  });

  const stats = overviewQuery.data?.stats || {};
  const items = itemsQuery.data?.records || [];
  const itemTotal = itemsQuery.data?.total || 0;
  const types = typesQuery.data?.records || [];
  const redemptions = redemptionsQuery.data?.records || [];
  const redemptionTotal = redemptionsQuery.data?.total || 0;
  const existingMallTypeValues = useMemo(() => types.map((item: any) => String(item.value || "").trim()).filter(Boolean), [types]);

  const refreshOverview = () => queryClient.invalidateQueries({ queryKey: adminKeys.mallOverview() }).then(() => undefined);
  const refreshItems = () => queryClient.invalidateQueries({ queryKey: adminKeys.mallItems({ page: itemPage, size, keyword: itemKeyword.trim(), type: itemTypeFilter, enabled: itemEnabledFilter, stockStatus }) }).then(() => undefined);
  const refreshTypes = () => queryClient.invalidateQueries({ queryKey: adminKeys.mallTypes() }).then(() => undefined);
  const refreshRedemptions = () => queryClient.invalidateQueries({ queryKey: adminKeys.mallRedemptions({ page: redemptionPage, size, username: redemptionUsername.trim(), itemKeyword: redemptionItemKeyword.trim(), status: redemptionStatus, dateFrom: redemptionDateFrom, dateTo: redemptionDateTo }) }).then(() => undefined);

  const openCreateItem = () => {
    setItemEditing(null);
    setItemForm(defaultMallItemForm(types[0]?.value || ""));
    setItemOpen(true);
  };

  const openEditItem = (item: any) => {
    setItemEditing(item);
    setItemForm({
      name: item.name || "",
      type: item.type || "",
      price: String(item.price ?? 0),
      description: item.description || "",
      coverImage: item.coverImage || "",
      iconKey: item.iconKey || "",
      themeColor: item.themeColor || "",
      stock: item.stock === null || item.stock === undefined ? "" : String(item.stock),
      perUserLimit: item.perUserLimit === null || item.perUserLimit === undefined ? "" : String(item.perUserLimit),
      totalLimit: item.totalLimit === null || item.totalLimit === undefined ? "" : String(item.totalLimit),
      exchangeNotice: item.exchangeNotice || "",
      availableFrom: toDateTimeLocalInput(item.availableFrom),
      availableUntil: toDateTimeLocalInput(item.availableUntil),
      deliveryType: item.deliveryType || "virtual_auto",
      enabled: item.enabled ?? true,
      sortOrder: String(item.sortOrder ?? 0),
    });
    setItemOpen(true);
  };

  const handleItemCoverUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setItemUploading(true);
    try {
      const uploadResult = await api.post<{ url: string }>("/api/upload", formData);
      setItemForm((prev: any) => ({ ...prev, coverImage: uploadResult.url }));
      showAdminSuccess("商品封面已上传");
    } finally {
      setItemUploading(false);
    }
  };

  const submitItem = async () => {
    const payload = {
      name: itemForm.name,
      type: itemForm.type,
      price: Number(itemForm.price || 0),
      description: itemForm.description,
      coverImage: itemForm.coverImage || null,
      iconKey: itemForm.iconKey || null,
      themeColor: itemForm.themeColor || null,
      stock: toNullableNumber(itemForm.stock),
      perUserLimit: toNullableNumber(itemForm.perUserLimit),
      totalLimit: toNullableNumber(itemForm.totalLimit),
      exchangeNotice: itemForm.exchangeNotice || null,
      availableFrom: itemForm.availableFrom || null,
      availableUntil: itemForm.availableUntil || null,
      deliveryType: itemForm.deliveryType,
      enabled: Boolean(itemForm.enabled),
      sortOrder: Number(itemForm.sortOrder || 0),
    };
    const result = itemEditing
      ? await adminRequest(api.put(`/api/admin/mall/items/${itemEditing.id}`, payload), navigate, role, "更新商城商品")
      : await adminRequest(api.post("/api/admin/mall/items", payload), navigate, role, "创建商城商品");
    if (!result) return;
    setItemOpen(false);
    showAdminSuccess(formatAdminEntityMessage("商品", payload.name, itemEditing ? "已更新" : "已创建"));
    await Promise.all([refreshOverview(), refreshItems(), refreshTypes()]);
  };

  const toggleItemEnabled = async (item: any, nextEnabled: boolean) => {
    const result = await adminRequest(api.put(`/api/admin/mall/items/${item.id}/enabled`, { enabled: nextEnabled }), navigate, role, nextEnabled ? "启用商品" : "下架商品");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("商品", item.name, nextEnabled ? "已启用" : "已下架"));
    await Promise.all([refreshOverview(), refreshItems()]);
  };

  const openCreateType = () => {
    setTypeEditing(null);
    setTypeForm(defaultMallTypeForm());
    setTypeOpen(true);
  };

  const openEditType = (item: any) => {
    setTypeEditing(item);
    setTypeForm({ value: item.value || "", label: item.label || "", enabled: item.enabled ?? true, sortOrder: String(item.sortOrder ?? 0) });
    setTypeOpen(true);
  };

  const submitType = async () => {
    const payload = { typeValue: String(typeForm.value || "").trim(), label: String(typeForm.label || "").trim(), enabled: Boolean(typeForm.enabled), sortOrder: Number(typeForm.sortOrder || 0) };
    const result = typeEditing
      ? await adminRequest(api.put(`/api/admin/mall/types/${typeEditing.id}`, payload), navigate, role, "更新商品类型")
      : await adminRequest(api.post("/api/admin/mall/types", payload), navigate, role, "创建商品类型");
    if (!result) return;
    setTypeOpen(false);
    showAdminSuccess(formatAdminEntityMessage("商品类型", payload.label || payload.typeValue, typeEditing ? "已更新" : "已创建"));
    await Promise.all([refreshTypes(), refreshItems()]);
  };

  const toggleTypeEnabled = async (item: any, nextEnabled: boolean) => {
    const result = await adminRequest(api.put(`/api/admin/mall/types/${item.id}`, { typeValue: item.value, label: item.label, enabled: nextEnabled, sortOrder: Number(item.sortOrder || 0) }), navigate, role, nextEnabled ? "启用商品类型" : "停用商品类型");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("商品类型", item.label, nextEnabled ? "已启用" : "已停用"));
    await Promise.all([refreshTypes(), refreshItems()]);
  };

  const removeItem = (item: any) => setPendingItemRemove(item);

  const confirmRemoveItem = async () => {
    if (!pendingItemRemove) return;
    const result = await adminRequest(api.delete(`/api/admin/mall/items/${pendingItemRemove.id}`), navigate, role, "删除商城商品");
    if (!result) return;
    setPendingItemRemove(null);
    showAdminSuccess(formatAdminEntityMessage("商品", pendingItemRemove.name, "已删除"));
    await Promise.all([refreshOverview(), refreshItems()]);
  };

  const removeType = (item: any) => setPendingTypeRemove(item);

  const confirmRemoveType = async () => {
    if (!pendingTypeRemove) return;
    const result = await adminRequest(api.delete(`/api/admin/mall/types/${pendingTypeRemove.id}`), navigate, role, "删除商品类型");
    if (!result) return;
    setPendingTypeRemove(null);
    showAdminSuccess(formatAdminEntityMessage("商品类型", pendingTypeRemove.label, "已删除"));
    await Promise.all([refreshTypes(), refreshItems()]);
  };

  const updateRedemptionStatus = async (item: any, nextStatus: "fulfilled" | "cancelled") => {
    const remark = await openAdminPrompt({
      title: nextStatus === "fulfilled" ? "标记发放" : "取消兑换",
      message: nextStatus === "fulfilled" ? `可选填写发放备注：${item.itemName}` : `可选填写取消原因：${item.itemName}`,
      label: "处理备注",
      defaultValue: "",
      confirmLabel: nextStatus === "fulfilled" ? "确认发放" : "确认取消",
    });
    if (remark === null) return;
    const result = await adminRequest(api.put(`/api/admin/mall/redemptions/${item.id}/status`, { status: nextStatus, remark }), navigate, role, "更新兑换状态");
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("兑换记录", item.itemName, nextStatus === "fulfilled" ? "已标记发放" : "已取消"));
    await Promise.all([refreshOverview(), refreshItems(), refreshRedemptions()]);
  };

  return (
    <AdminPageShell title="商城管理" description="维护积分商城商品、商品类型与兑换记录。">
      <AdminStatGrid>
        <AdminStatCard label="商品总数" value={stats?.totalItems ?? "-"} />
        <AdminStatCard label="上架商品" value={stats?.enabledItems ?? "-"} />
        <AdminStatCard label="待处理兑换" value={stats?.pendingRedemptions ?? "-"} />
        <AdminStatCard label="已发放兑换" value={stats?.fulfilledRedemptions ?? "-"} />
      </AdminStatGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection title="商品管理" actions={<AddButton onClick={openCreateItem}>新增商品</AddButton>}>
          <FilterBar>
            <FilterField label="关键词">
              <input value={itemKeyword} onChange={(e) => { setItemKeyword(e.target.value); setItemPage(1); }} className={inputClassName()} placeholder="商品名称 / 描述" />
            </FilterField>
            <FilterField label="商品类型">
              <select value={itemTypeFilter} onChange={(e) => { setItemTypeFilter(e.target.value); setItemPage(1); }} className={inputClassName()}>
                <option value="">全部类型</option>
                {types.map((item: any) => <option key={item.id} value={item.value}>{item.label}</option>)}
              </select>
            </FilterField>
            <FilterField label="启用状态">
              <select value={itemEnabledFilter} onChange={(e) => { setItemEnabledFilter(e.target.value); setItemPage(1); }} className={inputClassName()}>
                <option value="">全部状态</option>
                <option value="true">已启用</option>
                <option value="false">已停用</option>
              </select>
            </FilterField>
            <FilterField label="库存状态">
              <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setItemPage(1); }} className={inputClassName()}>
                <option value="">全部库存</option>
                <option value="limited">有限库存</option>
                <option value="unlimited">不限库存</option>
                <option value="sold_out">已售罄</option>
              </select>
            </FilterField>
          </FilterBar>
          <div className="mt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>库存</TableHead>
                  <TableHead>限兑</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          {item.coverImage ? <img src={normalizeImageUrl(item.coverImage)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">无图</div>}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-800">{item.name}</div>
                          <div className="mt-1 truncate text-xs text-slate-400">{item.description || "-"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.typeLabel || item.type}</TableCell>
                    <TableCell>{item.price}</TableCell>
                    <TableCell>{item.stock === null || item.stock === undefined ? "不限" : item.stock}</TableCell>
                    <TableCell>{item.perUserLimit ? `每人 ${item.perUserLimit} 次` : item.totalLimit ? `总计 ${item.totalLimit} 次` : "不限制"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <AdminTableSwitch checked={Boolean(item.enabled)} onCheckedChange={(next) => void toggleItemEnabled(item, next)} />
                        <div className="text-xs text-slate-400">{item.statusText || "可兑换"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditItem(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                        <button type="button" onClick={() => removeItem(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {items.length === 0 && <AdminEmptyState message="暂无商城商品。" />}
            <div className="mt-4">
              <AdminPagination current={itemPage} size={size} total={itemTotal} onChange={setItemPage} />
            </div>
          </div>
        </AdminSection>

        <AdminSection title="商品类型管理" actions={<AddButton onClick={openCreateType}>新增类型</AddButton>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>显示名称</TableHead>
                <TableHead>标识值</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>使用商品</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell>{item.value}</TableCell>
                  <TableCell><AdminTableSwitch checked={Boolean(item.enabled)} onCheckedChange={(next) => void toggleTypeEnabled(item, next)} /></TableCell>
                  <TableCell>{item.usageCount ?? 0}</TableCell>
                  <TableCell>{item.sortOrder ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEditType(item)} className={secondaryButtonClassName()}><Edit3 size={14} />编辑</button>
                      <button type="button" onClick={() => removeType(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {types.length === 0 && <AdminEmptyState message="暂无商品类型。" />}
        </AdminSection>

        <AdminSection title="兑换记录">
          <FilterBar>
            <FilterField label="用户">
              <input value={redemptionUsername} onChange={(e) => { setRedemptionUsername(e.target.value); setRedemptionPage(1); }} className={inputClassName()} placeholder="按用户名筛选" />
            </FilterField>
            <FilterField label="商品名称">
              <input value={redemptionItemKeyword} onChange={(e) => { setRedemptionItemKeyword(e.target.value); setRedemptionPage(1); }} className={inputClassName()} placeholder="按商品名称筛选" />
            </FilterField>
            <FilterField label="状态">
              <select value={redemptionStatus} onChange={(e) => { setRedemptionStatus(e.target.value); setRedemptionPage(1); }} className={inputClassName()}>
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="fulfilled">已发放</option>
                <option value="cancelled">已取消</option>
              </select>
            </FilterField>
            <FilterField label="开始日期">
              <input type="date" value={redemptionDateFrom} onChange={(e) => { setRedemptionDateFrom(e.target.value); setRedemptionPage(1); }} className={inputClassName()} />
            </FilterField>
            <FilterField label="结束日期">
              <input type="date" value={redemptionDateTo} onChange={(e) => { setRedemptionDateTo(e.target.value); setRedemptionPage(1); }} className={inputClassName()} />
            </FilterField>
          </FilterBar>
          <div className="mt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.user?.username || "-"}</TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800">{item.itemName}</div>
                      <div className="mt-1 text-xs text-slate-400">{item.itemTypeLabel || item.itemType}</div>
                    </TableCell>
                    <TableCell>{item.price}</TableCell>
                    <TableCell><span className={statusBadgeClassName(item.status)}>{item.statusLabel || item.status}</span></TableCell>
                    <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.status === "pending" && <button type="button" onClick={() => void updateRedemptionStatus(item, "fulfilled")} className={primaryButtonClassName()}><CheckCircle2 size={14} />发放</button>}
                        {item.status !== "cancelled" && <button type="button" onClick={() => void updateRedemptionStatus(item, "cancelled")} className={secondaryButtonClassName()}><XCircle size={14} />取消</button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {redemptions.length === 0 && <AdminEmptyState message="暂无兑换记录。" />}
            <div className="mt-4">
              <AdminPagination current={redemptionPage} size={size} total={redemptionTotal} onChange={setRedemptionPage} />
            </div>
          </div>
        </AdminSection>

        <AdminSection title="兑换状态管理 / 统计">
          <AdminStatGrid>
            <AdminStatCard label="待处理" value={stats?.pendingRedemptions ?? 0} />
            <AdminStatCard label="已发放" value={stats?.fulfilledRedemptions ?? 0} />
            <AdminStatCard label="已取消" value={stats?.cancelledRedemptions ?? 0} />
            <AdminStatCard label="类型数" value={stats?.typeCount ?? 0} />
          </AdminStatGrid>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-bold text-slate-800">处理规则</div>
            <div className="mt-2">`virtual_auto` 商品兑换后直接记为已发放，`manual_review` 商品先进入待处理记录。</div>
            <div className="mt-2">将记录改为“已取消”时，会释放库存/限额并返还用户积分。</div>
          </div>
        </AdminSection>
      </div>

      <FormDialog open={itemOpen} onOpenChange={setItemOpen} title={itemEditing ? "编辑商品" : "新增商品"} submitLabel={itemEditing ? "保存商品" : "创建商品"} contentClassName="w-[min(900px,calc(100vw-2rem))]" onSubmit={submitItem}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="商品名称"><input value={itemForm.name} onChange={(e) => setItemForm((prev: any) => ({ ...prev, name: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="商品类型">
            <select value={itemForm.type} onChange={(e) => setItemForm((prev: any) => ({ ...prev, type: e.target.value }))} className={inputClassName()}>
              <option value="">请选择</option>
              {types.map((item: any) => <option key={item.id} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="价格"><input type="number" value={itemForm.price} onChange={(e) => setItemForm((prev: any) => ({ ...prev, price: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="排序"><input type="number" value={itemForm.sortOrder} onChange={(e) => setItemForm((prev: any) => ({ ...prev, sortOrder: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="库存"><input type="number" value={itemForm.stock} onChange={(e) => setItemForm((prev: any) => ({ ...prev, stock: e.target.value }))} className={inputClassName()} placeholder="留空表示不限" /></Field>
          <Field label="总限兑"><input type="number" value={itemForm.totalLimit} onChange={(e) => setItemForm((prev: any) => ({ ...prev, totalLimit: e.target.value }))} className={inputClassName()} placeholder="留空表示不限" /></Field>
          <Field label="每人限兑"><input type="number" value={itemForm.perUserLimit} onChange={(e) => setItemForm((prev: any) => ({ ...prev, perUserLimit: e.target.value }))} className={inputClassName()} placeholder="留空表示不限" /></Field>
          <Field label="发放方式">
            <select value={itemForm.deliveryType} onChange={(e) => setItemForm((prev: any) => ({ ...prev, deliveryType: e.target.value }))} className={inputClassName()}>
              <option value="virtual_auto">自动到账</option>
              <option value="manual_review">人工审核</option>
            </select>
          </Field>
          <Field label="开始时间"><input type="datetime-local" value={itemForm.availableFrom} onChange={(e) => setItemForm((prev: any) => ({ ...prev, availableFrom: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="结束时间"><input type="datetime-local" value={itemForm.availableUntil} onChange={(e) => setItemForm((prev: any) => ({ ...prev, availableUntil: e.target.value }))} className={inputClassName()} /></Field>
          <Field label="图标键"><input value={itemForm.iconKey} onChange={(e) => setItemForm((prev: any) => ({ ...prev, iconKey: e.target.value }))} className={inputClassName()} placeholder="如 award / gift" /></Field>
          <Field label="主题色"><input value={itemForm.themeColor} onChange={(e) => setItemForm((prev: any) => ({ ...prev, themeColor: e.target.value }))} className={inputClassName()} placeholder="如 teal / amber" /></Field>
        </div>
        <Field label="商品简介"><textarea value={itemForm.description} onChange={(e) => setItemForm((prev: any) => ({ ...prev, description: e.target.value }))} className={textareaClassName()} /></Field>
        <Field label="兑换须知"><textarea value={itemForm.exchangeNotice} onChange={(e) => setItemForm((prev: any) => ({ ...prev, exchangeNotice: e.target.value }))} className={textareaClassName()} /></Field>
        <Field label="商品封面">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {itemForm.coverImage ? <img src={normalizeImageUrl(itemForm.coverImage)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">无图</div>}
              </div>
              <label className={`${primaryButtonClassName()} cursor-pointer ${itemUploading ? "opacity-60" : ""}`}>
                {itemUploading ? <LoaderCircle size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                {itemUploading ? "上传中..." : "上传封面"}
                <input type="file" accept="image/*" className="hidden" disabled={itemUploading} onChange={(e) => void handleItemCoverUpload(e.target.files)} />
              </label>
            </div>
            <input value={itemForm.coverImage} onChange={(e) => setItemForm((prev: any) => ({ ...prev, coverImage: e.target.value }))} className={inputClassName()} placeholder="或直接填写图片地址" />
          </div>
        </Field>
        <AdminFormSwitch label="启用该商品" checked={Boolean(itemForm.enabled)} onCheckedChange={(next) => setItemForm((prev: any) => ({ ...prev, enabled: next }))} />
      </FormDialog>

      <FormDialog open={typeOpen} onOpenChange={setTypeOpen} title={typeEditing ? "编辑商品类型" : "新增商品类型"} submitLabel={typeEditing ? "保存类型" : "创建类型"} contentClassName="w-[min(640px,calc(100vw-2rem))]" onSubmit={submitType}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="显示名称">
            <input
              value={typeForm.label}
              onChange={(e) => {
                const nextLabel = e.target.value;
                setTypeForm((prev: any) => ({
                  ...prev,
                  label: nextLabel,
                  value: typeEditing ? prev.value : generateMachineIdentifier(nextLabel, "mall_type", existingMallTypeValues),
                }));
              }}
              className={inputClassName()}
            />
          </Field>
          <Field label="标识值"><input value={typeForm.value} readOnly className={`${inputClassName()} bg-slate-50 text-slate-500`} placeholder="将根据显示名称自动生成" /></Field>
        </div>
        <Field label="排序"><input type="number" value={typeForm.sortOrder} onChange={(e) => setTypeForm((prev: any) => ({ ...prev, sortOrder: e.target.value }))} className={inputClassName()} /></Field>
        <AdminFormSwitch label="启用该类型" checked={Boolean(typeForm.enabled)} onCheckedChange={(next) => setTypeForm((prev: any) => ({ ...prev, enabled: next }))} />
      </FormDialog>

      <DeleteConfirmDialog open={Boolean(pendingItemRemove)} title="删除商品" message={pendingItemRemove ? `确认删除商品《${pendingItemRemove.name}》？` : ""} onCancel={() => setPendingItemRemove(null)} onConfirm={() => void confirmRemoveItem()} />
      <DeleteConfirmDialog open={Boolean(pendingTypeRemove)} title="删除商品类型" message={pendingTypeRemove ? `确认删除商品类型《${pendingTypeRemove.label}》？` : ""} onCancel={() => setPendingTypeRemove(null)} onConfirm={() => void confirmRemoveType()} />
    </AdminPageShell>
  );
}

export function AdminLevels() {
  const navigate = useNavigate();
  const role = useAdminRole();
  const queryClient = useQueryClient();
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [levelRuleOpen, setLevelRuleOpen] = useState(false);
  const [levelRuleEditing, setLevelRuleEditing] = useState<any>(null);
  const [pendingLevelRuleRemove, setPendingLevelRuleRemove] = useState<any>(null);
  const [levelRuleForm, setLevelRuleForm] = useState<any>({ level: "", name: "", threshold: "0", enabled: true });
  const [expRuleOpen, setExpRuleOpen] = useState(false);
  const [expRuleEditing, setExpRuleEditing] = useState<any>(null);
  const [pendingExpRuleRemove, setPendingExpRuleRemove] = useState<any>(null);
  const [expRuleForm, setExpRuleForm] = useState<any>({ key: "", name: "", description: "", minExp: "0", maxExp: "0", maxObtainCount: "", enabled: true });
  const [userKeyword, setUserKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [logUsername, setLogUsername] = useState("");
  const [bizType, setBizType] = useState("");
  const size = 10;
  const userQuery = new URLSearchParams({ page: String(userPage), size: String(size) });
  if (userKeyword.trim()) userQuery.set("keyword", userKeyword.trim());
  if (levelFilter) userQuery.set("level", levelFilter);
  const logQuery = new URLSearchParams({ page: String(logPage), size: String(size) });
  if (logUsername.trim()) logQuery.set("username", logUsername.trim());
  if (bizType.trim()) logQuery.set("bizType", bizType.trim());

  const overviewQuery = useQuery({
    queryKey: adminKeys.levelsOverview(),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get("/api/admin/levels/overview", { silent: true }), navigate, role);
      return result || null;
    },
  });
  const usersQuery = useQuery({
    queryKey: adminKeys.levelsUsers({ page: userPage, size, keyword: userKeyword.trim(), level: levelFilter }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(`/api/admin/levels/users?${userQuery.toString()}`, { silent: true }), navigate, role);
      return result || { records: [], total: 0 };
    },
  });
  const logsQuery = useQuery({
    queryKey: adminKeys.levelsLogs({ page: logPage, size, username: logUsername.trim(), bizType: bizType.trim() }),
    enabled: Boolean(role),
    queryFn: async () => {
      const result = await adminRequest<any>(api.get(`/api/admin/levels/logs?${logQuery.toString()}`, { silent: true }), navigate, role);
      return result || { records: [], total: 0 };
    },
  });

  const overview = overviewQuery.data;
  const users = usersQuery.data?.records || [];
  const userTotal = usersQuery.data?.total || 0;
  const logs = logsQuery.data?.records || [];
  const logTotal = logsQuery.data?.total || 0;
  const existingExpRuleKeys = useMemo(() => (overview?.expRules || []).map((item: any) => String(item.key || "").trim()).filter(Boolean), [overview?.expRules]);
  const experienceBizTypeOptions = useMemo(() => {
    const normalizedCurrentBizType = String(bizType || "").trim();
    if (!normalizedCurrentBizType) return EXPERIENCE_BIZ_TYPE_OPTIONS;
    return EXPERIENCE_BIZ_TYPE_OPTIONS.some((item) => item.value === normalizedCurrentBizType)
      ? EXPERIENCE_BIZ_TYPE_OPTIONS
      : [...EXPERIENCE_BIZ_TYPE_OPTIONS, { value: normalizedCurrentBizType, label: normalizedCurrentBizType }];
  }, [bizType]);

  const refreshOverview = () => queryClient.invalidateQueries({ queryKey: adminKeys.levelsOverview() }).then(() => undefined);
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: adminKeys.levelsUsers({ page: userPage, size, keyword: userKeyword.trim(), level: levelFilter }) }).then(() => undefined);
  const refreshLogs = () => queryClient.invalidateQueries({ queryKey: adminKeys.levelsLogs({ page: logPage, size, username: logUsername.trim(), bizType: bizType.trim() }) }).then(() => undefined);

  const openCreateLevelRule = () => {
    setLevelRuleEditing(null);
    setLevelRuleForm({ level: "", name: "", threshold: "0", enabled: true });
    setLevelRuleOpen(true);
  };

  const updateLevelRule = (item: any) => {
    setLevelRuleEditing(item);
    setLevelRuleForm({
      level: String(item.level ?? ""),
      name: String(item.name ?? ""),
      threshold: String(item.threshold ?? 0),
      enabled: item.enabled ?? true,
    });
    setLevelRuleOpen(true);
  };

  const submitLevelRule = async () => {
    const payload = {
      level: Number(levelRuleForm.level),
      name: String(levelRuleForm.name || "").trim(),
      threshold: Number(levelRuleForm.threshold),
      enabled: Boolean(levelRuleForm.enabled),
    };
    const result = levelRuleEditing
      ? await adminRequest(
        api.put(`/api/admin/levels/rules/${levelRuleEditing.level}`, {
          name: payload.name,
          threshold: payload.threshold,
          enabled: payload.enabled,
        }),
        navigate,
        role,
        "更新等级定义",
      )
      : await adminRequest(
        api.post("/api/admin/levels/rules", payload),
        navigate,
        role,
        "新增等级定义",
      );
    if (!result) return;
    setLevelRuleOpen(false);
    showAdminSuccess(formatAdminEntityMessage("等级定义", payload.name || `Lv.${payload.level}`, levelRuleEditing ? "已更新" : "已创建"));
    await Promise.all([refreshOverview(), refreshUsers()]);
  };

  const removeLevelRule = (item: any) => {
    setPendingLevelRuleRemove(item);
  };

  const confirmRemoveLevelRule = async () => {
    if (!pendingLevelRuleRemove) return;
    const result = await adminRequest(
      api.delete(`/api/admin/levels/rules/${pendingLevelRuleRemove.level}`),
      navigate,
      role,
      "删除等级定义",
    );
    if (!result) return;
    setPendingLevelRuleRemove(null);
    showAdminSuccess(formatAdminEntityMessage("等级定义", pendingLevelRuleRemove.name || `Lv.${pendingLevelRuleRemove.level}`, "已删除"));
    await Promise.all([refreshOverview(), refreshUsers()]);
  };

  const toggleLevelRuleEnabled = async (item: any, nextEnabled: boolean) => {
    const result = await adminRequest(
      api.put(`/api/admin/levels/rules/${item.level}`, {
        name: item.name,
        threshold: Number(item.threshold || 0),
        enabled: nextEnabled,
      }),
      navigate,
      role,
      nextEnabled ? "启用等级定义" : "停用等级定义",
    );
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("等级定义", item.name || `Lv.${item.level}`, nextEnabled ? "已启用" : "已停用"));
    await Promise.all([refreshOverview(), refreshUsers()]);
  };

  const openCreateExpRule = () => {
    setExpRuleEditing(null);
    setExpRuleForm({ key: "", name: "", description: "", minExp: "0", maxExp: "0", maxObtainCount: "", enabled: true });
    setExpRuleOpen(true);
  };

  const updateExpRule = (item: any) => {
    setExpRuleEditing(item);
    setExpRuleForm({
      key: String(item.key ?? ""),
      name: String(item.label ?? ""),
      description: String(item.description ?? ""),
      minExp: String(item.minExp ?? 0),
      maxExp: String(item.maxExp ?? 0),
      maxObtainCount: item.maxObtainCount === null || item.maxObtainCount === undefined ? "" : String(item.maxObtainCount),
      enabled: item.enabled ?? true,
    });
    setExpRuleOpen(true);
  };

  const submitExpRule = async () => {
    const payload = {
      ruleKey: String(expRuleForm.key || "").trim(),
      name: String(expRuleForm.name || "").trim(),
      description: String(expRuleForm.description || "").trim(),
      minExp: Number(expRuleForm.minExp),
      maxExp: Number(expRuleForm.maxExp),
      maxObtainCount: expRuleForm.maxObtainCount === "" ? null : Number(expRuleForm.maxObtainCount),
      enabled: Boolean(expRuleForm.enabled),
    };
    const result = expRuleEditing
      ? await adminRequest(
        api.put(`/api/admin/levels/exp-rules/${expRuleEditing.key}`, {
          name: payload.name,
          description: payload.description,
          minExp: payload.minExp,
          maxExp: payload.maxExp,
          maxObtainCount: payload.maxObtainCount,
          enabled: payload.enabled,
        }),
        navigate,
        role,
        "更新经验规则",
      )
      : await adminRequest(
        api.post("/api/admin/levels/exp-rules", payload),
        navigate,
        role,
        "新增经验规则",
      );
    if (!result) return;
    setExpRuleOpen(false);
    showAdminSuccess(formatAdminEntityMessage("经验规则", payload.name || payload.ruleKey, expRuleEditing ? "已更新" : "已创建"));
    await refreshOverview();
  };

  const removeExpRule = (item: any) => {
    setPendingExpRuleRemove(item);
  };

  const confirmRemoveExpRule = async () => {
    if (!pendingExpRuleRemove) return;
    const result = await adminRequest(
      api.delete(`/api/admin/levels/exp-rules/${pendingExpRuleRemove.key}`),
      navigate,
      role,
      "删除经验规则",
    );
    if (!result) return;
    setPendingExpRuleRemove(null);
    showAdminSuccess(formatAdminEntityMessage("经验规则", pendingExpRuleRemove.label || pendingExpRuleRemove.key, "已删除"));
    await refreshOverview();
  };

  const toggleExpRuleEnabled = async (item: any, nextEnabled: boolean) => {
    const result = await adminRequest(
      api.put(`/api/admin/levels/exp-rules/${item.key}`, {
        name: item.label,
        description: item.description,
        minExp: Number(item.minExp || 0),
        maxExp: Number(item.maxExp || 0),
        maxObtainCount: item.maxObtainCount,
        enabled: nextEnabled,
      }),
      navigate,
      role,
      nextEnabled ? "启用经验规则" : "停用经验规则",
    );
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("经验规则", item.label || item.key, nextEnabled ? "已启用" : "已停用"));
    await refreshOverview();
  };

  const updateUser = async (item: any) => {
    const level = await openAdminPrompt({
      title: "更新用户等级",
      message: `设置 ${item.username} 的等级。`,
      label: "用户等级",
      defaultValue: String(item.level ?? 1),
      confirmLabel: "下一步",
      required: true,
    });
    if (level === null) return;
    const exp = await openAdminPrompt({
      title: "更新用户等级",
      message: `设置 ${item.username} 的经验值。`,
      label: "经验值",
      defaultValue: String(item.exp ?? 0),
      confirmLabel: "确认更新",
      required: true,
    });
    if (exp === null) return;
    const result = await adminRequest(
      api.put(`/api/admin/levels/users/${item.id}`, { level: Number(level), exp: Number(exp) }),
      navigate,
      role,
      "更新用户等级",
    );
    if (!result) return;
    showAdminSuccess(formatAdminEntityMessage("用户", item.username, "等级已更新"));
    await refreshUsers();
  };

  const recalculate = async () => {
    const result = await adminRequest(api.post("/api/admin/levels/recalculate", {}), navigate, role, "重算等级");
    if (!result) return;
    showAdminSuccess("等级重算已完成");
    await Promise.all([refreshOverview(), refreshUsers(), refreshLogs()]);
  };

  return (
    <AdminPageShell
      title="等级体系"
      description="查看等级分布、经验规则，并校准用户等级。"
    >
      <AdminStatGrid>
        <AdminStatCard label="用户数" value={overview?.stats?.userCount ?? "-"} />
        <AdminStatCard label="总经验值" value={overview?.stats?.totalExp ?? "-"} />
        <AdminStatCard label="今日经验变化" value={overview?.stats?.todayExp ?? "-"} />
        <AdminStatCard label="最高等级" value={`${overview?.stats?.highestLevelName || "-"} / Lv.${overview?.stats?.highestLevel || "-"}`} hint={`人数 ${overview?.stats?.highestLevelUsers ?? "-"}`} />
      </AdminStatGrid>

      <div className="mb-6 flex items-center justify-end">
        <button type="button" onClick={recalculate} className={primaryButtonClassName()}>
          <RefreshCcw size={16} />
          重算等级
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.82),rgba(255,255,255,0.96))] p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[20px] font-black text-slate-900">等级定义</h3>
              <p className="mt-1 text-sm text-slate-500">定义每一级的名称、阈值与启用状态。</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                {(overview?.levelRules || []).length} 条定义
              </span>
              <AddButton onClick={openCreateLevelRule}>新增定义</AddButton>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>等级</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>经验阈值</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(overview?.levelRules || []).map((item: any) => (
                <TableRow key={item.level}>
                  <TableCell>Lv.{item.level}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.threshold}</TableCell>
                      <TableCell>
                        <AdminTableSwitch
                          checked={Boolean(item.enabled ?? true)}
                          onCheckedChange={(next) => void toggleLevelRuleEnabled(item, next)}
                        />
                      </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateLevelRule(item)} className={secondaryButtonClassName()}><Edit3 size={14} />调整定义</button>
                      <button type="button" onClick={() => removeLevelRule(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[20px] font-black text-slate-900">等级用户</h3>
              <p className="mt-1 text-sm text-slate-500">按用户或等级快速筛查，并校准异常等级。</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
              共 {userTotal} 人
            </span>
          </div>
          <FilterBar>
            <FilterField label="关键词">
              <input value={userKeyword} onChange={(e) => { setUserKeyword(e.target.value); setUserPage(1); }} className={inputClassName()} placeholder="用户名 / 邮箱" />
            </FilterField>
            <FilterField label="等级">
              <input value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setUserPage(1); }} className={inputClassName()} placeholder="如 3" />
            </FilterField>
          </FilterBar>
          <div className="mt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>经验</TableHead>
                  <TableHead>进度</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>{item.levelName} / Lv.{item.level}</TableCell>
                    <TableCell>{item.exp}</TableCell>
                    <TableCell>{item.progress?.current ?? 0} / {item.progress?.nextThreshold ?? "-"}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => updateUser(item)} className={secondaryButtonClassName()}><Edit3 size={14} />调整</button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {users.length === 0 && <AdminEmptyState message="暂无等级用户数据。" />}
            <div className="mt-4">
              <AdminPagination current={userPage} size={size} total={userTotal} onChange={setUserPage} />
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.88),rgba(255,255,255,0.98))] p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[20px] font-black text-slate-900">经验规则</h3>
              <p className="mt-1 text-sm text-slate-500">配置每种行为的经验变化区间与启用状态。</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                {(overview?.expRules || []).length} 条规则
              </span>
              <AddButton onClick={openCreateExpRule}>新增规则</AddButton>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则</TableHead>
                <TableHead>经验范围</TableHead>
                <TableHead>最多可获得</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(overview?.expRules || []).map((item: any) => (
                <TableRow key={item.key}>
                  <TableCell>
                    <div className="font-bold text-slate-800">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.description || "-"}</div>
                  </TableCell>
                  <TableCell>{item.rangeText}</TableCell>
                  <TableCell>{item.maxObtainCount && item.maxObtainCount > 0 ? `${item.maxObtainCount} 次` : "不限制"}</TableCell>
                      <TableCell>
                        <AdminTableSwitch
                          checked={Boolean(item.enabled)}
                          onCheckedChange={(next) => void toggleExpRuleEnabled(item, next)}
                        />
                      </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateExpRule(item)} className={secondaryButtonClassName()}><Edit3 size={14} />调整规则</button>
                      <button type="button" onClick={() => removeExpRule(item)} className={secondaryButtonClassName()}><Trash2 size={14} />删除</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[20px] font-black text-slate-900">经验日志</h3>
              <p className="mt-1 text-sm text-slate-500">从日志维度回看经验流转，验证规则是否按预期生效。</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
              共 {logTotal} 条
            </span>
          </div>
          <FilterBar>
            <FilterField label="用户名">
              <input value={logUsername} onChange={(e) => { setLogUsername(e.target.value); setLogPage(1); }} className={inputClassName()} />
            </FilterField>
            <FilterField label="业务类型">
              <select value={bizType} onChange={(e) => { setBizType(e.target.value); setLogPage(1); }} className={inputClassName()}>
                <option value="">全部业务</option>
                {experienceBizTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </FilterField>
          </FilterBar>
          <div className="mt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>业务</TableHead>
                  <TableHead>经验变化</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.user?.username || "-"}</TableCell>
                    <TableCell>{formatExperienceBizType(item.bizLabel || item.bizType)}</TableCell>
                    <TableCell>{item.expChange}</TableCell>
                    <TableCell>{item.reason || "-"}</TableCell>
                    <TableCell>{formatMaybeDate(item.createTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {logs.length === 0 && <AdminEmptyState message="暂无经验日志。" />}
            <div className="mt-4">
              <AdminPagination current={logPage} size={size} total={logTotal} onChange={setLogPage} />
            </div>
          </div>
        </section>
      </div>

      <FormDialog
        open={levelRuleOpen}
        onOpenChange={setLevelRuleOpen}
        title={levelRuleEditing ? `编辑 Lv.${levelRuleEditing.level} 等级定义` : "新增等级定义"}
        description="可配置等级名称、经验阈值与启用状态。新增或删除后会自动重算受影响用户等级。"
        submitLabel={levelRuleEditing ? "保存定义" : "创建定义"}
        contentClassName="w-[min(640px,calc(100vw-2rem))]"
        bodyClassName="px-5 py-4"
        onSubmit={submitLevelRule}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="等级值">
            <input
              type="number"
              min={1}
              value={levelRuleForm.level}
              disabled={Boolean(levelRuleEditing)}
              onChange={(e) => setLevelRuleForm((prev: any) => ({ ...prev, level: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <Field label="等级名称">
            <input
              value={levelRuleForm.name}
              onChange={(e) => setLevelRuleForm((prev: any) => ({ ...prev, name: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <Field label="经验阈值">
            <input
              type="number"
              min={0}
              value={levelRuleForm.threshold}
              onChange={(e) => setLevelRuleForm((prev: any) => ({ ...prev, threshold: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <Field label="启用状态">
            <AdminFormSwitch
              label="启用该等级定义"
              checked={Boolean(levelRuleForm.enabled)}
              onCheckedChange={(next) => setLevelRuleForm((prev: any) => ({ ...prev, enabled: next }))}
            />
          </Field>
        </div>
      </FormDialog>

      <FormDialog
        open={expRuleOpen}
        onOpenChange={setExpRuleOpen}
        title={expRuleEditing ? `编辑经验规则 ${expRuleEditing.label}` : "新增经验规则"}
        description="固定奖励规则可将最小值和最大值设置成一致；随机奖励规则可设置一个范围。"
        submitLabel={expRuleEditing ? "保存规则" : "创建规则"}
        contentClassName="w-[min(760px,calc(100vw-2rem))]"
        bodyClassName="px-5 py-4"
        onSubmit={submitExpRule}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="规则标识">
            <input
              value={expRuleForm.key}
              readOnly
              className={`${inputClassName()} bg-slate-50 text-slate-500`}
              placeholder="将根据规则名称自动生成"
            />
          </Field>
          <Field label="规则名称">
            <input
              value={expRuleForm.name}
              onChange={(e) => {
                const nextName = e.target.value;
                setExpRuleForm((prev: any) => ({
                  ...prev,
                  name: nextName,
                  key: expRuleEditing ? prev.key : generateMachineIdentifier(nextName, "exp_rule", existingExpRuleKeys),
                }));
              }}
              className={inputClassName()}
            />
          </Field>
          <Field label="最小经验值">
            <input
              type="number"
              min={0}
              value={expRuleForm.minExp}
              onChange={(e) => setExpRuleForm((prev: any) => ({ ...prev, minExp: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <Field label="最大经验值">
            <input
              type="number"
              min={0}
              value={expRuleForm.maxExp}
              onChange={(e) => setExpRuleForm((prev: any) => ({ ...prev, maxExp: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <Field label="最多可获得次数">
            <input
              type="number"
              min={0}
              value={expRuleForm.maxObtainCount}
              onChange={(e) => setExpRuleForm((prev: any) => ({ ...prev, maxObtainCount: e.target.value }))}
              className={inputClassName()}
              placeholder="留空或 0 表示不限制"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="规则说明">
              <textarea
                value={expRuleForm.description}
                onChange={(e) => setExpRuleForm((prev: any) => ({ ...prev, description: e.target.value }))}
                className={textareaClassName()}
              />
            </Field>
          </div>
          <Field label="启用状态">
            <AdminFormSwitch
              label="启用该经验规则"
              checked={Boolean(expRuleForm.enabled)}
              onCheckedChange={(next) => setExpRuleForm((prev: any) => ({ ...prev, enabled: next }))}
            />
          </Field>
        </div>
      </FormDialog>

      <DeleteConfirmDialog
        open={Boolean(pendingLevelRuleRemove)}
        title="删除等级定义"
        message={pendingLevelRuleRemove ? `确认删除 Lv.${pendingLevelRuleRemove.level} ${pendingLevelRuleRemove.name}？删除后会自动重算受影响用户等级。` : ""}
        confirmLabel="确认删除"
        onCancel={() => setPendingLevelRuleRemove(null)}
        onConfirm={() => void confirmRemoveLevelRule()}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingExpRuleRemove)}
        title="删除经验规则"
        message={pendingExpRuleRemove ? `确认删除经验规则 ${pendingExpRuleRemove.label || pendingExpRuleRemove.key}？` : ""}
        confirmLabel="确认删除"
        onCancel={() => setPendingExpRuleRemove(null)}
        onConfirm={() => void confirmRemoveExpRule()}
      />
    </AdminPageShell>
  );
}

async function adminRequest<T>(
  promise: Promise<T>,
  navigate: ReturnType<typeof useNavigate>,
  role: string | null,
  actionLabel?: string,
) {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        showAdminError("登录已过期，请重新登录");
        navigate("/auth", { replace: true });
        return null;
      }
      if (error.status === 403) {
        showAdminError("当前账号无权限执行该操作");
        navigate(getDefaultAdminPath(role), { replace: true });
        return null;
      }
      showAdminError(actionLabel ? `${actionLabel}失败：${error.message || "操作失败"}` : error.message || "操作失败");
      return null;
    }
    throw error;
  }
}

function AdminDialogHost() {
  const [request, setRequest] = useState<AdminDialogRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const controller: AdminDialogController = {
    showFeedback: (feedback) => {
      setRequest(feedback);
    },
    openConfirm: (options) => new Promise<boolean>((resolve) => {
      setRequest({ kind: "confirm", ...options, resolve });
    }),
    openPrompt: (options) => new Promise<string | null>((resolve) => {
      setPromptValue(options.defaultValue ?? "");
      setRequest({ kind: "prompt", ...options, resolve });
    }),
  };

  adminDialogController = controller;

  useEffect(() => {
    return () => {
      if (adminDialogController === controller) {
        adminDialogController = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!request || request.kind !== "feedback") return;
    if (request.type === "error" && request.durationMs === undefined) return;

    const timeoutId = window.setTimeout(() => {
      setRequest((current) => current === request ? null : current);
    }, request.durationMs ?? 2000);

    return () => window.clearTimeout(timeoutId);
  }, [request]);

  const dismiss = () => {
    if (!request) return;
    if (request.kind === "confirm") {
      request.resolve(false);
    } else if (request.kind === "prompt") {
      request.resolve(null);
    }
    setRequest(null);
  };

  const confirm = () => {
    if (!request) return;
    if (request.kind === "confirm") {
      request.resolve(true);
      setRequest(null);
      return;
    }
    if (request.kind === "prompt") {
      if (request.required && !promptValue.trim()) return;
      request.resolve(promptValue);
      setRequest(null);
    }
  };

  if (!request) return null;

  const isFeedback = request.kind === "feedback";
  const isPrompt = request.kind === "prompt";
  const isConfirm = request.kind === "confirm";
  const isError = isFeedback && request.type === "error";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4" onClick={() => {
      if (isFeedback) {
        setRequest(null);
        return;
      }
      dismiss();
    }}>
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`h-1.5 ${isError ? "bg-rose-500" : "bg-emerald-500"}`} />
        <div className="p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isError ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              {isError ? <XCircle size={22} /> : isFeedback ? <CheckCircle2 size={22} /> : <Sparkles size={20} />}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900">
                {isConfirm ? request.title : isPrompt ? request.title : request.title || (isError ? "操作失败，请检查后重试" : "操作成功")}
              </div>
              {((isConfirm && request.message) || (isPrompt && request.message) || (isFeedback && request.message)) ? (
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  {isConfirm ? request.message : isPrompt ? request.message : request.message}
                </div>
              ) : null}
            </div>
          </div>

          {isPrompt ? (
            <label className="block">
              <div className="mb-1.5 text-sm font-bold text-slate-700">{request.label || "请输入内容"}</div>
              <input
                autoFocus
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    confirm();
                  }
                }}
                placeholder={request.placeholder}
                className={inputClassName()}
              />
            </label>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {isFeedback ? null : (
              <button type="button" onClick={dismiss} className={secondaryButtonClassName()}>
                {isConfirm ? request.cancelLabel || "取消" : isPrompt ? request.cancelLabel || "取消" : "取消"}
              </button>
            )}
            <button
              type="button"
              onClick={isFeedback ? () => setRequest(null) : confirm}
              className={isFeedback
                ? `inline-flex h-10 min-w-24 items-center justify-center rounded-xl px-5 text-sm font-bold text-white transition ${isError ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`
                : `${primaryButtonClassName()} ${isConfirm && request.destructive ? "!bg-rose-600 hover:!bg-rose-700" : ""}`}
            >
              {isFeedback
                ? request.confirmLabel || (isError ? "知道了" : "完成")
                : isConfirm
                  ? request.confirmLabel || "确认"
                  : request.confirmLabel || "确认"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function showAdminSuccess(message: string) {
  adminDialogController?.showFeedback({ kind: "feedback", type: "success", message });
}

function showAdminError(message: string) {
  toast.error(message);
}

async function runAdminDelete(options: {
  request: Promise<unknown>;
  successMessage: string;
  staleMessage: string;
  errorLabel: string;
  onDeleted?: () => void;
  onRefresh?: () => Promise<void>;
  onFinally?: () => void;
}) {
  const { request, successMessage, staleMessage, errorLabel, onDeleted, onRefresh, onFinally } = options;
  try {
    await request;
    onDeleted?.();
    toast.success(successMessage);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      toast.info(staleMessage);
      return false;
    }
    if (error instanceof ApiError) {
      toast.error(`${errorLabel}失败：${error.message || "操作失败"}`);
      return false;
    }
    throw error;
  } finally {
    onFinally?.();
    if (onRefresh) {
      await onRefresh();
    }
  }
}

function openAdminConfirm(options: Omit<AdminConfirmRequest, "kind" | "resolve">) {
  return adminDialogController?.openConfirm(options) ?? Promise.resolve(false);
}

function openAdminPrompt(options: Omit<AdminPromptRequest, "kind" | "resolve">) {
  return adminDialogController?.openPrompt(options) ?? Promise.resolve<string | null>(null);
}

function formatAdminEntityMessage(entity: string, value: unknown, suffix: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? `${entity}《${text}》${suffix}` : `${entity}${suffix}`;
}

function findAdminRecordTitle(records: any[], id: number) {
  const item = records.find((record) => record.id === id);
  return item?.title || item?.name || item?.username || "";
}

function useAdminRole() {
  const { user } = useSession();
  return hasAdminConsoleAccess(user?.role) ? (user?.role as AdminRole) : null;
}

function DeleteConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "确认删除",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={onCancel} className={secondaryButtonClassName()}>
            取消
          </button>
          <button type="button" onClick={onConfirm} className={`${primaryButtonClassName()} !bg-rose-600 hover:!bg-rose-700`}>
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "保存",
  contentClassName,
  bodyClassName,
  onSubmit,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`flex max-h-[92vh] w-[min(760px,calc(100vw-2rem))] flex-col overflow-hidden p-0 sm:max-w-none ${contentClassName || ""}`}>
        <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-4 ${bodyClassName || ""}`}>
          <div className="space-y-4">{children}</div>
        </div>
        <DialogFooter className="shrink-0 border-t border-slate-200 px-6 py-4 bg-white">
          <button type="button" onClick={() => onOpenChange(false)} className={secondaryButtonClassName()}>
            取消
          </button>
          <button type="button" onClick={() => void onSubmit()} className={primaryButtonClassName()}>
            {submitLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function AdminFormSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex h-11 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function AdminTableSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      <span className={`text-xs font-bold ${checked ? "text-emerald-600" : "text-slate-400"}`}>
        {checked ? "已启用" : "未启用"}
      </span>
    </div>
  );
}

function parseNumberArray(value: unknown) {
  if (Array.isArray(value)) return value.map(Number).filter((item) => !Number.isNaN(item));
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(Number).filter((item) => !Number.isNaN(item));
    } catch {
      return value.split(",").map((item) => Number(item.trim())).filter((item) => !Number.isNaN(item));
    }
  }
  return [];
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function toDateTimeLocalInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function defaultMallItemForm(defaultType = "") {
  return {
    name: "",
    type: defaultType,
    price: "0",
    description: "",
    coverImage: "",
    iconKey: "gift",
    themeColor: "teal",
    stock: "",
    perUserLimit: "",
    totalLimit: "",
    exchangeNotice: "",
    availableFrom: "",
    availableUntil: "",
    deliveryType: "virtual_auto",
    enabled: true,
    sortOrder: "0",
  };
}

function defaultMallTypeForm() {
  return {
    value: "",
    label: "",
    enabled: true,
    sortOrder: "0",
  };
}

function defaultUserForm() {
  return { username: "", email: "", password: "", role: "user", status: 0, managedCategories: [] as number[] };
}

function defaultCategoryForm() {
  return { name: "", description: "", groupName: "", sortOrder: 0 };
}

function defaultNotificationForm() {
  return { title: "", content: "", type: "system", status: "draft", targetType: "all", targetRoles: "", attachments: "" };
}

function defaultQuestionCategoryForm() {
  return { name: "", description: "", groupName: "", sortOrder: 0, enabled: true };
}

function defaultQuestionForm() {
  return {
    title: "",
    questionCategoryId: "",
    difficulty: 1,
    points: 0,
    explanation: "",
    enabled: true,
    templateFileUrl: "",
    answerSheet: "",
    answerRange: "",
    answerSnapshotJson: "",
    checkFormula: false,
    sheetCountLimit: 5,
    version: 1,
  };
}

function defaultPointsRuleForm(defaultType = "daily") {
  return { name: "", description: "", taskKey: "", points: 0, type: defaultType, enabled: true, userVisible: true, sortOrder: 0 };
}

function defaultPointsOptionForm(kind: "type" | "task_key") {
  return { kind, value: "", label: "", sortOrder: 0 };
}

function defaultPostFilters() {
  return { keyword: "", username: "", status: "active", categoryId: "", startDate: "", endDate: "" };
}

function buildAdminOptionChoices(
  source: any[] | undefined,
  fallback: Array<{ value: string; label: string }>,
  currentValue?: unknown,
) {
  const normalizedSource = (source && source.length > 0 ? source : fallback).map((item: any) => ({
    value: String(item.value ?? item.optionValue ?? "").trim(),
    label: String(item.label ?? item.value ?? item.optionValue ?? "").trim(),
  })).filter((item) => item.value);
  const normalizedCurrent = String(currentValue ?? "").trim();
  if (!normalizedCurrent) return normalizedSource;
  return normalizedSource.some((item) => item.value === normalizedCurrent)
    ? normalizedSource
    : [...normalizedSource, { value: normalizedCurrent, label: normalizedCurrent }];
}

function buildAdminOptionLabelMap(options: Array<{ value: string; label: string }>) {
  return new Map(options.map((item) => [item.value, item.label]));
}

function generateMachineIdentifier(label: unknown, prefix: string, existingValues: string[]) {
  const normalizedLabel = String(label || "").trim().toLowerCase();
  const asciiChars = normalizedLabel
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .split("")
    .flatMap((char) => {
      if (/[a-z0-9]/.test(char)) return [char];
      if (char === "_") return ["_"];
      if (/[\u4e00-\u9fa5]/.test(char)) return [`u${char.codePointAt(0)?.toString(16) || ""}`];
      return [];
    })
    .join("_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const base = asciiChars || prefix;
  const safePrefix = prefix.replace(/[^a-z0-9_]/g, "_") || "id";
  const seed = /^[a-z]/.test(base) ? base : `${safePrefix}_${base}`;
  const used = new Set(existingValues.map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (!used.has(seed)) return seed;
  let index = 2;
  while (used.has(`${seed}_${index}`)) {
    index += 1;
  }
  return `${seed}_${index}`;
}

