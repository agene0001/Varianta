//! PGN parsing for Gambit: step a game's mainline into per-ply positions.
//!
//! Wraps `pgn-reader` + `shakmaty` so nothing else imports them directly. Only
//! the mainline is followed (Chess.com/Lichess game exports have no variations);
//! each step carries the FEN of the position *before* the move, which is what the
//! engine evaluates.

use std::ops::ControlFlow;

use gambit_core::Color;
use pgn_reader::{Reader, SanPlus, Visitor};
use shakmaty::fen::Fen;
use shakmaty::{CastlingMode, Chess, EnPassantMode, Position};

#[derive(Debug, thiserror::Error)]
pub enum PgnError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("no game found in PGN")]
    Empty,
}

/// One half-move of a game's mainline.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PgnStep {
    /// 1-based half-move index.
    pub ply: u32,
    /// FEN of the position *before* this move (the one the mover faced).
    pub fen_before: String,
    pub san: String,
    pub uci: String,
    /// The side that made this move.
    pub side_to_move: Color,
}

/// A parsed game: its mainline steps plus the final position (after the last
/// move), which analysis needs to evaluate the last move.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedGame {
    pub steps: Vec<PgnStep>,
    pub final_fen: String,
}

#[derive(Default)]
struct Collector {
    steps: Vec<PgnStep>,
    ply: u32,
}

fn to_core_color(c: shakmaty::Color) -> Color {
    match c {
        shakmaty::Color::White => Color::White,
        shakmaty::Color::Black => Color::Black,
    }
}

impl Visitor for Collector {
    type Tags = ();
    type Movetext = Chess;
    type Output = ParsedGame;

    fn begin_tags(&mut self) -> ControlFlow<Self::Output, Self::Tags> {
        ControlFlow::Continue(())
    }

    fn begin_movetext(&mut self, _tags: Self::Tags) -> ControlFlow<Self::Output, Self::Movetext> {
        ControlFlow::Continue(Chess::default())
    }

    fn san(
        &mut self,
        movetext: &mut Self::Movetext,
        san_plus: SanPlus,
    ) -> ControlFlow<Self::Output> {
        if let Ok(m) = san_plus.san.to_move(movetext) {
            self.ply += 1;
            self.steps.push(PgnStep {
                ply: self.ply,
                fen_before: Fen::from_position(&*movetext, EnPassantMode::Legal).to_string(),
                san: san_plus.san.to_string(),
                uci: m.to_uci(CastlingMode::Standard).to_string(),
                side_to_move: to_core_color(movetext.turn()),
            });
            movetext.play_unchecked(m);
        }
        ControlFlow::Continue(())
    }

    fn end_game(&mut self, movetext: Self::Movetext) -> Self::Output {
        ParsedGame {
            steps: std::mem::take(&mut self.steps),
            final_fen: Fen::from_position(&movetext, EnPassantMode::Legal).to_string(),
        }
    }
}

/// Parse the first game in `pgn` into its mainline steps + final position.
pub fn parse_game(pgn: &str) -> Result<ParsedGame, PgnError> {
    let mut reader = Reader::new(std::io::Cursor::new(pgn.as_bytes()));
    match reader.read_game(&mut Collector::default())? {
        Some(game) => Ok(game),
        None => Err(PgnError::Empty),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_mainline() {
        let pgn = "[Event \"Test\"]\n\n1. e4 e5 2. Nf3 Nc6 *";
        let steps = parse_game(pgn).unwrap().steps;
        assert_eq!(steps.len(), 4);
        assert_eq!(steps[0].san, "e4");
        assert_eq!(steps[0].uci, "e2e4");
        assert_eq!(steps[0].side_to_move, Color::White);
        assert_eq!(steps[1].side_to_move, Color::Black);
        assert!(steps[0].fen_before.starts_with("rnbqkbnr/pppppppp"));
        // ply 3 (Nf3) is White's 2nd move
        assert_eq!(steps[2].san, "Nf3");
        assert_eq!(steps[2].side_to_move, Color::White);
    }
}
