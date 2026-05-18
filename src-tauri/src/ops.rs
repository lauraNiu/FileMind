use anyhow::{anyhow, Result};
use chrono::Utc;
use std::path::{Path, PathBuf};

use crate::db::Db;
use crate::models::*;

pub fn move_file(db: &Db, file_id: &str, new_dir: &str, reason: Option<String>) -> Result<OperationRecord> {
    let file = db.get_file(file_id)?;
    let old_path = PathBuf::from(&file.path);
    if !old_path.exists() {
        anyhow::bail!("源文件不存在: {}", file.path);
    }
    let new_dir_p = PathBuf::from(new_dir);
    if !new_dir_p.exists() {
        std::fs::create_dir_all(&new_dir_p)?;
    }
    if !new_dir_p.is_dir() {
        anyhow::bail!("目标不是目录: {}", new_dir);
    }
    let new_path = new_dir_p.join(&file.name);
    if new_path == old_path {
        anyhow::bail!("源与目标相同");
    }

    std::fs::rename(&old_path, &new_path)
        .or_else(|_| {
            std::fs::copy(&old_path, &new_path)?;
            std::fs::remove_file(&old_path)
        })?;

    let new_path_str = new_path.to_string_lossy().to_string();
    db.update_file_path(file_id, &new_path_str, &file.name)?;

    let op = OperationRecord {
        id: format!("op_{}", uuid()),
        op_type: "move".into(),
        target: OperationTarget {
            file_id: file_id.into(),
            file_name: file.name.clone(),
            from_path: file.path.clone(),
            to_path: new_path_str,
        },
        before: Some(OperationBefore { name: file.name, path: file.path }),
        actor: "user".into(),
        reason,
        status: "applied".into(),
        created_at: Utc::now().timestamp(),
    };
    db.insert_operation(&op)?;
    Ok(op)
}

pub fn rename_file(db: &Db, file_id: &str, new_name: &str, reason: Option<String>) -> Result<OperationRecord> {
    if new_name.contains('/') || new_name.contains('\\') {
        anyhow::bail!("新文件名不能含路径分隔符");
    }
    if new_name.trim().is_empty() {
        anyhow::bail!("新文件名不能为空");
    }
    let file = db.get_file(file_id)?;
    let old_path = PathBuf::from(&file.path);
    if !old_path.exists() {
        anyhow::bail!("源文件不存在: {}", file.path);
    }
    let parent = old_path.parent().ok_or_else(|| anyhow!("无法获取父目录"))?;
    let new_path = parent.join(new_name);
    if new_path == old_path {
        anyhow::bail!("新名与原名相同");
    }
    if new_path.exists() {
        anyhow::bail!("目标已存在: {}", new_name);
    }

    std::fs::rename(&old_path, &new_path)?;

    let new_path_str = new_path.to_string_lossy().to_string();
    db.update_file_path(file_id, &new_path_str, new_name)?;

    let op = OperationRecord {
        id: format!("op_{}", uuid()),
        op_type: "rename".into(),
        target: OperationTarget {
            file_id: file_id.into(),
            file_name: new_name.into(),
            from_path: file.path.clone(),
            to_path: new_path_str,
        },
        before: Some(OperationBefore { name: file.name, path: file.path }),
        actor: "user".into(),
        reason,
        status: "applied".into(),
        created_at: Utc::now().timestamp(),
    };
    db.insert_operation(&op)?;
    Ok(op)
}

