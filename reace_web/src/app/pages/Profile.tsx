import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import {
  Settings,
  Edit3,
  FileText,
  Star,
  Award,
  BookOpen,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Trash2,
  Clock,
  Heart,
  Eye,
  MessageSquare,
  Users,
  TrendingUp,
  Share2,
  Shield,
  Key,
  Globe,
  Briefcase,
  UploadCloud,
  LoaderCircle,
  Hash,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { openGlobalConfirm, openGlobalPrompt } from "../components/GlobalConfirmPromptDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api } from "../lib/api";
import { formatDateTime, formatRelativeTime } from "../lib/format";
import { profileKeys } from "../lib/query-keys";
import { stripRichContent } from "../lib/rich-content";
import { normalizeAvatarUrl, normalizeImageUrl, parseTags } from "../lib/mappers";
import { useSession } from "../lib/session";
import { useIsMobile } from "../components/ui/use-mobile";

export function Profile() {
  const PAGE_SIZE = 8;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("posts");
  const [mobilePanelTab, setMobilePanelTab] = useState<string | null>(null);
  const [postsPage, setPostsPage] = useState(1);
  const [draftsPage, setDraftsPage] = useState(1);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [followersPage, setFollowersPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [practicePage, setPracticePage] = useState(1);
  const [expLogsPage, setExpLogsPage] = useState(1);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({
    id: null,
    username: "",
    bio: "",
    jobTitle: "",
    location: "",
    website: "",
    avatar: "",
    coverImage: "",
    email: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const { refreshUser } = useSession();
  const overviewQuery = useQuery({
    queryKey: profileKeys.overview(),
    queryFn: () => api.get<any>("/api/users/center/overview", { silent: true }),
    retry: false,
  });
  const overview = overviewQuery.data;
  const userId = overview?.user?.id;

  const postsQuery = useQuery({
    queryKey: profileKeys.tab(`posts-${postsPage}`),
    enabled: activeTab === "posts" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/users/center/posts?bucket=published&page=${postsPage}&limit=${PAGE_SIZE}`, { silent: true }),
  });
  const draftsQuery = useQuery({
    queryKey: profileKeys.tab(`drafts-${draftsPage}`),
    enabled: activeTab === "drafts" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/drafts?page=${draftsPage}&size=${PAGE_SIZE}`, { silent: true }),
  });
  const favoritesQuery = useQuery({
    queryKey: profileKeys.tab(`favorites-${favoritesPage}`),
    enabled: activeTab === "favorites" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/users/${userId}/favorites?page=${favoritesPage}&limit=${PAGE_SIZE}`, { silent: true }),
  });
  const followingQuery = useQuery({
    queryKey: profileKeys.tab(`following-${followingPage}`),
    enabled: activeTab === "following" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/users/${userId}/following?page=${followingPage}&limit=${PAGE_SIZE}`, { silent: true }),
  });
  const followersQuery = useQuery({
    queryKey: profileKeys.tab(`followers-${followersPage}`),
    enabled: activeTab === "followers" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/users/${userId}/followers?page=${followersPage}&limit=${PAGE_SIZE}`, { silent: true }),
  });
  const historyQuery = useQuery({
    queryKey: profileKeys.tab(`history-${historyPage}`),
    enabled: activeTab === "history" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/users/${userId}/view-history?page=${historyPage}&limit=${PAGE_SIZE}`, { silent: true }),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const practiceQuery = useQuery({
    queryKey: profileKeys.tab(`practice-${practicePage}`),
    enabled: activeTab === "practice" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/practice/history?page=${practicePage}&size=${PAGE_SIZE}`, { silent: true }),
  });
  const activityQuery = useQuery({
    queryKey: profileKeys.tab("analytics-activity"),
    enabled: activeTab === "analytics" && Boolean(userId),
    queryFn: () => api.get<any>("/api/users/center/activity?limit=20", { silent: true }),
  });
  const expLogsQuery = useQuery({
    queryKey: profileKeys.tab(`analytics-exp-${expLogsPage}`),
    enabled: activeTab === "analytics" && Boolean(userId),
    queryFn: () => api.get<any>(`/api/users/center/exp-logs?page=${expLogsPage}&size=${PAGE_SIZE}`, { silent: true }),
  });

  const myPosts = postsQuery.data?.records || [];
  const draftsList = draftsQuery.data?.records || [];
  const favoritePosts = favoritesQuery.data?.posts || [];
  const followingUsers = followingQuery.data?.users || [];
  const followerUsers = followersQuery.data?.users || [];
  const historyPosts = historyQuery.data?.posts || [];
  const practiceRecords = practiceQuery.data?.records || [];
  const activities = activityQuery.data?.activities || [];
  const expLogs = expLogsQuery.data?.records || [];
  const postsTotal = postsQuery.data?.total || 0;
  const draftsTotal = draftsQuery.data?.total || 0;
  const favoritesTotal = favoritesQuery.data?.total || 0;
  const followingTotal = followingQuery.data?.total || 0;
  const followersTotal = followersQuery.data?.total || 0;
  const historyTotal = historyQuery.data?.total || 0;
  const practiceTotal = practiceQuery.data?.total || practiceRecords.length;
  const expLogsTotal = expLogsQuery.data?.total || expLogs.length;

  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: number) => api.delete(`/api/drafts/${draftId}`),
    onSuccess: async () => {
      toast.success("草稿已永久删除");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.tab("drafts") }),
        queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
      ]);
    },
  });

  const handleDeleteDraft = async (id: number) => {
    await deleteDraftMutation.mutateAsync(id);
  };

  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => api.delete(`/api/posts/${postId}`),
    onSuccess: async () => {
      toast.success("帖子已删除");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.tab("posts") }),
        queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
      ]);
    },
  });

  const handleDeletePost = async (postId: number) => {
    const confirmed = await openGlobalConfirm({
      message: "确认删除这篇帖子？删除后不可恢复。",
      destructive: true,
      confirmLabel: "确认删除",
    });
    if (!confirmed) return;
    await deletePostMutation.mutateAsync(postId);
  };

  useEffect(() => {
    if (overviewQuery.isError) {
      navigate("/auth");
    }
  }, [navigate, overviewQuery.isError]);

  useEffect(() => {
    if (activeTab === "posts") setPostsPage(1);
    if (activeTab === "drafts") setDraftsPage(1);
    if (activeTab === "favorites") setFavoritesPage(1);
    if (activeTab === "following") setFollowingPage(1);
    if (activeTab === "followers") setFollowersPage(1);
    if (activeTab === "history") setHistoryPage(1);
    if (activeTab === "practice") setPracticePage(1);
    if (activeTab === "analytics") setExpLogsPage(1);
  }, [activeTab]);

  const stats = overview?.stats || {};
  const user = overview?.user || {};
  const levelName = overview?.expProgress?.levelName || "新手";
  const roleLabel = user.role === "admin" ? "管理员" : user.role === "moderator" ? "版主" : user.role === "user" ? "用户" : user.role;

  useEffect(() => {
    if (!overview?.user) return;
    setProfileForm({
      id: overview.user.id ?? null,
      username: overview.user.username || "",
      bio: overview.user.bio || "",
      jobTitle: overview.user.jobTitle || "",
      location: overview.user.location || "",
      website: overview.user.website || "",
      avatar: overview.user.avatar || "",
      coverImage: overview.user.coverImage || "",
      email: overview.user.email || "",
    });
    setSkills((overview.user.expertise || "").split(",").map((item: string) => item.trim()).filter(Boolean));
  }, [overview?.user]);

  const handleSaveProfile = async () => {
    if (!profileForm.id) return;
    setIsSavingProfile(true);
    try {
      await api.put(`/api/users/${profileForm.id}`, {
        username: profileForm.username,
        bio: profileForm.bio,
        jobTitle: profileForm.jobTitle,
        location: profileForm.location,
        website: profileForm.website,
        avatar: profileForm.avatar,
        coverImage: profileForm.coverImage,
        expertise: skills,
      });
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: profileKeys.overview() });
      toast.success("资料已更新");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newSkill.trim()) {
      e.preventDefault();
      const normalized = newSkill.trim();
      if (skills.includes(normalized) || skills.length >= 6) return;
      setSkills((prev) => [...prev, normalized]);
      setNewSkill("");
    }
  };

  const handleAvatarUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.post<{ url: string }>("/api/upload", formData);
      setProfileForm((prev: any) => ({ ...prev, avatar: result.url }));
      toast.success("头像上传成功");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.post<{ url: string }>("/api/upload", formData);
      setProfileForm((prev: any) => ({ ...prev, coverImage: result.url }));
      toast.success("背景上传成功");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const renderUserList = (title: string, users: any[], total: number) => (
    <div className="h-full">
      <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[linear-gradient(135deg,rgba(239,246,255,0.9),rgba(248,250,252,0.94))]">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-sky-500" />{title}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">查看与你建立连接的社区成员。</p>
        </div>
        <span className="text-sm font-medium text-slate-500">共 {total} 人</span>
      </div>
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-6 md:p-8 space-y-4">
      {users.map((item: any) => (
        <div key={item.id} onClick={() => navigate(`/user/${item.id}`)} className="group flex items-center gap-4 rounded-[26px] border border-white/80 bg-white/95 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_44px_rgba(59,130,246,0.12)] cursor-pointer">
          <img src={normalizeAvatarUrl(item.avatar, item.username)} className="h-14 w-14 rounded-2xl object-cover border border-white shadow-sm" />
          <div className="flex-1">
            <div className="font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{item.username}</div>
            <div className="mt-1 text-sm text-slate-400">Lv.{item.level || 1}</div>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">查看主页</div>
        </div>
      ))}
      {users.length === 0 && <div className="rounded-[26px] border border-dashed border-slate-200 bg-white/80 px-6 py-14 text-center text-sm text-slate-400">暂无数据</div>}
      </div>
    </div>
  );

  const renderPager = (current: number, total: number, onChange: (next: number) => void) => {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-8 py-4">
        <div className="text-xs font-medium text-slate-400">第 {current} / {pages} 页，共 {total} 条</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(1, current - 1))}
            disabled={current <= 1}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            上一页
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.min(pages, current + 1))}
            disabled={current >= pages}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>
    );
  };

  const content = useMemo(() => {
    if (activeTab === "posts") {
      return (
        <motion.div key="posts" initial={{ opacity: 0, y: 15, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(2px)" }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[linear-gradient(135deg,rgba(240,253,250,0.95),rgba(248,250,252,0.92))]">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-teal-500" />我的发帖</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">沉淀你的公开内容、互动表现与标签分布。</p>
            </div>
            <Link to="/create-post" className="text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm">
              <Edit3 size={16} /> 发布新帖
            </Link>
          </div>
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.06),transparent_34%),linear-gradient(180deg,#fcfffe_0%,#f8fafc_100%)] p-5 md:p-6">
            <div className="max-h-[680px] space-y-4 overflow-y-auto pr-1">
            {myPosts.map((post) => (
              <div key={post.id} className="group cursor-pointer rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_18px_42px_rgba(20,184,166,0.1)]" onClick={() => navigate(`/post/${post.id}`)}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 border border-teal-100">{post.category?.name || "未分类"}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500"><Clock size={11} /> {formatRelativeTime(post.createTime)}</span>
                      {post.isTop && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-100">置顶</span>}
                      {post.isEssence && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100">精华</span>}
                    </div>
                    <h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-800 transition-colors group-hover:text-teal-600">{post.title}</h3>
                    <p className="mt-2.5 line-clamp-2 text-[14px] leading-6 text-slate-600">{stripRichContent(post.content || "")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {parseTags(post.tags).slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">#{tag}</span>
                      ))}
                      {parseTags(post.tags).length === 0 && (
                        <span className="rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-400">未设置标签</span>
                      )}
                    </div>
                  </div>
                  <div className="grid shrink-0 grid-cols-3 gap-2 rounded-3xl bg-slate-50/90 p-2.5 lg:min-w-[210px]">
                    <div className="rounded-2xl bg-white px-2.5 py-3 text-center shadow-sm">
                      <div className="flex items-center justify-center text-slate-400"><Eye size={14} /></div>
                      <div className="mt-1.5 text-base font-black text-slate-800">{post.viewCount || 0}</div>
                      <div className="mt-1 text-[10px] font-semibold text-slate-400">浏览</div>
                    </div>
                    <div className="rounded-2xl bg-white px-2.5 py-3 text-center shadow-sm">
                      <div className="flex items-center justify-center text-rose-400"><Heart size={14} /></div>
                      <div className="mt-1.5 text-base font-black text-slate-800">{post.likeCount || 0}</div>
                      <div className="mt-1 text-[10px] font-semibold text-slate-400">点赞</div>
                    </div>
                    <div className="rounded-2xl bg-white px-2.5 py-3 text-center shadow-sm">
                      <div className="flex items-center justify-center text-blue-400"><MessageSquare size={14} /></div>
                      <div className="mt-1.5 text-base font-black text-slate-800">{post.replyCount || 0}</div>
                      <div className="mt-1 text-[10px] font-semibold text-slate-400">回复</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/create-post?post=${post.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <Edit3 size={14} />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeletePost(post.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              </div>
            ))}
            {myPosts.length === 0 && <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/80 px-6 py-16 text-center text-slate-400">暂无已发布帖子</div>}
            </div>
          </div>
          {renderPager(postsPage, postsTotal, setPostsPage)}
        </motion.div>
      );
    }

    if (activeTab === "drafts") {
      return (
        <motion.div key="drafts" initial={{ opacity: 0, y: 15, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(2px)" }} transition={{ type: "spring", stiffness: 350, damping: 30 }} className="flex flex-col h-full">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(255,255,255,0.94))] sticky top-0 z-10 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Edit3 size={20} className="text-slate-800" strokeWidth={2} />草稿箱</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">继续打磨尚未发布的想法，避免内容流失。</p>
            </div>
            <span className="text-sm font-medium text-slate-500">共 {draftsList.length} 篇</span>
          </div>
          <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">全部草稿</div>
                <div className="mt-2 text-3xl font-black text-slate-800">{stats.draftCount || 0}</div>
              </div>
              <div className="rounded-2xl border border-blue-100/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600/80">编辑中</div>
                <div className="mt-2 text-3xl font-black text-slate-800">{stats.editingDraftCount || 0}</div>
              </div>
              <div className="rounded-2xl border border-amber-100/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600/80">即将过期</div>
                <div className="mt-2 text-3xl font-black text-slate-800">{stats.expiringDraftCount || 0}</div>
              </div>
            </div>
            <div className="mt-5 max-h-[560px] space-y-5 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {draftsList.length > 0 ? draftsList.map((draft, idx) => (
                <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }} transition={{ delay: idx * 0.05 }} key={draft.id} className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-slate-900 transition-colors cursor-pointer line-clamp-1 pr-4">{draft.title || "未命名草稿"}</h3>
                    <span className="shrink-0 rounded-full border border-slate-200/80 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{draft.status || "editing"}</span>
                  </div>
                  <p className="text-slate-500 text-[14px] leading-relaxed mb-5 line-clamp-2">{stripRichContent(draft.content || "") || "暂无正文内容..."}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-[13px] font-medium text-slate-400">
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Clock size={14} strokeWidth={1.5} /> 保存于 {formatRelativeTime(draft.updateTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/create-post?draft=${draft.id}`} className="px-4 py-2 text-[13px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5">
                        <Edit3 size={14} strokeWidth={2} /> 继续编辑
                      </Link>
                      <button onClick={() => handleDeleteDraft(draft.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="删除草稿">
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )) : <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-400">草稿箱空空如也</div>}
            </AnimatePresence>
            </div>
          </div>
          {renderPager(draftsPage, draftsTotal, setDraftsPage)}
        </motion.div>
      );
    }

    if (activeTab === "favorites") {
      return (
        <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(255,255,255,0.94))]">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Star size={20} className="text-amber-500" />收藏夹</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">把值得反复回看的内容整理成你的知识书签。</p>
            </div>
            <span className="text-sm font-medium text-slate-500">共 {stats.favoriteCount || 0} 篇</span>
          </div>
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.08),transparent_28%),linear-gradient(180deg,#fffdf7_0%,#ffffff_100%)] p-6 md:p-8">
            <div className="max-h-[680px] space-y-5 overflow-y-auto pr-1">
              {favoritePosts.length ? favoritePosts.map((post) => (
                <div key={post.id} className="group cursor-pointer rounded-[28px] border border-amber-100/80 bg-white/95 p-6 shadow-[0_16px_44px_rgba(120,53,15,0.05)] transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-[0_22px_54px_rgba(245,158,11,0.12)]" onClick={() => navigate(`/post/${post.id}`)}>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-100">已收藏</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{post.category?.name || "未分类"}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"><Clock size={12} /> {formatRelativeTime(post.createTime)}</span>
                      </div>
                      <h3 className="line-clamp-1 text-xl font-black tracking-tight text-slate-800 transition-colors group-hover:text-amber-600">{post.title}</h3>
                      <p className="mt-3 line-clamp-3 text-[15px] leading-7 text-slate-600">{stripRichContent(post.content || "")}</p>
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-3 rounded-3xl bg-amber-50/60 p-3 lg:min-w-[240px]">
                      <div className="rounded-2xl bg-white px-3 py-4 text-center shadow-sm">
                        <div className="flex items-center justify-center text-slate-400"><Eye size={16} /></div>
                        <div className="mt-2 text-lg font-black text-slate-800">{post.viewCount || 0}</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">浏览</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-4 text-center shadow-sm">
                        <div className="flex items-center justify-center text-rose-400"><Heart size={16} /></div>
                        <div className="mt-2 text-lg font-black text-slate-800">{post.likeCount || 0}</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">点赞</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-4 text-center shadow-sm">
                        <div className="flex items-center justify-center text-blue-400"><MessageSquare size={16} /></div>
                        <div className="mt-2 text-lg font-black text-slate-800">{post.replyCount || 0}</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">回复</div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : <div className="rounded-[28px] border border-dashed border-amber-100 bg-white/80 p-10 text-center text-slate-400">暂无收藏</div>}
            </div>
          </div>
          {renderPager(favoritesPage, favoritesTotal, setFavoritesPage)}
        </motion.div>
      );
    }

    if (activeTab === "following") return <motion.div key="following" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{renderUserList("关注列表", followingUsers, followingTotal)}{renderPager(followingPage, followingTotal, setFollowingPage)}</motion.div>;
    if (activeTab === "followers") return <motion.div key="followers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{renderUserList("粉丝列表", followerUsers, followersTotal)}{renderPager(followersPage, followersTotal, setFollowersPage)}</motion.div>;
    if (activeTab === "edit-profile") {
      const inputClass = "w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal";
      const labelClass = "block text-[13px] font-bold text-slate-500 mb-2 tracking-wide";
      return (
        <motion.div key="edit-profile" initial={{ opacity: 0, y: 15, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(2px)" }} transition={{ type: "spring", stiffness: 350, damping: 30 }} className="space-y-8">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit3 size={20} className="text-teal-500" />编辑资料</h2>
                <p className="text-sm text-slate-500 mt-1">在个人中心直接维护主页展示内容。</p>
              </div>
              <button onClick={() => void handleSaveProfile()} disabled={isSavingProfile} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors disabled:opacity-60">
                {isSavingProfile ? "保存中..." : "保存资料"}
              </button>
            </div>
            <div className="px-8 py-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="md:col-span-2"><label className={labelClass}>显示名称</label><input type="text" value={profileForm.username} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, username: e.target.value }))} className={inputClass} /></div>
                <div className="md:col-span-2"><label className={labelClass}>一句话简介</label><textarea rows={3} value={profileForm.bio} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, bio: e.target.value }))} className={`${inputClass} resize-none leading-relaxed`} /></div>
                <div><label className={labelClass}>头衔 / 职位</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Briefcase size={18} className="text-slate-400" strokeWidth={1.5} /></div><input type="text" value={profileForm.jobTitle} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, jobTitle: e.target.value }))} className={`${inputClass} pl-11`} /></div></div>
                <div><label className={labelClass}>所在地</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin size={18} className="text-slate-400" strokeWidth={1.5} /></div><input type="text" value={profileForm.location} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, location: e.target.value }))} className={`${inputClass} pl-11`} /></div></div>
                <div className="md:col-span-2"><label className={labelClass}>个人网站 / 博客</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Globe size={18} className="text-slate-400" strokeWidth={1.5} /></div><input type="url" value={profileForm.website} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, website: e.target.value }))} className={`${inputClass} pl-11`} /></div></div>
                <div className="md:col-span-2"><label className={labelClass}>头像地址</label><input type="text" value={profileForm.avatar} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, avatar: e.target.value }))} className={inputClass} /></div>
                <div className="md:col-span-2"><label className={labelClass}>封面地址</label><input type="text" value={profileForm.coverImage} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, coverImage: e.target.value }))} className={inputClass} /></div>
              </div>
              <section className="rounded-3xl border border-slate-200/60 p-6">
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100"><Hash className="text-slate-800" size={20} strokeWidth={2} /></div><div><h3 className="text-lg font-bold text-slate-800">技能与专长</h3><p className="text-[13px] font-medium text-slate-500 mt-0.5">最多展示 6 项技能标签。</p></div></div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <AnimatePresence>
                    {skills.map((skill) => (
                      <motion.div key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, width: 0, margin: 0, padding: 0 }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[13px] font-bold shadow-sm">
                        {skill}
                        <button onClick={() => setSkills((prev) => prev.filter((item) => item !== skill))} className="hover:bg-white/20 p-0.5 rounded-full transition-colors"><X size={14} strokeWidth={2.5} /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="relative">
                  <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={handleAddSkill} placeholder="输入技能名称后按回车添加..." className={inputClass} disabled={skills.length >= 6} />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <button onClick={() => { if (newSkill.trim() && skills.length < 6 && !skills.includes(newSkill.trim())) { setSkills((prev) => [...prev, newSkill.trim()]); setNewSkill(""); } }} disabled={!newSkill.trim() || skills.length >= 6} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50">
                      <Plus size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </motion.div>
      );
    }
    if (activeTab === "account-settings") {
      const inputClass = "w-full px-4 py-3 bg-slate-100/50 border border-slate-200/60 rounded-xl text-slate-500 cursor-not-allowed font-mono text-[14px]";
      const labelClass = "block text-[13px] font-bold text-slate-500 mb-2 tracking-wide";
      return (
        <motion.div key="account-settings" initial={{ opacity: 0, y: 15, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(2px)" }} transition={{ type: "spring", stiffness: 350, damping: 30 }} className="space-y-8">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield size={20} className="text-teal-500" />账户设置</h2>
                <p className="text-sm text-slate-500 mt-1">在个人中心直接维护账号与安全设置。</p>
              </div>
            </div>
            <div className="px-8 py-8 space-y-6">
              <div><label className={labelClass}>注册邮箱</label><input type="email" value={profileForm.email} disabled className={inputClass} /></div>
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4">
                <button onClick={async () => {
                  const oldPassword = await openGlobalPrompt({ title: "更新密码", label: "当前密码", placeholder: "请输入当前密码", inputType: "password", required: true });
                  if (!oldPassword) return;
                  const newPassword = await openGlobalPrompt({ title: "更新密码", label: "新密码", placeholder: "请输入新密码", inputType: "password", required: true });
                  if (!newPassword) return;
                  await api.put("/api/auth/password", { oldPassword, newPassword });
                  toast.success("密码修改成功");
                }} className="px-5 py-2 bg-white border border-slate-200 hover:border-slate-800 text-slate-800 font-bold rounded-xl transition-colors text-[13px] shadow-sm flex items-center gap-2">
                  <Key size={16} /> 更新密码
                </button>
                <button onClick={async () => {
                  const newEmail = await openGlobalPrompt({ title: "修改邮箱", label: "新邮箱地址", placeholder: "请输入新邮箱", required: true });
                  if (!newEmail) return;
                  const password = await openGlobalPrompt({ title: "修改邮箱", label: "密码确认", placeholder: "请输入密码确认", inputType: "password", required: true });
                  if (!password) return;
                  await api.put("/api/auth/email", { newEmail, password });
                  setProfileForm((prev: any) => ({ ...prev, email: newEmail }));
                  await refreshUser();
                  await queryClient.invalidateQueries({ queryKey: profileKeys.overview() });
                  toast.success("邮箱修改成功");
                }} className="px-5 py-2 bg-white border border-slate-200 hover:border-slate-800 text-slate-800 font-bold rounded-xl transition-colors text-[13px] shadow-sm">
                  修改邮箱
                </button>
              </div>
            </div>
          </section>
        </motion.div>
      );
    }
    if (activeTab === "history") {
      return (
        <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[linear-gradient(135deg,rgba(236,253,245,0.92),rgba(248,250,252,0.94))]">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock size={20} className="text-emerald-500" />浏览历史</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">回看你最近真正读过的帖子内容。</p>
            </div>
            <span className="text-sm font-medium text-slate-500">共 {stats.historyCount || 0} 条</span>
          </div>
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_28%),linear-gradient(180deg,#f7fffb_0%,#ffffff_100%)] p-6 md:p-8">
            <div className="max-h-[680px] space-y-4 overflow-y-auto pr-1">
              {historyPosts.length ? historyPosts.map((post) => (
                <div key={post.id} className="group cursor-pointer rounded-[26px] border border-emerald-100/70 bg-white/95 p-5 shadow-[0_14px_36px_rgba(16,185,129,0.08)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_44px_rgba(16,185,129,0.12)]" onClick={() => navigate(`/post/${post.id}`)}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100">最近浏览</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">{post.category?.name || "未分类"}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500"><Eye size={11} /> {post.viewCount || 0} 浏览</span>
                  </div>
                  <div className="font-black text-lg text-slate-800 group-hover:text-emerald-600 transition-colors">{post.title}</div>
                  <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-slate-600">{stripRichContent(post.content || "")}</p>
                </div>
              )) : <div className="rounded-[26px] border border-dashed border-emerald-100 bg-white/80 p-10 text-center text-slate-400">暂无浏览历史</div>}
            </div>
          </div>
          {renderPager(historyPage, historyTotal, setHistoryPage)}
        </motion.div>
      );
    }
    if (activeTab === "practice") {
      return (
        <motion.div key="practice" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[linear-gradient(135deg,rgba(238,242,255,0.9),rgba(248,250,252,0.94))]">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen size={20} className="text-indigo-500" />刷题记录</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">回顾你的练习成绩和答题进度。</p>
            </div>
            <span className="text-sm font-medium text-slate-500">共 {practiceRecords.length} 条</span>
          </div>
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_28%),linear-gradient(180deg,#f8faff_0%,#ffffff_100%)] p-6 md:p-8">
            <div className="max-h-[680px] space-y-4 overflow-y-auto pr-1">
              {practiceRecords.length ? practiceRecords.map((record) => (
                <div key={record.id} className="group cursor-pointer rounded-[26px] border border-indigo-100/70 bg-white/95 p-5 shadow-[0_14px_36px_rgba(99,102,241,0.08)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_44px_rgba(99,102,241,0.12)]" onClick={() => navigate(`/practice/history/${record.id}`)}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-100">{record.questionCategoryName || record.categoryName || "练习记录"}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">答对 {record.correctCount || 0}/{record.questionCount || 0}</span>
                      </div>
                      <div className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">得分 {record.score || 0}</div>
                    </div>
                    <div className="rounded-2xl bg-indigo-50/70 px-4 py-3 text-center min-w-[110px]">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500/80">正确率</div>
                      <div className="mt-2 text-2xl font-black text-slate-800">
                        {record.questionCount ? Math.round(((record.correctCount || 0) / record.questionCount) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              )) : <div className="rounded-[26px] border border-dashed border-indigo-100 bg-white/80 p-10 text-center text-slate-400">暂无刷题记录</div>}
            </div>
          </div>
          {renderPager(practicePage, practiceTotal, setPracticePage)}
        </motion.div>
      );
    }
    if (activeTab === "analytics") {
      return (
        <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[linear-gradient(180deg,#fbfdff_0%,#ffffff_100%)] p-8 space-y-8">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">最近动态</h3>
            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {activities.length ? activities.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 hover:bg-white hover:border-slate-200 cursor-pointer transition-colors" onClick={() => item.link && navigate(item.link)}>
                  <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                  <div className="text-sm text-slate-500 mb-1">{item.description}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(item.time)}</div>
                </div>
              )) : <div className="text-sm text-slate-400">暂无动态</div>}
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">经验记录</h3>
            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {expLogs.length ? expLogs.map((item) => (
                <div key={item.id} className="rounded-2xl border border-emerald-100/60 bg-emerald-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800">{item.bizLabel || item.bizType}</div>
                    <div className="text-sm font-bold text-emerald-600">+{item.expChange || 0} EXP</div>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{item.reason || "经验变动"}</div>
                  <div className="text-xs text-slate-400 mt-1">{formatDateTime(item.createTime)}</div>
                </div>
              )) : <div className="text-sm text-slate-400">暂无经验记录</div>}
            </div>
            {renderPager(expLogsPage, expLogsTotal, setExpLogsPage)}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div key={activeTab} initial={{ opacity: 0, y: 15, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(2px)" }} transition={{ type: "spring", stiffness: 350, damping: 30 }} className="flex flex-col items-center justify-center py-32 text-slate-400">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6"><Star size={32} className="text-gray-300" /></div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">此模块正在建设中</h3>
        <p className="text-sm">即将推出，敬请期待...</p>
      </motion.div>
    );
  }, [activeTab, activities, draftsList, expLogs, favoritePosts, followerUsers, followingUsers, historyPosts, isSavingProfile, myPosts, navigate, newSkill, practiceRecords, profileForm, queryClient, refreshUser, skills]);

  const mobileEntries = [
    { id: "posts", icon: <FileText size={18} />, label: "我的发帖", count: stats.publishedPosts || 0, tone: "teal" },
    { id: "drafts", icon: <Edit3 size={18} />, label: "草稿箱", count: stats.draftCount || 0, tone: "slate" },
    { id: "favorites", icon: <Star size={18} />, label: "收藏夹", count: stats.favoriteCount || 0, tone: "amber" },
    { id: "following", icon: <Users size={18} />, label: "关注列表", count: stats.followingCount || 0, tone: "sky" },
    { id: "followers", icon: <Heart size={18} />, label: "粉丝列表", count: stats.followerCount || 0, tone: "rose" },
    { id: "history", icon: <Clock size={18} />, label: "浏览历史", count: stats.historyCount || 0, tone: "emerald" },
    { id: "practice", icon: <BookOpen size={18} />, label: "刷题记录", count: practiceTotal || 0, tone: "indigo" },
    { id: "analytics", icon: <TrendingUp size={18} />, label: "能力图谱", count: expLogsTotal || activities.length || 0, tone: "violet" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 pb-20 space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="h-48 md:h-64 w-full bg-cover bg-center relative group" style={{ backgroundImage: `url(${normalizeImageUrl(user.coverImage) || user.avatar || "https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-colors" />
        </div>

        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 -mt-16 sm:-mt-20 relative z-10 gap-4 sm:gap-0">
            <div className="relative group self-start">
              <img src={normalizeAvatarUrl(user.avatar, user.username)} alt={user.username} className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-white shadow-lg object-cover bg-white" />
              <button className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white flex-col gap-1">
                <ImageIcon size={24} />
                <span className="text-xs font-bold">修改头像</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className={`p-2.5 sm:px-5 sm:py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer ${isUploadingCover ? "bg-gray-200 text-slate-500" : "bg-gray-100 hover:bg-gray-200 text-slate-700"}`}>
                {isUploadingCover ? <LoaderCircle size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                <span className="hidden sm:inline">{isUploadingCover ? "上传中..." : "更换背景"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  disabled={isUploadingCover}
                  onChange={(e) => {
                    void handleCoverUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <button onClick={() => setIsAccountSettingsOpen(true)} className="p-2.5 sm:px-5 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center gap-2">
                <Settings size={18} /> <span className="hidden sm:inline">账号设置</span>
              </button>
              <button onClick={() => setIsEditProfileOpen(true)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
                <Edit3 size={16} strokeWidth={2} /> <span>编辑资料</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                {user.username}
                {user.mallBadge?.name && (
                  <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                    {user.mallBadge.name}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] sm:text-xs bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 px-2.5 py-1 rounded-lg font-bold border border-teal-100/50 shadow-sm">
                  <Award size={14} className="text-teal-500" />
                  LV.{user.level || 1} {levelName}
                </span>
                {roleLabel && roleLabel !== "用户" && (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {roleLabel}
                  </span>
                )}
              </h1>
              <p className="text-slate-600 mt-3 max-w-2xl text-[15px] leading-relaxed">{user.bio}</p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 text-sm text-slate-400 font-medium">
                <span className="flex items-center gap-1.5"><MapPin size={16} /> {user.location || "未填写地区"}</span>
                <span className="flex items-center gap-1.5"><Calendar size={16} /> 加入于 {formatDateTime(user.createTime)}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-10 p-5 bg-gray-50/80 rounded-2xl border border-gray-100/50 shrink-0">
              <div className="flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-800">{stats.followingCount || 0}</span><span className="text-[13px] text-slate-500 mt-1 font-medium">关注</span></div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-800">{stats.followerCount || 0}</span><span className="text-[13px] text-slate-500 mt-1 font-medium">粉丝</span></div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-800">{stats.receivedLikeCount || 0}</span><span className="text-[13px] text-slate-500 mt-1 font-medium">获赞</span></div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col items-center justify-center"><span className="text-2xl font-black text-amber-500 flex items-center gap-1">{user.points || 0}</span><span className="text-[13px] text-slate-500 mt-1 font-medium">社区积分</span></div>
            </div>
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">内容与记录</div>
            <div className="grid grid-cols-2 gap-3">
              {mobileEntries.map((entry) => (
                <button
                  key={`mobile-profile-${entry.id}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(entry.id);
                    setMobilePanelTab(entry.id);
                  }}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                      {entry.icon}
                    </div>
                    <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                      {entry.count}
                    </div>
                  </div>
                  <div className="mt-3 text-sm font-bold text-slate-800">{entry.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sticky top-24">
            <div className="p-3 mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">内容管理</h3></div>
            {[
              { id: "posts", icon: <FileText size={18} />, label: "我的发帖", count: stats.publishedPosts || 0 },
              { id: "drafts", icon: <Edit3 size={18} />, label: "草稿箱", count: stats.draftCount || 0 },
              { id: "favorites", icon: <Star size={18} />, label: "收藏夹", count: stats.favoriteCount || 0 },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl transition-all font-medium ${activeTab === tab.id ? "bg-teal-50 text-teal-700 shadow-sm shadow-teal-100/50" : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"}`}>
                <div className="flex items-center gap-3"><div className={activeTab === tab.id ? "text-teal-600" : "text-slate-400"}>{tab.icon}</div>{tab.label}</div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? "bg-teal-100/80 text-teal-700" : "bg-gray-100 text-slate-500"}`}>{tab.count}</span>
              </button>
            ))}
            <div className="h-px bg-gray-100 my-4 mx-4" />
            <div className="p-3 mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">社交与记录</h3></div>
            {[
              { id: "following", icon: <Users size={18} strokeWidth={1.5} />, label: "关注列表", count: stats.followingCount || 0 },
              { id: "followers", icon: <Heart size={18} strokeWidth={1.5} />, label: "粉丝列表", count: stats.followerCount || 0 },
              { id: "history", icon: <Clock size={18} strokeWidth={1.5} />, label: "浏览历史", count: stats.historyCount || 0 },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl transition-all font-medium ${activeTab === tab.id ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"}`}>
                <div className="flex items-center gap-3">
                  <div className={activeTab === tab.id ? "text-slate-800" : "text-slate-400"}>{tab.icon}</div>{tab.label}
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? "bg-slate-200 text-slate-700" : "bg-gray-100 text-slate-500"}`}>{tab.count}</span>
              </button>
            ))}
            <div className="h-px bg-gray-100 my-4 mx-4" />
            <div className="p-3 mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">学习中心</h3></div>
            {[
              { id: "practice", icon: <BookOpen size={18} />, label: "刷题记录" },
              { id: "analytics", icon: <TrendingUp size={18} />, label: "能力图谱" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all font-medium ${activeTab === tab.id ? "bg-teal-50 text-teal-700 shadow-sm shadow-teal-100/50" : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"}`}>
                <div className={activeTab === tab.id ? "text-teal-600" : "text-slate-400"}>{tab.icon}</div>{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px] overflow-hidden">
          <AnimatePresence mode="wait">{content}</AnimatePresence>
        </div>
      </div>
      )}

      <Dialog open={Boolean(isMobile && mobilePanelTab)} onOpenChange={(next) => { if (!next) setMobilePanelTab(null); }}>
        <DialogContent className="w-[min(960px,calc(100vw-1rem))] max-h-[88vh] overflow-y-auto rounded-3xl p-0 sm:max-w-none">
          <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
            <DialogTitle>{mobileEntries.find((item) => item.id === mobilePanelTab)?.label || "查看详情"}</DialogTitle>
            <DialogDescription>在独立界面中查看和管理该模块内容。</DialogDescription>
          </DialogHeader>
          <div className="min-h-0">{mobilePanelTab ? content : null}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑资料</DialogTitle>
            <DialogDescription>在个人中心中单独编辑个人主页内容。</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200/60 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit3 size={20} className="text-teal-500" />编辑资料</h2>
                  <p className="text-sm text-slate-500 mt-1">在个人中心直接维护主页展示内容。</p>
                </div>
                <button onClick={() => void handleSaveProfile()} disabled={isSavingProfile} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors disabled:opacity-60">
                  {isSavingProfile ? "保存中..." : "保存资料"}
                </button>
              </div>
              <div className="px-8 py-8 space-y-8">
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/60 bg-slate-50/40 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={normalizeAvatarUrl(profileForm.avatar, profileForm.username)}
                      alt="头像预览"
                      className="h-20 w-20 rounded-2xl object-cover border border-white shadow-sm bg-white"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-800">当前头像</div>
                      <div className="mt-1 text-xs text-slate-500">支持 PNG、JPG、GIF、WEBP，上传后自动回填头像地址。</div>
                    </div>
                  </div>
                  <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${isUploadingAvatar ? "bg-slate-200 text-slate-500" : "bg-slate-800 text-white hover:bg-slate-900"}`}>
                    {isUploadingAvatar ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {isUploadingAvatar ? "上传中..." : "上传头像"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      disabled={isUploadingAvatar}
                      onChange={(e) => {
                        void handleAvatarUpload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/60 bg-slate-50/40 p-6">
                  <label className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-white bg-slate-100 shadow-sm">
                    <div
                      className="h-36 w-full bg-cover bg-center transition duration-300 group-hover:scale-[1.02]"
                      style={{ backgroundImage: `url(${normalizeImageUrl(profileForm.coverImage) || profileForm.avatar || "https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"})` }}
                    />
                    <div className="absolute inset-0 bg-slate-900/0 transition-colors group-hover:bg-slate-900/20" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent px-5 py-4 text-white">
                      <div>
                        <div className="text-sm font-bold">当前背景</div>
                        <div className="mt-1 text-xs text-white/80">点击图片即可上传，成功后会自动回填封面地址。</div>
                      </div>
                      <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${isUploadingCover ? "bg-white/30 text-white/80" : "bg-white/20 text-white backdrop-blur-sm"}`}>
                        {isUploadingCover ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        {isUploadingCover ? "上传中..." : "上传背景"}
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      disabled={isUploadingCover}
                      onChange={(e) => {
                        void handleCoverUpload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="md:col-span-2"><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">显示名称</label><input type="text" value={profileForm.username} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, username: e.target.value }))} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal" /></div>
                  <div className="md:col-span-2"><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">一句话简介</label><textarea rows={3} value={profileForm.bio} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, bio: e.target.value }))} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal resize-none leading-relaxed" /></div>
                  <div><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">头衔 / 职位</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Briefcase size={18} className="text-slate-400" strokeWidth={1.5} /></div><input type="text" value={profileForm.jobTitle} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, jobTitle: e.target.value }))} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal pl-11" /></div></div>
                  <div><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">所在地</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin size={18} className="text-slate-400" strokeWidth={1.5} /></div><input type="text" value={profileForm.location} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, location: e.target.value }))} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal pl-11" /></div></div>
                  <div className="md:col-span-2"><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">个人网站 / 博客</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Globe size={18} className="text-slate-400" strokeWidth={1.5} /></div><input type="url" value={profileForm.website} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, website: e.target.value }))} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal pl-11" /></div></div>
                  <div className="md:col-span-2"><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">头像地址</label><input type="text" value={profileForm.avatar} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, avatar: e.target.value }))} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal" /></div>
                  <div className="md:col-span-2"><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">封面地址</label><input type="text" value={profileForm.coverImage} onChange={(e) => setProfileForm((prev: any) => ({ ...prev, coverImage: e.target.value }))} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal" /></div>
                </div>
                <section className="rounded-3xl border border-slate-200/60 p-6">
                  <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100"><Hash className="text-slate-800" size={20} strokeWidth={2} /></div><div><h3 className="text-lg font-bold text-slate-800">技能与专长</h3><p className="text-[13px] font-medium text-slate-500 mt-0.5">最多展示 6 项技能标签。</p></div></div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <AnimatePresence>
                      {skills.map((skill) => (
                        <motion.div key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, width: 0, margin: 0, padding: 0 }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[13px] font-bold shadow-sm">
                          {skill}
                          <button onClick={() => setSkills((prev) => prev.filter((item) => item !== skill))} className="hover:bg-white/20 p-0.5 rounded-full transition-colors"><X size={14} strokeWidth={2.5} /></button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={handleAddSkill} placeholder="输入技能名称后按回车添加..." className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 transition-all outline-none text-slate-700 font-medium text-[15px] placeholder:text-slate-400 placeholder:font-normal" disabled={skills.length >= 6} />
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <button onClick={() => { if (newSkill.trim() && skills.length < 6 && !skills.includes(newSkill.trim())) { setSkills((prev) => [...prev, newSkill.trim()]); setNewSkill(""); } }} disabled={!newSkill.trim() || skills.length >= 6} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50">
                        <Plus size={16} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAccountSettingsOpen} onOpenChange={setIsAccountSettingsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>账户设置</DialogTitle>
            <DialogDescription>在个人中心中单独管理邮箱与密码。</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200/60 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield size={20} className="text-teal-500" />账户设置</h2>
                  <p className="text-sm text-slate-500 mt-1">在个人中心直接维护账号与安全设置。</p>
                </div>
              </div>
              <div className="px-8 py-8 space-y-6">
                <div><label className="block text-[13px] font-bold text-slate-500 mb-2 tracking-wide">注册邮箱</label><input type="email" value={profileForm.email} disabled className="w-full px-4 py-3 bg-slate-100/50 border border-slate-200/60 rounded-xl text-slate-500 cursor-not-allowed font-mono text-[14px]" /></div>
                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4">
                  <button onClick={async () => {
                    const oldPassword = await openGlobalPrompt({ title: "更新密码", label: "当前密码", placeholder: "请输入当前密码", inputType: "password", required: true });
                    if (!oldPassword) return;
                    const newPassword = await openGlobalPrompt({ title: "更新密码", label: "新密码", placeholder: "请输入新密码", inputType: "password", required: true });
                    if (!newPassword) return;
                    await api.put("/api/auth/password", { oldPassword, newPassword });
                    toast.success("密码修改成功");
                  }} className="px-5 py-2 bg-white border border-slate-200 hover:border-slate-800 text-slate-800 font-bold rounded-xl transition-colors text-[13px] shadow-sm flex items-center gap-2">
                    <Key size={16} /> 更新密码
                  </button>
                  <button onClick={async () => {
                    const newEmail = await openGlobalPrompt({ title: "修改邮箱", label: "新邮箱地址", placeholder: "请输入新邮箱", required: true });
                    if (!newEmail) return;
                    const password = await openGlobalPrompt({ title: "修改邮箱", label: "密码确认", placeholder: "请输入密码确认", inputType: "password", required: true });
                    if (!password) return;
                    await api.put("/api/auth/email", { newEmail, password });
                    setProfileForm((prev: any) => ({ ...prev, email: newEmail }));
                    await refreshUser();
                    await queryClient.invalidateQueries({ queryKey: profileKeys.overview() });
                    toast.success("邮箱修改成功");
                  }} className="px-5 py-2 bg-white border border-slate-200 hover:border-slate-800 text-slate-800 font-bold rounded-xl transition-colors text-[13px] shadow-sm">
                    修改邮箱
                  </button>
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
