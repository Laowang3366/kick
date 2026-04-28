import { useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bold,
  Code2,
  Edit3,
  Eraser,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Minus,
  Quote,
  Strikethrough,
  Table2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  AddButton,
  AdminEmptyState,
  AdminPageShell,
  AdminPermissionNotice,
  AdminSection,
  FilterBar,
  FilterField,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  textareaClassName,
} from "../admin/shared";
import { hasAdminConsoleAccess } from "../admin/config";
import { api, ApiError } from "../lib/api";
import { adminKeys } from "../lib/query-keys";
import { useSession } from "../lib/session";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  onSubmit: () => Promise<void> | void;
  children: ReactNode;
};

const defaultCategoryForm = {
  name: "",
  description: "",
  sortOrder: 0,
  enabled: true,
};

const defaultArticleForm = {
  categoryId: "",
  title: "",
  summary: "",
  oneLineUsage: "",
  content: "",
  audienceTrack: "beginner",
  difficulty: "basic",
  recommendLevel: 1,
  functionTags: "",
  starter: false,
  homeFeatured: false,
  relatedChapterIds: [] as number[],
  relatedQuestionIds: [] as number[],
  sortOrder: 0,
  enabled: true,
};

export function AdminHomeContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isAdmin = hasAdminConsoleAccess(user?.role) && user?.role === "admin";
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [articleOpen, setArticleOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryForm, setCategoryForm] = useState<any>(defaultCategoryForm);
  const [articleForm, setArticleForm] = useState<any>(defaultArticleForm);

  const categoriesQuery = useQuery({
    queryKey: adminKeys.tutorialCategories(),
    enabled: isAdmin,
    queryFn: async () => {
      try {
        return await api.get<any[]>("/api/admin/tutorials/categories", { silent: true });
      } catch (error) {
        handleAdminError(error, navigate);
        return [];
      }
    },
  });
  const articlesQuery = useQuery({
    queryKey: adminKeys.tutorialArticles({ categoryId: categoryFilter }),
    enabled: isAdmin,
    queryFn: async () => {
      try {
        const suffix = categoryFilter ? `?categoryId=${categoryFilter}` : "";
        const result = await api.get<any>(`/api/admin/tutorials/articles${suffix}`, { silent: true });
        return result?.records || [];
      } catch (error) {
        handleAdminError(error, navigate);
        return [];
      }
    },
  });
  const articleLinkOptionsQuery = useQuery({
    queryKey: adminKeys.tutorialLinkOptions(),
    enabled: isAdmin,
    queryFn: async () => {
      try {
        return await api.get<any>("/api/admin/tutorials/link-options", { silent: true });
      } catch (error) {
        handleAdminError(error, navigate);
        return { chapters: [], questions: [] };
      }
    },
  });

  const categories = categoriesQuery.data || [];
  const articles = articlesQuery.data || [];
  const chapterOptions = articleLinkOptionsQuery.data?.chapters || [];
  const questionOptions = articleLinkOptionsQuery.data?.questions || [];
  const categoryOptions = useMemo(
    () => categories.map((item: any) => ({ value: String(item.id), label: item.name })),
    [categories]
  );

  if (!isAdmin) {
    return (
      <AdminPageShell>
        <AdminPermissionNotice message="仅管理员可配置首页内容。" />
      </AdminPageShell>
    );
  }

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.tutorialCategories() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.tutorialArticles({ categoryId: categoryFilter }) }),
    ]);
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(defaultCategoryForm);
    setCategoryOpen(true);
  };

  const openEditCategory = (item: any) => {
    setEditingCategory(item);
    setCategoryForm({
      name: item.name || "",
      description: item.description || "",
      sortOrder: item.sortOrder ?? 0,
      enabled: item.enabled ?? true,
    });
    setCategoryOpen(true);
  };

  const submitCategory = async () => {
    if (!String(categoryForm.name || "").trim()) {
      toast.error("请填写分类名称");
      return;
    }
    try {
      if (editingCategory?.id) {
        await api.put(`/api/admin/tutorials/categories/${editingCategory.id}`, categoryForm);
      } else {
        await api.post("/api/admin/tutorials/categories", categoryForm);
      }
      setCategoryOpen(false);
      await refreshAll();
      toast.success(editingCategory ? "分类已更新" : "分类已创建");
    } catch (error) {
      handleAdminError(error, navigate);
    }
  };

  const deleteCategory = async (item: any) => {
    if (!window.confirm(`确认删除分类“${item.name}”及其下所有教程？`)) {
      return;
    }
    try {
      await api.delete(`/api/admin/tutorials/categories/${item.id}`);
      await refreshAll();
      toast.success("分类已删除");
    } catch (error) {
      handleAdminError(error, navigate);
    }
  };

  const openCreateArticle = () => {
    setEditingArticle(null);
    setArticleForm({
      ...defaultArticleForm,
      categoryId: categoryFilter || categoryOptions[0]?.value || "",
    });
    setArticleOpen(true);
  };

  const openEditArticle = (item: any) => {
    setEditingArticle(item);
    setArticleForm({
      categoryId: String(item.categoryId || ""),
      title: item.title || "",
      summary: item.summary || "",
      oneLineUsage: item.oneLineUsage || "",
      content: item.content || "",
      audienceTrack: item.audienceTrack || "beginner",
      difficulty: item.difficulty || "basic",
      recommendLevel: item.recommendLevel ?? 1,
      functionTags: item.functionTags || "",
      starter: Boolean(item.starter),
      homeFeatured: Boolean(item.homeFeatured),
      relatedChapterIds: item.relatedChapterIds || [],
      relatedQuestionIds: item.relatedQuestionIds || [],
      sortOrder: item.sortOrder ?? 0,
      enabled: item.enabled ?? true,
    });
    setArticleOpen(true);
  };

  const submitArticle = async () => {
    if (!String(articleForm.categoryId || "").trim()) {
      toast.error("请选择所属分类");
      return;
    }
    if (!String(articleForm.title || "").trim()) {
      toast.error("请填写条目标题");
      return;
    }
    try {
      const payload = {
        ...articleForm,
        categoryId: Number(articleForm.categoryId),
        recommendLevel: Number(articleForm.recommendLevel || 0),
      };
      if (editingArticle?.id) {
        await api.put(`/api/admin/tutorials/articles/${editingArticle.id}`, payload);
      } else {
        await api.post("/api/admin/tutorials/articles", payload);
      }
      setArticleOpen(false);
      await refreshAll();
      toast.success(editingArticle ? "条目已更新" : "条目已创建");
    } catch (error) {
      handleAdminError(error, navigate);
    }
  };

  const deleteArticle = async (item: any) => {
    if (!window.confirm(`确认删除条目“${item.title}”？`)) {
      return;
    }
    try {
      await api.delete(`/api/admin/tutorials/articles/${item.id}`);
      await refreshAll();
      toast.success("条目已删除");
    } catch (error) {
      handleAdminError(error, navigate);
    }
  };

  return (
    <AdminPageShell>
      <AdminSection title="首页教程分类" actions={<AddButton onClick={openCreateCategory}>新增分类</AddButton>}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>分类名称</TableHead>
              <TableHead>说明</TableHead>
              <TableHead>条目数</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>启用</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold text-slate-800">{item.name}</TableCell>
                <TableCell className="max-w-[420px] truncate">{item.description || "-"}</TableCell>
                <TableCell>{item.articleCount ?? 0}</TableCell>
                <TableCell>{item.sortOrder ?? 0}</TableCell>
                <TableCell>
                  <AdminTableSwitch
                    checked={Boolean(item.enabled)}
                    onCheckedChange={async (next) => {
                      try {
                        await api.put(`/api/admin/tutorials/categories/${item.id}`, {
                          name: item.name,
                          description: item.description,
                          sortOrder: item.sortOrder,
                          enabled: next,
                        });
                        await refreshAll();
                      } catch (error) {
                        handleAdminError(error, navigate);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEditCategory(item)} className={secondaryButtonClassName()}>
                      <Edit3 size={14} />
                      编辑
                    </button>
                    <button type="button" onClick={() => deleteCategory(item)} className={secondaryButtonClassName()}>
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {categories.length === 0 ? <div className="mt-4"><AdminEmptyState message="暂无首页教程分类。" /></div> : null}
      </AdminSection>

      <AdminSection title="首页教程条目" actions={<AddButton onClick={openCreateArticle} disabled={!categoryOptions.length}>新增条目</AddButton>}>
        <FilterBar>
          <FilterField label="分类筛选">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClassName()}>
              <option value="">全部分类</option>
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FilterField>
        </FilterBar>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
              <TableHead>所属分类</TableHead>
              <TableHead>轨道 / 难度</TableHead>
              <TableHead>关联练习</TableHead>
              <TableHead>摘要</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>启用</TableHead>
              <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-bold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-400">ID {item.id}</div>
                  </TableCell>
                  <TableCell>{item.categoryName || "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-slate-700">{audienceTrackLabel[item.audienceTrack] || "通用"}</div>
                    <div className="mt-1 text-xs text-slate-400">{difficultyLabel[item.difficulty] || "基础"}</div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    章节 {item.relatedChapterIds?.length || 0} / 题目 {item.relatedQuestionIds?.length || 0}
                  </TableCell>
                  <TableCell className="max-w-[420px] truncate">{item.summary || "暂无摘要"}</TableCell>
                  <TableCell>{item.sortOrder ?? 0}</TableCell>
                  <TableCell>
                    <AdminTableSwitch
                      checked={Boolean(item.enabled)}
                      onCheckedChange={async (next) => {
                        try {
                          await api.put(`/api/admin/tutorials/articles/${item.id}`, {
                            categoryId: item.categoryId,
                            title: item.title,
                            summary: item.summary,
                            oneLineUsage: item.oneLineUsage,
                            content: item.content,
                            audienceTrack: item.audienceTrack,
                            difficulty: item.difficulty,
                            recommendLevel: item.recommendLevel,
                            functionTags: item.functionTags,
                            starter: item.starter,
                            homeFeatured: item.homeFeatured,
                            relatedChapterIds: item.relatedChapterIds || [],
                            relatedQuestionIds: item.relatedQuestionIds || [],
                            sortOrder: item.sortOrder,
                            enabled: next,
                          });
                          await refreshAll();
                        } catch (error) {
                          handleAdminError(error, navigate);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEditArticle(item)} className={secondaryButtonClassName()}>
                        <Edit3 size={14} />
                        编辑
                      </button>
                      <button type="button" onClick={() => deleteArticle(item)} className={secondaryButtonClassName()}>
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {articles.length === 0 ? <div className="mt-4"><AdminEmptyState message="暂无首页教程条目。" /></div> : null}
        </div>
      </AdminSection>

      <FormDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        title={editingCategory ? "编辑首页分类" : "新增首页分类"}
        description="分类用于组织首页教程的父级容器。"
        submitLabel={editingCategory ? "保存分类" : "创建分类"}
        onSubmit={submitCategory}
      >
        <Field label="分类名称">
          <input value={categoryForm.name} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, name: e.target.value }))} className={inputClassName()} />
        </Field>
        <Field label="分类说明">
          <textarea value={categoryForm.description} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, description: e.target.value }))} className={textareaClassName()} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="排序">
            <input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((prev: any) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))} className={inputClassName()} />
          </Field>
          <AdminFormSwitch
            label="启用该分类"
            checked={Boolean(categoryForm.enabled)}
            onCheckedChange={(next) => setCategoryForm((prev: any) => ({ ...prev, enabled: next }))}
          />
        </div>
      </FormDialog>

      <FormDialog
        open={articleOpen}
        onOpenChange={setArticleOpen}
        title={editingArticle ? "编辑首页条目" : "新增首页条目"}
        description="条目会作为分类下的子级内容展示到首页。"
        submitLabel={editingArticle ? "保存条目" : "创建条目"}
        onSubmit={submitArticle}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="所属分类">
            <select value={articleForm.categoryId} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, categoryId: e.target.value }))} className={inputClassName()}>
              <option value="">请选择</option>
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="排序">
            <input type="number" value={articleForm.sortOrder} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))} className={inputClassName()} />
          </Field>
        </div>
        <Field label="条目标题">
          <input value={articleForm.title} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, title: e.target.value }))} className={inputClassName()} />
        </Field>
        <Field label="一句话用途">
          <input value={articleForm.oneLineUsage} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, oneLineUsage: e.target.value }))} className={inputClassName()} />
        </Field>
        <Field label="摘要">
          <textarea value={articleForm.summary} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, summary: e.target.value }))} className={textareaClassName()} />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="学习轨道">
            <select value={articleForm.audienceTrack} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, audienceTrack: e.target.value }))} className={inputClassName()}>
              {Object.entries(audienceTrackLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="难度等级">
            <select value={articleForm.difficulty} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, difficulty: e.target.value }))} className={inputClassName()}>
              {Object.entries(difficultyLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="推荐权重">
            <input type="number" value={articleForm.recommendLevel} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, recommendLevel: Number(e.target.value || 0) }))} className={inputClassName()} />
          </Field>
        </div>
        <Field label="函数标签">
          <input value={articleForm.functionTags} onChange={(e) => setArticleForm((prev: any) => ({ ...prev, functionTags: e.target.value }))} placeholder="例如：SUM, AVERAGE" className={inputClassName()} />
        </Field>
        <div className="block">
          <div className="mb-1.5 text-sm font-bold text-slate-700">正文内容</div>
          <TutorialContentEditor
            value={articleForm.content}
            onChange={(next) => setArticleForm((prev: any) => ({ ...prev, content: next }))}
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Field label="关联章节">
            <div className="max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="space-y-2">
                {chapterOptions.map((item: any) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={articleForm.relatedChapterIds.includes(item.id)}
                      onChange={(event) =>
                        setArticleForm((prev: any) => ({
                          ...prev,
                          relatedChapterIds: toggleId(prev.relatedChapterIds, item.id, event.target.checked),
                        }))
                      }
                    />
                    <span>
                      <span className="block font-semibold text-slate-800">{item.name}</span>
                      {item.description ? <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span> : null}
                    </span>
                  </label>
                ))}
                {chapterOptions.length === 0 ? <div className="text-sm text-slate-400">暂无可关联章节</div> : null}
              </div>
            </div>
          </Field>
          <Field label="关联题目">
            <div className="max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="space-y-2">
                {questionOptions.map((item: any) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={articleForm.relatedQuestionIds.includes(item.id)}
                      onChange={(event) =>
                        setArticleForm((prev: any) => ({
                          ...prev,
                          relatedQuestionIds: toggleId(prev.relatedQuestionIds, item.id, event.target.checked),
                        }))
                      }
                    />
                    <span className="block font-semibold text-slate-800">{item.title}</span>
                  </label>
                ))}
                {questionOptions.length === 0 ? <div className="text-sm text-slate-400">暂无可关联题目</div> : null}
              </div>
            </div>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormSwitch
            label="标记为新手起步内容"
            checked={Boolean(articleForm.starter)}
            onCheckedChange={(next) => setArticleForm((prev: any) => ({ ...prev, starter: next }))}
          />
          <AdminFormSwitch
            label="在首页优先展示"
            checked={Boolean(articleForm.homeFeatured)}
            onCheckedChange={(next) => setArticleForm((prev: any) => ({ ...prev, homeFeatured: next }))}
          />
        </div>
        <AdminFormSwitch
          label="启用该条目"
          checked={Boolean(articleForm.enabled)}
          onCheckedChange={(next) => setArticleForm((prev: any) => ({ ...prev, enabled: next }))}
        />
      </FormDialog>
    </AdminPageShell>
  );
}

