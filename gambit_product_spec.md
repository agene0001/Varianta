# Gambit — Game-Driven Chess Learning Platform
### Product Specification (v0.1)

> "gambit" is a placeholder codename. Swap freely.

---

## 1. Problem Statement

Chess.com and Lichess both offer post-game analysis: they run your moves through an engine, mark blunders and mistakes, and assign an accuracy score. But they stop there. "You blundered on move 23" is true and useless — it doesn't tell you *why* you blundered (missed a pin? miscounted material? didn't see a back-rank threat?), it doesn't track whether you blunder in the same *pattern* across multiple games, and it doesn't generate practice targeting that specific weakness.

The standard remediation both platforms offer is "here are some puzzles" — pulled from a static global puzzle bank, not curated to what you specifically did wrong in your own games. You might have missed three knight forks in the last two weeks and get served a rook endgame puzzle because it happens to be in the daily queue.

**Core thesis:** your own games are the best diagnostic data you have. Every mistake you make in a real game is a data point about a specific gap in your pattern recognition or calculation. A platform that ingests those games, classifies the mistake type, tracks the pattern across sessions, and generates practice *at the position type you keep getting wrong* is a fundamentally different product from "here is your accuracy score."

---

## 2. Platform Vision & Goals

### 2.1 Why Not a Lattice Subject?

