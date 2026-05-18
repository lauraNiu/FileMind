import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";
import { api } from "@/lib/api";
import type { BatchSummaryProgress } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface Props {
  onComplete?: () => void;
}

export function BatchSummaryCard({ onComplete }: Props) {
  const [pending, setPending] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BatchSummaryProgress | null>(null);
  const [lastDone, setLastDone] = useState<{ processed: number; failed: number } | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  const refresh = () => {
    api.filesWithoutSummary(1000).then((arr) => setPending(arr.length)).catch(() => {});
  };

  useEffect(() => {
    refresh();
    api
      .onBatchSummaryProgress((e) => setProgress(e))
      .then((u) => (unlistenRef.current = u));
    return () => unlistenRef.current?.();
  }, []);

  const run = async () => {
    setRunning(true);
    setLastDone(null);
    try {
      const r = await api.batchSummarize(20);
      setLastDone({ processed: r.processed, failed: r.failed });
      toast.success(`摘要完成 · 处理 ${r.processed} · 失败 ${r.failed} · 还剩 ${r.remaining}`);
      onComplete?.();
      refresh();
    } catch (e) {
      toast.error("批量摘要失败：" + String(e));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <GlassCard className="p-5 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[var(--color-ai)]/8 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[var(--color-ai)]" />
            </div>
            <div>
              <div className="text-[14px] font-semibold">批量 AI 摘要</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-0.5">
                给还没摘要的文件批量生成 · 每次最多 20 个
              </div>
            </div>
          </div>
          <button
            onClick={refresh}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            title="刷新数量"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-[24px] font-display font-bold leading-none">
            {formatNumber(pending)}
          </span>
          <span className="text-[12px] text-[var(--color-text-secondary)]">个文件待摘要</span>
        </div>

        <AnimatePresence mode="wait">
          {running && progress ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-[var(--color-ai)]" />
                  {progress.current} / {progress.total}
                </span>
                <span className="text-[var(--color-ai)] font-mono">{pct}%</span>
              </div>
              <div className="h-1 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--color-ai)] to-[var(--color-accent)]"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono truncate mt-1">
                正在: {progress.file_name}
              </div>
            </motion.div>
          ) : lastDone ? (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] mb-3"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              上次处理了 {lastDone.processed} 个{lastDone.failed > 0 && `，失败 ${lastDone.failed}`}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          onClick={run}
          disabled={running || pending === 0}
          className="w-full px-3 py-2.5 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] text-[12.5px] font-medium hover:bg-[var(--color-ai)]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              处理中...
            </>
          ) : pending === 0 ? (
            "全部都有摘要了 ✨"
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              处理 {Math.min(20, pending)} 个
            </>
          )}
        </button>
      </div>
    </GlassCard>
  );
}
