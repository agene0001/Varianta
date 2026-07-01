# Positional & Endgame Classification — Design

Status: **proposed** (2026-06-30). Extends the tactical classification shipped in
`gambit-engine/src/concepts.rs` (fork, pin, skewer, discovered attack, back-rank
mate, hanging piece, missed mate).

## The problem

Tactical concepts are detectable with geometry because they are concrete
patterns on the board. A **positional** mistake is defined by the *absence* of a
tactic: the move loses evaluation not through a forced sequence but through
long-term factors — pawn structure, king safety, piece activity, space, weak
squares. Naming the theme requires understanding *why* the eval dropped, not just
*that* it dropped. A naive heuristic ("no tactic + cp_loss ⇒ positional") can flag
the move but can't name the theme, and a bad name is worse than none.

## Two approaches

### A. Eval-feature diff (deterministic, no AI)

Compute a vector of cheap positional **features** from the board (shakmaty gives
us everything), for the position the player *reached* vs. the position they
*should* have reached, and attribute the eval drop to the feature that swung most
adversely. This is exactly how classical (pre-NNUE) engines evaluate — a weighted
sum of positional terms — except we diff the terms to *explain* rather than score.

Candidate features (all per-side, cheap to compute):

| Feature | Signal | Theme when it worsens |
|---|---|---|
| King safety | pawn-shield holes, open/semi-open files at the king, attacker count in the king zone | **Weakened king** |
| Pawn structure | doubled / isolated / backward pawns, pawn islands | **Created a weak pawn** |
| Piece activity | summed legal-move mobility; knight outposts; bad bishop (blocked by own pawns) | **Passive piece** |
| Space | squares controlled in the opponent's half | **Surrendered space** |
| Rook placement | rooks on open/semi-open files, 7th rank | **Gave up a file** |
| Passed pawns | count / advancement | **Let a passer through** |

Attribution: when a mistake has **no** tactical concept and `cp_loss ≥`
inaccuracy threshold, compute the feature vector for the mover after the played
move and after the engine's best line, take the delta, and if one term crosses a
tuned threshold, emit that positional concept. (For sharper attribution, play out
the engine's **PV** a few plies for both lines — `EngineEval.pv` already carries
it; today we only keep `pv[0]`. Storing `best_line: Vec<String>` gives a truer
"should have reached" position, since positional themes unfold over moves.)

- **Pros:** deterministic, fast, free, explainable, unit-testable exactly like the
  tactical concepts (FEN in → concept out).
- **Cons:** attribution is approximate; thresholds need tuning; misses subtle
  strategic ideas a strong human would name.

### B. LLM annotation (AI)

Send the position (FEN + recent PGN + engine eval + played vs. best move) to
Claude and ask it to name the theme from a **fixed taxonomy** and explain it in
one sentence.

- **Pros:** captures nuance; natural-language explanations; flexible.
- **Cons:** cost/latency (one call per mistake — must batch per game), non-
  deterministic, needs network + API key, and LLMs hallucinate chess.
- **Mitigations:** constrain to a taxonomy (classify, don't freeform); **ground**
  the model with the Approach-A features + engine eval so it explains rather than
  invents; batch a whole game's positional mistakes into one request; cache.

## Recommendation: hybrid, phased

1. **Phase 1 — deterministic features (Approach A).** Build a `Features`
   computation + attribution for 3–4 robust terms (king safety, pawn weaknesses,
   piece activity, space). Ships as new `Concept` variants (or a separate
   `PositionalConcept` enum). Gate: only when tactical concepts are empty **and**
   `cp_loss` ≥ inaccuracy. Covers the common cases; free and testable.

2. **Phase 2 — LLM explanations (Approach B), optional.** Layer natural-language
   explanations on top, grounded by Phase-1 features, batched per game, cached,
   behind a setting (needs an API key). Turns "Weakened king" into a sentence a
   coach would write.

## Plumbing changes

- **Engine:** optionally store `best_line: Vec<String>` on `MoveAnalysis` (slice
  of the PV) so Phase 1 can compare real resulting positions, not just 1-ply.
- **Types:** grow `Concept`, or add `positional: Vec<PositionalConcept>`; add
  frontend `CONCEPT_LABELS` / `CONCEPT_ICONS` entries.
- **Phase 2 only:** a Tauri command that calls the LLM (reqwest), an API-key
  setting in `varianta-storage` settings, and result caching in the analyses blob.

## Testing

Phase 1 is unit-testable like the tactical concepts: FENs with a clear positional
defect (a move that doubles pawns ⇒ *Created a weak pawn*; a move that strips the
king's pawn shield ⇒ *Weakened king*). Phase 2 needs eval-set spot checks, not
unit tests.

## Scope call

Start Phase 1 with king safety + pawn weaknesses + piece activity (+ space if
cheap). Defer Phase 2 until Phase 1 is solid and the natural-language layer is
judged worth the API dependency.
