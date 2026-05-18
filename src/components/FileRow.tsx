import { motion } from "framer-motion";
import type { FileItem } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { FileIcon } from "./FileIcon";

interface FileRowProps {
  file: FileItem;
  score?: number;
  highlight?: string | null;
  selected?: boolean;
  onClick?: () => void;
}

export function FileRow({ file, score, highlight, selected, onClick }: FileRowProps) {
  const displayName = highlight ?? file.name;
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className={cn(
        "group w-full flex items-start gap-3 px-4 py-3 text-left rounded-lg transition-colors duration-150",
        "border border-transparent",
        selected
          ? "bg-[var(--color-bg-card)] border-[var(--color-border-default)]"
          : "hover:bg-[var(--color-bg-card)] hover:border-[var(--color-border-subtle)]"
      )}
    >
      <div className="mt-0.5">
        <FileIcon ext={file.ext} className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[13.5px] font-medium text-[var(--color-text-primary)] truncate"
            dangerouslySetInnerHTML={{ __html: displayName }}
          />
          {score !== undefined && (
            <span className="text-[10px] font-mono text-[var(--color-accent)] bg-[var(--color-accent-glow)]/10 px-1.5 py-0.5 rounded">
              {Math.round(score * 100)}%
            </span>
          )}
          <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono ml-auto whitespace-nowrap">
            {formatRelativeTime(file.mtime)}
          </span>
        </div>
        <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono truncate mb-1">
          {file.path}
        </div>
        {file.summary && (
          <div className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 mb-1.5">
            {file.summary}
          </div>
        )}
        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {file.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}
