import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Undo2,
  Move,
  Edit2,
  Trash2,
  RotateCw,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/api";
import type { OperationRecord } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const OP_ICONS: Record<string, typeof Move> = {
  move: Move,
  rename: Edit2,
  trash: Trash2,
};

const OP_LABELS: Record<string, string> = {
  move: "移动",
  rename: "重命名",
  trash: "移入废纸篓",
};

const OP_COLORS: Record<string, string> = {
  move: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  rename: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  trash: "text-rose-400 bg-rose-400/10 border-rose-400/30",
};

export function History() {
  const [ops, setOps] = useState<OperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverting, setReverting] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    api
      .listOperations(200)
      .then(setOps)
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const revert = async (opId: string) => {
    if (!window.confirm("回滚此操作？\n会把文件移回原位置。")) return;
    setReverting(opId);
    try {
      await api.revertOperation(opId);
      toast.success("已回滚");
      reload();
    } catch (e) {
      toast.error("回滚失败：" + String(e));
    } finally {
      setReverting(null);
    }
  };

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[var(--color-ai)]" />
            操作历史
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            所有写操作（移动 / 重命名 / 删除）的完整记录 · 全部可回滚
          </p>
        </div>
        <button
          onClick={reload}
          className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-[12px] text-[var(--color-text-secondary)] flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {!loading && ops.length === 0 && (
        <GlassCard className="p-16 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
          <div className="text-[14px] text-[var(--color-text-secondary)] mb-1">还没有操作记录</div>
          <div className="text-[12px] text-[var(--color-text-tertiary)]">
            从文件详情抽屉里执行的移动 / 重命名 / 删除会在这里出现
          </div>
        </GlassCard>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {ops.map((op) => {
            const Icon = OP_ICONS[op.op_type] ?? FileText;
            const colorClass = OP_COLORS[op.op_type] ?? "text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] border-[var(--color-border-subtle)]";
            const label = OP_LABELS[op.op_type] ?? op.op_type;
            const isReverted = op.status === "reverted";

            return (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <GlassCard className={`p-4 ${isReverted ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center border shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-medium">{label}</span>
                        <span className="text-[12px] text-[var(--color-text-primary)] font-medium truncate" title={op.target.file_name}>
                          {op.target.file_name}
                        </span>
                        {isReverted ? (
                          <span className="ml-auto text-[10px] font-mono text-[var(--color-text-tertiary)] flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            已回滚
                          </span>
                        ) : (
                          <span className="ml-auto text-[10px] font-mono text-[var(--color-accent)] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            已应用
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] space-y-0.5">
                        <div className="truncate" title={op.target.from_path}>
                          从 → {op.target.from_path}
                        </div>
                        <div className="truncate" title={op.target.to_path}>
                          到 → {op.target.to_path}
                        </div>
                      </div>
                      {op.reason && (
                        <div className="text-[11px] text-[var(--color-text-secondary)] italic mt-1">
                          "{op.reason}"
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-[10.5px] font-mono text-[var(--color-text-tertiary)]">
                          {op.actor} · {formatRelativeTime(op.created_at)} · {new Date(op.created_at * 1000).toLocaleString("zh-CN")}
                        </div>
                        {!isReverted && (
                          <button
                            onClick={() => revert(op.id)}
                            disabled={reverting === op.id}
                            className="text-[11px] px-2 py-1 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 disabled:opacity-40"
                          >
                            {reverting === op.id ? (
                              <RotateCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Undo2 className="w-3 h-3" />
                            )}
                            回滚
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
