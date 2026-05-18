import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Files as FilesIcon,
  FolderKanban,
  Trash2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Search,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { ExtDistChart } from "@/components/ExtDistChart";
import { ActivityChart } from "@/components/ActivityChart";
import { TopTagsCard } from "@/components/TopTagsCard";
import { ScanCard } from "@/components/ScanCard";
import { api } from "@/lib/api";
import type { DashboardStats, Project } from "@/lib/types";
import { formatBytes, formatNumber, formatRelativeTime } from "@/lib/utils";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const refresh = () => {
    api.dashboardStats().then(setStats).catch(() => {});
    api.listProjects().then((p) => setProjects(p.slice(0, 6))).catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="min-h-full p-8 max-w-[1400px] mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={itemVariants} className="flex items-end justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1 font-mono">
              {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 className="text-[28px] font-display font-semibold tracking-tight text-balance">
              欢迎回来，<span className="gradient-text">看见你的数字资产</span>
            </h1>
          </div>
          {stats && stats.scan_progress.status === "scanning" && (
            <div className="text-[12px] text-[var(--color-text-secondary)] flex items-center gap-2 font-mono">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full"
              />
              索引中 {Math.round((stats.scan_progress.current / stats.scan_progress.total) * 100)}%
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-12 gap-4 auto-rows-[180px]">
          <GlassCard className="col-span-12 md:col-span-3 p-5 relative overflow-hidden noise">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[var(--color-accent)]/10 blur-3xl pointer-events-none" />
            <div className="relative h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
                  <FilesIcon className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                {stats && stats.weekly_added > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-accent)]">
                    <TrendingUp className="w-3 h-3" />
                    +{formatNumber(stats.weekly_added)}
                  </div>
                )}
              </div>
              <div className="text-[36px] font-display font-bold tracking-tight leading-none">
                {stats ? formatNumber(stats.total_files) : "—"}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                文件总数
              </div>
              <div className="mt-auto text-[11px] font-mono text-[var(--color-text-tertiary)]">
                {stats ? formatBytes(stats.total_size) : "—"}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-12 md:col-span-5 p-5 relative overflow-hidden row-span-1">
            <div className="relative h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                    文件类型分布
                  </div>
                </div>
                <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                  {stats?.ext_distribution.length ?? 0} 类
                </div>
              </div>
              {stats && stats.ext_distribution.length > 0 ? (
                <ExtDistChart data={stats.ext_distribution} totalFiles={stats.total_files} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--color-text-tertiary)]">
                  暂无数据
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="col-span-12 md:col-span-2 p-5 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[var(--color-ai)]/10 blur-3xl pointer-events-none" />
            <div className="relative h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-[var(--color-ai)]" />
                </div>
              </div>
              <div className="text-[36px] font-display font-bold tracking-tight leading-none">
                {stats ? formatNumber(stats.total_projects) : "—"}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                项目
              </div>
              <button
                onClick={() => nav("/projects")}
                className="mt-auto text-[11px] text-[var(--color-ai)] hover:text-[var(--color-ai)]/80 flex items-center gap-1 group font-mono"
              >
                活跃 {stats?.active_projects ?? "—"}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </GlassCard>

          <GlassCard
            interactive
            onClick={() => nav("/files?tag=临时")}
            className="col-span-12 md:col-span-2 p-5 relative overflow-hidden"
          >
            <div className="relative h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-[var(--color-warning)]" />
                </div>
              </div>
              <div className="text-[26px] font-display font-bold tracking-tight leading-none">
                {stats ? formatBytes(stats.duplicate_size) : "—"}
              </div>
              <div className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                重复
              </div>
              <div className="mt-auto text-[11px] font-mono text-[var(--color-text-tertiary)] flex items-center gap-1">
                {stats?.duplicate_groups ?? "—"} 组
                <ArrowRight className="w-3 h-3 ml-auto" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-12 gap-4 auto-rows-[220px]">
          <GlassCard className="col-span-12 md:col-span-7 p-5 relative overflow-hidden">
            <ActivityChart days={30} />
          </GlassCard>
          <GlassCard className="col-span-12 md:col-span-5 p-5 relative overflow-hidden">
            <TopTagsCard />
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-display font-semibold flex items-center gap-2">
              最近活跃项目
              <span className="text-[11px] font-normal text-[var(--color-text-tertiary)] font-mono">
                AI 自动聚类
              </span>
            </h2>
            <button
              onClick={() => nav("/projects")}
              className="text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.length === 0 &&
              Array.from({ length: 3 }).map((_, i) => (
                <GlassCard key={i} className="p-5 h-[180px] shimmer" variant="subtle">
                  <div />
                </GlassCard>
              ))}
            {projects.map((p) => (
              <GlassCard
                key={p.id}
                interactive
                className="p-5"
                onClick={() => nav(`/projects/${p.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-[var(--color-ai)]" />
                  </div>
                  {p.status === "active" && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-accent)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] pulse-soft" />
                      活跃
                    </div>
                  )}
                </div>
                <h3 className="text-[14px] font-semibold mb-1 truncate">{p.name}</h3>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mb-3">
                  {p.file_count} 文件 · {formatRelativeTime(p.last_active)}
                </div>
                {p.top_files.length > 0 && (
                  <div className="space-y-1">
                    {p.top_files.slice(0, 2).map((f) => (
                      <div
                        key={f}
                        className="text-[11px] text-[var(--color-text-secondary)] truncate flex items-center gap-1.5"
                      >
                        <span className="text-[var(--color-text-muted)]">·</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-[15px] font-display font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
            需要你关注
          </h2>
          <GlassCard className="divide-y divide-[var(--color-border-subtle)]">
            {[
              {
                label: `${stats?.temp_files_count ?? "—"} 个文件在 Downloads 中超过 180 天未访问`,
                action: "查看清单",
                onClick: () => nav("/files?tag=临时"),
                color: "warning" as const,
              },
              {
                label: `${stats?.duplicate_groups ?? "—"} 组重复文件占用 ${stats ? formatBytes(stats.duplicate_size) : "—"}`,
                action: "查看清单",
                onClick: () => nav("/files"),
                color: "warning" as const,
              },
              {
                label: `本月云端 AI 已用 ¥${stats?.ai_used_yuan.toFixed(2) ?? "—"} / ¥${stats?.ai_budget_yuan ?? "—"}`,
                action: "去 Chat",
                onClick: () => nav("/chat"),
                color: "info" as const,
              },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-bg-card-hover)]/30 transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-[13px]">
                  {item.color === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[var(--color-ai)]" />
                  )}
                  <span className="text-[var(--color-text-secondary)]">{item.label}</span>
                </div>
                <span className="text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 group">
                  {item.action}
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ScanCard onComplete={refresh} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-[15px] font-display font-semibold mb-3">快速开始</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "搜索文件", icon: Search, to: "/files", color: "accent" as const },
              { label: "问 AI", icon: MessageCircle, to: "/chat", color: "ai" as const },
              { label: "浏览项目", icon: FolderKanban, to: "/projects", color: "default" as const },
            ].map((qa) => {
              const Icon = qa.icon;
              return (
                <GlassCard
                  key={qa.label}
                  interactive
                  onClick={() => nav(qa.to)}
                  className="p-4 flex items-center gap-3"
                >
                  <div
                    className={
                      qa.color === "accent"
                        ? "w-9 h-9 rounded-md bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center"
                        : qa.color === "ai"
                        ? "w-9 h-9 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 flex items-center justify-center"
                        : "w-9 h-9 rounded-md bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-center"
                    }
                  >
                    <Icon
                      className={
                        qa.color === "accent"
                          ? "w-4 h-4 text-[var(--color-accent)]"
                          : qa.color === "ai"
                          ? "w-4 h-4 text-[var(--color-ai)]"
                          : "w-4 h-4 text-[var(--color-text-secondary)]"
                      }
                    />
                  </div>
                  <span className="text-[13.5px] font-medium">{qa.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-[var(--color-text-tertiary)]" />
                </GlassCard>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
