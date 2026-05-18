import { useEffect, useRef, useState } from "react";
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
  Plus,
  ExternalLink,
  MoreHorizontal,
  Edit2,
  Move,
  Trash2,
  Undo2,
} from "lucide-react";
import type { FileItem, RelatedFile } from "@/lib/types";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { FileIcon } from "./FileIcon";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";

interface Props {
  file: FileItem | null;
  onClose: () => void;
  onTagsChanged?: (fileId: string, newTags: string[]) => void;
  onFileChanged?: () => void;
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

export function FileDetailDrawer({ file, onClose, onTagsChanged, onFileChanged }: Props) {
  const [related, setRelated] = useState<RelatedFile[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setRelated([]);
      setSummary(null);
      setTags([]);
      setAddingTag(false);
      setNewTag("");
      setRenaming(false);
      setMoreOpen(false);
      return;
    }
    setSummary(file.summary);
    setTags(file.tags ?? []);
    setRenameValue(file.name);
    api.getRelatedFiles(file.id).then(setRelated).catch(() => setRelated([]));
  }, [file]);

  useEffect(() => {
    if (addingTag) setTimeout(() => tagInputRef.current?.focus(), 50);
  }, [addingTag]);

  useEffect(() => {
    if (renaming) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [renaming]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !renaming && !addingTag) onClose();
    };
    if (file) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose, renaming, addingTag]);

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

  const persistTags = async (next: string[]) => {
    if (!file) return;
    setTags(next);
    try {
      await api.updateFileTags(file.id, next);
      onTagsChanged?.(file.id, next);
    } catch (e) {
      toast.error("保存标签失败：" + String(e));
    }
  };

  const removeTag = (tag: string) => persistTags(tags.filter((t) => t !== tag));

  const addTag = () => {
    const t = newTag.trim();
    if (!t) {
      setAddingTag(false);
      return;
    }
    if (tags.includes(t)) {
      toast.info("标签已存在");
      setNewTag("");
      return;
    }
    persistTags([...tags, t]);
    setNewTag("");
    setAddingTag(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制路径");
  };

  const reveal = async () => {
    if (!file) return;
    try {
      await api.revealInFinder(file.path);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const openFile = async () => {
    if (!file) return;
    try {
      await api.openWithDefault(file.path);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const doRename = async () => {
    if (!file) return;
    const newName = renameValue.trim();
    if (!newName || newName === file.name) {
      setRenaming(false);
      setRenameValue(file.name);
      return;
    }
    try {
      const reason = window.prompt("可选：写一句话说明为什么改名（用于操作历史）") || undefined;
      await api.renameFile(file.id, newName, reason);
      toast.success(`已重命名为 ${newName}`);
      setRenaming(false);
      onFileChanged?.();
      onClose();
    } catch (e) {
      toast.error("重命名失败：" + String(e));
    }
  };

  const doMove = async () => {
    if (!file) return;
    try {
      const targetDir = await dialogOpen({
        directory: true,
        multiple: false,
        title: `把 ${file.name} 移到哪？`,
      });
      if (!targetDir || typeof targetDir !== "string") return;
      const reason = window.prompt("可选：写一句话说明为什么移动") || undefined;
      await api.moveFile(file.id, targetDir, reason);
      toast.success(`已移到 ${targetDir}`);
      setMoreOpen(false);
      onFileChanged?.();
      onClose();
    } catch (e) {
      toast.error("移动失败：" + String(e));
    }
  };

  const doTrash = async () => {
    if (!file) return;
    if (!window.confirm(`移到废纸篓？\n\n${file.name}\n${file.path}\n\n（可以在「操作历史」回滚）`)) return;
    try {
      const reason = window.prompt("可选：写一句话说明为什么删除") || undefined;
      await api.trashFile(file.id, reason);
      toast.success("已移入废纸篓 · 可在「操作历史」回滚");
      setMoreOpen(false);
      onFileChanged?.();
      onClose();
    } catch (e) {
      toast.error("删除失败：" + String(e));
    }
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
            className="fixed right-0 top-0 bottom-0 w-[460px] bg-[var(--color-bg-elevated)] border-l border-[var(--color-border-default)] z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-border-subtle)]">
              <span className="text-[12px] font-mono text-[var(--color-text-tertiary)]">
                文件详情
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] relative"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute right-0 top-full mt-1 glass-strong rounded-lg p-1 z-10 w-[180px] shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DrawerMenuItem icon={Edit2} label="重命名" onClick={() => {
                        setMoreOpen(false);
                        setRenaming(true);
                      }} />
                      <DrawerMenuItem icon={Move} label="移动到..." onClick={doMove} />
                      <DrawerMenuItem icon={Trash2} label="移到废纸篓" danger onClick={doTrash} />
                    </motion.div>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
                    <FileIcon ext={file.ext} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {renaming ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") doRename();
                            if (e.key === "Escape") {
                              setRenaming(false);
                              setRenameValue(file.name);
                            }
                          }}
                          className="flex-1 px-2 py-1 rounded bg-[var(--color-bg-card)] border border-[var(--color-ai)] text-[14px] font-semibold outline-none"
                        />
                        <button
                          onClick={doRename}
                          className="px-2 py-1 rounded bg-[var(--color-accent)] text-black text-[11px] font-medium"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <h2
                        className="text-[15px] font-semibold leading-tight break-words cursor-pointer hover:text-[var(--color-ai)]"
                        onClick={() => setRenaming(true)}
                        title="点击重命名"
                      >
                        {file.name}
                      </h2>
                    )}
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
                  {summary ?? (
                    <span className="text-[var(--color-text-tertiary)] italic">
                      暂无摘要，点「重新生成」让 AI 写一句
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
                  <Tag className="w-3 h-3" />
                  标签
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="group/tag text-[11px] pl-2 pr-1 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] flex items-center gap-1 hover:border-[var(--color-border-default)]"
                    >
                      {t}
                      <button
                        onClick={() => removeTag(t)}
                        className="w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--color-danger)]/20 hover:text-[var(--color-danger)] opacity-0 group-hover/tag:opacity-100"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {addingTag ? (
                    <input
                      ref={tagInputRef}
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTag();
                        if (e.key === "Escape") {
                          setAddingTag(false);
                          setNewTag("");
                        }
                      }}
                      onBlur={addTag}
                      placeholder="新标签"
                      className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-accent)]/40 outline-none w-24"
                    />
                  ) : (
                    <button
                      onClick={() => setAddingTag(true)}
                      className="text-[11px] px-2 py-0.5 rounded border border-dashed border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)] flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      添加
                    </button>
                  )}
                </div>
              </div>

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
                    相关文件 · {related.length}
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {related.slice(0, 10).map((r) => (
                      <div
                        key={r.file.id + r.relation}
                        className="flex items-center gap-2 p-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                      >
                        <FileIcon ext={r.file.ext} className="w-3.5 h-3.5" />
                        <span className="text-[12px] truncate flex-1" title={r.file.name}>
                          {r.file.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${RELATION_COLORS[r.relation]}`}>
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
                  onClick={reveal}
                  className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] flex items-center justify-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  在 Finder 显示
                </button>
                <button
                  onClick={openFile}
                  className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  默认应用打开
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => copy(file.path)}
                  className="px-2 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center gap-1"
                  title="复制路径"
                >
                  <Copy className="w-3 h-3" />
                  复制路径
                </button>
                <button
                  onClick={doMove}
                  className="px-2 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center gap-1"
                >
                  <Move className="w-3 h-3" />
                  移动
                </button>
                <button
                  onClick={doTrash}
                  className="px-2 py-1.5 rounded-md bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[11px] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  废纸篓
                </button>
              </div>
              <button className="w-full px-3 py-2.5 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] text-[12px] hover:bg-[var(--color-ai)]/15 flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                关于此文件问 AI
              </button>
              <div className="text-[10px] text-[var(--color-text-tertiary)] text-center font-mono flex items-center justify-center gap-1">
                <Undo2 className="w-2.5 h-2.5" />
                所有操作可在「历史」页回滚
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof FolderOpen;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] ${
        danger
          ? "text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
