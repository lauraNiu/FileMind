mod ai;
mod commands;
mod config;
mod db;
mod models;
mod ops;
mod scan;
mod seed;
mod watcher;

use std::path::PathBuf;
use std::sync::Arc;

use commands::AppState;
use tauri::Manager;

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
    let cfg_path = app_data_dir.join("config.json");
    println!("[db] {}", db_path.display());
    println!("[cfg] {}", cfg_path.display());

    let db = db::Db::open(db_path).expect("failed to open database");
    seed::seed_if_empty(&db).expect("failed to seed database");
    let db = Arc::new(db);

    let cfg_store = config::ConfigStore::load(cfg_path).expect("failed to load config");
    let cfg = cfg_store.get();
    if !cfg.ai.api_key.is_empty() {
        println!("[ai] using API key from config (model: {})", cfg.ai.model);
    } else if std::env::var("ZHIPU_API_KEY").is_ok() {
        println!("[ai] using API key from .env");
    } else {
        eprintln!("[ai] no API key configured - user must set in Settings");
    }

    let watcher_mgr = Arc::new(watcher::WatcherManager::new());

    let state = AppState {
        db,
        config: Arc::new(cfg_store),
        watcher: watcher_mgr,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state)
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state: tauri::State<AppState> = app_handle.state();
            if let Err(e) = state.watcher.start(app_handle.clone(), state.db.clone()) {
                eprintln!("[watcher] start failed: {}", e);
            } else {
                println!("[watcher] started");
            }
            Ok(())
        })
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
            commands::batch_summarize,
            commands::chat_message,
            commands::chat_message_stream,
            commands::scan_directory,
            commands::clear_all_data,
            commands::enrich_graph,
            commands::update_file_tags,
            commands::top_tags,
            commands::activity_timeline,
            commands::timeline_buckets,
            commands::list_duplicates,
            commands::list_temp_files,
            commands::files_without_summary,
            commands::get_config,
            commands::save_profile,
            commands::save_ai_config,
            commands::save_scan_config,
            commands::complete_onboarding,
            commands::logout,
            commands::test_ai_connection,
            commands::reveal_in_finder,
            commands::open_with_default,
            commands::move_file,
            commands::rename_file,
            commands::trash_file,
            commands::revert_operation,
            commands::list_operations,
            commands::watcher_status,
            commands::watcher_start,
            commands::watcher_stop,
            commands::watcher_remove_root,
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
