use gambit_core::Game;
use gambit_ingest::ChessComClient;
use tauri::{Manager, State};
use varianta_storage::{Line, Opening, Store, StoredUserLines};

#[tauri::command]
async fn get_user_lines(store: State<'_, Store>) -> Result<StoredUserLines, String> {
    store.load_user_lines().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_line(
    store: State<'_, Store>,
    opening_id: String,
    line: Line,
) -> Result<(), String> {
    store
        .add_line(&opening_id, &line)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_opening(store: State<'_, Store>, opening: Opening) -> Result<(), String> {
    store.add_opening(&opening).await.map_err(|e| e.to_string())
}

/// Parse a legacy sql.js SQLite database (raw bytes, exported from the old
/// browser app) into the common shape. The frontend then merges the result into
/// the live store via the normal dedup + insert path.
#[tauri::command]
async fn import_legacy_db(bytes: Vec<u8>) -> Result<StoredUserLines, String> {
    varianta_storage::read_legacy_sqlite(&bytes)
        .await
        .map_err(|e| e.to_string())
}

/// Fetch a Chess.com player's full game history, store new games, and return the
/// full stored list (most recent first).
#[tauri::command]
async fn import_games(store: State<'_, Store>, username: String) -> Result<Vec<Game>, String> {
    let client = ChessComClient::new().map_err(|e| e.to_string())?;
    let games = client
        .fetch_all_games(&username)
        .await
        .map_err(|e| e.to_string())?;
    store.save_games(&games).await.map_err(|e| e.to_string())?;
    store.list_games().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_games(store: State<'_, Store>) -> Result<Vec<Game>, String> {
    store.list_games().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Open the local repertoire DB under the app data dir and stash it in
            // managed state for the command handlers.
            let db_path = app
                .path()
                .app_data_dir()
                .expect("resolve app data dir")
                .join("varianta.db");
            let store = tauri::async_runtime::block_on(Store::open(&db_path))
                .expect("open varianta database");
            app.manage(store);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_user_lines,
            add_line,
            add_opening,
            import_legacy_db,
            import_games,
            list_games
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
