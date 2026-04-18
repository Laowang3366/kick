import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, FileText, Lightbulb, Search, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { LitePageFrame } from "../components/LiteSurface";
import { api } from "../lib/api";
import { onboardingKeys, searchKeys, tutorialKeys } from "../lib/query-keys";
import { useSession } from "../lib/session";

const EMPTY_SEARCH = { tutorials: [], questions: [], functions: [] };

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSession();
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<number | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState("beginner");
  const deferredKeyword = useDeferredValue(searchKeyword.trim());

  const tutorialsQuery = useQuery({
    queryKey: tutorialKeys.home(),
    queryFn: () => api.get<any>("/api/tutorials/home", { silent: true }),
  });
  const recommendationQuery = useQuery({
    queryKey: onboardingKeys.recommendation(),
    enabled: isAuthenticated,
    queryFn: () => api.get<any>("/api/onboarding/recommendation", { silent: true }),
  });
  const searchQuery = useQuery({
    queryKey: searchKeys.all(deferredKeyword),
    enabled: deferredKeyword.length > 0,
    queryFn: () => api.get<any>(`/api/search/all?q=${encodeURIComponent(deferredKeyword)}&limit=6`, { auth: false, silent: true }),
  });

  const updateTrackMutation = useMutation({
    mutationFn: (track: string) => api.put<any>("/api/me/learning-track", { track }),
    onSuccess: async () => {
      toast.success("学习轨道已更新");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: onboardingKeys.recommendation() }),
        queryClient.invalidateQueries({ queryKey: tutorialKeys.home() }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "更新学习轨道失败");
    },
  });
  const assessmentMutation = useMutation({
    mutationFn: (answerValue: string) =>
      api.post<any>("/api/onboarding/quick-assessment", {
        answers: [{ questionCode: "entry_level", answerValue }],
      }),
    onSuccess: async () => {
      setOnboardingOpen(false);
      toast.success("首页已切换到你的学习轨道");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: onboardingKeys.recommendation() }),
        queryClient.invalidateQueries({ queryKey: tutorialKeys.home() }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "保存首登分流失败");
    },
  });

  const categories = tutorialsQuery.data?.categories || [];
  const learningTrack = recommendationQuery.data?.track || tutorialsQuery.data?.learningTrack || "general";
  const recommendedArticleId = recommendationQuery.data?.recommendedArticle?.id || null;
  const recommendedChapter = recommendationQuery.data?.recommendedChapter || null;
  const searchResults = deferredKeyword ? searchQuery.data || EMPTY_SEARCH : EMPTY_SEARCH;

  useEffect(() => {
    setOnboardingOpen(Boolean(isAuthenticated && recommendationQuery.data?.needsAssessment));
  }, [isAuthenticated, recommendationQuery.data?.needsAssessment]);

  useEffect(() => {
    if (!categories.length) {
      setActiveCategoryId(null);
      setActiveArticleId(null);
      setExpandedCategoryId(null);
      return;
    }

    const articleParam = Number(new URLSearchParams(location.search).get("article") || "");
    const preferredArticleId = Number.isFinite(articleParam) && articleParam > 0 ? articleParam : recommendedArticleId;
    const preferredSelection = preferredArticleId ? findArticleSelection(categories, preferredArticleId) : null;
    const fallbackCategory = categories.find((item: any) => item.id === activeCategoryId) || categories[0];
    const fallbackArticle = fallbackCategory?.articles?.find((item: any) => item.id === activeArticleId) || fallbackCategory?.articles?.[0] || null;
    const nextCategoryId = preferredSelection?.categoryId || fallbackCategory?.id || null;
    const nextArticleId = preferredSelection?.articleId || fallbackArticle?.id || null;

    setActiveCategoryId(nextCategoryId);
    setActiveArticleId(nextArticleId);
    setExpandedCategoryId((current) => current && categories.some((item: any) => item.id === current) ? current : nextCategoryId);
  }, [categories, location.search, recommendedArticleId, activeArticleId, activeCategoryId]);

  const activeCategory = useMemo(
    () => categories.find((item: any) => item.id === activeCategoryId) || categories[0] || null,
    [categories, activeCategoryId]
  );
  const activeArticle = useMemo(
    () => activeCategory?.articles?.find((item: any) => item.id === activeArticleId) || activeCategory?.articles?.[0] || null,
    [activeArticleId, activeCategory]
  );
  const activeArticleIndex = activeCategory?.articles?.findIndex((item: any) => item.id === activeArticle?.id) ?? -1;

  const jumpToArticle = (articleId?: number | null, categoryId?: number | null) => {
    if (!articleId) {
      return;
    }
    const selection = categoryId ? { articleId, categoryId } : findArticleSelection(categories, articleId);
    if (!selection) {
      return;
    }
    setActiveCategoryId(selection.categoryId);
    setActiveArticleId(selection.articleId);
    setExpandedCategoryId(selection.categoryId);
    navigate(`/?article=${selection.articleId}`);
    setSearchKeyword("");
  };

  const renderSearchSection = (title: string, toneClassName: string, records: any[], onClick: (item: any) => void) => {
    if (!records?.length) {
      return null;
    }
    return (
      <div className="mt-4">
        <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em] ${toneClassName}`}>{title}</div>
        <div className="space-y-2">
          {records.map((item: any, index: number) => (
            <motion.button
              key={`${title}-${item.id}-${index}`}
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onClick(item)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-800">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.summary || "点击查看详情"}</div>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-slate-300" />
              </div>
              {Array.isArray(item.tags) && item.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.tags.slice(0, 3).map((tag: string) => (
                    <span key={`${item.id}-${tag}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <LitePageFrame className="max-w-[1460px]">
      <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/88 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 bg-[linear-gradient(180deg,#f7fbfb_0%,#f1f7fa_100%)] p-4 xl:border-b-0 xl:border-r xl:p-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/78 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="px-2 text-[11px] font-black tracking-[0.18em] text-slate-400">首页</div>
              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <Search size={15} className="text-slate-400" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜索教程、练习题、函数..."
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </label>

              {deferredKeyword ? (
                <div className="mt-4">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">SEARCH SPLIT</div>
                    <div className="mt-2 text-sm font-black text-slate-900">“{deferredKeyword}” 的拆分结果</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">教程、练习题、函数结果已拆分展示，优先点教程继续阅读。</div>
                  </div>

                  {renderSearchSection("教程", "bg-teal-50 text-teal-700", searchResults.tutorials, (item) => jumpToArticle(Number(item.id), item.categoryId))}
                  {renderSearchSection("练习题", "bg-amber-50 text-amber-700", searchResults.questions, (item) => navigate(item.targetUrl))}
                  {renderSearchSection("函数", "bg-sky-50 text-sky-700", searchResults.functions, (item) => {
                    const articleId = Number(new URL(item.targetUrl, window.location.origin).searchParams.get("article"));
                    jumpToArticle(articleId);
                  })}

                  {!searchResults.tutorials?.length && !searchResults.questions?.length && !searchResults.functions?.length ? (
                    <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                      没有匹配到内容，换个函数名或场景词再试。
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {categories.map((category: any, index: number) => {
                    const isActive = category.id === activeCategory?.id;
                    const isExpanded = category.id === expandedCategoryId;
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCategoryId(category.id);
                            setActiveArticleId(category.articles?.[0]?.id || null);
                            setExpandedCategoryId((current) => (current === category.id ? null : category.id));
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                            isActive
                              ? "bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span className={isActive ? "text-white" : "text-slate-400"}>
                            <Lightbulb size={16} strokeWidth={1.6} />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{category.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${
                            isActive ? "bg-white/14 text-white/88" : "bg-slate-100 text-slate-400"
                          }`}>
                            {category.articles?.length || 0}
                          </span>
                          <span className={isActive ? "text-white/82" : "text-slate-400"}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </span>
                        </button>

                        {isExpanded && category.articles?.length ? (
                          <div className="mt-2 space-y-1 pl-4">
                            {category.articles.map((article: any, articleIndex: number) => {
                              const isArticleActive = article.id === activeArticle?.id && category.id === activeCategory?.id;
                              return (
                                <button
                                  key={article.id}
                                  type="button"
                                  onClick={() => jumpToArticle(article.id, category.id)}
                                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm transition ${
                                    isArticleActive
                                      ? "bg-teal-50 text-teal-700"
                                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  <span className={isArticleActive ? "text-teal-600" : "text-slate-300"}>
                                    <FileText size={14} strokeWidth={1.8} />
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-semibold">{article.title}</span>
                                  <span className="text-[10px] font-black tracking-[0.18em] text-slate-300">
                                    {(articleIndex + 1).toString().padStart(2, "0")}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {!categories.length ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                  暂无可展示分类
                </div>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0 p-6">
            {recommendationQuery.data?.track ? (
              <div className="mb-6 rounded-[28px] border border-[#d8ece7] bg-[linear-gradient(135deg,#f7fffc_0%,#f8fbff_100%)] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-slate-400">
                      <Sparkles size={12} />
                      LEARNING TRACK
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">{trackLabel[learningTrack] || "通用轨道"}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-500">
                      {recommendationQuery.data?.description || "首页会优先展示更适合你当前阶段的教程和练习。"}
                    </div>
                    {recommendedChapter ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/practice/chapters?chapter=${recommendedChapter.id}`)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-black text-teal-700"
                      >
                        <Target size={15} />
                        进入推荐章节：{recommendedChapter.name}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "beginner", label: "切到新手" },
                      { value: "intermediate", label: "切到中级" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        disabled={updateTrackMutation.isPending}
                        onClick={() => void updateTrackMutation.mutateAsync(item.value)}
                        className={`rounded-full px-4 py-2 text-sm font-black transition ${
                          learningTrack === item.value
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {!activeArticle ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-sm text-slate-400">
                暂无首页教程内容，请先在后台新增分类和条目。
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <FileText size={12} />
                    当前条目
                  </div>
                  {activeCategory ? (
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-700">
                      {activeCategory.name}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                    {activeArticleIndex + 1}/{activeCategory?.articles?.length || 0}
                  </span>
                </div>
                <h2 className="mt-3 text-[34px] font-black tracking-tight text-slate-900">{activeArticle.title}</h2>
                {activeArticle.summary ? (
                  <p className="mt-3 text-sm leading-7 text-slate-500">{activeArticle.summary}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeArticle.audienceTrack ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {articleTrackLabel[activeArticle.audienceTrack] || "通用轨道"}
                    </span>
                  ) : null}
                  {activeArticle.difficulty ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      {difficultyLabel[activeArticle.difficulty] || "基础难度"}
                    </span>
                  ) : null}
                  {Array.isArray(activeArticle.functionTags)
                    ? activeArticle.functionTags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                          {tag}
                        </span>
                      ))
                    : null}
                </div>

                <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                  {activeArticle.content ? (
                    <div
                      className="home-tutorial-content space-y-4 text-[15px] leading-8 text-slate-700"
                      dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                    />
                  ) : (
                    <div className="text-sm text-slate-400">当前条目暂无正文内容。</div>
                  )}
                </div>

                {activeArticle.oneLineUsage || activeArticle.relatedChapters?.length || activeArticle.relatedQuestions?.length ? (
                  <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">关联练习</div>
                      <h3 className="mt-2 text-xl font-black text-slate-900">学完就练</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        {activeArticle.oneLineUsage || "当前条目已补齐练习关联，直接进入对应章节或题目即可验证掌握情况。"}
                      </p>

                      {activeArticle.relatedChapters?.length ? (
                        <div className="mt-5">
                          <div className="text-sm font-bold text-slate-700">关联章节</div>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {activeArticle.relatedChapters.map((chapter: any) => (
                              <button
                                key={chapter.id}
                                type="button"
                                onClick={() => navigate(`/practice/chapters?chapter=${chapter.id}`)}
                                className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-left transition hover:border-teal-200 hover:bg-teal-100/70"
                              >
                                <div className="text-sm font-bold text-teal-800">{chapter.name}</div>
                                {chapter.description ? <div className="mt-1 max-w-[260px] text-xs text-teal-700/75">{chapter.description}</div> : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {activeArticle.relatedQuestions?.length ? (
                        <div className="mt-5">
                          <div className="text-sm font-bold text-slate-700">关联题目</div>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {activeArticle.relatedQuestions.map((question: any) => (
                              <button
                                key={question.id}
                                type="button"
                                onClick={() => navigate(`/practice/question/${question.id}`, { state: { backTo: "/" } })}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                              >
                                <div className="text-sm font-bold text-slate-800">{question.title}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fffd_100%)] px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">学习提示</div>
                      <h3 className="mt-2 text-xl font-black text-slate-900">推荐学习路径</h3>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          1. 先看当前函数的语法和示例，确认参数含义。
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          2. 立即进入对应章节或题目练习，验证公式是否真正会写。
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          3. 错题优先重复练，确保函数写法和场景选择都过关。
                        </div>
                      </div>
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                        当前首页轨道：{trackLabel[learningTrack] || "通用轨道"}。搜索时会优先显示教程、练习题、函数三条链路的拆分结果。
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={onboardingOpen} onOpenChange={(next) => !assessmentMutation.isPending && setOnboardingOpen(next)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>先选你的学习起点</DialogTitle>
            <DialogDescription>只做 1 次轻量分流，首页会按你的阶段优先推荐教程与练习。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { value: "beginner", title: "我是零基础", description: "先学单元格引用、SUM、COUNT、AVERAGE、IF 等基础函数。" },
              { value: "function_basic", title: "我会一些基础函数", description: "继续补查找引用、文本处理与常见实战套路。" },
              { value: "office_skill", title: "我想提高办公实战能力", description: "直接进入更偏场景化的中级学习轨道。" },
            ].map((item) => {
              const active = selectedAssessment === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedAssessment(item.value)}
                  className={`rounded-[24px] border px-4 py-5 text-left transition ${
                    active
                      ? "border-teal-300 bg-teal-50 shadow-[0_14px_30px_rgba(20,184,166,0.12)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
                    {item.value === "beginner" ? <Lightbulb size={18} /> : item.value === "function_basic" ? <BookOpen size={18} /> : <Target size={18} />}
                  </div>
                  <div className="mt-4 text-base font-black text-slate-900">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">{item.description}</div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={assessmentMutation.isPending}
              onClick={() => void assessmentMutation.mutateAsync(selectedAssessment)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-teal-500 px-6 text-sm font-black text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
            >
              {assessmentMutation.isPending ? "保存中..." : "确认并开始学习"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </LitePageFrame>
  );
}

function findArticleSelection(categories: any[], articleId: number) {
  for (const category of categories) {
    const article = category.articles?.find((item: any) => item.id === articleId);
    if (article) {
      return { categoryId: category.id, articleId: article.id };
    }
  }
  return null;
}

const trackLabel: Record<string, string> = {
  beginner: "新手入门",
  intermediate: "中级提升",
  general: "通用轨道",
};

const articleTrackLabel: Record<string, string> = {
  beginner: "新手入门",
  advanced: "进阶提升",
  general: "通用轨道",
};

const difficultyLabel: Record<string, string> = {
  basic: "基础",
  medium: "中等",
  advanced: "进阶",
};
