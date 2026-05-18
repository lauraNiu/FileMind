import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Sparkles, MessageCircle, Filter, Frown, Check } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FileRow } from "@/components/FileRow";
import { FileDetailDrawer } from "@/components/FileDetailDrawer";
import { api } from "@/lib/api";
import type { FileItem, SearchResult } from "@/lib/types";
import { useNavigate, useSearchParams } from "react-router-dom";

const TYPE_GROUPS: { label: string; exts: string[]; key: string }[] = [
  { label: "全部", exts: [], key: "all" },
  { label: "文档", exts: ["pdf", "docx", "doc", "md", "txt", "rtf"], key: "doc" },
  { label: "表格", exts: ["xlsx", "xls", "csv"], key: "sheet" },
  { label: "PPT", exts: ["pptx", "ppt", "key"], key: "ppt" },
  { label: "图片", exts: ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "cr2"], key: "image" },
  { label: "视频", exts: ["mp4", "mov", "avi", "mkv"], key: "video" },
  { label: "音频", exts: ["mp3", "wav", "flac"], key: "audio" },
  { label: "代码", exts: ["py", "ts", "tsx", "js", "jsx", "rs", "go", "java", "c", "cpp", "h"], key: "code" },
  { label: "设计", exts: ["fig", "sketch", "psd", "ai", "xd"], key: "design" },
  { label: "压缩", exts: ["zip", "tar", "gz", "rar", "7z", "dmg", "pkg"], key: "archive" },
];

export function Files() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFilter = searchParams.get("tag");

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [typeKey, setTypeKey] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<FileItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api.listFiles(150, 0).then(setAllFiles).catch(() => {});
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.searchFiles(query.trim(), 100);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const activeGroup = TYPE_GROUPS.find((g) => g.key === typeKey) ?? TYPE_GROUPS[0];

  const showSearchMode = query.trim().length > 0;
  const baseItems = showSearchMode
    ? results
    : allFiles.map((f) => ({ file: f, score: 0, highlight: null as string | null }));

  const filtered = useMemo(() => {
    return baseItems.filter((item) => {
      if (typeKey !== "all" && !activeGroup.exts.includes(item.file.ext.toLowerCase())) {
        return false;
      }
      if (tagFilter && !item.file.tags.some((t) => t === tagFilter)) {
        return false;
      }
      return true;
    });
  }, [baseItems, typeKey, activeGroup, tagFilter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clearTag = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    setSearchParams(next);
  };

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1">
          {showSearchMode ? "搜索结果" : "所有文件"}
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          {showSearchMode
            ? `${filtered.length} 个匹配 · ⌘K 重新聚焦 · Tab 切到 Chat`
            : `共 ${filtered.length} 个文件 · ⌘K 搜索`}
        </p>
      </div>

      {tagFilter && (
        <div className="mb-4 flex items-center gap-2 text-[12px]">
          <span className="text-[var(--color-text-tertiary)]">标签筛选：</span>
          <button
            onClick={clearTag}
            className="px-2 py-0.5 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] flex items-center gap-1 hover:bg-[var(--color-ai)]/15"
          >
            {tagFilter}
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <GlassCard variant="strong" className="mb-6 p-1.5 flex items-center gap-2 relative">
        <Search className="w-4 h-4 text-[var(--color-text-tertiary)] ml-3" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab" && query.trim()) {
              e.preventDefault();
              nav(`/chat?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          placeholder="搜索文件名、内容、标签..."
          className="flex-1 bg-transparent outline-none text-[14px] py-2 placeholder:text-[var(--color-text-tertiary)]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          ref={filterRef}
          onClick={() => setFilterOpen((v) => !v)}
          className="px-3 flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] font-mono border-l border-[var(--color-border-subtle)] ml-1 h-9"
        >
          <Filter className="w-3.5 h-3.5" />
          {activeGroup.label}
        </button>

        <AnimatePresence>
          {filterOpen && (
            <>
              <div
                onClick={() => setFilterOpen(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-50 glass-strong rounded-xl p-2 w-[180px] shadow-2xl"
              >
                {TYPE_GROUPS.map((g) => {
                  const active = g.key === typeKey;
                  return (
                    <button
                      key={g.key}
                      onClick={() => {
                        setTypeKey(g.key);
                        setFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[12.5px] rounded-md transition-colors ${
                        active
                          ? "bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span>{g.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </GlassCard>

      {showSearchMode && loading && (
        <div className="text-[12px] text-[var(--color-text-tertiary)] font-mono mb-3 flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 border border-[var(--color-text-tertiary)] border-t-transparent rounded-full"
          />
          搜索中...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <GlassCard className="p-16 flex flex-col items-center text-center gap-3">
          <Frown className="w-10 h-10 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
          <div className="text-[15px] text-[var(--color-text-secondary)]">
            {showSearchMode
              ? `没找到与 "${query}" 相关的文件`
              : tagFilter
              ? `标签 "${tagFilter}" 下没有文件`
              : "还没有文件"}
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)]">
            {showSearchMode
              ? "可能是：拼写有误 / 文件在排除目录 / 当前类型筛选过严"
              : "去 Dashboard 选目录扫描"}
          </div>
          {showSearchMode && (
            <button
              onClick={() => nav(`/chat?q=${encodeURIComponent(query.trim())}`)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] text-[12px] hover:bg-[var(--color-ai)]/15 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              让 AI 帮你找
            </button>
          )}
        </GlassCard>
      )}

      <AnimatePresence mode="popLayout">
        <motion.div className="space-y-1">
          {filtered.map((item) => (
            <motion.div
              key={item.file.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <FileRow
                file={item.file}
                score={showSearchMode ? item.score : undefined}
                highlight={showSearchMode ? item.highlight : null}
                selected={selected === item.file.id}
                onClick={() => {
                  setSelected(item.file.id);
                  setOpenFile(item.file);
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {showSearchMode && filtered.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-[12px] text-[var(--color-text-tertiary)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-ai)]" />
          <span>没找到想要的？</span>
          <button
            onClick={() => nav(`/chat?q=${encodeURIComponent(query.trim())}`)}
            className="text-[var(--color-ai)] hover:underline"
          >
            让 AI 帮你找
          </button>
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] font-mono text-[10px]">
            Tab
          </kbd>
        </div>
      )}

      <FileDetailDrawer
        file={openFile}
        onClose={() => {
          setOpenFile(null);
          setSelected(null);
        }}
        onTagsChanged={(id, newTags) => {
          setAllFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, tags: newTags } : f))
          );
        }}
      />
    </div>
  );
}
