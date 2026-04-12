import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Users, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarCheck,
  Gift,
  Award,
  ChevronDown,
  LayoutGrid,
  Code,
  Database,
  LineChart,
  Calculator,
  PieChart,
  LayoutTemplate,
  HelpCircle,
  BarChart2,
  MessageSquare,
  Brain,
  Sparkles,
  ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../lib/api";
import { formatNumber } from "../lib/format";
import { homeKeys } from "../lib/query-keys";
import { normalizeAvatarUrl, normalizeImageUrl } from "../lib/mappers";
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
  "问答互助": HelpCircle,
};

const groupOrder = ["进阶应用", "入门提升", "社区交流"];

function resolveGroupName(category: any) {
  if (category.groupName) return category.groupName;
  if (["数据透视表", "VBA编程", "Power Query", "数据分析"].includes(category.name)) return "进阶应用";
  if (["Excel基础", "函数公式", "图表制作"].includes(category.name)) return "入门提升";
  return "社区交流";
}

export function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const { isAuthenticated, refreshUser } = useSession();
  const homeOverviewQuery = useQuery({
    queryKey: homeKeys.overview(),
    queryFn: async () => {
      const [categories, overview] = await Promise.all([
        api.get<any[]>("/api/categories", { auth: false, silent: true }),
        api.get<any>("/api/public/home-overview", { auth: false, silent: true }),
      ]);
      const grouped = categories.reduce((acc: Record<string, any[]>, category: any) => {
        const groupName = resolveGroupName(category);
        const Icon = iconMap[category.name] || HelpCircle;
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push({
          id: category.id,
          icon: Icon,
          name: category.name,
          desc: category.description,
          posts: category.postCount || 0,
          comments: 0,
        });
        return acc;
      }, {});

      const boardGroups = Object.keys(grouped)
        .sort((left, right) => groupOrder.indexOf(left) - groupOrder.indexOf(right))
        .map((title) => ({
          title,
          count: `${grouped[title].length} 个板块`,
          boards: grouped[title],
        }));

      return {
        boardGroups,
        stats: overview.stats || { userCount: 0, postCount: 0, onlineCount: 0 },
        practiceStats: overview.practiceStats || { questionCount: 0, passRate: 0, activeUserCount: 0 },
        topUsers: overview.topUsers || [],
      };
    },
  });
  const checkinStatusQuery = useQuery({
    queryKey: homeKeys.checkinStatus(),
    enabled: isAuthenticated,
    queryFn: () => api.get<any>("/api/checkin/status", { silent: true }),
  });
  const boardGroups = homeOverviewQuery.data?.boardGroups || [];
  const stats = homeOverviewQuery.data?.stats || { userCount: 0, postCount: 0, onlineCount: 0 };
  const practiceStats = homeOverviewQuery.data?.practiceStats || { questionCount: 0, passRate: 0, activeUserCount: 0 };
  const topUsers = homeOverviewQuery.data?.topUsers || [];
  const checkinStatus = checkinStatusQuery.data;
  const heroSlides = [
    {
      key: "practice",
      eyebrow: "特色功能 01",
      title: "题目练习",
      description: "从随机练习到历史回顾，逐步巩固函数、图表、数据处理等核心能力。",
      accent: "bg-white/16 text-white/95",
      gradient: "from-teal-500 via-emerald-500 to-cyan-500",
      icon: Brain,
      primaryLabel: "开始练习",
      primaryAction: () => navigate("/practice"),
      secondaryLabel: "查看练习记录",
      secondaryAction: () => navigate("/practice/history"),
      highlights: ["随机题目练习", "历史记录追踪", "能力成长闭环"],
    },
    {
      key: "messages",
      eyebrow: "特色功能 02",
      title: "在线聊天",
      description: "通过站内私信与消息沟通，快速跟进讨论、协作答疑和资源分享。",
      accent: "bg-slate-950/18 text-white/95",
      gradient: "from-cyan-500 via-sky-500 to-indigo-500",
      icon: MessageSquare,
      primaryLabel: "进入私信",
      primaryAction: () => navigate("/messages"),
      secondaryLabel: "社区交流板块",
      secondaryAction: () => navigate("/board/9"),
      highlights: ["即时私信沟通", "多媒体消息支持", "讨论协作更集中"],
    },
    {
      key: "tools",
      eyebrow: "特色功能 03",
      title: "实用功能",
      description: "在站内直接完成 Word、Excel、PDF 之间的文件互转，处理归档、打印和二次编辑更高效。",
      accent: "bg-white/12 text-white/92",
      gradient: "from-slate-900 via-cyan-900 to-teal-700",
      icon: ArrowRightLeft,
      primaryLabel: "进入实用功能",
      primaryAction: () => navigate("/tools"),
      secondaryLabel: "查看转换记录",
      secondaryAction: () => navigate("/tools"),
      highlights: ["Word / Excel / PDF 互转", "站内保留转换记录", "一键下载结果文件"],
    },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroSlideIndex((current) => (current + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const checkinMutation = useMutation({
    mutationFn: () => api.post<any>("/api/checkin"),
    onSuccess: async (result) => {
      toast.success(`签到成功！经验 +${result.gainedExp || 0}`, {
        icon: <Award className="text-teal-500" />
      });
      queryClient.setQueryData(homeKeys.checkinStatus(), (prev: any) => ({
        ...(prev || {}),
        hasCheckedInToday: true,
        continuousDays: result.continuousDays || prev?.continuousDays || 1,
        totalDays: result.totalDays || prev?.totalDays || 1,
        totalExp: result.totalExp || prev?.totalExp || 0,
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: homeKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: homeKeys.checkinStatus() }),
      ]);
      setShowCheckIn(false);
      refreshUser().catch(() => undefined);
    },
  });

  const makeupCheckinMutation = useMutation({
    mutationFn: () => api.post<any>("/api/checkin/makeup", {}),
    onSuccess: async (result) => {
      toast.success(`补签成功！已补签 ${result.madeUpDate || ""}`, {
        icon: <Award className="text-teal-500" />
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: homeKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: homeKeys.checkinStatus() }),
      ]);
      refreshUser().catch(() => undefined);
    },
  });

  const handleCheckIn = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    await checkinMutation.mutateAsync();
  };

  const handleMakeupCheckIn = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    await makeupCheckinMutation.mutateAsync();
  };

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const activeHeroStats = heroSlides[heroSlideIndex].key === "practice"
    ? [
        { label: "题目数量", value: formatNumber(practiceStats.questionCount), suffix: "" },
        { label: "通过率", value: formatNumber(practiceStats.passRate), suffix: "%" },
        { label: "正在做题", value: formatNumber(practiceStats.activeUserCount), suffix: "人" },
      ]
    : heroSlides[heroSlideIndex].key === "tools"
      ? [
          { label: "支持格式", value: "3", suffix: "类" },
          { label: "核心场景", value: "6", suffix: "种" },
          { label: "结果留存", value: "12", suffix: "条" },
        ]
      : [
        { label: "注册用户", value: formatNumber(stats.userCount), suffix: "" },
        { label: "累计帖子", value: formatNumber(stats.postCount), suffix: "" },
        { label: "当前在线", value: formatNumber(stats.onlineCount), suffix: "" },
      ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex gap-6 bg-[#f8f9fa] min-h-screen">
      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        
        {/* Hero Carousel */}
        <div className="relative overflow-hidden rounded-[32px] shadow-[0_20px_50px_rgba(13,148,136,0.16)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)] pointer-events-none" />
          <AnimatePresence mode="wait">
            <motion.div
              key={heroSlides[heroSlideIndex].key}
              initial={{ opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
              className={`relative min-h-[320px] bg-gradient-to-br ${heroSlides[heroSlideIndex].gradient} p-8 sm:p-10 text-white`}
            >
              <div className="absolute -top-14 right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-48 w-48 translate-x-12 translate-y-12 rounded-full bg-slate-950/12 blur-3xl" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className={`mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold tracking-[0.18em] ${heroSlides[heroSlideIndex].accent}`}>
                      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                      {heroSlides[heroSlideIndex].eyebrow}
                    </div>
                    <h1 className="max-w-xl text-3xl font-black tracking-tight sm:text-5xl">
                      {heroSlides[heroSlideIndex].title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/88 sm:text-[17px]">
                      {heroSlides[heroSlideIndex].description}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <button
                        onClick={() => heroSlides[heroSlideIndex].primaryAction?.()}
                        disabled={!heroSlides[heroSlideIndex].primaryAction}
                        className="rounded-full bg-white px-7 py-3 text-[15px] font-black text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/70"
                      >
                        {heroSlides[heroSlideIndex].primaryLabel}
                      </button>
                      <button
                        onClick={() => heroSlides[heroSlideIndex].secondaryAction?.()}
                        className="rounded-full border border-white/28 bg-white/8 px-7 py-3 text-[15px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/16"
                      >
                        {heroSlides[heroSlideIndex].secondaryLabel}
                      </button>
                    </div>
                  </div>

                  <div className="flex w-full max-w-[320px] flex-col gap-4 rounded-[28px] border border-white/14 bg-white/10 p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/70">Featured</div>
                        <div className="mt-2 text-xl font-black text-white">{heroSlides[heroSlideIndex].title}</div>
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/14 shadow-inner shadow-white/10">
                        {(() => {
                          const HeroIcon = heroSlides[heroSlideIndex].icon;
                          return <HeroIcon size={26} className="text-white" />;
                        })()}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {heroSlides[heroSlideIndex].highlights.map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-950/12 px-4 py-3 text-[14px] font-semibold text-white/90">
                          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.95)]" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-3 gap-3 sm:max-w-[520px]">
                    {activeHeroStats.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <div className="text-[12px] font-bold tracking-wide text-white/70">{item.label}</div>
                        <div className="mt-2 text-2xl font-black text-white">
                          {item.value}
                          {item.suffix ? <span className="ml-1 text-lg font-extrabold text-white/88">{item.suffix}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {heroSlides.map((slide, index) => (
                        <button
                          key={slide.key}
                          type="button"
                          onClick={() => setHeroSlideIndex(index)}
                          className={`h-2.5 rounded-full transition-all ${index === heroSlideIndex ? "w-9 bg-white" : "w-2.5 bg-white/35 hover:bg-white/55"}`}
                          aria-label={`切换到 ${slide.title}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHeroSlideIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition-colors hover:bg-white/18"
                        aria-label="上一张"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroSlideIndex((current) => (current + 1) % heroSlides.length)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition-colors hover:bg-white/18"
                        aria-label="下一张"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Board Categories Section */}
        <div className="bg-transparent mt-8">
          {/* Section Title */}
          <div className="flex items-center gap-3 mb-8 pl-1">
            <div className="w-[5px] h-6 bg-teal-500 rounded-full"></div>
            <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">板块分类</h2>
          </div>

          {/* Groups */}
          <div className="space-y-8">
            {boardGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-4">
                
                {/* Group Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer group px-2"
                  onClick={() => toggleGroup(group.title)}
                >
                  <div className="flex items-center gap-6">
                    <h3 className="text-[15px] font-extrabold text-blue-600 tracking-wide">{group.title}</h3>
                    <span className="text-[14px] font-bold text-slate-600">{group.count}</span>
                  </div>
                  <div className="p-1.5 rounded-full hover:bg-gray-200/50 transition-colors">
                    <ChevronDown 
                      size={18} 
                      className={`text-slate-400 transition-transform duration-300 ${collapsedGroups.includes(group.title) ? '-rotate-90' : ''}`} 
                    />
                  </div>
                </div>

                {/* Group Boards Grid */}
                <AnimatePresence initial={false}>
                  {!collapsedGroups.includes(group.title) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                        {group.boards.map((board) => (
                          <div 
                            key={board.id}
                            onClick={() => navigate(`/board/${board.id}`)}
                            className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-teal-200 transition-all duration-300 cursor-pointer flex gap-5 group/card"
                          >
                            {/* Icon Box */}
                            <div className="w-[52px] h-[52px] rounded-2xl bg-teal-50/80 flex items-center justify-center shrink-0 group-hover/card:bg-teal-100/80 transition-colors">
                              <board.icon className="text-teal-600" size={24} strokeWidth={2} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className="text-[17px] font-extrabold text-slate-800 mb-1.5 group-hover/card:text-teal-600 transition-colors truncate">
                                {board.name}
                              </h4>
                              <p className="text-[13px] text-slate-500 mb-4 truncate pr-4">
                                {board.desc}
                              </p>
                              
                              {/* Stats */}
                              <div className="flex items-center gap-5 text-[12px] font-medium text-slate-400">
                                <span>{board.posts} <span className="font-normal opacity-80">帖子</span></span>
                                <span>{board.comments} <span className="font-normal opacity-80">讨论</span></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Sidebar */}
      <div className="w-[320px] hidden xl:block space-y-6 shrink-0">
        
        {/* Daily Check-in Button */}
        <div className="bg-[#0aa674] rounded-3xl p-6 pb-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-[180px]">
          <div className="absolute right-2 top-2 opacity-20 pointer-events-none transform rotate-12">
            <CalendarCheck size={100} strokeWidth={2} className="text-white" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <h3 className="text-white font-extrabold text-[22px] tracking-wide flex items-center gap-2">
                  每日签到
                </h3>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-[12px] font-bold text-white/95 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.95)]" />
                  连续 {checkinStatus?.continuousDays || 0} 天
                </div>
              </div>
              <p className="text-white/90 text-[13px] font-medium tracking-wide">
                连续签到可获取额外积分奖励
              </p>
            </div>
            <button 
              onClick={() => setShowCheckIn(true)}
              disabled={Boolean(checkinStatus?.hasCheckedInToday)}
              className="w-full bg-white hover:bg-gray-50 text-[#0aa674] py-3.5 rounded-xl font-bold text-[15px] transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-[#0aa674]/70 disabled:hover:shadow-sm disabled:active:scale-100"
            >
              {checkinStatus?.hasCheckedInToday ? "已签到" : "立即签到 +10积分"}
            </button>
          </div>
        </div>

        {/* Forum Stats */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5 text-slate-800">
            <TrendingUp size={18} className="text-teal-500" />
            <h3 className="font-bold text-[17px] tracking-tight">社区数据</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/80">
              <div className="text-[12px] text-slate-500 mb-1.5 flex items-center gap-1.5 font-medium"><Users size={14} /> 注册用户</div>
            <div className="text-[18px] font-black text-slate-800">{formatNumber(stats.userCount)}</div>
          </div>
          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/80">
            <div className="text-[12px] text-slate-500 mb-1.5 flex items-center gap-1.5 font-medium"><FileText size={14} /> 累计帖子</div>
            <div className="text-[18px] font-black text-slate-800">{formatNumber(stats.postCount)}</div>
          </div>
          <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100/50 col-span-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[14px] font-bold text-teal-800">当前在线</span>
            </div>
              <span className="font-black text-teal-600 text-[20px]">{formatNumber(stats.onlineCount)}</span>
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[17px] text-slate-800 tracking-tight">活跃达人</h3>
            <button className="text-[13px] text-teal-600 font-bold hover:text-teal-700 transition-colors">查看榜单</button>
          </div>
          <div className="space-y-5">
            {topUsers.map((item, index) => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/user/${item.id}`)}
                className="flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="relative">
                  <img src={normalizeAvatarUrl(item.avatar, item.username)} alt="User" className="w-11 h-11 rounded-full border-2 border-transparent group-hover:border-teal-200 transition-all object-cover shadow-sm" />
                  {index < 3 && (
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-300' : 'bg-amber-600'}`}>
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-slate-800 group-hover:text-teal-600 transition-colors mb-0.5">{item.username}</div>
                  <div className="text-[12px] font-medium text-slate-400 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-teal-500" /> 积分 {formatNumber(item.points)}
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full bg-gray-50 text-slate-400 flex items-center justify-center group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
            {topUsers.length === 0 && <div className="text-sm text-slate-400">暂无活跃达人数据</div>}
          </div>
        </div>

      </div>

      {/* Check In Modal */}
      <AnimatePresence>
        {showCheckIn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-teal-50 to-emerald-100 -z-10" />
              <button 
                onClick={() => setShowCheckIn(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors"
              >
                &times;
              </button>
              
              <div className="text-center mt-6">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-md mb-4 border-4 border-teal-50">
                  <Gift size={36} className="text-teal-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">每日签到</h2>
                <p className="text-slate-500 mb-8">今天是你连续签到的第 <span className="text-teal-600 font-bold text-lg">{checkinStatus?.continuousDays || 0}</span> 天</p>

                <div className="mb-5 rounded-2xl bg-slate-50 px-4 py-3 text-left">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700">补签卡剩余</span>
                    <span className="font-black text-teal-600">{checkinStatus?.makeupCardCount || 0} 张</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {checkinStatus?.latestMissedDate
                      ? `最近漏签日：${checkinStatus.latestMissedDate}`
                      : "当前没有可补签的漏签日期"}
                  </div>
                </div>
                
                <button 
                  onClick={handleCheckIn}
                  disabled={Boolean(checkinStatus?.hasCheckedInToday)}
                  className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium text-lg shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5"
                >
                  {checkinStatus?.hasCheckedInToday ? "今日已签到" : "立即签到领取奖励"}
                </button>
                <button
                  onClick={() => {
                    void handleMakeupCheckIn();
                  }}
                  disabled={makeupCheckinMutation.isPending || !checkinStatus?.makeupCardCount || !checkinStatus?.latestMissedDate}
                  className="mt-3 w-full py-3.5 bg-white text-teal-600 rounded-xl border border-teal-200 font-medium text-base transition-all hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {makeupCheckinMutation.isPending
                    ? "补签处理中..."
                    : checkinStatus?.latestMissedDate
                      ? `使用补签卡补签 ${checkinStatus.latestMissedDate}`
                      : "暂无可补签日期"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