Lattice (the math/programming tutoring platform spec) is explicitly designed to eventually support chess as a subject (it's mentioned there as a candidate). Worth explaining here why this is specced as a standalone product rather than filed under Lattice:

- **Engine dependency.** Stockfish is load-bearing infrastructure for this product — every game analysis, every position evaluation, every puzzle validation goes through it. Lattice has no engine-integration layer and would need to grow one specifically for chess; it doesn't exist in any other subject.
- **Position-as-exercise.** Lattice's exercise model is text/math/code — a `Problem` has a `content: String` and a `solution: String`. Chess exercises are board positions (FEN strings) with best-move sequences — a fundamentally different shape. Forcing this into `lattice-content`'s exercise schema would require retrofitting the abstraction around a new primitive type.
- **Board rendering.** The frontend needs an interactive chess board (piece drag/drop, move highlighting, arrow annotations). This is a dedicated UI component with no parallel in math/code rendering, not a minor extension of KaTeX.
- **Game import pipeline.** PGN parsing + Chess.com/Lichess API integration is a full ingestion subsystem that doesn't exist anywhere in Lattice's architecture and wouldn't be reused by any other Lattice subject.

The concept-graph/mastery/diagnosis *pattern* is shared with Lattice. The implementation shares almost nothing. Separate product is the right call.

### 2.2 Pillar 1 — Game Import & PGN Ingestion

Pull your game history from external platforms and normalize it into the system's own game/move/position representation:

- **Chess.com API** — public endpoint for a user's game archive, paginated by month, returns PGN. Requires only a username, no auth.
- **Lichess API** — similar public game export endpoint.
- **Manual PGN upload** — fallback for games from other sources (OTB tournaments exported via a club system, FIDE-rated games, etc.).
- **Continuous sync** — periodic background job re-polling the APIs for new games, same pattern as `pulse-ingest` in the trend platform — not a one-time import.

All imports normalize to an internal `Game` representation (§6) before anything downstream touches them, so the ingestion source is irrelevant to the analysis pipeline.

### 2.3 Pillar 2 — Engine Analysis & Mistake Extraction

Run each imported game through **Stockfish** (open-source, free, UCI protocol, best-in-class evaluation) to:

- Compute the best move and eval at each position in the game.
- Classify each deviation from best play by severity (consistent with standard chess notation):
  - **Blunder** — evaluation swings by ≥300cp in one move (±3 pawns).
  - **Mistake** — swing of 150–300cp.
  - **Inaccuracy** — swing of 50–150cp.
  - **Missed win** — had a forced mate or decisive material gain and didn't take it.
- Produce a `MistakeRecord` per flagged move containing: position (FEN), move played, best move, eval before/after, and the candidate continuation Stockfish recommends.

This is deterministic, not AI-based — same design philosophy as Lattice's diagnostic core. The engine tells you what happened; classification of *why* it happened comes next.

### 2.4 Pillar 3 — Mistake Pattern Classification

This is the layer that turns raw engine analysis into something learnable. Each mistake is tagged with one or more **tactical/positional concept labels** from a chess concept graph (§2.6):

```
missed_tactic:
  ├─ fork (knight_fork | bishop_fork | queen_fork | ...)
  ├─ pin (absolute_pin | relative_pin)
  ├─ skewer
  ├─ discovered_attack
  ├─ back_rank_mate
  ├─ deflection
  └─ ...

positional:
  ├─ piece_coordination
  ├─ pawn_structure (isolated_pawn | doubled_pawn | passed_pawn_technique)
  ├─ outpost
  └─ ...

endgame:
  ├─ king_activity
  ├─ opposition
  ├─ rook_endgame_technique
  └─ ...

opening:
  ├─ development_principles
  ├─ center_control
  └─ ...
```

V1 classification is **heuristic-based, not AI-based**: given the position and the best-move sequence from Stockfish, a set of rules can identify many tactical patterns deterministically (is the best move a knight landing on a square that attacks two pieces? → fork. Is there a discovered check in the best line? → discovered attack). This covers the majority of tactical mistakes reliably without an LLM call.

AI classification (Pillar 4) is the Phase 2 addition that handles the cases heuristics miss — positional mistakes, subtle endgame technique errors, and cases where the heuristic fires but the underlying reason is more nuanced. The same design pattern as Lattice: deterministic diagnosis first, AI as a refinement layer on top.

### 2.5 Pillar 4 — AI Explanation Layer (Phase 2)

Given a `MistakeRecord` + the heuristic-assigned concept label, the AI produces a natural-language explanation of *why* the mistake happened and *what the learner likely missed*:

```
"On move 23, you played Nd4. The engine preferred Ne5, which forks your
opponent's queen on d7 and rook on g6. The knight fork pattern is often
hard to see when the forking square isn't currently attacked by any piece —
which was the case here since e5 was defended by the opponent's pawn on f6.
That defense was removable by the preceding Bxf6 you didn't play."
```

This is the Lattice Pillar 4 analogue — the part that distinguishes "which concept" from "exactly what you missed and why." Requires submitted *work* (the position you were in, the move you played, the broader game context) rather than just a final answer — structurally, chess already satisfies this because every mistake has a position, a played move, and a best-move continuation already attached to it from Pillar 2.

### 2.6 Pillar 5 — Chess Concept Graph & Mastery Tracking

A chess-specific concept graph (§2.4's taxonomy, fleshed out into a full node set) where each node tracks:

```
Knight Fork
Mastery:         72%
Confidence:      0.65
Last practiced:  9 days ago
Decay estimate:  Low
Frequency in games (last 30): 4 missed, 1 found
```

This is the same mastery/decay model as Lattice (Mastered → Familiar → Rusty → Forgotten, confidence × time-decay function) applied to chess concepts instead of math prerequisites. The critical addition over what Lattice tracks: **in-game frequency** — how often a given concept *appeared* in your real games, not just how well you did in practice drills. A concept you keep encountering and keep missing in real play should rank higher for practice priority than one you're weak at but never actually see.

### 2.7 Pillar 6 — Position-Based Puzzle Generation & Targeted Practice

The core product differentiator. Given the concept(s) a player is weak at:

1. **Extract positions from the player's own games** where that concept appeared and was missed — those exact positions become puzzles ("find the move you missed on move 23 of your game against [opponent] on [date]"). This is motivationally different from a generic puzzle: you *were in this exact position* and chose wrong. You know the stakes were real.

2. **Pull from Lichess's open puzzle database** filtered by concept tag — Lichess publishes its entire puzzle database (millions of positions, all tagged with tactic types) under a CC0 license. This is an enormous free resource for practice content beyond what your own games provide.

3. **Generate related positions from known patterns** — parameterized variants of the missed position (Phase 3 enhancement, similar to Lattice's AI-enhanced exercise generation): change piece placement slightly to vary difficulty while preserving the same tactical theme.

### 2.8 Pillar 7 — Opening Repertoire Gap Detection (Phase 3)

A separate but natural extension: analyze your opening choices across games, identify lines where you regularly deviate from established theory or lose material in preparation, and flag them as repertoire gaps. This is closer to what your Chessreps project was doing (spaced repetition for openings), and is a natural complement rather than a replacement — Chessreps handles the "memorize your repertoire" loop; this pillar identifies *which lines* in your repertoire need work based on your actual game outcomes, not a predetermined study list.

### 2.9 Business Model & Monetization

**Free tier:**
- Game import (up to N games/month)
- Engine analysis (local Stockfish, user-installed or bundled)
- Basic mistake classification (heuristic, no AI)
- Concept graph and mastery tracking
- Puzzle feed from Lichess public database filtered by weak concept

**Premium tier:**
- Unlimited game import + continuous sync
- AI explanation layer (Pillar 4) — the most expensive per-request feature
- Opening repertoire gap detection (Pillar 7)
- Position generation beyond Lichess database (Pillar 6.3)
- Deeper historical analytics (mistake frequency trends, improvement over time)

**Cost structure note:** the Stockfish analysis (Pillar 2) is the dominant compute cost and it's entirely local — Stockfish runs on the user's machine inside the Tauri shell, zero marginal infrastructure cost per analysis. The only LLM spend is the AI explanation layer (Pillar 4), cleanly gated behind premium. This makes the free tier genuinely free to run, in a way that's cleaner than either of the other two platforms.

---

## 3. Scope & Phasing Summary

| Pillar | V1 (personal use) | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| 2.2 Game import (Chess.com + Lichess + PGN) | ✅ Built | | | |
| 2.3 Engine analysis (Stockfish) | ✅ Built | | | |
| 2.4 Heuristic mistake classification | ✅ Built | | | |
| 2.5 AI explanation layer | | ✅ Built | | |
| 2.6 Concept graph + mastery/decay | ✅ Built | | | |
| 2.7 Puzzle feed (own games + Lichess DB) | ✅ Built | | | |
| 2.8 Opening repertoire gap detection | | | ✅ Built | |
| Pillar 6.3 Position generation | | | ✅ Built | |
| Multi-user / auth / billing | | | | ✅ Built |
| Website deployment | | | | ✅ Built |

---

## 4. System Architecture

### App Shell
Same reasoning as the other three specs: Tauri 2.x — web-tech frontend reusable as a future website, mobile targets available later from the same codebase, Rust backend where the actual complexity lives. One addition unique to this platform: **Stockfish runs as a sidecar process inside the Tauri shell**, communicating over the UCI protocol via stdin/stdout. This is load-bearing for the free tier's zero-infrastructure-cost promise — analysis happens locally, not on a server.

### Workspace Layout

```
gambit/
├── crates/
│   ├── gambit-core/        # domain types: Game, Move, Position, MistakeRecord, ConceptNode
│   ├── gambit-pgn/         # PGN parser + FEN utilities (wraps shakmaty)
│   ├── gambit-ingest/      # Chess.com + Lichess API clients + sync scheduler
│   ├── gambit-engine/      # Stockfish UCI client, analysis job queue
│   ├── gambit-classify/    # heuristic tactic classifier + (Phase 2) AI explanation
│   ├── gambit-graph/       # chess concept DAG, mastery/decay, practice priority queue
│   ├── gambit-puzzles/     # puzzle feed: own-game extraction + Lichess DB integration
│   ├── gambit-storage/     # Postgres (writes) + DuckDB (analytics reads)
│   └── gambit-service/     # transport-agnostic orchestration layer
├── src-tauri/               # Tauri shell + Stockfish sidecar registration
└── frontend/                # SvelteKit + Chessground (board rendering)
```

### Data Flow (game → analysis → practice)

```
[background sync job]
gambit-ingest::fetch_new_games()          // Chess.com / Lichess API
  → gambit-pgn::parse(pgn)
  → gambit-storage::record_game()
  → gambit-engine::analyze(game)          // Stockfish, local sidecar
  → gambit-classify::classify(mistakes)   // heuristics V1; + AI Phase 2
  → gambit-graph::update_mastery(concepts_encountered)
  → gambit-storage::record_analysis()

[user opens practice feed]
gambit-service::get_practice_queue(learner_id)
  → gambit-graph::weakest_concepts()
  → gambit-puzzles::generate_feed(weak_concepts)   // own games + Lichess DB
  ← Vec<Puzzle> ranked by concept weakness + recency
```

---

## 5. Crate / Module Breakdown

### `gambit-core`
```rust
pub struct Game {
    pub id: GameId,
    pub source: GameSource,          // ChessCom | Lichess | ManualPgn
    pub pgn: String,
    pub player_color: Color,
    pub result: GameResult,
    pub played_at: DateTime<Utc>,
}

pub struct Position {
    pub fen: String,
    pub move_number: u32,
    pub side_to_move: Color,
}

pub struct MistakeRecord {
    pub id: MistakeId,
    pub game_id: GameId,
    pub position: Position,
    pub played_move: String,          // UCI notation
    pub best_move: String,
    pub eval_before: i32,             // centipawns
    pub eval_after: i32,
    pub severity: MistakeSeverity,   // Blunder | Mistake | Inaccuracy | MissedWin
    pub best_line: Vec<String>,       // engine continuation
    pub concepts: Vec<ConceptId>,    // assigned by gambit-classify
}

pub struct Puzzle {
    pub id: PuzzleId,
    pub source: PuzzleSource,        // OwnGame(MistakeId) | LichessDb | Generated
    pub position: Position,
    pub solution_moves: Vec<String>,
    pub concepts: Vec<ConceptId>,
    pub difficulty: u32,
}
```

### `gambit-pgn`
Wraps **`shakmaty`** — the best-maintained Rust chess library, handles PGN/FEN/move generation/legal-move checking correctly (chess rules are non-trivial: en passant, castling rights, repetition, etc. — don't hand-roll this). Exposes a clean `parse_pgn(raw: &str) -> Result<Game>` and `position_at_move(game, n) -> Position` API so nothing else in the workspace imports `shakmaty` directly.

### `gambit-ingest`
- Chess.com and Lichess API clients.
- Sync scheduler: poll for new games since last sync, deduplicate by game ID, feed new games to analysis queue.
- Trait-based so adding a new platform source is an adapter, not a restructuring:
```rust
pub trait GameSource {
    async fn fetch_games(&self, username: &str, since: DateTime<Utc>) -> Result<Vec<RawGame>>;
}
```

### `gambit-engine`
Manages the Stockfish sidecar over UCI protocol:
- Analysis job queue — games queue up for analysis; Stockfish runs one at a time, results written back to storage asynchronously.
- Configurable depth/multipv settings (deeper analysis = more accurate but slower; make this a user config, not a hardcoded constant).
- Exposes `analyze_game(game) -> Vec<MoveAnalysis>` — one `MoveAnalysis` per move containing best move, eval, and best line.

### `gambit-classify`
**V1 — heuristics:**
- Given a `MistakeRecord` (position + best move + best line), apply pattern-matching rules to assign concept labels.
- Fork detection: does the best move land on a square that simultaneously attacks two or more opponent pieces? → tag `knight_fork`, `bishop_fork`, etc.
- Pin detection: is there a piece in the best line that's pinned to the king or a higher-value piece after the best move?
- Back-rank mate: is the opponent's king on the back rank with no escape squares in the best line?
- Missed check: does the best move deliver check that the player didn't play?
- These cover the majority of tactical mistakes in sub-2000 games reliably without AI.

**Phase 2 — AI explanation (additive):**
```json
{
  "primary_concept": "knight_fork",
  "explanation": "Ne5 forks the queen on d7 and rook on g6. The fork is hard to see here because e5 looks defended by the f6-pawn — but Bxf6 removes that defender, making Ne5 decisive.",
  "secondary_concept": "clearance_sacrifice",
  "confidence": 0.87
}
```

### `gambit-graph`
Chess concept DAG + mastery tracking. Near-identical to `lattice-graph` in structure (same Mastered/Familiar/Rusty/Forgotten states, same confidence × time-decay function) but with chess-specific additions:
- **In-game frequency** tracked separately from drill accuracy — a concept you keep encountering in real games and keep missing ranks higher for practice priority than one you're weak on but rarely face.
- `practice_priority(concept_id, learner_id) -> f32` — combines mastery score, decay estimate, and in-game encounter frequency.

### `gambit-puzzles`
Two sources, unified output:
1. **Own-game extraction** — for each `MistakeRecord` with severity ≥ Mistake, extract the position as a puzzle with the best-move as solution. Deduplicated (don't re-serve a position the player already solved correctly).
2. **Lichess puzzle database** — full database is ~4M positions, licensed CC0, freely downloadable as CSV. Filter by concept tags matching weak concepts. Worth importing into DuckDB directly for fast per-concept querying against the local copy rather than hitting the Lichess API per request.

### `gambit-storage`
Same dual-database pattern: Postgres for writes/event log, DuckDB for analytics reads — plus local copy of the Lichess puzzle database in DuckDB, since DuckDB handles 4M-row CSV querying very efficiently.

### `gambit-service`
Transport-agnostic orchestration — same role as the other three platforms' `-service` crates.

### `frontend`
SvelteKit, consistent with the other three specs. Key addition not needed elsewhere: **Chessground** — the open-source board component that powers Lichess itself. Handles piece rendering, legal move highlighting, drag-and-drop, arrow annotations. License is MIT, freely embeddable. Don't hand-roll a chess board.

Views needed:
- **Dashboard** — recent games, overall concept weakness heat map, quick-start practice.
- **Game review** — move-by-move replay with eval bar, mistake markers, best-move arrows, concept labels.
- **Practice feed** — ranked puzzle queue, filtered by weak concept.
- **Puzzle** — interactive board, enter solution moves, reveal/explanation flow.
- **Concept map** — visual concept DAG with mastery state per node.
- **Opening report** (Phase 3) — repertoire gaps detected from game history.

---

## 6. Data Model

```sql
-- Postgres (writes, source of truth)
learners(id, chess_com_username, lichess_username, created_at)
games(id, learner_id, source, pgn, player_color, result, played_at, imported_at)
move_analyses(id, game_id, move_number, fen, played_move, best_move, eval_before, eval_after, best_line jsonb)
mistakes(id, game_id, move_analysis_id, severity, concepts jsonb)
mistake_explanations(id, mistake_id, explanation, primary_concept, secondary_concept, created_at) -- Phase 2
concepts(id, label, category, description)
concept_prerequisites(concept_id, prerequisite_id)
learner_concept_mastery(learner_id, concept_id, state, confidence, last_practiced_at, decay_rate, game_encounter_count, game_miss_count)
puzzles(id, source_type, source_ref, fen, solution_moves jsonb, concepts jsonb, difficulty)
puzzle_attempts(id, learner_id, puzzle_id, moves_played jsonb, solved, created_at)
```

```sql
-- DuckDB (reads)
-- concept_weakness_ranking: per learner, concepts ranked by practice priority
-- mistake_pattern_trend: frequency of each concept missed over time
-- opening_gap_analysis: lines where player deviates from theory (Phase 3)

-- Local copy of Lichess puzzle database (4M rows, CSV import)
lichess_puzzles(puzzle_id, fen, moves, rating, tags)
-- Queried directly: SELECT * FROM lichess_puzzles WHERE tags LIKE '%fork%' AND rating BETWEEN 1200 AND 1600
```

---

## 7. Tech Stack

| Concern | Choice |
|---|---|
| Core language | Rust |
| Async runtime | Tokio |
| Chess rules / PGN / FEN | `shakmaty` crate |
| Engine | Stockfish (local sidecar, UCI protocol) |
| Game import | Chess.com public API + Lichess public API |
| Puzzle database | Lichess open puzzle database (CC0, 4M positions) |
| LLM (Phase 2 only) | Anthropic API (Claude) — explanation layer |
| App shell | Tauri 2.x (Stockfish as sidecar) |
| Frontend framework | SvelteKit |
| Board rendering | Chessground (MIT, powers Lichess) |
| DB (writes) | PostgreSQL |
| DB (reads/analytics + puzzle DB) | DuckDB |
| Serialization | serde / serde_json |

---

## 8. Relationship to Existing Projects

- **Chessreps (your existing Vue 3 app)** — spaced repetition for opening memorization. Gambit is a complement, not a replacement: Chessreps answers "repeat your repertoire until it sticks," Gambit answers "which lines in your repertoire need work based on your actual games." Pillar 7 (opening gap detection) is where they connect most directly — you could eventually surface "go drill this Chessreps line" as a recommendation from Gambit.
- **`scraprs`** — not needed here since both Chess.com and Lichess have real public APIs that don't require browser automation. This is a rarity in your project stack; enjoy it.
- **`lattice-graph`** — same mastery/decay model, near-identical implementation. Worth noting for when you eventually consider whether a shared core crate across Lattice and Gambit makes sense — the graph machinery is probably the strongest candidate for extraction.

---

## 9. Open Questions

1. **Stockfish depth setting** — deeper analysis is more accurate but analysis of a full game at depth 20+ can take several minutes. Should this be a background async job (analyze silently while user does other things) or a blocking "analyzing..." flow? Background job is the right UX answer but requires a proper job queue, not just a synchronous call.
2. **Heuristic classifier coverage** — what percentage of sub-2000 mistakes are tactical (heuristically classifiable) vs. positional (require AI/human to explain)? This determines how much value V1 delivers before Phase 2's AI layer ships. A reasonable prior is that tactical mistakes dominate below ~1800 and positional mistakes become more relevant above it — worth testing against your own game history.
3. **Lichess puzzle DB import** — 4M rows is large but very manageable in DuckDB. How often to refresh the local copy? The database is updated periodically by Lichess; monthly re-import is probably sufficient.
4. **Puzzle solution validation** — for own-game-extracted puzzles, the solution is the best line from Stockfish, which is unambiguous. For Lichess DB puzzles, the solution is the stored move sequence. Need to decide whether alternate correct solutions (there often are some) are accepted or whether the player must play the exact stored line — Lichess itself accepts only the exact line, which is simpler but occasionally frustrating.
5. **Chessground licensing** — MIT, freely embeddable, confirmed. Just noting it since Lichess recently changed some adjacent licensing; worth a fresh check before shipping.
6. **Target rating range** — the heuristic classifier's pattern set and the Lichess puzzle difficulty filter both need a target range. Your own rating as a starting calibration point is reasonable for V1 dogfooding.
