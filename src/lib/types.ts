export interface FileItem {
  id: string;
  name: string;
  path: string;
  ext: string;
  size: number;
  mtime: number;
  mime_type: string;
  summary: string | null;
  tags: string[];
  project_id: string | null;
  project_name: string | null;
  access_count: number;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  file_count: number;
  total_size: number;
  last_active: number;
  status: "active" | "archived";
  top_files: string[];
}

export interface DashboardStats {
  total_files: number;
  total_size: number;
  active_projects: number;
  total_projects: number;
  duplicate_groups: number;
  duplicate_size: number;
  temp_files_count: number;
  weekly_added: number;
  ai_used_yuan: number;
  ai_budget_yuan: number;
  ext_distribution: { ext: string; count: number }[];
  scan_progress: { current: number; total: number; status: string };
}

export interface SearchResult {
  file: FileItem;
  score: number;
  highlight: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  files?: FileItem[];
  reasoning?: string;
}

export interface RelatedFile {
  file: FileItem;
  relation: "reference" | "derived" | "co-project" | "similar";
}

export interface GraphNode {
  id: string;
  name: string;
  ext: string;
  size: number;
  project_id: string | null;
  project_name: string | null;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: "reference" | "derived" | "co-project" | "similar";
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ScanResult {
  indexed: number;
  skipped: number;
  root: string;
  project_id: string;
}

export interface ScanProgressEvent {
  scanned: number;
  indexed: number;
  current_path: string;
  done: boolean;
  project_id: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}
