import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy as CopyIcon, RotateCw, Trash2, Lightbulb, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { FileIcon } from "@/components/FileIcon";
import { api } from "@/lib/api";
import type { DuplicateGroup, FileItem } from "@/lib/types";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

export function Duplicates() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    api.listDuplicates(80).then(setGroups).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const totalRecoverable = groups.reduce((s, g) => s + g.recoverable, 0);

  const trashFile = async (f: FileItem) => {
    if (!window.confirm(`移到废纸篓？\n\n${f.name}\n${f.path}\n\n（可在「操作历史」回滚）`)) return;
    setWorking(f.id);
    try {
      await api.trashFile(f.id, "重复文件清理");
      toast.success(`已移除 · 释放 ${formatBytes(f.size)}`);
      reload();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1 flex items-center gap-2">
            <CopyIcon className="w-6 h-6 text-[var(--color-warning)]" />
            重复文件
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            找到 {groups.length} 组重复 · 可释放 <span className="text-[var(--color-accent)] font-mono">{formatBytes(totalRecoverable)}</span>
          </p>
        </div>
        <button
          onClick={reload}
          className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-[12px] flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          重新检测
        </button>
      </div>

      {!loading && groups.length === 0 && (
        <GlassCard className="p-16 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-[var(--color-accent)]" strokeWidth={1.5} />
          <div className="text-[14px] text-[var(--color-text-secondary)] mb-1">
            干净如新，没有重复文件
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)]">
            提示：重复检测基于 content_hash，目前 demo / 扫描数据未计算哈希值（Phase 2 上线）
          </div>
        </GlassCard>
      )}

      <div className="space-y-3">
        {groups.map((g, idx) => (
          <motion.div
            key={g.hash}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                    {g.files.length} 份重复
                  </span>
                  <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
                    {g.hash.slice(0, 12)}...
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <Lightbulb className="w-3 h-3 text-[var(--color-warning)]" />
                  <span className="text-[var(--color-warning)]">
                    可释放 {formatBytes(g.recoverable)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                {g.files.map((f, i) => {
                  const isOldest = i === 0;
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-3 p-2 rounded-md ${
                        isOldest
                          ? "bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20"
                          : "bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                      }`}
                    >
                      <FileIcon ext={f.ext} className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium truncate">{f.name}</div>
                        <div className="text-[10.5px] text-[var(--color-text-tertiary)] font-mono truncate">
                          {f.path} · {formatBytes(f.size)} · {formatRelativeTime(f.mtime)}
                        </div>
                      </div>
                      {isOldest ? (
                        <span className="text-[10px] font-mono text-[var(--color-accent)] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 shrink-0">
                          建议保留
                        </span>
                      ) : (
                        <button
                          onClick={() => trashFile(f)}
                          disabled={working === f.id}
                          className="text-[10px] px-2 py-1 rounded bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 flex items-center gap-1 disabled:opacity-40 shrink-0"
                        >
                          {working === f.id ? (
                            <RotateCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          删除副本
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
