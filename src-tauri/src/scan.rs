use anyhow::Result;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

use crate::db::Db;
use crate::models::*;

const SKIP_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".git",
    ".svn",
    ".hg",
    ".idea",
    ".vscode",
    ".cache",
    ".npm",
    ".cargo",
    ".rustup",
    ".venv",
    "venv",
    "__pycache__",
    ".next",
    ".turbo",
    "Library",
];

const MAX_FILES_DEFAULT: usize = 5000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgressEvent {
    pub scanned: usize,
    pub indexed: usize,
    pub total_estimate: usize,
    pub current_path: String,
    pub phase: String,
    pub done: bool,
    pub project_id: String,
}

pub async fn scan_directory(
    app: AppHandle,
    db: Arc<Db>,
    root: String,
    max_files: Option<usize>,
) -> Result<ScanResult> {
    let max_files = max_files.unwrap_or(MAX_FILES_DEFAULT);
    let root_path = Path::new(&root);
    if !root_path.exists() {
        anyhow::bail!("路径不存在: {}", root);
    }

    let now = Utc::now().timestamp();
    let project_name = root_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("scanned")
        .to_string();
    let project_id = format!("p_scan_{}", uuid_short());
    let event_name = "scan-progress";

    let _ = app.emit(
        event_name,
        ScanProgressEvent {
            scanned: 0,
            indexed: 0,
            total_estimate: 0,
            current_path: root.clone(),
            phase: "counting".into(),
            done: false,
            project_id: project_id.clone(),
        },
    );

    let total_estimate = count_files(&root, max_files * 3).min(max_files * 3);

    db.insert_project(&Project {
        id: project_id.clone(),
        name: format!("📂 {}", project_name),
        description: Some(format!("从 {} 扫描得到（预计 {} 文件）", root, total_estimate)),
        status: "active".to_string(),
        last_active: now,
        file_count: 0,
        total_size: 0,
        top_files: vec![],
    })?;

    let mut scanned = 0usize;
    let mut indexed = 0usize;
    let mut skipped = 0usize;

    let walker = WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !is_skipped(e.path()));

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };
        if !entry.file_type().is_file() {
            continue;
        }
        scanned += 1;

        if scanned > max_files * 3 {
            break;
        }
        if indexed >= max_files {
            break;
        }

        let path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };

        let name = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("?")
            .to_string();

        if name.starts_with('.') || name.starts_with("~$") {
            skipped += 1;
            continue;
        }

        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        let size = metadata.len() as i64;
        if size > 500_000_000 {
            skipped += 1;
            continue;
        }

        let mtime = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(now);

        let id = format!("f_scan_{}", path_hash(path));
        let file = FileItem {
            id: id.clone(),
            name: name.clone(),
            path: path.to_string_lossy().to_string(),
            ext: ext.clone(),
            size,
            mtime,
            mime_type: mime_from_ext(&ext).to_string(),
            summary: None,
            tags: derive_tags(path, &name),
            project_id: Some(project_id.clone()),
            project_name: None,
            access_count: 0,
        };

        if db.insert_file(&file, false).is_ok() {
            indexed += 1;
        } else {
            skipped += 1;
        }

        if indexed % 15 == 0 {
            let _ = app.emit(
                event_name,
                ScanProgressEvent {
                    scanned,
                    indexed,
                    total_estimate,
                    current_path: path.to_string_lossy().to_string(),
                    phase: "indexing".into(),
                    done: false,
                    project_id: project_id.clone(),
                },
            );
            tokio::task::yield_now().await;
        }
    }

    let _ = app.emit(
        event_name,
        ScanProgressEvent {
            scanned,
            indexed,
            total_estimate,
            current_path: "派生关系...".into(),
            phase: "deriving".into(),
            done: false,
            project_id: project_id.clone(),
        },
    );

    if let Err(e) = derive_relations(&db, &project_id) {
        eprintln!("[scan] relation derivation failed: {}", e);
    }

    let _ = app.emit(
        event_name,
        ScanProgressEvent {
            scanned,
            indexed,
            total_estimate,
            current_path: String::new(),
            phase: "done".into(),
            done: true,
            project_id: project_id.clone(),
        },
    );

    Ok(ScanResult {
        indexed: indexed as i64,
        skipped: skipped as i64,
        root,
        project_id,
    })
}

