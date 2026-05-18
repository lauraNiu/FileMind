import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { WatchStatus, WatchEventPayload } from "@/lib/types";

export function WatcherIndicator() {
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [recent, setRecent] = useState<WatchEventPayload[]>([]);
  const [pulse, setPulse] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  const refresh = () => {
    api.watcherStatus().then(setStatus).catch(() => {});
  };

  useEffect(() => {
    refresh();
    api
      .onFsEvent((e) => {
        setRecent((prev) => [e, ...prev].slice(0, 6));
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      })
      .then((u) => (unlistenRef.current = u));
    return () => unlistenRef.current?.();
  }, []);

  const toggle = async () => {
    if (!status) return;
    try {
      if (status.running) await api.watcherStop();
      else await api.watcherStart();
      toast.success(status.running ? "已停止实时监听" : "已启动实时监听");
      refresh();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const removeRoot = async (path: string) => {
    try {
      await api.watcherRemoveRoot(path);
      toast.success("已移除监听");
      refresh();
    } catch (e) {
      toast.error(String(e));
    }
  };

  if (!status) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono hover:bg-[var(--color-bg-card)] transition-colors"
        title={status.running ? `实时监听中 · ${status.roots.length} 个根目录` : "未启用实时监听"}
      >
        {status.running ? (
          <>
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]"
              animate={pulse ? { scale: [1, 1.5, 1] } : {}}
              style={{ boxShadow: pulse ? "0 0 8px var(--color-accent-glow)" : "" }}
            />
            <span className="text-[var(--color-text-secondary)]">
              实时 · {status.roots.length}
            </span>
          </>
        ) : (
          <>
            <EyeOff className="w-3 h-3 text-[var(--color-text-tertiary)]" />
            <span className="text-[var(--color-text-tertiary)]">监听已停</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 z-50 glass-strong rounded-xl p-3 w-[320px] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                  实时文件监听
                </div>
                <button
                  onClick={toggle}
                  className="flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {status.running ? (
                    <>
                      <Eye className="w-3 h-3" />
                      已启用
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      已停用
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1 mb-3">
                <div className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-mono mb-1">
                  监听中的目录 · {status.roots.length}
                </div>
                {status.roots.length === 0 && (
                  <div className="text-[11px] text-[var(--color-text-tertiary)] italic">
                    扫描一个目录后会自动加入
                  </div>
                )}
                {status.roots.map((r) => (
                  <div
                    key={r.path}
                    className="flex items-center gap-1.5 p-1.5 rounded bg-[var(--color-bg-card)] text-[11px] font-mono"
                  >
                    <span className="truncate flex-1" title={r.path}>
                      {r.path}
                    </span>
                    <button
                      onClick={() => removeRoot(r.path)}
                      className="text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {recent.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-mono mb-1">
                    最近事件
                  </div>
                  <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                    {recent.map((e, i) => (
                      <div key={i} className="text-[10.5px] font-mono flex items-center gap-1.5">
                        <span
                          className={
                            e.kind === "create"
                              ? "text-[var(--color-accent)]"
                              : e.kind === "remove"
                              ? "text-[var(--color-danger)]"
                              : "text-[var(--color-text-tertiary)]"
                          }
                        >
                          {e.kind === "create" ? "+" : e.kind === "remove" ? "-" : "~"}
                        </span>
                        <span className="text-[var(--color-text-secondary)] truncate" title={e.path}>
                          {e.path.split("/").slice(-1)[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
