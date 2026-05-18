import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Copy,
  MessageCircle,
  Link2,
  Tag,
} from "lucide-react";
import type { FileItem, RelatedFile } from "@/lib/types";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { FileIcon } from "./FileIcon";

interface Props {
  file: FileItem | null;
  onClose: () => void;
}

const RELATION_LABELS: Record<string, string> = {
  reference: "引用",
  derived: "派生自",
  "co-project": "同项目",
  similar: "相似",
};

const RELATION_COLORS: Record<string, string> = {
  reference: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  derived: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "co-project": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  similar: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

export function FileDetailDrawer({ file, onClose }: Props) {
  const [related, setRelated] = useState<RelatedFile[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setRelated([]);
      setSummary(null);
      return;
    }
    setSummary(file.summary);
    api.getRelatedFiles(file.id).then(setRelated).catch(() => setRelated([]));
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (file) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  const regenerate = async () => {
    if (!file) return;
    setRegenerating(true);
    try {
      const newSummary = await api.regenerateSummary(file.id);
      setSummary(newSummary);
      toast.success("摘要已重新生成");
    } catch (e) {
      toast.error("生成失败：" + String(e));
    } finally {
      setRegenerating(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制路径");
  };

  return (
    <AnimatePresence>
      {file && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            className="fixed right-0 top-0 bottom-0 w-[440px] bg-[var(--color-bg-elevated)] border-l border-[var(--color-border-default)] z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-border-subtle)]">
              <span className="text-[12px] font-mono text-[var(--color-text-tertiary)]">
                文件详情
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
                    <FileIcon ext={file.ext} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-semibold leading-tight break-words">
                      {file.name}
                    </h2>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                    <Sparkles className="w-3 h-3 text-[var(--color-ai)]" />
                    AI 摘要
                  </div>
                  <button
                    onClick={regenerate}
                    disabled={regenerating}
                    className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
                    {regenerating ? "生成中..." : "重新生成"}
                  </button>
                </div>
                <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed p-3 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
                  {summary ?? <span className="text-[var(--color-text-tertiary)] italic">无摘要</span>}
                </div>
              </div>

              {file.tags && file.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
                    <Tag className="w-3 h-3" />
                    标签
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {file.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {file.project_name && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
                    所在项目
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[var(--color-ai)]">
                    <FolderOpen className="w-3.5 h-3.5" />
                    {file.project_name}
                  </div>
                </div>
              )}

              {related.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
                    <Link2 className="w-3 h-3" />
                    相关文件
                  </div>
                  <div className="space-y-1.5">
                    {related.slice(0, 5).map((r) => (
                      <div
                        key={r.file.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] transition-colors cursor-pointer"
                      >
                        <FileIcon ext={r.file.ext} className="w-3.5 h-3.5" />
                        <span className="text-[12px] truncate flex-1">{r.file.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${RELATION_COLORS[r.relation]}`}
                        >
                          {RELATION_LABELS[r.relation]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
                  元信息
                </div>
                <div className="text-[12px] space-y-1.5 font-mono">
                  <div className="flex justify-between gap-3 group">
                    <span className="text-[var(--color-text-tertiary)] shrink-0">路径</span>
                    <button
                      onClick={() => copy(file.path)}
                      className="text-[var(--color-text-secondary)] truncate text-right hover:text-[var(--color-text-primary)] flex items-center gap-1"
                      title={file.path}
                    >
                      <span className="truncate">{file.path}</span>
                      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-tertiary)]">类型</span>
                    <span className="text-[var(--color-text-secondary)]">{file.mime_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-tertiary)]">大小</span>
                    <span className="text-[var(--color-text-secondary)]">{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-tertiary)]">修改</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {new Date(file.mtime * 1000).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-tertiary)]">访问</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {file.access_count} 次（最近 7 天）
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border-subtle)] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toast.info("MVP 暂不支持，Phase 2 上线")}
                  className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  在 Finder 中显示
                </button>
                <button
                  onClick={() => copy(file.path)}
                  className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  复制路径
                </button>
              </div>
              <button className="w-full px-3 py-2.5 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] text-[12px] hover:bg-[var(--color-ai)]/15 transition-colors flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                关于此文件问 AI
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
