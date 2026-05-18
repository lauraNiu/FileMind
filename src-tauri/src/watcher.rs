use anyhow::Result;
use notify::{
    event::{ModifyKind, RenameMode},
    Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

use crate::db::Db;
use crate::models::FileItem;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchEventPayload {
    pub kind: String,
    pub path: String,
    pub project_id: Option<String>,
}

pub struct WatcherManager {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub watched_roots: Arc<Mutex<Vec<(PathBuf, String)>>>,
}

impl WatcherManager {
    pub fn new() -> Self {
        Self {
            watcher: Mutex::new(None),
            watched_roots: Arc::new(Mutex::new(vec![])),
        }
    }

    pub fn start(&self, app: AppHandle, db: Arc<Db>) -> Result<()> {
        if self.watcher.lock().unwrap().is_some() {
            return Ok(());
        }

        let app_clone = app.clone();
        let db_clone = db.clone();
        let roots_clone = Arc::clone(&self.watched_roots);

        let mut w = notify::recommended_watcher(move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                handle_event(&event, &app_clone, &db_clone, &roots_clone);
            }
        })?;

        let snapshot = self.watched_roots.lock().unwrap().clone();
        for (path, _pid) in &snapshot {
            let _ = w.watch(path, RecursiveMode::Recursive);
        }

        *self.watcher.lock().unwrap() = Some(w);
        Ok(())
    }

    pub fn add_root(&self, path: PathBuf, project_id: String) -> Result<()> {
        {
            let mut roots = self.watched_roots.lock().unwrap();
            if roots.iter().any(|(p, _)| p == &path) {
                return Ok(());
            }
            roots.push((path.clone(), project_id));
        }
        if let Some(w) = self.watcher.lock().unwrap().as_mut() {
            w.watch(&path, RecursiveMode::Recursive)?;
        }
        Ok(())
    }

    pub fn remove_root(&self, path: &Path) {
        if let Some(w) = self.watcher.lock().unwrap().as_mut() {
            let _ = w.unwatch(path);
        }
        self.watched_roots
            .lock()
            .unwrap()
            .retain(|(p, _)| p != path);
    }

    pub fn list_roots(&self) -> Vec<(String, String)> {
        self.watched_roots
            .lock()
            .unwrap()
            .iter()
            .map(|(p, pid)| (p.to_string_lossy().to_string(), pid.clone()))
            .collect()
    }
}

fn handle_event(
    event: &Event,
    app: &AppHandle,
    db: &Arc<Db>,
    roots: &Arc<Mutex<Vec<(PathBuf, String)>>>,
) {
    for path in &event.paths {
        let kind_str = match event.kind {
            EventKind::Create(_) => "create",
            EventKind::Modify(ModifyKind::Name(RenameMode::From)) => "rename-from",
            EventKind::Modify(ModifyKind::Name(RenameMode::To)) => "rename-to",
            EventKind::Modify(_) => "modify",
            EventKind::Remove(_) => "remove",
            _ => continue,
        };

        let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if name.starts_with('.') || name.starts_with("~$") {
            continue;
        }

        let roots_snapshot = roots.lock().unwrap().clone();
        let owning_project = roots_snapshot
            .iter()
            .find(|(root, _)| path.starts_with(root))
            .map(|(_, pid)| pid.clone());

        let _ = app.emit(
            "fs-event",
            WatchEventPayload {
                kind: kind_str.to_string(),
                path: path.to_string_lossy().to_string(),
                project_id: owning_project.clone(),
            },
        );

        match event.kind {
            EventKind::Create(_) => {
                if let Some(pid) = owning_project {
                    upsert_from_path(db, path, &pid);
                }
            }
            EventKind::Remove(_) => {
                let _ = remove_by_path(db, path);
            }
            _ => {}
        }
    }
}

fn upsert_from_path(db: &Arc<Db>, path: &Path, project_id: &str) {
    let metadata = match std::fs::metadata(path) {
        Ok(m) => m,
        Err(_) => return,
    };
    if !metadata.is_file() {
        return;
    }
    let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("?").to_string();
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mtime = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let id = format!("f_scan_{}", path_hash(path));

    let file = FileItem {
        id,
        name,
        path: path.to_string_lossy().to_string(),
        ext,
        size: metadata.len() as i64,
        mtime,
        mime_type: "application/octet-stream".into(),
        summary: None,
        tags: vec!["实时".into()],
        project_id: Some(project_id.to_string()),
        project_name: None,
        access_count: 0,
    };
    let _ = db.insert_file(&file, false);
}

fn remove_by_path(db: &Arc<Db>, path: &Path) -> Result<()> {
    let id = format!("f_scan_{}", path_hash(path));
    db.delete_file(&id)?;
    Ok(())
}

fn path_hash(p: &Path) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    p.hash(&mut h);
    format!("{:x}", h.finish())
}
