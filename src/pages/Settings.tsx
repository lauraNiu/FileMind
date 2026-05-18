import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  Folder,
  Trash2,
  LogOut,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/api";
import { MODELS } from "@/lib/models";
import type { AppConfig } from "@/lib/types";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";

type Section = "profile" | "ai" | "scan" | "privacy" | "data" | "about";

const SECTIONS: { key: Section; label: string; icon: typeof UserIcon }[] = [
  { key: "profile", label: "个人资料", icon: UserIcon },
  { key: "ai", label: "AI & 模型", icon: Sparkles },
  { key: "scan", label: "扫描", icon: Folder },
  { key: "privacy", label: "隐私 & 敏感目录", icon: ShieldCheck },
  { key: "data", label: "数据管理", icon: Trash2 },
  { key: "about", label: "关于", icon: Sparkles },
];

export function Settings() {
  const nav = useNavigate();
  const [section, setSection] = useState<Section>("profile");
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState(30);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [sensitive, setSensitive] = useState<string[]>([]);
  const [maxFiles, setMaxFiles] = useState(5000);
  const [newExcluded, setNewExcluded] = useState("");
  const [testing, setTesting] = useState(false);

  const reload = () => {
    api.getConfig().then((c) => {
      setCfg(c);
      setName(c.profile.name);
      setApiKey(c.ai.api_key);
      setModel(c.ai.model);
      setBudget(c.ai.budget_yuan);
      setExcluded(c.scan.excluded_dirs);
      setSensitive(c.scan.sensitive_dirs);
      setMaxFiles(c.scan.max_files_per_scan || 5000);
    });
  };
  useEffect(reload, []);

  const saveProfile = async () => {
    if (!name.trim()) return toast.error("名字不能为空");
    await api.saveProfile(name);
    toast.success("个人资料已保存");
    reload();
  };

  const saveAi = async () => {
    const key = apiKey.includes("*") ? undefined : apiKey;
    await api.saveAiConfig(key, model, budget);
    toast.success("AI 配置已保存");
    reload();
  };

  const testAi = async () => {
    setTesting(true);
    try {
      const reply = await api.testAiConnection(
        apiKey.includes("*") ? undefined : apiKey,
        model
      );
      toast.success(`连接成功："${reply.slice(0, 40)}"`);
    } catch (e) {
      toast.error("连接失败：" + String(e).slice(0, 120));
    } finally {
      setTesting(false);
    }
  };

  const saveScan = async () => {
    await api.saveScanConfig(excluded, sensitive, maxFiles);
    toast.success("扫描配置已保存");
    reload();
  };

  const addExcluded = () => {
    const v = newExcluded.trim();
    if (!v) return;
    if (excluded.includes(v)) return;
    setExcluded([...excluded, v]);
    setNewExcluded("");
  };

  const addSensitive = async () => {
    const p = await dialogOpen({ directory: true, title: "选择敏感目录" });
    if (!p || typeof p !== "string") return;
    if (sensitive.includes(p)) return;
    setSensitive([...sensitive, p]);
  };

  const handleClearAll = async () => {
    if (!window.confirm("清空所有索引数据？\n（不会动你的真实文件）")) return;
    try {
      await api.clearAllData();
      toast.success("索引已清空");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("退出登录会清除你的个人资料和 API Key 配置。\n确定？")) return;
    try {
      await api.logout();
      toast.success("已退出，回到欢迎页");
      setTimeout(() => nav("/welcome"), 400);
    } catch (e) {
      toast.error(String(e));
    }
  };

  if (!cfg) {
    return (
      <div className="h-full flex items-center justify-center text-[13px] text-[var(--color-text-secondary)] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-ai)]" />
        加载设置...
      </div>
    );
  }

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1">
          设置
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          所有设置存在 <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-[var(--color-bg-card)]">~/Library/Application Support/FileMind/config.json</code>
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <nav className="col-span-3 space-y-0.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                  active
                    ? "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-border-default)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="col-span-9 space-y-5">
          {section === "profile" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6">
                <h2 className="text-[15px] font-display font-semibold mb-4">个人资料</h2>
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-accent)] flex items-center justify-center text-[24px] font-display font-bold text-white">
                    {cfg.profile.avatar_initial || (name ? name[0]?.toUpperCase() : "?")}
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                      名字
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] outline-none focus:border-[var(--color-ai)] text-[14px]"
                    />
                    <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-1">
                      注册于 {cfg.profile.created_at ? new Date(cfg.profile.created_at * 1000).toLocaleDateString("zh-CN") : "—"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 rounded-md bg-[var(--color-accent)] text-black text-[12.5px] font-medium hover:bg-[var(--color-accent)]/90"
                >
                  保存
                </button>
              </GlassCard>
            </motion.div>
          )}

          {section === "ai" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6 mb-4">
                <h2 className="text-[15px] font-display font-semibold mb-4">API Key</h2>
                <label className="block mb-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                  智谱 GLM API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] outline-none focus:border-[var(--color-ai)] text-[14px] font-mono"
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-1">
                  当前显示为脱敏后的 key · 填写新值会覆盖
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveAi}
                    className="px-4 py-2 rounded-md bg-[var(--color-accent)] text-black text-[12.5px] font-medium hover:bg-[var(--color-accent)]/90"
                  >
                    保存
                  </button>
                  <button
                    onClick={testAi}
                    disabled={testing || !apiKey}
                    className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[12.5px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {testing ? "测试中..." : "测试连接"}
                  </button>
                </div>
              </GlassCard>

              <GlassCard className="p-6 mb-4">
                <h2 className="text-[15px] font-display font-semibold mb-4">默认模型</h2>
                <div className="grid grid-cols-2 gap-2">
                  {MODELS.map((m) => {
                    const active = m.value === model;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setModel(m.value)}
                        className={`px-3 py-2.5 rounded-lg text-left border transition-colors ${
                          active
                            ? "bg-[var(--color-ai)]/15 border-[var(--color-ai)]/40"
                            : "bg-[var(--color-bg-card)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
                        }`}
                      >
                        <div className="text-[13px] font-medium flex items-center gap-1.5">
                          {m.label}
                          {active && <Check className="w-3 h-3 text-[var(--color-accent)]" />}
                          {m.tier === "experimental" && (
                            <span className="text-[9px] px-1 rounded bg-[var(--color-warning)]/15 text-[var(--color-warning)] font-mono">
                              实验
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-[var(--color-text-tertiary)] font-mono mt-0.5">
                          {m.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={saveAi}
                  className="mt-4 px-4 py-2 rounded-md bg-[var(--color-accent)] text-black text-[12.5px] font-medium hover:bg-[var(--color-accent)]/90"
                >
                  保存
                </button>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="text-[15px] font-display font-semibold mb-4">月预算</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] text-[var(--color-text-secondary)]">¥</span>
                  <input
                    type="number"
                    value={budget}
                    min="0"
                    step="5"
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-32 px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] outline-none focus:border-[var(--color-ai)] text-[14px] font-mono"
                  />
                  <span className="text-[12px] text-[var(--color-text-tertiary)]">/ 月</span>
                  <button
                    onClick={saveAi}
                    className="ml-auto px-4 py-2 rounded-md bg-[var(--color-accent)] text-black text-[12.5px] font-medium hover:bg-[var(--color-accent)]/90"
                  >
                    保存
                  </button>
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-2">
                  超出后降级到本地模型（即将上线）
                </div>
              </GlassCard>
            </motion.div>
          )}

          {section === "scan" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6 mb-4">
                <h2 className="text-[15px] font-display font-semibold mb-4">排除规则</h2>
                <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">
                  匹配到这些目录名时跳过（不递归）
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {excluded.map((e) => (
                    <span
                      key={e}
                      className="text-[12px] pl-2.5 pr-1 py-1 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center gap-1.5 font-mono"
                    >
                      {e}
                      <button
                        onClick={() => setExcluded(excluded.filter((x) => x !== e))}
                        className="w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--color-danger)]/20 hover:text-[var(--color-danger)]"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newExcluded}
                    onChange={(e) => setNewExcluded(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addExcluded()}
                    placeholder="比如：__pycache__"
                    className="flex-1 px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] outline-none focus:border-[var(--color-ai)] text-[13px] font-mono"
                  />
                  <button
                    onClick={addExcluded}
                    className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[12px] hover:bg-[var(--color-bg-card-hover)] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    添加
                  </button>
                </div>
              </GlassCard>

              <GlassCard className="p-6 mb-4">
                <h2 className="text-[15px] font-display font-semibold mb-4">单次扫描上限</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={maxFiles}
                    min="100"
                    step="500"
                    onChange={(e) => setMaxFiles(Number(e.target.value))}
                    className="w-32 px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] outline-none focus:border-[var(--color-ai)] text-[14px] font-mono"
                  />
                  <span className="text-[12px] text-[var(--color-text-tertiary)]">个文件</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-2">
                  防止扫描超大目录卡死
                </div>
              </GlassCard>

              <div className="flex justify-end">
                <button
                  onClick={saveScan}
                  className="px-5 py-2 rounded-md bg-[var(--color-accent)] text-black text-[13px] font-medium hover:bg-[var(--color-accent)]/90"
                >
                  保存所有扫描设置
                </button>
              </div>
            </motion.div>
          )}

          {section === "privacy" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6">
                <h2 className="text-[15px] font-display font-semibold mb-2">敏感目录</h2>
                <p className="text-[12px] text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                  标记后，这些目录中的文件内容**只在本地处理**（即将上线：自动降级到本地模型）
                </p>
                <div className="space-y-1.5 mb-3">
                  {sensitive.length === 0 && (
                    <div className="text-[12px] text-[var(--color-text-tertiary)] italic">
                      还没有敏感目录
                    </div>
                  )}
                  {sensitive.map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-sensitive)]" />
                      <span className="text-[12px] font-mono flex-1 truncate" title={s}>{s}</span>
                      <button
                        onClick={() => setSensitive(sensitive.filter((x) => x !== s))}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addSensitive}
                    className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-default)] text-[12px] hover:bg-[var(--color-bg-card-hover)] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    选择敏感目录
                  </button>
                  <button
                    onClick={saveScan}
                    className="ml-auto px-4 py-2 rounded-md bg-[var(--color-accent)] text-black text-[12.5px] font-medium hover:bg-[var(--color-accent)]/90"
                  >
                    保存
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {section === "data" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <GlassCard className="p-6">
                <h2 className="text-[15px] font-display font-semibold mb-2">清空索引</h2>
                <p className="text-[12px] text-[var(--color-text-secondary)] mb-4">
                  删除所有已索引的文件 / 项目 / 关系数据。<strong className="text-[var(--color-text-primary)]">不会动你的真实文件。</strong>
                </p>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 rounded-md bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/40 text-[var(--color-warning)] text-[12.5px] font-medium hover:bg-[var(--color-warning)]/25 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空索引数据库
                </button>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="text-[15px] font-display font-semibold mb-2">退出登录</h2>
                <p className="text-[12px] text-[var(--color-text-secondary)] mb-4">
                  清除个人资料和 API Key 配置，回到欢迎页重新设置。
                </p>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-[12.5px] font-medium hover:bg-[var(--color-danger)]/25 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  退出登录
                </button>
              </GlassCard>
            </motion.div>
          )}

          {section === "about" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-ai)] to-[var(--color-accent)] flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-[18px] font-display font-bold">FileMind</div>
                    <div className="text-[12px] text-[var(--color-text-tertiary)] font-mono">v0.4 · MVP</div>
                  </div>
                </div>
                <div className="space-y-2 text-[12.5px]">
                  <Row label="技术栈" value="Tauri 2 + React 19 + Rust + SQLite" />
                  <Row label="AI 提供方" value="智谱 GLM (OpenAI 兼容)" />
                  <Row label="存储" value="100% 本地" />
                  <Row label="代码仓库" value="github.com/lauraNiu/FileMind" mono />
                  <Row label="文档" value="ROADMAP.md · README.md" mono />
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--color-text-tertiary)]">{label}</span>
      <span className={`text-[var(--color-text-secondary)] ${mono ? "font-mono text-[11.5px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
