import { invoke } from "@tauri-apps/api/core";

const inTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type Severity = "best" | "good" | "inaccuracy" | "mistake" | "blunder";
export type Score = { kind: "cp"; value: number } | { kind: "mate"; value: number };

/** Tactical themes a mistake can be tagged with (mirrors `gambit_engine::Concept`). */
export type Concept =
  | "missed_mate"
  | "back_rank_mate"
  | "fork"
  | "pin"
  | "skewer"
  | "discovered_attack"
  | "hanging_piece";

/** Short human labels for each concept, shown as chips on the mistake. */
export const CONCEPT_LABELS: Record<Concept, string> = {
  missed_mate: "Missed mate",
  back_rank_mate: "Missed back-rank mate",
  fork: "Missed a fork",
  pin: "Missed a pin",
  skewer: "Missed a skewer",
  discovered_attack: "Missed a discovered attack",
  hanging_piece: "Hangs a piece",
};

/** Mirrors `gambit_engine::MoveAnalysis` (serde snake_case). */
export interface MoveAnalysis {
  ply: number;
  /** Position before the move. */
  fen: string;
  /** Position after the move (empty for analyses saved before this field). */
  fen_after: string;
  side: "white" | "black";
  san: string;
  played_uci: string;
  best_uci: string;
  eval_before: Score;
  eval_after: Score;
  cp_loss: number;
  severity: Severity;
  /** Tactical themes for the mistake (empty for non-mistakes / old analyses). */
  concepts: Concept[];
}

/** A game's stored analysis, or null if it hasn't been analyzed. */
export async function getGameAnalysis(gameId: string): Promise<MoveAnalysis[] | null> {
  if (!inTauri) return null;
  return await invoke<MoveAnalysis[] | null>("get_game_analysis", { gameId });
}

/** Run the engine over a game, persist, and return the analysis. */
export async function analyzeGame(gameId: string, depth?: number): Promise<MoveAnalysis[]> {
  if (!inTauri) throw new Error("Analysis requires the desktop app.");
  return await invoke<MoveAnalysis[]>("analyze_game", { gameId, depth });
}

/** Centipawns from White's perspective (eval_after is side-to-move relative). */
export function whiteCp(a: MoveAnalysis): number {
  const s = a.eval_after;
  const cp =
    s.kind === "cp"
      ? s.value
      : s.value >= 0
        ? 100000 - s.value * 100
        : -100000 - s.value * 100;
  return a.side === "white" ? cp : -cp;
}

/** Human eval label from White's perspective, e.g. "+1.2" or "M3". */
export function evalLabel(a: MoveAnalysis): string {
  const s = a.eval_after;
  if (s.kind === "mate") {
    const m = a.side === "white" ? s.value : -s.value;
    return `M${Math.abs(m)}`;
  }
  const cp = whiteCp(a);
  return (cp >= 0 ? "+" : "") + (cp / 100).toFixed(1);
}

/** White win-share (0–100) for the eval-bar height, via a logistic of centipawns. */
export function whiteBarPct(a: MoveAnalysis): number {
  const cp = whiteCp(a);
  return 100 / (1 + Math.pow(10, -cp / 400));
}
