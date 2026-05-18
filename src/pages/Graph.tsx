import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { Search, Share2, RotateCw, Maximize2, Sparkles, Wand2, Palette } from "lucide-react";
import { toast } from "sonner";

const EXT_COLORS: Record<string, string> = {
  pdf: "#f43f5e",
  docx: "#3b82f6", doc: "#3b82f6", md: "#94a3b8", txt: "#94a3b8",
  pptx: "#f97316", ppt: "#f97316", key: "#f97316",
  xlsx: "#22c55e", xls: "#22c55e", csv: "#22c55e",
  png: "#a855f7", jpg: "#a855f7", jpeg: "#a855f7", gif: "#a855f7",
  webp: "#a855f7", svg: "#a855f7", heic: "#a855f7", cr2: "#a855f7",
  mp4: "#ec4899", mov: "#ec4899",
  mp3: "#eab308", wav: "#eab308",
  zip: "#f59e0b", tar: "#f59e0b", gz: "#f59e0b", dmg: "#f59e0b", pkg: "#f59e0b",
  py: "#06b6d4", ts: "#0ea5e9", tsx: "#0ea5e9",
  js: "#facc15", jsx: "#facc15",
  rs: "#fb923c", go: "#0ea5e9",
  fig: "#a78bfa", sketch: "#a78bfa", psd: "#a78bfa",
};

function colorForExt(ext: string): string {
  return EXT_COLORS[ext.toLowerCase()] ?? "#6c7088";
}

import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { FileDetailDrawer } from "@/components/FileDetailDrawer";
import { api } from "@/lib/api";
import type { GraphData, GraphNode, FileItem } from "@/lib/types";

const RELATION_COLORS: Record<string, string> = {
  reference: "#38bdf8",
  derived: "#f59e0b",
  "co-project": "#22c55e",
  similar: "#a78bfa",
};

const RELATION_LABELS: Record<string, string> = {
  reference: "引用",
  derived: "派生",
  "co-project": "同项目",
  similar: "相似",
};

type GraphInstance = ForceGraphMethods<GraphNode, { source: string; target: string; relation: string; weight: number }>;

