//! Heuristic mistake classification (Gambit Pillar 3, V1).
//!
//! Given a position and the engine's best vs. played move, tag the mistake with
//! zero or more tactical [`Concept`]s. This is deterministic rule-based detection
//! (no AI) — a first pass that explains *why* a move was a mistake. More concepts
//! (pin, skewer, discovered attack, back-rank, positional) can be layered on.

use serde::{Deserialize, Serialize};
use shakmaty::fen::Fen;
use shakmaty::uci::UciMove;
use shakmaty::{attacks, Bitboard, CastlingMode, Chess, Color, File, Position, Rank, Role, Square};

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
    /// The move played exposed its own king (lost pawn shield / king pressure).
    WeakenedKing,
    /// The move played created a weak pawn (doubled or isolated).
    CreatedWeakPawn,
    /// The move played left a piece passive (much lower mobility than the best move).
    PassivePiece,
    /// The move played surrendered control of squares in the opponent's half.
    LostSpace,
    /// The move played gave up a rook's open/semi-open file.
    GaveUpFile,
    /// The move played conceded a passed pawn (created the opponent one, or lost yours).
    AllowedPasser,
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
    let best = play(&pos, best_uci);
    let played = play(&pos, played_uci);

    // Concepts describing the tactic the player *missed* — derived from the
    // position after the engine's best move.
    if let Some((after_best, from, to)) = &best {
        if is_back_rank_mate(after_best) {
            out.push(Concept::BackRankMate);
        }
        if is_fork(after_best, *to) {
            out.push(Concept::Fork);
        }
        match xray(after_best, *to) {
            Some(XRay::Pin) => out.push(Concept::Pin),
            Some(XRay::Skewer) => out.push(Concept::Skewer),
            None => {}
        }
        if let Some(from) = from {
            if is_discovered_attack(after_best, *from) {
                out.push(Concept::DiscoveredAttack);
            }
        }
    }

    // Concepts describing what the move *played* did wrong (hangs material).
    if let Some((after_played, _, _)) = &played {
        if hangs_piece(after_played) {
            out.push(Concept::HangingPiece);
        }
    }

    // No concrete tactic named → attribute the eval drop to the positional
    // feature the played move worsened most vs. the best move.
    if out.is_empty() {
        if let (Some((after_best, ..)), Some((after_played, ..))) = (&best, &played) {
            if let Some(concept) = positional_concept(after_best, after_played) {
                out.push(concept);
            }
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

/// Cheap positional metrics for the side that just moved (`them()` after the
/// move). Higher `king_danger`/`weak_pawns` is worse; higher `mobility`/`space`/
/// `rook_files`/`passed` is better.
struct Features {
    king_danger: i32,
    weak_pawns: i32,
    mobility: i32,
    space: i32,
    rook_files: i32,
    enemy_passers: i32,
}

/// All squares strictly ahead of `rank` in `color`'s promotion direction.
fn ranks_ahead(color: Color, rank: Rank) -> Bitboard {
    Rank::ALL
        .iter()
        .filter(|&&r| match color {
            Color::White => r > rank,
            Color::Black => r < rank,
        })
        .fold(Bitboard::EMPTY, |acc, &r| acc | Bitboard::from_rank(r))
}

/// The opponent's half of the board from `color`'s point of view.
fn enemy_half(color: Color) -> Bitboard {
    Rank::ALL
        .iter()
        .filter(|&&r| match color {
            Color::White => r >= Rank::Fifth,
            Color::Black => r <= Rank::Fourth,
        })
        .fold(Bitboard::EMPTY, |acc, &r| acc | Bitboard::from_rank(r))
}

/// A mask of `file` together with its neighbouring files.
fn file_and_adjacent(file: File) -> Bitboard {
    let i = File::ALL.iter().position(|&f| f == file).unwrap();
    let mut bb = Bitboard::from_file(file);
    if let Some(j) = i.checked_sub(1) {
        bb |= Bitboard::from_file(File::ALL[j]);
    }
    if let Some(&f) = File::ALL.get(i + 1) {
        bb |= Bitboard::from_file(f);
    }
    bb
}

/// Count pawns of `color` with no enemy pawn on their file or the adjacent files
/// ahead of them — i.e. passed pawns.
fn passed_pawns(pawns: Bitboard, enemy_pawns: Bitboard, color: Color) -> i32 {
    pawns
        .into_iter()
        .filter(|&sq| {
            let span = file_and_adjacent(sq.file()) & ranks_ahead(color, sq.rank());
            (enemy_pawns & span).is_empty()
        })
        .count() as i32
}

fn features(after: &Chess) -> Features {
    let board = after.board();
    let occ = board.occupied();
    let mover = after.them();
    let enemy_color = after.turn();
    let mover_color = enemy_color.other();
    let pawns: Bitboard = mover
        .into_iter()
        .filter(|&sq| board.role_at(sq) == Some(Role::Pawn))
        .collect();
    let enemy_pawns: Bitboard = after
        .us()
        .into_iter()
        .filter(|&sq| board.role_at(sq) == Some(Role::Pawn))
        .collect();

    // King safety: missing pawn shield (weighted) + enemy pressure on the king ring.
    let king_danger = match mover
        .into_iter()
        .find(|&sq| board.role_at(sq) == Some(Role::King))
    {
        Some(king) => {
            let ring = attacks::king_attacks(king);
            let shield = (ring & pawns).count() as i32;
            let missing = (3 - shield.min(3)).max(0);
            let pressure = ring
                .into_iter()
                .filter(|&sq| !board.attacks_to(sq, enemy_color, occ).is_empty())
                .count() as i32;
            missing * 2 + pressure
        }
        None => 0,
    };

    // Pawn weaknesses: doubled + isolated.
    let mut weak_pawns = 0;
    for (i, &file) in File::ALL.iter().enumerate() {
        let count = (pawns & Bitboard::from_file(file)).count() as i32;
        if count == 0 {
            continue;
        }
        if count >= 2 {
            weak_pawns += count - 1; // doubled
        }
        let left = i
            .checked_sub(1)
            .map(|j| (pawns & Bitboard::from_file(File::ALL[j])).count())
            .unwrap_or(0);
        let right = File::ALL
            .get(i + 1)
            .map(|&f| (pawns & Bitboard::from_file(f)).count())
            .unwrap_or(0);
        if left == 0 && right == 0 {
            weak_pawns += count; // isolated (no friendly pawn on adjacent files)
        }
    }

    // Piece activity: pseudo-mobility (attacked non-own squares) of minors/majors.
    // Also count rooks sitting on open/semi-open (no friendly pawn) files.
    let mut mobility = 0;
    let mut rook_files = 0;
    for sq in mover {
        if let Some(piece) = board.piece_at(sq) {
            if matches!(
                piece.role,
                Role::Knight | Role::Bishop | Role::Rook | Role::Queen
            ) {
                mobility += (attacks::attacks(sq, piece, occ) & !mover).count() as i32;
            }
            if piece.role == Role::Rook && (pawns & Bitboard::from_file(sq.file())).is_empty() {
                rook_files += 1;
            }
        }
    }

    // Space: enemy-half squares controlled by the mover's pawns (kept pawn-only so
    // it measures something distinct from piece mobility above).
    let pawn_coverage = pawns
        .into_iter()
        .fold(Bitboard::EMPTY, |acc, sq| {
            acc | attacks::pawn_attacks(mover_color, sq)
        });
    let space = (pawn_coverage & enemy_half(mover_color)).count() as i32;

    // Opponent's passed pawns (higher = worse for the mover).
    let enemy_passers = passed_pawns(enemy_pawns, pawns, enemy_color);

    Features {
        king_danger,
        weak_pawns,
        mobility,
        space,
        rook_files,
        enemy_passers,
    }
}

/// Attribute a tactic-less mistake to the positional feature the played move
/// worsened most, relative to the engine's best move. `None` if nothing crosses
/// its threshold (the move had no clear positional cost we can name).
fn positional_concept(after_best: &Chess, after_played: &Chess) -> Option<Concept> {
    let best = features(after_best);
    let played = features(after_played);
    // (concept, how-much-worse the played move is on this axis, threshold)
    let axes = [
        (Concept::WeakenedKing, played.king_danger - best.king_danger, 2),
        (Concept::CreatedWeakPawn, played.weak_pawns - best.weak_pawns, 1),
        (Concept::GaveUpFile, best.rook_files - played.rook_files, 1),
        (Concept::AllowedPasser, played.enemy_passers - best.enemy_passers, 1),
        (Concept::LostSpace, best.space - played.space, 2),
        (Concept::PassivePiece, best.mobility - played.mobility, 4),
    ];
    axes.into_iter()
        .filter(|&(_, delta, threshold)| delta >= threshold)
        .max_by(|a, b| {
            (a.1 as f32 / a.2 as f32)
                .partial_cmp(&(b.1 as f32 / b.2 as f32))
                .unwrap()
        })
        .map(|(concept, _, _)| concept)
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
    fn detects_weakened_king() {
        // Best a2a3 keeps the shield; g2g4 opens a hole in front of the Kg1.
        let c = classify(
            "6k1/8/8/8/8/8/1PP2PPP/6K1 w - - 0 1",
            "b2b3",
            "g2g4",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::WeakenedKing), "{c:?}");
    }

    #[test]
    fn detects_created_weak_pawn() {
        // Recapturing on c3 with the b-pawn (bxc3) doubles and isolates the
        // c-pawns; Nxc3 keeps a healthy structure.
        let c = classify(
            "6k1/8/8/8/8/2p5/1PP1N3/6K1 w - - 0 1",
            "e2c3",
            "b2c3",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::CreatedWeakPawn), "{c:?}");
    }

    #[test]
    fn detects_passive_piece() {
        // Nb1-c3 (central, 8 moves) is far more active than Nb1-a3 (rim, 4 moves).
        let c = classify(
            "6k1/8/8/8/8/8/8/1N4K1 w - - 0 1",
            "b1c3",
            "b1a3",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::PassivePiece), "{c:?}");
    }

    #[test]
    fn detects_gave_up_file() {
        // Rd1 sits on the open d-file; Rd1-c1 abandons it for the c-pawn's file.
        // (Best a2a3 keeps the rook on the open file.)
        let c = classify(
            "6k1/8/8/8/3p4/8/PPP5/3R2K1 w - - 0 1",
            "a2a3",
            "d1c1",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::GaveUpFile), "{c:?}");
    }

    #[test]
    fn detects_lost_space() {
        // e2e4 grabs central space (controls d5/f5); a2a3 grabs none.
        let c = classify(
            "6k1/8/8/8/8/8/P3P3/6K1 w - - 0 1",
            "e2e4",
            "a2a3",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::LostSpace), "{c:?}");
    }

    #[test]
    fn detects_allowed_passer() {
        // d2d4 rushes past the c4 pawn, making it passed; d2d3 keeps it blockaded.
        let c = classify(
            "6k1/8/8/8/2p5/8/3P4/6K1 w - - 0 1",
            "d2d3",
            "d2d4",
            Score::Cp(0),
            Score::Cp(0),
        );
        assert!(c.contains(&Concept::AllowedPasser), "{c:?}");
    }

    #[test]
    fn quiet_move_has_no_concepts() {
        // Two near-identical quiet a-pawn moves — no feature crosses threshold.
        let c = classify(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "a2a3",
            "a2a4",
            Score::Cp(20),
            Score::Cp(15),
        );
        assert!(c.is_empty(), "{c:?}");
    }
}
