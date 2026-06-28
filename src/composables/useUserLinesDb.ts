import { invoke } from "@tauri-apps/api/core";
import type { Opening, Line } from "../types/chess";
import {
  parsePgnFile,
  openingNameToId,
  isBuiltInOpeningId,
} from "../utils/pgnParser";

// Persistence now lives in the Rust backend (crate `varianta-storage`, native
// SQLite). The frontend reaches it via Tauri commands. When running in a plain
// browser (`bun run dev`, no Tauri), `invoke` is unavailable, so we degrade
// gracefully: reads return empty, writes are no-ops. The desktop app is the
// real target.
const inTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface StoredUserLines {
  linesByOpening: Record<string, Line[]>;
  newOpenings: Opening[];
}

const empty = (): StoredUserLines => ({ linesByOpening: {}, newOpenings: [] });

/**
 * No-op: the SQLite database is opened by the Rust backend at app startup
 * (`src-tauri` `setup()`). Kept for API compatibility with callers.
 */
export async function initUserLinesDb(): Promise<void> {
  // nothing to do — native DB is initialized in the backend
}

/** Load all user lines from the native database. */
export async function loadUserLines(): Promise<StoredUserLines> {
  if (!inTauri) return empty();
  return await invoke<StoredUserLines>("get_user_lines");
}

/** Merge file-based openings with user lines from the database. */
export function mergeUserLines(
  fileOpenings: Opening[],
  stored: StoredUserLines
): Opening[] {
  const result: Opening[] = fileOpenings.map((o) => ({
    ...o,
    lines: [...o.lines, ...(stored.linesByOpening[o.id] ?? [])],
  }));
  return [...result, ...stored.newOpenings];
}

/** Add a line to an existing (file) opening. */
export async function addLineToExistingOpening(
  openingId: string,
  line: Line
): Promise<void> {
  if (!inTauri) return;
  await invoke("add_line", { openingId, line });
}

/** Add a new user-created opening with its first line(s). */
export async function addNewOpening(opening: Opening): Promise<void> {
  if (!inTauri) return;
  await invoke("add_opening", { opening });
}

/** Add a line to an existing user-created opening. */
export async function addLineToNewOpening(
  openingId: string,
  line: Line
): Promise<void> {
  if (!inTauri) return;
  await invoke("add_line", { openingId, line });
}

/** Export user lines as JSON and trigger download. */
export async function exportUserLinesAsFile(
  filename = "varianta-user-lines.json"
): Promise<{ success: boolean; message: string }> {
  const data = await loadUserLines();
  const hasAny =
    Object.keys(data.linesByOpening).length > 0 || data.newOpenings.length > 0;
  if (!hasAny) {
    return { success: false, message: "No custom lines to export." };
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return { success: true, message: "Exported successfully." };
}

/** Convert parsed PGN results to StoredUserLines format. */
function pgnResultsToStoredUserLines(
  results: { openingName: string; line: Line }[]
): StoredUserLines {
  const linesByOpening: Record<string, Line[]> = {};
  const newOpeningsMap: Record<string, { name: string; lines: Line[] }> = {};

  for (const { openingName, line } of results) {
    const id = openingNameToId(openingName);
    if (isBuiltInOpeningId(id)) {
      linesByOpening[id] = linesByOpening[id] ?? [];
      linesByOpening[id].push(line);
    } else {
      if (!newOpeningsMap[id]) {
        newOpeningsMap[id] = { name: openingName, lines: [] };
      }
      newOpeningsMap[id].lines.push(line);
    }
  }

  const newOpenings: Opening[] = Object.entries(newOpeningsMap).map(
    ([id, { name, lines }]) => ({
      id,
      name,
      description: `Imported from Chess.com`,
      lines,
    })
  );

  return { linesByOpening, newOpenings };
}

/** SQLite files begin with the 16-byte magic string "SQLite format 3\0". */
async function looksLikeSqlite(file: File): Promise<boolean> {
  const magic = "SQLite format 3\0";
  const head = new Uint8Array(await file.slice(0, magic.length).arrayBuffer());
  if (head.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (head[i] !== magic.charCodeAt(i)) return false;
  }
  return true;
}

/** Merge a StoredUserLines into the store, skipping duplicate lines by SAN sequence. */
async function importStoredUserLines(
  data: StoredUserLines
): Promise<{ lines: number; openings: number }> {
  const existing = await loadUserLines();
  const existingSequences = new Set<string>();
  for (const lines of Object.values(existing.linesByOpening)) {
    for (const l of lines) existingSequences.add(l.moves.map((m) => m.san).join(" "));
  }
  for (const o of existing.newOpenings) {
    for (const l of o.lines) existingSequences.add(l.moves.map((m) => m.san).join(" "));
  }

  let lines = 0;
  let openings = 0;

  for (const [openingId, ls] of Object.entries(data.linesByOpening ?? {})) {
    for (const line of ls) {
      const seq = line.moves.map((m) => m.san).join(" ");
      if (existingSequences.has(seq)) continue;
      await addLineToExistingOpening(openingId, line);
      existingSequences.add(seq);
      lines++;
    }
  }

  for (const opening of data.newOpenings ?? []) {
    const exists = existing.newOpenings.some((o) => o.id === opening.id);
    const nonDupLines: Line[] = [];
    for (const line of opening.lines) {
      const seq = line.moves.map((m) => m.san).join(" ");
      if (existingSequences.has(seq)) continue;
      nonDupLines.push(line);
      existingSequences.add(seq);
      lines++;
    }
    if (!exists) openings++;
    // `add_opening` does INSERT OR IGNORE on the opening row, then inserts the
    // given lines — so this handles both "new opening" and "existing opening,
    // new lines" with the duplicate lines already filtered out.
    if (!exists || nonDupLines.length > 0) {
      await addNewOpening({ ...opening, lines: nonDupLines });
    }
  }

  return { lines, openings };
}

/**
 * Import user lines from JSON, PGN (Chess.com format), or a legacy `.sqlite`
 * database exported from the old browser app. Merges with existing data,
 * skipping duplicate lines by move sequence.
 */
export async function importUserLinesFromFile(file: File): Promise<{
  success: boolean;
  message: string;
  imported: { lines: number; openings: number };
}> {
  let data: StoredUserLines;

  if (await looksLikeSqlite(file)) {
    // Legacy sql.js database (the migration path from the old browser storage).
    if (!inTauri) {
      return {
        success: false,
        message: "Importing a .sqlite database requires the desktop app.",
        imported: { lines: 0, openings: 0 },
      };
    }
    const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
    try {
      data = await invoke<StoredUserLines>("import_legacy_db", { bytes });
    } catch (e) {
      return {
        success: false,
        message: `Could not read database file: ${e}`,
        imported: { lines: 0, openings: 0 },
      };
    }
  } else {
    const text = await file.text();
    if (text.trim().startsWith("{")) {
      try {
        data = JSON.parse(text) as StoredUserLines;
      } catch {
        return {
          success: false,
          message: "Invalid JSON file.",
          imported: { lines: 0, openings: 0 },
        };
      }
    } else {
      const pgnResults = parsePgnFile(text);
      if (pgnResults.length === 0) {
        return {
          success: false,
          message:
            "No valid PGN found. Expected Chess.com format with [Opening \"...\"] and moves.",
          imported: { lines: 0, openings: 0 },
        };
      }
      data = pgnResultsToStoredUserLines(pgnResults);
    }
  }

  const { lines, openings } = await importStoredUserLines(data);
  return {
    success: true,
    message: `Imported ${lines} lines and ${openings} new openings.`,
    imported: { lines, openings },
  };
}
