import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, RotateCw, Hourglass, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { FileIcon } from "@/components/FileIcon";
import { api } from "@/lib/api";
import type { FileItem } from "@/lib/types";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

const DAYS_OPTIONS = [
  { value: 30, label: "30 天" },
  { value: 90, label: "90 天" },
  { value: 180, label: "180 天" },
  { value: 365, label: "1 年" },
];

export function TempFiles() {
  const [days, setDays] = useState(180);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);

  const reload = () => {
    setLoading(true);
    setSelected(new Set());
    api
      .listTempFiles(days, 500)
      .then(setFiles)
      .finally(() => setLoading(false));
  };
  useEffect(reload, [days]);

  const totalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);
  const selectedSize = useMemo(
    () => files.filter((f) => selected.has(f.id)).reduce((s, f) => s + f.size, 0),
    [files, selected]
  );

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.id)));
  };

  const trashSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`移到废纸篓 ${selected.size} 个文件？\n释放 ${formatBytes(selectedSize)}\n\n（可在「操作历史」回滚）`)) return;
    setWorking(true);
    let done = 0;
    let fail = 0;
    for (const id of Array.from(selected)) {
      try {
        await api.trashFile(id, "临时文件清理");
        done++;
      } catch {
        fail++;
      }
    }
    toast.success(`已清理 ${done} 个 · 失败 ${fail}`);
    setWorking(false);
    reload();
  };

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1 flex items-center gap-2">
            <Hourglass className="w-6 h-6 text-[var(--color-warning)]" />
            临时文件
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            标记为「临时」且超过 {days} 天未修改的文件 · 共 {files.length} 个 · {formatBytes(totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-0.5">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDays(d.value)}
                className={`px-3 py-1 text-[12px] rounded ${
                  days === d.value
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={reload}
            className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-[12px] flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </div>

      {!loading && files.length === 0 && (
        <GlassCard className="p-16 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-[var(--color-accent)]" strokeWidth={1.5} />
          <div className="text-[14px] text-[var(--color-text-secondary)] mb-1">没有过期的临时文件</div>
        </GlassCard>
      )}

      {files.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[12px] flex items-center gap-1.5 hover:bg-[var(--color-bg-card-hover)]"
          >
            {selected.size === files.length ? "取消全选" : "全选"}
            <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
              {selected.size}/{files.length}
            </span>
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-[12px] text-[var(--color-text-secondary)]">
                选中 {selected.size} 个 · 可释放{" "}
                <span className="text-[var(--color-accent)] font-mono">
                  {formatBytes(selectedSize)}
                </span>
              </span>
              <button
                onClick={trashSelected}
                disabled={working}
                className="ml-auto px-4 py-1.5 rounded-md bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-[12px] flex items-center gap-1.5 hover:bg-[var(--color-danger)]/15 disabled:opacity-40"
              >
                {working ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                移到废纸篓
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-1">
        {files.map((f, idx) => {
          const checked = selected.has(f.id);
          return (
            <motion.label
              key={f.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.4, idx * 0.01) }}
              className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-colors ${
                checked
                  ? "bg-[var(--color-warning)]/5 border-[var(--color-warning)]/40"
                  : "bg-[var(--color-bg-card)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(f.id)}
                className="w-4 h-4 accent-[var(--color-warning)] shrink-0"
              />
              <FileIcon ext={f.ext} className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{f.name}</div>
                <div className="text-[10.5px] text-[var(--color-text-tertiary)] font-mono truncate">
                  {f.path}
                </div>
              </div>
              <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] shrink-0 text-right">
                <div>{formatBytes(f.size)}</div>
                <div className="opacity-60">{formatRelativeTime(f.mtime)}</div>
              </div>
            </motion.label>
          );
        })}
      </div>
    </div>
  );
}
