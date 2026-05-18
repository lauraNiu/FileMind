import { useRef, useState } from "react";
import { Search, Settings, User, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PortalPopover } from "./PortalPopover";

export function TopBar() {
  const nav = useNavigate();
  const [openSettings, setOpenSettings] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const userRef = useRef<HTMLButtonElement | null>(null);

  return (
    <header className="h-14 flex items-center px-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]/50 backdrop-blur-md">
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

      <div className="flex items-center gap-1">
        <button
          ref={settingsRef}
          onClick={() => {
            setOpenSettings((v) => !v);
            setOpenUser(false);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] transition-colors"
        >
          <Settings className="w-[16px] h-[16px]" />
        </button>
        <button
          ref={userRef}
          onClick={() => {
            setOpenUser((v) => !v);
            setOpenSettings(false);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] transition-colors"
        >
          <User className="w-[16px] h-[16px]" />
        </button>
      </div>

      <PortalPopover
        anchorRef={settingsRef}
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        title="设置"
        width={320}
      >
        <Row label="AI 模型" value="glm-4-air" hint="在 .env 修改 ZHIPU_MODEL" />
        <Row label="月预算" value="¥30" hint="超额后降级 / mock" />
        <Row label="敏感目录" value="未设置" hint="即将上线" />
        <Row
          label="索引位置"
          value="~/Library/Application Support/FileMind/"
          mono
        />
        <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-tertiary)] leading-relaxed">
          完整设置中心是 Phase 2 计划，目前可在 .env 与 Dashboard 上的"索引一个真实目录"卡片操作
        </div>
      </PortalPopover>

      <PortalPopover
        anchorRef={userRef}
        open={openUser}
        onClose={() => setOpenUser(false)}
        title="账号"
        width={300}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-accent)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[13px] font-medium">FileMind 本地版</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
              v0.3 · MVP
            </div>
          </div>
        </div>
        <Row label="后端" value="智谱 GLM-4" />
        <Row label="数据" value="100% 本地 SQLite" />
        <Row label="代码" value="github.com/lauraNiu/FileMind" mono />
      </PortalPopover>
    </header>
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
    <div className="flex items-baseline justify-between gap-2 text-[12px] py-1">
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
