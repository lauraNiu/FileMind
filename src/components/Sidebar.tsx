import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Files,
  Share2,
  MessageCircle,
  Clock,
  Sparkles,
  Settings as SettingsIcon,
  History as HistoryIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const navItems = [
  { to: "/", label: "仪表盘", icon: LayoutDashboard },
  { to: "/projects", label: "项目", icon: FolderKanban },
  { to: "/files", label: "文件", icon: Files },
  { to: "/timeline", label: "时间轴", icon: Clock },
  { to: "/graph", label: "图谱", icon: Share2 },
  { to: "/chat", label: "Chat", icon: MessageCircle },
];

const utilItems = [
  { to: "/duplicates", label: "重复清理", icon: Files },
  { to: "/temp", label: "临时文件", icon: Clock },
  { to: "/history", label: "操作历史", icon: HistoryIcon },
  { to: "/settings", label: "设置", icon: SettingsIcon },
];

const comingSoon: { label: string; icon: typeof Clock }[] = [];

export function Sidebar() {
  const location = useLocation();
  const nav = useNavigate();
  const [myViews, setMyViews] = useState<{ label: string; count: number }[]>([]);

  useEffect(() => {
    api
      .topTags(6)
      .then((tags) =>
        setMyViews(tags.map((t) => ({ label: t.tag, count: Number(t.count) })))
      )
      .catch(() => setMyViews([]));
  }, [location.pathname]);

  return (
    <aside className="w-[220px] h-full flex flex-col bg-[var(--color-bg-elevated)] border-r border-[var(--color-border-subtle)]">
      <div
        className="h-14 flex items-center gap-2 pl-[84px] pr-5 border-b border-[var(--color-border-subtle)]"
        data-tauri-drag-region
      >
        <div className="relative pointer-events-none">
          <Sparkles className="w-5 h-5 text-[var(--color-ai)]" strokeWidth={2.5} />
          <div className="absolute inset-0 blur-md opacity-50">
            <Sparkles className="w-5 h-5 text-[var(--color-ai)]" />
          </div>
        </div>
        <span className="font-display font-semibold text-[15px] tracking-tight pointer-events-none">
          FileMind
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors duration-150",
                  isActive
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <Icon className="w-[16px] h-[16px] relative z-10" strokeWidth={2} />
                <span className="relative z-10">{item.label}</span>
                {(() => {
                  const badge = (item as { badge?: string }).badge;
                  return badge ? (
                    <span className="relative z-10 ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-ai)]/15 border border-[var(--color-ai)]/30 text-[var(--color-ai)] font-mono">
                      {badge}
                    </span>
                  ) : null;
                })()}
              </NavLink>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="px-3 mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
            工具
          </div>
          <div className="space-y-0.5">
            {utilItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors duration-150",
                    isActive
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                    />
                  )}
                  <Icon className="w-[16px] h-[16px] relative z-10" strokeWidth={2} />
                  <span className="relative z-10">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
        {comingSoon.length > 0 && (
          <div className="mt-6">
            <div className="px-3 mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
              即将上线
            </div>
            {comingSoon.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-[var(--color-text-muted)] cursor-not-allowed"
                >
                  <Icon className="w-[16px] h-[16px]" strokeWidth={2} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {myViews.length > 0 && (
          <div className="mt-6">
            <div className="px-3 mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium flex items-center justify-between">
              <span>热门标签</span>
              <span className="text-[9px] text-[var(--color-text-muted)] font-normal normal-case tracking-normal">点击筛选</span>
            </div>
            {myViews.map((view, i) => {
              const colors = ["#22c55e", "#a78bfa", "#38bdf8", "#f59e0b", "#ec4899", "#06b6d4"];
              return (
                <button
                  key={view.label}
                  onClick={() => nav(`/files?tag=${encodeURIComponent(view.label)}`)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] rounded-md transition-colors group"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: colors[i % colors.length] }}
                    />
                    <span className="truncate">{view.label}</span>
                  </span>
                  <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono group-hover:text-[var(--color-text-secondary)]">
                    {view.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
