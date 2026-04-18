import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eye,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  PencilLine,
  Strikethrough,
  Table,
  Trash2,
  Underline,
  Undo,
} from "lucide-react";
import { toast } from "sonner";
import { openGlobalConfirm, openGlobalPrompt } from "./GlobalConfirmPromptDialog";
import { api } from "../lib/api";
import { normalizeResourceUrl } from "../lib/mappers";
import { highlightCodeSyntax, renderRichContent } from "../lib/rich-content";

type RichContentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

type ToolConfig = {
  icon: any;
  label: string;
  danger?: boolean;
};

const formatTools: ToolConfig[] = [
  { icon: Bold, label: "加粗" },
  { icon: Italic, label: "斜体" },
  { icon: Underline, label: "下划线" },
  { icon: Strikethrough, label: "删除线" },
];

const alignTools: ToolConfig[] = [
  { icon: AlignLeft, label: "左对齐" },
  { icon: AlignCenter, label: "居中" },
  { icon: AlignRight, label: "右对齐" },
];

const insertTools: ToolConfig[] = [
  { icon: ImageIcon, label: "插入图片" },
  { icon: LinkIcon, label: "插入链接" },
  { icon: Code, label: "代码块" },
  { icon: Table, label: "插入表格" },
];

const actionTools: ToolConfig[] = [
  { icon: Undo, label: "撤销" },
  { icon: Trash2, label: "清空内容", danger: true },
];

