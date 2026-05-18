mod ai;
mod commands;
mod db;
mod models;
mod scan;
mod seed;

use std::path::PathBuf;
use std::sync::Arc;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let project_dir = std::env::var("CARGO_MANIFEST_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    let dotenv_paths = [
        project_dir.join("../.env"),
        project_dir.join(".env"),
        std::env::current_dir().unwrap_or_default().join(".env"),
    ];
    for p in &dotenv_paths {
        if p.exists() {
            let _ = dotenvy::from_path(p);
            println!("[env] loaded {}", p.display());
            break;
        }
    }

    let app_data_dir = dirs_local_data().join("FileMind");
    std::fs::create_dir_all(&app_data_dir).ok();
    let db_path = app_data_dir.join("filemind.sqlite");
    println!("[db] {}", db_path.display());

    let db = db::Db::open(db_path).expect("failed to open database");
    seed::seed_if_empty(&db).expect("failed to seed database");
    let db = Arc::new(db);

    let ai = match ai::ZhipuClient::from_env() {
        Ok(c) => {
            println!("[ai] Zhipu client ready");
            Some(c)
        }
        Err(e) => {
            eprintln!("[ai] disabled: {}", e);
            None
        }
    };

    let state = AppState { db, ai };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::dashboard_stats,
            commands::list_files,
            commands::get_file_detail,
            commands::search_files,
            commands::list_projects,
            commands::get_project,
            commands::get_project_files,
            commands::get_related_files,
            commands::get_graph_data,
            commands::regenerate_summary,
            commands::chat_message,
            commands::chat_message_stream,
            commands::scan_directory,
            commands::clear_all_data,
            commands::enrich_graph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn dirs_local_data() -> PathBuf {
    if let Some(home) = std::env::var_os("HOME") {
        PathBuf::from(home).join("Library/Application Support")
    } else {
        std::env::current_dir().unwrap_or_default()
    }
}
