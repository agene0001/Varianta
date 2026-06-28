//! Local SQLite persistence for Varianta's user repertoire (custom lines and
//! user-created openings), on top of `dbkit-rs`.
//!
//! This is the native replacement for the old browser-side `useUserLinesDb.ts`
//! (sql.js + IndexedDB). The schema is identical, so an exported sql.js database
//! file can be imported as the native DB without transformation.

use std::collections::{HashMap, HashSet};
use std::path::Path;

use chrono::{DateTime, Utc};
use dbkit::{BaseHandler, ConnectionManager, FetchMode, WriteOp};
use gambit_core::{Color, Game, GameId, GameResult, GameSource};
use serde::{Deserialize, Serialize};
use sqlx::Row; // brings `try_get` into scope for the `AnyRow`s dbkit returns

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error(transparent)]
    Db(#[from] dbkit::DbkitError),
    #[error("sqlx error: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

/// One repertoire line. `moves` is kept opaque (`serde_json::Value`) so the
/// storage layer stays decoupled from the chess move representation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Line {
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub moves: serde_json::Value,
}

/// A user-created opening (built-in openings live in the frontend data file).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Opening {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub lines: Vec<Line>,
}

/// Mirrors the frontend `StoredUserLines` shape (camelCase keys preserved).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StoredUserLines {
    #[serde(rename = "linesByOpening")]
    pub lines_by_opening: HashMap<String, Vec<Line>>,
    #[serde(rename = "newOpenings")]
    pub new_openings: Vec<Opening>,
}

/// Handle to the local repertoire database.
pub struct Store {
    handler: BaseHandler,
}

impl Store {
    fn from_handler(handler: BaseHandler) -> Self {
        Self { handler }
    }

