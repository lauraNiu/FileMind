import { useEffect, useState } from "react";
import { PauseCircle, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { WatcherIndicator } from "./WatcherIndicator";

export function StatusBar() {
  const [stats, setStats] = useState<{
    scan: { current: number; total: number; status: string };
    ai_used: number;
    ai_budget: number;
  }>({
    scan: { current: 0, total: 0, status: "ready" },
    ai_used: 0,
    ai_budget: 30,
  });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const s = await api.dashboardStats();
        if (!mounted) return;
        setStats({
          scan: s.scan_progress,
          ai_used: s.ai_used_yuan,
          ai_budget: s.ai_budget_yuan,
        });
      } catch {
        // ignore
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const aiPct = Math.min(100, (stats.ai_used / stats.ai_budget) * 100);
  const scanning = stats.scan.status === "scanning";

  return (
    <div className="h-8 flex items-center px-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[11px] font-mono">
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
        {scanning ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full"
          />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] glow-accent" />
        )}
        <span>
          {scanning
            ? `索引中 ${stats.scan.current.toLocaleString()}/${stats.scan.total.toLocaleString()}`
            : `已就绪 · ${stats.scan.total.toLocaleString()} 文件`}
        </span>
      </div>

      <div className="mx-3">
        <WatcherIndicator />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[var(--color-ai)]" />
          <span>本月 AI:</span>
          <span className="text-[var(--color-text-primary)]">
            ¥{stats.ai_used.toFixed(2)} / ¥{stats.ai_budget}
          </span>
          <div className="w-16 h-1 rounded-full bg-[var(--color-bg-card)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--color-ai)] to-[var(--color-accent)]"
              animate={{ width: `${aiPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            const next = !paused;
            setPaused(next);
            if (next) {
              toast.success("已暂停所有 AI 调用（前端拦截，刷新可恢复）", {
                description: "完整的后端节流开关是 Phase 2 计划",
              });
            } else {
              toast.info("已恢复 AI 调用");
            }
          }}
          className={`flex items-center gap-1 px-2 py-0.5 transition-colors ${
            paused
              ? "text-[var(--color-warning)] hover:text-[var(--color-warning)]/80"
              : "hover:text-[var(--color-text-primary)]"
          }`}
        >
          {paused ? (
            <>
              <PlayCircle className="w-3.5 h-3.5" />
              <span>已暂停</span>
            </>
          ) : (
            <>
              <PauseCircle className="w-3.5 h-3.5" />
              <span>全部暂停</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
