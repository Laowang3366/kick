import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import { 
  ArrowLeft,
  Search,
  PenSquare,
  Filter,
  Flame,
  Lock,
  Clock,
  ThumbsUp,
  MessageSquare,
  Eye,
  CheckCircle2,
  BarChart2,
  Code,
  Database,
  LineChart,
  LayoutGrid,
  Calculator,
  PieChart,
  LayoutTemplate,
  HelpCircle,
  FileText
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ApiError, api } from "../lib/api";
import { boardKeys, homeKeys, profileKeys } from "../lib/query-keys";
import { formatLevelBadge, formatRelativeTime } from "../lib/format";
import { stripRichContent } from "../lib/rich-content";
import { normalizeAvatarUrl, normalizeImageUrl, parseTags, toId } from "../lib/mappers";
import { useSession } from "../lib/session";

const iconMap: Record<string, any> = {
  "数据透视表": BarChart2,
  "VBA编程": Code,
  "Power Query": Database,
  "数据分析": LineChart,
  "Excel基础": LayoutGrid,
  "函数公式": Calculator,
  "图表制作": PieChart,
  "模板分享": LayoutTemplate,
  "问答互助": HelpCircle
};

export function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("latest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(defaultBoardFilters());
  const [appliedFilters, setAppliedFilters] = useState(defaultBoardFilters());
  const { isAuthenticated } = useSession();
  const categoryId = toId(id);
  const boardInfoQuery = useQuery({
    queryKey: boardKeys.detail(categoryId || "unknown"),
    enabled: Boolean(categoryId),
    queryFn: () => api.get<any>(`/api/categories/${categoryId}`, { auth: false, silent: true }),
  });
  const boardInfo = boardInfoQuery.data;
  const boardFollowQuery = useQuery({
    queryKey: boardKeys.followStatus(categoryId || "unknown"),
    enabled: Boolean(isAuthenticated && categoryId),
    queryFn: () => api.get<{ isFollowing: boolean }>(`/api/users/category-follows/${categoryId}/status`, { silent: true }),
  });
  const isFollowing = Boolean(boardFollowQuery.data?.isFollowing);
  const levelRulesQuery = useQuery({
    queryKey: homeKeys.levelRules(),
    queryFn: () => api.get<{ rules: Array<{ level: number; name: string }> }>("/api/public/level-rules", { auth: false, silent: true }),
  });
  const levelNameMap = new Map((levelRulesQuery.data?.rules || []).map((item) => [Number(item.level), item.name]));
  const postsQuery = useInfiniteQuery({
    queryKey: boardKeys.posts({
      categoryId,
      sort: activeTab,
      keyword: appliedFilters.keyword.trim(),
      username: appliedFilters.username.trim(),
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate,
    }),
    enabled: Boolean(categoryId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const query = new URLSearchParams({
        categoryId: String(categoryId),
        page: String(pageParam),
        limit: "20",
        sort: activeTab,
      });
      if (appliedFilters.keyword.trim()) query.set("keyword", appliedFilters.keyword.trim());
      if (appliedFilters.username.trim()) query.set("username", appliedFilters.username.trim());
      if (appliedFilters.startDate) query.set("startDate", appliedFilters.startDate);
      if (appliedFilters.endDate) query.set("endDate", appliedFilters.endDate);
      return api.get<any>(`/api/posts?${query.toString()}`, {
        auth: false,
        silent: true,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage.pages || 1;
      return allPages.length < totalPages ? allPages.length + 1 : undefined;
    }
  });
  const posts = postsQuery.data?.pages.flatMap((pageItem) => pageItem.records || []) || [];
  const hasMore = postsQuery.hasNextPage;
  const BoardIcon = iconMap[boardInfo?.name] || LayoutGrid;

  useEffect(() => {
    if (!categoryId) return;
    const nextFilters = defaultBoardFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }, [categoryId]);

  useEffect(() => {
    if (boardInfoQuery.isError) {
      navigate("/");
    }
  }, [boardInfoQuery.isError, navigate]);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await api.delete(`/api/users/category-follows/${categoryId}`);
      } else {
        await api.post(`/api/users/category-follows/${categoryId}`);
      }
    },
    onSuccess: async () => {
      toast.success(isFollowing ? "已取消关注" : `已关注【${boardInfo?.name || ""}】板块`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardKeys.followStatus(categoryId || "unknown") }),
        queryClient.invalidateQueries({ queryKey: boardKeys.detail(categoryId || "unknown") }),
        queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
      ]);
    },
  });

  const handleFollow = async () => {
    if (!categoryId) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    try {
      await followMutation.mutateAsync();
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: boardKeys.detail(categoryId) }),
          queryClient.invalidateQueries({ queryKey: boardKeys.followStatus(categoryId) }),
        ]);
        navigate("/");
      }
    }
  };

  const handleApplyFilters = async () => {
    const nextFilters = {
      keyword: filters.keyword.trim(),
      username: filters.username.trim(),
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    setAppliedFilters(nextFilters);
    setIsFilterOpen(false);
    await queryClient.invalidateQueries({
      queryKey: boardKeys.posts({
        categoryId,
        sort: activeTab,
        keyword: nextFilters.keyword,
        username: nextFilters.username,
        startDate: nextFilters.startDate,
        endDate: nextFilters.endDate,
      }),
    });
    toast.success("筛选条件已更新");
  };

  const handleResetFilters = async () => {
    const nextFilters = defaultBoardFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setIsFilterOpen(false);
    await queryClient.invalidateQueries({
      queryKey: boardKeys.posts({
        categoryId,
        sort: activeTab,
        keyword: "",
        username: "",
        startDate: "",
        endDate: "",
      }),
    });
    toast.success("已重置筛选条件");
  };

  const handleLoadMore = async () => {
    await postsQuery.fetchNextPage();
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 pb-20 space-y-6">
      
      {/* 顶部导航与搜索 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-teal-50 hover:shadow-sm transition-all shadow-sm border border-gray-100 shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleApplyFilters();
                }
              }}
              placeholder={`在 ${boardInfo?.name || "当前"} 版块内搜索...`}
              className="w-full bg-white border border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-full py-2.5 pl-11 pr-4 text-[14px] font-medium outline-none transition-all shadow-sm"
            />
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/create-post')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold shadow-sm shadow-blue-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <PenSquare size={18} /> 发帖讨论
        </button>
      </div>

      {/* 版块信息卡片 */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="h-32 w-full bg-gradient-to-r from-teal-500 to-cyan-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          <BoardIcon className="absolute -bottom-8 -right-4 w-48 h-48 text-white opacity-10" />
        </div>
        
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-12 relative z-10">
            <div className="flex items-end gap-5">
              <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-lg border-4 border-white flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                  <BoardIcon size={40} />
                </div>
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">{boardInfo?.name || "板块详情"}</h1>
                <p className="text-sm font-medium text-slate-500">{boardInfo?.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 pb-1">
              <div className="flex items-center gap-6 px-6 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-black text-slate-800">{boardInfo?.postCount || 0}</div>
                  <div className="text-[11px] font-bold text-slate-400">帖子数</div>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-lg font-black text-slate-800">{boardInfo?.onlineMemberCount || 0}</div>
                  <div className="text-[11px] font-bold text-slate-400">关注者</div>
                </div>
              </div>
              
              <button 
                onClick={handleFollow}
                className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${
                  isFollowing 
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600" 
                    : "bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/30"
                }`}
              >
                {isFollowing ? "已关注" : "关注版块"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* 左侧帖子列表 */}
        <div className="flex-1 space-y-4">
          
          {/* 筛选与排序控制 */}
          <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex p-1 bg-gray-50/80 rounded-xl">
              <button 
                onClick={() => setActiveTab('latest')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all ${
                  activeTab === 'latest' 
                    ? 'bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-gray-100'
                }`}
              >
                <Clock size={16} className={activeTab === 'latest' ? 'text-teal-500' : ''} /> 最新发布
              </button>
              <button 
                onClick={() => setActiveTab('hot')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all ${
                  activeTab === 'hot' 
                    ? 'bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-gray-100'
                }`}
              >
                <Flame size={16} className={activeTab === 'hot' ? 'text-rose-500' : ''} /> 热门讨论
              </button>
            </div>
            
            <button
              onClick={() => setIsFilterOpen(true)}
              className="px-4 py-2.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 mr-2"
            >
              <Filter size={16} /> 筛选
            </button>
          </div>

          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>帖子筛选</DialogTitle>
                <DialogDescription>按关键字、发帖用户和发帖日期筛选当前板块帖子。</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 pt-2">
                <label className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700">关键字</div>
                  <input
                    type="text"
                    value={filters.keyword}
                    onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                    placeholder="标题或正文"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700">发帖用户</div>
                  <input
                    type="text"
                    value={filters.username}
                    onChange={(e) => setFilters((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="按用户名筛选"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-semibold text-slate-700">开始日期</div>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    />
                  </label>
                  <label className="space-y-2">
                    <div className="text-sm font-semibold text-slate-700">结束日期</div>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleResetFilters()}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApplyFilters()}
                    className="rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
                  >
                    应用筛选
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* 帖子列表 */}
          <div className="space-y-4">
            {posts.map((post) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer group hover:shadow-md ${
                  post.isTop ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-white' : 'border-gray-100 hover:border-teal-200'
                }`}
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <img 
                    src={normalizeAvatarUrl(post.author?.avatar, post.author?.username)} 
                    alt={post.author?.username || "User"} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/${post.author?.id}`);
                    }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {post.isTop && (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[11px] font-black tracking-wider flex items-center gap-1 border border-amber-200">
                            <Flame size={12} /> 置顶
                          </span>
                        )}
                      {post.isEssence && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-black tracking-wider flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 size={12} /> 精华
                        </span>
                      )}
                      {post.isLocked && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-black tracking-wider flex items-center gap-1 border border-slate-200">
                          <Lock size={12} /> 已锁定
                        </span>
                      )}
                      {parseTags(post.tags).map(tag => (
                        <span key={tag} className="bg-gray-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-[13px] text-slate-700">{post.author?.username || "匿名用户"}</span>
                        {post.author?.mallBadge?.name && (
                          <span className="px-1.5 py-0.5 bg-gradient-to-r from-sky-100 to-cyan-50 text-sky-700 text-[10px] font-bold rounded border border-sky-200/60">
                            {post.author.mallBadge.name}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-[10px] font-bold rounded flex items-center gap-1 border border-amber-200/50">
                          <CheckCircle2 size={10} className="text-amber-600" />
                          {formatDynamicLevelBadge(post.author?.level, levelNameMap)}
                        </span>
                        {post.author?.role && post.author.role !== "user" && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200/60">
                            {formatRoleLabel(post.author.role)}
                          </span>
                        )}
                        <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5 ml-auto">
                          <Clock size={12} /> {formatRelativeTime(post.createTime)}
                        </span>
                    </div>

                    <h3 className="text-[18px] font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-[14px] text-slate-500 leading-relaxed mb-4 line-clamp-2 pr-4">
                      {stripRichContent(post.content || "")}
                    </p>

                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-5 text-[13px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5"><Eye size={15} /> {post.viewCount || 0}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isAuthenticated) { navigate("/auth"); return; }
                            api.post<{ isLiked: boolean; likeCount: number }>("/api/likes", { targetId: post.id, targetType: "post" }).then((result) => {
                              queryClient.setQueryData(boardKeys.posts({
                                categoryId,
                                sort: activeTab,
                                keyword: appliedFilters.keyword.trim(),
                                username: appliedFilters.username.trim(),
                                startDate: appliedFilters.startDate,
                                endDate: appliedFilters.endDate,
                              }), (old: any) => {
                                if (!old) return old;
                                return {
                                  ...old,
                                  pages: old.pages.map((page: any) => ({
                                    ...page,
                                    records: (page.records || []).map((p: any) =>
                                      p.id === post.id ? { ...p, isLiked: result.isLiked, likeCount: result.likeCount } : p
                                    ),
                                    posts: (page.posts || []).map((p: any) =>
                                      p.id === post.id ? { ...p, isLiked: result.isLiked, likeCount: result.likeCount } : p
                                    ),
                                  })),
                                };
                              });
                              toast.success(result.isLiked ? "点赞成功" : "已取消点赞");
                            });
                          }}
                          className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-rose-500' : 'hover:text-rose-500'}`}
                        >
                          <ThumbsUp size={15} className={post.isLiked ? "fill-current" : ""} /> {post.likeCount || 0}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/post/${post.id}#comments`);
                          }}
                          className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
                        >
                          <MessageSquare size={15} /> {post.replyCount || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {posts.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-slate-400">当前板块暂无帖子</div>}
          </div>
          
          <div className="py-6 flex justify-center">
        {hasMore ? (
          <button
            onClick={handleLoadMore}
            disabled={postsQuery.isFetchingNextPage}
            className="px-6 py-2.5 text-sm font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors disabled:opacity-60"
          >
            {postsQuery.isFetchingNextPage ? "加载中..." : "加载更多帖子..."}
          </button>
            ) : posts.length > 0 ? (
              <span className="text-sm text-slate-400">已经到底了</span>
            ) : null}
          </div>
        </div>

        {/* 右侧边栏：本版块活跃达人 / 推荐板块 */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          
          {/* 发帖规范 */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-teal-600" size={20} />
              <h3 className="font-bold text-[16px] text-slate-800">发帖规范</h3>
            </div>
            <ul className="space-y-3 text-[13px] text-slate-600 font-medium">
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />提问前请先搜索是否有类似问题</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />标题请简明扼要概括核心问题</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />代码请使用代码块格式插入</li>
              <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />友善交流，互相帮助</li>
            </ul>
          </div>

          {/* 活跃达人 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[16px] text-slate-800">本版活跃达人</h3>
              <button className="text-[12px] font-bold text-teal-600 hover:text-teal-700">全部</button>
            </div>
            <div className="space-y-5">
              {(boardInfo?.moderators || []).map((moderator: any) => (
                <div 
                  key={moderator.id} 
                  onClick={() => navigate(`/user/${moderator.id}`)}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <img src={normalizeAvatarUrl(moderator.avatar, moderator.username)} className="w-10 h-10 rounded-full object-cover border border-gray-100 group-hover:border-teal-300 transition-colors" alt="" />
                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{moderator.username}</div>
                    <div className="text-[12px] text-slate-400 font-medium mt-0.5">本版版主</div>
                  </div>
                  <button className="text-[12px] font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors">查看</button>
                </div>
              ))}
              {(!boardInfo?.moderators || boardInfo.moderators.length === 0) && (
                <div className="text-sm text-slate-400">暂无版主展示信息</div>
              )}
            </div>
          </div>
        </div>
      </div>
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

function defaultBoardFilters() {
  return {
    keyword: "",
    username: "",
    startDate: "",
    endDate: "",
  };
}