    /// Open (creating if absent) the SQLite database at `db_path` and ensure the
    /// schema exists. The parent directory is created if needed.
    pub async fn open(db_path: &Path) -> Result<Self, StorageError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        // An absolute path yields `sqlite:///abs/path` (empty authority). dbkit
        // installs the sqlx drivers and auto-creates the file.
        let conn = ConnectionManager::new(&format!("sqlite://{}", db_path.display())).await?;
        let store = Self::from_handler(BaseHandler::new(conn.pool().clone()));
        store.init_schema().await?;
        Ok(store)
    }

    /// Idempotent schema creation. Matches the original sql.js schema exactly.
    /// (Uses plain `IF NOT EXISTS` DDL rather than dbkit's tracked migrations —
    /// fine while the schema is additive; switch to `InitializationHandler` when
    /// non-idempotent migrations are needed.)
    async fn init_schema(&self) -> Result<(), StorageError> {
        self.handler
            .execute_write(WriteOp::BatchDDL {
                queries: &[
                    "CREATE TABLE IF NOT EXISTS user_openings (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT DEFAULT ''
                    )",
                    "CREATE TABLE IF NOT EXISTS user_lines (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        opening_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        moves_json TEXT NOT NULL
                    )",
                    // Gambit: imported games.
                    "CREATE TABLE IF NOT EXISTS games (
                        id TEXT PRIMARY KEY,
                        source TEXT NOT NULL,
                        pgn TEXT NOT NULL,
                        white TEXT NOT NULL,
                        black TEXT NOT NULL,
                        player_color TEXT NOT NULL,
                        result TEXT NOT NULL,
                        played_at TEXT NOT NULL
                    )",
                ],
            })
            .await?;
        Ok(())
    }

    async fn insert_line(&self, opening_id: &str, line: &Line) -> Result<(), StorageError> {
        let moves_json = serde_json::to_string(&line.moves)?;
        self.handler
            .execute_write(WriteOp::Single {
                query: "INSERT INTO user_lines (opening_id, name, description, moves_json) \
                        VALUES (?, ?, ?, ?)",
                params: vec![
                    opening_id.into(),
                    line.name.clone().into(),
                    line.description.clone().into(),
                    moves_json.into(),
                ],
                mode: FetchMode::None,
            })
            .await?;
        Ok(())
    }

    /// Add a line to any opening (built-in id or user-created id). Covers both
    /// `addLineToExistingOpening` and `addLineToNewOpening` from the old TS API.
    pub async fn add_line(&self, opening_id: &str, line: &Line) -> Result<(), StorageError> {
        self.insert_line(opening_id, line).await
    }

    /// Add a new user-created opening together with its lines.
    pub async fn add_opening(&self, opening: &Opening) -> Result<(), StorageError> {
        self.handler
            .execute_write(WriteOp::Single {
                query: "INSERT OR IGNORE INTO user_openings (id, name, description) \
                        VALUES (?, ?, ?)",
                params: vec![
                    opening.id.clone().into(),
                    opening.name.clone().into(),
                    opening.description.clone().into(),
                ],
                mode: FetchMode::None,
            })
            .await?;
        for line in &opening.lines {
            self.insert_line(&opening.id, line).await?;
        }
        Ok(())
    }

    /// Load all stored user lines, partitioned into lines attached to built-in
    /// openings vs. user-created openings — mirrors the old `loadUserLines()`.
    pub async fn load_user_lines(&self) -> Result<StoredUserLines, StorageError> {
        let opening_rows = self
            .handler
            .execute_write(WriteOp::Single {
                query: "SELECT id, name, description FROM user_openings",
                params: vec![],
                mode: FetchMode::All,
            })
            .await?
            .all()?;

        let mut user_opening_ids: HashSet<String> = HashSet::new();
        let mut openings: Vec<Opening> = Vec::new();
        for row in &opening_rows {
            let id: String = row.try_get(0)?;
            let name: String = row.try_get(1)?;
            let description: String = row.try_get::<Option<String>, _>(2)?.unwrap_or_default();
            user_opening_ids.insert(id.clone());
            openings.push(Opening {
                id,
                name,
                description,
                lines: Vec::new(),
            });
        }

        let line_rows = self
            .handler
            .execute_write(WriteOp::Single {
                query: "SELECT opening_id, name, description, moves_json FROM user_lines \
                        ORDER BY id",
                params: vec![],
                mode: FetchMode::All,
            })
            .await?
            .all()?;

        let mut result = StoredUserLines::default();
        let mut lines_by_user_opening: HashMap<String, Vec<Line>> = HashMap::new();

        for row in &line_rows {
            let opening_id: String = row.try_get(0)?;
            let name: String = row.try_get(1)?;
            let description: String = row.try_get::<Option<String>, _>(2)?.unwrap_or_default();
            let moves_json: String = row.try_get(3)?;
            let line = Line {
                name,
                description,
                moves: serde_json::from_str(&moves_json)?,
            };
            if user_opening_ids.contains(&opening_id) {
                lines_by_user_opening
                    .entry(opening_id)
                    .or_default()
                    .push(line);
            } else {
                result
                    .lines_by_opening
                    .entry(opening_id)
                    .or_default()
                    .push(line);
            }
        }

        for mut opening in openings {
            opening.lines = lines_by_user_opening.remove(&opening.id).unwrap_or_default();
            result.new_openings.push(opening);
        }

        Ok(result)
    }

    // ==================== Games (Gambit) ====================

    /// Insert games, skipping any already stored (dedup by id). Chess.com
    /// re-imports overlap by design, so `INSERT OR IGNORE` is the right behavior.
    pub async fn save_games(&self, games: &[Game]) -> Result<(), StorageError> {
        if games.is_empty() {
            return Ok(());
        }
        let params_list = games
            .iter()
            .map(|g| {
                vec![
                    g.id.0.clone().into(),
                    game_source_str(g.source).into(),
                    g.pgn.clone().into(),
                    g.white.clone().into(),
                    g.black.clone().into(),
                    color_str(g.player_color).into(),
                    game_result_str(g.result).into(),
                    g.played_at.to_rfc3339().into(),
                ]
            })
            .collect();
        self.handler
            .execute_write(WriteOp::BatchParams {
                query: "INSERT OR IGNORE INTO games \
                        (id, source, pgn, white, black, player_color, result, played_at) \
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                params_list,
                // Skip a malformed row rather than aborting the whole import.
                isolate_rows: true,
            })
            .await?;
        Ok(())
    }

    /// All stored games, most recent first.
    pub async fn list_games(&self) -> Result<Vec<Game>, StorageError> {
        let rows = self
            .handler
            .execute_write(WriteOp::Single {
                query: "SELECT id, source, pgn, white, black, player_color, result, played_at \
                        FROM games ORDER BY played_at DESC",
                params: vec![],
                mode: FetchMode::All,
            })
            .await?
            .all()?;

        let mut games = Vec::with_capacity(rows.len());
        for row in &rows {
            let played_at: String = row.try_get(7)?;
            games.push(Game {
                id: GameId(row.try_get::<String, _>(0)?),
                source: parse_source(&row.try_get::<String, _>(1)?),
                pgn: row.try_get(2)?,
                white: row.try_get(3)?,
                black: row.try_get(4)?,
                player_color: parse_color(&row.try_get::<String, _>(5)?),
                result: parse_result(&row.try_get::<String, _>(6)?),
                played_at: DateTime::parse_from_rfc3339(&played_at)
                    .map(|d| d.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            });
        }
        Ok(games)
    }
}

