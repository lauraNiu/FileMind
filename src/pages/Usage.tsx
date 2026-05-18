import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  RotateCw,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/api";
import type { AiUsageEntry, AiUsageStats } from "@/lib/types";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

const RANGES = [
  { value: 7, label: "7 天" },
  { value: 30, label: "30 天" },
  { value: 90, label: "90 天" },
];

const PURPOSE_LABEL: Record<string, string> = {
  chat: "对话",
  rename: "改名",
  embed: "向量",
  summary: "摘要",
};

const PURPOSE_COLOR: Record<string, string> = {
  chat: "#a78bfa",
  rename: "#22c55e",
  embed: "#38bdf8",
  summary: "#f59e0b",
};

export function Usage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [log, setLog] = useState<AiUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    Promise.all([api.aiUsageStats(days), api.listAiUsage(80)])
      .then(([s, l]) => {
        setStats(s);
        setLog(l);
      })
      .finally(() => setLoading(false));
  };
  useEffect(reload, [days]);

  const maxModelCost = Math.max(...(stats?.by_model.map((m) => m.cost) ?? [0]), 0.001);

  return (
    <div className="min-h-full p-8 max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight mb-1 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-[var(--color-ai)]" />
            AI 用量明细
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            过去 {days} 天调用记录 · 按模型 / 用途分类
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
            className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center gap-1.5 text-[12px]"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-12 gap-4 mb-6">
          <GlassCard className="col-span-12 md:col-span-4 p-5">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
              总调用
            </div>
            <div className="text-[32px] font-display font-bold leading-none">
              {formatNumber(stats.total_calls)}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-2">
              成功 {stats.success_calls} · 失败 {stats.total_calls - stats.success_calls}
            </div>
          </GlassCard>
          <GlassCard className="col-span-12 md:col-span-4 p-5">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
              总花费
            </div>
            <div className="text-[32px] font-display font-bold leading-none">
              ¥{stats.total_cost.toFixed(2)}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-2">
              平均 ¥{stats.total_calls > 0 ? (stats.total_cost / stats.total_calls).toFixed(4) : "0"} / 次
            </div>
          </GlassCard>
          <GlassCard className="col-span-12 md:col-span-4 p-5">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
              成功率
            </div>
            <div className="text-[32px] font-display font-bold leading-none text-[var(--color-accent)]">
              {stats.total_calls > 0
                ? Math.round((stats.success_calls / stats.total_calls) * 100)
                : 100}%
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono mt-2">
              过去 {days} 天
            </div>
          </GlassCard>
        </div>
      )}

      {stats && stats.by_model.length > 0 && (
        <GlassCard className="p-5 mb-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-3">
            按模型分布
          </div>
          <div className="space-y-2">
            {stats.by_model.map((m) => {
              const pct = (m.cost / maxModelCost) * 100;
              return (
                <div key={m.key}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-mono text-[var(--color-text-secondary)]">{m.key}</span>
                    <span className="text-[var(--color-text-tertiary)]">
                      {m.count} 次 · ¥{m.cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[var(--color-ai)] to-[var(--color-accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {stats && stats.by_purpose.length > 0 && (
        <GlassCard className="p-5 mb-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-3">
            按用途分布
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.by_purpose.map((p) => {
              const c = PURPOSE_COLOR[p.key] ?? "#6c7088";
              return (
                <div
                  key={p.key}
                  className="px-3 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                  <span className="text-[12px]">{PURPOSE_LABEL[p.key] ?? p.key}</span>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                    {p.count} 次 · ¥{p.cost.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border-subtle)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
          最近 {log.length} 条调用
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)] max-h-[500px] overflow-y-auto">
          {log.length === 0 && (
            <div className="px-5 py-10 text-center text-[12px] text-[var(--color-text-tertiary)]">
              暂无调用记录
            </div>
          )}
          {log.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-5 py-2.5 text-[12px] hover:bg-[var(--color-bg-card-hover)]/30"
            >
              {e.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-[var(--color-danger)] shrink-0" />
              )}
              <span
                className="font-mono px-1.5 py-0.5 rounded text-[10.5px] shrink-0"
                style={{
                  background: `${PURPOSE_COLOR[e.purpose] ?? "#6c7088"}1a`,
                  color: PURPOSE_COLOR[e.purpose] ?? "#6c7088",
                }}
              >
                {PURPOSE_LABEL[e.purpose] ?? e.purpose}
              </span>
              <span className="font-mono text-[var(--color-text-secondary)] truncate">{e.model}</span>
              <span className="text-[var(--color-text-tertiary)] font-mono ml-auto shrink-0">
                ¥{e.cost_yuan.toFixed(4)}
              </span>
              <span className="text-[var(--color-text-tertiary)] font-mono shrink-0 text-right w-[100px]">
                {formatRelativeTime(e.created_at)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {(!stats || stats.total_calls === 0) && (
        <GlassCard className="p-5 mt-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[var(--color-ai)] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            还没有 AI 调用记录。去 Chat 问点问题，或在 Dashboard 批量生成摘要，记录会出现在这里。
          </div>
        </GlassCard>
      )}
    </div>
  );
}
