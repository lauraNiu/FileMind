import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderSearch, FolderOpen, CheckCircle2, X, Loader2, Trash2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { ScanProgressEvent } from "@/lib/types";

interface Props {
  onComplete?: () => void;
}

export function ScanCard({ onComplete }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ScanProgressEvent | null>(null);
  const [last, setLast] = useState<{ indexed: number; root: string } | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    api.onScanProgress((e) => {
      if (!mounted) return;
      setProgress(e);
      if (e.done) {
        setRunning(false);
        setLast({ indexed: e.indexed, root: "" });
        onComplete?.();
      }
    }).then((u) => {
      unlistenRef.current = u;
    });
    return () => {
      mounted = false;
      unlistenRef.current?.();
    };
  }, [onComplete]);

  const pickAndScan = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择要索引的目录",
      });
      if (!selected || typeof selected !== "string") return;

      setRunning(true);
      setProgress({
        scanned: 0,
        indexed: 0,
        total_estimate: 0,
        current_path: selected,
        phase: "counting",
        done: false,
        project_id: "",
      });

      const result = await api.scanDirectory(selected, 5000);
      setLast({ indexed: result.indexed, root: result.root });
      toast.success(
        `扫描完成：索引 ${formatNumber(result.indexed)} 个文件（跳过 ${result.skipped}）`
      );
      onComplete?.();
    } catch (e) {
      toast.error("扫描失败：" + String(e));
      setRunning(false);
    }
  };

  return (
    <GlassCard className="p-5 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[var(--color-ai)]/8 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 flex items-center justify-center">
              <FolderSearch className="w-5 h-5 text-[var(--color-ai)]" />
            </div>
            <div>
              <div className="text-[14px] font-semibold">索引一个真实目录</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-0.5">
                walkdir 真的去扫你的磁盘 · 不读文件内容 · 只入索引
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {running && progress ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {(() => {
                const phase = progress.phase ?? "indexing";
                const total = progress.total_estimate || 0;
                const pct = phase === "counting"
                  ? 0
                  : phase === "done"
                  ? 100
                  : total > 0
                  ? Math.min(98, Math.round((progress.indexed / total) * 100))
                  : 0;
                const phaseLabel: Record<string, string> = {
                  counting: "清点文件...",
                  indexing: "索引中",
                  deriving: "建立关系...",
                  done: "完成",
                };
                return (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-[12px]">
                      <Loader2 className="w-3.5 h-3.5 text-[var(--color-ai)] animate-spin" />
                      <span className="text-[var(--color-text-secondary)]">
                        {phaseLabel[phase]}
                      </span>
                      <span className="ml-auto text-[11px] font-mono text-[var(--color-accent)]">
                        {pct}%
                      </span>
                    </div>
                    {phase !== "counting" && total > 0 && (
                      <div className="text-[10.5px] font-mono text-[var(--color-text-tertiary)]">
                        已索引 <span className="text-[var(--color-text-primary)]">{formatNumber(progress.indexed)}</span> / 预计 {formatNumber(total)}{" "}
                        · 已遍历 {formatNumber(progress.scanned)}
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono truncate" title={progress.current_path}>
                      → {progress.current_path || "—"}
                    </div>
                    <div className="h-1 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[var(--color-ai)] to-[var(--color-accent)]"
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : last ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2"
            >
              <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                上次扫描已索引{" "}
                <span className="text-[var(--color-text-primary)] font-mono">
                  {formatNumber(last.indexed)}
                </span>{" "}
                个文件
                <button
                  onClick={() => setLast(null)}
                  className="ml-auto w-5 h-5 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-3 flex gap-2">
          <button
            onClick={pickAndScan}
            disabled={running}
            className="flex-1 px-3 py-2.5 rounded-md bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-[12.5px] font-medium hover:bg-[var(--color-accent)]/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {running ? "扫描中..." : "选择目录开始扫描"}
          </button>
          <button
            onClick={async () => {
              if (!confirm("清空所有数据（包括 demo + 已扫描）？")) return;
              try {
                await api.clearAllData();
                toast.success("已清空");
                onComplete?.();
              } catch (e) {
                toast.error("清空失败：" + String(e));
              }
            }}
            disabled={running}
            className="px-3 py-2.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="清空所有数据"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
