//! Heuristic mistake classification (Gambit Pillar 3, V1).
//!
//! Given a position and the engine's best vs. played move, tag the mistake with
//! zero or more tactical [`Concept`]s. This is deterministic rule-based detection
//! (no AI) — a first pass that explains *why* a move was a mistake. More concepts
//! (pin, skewer, discovered attack, back-rank, positional) can be layered on.

use serde::{Deserialize, Serialize};
use shakmaty::fen::Fen;
use shakmaty::uci::UciMove;
use shakmaty::{attacks, Bitboard, CastlingMode, Chess, Color, Position, Rank, Role, Square};

use crate::Score;

/// A tactical theme attached to a mistake.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Concept {
    /// Had a forced mate available and let it slip.
    MissedMate,
    /// The best (missed) move delivers checkmate on the opponent's back rank.
    BackRankMate,
    /// The best (missed) move forks two or more valuable pieces.
    Fork,
    /// The best (missed) move pins an enemy piece to a more valuable one behind it.
    Pin,
    /// The best (missed) move skewers an enemy piece to a less valuable one behind it.
    Skewer,
    /// The best (missed) move unveils an attack from a piece that was behind it.
    DiscoveredAttack,
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

    // Concepts describing the tactic the player *missed* — derived from the
    // position after the engine's best move.
    if let Some((after_best, from, to)) = play(&pos, best_uci) {
        if is_back_rank_mate(&after_best) {
            out.push(Concept::BackRankMate);
        }
        if is_fork(&after_best, to) {
            out.push(Concept::Fork);
        }
        match xray(&after_best, to) {
            Some(XRay::Pin) => out.push(Concept::Pin),
            Some(XRay::Skewer) => out.push(Concept::Skewer),
            None => {}
        }
        if let Some(from) = from {
            if is_discovered_attack(&after_best, from) {
                out.push(Concept::DiscoveredAttack);
            }
        }
    }

    // Concepts describing what the move *played* did wrong (hangs material).
    if let Some((after_played, _, _)) = play(&pos, played_uci) {
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
fn play(pos: &Chess, uci: &str) -> Option<(Chess, Option<Square>, Square)> {
    let mv = uci.parse::<UciMove>().ok()?.to_move(pos).ok()?;
    let from = mv.from();
    let to = mv.to();
    let next = pos.clone().play(mv).ok()?;
    Some((next, from, to))
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

fn piece_value(role: Role) -> u32 {
    match role {
        Role::Pawn => 1,
        Role::Knight | Role::Bishop => 3,
        Role::Rook => 5,
        Role::Queen => 9,
        Role::King => 100,
    }
}

enum XRay {
    Pin,
    Skewer,
}

/// If the slider on `slider_sq` lines up two enemy pieces on one ray (the near
/// one shielding the far one), report a pin (less valuable in front → moving it
/// loses the piece behind) or a skewer (more valuable in front → forced to move,
/// exposing the piece behind).
fn xray(after: &Chess, slider_sq: Square) -> Option<XRay> {
    let board = after.board();
    let piece = board.piece_at(slider_sq)?;
    if !matches!(piece.role, Role::Bishop | Role::Rook | Role::Queen) {
        return None;
    }
    let occ = board.occupied();
    let enemy = after.us();
    // Enemy pieces the slider hits first along each ray.
    let first_blockers = attacks::attacks(slider_sq, piece, occ) & enemy;
    for near in first_blockers {
        let near_value = piece_value(board.role_at(near)?);
        for far in enemy {
            if far == near {
                continue;
            }
            // `near` directly shields `far` from the slider: they're collinear and
            // `near` is the only piece between the slider and `far`.
            let line = attacks::between(slider_sq, far);
            if line.contains(near) && (line & occ) == Bitboard::from_square(near) {
                let far_value = piece_value(board.role_at(far)?);
                if near_value < far_value {
                    return Some(XRay::Pin);
                }
                if near_value > far_value {
                    return Some(XRay::Skewer);
                }
            }
        }
    }
    None
}

/// True if vacating `from` unveils a friendly slider's attack on an enemy queen,
/// rook, or king — a discovered attack (or discovered check).
fn is_discovered_attack(after: &Chess, from: Square) -> bool {
    let board = after.board();
    let occ = board.occupied();
    let mover = after.turn().other();
    for target in after.us() {
        if !matches!(
            board.role_at(target),
            Some(Role::Queen | Role::Rook | Role::King)
        ) {
            continue;
        }
        for slider in board.attacks_to(target, mover, occ) {
            if matches!(
                board.role_at(slider),
                Some(Role::Bishop | Role::Rook | Role::Queen)
            ) && attacks::between(slider, target).contains(from)
            {
                return true;
            }
        }
    }
    false
}

/// True if the position is checkmate with the mated king on its own back rank.
fn is_back_rank_mate(after: &Chess) -> bool {
    if !after.is_checkmate() {
        return false;
    }
    let board = after.board();
    let mated = after.turn();
    let Some(king) = after
        .us()
        .into_iter()
        .find(|&sq| board.role_at(sq) == Some(Role::King))
    else {
        return false;
    };
    let back_rank = match mated {
        Color::White => Rank::First,
        Color::Black => Rank::Eighth,
    };
    king.rank() == back_rank
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
    fn detects_pin() {
        // Bf1-b5 pins the c6 knight to the e8 king (knight in front, king behind).
        let c = classify(
            "4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1",
            "f1b5",
            "e1e2",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::Pin), "{c:?}");
    }

    #[test]
    fn detects_skewer() {
        // Rb1-a1 skewers the a5 king to the a8 queen (king in front, queen behind).
        let c = classify(
            "q7/8/8/k7/8/8/8/1R2K3 w - - 0 1",
            "b1a1",
            "e1e2",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::Skewer), "{c:?}");
    }

    #[test]
    fn detects_discovered_attack() {
        // Na4-c5 unveils the a1 rook's attack on the a8 queen.
        let c = classify(
            "q3k3/8/8/8/N7/8/8/R3K3 w - - 0 1",
            "a4c5",
            "e1e2",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::DiscoveredAttack), "{c:?}");
    }

    #[test]
    fn detects_back_rank_mate() {
        // Re1-e8# with the black king boxed in by its own f7/g7/h7 pawns.
        let c = classify(
            "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
            "e1e8",
            "g1f1",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::BackRankMate), "{c:?}");
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
