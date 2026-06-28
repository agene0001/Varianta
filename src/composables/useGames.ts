import { invoke } from "@tauri-apps/api/core";

// Gambit game import. Like the repertoire DB, this talks to the Rust backend via
// Tauri commands and degrades gracefully in a plain browser (no persistence).
const inTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Mirrors `gambit_core::Game` (serde snake_case field names; `id` is a bare string). */
export interface Game {
  id: string;
  source: "chess_com" | "lichess" | "manual_pgn";
  pgn: string;
  white: string;
  black: string;
  player_color: "white" | "black";
  result: "white_win" | "black_win" | "draw" | "unknown";
  /** RFC3339 timestamp. */
  played_at: string;
}

/** All stored games, most recent first. */
export async function listGames(): Promise<Game[]> {
  if (!inTauri) return [];
  return await invoke<Game[]>("list_games");
}

/** Import a Chess.com player's history, store new games, return the full list. */
export async function importGames(username: string): Promise<Game[]> {
  if (!inTauri) throw new Error("Importing games requires the desktop app.");
  return await invoke<Game[]>("import_games", { username });
}

/** The opponent, from the importing player's perspective. */
export function opponent(g: Game): string {
  return g.player_color === "white" ? g.black : g.white;
}

export type Outcome = "win" | "loss" | "draw" | "unknown";

/** The result from the importing player's perspective. */
export function outcome(g: Game): Outcome {
  if (g.result === "draw") return "draw";
  if (g.result === "unknown") return "unknown";
  const playerIsWhite = g.player_color === "white";
  const whiteWon = g.result === "white_win";
  return whiteWon === playerIsWhite ? "win" : "loss";
}
