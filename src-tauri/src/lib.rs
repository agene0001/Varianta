use gambit_core::Game;
use gambit_engine::MoveAnalysis;
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

const ENGINE_PATH_KEY: &str = "engine_path";

/// The resolved Stockfish path: the stored override if set, else auto-detected.
async fn resolved_engine_path(store: &Store) -> Result<Option<String>, String> {
    if let Some(p) = store
        .get_setting(ENGINE_PATH_KEY)
        .await
        .map_err(|e| e.to_string())?
    {
        return Ok(Some(p));
    }
    Ok(gambit_engine::detect_engine_path().map(|p| p.to_string_lossy().into_owned()))
}

/// The resolved engine path (stored override else auto-detected), or `None`.
#[tauri::command]
async fn get_engine_path(store: State<'_, Store>) -> Result<Option<String>, String> {
    resolved_engine_path(store.inner()).await
}

#[tauri::command]
async fn set_engine_path(store: State<'_, Store>, path: String) -> Result<(), String> {
    store
        .set_setting(ENGINE_PATH_KEY, &path)
        .await
        .map_err(|e| e.to_string())
}

/// Verify the engine at `path` launches and completes the UCI handshake.
#[tauri::command]
async fn verify_engine(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || gambit_engine::UciEngine::launch(&path))
        .await
        .map_err(|e| e.to_string())?
        .map(|_engine| ())
        .map_err(|e| e.to_string())
}

/// Analyze a stored game with the engine, persist the result, and return it.
#[tauri::command]
async fn analyze_game(
    store: State<'_, Store>,
    game_id: String,
    depth: Option<u32>,
) -> Result<Vec<MoveAnalysis>, String> {
    let engine_path = resolved_engine_path(store.inner())
        .await?
        .ok_or("No chess engine configured. Set the engine path in Settings.")?;
    let pgn = store
        .get_game_pgn(&game_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {game_id}"))?;
    let depth = depth.unwrap_or(14);

    // Engine analysis is CPU-bound and long — run it off the async runtime.
    let analyses = tauri::async_runtime::spawn_blocking(move || {
        let mut engine = gambit_engine::UciEngine::launch(&engine_path)?;
        engine.analyze_game(&pgn, depth)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    let json = serde_json::to_string(&analyses).map_err(|e| e.to_string())?;
    store
        .save_game_analysis(&game_id, &json)
        .await
        .map_err(|e| e.to_string())?;
    Ok(analyses)
}

/// A game's previously-stored analysis, if any.
#[tauri::command]
async fn get_game_analysis(
    store: State<'_, Store>,
    game_id: String,
) -> Result<Option<Vec<MoveAnalysis>>, String> {
    match store
        .get_game_analysis(&game_id)
        .await
        .map_err(|e| e.to_string())?
    {
        Some(json) => Ok(Some(serde_json::from_str(&json).map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
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
            list_games,
            get_engine_path,
            set_engine_path,
            verify_engine,
            analyze_game,
            get_game_analysis
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
