import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  Share2,
  Bookmark,
  Eye,
  Edit3,
  Lock,
  Unlock,
  Clock,
  CheckCircle2,
  Flame,
  Flag,
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  TerminalSquare,
  Sparkles,
  Trash2,
  ChevronDown,
  Smile,
  AtSign,
  ImageIcon,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { openGlobalConfirm, openGlobalPrompt } from "../components/GlobalConfirmPromptDialog";
import { ApiError, api } from "../lib/api";
import { formatDateTime, formatLevelBadge, formatRelativeTime } from "../lib/format";
import { boardKeys, homeKeys, postKeys, profileKeys, userProfileKeys } from "../lib/query-keys";
import { renderRichContent } from "../lib/rich-content";
import { normalizeAvatarUrl, normalizeImageUrl, normalizeResourceUrl, parseAttachments, parseTags } from "../lib/mappers";
import { useSession } from "../lib/session";

export function PostDetail() {
  const REPLIES_PAGE_SIZE = 20;
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [quotedReply, setQuotedReply] = useState<any>(null);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [openReplyMenuId, setOpenReplyMenuId] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [commentFocused, setCommentFocused] = useState(false);
  const [showBottomBar, setShowBottomBar] = useState(false);
  const [bottomComment, setBottomComment] = useState("");
  const [bottomFocused, setBottomFocused] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<Array<{ url: string; name?: string }>>([]);
  const [bottomAttachments, setBottomAttachments] = useState<Array<{ url: string; name?: string }>>([]);
  const [commentRect, setCommentRect] = useState({ left: 0, width: 0 });
  const topCommentRef = useRef<HTMLDivElement>(null);
  const commentCardRef = useRef<HTMLDivElement>(null);

  const postId = Number(id);
  const postQuery = useQuery({
    queryKey: postKeys.detail(postId || "unknown"),
    enabled: Boolean(postId),
    queryFn: async () => {
      const result = await api.get<{ post: any }>(`/api/posts/${postId}`, { silent: true });
      return result.post;
    },
    retry: false,
  });
  const post = postQuery.data;
  const levelRulesQuery = useQuery({
    queryKey: homeKeys.levelRules(),
    queryFn: () => api.get<{ rules: Array<{ level: number; name: string }> }>("/api/public/level-rules", { auth: false, silent: true }),
  });
  const levelNameMap = useMemo(
    () => new Map((levelRulesQuery.data?.rules || []).map((item) => [Number(item.level), item.name])),
    [levelRulesQuery.data?.rules],
  );

  useEffect(() => {
    const el = topCommentRef.current;
    const card = commentCardRef.current;
    if (!el || !card) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowBottomBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px" }
    );
    observer.observe(el);
    const updateRect = () => {
      const rect = card.getBoundingClientRect();
      setCommentRect({ left: rect.left, width: rect.width });
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateRect); };
  }, [postQuery.data]);

  useEffect(() => {
    if (!postQuery.data) return;
    if (window.location.hash === "#comments") {
      setTimeout(() => {
        document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [postQuery.data]);

  const repliesQuery = useInfiniteQuery({
    queryKey: postKeys.replies(postId || "unknown"),
    enabled: Boolean(postId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      return api.get<{ replies: any[]; total: number; totalAll: number }>(
        `/api/posts/${postId}/replies?page=${pageParam}&limit=${REPLIES_PAGE_SIZE}`,
        { auth: false, silent: true }
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((total, page) => total + (page.replies?.length || 0), 0);
      return loadedCount < (lastPage.total || 0) ? allPages.length + 1 : undefined;
    },
  });
  const replies = repliesQuery.data?.pages.flatMap((page) => page.replies || []) || [];
  const repliesTotal = repliesQuery.data?.pages[0]?.totalAll ?? post?.replyCount ?? 0;
  const authorFollowingQuery = useQuery({
    queryKey: postKeys.followStatus(post?.author?.id),
    enabled: Boolean(post?.author?.id && isAuthenticated),
    queryFn: async () => {
      const result = await api.get<{ isFollowing: boolean }>(`/api/users/${post.author.id}/is-following`, { silent: true });
      return Boolean(result.isFollowing);
    },
  });
  const authorFollowing = Boolean(authorFollowingQuery.data);
  const relatedPostsQuery = useQuery({
    queryKey: postKeys.related(post?.category?.id, postId || "unknown"),
    enabled: Boolean(post?.category?.id),
    queryFn: async () => {
      const result = await api.get<any>(`/api/posts?categoryId=${post.category.id}&page=1&limit=4&sort=hot`, { auth: false, silent: true });
      return (result.records || []).filter((item: any) => item.id !== postId);
    },
  });
  const relatedPosts = relatedPostsQuery.data || [];
  const postLikeMutation = useMutation({
    mutationFn: () => api.post<{ isLiked: boolean; likeCount: number }>("/api/likes", {
      targetType: "post",
      targetId: postId,
    }),
    onSuccess: (result) => {
      queryClient.setQueryData(postKeys.detail(postId), (prev: any) =>
        prev ? { ...prev, isLiked: result.isLiked, likeCount: result.likeCount } : prev
      );
    },
  });
  const postFavoriteMutation = useMutation({
    mutationFn: () => api.post<{ isFavorited: boolean; favoriteCount: number }>("/api/favorites", {
      targetId: postId,
    }),
    onSuccess: (result) => {
      queryClient.setQueryData(postKeys.detail(postId), (prev: any) =>
        prev ? { ...prev, isFavorited: result.isFavorited, favoriteCount: result.favoriteCount } : prev
      );
      toast.success(result.isFavorited ? "收藏成功" : "已取消收藏");
    },
  });
  const replyLikeMutation = useMutation({
    mutationFn: (replyId: number) => api.post<{ isLiked: boolean; likeCount: number }>("/api/likes", {
      targetType: "reply",
      targetId: replyId,
    }).then((result) => ({ replyId, result })),
    onSuccess: ({ replyId, result }) => {
      queryClient.setQueryData(postKeys.replies(postId), (prev: any) => updateReplyPages(prev, replyId, (item) => ({
        ...item,
        isLiked: result.isLiked,
        likeCount: result.likeCount,
      })));
    },
  });

  const contentHtml = useMemo(() => renderRichContent(post?.content || ""), [post?.content]);
  const attachments = useMemo(() => parseAttachments(post?.attachments), [post?.attachments]);
  const embeddedAssetUrls = useMemo(() => extractEmbeddedAssetUrls(contentHtml), [contentHtml]);
  const imageAttachments = useMemo(
    () => attachments.filter((item) => isImageAttachment(item.url) && !embeddedAssetUrls.has(normalizeResourceUrl(item.url))),
    [attachments, embeddedAssetUrls]
  );
  const fileAttachments = useMemo(
    () => attachments.filter((item) => !isImageAttachment(item.url)),
    [attachments]
  );
  const canEditPost = useMemo(
    () => Boolean(isAuthenticated && user?.id && post?.author?.id && user.id === post.author.id),
    [isAuthenticated, post?.author?.id, user?.id]
  );
  const canFollowAuthor = useMemo(
    () => Boolean(post?.author?.id && (!user?.id || user.id !== post.author.id)),
    [post?.author?.id, user?.id]
  );
  const canManagePost = useMemo(
    () => Boolean(isAuthenticated && (user?.role === "admin" || user?.role === "moderator")),
    [isAuthenticated, user?.role]
  );

  const canDeleteReply = (reply: any) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "moderator") return true;
    return reply.author?.id === user.id;
  };

  const handleBackToList = () => {
    if (post?.category?.id) {
      navigate(`/board/${post.category.id}`, { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

  if (postQuery.isError) {
    return (
      <div className="min-h-screen bg-[#f8fafc] font-sans flex items-center justify-center pb-20">
        <div className="max-w-md text-center px-6">
          <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200">
            <FileText size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">帖子不存在</h2>
          <p className="text-sm text-slate-500 mb-8">该帖子可能已被删除或您没有访问权限</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(-1)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              返回上页
            </button>
            <button onClick={() => navigate("/")} className="px-5 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
              回到首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    await api.post(`/api/posts/${postId}/share`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      queryClient.invalidateQueries({ queryKey: boardKeys.posts({ categoryId: post?.category?.id, sort: "hot", keyword: "" }) }),
      queryClient.invalidateQueries({ queryKey: profileKeys.tab("posts") }),
    ]);
    toast.success("链接已复制，快去分享给小伙伴吧！");
  };

  const handleReport = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    const reason = await openGlobalPrompt({ title: "举报", label: "举报原因", placeholder: "如 spam、abuse、other", defaultValue: "other", required: true });
    if (!reason) return;
    await api.post("/api/reports", {
      targetType: "post",
      targetId: postId,
      reason,
      description: "",
    });
    toast.info("已收到您的举报，管理员将尽快处理");
  };

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (postLikeMutation.isPending) return;
    await postLikeMutation.mutateAsync();
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (postFavoriteMutation.isPending) return;
    await postFavoriteMutation.mutateAsync();
  };

  const handleFollowAuthor = async () => {
    if (!post?.author?.id) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    try {
      if (authorFollowing) {
        await api.delete(`/api/users/${post.author.id}/follow`);
        toast.success("已取消关注作者");
      } else {
        await api.post(`/api/users/${post.author.id}/follow`);
        toast.success("已关注作者");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: postKeys.followStatus(post.author.id) }),
          queryClient.invalidateQueries({ queryKey: userProfileKeys.followStatus(post.author.id) }),
          queryClient.invalidateQueries({ queryKey: userProfileKeys.detail(post.author.id) }),
          queryClient.invalidateQueries({ queryKey: userProfileKeys.overview(post.author.id) }),
        ]);
      }
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: postKeys.followStatus(post.author.id) }),
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      queryClient.invalidateQueries({ queryKey: userProfileKeys.followStatus(post.author.id) }),
      queryClient.invalidateQueries({ queryKey: userProfileKeys.overview(post.author.id) }),
      queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
    ]);
  };

  const handleTogglePostFlag = async (flag: "lock" | "top" | "essence") => {
    if (!canManagePost) return;
    const result = await api.put<Record<string, boolean>>(`/api/posts/${postId}/${flag}`, {});
    const keyByFlag = {
      lock: "isLocked",
      top: "isTop",
      essence: "isEssence",
    } as const;
    const key = keyByFlag[flag];
    const nextValue = Boolean(result[key]);
    queryClient.setQueryData(postKeys.detail(postId), (prev: any) => prev ? { ...prev, [key]: nextValue } : prev);
    if (flag === "lock" && nextValue) {
      setQuotedReply(null);
    }
    const messageByFlag = {
      lock: nextValue ? "帖子已锁定" : "帖子已解锁",
      top: nextValue ? "帖子已置顶" : "已取消置顶",
      essence: nextValue ? "帖子已设为精华" : "已取消精华",
    };
    toast.success(messageByFlag[flag]);
  };

  const handleSubmitReply = async () => {
    if (post?.isLocked) {
      toast.error("该帖子已锁定，暂不可回复");
      return;
    }
    if (!comment.trim()) {
      toast.error("请输入评论内容");
      return;
    }
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    await api.post("/api/replies", {
      postId,
      content: comment.trim(),
      quotedReplyId: quotedReply?.id || undefined,
      attachments: commentAttachments,
    });
    setComment("");
    setCommentAttachments([]);
    setQuotedReply(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      queryClient.invalidateQueries({ queryKey: postKeys.replies(postId) }),
      queryClient.invalidateQueries({ queryKey: boardKeys.posts({ categoryId: post?.category?.id, sort: "hot", keyword: "" }) }),
      queryClient.invalidateQueries({ queryKey: profileKeys.tab("posts") }),
    ]);
    toast.success("评论发布成功");
  };

  const handleBottomSubmit = async () => {
    if (post?.isLocked) { toast.error("该帖子已锁定，暂不可回复"); return; }
    if (!bottomComment.trim()) return;
    if (!isAuthenticated) { navigate("/auth"); return; }
    await api.post("/api/replies", { postId, content: bottomComment.trim(), attachments: bottomAttachments });
    setBottomComment("");
    setBottomAttachments([]);
    setBottomFocused(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      queryClient.invalidateQueries({ queryKey: postKeys.replies(postId) }),
      queryClient.invalidateQueries({ queryKey: boardKeys.posts({ categoryId: post?.category?.id, sort: "hot", keyword: "" }) }),
      queryClient.invalidateQueries({ queryKey: profileKeys.tab("posts") }),
    ]);
    toast.success("评论发布成功");
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!await openGlobalConfirm({ message: "确认删除这条回复？" })) return;
    await api.delete(`/api/replies/${replyId}`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      queryClient.invalidateQueries({ queryKey: postKeys.replies(postId) }),
      queryClient.invalidateQueries({ queryKey: boardKeys.posts({ categoryId: post?.category?.id, sort: "hot", keyword: "" }) }),
    ]);
    toast.success("回复已删除");
  };

  const handleDeletePost = async () => {
    if (!await openGlobalConfirm({ message: "确认删除此帖子？删除后不可恢复。", destructive: true, confirmLabel: "确认删除" })) return;
    await api.delete(`/api/posts/${postId}`);
    toast.success("帖子已删除");
    navigate("/");
  };

  const handleReportReply = async (replyId: number) => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    const reason = await openGlobalPrompt({ title: "举报", label: "举报原因", placeholder: "如 spam、abuse、other", defaultValue: "other", required: true });
    if (!reason) return;
    await api.post("/api/reports", {
      targetType: "reply",
      targetId: replyId,
      reason,
      description: "",
    });
    toast.info("已收到您的举报，管理员将尽快处理");
  };

  const uploadReplyAttachment = async (file: File, mode: "top" | "bottom") => {
    const lowerName = file.name.toLowerCase();
    if (!(lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls"))) {
      toast.error("评论附件仅支持 Excel 文件");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("评论附件大小不能超过 20MB");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    const uploadResult = await api.post<{ url: string }>("/api/upload?scene=reply_attachment", formData);
    const nextItem = { url: uploadResult.url, name: file.name };
    if (mode === "top") {
      setCommentAttachments((prev) => [...prev, nextItem]);
    } else {
      setBottomAttachments((prev) => [...prev, nextItem]);
    }
    toast.success("附件上传成功");
  };

  const countDescendants = (children: any[]): number => {
    let count = 0;
    for (const child of children) {
      count += 1;
      if (child.children?.length) {
        count += countDescendants(child.children);
      }
    }
    return count;
  };

  const flattenDescendants = (children: any[]): any[] => {
    const result: any[] = [];
    for (const child of children) {
      result.push(child);
      if (child.children?.length) {
        result.push(...flattenDescendants(child.children));
      }
    }
    return result;
  };

  const renderReply = (reply: any, nested = false, parentReplyId?: number): React.ReactNode => (
    <div key={reply.id} className={`flex gap-4 ${nested ? "py-3" : "pb-8 border-b border-slate-100 last:border-0 last:pb-0"}`}>
      <img
        src={normalizeAvatarUrl(reply.author?.avatar, reply.author?.username)}
        alt={reply.author?.username || "User"}
        onClick={() => navigate(`/user/${reply.author?.id}`)}
        className={`${nested ? "w-8 h-8" : "w-10 h-10"} rounded-full object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity border border-slate-100 shrink-0`}
      />
      <div className="flex-1 min-w-0">
        <div className="group/reply">
        <div className="flex items-center gap-2 mb-1">
          <span
            onClick={() => navigate(`/user/${reply.author?.id}`)}
            className="font-bold text-[15px] text-slate-800 cursor-pointer hover:underline"
          >
            {reply.author?.username || "匿名用户"}
          </span>
          {reply.author?.mallBadge?.name && (
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-sky-100 to-cyan-50 text-sky-700 text-[10px] font-bold rounded border border-sky-200/60">
              {reply.author.mallBadge.name}
            </span>
          )}
          <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-200/50">
            {formatDynamicLevelBadge(reply.author?.level, levelNameMap)}
          </span>
          {reply.author?.role && reply.author.role !== "user" && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200/60">
              {formatRoleLabel(reply.author.role)}
            </span>
          )}
        </div>
        <div className="relative">
          <p className="text-[15px] text-slate-700 font-medium leading-[1.7] whitespace-pre-wrap pr-32">
            {reply.quotedReply && nested && reply.quotedReply?.id !== parentReplyId && (
              <>
                回复<span
                  onClick={() => navigate(`/user/${reply.quotedReply.author?.id}`)}
                  className="text-teal-600 font-bold cursor-pointer hover:underline mx-0.5"
                >
                  @{reply.quotedReply.author?.username}
                </span>：
              </>
            )}
            {reply.content}
          </p>
          {parseAttachments(reply.attachments).length > 0 && (
            <div className="mt-3 space-y-2">
              {parseAttachments(reply.attachments).map((item) => (
                <a
                  key={item.url}
                  href={normalizeResourceUrl(item.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal-200 hover:text-teal-600"
                >
                  <span className="truncate">{item.name || item.url}</span>
                  <ChevronRight size={14} />
                </a>
              ))}
            </div>
          )}
          <span className="text-[12px] text-slate-400 font-medium mt-1 block">
            {formatRelativeTime(reply.createTime || reply.createdAt)}
          </span>
          <div className="absolute right-0 top-0 flex items-center gap-3 text-[13px] text-slate-400 opacity-0 group-hover/reply:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              title="点赞"
              onClick={async () => {
                if (!isAuthenticated) { navigate("/auth"); return; }
                if (replyLikeMutation.isPending) return;
                await replyLikeMutation.mutateAsync(reply.id);
              }}
              className="flex items-center gap-1 hover:text-slate-800 transition-colors"
            >
              <ThumbsUp size={14} strokeWidth={2.5} className={`${reply.isLiked ? "fill-current" : ""}`} /> {reply.likeCount || 0}
            </button>
            <button
              title="回复"
              onClick={() => {
                if (post?.isLocked) { toast.info("该帖子已锁定，暂不可回复"); return; }
                setQuotedReply(reply);
              }}
              disabled={Boolean(post?.isLocked)}
              className={`flex items-center gap-1 transition-colors ${post?.isLocked ? "cursor-not-allowed text-slate-300" : "hover:text-slate-800"}`}
            >
              <MessageSquare size={14} strokeWidth={2.5} /> {!nested && reply.children?.length ? countDescendants(reply.children) : ""}
            </button>
            {canDeleteReply(reply) && (
              <button
                title="删除"
                onClick={() => handleDeleteReply(reply.id)}
                className="flex items-center gap-1 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              title="举报"
              onClick={() => handleReportReply(reply.id)}
              className="flex items-center gap-1 hover:text-slate-800 transition-colors"
            >
              <Flag size={14} />
            </button>
          </div>
        </div>
        </div>

        {!nested && reply.children && reply.children.length > 0 && (() => {
          const all = flattenDescendants(reply.children).sort((a: any, b: any) => {
            const la = a.likeCount || 0, lb = b.likeCount || 0;
            if (lb !== la) return lb - la;
            return new Date(a.createTime || a.createdAt).getTime() - new Date(b.createTime || b.createdAt).getTime();
          });
          const expanded = expandedReplies.has(reply.id);
          const visible = expanded ? all : [];
          const remaining = all.length;
          return (
            <div className="border-l-2 border-slate-200 pl-4 space-y-1">
              {visible.map((child: any) => renderReply(child, true, reply.id))}
              {remaining > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedReplies(prev => { const next = new Set(prev); next.has(reply.id) ? next.delete(reply.id) : next.add(reply.id); return next; }); }}
                  className="text-[13px] font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1 mt-2 mb-1"
                >
                  {expanded ? "收起" : `展开更多(${remaining})`}
                </button>
              )}
            </div>
          );
        })()}
        {quotedReply?.id === reply.id && !post?.isLocked && (
          <div className="mt-3 flex gap-3">
            <img src={normalizeAvatarUrl(user?.avatar, user?.username)} alt="Me" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
            <div className="flex-1 relative">
              <div className="mb-2 text-[12px] text-slate-500 flex items-center gap-1">
                回复 @{quotedReply.author?.username}
                <button onClick={() => setQuotedReply(null)} className="text-slate-400 hover:text-slate-600 ml-1">✕</button>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="写下你的回复..."
                autoFocus
                className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 pb-10 text-[14px] font-medium outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-800/5 transition-all resize-none h-24 placeholder:text-slate-400 placeholder:font-normal"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              />
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between" onMouseDown={(e) => e.preventDefault()}>
                <div className="flex items-center gap-1">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); setComment(prev => prev + '😊'); }} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="表情">
                    <Smile size={16} />
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); setComment(prev => prev + '@'); }} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="艾特">
                    <AtSign size={16} />
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); document.getElementById('reply-image-input')?.click(); }} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="图片">
                    <ImageIcon size={16} />
                  </button>
                  <input id="reply-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setComment(prev => prev + `[图片: ${file.name}]`); e.target.value = ''; }
                  }} />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); document.getElementById('reply-attachment-input')?.click(); }} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="附件">
                    <Paperclip size={16} />
                  </button>
                  <input id="reply-attachment-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { void uploadReplyAttachment(file, "top"); e.target.value = ''; }
                  }} />
                </div>
                <button
                  onClick={async () => { await handleSubmitReply(); setQuotedReply(null); }}
                  disabled={!comment.trim()}
                  className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-1.5 rounded-lg font-bold text-[13px] transition-all active:scale-95"
                >
                  回复
                </button>
              </div>
              {commentAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {commentAttachments.map((item) => (
                    <span key={item.url} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      <Paperclip size={12} />
                      <span className="max-w-[180px] truncate">{item.name || item.url}</span>
                      <button type="button" onClick={() => setCommentAttachments((prev) => prev.filter((entry) => entry.url !== item.url))} className="text-slate-400 hover:text-red-500">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!post) {
    return <div className="p-10 text-center text-slate-400">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-24 pt-6 md:pt-10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <div className="hidden lg:flex shrink-0 w-12 sticky top-8 flex-col gap-4">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleBackToList}
              className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all group"
              title="返回"
            >
              <ArrowLeft size={20} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
            </motion.button>
          </div>

          <motion.div className="flex-1 w-full min-w-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.button
              onClick={handleBackToList}
              className="lg:hidden flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors w-fit mb-6 font-bold text-[14px] group"
            >
              <ArrowLeft size={16} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
              返回列表
            </motion.button>

            <motion.article className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden mb-8">
              <div className="px-8 py-10 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-6">
                  {post.isTop && <PostStateBadge tone="amber" icon={<Flame size={12} />} label="置顶" />}
                  {post.isEssence && <PostStateBadge tone="emerald" icon={<CheckCircle2 size={12} />} label="精华" />}
                  {post.isLocked && <PostStateBadge tone="slate" icon={<Lock size={12} />} label="已锁定" />}
                  {parseTags(post.tags).map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-slate-100 text-[13px] text-slate-600 font-bold rounded-md">#{tag}</span>
                  ))}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={normalizeAvatarUrl(post.author?.avatar, post.author?.username)}
                    alt={post.author?.username || "作者"}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                    onClick={() => navigate(`/user/${post.author?.id}`)}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-bold text-[15px] text-slate-800 cursor-pointer hover:text-slate-600 transition-colors"
                        onClick={() => navigate(`/user/${post.author?.id}`)}
                      >
                        {post.author?.username || "匿名用户"}
                      </span>
                      {post.author?.mallBadge?.name && (
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-sky-100 to-cyan-50 text-sky-700 text-[10px] font-bold rounded border border-sky-200/60">
                          {post.author.mallBadge.name}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-200/50">
                        {formatDynamicLevelBadge(post.author?.level, levelNameMap)}
                      </span>
                      {post.author?.role && post.author.role !== "user" && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200/60">
                          {formatRoleLabel(post.author.role)}
                        </span>
                      )}
                      {canFollowAuthor && (
                        <button
                          onClick={handleFollowAuthor}
                          className={`px-3 py-1 text-[12px] font-bold rounded-lg transition-all active:scale-95 ${
                            authorFollowing
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-500"
                              : "bg-teal-500 hover:bg-teal-600 text-white"
                          }`}
                        >
                          {authorFollowing ? "已关注" : "关注"}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[13px] font-bold text-slate-400">
                      <span>{formatDateTime(post.createTime)} 发布</span>
                      <span className="flex items-center gap-1.5"><Eye size={14} strokeWidth={2.5} /> {post.viewCount || 0} 次阅读</span>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    {canManagePost && (
                      <div className="relative">
                        <button
                          onClick={() => setShowManageMenu(!showManageMenu)}
                          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 transition-all"
                        >
                          <MoreHorizontal size={14} />
                          <span className="hidden sm:inline">管理操作</span>
                          <ChevronDown size={12} className={`transition-transform ${showManageMenu ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {showManageMenu && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowManageMenu(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="absolute right-0 mt-2 w-44 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-100 p-1.5 z-20"
                              >
                                <button
                                  onClick={() => { handleTogglePostFlag("lock"); setShowManageMenu(false); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-lg transition-colors ${post.isLocked ? "text-slate-800 bg-slate-50 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                >
                                  {post.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                                  {post.isLocked ? "解锁帖子" : "锁定帖子"}
                                </button>
                                <button
                                  onClick={() => { handleTogglePostFlag("top"); setShowManageMenu(false); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-lg transition-colors ${post.isTop ? "text-amber-700 bg-amber-50 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                >
                                  <Sparkles size={14} />
                                  {post.isTop ? "取消置顶" : "置顶帖子"}
                                </button>
                                <button
                                  onClick={() => { handleTogglePostFlag("essence"); setShowManageMenu(false); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-lg transition-colors ${post.isEssence ? "text-emerald-700 bg-emerald-50 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                >
                                  <CheckCircle2 size={14} />
                                  {post.isEssence ? "取消精华" : "设为精华"}
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  onClick={() => { handleDeletePost(); setShowManageMenu(false); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                  删除帖子
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {canEditPost && (
                      <button
                        onClick={() => navigate(`/create-post?post=${postId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[13px] font-bold rounded-xl border border-slate-200/60 transition-all active:scale-95"
                      >
                        <Edit3 size={14} strokeWidth={2.5} />
                        <span className="hidden sm:inline">编辑帖子</span>
                        <span className="sm:hidden">编辑</span>
                      </button>
                    )}
                  </div>
                </div>

                <h1 className="text-3xl sm:text-[32px] font-extrabold text-slate-800 leading-[1.3] tracking-tight">
                  {post.title}
                </h1>
              </div>

              <div className="px-8 py-10">
                <div className="prose max-w-none text-slate-700 leading-[1.8]">
                  <div
                    className="text-[16px] font-medium leading-[1.9]"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                </div>

                {(imageAttachments.length > 0 || fileAttachments.length > 0) && (
                  <div className="mt-10 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6">
                    <h3 className="text-sm font-extrabold tracking-wide text-slate-700">附件</h3>
                    {imageAttachments.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {imageAttachments.map((item) => (
                          <a
                            key={item.url}
                            href={normalizeResourceUrl(item.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <img
                              src={normalizeImageUrl(item.url)}
                              alt={item.name || "图片附件"}
                              className="h-56 w-full object-contain bg-slate-50 transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            <div className="border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
                              {item.name || "图片附件"}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                    {fileAttachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {fileAttachments.map((item) => (
                          <a
                            key={item.url}
                            href={normalizeResourceUrl(item.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-teal-200 hover:text-teal-600"
                          >
                            <span className="truncate">{item.name || item.url}</span>
                            <ChevronRight size={16} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-14 pt-6 border-t border-slate-100">
                  <button onClick={handleToggleLike} title="点赞" className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold transition-all ${post.isLiked ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <ThumbsUp size={18} strokeWidth={post.isLiked ? 2.5 : 1.5} className={post.isLiked ? "fill-current" : ""} /> {post.likeCount || 0}
                  </button>
                  <button onClick={() => { if (!isAuthenticated) { navigate("/auth"); return; } if (post.isFavorited) { openGlobalConfirm({ message: "确认取消收藏？" }).then((ok) => { if (ok) handleToggleFavorite(); }); return; } handleToggleFavorite(); }} title="收藏" className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold transition-all ${post.isFavorited ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Bookmark size={18} strokeWidth={post.isFavorited ? 2.5 : 1.5} className={post.isFavorited ? "fill-current" : ""} /> {post.favoriteCount || 0}
                  </button>
                  <button onClick={handleShare} title="分享" className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-800 transition-all">
                    <Share2 size={18} strokeWidth={1.5} />
                  </button>
                  <button onClick={handleReport} title="举报" className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-red-500 transition-all">
                    <Flag size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </motion.article>

            <motion.div ref={commentCardRef} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60" id="comments">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-extrabold text-[20px] text-slate-800 flex items-center gap-2">
                  评论区
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[13px] rounded-md font-bold">
                    {repliesTotal}
                  </span>
                </h3>
              </div>

              <div ref={topCommentRef} className="mb-10">
                {post.isLocked ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-500 flex items-center gap-2">
                    <Lock size={16} />
                    该帖子已锁定，暂不可回复
                  </div>
                ) : (
                  <>
                    {quotedReply && (
                      <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
                        <span>回复 @{quotedReply.author?.username}</span>
                        <button onClick={() => setQuotedReply(null)} className="text-slate-400 hover:text-slate-600">取消</button>
                      </div>
                    )}
                    <div className={`flex gap-4 transition-all ${commentFocused ? '' : ''}`}>
                      <img src={normalizeAvatarUrl(user?.avatar, user?.username)} alt="Me" className={`${commentFocused ? 'w-10 h-10' : 'w-8 h-8'} rounded-full object-cover border-2 border-white shadow-sm shrink-0 transition-all`} />
                      <div className="flex-1 relative">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onFocus={() => setCommentFocused(true)}
                          onBlur={() => { if (!comment.trim()) setCommentFocused(false); }}
                          placeholder="写下你的见解，共同探讨..."
                          className={`w-full bg-slate-50/80 border border-slate-200/80 rounded-xl text-[14px] font-medium outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-800/5 transition-all resize-none placeholder:text-slate-400 placeholder:font-normal scrollbar-hide ${commentFocused ? 'p-4 pb-12 h-28' : 'p-2.5 h-10'}`}
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        />
                        {commentFocused && (
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between" onMouseDown={(e) => e.preventDefault()}>
                            <div className="flex items-center gap-2">
                              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); setComment(prev => prev + '😊'); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="表情">
                                <Smile size={18} />
                              </button>
                              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); setComment(prev => prev + '@'); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="艾特">
                                <AtSign size={18} />
                              </button>
                              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); document.getElementById('comment-image-input')?.click(); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="图片">
                                <ImageIcon size={18} />
                              </button>
                              <input id="comment-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { setComment(prev => prev + `[图片: ${file.name}]`); e.target.value = ''; }
                              }} />
                              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); document.getElementById('comment-attachment-input')?.click(); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="附件">
                                <Paperclip size={18} />
                              </button>
                      <input id="comment-attachment-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { void uploadReplyAttachment(file, "top"); e.target.value = ''; }
                              }} />
                            </div>
                            <button
                              onClick={handleSubmitReply}
                              disabled={!comment.trim()}
                              className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-1.5 rounded-lg font-bold text-[13px] transition-all active:scale-95"
                            >
                              发布评论
                            </button>
                          </div>
                        )}
                        {commentAttachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {commentAttachments.map((item) => (
                              <span key={item.url} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                                <Paperclip size={12} />
                                <span className="max-w-[180px] truncate">{item.name || item.url}</span>
                                <button type="button" onClick={() => setCommentAttachments((prev) => prev.filter((entry) => entry.url !== item.url))} className="text-slate-400 hover:text-red-500">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-8">
                {replies.map((reply) => renderReply(reply))}
                {replies.length === 0 && <div className="text-center text-sm text-slate-400 py-10">还没有评论，来抢沙发</div>}
                {repliesQuery.hasNextPage && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => repliesQuery.fetchNextPage()}
                      disabled={repliesQuery.isFetchingNextPage}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {repliesQuery.isFetchingNextPage ? "加载中..." : "加载更多回复"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          <aside className="w-full lg:w-[320px] shrink-0 space-y-6 lg:sticky lg:top-8">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
              <div className="flex items-center gap-4 mb-5 cursor-pointer group" onClick={() => navigate(`/board/${post.category?.id}`)}>
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                  <TerminalSquare size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-[16px] text-slate-800 group-hover:text-slate-600 transition-colors">
                    {post.category?.name || "所属板块"}
                  </h3>
                  <div className="text-[12px] font-bold text-slate-400 mt-1 flex items-center gap-2">
                    <span>{post.favoriteCount || 0} 收藏</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{post.replyCount || 0} 回复</span>
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-6">
                {post.category?.name ? `${post.category.name} 板块的讨论内容` : "查看更多相关讨论"}
              </p>

              <button onClick={() => navigate(`/board/${post.category?.id}`)} className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[14px] font-bold rounded-xl border border-slate-200/60 transition-all active:scale-95 flex items-center justify-center gap-1 group">
                进入板块 <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 hidden lg:block">
              <h3 className="font-extrabold text-[16px] text-slate-800 mb-5 flex items-center gap-2">
                <TrendingUp size={18} />
                相关推荐
              </h3>
              <div className="space-y-4">
                {relatedPosts.map((item, index) => (
                  <div key={item.id} className="group cursor-pointer" onClick={() => navigate(`/post/${item.id}`)}>
                    <h4 className="text-[14px] font-bold text-slate-700 group-hover:text-slate-900 leading-snug mb-1.5 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="text-[12px] font-medium text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1"><ThumbsUp size={12} /> {item.likeCount || 0}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={12} /> {item.replyCount || 0}</span>
                    </div>
                  </div>
                ))}
                {relatedPosts.length === 0 && <div className="text-sm text-slate-400">暂无相关推荐</div>}
              </div>
            </motion.div>
          </aside>
        </div>
      </div>

      {/* 底部悬浮评论栏 - 动态获取顶部评论位置保证对齐 */}
      {showBottomBar && !post.isLocked && createPortal(
        <div className="fixed bottom-0 z-[9999]" style={{ left: commentRect.left, width: commentRect.width }}>
          <div className="bg-white rounded-t-3xl shadow-sm border border-slate-200/60 border-b-0 px-8 py-6">
            <div className="flex gap-3">
              <img src={normalizeAvatarUrl(user?.avatar, user?.username)} alt="Me" className={`${bottomFocused ? 'w-10 h-10' : 'w-8 h-8'} rounded-full object-cover border-2 border-white shadow-sm shrink-0 transition-all`} />
              <div className="flex-1 relative">
                <textarea
                  value={bottomComment}
                  onChange={(e) => setBottomComment(e.target.value)}
                  onFocus={() => setBottomFocused(true)}
                  onBlur={() => { if (!bottomComment.trim()) setBottomFocused(false); }}
                  placeholder="写下你的见解..."
                  className={`w-full bg-slate-50/80 border border-slate-200/80 rounded-xl text-[14px] font-medium outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-800/5 transition-all resize-none placeholder:text-slate-400 placeholder:font-normal scrollbar-hide ${bottomFocused ? 'p-4 pb-12 h-28' : 'p-2.5 h-10'}`}
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                />
                {bottomFocused && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between" onMouseDown={(e) => e.preventDefault()}>
                    <div className="flex items-center gap-2">
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setBottomComment(prev => prev + '\u{1F60A}')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="表情"><Smile size={18} /></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setBottomComment(prev => prev + '@')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="艾特"><AtSign size={18} /></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.getElementById('bottom-img-input')?.click()} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="图片"><ImageIcon size={18} /></button>
                      <input id="bottom-img-input" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBottomComment(prev => prev + `[图片: ${f.name}]`); e.target.value = ''; } }} />
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.getElementById('bottom-attachment-input')?.click()} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="附件"><Paperclip size={18} /></button>
                      <input id="bottom-attachment-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { void uploadReplyAttachment(f, 'bottom'); e.target.value = ''; } }} />
                    </div>
                    <button onClick={handleBottomSubmit} disabled={!bottomComment.trim()} className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-lg font-bold text-[13px] transition-all active:scale-95">
                      发布评论
                    </button>
                  </div>
                )}
                {bottomAttachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bottomAttachments.map((item) => (
                      <span key={item.url} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        <Paperclip size={12} />
                        <span className="max-w-[180px] truncate">{item.name || item.url}</span>
                        <button type="button" onClick={() => setBottomAttachments((prev) => prev.filter((entry) => entry.url !== item.url))} className="text-slate-400 hover:text-red-500">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function formatRoleLabel(value?: string | null) {
  if (value === "admin") return "管理员";
  if (value === "moderator") return "版主";
  if (value === "user") return "用户";
  return value || "";
}

function formatDynamicLevelBadge(level: unknown, levelNameMap: Map<number, string>) {
  const numericLevel = Number(level || 1);
  const levelName = levelNameMap.get(numericLevel);
  return levelName ? `Lv.${numericLevel} ${levelName}` : formatLevelBadge(numericLevel);
}

function updateReplyTree(items: any[], targetId: number, updater: (item: any) => any): any[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return updater(item);
    }
    if (item.children?.length) {
      return { ...item, children: updateReplyTree(item.children, targetId, updater) };
    }
    return item;
  });
}

function updateReplyPages(data: any, targetId: number, updater: (item: any) => any) {
  if (!data?.pages) {
    return data;
  }
  return {
    ...data,
    pages: data.pages.map((page: any) => ({
      ...page,
      replies: updateReplyTree(page.replies || [], targetId, updater),
    })),
  };
}

function PostStateBadge({ tone, icon, label }: { tone: "amber" | "emerald" | "slate"; icon: React.ReactNode; label: string }) {
  const toneClassName = {
    amber: "border-amber-200 bg-amber-100 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[13px] font-black tracking-wide border ${toneClassName}`}>
      {icon}
      {label}
    </span>
  );
}

function isImageAttachment(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

function extractEmbeddedAssetUrls(html: string) {
  const urls = new Set<string>();
  if (!html || typeof DOMParser === "undefined") {
    return urls;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img[src], a[href]").forEach((element) => {
    const value = element.getAttribute("src") || element.getAttribute("href");
    if (value) {
      urls.add(normalizeResourceUrl(value));
    }
  });
  return urls;
}
