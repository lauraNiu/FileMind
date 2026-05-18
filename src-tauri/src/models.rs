use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub ext: String,
    pub size: i64,
    pub mtime: i64,
    pub mime_type: String,
    pub summary: Option<String>,
    pub tags: Vec<String>,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub access_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub file_count: i64,
    pub total_size: i64,
    pub last_active: i64,
    pub status: String,
    pub top_files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub current: i64,
    pub total: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtDist {
    pub ext: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_files: i64,
    pub total_size: i64,
    pub active_projects: i64,
    pub total_projects: i64,
    pub duplicate_groups: i64,
    pub duplicate_size: i64,
    pub temp_files_count: i64,
    pub weekly_added: i64,
    pub ai_used_yuan: f64,
    pub ai_budget_yuan: f64,
    pub ext_distribution: Vec<ExtDist>,
    pub scan_progress: ScanProgress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub file: FileItem,
    pub score: f64,
    pub highlight: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelatedFile {
    pub file: FileItem,
    pub relation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatTurn {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub reasoning: Option<String>,
    pub file_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub ext: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub size: i64,
    pub val: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
    pub relation: String,
    pub weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub indexed: i64,
    pub skipped: i64,
    pub root: String,
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnrichResult {
    pub analyzed: i64,
    pub heuristic_added: i64,
    pub ai_added: i64,
    pub ai_skipped: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagCount {
    pub tag: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DayCount {
    pub day: i64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OperationTarget {
    pub file_id: String,
    pub file_name: String,
    pub from_path: String,
    pub to_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationBefore {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationRecord {
    pub id: String,
    pub op_type: String,
    pub target: OperationTarget,
    pub before: Option<OperationBefore>,
    pub actor: String,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanCountInfo {
    pub total: i64,
}

