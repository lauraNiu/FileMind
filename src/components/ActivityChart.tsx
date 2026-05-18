import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

interface Props {
  days?: number;
}

export function ActivityChart({ days = 30 }: Props) {
  const [data, setData] = useState<{ date: string; count: number; ts: number }[]>([]);

  useEffect(() => {
    api
      .activityTimeline(days)
      .then((arr) => {
        const map = new Map<number, number>();
        for (const d of arr) map.set(d.day, d.count);

        const out: { date: string; count: number; ts: number }[] = [];
        const today = Math.floor(Date.now() / 86400000);
        for (let i = days - 1; i >= 0; i--) {
          const day = today - i;
          const ts = day * 86400000;
          out.push({
            date: new Date(ts).toLocaleDateString("zh-CN", {
              month: "numeric",
              day: "numeric",
            }),
            count: map.get(day) ?? 0,
            ts,
          });
        }
        setData(out);
      })
      .catch(() => setData([]));
  }, [days]);

  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);
  const peakDay = data.find((d) => d.count === max);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-baseline gap-3 mb-1">
        <div className="text-[24px] font-display font-bold leading-none">
          {formatNumber(total)}
        </div>
        <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
          {days} 天文件活跃
        </div>
      </div>
      {peakDay && peakDay.count > 0 && (
        <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono mb-2">
          高峰：{peakDay.date} · {peakDay.count} 文件
        </div>
      )}
      <div className="flex-1 -mx-2 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "#6c7088", fontFamily: "Fira Code" }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(days / 6)}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ stroke: "#2b2f42", strokeWidth: 1 }}
              contentStyle={{
                background: "rgba(17,19,26,0.95)",
                border: "1px solid #2b2f42",
                borderRadius: 6,
                fontSize: 11,
                padding: "4px 8px",
                fontFamily: "Fira Code",
              }}
              labelStyle={{ color: "#a0a5b8" }}
              itemStyle={{ color: "#22c55e" }}
              formatter={((v: unknown) => [`${Number(v) || 0} 文件`, "活跃"]) as never}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#22c55e"
              strokeWidth={1.5}
              fill="url(#actGrad)"
              isAnimationActive={true}
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
