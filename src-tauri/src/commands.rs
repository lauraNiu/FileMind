use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

use crate::ai::ZhipuClient;
use crate::config::{AppConfig, ConfigStore, UserProfile};
use crate::db::Db;
use crate::models::*;
use crate::watcher::WatcherManager;
use crate::{ops, scan};

pub struct AppState {
    pub db: Arc<Db>,
    pub config: Arc<ConfigStore>,
    pub watcher: Arc<WatcherManager>,
}

impl AppState {
    fn build_ai(&self) -> Result<ZhipuClient, String> {
        let cfg = self.config.get();
        if !cfg.ai.api_key.is_empty() {
            return ZhipuClient::new(cfg.ai.api_key, cfg.ai.model).map_err(|e| e.to_string());
        }
        ZhipuClient::from_env().map_err(|e| {
            format!(
                "AI 未配置：请在「设置」中填入 API Key，或在 .env 中设置 ZHIPU_API_KEY。详情：{}",
                e
            )
        })
    }
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
    let ai = state.build_ai()?;
    let f = state.db.get_file(&id).map_err(|e| e.to_string())?;
    let hint = format!(
        "类型: {} | 项目: {} | 标签: {}",
        f.mime_type,
        f.project_name.unwrap_or_else(|| "无".to_string()),
        f.tags.join(", ")
    );
    let summary = ai.summarize(&f.name, &hint).await.map_err(|e| e.to_string())?;
    state.db.update_summary(&id, &summary).map_err(|e| e.to_string())?;
    state.db.add_ai_cost(0.001).ok();
    Ok(summary)
}

