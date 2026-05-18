import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";
import { api } from "@/lib/api";
import type { TagCount } from "@/lib/types";

const PALETTE = ["#22c55e", "#a78bfa", "#38bdf8", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#84cc16"];

export function TopTagsCard() {
  const nav = useNavigate();
  const [tags, setTags] = useState<TagCount[]>([]);

  useEffect(() => {
    api.topTags(12).then(setTags).catch(() => {});
  }, []);

  const max = Math.max(...tags.map((t) => Number(t.count)), 1);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
          Top 标签
        </span>
        <span className="ml-auto text-[10px] text-[var(--color-text-tertiary)] font-mono">
          点击筛选
        </span>
      </div>
      {tags.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--color-text-tertiary)]">
          扫描后会生成标签
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto flex-1 -mr-2 pr-2">
          {tags.map((t, i) => {
            const w = (Number(t.count) / max) * 100;
            const color = PALETTE[i % PALETTE.length];
            return (
              <motion.button
                key={t.tag}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.02 }}
                onClick={() => nav(`/files?tag=${encodeURIComponent(t.tag)}`)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: color }} />
                    {t.tag}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] shrink-0">
                    {t.count}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.6, delay: 0.05 + i * 0.02 }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
