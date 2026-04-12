import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBeforeUnload, useBlocker, useLocation, useNavigate } from "react-router";
import { 
  ChevronLeft, Send, UploadCloud, Info, Plus, ChevronDown, Settings, Save,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  ImageIcon, Link as LinkIcon, Code, Table, Undo, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { openGlobalConfirm, openGlobalPrompt } from "../components/GlobalConfirmPromptDialog";
import { api } from "../lib/api";
import { adminKeys, boardKeys, draftKeys, postKeys, profileKeys } from "../lib/query-keys";
import { highlightCodeSyntax, renderRichContent } from "../lib/rich-content";
import { normalizeImageUrl, normalizeResourceUrl, parseAttachments, parseTags } from "../lib/mappers";
import { useSession } from "../lib/session";

export function CreatePost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const draftQueryId = searchParams.get("draft");
  const postQueryId = searchParams.get("post");
  const parsedPostId = postQueryId ? Number(postQueryId) : null;
  const isEditMode = parsedPostId !== null && Number.isFinite(parsedPostId);
  const editingPostId = isEditMode ? parsedPostId : null;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [bounty, setBounty] = useState(0);
  const [selectedBoard, setSelectedBoard] = useState("选择板块");
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<{ url: string; name?: string }[]>([]);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingPaste, setUploadingPaste] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [autosaveCountdown, setAutosaveCountdown] = useState(60);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorSelectionRef = useRef<Range | null>(null);
  const boardMenuRef = useRef<HTMLDivElement | null>(null);
  const hydratedRef = useRef(false);
  const contentHistoryRef = useRef<string[]>([""]);
  const lastSavedSnapshotRef = useRef("");
  const allowNavigationRef = useRef(false);
  const autosaveTickingRef = useRef(false);
  const { isAuthenticated, user } = useSession();
  const previewHtml = useMemo(() => content || renderRichContent(""), [content]);
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        content,
        bounty,
        selectedBoardId,
        selectedTags: [...selectedTags].sort(),
        attachments: attachments.map((item) => item.url).sort(),
      }),
    [attachments, bounty, content, selectedBoardId, selectedTags, title]
  );
  const isDraftEmpty = useMemo(
    () =>
      !title.trim() &&
      !hasMeaningfulEditorContent(content) &&
      !selectedBoardId &&
      attachments.length === 0 &&
      selectedTags.length === 0,
    [attachments.length, content, selectedBoardId, selectedTags.length, title]
  );
  const hasUnsavedChanges = hydratedRef.current && currentSnapshot !== lastSavedSnapshotRef.current;

  const hotTags = ["VBA", "Power Query", "函数公式", "图表", "数据透视表", "条件格式", "宏", "SQL", "M语言", "求助", "分享", "教程"];
  const categoriesQuery = useQuery({
    queryKey: adminKeys.categories(),
    queryFn: () => api.get<any[]>("/api/categories", { auth: false, silent: true }),
  });
  const editingPostQuery = useQuery({
    queryKey: postKeys.detail(editingPostId || "none"),
    enabled: Boolean(isEditMode && editingPostId),
    queryFn: () => api.get<{ post: any }>(`/api/posts/${editingPostId}`, { silent: true }),
    retry: false,
  });
  const draftDetailQuery = useQuery({
    queryKey: draftKeys.detail(draftQueryId || "none"),
    enabled: Boolean(!isEditMode && draftQueryId),
    queryFn: () => api.get<{ draft: any }>(`/api/drafts/${draftQueryId}`, { silent: true }),
    retry: false,
  });
  const categories = categoriesQuery.data || [];

  useEffect(() => {
    if (isEditMode && editingPostId) {
      if (editingPostQuery.isError) {
        navigate(postQueryId ? `/post/${postQueryId}` : "/");
        return;
      }
      if (!editingPostQuery.data?.post) return;
      const post = editingPostQuery.data.post;
      setDraftId(null);
      setTitle(post.title || "");
      setContent(normalizeEditorContent(post.content || ""));
      setBounty(post.rewardPoints || 0);
      setSelectedBoardId(post.category?.id || post.categoryId || null);
      setSelectedTags(parseTags(post.tags));
      setAttachments(parseAttachments(post.attachments));
      lastSavedSnapshotRef.current = JSON.stringify({
        title: (post.title || "").trim(),
        content: normalizeEditorContent(post.content || ""),
        bounty: post.rewardPoints || 0,
        selectedBoardId: post.category?.id || post.categoryId || null,
        selectedTags: parseTags(post.tags).sort(),
        attachments: parseAttachments(post.attachments).map((item) => item.url).sort(),
      });
      hydratedRef.current = true;
      return;
    }

    if (!draftQueryId) {
      lastSavedSnapshotRef.current = JSON.stringify({
        title: "",
        content: "",
        bounty: 0,
        selectedBoardId: null,
        selectedTags: [],
        attachments: [],
      });
      hydratedRef.current = true;
      return;
    }
    if (draftDetailQuery.isError) {
      hydratedRef.current = true;
      return;
    }
    if (!draftDetailQuery.data?.draft) return;
    const draft = draftDetailQuery.data.draft;
    setDraftId(draft.id);
    setTitle(draft.title || "");
    setContent(normalizeEditorContent(draft.content || ""));
    setBounty(draft.rewardPoints || 0);
    setSelectedBoardId(draft.categoryId || null);
    setSelectedTags(parseTags(draft.tags));
    setAttachments(parseAttachments(draft.attachments));
    lastSavedSnapshotRef.current = JSON.stringify({
      title: (draft.title || "").trim(),
      content: normalizeEditorContent(draft.content || ""),
      bounty: draft.rewardPoints || 0,
      selectedBoardId: draft.categoryId || null,
      selectedTags: parseTags(draft.tags).sort(),
      attachments: parseAttachments(draft.attachments).map((item) => item.url).sort(),
    });
    hydratedRef.current = true;
  }, [draftDetailQuery.data?.draft, draftDetailQuery.isError, draftQueryId, editingPostId, editingPostQuery.data?.post, editingPostQuery.isError, isEditMode, navigate, postQueryId]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigationRef.current &&
      hasUnsavedChanges &&
      currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      openGlobalConfirm({ message: "当前内容尚未保存，确定要离开吗？" }).then((confirmed) => {
        if (blocker.state !== "blocked") return;
        if (confirmed) {
          allowNavigationRef.current = true;
          blocker.proceed();
        } else {
          blocker.reset();
        }
      });
    }
  }, [blocker]);

  useBeforeUnload(
    (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    },
    { capture: true }
  );

  useEffect(() => {
    if (!selectedBoardId || categories.length === 0) return;
    const board = categories.find((item) => item.id === selectedBoardId);
    setSelectedBoard(board?.name || "选择板块");
  }, [selectedBoardId, categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(event.target as Node)) {
        setBoardMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
      highlightEditorCodeBlocks();
    }
  }, [content]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        handleToolbarAction("加粗");
      } else if (key === "i") {
        event.preventDefault();
        handleToolbarAction("斜体");
      } else if (key === "k") {
        event.preventDefault();
        handleToolbarAction("插入链接");
      } else if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleToolbarAction("撤销");
      } else if (key === "s") {
        event.preventDefault();
        persistDraftNow(true).catch(() => undefined);
      }
    };

    editor.addEventListener("keydown", handleKeyDown);
    return () => editor.removeEventListener("keydown", handleKeyDown);
  }, [content, draftId, attachments, bounty, isAuthenticated, selectedBoardId, selectedTags, title]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handlePaste = async (event: ClipboardEvent) => {
      if (!isAuthenticated) return;
      const items = Array.from(event.clipboardData?.items || []);
      const imageItems = items.filter((item) => item.kind === "file" && item.type.startsWith("image/"));
      if (imageItems.length === 0) return;

      event.preventDefault();
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length === 0) return;
      saveEditorSelection();
      setUploadingPaste(true);
      try {
        let successCount = 0;
        for (const file of files) {
          const inserted = await uploadInlineImageFile(file);
          if (inserted) {
            successCount += 1;
          }
        }
        if (successCount > 0) {
          toast.success(`已粘贴并插入 ${successCount} 张图片`);
        }
      } finally {
        setUploadingPaste(false);
      }
    };

    editor.addEventListener("paste", handlePaste);
    return () => editor.removeEventListener("paste", handlePaste);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const history = contentHistoryRef.current;
    if (history[history.length - 1] !== content) {
      contentHistoryRef.current = [...history.slice(-49), content];
    }
  }, [content]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!hasUnsavedChanges) {
      setAutosaveCountdown(60);
      return;
    }
    setAutosaveCountdown(60);
  }, [currentSnapshot, hasUnsavedChanges]);

  useEffect(() => {
    if (isEditMode || !hydratedRef.current || !isAuthenticated || !hasUnsavedChanges || isDraftEmpty) {
      autosaveTickingRef.current = false;
      return;
    }

    autosaveTickingRef.current = true;
    const timer = window.setInterval(() => {
      setAutosaveCountdown((prev) => {
        if (prev <= 1) {
          if (!savingDraft && autosaveTickingRef.current) {
            persistDraftNow(false).catch(() => undefined);
          }
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      autosaveTickingRef.current = false;
      window.clearInterval(timer);
    };
  }, [hasUnsavedChanges, isAuthenticated, isDraftEmpty, isEditMode, savingDraft]);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (!title.trim() || !hasMeaningfulEditorContent(content)) {
      toast.error("请完善标题和内容");
      return;
    }
    if (!selectedBoardId) {
      toast.error("请选择板块");
      return;
    }
    if (bounty > (user?.points ?? 0)) {
      toast.error("悬赏积分不能超过当前余额");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        content,
        categoryId: selectedBoardId,
        rewardPoints: bounty,
        tags: selectedTags,
        attachments,
      };
      const result = isEditMode && editingPostId
        ? await api.put<{ message: string }>(`/api/posts/${editingPostId}`, payload)
        : draftId
          ? await api.post<{ id: number; message: string }>(`/api/drafts/${draftId}/publish`, undefined)
          : await api.post<{ id: number; message: string }>("/api/posts", payload);
      lastSavedSnapshotRef.current = currentSnapshot;
      allowNavigationRef.current = true;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardKeys.posts({ categoryId: selectedBoardId, sort: "latest", keyword: "" }) }),
        queryClient.invalidateQueries({ queryKey: profileKeys.tab("posts") }),
        queryClient.invalidateQueries({ queryKey: profileKeys.tab("drafts") }),
      ]);
      if (draftId) {
        await queryClient.invalidateQueries({ queryKey: draftKeys.all });
      }
      if (isEditMode && editingPostId) {
        await queryClient.invalidateQueries({ queryKey: postKeys.detail(editingPostId) });
      }
      toast.success(result.message || (isEditMode ? "帖子修改成功！" : "帖子发布成功！"));
      navigate(`/post/${isEditMode && editingPostId ? editingPostId : result.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFiles = async (files: Iterable<File>) => {
    if (!isAuthenticated) {
      navigate("/auth");
      return [];
    }

    const uploaded: { url: string; name?: string }[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.post<{ url: string }>("/api/upload", formData);
      uploaded.push({ url: result.url, name: file.name });
    }
    return uploaded;
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploaded = await uploadFiles(files);
    if (uploaded.length === 0) return;
    setAttachments((prev) => [...prev, ...uploaded]);
    toast.success(`已上传 ${uploaded.length} 个附件`);
  };

  const persistDraftNow = async (notify: boolean) => {
    if (isEditMode || !hydratedRef.current || !isAuthenticated) return;
    if (isDraftEmpty) return;

    const payload = {
      title,
      content,
      categoryId: selectedBoardId,
      rewardPoints: bounty,
      tags: selectedTags,
      attachments,
    };

    setSavingDraft(true);
    try {
      if (draftId) {
        await api.put(`/api/drafts/${draftId}`, payload, { silent: !notify });
      } else {
        const result = await api.post<{ id: number }>("/api/drafts", payload, { silent: !notify });
        setDraftId(result.id);
      }
      lastSavedSnapshotRef.current = JSON.stringify({
        title: title.trim(),
        content,
        bounty,
        selectedBoardId,
        selectedTags: [...selectedTags].sort(),
        attachments: attachments.map((item) => item.url).sort(),
      });
      if (notify) {
        toast.success("草稿已保存");
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: draftKeys.all }),
        queryClient.invalidateQueries({ queryKey: profileKeys.tab("drafts") }),
        queryClient.invalidateQueries({ queryKey: profileKeys.overview() }),
      ]);
      setAutosaveCountdown(60);
    } catch {
      if (notify) {
        toast.error("草稿保存失败");
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((item) => item.url !== url));
  };

  const insertAttachmentIntoContent = (attachment: { url: string; name?: string }) => {
    const displayName = escapeHtml(attachment.name || "附件");
    const resourceUrl = normalizeResourceUrl(attachment.url);
    if (isImageAttachment(attachment.url)) {
      insertHtmlAtCursor(`<img src="${resourceUrl}" alt="${displayName}" style="max-width:100%;border-radius:16px;border:1px solid #e2e8f0;margin:12px 0;" />`);
    } else {
      insertHtmlAtCursor(`<a href="${resourceUrl}" target="_blank" rel="noreferrer" style="color:#0f766e;text-decoration:underline;">${displayName}</a>`);
    }
    toast.success("已插入到正文");
  };

  const handleInlineImageSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadingInlineImage(true);
    try {
      const inserted = await uploadInlineImageFile(file);
      if (inserted) {
        toast.success("图片已上传并插入正文");
      } else {
        toast.error("图片上传失败");
      }
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) {
        inlineImageInputRef.current.value = "";
      }
    }
  };

  const syncEditorContent = () => {
    setContent(editorRef.current?.innerHTML || "");
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const saveEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      editorSelectionRef.current = range.cloneRange();
    }
  };

  const restoreEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;

    focusEditor();
    selection.removeAllRanges();

    if (editorSelectionRef.current) {
      selection.addRange(editorSelectionRef.current.cloneRange());
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
  };

  const applyCommand = (command: string, value?: string) => {
    focusEditor();
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  const insertHtmlAtCursor = (html: string) => {
    restoreEditorSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const container = document.createElement("div");
    container.innerHTML = html;
    const fragment = document.createDocumentFragment();
    let lastNode: ChildNode | null = null;

    while (container.firstChild) {
      lastNode = fragment.appendChild(container.firstChild);
    }

    range.insertNode(fragment);

    if (lastNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      editorSelectionRef.current = nextRange.cloneRange();
    } else {
      saveEditorSelection();
    }

    syncEditorContent();
    highlightEditorCodeBlocks();
  };

  const insertInlineImageIntoContent = (attachment: { url: string; name?: string }) => {
    const displayName = escapeHtml(attachment.name || "图片");
    const resourceUrl = normalizeResourceUrl(attachment.url);
    insertHtmlAtCursor(`<img src="${resourceUrl}" alt="${displayName}" style="max-width:100%;border-radius:16px;border:1px solid #e2e8f0;margin:12px 0;display:block;" />`);
  };

  const uploadInlineImageFile = async (file: File) => {
    const uploadId = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previewUrl = URL.createObjectURL(file);

    try {
      insertInlineImagePreview({
        uploadId,
        previewUrl,
        name: file.name,
      });
      const uploaded = await uploadFiles([file]);
      if (uploaded.length === 0) {
        removeInlineImagePreview(uploadId);
        return false;
      }
      replaceInlineImagePreview(uploadId, uploaded[0]);
      return true;
    } catch {
      removeInlineImagePreview(uploadId);
      return false;
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const insertInlineImagePreview = ({ uploadId, previewUrl, name }: { uploadId: string; previewUrl: string; name?: string }) => {
    const displayName = escapeHtml(name || "图片");
    insertHtmlAtCursor(
      `<img data-inline-upload-id="${uploadId}" data-inline-uploading="true" src="${previewUrl}" alt="${displayName}" style="max-width:100%;border-radius:16px;border:1px dashed #94a3b8;margin:12px 0;display:block;opacity:0.8;background:#f8fafc;" />`
    );
  };

  const replaceInlineImagePreview = (uploadId: string, attachment: { url: string; name?: string }) => {
    const editor = editorRef.current;
    if (!editor) return;
    const image = editor.querySelector(`img[data-inline-upload-id="${uploadId}"]`) as HTMLImageElement | null;
    if (!image) {
      insertInlineImageIntoContent(attachment);
      return;
    }
    image.src = normalizeResourceUrl(attachment.url);
    image.alt = attachment.name || image.alt || "图片";
    image.style.border = "1px solid #e2e8f0";
    image.style.opacity = "1";
    image.removeAttribute("data-inline-upload-id");
    image.removeAttribute("data-inline-uploading");
    syncEditorContent();
  };

  const removeInlineImagePreview = (uploadId: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const image = editor.querySelector(`img[data-inline-upload-id="${uploadId}"]`);
    image?.remove();
    syncEditorContent();
  };

  const handleToolbarAction = (label: string) => {
    switch (label) {
      case "加粗":
        applyCommand("bold");
        return;
      case "斜体":
        applyCommand("italic");
        return;
      case "下划线":
        applyCommand("underline");
        return;
      case "删除线":
        applyCommand("strikeThrough");
        return;
      case "左对齐":
        applyCommand("justifyLeft");
        return;
      case "居中":
        applyCommand("justifyCenter");
        return;
      case "右对齐":
        applyCommand("justifyRight");
        return;
      case "插入图片": {
        saveEditorSelection();
        inlineImageInputRef.current?.click();
        return;
      }
      case "插入链接": {
        saveEditorSelection();
        openGlobalPrompt({ title: "插入链接", label: "链接地址", placeholder: "请输入链接地址", required: true }).then((linkUrl) => {
          if (!linkUrl) return;
          const normalizedLinkUrl = normalizeResourceUrl(linkUrl);
          const selection = window.getSelection()?.toString();
          if (selection) {
            applyCommand("createLink", normalizedLinkUrl);
            return;
          }
          openGlobalPrompt({ title: "插入链接", label: "链接文字", placeholder: "请输入链接文字", defaultValue: "链接" }).then((text) => {
            insertHtmlAtCursor(`<a href="${normalizedLinkUrl}" target="_blank" rel="noreferrer" style="color:#0f766e;text-decoration:underline;">${escapeHtml(text || "链接")}</a>`);
          });
        });
        return;
      }
      case "代码块":
        insertHtmlAtCursor(`<pre style="background:#0f172a;color:#f8fafc;border-radius:16px;padding:16px;overflow:auto;margin:12px 0;"><code data-code-block="true" style="display:block;white-space:pre-wrap;outline:none;">代码块</code></pre><p><br></p>`);
        return;
      case "插入表格":
        insertHtmlAtCursor(`<table style="width:100%;border-collapse:collapse;margin:12px 0;"><thead><tr><th style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">列1</th><th style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">列2</th><th style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">列3</th></tr></thead><tbody><tr><td style="border:1px solid #cbd5e1;padding:8px;">内容1</td><td style="border:1px solid #cbd5e1;padding:8px;">内容2</td><td style="border:1px solid #cbd5e1;padding:8px;">内容3</td></tr></tbody></table><p><br></p>`);
        return;
      case "撤销": {
        applyCommand("undo");
        return;
      }
      case "清空内容":
        openGlobalConfirm({ message: "确认清空正文内容吗？" }).then((confirmed) => {
          if (!confirmed) return;
          setContent("");
          contentHistoryRef.current = [""];
          if (editorRef.current) {
            editorRef.current.innerHTML = "";
          }
        });
        return;
      default:
        return;
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    openGlobalPrompt({ title: "添加标签", label: "标签名称", placeholder: "请输入新标签", required: true }).then((tag) => {
      if (!tag) return;
      const normalized = tag.trim();
      if (!normalized) return;
      if (selectedTags.includes(normalized)) {
        toast.info("该标签已添加");
        return;
      }
      setSelectedTags((prev) => [...prev, normalized]);
    });
  };

  const formatTools = [
    { icon: Bold, label: "加粗" },
    { icon: Italic, label: "斜体" },
    { icon: Underline, label: "下划线" },
    { icon: Strikethrough, label: "删除线" },
  ];

  const alignTools = [
    { icon: AlignLeft, label: "左对齐" },
    { icon: AlignCenter, label: "居中" },
    { icon: AlignRight, label: "右对齐" },
  ];

  const insertTools = [
    { icon: ImageIcon, label: "插入图片" },
    { icon: LinkIcon, label: "插入链接" },
    { icon: Code, label: "代码块" },
    { icon: Table, label: "插入表格" },
  ];

  const actionTools = [
    { icon: Undo, label: "撤销" },
    { icon: Trash2, label: "清空内容", danger: true },
  ];

  const renderTool = ({ icon: Icon, label, danger }: any) => (
    <button 
      key={label}
      type="button"
      onClick={() => handleToolbarAction(label)}
      className={`group relative p-1.5 rounded transition-colors flex items-center justify-center ${
        danger ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-200'
      }`}
    >
      <Icon size={16} strokeWidth={1.5} />
      {/* Tooltip */}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[11px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-sm font-medium tracking-wide">
        {label}
      </span>
    </button>
  );

  const highlightEditorCodeBlocks = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const codeBlocks = Array.from(editor.querySelectorAll("code[data-code-block='true']"));
    codeBlocks.forEach((block) => {
      const codeElement = block as HTMLElement;
      const text = codeElement.innerText.replace(/\u00a0/g, " ");
      const selection = window.getSelection();
      const isActive = selection?.anchorNode && codeElement.contains(selection.anchorNode);
      const offset = isActive ? getCaretCharacterOffsetWithin(codeElement) : null;
      codeElement.innerHTML = highlightCodeSyntax(text);
      if (offset !== null) {
        restoreCaretToCodeBlock(codeElement, offset);
      }
    });
    setContent(editor.innerHTML);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-800 pb-10 flex flex-col">
      {/* Top Navigation - Minimalist */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shrink-0">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (!hasUnsavedChanges) {
                  allowNavigationRef.current = true;
                  navigate(-1);
                  return;
                }
                openGlobalConfirm({ message: "当前内容尚未保存，确定要离开吗？" }).then((confirmed) => {
                  if (!confirmed) return;
                  allowNavigationRef.current = true;
                  navigate(-1);
                });
              }}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
            <div className="h-4 w-px bg-gray-300"></div>
            <h1 className="text-[16px] font-bold text-slate-800 tracking-wide">{isEditMode ? "编辑帖子" : "创作新主贴"}</h1>
            <span className="text-[12px] font-medium text-slate-400 px-2 py-0.5 bg-gray-100 rounded">
              {isEditMode
                ? (hasUnsavedChanges ? "有未保存修改" : "修改已保存")
                : savingDraft
                  ? "草稿保存中..."
                  : hasUnsavedChanges
                    ? `${autosaveCountdown}s 后自动保存`
                    : "草稿已保存"}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => persistDraftNow(true)}
              disabled={isEditMode || savingDraft || !hasUnsavedChanges}
              className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Save size={16} strokeWidth={1.5} />
              保存草稿
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 text-[14px] font-bold text-white bg-[#3b82f6] hover:bg-blue-600 rounded-lg shadow-sm transition-all"
            >
              <Send size={16} strokeWidth={1.5} /> {submitting ? (isEditMode ? "保存中..." : "发布中...") : (isEditMode ? "保存修改" : "发布帖子")}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={inlineImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleInlineImageSelect(e.target.files)}
      />

      {/* Main Content Area */}
      <div className="max-w-[1200px] w-full mx-auto px-6 mt-6 flex-1 flex flex-col pb-8">
        {/* Grid layout that stretches both columns to match height */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-1 lg:max-h-[calc(100vh-120px)] min-h-[600px]">
          
          {/* Left Column (Editor) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
            
            {/* Title Area */}
            <div className="p-6 border-b border-gray-100 shrink-0">
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="在此输入标题..."
                className="w-full bg-transparent text-[24px] font-bold outline-none placeholder:text-gray-300 text-slate-800"
                maxLength={100}
              />
            </div>

            {/* Toolbar - Minimalist Monotone */}
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-2 shrink-0">
              
              <div className="flex items-center gap-1">
                {/* Select Board */}
                <div ref={boardMenuRef} className="relative mr-2">
                  <button
                    onClick={() => setBoardMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-gray-200 hover:border-gray-300 rounded-md transition-colors"
                  >
                    {selectedBoard} <ChevronDown size={14} strokeWidth={1.5} />
                  </button>
                  {boardMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 z-20 w-56 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedBoardId(category.id);
                            setSelectedBoard(category.name);
                            setBoardMenuOpen(false);
                          }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>

                {/* Formatting */}
                {formatTools.map(renderTool)}
                
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                {/* Alignment */}
                {alignTools.map(renderTool)}

                <div className="w-px h-4 bg-gray-300 mx-1"></div>

                {/* Insert */}
                {insertTools.map(renderTool)}
              </div>

              <div className="flex items-center gap-1">
                {actionTools.map(renderTool)}
              </div>
            </div>

            {/* Writing Area */}
            <div className="p-6 flex-1 min-h-0">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">正文内容</div>
                <div className="text-xs text-slate-400">工具栏效果会直接显示在正文里</div>
              </div>
              <div className="relative h-full min-h-[260px] rounded-2xl border border-gray-200 bg-slate-50/40 p-4">
                {!editorFocused && !hasMeaningfulEditorContent(content) && (
                  <div className="pointer-events-none absolute left-4 top-4 text-[15px] text-gray-300">开始撰写正文... 支持 Markdown 语法</div>
                )}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => setEditorFocused(true)}
                  onBlur={() => {
                    saveEditorSelection();
                    setEditorFocused(false);
                    syncEditorContent();
                    highlightEditorCodeBlocks();
                  }}
                  onInput={() => {
                    saveEditorSelection();
                    highlightEditorCodeBlocks();
                  }}
                  onKeyUp={saveEditorSelection}
                  onMouseUp={saveEditorSelection}
                  className="markdown-preview h-full min-h-[220px] overflow-y-auto outline-none text-[15px] leading-7 text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar Settings) */}
          <div className="flex flex-col gap-6 h-full">
            
            {/* Attachment */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm shrink-0">
              <h3 className="font-bold text-slate-800 text-[14px] flex items-center gap-2 mb-4">
                <UploadCloud size={16} strokeWidth={1.5} className="text-slate-500" /> 附件上传
              </h3>
              
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  handleUploadFiles(e.dataTransfer.files);
                }}
                className={`border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${
                  isDragOver ? "border-teal-400 bg-teal-50" : "border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => handleUploadFiles(e.target.files)}
                />
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                  <UploadCloud size={20} strokeWidth={1.5} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                </div>
                <p
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[13px] text-slate-500"
                >
                  拖拽文件或 <span className="text-slate-800 font-medium underline underline-offset-2">点击上传</span>
                </p>
                {attachments.length > 0 && (
                  <div className="mt-3 w-full text-left space-y-2">
                    {attachments.map((item) => (
                      <div key={item.url} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">{item.name || item.url}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              insertAttachmentIntoContent(item);
                            }}
                            className="rounded px-2 py-0.5 text-teal-600 hover:bg-teal-50"
                          >
                            插入
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(item.url);
                            }}
                            className="rounded px-2 py-0.5 text-rose-500 hover:bg-rose-50"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Post Settings */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm shrink-0">
              <h3 className="font-bold text-slate-800 text-[14px] flex items-center gap-2 mb-4">
                <Settings size={16} strokeWidth={1.5} className="text-slate-500" /> 帖子设置
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-2">悬赏积分 (可选)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      value={bounty}
                      onChange={(e) => {
                        const nextValue = Number(e.target.value);
                        const maxPoints = user?.points ?? 0;
                        if (nextValue > maxPoints) {
                          setBounty(maxPoints);
                          toast.info("悬赏积分已自动调整到当前余额上限");
                          return;
                        }
                        setBounty(nextValue);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] outline-none focus:border-slate-400 transition-colors"
                      min="0"
                    />
                    <span className="text-[13px] text-slate-500">
                      {uploadingInlineImage
                        ? "图片上传中..."
                        : uploadingPaste
                          ? "粘贴上传中..."
                          : `当前余额: ${user?.points ?? 0}`}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>添加标签</span>
                    <button type="button" onClick={addCustomTag} className="text-[12px] text-[#3b82f6] hover:underline font-medium flex items-center gap-1">
                      <Plus size={12} strokeWidth={2}/> 新增
                    </button>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[...hotTags.slice(0, 8), ...selectedTags.filter((tag) => !hotTags.slice(0, 8).includes(tag))].map(tag => (
                      <button 
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-slate-600 text-[12px] hover:bg-gray-100 hover:text-slate-900 transition-colors"
                        style={{
                          backgroundColor: selectedTags.includes(tag) ? "#e0f2fe" : undefined,
                          borderColor: selectedTags.includes(tag) ? "#38bdf8" : undefined,
                          color: selectedTags.includes(tag) ? "#0369a1" : undefined,
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Posting Tips - Auto-expands to fill remaining height */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex-1 flex flex-col min-h-0">
              <h4 className="font-bold text-slate-800 text-[13px] flex items-center gap-2 mb-3 shrink-0">
                <Info size={14} strokeWidth={1.5} className="text-slate-500" /> 发帖规范
              </h4>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <ul className="text-[12px] text-slate-600 space-y-2 list-disc pl-4 marker:text-gray-400">
                  <li>提问前请先使用顶部搜索功能，确认是否已有小伙伴解答过类似问题。</li>
                  <li>标题请简明扼要概括核心问题，避免使用“求救”、“小白求问”等无意义词汇。</li>
                  <li>如需贴出公式或代码（如VBA、M语言），请务必使用代码块格式插入，以保证排版清晰。</li>
                  <li>建议上传带有模拟数据的附件，这能让别人更快复现并解决你的问题。</li>
                  <li>友善交流，互相帮助，收到满意解答后请及时采纳并感谢答主。</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}

function isImageAttachment(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
}

function normalizeEditorContent(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return renderRichContent(trimmed);
  }
  return renderRichContent(trimmed);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
}

function hasMeaningfulEditorContent(value: string) {
  if (!value) return false;
  if (stripHtml(value)) return true;
  return /<(img|video|audio|iframe|table|svg)\b/i.test(value);
}

function getCaretCharacterOffsetWithin(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0).cloneRange();
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
}

function restoreCaretToCodeBlock(element: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let currentOffset = offset;
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textLength = currentNode.textContent?.length || 0;
    if (currentOffset <= textLength) {
      const range = document.createRange();
      range.setStart(currentNode, currentOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    currentOffset -= textLength;
    currentNode = walker.nextNode();
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
