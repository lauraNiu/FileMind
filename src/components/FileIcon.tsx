import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code2,
  File as FileIconBase,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileIconProps {
  ext: string;
  className?: string;
}

const EXT_MAP: Record<string, { Icon: typeof FileIconBase; color: string }> = {
  pdf: { Icon: FileType, color: "text-rose-400" },
  docx: { Icon: FileText, color: "text-blue-400" },
  doc: { Icon: FileText, color: "text-blue-400" },
  pptx: { Icon: Presentation, color: "text-orange-400" },
  ppt: { Icon: Presentation, color: "text-orange-400" },
  xlsx: { Icon: FileSpreadsheet, color: "text-emerald-400" },
  xls: { Icon: FileSpreadsheet, color: "text-emerald-400" },
  csv: { Icon: FileSpreadsheet, color: "text-emerald-400" },
  png: { Icon: ImageIcon, color: "text-violet-400" },
  jpg: { Icon: ImageIcon, color: "text-violet-400" },
  jpeg: { Icon: ImageIcon, color: "text-violet-400" },
  gif: { Icon: ImageIcon, color: "text-violet-400" },
  webp: { Icon: ImageIcon, color: "text-violet-400" },
  mp4: { Icon: Video, color: "text-pink-400" },
  mov: { Icon: Video, color: "text-pink-400" },
  mp3: { Icon: Music, color: "text-yellow-400" },
  wav: { Icon: Music, color: "text-yellow-400" },
  zip: { Icon: Archive, color: "text-amber-400" },
  tar: { Icon: Archive, color: "text-amber-400" },
  gz: { Icon: Archive, color: "text-amber-400" },
  rar: { Icon: Archive, color: "text-amber-400" },
  py: { Icon: Code2, color: "text-cyan-400" },
  ts: { Icon: Code2, color: "text-sky-400" },
  tsx: { Icon: Code2, color: "text-sky-400" },
  js: { Icon: Code2, color: "text-yellow-300" },
  jsx: { Icon: Code2, color: "text-yellow-300" },
  rs: { Icon: Code2, color: "text-orange-300" },
  go: { Icon: Code2, color: "text-cyan-300" },
  md: { Icon: FileText, color: "text-zinc-300" },
  txt: { Icon: FileText, color: "text-zinc-400" },
};

export function FileIcon({ ext, className }: FileIconProps) {
  const e = ext.toLowerCase().replace(".", "");
  const entry = EXT_MAP[e] || { Icon: FileIconBase, color: "text-zinc-400" };
  const Icon = entry.Icon;
  return <Icon className={cn(entry.color, className)} strokeWidth={1.8} />;
}