export function RichContentEditor({
  value,
  onChange,
  placeholder = "开始撰写正文...",
  minHeightClassName = "min-h-[320px]",
}: RichContentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorSelectionRef = useRef<Range | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const [editorFocused, setEditorFocused] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const normalizedValue = useMemo(() => normalizeEditorContent(value), [value]);
  const previewHtml = useMemo(() => normalizedValue || renderRichContent(""), [normalizedValue]);

  useEffect(() => {
    if (mode !== "edit") return;
    if (editorRef.current && editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
      highlightEditorCodeBlocks();
    }
  }, [mode, normalizedValue]);

  const syncEditorContent = () => {
    onChange(editorRef.current?.innerHTML || "");
  };

  const focusEditor = () => {
    if (mode !== "edit") {
      setMode("edit");
    }
    window.setTimeout(() => editorRef.current?.focus(), 0);
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

    editor.focus();
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
    const editor = editorRef.current;
    if (!editor) return;

    try {
      restoreEditorSelection();
    } catch {
      editor.focus();
    }

    const selection = window.getSelection();
    let range: Range;
    if (!selection || selection.rangeCount === 0) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

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
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(nextRange);
        editorSelectionRef.current = nextRange.cloneRange();
      }
    } else {
      saveEditorSelection();
    }

    syncEditorContent();
    highlightEditorCodeBlocks();
  };

  const uploadFiles = async (files: Iterable<File>) => {
    const uploaded: { url: string; name?: string }[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.post<{ url: string }>("/api/upload", formData);
      uploaded.push({ url: result.url, name: file.name });
    }
    return uploaded;
  };

  const insertInlineImageIntoContent = (attachment: { url: string; name?: string }) => {
    const displayName = escapeHtml(attachment.name || "图片");
    const resourceUrl = resolveEditorResourceUrl(attachment.url);
    insertHtmlAtCursor(`<img src="${resourceUrl}" alt="${displayName}" style="max-width:100%;max-height:320px;border-radius:16px;border:1px solid #e2e8f0;margin:12px 0;display:block;object-fit:contain;" />`);
  };

  const uploadInlineImageFile = async (file: File) => {
    try {
      const uploaded = await uploadFiles([file]);
      if (uploaded.length === 0) {
        return false;
      }
      insertInlineImageIntoContent(uploaded[0]);
      return true;
    } catch (error) {
      console.error("Inline image upload failed", error);
      return false;
    }
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
      case "插入图片":
        saveEditorSelection();
        inlineImageInputRef.current?.click();
        return;
      case "插入链接":
        saveEditorSelection();
        openGlobalPrompt({ title: "插入链接", label: "链接地址", placeholder: "请输入链接地址", required: true }).then((linkUrl) => {
          if (!linkUrl) return;
          const normalizedLinkUrl = normalizeResourceUrl(linkUrl);
          const selectionText = window.getSelection()?.toString();
          if (selectionText) {
            applyCommand("createLink", normalizedLinkUrl);
            return;
          }
          openGlobalPrompt({ title: "插入链接", label: "链接文字", placeholder: "请输入链接文字", defaultValue: "链接" }).then((text) => {
            insertHtmlAtCursor(`<a href="${normalizedLinkUrl}" target="_blank" rel="noreferrer" style="color:#0f766e;text-decoration:underline;">${escapeHtml(text || "链接")}</a>`);
          });
        });
        return;
      case "代码块":
        insertHtmlAtCursor(`<pre style="background:#0f172a;color:#f8fafc;border-radius:16px;padding:16px;overflow:auto;margin:12px 0;"><code data-code-block="true" style="display:block;white-space:pre-wrap;outline:none;">代码块</code></pre><p><br></p>`);
        return;
      case "插入表格":
        insertHtmlAtCursor(`<table style="width:100%;border-collapse:collapse;margin:12px 0;"><thead><tr><th style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">列1</th><th style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">列2</th><th style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc;">列3</th></tr></thead><tbody><tr><td style="border:1px solid #cbd5e1;padding:8px;">内容1</td><td style="border:1px solid #cbd5e1;padding:8px;">内容2</td><td style="border:1px solid #cbd5e1;padding:8px;">内容3</td></tr></tbody></table><p><br></p>`);
        return;
      case "撤销":
        applyCommand("undo");
        return;
      case "清空内容":
        openGlobalConfirm({ message: "确认清空正文内容吗？" }).then((confirmed) => {
          if (!confirmed) return;
          onChange("");
          if (editorRef.current) {
            editorRef.current.innerHTML = "";
          }
        });
        return;
      default:
        return;
    }
  };

  const renderTool = ({ icon: Icon, label, danger }: ToolConfig) => (
    <button
      key={label}
      type="button"
      onClick={() => handleToolbarAction(label)}
      className={`group relative flex items-center justify-center rounded-lg p-2 transition-colors ${
        danger ? "text-slate-500 hover:bg-rose-50 hover:text-rose-600" : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
      }`}
    >
      <Icon size={16} strokeWidth={1.5} />
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium tracking-wide text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
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
    onChange(editor.innerHTML);
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <input
        ref={inlineImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleInlineImageSelect(e.target.files)}
      />

      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition ${
                mode === "edit" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <PencilLine size={14} />
              编辑
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition ${
                mode === "preview" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Eye size={14} />
              预览
            </button>
          </div>

          {mode === "edit" ? (
            <div className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {formatTools.map(renderTool)}
              <div className="mx-1 h-4 w-px bg-slate-300" />
              {alignTools.map(renderTool)}
              <div className="mx-1 h-4 w-px bg-slate-300" />
              {insertTools.map(renderTool)}
              <div className="mx-1 h-4 w-px bg-slate-300" />
              {actionTools.map(renderTool)}
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-400">预览效果与首页展示保持一致</div>
          )}
        </div>
      </div>

      <div className="p-4">
        {mode === "edit" ? (
          <>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">正文内容</div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="text-xs text-slate-400">工具栏效果会直接显示在正文里</div>
                <button
                  type="button"
                  onClick={() => {
                    saveEditorSelection();
                    inlineImageInputRef.current?.click();
                  }}
                  disabled={uploadingInlineImage}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ImageIcon size={13} strokeWidth={1.8} />
                  {uploadingInlineImage ? "上传中..." : "上传图片到正文"}
                </button>
              </div>
            </div>
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
              {!editorFocused && !hasMeaningfulEditorContent(normalizedValue) ? (
                <div className="pointer-events-none absolute left-4 top-4 text-[15px] text-slate-300">{placeholder}</div>
              ) : null}
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
                className={`markdown-preview ${minHeightClassName} overflow-y-auto pr-1 text-[15px] leading-7 text-slate-700 outline-none`}
              />
            </div>
          </>
        ) : (
          <div className={`rounded-2xl border border-slate-200 bg-slate-50/40 p-4 ${minHeightClassName}`}>
            {previewHtml ? (
              <div className="markdown-preview h-full overflow-y-auto pr-1 text-[15px] leading-7 text-slate-700" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-slate-400">暂无可预览内容</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeEditorContent(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }
  if (/&lt;\/?[a-z][\s\S]*&gt;/i.test(trimmed)) {
    return decodeEditorHtml(trimmed);
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

function decodeEditorHtml(value: string) {
  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(value, "text/html");
    return parsed.documentElement.textContent || value;
  }
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveEditorResourceUrl(value: string) {
  const normalized = normalizeResourceUrl(value);
  if (!normalized) return "";
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  if (typeof window !== "undefined" && normalized.startsWith("/")) {
    return `${window.location.origin}${normalized}`;
  }
  return normalized;
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
