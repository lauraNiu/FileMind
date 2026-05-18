import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import type { DashboardStats } from "@/lib/types";

const PALETTE = [
  "#22c55e",
  "#a78bfa",
  "#38bdf8",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

interface Props {
  data: DashboardStats["ext_distribution"];
  totalFiles: number;
}

export function ExtDistChart({ data, totalFiles }: Props) {
  const top = data.slice(0, 8);
  const sumTop = top.reduce((s, d) => s + d.count, 0);
  const others = totalFiles - sumTop;
  const chartData = others > 0 ? [...top, { ext: "其它", count: others }] : top;

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 min-h-0 relative -mx-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="ext"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={1.5}
              animationDuration={800}
              animationBegin={120}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === chartData.length - 1 && others > 0 ? "#3a4060" : PALETTE[i % PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              contentStyle={{
                background: "rgba(17,19,26,0.95)",
                border: "1px solid #2b2f42",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "Fira Code, monospace",
                padding: "6px 10px",
              }}
              itemStyle={{ color: "#f4f5f8" }}
              labelStyle={{ color: "#a0a5b8", marginBottom: 2 }}
              formatter={((val: unknown, _name: unknown, item: unknown) => {
                const n = Number(val) || 0;
                const pct = ((n / totalFiles) * 100).toFixed(1);
                const payload = (item as { payload?: { fill?: string; ext?: string } })?.payload;
                return [
                  <span key="v" style={{ color: payload?.fill }}>
                    {formatNumber(n)}{" "}
                    <span style={{ color: "#6c7088" }}>· {pct}%</span>
                  </span>,
                  payload?.ext ?? "",
                ];
              }) as never}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-[20px] font-display font-bold leading-none">
              {formatNumber(totalFiles)}
            </div>
            <div className="text-[10px] font-mono text-[var(--color-text-tertiary)] mt-1">
              文件
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono mt-2">
        {chartData.map((d, i) => {
          const isOthers = i === chartData.length - 1 && others > 0;
          const color = isOthers ? "#3a4060" : PALETTE[i % PALETTE.length];
          return (
            <motion.div
              key={d.ext}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.03 }}
              className="flex items-center justify-between gap-1"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: color }}
                />
                <span className="text-[var(--color-text-secondary)] truncate">
                  {d.ext}
                </span>
              </span>
              <span className="text-[var(--color-text-tertiary)]">{d.count}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
