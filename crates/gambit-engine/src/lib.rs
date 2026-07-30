//! Engine layer for Gambit: a Stockfish UCI client and the analysis types it
//! produces.
//!
//! This module currently holds the protocol-parsing core (pure, unit-tested).
//! The process/sidecar layer that spawns Stockfish and drives a `go depth N`
//! analysis is layered on top once a binary source is chosen.

use gambit_core::Color;
use gambit_pgn::parse_game;
use serde::{Deserialize, Serialize};

mod concepts;
pub use concepts::Concept;

/// An engine evaluation of a position, from the side-to-move's perspective.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "value", rename_all = "lowercase")]
pub enum Score {
    /// Centipawn advantage (positive = side to move is better).
    Cp(i32),
    /// Forced mate in N plies (positive = side to move mates; negative = gets mated).
    Mate(i32),
}

/// One line of analysis from the engine (a `info ...` UCI line).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EngineEval {
    pub depth: u32,
    pub score: Score,
    /// Principal variation in UCI moves; `pv[0]` is the best move.
    pub pv: Vec<String>,
    /// Which ranked line this is when the engine runs with `MultiPV > 1`: 1 is
    /// the best move, 2 the second best, and so on. Defaults to 1, which is what
    /// a single-line search reports (explicitly or by omission).
    #[serde(default = "one")]
    pub multipv: u32,
}

fn one() -> u32 {
    1
}

impl EngineEval {
    /// The engine's best move (first move of the principal variation).
    pub fn best_move(&self) -> Option<&str> {
        self.pv.first().map(String::as_str)
    }
}

/// Parse a UCI `info` line into an [`EngineEval`]. Returns `None` for `info`
/// lines without a score/depth (e.g. `info string ...`) or non-`info` lines.
///
/// Example: `info depth 20 multipv 1 score cp 31 nodes 1000 pv e2e4 e7e5 g1f3`
pub fn parse_info(line: &str) -> Option<EngineEval> {
    let toks: Vec<&str> = line.split_whitespace().collect();
    if toks.first() != Some(&"info") {
        return None;
    }

    let mut depth: Option<u32> = None;
    let mut score: Option<Score> = None;
    let mut pv: Vec<String> = Vec::new();
    let mut multipv: u32 = 1;

    let mut i = 1;
    while i < toks.len() {
        match toks[i] {
            "depth" => {
                depth = toks.get(i + 1).and_then(|s| s.parse().ok());
                i += 2;
            }
            "multipv" => {
                multipv = toks.get(i + 1).and_then(|s| s.parse().ok()).unwrap_or(1);
                i += 2;
            }
            "score" => match toks.get(i + 1) {
                Some(&"cp") => {
                    score = toks.get(i + 2).and_then(|s| s.parse().ok()).map(Score::Cp);
                    i += 3;
                }
                Some(&"mate") => {
                    score = toks.get(i + 2).and_then(|s| s.parse().ok()).map(Score::Mate);
                    i += 3;
                }
                _ => i += 1,
            },
            // `pv` is always last on the line — the rest are moves.
            "pv" => {
                pv = toks[i + 1..].iter().map(|s| s.to_string()).collect();
                break;
            }
            _ => i += 1,
        }
    }

    Some(EngineEval {
        depth: depth?,
        score: score?,
        pv,
        multipv,
    })
}

/// Parse a UCI `bestmove` line, returning the best move in UCI notation.
///
/// Example: `bestmove e2e4 ponder e7e5` → `Some("e2e4")`.
pub fn parse_bestmove(line: &str) -> Option<String> {
    let mut toks = line.split_whitespace();
    if toks.next() == Some("bestmove") {
        toks.next().map(str::to_string)
    } else {
        None
    }
}

// ============================== UCI engine process ==============================

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

