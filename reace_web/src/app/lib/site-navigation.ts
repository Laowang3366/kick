export type PublicNavItem = {
  key: "home" | "practice" | "templates" | "tutorials" | "mall" | "tools";
  name: string;
  shortName: string;
  path: string;
  description: string;
};

export const publicNavItems: PublicNavItem[] = [
  {
    key: "home",
    name: "首页",
    shortName: "首页",
    path: "/",
    description: "函数教程与学习入口",
  },
  {
    key: "tutorials",
    name: "教程中心",
    shortName: "教程",
    path: "/tutorials",
    description: "函数教程、场景说明与关联练习",
  },
  {
    key: "practice",
    name: "小试牛刀",
    shortName: "练习",
    path: "/practice",
    description: "章节闯关、每日挑战与错题复习",
  },
  {
    key: "templates",
    name: "模板中心",
    shortName: "模板",
    path: "/templates",
    description: "行业模板下载与购买记录",
  },
  {
    key: "mall",
    name: "积分经验中心",
    shortName: "积分",
    path: "/mall",
    description: "积分、道具、兑换与等级成长",
  },
  {
    key: "tools",
    name: "实用功能",
    shortName: "工具",
    path: "/tools",
    description: "文件转换与效率工具",
  },
];

export const mobilePrimaryNavItems = publicNavItems.filter((item) =>
  ["home", "practice", "tutorials", "templates", "tools"].includes(item.key)
);

export function resolveActiveNavItem(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  if (normalizedPathname === "/") {
    return publicNavItems[0];
  }
  return publicNavItems.find((item) => item.path !== "/" && normalizedPathname.startsWith(`${item.path}/`))
    || publicNavItems.find((item) => normalizedPathname === item.path)
    || publicNavItems[0];
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
