use std::sync::Arc;
use tauri::{AppHandle, State};

use crate::ai::ZhipuClient;
use crate::db::Db;
use crate::models::*;
use crate::scan;

pub struct AppState {
    pub db: Arc<Db>,
    pub ai: Option<ZhipuClient>,
}

#[tauri::command]
pub fn dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
    state.db.dashboard_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_files(
    state: State<AppState>,
    limit: i64,
    offset: i64,
) -> Result<Vec<FileItem>, String> {
    state.db.list_files(limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_file_detail(state: State<AppState>, id: String) -> Result<FileItem, String> {
    state.db.get_file(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_files(
    state: State<AppState>,
    query: String,
    limit: i64,
) -> Result<Vec<SearchResult>, String> {
    state.db.search_files(&query, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_projects(state: State<AppState>) -> Result<Vec<Project>, String> {
    state.db.list_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(state: State<AppState>, id: String) -> Result<Project, String> {
    let projects = state.db.list_projects().map_err(|e| e.to_string())?;
    projects
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| "项目不存在".to_string())
}

#[tauri::command]
pub fn get_project_files(state: State<AppState>, id: String) -> Result<Vec<FileItem>, String> {
    state.db.project_files(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_related_files(state: State<AppState>, id: String) -> Result<Vec<RelatedFile>, String> {
    state.db.related_files(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_graph_data(
    state: State<AppState>,
    focus_id: Option<String>,
    limit: Option<i64>,
) -> Result<GraphData, String> {
    let lim = limit.unwrap_or(80) as usize;
    state
        .db
        .graph_data(focus_id.as_deref(), lim)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn regenerate_summary(
    state: State<'_, AppState>,
    id: String,
) -> Result<String, String> {
    let ai = state
        .ai
        .as_ref()
        .ok_or_else(|| "AI 未配置：请在 .env 中设置 ZHIPU_API_KEY".to_string())?;
    let f = state.db.get_file(&id).map_err(|e| e.to_string())?;
    let hint = format!(
        "类型: {} | 项目: {} | 标签: {}",
        f.mime_type,
        f.project_name.unwrap_or_else(|| "无".to_string()),
        f.tags.join(", ")
    );
    let summary = ai.summarize(&f.name, &hint).await.map_err(|e| e.to_string())?;
    state
        .db
        .update_summary(&id, &summary)
        .map_err(|e| e.to_string())?;
    state.db.add_ai_cost(0.001).ok();
    Ok(summary)
}

#[tauri::command]
pub async fn chat_message(
    state: State<'_, AppState>,
    message: String,
    history: Vec<ChatTurn>,
) -> Result<ChatResponse, String> {
    let ai = state
        .ai
        .as_ref()
        .ok_or_else(|| "AI 未配置：请在 .env 中设置 ZHIPU_API_KEY".to_string())?;

    let candidates = collect_candidates(&state.db, &message)?;

    let (content, reasoning, file_ids) = ai
        .answer_question(&message, &history, &candidates)
        .await
        .map_err(|e| e.to_string())?;

    state.db.add_ai_cost(0.01).ok();

    Ok(ChatResponse {
        content,
        reasoning: Some(reasoning),
        file_ids: Some(file_ids),
    })
}

#[tauri::command]
pub async fn chat_message_stream(
    app: AppHandle,
    state: State<'_, AppState>,
    stream_id: String,
    message: String,
    history: Vec<ChatTurn>,
    model: Option<String>,
) -> Result<ChatResponse, String> {
    let ai = state
        .ai
        .as_ref()
        .ok_or_else(|| "AI 未配置：请在 .env 中设置 ZHIPU_API_KEY".to_string())?;

    let candidates = collect_candidates(&state.db, &message)?;

    let (content, reasoning, file_ids) = ai
        .answer_question_stream(app, stream_id, &message, &history, &candidates, model.as_deref())
        .await
        .map_err(|e| e.to_string())?;

    state.db.add_ai_cost(0.01).ok();

    Ok(ChatResponse {
        content,
        reasoning: Some(reasoning),
        file_ids: Some(file_ids),
    })
}

#[tauri::command]
pub fn clear_all_data(state: State<AppState>) -> Result<(), String> {
    state.db.clear_all().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_file_tags(
    state: State<AppState>,
    id: String,
    tags: Vec<String>,
) -> Result<(), String> {
    state.db.update_tags(&id, &tags).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn top_tags(state: State<AppState>, limit: Option<i64>) -> Result<Vec<TagCount>, String> {
    let l = limit.unwrap_or(15);
    state
        .db
        .top_tags(l)
        .map(|v| v.into_iter().map(|(tag, count)| TagCount { tag, count }).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn activity_timeline(
    state: State<AppState>,
    days: Option<i64>,
) -> Result<Vec<DayCount>, String> {
    let d = days.unwrap_or(30);
    state
        .db
        .activity_timeline(d)
        .map(|v| v.into_iter().map(|(day, count)| DayCount { day, count }).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn enrich_graph(
    state: State<'_, AppState>,
    use_ai: bool,
    max_files: Option<i64>,
) -> Result<EnrichResult, String> {
    let limit = max_files.unwrap_or(60) as usize;

    let heuristic_added = scan::derive_relations_global(&state.db, limit)
        .map_err(|e| e.to_string())?;

    let mut ai_added = 0i64;
    let mut ai_skipped = 0i64;
    let mut analyzed = 0i64;

    if use_ai {
        let ai = state
            .ai
            .as_ref()
            .ok_or_else(|| "AI 未配置".to_string())?;

        let files = state
            .db
            .list_files(limit as i64, 0)
            .map_err(|e| e.to_string())?;
        analyzed = files.len() as i64;

        if files.len() >= 2 {
            let suggestions = ai
                .suggest_relations(&files)
                .await
                .map_err(|e| e.to_string())?;

            for s in suggestions {
                let weight = s.conf;
                if state
                    .db
                    .insert_relation(&s.src, &s.dst, &s.rel, weight)
                    .is_ok()
                {
                    ai_added += 1;
                } else {
                    ai_skipped += 1;
                }
            }
            state.db.add_ai_cost(0.03).ok();
        }
    }

    Ok(EnrichResult {
        analyzed,
        heuristic_added: heuristic_added as i64,
        ai_added,
        ai_skipped,
    })
}

#[tauri::command]
pub async fn scan_directory(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    max_files: Option<i64>,
) -> Result<ScanResult, String> {
    let db = state.db.clone();
    let max = max_files.map(|m| m as usize);
    scan::scan_directory(app, db, path, max)
        .await
        .map_err(|e| e.to_string())
}

fn collect_candidates(db: &Db, message: &str) -> Result<Vec<FileItem>, String> {
    let keywords = extract_keywords(message);
    let mut candidates: Vec<FileItem> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for kw in &keywords {
        let results = db.search_files(kw, 8).map_err(|e| e.to_string())?;
        for r in results {
            if seen.insert(r.file.id.clone()) {
                candidates.push(r.file);
            }
        }
    }
    if candidates.is_empty() {
        candidates = db.list_files(20, 0).map_err(|e| e.to_string())?;
    }
    candidates.truncate(20);
    Ok(candidates)
}

fn extract_keywords(text: &str) -> Vec<String> {
    let stop_words: std::collections::HashSet<&str> = [
        "的", "了", "是", "在", "我", "你", "他", "她", "它", "们", "这", "那", "和", "与",
        "或", "也", "还", "都", "就", "一个", "一", "二", "三", "什么", "怎么", "为什么",
        "如何", "有哪些", "请", "帮", "把", "找", "给", "all", "the", "a", "an", "of", "in",
        "to", "is", "are", "and", "or", "for", "on", "at", "with",
    ]
    .iter()
    .copied()
    .collect();

    let cleaned: String = text
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { ' ' })
        .collect();
    let mut out: Vec<String> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for word in cleaned.split_whitespace() {
        let w = word.trim().to_string();
        if w.len() < 2 || stop_words.contains(w.as_str()) {
            continue;
        }
        if seen.insert(w.clone()) {
            out.push(w);
        }
    }
    let bigrams = make_chinese_bigrams(text);
    for bg in bigrams {
        if seen.insert(bg.clone()) {
            out.push(bg);
        }
    }
    out.truncate(6);
    out
}

fn make_chinese_bigrams(text: &str) -> Vec<String> {
    let chars: Vec<char> = text
        .chars()
        .filter(|c| c.is_alphabetic() && !c.is_ascii())
        .collect();
    let mut bigrams = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for i in 0..chars.len().saturating_sub(1) {
        let bg: String = chars[i..i + 2].iter().collect();
        if seen.insert(bg.clone()) {
            bigrams.push(bg);
        }
    }
    bigrams
}