type ContentEditorMode = "content" | "preview" | "split";

function TutorialContentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [mode, setMode] = useState<ContentEditorMode>("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceValue = value || "";
  const lineCount = Math.max(1, sourceValue.split(/\r\n|\r|\n/).length);

  const focusEditor = (start?: number, end?: number) => {
    window.setTimeout(() => {
      const editor = textareaRef.current;
      if (!editor) return;
      editor.focus();
      if (typeof start === "number") {
        editor.selectionStart = start;
        editor.selectionEnd = typeof end === "number" ? end : start;
      }
    }, 0);
  };

  const updateSource = (next: string, start?: number, end?: number) => {
    if (mode === "preview") {
      setMode("content");
    }
    onChange(next);
    focusEditor(start, end);
  };

  const wrapSelection = (before: string, after: string, fallback: string) => {
    const editor = textareaRef.current;
    const start = editor?.selectionStart ?? sourceValue.length;
    const end = editor?.selectionEnd ?? sourceValue.length;
    const selected = sourceValue.slice(start, end) || fallback;
    const next = `${sourceValue.slice(0, start)}${before}${selected}${after}${sourceValue.slice(end)}`;
    const cursorStart = start + before.length;
    updateSource(next, cursorStart, cursorStart + selected.length);
  };

  const insertBlock = (snippet: string, cursorOffset?: number) => {
    const editor = textareaRef.current;
    const start = editor?.selectionStart ?? sourceValue.length;
    const end = editor?.selectionEnd ?? sourceValue.length;
    const prefix = start > 0 && !sourceValue.slice(0, start).endsWith("\n") ? "\n" : "";
    const suffix = snippet.endsWith("\n") ? "" : "\n";
    const block = `${prefix}${snippet}${suffix}`;
    const next = `${sourceValue.slice(0, start)}${block}${sourceValue.slice(end)}`;
    const cursor = start + prefix.length + (cursorOffset ?? snippet.length);
    updateSource(next, cursor);
  };

  const actions: Array<{ label: string; icon: LucideIcon; onClick: () => void }> = [
    { label: "加粗", icon: Bold, onClick: () => wrapSelection("<strong>", "</strong>", "重点文字") },
    { label: "斜体", icon: Italic, onClick: () => wrapSelection("<em>", "</em>", "强调文字") },
    { label: "删除线", icon: Strikethrough, onClick: () => wrapSelection("<s>", "</s>", "删除文字") },
    { label: "标题", icon: Heading2, onClick: () => insertBlock("<h2>小标题</h2>\n<p>这里填写正文。</p>", 4) },
    { label: "列表", icon: List, onClick: () => insertBlock("<ul>\n  <li>列表项</li>\n</ul>", 12) },
    { label: "引用", icon: Quote, onClick: () => insertBlock("<blockquote>引用内容</blockquote>", 12) },
    { label: "链接", icon: Link2, onClick: () => wrapSelection('<a href="https://example.com">', "</a>", "链接文本") },
    { label: "图片", icon: ImageIcon, onClick: () => insertBlock('<img src="/uploads/example.png" alt="图片说明" />', 10) },
    { label: "代码块", icon: Code2, onClick: () => insertBlock("<pre><code>=SUM(A1:A10)</code></pre>", 11) },
    {
      label: "表格",
      icon: Table2,
      onClick: () =>
        insertBlock(
          "<table>\n  <thead><tr><th>字段</th><th>说明</th></tr></thead>\n  <tbody><tr><td>示例</td><td>内容</td></tr></tbody>\n</table>",
          22
        ),
    },
    { label: "分割线", icon: Minus, onClick: () => insertBlock("<hr />") },
    { label: "清空", icon: Eraser, onClick: () => updateSource("") },
  ];

  const editorTabs: Array<{ key: ContentEditorMode; label: string }> = [
    { key: "content", label: "内容" },
    { key: "preview", label: "预览" },
    { key: "split", label: "对照" },
  ];

  const renderToolbar = () => (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          title={label}
          onClick={onClick}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm"
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );

  const renderSourcePane = (compact = false) => (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {renderToolbar()}
      <div className="grid grid-cols-[48px_minmax(0,1fr)]">
        <div className="select-none border-r border-slate-100 bg-slate-50 px-3 py-3 text-right font-mono text-xs leading-6 text-slate-400">
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={sourceValue}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full resize-y border-0 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-300 ${compact ? "min-h-[320px]" : "min-h-[360px]"}`}
          placeholder={"<h2>作用</h2>\n<p>直接输入教程正文，预览页会显示标签效果。</p>"}
        />
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 pt-3">
        <div className="flex items-center gap-4">
          {editorTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              className={`border-b-2 px-1 pb-3 text-sm font-bold transition ${
                mode === item.key
                  ? "border-slate-950 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="pb-3 text-xs font-semibold text-slate-500">支持 HTML 标签渲染</div>
      </div>

      <div className="p-4">
        {mode === "content" ? renderSourcePane() : null}
        {mode === "preview" ? <TutorialHtmlPreview value={sourceValue} /> : null}
        {mode === "split" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {renderSourcePane(true)}
            <TutorialHtmlPreview value={sourceValue} compact />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TutorialHtmlPreview({ value, compact = false }: { value: string; compact?: boolean }) {
  if (!value.trim()) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 ${compact ? "min-h-[320px]" : "min-h-[360px]"}`}>
        暂无正文内容
      </div>
    );
  }

  return (
    <div
      className={`overflow-auto rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700 shadow-inner [&_a]:font-semibold [&_a]:text-emerald-700 [&_blockquote]:mt-4 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-400 [&_blockquote]:bg-emerald-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_code]:font-mono [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-slate-950 [&_hr]:my-5 [&_hr]:border-slate-200 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-xl [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-7 [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-slate-100 [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 ${compact ? "min-h-[320px]" : "min-h-[360px]"}`}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(840px,calc(100vw-2rem))] flex-col overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">{children}</div>
        </div>
        <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4">
          <button type="button" onClick={() => onOpenChange(false)} className={secondaryButtonClassName()}>
            取消
          </button>
          <button type="button" onClick={() => void onSubmit()} className={primaryButtonClassName()}>
            {submitLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function AdminFormSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex h-11 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function AdminTableSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span className={`text-xs font-bold ${checked ? "text-emerald-600" : "text-slate-400"}`}>
        {checked ? "已启用" : "未启用"}
      </span>
    </div>
  );
}

function handleAdminError(error: unknown, navigate: ReturnType<typeof useNavigate>) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      navigate("/auth");
      return;
    }
    if (error.status === 403) {
      navigate("/admin/overview");
      return;
    }
    toast.error(error.message || "后台请求失败");
    return;
  }
  toast.error("后台请求失败");
}

const audienceTrackLabel: Record<string, string> = {
  beginner: "新手入门",
  advanced: "进阶提升",
  general: "通用",
};

const difficultyLabel: Record<string, string> = {
  basic: "基础",
  medium: "中等",
  advanced: "进阶",
};

function toggleId(values: number[], id: number, checked: boolean) {
  const next = new Set(values || []);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return Array.from(next);
}