#[tauri::command]
pub async fn batch_summarize(
    app: AppHandle,
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<BatchSummaryResult, String> {
    let ai = state.build_ai()?;
    let take = limit.unwrap_or(20).min(50);
    let pending = state
        .db
        .files_without_summary(take + 1)
        .map_err(|e| e.to_string())?;
    let total = pending.len() as i64;
    let to_process: Vec<_> = pending.into_iter().take(take as usize).collect();

    let mut processed = 0i64;
    let mut failed = 0i64;

    for (i, f) in to_process.iter().enumerate() {
        let _ = app.emit(
            "batch-summary-progress",
            serde_json::json!({
                "current": i + 1,
                "total": to_process.len(),
                "file_name": f.name,
            }),
        );
        let hint = format!(
            "类型: {} | 项目: {} | 标签: {}",
            f.mime_type,
            f.project_name.clone().unwrap_or_else(|| "无".to_string()),
            f.tags.join(", ")
        );
        match ai.summarize(&f.name, &hint).await {
            Ok(s) => {
                let _ = state.db.update_summary(&f.id, &s);
                processed += 1;
                state.db.add_ai_cost(0.001).ok();
            }
            Err(_) => failed += 1,
        }
        tokio::time::sleep(std::time::Duration::from_millis(120)).await;
    }

    let _ = app.emit(
        "batch-summary-done",
        serde_json::json!({ "processed": processed, "failed": failed }),
    );

    Ok(BatchSummaryResult {
        processed,
        failed,
        remaining: (total - take).max(0),
    })
}

#[tauri::command]
pub async fn chat_message(
    state: State<'_, AppState>,
    message: String,
    history: Vec<ChatTurn>,
) -> Result<ChatResponse, String> {
    let ai = state.build_ai()?;
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
    let ai = state.build_ai()?;
    let candidates = collect_candidates(&state.db, &message)?;
    let used_model = model.clone().unwrap_or_else(|| ai.current_model().to_string());
    let result = ai
        .answer_question_stream(app, stream_id, &message, &history, &candidates, model.as_deref())
        .await
        .map_err(|e| e.to_string());
    state.db.log_ai_usage(&used_model, "chat", 0.01, result.is_ok()).ok();
    let (content, reasoning, file_ids) = result?;
    state.db.add_ai_cost(0.01).ok();
    Ok(ChatResponse {
        content,
        reasoning: Some(reasoning),
        file_ids: Some(file_ids),
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
    let result = scan::scan_directory(app.clone(), db, path.clone(), max)
        .await
        .map_err(|e| e.to_string())?;

    let watcher = state.watcher.clone();
    let _ = watcher.add_root(std::path::PathBuf::from(&path), result.project_id.clone());

    let _ = app.emit("watcher-changed", ());

    Ok(result)
}

#[tauri::command]
pub fn clear_all_data(state: State<AppState>) -> Result<(), String> {
    state.db.clear_all().map_err(|e| e.to_string())
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
        let ai = state.build_ai()?;
        let files = state.db.list_files(limit as i64, 0).map_err(|e| e.to_string())?;
        analyzed = files.len() as i64;
        if files.len() >= 2 {
            let suggestions = ai
                .suggest_relations(&files)
                .await
                .map_err(|e| e.to_string())?;
            for s in suggestions {
                if state.db.insert_relation(&s.src, &s.dst, &s.rel, s.conf).is_ok() {
                    ai_added += 1;
                } else {
                    ai_skipped += 1;
                }
            }
            state.db.add_ai_cost(0.03).ok();
        }
    }
    Ok(EnrichResult { analyzed, heuristic_added: heuristic_added as i64, ai_added, ai_skipped })
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
pub fn timeline_buckets(
    state: State<AppState>,
    days: Option<i64>,
) -> Result<Vec<TimelineBucket>, String> {
    let d = days.unwrap_or(30);
    state
        .db
        .timeline_with_files(d)
        .map(|v| {
            v.into_iter()
                .map(|(day, files)| TimelineBucket {
                    day,
                    date: chrono::DateTime::from_timestamp(day * 86400, 0)
                        .map(|dt| dt.format("%Y-%m-%d").to_string())
                        .unwrap_or_default(),
                    count: files.len() as i64,
                    files,
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_duplicates(
    state: State<AppState>,
    limit: Option<i64>,
) -> Result<Vec<DuplicateGroup>, String> {
    let lim = limit.unwrap_or(50);
    state
        .db
        .list_duplicate_groups(lim)
        .map(|groups| {
            groups
                .into_iter()
                .map(|(hash, files)| {
                    let total_size: i64 = files.iter().map(|f| f.size).sum();
                    let max_size: i64 = files.iter().map(|f| f.size).max().unwrap_or(0);
                    DuplicateGroup {
                        hash,
                        recoverable: total_size - max_size,
                        total_size,
                        files,
                    }
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_temp_files(
    state: State<AppState>,
    days: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<FileItem>, String> {
    let d = days.unwrap_or(180);
    let l = limit.unwrap_or(200);
    state.db.list_temp_files(d, l).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn files_without_summary(
    state: State<AppState>,
    limit: Option<i64>,
) -> Result<Vec<FileItem>, String> {
    let l = limit.unwrap_or(50);
    state.db.files_without_summary(l).map_err(|e| e.to_string())
}

// ============================ Config + Profile ============================

#[tauri::command]
pub fn get_config(state: State<AppState>) -> Result<AppConfig, String> {
    Ok(state.config.safe_view())
}

#[tauri::command]
pub fn save_profile(
    state: State<AppState>,
    name: String,
    avatar_initial: Option<String>,
) -> Result<AppConfig, String> {
    state
        .config
        .update(|c| {
            let initial = avatar_initial.unwrap_or_else(|| {
                name.chars().next().map(|c| c.to_uppercase().to_string()).unwrap_or("?".to_string())
            });
            c.profile = UserProfile {
                name: name.clone(),
                avatar_initial: initial,
                created_at: if c.profile.created_at == 0 {
                    chrono::Utc::now().timestamp()
                } else {
                    c.profile.created_at
                },
            };
        })
        .map_err(|e| e.to_string())?;
    Ok(state.config.safe_view())
}

#[tauri::command]
pub fn save_ai_config(
    state: State<AppState>,
    api_key: Option<String>,
    model: Option<String>,
    budget_yuan: Option<f64>,
) -> Result<AppConfig, String> {
    state
        .config
        .update(|c| {
            if let Some(k) = api_key {
                if !k.is_empty() && !k.contains('*') {
                    c.ai.api_key = k;
                }
            }
            if let Some(m) = model {
                c.ai.model = m;
            }
            if let Some(b) = budget_yuan {
                c.ai.budget_yuan = b;
            }
        })
        .map_err(|e| e.to_string())?;
    Ok(state.config.safe_view())
}

#[tauri::command]
pub fn save_scan_config(
    state: State<AppState>,
    excluded_dirs: Option<Vec<String>>,
    sensitive_dirs: Option<Vec<String>>,
    max_files_per_scan: Option<u32>,
) -> Result<AppConfig, String> {
    state
        .config
        .update(|c| {
            if let Some(v) = excluded_dirs { c.scan.excluded_dirs = v; }
            if let Some(v) = sensitive_dirs { c.scan.sensitive_dirs = v; }
            if let Some(v) = max_files_per_scan { c.scan.max_files_per_scan = v; }
        })
        .map_err(|e| e.to_string())?;
    Ok(state.config.safe_view())
}

#[tauri::command]
pub fn complete_onboarding(state: State<AppState>) -> Result<(), String> {
    state
        .config
        .update(|c| {
            c.onboarded = true;
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn logout(state: State<AppState>) -> Result<(), String> {
    state.config.clear().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_ai_connection(
    state: State<'_, AppState>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let cfg = state.config.get();
    let key = api_key
        .filter(|k| !k.is_empty() && !k.contains('*'))
        .or_else(|| if cfg.ai.api_key.is_empty() { None } else { Some(cfg.ai.api_key.clone()) })
        .or_else(|| std::env::var("ZHIPU_API_KEY").ok())
        .ok_or_else(|| "未提供 API key".to_string())?;
    let mdl = model.unwrap_or(cfg.ai.model);
    let client = ZhipuClient::new(key, mdl).map_err(|e| e.to_string())?;
    client.test_connection().await.map_err(|e| e.to_string())
}

// ============================ File operations ============================

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    ops::reveal_in_finder(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_with_default(path: String) -> Result<(), String> {
    ops::open_with_default(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_file(
    state: State<AppState>,
    file_id: String,
    new_dir: String,
    reason: Option<String>,
) -> Result<OperationRecord, String> {
    ops::move_file(&state.db, &file_id, &new_dir, reason).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_file(
    state: State<AppState>,
    file_id: String,
    new_name: String,
    reason: Option<String>,
) -> Result<OperationRecord, String> {
    ops::rename_file(&state.db, &file_id, &new_name, reason).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn trash_file(
    state: State<AppState>,
    file_id: String,
    reason: Option<String>,
) -> Result<OperationRecord, String> {
    ops::trash_file(&state.db, &file_id, reason).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn revert_operation(state: State<AppState>, op_id: String) -> Result<(), String> {
    ops::revert(&state.db, &op_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_operations(
    state: State<AppState>,
    limit: Option<i64>,
) -> Result<Vec<OperationRecord>, String> {
    state.db.list_operations(limit.unwrap_or(100)).map_err(|e| e.to_string())
}

// ============================ AI usage / rename / embedding ============================

#[tauri::command]
pub fn list_ai_usage(state: State<AppState>, limit: Option<i64>) -> Result<Vec<AiUsageEntry>, String> {
    state.db.list_ai_usage(limit.unwrap_or(200)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ai_usage_stats(state: State<AppState>, days: Option<i64>) -> Result<AiUsageStats, String> {
    state.db.ai_usage_stats(days.unwrap_or(30)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn suggest_rename(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<String>, String> {
    let ai = state.build_ai()?;
    let f = state.db.get_file(&id).map_err(|e| e.to_string())?;
    let hint = format!(
        "类型: {} | 项目: {} | 标签: {} | 摘要: {}",
        f.mime_type,
        f.project_name.unwrap_or_else(|| "无".to_string()),
        f.tags.join(", "),
        f.summary.unwrap_or_else(|| "无".to_string()),
    );
    let suggestions = ai.suggest_rename(&f.name, &hint).await.map_err(|e| e.to_string())?;
    let model = ai.current_model().to_string();
    state.db.log_ai_usage(&model, "rename", 0.001, true).ok();
    state.db.add_ai_cost(0.001).ok();
    Ok(suggestions)
}

#[tauri::command]
pub async fn embed_pending(
    app: AppHandle,
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<i64, String> {
    let take = limit.unwrap_or(30).min(50);
    let ai = state.build_ai()?;
    let pending = state
        .db
        .files_without_embedding(take)
        .map_err(|e| e.to_string())?;
    if pending.is_empty() {
        return Ok(0);
    }
    let texts: Vec<String> = pending
        .iter()
        .map(|f| format!("{} {} {}", f.name, f.summary.clone().unwrap_or_default(), f.tags.join(" ")))
        .collect();

    let mut total = 0i64;
    let batch_size = 5;
    let total_batches = (pending.len() + batch_size - 1) / batch_size;
    for (batch_idx, chunk_pair) in pending.chunks(batch_size).zip(texts.chunks(batch_size)).enumerate() {
        let (files_chunk, texts_chunk) = chunk_pair;
        let _ = app.emit(
            "embedding-progress",
            EmbeddingProgress {
                current: (batch_idx + 1) as i64,
                total: total_batches as i64,
                file_name: files_chunk.first().map(|f| f.name.clone()).unwrap_or_default(),
            },
        );
        match ai.embed(texts_chunk.to_vec()).await {
            Ok(vecs) => {
                for (f, v) in files_chunk.iter().zip(vecs.iter()) {
                    if state.db.save_embedding(&f.id, v, "embedding-3").is_ok() {
                        total += 1;
                    }
                }
                state.db.log_ai_usage("embedding-3", "embed", 0.002 * texts_chunk.len() as f64, true).ok();
            }
            Err(e) => {
                eprintln!("[embed] batch failed: {}", e);
                state.db.log_ai_usage("embedding-3", "embed", 0.0, false).ok();
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
    }
    Ok(total)
}

#[tauri::command]
pub async fn semantic_search(
    state: State<'_, AppState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<SemanticHit>, String> {
    let count = state.db.embeddings_count();
    if count == 0 {
        return Err("还没有嵌入向量，先到设置或仪表盘批量生成".into());
    }
    let ai = state.build_ai()?;
    let q_vec = ai.embed(vec![query.clone()]).await.map_err(|e| e.to_string())?
        .into_iter()
        .next()
        .ok_or_else(|| "embedding 空响应".to_string())?;

    let all = state.db.list_embeddings().map_err(|e| e.to_string())?;
    let mut scored: Vec<(String, f64)> = all
        .into_iter()
        .map(|(id, v)| {
            let score = cosine(&q_vec, &v);
            (id, score)
        })
        .collect();
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let top = scored.into_iter().take(limit.unwrap_or(20) as usize);

    let mut hits = Vec::new();
    for (id, score) in top {
        if let Ok(file) = state.db.get_file(&id) {
            hits.push(SemanticHit { file, score });
        }
    }
    Ok(hits)
}

fn cosine(a: &[f32], b: &[f32]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if na == 0.0 || nb == 0.0 {
        return 0.0;
    }
    (dot / (na * nb)) as f64
}

// ============================ Chat sessions ============================

#[tauri::command]
pub fn create_chat_session(
    state: State<AppState>,
    id: String,
    title: String,
) -> Result<(), String> {
    state.db.create_chat_session(&id, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_chat_sessions(
    state: State<AppState>,
    limit: Option<i64>,
) -> Result<Vec<ChatSession>, String> {
    state.db.list_chat_sessions(limit.unwrap_or(100)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_chat_session(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_chat_session(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_chat_session(
    state: State<AppState>,
    id: String,
    title: String,
) -> Result<(), String> {
    state.db.rename_chat_session(&id, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_chat_message(
    state: State<AppState>,
    msg: PersistedChatMessage,
) -> Result<(), String> {
    state.db.save_chat_message(&msg).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_chat_messages(
    state: State<AppState>,
    session_id: String,
) -> Result<Vec<PersistedChatMessage>, String> {
    state.db.list_chat_messages(&session_id).map_err(|e| e.to_string())
}

// ============================ Export / Import ============================

#[tauri::command]
pub fn export_data(state: State<AppState>, path: String) -> Result<i64, String> {
    let data = state.db.export_all().map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    let bytes_written = json.len() as i64;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(bytes_written)
}

#[tauri::command]
pub fn import_data(state: State<AppState>, path: String) -> Result<(i64, i64, i64), String> {
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: ExportData = serde_json::from_str(&text).map_err(|e| format!("解析失败: {}", e))?;
    state.db.import_all(&data).map_err(|e| e.to_string())
}

// ============================ Watcher ============================

#[tauri::command]
pub fn watcher_status(state: State<AppState>) -> Result<WatchStatus, String> {
    let roots = state
        .watcher
        .list_roots()
        .into_iter()
        .map(|(path, project_id)| WatchedRoot { path, project_id })
        .collect();
    Ok(WatchStatus {
        running: state.watcher.watcher.lock().unwrap().is_some(),
        roots,
    })
}

#[tauri::command]
pub fn watcher_start(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    state.watcher.start(app, state.db.clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn watcher_stop(state: State<AppState>) -> Result<(), String> {
    let mut w = state.watcher.watcher.lock().unwrap();
    *w = None;
    Ok(())
}

#[tauri::command]
pub fn watcher_remove_root(state: State<AppState>, path: String) -> Result<(), String> {
    state.watcher.remove_root(std::path::Path::new(&path));
    Ok(())
}

// ============================ Helpers ============================

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
