export const adminKeys = {
  all: ["admin"] as const,
  stats: () => ["admin", "stats"] as const,
  review: (params: Record<string, unknown>) => ["admin", "review", params] as const,
  practiceReview: (params: Record<string, unknown>) => ["admin", "practice-review", params] as const,
  reports: (params: Record<string, unknown>) => ["admin", "reports", params] as const,
  feedback: (params: Record<string, unknown>) => ["admin", "feedback", params] as const,
  users: (params: Record<string, unknown>) => ["admin", "users", params] as const,
  posts: (params: Record<string, unknown>) => ["admin", "posts", params] as const,
  categories: () => ["admin", "categories"] as const,
  drafts: (params: Record<string, unknown>) => ["admin", "drafts", params] as const,
  notificationsStats: () => ["admin", "notifications", "stats"] as const,
  notifications: (params: Record<string, unknown>) => ["admin", "notifications", params] as const,
  questionCategories: () => ["admin", "question-categories"] as const,
  questions: (params: Record<string, unknown>) => ["admin", "questions", params] as const,
  practiceCampaignLevels: () => ["admin", "practice-campaign", "levels"] as const,
  practiceCampaignDaily: () => ["admin", "practice-campaign", "daily"] as const,
  pointsStats: () => ["admin", "points", "stats"] as const,
  pointsGrantUsers: (params: Record<string, unknown>) => ["admin", "points", "grant-users", params] as const,
  pointsOptions: () => ["admin", "points", "options"] as const,
  pointsRules: () => ["admin", "points", "rules"] as const,
  pointsRecords: (params: Record<string, unknown>) => ["admin", "points", "records", params] as const,
  mallOverview: () => ["admin", "mall", "overview"] as const,
  mallItems: (params: Record<string, unknown>) => ["admin", "mall", "items", params] as const,
  mallTypes: () => ["admin", "mall", "types"] as const,
  mallRedemptions: (params: Record<string, unknown>) => ["admin", "mall", "redemptions", params] as const,
  levelsOverview: () => ["admin", "levels", "overview"] as const,
  levelsUsers: (params: Record<string, unknown>) => ["admin", "levels", "users", params] as const,
  levelsLogs: (params: Record<string, unknown>) => ["admin", "levels", "logs", params] as const,
};

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: Record<string, unknown>) => ["notifications", "list", params] as const,
  detail: (id: number | string) => ["notifications", "detail", id] as const,
};

export const profileKeys = {
  overview: () => ["profile", "overview"] as const,
  props: () => ["profile", "props"] as const,
  tab: (tab: string) => ["profile", "tab", tab] as const,
};

export const userProfileKeys = {
  detail: (id: number | string) => ["user-profile", "detail", id] as const,
  overview: (id: number | string) => ["user-profile", "overview", id] as const,
  followStatus: (id: number | string) => ["user-profile", "follow-status", id] as const,
  tab: (id: number | string, tab: string) => ["user-profile", "tab", id, tab] as const,
};

export const postKeys = {
  detail: (id: number | string) => ["post", "detail", id] as const,
  replies: (id: number | string) => ["post", "replies", id] as const,
  related: (categoryId: number | string | null | undefined, postId: number | string) =>
    ["post", "related", categoryId ?? "none", postId] as const,
  followStatus: (authorId: number | string | null | undefined) =>
    ["post", "follow-status", authorId ?? "none"] as const,
};

export const boardKeys = {
  detail: (id: number | string) => ["board", "detail", id] as const,
  followStatus: (id: number | string) => ["board", "follow-status", id] as const,
  posts: (params: Record<string, unknown>) => ["board", "posts", params] as const,
};

export const messageKeys = {
  conversations: () => ["messages", "conversations"] as const,
  unreadCount: () => ["messages", "unread-count"] as const,
  thread: (id: number | string) => ["messages", "thread", id] as const,
};

export const homeKeys = {
  overview: () => ["home", "overview"] as const,
  checkinStatus: () => ["home", "checkin-status"] as const,
  levelRules: () => ["home", "level-rules"] as const,
};

export const practiceKeys = {
  categories: () => ["practice", "categories"] as const,
  questionList: () => ["practice", "question-list"] as const,
  leaderboard: () => ["practice", "leaderboard"] as const,
  detail: (id: number | string) => ["practice", "detail", id] as const,
  submissions: (params: Record<string, unknown>) => ["practice", "submissions", params] as const,
  history: () => ["practice", "history"] as const,
  recordDetail: (id: number | string) => ["practice", "record-detail", id] as const,
  campaignOverview: () => ["practice", "campaign", "overview"] as const,
  campaignChapters: () => ["practice", "campaign", "chapters"] as const,
  campaignChapter: (id: number | string) => ["practice", "campaign", "chapter", id] as const,
  campaignLevel: (id: number | string) => ["practice", "campaign", "level", id] as const,
  campaignDaily: () => ["practice", "campaign", "daily"] as const,
  campaignWrongs: () => ["practice", "campaign", "wrongs"] as const,
  campaignRankings: (scope: string) => ["practice", "campaign", "rankings", scope] as const,
};

export const settingsKeys = {
  overview: () => ["settings", "overview"] as const,
  privacy: () => ["settings", "privacy"] as const,
};

export const pointsKeys = {
  overview: () => ["points", "overview"] as const,
  records: () => ["points", "records"] as const,
  tasks: () => ["points", "tasks"] as const,
};

export const mallKeys = {
  overview: () => ["mall", "overview"] as const,
  items: () => ["mall", "items"] as const,
  types: () => ["mall", "types"] as const,
};

export const chatKeys = {
  messages: () => ["chat", "messages"] as const,
  onlineUsers: () => ["chat", "online-users"] as const,
};

export const draftKeys = {
  detail: (id: number | string) => ["draft", "detail", id] as const,
  all: ["draft"] as const,
};
