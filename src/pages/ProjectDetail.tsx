import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FolderOpen,
  Sparkles,
  MessageCircle,
  Share2,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FileRow } from "@/components/FileRow";
import { FileDetailDrawer } from "@/components/FileDetailDrawer";
import { ExtDistChart } from "@/components/ExtDistChart";
import { api } from "@/lib/api";
import type { FileItem, Project } from "@/lib/types";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFile, setOpenFile] = useState<FileItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([api.getProject(id), api.getProjectFiles(id)])
      .then(([p, f]) => {
        setProject(p);
        setFiles(f);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const tagFreq = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of files) {
      for (const t of f.tags) c[t] = (c[t] ?? 0) + 1;
    }
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [files]);

  const extDist = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of files) {
      const e = f.ext || "无";
      c[e] = (c[e] ?? 0) + 1;
    }
    return Object.entries(c)
      .map(([ext, count]) => ({ ext, count }))
      .sort((a, b) => b.count - a.count);
  }, [files]);

  const filesByType = useMemo(() => {
    const groups: Record<string, FileItem[]> = {
      文档: [],
      图片: [],
      表格: [],
      PPT: [],
      代码: [],
      其它: [],
    };
    for (const f of files) {
      const e = f.ext.toLowerCase();
      if (["pdf", "docx", "doc", "md", "txt"].includes(e)) groups["文档"].push(f);
      else if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(e))
        groups["图片"].push(f);
      else if (["xlsx", "xls", "csv"].includes(e)) groups["表格"].push(f);
      else if (["pptx", "ppt"].includes(e)) groups["PPT"].push(f);
      else if (
        ["py", "ts", "tsx", "js", "jsx", "rs", "go", "java", "c", "cpp"].includes(e)
      )
        groups["代码"].push(f);
      else groups["其它"].push(f);
    }
    return Object.entries(groups).filter(([, v]) => v.length > 0);
  }, [files]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[13px] text-[var(--color-text-secondary)] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-ai)]" />
        加载项目...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-8">
        <div className="text-[15px] text-[var(--color-text-secondary)]">
          找不到这个项目
        </div>
        <div className="text-[12px] text-[var(--color-text-tertiary)] font-mono">
          {error}
        </div>
        <button
          onClick={() => nav("/projects")}
          className="mt-2 px-4 py-2 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回项目列表
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full p-8 max-w-[1300px] mx-auto">
      <button
        onClick={() => nav("/projects")}
        className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        返回项目
      </button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-6 gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-11 h-11 rounded-lg bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/20 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5 text-[var(--color-ai)]" />
            </div>
            <h1 className="text-[26px] font-display font-semibold tracking-tight truncate">
              {project.name}
            </h1>
            {project.status === "active" ? (
              <span className="text-[10px] font-mono text-[var(--color-accent)] px-2 py-0.5 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] pulse-soft" />
                活跃
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] px-2 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
                归档
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-[13.5px] text-[var(--color-text-secondary)] leading-relaxed pl-14 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-ai)] mt-1 shrink-0" />
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => nav(`/chat?q=${encodeURIComponent("关于 " + project.name)}`)}
            className="px-3 py-1.5 rounded-md bg-[var(--color-ai)]/10 border border-[var(--color-ai)]/30 text-[var(--color-ai)] text-[12px] hover:bg-[var(--color-ai)]/15 flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            问关于此项目
          </button>
          <button
            onClick={() => nav("/graph")}
            className="px-3 py-1.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            看图谱
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <GlassCard className="col-span-12 md:col-span-3 p-5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
            文件数
          </div>
          <div className="text-[28px] font-display font-bold leading-none">
            {project.file_count}
          </div>
          <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] mt-1">
            {formatBytes(project.total_size)}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 md:col-span-3 p-5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
            最近活跃
          </div>
          <div className="text-[18px] font-display font-semibold leading-tight">
            {formatRelativeTime(project.last_active)}
          </div>
          <div className="text-[11px] font-mono text-[var(--color-text-tertiary)] mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(project.last_active * 1000).toLocaleDateString("zh-CN")}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 md:col-span-6 p-5 h-[140px]">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-1">
            类型分布
          </div>
          {extDist.length > 0 ? (
            <ExtDistChart data={extDist} totalFiles={files.length} />
          ) : (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--color-text-tertiary)]">
              暂无数据
            </div>
          )}
        </GlassCard>
      </div>

      {tagFreq.length > 0 && (
        <GlassCard className="p-5 mb-6">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-3">
            常见标签
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tagFreq.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => nav(`/files?tag=${encodeURIComponent(tag)}`)}
                className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] flex items-center gap-1.5"
              >
                {tag}
                <span className="text-[9px] text-[var(--color-text-tertiary)] font-mono">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-display font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            所有文件
            <span className="text-[11px] font-normal text-[var(--color-text-tertiary)] font-mono">
              {files.length}
            </span>
          </h2>
        </div>

        {filesByType.map(([group, list]) => (
          <div key={group} className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono mb-2">
              {group} · {list.length}
            </div>
            <div className="space-y-1">
              {list.slice(0, 20).map((f) => (
                <FileRow key={f.id} file={f} onClick={() => setOpenFile(f)} />
              ))}
              {list.length > 20 && (
                <button
                  onClick={() => nav(`/files?project=${encodeURIComponent(project.id)}`)}
                  className="px-4 py-2 text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] w-full text-center"
                >
                  显示剩余 {list.length - 20} 个文件 →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <FileDetailDrawer
        file={openFile}
        onClose={() => setOpenFile(null)}
        onTagsChanged={(fileId, newTags) =>
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, tags: newTags } : f))
          )
        }
      />
    </div>
  );
}