// ---- enum <-> stored string mappings (match the serde reprs in gambit-core) ----

fn color_str(c: Color) -> &'static str {
    match c {
        Color::White => "white",
        Color::Black => "black",
    }
}

fn parse_color(s: &str) -> Color {
    match s {
        "black" => Color::Black,
        _ => Color::White,
    }
}

fn game_source_str(s: GameSource) -> &'static str {
    match s {
        GameSource::ChessCom => "chess_com",
        GameSource::Lichess => "lichess",
        GameSource::ManualPgn => "manual_pgn",
    }
}

fn parse_source(s: &str) -> GameSource {
    match s {
        "lichess" => GameSource::Lichess,
        "manual_pgn" => GameSource::ManualPgn,
        _ => GameSource::ChessCom,
    }
}

fn game_result_str(r: GameResult) -> &'static str {
    match r {
        GameResult::WhiteWin => "white_win",
        GameResult::BlackWin => "black_win",
        GameResult::Draw => "draw",
        GameResult::Unknown => "unknown",
    }
}

fn parse_result(s: &str) -> GameResult {
    match s {
        "white_win" => GameResult::WhiteWin,
        "black_win" => GameResult::BlackWin,
        "draw" => GameResult::Draw,
        _ => GameResult::Unknown,
    }
}

/// Read a legacy sql.js SQLite database (raw file bytes, identical schema) into
/// the common [`StoredUserLines`] shape. Used to migrate data exported from the
/// old browser app: the bytes are written to a temp file, opened read-only, and
/// parsed. Merging into the live store is left to the caller (the frontend's
/// `importStoredUserLines`), which reuses the normal dedup + insert path.
pub async fn read_legacy_sqlite(bytes: &[u8]) -> Result<StoredUserLines, StorageError> {
    let tmp = std::env::temp_dir().join(format!(
        "varianta-legacy-{}-{}.sqlite",
        std::process::id(),
        bytes.len()
    ));
    std::fs::write(&tmp, bytes)?;
    let result = async {
        let conn = ConnectionManager::new(&format!("sqlite://{}", tmp.display())).await?;
        let store = Store::from_handler(BaseHandler::new(conn.pool().clone()));
        store.init_schema().await?; // tolerate an empty/partial legacy file
        store.load_user_lines().await
    }
    .await;
    let _ = std::fs::remove_file(&tmp);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn round_trip() {
        let dir = std::env::temp_dir().join(format!("varianta-storage-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let store = Store::open(&dir.join("test.db")).await.unwrap();

        // A line on a built-in opening, and a whole new user opening.
        store
            .add_line(
                "ruy-lopez",
                &Line {
                    name: "Berlin".into(),
                    description: String::new(),
                    moves: serde_json::json!([{ "san": "e4" }, { "san": "e5" }]),
                },
            )
            .await
            .unwrap();
        store
            .add_opening(&Opening {
                id: "user-london".into(),
                name: "My London".into(),
                description: "test".into(),
                lines: vec![Line {
                    name: "Main".into(),
                    description: String::new(),
                    moves: serde_json::json!([{ "san": "d4" }]),
                }],
            })
            .await
            .unwrap();

        let loaded = store.load_user_lines().await.unwrap();
        assert_eq!(loaded.lines_by_opening.get("ruy-lopez").map(|v| v.len()), Some(1));
        assert_eq!(loaded.new_openings.len(), 1);
        assert_eq!(loaded.new_openings[0].id, "user-london");
        assert_eq!(loaded.new_openings[0].lines.len(), 1);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn games_round_trip() {
        let dir =
            std::env::temp_dir().join(format!("varianta-games-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let store = Store::open(&dir.join("g.db")).await.unwrap();

        let g = Game {
            id: GameId("https://chess.com/game/1".into()),
            source: GameSource::ChessCom,
            pgn: "1. e4 e5 *".into(),
            white: "alice".into(),
            black: "bob".into(),
            player_color: Color::White,
            result: GameResult::WhiteWin,
            played_at: Utc::now(),
        };
        // Saving the same id twice must not duplicate (INSERT OR IGNORE).
        store.save_games(std::slice::from_ref(&g)).await.unwrap();
        store.save_games(std::slice::from_ref(&g)).await.unwrap();

        let games = store.list_games().await.unwrap();
        assert_eq!(games.len(), 1);
        assert_eq!(games[0].id, g.id);
        assert_eq!(games[0].result, GameResult::WhiteWin);
        assert_eq!(games[0].opponent(), "bob");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
