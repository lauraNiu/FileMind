import { useState } from "react";
import { Search, Settings, User, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export function TopBar() {
  const nav = useNavigate();
  const [openSettings, setOpenSettings] = useState(false);
  const [openUser, setOpenUser] = useState(false);

  return (
    <header className="h-14 flex items-center px-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]/50 backdrop-blur-md relative">
      <div className="flex-1 max-w-[560px] mx-auto">
        <button
          onClick={() => nav("/files")}
          className="group w-full h-9 flex items-center gap-2 px-3 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] transition-colors text-left"
        >
          <Search className="w-[14px] h-[14px] text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]" />
          <span className="flex-1 text-[13px] text-[var(--color-text-tertiary)]">
            搜索或问任何问题...
          </span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 relative">
        <button
          onClick={() => {
            setOpenSettings((v) => !v);
            setOpenUser(false);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] transition-colors"
        >
          <Settings className="w-[16px] h-[16px]" />
        </button>
        <button
          onClick={() => {
            setOpenUser((v) => !v);
            setOpenSettings(false);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] transition-colors"
        >
          <User className="w-[16px] h-[16px]" />
        </button>

        <AnimatePresence>
          {openSettings && (
            <Popover onClose={() => setOpenSettings(false)} title="设置">
              <Row label="AI 模型" value={import.meta.env.VITE_MODEL || "glm-4-air"} hint="在 .env 修改 ZHIPU_MODEL" />
              <Row label="月预算" value="¥30" hint="超额后降级 / mock" />
              <Row label="敏感目录" value="未设置" hint="即将上线" />
              <Row label="索引位置" value="~/Library/Application Support/FileMind/" mono />
              <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-tertiary)]">
                完整设置中心是 Phase 2 计划，目前可在 .env 与 Dashboard 上的"索引一个真实目录"卡片操作
              </div>
            </Popover>
          )}
          {openUser && (
            <Popover onClose={() => setOpenUser(false)} title="账号">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-accent)] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[13px] font-medium">FileMind 本地版</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono">v0.1 · MVP</div>
                </div>
              </div>
              <Row label="后端" value="智谱 GLM-4" />
              <Row label="数据" value="100% 本地 SQLite" />
              <Row label="代码" value="github.com/lauraNiu/FileMind" mono />
            </Popover>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function Popover({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-2 w-[300px] glass-strong rounded-xl shadow-2xl p-4 z-50"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
          {title}
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="text-[var(--color-text-tertiary)] shrink-0">{label}</span>
      <span
        className={`text-right text-[var(--color-text-secondary)] truncate ${
          mono ? "font-mono text-[11px]" : ""
        }`}
        title={value + (hint ? ` · ${hint}` : "")}
      >
        {value}
      </span>
    </div>
  );
}
