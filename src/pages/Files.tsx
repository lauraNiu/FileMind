import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Sparkles, MessageCircle, Filter, Frown } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FileRow } from "@/components/FileRow";
import { FileDetailDrawer } from "@/components/FileDetailDrawer";
import { api } from "@/lib/api";
import type { FileItem, SearchResult } from "@/lib/types";
import { useNavigate } from "react-router-dom";

export function Files() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<FileItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listFiles(80, 0).then(setAllFiles).catch(() => {});
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
        const r = await api.searchFiles(query.trim(), 50);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const showSearchMode = query.trim().length > 0;
  const displayItems = showSearchMode
    ? results
    : allFiles.map((f) => ({ file: f, score: 0, highlight: null }));

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

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1">
          {showSearchMode ? "搜索结果" : "所有文件"}
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          {showSearchMode
            ? `${results.length} 个匹配 · ⌘K 重新聚焦 · Tab 切换到 Chat`
            : "全部已索引文件 · ⌘K 搜索"}
        </p>
      </div>

      <GlassCard variant="strong" className="mb-6 p-1.5 flex items-center gap-2">
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
        <div className="px-2 flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] font-mono border-l border-[var(--color-border-subtle)] ml-1">
          <Filter className="w-3 h-3" />
          全部
        </div>
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

      {showSearchMode && !loading && results.length === 0 && (
        <GlassCard className="p-16 flex flex-col items-center text-center gap-3">
          <Frown className="w-10 h-10 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
          <div className="text-[15px] text-[var(--color-text-secondary)]">
            没找到与 "{query}" 相关的文件
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)]">
            可能是：拼写有误 / 文件在排除目录
          </div>
          <button
            onClick={() => nav(`/chat?q=${encodeURIComponent(query.trim())}`)}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] text-[12px] hover:bg-[var(--color-ai)]/15 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            让 AI 帮你找
          </button>
        </GlassCard>
      )}

      <AnimatePresence mode="popLayout">
        <motion.div className="space-y-1">
          {displayItems.map((item) => (
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

      {showSearchMode && results.length > 0 && (
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
      />
    </div>
  );
}
