import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Home, 
  MessageSquare, 
  BookOpen, 
  ShoppingBag, 
  Menu,
  Bell, 
  Search,
  User,
  X,
  PenSquare,
  MoreVertical,
  Activity,
  Mail,
  Settings,
  LogOut,
  ChevronDown,
  Lightbulb,
  Wrench,
  Package,
  Award,
  Ticket,
  ArrowRightLeft,
  Gift,
  History,
  Target as TargetIcon,
  ClipboardList,
  FolderKanban
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { getDefaultAdminPath, hasAdminConsoleAccess } from "../admin/config";
import { api } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { normalizeAvatarUrl, normalizeImageUrl } from "../lib/mappers";
import { messageKeys, notificationKeys, profileKeys } from "../lib/query-keys";
import { useSession } from "../lib/session";
import { useIsMobile } from "./ui/use-mobile";
import { ONLINE_LITE_MODE, isLiteAllowedPath } from "../lib/site-mode";

const OPEN_PROPS_EVENT = "excel-open-props-dialog";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [popupNotification, setPopupNotification] = useState<any | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    type: "performance_optimization",
    content: "",
  });
  const notificationRef = useRef<HTMLDivElement>(null);
  const mentionToastIdsRef = useRef<Set<number>>(new Set());
  const mentionBootstrappedRef = useRef(false);
  const popupDismissedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showNotifications]);
  const [searchType, setSearchType] = useState("all");
  const [showSearchTypeDropdown, setShowSearchTypeDropdown] = useState(false);
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<{ posts: any[]; users: any[] }>({ posts: [], users: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user, isAuthenticated, logout } = useSession();
  const canAccessAdmin = hasAdminConsoleAccess(user?.role);
  const forumEnabled = !ONLINE_LITE_MODE;

  useEffect(() => {
    if (!ONLINE_LITE_MODE) return;
    if (location.pathname.startsWith("/admin")) return;
    if (!isLiteAllowedPath(location.pathname)) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setShowSearchTypeDropdown(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sendHeartbeat = async () => {
      try {
        await api.post("/api/users/heartbeat", undefined, { silent: true });
        await queryClient.invalidateQueries({ queryKey: chatKeys.onlineUsers() });
      } catch {
        // ignore background heartbeat failures
      }
    };

    void sendHeartbeat();
    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchSuggestions({ posts: [], users: [] });
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const [postsResult, usersResult] = await Promise.all([
          (searchType === "all" || searchType === "post")
            ? api.get<{ posts: any[] }>(`/api/posts/search?q=${encodeURIComponent(keyword)}&page=1&limit=5`, { auth: false, silent: true })
            : { posts: [] },
          (searchType === "all" || searchType === "user")
            ? api.get<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(keyword)}&page=1&limit=3`, { auth: false, silent: true })
            : { users: [] },
        ]);
        setSearchSuggestions({ posts: postsResult.posts || [], users: usersResult.users || [] });
        setShowSuggestions(true);
      } catch {
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  const notificationsPreviewQuery = useQuery({
    queryKey: notificationKeys.list({ page: 1, limit: 5, scope: "layout" }),
    enabled: isAuthenticated && forumEnabled,
    queryFn: () => api.get<{ notifications: any[] }>("/api/notifications?page=1&limit=5", { silent: true }),
  });
  const mentionNotificationsQuery = useQuery({
    queryKey: notificationKeys.list({ page: 1, limit: 10, type: "MENTION", scope: "mention-popup" }),
    enabled: isAuthenticated && forumEnabled,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: () => api.get<{ notifications: any[] }>("/api/notifications?page=1&limit=10&type=MENTION", { silent: true }),
  });
  const unreadNotificationsQuery = useQuery({
    queryKey: [...notificationKeys.all, "unread-count"] as const,
    enabled: isAuthenticated && forumEnabled,
    queryFn: () => api.get<{ count: number }>("/api/notifications/unread-count", { silent: true }),
  });
  const unreadMessagesQuery = useQuery({
    queryKey: messageKeys.unreadCount(),
    enabled: isAuthenticated && forumEnabled,
    queryFn: () => api.get<{ unreadCount: number }>("/api/messages/unread-count", { silent: true }),
  });
  const popupNotificationsQuery = useQuery({
    queryKey: notificationKeys.list({ page: 1, limit: 20, type: "site_notification", scope: "popup-notification" }),
    enabled: isAuthenticated && forumEnabled,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: () => api.get<{ notifications: any[] }>("/api/notifications?page=1&limit=20&type=site_notification", { silent: true }),
  });
  const notificationItems = notificationsPreviewQuery.data?.notifications || [];
  const mentionNotifications = mentionNotificationsQuery.data?.notifications || [];
  const popupNotifications = popupNotificationsQuery.data?.notifications || [];
  const unreadNotificationCount = unreadNotificationsQuery.data?.count || 0;
  const unreadMessageCount = unreadMessagesQuery.data?.unreadCount || 0;
  const propsQuery = useQuery({
    queryKey: profileKeys.props(),
    enabled: isAuthenticated && propsOpen,
    queryFn: () => api.get<{ records: any[] }>("/api/users/me/props", { silent: true }),
  });
  const propsRecords = propsQuery.data?.records || [];

  useEffect(() => {
    if (!isAuthenticated) {
      mentionToastIdsRef.current.clear();
      mentionBootstrappedRef.current = false;
      popupDismissedIdsRef.current.clear();
      setPopupNotification(null);
      return;
    }

    const unreadMentions = mentionNotifications.filter((item) => !item.isRead);
    if (!mentionBootstrappedRef.current) {
      unreadMentions.forEach((item) => {
        if (typeof item.id === "number") {
          mentionToastIdsRef.current.add(item.id);
        }
      });
      mentionBootstrappedRef.current = true;
      return;
    }

    unreadMentions.forEach((item) => {
      if (typeof item.id !== "number" || mentionToastIdsRef.current.has(item.id)) {
        return;
      }
      mentionToastIdsRef.current.add(item.id);
      toast.info(item.content || "有人提到了你", {
        description: "可在当前页面继续操作，或稍后到通知中心查看详情",
      });
    });
  }, [isAuthenticated, mentionNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (popupNotification) {
      return;
    }

    const nextPopup = popupNotifications.find((item) =>
      item &&
      item.isRead !== 1 &&
      item.announcementType === "popup" &&
      typeof item.id === "number" &&
      !popupDismissedIdsRef.current.has(item.id)
    );

    if (nextPopup) {
      setPopupNotification(nextPopup);
    }
  }, [isAuthenticated, popupNotifications, popupNotification]);

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: () => api.put("/api/notifications/read-all", {}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
      ]);
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: number) => api.put(`/api/notifications/${notificationId}/read`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
  const feedbackMutation = useMutation({
    mutationFn: () => api.post("/api/feedback", feedbackForm),
    onSuccess: () => {
      toast.success("反馈建议已提交");
      setFeedbackOpen(false);
      setFeedbackForm({
        type: "performance_optimization",
        content: "",
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "反馈提交失败");
    },
  });
  const usePropMutation = useMutation({
    mutationFn: (entitlementId: number) => api.post<any>(`/api/users/me/props/${entitlementId}/use`, {}),
    onSuccess: async (result, entitlementId) => {
      toast.success(result?.message || "道具已使用");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.props() }),
        queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
        queryClient.invalidateQueries({ queryKey: ["board"] }),
        queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["home", "checkin-status"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "道具使用失败");
    },
  });
  const unequipPropMutation = useMutation({
    mutationFn: (entitlementId: number) => api.post<any>(`/api/users/me/props/${entitlementId}/unequip`, {}),
    onSuccess: async (result) => {
      toast.success(result?.message || "已取消佩戴");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.props() }),
        queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
        queryClient.invalidateQueries({ queryKey: ["post"] }),
        queryClient.invalidateQueries({ queryKey: ["board"] }),
        queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "取消佩戴失败");
    },
  });

  const resolveNotificationLink = (notification: any) => {
    switch (notification.type) {
      case "follow":
        return notification.senderId ? `/user/${notification.senderId}` : "/notifications";
      case "message":
        return "/messages";
      case "site_notification":
        return notification.relatedId ? `/notification/${notification.relatedId}` : "/notifications";
      default:
        return notification.relatedId ? `/post/${notification.relatedId}` : "/notifications";
    }
  };

  const handleClosePopupNotification = async () => {
    if (!popupNotification?.id) {
      setPopupNotification(null);
      return;
    }
    popupDismissedIdsRef.current.add(popupNotification.id);
    try {
      if (popupNotification.isRead !== 1) {
        await markNotificationReadMutation.mutateAsync(popupNotification.id);
      }
    } finally {
      setPopupNotification(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast("请输入搜索内容");
      return;
    }

    const keyword = searchQuery.trim();
    try {
      if (searchType === "user") {
        const result = await api.get<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(keyword)}&page=1&limit=1`, { silent: true });
        if (result.users?.[0]?.id) {
          navigate(`/user/${result.users[0].id}`);
        } else {
          toast.info("未找到相关用户");
        }
      } else if (searchType === "post") {
        const result = await api.get<{ posts: any[] }>(`/api/posts/search?q=${encodeURIComponent(keyword)}&page=1&limit=1`, { silent: true });
        if (result.posts?.[0]?.id) {
          navigate(`/post/${result.posts[0].id}`);
        } else {
          toast.info("未找到相关帖子");
        }
      } else {
        const [posts, users] = await Promise.all([
          api.get<{ posts: any[] }>(`/api/posts/search?q=${encodeURIComponent(keyword)}&page=1&limit=1`, { silent: true }),
          api.get<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(keyword)}&page=1&limit=1`, { silent: true }),
        ]);
        if (posts.posts?.[0]?.id) {
          navigate(`/post/${posts.posts[0].id}`);
        } else if (users.users?.[0]?.id) {
          navigate(`/user/${users.users[0].id}`);
        } else {
          toast.info("未找到相关内容");
        }
      }
    } finally {
      setSearchQuery("");
    }
  };

  const navItems = ONLINE_LITE_MODE
    ? [
        { name: "首页", path: "/", icon: <Home size={18} strokeWidth={1.5} /> },
        { name: "小试牛刀", path: "/practice", icon: <BookOpen size={18} strokeWidth={1.5} /> },
        { name: "模板中心", path: "/templates", icon: <FolderKanban size={18} strokeWidth={1.5} /> },
        { name: "积分经验中心", path: "/mall", icon: <ShoppingBag size={18} strokeWidth={1.5} /> },
        { name: "实用功能", path: "/tools", icon: <ArrowRightLeft size={18} strokeWidth={1.5} /> },
        { name: "个人中心", path: "/profile", icon: <User size={18} strokeWidth={1.5} /> },
      ]
    : [
        { name: "首页", path: "/", icon: <Home size={18} strokeWidth={1.5} /> },
        { name: "小试牛刀", path: "/practice", icon: <BookOpen size={18} strokeWidth={1.5} /> },
        { name: "模板中心", path: "/templates", icon: <FolderKanban size={18} strokeWidth={1.5} /> },
        { name: "积分经验中心", path: "/mall", icon: <ShoppingBag size={18} strokeWidth={1.5} /> },
        { name: "实用功能", path: "/tools", icon: <ArrowRightLeft size={18} strokeWidth={1.5} /> },
        { name: "个人中心", path: "/profile", icon: <User size={18} strokeWidth={1.5} /> },
      ];
  const activeLiteModule = ONLINE_LITE_MODE
    ? navItems.find((item) => location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(`${item.path}/`))) || navItems[0]
    : null;
  const mobileDrawerNavItems: Array<{ name: string; path: string; icon: React.ReactNode }> = ONLINE_LITE_MODE
    ? [...navItems]
    : [];
  const mobileBottomNavItems = forumEnabled
    ? [
        { key: "home", name: "主页", path: "/", icon: <Home size={18} strokeWidth={1.6} /> },
        { key: "chat", name: "聊天", path: "/chat", icon: <MessageSquare size={18} strokeWidth={1.6} /> },
        { key: "post", name: "发帖", path: "/create-post", icon: <PenSquare size={18} strokeWidth={1.6} /> },
        { key: "search", name: "搜索", path: "", icon: <Search size={18} strokeWidth={1.6} /> },
        { key: "profile", name: "我的", path: isAuthenticated ? "/profile" : "/auth", icon: <User size={18} strokeWidth={1.6} /> },
      ]
    : [
        { key: "practice", name: "练习", path: "/practice", icon: <BookOpen size={18} strokeWidth={1.6} /> },
        { key: "mall", name: "商城", path: "/mall", icon: <ShoppingBag size={18} strokeWidth={1.6} /> },
        { key: "tools", name: "实用", path: "/tools", icon: <ArrowRightLeft size={18} strokeWidth={1.6} /> },
      ];
  const openFeedbackDialog = () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    setFeedbackOpen(true);
  };

  const openPropsDialog = () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    setPropsOpen(true);
  };

  useEffect(() => {
    const handleOpenProps = () => {
      openPropsDialog();
    };
    window.addEventListener(OPEN_PROPS_EVENT, handleOpenProps);
    return () => window.removeEventListener(OPEN_PROPS_EVENT, handleOpenProps);
  });

  const resolvePropIcon = (item: any) => {
    if (item?.key === "checkin_makeup_card") return Ticket;
    if (item?.type === "badge") return Award;
    if (item?.type === "privilege") return Wrench;
    return Package;
  };

  const resolvePropTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      badge: "头衔",
      prop: "道具",
      privilege: "权益",
      coupon: "优惠券",
      virtual: "虚拟物品",
    };
    return map[type] || type || "道具";
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[linear-gradient(180deg,#f5f9fb_0%,#edf3f6_56%,#eef7f3_100%)] text-slate-800 font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.08),transparent_22%)]" />
      {/* Sidebar */}
      <aside
        className="relative z-10 hidden w-72 shrink-0 flex-col border-r border-white/60 bg-white/72 backdrop-blur-2xl md:flex"
      >
        <div className="flex min-h-20 items-center px-6 border-b border-slate-200/60">
          <div className="flex items-center gap-3 text-teal-600">
            <Activity size={24} strokeWidth={2.5} />
            <div>
              <div className="font-black text-lg tracking-tight text-slate-900">Excel社区</div>
              <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400">LITE WORKSPACE</div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6">
          {ONLINE_LITE_MODE ? (
            <div className="space-y-4">
              <div>
                <div className="px-2 text-[11px] font-black tracking-[0.18em] text-slate-400">主导航</div>
                <div className="mt-3 space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(`${item.path}/`));
                    return (
                      <button
                        key={`lite-module-${item.path}`}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                          isActive
                            ? "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                            : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                        }`}
                      >
                        <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 ${
                      isActive
                        ? "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white font-black shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                        : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    }`}
                  >
                    <div className={isActive ? "text-white" : "text-slate-400"}>
                      {item.icon}
                    </div>
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-indicator"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        className="absolute left-2 h-7 w-1 rounded-r-full bg-white/88"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

      </aside>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b border-white/60 bg-white/66 px-4 backdrop-blur-2xl md:px-6">
          
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {isMobile ? (
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 md:hidden"
                    aria-label="打开导航菜单"
                  >
                    <Menu size={18} />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[86vw] max-w-none border-r border-slate-200 bg-white p-0">
                  <SheetHeader className="border-b border-slate-100 px-5 py-5 text-left">
                    <SheetTitle className="flex items-center gap-2 text-teal-600">
                      <Activity size={20} strokeWidth={2.5} />
                      <span className="text-base font-black tracking-tight text-slate-900">Excel社区</span>
                    </SheetTitle>
                    <SheetDescription>移动端快捷导航</SheetDescription>
                  </SheetHeader>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <nav className="flex-1 space-y-1 px-4 py-4">
                      {mobileDrawerNavItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => {
                              navigate(item.path);
                              setMobileNavOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                              isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
                            <span>{item.name}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
            {ONLINE_LITE_MODE ? (
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">
                  {isMobile ? "当前模块" : "CURRENT MODULE"}
                </div>
                <div className="mt-1 flex items-center gap-2 text-slate-900">
                  <span className="text-teal-600">{activeLiteModule?.icon}</span>
                  <span className="truncate text-lg font-black tracking-tight">{activeLiteModule?.name || "首页"}</span>
                </div>
              </div>
            ) : forumEnabled ? (
            <div className="relative flex-1 max-w-lg items-center xl:max-w-xl" ref={searchContainerRef}>
              <div ref={searchTypeDropdownRef} className={`absolute left-1 z-10 ${isMobile ? "hidden" : ""}`}>
                <button
                  onClick={() => setShowSearchTypeDropdown(!showSearchTypeDropdown)}
                  className="flex items-center gap-1 pl-3 pr-2 py-1.5 text-sm text-slate-500 hover:text-slate-700 bg-transparent rounded-l-full border-r border-gray-200"
                >
                  {searchType === "user" ? "用户" : searchType === "post" ? "帖子" : "全部"}
                  <ChevronDown size={14} className={`transition-transform ${showSearchTypeDropdown ? "rotate-180" : ""}`} />
                </button>
                
                <AnimatePresence>
                  {showSearchTypeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="absolute top-full left-0 mt-2 w-28 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden py-1 z-50"
                    >
                      {[
                        { id: "all", label: "全部" },
                        { id: "user", label: "用户" },
                        { id: "post", label: "帖子" },
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setSearchType(type.id);
                            setShowSearchTypeDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            searchType === type.id 
                              ? "bg-teal-50 text-teal-700 font-medium" 
                              : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                type="text"
                placeholder="搜索用户、帖子、题目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchQuery.trim() && (searchSuggestions.posts.length || searchSuggestions.users.length)) setShowSuggestions(true); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-gray-100/80 border-transparent focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-full text-sm transition-all outline-none pl-[90px] pr-4 py-2"
              />

              <AnimatePresence>
                {showSuggestions && (searchSuggestions.posts.length > 0 || searchSuggestions.users.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50 max-h-[360px] overflow-y-auto"
                  >
                    {searchSuggestions.posts.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider uppercase bg-slate-50/50">帖子</div>
                        {searchSuggestions.posts.map((post: any) => (
                          <div
                            key={`post-${post.id}`}
                            onClick={() => { setShowSuggestions(false); setSearchQuery(""); navigate(`/post/${post.id}`); }}
                            className="px-4 py-3 hover:bg-teal-50 cursor-pointer flex items-start gap-3 transition-colors"
                          >
                            <MessageSquare size={16} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-800 truncate">{post.title}</div>
                              <div className="text-xs text-slate-400 mt-0.5 truncate">{post.author?.username} · {post.replyCount || 0} 评论</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchSuggestions.users.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider uppercase bg-slate-50/50 border-t border-gray-100">用户</div>
                        {searchSuggestions.users.map((u: any) => (
                          <div
                            key={`user-${u.id}`}
                            onClick={() => { setShowSuggestions(false); setSearchQuery(""); navigate(`/user/${u.id}`); }}
                            className="px-4 py-3 hover:bg-teal-50 cursor-pointer flex items-center gap-3 transition-colors"
                          >
                            <img src={normalizeAvatarUrl(u.avatar, u.username)} className="w-8 h-8 rounded-full object-cover border border-gray-100" alt="" />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-800 truncate">{u.username}</div>
                              <div className="text-xs text-slate-400">{u.role || "用户"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            ) : (
              <div className="text-sm font-bold text-slate-400">当前线上保留首页、小试牛刀、积分经验中心、实用功能、个人中心</div>
            )}

            {!isMobile && forumEnabled ? (
              <button 
                onClick={handleSearch}
                className="flex shrink-0 items-center justify-center rounded-full bg-teal-50 p-2 text-teal-600 transition-colors hover:bg-teal-100"
                title="搜索"
              >
                <Search size={18} />
              </button>
            ) : null}
          </div>

          <div className={`flex items-center ${isMobile ? "gap-1.5 ml-2" : "gap-2 md:gap-4 ml-3 md:ml-6"}`}>
            
            {!isMobile && forumEnabled ? (
              <Link 
                to="/create-post"
                className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm px-3 sm:px-4 py-2 sm:gap-2"
              >
                <PenSquare size={16} />
                <span className="hidden sm:inline">发布帖子</span>
                <span className="sm:hidden">发布</span>
              </Link>
            ) : null}

            {forumEnabled ? (
              <>
                <Link 
                  to="/messages"
                  className="p-2 text-slate-500 hover:bg-gray-100 rounded-full transition-colors relative"
                  title="我的私信"
                >
                  <Mail size={20} />
                  {renderCountBadge(unreadMessageCount, "teal")}
                </Link>

                <div className="relative" ref={notificationRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-500 hover:bg-gray-100 rounded-full transition-colors relative"
                  >
                    <Bell size={20} />
                    {renderCountBadge(unreadNotificationCount, "rose")}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(2px)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">通知</h3>
                      <button
                        onClick={async () => {
                          await markAllNotificationsReadMutation.mutateAsync();
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700"
                      >
                        全部已读
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationItems.map((item) => (
                        <div 
                          key={item.id}
                          onClick={async () => {
                            if (!item.isRead) {
                              await markNotificationReadMutation.mutateAsync(item.id);
                            }
                            setShowNotifications(false);
                            navigate(resolveNotificationLink(item));
                          }}
                          className="p-4 border-b border-gray-50/50 hover:bg-gray-50 flex gap-3 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                            <MessageSquare size={18} />
                          </div>
                          <div>
                            <p className="text-sm text-slate-700">{item.content}</p>
                            <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(item.createTime)}</p>
                          </div>
                        </div>
                      ))}
                      {notificationItems.length === 0 && (
                        <div className="p-6 text-sm text-slate-400 text-center">暂无通知</div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-50 bg-slate-50 text-center">
                      <Link 
                        to="/notifications" 
                        onClick={() => setShowNotifications(false)}
                        className="text-[13px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        查看全部通知
                      </Link>
                    </div>
                  </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : null}

            <div className={`${isMobile ? "" : "pl-4 border-l border-gray-200"} flex items-center gap-2`}>
              {isAuthenticated && !isMobile ? (
                <HoverCard openDelay={120} closeDelay={80}>
                  <HoverCardTrigger asChild>
                    <button type="button" className="flex items-center gap-2 cursor-pointer group">
                      <img
                        src={normalizeAvatarUrl(user?.avatar, user?.username)}
                        alt="Profile"
                        className="w-8 h-8 rounded-full border border-gray-200 group-hover:border-teal-400 transition-colors object-cover"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{user?.username || "去登录"}</span>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent align="end" className="w-auto min-w-0 rounded-xl border border-gray-100 bg-white/95 backdrop-blur-sm p-1.5 shadow-lg">
                    {canAccessAdmin && (
                      <button
                        type="button"
                        onClick={() => navigate(getDefaultAdminPath(user?.role))}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-gray-50 hover:text-slate-900"
                      >
                        管理后台
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate("/profile")}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-gray-50 hover:text-slate-900"
                    >
                      个人中心
                    </button>
                  </HoverCardContent>
                </HoverCard>
              ) : isAuthenticated && isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="flex items-center gap-2 cursor-pointer group rounded-full p-1">
                      <img 
                        src={normalizeAvatarUrl(user?.avatar, user?.username)} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full border border-gray-200 group-hover:border-teal-400 transition-colors object-cover"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                    {canAccessAdmin && <DropdownMenuItem onClick={() => navigate(getDefaultAdminPath(user?.role))}>进入管理后台</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => navigate("/profile")}>个人中心</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth" className="flex items-center gap-2 cursor-pointer group">
                  <img 
                    src={normalizeAvatarUrl(user?.avatar, user?.username)} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-gray-200 group-hover:border-teal-400 transition-colors object-cover"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{user?.username || "去登录"}</span>
                </Link>
              )}
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <Settings size={16} className="text-slate-400" />
                    {!isMobile ? <span>设置</span> : null}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      toast.success("已退出登录");
                      navigate("/auth");
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    <LogOut size={16} className="text-rose-500" />
                    {!isMobile ? <span>退出登录</span> : null}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30, 
                mass: 1 
              }}
              className={isMobile ? "h-full pb-[96px]" : "h-full"}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {isMobile ? (
          <>
            <AnimatePresence>
              {mobileSearchOpen ? (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setShowSuggestions(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 28 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-x-0 bottom-[84px] z-50 px-3 md:hidden"
                  >
                    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
                      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fffe_0%,#eefbf8_100%)] px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-black text-slate-900">站内搜索</div>
                            <div className="mt-1 text-xs font-medium text-slate-500">搜索用户、帖子与题目内容</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMobileSearchOpen(false);
                              setShowSuggestions(false);
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"
                          >
                            <X size={17} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "all", label: "全部" },
                            { key: "user", label: "用户" },
                            { key: "post", label: "帖子" },
                          ].map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => setSearchType(option.key)}
                              className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                                searchType === option.key
                                  ? "bg-slate-900 text-white shadow-sm"
                                  : "bg-white text-slate-500 ring-1 ring-slate-200"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder="输入关键字后直接搜索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                              if (searchQuery.trim() && (searchSuggestions.posts.length || searchSuggestions.users.length)) {
                                setShowSuggestions(true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void handleSearch();
                                setMobileSearchOpen(false);
                                setShowSuggestions(false);
                              }
                            }}
                            className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void handleSearch();
                              setMobileSearchOpen(false);
                              setShowSuggestions(false);
                            }}
                            className="inline-flex h-12 items-center justify-center rounded-2xl bg-teal-500 px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(20,184,166,0.24)]"
                          >
                            搜索
                          </button>
                        </div>
                        <div className="mt-4 max-h-[42vh] overflow-y-auto">
                          {showSuggestions && (searchSuggestions.posts.length > 0 || searchSuggestions.users.length > 0) ? (
                            <div className="space-y-4">
                              {searchSuggestions.posts.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="px-1 text-[11px] font-black tracking-[0.18em] text-slate-400">帖子</div>
                                  {searchSuggestions.posts.map((post) => (
                                    <button
                                      key={`mobile-search-post-${post.id}`}
                                      type="button"
                                      onClick={() => {
                                        setMobileSearchOpen(false);
                                        setShowSuggestions(false);
                                        setSearchQuery("");
                                        navigate(`/post/${post.id}`);
                                      }}
                                      className="flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/60"
                                    >
                                      <div className="mt-0.5 rounded-full bg-white p-2 text-slate-500 shadow-sm ring-1 ring-slate-100">
                                        <Search size={14} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-slate-800">{post.title || "未命名帖子"}</div>
                                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{post.content || "点击查看帖子详情"}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                              {searchSuggestions.users.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="px-1 text-[11px] font-black tracking-[0.18em] text-slate-400">用户</div>
                                  {searchSuggestions.users.map((account) => (
                                    <button
                                      key={`mobile-search-user-${account.id}`}
                                      type="button"
                                      onClick={() => {
                                        setMobileSearchOpen(false);
                                        setShowSuggestions(false);
                                        setSearchQuery("");
                                        navigate(`/user/${account.id}`);
                                      }}
                                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/60"
                                    >
                                      <img
                                        src={normalizeAvatarUrl(account.avatar, account.username)}
                                        alt={account.username || "用户"}
                                        className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-slate-800">{account.username || "未命名用户"}</div>
                                        <div className="mt-1 truncate text-xs text-slate-500">{account.bio || "点击查看个人主页"}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
                                <Search size={18} />
                              </div>
                              <div className="text-sm font-bold text-slate-700">输入关键词开始搜索</div>
                              <div className="mt-1 text-xs leading-5 text-slate-500">支持按用户、帖子和题目进行站内检索</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
            <div className={`grid gap-1 ${forumEnabled ? "grid-cols-5" : "grid-cols-4"}`}>
              {mobileBottomNavItems.map((item) => {
                const isSearch = item.key === "search";
                const isActive = isSearch
                  ? mobileSearchOpen
                  : location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={`mobile-nav-${item.key}`}
                    type="button"
                    onClick={() => {
                      if (isSearch) {
                        setMobileSearchOpen((prev) => !prev);
                        return;
                      }
                      navigate(item.path);
                    }}
                    className={`relative flex min-h-[58px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                      isActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                    >
                      <span className={isActive ? "text-teal-600" : "text-slate-400"}>{item.icon}</span>
                      <span className="leading-tight">{item.name}</span>
                    </button>
                );
              })}
            </div>
          </nav>
          </>
        ) : null}
      </div>

      <Dialog open={propsOpen} onOpenChange={setPropsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>我的道具</DialogTitle>
                      <DialogDescription>这里统一收纳你通过积分经验中心兑换获得的道具、头衔与权益，可在此选择使用。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {propsRecords.length > 0 ? (
              propsRecords.map((item) => {
                const Icon = resolvePropIcon(item);
                const isUsing = usePropMutation.isPending && usePropMutation.variables === item.id;
                const isUnequipping = unequipPropMutation.isPending && unequipPropMutation.variables === item.id;
                const isPending = isUsing || isUnequipping;
                const actionLabel = item.canUnequip ? "取消佩戴" : item.actionLabel;
                return (
                  <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-bold text-slate-800">{item.name}</div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{resolvePropTypeLabel(item.type)}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          item.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}>
                          {item.statusLabel}
                        </span>
                        {item.current ? <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">当前使用中</span> : null}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {item.key === "checkin_makeup_card"
                          ? "可用于补签最近漏签的一天，并保持连续签到记录。"
                          : item.type === "badge"
                            ? "已拥有的头衔可在这里切换佩戴。"
                            : "该道具已统一收纳到你的个人道具库。"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.canUnequip) {
                          void unequipPropMutation.mutateAsync(item.id);
                          return;
                        }
                        if (item.canUse) {
                          void usePropMutation.mutateAsync(item.id);
                        }
                      }}
                      disabled={(!item.canUse && !item.canUnequip) || isPending}
                      className="inline-flex h-10 min-w-[92px] items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {isPending ? "处理中..." : actionLabel}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
                        暂无已获得的道具，先去积分经验中心兑换吧。
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(popupNotification)} onOpenChange={(open) => {
        if (!open) {
          void handleClosePopupNotification();
        }
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{popupNotification?.title || popupNotification?.content || "站内通知"}</DialogTitle>
            <DialogDescription>管理员已向你发送一条弹窗通知，请确认内容后关闭。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-4">
              {popupNotification?.detailContent ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: popupNotification.detailContent }}
                />
              ) : (
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {popupNotification?.content || "暂无通知内容"}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleClosePopupNotification()}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-500 px-5 text-sm font-semibold text-white transition hover:bg-teal-600"
              >
                关闭通知
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>反馈建议</DialogTitle>
            <DialogDescription>欢迎反馈产品问题和改进建议，我们会在后台统一处理与跟进。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block">
              <div className="mb-2 text-sm font-semibold text-slate-700">反馈类型</div>
              <select
                value={feedbackForm.type}
                onChange={(e) => setFeedbackForm((prev) => ({ ...prev, type: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              >
                <option value="performance_optimization">性能优化</option>
                <option value="feature_optimization">功能优化</option>
                <option value="new_feature">新增功能</option>
                <option value="other">其他</option>
              </select>
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-semibold text-slate-700">反馈内容</div>
              <textarea
                value={feedbackForm.content}
                onChange={(e) => setFeedbackForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="请尽量描述清楚问题场景、预期效果或新增需求。"
                className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </label>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                <span>建议描述具体现象、影响范围和你的预期结果。</span>
              </div>
              <span>{feedbackForm.content.trim().length}/1000</span>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = feedbackForm.content.trim();
                  if (!content) {
                    toast.info("请填写反馈内容");
                    return;
                  }
                  if (content.length > 1000) {
                    toast.info("反馈内容不能超过1000字");
                    return;
                  }
                  void feedbackMutation.mutateAsync();
                }}
                disabled={feedbackMutation.isPending}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-500 px-4 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
              >
                {feedbackMutation.isPending ? "提交中..." : "提交反馈"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function renderCountBadge(count: number, tone: "teal" | "rose") {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  const toneClassName = tone === "teal"
    ? "bg-teal-500 text-white"
    : "bg-rose-500 text-white";
  return (
    <span className={`absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-black leading-none shadow-sm ${toneClassName}`}>
      {label}
    </span>
  );
}
