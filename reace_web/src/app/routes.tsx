import { createBrowserRouter, Navigate, useParams, useSearchParams } from "react-router";
import { Layout } from "./components/Layout";
import { ONLINE_LITE_MODE } from "./lib/site-mode";
import { getCampaignQuestionListPath } from "./lib/practice-campaign-ui";

function lazyPage(importer: () => Promise<any>, exportName: string) {
  return async () => {
    const module = await importer();
    return { Component: module[exportName] };
  };
}

function LiteRedirect() {
  return <Navigate to="/practice" replace />;
}

function AdminRedirect() {
  return <Navigate to="/admin/overview" replace />;
}

function PracticeChapterRedirect() {
  const { id } = useParams();
  return <Navigate to={getCampaignQuestionListPath(id)} replace />;
}

function PracticeChaptersRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate to={getCampaignQuestionListPath(searchParams.get("chapter"))} replace />;
}

function pageRoute(path: string, importer: () => Promise<any>, exportName: string, allowedInLite = false) {
  if (ONLINE_LITE_MODE && !allowedInLite) {
    return { path, Component: LiteRedirect };
  }
  return { path, lazy: lazyPage(importer, exportName) };
}

export const router = createBrowserRouter([
  { path: "/auth", lazy: lazyPage(() => import("./pages/Auth"), "Auth") },
  ONLINE_LITE_MODE
    ? { path: "/create-post", Component: LiteRedirect }
    : { path: "/create-post", lazy: lazyPage(() => import("./pages/CreatePost"), "CreatePost") },
  {
    path: "/admin",
    lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminLayout"),
    children: [
      { index: true, lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminIndex") },
      { path: "overview", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminOverview") },
      { path: "home-content", lazy: lazyPage(() => import("./pages/AdminHomeContent"), "AdminHomeContent") },
      { path: "review", Component: AdminRedirect },
      { path: "reports", Component: AdminRedirect },
      { path: "users", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminUsers") },
      { path: "posts", Component: AdminRedirect },
      { path: "categories", Component: AdminRedirect },
      { path: "drafts", Component: AdminRedirect },
      { path: "notifications", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminNotifications") },
      { path: "questions", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminQuestions") },
      { path: "question-categories", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminQuestionCategories") },
      { path: "templates", lazy: lazyPage(() => import("./pages/AdminTemplateCenter"), "AdminTemplateCenter") },
      { path: "points", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminPoints") },
      { path: "mall", Component: AdminRedirect },
      { path: "levels", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminLevels") },
    ],
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, lazy: lazyPage(() => import("./pages/Home"), "Home") },
      { path: "chat", Component: LiteRedirect },
      pageRoute("practice", () => import("./pages/PracticeCampaignHub"), "PracticeCampaignHub", true),
      { path: "practice/chapters", Component: PracticeChaptersRedirect },
      pageRoute("practice/classic", () => import("./pages/Practice"), "Practice", true),
      { path: "practice/chapter/:id", Component: PracticeChapterRedirect },
      pageRoute("practice/result/:id", () => import("./pages/PracticeCampaignResult"), "PracticeCampaignResult", true),
      pageRoute("practice/daily", () => import("./pages/PracticeCampaignDaily"), "PracticeCampaignDaily", true),
      pageRoute("practice/wrongs", () => import("./pages/PracticeCampaignWrongs"), "PracticeCampaignWrongs", true),
      pageRoute("practice/ranking", () => import("./pages/PracticeCampaignRanking"), "PracticeCampaignRanking", true),
      pageRoute("practice/random", () => import("./pages/PracticeDetail"), "PracticeDetail", true),
      pageRoute("practice/question/:id", () => import("./pages/PracticeDetail"), "PracticeDetail", true),
      pageRoute("practice/history", () => import("./pages/PracticeHistory"), "PracticeHistory", true),
      pageRoute("practice/history/:id", () => import("./pages/PracticeRecordDetail"), "PracticeRecordDetail", true),
      pageRoute("templates", () => import("./pages/TemplateCenter"), "TemplateCenter", true),
      pageRoute("templates/records", () => import("./pages/TemplatePurchaseRecords"), "TemplatePurchaseRecords", true),
      pageRoute("tutorials", () => import("./pages/TutorialCenter"), "TutorialCenter", true),
      pageRoute("mall", () => import("./pages/Mall"), "Mall", true),
      pageRoute("mall/props", () => import("./pages/MallProps"), "MallProps", true),
      pageRoute("mall/redemptions", () => import("./pages/MallRedemptions"), "MallRedemptions", true),
      { path: "messages", Component: LiteRedirect },
      pageRoute("tools", () => import("./pages/Tools"), "Tools", true),
      pageRoute("assistant", () => import("./pages/Assistant"), "Assistant", true),
      pageRoute("tools/history", () => import("./pages/ToolsHistory"), "ToolsHistory", true),
      pageRoute("notifications", () => import("./pages/Notifications"), "Notifications", true),
      pageRoute("profile", () => import("./pages/ProfileCenter"), "ProfileCenter", true),
      { path: "user/:id", Component: LiteRedirect },
      { path: "board/:id", Component: LiteRedirect },
      { path: "post/:id", Component: LiteRedirect },
      pageRoute("notification/:id", () => import("./pages/NotificationDetail"), "NotificationDetail", true),
      pageRoute("settings", () => import("./pages/Settings"), "Settings", true),
      pageRoute("points-history", () => import("./pages/PointHistory"), "PointHistory", true),
      pageRoute("task-center", () => import("./pages/TaskCenter"), "TaskCenter", true),
    ],
  },
]);