#[derive(Debug, thiserror::Error)]
pub enum EngineError {
    #[error("engine io: {0}")]
    Io(#[from] std::io::Error),
    #[error("engine stdin/stdout pipe unavailable")]
    Pipe,
    #[error("engine closed unexpectedly")]
    Eof,
    #[error("engine returned no evaluation")]
    NoEval,
    #[error("pgn: {0}")]
    Pgn(#[from] gambit_pgn::PgnError),
}

/// Best-effort auto-detection of a Stockfish binary — the default when no engine
/// path is configured.
///
/// `STOCKFISH_PATH` wins outright. Otherwise every candidate is collected —
/// `stockfish` on `PATH` first, then En Croissant's engine directory — and the
/// one whose filename best matches the host CPU wins; ties go to the earlier
/// source. Order alone isn't enough: on Apple Silicon the old "En Croissant
/// first, first `read_dir` hit wins" logic happily returned
/// `stockfish-macos-x86-64-sse41-popcnt` and ran it under Rosetta at roughly
/// half the nodes/second of a native arm64 build, even with a native Stockfish
/// sitting on `PATH`.
pub fn detect_engine_path() -> Option<std::path::PathBuf> {
    use std::path::PathBuf;

    if let Ok(p) = std::env::var("STOCKFISH_PATH") {
        let pb = PathBuf::from(p);
        if pb.is_file() {
            return Some(pb);
        }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();

    // `stockfish` on `PATH` — usually a package-manager build for the host arch,
    // so it's checked first and wins any tie on architecture score.
    if let Ok(path) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path) {
            let cand = dir.join("stockfish");
            if cand.is_file() {
                candidates.push(cand);
            }
        }
    }

    // En Croissant stores engines under its app-data dir (macOS).
    if let Ok(home) = std::env::var("HOME") {
        let dir = PathBuf::from(home)
            .join("Library/Application Support/org.encroissant.app/engines/stockfish");
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let name = entry.file_name();
                let name = name.to_string_lossy();
                if name.starts_with("stockfish") && !name.contains('.') && entry.path().is_file() {
                    candidates.push(entry.path());
                }
            }
        }
    }

    // Strictly-greater comparison keeps the earliest candidate on a tie, so
    // `read_dir`'s arbitrary ordering can't decide which engine we launch.
    let mut best: Option<(u8, PathBuf)> = None;
    for cand in candidates {
        let score = arch_score(&cand);
        if best.as_ref().map_or(true, |(s, _)| score > *s) {
            best = Some((score, cand));
        }
    }
    best.map(|(_, path)| path)
}

/// Rank a candidate engine by how well its filename matches the host CPU:
/// 2 = names this architecture, 1 = says nothing, 0 = names a foreign one.
///
/// Stockfish's official builds encode the target in the filename
/// (`stockfish-macos-m1-apple-silicon` vs `stockfish-macos-x86-64-sse41-popcnt`),
/// so the name is a reliable signal without parsing Mach-O/ELF headers. A plain
/// `stockfish` (Homebrew, apt) scores 1, which still beats a foreign-arch build.
fn arch_score(path: &std::path::Path) -> u8 {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();

    const ARM_MARKERS: [&str; 4] = ["apple-silicon", "aarch64", "arm64", "armv8"];
    const X86_MARKERS: [&str; 4] = ["x86-64", "x86_64", "avx2", "sse41"];

    let names_arm = ARM_MARKERS.iter().any(|m| name.contains(m));
    let names_x86 = X86_MARKERS.iter().any(|m| name.contains(m));

    let (native, foreign) = if cfg!(target_arch = "aarch64") {
        (names_arm, names_x86)
    } else {
        (names_x86, names_arm)
    };

    match (native, foreign) {
        (true, _) => 2,
        (false, true) => 0,
        (false, false) => 1,
    }
}

