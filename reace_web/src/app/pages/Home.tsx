import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText, Lightbulb, Search } from "lucide-react";
import { motion } from "motion/react";
import { LitePageFrame } from "../components/LiteSurface";
import { api } from "../lib/api";
import { tutorialKeys } from "../lib/query-keys";

export function Home() {
  const tutorialsQuery = useQuery({
    queryKey: tutorialKeys.home(),
    queryFn: () => api.get<any>("/api/tutorials/home", { silent: true }),
  });

  const categories = tutorialsQuery.data?.categories || [];
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<number | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

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
        return {
          ...category,
          articles,
        };
      })
      .filter(Boolean);
  }, [categories, searchKeyword]);

  useEffect(() => {
    if (!visibleCategories.length) {
      setActiveCategoryId(null);
      setActiveArticleId(null);
      setExpandedCategoryId(null);
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
    setExpandedCategoryId((current) =>
      current && visibleCategories.some((item: any) => item.id === current) ? current : nextCategoryId
    );
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

  return (
    <LitePageFrame className="max-w-[1460px]">
      <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/88 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="grid gap-0 xl:grid-cols-[288px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 bg-[linear-gradient(180deg,#f7fbfb_0%,#f1f7fa_100%)] p-4 xl:border-b-0 xl:border-r xl:p-6">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/78 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="px-2 text-[11px] font-black tracking-[0.18em] text-slate-400">首页</div>
              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <Search size={15} className="text-slate-400" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜索函数、场景、公式..."
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </label>
              <div className="mt-3 space-y-2">
                {visibleCategories.map((category: any, index: number) => {
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
                                onClick={() => {
                                  setActiveCategoryId(category.id);
                                  setActiveArticleId(article.id);
                                }}
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

              {!visibleCategories.length ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                  没有匹配到相关函数，换个关键词再试。
                </div>
              ) : null}

              {!categories.length ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                  暂无可展示分类
                </div>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0 p-6">
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
              </div>
            )}
          </div>
        </div>
      </section>
    </LitePageFrame>
  );
}
