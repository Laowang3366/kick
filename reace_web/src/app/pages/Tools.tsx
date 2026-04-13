import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderUp,
  LoaderCircle,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../lib/api";
import { normalizeResourceUrl } from "../lib/mappers";
import { useSession } from "../lib/session";

type TargetType = "word" | "excel" | "pdf";

const targetCards: Array<{
  id: TargetType;
  title: string;
  description: string;
  icon: any;
  accent: string;
}> = [
  {
    id: "word",
    title: "转为 Word",
    description: "输出为 `.docx`，适合继续编辑文字内容、批注和协作修改。",
    icon: FileText,
    accent: "from-sky-500 to-blue-600",
  },
  {
    id: "excel",
    title: "转为 Excel",
    description: "输出为 `.xlsx`，适合表格化整理、结构梳理和二次计算。",
    icon: FileSpreadsheet,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    id: "pdf",
    title: "转为 PDF",
    description: "输出为 `.pdf`，适合归档、分享、打印和定稿留存。",
    icon: FileType2,
    accent: "from-rose-500 to-orange-500",
  },
];

const sourceHints = [
  "支持 Word、Excel、PDF 三类文件互转",
  "Word ↔ Excel、PDF → Excel 属于近似转换，排版可能有损耗",
  "本机依赖 Microsoft Word / Excel 组件执行转换",
];

function formatFileType(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "word") return "Word";
  if (normalized === "excel") return "Excel";
  if (normalized === "pdf") return "PDF";
  return value || "-";
}

export function Tools() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSession();
  const [selectedTarget, setSelectedTarget] = useState<TargetType>("pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastResult, setLastResult] = useState<{ fileName: string; url: string } | null>(null);

  const historyQuery = useQuery({
    queryKey: ["tools", "history"],
    enabled: isAuthenticated,
    queryFn: () => api.get<{ records: any[] }>("/api/tools/history", { silent: true }),
  });
  const historyRecords = historyQuery.data?.records || [];

  const conversionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("请先选择文件");
      }
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("targetType", selectedTarget);
      return api.post<{ fileName: string; url: string; message: string }>("/api/tools/convert", formData);
    },
    onSuccess: (result) => {
      setLastResult({ fileName: result.fileName, url: result.url });
      toast.success("文件转换完成");
      void historyQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || "文件转换失败");
    },
  });

  const selectedTargetMeta = useMemo(
    () => targetCards.find((item) => item.id === selectedTarget) || targetCards[0],
    [selectedTarget]
  );

  const handleConvert = () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (!selectedFile) {
      toast.info("请先选择文件");
      return;
    }
    void conversionMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f8fb_0%,#eef4f8_100%)] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[34px] border border-[#d8e5e8] bg-[linear-gradient(135deg,#dff4ee_0%,#d9edf3_38%,#f7fafc_100%)] p-8 shadow-[0_18px_50px_rgba(15,118,110,0.08)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-4 py-2 text-xs font-black tracking-[0.18em] text-teal-700">
                <Sparkles size={14} />
                实用功能
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">Word / Excel / PDF 文件互转</h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
                通过本机 Office 组件完成转换，适合处理日常文档归档、表格整理和 PDF 回编。对结构差异较大的格式，会尽量保留内容但不保证完全还原原排版。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-teal-100 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700">
                  支持 `Word / Excel / PDF`
                </div>
                <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700">
                  转换结果自动保留到记录区
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {sourceHints.map((item) => (
                <div key={item} className="rounded-2xl border border-white/60 bg-white/72 px-4 py-4 text-sm font-semibold text-slate-700 shadow-[0_6px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FolderUp size={22} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">上传待转换文件</div>
                  <div className="text-sm text-slate-500">支持 `.doc`、`.docx`、`.xls`、`.xlsx`、`.pdf`</div>
                </div>
              </div>

              <label className="group block cursor-pointer rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center transition hover:border-teal-300 hover:bg-teal-50/40">
                <input
                  type="file"
                  accept=".doc,.docx,.xls,.xlsx,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFile(file);
                    setLastResult(null);
                  }}
                />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-teal-600 shadow-sm">
                  <ArrowRightLeft size={28} />
                </div>
                <div className="mt-5 text-lg font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : "点击选择文件"}
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {selectedFile
                    ? `已选择 ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                    : "上传后选择目标格式，系统会生成可下载的新文件"}
                </div>
              </label>

              {lastResult ? (
                <div className="mt-5 rounded-[24px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf3_0%,#f5fffa_100%)] px-5 py-4">
                  <div className="text-sm font-black text-emerald-700">最近一次转换已完成</div>
                  <div className="mt-2 text-sm text-emerald-900">{lastResult.fileName}</div>
                  <a
                    href={normalizeResourceUrl(lastResult.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Download size={16} />
                    下载结果文件
                  </a>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Clock3 size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-900">转换记录</div>
                    <div className="text-sm text-slate-500">保留最近 12 条转换结果，方便重复下载。</div>
                  </div>
                </div>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => void historyQuery.refetch()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <RefreshCcw size={15} className={historyQuery.isFetching ? "animate-spin" : ""} />
                    刷新
                  </button>
                ) : null}
              </div>

              {isAuthenticated ? (
                historyRecords.length > 0 ? (
                  <div className="space-y-3">
                    {historyRecords.map((item) => (
                      <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-800">{item.sourceFileName}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                              <span className="rounded-full bg-white px-2.5 py-1">{formatFileType(item.sourceType)}</span>
                              <span>→</span>
                              <span className="rounded-full bg-white px-2.5 py-1">{formatFileType(item.targetType)}</span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">已完成</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-slate-400">{String(item.createTime || "").replace("T", " ")}</div>
                            <a
                              href={normalizeResourceUrl(item.resultUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                            >
                              <Download size={15} />
                              下载
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
                    还没有转换记录，先上传一个文件试试。
                  </div>
                )
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
                  登录后可查看你的转换记录。
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="text-lg font-black text-slate-900">选择目标格式</div>
              <div className="mt-4 space-y-3">
                {targetCards.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === selectedTarget;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTarget(item.id)}
                      whileTap={{ scale: 0.985 }}
                      className={`w-full rounded-[24px] border px-5 py-5 text-left transition ${
                        active
                          ? "border-transparent bg-slate-900 text-white shadow-[0_16px_30px_rgba(15,23,42,0.14)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}>
                          <Icon size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-black">{item.title}</div>
                          <div className={`mt-2 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-500"}`}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleConvert}
                disabled={conversionMutation.isPending || !selectedFile}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-500 px-5 text-sm font-black text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
              >
                {conversionMutation.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
                {conversionMutation.isPending ? "正在转换..." : `转换为 ${selectedTargetMeta.title.replace("转为 ", "")}`}
              </button>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="text-lg font-black text-slate-900">转换说明</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>1. Word 与 Excel 直接互转时，优先保留内容与表格结构，复杂版式会有一定排版偏差。</p>
                <p>2. PDF 转 Excel 时会尽量还原表格，但扫描件、图片型 PDF 仍可能需要人工整理。</p>
                <p>3. 转换依赖本机 Microsoft Word / Excel 组件；如果本机 Office 不可用，接口会直接返回错误提示。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