export function Graph() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState<null | "heuristic" | "ai">(null);
  const [colorMode, setColorMode] = useState<"project" | "type">("project");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(["reference", "derived", "co-project", "similar"])
  );
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [openFile, setOpenFile] = useState<FileItem | null>(null);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<GraphInstance | undefined>(undefined);
  const [size, setSize] = useState({ w: 800, h: 600 });

  const reload = () => {
    setLoading(true);
    api
      .getGraphData(undefined, 300)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    let unlisten: (() => void) | null = null;
    api.onScanProgress((e) => {
      if (e.done) {
        reload();
      }
    }).then((u) => {
      unlisten = u;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const links = data.links.filter((l) => activeFilters.has(l.relation));
    const activeIds = new Set<string>();
    for (const l of links) {
      const src = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
      const dst = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
      activeIds.add(src);
      activeIds.add(dst);
    }
    const nodes = data.nodes.filter((n) => activeIds.has(n.id));
    return { nodes, links };
  }, [data, activeFilters]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      data.nodes
        .filter((n) => n.name.toLowerCase().includes(q))
        .map((n) => n.id)
    );
  }, [data.nodes, query]);

  const toggleFilter = (rel: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  };

  const handleNodeClick = async (node: GraphNode) => {
    try {
      const f = await api.getFileDetail(node.id);
      setOpenFile(f);
    } catch {
      // ignore
    }
  };

  const recenter = () => {
    fgRef.current?.zoomToFit(400, 60);
  };

  const projectsColorMap = useMemo(() => {
    const palette = ["#22c55e", "#a78bfa", "#38bdf8", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#3b82f6"];
    const m = new Map<string, string>();
    let i = 0;
    for (const n of data.nodes) {
      if (n.project_id && !m.has(n.project_id)) {
        m.set(n.project_id, palette[i % palette.length]);
        i++;
      }
    }
    return m;
  }, [data.nodes]);

  const relationCounts = useMemo(() => {
    const counts: Record<string, number> = { reference: 0, derived: 0, "co-project": 0, similar: 0 };
    for (const l of data.links) counts[l.relation] = (counts[l.relation] ?? 0) + 1;
    return counts;
  }, [data.links]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-end justify-between mb-1">
          <div>
            <h1 className="text-[24px] font-display font-semibold tracking-tight flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[var(--color-ai)]" />
              关系图谱
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
              {data.nodes.length} 个节点 · {data.links.length} 条边 · 颜色按项目，连线颜色按关系类型
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setEnriching("heuristic");
                try {
                  const r = await api.enrichGraph(false, 200);
                  toast.success(`规则派生：+${r.heuristic_added} 条关系`);
                  reload();
                } catch (e) {
                  toast.error("派生失败：" + String(e));
                } finally {
                  setEnriching(null);
                }
              }}
              disabled={!!enriching}
              className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]/40 text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Wand2 className={`w-3.5 h-3.5 ${enriching === "heuristic" ? "animate-pulse" : ""}`} />
              {enriching === "heuristic" ? "派生中..." : "规则派生"}
            </button>
            <button
              onClick={async () => {
                setEnriching("ai");
                try {
                  const r = await api.enrichGraph(true, 50);
                  toast.success(
                    `AI 分析了 ${r.analyzed} 个文件 · 规则 +${r.heuristic_added} · AI +${r.ai_added}${
                      r.ai_skipped ? ` (跳重复 ${r.ai_skipped})` : ""
                    }`
                  );
                  reload();
                } catch (e) {
                  toast.error("AI 补图失败：" + String(e));
                } finally {
                  setEnriching(null);
                }
              }}
              disabled={!!enriching}
              className="px-3 py-1.5 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 hover:bg-[var(--color-ai)]/20 text-[12px] text-[var(--color-ai)] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${enriching === "ai" ? "animate-pulse" : ""}`} />
              {enriching === "ai" ? "AI 思考中..." : "AI 智能补图"}
            </button>
            <div className="flex items-center gap-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] p-0.5">
              <button
                onClick={() => setColorMode("project")}
                className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 ${
                  colorMode === "project"
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
                title="按项目染色"
              >
                <Palette className="w-3 h-3" />
                项目
              </button>
              <button
                onClick={() => setColorMode("type")}
                className={`px-2 py-1 text-[11px] rounded ${
                  colorMode === "type"
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
                title="按文件类型染色"
              >
                类型
              </button>
            </div>
            <button
              onClick={recenter}
              className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5"
              title="重置视图"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={reload}
              className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5"
              title="刷新"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 pb-4 flex items-center gap-3 flex-wrap">
        <GlassCard variant="subtle" className="px-3 py-1.5 flex items-center gap-2 flex-1 max-w-[360px]">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在图中搜索节点..."
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[var(--color-text-tertiary)]"
          />
          {searched.size > 0 && (
            <span className="text-[10px] font-mono text-[var(--color-accent)] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10">
              命中 {searched.size}
            </span>
          )}
        </GlassCard>

        <div className="flex items-center gap-1.5">
          {(Object.keys(RELATION_LABELS) as (keyof typeof RELATION_LABELS)[]).map((rel) => {
            const active = activeFilters.has(rel);
            return (
              <button
                key={rel}
                onClick={() => toggleFilter(rel)}
                style={{
                  borderColor: active ? RELATION_COLORS[rel] : "transparent",
                  color: active ? RELATION_COLORS[rel] : "#6c7088",
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 border bg-[var(--color-bg-card)] transition-all ${
                  active ? "" : "opacity-60"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: active ? RELATION_COLORS[rel] : "#6c7088" }}
                />
                {RELATION_LABELS[rel]}
                <span className="opacity-60">· {relationCounts[rel]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 mx-8 mb-8 relative rounded-xl glass overflow-hidden ring-grid">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-base)]/50 z-10">
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] font-mono">
              <RotateCw className="w-4 h-4 animate-spin text-[var(--color-ai)]" />
              加载图谱数据...
            </div>
          </div>
        )}

        {!loading && data.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <Share2 className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-tertiary)]" strokeWidth={1.5} />
              <div className="text-[14px] text-[var(--color-text-secondary)] mb-1">还没有关系数据</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">
                扫描更多文件让 AI 自动识别关系
              </div>
            </div>
          </div>
        )}

        {filtered.nodes.length > 0 && (
          <ForceGraph2D
            ref={fgRef as never}
            graphData={filtered as never}
            width={size.w}
            height={size.h}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={4}
            cooldownTicks={120}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            linkColor={(l) => RELATION_COLORS[(l as { relation: string }).relation] ?? "#3a4060"}
            linkWidth={(l) => 0.6 + (l as { weight: number }).weight * 1.2}
            linkDirectionalParticles={(l) => (activeFilters.has((l as { relation: string }).relation) ? 1 : 0)}
            linkDirectionalParticleWidth={1.6}
            linkDirectionalParticleSpeed={0.006}
            onNodeClick={(n) => handleNodeClick(n as GraphNode)}
            onNodeHover={(n) => setHoverNode(n as GraphNode | null)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const n = node as GraphNode & { x?: number; y?: number };
              if (n.x === undefined || n.y === undefined) return;

              const projectColor = n.project_id
                ? projectsColorMap.get(n.project_id) ?? "#a78bfa"
                : "#6c7088";
              const typeColor = colorForExt(n.ext);

              const fillColor = colorMode === "project" ? projectColor : typeColor;
              const ringColor = colorMode === "project" ? typeColor : projectColor;

              const isSearched = searched.has(n.id);
              const isHover = hoverNode?.id === n.id;
              const r = 4 + Math.min(n.val ?? 2, 6);

              if (isSearched || isHover) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, r + 6, 0, 2 * Math.PI);
                ctx.fillStyle = `${fillColor}33`;
                ctx.fill();
              }

              ctx.beginPath();
              ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = fillColor;
              ctx.fill();

              ctx.strokeStyle = isHover ? "#f4f5f8" : ringColor;
              ctx.lineWidth = isHover ? 2 : 1.4;
              ctx.stroke();

              if (globalScale > 1.4 || isHover || isSearched) {
                const fontSize = Math.max(9, 11 / globalScale);
                ctx.font = `${fontSize}px Fira Sans, sans-serif`;
                ctx.fillStyle = "#f4f5f8";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const label = n.name.length > 18 ? n.name.slice(0, 16) + "…" : n.name;
                ctx.fillText(label, n.x, n.y + r + 2);
              }
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const n = node as GraphNode & { x?: number; y?: number };
              if (n.x === undefined || n.y === undefined) return;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(n.x, n.y, 8, 0, 2 * Math.PI);
              ctx.fill();
            }}
            onEngineStop={() => fgRef.current?.zoomToFit(400, 60)}
          />
        )}

        {hoverNode && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 max-w-[320px] pointer-events-none"
          >
            <GlassCard variant="strong" className="px-3 py-2">
              <div className="text-[12px] font-medium truncate">{hoverNode.name}</div>
              <div className="text-[10px] font-mono text-[var(--color-text-tertiary)] mt-0.5">
                {hoverNode.project_name ?? "未归类"} · {hoverNode.ext}
              </div>
              <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                单击打开详情
              </div>
            </GlassCard>
          </motion.div>
        )}

        {data.nodes.length > 0 && (
          <div className="absolute top-4 right-4 p-2.5 rounded-md glass max-w-[200px]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-1.5">
              {colorMode === "project" ? "项目（填充）/ 类型（环）" : "类型（填充）/ 项目（环）"}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono">
              {colorMode === "type"
                ? Object.entries({
                    文档: "#3b82f6",
                    PPT: "#f97316",
                    表格: "#22c55e",
                    图片: "#a855f7",
                    代码: "#06b6d4",
                    PDF: "#f43f5e",
                    设计: "#a78bfa",
                    其它: "#6c7088",
                  }).map(([k, c]) => (
                    <div key={k} className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                      {k}
                    </div>
                  ))
                : Array.from(projectsColorMap.entries()).slice(0, 8).map(([pid, c]) => {
                    const sample = data.nodes.find((n) => n.project_id === pid);
                    const label = sample?.project_name ?? pid.slice(0, 10);
                    return (
                      <div key={pid} className="flex items-center gap-1 text-[var(--color-text-secondary)] truncate" title={label}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-[10px] font-mono text-[var(--color-text-tertiary)] flex items-center gap-2 px-2.5 py-1.5 rounded-md glass">
          <span>滚轮缩放 · 拖拽平移 · 单击节点</span>
        </div>
      </div>

      <FileDetailDrawer file={openFile} onClose={() => setOpenFile(null)} />
    </div>
  );
}
