import {
  BellRing,
  BookMarked,
  ClipboardCheck,
  Coins,
  FileStack,
  Files,
  Flag,
  FolderKanban,
  Gauge,
  Layers3,
  ShoppingBag,
  Shield,
  Users,
} from "lucide-react";

export type AdminRole = "admin" | "moderator";
export type AdminModuleKey =
  | "overview"
  | "review"
  | "reports"
  | "users"
  | "posts"
  | "categories"
  | "drafts"
  | "notifications"
  | "questions"
  | "question-categories"
  | "points"
  | "mall"
  | "levels";

export type AdminModule = {
  key: AdminModuleKey;
  label: string;
  path: string;
  icon: any;
  roles: AdminRole[];
};

export const ADMIN_MODULES: AdminModule[] = [
  { key: "overview", label: "后台总览", path: "/admin/overview", icon: Gauge, roles: ["admin", "moderator"] },
  { key: "review", label: "帖子审核", path: "/admin/review", icon: ClipboardCheck, roles: ["admin", "moderator"] },
  { key: "reports", label: "举报处理", path: "/admin/reports", icon: Flag, roles: ["admin", "moderator"] },
  { key: "categories", label: "分类管理", path: "/admin/categories", icon: FolderKanban, roles: ["admin", "moderator"] },
  { key: "users", label: "用户管理", path: "/admin/users", icon: Users, roles: ["admin"] },
  { key: "posts", label: "帖子管理", path: "/admin/posts", icon: Files, roles: ["admin", "moderator"] },
  { key: "drafts", label: "草稿管理", path: "/admin/drafts", icon: FileStack, roles: ["admin"] },
  { key: "notifications", label: "站内通知", path: "/admin/notifications", icon: BellRing, roles: ["admin"] },
  { key: "questions", label: "题库管理", path: "/admin/questions", icon: BookMarked, roles: ["admin"] },
  { key: "question-categories", label: "题目分类", path: "/admin/question-categories", icon: Layers3, roles: ["admin"] },
  { key: "points", label: "积分体系", path: "/admin/points", icon: Coins, roles: ["admin"] },
  { key: "mall", label: "商城管理", path: "/admin/mall", icon: ShoppingBag, roles: ["admin"] },
  { key: "levels", label: "等级体系", path: "/admin/levels", icon: Shield, roles: ["admin"] },
];

export function hasAdminConsoleAccess(role?: string | null): role is AdminRole {
  return role === "admin" || role === "moderator";
}

export function getAdminModulesForRole(role?: string | null) {
  if (!hasAdminConsoleAccess(role)) return [];
  return ADMIN_MODULES.filter((module) => module.roles.includes(role));
}

export function getDefaultAdminPath(role?: string | null) {
  return role === "moderator" ? "/admin/review" : "/admin/overview";
}

export function getAdminModuleByPath(pathname: string) {
  return ADMIN_MODULES.find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`));
}

export function canAccessAdminPath(role: string | null | undefined, pathname: string) {
  if (!hasAdminConsoleAccess(role)) return false;
  const module = getAdminModuleByPath(pathname);
  if (!module) return pathname === "/admin";
  return module.roles.includes(role);
}

export function canManageCategoryMutations(role?: string | null) {
  return role === "admin";
}
