//! Engine layer for Gambit: a Stockfish UCI client and the analysis types it
//! produces.
//!
//! This module currently holds the protocol-parsing core (pure, unit-tested).
//! The process/sidecar layer that spawns Stockfish and drives a `go depth N`
//! analysis is layered on top once a binary source is chosen.

use gambit_core::Color;
use gambit_pgn::parse_game;
use serde::{Deserialize, Serialize};

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

    let mut i = 1;
    while i < toks.len() {
        match toks[i] {
            "depth" => {
                depth = toks.get(i + 1).and_then(|s| s.parse().ok());
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

/// Severity of a move relative to the engine's best, by centipawn loss.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Best,
    Good,
    Inaccuracy,
    Mistake,
    Blunder,
}

/// Analysis of a single move within a game.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveAnalysis {
    pub ply: u32,
    /// Position before the move (FEN).
    pub fen: String,
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

fn classify(cp_loss: i32, played_is_best: bool) -> Severity {
    if played_is_best {
        return Severity::Best;
    }
    match cp_loss {
        l if l >= 300 => Severity::Blunder,
        l if l >= 150 => Severity::Mistake,
        l if l >= 50 => Severity::Inaccuracy,
        _ => Severity::Good,
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
        let mut evals: Vec<EngineEval> = Vec::with_capacity(n);
        for step in &game.steps {
            evals.push(self.analyze_position(&step.fen_before, depth)?);
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

            out.push(MoveAnalysis {
                ply: step.ply,
                fen: step.fen_before.clone(),
                side: step.side_to_move,
                san: step.san.clone(),
                played_uci: step.uci.clone(),
                best_uci,
                eval_before: before.score,
                eval_after,
                cp_loss,
                severity: classify(cp_loss, played_is_best),
            });
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
            assert!(a.cp_loss >= 0);
        }
        // Sound opening moves shouldn't be flagged as blunders.
        assert!(analyses.iter().all(|a| a.severity != Severity::Blunder));
    }
}
