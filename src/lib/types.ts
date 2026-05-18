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
  total_estimate: number;
  current_path: string;
  phase: "counting" | "indexing" | "deriving" | "done";
  done: boolean;
  project_id: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface EnrichResult {
  analyzed: number;
  heuristic_added: number;
  ai_added: number;
  ai_skipped: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface DayCount {
  day: number;
  count: number;
}

export interface UserProfile {
  name: string;
  avatar_initial: string;
  created_at: number;
}

export interface AiConfig {
  model: string;
  api_key: string;
  budget_yuan: number;
  provider: string;
}

export interface ScanConfig {
  excluded_dirs: string[];
  sensitive_dirs: string[];
  max_files_per_scan: number;
}

export interface AppConfig {
  profile: UserProfile;
  ai: AiConfig;
  scan: ScanConfig;
  theme: string;
  onboarded: boolean;
}

export interface OperationTarget {
  file_id: string;
  file_name: string;
  from_path: string;
  to_path: string;
}

export interface OperationBefore {
  name: string;
  path: string;
}

export interface OperationRecord {
  id: string;
  op_type: "move" | "rename" | "trash" | string;
  target: OperationTarget;
  before: OperationBefore | null;
  actor: string;
  reason: string | null;
  status: "applied" | "reverted" | "pending" | string;
  created_at: number;
}

export interface DuplicateGroup {
  hash: string;
  files: FileItem[];
  total_size: number;
  recoverable: number;
}

export interface TimelineBucket {
  day: number;
  date: string;
  files: FileItem[];
  count: number;
}

export interface BatchSummaryResult {
  processed: number;
  failed: number;
  remaining: number;
}

export interface WatchedRoot {
  path: string;
  project_id: string;
}

export interface WatchStatus {
  running: boolean;
  roots: WatchedRoot[];
}

export interface WatchEventPayload {
  kind: "create" | "remove" | "modify" | "rename-from" | "rename-to" | string;
  path: string;
  project_id: string | null;
}

export interface BatchSummaryProgress {
  current: number;
  total: number;
  file_name: string;
}
