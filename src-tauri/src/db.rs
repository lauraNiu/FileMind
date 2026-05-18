use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::*;

pub struct Db {
    pub conn: Mutex<Connection>,
}

impl Db {
    pub fn open(path: PathBuf) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;",
        )?;
        let db = Self { conn: Mutex::new(conn) };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                created_at INTEGER NOT NULL,
                last_active INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT UNIQUE NOT NULL,
                ext TEXT NOT NULL,
                size INTEGER NOT NULL,
                mtime INTEGER NOT NULL,
                mime_type TEXT NOT NULL,
                content_hash TEXT,
                summary TEXT,
                tags TEXT,
                project_id TEXT REFERENCES projects(id),
                access_count INTEGER NOT NULL DEFAULT 0,
                is_temp INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_files_mtime ON files(mtime DESC);
            CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
            CREATE INDEX IF NOT EXISTS idx_files_ext ON files(ext);
            CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);

            CREATE TABLE IF NOT EXISTS relations (
                src_id TEXT NOT NULL,
                dst_id TEXT NOT NULL,
                relation TEXT NOT NULL,
                weight REAL NOT NULL DEFAULT 1.0,
                PRIMARY KEY (src_id, dst_id, relation)
            );

            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
                name,
                summary,
                tags,
                content=files,
                content_rowid=rowid,
                tokenize='unicode61'
            );
            "#,
        )?;
        Ok(())
    }

    pub fn is_seeded(&self) -> bool {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM files", [], |r| r.get(0))
            .unwrap_or(0);
        count > 0
    }

    pub fn insert_project(&self, p: &Project) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO projects (id, name, description, status, created_at, last_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![p.id, p.name, p.description, p.status, p.last_active, p.last_active],
        )?;
        Ok(())
    }

    pub fn insert_file(&self, f: &FileItem, is_temp: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&f.tags)?;
        conn.execute(
            "INSERT OR REPLACE INTO files
             (id, name, path, ext, size, mtime, mime_type, summary, tags, project_id, access_count, is_temp, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                f.id, f.name, f.path, f.ext, f.size, f.mtime, f.mime_type,
                f.summary, tags_json, f.project_id, f.access_count, is_temp as i64, f.mtime
            ],
        )?;
        conn.execute(
            "INSERT INTO files_fts (rowid, name, summary, tags)
             SELECT rowid, name, COALESCE(summary, ''), COALESCE(tags, '') FROM files WHERE id = ?1",
            params![f.id],
        ).ok();
        Ok(())
    }

    pub fn insert_relation(&self, src: &str, dst: &str, relation: &str, weight: f64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO relations (src_id, dst_id, relation, weight)
             VALUES (?1, ?2, ?3, ?4)",
            params![src, dst, relation, weight],
        )?;
        Ok(())
    }

    pub fn list_files(&self, limit: i64, offset: i64) -> Result<Vec<FileItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT f.id, f.name, f.path, f.ext, f.size, f.mtime, f.mime_type,
                    f.summary, f.tags, f.project_id, p.name, f.access_count
             FROM files f LEFT JOIN projects p ON f.project_id = p.id
             ORDER BY f.mtime DESC LIMIT ?1 OFFSET ?2",
        )?;
        let rows = stmt.query_map(params![limit, offset], file_row)?;
        rows.collect::<Result<_, _>>().map_err(Into::into)
    }

    pub fn get_file(&self, id: &str) -> Result<FileItem> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT f.id, f.name, f.path, f.ext, f.size, f.mtime, f.mime_type,
                    f.summary, f.tags, f.project_id, p.name, f.access_count
             FROM files f LEFT JOIN projects p ON f.project_id = p.id
             WHERE f.id = ?1",
        )?;
        let f = stmt
            .query_row(params![id], file_row)
            .map_err(|e| anyhow!("文件不存在: {}", e))?;
        Ok(f)
    }

    pub fn search_files(&self, query: &str, limit: i64) -> Result<Vec<SearchResult>> {
        let conn = self.conn.lock().unwrap();
        let q = sanitize_fts(query);
        let mut results: Vec<SearchResult> = Vec::new();

        if !q.is_empty() {
            let fts_query = format!("{}*", q);
            let mut stmt = conn.prepare(
                "SELECT f.id, f.name, f.path, f.ext, f.size, f.mtime, f.mime_type,
                        f.summary, f.tags, f.project_id, p.name, f.access_count,
                        bm25(files_fts) AS rank
                 FROM files_fts JOIN files f ON files_fts.rowid = f.rowid
                 LEFT JOIN projects p ON f.project_id = p.id
                 WHERE files_fts MATCH ?1
                 ORDER BY rank LIMIT ?2",
            )?;
            let rows = stmt.query_map(params![fts_query, limit], |row| {
                let f = file_row(row)?;
                let rank: f64 = row.get(12).unwrap_or(0.0);
                Ok((f, rank))
            })?;
            for r in rows {
                let (f, rank) = r?;
                let score = 1.0 / (1.0 + rank.abs());
                let highlight = highlight_match(&f.name, query);
                results.push(SearchResult { file: f, score, highlight: Some(highlight) });
            }
        }

        if results.len() < limit as usize {
            let like = format!("%{}%", query);
            let mut stmt = conn.prepare(
                "SELECT f.id, f.name, f.path, f.ext, f.size, f.mtime, f.mime_type,
                        f.summary, f.tags, f.project_id, p.name, f.access_count
                 FROM files f LEFT JOIN projects p ON f.project_id = p.id
                 WHERE f.name LIKE ?1 OR f.summary LIKE ?1 OR f.tags LIKE ?1
                 ORDER BY f.mtime DESC LIMIT ?2",
            )?;
            let rows = stmt.query_map(params![like, limit], file_row)?;
            let existing_ids: std::collections::HashSet<String> =
                results.iter().map(|r| r.file.id.clone()).collect();
            for r in rows {
                let f = r?;
                if existing_ids.contains(&f.id) {
                    continue;
                }
                let highlight = highlight_match(&f.name, query);
                results.push(SearchResult { file: f, score: 0.5, highlight: Some(highlight) });
            }
        }

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit as usize);
        Ok(results)
    }

    pub fn list_projects(&self) -> Result<Vec<Project>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT p.id, p.name, p.description, p.status, p.last_active,
                    COUNT(f.id) AS fc,
                    COALESCE(SUM(f.size), 0) AS ts
             FROM projects p LEFT JOIN files f ON f.project_id = p.id
             GROUP BY p.id ORDER BY p.last_active DESC",
        )?;
        let mut projects: Vec<Project> = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    status: row.get(3)?,
                    last_active: row.get(4)?,
                    file_count: row.get(5)?,
                    total_size: row.get(6)?,
                    top_files: vec![],
                })
            })?
            .collect::<Result<_, _>>()?;
        drop(stmt);

        for p in projects.iter_mut() {
            let mut s = conn.prepare(
                "SELECT name FROM files WHERE project_id = ?1 ORDER BY mtime DESC LIMIT 3",
            )?;
            let names: Vec<String> = s
                .query_map(params![p.id], |r| r.get::<_, String>(0))?
                .filter_map(Result::ok)
                .collect();
            p.top_files = names;
        }
        Ok(projects)
    }

    pub fn project_files(&self, id: &str) -> Result<Vec<FileItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT f.id, f.name, f.path, f.ext, f.size, f.mtime, f.mime_type,
                    f.summary, f.tags, f.project_id, p.name, f.access_count
             FROM files f LEFT JOIN projects p ON f.project_id = p.id
             WHERE f.project_id = ?1 ORDER BY f.mtime DESC",
        )?;
        let rows = stmt.query_map(params![id], file_row)?;
        rows.collect::<Result<_, _>>().map_err(Into::into)
    }

    pub fn related_files(&self, id: &str) -> Result<Vec<RelatedFile>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT r.dst_id, r.relation FROM relations r WHERE r.src_id = ?1
             UNION
             SELECT r.src_id, r.relation FROM relations r WHERE r.dst_id = ?1
             LIMIT 10",
        )?;
        let pairs: Vec<(String, String)> = stmt
            .query_map(params![id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?
            .filter_map(Result::ok)
            .collect();
        drop(stmt);

        let mut out = Vec::new();
        for (dst_id, relation) in pairs {
            let mut s = conn.prepare(
                "SELECT f.id, f.name, f.path, f.ext, f.size, f.mtime, f.mime_type,
                        f.summary, f.tags, f.project_id, p.name, f.access_count
                 FROM files f LEFT JOIN projects p ON f.project_id = p.id
                 WHERE f.id = ?1",
            )?;
            if let Ok(f) = s.query_row(params![dst_id], file_row) {
                out.push(RelatedFile { file: f, relation });
            }
        }
        Ok(out)
    }

    pub fn update_tags(&self, id: &str, tags: &[String]) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(tags)?;
        conn.execute(
            "UPDATE files SET tags = ?1 WHERE id = ?2",
            params![tags_json, id],
        )?;
        conn.execute(
            "UPDATE files_fts SET tags = ?1 WHERE rowid = (SELECT rowid FROM files WHERE id = ?2)",
            params![tags_json, id],
        ).ok();
        Ok(())
    }

    pub fn top_tags(&self, limit: i64) -> Result<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT tags FROM files WHERE tags IS NOT NULL AND tags != '[]'")?;
        let rows: Vec<String> = stmt
            .query_map([], |r| r.get::<_, String>(0))?
            .filter_map(Result::ok)
            .collect();
        let mut counts: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
        for s in rows {
            if let Ok(v) = serde_json::from_str::<Vec<String>>(&s) {
                for t in v {
                    *counts.entry(t).or_insert(0) += 1;
                }
            }
        }
        let mut v: Vec<(String, i64)> = counts.into_iter().collect();
        v.sort_by(|a, b| b.1.cmp(&a.1));
        v.truncate(limit as usize);
        Ok(v)
    }

    pub fn activity_timeline(&self, days: i64) -> Result<Vec<(i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let since = now - days * 86400;
        let mut stmt = conn.prepare(
            "SELECT (mtime / 86400) AS day, COUNT(*) AS c
             FROM files
             WHERE mtime >= ?1
             GROUP BY day ORDER BY day",
        )?;
        let rows: Vec<(i64, i64)> = stmt
            .query_map(params![since], |r| Ok((r.get(0)?, r.get(1)?)))?
            .filter_map(Result::ok)
            .collect();
        Ok(rows)
    }

    pub fn update_summary(&self, id: &str, summary: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("UPDATE files SET summary = ?1 WHERE id = ?2", params![summary, id])?;
        conn.execute(
            "UPDATE files_fts SET summary = ?1 WHERE rowid = (SELECT rowid FROM files WHERE id = ?2)",
            params![summary, id],
        ).ok();
        Ok(())
    }

    pub fn dashboard_stats(&self) -> Result<DashboardStats> {
        let conn = self.conn.lock().unwrap();
        let (total_files, total_size): (i64, i64) = conn.query_row(
            "SELECT COUNT(*), COALESCE(SUM(size), 0) FROM files",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        let total_projects: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0))?;
        let active_projects: i64 = conn.query_row(
            "SELECT COUNT(*) FROM projects WHERE status = 'active'",
            [],
            |r| r.get(0),
        )?;
        let week_ago = chrono::Utc::now().timestamp() - 7 * 86400;
        let weekly_added: i64 = conn.query_row(
            "SELECT COUNT(*) FROM files WHERE created_at >= ?1",
            params![week_ago],
            |r| r.get(0),
        ).unwrap_or(0);
        let temp_files_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM files WHERE is_temp = 1",
            [],
            |r| r.get(0),
        ).unwrap_or(0);
        let duplicate_groups: i64 = conn.query_row(
            "SELECT COUNT(*) FROM (SELECT content_hash FROM files WHERE content_hash IS NOT NULL GROUP BY content_hash HAVING COUNT(*) > 1)",
            [],
            |r| r.get(0),
        ).unwrap_or(0);
        let duplicate_size: i64 = conn.query_row(
            "SELECT COALESCE(SUM(s), 0) FROM (SELECT SUM(size) - MAX(size) AS s FROM files WHERE content_hash IS NOT NULL GROUP BY content_hash HAVING COUNT(*) > 1)",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        let mut stmt = conn.prepare(
            "SELECT ext, COUNT(*) AS c FROM files GROUP BY ext ORDER BY c DESC LIMIT 6",
        )?;
        let ext_distribution: Vec<ExtDist> = stmt
            .query_map([], |r| Ok(ExtDist { ext: r.get(0)?, count: r.get(1)? }))?
            .filter_map(Result::ok)
            .collect();

        let ai_used_yuan: f64 = conn
            .query_row("SELECT value FROM meta WHERE key = 'ai_used'", [], |r| {
                r.get::<_, String>(0)
            })
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);

        Ok(DashboardStats {
            total_files,
            total_size,
            active_projects,
            total_projects,
            duplicate_groups,
            duplicate_size,
            temp_files_count,
            weekly_added,
            ai_used_yuan,
            ai_budget_yuan: 30.0,
            ext_distribution,
            scan_progress: ScanProgress {
                current: total_files,
                total: total_files,
                status: "ready".to_string(),
            },
        })
    }

    pub fn graph_data(&self, focus_id: Option<&str>, limit: usize) -> Result<GraphData> {
        let conn = self.conn.lock().unwrap();
        let mut links: Vec<GraphLink> = Vec::new();
        let mut nodes: std::collections::HashMap<String, GraphNode> = std::collections::HashMap::new();

        let load_node = |id: &str, conn: &rusqlite::Connection| -> Option<GraphNode> {
            let mut stmt = conn
                .prepare(
                    "SELECT f.id, f.name, f.ext, f.size, f.project_id, p.name
                     FROM files f LEFT JOIN projects p ON f.project_id = p.id
                     WHERE f.id = ?1",
                )
                .ok()?;
            stmt.query_row(rusqlite::params![id], |row| {
                let size: i64 = row.get(3)?;
                let val = ((size as f64).log10().max(1.0) * 0.5).min(8.0);
                Ok(GraphNode {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    ext: row.get(2)?,
                    size,
                    project_id: row.get(4).ok(),
                    project_name: row.get(5).ok(),
                    val,
                })
            })
            .ok()
        };

        if let Some(focus) = focus_id {
            let mut stmt = conn.prepare(
                "SELECT src_id, dst_id, relation, weight FROM relations
                 WHERE src_id = ?1 OR dst_id = ?1 LIMIT ?2",
            )?;
            let pairs: Vec<(String, String, String, f64)> = stmt
                .query_map(rusqlite::params![focus, limit as i64], |r| {
                    Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
                })?
                .filter_map(Result::ok)
                .collect();
            for (s, d, rel, w) in pairs {
                if !nodes.contains_key(&s) {
                    if let Some(n) = load_node(&s, &conn) {
                        nodes.insert(s.clone(), n);
                    }
                }
                if !nodes.contains_key(&d) {
                    if let Some(n) = load_node(&d, &conn) {
                        nodes.insert(d.clone(), n);
                    }
                }
                links.push(GraphLink { source: s, target: d, relation: rel, weight: w });
            }
        } else {
            let mut stmt = conn.prepare(
                "SELECT src_id, dst_id, relation, weight FROM relations LIMIT ?1",
            )?;
            let pairs: Vec<(String, String, String, f64)> = stmt
                .query_map(rusqlite::params![limit as i64], |r| {
                    Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
                })?
                .filter_map(Result::ok)
                .collect();
            for (s, d, rel, w) in pairs {
                if !nodes.contains_key(&s) {
                    if let Some(n) = load_node(&s, &conn) {
                        nodes.insert(s.clone(), n);
                    }
                }
                if !nodes.contains_key(&d) {
                    if let Some(n) = load_node(&d, &conn) {
                        nodes.insert(d.clone(), n);
                    }
                }
                links.push(GraphLink { source: s, target: d, relation: rel, weight: w });
            }
        }

        Ok(GraphData {
            nodes: nodes.into_values().collect(),
            links,
        })
    }

    pub fn clear_all(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "DELETE FROM relations;
             DELETE FROM files_fts;
             DELETE FROM files;
             DELETE FROM projects;
             DELETE FROM meta;",
        )?;
        Ok(())
    }

    pub fn add_ai_cost(&self, cost: f64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let cur: f64 = conn
            .query_row("SELECT value FROM meta WHERE key = 'ai_used'", [], |r| {
                r.get::<_, String>(0)
            })
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let new = cur + cost;
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('ai_used', ?1)",
            params![format!("{:.4}", new)],
        )?;
        Ok(())
    }
}

