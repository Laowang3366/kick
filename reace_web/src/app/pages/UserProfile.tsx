import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import {
  FileText,
  Star,
  Award,
  BookOpen,
  MapPin,
  Calendar,
  Clock,
  Heart,
  Eye,
  MessageSquare,
  TrendingUp,
  Share2,
  UserPlus,
  MessageCircle,
  MoreHorizontal,
  ArrowLeft,
  Users,
  Send,
  Smile,
  Paperclip,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ApiError, api } from "../lib/api";
import { formatDateTime, formatRelativeTime } from "../lib/format";
import { messageKeys, profileKeys, userProfileKeys } from "../lib/query-keys";
import { stripRichContent } from "../lib/rich-content";
import { normalizeAvatarUrl, normalizeImageUrl, parseTags } from "../lib/mappers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useSession } from "../lib/session";

export function UserProfile() {
  const QUICK_EMOJIS = ["😀", "😊", "😂", "😍", "👍", "👏", "🎉", "🙏", "💡", "🔥"];
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("posts");
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const { isAuthenticated } = useSession();
  const profileId = Number(id);
  const profileQuery = useQuery({
    queryKey: userProfileKeys.detail(id || "unknown"),
    enabled: Boolean(id),
    queryFn: () => api.get(`/api/users/${id}`, { auth: false, silent: true }),
    retry: false,
  });
  const overviewQuery = useQuery({
    queryKey: userProfileKeys.overview(id || "unknown"),
    enabled: Boolean(id),
    queryFn: () => api.get(`/api/users/${id}/center-overview`, { auth: false, silent: true }),
    retry: false,
  });
  const followStatusQuery = useQuery({
    queryKey: userProfileKeys.followStatus(id || "unknown"),
    enabled: Boolean(id),
    queryFn: () => api.get(`/api/users/${id}/is-following`, { silent: true }).catch(() => ({ isFollowing: false })),
  });
  const postsQuery = useQuery({
    queryKey: userProfileKeys.tab(id || "unknown", "posts"),
    enabled: Boolean(id) && activeTab === "posts",
    queryFn: () => api.get<any>(`/api/users/${id}/posts?page=1&limit=20`, { auth: false, silent: true }),
  });
  const favoritesQuery = useQuery({
    queryKey: userProfileKeys.tab(id || "unknown", "favorites"),
    enabled: Boolean(id) && activeTab === "favorites",
    queryFn: () => api.get<any>(`/api/users/${id}/favorites?page=1&limit=20`, { auth: false, silent: true }),
  });
  const followingQuery = useQuery({
    queryKey: userProfileKeys.tab(id || "unknown", "following"),
    enabled: Boolean(id) && activeTab === "following",
    queryFn: () => api.get<any>(`/api/users/${id}/following?page=1&limit=20`, { auth: false, silent: true }),
  });
  const followersQuery = useQuery({
    queryKey: userProfileKeys.tab(id || "unknown", "followers"),
    enabled: Boolean(id) && activeTab === "followers",
    queryFn: () => api.get<any>(`/api/users/${id}/followers?page=1&limit=20`, { auth: false, silent: true }),
  });
  const threadQuery = useInfiniteQuery({
    queryKey: messageKeys.thread(profileId || "none"),
    enabled: Boolean(isMessageOpen && profileId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<{ messages: any[]; total: number; current: number; pages: number }>(
      `/api/messages/${profileId}?page=${pageParam}&limit=20`,
      { silent: true }
    ),
    getNextPageParam: (lastPage) => {
      if (!lastPage.current || !lastPage.pages || lastPage.current >= lastPage.pages) {
        return undefined;
      }
      return lastPage.current + 1;
    },
  });

  const profile = profileQuery.data;
  const overview = overviewQuery.data;
  const isFollowing = Boolean((followStatusQuery.data as any)?.isFollowing);
  const posts = postsQuery.data?.posts || [];
  const favorites = favoritesQuery.data?.posts || [];
  const following = followingQuery.data?.users || [];
  const followers = followersQuery.data?.users || [];
  const activeMessages = useMemo(() => {
    if (!profileId) return [];
    return [...(threadQuery.data?.pages || [])]
      .reverse()
      .flatMap((page) => page.messages || []);
  }, [profileId, threadQuery.data]);

  const previewConversationText = (value: string | undefined) => {
    if (!value) return "";
    if (isImageMessage(value)) return "[图片]";
    if (isAttachmentMessage(value)) {
      const attachment = parseAttachmentMessage(value);
      return attachment ? `[附件] ${attachment.name}` : "[附件]";
    }
    return value;
  };

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await api.delete(`/api/users/${id}/follow`);
      } else {
        await api.post(`/api/users/${id}/follow`);
      }
    },
    onSuccess: async () => {
      toast.success(isFollowing ? "已取消关注" : `已关注 ${profile?.username || ""}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userProfileKeys.followStatus(id || "unknown") }),
        queryClient.invalidateQueries({ queryKey: userProfileKeys.overview(id || "unknown") }),
        queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
      ]);
    },
  });

  useEffect(() => {
    if (profileQuery.isError || overviewQuery.isError) {
      navigate("/");
    }
  }, [navigate, overviewQuery.isError, profileQuery.isError]);

  const markReadMutation = useMutation({
    mutationFn: (conversationId: number) => api.put(`/api/messages/${conversationId}/read`, {}, { silent: true }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations() }),
        queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
      ]);
    },
  });

  useEffect(() => {
    if (!isMessageOpen || !profileId || !threadQuery.data) return;
    markReadMutation.mutate(profileId);
  }, [isMessageOpen, profileId, threadQuery.data]);

  const handleFollow = async () => {
    if (!id) return;
    try {
      await followMutation.mutateAsync();
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(id) }),
          queryClient.invalidateQueries({ queryKey: userProfileKeys.overview(id) }),
          queryClient.invalidateQueries({ queryKey: userProfileKeys.followStatus(id) }),
        ]);
        navigate("/");
      }
    }
  };

  const sendMutation = useMutation({
    mutationFn: () => api.post<{ message: any }>("/api/messages", {
      receiverId: profileId,
      content: messageInput.trim(),
    }),
    onSuccess: async () => {
      setMessageInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations() }),
        queryClient.invalidateQueries({ queryKey: messageKeys.thread(profileId || "none") }),
        queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
      ]);
    },
  });

  const handleOpenMessage = () => {
    if (!profileId) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    setIsMessageOpen(true);
  };

  const handleSendMessage = async () => {
    if (!profileId || !messageInput.trim()) return;
    try {
      await sendMutation.mutateAsync();
      toast.success("私信已发送");
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error("对方已关闭私信");
        return;
      }
      throw error;
    }
  };

  const handleUploadAsset = async (files: FileList | null, kind: "image" | "attachment") => {
    const file = files?.[0];
    if (!file || !profileId) return;
    if (kind === "image" && !file.type.startsWith("image/")) {
      return;
    }
    setIsUploadingAsset(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await api.post<{ url: string }>("/api/upload", formData);
      const content = kind === "image"
        ? buildImageMessage(uploadResult.url)
        : buildAttachmentMessage(file.name, uploadResult.url);
      await api.post<{ message: any }>("/api/messages", {
        receiverId: profileId,
        content,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations() }),
        queryClient.invalidateQueries({ queryKey: messageKeys.thread(profileId || "none") }),
        queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
      ]);
      toast.success(kind === "image" ? "图片已发送" : "附件已发送");
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const renderUserList = (users: any[]) => (
    <div className="p-8 space-y-4">
      {users.map((item) => (
        <div key={item.id} onClick={() => navigate(`/user/${item.id}`)} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
          <img src={normalizeAvatarUrl(item.avatar, item.username)} className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1">
            <div className="font-bold text-slate-800">{item.username}</div>
            <div className="text-sm text-slate-400">Lv.{item.level || 1}</div>
          </div>
        </div>
      ))}
      {users.length === 0 && <div className="text-center text-sm text-slate-400">暂无可展示内容</div>}
    </div>
  );

  const user = overview?.user || profile || {};
  const stats = overview?.stats || {};
  const levelName = overview?.expProgress?.levelName || "新手";
  const roleLabel = user.role === "admin" ? "管理员" : user.role === "moderator" ? "版主" : user.role === "user" ? "用户" : user.role;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 pb-20 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-teal-50 hover:shadow-sm transition-all shadow-sm border border-gray-100">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-lg text-slate-800">他人主页</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="h-48 md:h-64 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${normalizeImageUrl(user.coverImage) || user.avatar || "https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>

        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 -mt-16 sm:-mt-20 relative z-10 gap-4 sm:gap-0">
            <div className="relative self-start">
              <img src={normalizeAvatarUrl(user.avatar, user.username)} alt={user.username} className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-white shadow-lg object-cover bg-white" />
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-slate-500 rounded-xl transition-colors"><MoreHorizontal size={20} /></button>
              <button onClick={handleOpenMessage} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center gap-2">
                <MessageCircle size={18} /> <span className="hidden sm:inline">私信</span>
              </button>
              <button onClick={handleFollow} className={`px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 ${isFollowing ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/30"}`}>
                {!isFollowing && <UserPlus size={18} />} <span>{isFollowing ? "已关注" : "关注"}</span>
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
                <span className="flex items-center gap-1 text-[11px] sm:text-xs bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold border border-amber-100/50 shadow-sm">
                  <Award size={14} className="text-amber-500" />
                  LV.{user.level || 1} {levelName}
                </span>
                {roleLabel && roleLabel !== "用户" && (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {roleLabel}
                  </span>
                )}
              </h1>
              <p className="text-slate-600 mt-3 max-w-2xl text-[15px] leading-relaxed">{user.bio || "这个用户还没有填写简介。"}</p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 text-sm text-slate-400 font-medium">
                <span className="flex items-center gap-1.5"><MapPin size={16} /> {user.location || "未公开地区"}</span>
                <span className="flex items-center gap-1.5"><Calendar size={16} /> 加入于 {formatDateTime(user.createTime)}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-10 p-5 bg-gray-50/80 rounded-2xl border border-gray-100/50 shrink-0">
              <div className="flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-800">{stats.followingCount || 0}</span><span className="text-[13px] text-slate-500 mt-1 font-medium">关注</span></div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-800">{stats.followerCount || 0}</span><span className="text-[13px] text-slate-500 mt-1 font-medium">粉丝</span></div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col items-center justify-center"><span className="text-2xl font-black text-slate-800">{stats.receivedLikeCount || 0}</span><span className="text-[13px] text-slate-500 mt-1 font-medium">获赞</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sticky top-24">
            <div className="p-3 mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">TA 的内容</h3></div>
            {[{ id: "posts", icon: <FileText size={18} />, label: "发布的帖子" }, { id: "favorites", icon: <Star size={18} />, label: "收藏夹" }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl transition-all font-medium ${activeTab === tab.id ? "bg-teal-50 text-teal-700 shadow-sm shadow-teal-100/50" : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"}`}>
                <div className="flex items-center gap-3"><div className={activeTab === tab.id ? "text-teal-600" : "text-slate-400"}>{tab.icon}</div>{tab.label}</div>
              </button>
            ))}
            <div className="h-px bg-gray-100 my-4 mx-4" />
            <div className="p-3 mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">社交与记录</h3></div>
            {[{ id: "following", icon: <Users size={18} strokeWidth={1.5} />, label: "关注列表" }, { id: "followers", icon: <Heart size={18} strokeWidth={1.5} />, label: "粉丝列表" }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all font-medium ${activeTab === tab.id ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"}`}>
                <div className={activeTab === tab.id ? "text-slate-800" : "text-slate-400"}>{tab.icon}</div>{tab.label}
              </button>
            ))}
            <div className="h-px bg-gray-100 my-4 mx-4" />
            <div className="p-3 mb-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">TA 的动态</h3></div>
            {[{ id: "practice", icon: <BookOpen size={18} />, label: "刷题记录" }, { id: "analytics", icon: <TrendingUp size={18} />, label: "能力图谱" }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all font-medium ${activeTab === tab.id ? "bg-teal-50 text-teal-700 shadow-sm shadow-teal-100/50" : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"}`}>
                <div className={activeTab === tab.id ? "text-teal-600" : "text-slate-400"}>{tab.icon}</div>{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px] overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "posts" && (
              <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-teal-500" />发布的帖子</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {posts.map((post) => (
                    <div key={post.id} className="p-8 hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2.5 py-1 bg-gray-100 text-slate-600 text-xs font-medium rounded-md">{post.category?.name || "未分类"}</span>
                        <span className="text-sm text-slate-400 flex items-center gap-1.5"><Clock size={14} /> {formatRelativeTime(post.createTime)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors line-clamp-1">{post.title}</h3>
                      <p className="text-slate-600 text-[15px] mb-4 line-clamp-2 leading-relaxed">{stripRichContent(post.content || "")}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {parseTags(post.tags).map((tag) => <span key={tag} className="text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100/50">#{tag}</span>)}
                        </div>
                        <div className="flex items-center gap-5 text-sm font-medium text-slate-400">
                          <span className="flex items-center gap-1.5"><Eye size={16} /> {post.viewCount || 0}</span>
                          <span className="flex items-center gap-1.5"><Heart size={16} /> {post.likeCount || 0}</span>
                          <span className="flex items-center gap-1.5"><MessageSquare size={16} /> {post.replyCount || 0}</span>
                          <button className="p-1.5 -mr-1.5 text-slate-300 hover:text-slate-600 hover:bg-gray-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"><Share2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {posts.length === 0 && <div className="p-10 text-center text-slate-400">暂无公开帖子</div>}
                </div>
              </motion.div>
            )}

            {activeTab === "favorites" && <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{favorites.length ? favorites.map((post) => (
              <div key={post.id} className="p-8 border-b border-gray-100 cursor-pointer hover:bg-gray-50/50" onClick={() => navigate(`/post/${post.id}`)}>
                <div className="font-bold text-slate-800 mb-2">{post.title}</div>
                <div className="text-sm text-slate-400">{post.category?.name || "未分类"}</div>
              </div>
            )) : <div className="p-10 text-center text-slate-400">暂无收藏</div>}</motion.div>}

            {activeTab === "following" && <motion.div key="following" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{renderUserList(following)}</motion.div>}
            {activeTab === "followers" && <motion.div key="followers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{renderUserList(followers)}</motion.div>}

            {!["posts", "favorites", "following", "followers"].includes(activeTab) && (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-32 text-slate-400">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6"><Star size={32} className="text-gray-300" /></div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">此模块尚未公开</h3>
                <p className="text-sm">用户暂时隐藏了该部分内容</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-white">
            <DialogTitle>私信 {user.username}</DialogTitle>
            <DialogDescription>直接在资料页中发起和继续私信会话。</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col bg-white">
            <div className="max-h-[55vh] overflow-y-auto p-6 bg-slate-50/60">
              <div className="space-y-5 flex flex-col">
                {threadQuery.hasNextPage && (
                  <div className="text-center">
                    <button
                      onClick={() => threadQuery.fetchNextPage()}
                      disabled={threadQuery.isFetchingNextPage}
                      className="text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      {threadQuery.isFetchingNextPage ? "加载中..." : "加载更早消息..."}
                    </button>
                  </div>
                )}
                <AnimatePresence>
                  {activeMessages.map((msg, idx) => {
                    const isMe = msg.sender?.id !== profileId;
                    return (
                      <motion.div
                        key={msg.id || `${idx}-${msg.createdAt}`}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25, delay: idx * 0.03 }}
                        className={`flex flex-col max-w-[78%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                      >
                        <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? "bg-teal-500 text-white rounded-tr-sm shadow-teal-500/20" : "bg-white text-slate-700 border border-gray-100 rounded-tl-sm"}`}>
                          <MessageBubbleContent content={msg.content} />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1.5 px-1">{formatRelativeTime(msg.createdAt)}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {!threadQuery.isLoading && activeMessages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center text-sm text-slate-400">
                    暂无私信记录，发第一条消息开始聊天。
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3 px-2">
                <button
                  className="text-slate-400 hover:text-teal-600 transition-colors p-1.5 hover:bg-teal-50 rounded-lg"
                  onClick={() => document.getElementById("profile-message-image-input")?.click()}
                  title="发送图片"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  className="text-slate-400 hover:text-teal-600 transition-colors p-1.5 hover:bg-teal-50 rounded-lg"
                  onClick={() => document.getElementById("profile-message-attachment-input")?.click()}
                  title="发送附件"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  className={`text-slate-400 hover:text-teal-600 transition-colors p-1.5 hover:bg-teal-50 rounded-lg ${showEmojiPicker ? "bg-teal-50 text-teal-600" : ""}`}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  title="插入表情"
                >
                  <Smile size={18} />
                </button>
                <input
                  id="profile-message-image-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadAsset(e.target.files, "image");
                    e.target.value = "";
                  }}
                />
                <input
                  id="profile-message-attachment-input"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp"
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadAsset(e.target.files, "attachment");
                    e.target.value = "";
                  }}
                />
              </div>
              {showEmojiPicker && (
                <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setMessageInput((prev) => `${prev}${emoji}`);
                          setShowEmojiPicker(false);
                        }}
                        className="rounded-xl bg-white px-3 py-2 text-xl transition hover:bg-teal-50"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={`发送给 ${user.username || "对方"}...`}
                  className="flex-1 bg-gray-50 border border-gray-200/80 focus:bg-white focus:border-teal-500 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-teal-500/10 resize-none h-12 min-h-[48px] max-h-32"
                  rows={1}
                />
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={!messageInput.trim() || sendMutation.isPending || isUploadingAsset}
                  className="w-12 h-12 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-all shadow-sm disabled:shadow-none shrink-0"
                >
                  <Send size={18} className={messageInput.trim() ? "translate-x-0.5" : ""} />
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildImageMessage(url: string) {
  return `[[image:${url}]]`;
}

function buildAttachmentMessage(name: string, url: string) {
  return `[[attachment:${name}|${url}]]`;
}

function isImageMessage(value: string) {
  return /^\[\[image:.+\]\]$/.test(value);
}

function parseImageMessage(value: string) {
  const match = value.match(/^\[\[image:(.+)\]\]$/);
  return match ? match[1] : null;
}

function isAttachmentMessage(value: string) {
  return /^\[\[attachment:.+\|.+\]\]$/.test(value);
}

function parseAttachmentMessage(value: string) {
  const match = value.match(/^\[\[attachment:(.+)\|(.+)\]\]$/);
  return match ? { name: match[1], url: match[2] } : null;
}

function MessageBubbleContent({ content }: { content: string }) {
  if (isImageMessage(content)) {
    const imageUrl = parseImageMessage(content);
    return imageUrl ? (
      <img src={normalizeImageUrl(imageUrl)} alt="图片消息" className="max-h-72 rounded-xl object-cover" />
    ) : null;
  }

  if (isAttachmentMessage(content)) {
    const attachment = parseAttachmentMessage(content);
    return attachment ? (
      <a
        href={normalizeImageUrl(attachment.url)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
      >
        <Paperclip size={14} />
        {attachment.name}
      </a>
    ) : null;
  }

  return <span>{content}</span>;
}