/// A running Stockfish (or any UCI engine) process, driven over stdin/stdout.
///
/// Synchronous and blocking by design — analysis is CPU-bound and long-running,
/// so callers run it on a blocking task (e.g. `tauri::async_runtime::spawn_blocking`).
pub struct UciEngine {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl UciEngine {
    /// Launch the engine binary at `path` and complete the UCI handshake.
    pub fn launch(path: &str) -> Result<Self, EngineError> {
        let mut child = Command::new(path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()?;
        let stdin = child.stdin.take().ok_or(EngineError::Pipe)?;
        let stdout = BufReader::new(child.stdout.take().ok_or(EngineError::Pipe)?);
        let mut engine = Self { child, stdin, stdout };
        engine.send("uci")?;
        engine.wait_for("uciok")?;
        engine.send("isready")?;
        engine.wait_for("readyok")?;
        Ok(engine)
    }

    fn send(&mut self, cmd: &str) -> Result<(), EngineError> {
        writeln!(self.stdin, "{cmd}")?;
        self.stdin.flush()?;
        Ok(())
    }

    /// Read lines until one starts with `token`.
    fn wait_for(&mut self, token: &str) -> Result<(), EngineError> {
        let mut line = String::new();
        loop {
            line.clear();
            if self.stdout.read_line(&mut line)? == 0 {
                return Err(EngineError::Eof);
            }
            if line.split_whitespace().next() == Some(token) {
                return Ok(());
            }
        }
    }

    /// Analyze `fen` to a fixed `depth`, returning the deepest evaluation.
    /// Analyze `fen` returning the top `lines` ranked continuations, best first.
    ///
    /// Two lines are what move classification needs: the gap between the best and
    /// second-best move is what separates "the only move that worked" from "one of
    /// several fine options", which is the difference between a great move and an
    /// ordinary one.
    pub fn analyze_position_multi(
        &mut self,
        fen: &str,
        depth: u32,
        lines: u32,
    ) -> Result<Vec<EngineEval>, EngineError> {
        let lines = lines.max(1);
        self.send(&format!("setoption name MultiPV value {lines}"))?;
        self.send(&format!("position fen {fen}"))?;
        self.send(&format!("go depth {depth}"))?;

        // Keep the deepest line seen per multipv rank; deeper supersedes shallower.
        let mut best: std::collections::BTreeMap<u32, EngineEval> = Default::default();
        let mut line = String::new();
        loop {
            line.clear();
            if self.stdout.read_line(&mut line)? == 0 {
                return Err(EngineError::Eof);
            }
            let l = line.trim_end();
            if let Some(eval) = parse_info(l) {
                best.insert(eval.multipv, eval);
            } else if let Some(bm) = parse_bestmove(l) {
                let mut out: Vec<EngineEval> = best.into_values().collect();
                if out.is_empty() {
                    return Err(EngineError::NoEval);
                }
                if out[0].pv.is_empty() && bm != "(none)" {
                    out[0].pv.push(bm);
                }
                // Restore single-line searching for callers that don't want MultiPV.
                self.send("setoption name MultiPV value 1")?;
                return Ok(out);
            }
        }
    }

    pub fn analyze_position(&mut self, fen: &str, depth: u32) -> Result<EngineEval, EngineError> {
        self.send(&format!("position fen {fen}"))?;
        self.send(&format!("go depth {depth}"))?;

        let mut latest: Option<EngineEval> = None;
        let mut line = String::new();
        loop {
            line.clear();
            if self.stdout.read_line(&mut line)? == 0 {
                return Err(EngineError::Eof);
            }
            let l = line.trim_end();
            if let Some(eval) = parse_info(l) {
                latest = Some(eval); // deeper lines supersede shallower ones
            } else if let Some(best) = parse_bestmove(l) {
                // `bestmove` terminates the search; backfill the PV if needed.
                let mut eval = latest.take().ok_or(EngineError::NoEval)?;
                if eval.pv.is_empty() && best != "(none)" {
                    eval.pv.push(best);
                }
                return Ok(eval);
            }
        }
    }
}

impl Drop for UciEngine {
    fn drop(&mut self) {
        let _ = self.send("quit");
        let _ = self.child.wait();
    }
}

// ============================== Game analysis ==============================

/// Quality of a move relative to the engine's best.
///
/// Graded on **win-chance loss** rather than raw centipawns: 100cp thrown away
/// in a dead-equal position changes the result far more than 100cp given up when
/// already three pawns up, and centipawn thresholds can't tell those apart.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    /// Best move, it was essentially the only one that worked, and it gives up
    /// material to do it.
    Brilliant,
    /// Best move and essentially the only one that held the position together.
    Great,
    /// The engine's first choice.
    Best,
    /// Not the engine's choice, but gives up almost nothing.
    Excellent,
    Good,
    Inaccuracy,
    /// Threw away a winning position — a mistake, but a distinct lesson from
    /// simply making a level position worse.
    Miss,
    Mistake,
    Blunder,
}

/// Probability of winning from `cp`, as a percentage, from the point of view of
/// the side to move. The logistic fit Lichess uses for its accuracy metric.
fn win_chance(cp: i32) -> f64 {
    let cp = cp.clamp(-100_000, 100_000) as f64;
    50.0 + 50.0 * (2.0 / (1.0 + (-0.003_682_08 * cp).exp()) - 1.0)
}

/// Material on the board in centipawn-equivalents, white minus black. Kings are
/// ignored; they're never captured.
fn board_material(pos: &shakmaty::Chess) -> i32 {
    use shakmaty::{Position, Role};
    let value = |r: Role| match r {
        Role::Pawn => 100,
        Role::Knight | Role::Bishop => 300,
        Role::Rook => 500,
        Role::Queen => 900,
        Role::King => 0,
    };
    let mut balance = 0;
    for (_sq, piece) in pos.board().clone().into_iter() {
        let v = value(piece.role);
        balance += if piece.color.is_white() { v } else { -v };
    }
    balance
}

fn position_from_fen(fen: &str) -> Option<shakmaty::Chess> {
    shakmaty::fen::Fen::from_ascii(fen.as_bytes())
        .ok()?
        .into_position(shakmaty::CastlingMode::Standard)
        .ok()
}

fn material_balance(fen: &str) -> Option<i32> {
    Some(board_material(&position_from_fen(fen)?))
}

/// Material the mover is left with after the opponent's best reply to `fen_after`.
///
/// The engine's reply is used rather than the one actually played: a sacrifice
/// that the opponent *declined* is still a sacrifice, and this is also the only
/// way to judge the final move of a game, where no reply was ever played.
fn material_after_reply(fen_after: &str, reply_uci: &str, mover: Color) -> Option<i32> {
    use shakmaty::{uci::UciMove, Position};
    let pos = position_from_fen(fen_after)?;
    let mv = reply_uci.parse::<UciMove>().ok()?.to_move(&pos).ok()?;
    let settled = pos.play(mv).ok()?;
    let balance = board_material(&settled);
    Some(match mover {
        Color::White => balance,
        Color::Black => -balance,
    })
}

/// Material from `mover`'s point of view.
fn material_for(fen: &str, mover: Color) -> Option<i32> {
    let balance = material_balance(fen)?;
    Some(match mover {
        Color::White => balance,
        Color::Black => -balance,
    })
}

/// Inputs the classifier needs beyond the played move's own evaluation.
pub struct MoveContext {
    /// Win-chance the mover gave up by not playing the engine's choice.
    pub win_chance_loss: f64,
    pub played_is_best: bool,
    /// Win-chance gap between the engine's best and second-best move. A large
    /// gap means there was only one move worth playing. `None` when a second
    /// line wasn't available (e.g. only one legal move).
    pub best_to_second: Option<f64>,
    /// Mover's material, in centipawns, once the dust settles a couple of plies
    /// on. Negative delta versus before the move means material was given up.
    pub material_delta: Option<i32>,
    /// Position is still comfortable for the mover after the move.
    pub still_sound: bool,
    /// Mover's win chance with best play available, before the move.
    pub win_chance_before: f64,
    /// Mover's win chance after the move actually played.
    pub win_chance_after: f64,
}

/// A move counts as "only move" territory when every alternative is materially
/// worse. 10 win-chance points is the same cut En Croissant uses.
const ONLY_MOVE_GAP: f64 = 10.0;
/// Giving up at least this much material (a knight for a pawn, say) is a
/// sacrifice rather than an exchange or a pawn grab.
const SACRIFICE_CP: i32 = 150;
/// Above this win chance the position was there to be won.
const WINNING: f64 = 75.0;
/// Below this it no longer is.
const NOT_WINNING: f64 = 60.0;

fn classify(ctx: &MoveContext) -> Severity {
    if ctx.played_is_best {
        let only_move = ctx.best_to_second.is_some_and(|gap| gap > ONLY_MOVE_GAP);
        let sacrificed = ctx.material_delta.is_some_and(|d| d <= -SACRIFICE_CP);
        if only_move && sacrificed && ctx.still_sound {
            return Severity::Brilliant;
        }
        if only_move {
            return Severity::Great;
        }
        return Severity::Best;
    }
    // Letting a win slip is worth calling out separately from an ordinary error:
    // the position was winning, best play would have kept it that way, and the
    // move played gave it up. Same magnitude of mistake, but a different lesson.
    if ctx.win_chance_loss >= 10.0
        && ctx.win_chance_before >= WINNING
        && ctx.win_chance_after < NOT_WINNING
    {
        return Severity::Miss;
    }
    match ctx.win_chance_loss {
        l if l >= 20.0 => Severity::Blunder,
        l if l >= 10.0 => Severity::Mistake,
        l if l >= 5.0 => Severity::Inaccuracy,
        l if l >= 2.0 => Severity::Good,
        _ => Severity::Excellent,
    }
}

/// Analysis of a single move within a game.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveAnalysis {
    pub ply: u32,
    /// Position before the move (FEN).
    pub fen: String,
    /// Position after the move (FEN). `#[serde(default)]` for analyses stored
    /// before this field existed (they'll have an empty string).
    #[serde(default)]
    pub fen_after: String,
    /// Side that made the move.
    pub side: Color,
    pub san: String,
    pub played_uci: String,
    /// Engine's best move at this position (UCI).
    pub best_uci: String,
    /// Best eval available before the move (mover's perspective).
    pub eval_before: Score,
    /// Eval after the move played (mover's perspective).
    pub eval_after: Score,
    /// Centipawns lost vs. best play (>= 0).
    pub cp_loss: i32,
    pub severity: Severity,
    /// Tactical themes for the mistake (only populated for mistakes/blunders).
    /// `#[serde(default)]` for analyses stored before classification existed.
    #[serde(default)]
    pub concepts: Vec<Concept>,
    /// Engine's principal variation (recommended continuation) in UCI moves,
    /// starting from this position — populated only for mistakes/blunders.
    /// `#[serde(default)]` for analyses stored before this field existed.
    #[serde(default)]
    pub best_line: Vec<String>,
}

