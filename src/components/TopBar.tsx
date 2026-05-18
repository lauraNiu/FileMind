import { useEffect, useRef, useState } from "react";
import { Search, Settings as SettingsIcon, LogOut, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PortalPopover } from "./PortalPopover";
import { api } from "@/lib/api";
import type { AppConfig } from "@/lib/types";

export function TopBar() {
  const nav = useNavigate();
  const [openSettings, setOpenSettings] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const userRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    api.getConfig().then(setCfg).catch(() => {});
  }, [openSettings, openUser]);

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
          <SettingsIcon className="w-[16px] h-[16px]" />
        </button>
        <button
          ref={userRef}
          onClick={() => {
            setOpenUser((v) => !v);
            setOpenSettings(false);
          }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-accent)] flex items-center justify-center text-white text-[12px] font-display font-bold hover:scale-105 transition-transform"
        >
          {cfg?.profile.avatar_initial || cfg?.profile.name?.[0]?.toUpperCase() || "?"}
        </button>
      </div>

      <PortalPopover
        anchorRef={settingsRef}
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        title="快速设置"
        width={320}
      >
        <Row label="AI 模型" value={cfg?.ai.model || "—"} />
        <Row label="月预算" value={`¥${cfg?.ai.budget_yuan ?? "—"}`} />
        <Row label="敏感目录" value={`${cfg?.scan.sensitive_dirs.length ?? 0} 个`} />
        <Row label="排除规则" value={`${cfg?.scan.excluded_dirs.length ?? 0} 条`} />
        <button
          onClick={() => {
            setOpenSettings(false);
            nav("/settings");
          }}
          className="mt-3 w-full px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] hover:bg-[var(--color-bg-card-hover)] text-[12px] flex items-center justify-center gap-1.5 transition-colors"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          打开完整设置
        </button>
      </PortalPopover>

      <PortalPopover
        anchorRef={userRef}
        open={openUser}
        onClose={() => setOpenUser(false)}
        title="账号"
        width={280}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-accent)] flex items-center justify-center text-white text-[16px] font-display font-bold">
            {cfg?.profile.avatar_initial || cfg?.profile.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">
              {cfg?.profile.name || "未登录"}
            </div>
            <div className="text-[10.5px] text-[var(--color-text-tertiary)] font-mono">
              本地账号 · v0.4
            </div>
          </div>
        </div>
        <Row label="模型" value={cfg?.ai.model || "—"} />
        <Row label="API Key" value={cfg?.ai.api_key ? "✓ 已配置" : "✗ 未配置"} />
        <Row
          label="加入于"
          value={
            cfg?.profile.created_at
              ? new Date(cfg.profile.created_at * 1000).toLocaleDateString("zh-CN")
              : "—"
          }
        />
        <div className="border-t border-[var(--color-border-subtle)] mt-3 pt-2 space-y-1">
          <button
            onClick={() => {
              setOpenUser(false);
              nav("/settings");
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            设置
          </button>
          <button
            onClick={async () => {
              if (!window.confirm("退出登录会清除你的个人资料和 API Key？")) return;
              try {
                await api.logout();
                setOpenUser(false);
                toast.success("已退出登录");
                setTimeout(() => nav("/welcome"), 300);
              } catch (e) {
                toast.error(String(e));
              }
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            退出登录
          </button>
        </div>
        <div className="mt-3 pt-2 border-t border-[var(--color-border-subtle)]">
          <a
            href="https://github.com/lauraNiu/FileMind"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10.5px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] font-mono"
          >
            github.com/lauraNiu/FileMind
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </PortalPopover>
    </header>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px] py-1">
      <span className="text-[var(--color-text-tertiary)] shrink-0">{label}</span>
      <span className="text-right text-[var(--color-text-secondary)] truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
