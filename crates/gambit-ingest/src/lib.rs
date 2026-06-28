//! Game ingestion — normalizes external game histories into [`gambit_core::Game`].
//!
//! V1 source is the **Chess.com public API** (no auth: a username is enough).
//! This module owns the JSON→`Game` parsing, which is pure and offline-testable;
//! the HTTP fetch layer is layered on top separately.

use chrono::{TimeZone, Utc};
use gambit_core::{Color, Game, GameId, GameResult, GameSource};
use serde::Deserialize;

#[derive(Debug, thiserror::Error)]
pub enum IngestError {
    #[error("failed to parse archive JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
}

// ---- Chess.com monthly-archive JSON (only the fields we consume) ----
// https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}

#[derive(Debug, Deserialize)]
struct ChessComArchive {
    games: Vec<ChessComGame>,
}

#[derive(Debug, Deserialize)]
struct ChessComGame {
    url: String,
    /// Absent for some games (e.g. still in progress).
    pgn: Option<String>,
    /// Unix seconds of the game's end.
    end_time: i64,
    white: ChessComPlayer,
    black: ChessComPlayer,
}

#[derive(Debug, Deserialize)]
struct ChessComPlayer {
    username: String,
    /// Per-player result code, e.g. "win", "checkmated", "resigned",
    /// "agreed", "repetition", "timeout", ...
    result: String,
}

/// Parse one Chess.com monthly-archive document into normalized [`Game`]s.
///
/// `username` identifies the importing player (case-insensitive) so each game's
/// `player_color` can be set. Games without a PGN are skipped.
pub fn parse_chesscom_archive(json: &str, username: &str) -> Result<Vec<Game>, IngestError> {
    let archive: ChessComArchive = serde_json::from_str(json)?;
    let mut games = Vec::with_capacity(archive.games.len());

    for g in archive.games {
        let Some(pgn) = g.pgn else { continue };

        let player_color = if g.white.username.eq_ignore_ascii_case(username) {
            Color::White
        } else {
            Color::Black
        };

        let played_at = Utc
            .timestamp_opt(g.end_time, 0)
            .single()
            .unwrap_or_else(Utc::now);

        games.push(Game {
            id: GameId(g.url),
            source: GameSource::ChessCom,
            pgn,
            player_color,
            result: chesscom_result(&g.white.result, &g.black.result),
            played_at,
            white: g.white.username,
            black: g.black.username,
        });
    }

    Ok(games)
}

/// Map Chess.com's per-player result codes to a White-perspective [`GameResult`].
fn chesscom_result(white: &str, black: &str) -> GameResult {
    match (white, black) {
        ("win", _) => GameResult::WhiteWin,
        (_, "win") => GameResult::BlackWin,
        _ if is_draw(white) && is_draw(black) => GameResult::Draw,
        _ => GameResult::Unknown,
    }
}

/// Chess.com result codes that denote a draw (shared by both players).
fn is_draw(code: &str) -> bool {
    matches!(
        code,
        "agreed" | "repetition" | "stalemate" | "insufficient" | "50move" | "timevsinsufficient"
    )
}

/// HTTP client for the Chess.com public API (no authentication required).
///
/// Chess.com rejects requests without a User-Agent, so one is always set.
pub struct ChessComClient {
    http: reqwest::Client,
}

impl ChessComClient {
    pub fn new() -> Result<Self, IngestError> {
        let http = reqwest::Client::builder()
            .user_agent(concat!("varianta/", env!("CARGO_PKG_VERSION")))
            .build()?;
        Ok(Self { http })
    }

    /// List a player's monthly archive URLs (oldest → newest).
    pub async fn list_archives(&self, username: &str) -> Result<Vec<String>, IngestError> {
        let url = format!(
            "https://api.chess.com/pub/player/{}/games/archives",
            username.to_lowercase()
        );
        let list: ArchivesList = self
            .http
            .get(url)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(list.archives)
    }

    /// Fetch and normalize every game in a player's history.
    ///
    /// One request per monthly archive — for very active players this can be many
    /// months; callers may want to bound it (a `since` filter lands with
    /// continuous sync).
    pub async fn fetch_all_games(&self, username: &str) -> Result<Vec<Game>, IngestError> {
        let archives = self.list_archives(username).await?;
        let mut all = Vec::new();
        for archive_url in archives {
            let body = self
                .http
                .get(&archive_url)
                .send()
                .await?
                .error_for_status()?
                .text()
                .await?;
            all.extend(parse_chesscom_archive(&body, username)?);
        }
        Ok(all)
    }
}

#[derive(Debug, Deserialize)]
struct ArchivesList {
    archives: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use gambit_core::PlayerOutcome;

    const ARCHIVE: &str = r#"{
      "games": [
        {
          "url": "https://www.chess.com/game/live/1",
          "pgn": "[Event \"Live Chess\"]\n\n1. e4 e5 *",
          "end_time": 1700000000,
          "white": { "username": "Alice", "result": "win" },
          "black": { "username": "Bob", "result": "checkmated" }
        },
        {
          "url": "https://www.chess.com/game/live/2",
          "pgn": "[Event \"Live Chess\"]\n\n1. d4 d5 *",
          "end_time": 1700000100,
          "white": { "username": "Carol", "result": "agreed" },
          "black": { "username": "alice", "result": "agreed" }
        },
        {
          "url": "https://www.chess.com/game/live/3",
          "end_time": 1700000200,
          "white": { "username": "Alice", "result": "checkmated" },
          "black": { "username": "Dave", "result": "win" }
        }
      ]
    }"#;

    #[test]
    fn parses_and_normalizes_for_player() {
        let games = parse_chesscom_archive(ARCHIVE, "alice").unwrap();

        // Game 3 has no PGN and is skipped.
        assert_eq!(games.len(), 2);

        // Game 1: alice is White and won.
        assert_eq!(games[0].player_color, Color::White);
        assert_eq!(games[0].result, GameResult::WhiteWin);
        assert_eq!(games[0].player_outcome(), PlayerOutcome::Win);
        assert_eq!(games[0].opponent(), "Bob");

        // Game 2: alice is Black (case-insensitive match) and it was drawn.
        assert_eq!(games[1].player_color, Color::Black);
        assert_eq!(games[1].result, GameResult::Draw);
        assert_eq!(games[1].player_outcome(), PlayerOutcome::Draw);
        assert_eq!(games[1].opponent(), "Carol");
    }
}