fn file_row(row: &rusqlite::Row) -> rusqlite::Result<FileItem> {
    let tags_str: Option<String> = row.get(8).ok();
    let tags: Vec<String> = tags_str
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    Ok(FileItem {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        ext: row.get(3)?,
        size: row.get(4)?,
        mtime: row.get(5)?,
        mime_type: row.get(6)?,
        summary: row.get(7)?,
        tags,
        project_id: row.get(9).ok(),
        project_name: row.get(10).ok(),
        access_count: row.get(11)?,
    })
}

fn sanitize_fts(q: &str) -> String {
    q.chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || ['-', '_', '.'].contains(c))
        .collect::<String>()
        .trim()
        .to_string()
}

fn highlight_match(name: &str, query: &str) -> String {
    if query.is_empty() {
        return name.to_string();
    }
    let q = query.to_lowercase();
    let n = name.to_lowercase();
    if let Some(idx) = n.find(&q) {
        let end = idx + q.len();
        let before = &name[..idx];
        let matched = &name[idx..end];
        let after = &name[end..];
        format!(
            "{}<mark style=\"background:rgba(34,197,94,0.25);color:#22c55e;border-radius:2px;padding:0 2px\">{}</mark>{}",
            html_escape(before),
            html_escape(matched),
            html_escape(after)
        )
    } else {
        html_escape(name)
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
