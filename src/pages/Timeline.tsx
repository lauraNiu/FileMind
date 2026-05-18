import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, RotateCw, FileText } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FileRow } from "@/components/FileRow";
import { FileDetailDrawer } from "@/components/FileDetailDrawer";
import { api } from "@/lib/api";
import type { FileItem, TimelineBucket } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const RANGES = [
  { value: 7, label: "7 天" },
  { value: 30, label: "30 天" },
  { value: 90, label: "90 天" },
  { value: 365, label: "1 年" },
];

export function Timeline() {
  const [days, setDays] = useState(30);
  const [buckets, setBuckets] = useState<TimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFile, setOpenFile] = useState<FileItem | null>(null);

  const reload = () => {
    setLoading(true);
    api
      .timelineBuckets(days)
      .then(setBuckets)
      .finally(() => setLoading(false));
  };
  useEffect(reload, [days]);

  const total = buckets.reduce((s, b) => s + b.count, 0);
  const max = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[var(--color-ai)]" />
            时间轴
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            按天聚合的文件活跃记录 · {formatNumber(total)} 个变更 · {buckets.length} 天
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`px-3 py-1 text-[12px] rounded ${
                  days === r.value
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={reload}
            className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-[12px] text-[var(--color-text-secondary)] flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </div>

      {!loading && buckets.length === 0 && (
        <GlassCard className="p-16 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
          <div className="text-[14px] text-[var(--color-text-secondary)] mb-1">
            这段时间没有文件变更
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)]">
            扫描更多目录或换个时间范围
          </div>
        </GlassCard>
      )}

      <div className="relative">
        <div className="absolute left-[80px] top-0 bottom-0 w-px bg-[var(--color-border-subtle)]" />

        <div className="space-y-4">
          {buckets.map((b, idx) => {
            const pct = (b.count / max) * 100;
            const d = new Date(b.day * 86400 * 1000);
            const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
            const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
            return (
              <motion.div
                key={b.day}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02, duration: 0.25 }}
                className="relative flex items-start gap-4"
              >
                <div className="w-[68px] shrink-0 text-right pt-1">
                  <div className="text-[15px] font-display font-bold leading-tight">
                    {monthDay}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                    {weekday}
                  </div>
                </div>

                <div className="relative w-3 flex justify-center pt-2 shrink-0">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-[var(--color-ai)] border-2 border-[var(--color-bg-base)]"
                    style={{
                      boxShadow: `0 0 ${4 + pct / 10}px var(--color-ai-glow)`,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.02 + 0.1, type: "spring" }}
                  />
                </div>

                <div className="flex-1 min-w-0 pb-3">
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                        {b.count} 个文件变更
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-[var(--color-bg-base)] overflow-hidden ml-3 max-w-[120px]">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[var(--color-ai)] to-[var(--color-accent)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.02 }}
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5 -mx-1">
                      {b.files.slice(0, 5).map((f) => (
                        <FileRow key={f.id} file={f} onClick={() => setOpenFile(f)} />
                      ))}
                      {b.files.length > 5 && (
                        <button
                          onClick={() => {
                            // Show all
                          }}
                          className="ml-4 mt-1 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                        >
                          还有 {b.files.length - 5} 个...
                        </button>
                      )}
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <FileDetailDrawer file={openFile} onClose={() => setOpenFile(null)} />
    </div>
  );
}
