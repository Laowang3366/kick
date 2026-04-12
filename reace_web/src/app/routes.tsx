import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";

function lazyPage(importer: () => Promise<any>, exportName: string) {
  return async () => {
    const module = await importer();
    return { Component: module[exportName] };
  };
}

export const router = createBrowserRouter([
  { path: "/auth", lazy: lazyPage(() => import("./pages/Auth"), "Auth") },
  { path: "/create-post", lazy: lazyPage(() => import("./pages/CreatePost"), "CreatePost") },
  {
    path: "/admin",
    lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminLayout"),
    children: [
      { index: true, lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminIndex") },
      { path: "overview", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminOverview") },
      { path: "review", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminReview") },
      { path: "reports", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminReports") },
      { path: "users", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminUsers") },
      { path: "posts", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminPosts") },
      { path: "categories", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminCategories") },
      { path: "drafts", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminDrafts") },
      { path: "notifications", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminNotifications") },
      { path: "questions", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminQuestions") },
      { path: "question-categories", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminQuestionCategories") },
      { path: "points", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminPoints") },
      { path: "mall", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminMall") },
      { path: "levels", lazy: lazyPage(() => import("./pages/AdminConsole"), "AdminLevels") },
    ],
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, lazy: lazyPage(() => import("./pages/Home"), "Home") },
      { path: "chat", lazy: lazyPage(() => import("./pages/Chat"), "Chat") },
      { path: "practice", lazy: lazyPage(() => import("./pages/Practice"), "Practice") },
      { path: "practice/random", lazy: lazyPage(() => import("./pages/PracticeDetail"), "PracticeDetail") },
      { path: "practice/question/:id", lazy: lazyPage(() => import("./pages/PracticeDetail"), "PracticeDetail") },
      { path: "practice/history", lazy: lazyPage(() => import("./pages/PracticeHistory"), "PracticeHistory") },
      { path: "practice/history/:id", lazy: lazyPage(() => import("./pages/PracticeRecordDetail"), "PracticeRecordDetail") },
      { path: "mall", lazy: lazyPage(() => import("./pages/Mall"), "Mall") },
      { path: "messages", lazy: lazyPage(() => import("./pages/Messages"), "Messages") },
      { path: "tools", lazy: lazyPage(() => import("./pages/Tools"), "Tools") },
      { path: "notifications", lazy: lazyPage(() => import("./pages/Notifications"), "Notifications") },
      { path: "profile", lazy: lazyPage(() => import("./pages/Profile"), "Profile") },
      { path: "user/:id", lazy: lazyPage(() => import("./pages/UserProfile"), "UserProfile") },
      { path: "board/:id", lazy: lazyPage(() => import("./pages/BoardDetail"), "BoardDetail") },
      { path: "post/:id", lazy: lazyPage(() => import("./pages/PostDetail"), "PostDetail") },
      { path: "notification/:id", lazy: lazyPage(() => import("./pages/NotificationDetail"), "NotificationDetail") },
      { path: "settings", lazy: lazyPage(() => import("./pages/Settings"), "Settings") },
      { path: "points-history", lazy: lazyPage(() => import("./pages/PointHistory"), "PointHistory") },
      { path: "task-center", lazy: lazyPage(() => import("./pages/TaskCenter"), "TaskCenter") },
    ],
  },
]);
