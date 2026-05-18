import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Files,
  Share2,
  MessageCircle,
  Clock,
  History as HistoryIcon,
  Settings as SettingsIcon,
  FolderSearch,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  Monitor,
  PieChart,
  Hourglass,
  Copy as CopyIcon,
  Wand2,
  Download,
  Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import { MODELS } from "@/lib/models";
import { setTheme } from "@/lib/theme";
import type { FileItem } from "@/lib/types";
import { toast } from "sonner";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  section: string;
  keywords: string;
  run: () => void | Promise<void>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setFiles([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await api.searchFiles(q.trim(), 6);
        setFiles(r.map((x) => x.file));
      } catch {
        setFiles([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const baseCommands = useMemo<Cmd[]>(
    () => [
      { id: "nav-dash", label: "去仪表盘", hint: "⌘1", icon: LayoutDashboard, section: "导航", keywords: "dashboard 仪表盘 home 主页", run: () => nav("/") },
      { id: "nav-proj", label: "去项目", hint: "⌘2", icon: FolderKanban, section: "导航", keywords: "projects 项目", run: () => nav("/projects") },
      { id: "nav-files", label: "去文件", hint: "⌘3", icon: Files, section: "导航", keywords: "files 文件 列表", run: () => nav("/files") },
      { id: "nav-time", label: "去时间轴", hint: "⌘4", icon: Clock, section: "导航", keywords: "timeline 时间轴 活动", run: () => nav("/timeline") },
      { id: "nav-graph", label: "去图谱", hint: "⌘5", icon: Share2, section: "导航", keywords: "graph 图谱 关系", run: () => nav("/graph") },
      { id: "nav-chat", label: "去 Chat", hint: "⌘6", icon: MessageCircle, section: "导航", keywords: "chat 对话 ai", run: () => nav("/chat") },
      { id: "nav-hist", label: "去操作历史", hint: "⌘7", icon: HistoryIcon, section: "导航", keywords: "history 历史 操作 撤销", run: () => nav("/history") },
      { id: "nav-set", label: "去设置", hint: "⌘,", icon: SettingsIcon, section: "导航", keywords: "settings 设置 配置", run: () => nav("/settings") },
      { id: "nav-usage", label: "去 AI 用量", icon: PieChart, section: "导航", keywords: "usage 用量 费用 token", run: () => nav("/usage") },
      { id: "nav-dup", label: "重复文件清理", icon: CopyIcon, section: "工具", keywords: "duplicates 重复 清理", run: () => nav("/duplicates") },
      { id: "nav-temp", label: "临时文件清理", icon: Hourglass, section: "工具", keywords: "temp 临时 清理", run: () => nav("/temp") },

      {
        id: "act-scan", label: "扫描新目录", icon: FolderSearch, section: "动作", keywords: "scan 扫描 索引",
        run: async () => {
          const p = await dialogOpen({ directory: true, title: "选择目录扫描" });
          if (!p || typeof p !== "string") return;
          onClose();
          toast.loading("扫描中...", { id: "scan" });
          try {
            const r = await api.scanDirectory(p, 5000);
            toast.success(`扫描完成：索引 ${r.indexed} 个文件`, { id: "scan" });
          } catch (e) {
            toast.error("扫描失败：" + String(e), { id: "scan" });
          }
        },
      },
      {
        id: "act-batch", label: "批量 AI 摘要 (20 个)", icon: Sparkles, section: "动作", keywords: "summarize 摘要 ai batch",
        run: async () => {
          onClose();
          toast.loading("批量摘要中...", { id: "batch" });
          try {
            const r = await api.batchSummarize(20);
            toast.success(`完成 ${r.processed} · 失败 ${r.failed}`, { id: "batch" });
          } catch (e) {
            toast.error(String(e), { id: "batch" });
          }
        },
      },
      {
        id: "act-embed", label: "生成嵌入向量 (30 个)", icon: Wand2, section: "动作", keywords: "embed 向量 语义",
        run: async () => {
          onClose();
          toast.loading("生成嵌入中...", { id: "embed" });
          try {
            const n = await api.embedPending(30);
            toast.success(`生成 ${n} 个向量`, { id: "embed" });
          } catch (e) {
            toast.error(String(e), { id: "embed" });
          }
        },
      },
      {
        id: "act-export", label: "导出索引为 JSON", icon: Download, section: "数据", keywords: "export 导出 备份 json",
        run: async () => {
          const p = await dialogOpen({
            directory: false,
            save: true as never,
            defaultPath: `filemind-export-${new Date().toISOString().slice(0, 10)}.json`,
          } as never).catch(() => null);
          if (!p || typeof p !== "string") return;
          onClose();
          try {
            const bytes = await api.exportData(p);
            toast.success(`已导出 ${Math.round(bytes / 1024)} KB`);
          } catch (e) {
            toast.error(String(e));
          }
        },
      },
      {
        id: "act-import", label: "从 JSON 导入索引", icon: Upload, section: "数据", keywords: "import 导入 恢复",
        run: async () => {
          const p = await dialogOpen({
            directory: false,
            filters: [{ name: "JSON", extensions: ["json"] }],
          });
          if (!p || typeof p !== "string") return;
          onClose();
          try {
            const [pc, fc, rc] = await api.importData(p);
            toast.success(`导入完成：${pc} 项目 / ${fc} 文件 / ${rc} 关系`);
          } catch (e) {
            toast.error(String(e));
          }
        },
      },

      ...MODELS.map((m) => ({
        id: `model-${m.value}`,
        label: `切换到 ${m.label}`,
        hint: m.hint,
        icon: Sparkles,
        section: "AI 模型",
        keywords: `switch model ${m.value} ${m.label}`,
        run: async () => {
          await api.saveAiConfig(undefined, m.value);
          localStorage.setItem("filemind:chat:model", m.value);
          toast.success(`默认模型 → ${m.label}`);
        },
      })),

      { id: "theme-light", label: "切换：浅色主题", icon: Sun, section: "外观", keywords: "theme light 浅色 白色", run: () => { setTheme("light"); toast.success("已切换浅色"); } },
      { id: "theme-dark", label: "切换：深色主题", icon: Moon, section: "外观", keywords: "theme dark 深色 黑色", run: () => { setTheme("dark"); toast.success("已切换深色"); } },
      { id: "theme-sys", label: "切换：跟随系统", icon: Monitor, section: "外观", keywords: "theme system 跟随 自动", run: () => { setTheme("system"); toast.success("已跟随系统"); } },

      {
        id: "act-logout", label: "退出登录", icon: LogOut, section: "账号", keywords: "logout 退出 sign out",
        run: async () => {
          if (!window.confirm("退出登录会清除个人资料 + API Key？")) return;
          await api.logout();
          onClose();
          toast.success("已退出，回到欢迎页");
          setTimeout(() => nav("/welcome"), 300);
        },
      },
    ],
    [nav, onClose]
  );

  const allCommands: Cmd[] = useMemo(() => {
    const fileCmds: Cmd[] = files.map((f) => ({
      id: `file-${f.id}`,
      label: f.name,
      hint: f.path,
      icon: Files,
      section: "文件",
      keywords: `${f.name} ${f.tags.join(" ")} ${f.summary ?? ""}`,
      run: () => {
        onClose();
        nav("/files?focus=" + encodeURIComponent(f.id));
      },
    }));
    return [...fileCmds, ...baseCommands];
  }, [files, baseCommands, nav, onClose]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return allCommands;
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.keywords.toLowerCase().includes(query)
    );
  }, [allCommands, q]);

  const grouped = useMemo(() => {
    const m = new Map<string, Cmd[]>();
    for (const c of filtered) {
      if (!m.has(c.section)) m.set(c.section, []);
      m.get(c.section)!.push(c);
    }
    return Array.from(m.entries());
  }, [filtered]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  const run = (i: number) => {
    const c = filtered[i];
    if (c) {
      Promise.resolve(c.run()).catch((e) => toast.error(String(e)));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        run(active);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active]); // eslint-disable-line

  if (!open) return null;

  let flatIdx = -1;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-md flex items-start justify-center pt-[15vh]"
      >
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[640px] max-w-[92vw] max-h-[70vh] glass-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--color-border-subtle)]">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索文件、跳转、动作、切换模型..."
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--color-text-tertiary)]"
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] font-mono">
              ESC
            </kbd>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-[12px] text-[var(--color-text-tertiary)]">
                没有匹配项
              </div>
            )}
            {grouped.map(([section, items]) => (
              <div key={section} className="mb-1">
                <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                  {section}
                </div>
                {items.map((c) => {
                  flatIdx++;
                  const isActive = flatIdx === active;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(flatIdx)}
                      onClick={() => run(flatIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                        isActive ? "bg-[var(--color-bg-card)]" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                      <span className="text-[13px] text-[var(--color-text-primary)] flex-1 truncate">
                        {c.label}
                      </span>
                      {c.hint && (
                        <span className="text-[10.5px] text-[var(--color-text-tertiary)] font-mono truncate max-w-[260px]">
                          {c.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--color-border-subtle)] px-4 py-1.5 text-[10px] text-[var(--color-text-tertiary)] font-mono flex items-center gap-3">
            <span>↑↓ 选择</span>
            <span>↵ 执行</span>
            <span>ESC 关闭</span>
            <span className="ml-auto">⌘P 唤起</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
