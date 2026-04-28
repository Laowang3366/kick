import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, FileText, ListTree, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { LitePageFrame } from "../components/LiteSurface";
import { api } from "../lib/api";
import { tutorialKeys } from "../lib/query-keys";

export function TutorialCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeKeyword = searchParams.get("search") || searchParams.get("q") || "";
  const tutorialsQuery = useQuery({
    queryKey: tutorialKeys.home(),
    queryFn: () => api.get<any>("/api/tutorials/home", { silent: true }),
  });

  const categories = tutorialsQuery.data?.categories || [];
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState(routeKeyword);

  useEffect(() => {
    setSearchKeyword(routeKeyword);
  }, [routeKeyword]);

  const visibleCategories = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return categories;
    }

    return categories
      .map((category: any) => {
        const categoryMatched = [category.name, category.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
        const articles = (category.articles || []).filter((article: any) =>
          [article.title, article.summary, article.content]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        );
        if (categoryMatched) {
          return category;
        }
        if (!articles.length) {
          return null;
        }
        return { ...category, articles };
      })
      .filter(Boolean);
  }, [categories, searchKeyword]);

  useEffect(() => {
    if (!visibleCategories.length) {
      setActiveCategoryId(null);
      setActiveArticleId(null);
      return;
    }
    const nextCategoryId = activeCategoryId && visibleCategories.some((item: any) => item.id === activeCategoryId)
      ? activeCategoryId
      : visibleCategories[0].id;
    const matchedCategory = visibleCategories.find((item: any) => item.id === nextCategoryId) || visibleCategories[0];
    const nextArticleId = activeArticleId && matchedCategory.articles?.some((item: any) => item.id === activeArticleId)
      ? activeArticleId
      : matchedCategory.articles?.[0]?.id || null;
    setActiveCategoryId(nextCategoryId);
    setActiveArticleId(nextArticleId);
  }, [visibleCategories, activeArticleId, activeCategoryId]);

  const activeCategory = useMemo(
    () => visibleCategories.find((item: any) => item.id === activeCategoryId) || visibleCategories[0] || null,
    [visibleCategories, activeCategoryId]
  );
  const activeArticle = useMemo(
    () => activeCategory?.articles?.find((item: any) => item.id === activeArticleId) || activeCategory?.articles?.[0] || null,
    [activeArticleId, activeCategory]
  );
  const activeArticleIndex = activeCategory?.articles?.findIndex((item: any) => item.id === activeArticle?.id) ?? -1;
  const activeArticles = activeCategory?.articles || [];
  const previousArticle = activeArticleIndex > 0 ? activeArticles[activeArticleIndex - 1] : null;
  const nextArticle = activeArticleIndex >= 0 && activeArticleIndex < activeArticles.length - 1
    ? activeArticles[activeArticleIndex + 1]
    : null;
  const totalArticles = categories.reduce((sum: number, category: any) => sum + (category.articles?.length || 0), 0);

  const selectArticle = (category: any, article: any) => {
    setActiveCategoryId(category.id);
    setActiveArticleId(article.id);
  };

  return (
    <LitePageFrame className="max-w-none bg-[#f5fbf6] px-0 py-0">
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
          >
            <ArrowLeft size={16} />
            返回首页
          </button>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                <BookOpen size={18} />
                Excel 教程中心
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Excel 函数与公式教程
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                按函数分类学习用法、语法、示例和注意点，阅读后可进入关联章节或题目练习。
              </p>
            </div>
            <label className="flex h-12 items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 shadow-sm">
              <Search size={18} className="text-emerald-700" />
              <input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="搜索教程、函数、场景..."
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1320px] gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)_250px]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-700 px-4 py-3 text-sm font-black text-white">
              <ListTree size={16} />
              教程目录
            </div>
            <div className="max-h-[calc(100vh-190px)] overflow-y-auto py-2">
              {visibleCategories.map((category: any) => {
                const isActiveCategory = category.id === activeCategory?.id;
                return (
                  <div key={category.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(category.id);
                        setActiveArticleId(category.articles?.[0]?.id || null);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black transition ${
                        isActiveCategory ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{category.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                        {category.articles?.length || 0}
                      </span>
                    </button>
                    {isActiveCategory ? (
                      <div className="pb-2">
                        {(category.articles || []).map((article: any) => {
                          const isActiveArticle = article.id === activeArticle?.id;
                          return (
                            <button
                              key={article.id}
                              type="button"
                              onClick={() => selectArticle(category, article)}
                              className={`block w-full px-5 py-2 text-left text-sm transition ${
                                isActiveArticle
                                  ? "border-l-4 border-emerald-600 bg-emerald-50 pl-4 font-black text-emerald-800"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                              }`}
                            >
                              {article.title}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!visibleCategories.length ? (
                <div className="px-4 py-6 text-sm text-slate-400">
                  {tutorialsQuery.isLoading ? "教程加载中..." : "暂无匹配教程"}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 font-bold text-slate-500">
                <span>Excel 教程</span>
                <span>/</span>
                <span>{activeCategory?.name || "请选择分类"}</span>
              </div>
              {activeArticle ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                  {activeArticleIndex + 1}/{activeArticles.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="px-5 py-7 sm:px-8">
            {activeArticle ? (
              <>
                <h2 className="text-4xl font-black tracking-tight text-slate-950">{activeArticle.title}</h2>
                {activeArticle.summary ? (
                  <p className="mt-4 border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-base leading-7 text-slate-700">
                    {activeArticle.summary}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  {activeArticle.audienceTrack ? (
                    <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {trackLabel[activeArticle.audienceTrack] || "通用轨道"}
                    </span>
                  ) : null}
                  {activeArticle.difficulty ? (
                    <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                      {difficultyLabel[activeArticle.difficulty] || "基础难度"}
                    </span>
                  ) : null}
                </div>

                <div className="mt-8 border-t border-slate-200 pt-7">
                  {activeArticle.content ? (
                    <div
                      className="home-tutorial-content space-y-5 text-[16px] leading-8 text-slate-700"
                      dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-400">
                      当前教程暂无正文内容。
                    </div>
                  )}
                </div>

                <div className="mt-8 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!previousArticle}
                    onClick={() => previousArticle && setActiveArticleId(previousArticle.id)}
                    className="flex min-h-16 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-600 transition enabled:hover:border-emerald-300 enabled:hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span>上一篇</span>
                    <span className="truncate">{previousArticle?.title || "无"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!nextArticle}
                    onClick={() => nextArticle && setActiveArticleId(nextArticle.id)}
                    className="flex min-h-16 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-600 transition enabled:hover:border-emerald-300 enabled:hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span>下一篇</span>
                    <span className="truncate">{nextArticle?.title || "无"}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center text-sm text-slate-400">
                {tutorialsQuery.isLoading ? "教程内容加载中..." : "暂无匹配教程内容"}
              </div>
            )}
          </div>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-lg border border-emerald-200 bg-white shadow-sm">
            <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
              学习入口
            </div>
            <div className="space-y-3 p-4">
              {activeArticle?.relatedChapters?.[0] ? (
                <button
                  type="button"
                  onClick={() => navigate(`/practice/chapter/${activeArticle.relatedChapters[0].id}`)}
                  className="flex w-full items-center justify-between rounded-lg bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  关联章节
                  <ArrowRight size={16} />
                </button>
              ) : null}
              {activeArticle?.relatedQuestions?.[0] ? (
                <button
                  type="button"
                  onClick={() => navigate(`/practice/question/${activeArticle.relatedQuestions[0].id}`, { state: { backTo: "/tutorials" } })}
                  className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
                >
                  关联题目
                  <ArrowRight size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate("/practice/chapters")}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                全部章节
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-900">
              教程概览
            </div>
            <div className="space-y-3 p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>分类</span>
                <span className="font-black text-slate-950">{categories.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>教程</span>
                <span className="font-black text-slate-950">{totalArticles}</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>先读教程，再做关联题，适合按函数类型系统学习。</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-900">
              快速分类
            </div>
            <div className="p-3">
              {categories.slice(0, 8).map((category: any) => (
                <button
                  key={`quick-${category.id}`}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setActiveArticleId(category.articles?.[0]?.id || null);
                  }}
                  className="mb-2 mr-2 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </LitePageFrame>
  );
}

const trackLabel: Record<string, string> = {
  beginner: "新手入门",
  advanced: "进阶提升",
  general: "通用轨道",
};

const difficultyLabel: Record<string, string> = {
  basic: "基础",
  medium: "中等",
  advanced: "进阶",
};
