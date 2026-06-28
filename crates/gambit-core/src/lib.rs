//! Shared domain types for Gambit (game import + analysis).
//!
//! These are deliberately source-agnostic: ingestion adapters (Chess.com,
//! Lichess, manual PGN) all normalize into [`Game`] before anything downstream
//! touches them.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Side to move / the color a player had in a game.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Color {
    White,
    Black,
}

/// Outcome of a game, from White's perspective.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GameResult {
    WhiteWin,
    BlackWin,
    Draw,
    Unknown,
}

/// Where an imported game came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GameSource {
    ChessCom,
    Lichess,
    ManualPgn,
}

/// Stable identifier for a game — typically the platform's game URL.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GameId(pub String);

/// A normalized game, independent of its import source. The full move list lives
/// in `pgn`; the denormalized fields support listing/filtering without reparsing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: GameId,
    pub source: GameSource,
    pub pgn: String,
    pub white: String,
    pub black: String,
    /// Which color the importing player had in this game.
    pub player_color: Color,
    pub result: GameResult,
    pub played_at: DateTime<Utc>,
}

impl Game {
    /// The opponent's name, from the importing player's perspective.
    pub fn opponent(&self) -> &str {
        match self.player_color {
            Color::White => &self.black,
            Color::Black => &self.white,
        }
    }

    /// The game's result from the importing player's perspective.
    pub fn player_outcome(&self) -> PlayerOutcome {
        match (self.result, self.player_color) {
            (GameResult::Draw, _) => PlayerOutcome::Draw,
            (GameResult::Unknown, _) => PlayerOutcome::Unknown,
            (GameResult::WhiteWin, Color::White) | (GameResult::BlackWin, Color::Black) => {
                PlayerOutcome::Win
            }
            _ => PlayerOutcome::Loss,
        }
    }
}

/// A game's result from the importing player's point of view.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlayerOutcome {
    Win,
    Loss,
    Draw,
    Unknown,
}

/// A board position (FEN) at a point in a game. Used by the analysis pipeline.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Position {
    pub fen: String,
    pub move_number: u32,
    pub side_to_move: Color,
}
