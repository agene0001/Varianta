import { Chess } from "chess.js";
import type { Line } from "../types/chess";

/** Map Chess.com opening names to our built-in opening IDs. */
const OPENING_NAME_TO_ID: Record<string, string> = {
  "italian game": "italian-game",
  "queen's gambit": "queens-gambit",
  "queens gambit": "queens-gambit",
  "ruy lopez": "ruy-lopez",
  "ruy lópez": "ruy-lopez",
  "spanish opening": "ruy-lopez",
  "sicilian defense": "sicilian-defense",
  "sicilian": "sicilian-defense",
  "french defense": "french-defense",
  "french": "french-defense",
  "caro-kann defense": "caro-kann",
  "caro kann": "caro-kann",
  "caro-kann": "caro-kann",
  "king's indian defense": "kings-indian",
  "kings indian": "kings-indian",
  "king's indian": "kings-indian",
  "english opening": "english-opening",
  "english": "english-opening",
  "catalan opening": "catalan-opening",
  "catalan": "catalan-opening",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract a PGN header value, e.g. [Opening "Italian Game"] -> "Italian Game" */
function extractPgnHeader(pgn: string, key: string): string | null {
  const regex = new RegExp(`\\[${key}\\s+"([^"]*)"\\]`, "i");
  const m = pgn.match(regex);
  return m ? m[1].trim() : null;
}

/** Parse Chess.com-style PGN into opening name and Line. Returns null if invalid. */
export function parsePgnToLine(pgnText: string): { openingName: string; line: Line } | null {
  const trimmed = pgnText.trim();
  if (!trimmed) return null;

  const openingName = extractPgnHeader(trimmed, "Opening");
  if (!openingName) return null;

  const chess = new Chess();
  try {
    chess.loadPgn(trimmed);
  } catch {
    return null;
  }

  const history = chess.history();
  if (history.length === 0) return null;

  const moves = history.map((san) => ({ san }));
  const moveStrs = moves.map((m) => m.san);
  const lineName = moveStrs.length <= 6
    ? moveStrs.join(" ")
    : moveStrs.slice(0, 4).join(" ") + " …";
  const line: Line = {
    name: lineName,
    description: `Imported from Chess.com`,
    moves,
  };

  return { openingName, line };
}

/** Parse a file that may contain one or more PGN games (separated by blank lines). */
export function parsePgnFile(text: string): { openingName: string; line: Line }[] {
  const results: { openingName: string; line: Line }[] = [];
  const trimmed = text.trim();
  if (!trimmed) return results;
  if (trimmed.startsWith("{")) return results; // JSON, not PGN

  // Try whole text first (single PGN)
  const single = parsePgnToLine(trimmed);
  if (single) {
    results.push(single);
    return results;
  }

  // Split by double newline for multiple PGNs
  const blocks = trimmed.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    if (block.startsWith("{")) continue;
    const parsed = parsePgnToLine(block);
    if (parsed) results.push(parsed);
  }

  return results;
}

/** Resolve opening name to an ID (built-in or new slug). */
export function openingNameToId(name: string): string {
  const normalized = name.toLowerCase().trim();
  return OPENING_NAME_TO_ID[normalized] ?? slugify(name);
}

const BUILT_IN_IDS = new Set(Object.values(OPENING_NAME_TO_ID));

/** Check if an ID is a built-in opening (not user-created). */
export function isBuiltInOpeningId(id: string): boolean {
  return BUILT_IN_IDS.has(id);
}
