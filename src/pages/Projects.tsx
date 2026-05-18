import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Grid3x3, List, Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { formatRelativeTime, formatBytes } from "@/lib/utils";

export function Projects() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => {});
  }, []);

  const filtered = projects.filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="min-h-full p-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1">
            项目
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            AI 自动从你的文件中识别出 {projects.length} 个项目 · 点击卡片看详情
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-0.5">
            {(["all", "active", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[12px] rounded ${
                  filter === f
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {f === "all" ? "全部" : f === "active" ? "活跃" : "归档"} (
                {projects.filter((p) => f === "all" || p.status === f).length})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`w-7 h-7 flex items-center justify-center rounded ${
                view === "grid"
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`w-7 h-7 flex items-center justify-center rounded ${
                view === "list"
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <GlassCard className="p-16 text-center">
          <FolderKanban className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
          <div className="text-[14px] text-[var(--color-text-secondary)] mb-1">
            {filter === "all" ? "还没有项目" : `没有${filter === "active" ? "活跃" : "归档"}的项目`}
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)]">
            扫描一个目录会自动创建项目
          </div>
        </GlassCard>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
            >
              <GlassCard
                interactive
                onClick={() => nav(`/projects/${p.id}`)}
                className="p-5 h-full flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-[var(--color-ai)]" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {p.status === "active" ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] pulse-soft" />
                        <span className="text-[var(--color-accent)]">活跃</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
                        <span className="text-[var(--color-text-muted)]">归档</span>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="text-[15px] font-semibold mb-1 truncate">{p.name}</h3>

                {p.description && (
                  <p className="text-[12px] text-[var(--color-text-secondary)] mb-3 line-clamp-2 flex items-start gap-1.5">
                    <Sparkles className="w-3 h-3 text-[var(--color-ai)] mt-0.5 shrink-0" />
                    {p.description}
                  </p>
                )}

                <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] flex items-center gap-2 mb-3">
                  <span>{p.file_count} 文件</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--color-text-muted)]" />
                  <span>{formatBytes(p.total_size)}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--color-text-muted)]" />
                  <span>{formatRelativeTime(p.last_active)}</span>
                </div>

                {p.top_files.length > 0 && (
                  <div className="space-y-1 pt-3 border-t border-[var(--color-border-subtle)] mt-auto">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-1">
                      关键文件
                    </div>
                    {p.top_files.slice(0, 3).map((f) => (
                      <div
                        key={f}
                        className="text-[11.5px] text-[var(--color-text-secondary)] truncate flex items-center gap-1.5"
                      >
                        <span className="text-[var(--color-text-muted)]">·</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-end gap-1">
                  打开
                  <ArrowRight className="w-3 h-3" />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => nav(`/projects/${p.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-card)] transition-colors text-left"
            >
              <FolderKanban className="w-4 h-4 text-[var(--color-ai)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium truncate">{p.name}</div>
                {p.description && (
                  <div className="text-[11.5px] text-[var(--color-text-tertiary)] truncate mt-0.5">
                    {p.description}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono shrink-0">
                {p.file_count} 文件
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono shrink-0">
                {formatRelativeTime(p.last_active)}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