pub fn trash_file(db: &Db, file_id: &str, reason: Option<String>) -> Result<OperationRecord> {
    let file = db.get_file(file_id)?;
    let old_path = PathBuf::from(&file.path);
    if !old_path.exists() {
        db.delete_file(file_id)?;
        anyhow::bail!("源文件已不存在（仅清除索引）: {}", file.path);
    }

    let trash_dir = trash_dir_for(&old_path)?;
    std::fs::create_dir_all(&trash_dir)?;
    let ts = Utc::now().format("%Y%m%d_%H%M%S");
    let trashed_name = format!("{}_{}", ts, file.name);
    let trashed_path = trash_dir.join(&trashed_name);

    std::fs::rename(&old_path, &trashed_path)
        .or_else(|_| {
            std::fs::copy(&old_path, &trashed_path)?;
            std::fs::remove_file(&old_path)
        })?;

    db.delete_file(file_id)?;

    let op = OperationRecord {
        id: format!("op_{}", uuid()),
        op_type: "trash".into(),
        target: OperationTarget {
            file_id: file_id.into(),
            file_name: file.name.clone(),
            from_path: file.path.clone(),
            to_path: trashed_path.to_string_lossy().to_string(),
        },
        before: Some(OperationBefore { name: file.name, path: file.path }),
        actor: "user".into(),
        reason,
        status: "applied".into(),
        created_at: Utc::now().timestamp(),
    };
    db.insert_operation(&op)?;
    Ok(op)
}

pub fn revert(db: &Db, op_id: &str) -> Result<()> {
    let op = db.get_operation(op_id)?;
    if op.status == "reverted" {
        anyhow::bail!("操作已撤销过");
    }
    let before = op.before.as_ref().ok_or_else(|| anyhow!("没有 before 状态可回滚"))?;

    match op.op_type.as_str() {
        "move" | "rename" | "trash" => {
            let current = PathBuf::from(&op.target.to_path);
            let original = PathBuf::from(&before.path);

            if let Some(parent) = original.parent() {
                std::fs::create_dir_all(parent).ok();
            }
            if !current.exists() {
                anyhow::bail!("当前位置文件不存在: {}", op.target.to_path);
            }
            std::fs::rename(&current, &original)
                .or_else(|_| {
                    std::fs::copy(&current, &original)?;
                    std::fs::remove_file(&current)
                })?;

            if op.op_type == "trash" {
                let restored = crate::models::FileItem {
                    id: op.target.file_id.clone(),
                    name: before.name.clone(),
                    path: before.path.clone(),
                    ext: PathBuf::from(&before.name)
                        .extension()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_lowercase(),
                    size: std::fs::metadata(&original).map(|m| m.len() as i64).unwrap_or(0),
                    mtime: Utc::now().timestamp(),
                    mime_type: "application/octet-stream".into(),
                    summary: None,
                    tags: vec![],
                    project_id: None,
                    project_name: None,
                    access_count: 0,
                };
                db.insert_file(&restored, false)?;
            } else {
                db.update_file_path(&op.target.file_id, &before.path, &before.name)?;
            }
        }
        _ => anyhow::bail!("不支持回滚类型: {}", op.op_type),
    }

    db.update_operation_status(op_id, "reverted")?;
    Ok(())
}

pub fn reveal_in_finder(path: &str) -> Result<()> {
    let p = Path::new(path);
    if !p.exists() {
        anyhow::bail!("文件不存在: {}", path);
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(path)
            .spawn()?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let parent = p.parent().unwrap_or(p);
        std::process::Command::new("xdg-open").arg(parent).spawn()?;
    }
    Ok(())
}

pub fn open_with_default(path: &str) -> Result<()> {
    if !Path::new(path).exists() {
        anyhow::bail!("文件不存在: {}", path);
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(path).spawn()?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd").args(["/C", "start", "", path]).spawn()?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open").arg(path).spawn()?;
    }
    Ok(())
}

fn trash_dir_for(file_path: &Path) -> Result<PathBuf> {
    let home = std::env::var_os("HOME").ok_or_else(|| anyhow!("HOME not set"))?;
    let mut p = PathBuf::from(home);
    p.push("Library/Application Support/FileMind/.trash");
    let _ = file_path;
    Ok(p)
}

fn uuid() -> String {
    let s = uuid::Uuid::new_v4().to_string();
    s.split('-').next().unwrap_or(&s).to_string()
}