/// Collapse a score to a centipawn number for comparison. Mates map to large
/// magnitudes (sooner mate = larger), clamped to avoid overflow.
fn score_cp(s: Score) -> i32 {
    match s {
        Score::Cp(cp) => cp,
        Score::Mate(n) if n >= 0 => 100_000 - n.min(1000) * 100,
        Score::Mate(n) => -100_000 - n.max(-1000) * 100,
    }
}

fn negate(s: Score) -> Score {
    match s {
        Score::Cp(c) => Score::Cp(-c),
        Score::Mate(n) => Score::Mate(-n),
    }
}


impl UciEngine {
    /// Analyze every move of a game's mainline at a fixed `depth`, classifying
    /// each by centipawn loss vs. the engine's best move.
    ///
    /// Evaluates consecutive positions independently — a standard approximation
    /// that carries some eval noise between plies, which the severity thresholds
    /// absorb. CPU-bound and long; run on a blocking task.
    pub fn analyze_game(
        &mut self,
        pgn: &str,
        depth: u32,
    ) -> Result<Vec<MoveAnalysis>, EngineError> {
        let game = parse_game(pgn)?;
        let n = game.steps.len();
        if n == 0 {
            return Ok(Vec::new());
        }

        // Positions before each move are non-terminal (a move was played there).
        // Two lines per position: the second is what distinguishes a move that was
        // the only option from one of several equally good ones.
        let mut evals: Vec<EngineEval> = Vec::with_capacity(n);
        let mut seconds: Vec<Option<Score>> = Vec::with_capacity(n);
        for step in &game.steps {
            let lines = self.analyze_position_multi(&step.fen_before, depth, 2)?;
            seconds.push(lines.get(1).map(|e| e.score));
            evals.push(lines.into_iter().next().ok_or(EngineError::NoEval)?);
        }
        // The final position may be checkmate/stalemate (no eval) — tolerate it.
        let final_eval = self.analyze_position(&game.final_fen, depth).ok();

        let mut out = Vec::with_capacity(n);
        for i in 0..n {
            let step = &game.steps[i];
            let before = &evals[i];
            let next = if i + 1 < n {
                Some(&evals[i + 1])
            } else {
                final_eval.as_ref()
            };

            let best_uci = before.best_move().unwrap_or_default().to_string();
            let played_is_best = !best_uci.is_empty() && step.uci == best_uci;

            let (eval_after, cp_loss) = match next {
                Some(ne) => (
                    negate(ne.score),
                    (score_cp(before.score) + score_cp(ne.score)).max(0),
                ),
                // Game-ending move (e.g. checkmate): no follow-up position.
                None => (before.score, 0),
            };

            // Position after this move = the next ply's start, or the final position.
            let fen_after = if i + 1 < n {
                game.steps[i + 1].fen_before.clone()
            } else {
                game.final_fen.clone()
            };

            // Did this move give material away? Measured after the opponent's
            // best reply, so an even trade nets out and a declined sacrifice
            // still counts as one. Works on the final move of a game too, where
            // no reply was ever played.
            let material_delta = match (
                material_for(&step.fen_before, step.side_to_move),
                next.and_then(|ne| ne.best_move())
                    .and_then(|reply| material_after_reply(&fen_after, reply, step.side_to_move)),
            ) {
                (Some(before_mat), Some(after_mat)) => Some(after_mat - before_mat),
                _ => None,
            };

            let wc_before = win_chance(score_cp(before.score));
            let wc_after = win_chance(score_cp(eval_after));
            let ctx = MoveContext {
                win_chance_loss: (wc_before - wc_after).max(0.0),
                win_chance_before: wc_before,
                win_chance_after: wc_after,
                played_is_best,
                best_to_second: seconds[i].map(|second| {
                    (win_chance(score_cp(before.score)) - win_chance(score_cp(second))).max(0.0)
                }),
                material_delta,
                // A brilliancy has to actually work — sacrificing into a lost
                // position is just a blunder that the engine happens to prefer.
                still_sound: score_cp(eval_after) > -200,
            };
            let severity = classify(&ctx);
            // A Miss is a thrown-away win, so it needs the same "here's what you
            // should have played" treatment as a mistake or blunder.
            let is_error = matches!(
                severity,
                Severity::Miss | Severity::Mistake | Severity::Blunder
            );
            // Classify the *why* — and keep the recommended line — only when the
            // move actually went wrong.
            let move_concepts = if is_error {
                concepts::classify(
                    &step.fen_before,
                    &best_uci,
                    &step.uci,
                    before.score,
                    eval_after,
                )
            } else {
                Vec::new()
            };
            let best_line = if is_error {
                before.pv.iter().take(12).cloned().collect()
            } else {
                Vec::new()
            };

            out.push(MoveAnalysis {
                ply: step.ply,
                fen: step.fen_before.clone(),
                fen_after,
                side: step.side_to_move,
                san: step.san.clone(),
                played_uci: step.uci.clone(),
                best_uci,
                eval_before: before.score,
                eval_after,
                cp_loss,
                severity,
                concepts: move_concepts,
                best_line,
            });
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Baseline context: best move played from a level position.
    fn ctx() -> MoveContext {
        MoveContext {
            win_chance_loss: 0.0,
            played_is_best: true,
            best_to_second: None,
            material_delta: None,
            still_sound: true,
            win_chance_before: 50.0,
            win_chance_after: 50.0,
        }
    }

    #[test]
    fn throwing_away_a_win_is_a_miss_not_a_mistake() {
        // Winning, best play keeps it, played move gives it up.
        let missed = MoveContext {
            win_chance_loss: 30.0,
            played_is_best: false,
            win_chance_before: 85.0,
            win_chance_after: 55.0,
            ..ctx()
        };
        assert_eq!(classify(&missed), Severity::Miss);

        // The same size of error from a level position is an ordinary blunder —
        // there was no win to miss.
        let from_level = MoveContext {
            win_chance_loss: 30.0,
            played_is_best: false,
            win_chance_before: 50.0,
            win_chance_after: 20.0,
            ..ctx()
        };
        assert_eq!(classify(&from_level), Severity::Blunder);

        // Still winning afterwards: sloppy, not a miss.
        let still_winning = MoveContext {
            win_chance_loss: 12.0,
            played_is_best: false,
            win_chance_before: 92.0,
            win_chance_after: 80.0,
            ..ctx()
        };
        assert_eq!(classify(&still_winning), Severity::Mistake);

        // Small slip from a winning position stays an inaccuracy.
        let slip = MoveContext {
            win_chance_loss: 6.0,
            played_is_best: false,
            win_chance_before: 85.0,
            win_chance_after: 79.0,
            ..ctx()
        };
        assert_eq!(classify(&slip), Severity::Inaccuracy);
    }

    #[test]
    fn win_chance_is_centred_and_monotonic() {
        assert!((win_chance(0) - 50.0).abs() < 0.001, "equal position is 50%");
        assert!(win_chance(300) > win_chance(100));
        assert!(win_chance(-300) < win_chance(-100));
        // Symmetric about zero.
        assert!((win_chance(250) + win_chance(-250) - 100.0).abs() < 0.001);
        // Saturates rather than exploding on mate scores.
        assert!(win_chance(100_000) <= 100.0 && win_chance(-100_000) >= 0.0);
    }

    #[test]
    fn win_chance_loss_matters_more_when_the_game_is_close() {
        // The same 100cp swing costs far more win chance near equality than it
        // does when already winning — the reason the thresholds use win chance.
        let near_equal = win_chance(0) - win_chance(-100);
        let already_winning = win_chance(800) - win_chance(700);
        assert!(
            near_equal > already_winning * 2.0,
            "100cp near equality ({near_equal}) should dwarf 100cp when winning ({already_winning})"
        );
    }

    #[test]
    fn material_balance_counts_both_sides() {
        let start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        assert_eq!(material_balance(start), Some(0));
        // White is a knight up (black's b8 knight removed).
        let a_knight_up = "r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        assert_eq!(material_balance(a_knight_up), Some(300));
        // Same position from black's point of view.
        assert_eq!(material_for(a_knight_up, Color::White), Some(300));
        assert_eq!(material_for(a_knight_up, Color::Black), Some(-300));
        assert_eq!(material_balance("not a fen"), None);
    }

    #[test]
    fn best_move_without_alternatives_is_just_best() {
        // No second line, or a close one: nothing remarkable.
        assert_eq!(classify(&ctx()), Severity::Best);
        assert_eq!(
            classify(&MoveContext { best_to_second: Some(1.0), ..ctx() }),
            Severity::Best
        );
    }

    #[test]
    fn only_move_is_great_and_sacrificing_only_move_is_brilliant() {
        let only = MoveContext { best_to_second: Some(25.0), ..ctx() };
        assert_eq!(classify(&only), Severity::Great);

        let sacrifice = MoveContext { material_delta: Some(-300), ..only };
        assert_eq!(classify(&sacrifice), Severity::Brilliant);

        // An even trade is not a sacrifice.
        assert_eq!(
            classify(&MoveContext { material_delta: Some(0), ..only }),
            Severity::Great
        );
        // Winning material is certainly not.
        assert_eq!(
            classify(&MoveContext { material_delta: Some(300), ..only }),
            Severity::Great
        );
    }

    #[test]
    fn a_sacrifice_into_a_lost_position_is_not_brilliant() {
        // The engine may still rank it first among bad options; that does not
        // make it a brilliancy.
        let doomed = MoveContext {
            best_to_second: Some(25.0),
            material_delta: Some(-500),
            still_sound: false,
            ..ctx()
        };
        assert_eq!(classify(&doomed), Severity::Great);
    }

    #[test]
    fn errors_are_graded_by_win_chance_lost() {
        let err = |loss: f64| {
            classify(&MoveContext { win_chance_loss: loss, played_is_best: false, ..ctx() })
        };
        assert_eq!(err(0.5), Severity::Excellent);
        assert_eq!(err(3.0), Severity::Good);
        assert_eq!(err(7.0), Severity::Inaccuracy);
        assert_eq!(err(15.0), Severity::Mistake);
        assert_eq!(err(40.0), Severity::Blunder);
        // Boundaries land on the worse side.
        assert_eq!(err(2.0), Severity::Good);
        assert_eq!(err(5.0), Severity::Inaccuracy);
        assert_eq!(err(10.0), Severity::Mistake);
        assert_eq!(err(20.0), Severity::Blunder);
    }

    #[test]
    fn parses_multipv_rank_and_defaults_to_one() {
        let second = parse_info("info depth 20 multipv 2 score cp -14 pv d2d4 d7d5").unwrap();
        assert_eq!(second.multipv, 2);
        // A single-line search omits multipv entirely.
        let only = parse_info("info depth 20 score cp 31 pv e2e4").unwrap();
        assert_eq!(only.multipv, 1);
    }

    #[test]
    fn arch_score_prefers_native_build() {
        use std::path::Path;
        let arm = Path::new("/e/stockfish-macos-m1-apple-silicon");
        let x86 = Path::new("/e/stockfish-macos-x86-64-sse41-popcnt");
        let plain = Path::new("/opt/homebrew/bin/stockfish");

        // A bare `stockfish` (Homebrew/apt) must outrank a foreign-arch build,
        // and the matching build must outrank both.
        let (native, foreign) = if cfg!(target_arch = "aarch64") {
            (arm, x86)
        } else {
            (x86, arm)
        };
        assert_eq!(arch_score(native), 2);
        assert_eq!(arch_score(plain), 1);
        assert_eq!(arch_score(foreign), 0);
        assert!(arch_score(native) > arch_score(plain));
        assert!(arch_score(plain) > arch_score(foreign));
    }

    #[test]
    fn parses_centipawn_info() {
        let e = parse_info(
            "info depth 20 seldepth 28 multipv 1 score cp 31 nodes 1000 nps 50000 pv e2e4 e7e5 g1f3",
        )
        .unwrap();
        assert_eq!(e.depth, 20);
        assert_eq!(e.score, Score::Cp(31));
        assert_eq!(e.best_move(), Some("e2e4"));
        assert_eq!(e.pv.len(), 3);
    }

    #[test]
    fn parses_mate_info() {
        let e = parse_info("info depth 10 score mate -3 pv e1e2 d8h4").unwrap();
        assert_eq!(e.score, Score::Mate(-3));
        assert_eq!(e.best_move(), Some("e1e2"));
    }

    #[test]
    fn ignores_lines_without_score() {
        assert!(parse_info("info string NNUE evaluation using ...").is_none());
        assert!(parse_info("readyok").is_none());
        assert!(parse_info("bestmove e2e4").is_none());
    }

    #[test]
    fn parses_bestmove_line() {
        assert_eq!(parse_bestmove("bestmove e2e4 ponder e7e5"), Some("e2e4".into()));
        assert_eq!(parse_bestmove("bestmove (none)"), Some("(none)".into()));
        assert_eq!(parse_bestmove("info depth 1"), None);
    }

    // Integration test against a real engine. Skipped unless STOCKFISH_PATH is
    // set, so it never fails CI or machines without a binary.
    #[test]
    fn analyzes_start_position() {
        let Ok(path) = std::env::var("STOCKFISH_PATH") else {
            eprintln!("STOCKFISH_PATH unset — skipping engine integration test");
            return;
        };
        let mut engine = UciEngine::launch(&path).expect("launch engine");
        let eval = engine
            .analyze_position(
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                12,
            )
            .expect("analyze start position");
        assert!(eval.depth >= 1);
        assert!(eval.best_move().is_some());
        // The start position is roughly balanced — sanity-check it's not absurd.
        if let Score::Cp(cp) = eval.score {
            assert!(cp.abs() < 200, "unexpected start-position eval: {cp}cp");
        }
    }

    #[test]
    fn analyzes_a_short_game() {
        let Ok(path) = std::env::var("STOCKFISH_PATH") else {
            eprintln!("STOCKFISH_PATH unset — skipping engine integration test");
            return;
        };
        let mut engine = UciEngine::launch(&path).expect("launch engine");
        // Ruy Lopez opening — sound moves, no terminal position.
        let pgn = "[Event \"Test\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *";
        let analyses = engine.analyze_game(pgn, 10).expect("analyze game");
        assert_eq!(analyses.len(), 6);
        for a in &analyses {
            assert!(!a.best_uci.is_empty());
            assert!(!a.fen.is_empty());
            assert!(!a.fen_after.is_empty());
            assert_ne!(a.fen_after, a.fen);
            assert!(a.cp_loss >= 0);
        }
        // Sound opening moves shouldn't be flagged as blunders.
        assert!(analyses.iter().all(|a| a.severity != Severity::Blunder));
    }
}
