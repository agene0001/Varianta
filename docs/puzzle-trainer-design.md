# Puzzle Trainer — Design (Gambit Pillar 6)

Status: **proposed** (2026-07-01). Implements the product spec's Pillar 6
(§2.7, "Position-Based Puzzle Generation & Targeted Practice"). Builds directly on
the analysis + classification pillars already shipped in `gambit-engine`.

## Thesis

Your own games are the diagnostic data. A mistake you made in a real game is a
puzzle you *were actually in and got wrong* — motivationally and pedagogically
different from a generic puzzle-bank position. The trainer turns each analyzed
mistake into targeted practice.

## We already have the puzzle data

Every mistake/blunder `MoveAnalysis` (already produced and stored per game) carries
everything a puzzle needs — **no new engine work for the basic feed**:

| Field | Role in the puzzle |
|---|---|
| `fen` | the position to solve (player to move) |
| `best_uci` / `best_line` | the solution (single move, or full winning line) |
| `concepts` | tags → train a specific weakness ("my missed forks") |
| `severity` | prioritization (blunders first) |
| `side` | who blundered → the solver's side + board orientation |
| game/opponent/date (from `Game`) | the "you were really here on move 23 vs X" framing |

A puzzle is `source: OwnGame(game_id, ply)`, matching the spec's
`Puzzle { source: OwnGame(MistakeId) | LichessDb | Generated }`.

## The play loop

1. Show `fen` with the solver's side to move, board oriented to that side.
2. Solver plays a move.
3. **Validate** (see below). Wrong → red flash, let them retry / reveal.
4. Right → if the puzzle is multi-move, **auto-play the opponent's reply from
   `best_line`**, then ask for the next move; repeat until the line is exhausted.
5. Record the result (solved-first-try / solved-with-retries / revealed).

`best_line` indexing from the solver's POV: indices 0, 2, 4… are the solver's
moves (to find); 1, 3, 5… are the opponent replies (auto-played). A length-1 line
is just a single-move "find the best move" puzzle.

## Validation — the key decision

- **V1 (first slice): exact match** — the played UCI must equal the expected
  `best_line` move. Simple, zero extra cost. **Known limitation:** many positions
  have several good moves; exact-match wrongly rejects them.
- **V2: engine-checked** — re-run Stockfish on the *played* move (we already have
  the UCI engine + `spawn_blocking` wired up) and **accept if it doesn't drop the
  eval beyond a threshold** (e.g. ≤ ~30–50cp vs. the best move) — even if it's not
  the stored `best_uci`. This is the correct fix and is cheap (one short search per
  attempt). Do it once the basic loop works; keep exact-match as the fast path
  (if the move *is* `best_uci`, skip the engine call). *(This is the limitation we
  explicitly agreed to design around, not paper over.)*

## Phasing

1. **"Train mistakes from this game"** (first slice) — a button on the analysis
   view launches a puzzle run over *that game's* mistakes: present each position,
   validate (V1 exact-match), auto-play opponent replies for multi-move lines,
   show pass/fail + reveal. Reuses the interactive `ChessBoard`. No new storage.
2. **Engine-checked validation (V2)** — a Tauri command
   `validate_move(fen, uci, depth)` → returns eval drop vs. best; accept within
   threshold.
3. **Cross-game puzzle feed** — aggregate mistakes across *all* games, filterable
   by concept ("back-rank misses") and sortable by severity/recency. A real
   weakness-targeted queue.
4. **Spaced repetition + dedup** — persist per-puzzle review state (attempts,
   last result, ease, due date); stop re-serving solved puzzles; resurface the
   ones you keep missing. Needs a `puzzle_reviews` table in `varianta-storage`.
5. **Lichess CC0 puzzle DB** — supplement own-game puzzles with the ~4M-position
   Lichess database filtered by weak concept, for themes where you lack personal
   examples. Larger effort (import + query); do last.

## Architecture

- **Where puzzles come from:** initially derive on demand from stored
  `game_analyses` (filter `MoveAnalysis` to Mistake/Blunder) — a command like
  `get_game_puzzles(game_id)` (and later `get_puzzle_feed(concepts, limit)`). No
  new table for slices 1–3. Only slice 4 (SRS) needs persisted review state.
- **Crate:** the spec names a `gambit-puzzles` crate (own-game extraction +
  Lichess DB). For slices 1–3 the extraction is a thin filter/transform over
  analyses and can live in a small module; promote to `gambit-puzzles` when the
  Lichess DB integration (slice 5) justifies it.
- **UI:** a new nav section **Puzzles / Train** alongside `Trainer | Games |
  Settings`, reusing `ChessBoard.vue` (now that it's bounded to its container).

## Relationship to the opening trainer

- **Opening trainer** (existing): drills your *repertoire* — memorize chosen lines
  (spaced-repetition over a study list).
- **Puzzle trainer** (this): drills your *mistakes* — fix pattern-recognition gaps
  your real games exposed.

Complementary, per the spec — repertoire SR handles "memorize your lines"; this
handles "practice the position types you keep getting wrong."

## Open questions

- Multi-move vs. single-move default per puzzle (start: single move = find the
  best move; extend to full line when `best_line` length > 1).
- How to handle mistakes where the best line is itself losing (defensive
  "best of bad options") — maybe exclude, or label as "best defense."
- Orientation/animation polish for auto-played opponent replies.
