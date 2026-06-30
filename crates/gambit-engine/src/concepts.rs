//! Heuristic mistake classification (Gambit Pillar 3, V1).
//!
//! Given a position and the engine's best vs. played move, tag the mistake with
//! zero or more tactical [`Concept`]s. This is deterministic rule-based detection
//! (no AI) — a first pass that explains *why* a move was a mistake. More concepts
//! (pin, skewer, discovered attack, back-rank, positional) can be layered on.

use serde::{Deserialize, Serialize};
use shakmaty::fen::Fen;
use shakmaty::uci::UciMove;
use shakmaty::{attacks, CastlingMode, Chess, Position, Role, Square};

use crate::Score;

/// A tactical theme attached to a mistake.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Concept {
    /// Had a forced mate available and let it slip.
    MissedMate,
    /// The best (missed) move forks two or more valuable pieces.
    Fork,
    /// The move played left a piece en prise (attacked and undefended).
    HangingPiece,
}

/// Classify a single move's mistake into zero or more [`Concept`]s.
///
/// `eval_before`/`eval_after` are from the mover's perspective (as stored on
/// `MoveAnalysis`). `best_uci`/`played_uci` are UCI moves legal in `fen`.
pub fn classify(
    fen: &str,
    best_uci: &str,
    played_uci: &str,
    eval_before: Score,
    eval_after: Score,
) -> Vec<Concept> {
    let mut out = Vec::new();

    // Missed mate: a forced mate was on the board and the move played gave it up.
    if matches!(eval_before, Score::Mate(n) if n > 0)
        && !matches!(eval_after, Score::Mate(n) if n > 0)
    {
        out.push(Concept::MissedMate);
    }

    let Some(pos) = parse_position(fen) else {
        return out;
    };

    // Fork: the best move the player missed lands a piece attacking 2+ targets.
    if let Some((after_best, to)) = play(&pos, best_uci) {
        if is_fork(&after_best, to) {
            out.push(Concept::Fork);
        }
    }

    // Hanging piece: the move actually played leaves a piece free to be taken.
    if let Some((after_played, _)) = play(&pos, played_uci) {
        if hangs_piece(&after_played) {
            out.push(Concept::HangingPiece);
        }
    }

    out
}

fn parse_position(fen: &str) -> Option<Chess> {
    Fen::from_ascii(fen.as_bytes())
        .ok()?
        .into_position(CastlingMode::Standard)
        .ok()
}

/// Play a UCI move on a clone of `pos`, returning the resulting position and the
/// destination square. `None` if the move can't be parsed or is illegal here.
fn play(pos: &Chess, uci: &str) -> Option<(Chess, Square)> {
    let mv = uci.parse::<UciMove>().ok()?.to_move(pos).ok()?;
    let to = mv.to();
    let next = pos.clone().play(mv).ok()?;
    Some((next, to))
}

fn valuable(role: Role) -> bool {
    matches!(
        role,
        Role::Knight | Role::Bishop | Role::Rook | Role::Queen | Role::King
    )
}

/// True if the piece on `to` (which just moved) attacks two or more valuable
/// enemy pieces — a double attack / fork.
fn is_fork(after: &Chess, to: Square) -> bool {
    let board = after.board();
    let Some(piece) = board.piece_at(to) else {
        return false;
    };
    // After the move it's the opponent's turn, so `us()` is the enemy of the
    // piece that just moved — i.e. its potential targets.
    let targets = attacks::attacks(to, piece, board.occupied()) & after.us();
    targets
        .into_iter()
        .filter(|&sq| board.role_at(sq).is_some_and(valuable))
        .count()
        >= 2
}

/// True if a minor-or-better piece of the side that just moved is attacked by the
/// opponent and has no defender — i.e. hanging.
fn hangs_piece(after: &Chess) -> bool {
    let board = after.board();
    let occ = board.occupied();
    let opponent = after.turn();
    let mover = opponent.other();
    // `them()` is the side that just moved (not the side to move).
    after.them().into_iter().any(|sq| {
        matches!(
            board.role_at(sq),
            Some(Role::Knight | Role::Bishop | Role::Rook | Role::Queen)
        ) && !board.attacks_to(sq, opponent, occ).is_empty()
            && board.attacks_to(sq, mover, occ).is_empty()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missed_mate_from_scores() {
        let c = classify(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "e2e4",
            "a2a3",
            Score::Mate(2),
            Score::Cp(40),
        );
        assert!(c.contains(&Concept::MissedMate));
    }

    #[test]
    fn detects_knight_fork() {
        // White Nd5; the best move Nc7 forks the a8 rook and the e8 king.
        let c = classify(
            "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1",
            "d5c7",
            "e1e2",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::Fork));
    }

    #[test]
    fn detects_hanging_piece() {
        // Bishop a2 walks to c4, attacked by the d5 pawn and undefended.
        let c = classify(
            "4k3/8/8/3p4/8/8/B7/4K3 w - - 0 1",
            "e1e2",
            "a2c4",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::HangingPiece));
    }

    #[test]
    fn quiet_move_has_no_concepts() {
        let c = classify(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "e2e4",
            "d2d4",
            Score::Cp(20),
            Score::Cp(15),
        );
        assert!(c.is_empty());
    }
}