pub fn count_files(root: &str, cap: usize) -> usize {
    let mut count = 0;
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !is_skipped(e.path()))
        .filter_map(Result::ok)
    {
        if entry.file_type().is_file() {
            let name = entry.file_name().to_string_lossy();
            if name.starts_with('.') || name.starts_with("~$") {
                continue;
            }
            count += 1;
            if count >= cap {
                break;
            }
        }
    }
    count
}

pub fn derive_relations(db: &Db, project_id: &str) -> Result<usize> {
    let files = db.project_files(project_id)?;
    if files.len() < 2 {
        return Ok(0);
    }

    let mut added = 0usize;

    let mut by_dir: std::collections::HashMap<String, Vec<&FileItem>> = std::collections::HashMap::new();
    for f in &files {
        let dir = std::path::Path::new(&f.path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();
        by_dir.entry(dir).or_default().push(f);
    }
    for (_dir, group) in by_dir.iter() {
        if group.len() < 2 {
            continue;
        }
        if group.len() <= 8 {
            for i in 0..group.len() {
                for j in (i + 1)..group.len() {
                    if db.insert_relation(&group[i].id, &group[j].id, "co-project", 0.5).is_ok() {
                        added += 1;
                    }
                }
            }
        } else {
            let mut sorted = group.clone();
            sorted.sort_by(|a, b| b.size.cmp(&a.size).then(b.mtime.cmp(&a.mtime)));
            let hub = sorted[0];
            let weight = (8.0_f64 / group.len() as f64).max(0.25);
            for f in sorted.iter().skip(1) {
                if db.insert_relation(&hub.id, &f.id, "co-project", weight).is_ok() {
                    added += 1;
                }
            }
        }
    }

    let dirs: Vec<&String> = by_dir.keys().collect();
    let mut by_parent: std::collections::HashMap<String, Vec<&String>> = std::collections::HashMap::new();
    for d in &dirs {
        if let Some(parent) = std::path::Path::new(d).parent().and_then(|p| p.to_str()) {
            by_parent.entry(parent.to_string()).or_default().push(d);
        }
    }
    for (_p, sibling_dirs) in by_parent.iter() {
        if sibling_dirs.len() < 2 || sibling_dirs.len() > 6 {
            continue;
        }
        let mut hubs: Vec<&FileItem> = Vec::new();
        for d in sibling_dirs {
            if let Some(group) = by_dir.get(*d) {
                if let Some(hub) = group.iter().max_by_key(|f| (f.size, f.mtime)) {
                    hubs.push(*hub);
                }
            }
        }
        for i in 0..hubs.len() {
            for j in (i + 1)..hubs.len() {
                if db.insert_relation(&hubs[i].id, &hubs[j].id, "co-project", 0.3).is_ok() {
                    added += 1;
                }
            }
        }
    }

    let mut by_stem: std::collections::HashMap<String, Vec<&FileItem>> = std::collections::HashMap::new();
    for f in &files {
        let stem = file_stem(&f.name);
        if stem.chars().count() >= 2 {
            by_stem.entry(stem).or_default().push(f);
        }
    }
    for (_stem, group) in by_stem.iter() {
        if group.len() < 2 {
            continue;
        }
        let mut sorted = group.clone();
        sorted.sort_by_key(|f| f.mtime);
        for w in sorted.windows(2) {
            if db.insert_relation(&w[1].id, &w[0].id, "derived", 0.85).is_ok() {
                added += 1;
            }
        }
    }

    Ok(added)
}

fn file_stem(name: &str) -> String {
    let base = std::path::Path::new(name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string();

    let suffix_words = [
        "final", "finalfinal", "draft", "new", "old", "backup", "edited",
        "revised", "copy", "duplicate", "untitled", "tmp", "temp",
        "_final", "-final", "_draft", "-draft", "最终", "最终版",
        "终版", "草稿", "副本", "复制",
    ];

    let mut s = base.clone();
    loop {
        let l = s.to_lowercase();
        let l = l.trim();
        let mut matched = false;

        for w in &suffix_words {
            if l.ends_with(w) && s.len() > w.len() {
                s.truncate(s.len() - w.len());
                matched = true;
                break;
            }
        }
        if matched { continue; }

        let l = s.to_lowercase();
        let l = l.trim();
        let chars: Vec<char> = s.chars().collect();
        if chars.len() >= 2 {
            let last = chars[chars.len() - 1];
            let second_last = chars[chars.len() - 2];

            if last == ')' {
                if let Some(open) = s.rfind('(') {
                    let inside = &s[open + 1..s.len() - 1];
                    if inside.chars().all(|c| c.is_ascii_digit()) {
                        s.truncate(open);
                        matched = true;
                    }
                }
            }
            if !matched && (last.is_ascii_digit()
                || matches!(last, '_' | '-' | '.' | ' ' | '版' | '次'))
            {
                s.pop();
                matched = true;
            }
            if !matched && last == 'v' || last == 'V' {
                if chars.len() >= 3
                    && (second_last == '_' || second_last == '-' || second_last == '.')
                {
                    s.pop();
                    s.pop();
                    matched = true;
                }
            }
            let _ = l;
        }
        if !matched {
            break;
        }
    }

    let s = s.trim_end_matches(|c: char| matches!(c, '_' | '-' | '.' | ' '));
    s.to_string()
}

pub fn derive_relations_global(db: &Db, max_files: usize) -> Result<usize> {
    use crate::models::FileItem;
    let files: Vec<FileItem> = db.list_files(max_files as i64, 0)?;
    let mut by_project: std::collections::HashMap<String, Vec<FileItem>> = std::collections::HashMap::new();
    for f in files {
        if let Some(pid) = f.project_id.clone() {
            by_project.entry(pid).or_default().push(f);
        }
    }
    let mut total = 0usize;
    for pid in by_project.keys() {
        if let Ok(n) = derive_relations(db, pid) {
            total += n;
        }
    }
    Ok(total)
}

fn is_skipped(path: &Path) -> bool {
    if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
        if SKIP_DIRS.contains(&name) {
            return true;
        }
        if name.starts_with('.') && path.is_dir() {
            return true;
        }
    }
    false
}

fn derive_tags(path: &Path, name: &str) -> Vec<String> {
    let mut tags = Vec::new();
    if let Some(parent) = path.parent().and_then(|p| p.file_name()).and_then(|s| s.to_str()) {
        if parent.len() < 24 && !parent.is_empty() {
            tags.push(parent.to_string());
        }
    }
    let lower = name.to_lowercase();
    if lower.contains("test") || lower.contains("spec") {
        tags.push("测试".to_string());
    }
    if lower.contains("readme") || lower.contains("doc") {
        tags.push("文档".to_string());
    }
    if lower.contains("config") || lower.contains(".env") {
        tags.push("配置".to_string());
    }
    tags.truncate(4);
    tags
}

fn path_hash(p: &Path) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    p.hash(&mut h);
    format!("{:x}", h.finish())
}

fn uuid_short() -> String {
    let s = uuid::Uuid::new_v4().to_string();
    s.split('-').next().unwrap_or(&s).to_string()
}

fn mime_from_ext(ext: &str) -> &'static str {
    match ext {
        "pdf" => "application/pdf",
        "docx" | "doc" => "application/msword",
        "pptx" | "ppt" => "application/vnd.ms-powerpoint",
        "xlsx" | "xls" => "application/vnd.ms-excel",
        "csv" => "text/csv",
        "txt" | "md" => "text/plain",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "mp3" => "audio/mpeg",
        "zip" => "application/zip",
        "py" => "text/x-python",
        "ts" | "tsx" => "text/typescript",
        "js" | "jsx" => "text/javascript",
        "rs" => "text/x-rust",
        "json" => "application/json",
        "html" => "text/html",
        "css" => "text/css",
        _ => "application/octet-stream",
    }
}
